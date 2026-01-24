/**
 * RAG Service
 * Retrieval-Augmented Generation for intelligent Q&A over transcriptions
 */

const embeddingService = require('./embedding.service');
const openaiService = require('./openai.service');
const transcriptionModel = require('../models/transcription.model');
const enrichmentModel = require('../models/enrichment.model');
const logger = require('../utils/logger.util');

// RAG configuration
const DEFAULT_TOP_K = 5;
const DEFAULT_MIN_SIMILARITY = 0.0; // No minimum threshold - use top-K only

class RAGService {
  /**
   * Answer a question using RAG
   * @param {string} question - User's question
   * @param {Object} options - RAG options
   * @param {Array} options.history - Chat history [{role: 'user'|'assistant', content: string}]
   * @returns {Promise<Object>} - Answer with sources
   */
  async answerQuestion(question, options = {}) {
    const {
      topK = DEFAULT_TOP_K,
      minSimilarity = DEFAULT_MIN_SIMILARITY,
      sourceTypes = ['transcription', 'enrichment'],
      language = 'de',
      history = [],
    } = options;

    // 1. Retrieve relevant context via semantic search
    const relevantDocs = await embeddingService.search(question, {
      limit: topK,
      minSimilarity,
      sourceTypes,
    });

    if (relevantDocs.length === 0) {
      return {
        answer: language === 'de' 
          ? 'Ich konnte keine relevanten Informationen in den Aufnahmen finden.'
          : 'I could not find relevant information in the recordings.',
        sources: [],
        hasContext: false,
      };
    }

    // 2. Build context from retrieved documents
    const context = this.buildContext(relevantDocs);

    // 3. Generate answer using GPT with chat history
    const systemPrompt = this.buildSystemPrompt(language);
    const userPrompt = this.buildUserPrompt(question, context, language);

    const completion = await openaiService.generateCompletion(
      systemPrompt,
      userPrompt,
      {
        model: 'gpt-4o-mini',
        temperature: 0.3, // Lower temperature for more factual responses
        maxTokens: 1500,
        history, // Pass chat history for conversation context
      }
    );

    // 4. Format sources for response
    const sources = this.formatSources(relevantDocs);

    return {
      answer: completion.content,
      sources,
      hasContext: true,
      usage: completion.usage,
      relevantChunks: relevantDocs.length,
    };
  }

  /**
   * Build context string from relevant documents
   * @param {Array} docs - Retrieved documents
   * @returns {string}
   */
  buildContext(docs) {
    const contextParts = docs.map((doc, index) => {
      const date = doc.recording_created_at 
        ? new Date(doc.recording_created_at).toLocaleDateString('de-DE')
        : 'Unbekannt';
      
      const filename = doc.recording_filename || 'Unbekannte Aufnahme';
      const sourceType = doc.source_type === 'transcription' ? 'Transkription' : 'Anreicherung';
      
      return `[Quelle ${index + 1}]
Datei: ${filename}
Datum: ${date}
Typ: ${sourceType}
Relevanz: ${(doc.similarity * 100).toFixed(1)}%

Inhalt:
${doc.content}
---`;
    });

    return contextParts.join('\n\n');
  }

  /**
   * Build system prompt for RAG
   * @param {string} language - Response language
   * @returns {string}
   */
  buildSystemPrompt(language) {
    if (language === 'de') {
      return `Du bist ein hilfreicher Assistent, der Fragen über Sprachaufnahmen und Transkriptionen beantwortet.

Wichtige Regeln:
1. Antworte NUR basierend auf den bereitgestellten Kontextinformationen.
2. Wenn die Antwort nicht im Kontext zu finden ist, sage das ehrlich.
3. Fasse Informationen aus mehreren Quellen zusammen, wenn relevant.
4. Antworte präzise und hilfreich auf Deutsch.
5. Verwende KEINE Quellen-Referenzen wie [Quelle X] in deiner Antwort.
6. Verwende Markdown-Formatierung für bessere Lesbarkeit:
   - **Fett** für wichtige Begriffe und Überschriften
   - *Kursiv* für Betonungen
   - Listen mit - oder * für Aufzählungen
   - ## für Überschriften bei längeren Antworten
   - Code-Blöcke mit \`\`\` für technische Details
7. Strukturiere längere Antworten mit Überschriften und Absätzen.
8. Bei Aufzählungen nutze Markdown-Listen für bessere Lesbarkeit.`;
    }

    return `You are a helpful assistant that answers questions about voice recordings and transcriptions.

Important rules:
1. Answer ONLY based on the provided context information.
2. If the answer cannot be found in the context, say so honestly.
3. Combine information from multiple sources when relevant.
4. Answer precisely and helpfully in English.
5. Do NOT use source references like [Source X] in your answer.
6. Use Markdown formatting for better readability:
   - **Bold** for important terms and headings
   - *Italic* for emphasis
   - Lists with - or * for enumerations
   - ## for headings in longer answers
   - Code blocks with \`\`\` for technical details
7. Structure longer answers with headings and paragraphs.
8. Use Markdown lists for better readability.`;
  }

  /**
   * Build user prompt with question and context
   * @param {string} question - User's question
   * @param {string} context - Retrieved context
   * @param {string} language - Response language
   * @returns {string}
   */
  buildUserPrompt(question, context, language) {
    if (language === 'de') {
      return `Kontext aus meinen Aufnahmen:

${context}

Frage: ${question}

Bitte beantworte die Frage basierend auf dem obigen Kontext.`;
    }

    return `Context from my recordings:

${context}

Question: ${question}

Please answer the question based on the context above.`;
  }

