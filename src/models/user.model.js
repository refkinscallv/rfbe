'use strict';

// Sequelize model factory. The database core calls this with (sequelize,
// DataTypes), expects a configured model back, and later invokes the optional
// static `associate(models)` once every model is loaded.
module.exports = (sequelize, DataTypes) => {
	const User = sequelize.define(
		'User',
		{
			id: {
				type: DataTypes.BIGINT.UNSIGNED,
				primaryKey: true,
				autoIncrement: true,
			},
			name: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			email: {
				type: DataTypes.STRING,
				allowNull: false,
				unique: true,
				validate: { isEmail: true },
			},
			password: {
				type: DataTypes.STRING,
				allowNull: false,
			},
		},
		{
			tableName: 'users',
			timestamps: true,
			underscored: true,
			defaultScope: {
				// Never leak password hashes by default.
				attributes: { exclude: ['password'] },
			},
		},
	);

	// Declare relationships here, e.g.:
	// User.associate = (models) => {
	//     User.hasMany(models.Post, { foreignKey: 'user_id' })
	// }

	return User;
};
