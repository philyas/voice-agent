/**
 * Services Index
 * Export all service modules
 */

const openaiService = require('./openai.service');
const recordingService = require('./recording.service');
const transcriptionService = require('./transcription.service');
const enrichmentService = require('./enrichment.service');
const embeddingService = require('./embedding.service');
const ragService = require('./rag.service');
const emailService = require('./email.service');
const exportService = require('./export.service');
const googleDocsService = require('./google-docs.service');
const recordingDataService = require('./recording-data.service');

module.exports = {
  openaiService,
  recordingService,
  transcriptionService,
  enrichmentService,
  embeddingService,
  ragService,
  emailService,
  exportService,
  googleDocsService,
  recordingDataService,
};
