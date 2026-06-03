'use strict';

const logger = require('@core/logger.core');
const config = require('@app/config');
const ApiResponse = require('@core/response.core');

const isProd = config.app.env === 'production';

// ─── NODE PROCESS HANDLERS ────────────────────────────────────────────────────

function setExceptionHandler() {
	process.on('uncaughtException', (err) => {
		logger.error(err);
		process.exit(1);
	});
}

function setErrorHandler() {
	process.on('unhandledRejection', (reason) => {
		const err = reason instanceof Error ? reason : new Error(String(reason));
		logger.error(err);
	});
}

// ─── EXPRESS ERROR MIDDLEWARE ─────────────────────────────────────────────────

function expressErrorHandler(err, _req, res, _next) {
	const status = err.status || err.statusCode || 500;
	const message = err.message || 'Internal Server Error';

	logger.error(err);

	ApiResponse.send(res, {
		status: false,
		code: status,
		message,
		// Surface validation/known error details when provided on the error.
		errors: err.errors ?? null,
		// Expose the stack outside production to aid debugging.
		additional: isProd ? null : { stack: err.stack },
	});
}

// ─── EXPRESS 404 HANDLER ──────────────────────────────────────────────────────

function expressNotFoundHandler(req, res) {
	const message = `Cannot ${req.method} ${req.originalUrl}`;
	logger.warn(message);
	ApiResponse.send(res, { status: false, code: 404, message });
}

module.exports = {
	setExceptionHandler,
	setErrorHandler,
	expressErrorHandler,
	expressNotFoundHandler,
};
