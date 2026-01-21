/**
 * Enrichment Service
 * Business logic for AI-powered content enrichment using GPT-4o-mini
 */

const enrichmentModel = require('../models/enrichment.model');
const transcriptionModel = require('../models/transcription.model');
const openaiService = require('./openai.service');

class EnrichmentService {
  /**
   * Predefined prompts for different enrichment types
   */
  static PROMPTS = {
    complete: {
      system: `Du bist ein professioneller Assistent für Textverarbeitung und Dokumentation.
Analysiere den folgenden transkribierten Text und erstelle eine vollständige, gut strukturierte Aufbereitung im Markdown-Format.

Deine Ausgabe MUSS folgende Abschnitte enthalten (in dieser Reihenfolge):

## Zusammenfassung
Eine kurze, prägnante Zusammenfassung des Inhalts (2-4 Sätze).

## Kernpunkte
Die wichtigsten Erkenntnisse und Hauptaussagen als nummerierte Liste.

## Aufgaben / To-Dos
Alle erwähnten oder abgeleiteten Aufgaben als Checkliste mit [ ]. Falls keine Aufgaben erkennbar sind, schreibe "Keine konkreten Aufgaben erkannt."

## Notizen & Anmerkungen
Weitere relevante Details, Kontext oder Anmerkungen in strukturierter Form mit Aufzählungspunkten.

WICHTIG: Verwende KEINE Emojis in der Ausgabe. Nutze nur reines Markdown mit Überschriften, Listen und Formatierung.
Formatiere alles sauber in Markdown. Korrigiere offensichtliche Sprachfehler, aber verändere den Inhalt nicht.
Antworte auf Deutsch.`,
      maxTokens: 3000,
    },
    summary: {
      system: `Du bist ein Assistent, der präzise Zusammenfassungen erstellt. 
Fasse den folgenden transkribierten Text kurz und prägnant zusammen. 
Behalte die wichtigsten Punkte bei und formuliere klar und verständlich.
Antworte auf Deutsch.`,
      maxTokens: 500,
    },
    formatted: {
      system: `Du bist ein Assistent für Textformatierung.
Formatiere den folgenden transkribierten Text in eine gut strukturierte, lesbare Form.
Füge Absätze, Satzzeichen und Struktur hinzu, wo nötig.
Korrigiere offensichtliche Sprachfehler, aber verändere den Inhalt nicht.
Antworte auf Deutsch.`,
      maxTokens: 2000,
    },
    notes: {
      system: `Du bist ein Assistent für Notizen.
Wandle den folgenden transkribierten Text in strukturierte Notizen um.
Verwende Aufzählungspunkte und klare Überschriften.
Organisiere die Informationen logisch.
Antworte auf Deutsch.`,
      maxTokens: 1500,
    },
    action_items: {
      system: `Du bist ein Assistent für Aufgabenextraktion.
Extrahiere alle Aufgaben, To-Dos und Action Items aus dem folgenden Text.
Liste sie klar und präzise auf.
Wenn keine Aufgaben erkennbar sind, gib das an.
Antworte auf Deutsch.`,
      maxTokens: 800,
    },
    key_points: {
      system: `Du bist ein Assistent für Kernpunkt-Extraktion.
Extrahiere die wichtigsten Kernpunkte und Erkenntnisse aus dem folgenden Text.
Präsentiere sie als nummerierte Liste.
Antworte auf Deutsch.`,
      maxTokens: 1000,
    },
    translation: {
      system: (targetLanguage = 'en') => {
        const languageNames = {
          en: 'Englische',
          es: 'Spanische',
          fr: 'Französische',
          it: 'Italienische',
          pt: 'Portugiesische',
          nl: 'Niederländische',
          pl: 'Polnische',
          ru: 'Russische',
          ja: 'Japanische',
          zh: 'Chinesische',
          ko: 'Koreanische',
          ar: 'Arabische',
          tr: 'Türkische',
          sv: 'Schwedische',
          da: 'Dänische',
          no: 'Norwegische',
          fi: 'Finnische',
          cs: 'Tschechische',
          hu: 'Ungarische',
          ro: 'Rumänische',
        };
        const langName = languageNames[targetLanguage] || 'Englische';
        return `Du bist ein professioneller Übersetzer.
Übersetze den folgenden Text ins ${langName}.
Behalte den Ton und die Bedeutung bei.
Antworte nur mit der Übersetzung, ohne zusätzliche Erklärungen.`;
      },
      maxTokens: 2000,
    },
  };

