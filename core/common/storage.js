'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const nodePath = require('path');

// Resolve a path inside the configured storage root, guarding against escapes.
function resolvePath(relative) {
	const config = require('@app/config');
	const root = nodePath.resolve(process.cwd(), config.storage.root);
	const full = nodePath.resolve(root, relative || '');
	if (full !== root && !full.startsWith(root + nodePath.sep)) {
		throw new Error(`Storage path escapes the storage root: ${relative}`);
	}
	return { root, full };
}

// Filesystem storage abstraction rooted at config.storage.root. All paths are
// relative to that root, so application code never deals in absolute paths.
class Storage {
	// Absolute path for a relative storage key.
	static path(relative = '') {
		return resolvePath(relative).full;
	}

	static exists(relative) {
		return fs.existsSync(resolvePath(relative).full);
	}

	// Write contents, creating parent directories as needed.
	static async put(relative, contents) {
		const { full } = resolvePath(relative);
		await fsp.mkdir(nodePath.dirname(full), { recursive: true });
		await fsp.writeFile(full, contents);
		return relative;
	}

	static async get(relative, encoding = 'utf8') {
		return fsp.readFile(resolvePath(relative).full, encoding);
	}

	static async getBuffer(relative) {
		return fsp.readFile(resolvePath(relative).full);
	}

	static async append(relative, contents) {
		const { full } = resolvePath(relative);
		await fsp.mkdir(nodePath.dirname(full), { recursive: true });
		await fsp.appendFile(full, contents);
		return relative;
	}

	static async delete(relative) {
		const { full } = resolvePath(relative);
		if (!fs.existsSync(full)) return false;
		await fsp.rm(full, { recursive: true, force: true });
		return true;
	}

	static async copy(from, to) {
		const src = resolvePath(from).full;
		const dest = resolvePath(to).full;
		await fsp.mkdir(nodePath.dirname(dest), { recursive: true });
		await fsp.copyFile(src, dest);
		return to;
	}

	static async move(from, to) {
		const src = resolvePath(from).full;
		const dest = resolvePath(to).full;
		await fsp.mkdir(nodePath.dirname(dest), { recursive: true });
		await fsp.rename(src, dest);
		return to;
	}

	static async makeDir(relative) {
		await fsp.mkdir(resolvePath(relative).full, { recursive: true });
		return relative;
	}

	// List entries in a directory (names only).
	static async list(relative = '') {
		const { full } = resolvePath(relative);
		if (!fs.existsSync(full)) return [];
		return fsp.readdir(full);
	}

	// File size in bytes, or null when missing.
	static async size(relative) {
		const { full } = resolvePath(relative);
		if (!fs.existsSync(full)) return null;
		const stat = await fsp.stat(full);
		return stat.size;
	}
}

module.exports = Storage;