  /**
   * Format sources for API response
   * @param {Array} docs - Retrieved documents
   * @returns {Array}
   */
  formatSources(docs) {
    // Group by recording to avoid duplicates
    const sourceMap = new Map();

    docs.forEach(doc => {
      const recordingId = doc.recording_id;
      if (!recordingId) return;

      if (!sourceMap.has(recordingId)) {
        sourceMap.set(recordingId, {
          recordingId,
          transcriptionId: doc.transcription_id,
          filename: doc.recording_filename,
          date: doc.recording_created_at,
          chunks: [],
          maxSimilarity: doc.similarity,
        });
      }

      const source = sourceMap.get(recordingId);
      source.chunks.push({
        content: doc.content.substring(0, 200) + (doc.content.length > 200 ? '...' : ''),
        similarity: doc.similarity,
        type: doc.source_type,
      });
      source.maxSimilarity = Math.max(source.maxSimilarity, doc.similarity);
    });

    return Array.from(sourceMap.values())
      .sort((a, b) => b.maxSimilarity - a.maxSimilarity);
  }

  /**
   * Get chat history context (for multi-turn conversations)
   * @param {Array} history - Previous messages
   * @returns {string}
   */
  formatChatHistory(history) {
    if (!history || history.length === 0) return '';

    return history.map(msg => {
      const role = msg.role === 'user' ? 'Benutzer' : 'Assistent';
      return `${role}: ${msg.content}`;
    }).join('\n\n');
  }

  /**
   * Multi-turn conversation with context
   * @param {string} question - Current question
   * @param {Array} history - Previous messages [{role, content}]
   * @param {Object} options - RAG options
   * @returns {Promise<Object>}
   */
  async chat(question, history = [], options = {}) {
    // Use chat history as conversation context
    // The history will be passed to GPT so it can reference previous messages
    return this.answerQuestion(question, {
      ...options,
      history, // Pass full chat history for conversation context
    });
  }

  /**
   * Check if question is a follow-up
   * @param {string} question - Question text
   * @returns {boolean}
   */
  isFollowUpQuestion(question) {
    const followUpIndicators = [
      'das', 'dies', 'diese', 'dieser', 'davon', 'dazu',
      'mehr', 'weitere', 'genauer', 'detail',
      'was noch', 'und', 'aber',
      'this', 'that', 'those', 'it', 'them',
      'more', 'also', 'and what about',
    ];

    const lowerQuestion = question.toLowerCase();
    return followUpIndicators.some(indicator => lowerQuestion.includes(indicator));
  }

  /**
   * Embed all existing transcriptions (for initial setup)
   * @returns {Promise<Object>} - Statistics
   */
  async embedAllTranscriptions() {
    const transcriptions = await transcriptionModel.findAll();
    
    let embedded = 0;
    let skipped = 0;
    let errors = 0;

    for (const transcription of transcriptions) {
      try {
        const hasEmbedding = await embeddingService.hasEmbeddings('transcription', transcription.id);
        
        if (hasEmbedding) {
          skipped++;
          continue;
        }

        await embeddingService.embedTranscription(transcription.id, transcription.text);
        embedded++;
      } catch (error) {
        logger.error(`Error embedding transcription ${transcription.id}`, error);
        errors++;
      }
    }

    return { embedded, skipped, errors, total: transcriptions.length };
  }

  /**
   * Embed all existing enrichments (for initial setup)
   * @returns {Promise<Object>} - Statistics
   */
  async embedAllEnrichments() {
    const enrichments = await enrichmentModel.findAll();
    
    let embedded = 0;
    let skipped = 0;
    let errors = 0;

    for (const enrichment of enrichments) {
      try {
        const hasEmbedding = await embeddingService.hasEmbeddings('enrichment', enrichment.id);
        
        if (hasEmbedding) {
          skipped++;
          continue;
        }

        await embeddingService.embedEnrichment(enrichment.id, enrichment.content);
        embedded++;
      } catch (error) {
        logger.error(`Error embedding enrichment ${enrichment.id}`, error);
        errors++;
      }
    }

    return { embedded, skipped, errors, total: enrichments.length };
  }

  /**
   * Embed all existing data (transcriptions + enrichments)
   * @returns {Promise<Object>}
   */
  async embedAll() {
    logger.info('Starting full embedding process...');
    
    const transcriptionStats = await this.embedAllTranscriptions();
    logger.info('Transcription embedding complete', transcriptionStats);
    
    const enrichmentStats = await this.embedAllEnrichments();
    logger.info('Enrichment embedding complete', enrichmentStats);

    return {
      transcriptions: transcriptionStats,
      enrichments: enrichmentStats,
    };
  }

  /**
   * Find similar recordings to a given transcription
   * @param {string} transcriptionId - Transcription UUID
   * @param {number} limit - Number of results
   * @returns {Promise<Array>}
   */
  async findSimilarRecordings(transcriptionId, limit = 5) {
    const transcription = await transcriptionModel.findById(transcriptionId);
    
    if (!transcription) {
      throw new Error('Transcription not found');
    }

    // Search for similar content, excluding the current transcription
    const results = await embeddingService.search(transcription.text, {
      limit: limit + 5, // Get more to filter out self
      minSimilarity: 0.6,
    });

    // Filter out chunks from the same transcription
    return results
      .filter(r => r.transcription_id !== transcriptionId)
      .slice(0, limit);
  }
}

module.exports = new RAGService();
