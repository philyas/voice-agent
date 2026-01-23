// Test setup file
// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'voice_agent_test';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.UPLOADS_DIR = '/tmp/test-uploads';
process.env.OPENAI_API_KEY = 'test-key';
process.env.CORS_ORIGINS = 'http://localhost:3000';
