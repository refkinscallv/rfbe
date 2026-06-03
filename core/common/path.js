'use strict';

const nodePath = require('path');
const fs = require('fs');

const ROOT = process.cwd();

// Path helpers anchored at the project root, plus a few filesystem niceties.
class Path {
	// Absolute path from the project root.
	static base(...segments) {
		return nodePath.resolve(ROOT, ...segments);
	}

	static src(...segments) {
		return Path.base('src', ...segments);
	}

	static core(...segments) {
		return Path.base('core', ...segments);
	}

	static storage(...segments) {
		return Path.base('storage', ...segments);
	}

	static public(...segments) {
		return Path.base('public', ...segments);
	}

	static join(...segments) {
		return nodePath.join(...segments);
	}

	static resolve(...segments) {
		return nodePath.resolve(...segments);
	}

	static dirname(p) {
		return nodePath.dirname(p);
	}

	static basename(p, ext) {
		return nodePath.basename(p, ext);
	}

	// File extension without the leading dot.
	static extension(p) {
		return nodePath.extname(p).replace('.', '');
	}

	static filename(p) {
		return nodePath.basename(p, nodePath.extname(p));
	}

	// Relative path from the project root, in posix form.
	static relative(p) {
		return nodePath.relative(ROOT, p).split(nodePath.sep).join('/');
	}

	static exists(p) {
		return fs.existsSync(p);
	}

	static isFile(p) {
		return fs.existsSync(p) && fs.statSync(p).isFile();
	}

	static isDir(p) {
		return fs.existsSync(p) && fs.statSync(p).isDirectory();
	}

	// Create a directory (and parents) if it does not yet exist.
	static ensureDir(p) {
		if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
		return p;
	}
}

module.exports = Path;
