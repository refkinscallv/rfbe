'use strict';

const Routes = require('@refkinscallv/express-routing');
const Validator = require('@core/validator.core');
const Jwt = require('@core/jwt.core');
const HomeController = require('@app/http/controllers/home.controller');
const AuthMiddleware = require('@app/http/middleware/auth.middleware');
const { loginSchema } = require('@app/http/validator/auth.validator');

// Application route table. This file is required during boot; registering
// routes here populates the express-routing registry, which the Express core
// then applies to the running server.

// Simple inline route. Handlers receive { req, res, next, error }; res is
// decorated with res.success / res.respond / res.error for the standard envelope.
Routes.get('/', ({ res }) => {
	res.success(null, 'Welcome to RFBE');
});

// Auto-mount every method of a controller under a base path.
//   index  -> GET /home
//   health -> GET /home/health
Routes.controller('/home', HomeController);

// Group related endpoints behind a shared prefix.
Routes.group('/api', () => {
	Routes.get('/ping', ({ res }) => {
		res.success(null, 'pong');
	});

	// Body validated by a Zod schema before the handler runs (422 on failure).
	Routes.post(
		'/login',
		({ req, res }) => {
			const tokens = Jwt.issue({ email: req.body.email });
			res.success(tokens, 'Logged in');
		},
		[Validator.make(loginSchema)],
	);

	// Protected route — AuthMiddleware verifies the bearer token first.
	Routes.middleware([AuthMiddleware]).get('/me', ({ req, res }) => {
		res.success(req.user, 'Authenticated');
	});
});

module.exports = Routes;
