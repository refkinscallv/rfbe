'use strict';

const ApiResponse = require('@core/response.core');

// Validator core — turns a Zod schema into an express-routing middleware.
//
// Validated data is attached to req.validated[source]; for body it also
// replaces req.body so downstream handlers read the parsed/coerced values.
// On failure it short-circuits with a 422 in the standard response envelope,
// placing the field errors under `errors`.
//
// Usage (per-route middleware):
//   Routes.post('/login', handler, [Validator.make(loginSchema)])
// Usage (query/params):
//   Routes.get('/search', handler, [Validator.make(searchSchema, 'query')])
class Validator {
	static make(schema, source = 'body') {
		return {
			handle({ req, res, next }) {
				const result = schema.safeParse(req[source]);

				if (!result.success) {
					const errors = result.error.issues.map((issue) => ({
						field: issue.path.join('.') || '(root)',
						message: issue.message,
					}));
					return ApiResponse.send(res, {
						status: false,
						code: 422,
						message: 'Validation failed',
						errors,
					});
				}

				req.validated = req.validated || {};
				req.validated[source] = result.data;
				// req.query / req.params are read-only getters in Express 5, so only
				// the body is safe to replace in place.
				if (source === 'body') req.body = result.data;

				next();
			},
		};
	}
}

module.exports = Validator;
