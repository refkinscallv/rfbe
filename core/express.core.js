'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const Routes = require('@refkinscallv/express-routing');

const config = require('@app/config');
const logger = require('@core/logger.core');
const ErrorCore = require('@core/error.core');
const ApiResponse = require('@core/response.core');

const ROUTES_FILE = path.resolve(process.cwd(), 'src', 'routes', 'register.route.js');
const MIDDLEWARE_FILE = path.resolve(process.cwd(), 'src', 'http', 'middleware', 'register.middleware.js');
const PUBLIC_DIR = path.resolve(process.cwd(), 'public');

// Express core — the HTTP backbone. Assembles the security/parsing middleware
// stack, mounts the express-routing route table, and exposes the underlying
// http.Server so the socket layer can share the same port.
class Express {
	static app = null;
	static server = null;

	// Build the Express app and HTTP server without listening yet. Splitting
	// build from listen lets the socket core attach to the server first.
	static async create() {
		if (Express.app) return { app: Express.app, server: Express.server };

		const app = express();

		// Honour X-Forwarded-* when sitting behind a proxy / load balancer.
		if (config.express.trustProxy) app.set('trust proxy', 1);
		app.disable('x-powered-by');

		Express._applyMiddleware(app);
		await Express._applyUserMiddleware(app);
		Express._applyStatic(app);
		await Express._applyRoutes(app);
		Express._applyErrorHandling(app);

		Express.app = app;
		Express.server = http.createServer(app);
		return { app, server: Express.server };
	}

	// Start listening. Resolves once the socket is bound.
	static listen() {
		return new Promise((resolve) => {
			const port = config.app.port;
			Express.server.listen(port, () => {
				logger.info(`HTTP server listening on ${config.app.url} (port ${port})`);
				resolve(Express.server);
			});
		});
	}

	// Stop accepting connections.
	static close() {
		return new Promise((resolve) => {
			if (!Express.server) return resolve();
			Express.server.close(() => {
				logger.info('HTTP server closed');
				resolve();
			});
		});
	}

	// ── Middleware stack ─────────────────────────────────────────────────────
	static _applyMiddleware(app) {
		// Decorate res with res.respond / res.success / res.error helpers so
		// every handler can reply with the standard envelope.
		app.use(ApiResponse.middleware());

		app.use(helmet());

		const corsOrigin = Express._corsOrigin();
		app.use(
			cors({
				origin: corsOrigin,
				methods: config.cors.methods.split(',').map((m) => m.trim()),
				// Browsers reject credentialed requests when the origin is "*",
				// so only enable credentials for an explicit origin list.
				credentials: corsOrigin === '*' ? false : config.cors.credentials,
			}),
		);

		app.use(compression());
		app.use(express.json({ limit: config.express.bodyLimit }));
		app.use(express.urlencoded({ extended: true, limit: config.express.bodyLimit }));

		// Global rate limiter — protects every route from abuse.
		app.use(
			rateLimit({
				windowMs: config.rateLimit.windowMs,
				max: config.rateLimit.max,
				standardHeaders: true,
				legacyHeaders: false,
				message: ApiResponse.build({ status: false, code: 429, message: 'Too many requests' }),
			}),
		);
	}

	// Accept a single origin, a comma list, or '*' for any.
	static _corsOrigin() {
		const origin = config.cors.origin;
		if (!origin || origin === '*') return '*';
		const list = origin.split(',').map((o) => o.trim());
		return list.length === 1 ? list[0] : list;
	}

	// ── User global middleware ───────────────────────────────────────────────
	// Run src/http/middleware/register.middleware.js so the application can add
	// app-level middleware that executes on every request.
	static async _applyUserMiddleware(app) {
		if (!fs.existsSync(MIDDLEWARE_FILE)) return;
		const mod = require(MIDDLEWARE_FILE);
		const register = mod.default || mod;
		if (register && typeof register.set === 'function') {
			await register.set(app);
		}
	}

	// ── Static assets ────────────────────────────────────────────────────────
	static _applyStatic(app) {
		if (fs.existsSync(PUBLIC_DIR)) {
			app.use(express.static(PUBLIC_DIR));
		}
		// Expose uploaded files read-only under /uploads.
		const uploadDir = path.resolve(process.cwd(), config.upload.path);
		if (fs.existsSync(uploadDir)) {
			app.use('/uploads', express.static(uploadDir));
		}
	}

	// ── Routes ───────────────────────────────────────────────────────────────
	static async _applyRoutes(app) {
		if (fs.existsSync(ROUTES_FILE)) {
			// Requiring the file populates the Routes registry as a side effect.
			require(ROUTES_FILE);
		} else {
			logger.warn(`Route file not found: ${ROUTES_FILE}`);
		}

		const router = express.Router();
		await Routes.apply(app, router);

		const summary = Routes.allRoutes();
		logger.info(`Registered ${summary.length} route(s)`);
	}

	// ── Error & 404 handling ─────────────────────────────────────────────────
	static _applyErrorHandling(app) {
		app.use(ErrorCore.expressNotFoundHandler);
		app.use(ErrorCore.expressErrorHandler);
	}

	// ── File uploads ─────────────────────────────────────────────────────────
	// Build a multer instance backed by disk storage, constrained by config.
	static upload(field = null) {
		const uploadDir = path.resolve(process.cwd(), config.upload.path);
		fs.mkdirSync(uploadDir, { recursive: true });

		const storage = multer.diskStorage({
			destination: (req, file, cb) => cb(null, uploadDir),
			filename: (req, file, cb) => {
				const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
				cb(null, `${unique}${path.extname(file.originalname)}`);
			},
		});

		const instance = multer({
			storage,
			limits: { fileSize: config.upload.maxSizeBytes },
			fileFilter: (req, file, cb) => {
				if (config.upload.allowedTypes.includes(file.mimetype)) return cb(null, true);
				const err = new Error(`Unsupported file type: ${file.mimetype}`);
				err.status = 400;
				cb(err);
			},
		});

		return field ? instance.single(field) : instance;
	}
}

module.exports = Express;
