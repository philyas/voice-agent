/**
 * Google Docs Controller
 * Handles OAuth flow and document creation
 */

const BaseController = require('./base.controller');
const googleDocsService = require('../services/google-docs.service');
const recordingDataService = require('../services/recording-data.service');
const { ApiError } = require('../middleware/error.middleware');
const { env } = require('../config');

class GoogleDocsController extends BaseController {
  /**
   * Get Google OAuth authorization URL
   * GET /api/v1/google-docs/auth
   */
  async getAuthUrl(req, res, next) {
    try {
      const authUrl = googleDocsService.getAuthUrl();
      return this.success(res, { authUrl }, { message: 'Authorization URL generated' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * OAuth callback - exchange code for tokens
   * GET /api/v1/google-docs/callback
   */
  async callback(req, res, next) {
    try {
      const { code } = req.query;

      if (!code) {
        throw new ApiError(400, 'Authorization code is required');
      }

      const tokens = await googleDocsService.getTokens(code);

      // Redirect to frontend with tokens
      const redirectUrl = `${env.FRONTEND_URL}/auth/google/callback?tokens=${encodeURIComponent(JSON.stringify(tokens))}`;
      res.redirect(redirectUrl);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create Google Doc from recording
   * POST /api/v1/google-docs/create/:recordingId
   */
  async createDocument(req, res, next) {
    try {
      const { recordingId } = req.params;
      const { tokens } = req.body;

      // Validate tokens
      if (!tokens?.access_token) {
        throw new ApiError(400, 'Google OAuth tokens are required');
      }

      // Get recording with transcription and enrichments
      const { recording, transcription, enrichments } = await recordingDataService.getRecordingOrThrow(recordingId);

      // Create document
      const result = await googleDocsService.createDocument(
        tokens,
        recording,
        transcription,
        enrichments
      );

      return this.success(res, result, { message: 'Document created successfully in Google Drive' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new GoogleDocsController();
