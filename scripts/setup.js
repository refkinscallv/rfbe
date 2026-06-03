'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const ENV_EXAMPLE = path.join(ROOT, '.env.example');
const ENV_FILE = path.join(ROOT, '.env');
const NODE_MODULES = path.join(ROOT, 'node_modules');

const COLORS = {
	reset: '\x1b[0m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	red: '\x1b[31m',
	cyan: '\x1b[36m',
	bold: '\x1b[1m',
};

const log = {
	info: (msg) => console.log(`${COLORS.cyan}[INFO]${COLORS.reset} ${msg}`),
	ok: (msg) => console.log(`${COLORS.green}[OK]${COLORS.reset}   ${msg}`),
	warn: (msg) => console.log(`${COLORS.yellow}[WARN]${COLORS.reset} ${msg}`),
	error: (msg) => console.log(`${COLORS.red}[ERR]${COLORS.reset}  ${msg}`),
	title: (msg) => console.log(`\n${COLORS.bold}${COLORS.cyan}=== ${msg} ===${COLORS.reset}`),
};

// ─── 1. CHECK DEPENDENCIES ────────────────────────────────────────────────────

function checkDependencies() {
	log.title('Checking Dependencies');

	if (!fs.existsSync(NODE_MODULES)) {
		log.warn('node_modules not found. Running npm install...');
		try {
			execSync('npm install', { cwd: ROOT, stdio: 'inherit' });
			log.ok('Dependencies installed successfully.');
		} catch {
			log.error('npm install failed. Please run it manually.');
			process.exit(1);
		}
		return;
	}

	const pkg = require(path.join(ROOT, 'package.json'));
	const allDeps = {
		...pkg.dependencies,
		...pkg.devDependencies,
	};

	const missing = [];
	for (const dep of Object.keys(allDeps)) {
		const depPath = path.join(NODE_MODULES, dep);
		if (!fs.existsSync(depPath)) missing.push(dep);
	}

	if (missing.length > 0) {
		log.warn(`Missing packages: ${missing.join(', ')}`);
		log.info('Running npm install...');
		try {
			execSync('npm install', { cwd: ROOT, stdio: 'inherit' });
			log.ok('Dependencies installed successfully.');
		} catch {
			log.error('npm install failed. Please run it manually.');
			process.exit(1);
		}
	} else {
		log.ok(`All ${Object.keys(allDeps).length} dependencies are present.`);
	}
}

// ─── 2. CHECK .ENV ────────────────────────────────────────────────────────────

function checkEnv() {
	log.title('Checking .env');

	if (!fs.existsSync(ENV_EXAMPLE)) {
		log.error('.env.example not found. Cannot proceed.');
		process.exit(1);
	}

	const exampleContent = fs.readFileSync(ENV_EXAMPLE, 'utf-8');

	if (!fs.existsSync(ENV_FILE)) {
		fs.writeFileSync(ENV_FILE, exampleContent, 'utf-8');
		log.ok('.env created from .env.example.');
	} else {
		log.info('.env already exists. Checking for missing keys...');
		const envContent = fs.readFileSync(ENV_FILE, 'utf-8');

		const parseKeys = (content) =>
			content
				.split('\n')
				.filter((line) => line.match(/^\s*[A-Z_]+=/))
				.map((line) => line.split('=')[0].trim());

		const exampleKeys = parseKeys(exampleContent);
		const envKeys = parseKeys(envContent);
		const missingKeys = exampleKeys.filter((k) => !envKeys.includes(k));

		if (missingKeys.length > 0) {
			log.warn(`Missing keys in .env: ${missingKeys.join(', ')}`);

			const missingLines = exampleContent
				.split('\n')
				.filter((line) => {
					const key = line.split('=')[0].trim();
					return missingKeys.includes(key);
				})
				.join('\n');

			fs.appendFileSync(ENV_FILE, `\n# Added by setup\n${missingLines}\n`);
			log.ok(`Appended ${missingKeys.length} missing key(s) to .env.`);
		} else {
			log.ok('All required keys are present in .env.');
		}
	}
}

// ─── 3. GENERATE JWT SECRETS ──────────────────────────────────────────────────

function generateJwtSecrets() {
	log.title('JWT Secret Generator');

	if (!fs.existsSync(ENV_FILE)) {
		log.error('.env not found. Run checkEnv first.');
		process.exit(1);
	}

	let envContent = fs.readFileSync(ENV_FILE, 'utf-8');
	let changed = false;

	const PLACEHOLDERS = new Set(['', 'your_jwt_secret_key_here', 'your_jwt_refresh_secret_key_here']);

	const replace = (content, key, value) => {
		const regex = new RegExp(`^(${key}=)(.*)$`, 'm');
		if (regex.test(content)) {
			const current = content.match(regex)[2].trim();
			if (PLACEHOLDERS.has(current)) {
				log.info(`Generating ${key}...`);
				changed = true;
				return content.replace(regex, `$1${value}`);
			} else {
				log.ok(`${key} already set. Skipping.`);
				return content;
			}
		}
		return content;
	};

	const jwtSecret = crypto.randomBytes(64).toString('hex');
	const jwtRefreshSecret = crypto.randomBytes(64).toString('hex');
	const appKey = crypto.randomBytes(32).toString('hex');

	envContent = replace(envContent, 'APP_KEY', appKey);
	envContent = replace(envContent, 'JWT_SECRET', jwtSecret);
	envContent = replace(envContent, 'JWT_REFRESH_SECRET', jwtRefreshSecret);

	if (changed) {
		fs.writeFileSync(ENV_FILE, envContent, 'utf-8');
		log.ok('JWT secrets written to .env.');
	}
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

function main() {
	console.log(`${COLORS.bold}${COLORS.cyan}`);
	console.log('╔══════════════════════════════╗');
	console.log('║       RFBE Project Setup     ║');
	console.log('╚══════════════════════════════╝');
	console.log(COLORS.reset);

	checkDependencies();
	checkEnv();
	generateJwtSecrets();

	console.log(`\n${COLORS.green}${COLORS.bold}Setup complete!${COLORS.reset}\n`);
}

main();
