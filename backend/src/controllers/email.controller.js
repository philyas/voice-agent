/**
 * Email Controller
 * Handles HTTP requests for sending emails
 */

const emailService = require('../services/email.service');
const recordingService = require('../services/recording.service');
const transcriptionService = require('../services/transcription.service');
const { ApiError } = require('../middleware/error.middleware');

class EmailController {
  /**
   * Send recording via email
   * POST /api/v1/recordings/:id/send-email
   */
  async sendRecordingEmail(req, res, next) {
    try {
      const { id } = req.params;
      const { email } = req.body;

      if (!email || !email.includes('@')) {
        throw new ApiError(400, 'Valid email address is required', 'INVALID_EMAIL');
      }

      // Check if email service is configured
      if (!emailService.isConfigured()) {
        throw new ApiError(503, 'Email service is not configured', 'EMAIL_NOT_CONFIGURED');
      }

      // Get recording
      const recording = await recordingService.getRecordingById(id);
      if (!recording) {
        throw new ApiError(404, 'Recording not found', 'RECORDING_NOT_FOUND');
      }

      // Get transcription if available
      let transcription = null;
      let enrichments = [];
      
      try {
        transcription = await transcriptionService.getTranscriptionByRecordingId(id);
        if (transcription) {
          // Get full transcription with enrichments
          const fullTranscription = await transcriptionService.getTranscriptionById(transcription.id);
          if (fullTranscription && fullTranscription.enrichments) {
            enrichments = fullTranscription.enrichments;
          }
        }
      } catch (err) {
        // Transcription not found, continue without it
        console.warn('No transcription found for recording:', id);
      }

      // Get audio file path
      const audioPath = recording.storage_path;
      if (!audioPath) {
        throw new ApiError(404, 'Audio file not found', 'AUDIO_NOT_FOUND');
      }

      // Send email
      const result = await emailService.sendRecordingEmail(
        email,
        id,
        audioPath,
        transcription?.text || null,
        enrichments,
        recording.original_filename || recording.filename
      );

      res.json({
        success: true,
        message: 'Email sent successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new EmailController();
