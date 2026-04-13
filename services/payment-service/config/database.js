const { Sequelize } = require('sequelize');
require('dotenv').config();
const logger = require('../../../shared/logger');

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  username: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'admin123',
  database: process.env.DB_NAME || 'payment_db',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 2,
    acquire: 30000,
    idle: 10000,
  },
  retry: {
    max: 3,
    timeout: 5000,
  },
});

// Test connection
sequelize.authenticate()
  .then(() => {
    logger.info('PostgreSQL connection established successfully');
  })
  .catch((error) => {
    logger.error('Unable to connect to PostgreSQL:', error);
  });

module.exports = sequelize;
