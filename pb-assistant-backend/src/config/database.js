const { Pool } = require('pg');

let pool;

const createPool = () => {
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL not set. Database connection is not initialized.');
    return null;
  }

  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false,
  });
};

const initDb = async () => {
  if (typeof pool !== 'undefined') {
    return pool;
  }

  pool = createPool();

  return pool;
};

const getPool = () => {
  if (!pool) {
    throw new Error('Database pool has not been initialized. Call initDb() first.');
  }

  return pool;
};

const getPoolOrNull = () => (pool ? pool : null);

module.exports = {
  initDb,
  getPool,
  getPoolOrNull,
};
