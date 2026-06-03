'use strict';

const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');

const config = require('@app/config');
const logger = require('@core/logger.core');

const REGISTER_FILE = path.resolve(process.cwd(), 'src', 'socket', 'register.socket.js');

// Socket core — real-time messaging via Socket.IO, sharing the Express HTTP
// server so everything runs on one port. Connection handlers live in
// src/socket/register.socket.js and receive the io server plus each socket.
class Socket {
	static io = null;

	// Attach Socket.IO to an existing http.Server and wire up handlers.
	static async attach(httpServer) {
		if (!config.socket.enabled) {
			logger.info('Socket is disabled (SOCKET_ENABLED=false)');
			return null;
		}

		const isWildcard = config.socket.corsOrigin === '*';
		Socket.io = new Server(httpServer, {
			path: config.socket.path,
			cors: {
				origin: isWildcard ? '*' : config.socket.corsOrigin.split(',').map((o) => o.trim()),
				methods: ['GET', 'POST'],
				// Credentials cannot be combined with a "*" origin.
				credentials: isWildcard ? false : config.cors.credentials,
			},
			pingTimeout: config.socket.pingTimeout,
		});

		// Log every connection lifecycle for observability.
		Socket.io.on('connection', (socket) => {
			logger.debug(`Socket connected: ${socket.id}`);
			socket.on('disconnect', (reason) => {
				logger.debug(`Socket disconnected: ${socket.id} (${reason})`);
			});
		});

		await Socket._loadHandlers();

		logger.info(`Socket.IO attached at path "${config.socket.path}"`);
		return Socket.io;
	}

	// Run the user's connection handlers from the register file.
	static async _loadHandlers() {
		if (!fs.existsSync(REGISTER_FILE)) {
			logger.warn(`Socket register file not found: ${REGISTER_FILE}`);
			return;
		}

		const register = require(REGISTER_FILE);
		const fn = register.default || register;
		if (typeof fn === 'function') {
			await fn(Socket.io, Socket);
		} else if (fn && typeof fn.register === 'function') {
			await fn.register(Socket.io, Socket);
		}
	}

	// Convenience: broadcast an event to every connected client.
	static broadcast(event, payload) {
		if (Socket.io) Socket.io.emit(event, payload);
	}

	// Convenience: emit an event to a specific room.
	static toRoom(room, event, payload) {
		if (Socket.io) Socket.io.to(room).emit(event, payload);
	}

	// Close all connections and tear down the server.
	static async close() {
		if (Socket.io) {
			await Socket.io.close();
			Socket.io = null;
			logger.info('Socket.IO closed');
		}
	}
}

module.exports = Socket;
