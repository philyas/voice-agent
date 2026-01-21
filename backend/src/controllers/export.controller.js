/**
 * Export Controller
 * Handles HTTP requests for exporting recordings
 */

const exportService = require('../services/export.service');
const recordingService = require('../services/recording.service');
const transcriptionService = require('../services/transcription.service');
const { ApiError } = require('../middleware/error.middleware');

class ExportController {
  /**
   * Export recording as PDF
   * GET /api/v1/recordings/:id/export/pdf
   */
  async exportPDF(req, res, next) {
    try {
      const { id } = req.params;

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

      // Generate PDF
      const pdfBuffer = await exportService.generatePDF(recording, transcription, enrichments);

      // Set response headers
      const filename = `${recording.original_filename || recording.filename || 'recording'}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      // Send PDF
      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export recording to Google Docs (returns HTML)
   * GET /api/v1/recordings/:id/export/google-docs
   */
  async exportGoogleDocs(req, res, next) {
    try {
      const { id } = req.params;

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

      // Generate HTML for Google Docs
      const result = await exportService.generateGoogleDocsHTML(recording, transcription, enrichments);

      res.json({
        success: true,
        data: result,
        message: 'Google Docs HTML generated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ExportController();
