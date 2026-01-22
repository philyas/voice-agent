/**
 * Export Controller
 * Handles HTTP requests for exporting recordings
 */

const BaseController = require('./base.controller');
const exportService = require('../services/export.service');
const recordingDataService = require('../services/recording-data.service');

class ExportController extends BaseController {
  /**
   * Export recording as PDF
   * GET /api/v1/recordings/:id/export/pdf
   */
  async exportPDF(req, res, next) {
    try {
      const { id } = req.params;

      // Get recording with transcription and enrichments
      const { recording, transcription, enrichments } = await recordingDataService.getRecordingOrThrow(id);

      // Generate PDF
      const pdfBuffer = await exportService.generatePDF(recording, transcription, enrichments);

      // Set response headers and send
      const filename = `${recording.original_filename || recording.filename || 'recording'}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
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

      // Get recording with transcription and enrichments
      const { recording, transcription, enrichments } = await recordingDataService.getRecordingOrThrow(id);

      // Generate HTML for Google Docs
      const result = await exportService.generateGoogleDocsHTML(recording, transcription, enrichments);

      return this.success(res, result, { message: 'Google Docs HTML generated successfully' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ExportController();
