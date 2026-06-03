'use strict';

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

// Derive a stable 32-byte key from the application secret.
function deriveKey(salt) {
	const config = require('@app/config');
	const secret = config.app.key || config.jwt.secret;
	return crypto.scryptSync(String(secret), salt, KEY_LENGTH);
}

// Authenticated symmetric encryption (AES-256-GCM) for at-rest secrets.
class Crypt {
	// Encrypt a value. Objects are JSON-encoded. Returns a compact base64 token.
	static encrypt(value) {
		const plaintext = typeof value === 'string' ? value : JSON.stringify(value);
		const salt = crypto.randomBytes(SALT_LENGTH);
		const iv = crypto.randomBytes(IV_LENGTH);
		const key = deriveKey(salt);

		const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
		const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
		const tag = cipher.getAuthTag();

		// Layout: salt | iv | authTag | ciphertext
		return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
	}

	// Decrypt a token produced by encrypt(). Pass asJson to revive objects.
	static decrypt(token, asJson = false) {
		const data = Buffer.from(String(token), 'base64');
		const salt = data.subarray(0, SALT_LENGTH);
		const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
		const tag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + 16);
		const ciphertext = data.subarray(SALT_LENGTH + IV_LENGTH + 16);
		const key = deriveKey(salt);

		const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
		decipher.setAuthTag(tag);
		const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');

		return asJson ? JSON.parse(decrypted) : decrypted;
	}

	// Plain base64 encode/decode helpers (encoding only, not encryption).
	static base64Encode(value) {
		return Buffer.from(String(value), 'utf8').toString('base64');
	}

	static base64Decode(value) {
		return Buffer.from(String(value), 'base64').toString('utf8');
	}

	// URL-safe base64 variants.
	static base64UrlEncode(value) {
		return Buffer.from(String(value), 'utf8').toString('base64url');
	}

	static base64UrlDecode(value) {
		return Buffer.from(String(value), 'base64url').toString('utf8');
	}
}

module.exports = Crypt;
