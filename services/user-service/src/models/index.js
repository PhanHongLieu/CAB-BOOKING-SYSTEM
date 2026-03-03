const sequelize = require("../config/database");
const logger = require("../utils/logger");

const createUserProfileModel = require("./UserProfile");
const createUserAddressModel = require("./UserAddress");

const UserProfile = createUserProfileModel(sequelize);
const UserAddress = createUserAddressModel(sequelize);

UserProfile.hasMany(UserAddress, {
  foreignKey: "user_id",
  sourceKey: "user_id",
  as: "addresses"
});

UserAddress.belongsTo(UserProfile, {
  foreignKey: "user_id",
  targetKey: "user_id",
  as: "profile"
});

const connectDb = async () => {
  await sequelize.authenticate();
  logger.info("PostgreSQL connection established");
};

const syncModels = async () => {
  const alter = process.env.DB_SYNC_ALTER === "true";
  await sequelize.sync({ alter });
  logger.info("Sequelize models synchronized", { alter });
};

module.exports = {
  sequelize,
  connectDb,
  syncModels,
  UserProfile,
  UserAddress
};
