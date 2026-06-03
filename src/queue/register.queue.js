'use strict';

const Mailer = require('@core/mailer.core');

// Queue worker definitions. The Queue core calls this function during boot and
// passes the Queue facade. Register a processor per queue name; dispatch jobs
// from anywhere with Queue.dispatch('emails', { ... }).
module.exports = (Queue) => {
	// Example "emails" queue: send mail off the request path, 2 at a time.
	Queue.define(
		'emails',
		async (payload) => {
			await Mailer.send({
				to: payload.to,
				subject: payload.subject,
				html: payload.html,
				text: payload.text,
			});
		},
		{ concurrency: 2, maxRetries: 3 },
	);

	// Example "webhooks" queue.
	// Queue.define('webhooks', async (payload) => {
	//     await axios.post(payload.url, payload.body)
	// })
};
