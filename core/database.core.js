'use strict';

const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes, Model, Op } = require('sequelize');

const config = require('@app/config');
const logger = require('@core/logger.core');
const Str = require('@core/common/string');

const MODELS_DIR = path.resolve(process.cwd(), 'src', 'models');
const MIGRATIONS_DIR = path.resolve(process.cwd(), 'src', 'database', 'migrations');
const SEEDERS_DIR = path.resolve(process.cwd(), 'src', 'database', 'seeders');
const MIGRATION_TABLE = 'sequelize_meta';
const TIMESTAMP_COLUMNS = ['created_at', 'updated_at'];

// Turn a (usually plural) table name into a singular one for the model name.
function singularize(word) {
	if (/ies$/i.test(word)) return word.replace(/ies$/i, 'y');
	if (/(ch|sh|ss|x|z)es$/i.test(word)) return word.replace(/es$/i, '');
	if (/s$/i.test(word) && !/ss$/i.test(word)) return word.replace(/s$/i, '');
	return word;
}

// Map a dialect column type string (e.g. "VARCHAR(255)", "INT UNSIGNED") to the
// Sequelize DataTypes expression used in a generated model.
function mapColumnType(raw) {
	const t = String(raw || '').toUpperCase();
	const unsigned = t.includes('UNSIGNED') ? '.UNSIGNED' : '';

	if (/^TINYINT\(1\)/.test(t)) return 'DataTypes.BOOLEAN';
	if (/^BIGINT/.test(t)) return `DataTypes.BIGINT${unsigned}`;
	if (/^SMALLINT/.test(t)) return `DataTypes.SMALLINT${unsigned}`;
	if (/^(MEDIUMINT|INT|INTEGER)/.test(t)) return `DataTypes.INTEGER${unsigned}`;
	if (/^TINYINT/.test(t)) return `DataTypes.TINYINT${unsigned}`;

	const varchar = t.match(/^VARCHAR\((\d+)\)/);
	if (varchar) return `DataTypes.STRING(${varchar[1]})`;
	if (/^CHAR/.test(t)) return 'DataTypes.STRING';
	if (/(LONG|MEDIUM|TINY)?TEXT/.test(t)) return 'DataTypes.TEXT';

	if (/^(DATETIME|TIMESTAMP)/.test(t)) return 'DataTypes.DATE';
	if (/^DATE/.test(t)) return 'DataTypes.DATEONLY';
	if (/^TIME/.test(t)) return 'DataTypes.TIME';

	const decimal = t.match(/^DECIMAL\((\d+),\s*(\d+)\)/);
	if (decimal) return `DataTypes.DECIMAL(${decimal[1]}, ${decimal[2]})`;
	if (/^FLOAT/.test(t)) return 'DataTypes.FLOAT';
	if (/^DOUBLE/.test(t)) return 'DataTypes.DOUBLE';

	if (/^JSON/.test(t)) return 'DataTypes.JSON';
	if (/^BOOL/.test(t)) return 'DataTypes.BOOLEAN';

	const enumValues = t.match(/^ENUM\((.*)\)/);
	if (enumValues) return `DataTypes.ENUM(${enumValues[1]})`;

	return 'DataTypes.STRING';
}

// Database core built on Sequelize. Owns the connection, eager-loads models
// from src/models, and provides migrate / seed / reset / sync workflows that
// stay close to the conventions Sequelize developers already expect.
class Database {
	static sequelize = null;
	static models = {};

	// ── Connection ───────────────────────────────────────────────────────────
	// Create the Sequelize instance (idempotent) and verify the connection.
	static async connect() {
		if (Database.sequelize) return Database.sequelize;

		Database.sequelize = new Sequelize(config.database.name, config.database.username, config.database.password, {
			host: config.database.host,
			port: config.database.port,
			dialect: config.database.dialect,
			timezone: config.database.timezone,
			logging: config.database.logging ? (msg) => logger.debug(msg) : false,
			pool: {
				max: config.database.poolMax,
				min: config.database.poolMin,
				acquire: config.database.poolAcquire,
				idle: config.database.poolIdle,
			},
			define: {
				underscored: true,
				freezeTableName: false,
			},
		});

		await Database.sequelize.authenticate();
		logger.info(`Database connected (${config.database.dialect}://${config.database.host}:${config.database.port}/${config.database.name})`);

		Database.loadModels();
		return Database.sequelize;
	}

	// Close the connection pool.
	static async disconnect() {
		if (Database.sequelize) {
			await Database.sequelize.close();
			Database.sequelize = null;
			Database.models = {};
			logger.info('Database connection closed');
		}
	}

