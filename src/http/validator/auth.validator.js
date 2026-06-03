'use strict';

const { z } = require('zod');

// Request schemas validated with Zod. Pair them with the Validator core to get
// an express-routing middleware:
//   const Validator = require('@core/validator.core')
//   const { loginSchema } = require('@app/http/validator/auth.validator')
//   Routes.post('/login', handler, [Validator.make(loginSchema)])
const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(6),
});

const registerSchema = z.object({
	name: z.string().min(2).max(100),
	email: z.string().email(),
	password: z.string().min(6),
});

module.exports = {
	loginSchema,
	registerSchema,
};
