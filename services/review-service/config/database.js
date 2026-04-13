const { Pool } = require('pg');
const logger = require('../../../shared/logger');

const connectionString =
  process.env.POSTGRES_URI || 'postgres://review_user:review_pass@localhost:5432/review_db';

const pool = new Pool({
  connectionString
});

pool.on('error', (error) => {
  logger.error('Unexpected PostgreSQL pool error:', error);
});

async function query(text, params = []) {
  return pool.query(text, params);
}

async function connectDatabase() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    logger.info('PostgreSQL connected successfully');
  } finally {
    client.release();
  }
}

async function closeDatabase() {
  await pool.end();
}

module.exports = {
  pool,
  query,
  connectDatabase,
  closeDatabase
};