	// ── Models ───────────────────────────────────────────────────────────────
	// Load every model in src/models and wire up associations.
	static loadModels() {
		if (!fs.existsSync(MODELS_DIR)) {
			logger.warn(`Models directory not found: ${MODELS_DIR}`);
			return Database.models;
		}

		const files = fs.readdirSync(MODELS_DIR).filter((file) => file.endsWith('.js') && !file.startsWith('_'));

		for (const file of files) {
			const definition = require(path.join(MODELS_DIR, file));
			const factory = definition.default || definition;

			if (typeof factory !== 'function') {
				logger.warn(`Skipped model "${file}": expected a (sequelize, DataTypes) factory export`);
				continue;
			}

			const model = factory(Database.sequelize, DataTypes);
			if (model && model.name) {
				Database.models[model.name] = model;
			}
		}

		// Second pass: let models declare relationships once all are loaded.
		for (const model of Object.values(Database.models)) {
			if (typeof model.associate === 'function') {
				model.associate(Database.models);
			}
		}

		logger.info(`Loaded ${Object.keys(Database.models).length} model(s): ${Object.keys(Database.models).join(', ') || 'none'}`);
		return Database.models;
	}

	// Fetch a loaded model by name.
	static model(name) {
		const model = Database.models[name];
		if (!model) throw new Error(`Model "${name}" is not registered`);
		return model;
	}

	// ── Schema sync ──────────────────────────────────────────────────────────
	// Mirror models to tables. force drops & recreates; alter patches in place.
	// Defaults are read from config (DB_SYNC / DB_FORCE / DB_ALTER).
	static async sync(options = {}) {
		if (!Database.sequelize) await Database.connect();

		const force = options.force ?? config.database.force;
		const alter = options.alter ?? config.database.alter;

		if (force && config.app.env === 'production') {
			throw new Error('Refusing to sync with force:true in production');
		}

		await Database.sequelize.sync({ force, alter });
		logger.info(`Schema synced (force=${force}, alter=${alter})`);
	}

	// ── Migrations ───────────────────────────────────────────────────────────
	// Apply all pending migrations from src/database/migrations.
	static async migrate() {
		if (!Database.sequelize) await Database.connect();
		await Database._ensureMigrationTable();

		const applied = await Database._appliedMigrations();
		const files = Database._migrationFiles().filter((file) => !applied.includes(file));

		if (!files.length) {
			logger.info('Migrations: nothing to run, database is up to date');
			return [];
		}

		const queryInterface = Database.sequelize.getQueryInterface();
		const ran = [];

		for (const file of files) {
			const migration = require(path.join(MIGRATIONS_DIR, file));
			logger.info(`Migrating: ${file}`);
			await migration.up({ queryInterface, Sequelize, DataTypes });
			await Database._markMigration(file);
			ran.push(file);
		}

		logger.info(`Migrations: applied ${ran.length} file(s)`);

		// Optionally scaffold model files for the freshly-migrated tables.
		if (config.database.autoModel) {
			await Database.generateModels();
		}

		return ran;
	}

	// Roll back the most recent batch (or `steps` migrations).
	static async rollback(steps = 1) {
		if (!Database.sequelize) await Database.connect();
		await Database._ensureMigrationTable();

		const applied = (await Database._appliedMigrations()).reverse().slice(0, steps);
		const queryInterface = Database.sequelize.getQueryInterface();

		for (const file of applied) {
			const migration = require(path.join(MIGRATIONS_DIR, file));
			logger.info(`Rolling back: ${file}`);
			if (typeof migration.down === 'function') {
				await migration.down({ queryInterface, Sequelize, DataTypes });
			}
			await Database._unmarkMigration(file);
		}

		logger.info(`Rollback: reverted ${applied.length} file(s)`);
		return applied;
	}

	// Roll everything back, then migrate from scratch.
	static async reset() {
		if (!Database.sequelize) await Database.connect();
		await Database._ensureMigrationTable();
		const applied = await Database._appliedMigrations();
		await Database.rollback(applied.length);
		return Database.migrate();
	}

	// Drop every table, re-run migrations, then seed. Blocked in production.
	static async fresh({ seed = false } = {}) {
		if (!Database.sequelize) await Database.connect();
		if (config.app.env === 'production') {
			throw new Error('Refusing to run fresh() in production');
		}
		await Database.sequelize.getQueryInterface().dropAllTables();
		logger.info('Dropped all tables');
		await Database.migrate();
		if (seed) await Database.seed();
	}

	// ── Seeders ──────────────────────────────────────────────────────────────
	// Run every seeder in src/database/seeders (or a single named seeder).
	static async seed(only = null) {
		if (!Database.sequelize) await Database.connect();
		if (!fs.existsSync(SEEDERS_DIR)) {
			logger.warn(`Seeders directory not found: ${SEEDERS_DIR}`);
			return [];
		}

		let files = fs
			.readdirSync(SEEDERS_DIR)
			.filter((file) => file.endsWith('.js') && !file.startsWith('_'))
			.sort();

		if (only) files = files.filter((file) => file.includes(only));

		const queryInterface = Database.sequelize.getQueryInterface();
		const ran = [];

		for (const file of files) {
			const seeder = require(path.join(SEEDERS_DIR, file));
			logger.info(`Seeding: ${file}`);
			await seeder.up({
				queryInterface,
				Sequelize,
				DataTypes,
				models: Database.models,
				sequelize: Database.sequelize,
			});
			ran.push(file);
		}

		logger.info(`Seeders: ran ${ran.length} file(s)`);
		return ran;
	}

