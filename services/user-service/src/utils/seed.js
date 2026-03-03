require("dotenv").config();

const { connectDb, syncModels, sequelize } = require("../models");
const userService = require("../services/userService");
const userRepository = require("../repositories/userRepository");
const logger = require("./logger");

const run = async () => {
  try {
    await connectDb();
    await syncModels();

    const profile = await userService.ensureDemoUser();

    await userRepository.upsertAddresses(profile.user_id, [
      {
        label: "HOME",
        address: "123 Demo Home, Ho Chi Minh City",
        lat: 10.7769,
        lng: 106.7009
      },
      {
        label: "WORK",
        address: "456 Demo Office, Ho Chi Minh City",
        lat: 10.782,
        lng: 106.695
      }
    ]);

    logger.info("Seed data completed", { userId: profile.user_id });
  } catch (error) {
    logger.error("Seed failed", { error: error.message });
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
};

run();
