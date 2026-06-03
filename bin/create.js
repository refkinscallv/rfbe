#!/usr/bin/env node
'use strict';

// Project scaffolder for RFBE — the initializer behind `npm create rfbe`.
//
//   npm create rfbe@latest my-app      (once published as the create-rfbe package)
//   npx create-rfbe my-app
//   node bin/create.js my-app          (from a local checkout)
//
// It copies this package's template files into <target>, writes a fresh .env,
// installs dependencies, and generates app secrets.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TEMPLATE_ROOT = path.resolve(__dirname, '..');

// Paths (relative to the template root) that must never be copied into a new app.
const IGNORED = new Set(['node_modules', '.git', '.env', 'logs', 'coverage', '.nyc_output', 'bin', 'package-lock.json', '.claude', '.vscode']);

const c = {
	reset: '\x1b[0m',
	bold: '\x1b[1m',
	green: '\x1b[32m',
	cyan: '\x1b[36m',
	yellow: '\x1b[33m',
	red: '\x1b[31m',
};
const log = (msg) => console.log(msg);
const ok = (msg) => console.log(`${c.green}✓${c.reset} ${msg}`);
const die = (msg) => {
	console.error(`${c.red}✗ ${msg}${c.reset}`);
	process.exit(1);
};

function parseArgs(argv) {
	const args = argv.slice(2);
	const flags = new Set(args.filter((a) => a.startsWith('--')));
	const target = args.find((a) => !a.startsWith('--')) || 'rfbe-app';
	return { target, install: !flags.has('--no-install'), git: !flags.has('--no-git') };
}

// True when the path (or any of its ancestors) is in the ignore list.
function isIgnored(relPath) {
	const segments = relPath.split(path.sep);
	if (IGNORED.has(segments[0])) return true;
	// Ignore everything under storage/uploads except the .gitkeep marker.
	if (relPath.startsWith(path.join('storage', 'uploads')) && !relPath.endsWith('.gitkeep')) return true;
	return false;
}

function copyTemplate(targetDir) {
	fs.cpSync(TEMPLATE_ROOT, targetDir, {
		recursive: true,
		filter: (src) => {
			const rel = path.relative(TEMPLATE_ROOT, src);
			if (rel === '') return true;
			return !isIgnored(rel);
		},
	});
}

// npm strips .gitignore from published packages, so write a sensible one when
// the copy did not include it (i.e. when scaffolding from an installed package).
function ensureGitignore(targetDir) {
	const file = path.join(targetDir, '.gitignore');
	if (fs.existsSync(file)) return;
	fs.writeFileSync(file, ['node_modules/', '.env', '.env.*.local', 'logs/', '*.log', 'storage/uploads/*', '!storage/uploads/.gitkeep', '.DS_Store', ''].join('\n'), 'utf8');
}

// Tailor the copied package.json for a freshly-generated application.
function rewritePackageJson(targetDir, appName) {
	const file = path.join(targetDir, 'package.json');
	const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));

	pkg.name = appName;
	pkg.version = '0.1.0';
	pkg.private = true;
	delete pkg.bin;
	delete pkg.files;
	delete pkg.homepage;
	delete pkg.bugs;
	delete pkg.repository;
	delete pkg.publishConfig;

	fs.writeFileSync(file, `${JSON.stringify(pkg, null, 4)}\n`, 'utf8');
}

function main() {
	const { target, install, git } = parseArgs(process.argv);
	const targetDir = path.resolve(process.cwd(), target);
	const appName = path.basename(targetDir);

	log(`\n${c.bold}${c.cyan}Creating a new RFBE app in ${targetDir}${c.reset}\n`);

	if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
		die(`Target directory "${target}" already exists and is not empty.`);
	}

	fs.mkdirSync(targetDir, { recursive: true });
	copyTemplate(targetDir);
	ensureGitignore(targetDir);
	ok('Copied project files');

	rewritePackageJson(targetDir, appName);
	ok('Prepared package.json');

	// Ensure the runtime upload directory exists in the new app.
	fs.mkdirSync(path.join(targetDir, 'storage', 'uploads'), { recursive: true });

	if (install) {
		log(`\n${c.yellow}Installing dependencies…${c.reset}`);
		execSync('npm install', { cwd: targetDir, stdio: 'inherit' });
		ok('Installed dependencies');

		// setup creates .env from .env.example and generates APP_KEY + JWT secrets.
		execSync('npm run setup', { cwd: targetDir, stdio: 'inherit' });
		ok('Generated .env and app secrets');
	} else {
		// Without an install, at least seed a .env so the app can be configured.
		fs.copyFileSync(path.join(targetDir, '.env.example'), path.join(targetDir, '.env'));
		ok('Created .env from .env.example');
	}

	if (git) {
		try {
			execSync('git init -q', { cwd: targetDir, stdio: 'ignore' });
			ok('Initialized a git repository');
		} catch {
			/* git is optional; ignore if unavailable */
		}
	}

	log(`\n${c.green}${c.bold}Done!${c.reset} Next steps:\n`);
	log(`  cd ${target}`);
	if (!install) log('  npm install && npm run setup');
	log('  # edit .env (database, mail, etc.)');
	log(`  npm run dev\n`);
}

try {
	main();
} catch (error) {
	die(error.message);
}
