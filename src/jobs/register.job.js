'use strict';

const logger = require('@core/logger.core');

// Cron job definitions. The Cron core calls this function during boot and
// passes the Cron facade. Declare jobs with Cron.define(name, expression, fn).
//
// Expression format (node-cron): second? minute hour day-of-month month day-of-week
//   '*/5 * * * *'    -> every 5 minutes
//   '0 0 * * *'      -> every day at midnight
//   '0 */6 * * *'    -> every 6 hours
module.exports = (Cron) => {
	// Heartbeat — handy while developing to confirm the scheduler is alive.
	Cron.define('heartbeat', '*/30 * * * *', async () => {
		logger.debug('Cron heartbeat tick');
	});

	// Example: nightly cleanup task.
	// Cron.define('cleanup', '0 3 * * *', async () => {
	//     // remove stale records, rotate files, etc.
	// })
};
