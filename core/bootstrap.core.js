'use strict';

require('@core/runtime.core');

const logger = require('@core/logger.core');
const ErrorCore = require('@core/error.core');
const config = require('@app/config');

const Hooks = require('@core/hooks.core');
const Database = require('@core/database.core');
const Express = require('@core/express.core');
const Socket = require('@core/socket.core');
const Cron = require('@core/cron.core');
const Queue = require('@core/queue.core');

// Application bootstrapper. Wires the cores together in a deterministic order
// and installs a graceful-shutdown handler so the process exits cleanly.
class Bootstrap {
	static async run() {
		// ── 1. Process-level error handlers ──────────────────────────────────
		ErrorCore.setExceptionHandler();
		ErrorCore.setErrorHandler();

		// ── 2. Startup banner ────────────────────────────────────────────────
		logger.info(`${config.app.name} is starting`);
		logger.debug(`Environment : ${config.app.env}`);
		logger.debug(`Timezone    : ${config.app.timezone}`);
		logger.debug(`Port        : ${config.app.port}`);

		try {
			// ── 3. Pre-boot hook ─────────────────────────────────────────────
			await Hooks.before({ config });

			// ── 4. Database ──────────────────────────────────────────────────
			await Bootstrap._initDatabase();

			// ── 5. HTTP + realtime ───────────────────────────────────────────
			const { server } = await Express.create();
			await Socket.attach(server);

			// ── 6. Background workers ────────────────────────────────────────
			await Cron.start();
			await Queue.start();

			// ── 7. Listen ────────────────────────────────────────────────────
			await Express.listen();

			// ── 8. Post-boot hook ────────────────────────────────────────────
			await Hooks.after({ config });

			logger.info(`${config.app.name} is ready`);

			// ── 9. Graceful shutdown ─────────────────────────────────────────
			Bootstrap._registerShutdown();
		} catch (error) {
			logger.error(`Startup failed: ${error.stack || error.message}`);
			process.exit(1);
		}
	}

	// Connect to the database and optionally sync the schema. Skipped entirely
	// when DB_ENABLED=false. A connection failure is logged but does not abort
	// boot, so the HTTP layer can still serve health checks and surface a clear
	// error.
	static async _initDatabase() {
		if (!config.database.enabled) {
			logger.info('Database is disabled (DB_ENABLED=false)');
			return;
		}
		try {
			await Database.connect();
			if (config.database.sync) {
				await Database.sync();
			}
		} catch (error) {
			logger.error(`Database initialization failed: ${error.message}`);
		}
	}

	// Tear everything down in reverse dependency order on SIGINT / SIGTERM.
	static _registerShutdown() {
		let shuttingDown = false;

		const shutdown = async (signal) => {
			if (shuttingDown) return;
			shuttingDown = true;
			logger.info(`Received ${signal}, shutting down gracefully...`);

			try {
				await Hooks.shutdown({ signal });
				Cron.stop();
				await Queue.stop();
				await Socket.close();
				await Express.close();
				await Database.disconnect();
				logger.info('Shutdown complete');
				process.exit(0);
			} catch (error) {
				logger.error(`Error during shutdown: ${error.message}`);
				process.exit(1);
			}
		};

		process.on('SIGINT', () => shutdown('SIGINT'));
		process.on('SIGTERM', () => shutdown('SIGTERM'));
	}
}

module.exports = Bootstrap;