  /**
   * Enrich a transcription with AI processing
   * @param {string} transcriptionId - Transcription UUID
   * @param {string} type - Enrichment type
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Enrichment result
   */
  async enrichTranscription(transcriptionId, type, options = {}) {
    // Validate enrichment type
    const validTypes = Object.keys(EnrichmentService.PROMPTS);
    if (!validTypes.includes(type) && type !== 'custom') {
      throw new Error(`Invalid enrichment type. Valid types: ${validTypes.join(', ')}, custom`);
    }

    // Get transcription
    const transcription = await transcriptionModel.findById(transcriptionId);
    
    if (!transcription) {
      throw new Error('Transcription not found');
    }

    if (!transcription.text || transcription.text.trim().length === 0) {
      throw new Error('Transcription has no text to enrich');
    }

    // Check if OpenAI is configured
    if (!openaiService.isConfigured()) {
      throw new Error('OpenAI API key is not configured');
    }

    // Determine prompt configuration
    let systemPrompt, maxTokens;
    
    if (type === 'custom') {
      if (!options.customPrompt) {
        throw new Error('Custom prompt is required for custom enrichment type');
      }
      systemPrompt = options.customPrompt;
      maxTokens = options.maxTokens || 1500;
    } else {
      const promptConfig = EnrichmentService.PROMPTS[type];
      // Handle translation with target language
      if (type === 'translation' && typeof promptConfig.system === 'function') {
        systemPrompt = promptConfig.system(options.targetLanguage || 'en');
      } else {
        systemPrompt = promptConfig.system;
      }
      maxTokens = promptConfig.maxTokens;
    }

    // Generate enrichment using GPT-4o-mini
    const result = await openaiService.generateCompletion(
      systemPrompt,
      transcription.text,
      {
        model: 'gpt-4o-mini',
        maxTokens,
        temperature: options.temperature || 0.7,
      }
    );

    // Save enrichment to database
    const enrichment = await enrichmentModel.createEnrichment({
      transcriptionId,
      type,
      content: result.content,
      promptUsed: systemPrompt,
      modelUsed: 'gpt-4o-mini',
      tokensUsed: result.usage.totalTokens,
    });

    return {
      enrichment,
      usage: result.usage,
    };
  }

  /**
   * Get all enrichments for a transcription
   * @param {string} transcriptionId - Transcription UUID
   * @returns {Promise<Array>}
   */
  async getEnrichmentsByTranscriptionId(transcriptionId) {
    return enrichmentModel.findByTranscriptionId(transcriptionId);
  }

  /**
   * Get all enrichments
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getAllEnrichments(options = {}) {
    return enrichmentModel.findAllWithTranscriptions(options);
  }

  /**
   * Get enrichment by ID
   * @param {string} id - Enrichment UUID
   * @returns {Promise<Object|null>}
   */
  async getEnrichmentById(id) {
    return enrichmentModel.findById(id);
  }

  /**
   * Delete enrichment
   * @param {string} id - Enrichment UUID
   * @returns {Promise<boolean>}
   */
  async deleteEnrichment(id) {
    return enrichmentModel.delete(id);
  }

  /**
   * Delete all enrichments for a transcription
   * @param {string} transcriptionId - Transcription UUID
   * @returns {Promise<number>}
   */
  async deleteEnrichmentsByTranscriptionId(transcriptionId) {
    return enrichmentModel.deleteByTranscriptionId(transcriptionId);
  }

  /**
   * Get available enrichment types
   * @returns {Array<string>}
   */
  getAvailableTypes() {
    return [...Object.keys(EnrichmentService.PROMPTS), 'custom'];
  }

  /**
   * Get enrichment statistics
   * @returns {Promise<Object>}
   */
  async getStats() {
    return enrichmentModel.getStats();
  }
}

module.exports = new EnrichmentService();
