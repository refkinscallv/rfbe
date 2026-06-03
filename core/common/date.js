'use strict';

const MS = {
	second: 1000,
	minute: 60 * 1000,
	hour: 60 * 60 * 1000,
	day: 24 * 60 * 60 * 1000,
	week: 7 * 24 * 60 * 60 * 1000,
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const pad = (n, len = 2) => String(Math.abs(n)).padStart(len, '0');

// A lightweight, chainable date wrapper in the spirit of Carbon / dayjs.
// Instances are immutable: arithmetic methods return a fresh DateTime.
class DateTime {
	constructor(input = null) {
		if (input instanceof DateTime) {
			this._date = new Date(input._date.getTime());
		} else if (input instanceof Date) {
			this._date = new Date(input.getTime());
		} else if (input === null || input === undefined) {
			this._date = new Date();
		} else {
			this._date = new Date(input);
		}
	}

	// ── Factories ────────────────────────────────────────────────────────────
	static now() {
		return new DateTime();
	}

	static parse(input) {
		return new DateTime(input);
	}

	static create(year, month = 1, day = 1, hour = 0, minute = 0, second = 0) {
		return new DateTime(new Date(year, month - 1, day, hour, minute, second));
	}

	static fromTimestamp(seconds) {
		return new DateTime(new Date(seconds * 1000));
	}

	// ── Accessors ────────────────────────────────────────────────────────────
	year() {
		return this._date.getFullYear();
	}
	month() {
		return this._date.getMonth() + 1;
	}
	day() {
		return this._date.getDate();
	}
	hour() {
		return this._date.getHours();
	}
	minute() {
		return this._date.getMinutes();
	}
	second() {
		return this._date.getSeconds();
	}
	dayOfWeek() {
		return this._date.getDay();
	}
	timestamp() {
		return Math.floor(this._date.getTime() / 1000);
	}
	valueOf() {
		return this._date.getTime();
	}
	toDate() {
		return new Date(this._date.getTime());
	}
	clone() {
		return new DateTime(this._date);
	}

	// ── Arithmetic (immutable) ───────────────────────────────────────────────
	_add(ms) {
		return new DateTime(new Date(this._date.getTime() + ms));
	}

	addSeconds(n) {
		return this._add(n * MS.second);
	}
	subSeconds(n) {
		return this._add(-n * MS.second);
	}
	addMinutes(n) {
		return this._add(n * MS.minute);
	}
	subMinutes(n) {
		return this._add(-n * MS.minute);
	}
	addHours(n) {
		return this._add(n * MS.hour);
	}
	subHours(n) {
		return this._add(-n * MS.hour);
	}
	addDays(n) {
		return this._add(n * MS.day);
	}
	subDays(n) {
		return this._add(-n * MS.day);
	}
	addWeeks(n) {
		return this._add(n * MS.week);
	}
	subWeeks(n) {
		return this._add(-n * MS.week);
	}

	addMonths(n) {
		const d = new Date(this._date.getTime());
		d.setMonth(d.getMonth() + n);
		return new DateTime(d);
	}

	subMonths(n) {
		return this.addMonths(-n);
	}

	addYears(n) {
		const d = new Date(this._date.getTime());
		d.setFullYear(d.getFullYear() + n);
		return new DateTime(d);
	}

	subYears(n) {
		return this.addYears(-n);
	}

	// ── Boundaries ───────────────────────────────────────────────────────────
	startOfDay() {
		const d = new Date(this._date.getTime());
		d.setHours(0, 0, 0, 0);
		return new DateTime(d);
	}

	endOfDay() {
		const d = new Date(this._date.getTime());
		d.setHours(23, 59, 59, 999);
		return new DateTime(d);
	}

	// ── Comparisons ──────────────────────────────────────────────────────────
	isBefore(other) {
		return this.valueOf() < new DateTime(other).valueOf();
	}
	isAfter(other) {
		return this.valueOf() > new DateTime(other).valueOf();
	}
	isSame(other) {
		return this.valueOf() === new DateTime(other).valueOf();
	}
	isPast() {
		return this.valueOf() < Date.now();
	}
	isFuture() {
		return this.valueOf() > Date.now();
	}

	// Difference from another date, in the requested unit (signed).
	diff(other, unit = 'seconds') {
		const ms = this.valueOf() - new DateTime(other).valueOf();
		switch (unit) {
			case 'seconds':
				return Math.trunc(ms / MS.second);
			case 'minutes':
				return Math.trunc(ms / MS.minute);
			case 'hours':
				return Math.trunc(ms / MS.hour);
			case 'days':
				return Math.trunc(ms / MS.day);
			case 'weeks':
				return Math.trunc(ms / MS.week);
			default:
				return ms;
		}
	}

	// Human friendly relative phrasing: "3 hours ago", "in 2 days".
	diffForHumans(other = null) {
		const ref = other ? new DateTime(other).valueOf() : Date.now();
		const ms = this.valueOf() - ref;
		const abs = Math.abs(ms);
		const units = [
			['year', MS.day * 365],
			['month', MS.day * 30],
			['day', MS.day],
			['hour', MS.hour],
			['minute', MS.minute],
			['second', MS.second],
		];
		for (const [name, size] of units) {
			const value = Math.floor(abs / size);
			if (value >= 1) {
				const label = `${value} ${name}${value > 1 ? 's' : ''}`;
				return ms < 0 ? `${label} ago` : `in ${label}`;
			}
		}
		return 'just now';
	}

	// ── Formatting ───────────────────────────────────────────────────────────
	// Token format: YYYY MM DD HH mm ss, plus MMMM/MMM/dddd/ddd/A/a.
	format(pattern = 'YYYY-MM-DD HH:mm:ss') {
		const d = this._date;
		const h12 = d.getHours() % 12 || 12;
		const map = {
			YYYY: d.getFullYear(),
			YY: pad(d.getFullYear() % 100),
			MMMM: MONTHS[d.getMonth()],
			MMM: MONTHS[d.getMonth()].slice(0, 3),
			MM: pad(d.getMonth() + 1),
			M: d.getMonth() + 1,
			DD: pad(d.getDate()),
			D: d.getDate(),
			dddd: DAYS[d.getDay()],
			ddd: DAYS[d.getDay()].slice(0, 3),
			HH: pad(d.getHours()),
			H: d.getHours(),
			hh: pad(h12),
			h: h12,
			mm: pad(d.getMinutes()),
			m: d.getMinutes(),
			ss: pad(d.getSeconds()),
			s: d.getSeconds(),
			A: d.getHours() < 12 ? 'AM' : 'PM',
			a: d.getHours() < 12 ? 'am' : 'pm',
		};
		return pattern.replace(/YYYY|YY|MMMM|MMM|MM|M|DD|D|dddd|ddd|HH|H|hh|h|mm|m|ss|s|A|a/g, (token) => map[token]);
	}

	toISOString() {
		return this._date.toISOString();
	}

	toString() {
		return this.format('YYYY-MM-DD HH:mm:ss');
	}

	toJSON() {
		return this._date.toISOString();
	}
}

module.exports = DateTime;
