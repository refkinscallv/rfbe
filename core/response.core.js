'use strict';

// Standard response envelope for the whole application. Every HTTP response —
// success, validation failure, or error — is shaped the same way so clients can
// rely on a single contract:
//
//   {
//     status:     boolean,   // true on success, false on failure
//     code:       number,    // HTTP status code
//     message:    any,       // human-readable summary
//     data:       any,       // primary payload
//     meta:       any,       // pagination / context (page, total, ...)
//     errors:     any,       // validation / error details
//     additional: any        // anything else that does not fit above
//   }
class ApiResponse {
	// Normalize a partial input into the full, ordered envelope. `status`
	// defaults from the code (2xx/3xx => true) unless given explicitly.
	static build({ status, code = 200, message = null, data = null, meta = null, errors = null, additional = null } = {}) {
		const ok = typeof status === 'boolean' ? status : code < 400;
		return {
			status: ok,
			code,
			message: message ?? (ok ? 'OK' : 'Error'),
			data: data ?? null,
			meta: meta ?? null,
			errors: errors ?? null,
			additional: additional ?? null,
		};
	}

	// Write an envelope to an Express response with the matching HTTP status.
	static send(res, options = {}) {
		const body = ApiResponse.build(options);
		if (res.headersSent) return res;
		return res.status(body.code).json(body);
	}

	// Convenience success/error builders.
	static success(res, options = {}) {
		return ApiResponse.send(res, { code: 200, ...options, status: true });
	}

	static error(res, options = {}) {
		return ApiResponse.send(res, { code: 500, ...options, status: false });
	}

	// Express middleware that decorates `res` with response helpers so handlers
	// can reply without importing this core:
	//   res.respond({ code, message, data, meta, errors, additional })
	//   res.success(data, message, extra)
	//   res.error(code, message, extra)
	static middleware() {
		return (req, res, next) => {
			res.respond = (options = {}) => ApiResponse.send(res, options);
			res.success = (data = null, message = 'OK', extra = {}) => ApiResponse.send(res, { code: 200, status: true, message, data, ...extra });
			res.error = (code = 500, message = 'Error', extra = {}) => ApiResponse.send(res, { code, status: false, message, ...extra });
			next();
		};
	}
}

module.exports = ApiResponse;
