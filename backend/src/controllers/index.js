/**
 * Controllers Index
 * Export all controller modules
 */

const BaseController = require('./base.controller');
const recordingController = require('./recording.controller');
const transcriptionController = require('./transcription.controller');
const enrichmentController = require('./enrichment.controller');
const ragController = require('./rag.controller');
const emailController = require('./email.controller');
const exportController = require('./export.controller');
const googleDocsController = require('./google-docs.controller');

module.exports = {
  BaseController,
  recordingController,
  transcriptionController,
  enrichmentController,
  ragController,
  emailController,
  exportController,
  googleDocsController,
};
