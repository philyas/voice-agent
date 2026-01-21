/**
 * Realtime Transcription Routes
 * WebSocket endpoint for live transcription
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const realtimeService = require('../services/realtime.service');
const { env } = require('../config/env');

const router = express.Router();

// Store active WebSocket connections
const activeConnections = new Map();

/**
 * Setup WebSocket server for live transcription
 */
function setupWebSocketServer(server) {
  const wss = new WebSocket.Server({ 
    server,
    path: '/api/v1/realtime/transcribe',
  });

  wss.on('connection', (clientWs, req) => {
    const connectionId = req.headers['x-connection-id'] || `conn_${Date.now()}`;
    let openaiWs = null;
    let language = 'de';

    console.log(`[Realtime] New client connection: ${connectionId}`);

    // Parse language from query string
    const url = new URL(req.url, `http://${req.headers.host}`);
    language = url.searchParams.get('language') || 'de';

    // Check if OpenAI is configured
    if (!realtimeService.isConfigured()) {
      clientWs.send(JSON.stringify({
        type: 'error',
        error: 'OpenAI API key is not configured',
      }));
      clientWs.close();
      return;
    }

    try {
      // Create connection to OpenAI Realtime API
      openaiWs = realtimeService.createConnection(language);

      openaiWs.on('open', () => {
        console.log(`[Realtime] OpenAI connection established for ${connectionId}`);
        
        // Initialize session for transcription
        realtimeService.initializeSession(openaiWs, language);

        // Send ready event to client
        clientWs.send(JSON.stringify({
          type: 'ready',
          connectionId,
        }));
      });

      openaiWs.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());

          // Handle transcription events
          if (message.type === 'conversation.item.input_audio_transcription.delta') {
            // Partial transcription update
            clientWs.send(JSON.stringify({
              type: 'transcription.delta',
              text: message.delta || message.transcript || '',
              item_id: message.item_id,
            }));
          } else if (message.type === 'conversation.item.input_audio_transcription.completed') {
            // Final transcription for a speech turn
            clientWs.send(JSON.stringify({
              type: 'transcription.completed',
              text: message.transcript || message.text || '',
              item_id: message.item_id,
            }));
          } else if (message.type === 'error') {
            console.error(`[Realtime] OpenAI error for ${connectionId}:`, message.error);
            clientWs.send(JSON.stringify({
              type: 'error',
              error: message.error?.message || message.error || 'OpenAI API error',
            }));
          } else if (message.type === 'session.created' || message.type === 'session.updated') {
            // Session ready
            console.log(`[Realtime] Session ready for ${connectionId}`);
            clientWs.send(JSON.stringify({
              type: 'session.ready',
            }));
          } else if (message.type === 'input_audio_buffer.committed') {
            // Audio buffer committed - transcription will follow
            console.log(`[Realtime] Audio buffer committed for ${connectionId}`);
          }
        } catch (err) {
          console.error(`[Realtime] Error parsing OpenAI message:`, err);
        }
      });

      openaiWs.on('error', (error) => {
        console.error(`[Realtime] OpenAI WebSocket error for ${connectionId}:`, error);
        clientWs.send(JSON.stringify({
          type: 'error',
          error: error.message || 'OpenAI connection error',
        }));
      });

      openaiWs.on('close', () => {
        console.log(`[Realtime] OpenAI connection closed for ${connectionId}`);
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.close();
        }
      });

      // Handle messages from client
      clientWs.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());

          if (message.type === 'audio') {
            // Convert base64 audio to buffer and send to OpenAI
            if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
              const audioBuffer = Buffer.from(message.data, 'base64');
              realtimeService.sendAudio(openaiWs, audioBuffer);
            }
          } else if (message.type === 'commit') {
            // Commit current audio buffer
            if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
              realtimeService.commitAudio(openaiWs);
            }
          } else if (message.type === 'close') {
            // Close connection
            if (openaiWs) {
              realtimeService.closeConnection(openaiWs);
            }
            clientWs.close();
          }
        } catch (err) {
          console.error(`[Realtime] Error handling client message:`, err);
          clientWs.send(JSON.stringify({
            type: 'error',
            error: err.message || 'Error processing message',
          }));
        }
      });

      clientWs.on('close', () => {
        console.log(`[Realtime] Client connection closed: ${connectionId}`);
        if (openaiWs) {
          realtimeService.closeConnection(openaiWs);
        }
        activeConnections.delete(connectionId);
      });

      clientWs.on('error', (error) => {
        console.error(`[Realtime] Client WebSocket error for ${connectionId}:`, error);
        if (openaiWs) {
          realtimeService.closeConnection(openaiWs);
        }
        activeConnections.delete(connectionId);
      });

      activeConnections.set(connectionId, { clientWs, openaiWs });
    } catch (error) {
      console.error(`[Realtime] Error setting up connection for ${connectionId}:`, error);
      clientWs.send(JSON.stringify({
        type: 'error',
        error: error.message || 'Failed to establish connection',
      }));
      clientWs.close();
    }
  });

  wss.on('error', (error) => {
    console.error('[Realtime] WebSocket server error:', error);
  });

  return wss;
}

module.exports = { router, setupWebSocketServer };
