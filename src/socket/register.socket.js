'use strict';

const logger = require('@core/logger.core');

// Socket.IO connection handlers. The Socket core calls this function during
// boot with the io server and the Socket facade. Wire up your namespaces,
// rooms and event listeners here.
module.exports = (io) => {
	io.on('connection', (socket) => {
		// Join a room on request.
		socket.on('room:join', (room) => {
			socket.join(room);
			logger.debug(`Socket ${socket.id} joined room "${room}"`);
		});

		// Simple chat relay scoped to a room.
		socket.on('chat:message', ({ room, message }) => {
			io.to(room).emit('chat:message', {
				from: socket.id,
				message,
				at: Date.now(),
			});
		});

		// Echo for connectivity testing.
		socket.on('ping:test', (data, ack) => {
			if (typeof ack === 'function') ack({ pong: true, data });
		});
	});
};
