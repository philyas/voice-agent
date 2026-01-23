const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const environment = process.env.NODE_ENV || 'development';
const knexConfig = require('../knexfile.js');
const knex = require('knex')(knexConfig[environment]);

async function waitForDatabase() {
  const maxAttempts = 60;
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      await knex.raw('SELECT 1');
      console.log('✅ Database is ready');
      await knex.destroy();
      process.exit(0);
    } catch (error) {
      attempts++;
      if (attempts >= maxAttempts) {
        console.error('❌ Database connection timeout after', maxAttempts, 'seconds');
        await knex.destroy();
        process.exit(1);
      }
      console.log(`   Waiting... (${attempts}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

waitForDatabase();
