'use strict';

// Migration: create the users table. The database core runs `up` for pending
// files and `down` when rolling back, passing { queryInterface, Sequelize }.
module.exports = {
	async up({ queryInterface, Sequelize }) {
		await queryInterface.createTable('users', {
			id: {
				type: Sequelize.BIGINT.UNSIGNED,
				primaryKey: true,
				autoIncrement: true,
			},
			name: {
				type: Sequelize.STRING,
				allowNull: false,
			},
			email: {
				type: Sequelize.STRING,
				allowNull: false,
				unique: true,
			},
			password: {
				type: Sequelize.STRING,
				allowNull: false,
			},
			created_at: {
				type: Sequelize.DATE,
				allowNull: false,
				defaultValue: Sequelize.NOW,
			},
			updated_at: {
				type: Sequelize.DATE,
				allowNull: false,
				defaultValue: Sequelize.NOW,
			},
		});
	},

	async down({ queryInterface }) {
		await queryInterface.dropTable('users');
	},
};
