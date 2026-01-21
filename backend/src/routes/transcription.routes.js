/**
 * Transcription Routes
 * API endpoints for transcriptions
 */

const express = require('express');
const transcriptionController = require('../controllers/transcription.controller');

const router = express.Router();

/**
 * @route   GET /api/v1/transcriptions/stats
 * @desc    Get transcription statistics
 * @access  Public
 */
router.get('/stats', transcriptionController.getStats.bind(transcriptionController));

/**
 * @route   GET /api/v1/transcriptions
 * @desc    Get all transcriptions
 * @access  Public
 */
router.get('/', transcriptionController.getAll.bind(transcriptionController));

/**
 * @route   GET /api/v1/transcriptions/:id
 * @desc    Get transcription by ID (includes enrichments)
 * @access  Public
 */
router.get('/:id', transcriptionController.getById.bind(transcriptionController));

/**
 * @route   PATCH /api/v1/transcriptions/:id
 * @desc    Update transcription text
 * @access  Public
 */
router.patch('/:id', transcriptionController.update.bind(transcriptionController));

/**
 * @route   DELETE /api/v1/transcriptions/:id
 * @desc    Delete a transcription
 * @access  Public
 */
router.delete('/:id', transcriptionController.delete.bind(transcriptionController));

/**
 * @route   POST /api/v1/transcriptions/:id/enrich
 * @desc    Enrich a transcription with AI processing
 * @access  Public
 */
router.post('/:id/enrich', transcriptionController.enrich.bind(transcriptionController));

/**
 * @route   GET /api/v1/transcriptions/:id/enrichments
 * @desc    Get all enrichments for a transcription
 * @access  Public
 */
router.get('/:id/enrichments', transcriptionController.getEnrichments.bind(transcriptionController));

module.exports = router;
