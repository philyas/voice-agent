/**
 * Enrichment Routes
 * API endpoints for AI enrichments
 */

const express = require('express');
const enrichmentController = require('../controllers/enrichment.controller');

const router = express.Router();

/**
 * @route   GET /api/v1/enrichments/types
 * @desc    Get available enrichment types
 * @access  Public
 */
router.get('/types', enrichmentController.getTypes.bind(enrichmentController));

/**
 * @route   GET /api/v1/enrichments/stats
 * @desc    Get enrichment statistics
 * @access  Public
 */
router.get('/stats', enrichmentController.getStats.bind(enrichmentController));

/**
 * @route   GET /api/v1/enrichments
 * @desc    Get all enrichments
 * @access  Public
 */
router.get('/', enrichmentController.getAll.bind(enrichmentController));

/**
 * @route   GET /api/v1/enrichments/:id
 * @desc    Get enrichment by ID
 * @access  Public
 */
router.get('/:id', enrichmentController.getById.bind(enrichmentController));

/**
 * @route   PATCH /api/v1/enrichments/:id
 * @desc    Update enrichment content (e.g., toggle checkboxes)
 * @access  Public
 */
router.patch('/:id', enrichmentController.update.bind(enrichmentController));

/**
 * @route   DELETE /api/v1/enrichments/:id
 * @desc    Delete an enrichment
 * @access  Public
 */
router.delete('/:id', enrichmentController.delete.bind(enrichmentController));

module.exports = router;