	// ── Model generation ─────────────────────────────────────────────────────
	// Introspect the live schema and write a model file for every table that
	// does not already have one. Existing files are never overwritten. Pass a
	// table name to generate just that one.
	static async generateModels(only = null) {
		if (!Database.sequelize) await Database.connect();
		fs.mkdirSync(MODELS_DIR, { recursive: true });

		const queryInterface = Database.sequelize.getQueryInterface();
		const tables = (await queryInterface.showAllTables())
			.map((t) => (typeof t === 'string' ? t : t.tableName))
			.filter((t) => t !== MIGRATION_TABLE)
			.filter((t) => !only || t === only);

		const created = [];
		for (const table of tables) {
			const result = await Database.makeModel(table);
			if (result) created.push(result);
		}

		logger.info(created.length ? `Generated ${created.length} model(s): ${created.join(', ')}` : 'Model generation: nothing to create');
		return created;
	}

	// Build a single model file from a table's columns. Returns the file name,
	// or null when the file already exists.
	static async makeModel(table) {
		if (!Database.sequelize) await Database.connect();

		const modelName = Str.pascal(singularize(table));
		const fileName = `${Str.kebab(singularize(table))}.model.js`;
		const filePath = path.join(MODELS_DIR, fileName);

		if (fs.existsSync(filePath)) {
			logger.debug(`Model "${fileName}" already exists, skipping`);
			return null;
		}

		const columns = await Database.sequelize.getQueryInterface().describeTable(table);
		const hasTimestamps = TIMESTAMP_COLUMNS.every((col) => col in columns);

		const fields = Object.entries(columns)
			.filter(([name]) => !hasTimestamps || !TIMESTAMP_COLUMNS.includes(name))
			.map(([name, info]) => Database._renderField(name, info))
			.join('\n');

		const file = Database._renderModelFile(modelName, table, fields, hasTimestamps);
		fs.writeFileSync(filePath, file, 'utf8');
		logger.info(`Created model: src/models/${fileName}`);
		return fileName;
	}

	// Render one attribute definition for a generated model.
	static _renderField(name, info) {
		const lines = [`\t\t\t${name}: {`, `\t\t\t\ttype: ${mapColumnType(info.type)},`];
		if (info.primaryKey) lines.push('\t\t\t\tprimaryKey: true,');
		if (info.autoIncrement) lines.push('\t\t\t\tautoIncrement: true,');
		lines.push(`\t\t\t\tallowNull: ${info.allowNull !== false},`);
		lines.push('\t\t\t},');
		return lines.join('\n');
	}

	// Render the full model file body.
	static _renderModelFile(modelName, table, fields, hasTimestamps) {
		return [
			"'use strict';",
			'',
			`// Auto-generated from the \`${table}\` table. Refine column types,`,
			'// validations and associations to match your domain.',
			'module.exports = (sequelize, DataTypes) => {',
			`\tconst ${modelName} = sequelize.define(`,
			`\t\t'${modelName}',`,
			'\t\t{',
			fields,
			'\t\t},',
			'\t\t{',
			`\t\t\ttableName: '${table}',`,
			`\t\t\ttimestamps: ${hasTimestamps},`,
			'\t\t\tunderscored: true,',
			'\t\t},',
			'\t);',
			'',
			`\t// ${modelName}.associate = (models) => { ... };`,
			'',
			`\treturn ${modelName};`,
			'};',
			'',
		].join('\n');
	}

	// ── Internal migration bookkeeping ───────────────────────────────────────
	static _migrationFiles() {
		if (!fs.existsSync(MIGRATIONS_DIR)) return [];
		return fs
			.readdirSync(MIGRATIONS_DIR)
			.filter((file) => file.endsWith('.js') && !file.startsWith('_'))
			.sort();
	}

	static async _ensureMigrationTable() {
		const queryInterface = Database.sequelize.getQueryInterface();
		const tables = await queryInterface.showAllTables();
		const normalized = tables.map((t) => (typeof t === 'string' ? t : t.tableName));
		if (!normalized.includes(MIGRATION_TABLE)) {
			await queryInterface.createTable(MIGRATION_TABLE, {
				name: { type: DataTypes.STRING, primaryKey: true },
				applied_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
			});
		}
	}

	static async _appliedMigrations() {
		const [rows] = await Database.sequelize.query(`SELECT name FROM ${MIGRATION_TABLE} ORDER BY name ASC`);
		return rows.map((row) => row.name);
	}

	static async _markMigration(name) {
		await Database.sequelize.query(`INSERT INTO ${MIGRATION_TABLE} (name, applied_at) VALUES (:name, :now)`, { replacements: { name, now: new Date() } });
	}

	static async _unmarkMigration(name) {
		await Database.sequelize.query(`DELETE FROM ${MIGRATION_TABLE} WHERE name = :name`, { replacements: { name } });
	}
}

// Re-export Sequelize primitives so application code imports them from one place.
Database.Sequelize = Sequelize;
Database.DataTypes = DataTypes;
Database.Model = Model;
Database.Op = Op;

module.exports = Database;
