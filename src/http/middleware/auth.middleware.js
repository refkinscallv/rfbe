'use strict';

const Jwt = require('@core/jwt.core');

// Example authentication middleware. express-routing accepts a class exposing a
// static `handle({ req, res, next, error })` method. This one extracts a bearer
// token, verifies it, and attaches the decoded payload as req.user.
class AuthMiddleware {
	static handle({ req, res, next }) {
		const token = Jwt.fromHeader(req.headers.authorization);
		if (!token) {
			return res.error(401, 'Missing bearer token');
		}

		const { valid, payload } = Jwt.tryVerify(token);
		if (!valid) {
			return res.error(401, 'Invalid or expired token');
		}

		req.user = payload;
		next();
	}
}

module.exports = AuthMiddleware;
