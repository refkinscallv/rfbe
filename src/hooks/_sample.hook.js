'use strict';

// Sample lifecycle hook — a reference template, NOT loaded by the framework.
// The Hooks core only ever loads `register.hook.js`; files prefixed with "_"
// are ignored. Copy the stages you need into register.hook.js.
//
// Each stage receives a small context object and may be async. The boot order
// is: before -> (database) -> (http/socket/cron/queue) -> after, and on
// SIGINT/SIGTERM the shutdown stage runs while resources are torn down.
const logger = require('@core/logger.core');
const Cache = require('@core/common/cache');

module.exports = class SampleHook {
	// Runs before the HTTP server starts. Good for warming caches, verifying
	// external services, or loading configuration. Context: { config }.
	static async before({ config }) {
		logger.info(`Booting ${config.app.name} in ${config.app.env} mode`);

		// Example: prime a cache value used across the app.
		Cache.set('boot:at', Date.now(), 0);

		// Example: fail fast if a required integration is unreachable.
		// const ok = await SomeService.ping()
		// if (!ok) throw new Error('SomeService is unreachable')
	}

	// Runs after the server is listening. Good for "ready" side effects such as
	// announcing startup or scheduling a first run. Context: { config }.
	static async after({ config }) {
		logger.info(`${config.app.name} is accepting traffic on port ${config.app.port}`);
	}

	// Runs on graceful shutdown (SIGINT / SIGTERM), before the cores close.
	// Release anything the framework does not own here. Context: { signal }.
	static async shutdown({ signal }) {
		logger.info(`Cleaning up after ${signal}`);
		// await SomeService.disconnect()
	}
};
