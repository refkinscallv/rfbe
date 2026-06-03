'use strict';

const crypto = require('crypto');
const bcrypt = require('bcrypt');

// Hashing utilities: password hashing via bcrypt plus raw digest helpers.
class Hash {
	// Hash a plaintext value with bcrypt. Salt rounds come from config.
	static async make(value, rounds = null) {
		const config = require('@app/config');
		const saltRounds = rounds ?? config.bcrypt.saltRounds;
		return bcrypt.hash(String(value), saltRounds);
	}

	// Verify a plaintext value against a bcrypt hash.
	static async check(value, hashed) {
		if (!hashed) return false;
		return bcrypt.compare(String(value), hashed);
	}

	// Detect whether a stored hash should be re-hashed at higher cost.
	static needsRehash(hashed, rounds = null) {
		const config = require('@app/config');
		const target = rounds ?? config.bcrypt.saltRounds;
		const match = /^\$2[aby]\$(\d{2})\$/.exec(hashed || '');
		if (!match) return true;
		return parseInt(match[1], 10) < target;
	}

	// Generic digest (md5, sha1, sha256, sha512, ...).
	static digest(value, algorithm = 'sha256', encoding = 'hex') {
		return crypto.createHash(algorithm).update(String(value)).digest(encoding);
	}

	static md5(value) {
		return Hash.digest(value, 'md5');
	}

	static sha256(value) {
		return Hash.digest(value, 'sha256');
	}

	static sha512(value) {
		return Hash.digest(value, 'sha512');
	}

	// Keyed HMAC digest.
	static hmac(value, secret, algorithm = 'sha256') {
		return crypto.createHmac(algorithm, secret).update(String(value)).digest('hex');
	}

	// Constant-time comparison to avoid timing attacks.
	static equals(a, b) {
		const bufA = Buffer.from(String(a));
		const bufB = Buffer.from(String(b));
		if (bufA.length !== bufB.length) return false;
		return crypto.timingSafeEqual(bufA, bufB);
	}
}

module.exports = Hash;
