const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const http = require('http');
const app = require('./app');
const { env } = require('./config/env');
const db = require('./config/database');
const { setupWebSocketServer } = require('./routes/realtime.routes');

const PORT = env.PORT || 4000;

// Test database connection
async function startServer() {
  try {
    // Test DB connection
    await db.raw('SELECT 1');
    console.log('✅ Database connection established');

    // Create HTTP server
    const server = http.createServer(app);

    // Setup WebSocket server for live transcription
    setupWebSocketServer(server);

    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📝 Environment: ${env.NODE_ENV}`);
      console.log(`🔌 WebSocket server ready for live transcription`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message || error);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  await db.destroy();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  await db.destroy();
  process.exit(0);
});

startServer();
