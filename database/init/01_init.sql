-- Voice Agent Database Initialization
-- This script runs when the container is first created

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create application user (optional, for production)
-- CREATE USER voice_agent_app WITH PASSWORD 'secure_password';
-- GRANT ALL PRIVILEGES ON DATABASE voice_agent TO voice_agent_app;

-- Log initialization
DO $$
BEGIN
  RAISE NOTICE 'Voice Agent database initialized successfully at %', NOW();
END $$;
