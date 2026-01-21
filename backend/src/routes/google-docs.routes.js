/**
 * Google Docs Routes
 * Handles Google Docs OAuth and document creation endpoints
 */

const express = require('express');
const googleDocsController = require('../controllers/google-docs.controller');

const router = express.Router();

/**
 * @route   GET /api/v1/google-docs/auth
 * @desc    Get Google OAuth authorization URL
 * @access  Public
 */
router.get('/auth', googleDocsController.getAuthUrl.bind(googleDocsController));

/**
 * @route   GET /api/v1/google-docs/callback
 * @desc    OAuth callback - exchange code for tokens
 * @access  Public
 */
router.get('/callback', googleDocsController.callback.bind(googleDocsController));

/**
 * @route   POST /api/v1/google-docs/create/:recordingId
 * @desc    Create Google Doc from recording
 * @access  Public (should be authenticated in production)
 */
router.post('/create/:recordingId', googleDocsController.createDocument.bind(googleDocsController));

module.exports = router;
