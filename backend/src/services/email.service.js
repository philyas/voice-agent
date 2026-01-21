/**
 * Email Service
 * Handles sending emails using nodemailer
 */

const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const { marked } = require('marked');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialize nodemailer transporter
   */
  initializeTransporter() {
    // Only initialize if SMTP is configured
    if (
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD
    ) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10) || 465,
        secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
    }
  }

  /**
   * Check if email service is configured
   */
  isConfigured() {
    return this.transporter !== null;
  }

  /**
   * Send email with audio attachment and enrichments
   * @param {string} to - Recipient email address
   * @param {string} recordingId - Recording ID
   * @param {string} audioPath - Path to audio file
   * @param {string} transcriptionText - Transcription text
   * @param {Array} enrichments - Array of enrichments
   * @param {string} originalFilename - Original filename
   */
  async sendRecordingEmail(to, recordingId, audioPath, transcriptionText, enrichments = [], originalFilename) {
    if (!this.isConfigured()) {
      throw new Error('Email service is not configured. Please set SMTP environment variables.');
    }

    try {
      // Read audio file
      const audioBuffer = await fs.readFile(audioPath);
      const audioFilename = originalFilename || `recording-${recordingId}.mp3`;

      // Build HTML content
      let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #d4a853 0%, #b8942d 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
            .section { margin-bottom: 30px; }
            .section-title { color: #d4a853; font-size: 18px; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #d4a853; padding-bottom: 5px; }
            .transcription { background: white; padding: 15px; border-radius: 4px; border-left: 4px solid #d4a853; margin-top: 10px; }
            .enrichment { background: white; padding: 15px; border-radius: 4px; border-left: 4px solid #b8942d; margin-top: 10px; margin-bottom: 15px; }
            .enrichment-type { color: #b8942d; font-weight: bold; text-transform: uppercase; font-size: 12px; margin-bottom: 8px; }
            .enrichment h1, .enrichment h2, .enrichment h3, .enrichment h4, .enrichment h5, .enrichment h6 { color: #333; margin-top: 20px; margin-bottom: 10px; font-weight: bold; }
            .enrichment h2 { font-size: 20px; border-bottom: 2px solid #d4a853; padding-bottom: 5px; }
            .enrichment h3 { font-size: 18px; }
            .enrichment ul, .enrichment ol { margin: 10px 0; padding-left: 25px; }
            .enrichment li { margin: 5px 0; }
            .enrichment p { margin: 10px 0; }
            .enrichment code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
            .enrichment pre { background: #f4f4f4; padding: 10px; border-radius: 4px; overflow-x: auto; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Voice Agent - Aufnahme geteilt</h1>
            </div>
            <div class="content">
              <div class="section">
                <div class="section-title">Audio-Datei</div>
                <p>Die Audio-Aufnahme ist als Anhang beigefügt: <strong>${audioFilename}</strong></p>
              </div>
      `;

      // Add transcription if available
      if (transcriptionText) {
        htmlContent += `
          <div class="section">
            <div class="section-title">Transkription</div>
            <div class="transcription">
              ${transcriptionText.replace(/\n/g, '<br>')}
            </div>
          </div>
        `;
      }

      // Add enrichments if available
      if (enrichments && enrichments.length > 0) {
        htmlContent += `
          <div class="section">
            <div class="section-title">Enrichments (${enrichments.length})</div>
        `;

        enrichments.forEach((enrichment) => {
          // Convert Markdown to HTML
          const enrichmentHtml = marked.parse(enrichment.content || '');
          htmlContent += `
            <div class="enrichment">
              <div class="enrichment-type">${enrichment.type}</div>
              <div>${enrichmentHtml}</div>
            </div>
          `;
        });

        htmlContent += `</div>`;
      }

      htmlContent += `
            </div>
            <div class="footer">
              <p>Diese E-Mail wurde von Voice Agent gesendet.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Send email
      const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'Voice Agent'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to: to,
        subject: `Voice Agent Aufnahme: ${originalFilename || 'Aufnahme'}`,
        html: htmlContent,
        attachments: [
          {
            filename: audioFilename,
            content: audioBuffer,
          },
        ],
      };

      const info = await this.transporter.sendMail(mailOptions);
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }
}

// Export singleton instance
module.exports = new EmailService();
