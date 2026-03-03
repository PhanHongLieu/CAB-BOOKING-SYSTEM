const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const UserProfile = sequelize.define(
    "UserProfile",
    {
      user_id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false
      },
      full_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
        defaultValue: "New User"
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      avatar_url: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM("ACTIVE", "BANNED"),
        allowNull: false,
        defaultValue: "ACTIVE"
      },
      rating: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: false,
        defaultValue: 5
      },
      total_rides: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      reward_points: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      national_id: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      driver_license_number: {
        type: DataTypes.STRING(30),
        allowNull: true
      }
    },
    {
      tableName: "users_profile",
      underscored: true,
      paranoid: true,
      deletedAt: "deleted_at"
    }
  );

  return UserProfile;
};
