const mysql = require('mysql2/promise');
const { database } = require('./keys');

// Create the connection pool
const pool = mysql.createPool(database);

/**
 * Get a connection from the pool.
 * @returns {Promise<import('mysql2/promise').PoolConnection>}
 */
async function getConnection() {
  return pool.getConnection();
}

/**
 * Helper to execute a query directly from the pool.
 * @param {string} sql 
 * @param {any[]} params 
 * @returns {Promise<[any[], import('mysql2/promise').FieldPacket[]]>}
 */
async function query(sql, params) {
  return pool.query(sql, params);
}

/**
 * Execute a callback within a transaction.
 * The callback receives a connection object.
 * Automatically commits if successful, rolls back on error.
 * @param {(conn: import('mysql2/promise').PoolConnection) => Promise<any>} callback 
 */
async function withTransaction(callback) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Initial connection check
pool.getConnection()
  .then(connection => {
    pool.releaseConnection(connection);
    console.log('DB is Connected');
  })
  .catch(err => {
    console.error('Initial DB connection error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('Database connection was closed.');
    }
    if (err.code === 'ER_CON_COUNT_ERROR') {
      console.error('Database has too many connections.');
    }
    if (err.code === 'ECONNREFUSED') {
      console.error('Database connection was refused.');
    }
  });

module.exports = {
  pool,
  query,
  getConnection,
  withTransaction
};
