'use strict';

const path = require('path');
const fs = require('fs');

const logger = require('@core/logger.core');

const REGISTER_FILE = path.resolve(process.cwd(), 'src', 'hooks', 'register.hook.js');

// Lifecycle hooks core. Loads src/hooks/register.hook.js and invokes its
// before / after / shutdown stages at the right points in the boot sequence,
// giving the application well-defined extension points around startup.
class Hooks {
	static handler = null;

	// Resolve and cache the user's hook handler.
	static _resolve() {
		if (Hooks.handler !== null) return Hooks.handler;
		if (fs.existsSync(REGISTER_FILE)) {
			const mod = require(REGISTER_FILE);
			Hooks.handler = mod.default || mod;
		} else {
			logger.warn(`Hook register file not found: ${REGISTER_FILE}`);
			Hooks.handler = {};
		}
		return Hooks.handler;
	}

	// Invoke a named stage if the handler implements it.
	static async run(stage, context = {}) {
		const handler = Hooks._resolve();
		const fn = handler[stage];
		if (typeof fn !== 'function') return;
		try {
			logger.debug(`Hook: ${stage}`);
			await fn.call(handler, context);
		} catch (error) {
			logger.error(`Hook "${stage}" failed: ${error.message}`);
			throw error;
		}
	}

	// Runs before the HTTP server starts — good for warming caches, checks, etc.
	static before(context = {}) {
		return Hooks.run('before', context);
	}

	// Runs after the server is listening — good for "ready" side effects.
	static after(context = {}) {
		return Hooks.run('after', context);
	}

	// Runs during graceful shutdown — release external resources here.
	static shutdown(context = {}) {
		return Hooks.run('shutdown', context);
	}
}

module.exports = Hooks;
