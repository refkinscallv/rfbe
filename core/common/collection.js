'use strict';

// A fluent, chainable wrapper over an array — inspired by Laravel collections.
// Every transforming method returns a new Collection so chains stay immutable.
class Collection {
	constructor(items = []) {
		this.items = Array.isArray(items) ? [...items] : Object.values(items || {});
	}

	static make(items = []) {
		return new Collection(items);
	}

	all() {
		return this.items;
	}

	count() {
		return this.items.length;
	}

	isEmpty() {
		return this.items.length === 0;
	}

	isNotEmpty() {
		return this.items.length > 0;
	}

	map(fn) {
		return new Collection(this.items.map(fn));
	}

	filter(fn = (v) => Boolean(v)) {
		return new Collection(this.items.filter(fn));
	}

	reject(fn) {
		return new Collection(this.items.filter((v, i) => !fn(v, i)));
	}

	each(fn) {
		this.items.forEach(fn);
		return this;
	}

	reduce(fn, initial) {
		return this.items.reduce(fn, initial);
	}

	// Filter by a field/value pair: where('status', 'active').
	where(key, value) {
		return new Collection(this.items.filter((item) => item?.[key] === value));
	}

	whereIn(key, values) {
		const set = new Set(values);
		return new Collection(this.items.filter((item) => set.has(item?.[key])));
	}

	first(fn = null, fallback = null) {
		if (fn) {
			const found = this.items.find(fn);
			return found === undefined ? fallback : found;
		}
		return this.items.length ? this.items[0] : fallback;
	}

	last(fallback = null) {
		return this.items.length ? this.items[this.items.length - 1] : fallback;
	}

	pluck(key) {
		return new Collection(this.items.map((item) => item?.[key]));
	}

	unique(key = null) {
		if (!key) return new Collection([...new Set(this.items)]);
		const seen = new Set();
		return new Collection(
			this.items.filter((item) => {
				const id = item?.[key];
				if (seen.has(id)) return false;
				seen.add(id);
				return true;
			}),
		);
	}

	sortBy(key, direction = 'asc') {
		const selector = typeof key === 'function' ? key : (item) => item?.[key];
		const sorted = [...this.items].sort((a, b) => {
			const va = selector(a);
			const vb = selector(b);
			if (va < vb) return direction === 'asc' ? -1 : 1;
			if (va > vb) return direction === 'asc' ? 1 : -1;
			return 0;
		});
		return new Collection(sorted);
	}

	groupBy(key) {
		const selector = typeof key === 'function' ? key : (item) => item?.[key];
		const groups = {};
		for (const item of this.items) {
			const g = selector(item);
			(groups[g] = groups[g] || []).push(item);
		}
		return groups;
	}

	take(count) {
		return new Collection(count < 0 ? this.items.slice(count) : this.items.slice(0, count));
	}

	skip(count) {
		return new Collection(this.items.slice(count));
	}

	chunk(size) {
		const out = [];
		for (let i = 0; i < this.items.length; i += size) {
			out.push(new Collection(this.items.slice(i, i + size)));
		}
		return new Collection(out);
	}

	sum(key = null) {
		const selector = key ? (item) => item?.[key] : (item) => item;
		return this.items.reduce((total, item) => total + (Number(selector(item)) || 0), 0);
	}

	avg(key = null) {
		return this.items.length ? this.sum(key) / this.items.length : 0;
	}

	min(key = null) {
		const selector = key ? (item) => item?.[key] : (item) => item;
		return this.items.length ? Math.min(...this.items.map(selector)) : null;
	}

	max(key = null) {
		const selector = key ? (item) => item?.[key] : (item) => item;
		return this.items.length ? Math.max(...this.items.map(selector)) : null;
	}

	contains(value) {
		return this.items.includes(value);
	}

	reverse() {
		return new Collection([...this.items].reverse());
	}

	values() {
		return new Collection([...this.items]);
	}

	toArray() {
		return this.items;
	}

	toJson() {
		return JSON.stringify(this.items);
	}

	// Make the collection itself iterable (for...of, spread).
	[Symbol.iterator]() {
		return this.items[Symbol.iterator]();
	}
}

module.exports = Collection;
