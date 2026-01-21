/**
 * Config Index
 * Export all configuration modules
 */

const { env, validateEnv } = require('./env');
const db = require('./database');

module.exports = {
  env,
  validateEnv,
  db,
};
