require('dotenv').config();
const knex = require('knex')(require('../knexfile.js').development);

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
