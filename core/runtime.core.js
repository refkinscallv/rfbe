'use strict';

const config = require('@app/config');

// ─── STORE ────────────────────────────────────────────────────────────────────

const _store = new Map();

// ─── SETTERS / GETTERS ────────────────────────────────────────────────────────

const HANDLERS = {
	timezone: (val) => {
		process.env.TZ = String(val);
	},
	max_listeners: (val) => {
		process.setMaxListeners(parseInt(val, 10));
	},
	stack_trace_limit: (val) => {
		Error.stackTraceLimit = parseInt(val, 10);
	},
	uv_threadpool_size: (val) => {
		process.env.UV_THREADPOOL_SIZE = String(parseInt(val, 10));
	},
	deprecation_warnings: (val) => {
		if (!val) process.removeAllListeners('warning');
	},
	bigint_json: (val) => {
		if (val) {
			// eslint-disable-next-line no-extend-native
			BigInt.prototype.toJSON = function () {
				return this.toString();
			};
		}
	},
	node_env: (val) => {
		process.env.NODE_ENV = String(val);
	},
};

const GETTERS = {
	timezone: () => process.env.TZ,
	max_listeners: () => process.getMaxListeners(),
	stack_trace_limit: () => Error.stackTraceLimit,
	uv_threadpool_size: () => parseInt(process.env.UV_THREADPOOL_SIZE || '4', 10),
	node_env: () => process.env.NODE_ENV,
};

// ─── RUNTIME CLASS ────────────────────────────────────────────────────────────

class Runtime {
	static set(key, value) {
		const handler = HANDLERS[key];
		if (!handler) {
			_store.set(key, value);
			return;
		}
		handler(value);
		_store.set(key, value);
	}

	static get(key) {
		const getter = GETTERS[key];
		if (getter) return getter();
		return _store.has(key) ? _store.get(key) : null;
	}

	static all() {
		const result = {};
		for (const key of Object.keys(GETTERS)) result[key] = Runtime.get(key);
		for (const [key, val] of _store.entries()) result[key] = val;
		return result;
	}

	static bootstrap() {
		Runtime.set('timezone', config.app.timezone);
		Runtime.set('node_env', config.app.env);
		Runtime.set('max_listeners', config.runtime.maxListeners);
		Runtime.set('stack_trace_limit', config.runtime.stackTraceLimit);
		Runtime.set('uv_threadpool_size', config.runtime.uvThreadpoolSize);
		Runtime.set('bigint_json', config.runtime.bigintJson);
		Runtime.set('deprecation_warnings', config.runtime.deprecationWarnings);
	}
}

// ─── AUTO BOOTSTRAP ───────────────────────────────────────────────────────────

Runtime.bootstrap();

module.exports = Runtime;
