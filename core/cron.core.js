'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cron = require('node-cron');

const config = require('@app/config');
const logger = require('@core/logger.core');

const REGISTER_FILE = path.resolve(process.cwd(), 'src', 'jobs', 'register.job.js');
const TABLE = 'cron_runs';

// Cron core — schedules recurring jobs with node-cron. Application jobs are
// declared in src/jobs/register.job.js and registered here, so all scheduling
// lives in one place and respects the configured timezone.
//
// When DB_ENABLED=true and CRON_HISTORY=true, each execution is recorded in
// the `cron_runs` table: started_at, finished_at, status, duration, and any
// error message.
class Cron {
	static jobs = new Map();
	static _db = null;

	// Declare a scheduled job. Call this from register.job.js.
	//   Cron.define('cleanup', '0 * * * *', async () => { ... })
	static define(name, expression, handler, options = {}) {
		if (Cron.jobs.has(name)) {
			logger.warn(`Cron job "${name}" is already defined; overwriting`);
		}
		if (!cron.validate(expression)) {
			throw new Error(`Invalid cron expression for "${name}": ${expression}`);
		}

		Cron.jobs.set(name, {
			name,
			expression,
			handler,
			timezone: options.timezone || config.cron.timezone,
			runOnInit: options.runOnInit || false,
			task: null,
		});

		return Cron;
	}

	// Load job definitions and schedule everything. No-op when cron is disabled.
	static async start() {
		if (!config.cron.enabled) {
			logger.info('Cron is disabled (CRON_ENABLED=false)');
			return;
		}

		if (fs.existsSync(REGISTER_FILE)) {
			const register = require(REGISTER_FILE);
			const fn = register.default || register;
			if (typeof fn === 'function') {
				await fn(Cron);
			} else if (fn && typeof fn.register === 'function') {
				await fn.register(Cron);
			}
		} else {
			logger.warn(`Cron register file not found: ${REGISTER_FILE}`);
		}

		if (config.cron.history && config.database.enabled) {
			try {
				const Database = require('@core/database.core');
				if (Database.sequelize) {
					Cron._db = Database.sequelize;
					await Cron._ensureTable();
				}
			} catch (error) {
				logger.warn(`Cron: DB history unavailable: ${error.message}`);
			}
		}

		for (const job of Cron.jobs.values()) {
			job.task = cron.schedule(job.expression, () => Cron._run(job), {
				timezone: job.timezone,
			});
			if (job.runOnInit) Cron._run(job);
		}

		logger.info(`Cron started with ${Cron.jobs.size} job(s): ${[...Cron.jobs.keys()].join(', ') || 'none'}`);
	}

	// Run a job's handler inside a guard so one failure never crashes the loop.
	static async _run(job) {
		const runId = crypto.randomUUID();
		const startedAt = new Date();

		if (Cron._db) {
			await Cron._db
				.query(`INSERT INTO \`${TABLE}\` (id, job_name, started_at, status, created_at) VALUES (:id, :name, :startedAt, 'running', :now)`, {
					replacements: { id: runId, name: job.name, startedAt, now: startedAt },
				})
				.catch((e) => logger.debug(`Cron: failed to record run start for "${job.name}": ${e.message}`));
		}

		try {
			logger.debug(`Cron running: ${job.name}`);
			await job.handler();
			const finishedAt = new Date();
			if (Cron._db) {
				await Cron._db
					.query(
						`UPDATE \`${TABLE}\` SET status = 'completed', finished_at = :finishedAt, duration_ms = :duration WHERE id = :id`,
						{ replacements: { finishedAt, duration: finishedAt - startedAt, id: runId } }
					)
					.catch(() => {});
			}
		} catch (error) {
			logger.error(`Cron job "${job.name}" failed: ${error.message}`);
			const finishedAt = new Date();
			if (Cron._db) {
				await Cron._db
					.query(
						`UPDATE \`${TABLE}\` SET status = 'failed', finished_at = :finishedAt, duration_ms = :duration, error = :error WHERE id = :id`,
						{ replacements: { finishedAt, duration: finishedAt - startedAt, error: error.message, id: runId } }
					)
					.catch(() => {});
			}
		}
	}

	// Trigger a job immediately by name, outside its schedule.
	static async runNow(name) {
		const job = Cron.jobs.get(name);
		if (!job) throw new Error(`Cron job "${name}" is not defined`);
		return Cron._run(job);
	}

	// Stop a single job and remove it from the registry.
	static remove(name) {
		const job = Cron.jobs.get(name);
		if (job && job.task) job.task.stop();
		return Cron.jobs.delete(name);
	}

	// Stop all jobs (used during graceful shutdown).
	static stop() {
		for (const job of Cron.jobs.values()) {
			if (job.task) job.task.stop();
		}
		logger.info('Cron stopped');
	}

	static list() {
		return [...Cron.jobs.values()].map((job) => ({
			name: job.name,
			expression: job.expression,
			timezone: job.timezone,
		}));
	}

	// ── DB helpers ─────────────────────────────────────────────────────────────

	static async _ensureTable() {
		await Cron._db.query(`
			CREATE TABLE IF NOT EXISTS \`${TABLE}\` (
				\`id\`          VARCHAR(36)                              NOT NULL,
				\`job_name\`    VARCHAR(100)                             NOT NULL,
				\`started_at\`  DATETIME                                 NOT NULL,
				\`finished_at\` DATETIME                                 NULL,
				\`status\`      ENUM('running','completed','failed')     NOT NULL DEFAULT 'running',
				\`error\`       TEXT                                     NULL,
				\`duration_ms\` INT                                      NULL,
				\`created_at\`  DATETIME                                 NOT NULL,
				PRIMARY KEY (\`id\`),
				INDEX idx_job_name (\`job_name\`),
				INDEX idx_started_at (\`started_at\`)
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
		`);
	}
}

module.exports = Cron;
