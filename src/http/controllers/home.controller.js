'use strict';

const config = require('@app/config');

// Example controller. Methods map to routes via Routes.controller() — `index`
// becomes the base path and other methods become kebab-case child paths.
//
// Replies use res.success / res.respond / res.error, decorated onto every
// response by the Response core, so the output matches the standard envelope.
class HomeController {
	// GET /
	static index({ res }) {
		return res.success({ env: config.app.env, time: new Date().toISOString() }, `${config.app.name} is running`);
	}

	// GET /health
	static health({ res }) {
		return res.success({ uptime: process.uptime() }, 'OK');
	}
}

module.exports = HomeController;
