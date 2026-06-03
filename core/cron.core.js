'use strict';

const path = require('path');
const fs = require('fs');
const cron = require('node-cron');

const config = require('@app/config');
const logger = require('@core/logger.core');

const REGISTER_FILE = path.resolve(process.cwd(), 'src', 'jobs', 'register.job.js');

// Cron core — schedules recurring jobs with node-cron. Application jobs are
// declared in src/jobs/register.job.js and registered here, so all scheduling
// lives in one place and respects the configured timezone.
class Cron {
	static jobs = new Map();

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
		try {
			logger.debug(`Cron running: ${job.name}`);
			await job.handler();
		} catch (error) {
			logger.error(`Cron job "${job.name}" failed: ${error.message}`);
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
}

module.exports = Cron;
