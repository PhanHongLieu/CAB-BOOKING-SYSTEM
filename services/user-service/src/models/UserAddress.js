const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const UserAddress = sequelize.define(
    "UserAddress",
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false
      },
      label: {
        type: DataTypes.ENUM("HOME", "WORK", "OTHER"),
        allowNull: false,
        defaultValue: "OTHER"
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      lat: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true
      },
      lng: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true
      }
    },
    {
      tableName: "user_addresses",
      underscored: true,
      timestamps: false
    }
  );

  return UserAddress;
};
