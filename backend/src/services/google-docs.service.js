/**
 * Google Docs Service
 * Handles Google Docs API integration for creating documents in Google Drive
 */

const { google } = require('googleapis');
const { env } = require('../config');

class GoogleDocsService {
  /**
   * Initialize OAuth2 client
   */
  getOAuth2Client() {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw new Error('Google OAuth credentials are not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.');
    }

    return new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_REDIRECT_URI
    );
  }

  /**
   * Get authorization URL for OAuth flow
   * @returns {string} Authorization URL
   */
  getAuthUrl() {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw new Error('Google OAuth credentials are not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.');
    }

    const oauth2Client = this.getOAuth2Client();
    
    const scopes = [
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/drive.file',
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force consent to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   * @param {string} code - Authorization code from OAuth callback
   * @returns {Promise<Object>} Tokens (access_token, refresh_token, etc.)
   */
  async getTokens(code) {
    const oauth2Client = this.getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  }

  /**
   * Create OAuth2 client with user tokens
   * @param {Object} tokens - User tokens (access_token, refresh_token)
   * @returns {google.auth.OAuth2Client}
   */
  createAuthenticatedClient(tokens) {
    const oauth2Client = this.getOAuth2Client();
    oauth2Client.setCredentials(tokens);
    return oauth2Client;
  }

  /**
   * Refresh access token if expired
   * @param {Object} tokens - Current tokens with refresh_token
   * @returns {Promise<Object>} New tokens
   */
  async refreshToken(tokens) {
    const oauth2Client = this.getOAuth2Client();
    oauth2Client.setCredentials(tokens);
    
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      return credentials;
    } catch (error) {
      throw new Error(`Failed to refresh token: ${error.message}`);
    }
  }

  /**
   * Convert markdown to Google Docs format
   * @param {string} markdown - Markdown content
   * @param {number} startIndex - Starting index for insertion
   * @returns {Array} Google Docs requests array and final index
   */
  markdownToGoogleDocsRequests(markdown, startIndex = 1) {
    const lines = markdown.split('\n');
    const requests = [];
    let currentIndex = startIndex;

    for (const line of lines) {
      if (line.trim() === '') {
        // Empty line - insert newline
        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: '\n',
          },
        });
        currentIndex += 1;
      } else if (line.startsWith('## ')) {
        // Heading 2
        const text = line.replace('## ', '');
        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: text + '\n',
          },
        });
        requests.push({
          updateParagraphStyle: {
            range: {
              startIndex: currentIndex,
              endIndex: currentIndex + text.length,
            },
            paragraphStyle: {
              namedStyleType: 'HEADING_2',
            },
            fields: 'namedStyleType',
          },
        });
        currentIndex += text.length + 1;
      } else if (line.startsWith('### ')) {
        // Heading 3
        const text = line.replace('### ', '');
        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: text + '\n',
          },
        });
        requests.push({
          updateParagraphStyle: {
            range: {
              startIndex: currentIndex,
              endIndex: currentIndex + text.length,
            },
            paragraphStyle: {
              namedStyleType: 'HEADING_3',
            },
            fields: 'namedStyleType',
          },
        });
        currentIndex += text.length + 1;
      } else if (line.match(/^- \[[ x]\]/)) {
        // Checkbox - Google Docs API doesn't support checkboxes directly
        // Use checkbox symbol and bullet point instead
        const isChecked = line.match(/^- \[x\]/);
        const checkboxSymbol = isChecked ? '☑' : '☐';
        const text = line.replace(/^- \[[ x]\]\s*/, '');
        const fullText = `${checkboxSymbol} ${text}`;
        
        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: fullText + '\n',
          },
        });
        // Add bullet point
        requests.push({
          createParagraphBullets: {
            range: {
              startIndex: currentIndex,
              endIndex: currentIndex + fullText.length,
            },
            bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE',
          },
        });
        currentIndex += fullText.length + 1;
      } else if (line.match(/^[-*+]\s/)) {
        // Bullet point
        const text = line.replace(/^[-*+]\s/, '');
        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: text + '\n',
          },
        });
        requests.push({
          createParagraphBullets: {
            range: {
              startIndex: currentIndex,
              endIndex: currentIndex + text.length,
            },
            bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE',
          },
        });
        currentIndex += text.length + 1;
      } else if (line.match(/^\d+\.\s/)) {
        // Numbered list
        const text = line.replace(/^\d+\.\s/, '');
        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: text + '\n',
          },
        });
        requests.push({
          createParagraphBullets: {
            range: {
              startIndex: currentIndex,
              endIndex: currentIndex + text.length,
            },
            bulletPreset: 'NUMBERED_DECIMAL_ALPHA_ROMAN',
          },
        });
        currentIndex += text.length + 1;
      } else {
        // Regular paragraph
        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: line + '\n',
          },
        });
        currentIndex += line.length + 1;
      }
    }

    return { requests, finalIndex: currentIndex };
  }

  /**
   * Create a Google Doc from transcription data
   * @param {Object} tokens - User OAuth tokens
   * @param {Object} recording - Recording object
   * @param {Object} transcription - Transcription object
   * @param {Array} enrichments - Array of enrichments
   * @returns {Promise<Object>} Created document info
   */
  async createDocument(tokens, recording, transcription = null, enrichments = []) {
    const oauth2Client = this.createAuthenticatedClient(tokens);
    
    // Check if token needs refresh
    if (oauth2Client.credentials.expiry_date && oauth2Client.credentials.expiry_date <= Date.now()) {
      const newTokens = await this.refreshToken(tokens);
      oauth2Client.setCredentials(newTokens);
    }

    const docs = google.docs({ version: 'v1', auth: oauth2Client });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Create document
    const documentTitle = `${recording.original_filename || recording.filename || 'Aufnahme'} - ${new Date(recording.created_at).toLocaleDateString('de-DE')}`;
    
    const doc = await docs.documents.create({
      requestBody: {
        title: documentTitle,
      },
    });

    const documentId = doc.data.documentId;

    // Build content
    const requests = [];

    // Title
    const titleText = `Voice Agent - Aufnahme\n\n`;
    requests.push({
      insertText: {
        location: { index: 1 },
        text: titleText,
      },
    });

    requests.push({
      updateParagraphStyle: {
        range: {
          startIndex: 1,
          endIndex: 1 + titleText.length - 2, // Exclude the two newlines
        },
        paragraphStyle: {
          namedStyleType: 'HEADING_1',
        },
        fields: 'namedStyleType',
      },
    });

    let currentIndex = 1 + titleText.length;

    // Recording info
    const infoHeadingText = 'Aufnahme-Informationen\n';
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: infoHeadingText,
      },
    });

    requests.push({
      updateParagraphStyle: {
        range: {
          startIndex: currentIndex,
          endIndex: currentIndex + infoHeadingText.length - 1, // Exclude newline
        },
        paragraphStyle: {
          namedStyleType: 'HEADING_2',
        },
        fields: 'namedStyleType',
      },
    });

    currentIndex += infoHeadingText.length;

    const infoLines = [
      `Dateiname: ${recording.original_filename || recording.filename}`,
      `Erstellt am: ${new Date(recording.created_at).toLocaleString('de-DE')}`,
    ];

    if (recording.duration_ms) {
      const mins = Math.floor(recording.duration_ms / 60000);
      const secs = Math.floor((recording.duration_ms % 60000) / 1000);
      infoLines.push(`Dauer: ${mins}:${secs.toString().padStart(2, '0')}`);
    }

    infoLines.push(`Dateigröße: ${(recording.file_size / 1024 / 1024).toFixed(2)} MB`);

    for (const line of infoLines) {
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: line + '\n',
        },
      });
      currentIndex += line.length + 1;
    }

    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: '\n',
      },
    });
    currentIndex += 1;

    // Transcription
    if (transcription && transcription.text) {
      const transcriptionHeadingText = 'Transkription\n';
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: transcriptionHeadingText,
        },
      });

      requests.push({
        updateParagraphStyle: {
          range: {
            startIndex: currentIndex,
            endIndex: currentIndex + transcriptionHeadingText.length - 1, // Exclude newline
          },
          paragraphStyle: {
            namedStyleType: 'HEADING_2',
          },
          fields: 'namedStyleType',
        },
      });

      currentIndex += transcriptionHeadingText.length;

      const transcriptionContent = transcription.text + '\n\n';
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: transcriptionContent,
        },
      });

      currentIndex += transcriptionContent.length;
    }

    // Enrichments
    if (enrichments && enrichments.length > 0) {
      const enrichmentsHeadingText = 'Enrichments\n';
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: enrichmentsHeadingText,
        },
      });

      requests.push({
        updateParagraphStyle: {
          range: {
            startIndex: currentIndex,
            endIndex: currentIndex + enrichmentsHeadingText.length - 1, // Exclude newline
          },
          paragraphStyle: {
            namedStyleType: 'HEADING_2',
          },
          fields: 'namedStyleType',
        },
      });

      currentIndex += enrichmentsHeadingText.length;

      for (const enrichment of enrichments) {
        // Enrichment type heading
        const enrichmentTypeHeading = `${enrichment.type.toUpperCase()}\n`;
        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: enrichmentTypeHeading,
          },
        });

        requests.push({
          updateParagraphStyle: {
            range: {
              startIndex: currentIndex,
              endIndex: currentIndex + enrichmentTypeHeading.length - 1, // Exclude newline
            },
            paragraphStyle: {
              namedStyleType: 'HEADING_3',
            },
            fields: 'namedStyleType',
          },
        });

        currentIndex += enrichmentTypeHeading.length;

        // Parse markdown content with correct starting index
        const { requests: enrichmentRequests, finalIndex } = this.markdownToGoogleDocsRequests(
          enrichment.content,
          currentIndex
        );

        requests.push(...enrichmentRequests);
        currentIndex = finalIndex;

        // Add newline after enrichment
        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: '\n',
          },
        });
        currentIndex += 1;
      }
    }

    // Footer
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: `\nErstellt am ${new Date().toLocaleString('de-DE')} mit Voice Agent`,
      },
    });

    // Batch update document
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests,
      },
    });

    // Get document URL
    const documentUrl = `https://docs.google.com/document/d/${documentId}`;

    return {
      documentId,
      documentUrl,
      title: documentTitle,
    };
  }
}

module.exports = new GoogleDocsService();
