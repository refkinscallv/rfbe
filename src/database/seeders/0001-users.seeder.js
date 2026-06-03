'use strict';

const Hash = require('@core/common/hash');

// Seeder: insert baseline users. The database core passes { queryInterface,
// Sequelize, models, sequelize } so seeders can use raw SQL or loaded models.
module.exports = {
	async up({ models }) {
		const User = models.User;
		if (!User) return;

		const exists = await User.count();
		if (exists > 0) return;

		await User.create({
			name: 'Administrator',
			email: 'admin@example.com',
			password: await Hash.make('password'),
		});
	},

	async down({ models }) {
		if (models.User) {
			await models.User.destroy({ where: { email: 'admin@example.com' } });
		}
	},
};
