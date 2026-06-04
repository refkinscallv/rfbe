'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const config = require('@app/config');
const logger = require('@core/logger.core');

const REGISTER_FILE = path.resolve(process.cwd(), 'src', 'queue', 'register.queue.js');
const TABLE = 'queue_jobs';

// Queue core — an in-process asynchronous job queue.
//
// Why in-process? It has zero external dependencies (no Redis/broker), starts
// instantly, and covers the common case: offloading slow work (emails, image
// processing, webhooks) from the request/response cycle so the HTTP layer stays
// responsive. Each named queue runs its handler with bounded concurrency and
// retries failed jobs with exponential backoff.
//
// When DB_ENABLED=true and QUEUE_PERSIST=true, jobs are persisted to the
// `queue_jobs` table. Pending/processing jobs are recovered on restart. Failed
// jobs remain in the table as a dead-letter record for inspection.
//
// Outgrowing a single process? Swap the internals for BullMQ + Redis —
// application code does not need to change.
class Queue {
	static queues = new Map();
	static draining = false;
	static _db = null;

	// Register a processor for a named queue.
	//   Queue.define('emails', async (payload, job) => { ... }, { concurrency: 2 })
	static define(name, handler, options = {}) {
		Queue.queues.set(name, {
			name,
			handler,
			concurrency: options.concurrency ?? config.queue.concurrency,
			maxRetries: options.maxRetries ?? config.queue.maxRetries,
			retryDelay: options.retryDelay ?? config.queue.retryDelay,
			pending: [],
			active: 0,
		});
		return Queue;
	}

	// Push a job onto a queue. `delay` (ms) defers when it becomes eligible.
	static dispatch(name, payload = {}, options = {}) {
		const queue = Queue.queues.get(name);
		if (!queue) throw new Error(`Queue "${name}" is not defined`);

		const job = {
			id: crypto.randomUUID(),
			queue: name,
			payload,
			attempts: 0,
			maxRetries: options.maxRetries ?? queue.maxRetries,
			createdAt: Date.now(),
		};

		const delay = options.delay || 0;
		if (Queue._db) Queue._insertJob(job, delay).catch((e) => logger.warn(`Queue: failed to persist job ${job.id}: ${e.message}`));

		if (delay > 0) {
			setTimeout(() => Queue._enqueue(queue, job), delay).unref?.();
		} else {
			Queue._enqueue(queue, job);
		}

		return job.id;
	}

	static _enqueue(queue, job) {
		queue.pending.push(job);
		Queue._drain(queue);
	}

	// Pull jobs off the queue up to the concurrency limit.
	static _drain(queue) {
		if (Queue.draining) return;
		while (queue.active < queue.concurrency && queue.pending.length > 0) {
			const job = queue.pending.shift();
			Queue._process(queue, job);
		}
	}

	// Execute a single job, retrying with backoff on failure.
	static async _process(queue, job) {
		queue.active++;
		job.attempts++;
		if (Queue._db) await Queue._markProcessing(job.id, job.attempts).catch(() => {});

		try {
			await queue.handler(job.payload, job);
			if (Queue._db) await Queue._markCompleted(job.id).catch(() => {});
			logger.debug(`Queue "${queue.name}" processed job ${job.id} (attempt ${job.attempts})`);
		} catch (error) {
			if (job.attempts <= job.maxRetries) {
				const backoff = queue.retryDelay * Math.pow(2, job.attempts - 1);
				logger.warn(`Queue "${queue.name}" job ${job.id} failed (attempt ${job.attempts}), retrying in ${backoff}ms: ${error.message}`);
				if (Queue._db) await Queue._markPending(job.id, job.attempts).catch(() => {});
				setTimeout(() => Queue._enqueue(queue, job), backoff).unref?.();
			} else {
				if (Queue._db) await Queue._markFailed(job.id, error.message).catch(() => {});
				logger.error(`Queue "${queue.name}" job ${job.id} failed permanently after ${job.attempts} attempt(s): ${error.message}`);
			}
		} finally {
			queue.active--;
			Queue._drain(queue);
		}
	}

	// Load queue definitions from the register file.
	static async start() {
		if (!config.queue.enabled) {
			logger.info('Queue is disabled (QUEUE_ENABLED=false)');
			return;
		}

		if (fs.existsSync(REGISTER_FILE)) {
			const register = require(REGISTER_FILE);
			const fn = register.default || register;
			if (typeof fn === 'function') {
				await fn(Queue);
			} else if (fn && typeof fn.register === 'function') {
				await fn.register(Queue);
			}
		} else {
			logger.warn(`Queue register file not found: ${REGISTER_FILE}`);
		}

		if (config.queue.persist && config.database.enabled) {
			try {
				const Database = require('@core/database.core');
				if (Database.sequelize) {
					Queue._db = Database.sequelize;
					await Queue._ensureTable();
					await Queue._loadPending();
				}
			} catch (error) {
				logger.warn(`Queue: DB persistence unavailable, running in-memory only: ${error.message}`);
			}
		}

		logger.info(`Queue started with ${Queue.queues.size} queue(s): ${[...Queue.queues.keys()].join(', ') || 'none'}`);
	}

