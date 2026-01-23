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

  // CORS allowed origins (comma-separated). Defaults to FRONTEND_URL.
  // Example: http://localhost:3000,https://ptw-audio-intelligence.vercel.app
  CORS_ORIGINS: (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  // Google OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || `http://localhost:${process.env.PORT || 4000}/api/v1/google-docs/callback`,
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
