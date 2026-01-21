/**
 * Export Service
 * Handles PDF and Google Docs exports
 */

const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const path = require('path');
const { marked } = require('marked');

class ExportService {
  /**
   * Generate PDF from recording data
   * @param {Object} recording - Recording object
   * @param {Object} transcription - Transcription object (optional)
   * @param {Array} enrichments - Array of enrichments (optional)
   * @returns {Promise<Buffer>} - PDF buffer
   */
  async generatePDF(recording, transcription = null, enrichments = []) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
          size: 'A4',
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);

        // Header
        doc
          .fontSize(20)
          .fillColor('#d4a853')
          .text('Voice Agent - Aufnahme', { align: 'center' })
          .moveDown();

        // Recording Info
        doc
          .fontSize(12)
          .fillColor('#000000')
          .text('Aufnahme-Informationen', { underline: true })
          .moveDown(0.5);

        doc.fontSize(10).text(`Dateiname: ${recording.original_filename || recording.filename}`, {
          indent: 20,
        });
        doc.text(`Erstellt am: ${new Date(recording.created_at).toLocaleString('de-DE')}`, {
          indent: 20,
        });
        if (recording.duration_ms) {
          const mins = Math.floor(recording.duration_ms / 60000);
          const secs = Math.floor((recording.duration_ms % 60000) / 1000);
          doc.text(`Dauer: ${mins}:${secs.toString().padStart(2, '0')}`, { indent: 20 });
        }
        doc.text(`Dateigröße: ${(recording.file_size / 1024 / 1024).toFixed(2)} MB`, {
          indent: 20,
        });
        doc.moveDown();

        // Transcription
        if (transcription && transcription.text) {
          doc
            .fontSize(12)
            .fillColor('#000000')
            .text('Transkription', { underline: true })
            .moveDown(0.5);

          // Split text into paragraphs and add to PDF
          const paragraphs = transcription.text.split('\n').filter((p) => p.trim());
          doc.fontSize(10);
          paragraphs.forEach((paragraph) => {
            doc.text(paragraph.trim(), { indent: 20, align: 'left' });
            doc.moveDown(0.3);
          });
          doc.moveDown();
        }

        // Enrichments
        if (enrichments && enrichments.length > 0) {
          doc
            .fontSize(12)
            .fillColor('#000000')
            .text('Enrichments', { underline: true })
            .moveDown(0.5);

          enrichments.forEach((enrichment, index) => {
            if (index > 0) {
              doc.moveDown();
            }

            // Enrichment Type Header
            doc
              .fontSize(11)
              .fillColor('#d4a853')
              .text(enrichment.type.toUpperCase(), { underline: true })
              .moveDown(0.3);

            // Convert markdown to plain text for PDF
            const plainText = this.markdownToPlainText(enrichment.content);
            doc.fontSize(10).fillColor('#000000');

            // Split into lines and add
            const lines = plainText.split('\n');
            lines.forEach((line) => {
              if (line.trim()) {
                doc.text(line.trim(), { indent: 20, align: 'left' });
                doc.moveDown(0.2);
              }
            });
          });
        }

        // Footer
        doc
          .fontSize(8)
          .fillColor('#666666')
          .text(
            `Erstellt am ${new Date().toLocaleString('de-DE')} mit Voice Agent`,
            { align: 'center' }
          );

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Convert markdown to plain text (simple version)
   */
  markdownToPlainText(markdown) {
    if (!markdown) return '';

    // Remove markdown syntax
    let text = markdown
      .replace(/^#+\s+/gm, '') // Headers
      .replace(/\*\*(.+?)\*\*/g, '$1') // Bold
      .replace(/\*(.+?)\*/g, '$1') // Italic
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Links
      .replace(/`([^`]+)`/g, '$1') // Code
      .replace(/^\s*[-*+]\s+/gm, '• ') // List items
      .replace(/^\s*\d+\.\s+/gm, '') // Numbered lists
      .replace(/\[([ x])\]/g, '') // Checkboxes
      .trim();

    return text;
  }


  /**
   * Export to Google Docs using a simpler approach (returns HTML that can be imported)
   * @param {Object} recording - Recording object
   * @param {Object} transcription - Transcription object (optional)
   * @param {Array} enrichments - Array of enrichments (optional)
   * @returns {Promise<{html: string, instructions: string}>} - HTML content and instructions
   */
  async generateGoogleDocsHTML(recording, transcription = null, enrichments = []) {
    // Build HTML content
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #d4a853; border-bottom: 2px solid #d4a853; padding-bottom: 10px; }
          h2 { color: #b8942d; margin-top: 30px; }
          h3 { color: #666; }
          .info { background: #f9f9f9; padding: 15px; border-left: 4px solid #d4a853; margin: 20px 0; }
          .transcription { background: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0; white-space: pre-wrap; }
          .enrichment { background: #fff; padding: 15px; border-left: 4px solid #b8942d; margin: 20px 0; }
          .enrichment-type { color: #b8942d; font-weight: bold; text-transform: uppercase; font-size: 12px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <h1>Voice Agent - Aufnahme</h1>
        
        <div class="info">
          <h3>Aufnahme-Informationen</h3>
          <p><strong>Dateiname:</strong> ${recording.original_filename || recording.filename}</p>
          <p><strong>Erstellt am:</strong> ${new Date(recording.created_at).toLocaleString('de-DE')}</p>
          ${recording.duration_ms ? `<p><strong>Dauer:</strong> ${Math.floor(recording.duration_ms / 60000)}:${Math.floor((recording.duration_ms % 60000) / 1000).toString().padStart(2, '0')}</p>` : ''}
          <p><strong>Dateigröße:</strong> ${(recording.file_size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
    `;

    // Add transcription
    if (transcription && transcription.text) {
      htmlContent += `
        <h2>Transkription</h2>
        <div class="transcription">
          ${transcription.text.replace(/\n/g, '<br>')}
        </div>
      `;
    }

    // Add enrichments
    if (enrichments && enrichments.length > 0) {
      htmlContent += `<h2>Enrichments</h2>`;
      enrichments.forEach((enrichment) => {
        const enrichmentHtml = marked.parse(enrichment.content || '');
        htmlContent += `
          <div class="enrichment">
            <div class="enrichment-type">${enrichment.type}</div>
            ${enrichmentHtml}
          </div>
        `;
      });
    }

    htmlContent += `
        <hr style="margin-top: 40px; border: none; border-top: 1px solid #ddd;">
        <p style="text-align: center; color: #666; font-size: 12px;">
          Erstellt am ${new Date().toLocaleString('de-DE')} mit Voice Agent
        </p>
      </body>
      </html>
    `;

    return {
      html: htmlContent,
      instructions:
        'Kopiere den HTML-Inhalt und füge ihn in Google Docs ein, oder speichere als HTML-Datei und importiere sie in Google Docs.',
    };
  }
}

module.exports = new ExportService();
