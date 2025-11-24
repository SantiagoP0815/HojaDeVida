const mysql = require('mysql');
const { promisify }= require('util');

const { database } = require('./keys');

// Create pool with config
const pool = mysql.createPool(database);

// Initial quick connection check
pool.getConnection((err, connection) => {
  if (err) {
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('Database connection was closed.');
    }
    if (err.code === 'ER_CON_COUNT_ERROR') {
      console.error('Database has to many connections');
    }
    if (err.code === 'ECONNREFUSED') {
      console.error('Database connection was refused');
    }
    console.error('Initial DB connection error:', err);
  }
  if (connection) connection.release();
  console.log('DB is Connected');

  return;
});

// Promisify Pool Queries and bind to pool so `this` is correct
pool.query = promisify(pool.query).bind(pool);

/**
 * Get a pooled connection promisified with transaction helpers
 * @returns {Promise<Connection>} connection
 */
async function getConnection() {
  const getConn = () => new Promise((resolve, reject) => {
    pool.getConnection((err, conn) => err ? reject(err) : resolve(conn));
  });
  const connection = await getConn();
  // Promisify common connection methods and bind
  connection.query = promisify(connection.query).bind(connection);
  connection.beginTransaction = promisify(connection.beginTransaction).bind(connection);
  connection.commit = promisify(connection.commit).bind(connection);
  connection.rollback = promisify(connection.rollback).bind(connection);
  return connection;
}

/**
 * Simple query helper using the pool
 * @param {string} sql
 * @param {Array} params
 */
async function query(sql, params) {
  return pool.query(sql, params);
}

/**
 * Run a callback inside a transaction. The callback receives a connection
 * that should be used to run queries (connection.query).
 * The transaction will be committed if callback resolves, otherwise rolled back.
 */
async function withTransaction(cb) {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    const result = await cb(conn);
    await conn.commit();
    conn.release();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch (rollbackErr) {
      console.error('Error during rollback:', rollbackErr);
    }
    conn.release();
    throw err;
  }
}

// Graceful shutdown of pool
function closePoolGracefully() {
  pool.end(err => {
    if (err) {
      console.error('Error closing DB pool:', err);
      process.exit(1);
    }
    console.log('DB pool closed.');
    process.exit(0);
  });
}

process.on('SIGINT', closePoolGracefully);
process.on('SIGTERM', closePoolGracefully);

module.exports = {
  pool,
  query,
  getConnection,
  withTransaction
};
