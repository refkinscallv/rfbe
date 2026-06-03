'use strict';

// Global middleware registry. The Express core calls `set(app)` after the
// built-in stack (helmet, cors, body parsers, rate limit) and before the route
// table, so anything registered here runs on every request.
//
// Per-route middleware is different: those are classes exposing
// `handle({ req, res, next, error })` (see auth.middleware.js) and are attached
// to individual routes, e.g.:
//   const AuthMiddleware = require('@app/http/middleware/auth.middleware')
//   Routes.middleware([AuthMiddleware]).get('/me', handler)
module.exports = class MiddlewareRegister {
	static async set(app) {
		// Example: tag every request with a correlation id.
		// app.use((req, res, next) => {
		//     req.id = require('crypto').randomUUID()
		//     res.setHeader('X-Request-Id', req.id)
		//     next()
		// })
		void app;
	}
};
