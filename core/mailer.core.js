'use strict';

const nodemailer = require('nodemailer');

const config = require('@app/config');
const logger = require('@core/logger.core');

// Mailer core — a thin wrapper over nodemailer driven by config.mail. The SMTP
// transport is created lazily on first use and cached. When MAIL_ENABLED=false
// (the local/dev default) sends are skipped and logged, so application code can
// call Mailer.send(...) unconditionally without a live SMTP server.
class Mailer {
	static transporter = null;

	// Build (or reuse) the SMTP transport.
	static _transport() {
		if (Mailer.transporter) return Mailer.transporter;
		Mailer.transporter = nodemailer.createTransport({
			host: config.mail.host,
			port: config.mail.port,
			secure: config.mail.secure,
			auth: config.mail.username ? { user: config.mail.username, pass: config.mail.password } : undefined,
		});
		return Mailer.transporter;
	}

	// Send an email.
	//   Mailer.send({ to, subject, html, text, cc, bcc, attachments, replyTo })
	static async send(message) {
		if (!config.mail.enabled) {
			logger.info(`Mail disabled — skipped sending "${message.subject}" to ${message.to}`);
			return { skipped: true };
		}

		const from = message.from || `"${config.mail.fromName}" <${config.mail.fromAddress}>`;
		const info = await Mailer._transport().sendMail({ ...message, from });
		logger.info(`Mail sent to ${message.to} (id ${info.messageId})`);
		return info;
	}

	// Verify the SMTP connection/credentials. Returns true/false.
	static async verify() {
		if (!config.mail.enabled) return false;
		try {
			await Mailer._transport().verify();
			return true;
		} catch (error) {
			logger.error(`Mail verify failed: ${error.message}`);
			return false;
		}
	}
}

module.exports = Mailer;
