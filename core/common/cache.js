'use strict';

// Process-local key/value cache with per-entry TTL. Suitable for hot data that
// can be safely recomputed; swap in a Redis driver later if you outgrow it.
const store = new Map();

// Lazily-started sweeper that drops expired keys so the Map does not grow.
let sweeper = null;

function startSweeper() {
	if (sweeper) return;
	sweeper = setInterval(() => {
		const now = Date.now();
		for (const [key, entry] of store) {
			if (entry.expires !== 0 && entry.expires <= now) store.delete(key);
		}
	}, 60 * 1000);
	// Do not keep the event loop alive solely for cache cleanup.
	if (sweeper.unref) sweeper.unref();
}

function resolveTtl(ttlSeconds) {
	if (ttlSeconds === null || ttlSeconds === undefined) {
		const config = require('@app/config');
		ttlSeconds = config.cache.ttl;
	}
	return ttlSeconds === 0 ? 0 : Date.now() + ttlSeconds * 1000;
}

class Cache {
	// Store a value for ttlSeconds (0 = never expires; null = config default).
	static set(key, value, ttlSeconds = null) {
		startSweeper();
		store.set(key, { value, expires: resolveTtl(ttlSeconds) });
		return value;
	}

	// Read a value, or fallback when missing/expired.
	static get(key, fallback = null) {
		const entry = store.get(key);
		if (!entry) return fallback;
		if (entry.expires !== 0 && entry.expires <= Date.now()) {
			store.delete(key);
			return fallback;
		}
		return entry.value;
	}

	static has(key) {
		return Cache.get(key, Symbol.for('miss')) !== Symbol.for('miss');
	}

	static forget(key) {
		return store.delete(key);
	}

	static flush() {
		store.clear();
	}

	// Return the cached value, or compute it via the resolver and cache it.
	static async remember(key, ttlSeconds, resolver) {
		const cached = Cache.get(key, Symbol.for('miss'));
		if (cached !== Symbol.for('miss')) return cached;
		const value = await resolver();
		Cache.set(key, value, ttlSeconds);
		return value;
	}

	// remember() with no expiry.
	static async rememberForever(key, resolver) {
		return Cache.remember(key, 0, resolver);
	}

	// Get and delete in one step.
	static pull(key, fallback = null) {
		const value = Cache.get(key, fallback);
		store.delete(key);
		return value;
	}

	// Atomically increment/decrement a numeric entry.
	static increment(key, amount = 1) {
		const current = Number(Cache.get(key, 0)) || 0;
		const next = current + amount;
		const entry = store.get(key);
		Cache.set(key, next, entry ? null : 0);
		return next;
	}

	static decrement(key, amount = 1) {
		return Cache.increment(key, -amount);
	}

	static keys() {
		return [...store.keys()];
	}
}

module.exports = Cache;
