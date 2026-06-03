'use strict';

const Common = require('@core/common.core');

const isDev = Common.getEnv('APP_ENV', 'production') !== 'production';

module.exports = {
	app: {
		env: Common.getEnv('APP_ENV', 'production'),
		name: Common.getEnv('APP_NAME', 'MyApp'),
		url: Common.getEnv('APP_URL', 'http://localhost'),
		port: Common.getEnvInt('APP_PORT', 3000),
		timezone: Common.getEnv('APP_TIMEZONE', 'UTC'),
		key: Common.getEnv('APP_KEY', ''),
	},

	database: {
		enabled: Common.getEnvBool('DB_ENABLED', true),
		dialect: Common.getEnv('DB_DIALECT', 'mysql'),
		host: Common.getEnv('DB_HOST', 'localhost'),
		port: Common.getEnvInt('DB_PORT', 3306),
		username: Common.getEnv('DB_USERNAME', 'root'),
		password: Common.getEnv('DB_PASSWORD', ''),
		name: Common.getEnv('DB_NAME', 'myapp'),
		timezone: Common.getEnv('DB_TIMEZONE', '+00:00'),
		logging: Common.getEnvBool('DB_LOGGING', false),
		sync: Common.getEnvBool('DB_SYNC', false),
		force: Common.getEnvBool('DB_FORCE', false),
		alter: Common.getEnvBool('DB_ALTER', false),
		// When true, `migrate` introspects each table and scaffolds a matching
		// model file under src/models if one does not already exist.
		autoModel: Common.getEnvBool('DB_AUTO_MODEL', false),
		poolMax: Common.getEnvInt('DB_POOL_MAX', 10),
		poolMin: Common.getEnvInt('DB_POOL_MIN', 0),
		poolAcquire: Common.getEnvInt('DB_POOL_ACQUIRE', 30000),
		poolIdle: Common.getEnvInt('DB_POOL_IDLE', 10000),
	},

	jwt: {
		secret: Common.getEnv('JWT_SECRET', 'your_jwt_secret'),
		expiresIn: Common.getEnv('JWT_EXPIRES_IN', '1d'),
		refreshSecret: Common.getEnv('JWT_REFRESH_SECRET', 'your_jwt_refresh_secret'),
		refreshExpiresIn: Common.getEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
	},

	bcrypt: {
		saltRounds: Common.getEnvInt('BCRYPT_SALT_ROUNDS', 10),
	},

	cors: {
		origin: Common.getEnv('CORS_ORIGIN', 'http://localhost:3000'),
		methods: Common.getEnv('CORS_METHODS', 'GET,POST,PUT,PATCH,DELETE,OPTIONS'),
		credentials: Common.getEnvBool('CORS_CREDENTIALS', true),
	},

	express: {
		trustProxy: Common.getEnvBool('EXPRESS_TRUST_PROXY', false),
		bodyLimit: Common.getEnv('EXPRESS_BODY_LIMIT', '10mb'),
	},

	rateLimit: {
		windowMs: Common.getEnvInt('RATE_LIMIT_WINDOW_MS', 900000),
		max: Common.getEnvInt('RATE_LIMIT_MAX', 100),
	},

	upload: {
		path: Common.getEnv('UPLOAD_PATH', 'storage/uploads'),
		maxSizeBytes: Common.getEnvInt('UPLOAD_MAX_SIZE_MB', 5) * 1024 * 1024,
		allowedTypes: Common.getEnv('UPLOAD_ALLOWED_TYPES', 'image/jpeg,image/png,image/webp,application/pdf').split(','),
	},

	axios: {
		baseUrl: Common.getEnv('AXIOS_BASE_URL', ''),
		timeout: Common.getEnvInt('AXIOS_TIMEOUT', 10000),
	},

	logging: {
		level: Common.getEnv('LOG_LEVEL', 'info'),
		file: Common.getEnv('LOG_FILE', 'logs'),
		maxSize: Common.getEnv('LOG_MAX_SIZE', '20m'),
		maxFiles: Common.getEnv('LOG_MAX_FILES', '14d'),
	},

	runtime: {
		maxListeners: Common.getEnvInt('RUNTIME_MAX_LISTENERS', 50),
		stackTraceLimit: Common.getEnvInt('RUNTIME_STACK_TRACE_LIMIT', isDev ? 50 : 10),
		uvThreadpoolSize: Common.getEnvInt('RUNTIME_UV_THREADPOOL_SIZE', 4),
		bigintJson: Common.getEnvBool('RUNTIME_BIGINT_JSON', true),
		deprecationWarnings: Common.getEnvBool('RUNTIME_DEPRECATION_WARNINGS', isDev),
	},

	storage: {
		root: Common.getEnv('STORAGE_ROOT', 'storage'),
	},

	cache: {
		ttl: Common.getEnvInt('CACHE_TTL', 3600),
	},

	cron: {
		enabled: Common.getEnvBool('CRON_ENABLED', true),
		timezone: Common.getEnv('CRON_TIMEZONE', Common.getEnv('APP_TIMEZONE', 'UTC')),
	},

	queue: {
		enabled: Common.getEnvBool('QUEUE_ENABLED', true),
		concurrency: Common.getEnvInt('QUEUE_CONCURRENCY', 5),
		maxRetries: Common.getEnvInt('QUEUE_MAX_RETRIES', 3),
		retryDelay: Common.getEnvInt('QUEUE_RETRY_DELAY', 1000),
	},

	socket: {
		enabled: Common.getEnvBool('SOCKET_ENABLED', true),
		path: Common.getEnv('SOCKET_PATH', '/socket.io'),
		corsOrigin: Common.getEnv('SOCKET_CORS_ORIGIN', Common.getEnv('CORS_ORIGIN', '*')),
		pingTimeout: Common.getEnvInt('SOCKET_PING_TIMEOUT', 20000),
	},

	mail: {
		enabled: Common.getEnvBool('MAIL_ENABLED', false),
		host: Common.getEnv('MAIL_HOST', 'smtp.mailtrap.io'),
		port: Common.getEnvInt('MAIL_PORT', 587),
		secure: Common.getEnvBool('MAIL_SECURE', false),
		username: Common.getEnv('MAIL_USERNAME', ''),
		password: Common.getEnv('MAIL_PASSWORD', ''),
		fromAddress: Common.getEnv('MAIL_FROM_ADDRESS', 'no-reply@example.com'),
		fromName: Common.getEnv('MAIL_FROM_NAME', Common.getEnv('APP_NAME', 'RFBE')),
	},
};