	// Stop accepting work and wait for in-flight jobs to finish (best effort).
	static async stop(timeoutMs = 10000) {
		Queue.draining = true;
		const deadline = Date.now() + timeoutMs;
		while (Date.now() < deadline) {
			const busy = [...Queue.queues.values()].some((q) => q.active > 0);
			if (!busy) break;
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
		logger.info('Queue stopped');
	}

	// Inspect queue depth and in-flight counts.
	static stats() {
		const out = {};
		for (const [name, queue] of Queue.queues) {
			out[name] = { pending: queue.pending.length, active: queue.active };
		}
		return out;
	}

	// ── DB helpers ─────────────────────────────────────────────────────────────

	static async _ensureTable() {
		await Queue._db.query(`
			CREATE TABLE IF NOT EXISTS \`${TABLE}\` (
				\`id\`           VARCHAR(36)                                              NOT NULL,
				\`queue\`        VARCHAR(100)                                             NOT NULL,
				\`payload\`      JSON                                                     NOT NULL,
				\`status\`       ENUM('pending','processing','completed','failed')        NOT NULL DEFAULT 'pending',
				\`attempts\`     INT                                                      NOT NULL DEFAULT 0,
				\`max_retries\`  INT                                                      NOT NULL DEFAULT 3,
				\`error\`        TEXT                                                     NULL,
				\`available_at\` DATETIME                                                 NOT NULL,
				\`processed_at\` DATETIME                                                 NULL,
				\`created_at\`   DATETIME                                                 NOT NULL,
				\`updated_at\`   DATETIME                                                 NOT NULL,
				PRIMARY KEY (\`id\`),
				INDEX idx_queue_status (\`queue\`, \`status\`, \`available_at\`)
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
		`);
	}

	static async _insertJob(job, delay) {
		const now = new Date();
		await Queue._db.query(
			`INSERT INTO \`${TABLE}\` (id, \`queue\`, payload, status, attempts, max_retries, available_at, created_at, updated_at)
			 VALUES (:id, :queue, :payload, 'pending', 0, :maxRetries, :availableAt, :now, :now)`,
			{
				replacements: {
					id: job.id,
					queue: job.queue,
					payload: JSON.stringify(job.payload),
					maxRetries: job.maxRetries,
					availableAt: new Date(Date.now() + delay),
					now,
				},
			},
		);
	}

	static async _markProcessing(id, attempts) {
		await Queue._db.query(`UPDATE \`${TABLE}\` SET status = 'processing', attempts = :attempts, updated_at = :now WHERE id = :id`, { replacements: { attempts, now: new Date(), id } });
	}

	static async _markCompleted(id) {
		const now = new Date();
		await Queue._db.query(`UPDATE \`${TABLE}\` SET status = 'completed', processed_at = :now, updated_at = :now WHERE id = :id`, { replacements: { now, id } });
	}

	static async _markFailed(id, errorMsg) {
		const now = new Date();
		await Queue._db.query(`UPDATE \`${TABLE}\` SET status = 'failed', error = :error, processed_at = :now, updated_at = :now WHERE id = :id`, { replacements: { error: errorMsg, now, id } });
	}

	static async _markPending(id, attempts) {
		await Queue._db.query(`UPDATE \`${TABLE}\` SET status = 'pending', attempts = :attempts, updated_at = :now WHERE id = :id`, { replacements: { attempts, now: new Date(), id } });
	}

	// On startup, re-enqueue any jobs that were pending or mid-flight when the
	// process last exited. Processing jobs are treated as interrupted and retried.
	static async _loadPending() {
		const [rows] = await Queue._db.query(
			`SELECT id, \`queue\`, payload, attempts, max_retries AS maxRetries
			 FROM \`${TABLE}\`
			 WHERE status IN ('pending', 'processing') AND available_at <= :now`,
			{ replacements: { now: new Date() } },
		);

		let loaded = 0;
		for (const row of rows) {
			const queue = Queue.queues.get(row.queue);
			if (!queue) {
				logger.warn(`Queue "${row.queue}" not registered; skipping orphaned job ${row.id}`);
				continue;
			}
			const job = {
				id: row.id,
				queue: row.queue,
				payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
				attempts: row.attempts,
				maxRetries: row.maxRetries,
				createdAt: Date.now(),
			};
			Queue._enqueue(queue, job);
			loaded++;
		}

		if (loaded > 0) logger.info(`Queue: recovered ${loaded} pending job(s) from database`);
	}
}

module.exports = Queue;
