/**
 * Google Docs Controller
 * Handles OAuth flow and document creation
 */

const googleDocsService = require('../services/google-docs.service');
const recordingService = require('../services/recording.service');
const transcriptionService = require('../services/transcription.service');
const { ApiError } = require('../middleware/error.middleware');
const { env } = require('../config');

class GoogleDocsController {
  /**
   * Get Google OAuth authorization URL
   * GET /api/v1/google-docs/auth
   */
  async getAuthUrl(req, res, next) {
    try {
      const authUrl = googleDocsService.getAuthUrl();
      res.json({
        success: true,
        data: { authUrl },
        message: 'Authorization URL generated',
      });
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
        throw new ApiError(400, 'Authorization code is required', 'MISSING_CODE');
      }

      const tokens = await googleDocsService.getTokens(code);

      // In production, you should store tokens in database associated with user
      // For now, we'll return them to frontend (should be stored securely)
      
      // Redirect to frontend with tokens (or store server-side and return session)
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
      const { tokens } = req.body; // Tokens from frontend (should be stored securely in production)

      if (!tokens || !tokens.access_token) {
        throw new ApiError(400, 'Google OAuth tokens are required', 'MISSING_TOKENS');
      }

      // Get recording
      const recording = await recordingService.getRecordingById(recordingId);
      if (!recording) {
        throw new ApiError(404, 'Recording not found', 'RECORDING_NOT_FOUND');
      }

      // Get transcription and enrichments
      let transcription = null;
      let enrichments = [];

      try {
        transcription = await transcriptionService.getTranscriptionByRecordingId(recordingId);
        if (transcription) {
          const fullTranscription = await transcriptionService.getTranscriptionById(transcription.id);
          if (fullTranscription && fullTranscription.enrichments) {
            enrichments = fullTranscription.enrichments;
          }
        }
      } catch (err) {
        console.warn('No transcription found for recording:', recordingId);
      }

      // Create document
      const result = await googleDocsService.createDocument(
        tokens,
        recording,
        transcription,
        enrichments
      );

      res.json({
        success: true,
        data: result,
        message: 'Document created successfully in Google Drive',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new GoogleDocsController();
