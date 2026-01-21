/**
 * Models Index
 * Export all database models
 */

const BaseModel = require('./base.model');
const recordingModel = require('./recording.model');
const transcriptionModel = require('./transcription.model');
const enrichmentModel = require('./enrichment.model');

module.exports = {
  BaseModel,
  recordingModel,
  transcriptionModel,
  enrichmentModel,
};
