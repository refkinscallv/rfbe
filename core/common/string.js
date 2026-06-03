'use strict';

const crypto = require('crypto');

// String helpers: casing, slugs, truncation and random tokens.
class Str {
	// Uppercase the first character only.
	static ucfirst(str) {
		str = String(str ?? '');
		return str.charAt(0).toUpperCase() + str.slice(1);
	}

	// Lowercase the first character only.
	static lcfirst(str) {
		str = String(str ?? '');
		return str.charAt(0).toLowerCase() + str.slice(1);
	}

	// Capitalize every word.
	static title(str) {
		return String(str ?? '')
			.toLowerCase()
			.replace(/\b\w/g, (c) => c.toUpperCase());
	}

	// Split words from camelCase, snake_case, kebab-case and spaces.
	static words(str) {
		return String(str ?? '')
			.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
			.replace(/[_\-]+/g, ' ')
			.trim()
			.split(/\s+/)
			.filter(Boolean);
	}

	static camel(str) {
		const words = Str.words(str);
		return words.map((w, i) => (i === 0 ? w.toLowerCase() : Str.ucfirst(w.toLowerCase()))).join('');
	}

	static pascal(str) {
		return Str.words(str)
			.map((w) => Str.ucfirst(w.toLowerCase()))
			.join('');
	}

	static snake(str) {
		return Str.words(str)
			.map((w) => w.toLowerCase())
			.join('_');
	}

	static kebab(str) {
		return Str.words(str)
			.map((w) => w.toLowerCase())
			.join('-');
	}

	// URL-friendly slug.
	static slug(str, separator = '-') {
		return String(str ?? '')
			.normalize('NFKD')
			.replace(/[̀-ͯ]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, separator)
			.replace(new RegExp(`^${separator}+|${separator}+$`, 'g'), '');
	}

	// Cut a string to length, appending a suffix when truncated.
	static truncate(str, length = 100, suffix = '...') {
		str = String(str ?? '');
		if (str.length <= length) return str;
		return str.slice(0, length - suffix.length).trimEnd() + suffix;
	}

	static limitWords(str, count = 10, suffix = '...') {
		const words = String(str ?? '').split(/\s+/);
		if (words.length <= count) return str;
		return words.slice(0, count).join(' ') + suffix;
	}

	static startsWith(str, prefix) {
		return String(str ?? '').startsWith(prefix);
	}

	static endsWith(str, suffix) {
		return String(str ?? '').endsWith(suffix);
	}

	static contains(str, needle) {
		return String(str ?? '').includes(needle);
	}

	// Ensure a string begins with the given prefix exactly once.
	static start(str, prefix) {
		str = String(str ?? '');
		return str.startsWith(prefix) ? str : prefix + str;
	}

	// Ensure a string ends with the given suffix exactly once.
	static finish(str, suffix) {
		str = String(str ?? '');
		return str.endsWith(suffix) ? str : str + suffix;
	}

	static mask(str, char = '*', start = 0, length = null) {
		str = String(str ?? '');
		const end = length === null ? str.length : start + length;
		return str
			.split('')
			.map((c, i) => (i >= start && i < end ? char : c))
			.join('');
	}

	// Cryptographically strong random hex string.
	static random(length = 16) {
		return crypto
			.randomBytes(Math.ceil(length / 2))
			.toString('hex')
			.slice(0, length);
	}

	static uuid() {
		return crypto.randomUUID();
	}

	static escapeHtml(str) {
		const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
		return String(str ?? '').replace(/[&<>"']/g, (c) => map[c]);
	}

	static isEmpty(str) {
		return str === null || str === undefined || String(str).trim() === '';
	}
}

module.exports = Str;
