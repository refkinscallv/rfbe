'use strict';

// Object helpers with dot-notation access and immutable-friendly merges.
class Obj {
	// Read a nested value by dot path: get(obj, 'a.b.c', fallback).
	static get(obj, path, fallback = null) {
		if (!obj || !path) return fallback;
		const keys = Array.isArray(path) ? path : String(path).split('.');
		let current = obj;
		for (const key of keys) {
			if (current === null || current === undefined || !(key in current)) {
				return fallback;
			}
			current = current[key];
		}
		return current === undefined ? fallback : current;
	}

	// Write a nested value by dot path, creating intermediate objects.
	static set(obj, path, value) {
		const keys = Array.isArray(path) ? path : String(path).split('.');
		let current = obj;
		for (let i = 0; i < keys.length - 1; i++) {
			const key = keys[i];
			if (typeof current[key] !== 'object' || current[key] === null) {
				current[key] = {};
			}
			current = current[key];
		}
		current[keys[keys.length - 1]] = value;
		return obj;
	}

	// True when the dot path exists.
	static has(obj, path) {
		const keys = Array.isArray(path) ? path : String(path).split('.');
		let current = obj;
		for (const key of keys) {
			if (current === null || current === undefined || !(key in current)) {
				return false;
			}
			current = current[key];
		}
		return true;
	}

	// Delete a nested key by dot path.
	static forget(obj, path) {
		const keys = Array.isArray(path) ? path : String(path).split('.');
		let current = obj;
		for (let i = 0; i < keys.length - 1; i++) {
			if (typeof current[keys[i]] !== 'object' || current[keys[i]] === null) return obj;
			current = current[keys[i]];
		}
		delete current[keys[keys.length - 1]];
		return obj;
	}

	// New object containing only the listed keys.
	static pick(obj, keys) {
		const out = {};
		for (const key of Arr(keys)) {
			if (obj && key in obj) out[key] = obj[key];
		}
		return out;
	}

	// New object without the listed keys.
	static omit(obj, keys) {
		const exclude = new Set(Arr(keys));
		const out = {};
		for (const key of Object.keys(obj || {})) {
			if (!exclude.has(key)) out[key] = obj[key];
		}
		return out;
	}

	// Recursive deep merge; later sources win.
	static merge(target, ...sources) {
		for (const source of sources) {
			if (!source) continue;
			for (const key of Object.keys(source)) {
				const sv = source[key];
				const tv = target[key];
				if (Obj.isPlain(sv) && Obj.isPlain(tv)) {
					target[key] = Obj.merge({ ...tv }, sv);
				} else {
					target[key] = sv;
				}
			}
		}
		return target;
	}

	// Structured deep clone, with a JSON fallback for older runtimes.
	static clone(obj) {
		if (typeof structuredClone === 'function') {
			try {
				return structuredClone(obj);
			} catch {
				/* fall through to JSON clone */
			}
		}
		return JSON.parse(JSON.stringify(obj));
	}

	static isPlain(value) {
		if (typeof value !== 'object' || value === null) return false;
		const proto = Object.getPrototypeOf(value);
		return proto === Object.prototype || proto === null;
	}

	static isEmpty(value) {
		if (value === null || value === undefined) return true;
		if (Array.isArray(value)) return value.length === 0;
		if (typeof value === 'object') return Object.keys(value).length === 0;
		return false;
	}

	// Build an object from [key, value] entries.
	static fromEntries(entries) {
		return Object.fromEntries(entries);
	}

	// Map over values while keeping keys.
	static mapValues(obj, fn) {
		const out = {};
		for (const [key, val] of Object.entries(obj || {})) {
			out[key] = fn(val, key);
		}
		return out;
	}

	// Flatten nested objects into dot-path keys.
	static flatten(obj, prefix = '') {
		const out = {};
		for (const [key, val] of Object.entries(obj || {})) {
			const path = prefix ? `${prefix}.${key}` : key;
			if (Obj.isPlain(val)) {
				Object.assign(out, Obj.flatten(val, path));
			} else {
				out[path] = val;
			}
		}
		return out;
	}
}

// Local helper so pick/omit accept either a single key or an array.
function Arr(value) {
	if (value === null || value === undefined) return [];
	return Array.isArray(value) ? value : [value];
}

module.exports = Obj;
