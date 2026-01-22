/**
 * Controllers Index
 * Export all controller modules
 */

const recordingController = require('./recording.controller');
const transcriptionController = require('./transcription.controller');
const enrichmentController = require('./enrichment.controller');
const ragController = require('./rag.controller');

module.exports = {
  recordingController,
  transcriptionController,
  enrichmentController,
  ragController,
};
