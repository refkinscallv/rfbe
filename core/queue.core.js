'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const config = require('@app/config');
const logger = require('@core/logger.core');

const REGISTER_FILE = path.resolve(process.cwd(), 'src', 'queue', 'register.queue.js');

// Queue core — an in-process asynchronous job queue.
//
// Why in-process? It has zero external dependencies (no Redis/broker), starts
// instantly, and covers the common case: offloading slow work (emails, image
// processing, webhooks) from the request/response cycle so the HTTP layer stays
// responsive. Each named queue runs its handler with bounded concurrency and
// retries failed jobs with exponential backoff.
//
// Outgrowing a single process (multiple instances, durability across restarts,
// scheduled fan-out)? Keep this same `define`/`dispatch` surface and swap the
// internals for BullMQ + Redis — application code does not need to change.
class Queue {
	static queues = new Map();
	static draining = false;

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
		try {
			await queue.handler(job.payload, job);
			logger.debug(`Queue "${queue.name}" processed job ${job.id} (attempt ${job.attempts})`);
		} catch (error) {
			if (job.attempts <= job.maxRetries) {
				const backoff = queue.retryDelay * Math.pow(2, job.attempts - 1);
				logger.warn(`Queue "${queue.name}" job ${job.id} failed (attempt ${job.attempts}), retrying in ${backoff}ms: ${error.message}`);
				setTimeout(() => Queue._enqueue(queue, job), backoff).unref?.();
			} else {
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
}

module.exports = Queue;
