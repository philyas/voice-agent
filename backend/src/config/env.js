/**
 * Environment Configuration
 * Centralized environment variable management
 */

const env = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 4000,

  // Database
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT, 10) || 5432,
  DB_NAME: process.env.DB_NAME || 'voice_agent',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',

  // OpenAI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,

  // Frontend
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
};

/**
 * Validate required environment variables
 */
function validateEnv() {
  const required = ['OPENAI_API_KEY'];
  const missing = required.filter((key) => !env[key]);

  if (missing.length > 0 && env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (missing.length > 0) {
    console.warn(`⚠️  Warning: Missing environment variables: ${missing.join(', ')}`);
  }
}

// Validate on module load
validateEnv();

module.exports = { env, validateEnv };
