'use strict';

const Arr = require('@core/common/array');
const Str = require('@core/common/string');
const Obj = require('@core/common/object');
const Url = require('@core/common/url');
const Path = require('@core/common/path');
const Hash = require('@core/common/hash');
const Crypt = require('@core/common/crypt');
const Collection = require('@core/common/collection');
const DateTime = require('@core/common/date');
const Cache = require('@core/common/cache');
const Storage = require('@core/common/storage');

const TRUTHY = new Set(['true', '1', 'yes', 'on', 'y', 't', 'enable', 'enabled']);

// Central facade for shared utilities. Environment readers live here directly
// (config.js depends on them); richer helpers are exposed as namespaces.
class Common {
	// ── Environment readers ──────────────────────────────────────────────────
	static getEnv(key, defaultValue = null) {
		const value = process.env[key];
		return value !== undefined && value !== '' ? value : defaultValue;
	}

	static getEnvInt(key, defaultValue = null) {
		const value = process.env[key];
		if (value === undefined || value === '') return defaultValue;
		const parsed = parseInt(value, 10);
		return isNaN(parsed) ? defaultValue : parsed;
	}

	static getEnvFloat(key, defaultValue = null) {
		const value = process.env[key];
		if (value === undefined || value === '') return defaultValue;
		const parsed = parseFloat(value);
		return isNaN(parsed) ? defaultValue : parsed;
	}

	static getEnvBool(key, defaultValue = null) {
		const value = process.env[key];
		if (value === undefined || value === '') return defaultValue;
		return TRUTHY.has(value.toLowerCase());
	}

	// ── Generic helpers ──────────────────────────────────────────────────────
	// Pause execution for the given number of milliseconds.
	static sleep(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	// True for null, undefined, empty string, empty array or empty object.
	static isEmpty(value) {
		if (value === null || value === undefined) return true;
		if (typeof value === 'string') return value.trim() === '';
		if (Array.isArray(value)) return value.length === 0;
		if (typeof value === 'object') return Object.keys(value).length === 0;
		return false;
	}

	// Run a function and return [error, result] instead of throwing.
	static async attempt(fn) {
		try {
			return [null, await fn()];
		} catch (error) {
			return [error, null];
		}
	}
}

// Expose utility namespaces as static members for ergonomic access:
//   Common.Str.slug(...), Common.Arr.chunk(...), Common.Date.now(), etc.
Common.Arr = Arr;
Common.Str = Str;
Common.Obj = Obj;
Common.Url = Url;
Common.Path = Path;
Common.Hash = Hash;
Common.Crypt = Crypt;
Common.Collection = Collection;
Common.Date = DateTime;
Common.Cache = Cache;
Common.Storage = Storage;

module.exports = Common;
