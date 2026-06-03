'use strict';

// Array helpers — small, predictable utilities for everyday list work.
class Arr {
	// Wrap any value into an array. null/undefined become an empty array.
	static wrap(value) {
		if (value === null || value === undefined) return [];
		return Array.isArray(value) ? value : [value];
	}

	// Return the first element, or the value matching a predicate.
	static first(arr, predicate = null, fallback = null) {
		if (!Array.isArray(arr)) return fallback;
		if (typeof predicate === 'function') {
			const found = arr.find(predicate);
			return found === undefined ? fallback : found;
		}
		return arr.length ? arr[0] : fallback;
	}

	// Return the last element, or the value matching a predicate.
	static last(arr, predicate = null, fallback = null) {
		if (!Array.isArray(arr)) return fallback;
		if (typeof predicate === 'function') {
			for (let i = arr.length - 1; i >= 0; i--) {
				if (predicate(arr[i], i)) return arr[i];
			}
			return fallback;
		}
		return arr.length ? arr[arr.length - 1] : fallback;
	}

	// Remove duplicate values. With a key/selector, dedupe objects by that key.
	static unique(arr, key = null) {
		if (!Array.isArray(arr)) return [];
		if (!key) return [...new Set(arr)];
		const selector = typeof key === 'function' ? key : (item) => item[key];
		const seen = new Set();
		return arr.filter((item) => {
			const id = selector(item);
			if (seen.has(id)) return false;
			seen.add(id);
			return true;
		});
	}

	// Flatten nested arrays up to the given depth.
	static flatten(arr, depth = Infinity) {
		return Array.isArray(arr) ? arr.flat(depth) : [];
	}

	// Split an array into chunks of the given size.
	static chunk(arr, size = 1) {
		if (!Array.isArray(arr) || size < 1) return [];
		const out = [];
		for (let i = 0; i < arr.length; i += size) {
			out.push(arr.slice(i, i + size));
		}
		return out;
	}

	// Group items into an object keyed by the result of a selector.
	static groupBy(arr, key) {
		const selector = typeof key === 'function' ? key : (item) => item[key];
		return (arr || []).reduce((acc, item) => {
			const group = selector(item);
			(acc[group] = acc[group] || []).push(item);
			return acc;
		}, {});
	}

	// Turn an array of objects into a lookup keyed by a property.
	static keyBy(arr, key) {
		const selector = typeof key === 'function' ? key : (item) => item[key];
		return (arr || []).reduce((acc, item) => {
			acc[selector(item)] = item;
			return acc;
		}, {});
	}

	// Pluck a single property out of each object.
	static pluck(arr, key) {
		return (arr || []).map((item) => item?.[key]);
	}

	// Sum a numeric array, optionally via a selector.
	static sum(arr, key = null) {
		const selector = key ? (typeof key === 'function' ? key : (i) => i[key]) : (i) => i;
		return (arr || []).reduce((total, item) => total + (Number(selector(item)) || 0), 0);
	}

	// Average of a numeric array, optionally via a selector.
	static avg(arr, key = null) {
		if (!arr || !arr.length) return 0;
		return Arr.sum(arr, key) / arr.length;
	}

	// Shuffle a copy of the array (Fisher–Yates).
	static shuffle(arr) {
		const copy = [...(arr || [])];
		for (let i = copy.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[copy[i], copy[j]] = [copy[j], copy[i]];
		}
		return copy;
	}

	// Pick one or more random elements.
	static random(arr, count = 1) {
		const shuffled = Arr.shuffle(arr);
		return count === 1 ? shuffled[0] : shuffled.slice(0, count);
	}

	// Everything in `a` that is not in `b`.
	static difference(a, b) {
		const set = new Set(b || []);
		return (a || []).filter((item) => !set.has(item));
	}

	// Values present in both arrays.
	static intersect(a, b) {
		const set = new Set(b || []);
		return (a || []).filter((item) => set.has(item));
	}

	// Strip out null/undefined/false/empty-string entries.
	static compact(arr) {
		return (arr || []).filter((item) => item !== null && item !== undefined && item !== false && item !== '');
	}

	// A range of numbers, inclusive of both ends.
	static range(start, end, step = 1) {
		const out = [];
		if (step === 0) return out;
		if (start <= end) {
			for (let i = start; i <= end; i += step) out.push(i);
		} else {
			for (let i = start; i >= end; i -= Math.abs(step)) out.push(i);
		}
		return out;
	}
}

module.exports = Arr;
