'use strict';

const path = require('path');
const winston = require('winston');
require('winston-daily-rotate-file');
const config = require('@app/config');

const { createLogger, format, transports } = winston;
const { combine, timestamp, printf, errors } = format;

const isProd = config.app.env === 'production';
const logDir = path.resolve(process.cwd(), config.logging.file);
const appLabel = `[${(config.app.name || 'RFBE').toUpperCase()}]`;

const COLORS = {
	error: '\x1b[31m\x1b[1m',
	warn: '\x1b[33m\x1b[1m',
	info: '\x1b[36m\x1b[1m',
	debug: '\x1b[35m\x1b[1m',
	http: '\x1b[32m\x1b[1m',
	verbose: '\x1b[34m\x1b[1m',
	silly: '\x1b[90m\x1b[1m',
	reset: '\x1b[0m',
};

function colorLevel(level) {
	const c = COLORS[level] || '\x1b[37m\x1b[1m';
	return `${c}[${level.toUpperCase()}]${COLORS.reset}`;
}

function buildMessage({ message, stack }) {
	if (stack) return stack;
	if (message instanceof Error) return message.stack || message.message;
	return String(message);
}

const consoleFormat = combine(
	errors({ stack: true }),
	timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
	printf((info) => {
		const msg = buildMessage(info);
		return `${appLabel} ${colorLevel(info.level)} [${info.timestamp}] ${msg}`;
	}),
);

const fileFormat = combine(
	errors({ stack: true }),
	timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
	printf((info) => {
		const msg = buildMessage(info);
		return `${appLabel} [${info.level.toUpperCase()}] [${info.timestamp}] ${msg}`;
	}),
);

// In production: suppress error + warn from terminal
const productionFilter = format((info) => {
	if (info.level === 'error' || info.level === 'warn') return false;
	return info;
});

function makeRotateTransport(level, name) {
	return new transports.DailyRotateFile({
		level,
		dirname: logDir,
		filename: `${name}-%DATE%.log`,
		datePattern: 'YYYY-MM-DD',
		zippedArchive: true,
		maxSize: config.logging.maxSize,
		maxFiles: config.logging.maxFiles,
		format: fileFormat,
	});
}

const consoleTransport = new transports.Console({
	level: config.logging.level,
	format: isProd ? combine(productionFilter(), consoleFormat) : consoleFormat,
});

const logger = createLogger({
	level: config.logging.level,
	exitOnError: false,
	transports: [consoleTransport, makeRotateTransport('error', 'error'), makeRotateTransport(config.logging.level, 'combined')],
});

module.exports = logger;
