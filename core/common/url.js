'use strict';

// URL helpers built on the WHATWG URL and URLSearchParams APIs.
class Url {
	// Join base and path segments without doubling slashes.
	static join(...parts) {
		return parts
			.filter((p) => p !== null && p !== undefined && p !== '')
			.map((p, i) => {
				let s = String(p);
				if (i > 0) s = s.replace(/^\/+/, '');
				if (i < parts.length - 1) s = s.replace(/\/+$/, '');
				return s;
			})
			.join('/');
	}

	// Serialize an object to a query string (without the leading '?').
	static buildQuery(params = {}) {
		const search = new URLSearchParams();
		for (const [key, value] of Object.entries(params)) {
			if (value === null || value === undefined) continue;
			if (Array.isArray(value)) {
				value.forEach((v) => search.append(key, String(v)));
			} else {
				search.append(key, String(value));
			}
		}
		return search.toString();
	}

	// Parse a query string into a plain object, grouping repeated keys.
	static parseQuery(query = '') {
		const search = new URLSearchParams(query.replace(/^\?/, ''));
		const out = {};
		for (const key of new Set(search.keys())) {
			const all = search.getAll(key);
			out[key] = all.length > 1 ? all : all[0];
		}
		return out;
	}

	// Append/override query parameters on an existing URL.
	static withQuery(url, params = {}) {
		const u = new URL(url);
		for (const [key, value] of Object.entries(params)) {
			if (value === null || value === undefined) {
				u.searchParams.delete(key);
			} else {
				u.searchParams.set(key, String(value));
			}
		}
		return u.toString();
	}

	// Break a URL into its component parts.
	static parse(url) {
		const u = new URL(url);
		return {
			protocol: u.protocol.replace(':', ''),
			host: u.host,
			hostname: u.hostname,
			port: u.port,
			path: u.pathname,
			query: Url.parseQuery(u.search),
			hash: u.hash.replace('#', ''),
			origin: u.origin,
		};
	}

	static isValid(url) {
		try {
			new URL(url);
			return true;
		} catch {
			return false;
		}
	}
}

module.exports = Url;
