/**
 * Routes Index
 * Central router configuration
 */

const express = require('express');
const recordingRoutes = require('./recording.routes');
const transcriptionRoutes = require('./transcription.routes');
const enrichmentRoutes = require('./enrichment.routes');
const googleDocsRoutes = require('./google-docs.routes');
const { router: realtimeRoutes } = require('./realtime.routes');

const router = express.Router();

// API Info endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Voice Agent API v1',
    version: '1.0.0',
    endpoints: {
      recordings: '/api/v1/recordings',
      transcriptions: '/api/v1/transcriptions',
      enrichments: '/api/v1/enrichments',
    },
    documentation: {
      recordings: {
        'GET /recordings': 'Get all recordings',
        'GET /recordings/:id': 'Get recording by ID',
        'POST /recordings': 'Upload new audio recording',
        'POST /recordings/:id/transcribe': 'Transcribe recording',
        'POST /recordings/:id/send-email': 'Send recording via email',
        'DELETE /recordings/:id': 'Delete recording',
      },
      transcriptions: {
        'GET /transcriptions': 'Get all transcriptions',
        'GET /transcriptions/:id': 'Get transcription by ID',
        'PATCH /transcriptions/:id': 'Update transcription text',
        'DELETE /transcriptions/:id': 'Delete transcription',
        'POST /transcriptions/:id/enrich': 'Enrich transcription with AI',
        'POST /transcriptions/:id/enrichments/manual': 'Create manual enrichment',
        'GET /transcriptions/:id/enrichments': 'Get enrichments',
      },
      enrichments: {
        'GET /enrichments': 'Get all enrichments',
        'GET /enrichments/:id': 'Get enrichment by ID',
        'GET /enrichments/types': 'Get available types',
        'PATCH /enrichments/:id': 'Update enrichment content',
        'DELETE /enrichments/:id': 'Delete enrichment',
      },
    },
  });
});

// Mount routes
router.use('/recordings', recordingRoutes);
router.use('/transcriptions', transcriptionRoutes);
router.use('/enrichments', enrichmentRoutes);
router.use('/google-docs', googleDocsRoutes);
router.use('/realtime', realtimeRoutes);

module.exports = router;
