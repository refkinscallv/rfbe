'use strict';

// Database command-line entry point.
//   node scripts/db.js migrate          apply pending migrations
//   node scripts/db.js rollback [n]      roll back the last n migrations (default 1)
//   node scripts/db.js reset             roll everything back, then migrate
//   node scripts/db.js fresh [--seed]    drop all tables, migrate (and optionally seed)
//   node scripts/db.js seed [name]       run seeders (optionally one matching `name`)
//   node scripts/db.js sync [--force|--alter]   sync models to the schema
//   node scripts/db.js make:model [table]   scaffold model file(s) from the schema
require('dotenv').config();
require('module-alias/register');

const Database = require('@core/database.core');
const logger = require('@core/logger.core');

async function main() {
	const [command, ...args] = process.argv.slice(2);

	await Database.connect();

	switch (command) {
		case 'migrate':
			await Database.migrate();
			break;
		case 'rollback':
			await Database.rollback(parseInt(args[0], 10) || 1);
			break;
		case 'reset':
			await Database.reset();
			break;
		case 'fresh':
			await Database.fresh({ seed: args.includes('--seed') });
			break;
		case 'seed':
			await Database.seed(args.find((a) => !a.startsWith('--')) || null);
			break;
		case 'sync':
			await Database.sync({ force: args.includes('--force'), alter: args.includes('--alter') });
			break;
		case 'make:model':
			await Database.generateModels(args.find((a) => !a.startsWith('--')) || null);
			break;
		default:
			logger.error(`Unknown command: ${command || '(none)'}`);
			logger.info('Usage: node scripts/db.js <migrate|rollback|reset|fresh|seed|sync|make:model>');
			process.exitCode = 1;
	}

	await Database.disconnect();
}

main().catch((error) => {
	logger.error(error.stack || error.message);
	process.exit(1);
});
