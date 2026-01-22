/**
 * Email Controller
 * Handles HTTP requests for sending emails
 */

const BaseController = require('./base.controller');
const emailService = require('../services/email.service');
const recordingDataService = require('../services/recording-data.service');
const { ApiError } = require('../middleware/error.middleware');

class EmailController extends BaseController {
  /**
   * Send recording via email
   * POST /api/v1/recordings/:id/send-email
   */
  async sendRecordingEmail(req, res, next) {
    try {
      const { id } = req.params;
      const { email } = req.body;

      // Validate email
      if (!email || !email.includes('@')) {
        throw new ApiError(400, 'Valid email address is required');
      }

      // Check if email service is configured
      if (!emailService.isConfigured()) {
        throw new ApiError(503, 'Email service is not configured');
      }

      // Get recording with transcription and enrichments
      const data = await recordingDataService.getRecordingOrThrow(id);
      const { recording, transcription, enrichments } = data;

      // Validate audio path
      if (!recording.storage_path) {
        throw new ApiError(404, 'Audio file not found');
      }

      // Send email
      const result = await emailService.sendRecordingEmail(
        email,
        id,
        recording.storage_path,
        transcription?.text || null,
        enrichments,
        recording.original_filename || recording.filename
      );

      return this.success(res, result, { message: 'Email sent successfully' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new EmailController();
