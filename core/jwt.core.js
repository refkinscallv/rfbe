'use strict';

const jwt = require('jsonwebtoken');
const config = require('@app/config');

// JSON Web Token helper. Wraps jsonwebtoken with separate access/refresh
// secrets, sensible defaults from config, and small encode/decode utilities.
class Jwt {
	// ── Access tokens ────────────────────────────────────────────────────────
	// Sign a short-lived access token. Payload may be an object or primitive.
	static sign(payload, options = {}) {
		return jwt.sign(payload, config.jwt.secret, {
			expiresIn: config.jwt.expiresIn,
			...options,
		});
	}

	// Verify an access token, returning the decoded payload. Throws on failure.
	static verify(token, options = {}) {
		return jwt.verify(token, config.jwt.secret, options);
	}

	// ── Refresh tokens ───────────────────────────────────────────────────────
	static signRefresh(payload, options = {}) {
		return jwt.sign(payload, config.jwt.refreshSecret, {
			expiresIn: config.jwt.refreshExpiresIn,
			...options,
		});
	}

	static verifyRefresh(token, options = {}) {
		return jwt.verify(token, config.jwt.refreshSecret, options);
	}

	// Issue both tokens at once — the usual login response shape.
	static issue(payload, options = {}) {
		return {
			accessToken: Jwt.sign(payload, options.access || {}),
			refreshToken: Jwt.signRefresh(payload, options.refresh || {}),
			tokenType: 'Bearer',
			expiresIn: config.jwt.expiresIn,
		};
	}

	// ── Safe variants ────────────────────────────────────────────────────────
	// Verify without throwing: returns { valid, payload, error }.
	static tryVerify(token) {
		try {
			return { valid: true, payload: Jwt.verify(token), error: null };
		} catch (error) {
			return { valid: false, payload: null, error: error.message };
		}
	}

	static tryVerifyRefresh(token) {
		try {
			return { valid: true, payload: Jwt.verifyRefresh(token), error: null };
		} catch (error) {
			return { valid: false, payload: null, error: error.message };
		}
	}

	// ── Inspection ───────────────────────────────────────────────────────────
	// Decode without verifying the signature (never trust this for auth).
	static decode(token, options = {}) {
		return jwt.decode(token, options);
	}

	// Expiry as a Date, or null when the token has no exp claim.
	static expiresAt(token) {
		const decoded = jwt.decode(token);
		if (!decoded || !decoded.exp) return null;
		return new Date(decoded.exp * 1000);
	}

	static isExpired(token) {
		const at = Jwt.expiresAt(token);
		return at ? at.getTime() < Date.now() : true;
	}

	// Pull a bearer token out of an Authorization header value.
	static fromHeader(header) {
		if (!header || typeof header !== 'string') return null;
		const [scheme, value] = header.split(' ');
		return scheme === 'Bearer' && value ? value : null;
	}
}

module.exports = Jwt;
