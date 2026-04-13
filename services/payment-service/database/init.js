const sequelize = require('../config/database');
const Payment = require('../models/Payment.model');
const logger = require('../../../shared/logger');

async function initDatabase() {
  try {
    // Sync models
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    logger.info('Database synchronized successfully');
    return true;
  } catch (error) {
    logger.error('Database synchronization error:', error);
    throw error;
  }
}

module.exports = { initDatabase, sequelize };
