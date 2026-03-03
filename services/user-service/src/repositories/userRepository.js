const { sequelize, UserProfile, UserAddress } = require("../models");

class UserRepository {
  async findByUserId(userId) {
    return UserProfile.findByPk(userId, {
      include: [{ model: UserAddress, as: "addresses" }]
    });
  }

  async findByUserIdIncludeDeleted(userId) {
    return UserProfile.findByPk(userId, {
      paranoid: false,
      include: [{ model: UserAddress, as: "addresses" }]
    });
  }

  async createProfile(payload) {
    return UserProfile.create(payload);
  }

  async updateProfile(userId, payload) {
    await UserProfile.update(payload, { where: { user_id: userId } });
    return this.findByUserId(userId);
  }

  async upsertAddresses(userId, addresses = []) {
    return sequelize.transaction(async (transaction) => {
      await UserAddress.destroy({ where: { user_id: userId }, transaction });

      if (!addresses.length) {
        return [];
      }

      const rows = addresses.map((item) => ({ ...item, user_id: userId }));
      await UserAddress.bulkCreate(rows, { transaction });

      return UserAddress.findAll({ where: { user_id: userId }, transaction });
    });
  }

  async updateStatus(userId, status) {
    await UserProfile.update({ status }, { where: { user_id: userId } });
    return this.findByUserId(userId);
  }

  async softDelete(userId) {
    return UserProfile.destroy({ where: { user_id: userId } });
  }

  async restoreProfile(userId) {
    return UserProfile.restore({ where: { user_id: userId } });
  }
}

module.exports = new UserRepository();
