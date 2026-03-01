/**
 * OpenAI Service
 * Handles all OpenAI API interactions (Whisper & GPT)
 */

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { env } = require('../config/env');
const logger = require('../utils/logger.util');
const {
  WHISPER_MAX_BYTES,
  splitAudioIntoChunks,
  cleanupChunkFiles,
} = require('../utils/audioChunks.util');

class OpenAIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  /**
   * Transcribe a single audio file (must be under Whisper 25MB limit).
   * @param {string} filePath - Path to audio file
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} - Transcription result
   */
  async transcribeSingleFile(filePath, options = {}) {
    const {
      language = 'de',
      prompt,
      responseFormat = 'verbose_json',
    } = options;

    const audioFile = fs.createReadStream(filePath);

    const transcription = await this.client.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language,
      response_format: responseFormat,
      ...(prompt && { prompt }),
    });

    return {
      success: true,
      text: transcription.text || '',
      language: transcription.language || language,
      duration: transcription.duration,
      segments: transcription.segments || [],
      words: transcription.words || [],
    };
  }

  /**
   * Transcribe audio file using Whisper API.
   * If file exceeds 25MB, splits into chunks, transcribes in parallel, then merges text.
   * @param {string} filePath - Path to audio file
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} - Transcription result
   */
  async transcribeAudio(filePath, options = {}) {
    try {
      const stat = fs.statSync(filePath);
      const fileSizeBytes = stat.size;

      if (fileSizeBytes <= WHISPER_MAX_BYTES) {
        return this.transcribeSingleFile(filePath, options);
      }

      // Large file: chunk, transcribe in parallel, merge
      const tempBase = path.join(env.UPLOADS_DIR, 'temp');
      const chunkDir = path.join(tempBase, `transcribe_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`);
      await fs.promises.mkdir(chunkDir, { recursive: true });

      let chunks;
      try {
        const result = await splitAudioIntoChunks(filePath, chunkDir);
        chunks = result.chunks;
        const totalDuration = result.totalDuration;

        if (chunks.length === 1 && chunks[0].path === filePath) {
          return this.transcribeSingleFile(filePath, options);
        }

        // Transcribe all chunks in parallel
        const { language = 'de', prompt } = options;
        const transcriptions = await Promise.all(
          chunks.map((chunk) =>
            this.transcribeSingleFile(chunk.path, { language, prompt, responseFormat: 'json' })
          )
        );

        // Sort by chunk index and merge text
        const sorted = transcriptions
          .map((t, i) => ({ ...t, index: chunks[i].index }))
          .sort((a, b) => a.index - b.index);

        const mergedText = sorted
          .map((t) => (t.text || '').trim())
          .filter(Boolean)
          .join(' ');

        const duration = totalDuration ?? sorted.reduce((sum, t) => sum + (t.duration || 0), 0);
        const firstLanguage = sorted[0]?.language || language;

        return {
          success: true,
          text: mergedText.trim(),
          language: firstLanguage,
          duration,
          segments: sorted.flatMap((t) => t.segments || []),
          words: sorted.flatMap((t) => t.words || []),
        };
      } finally {
        if (chunks && chunks.length > 1) {
          await cleanupChunkFiles(chunks, filePath);
        }
        await fs.promises.rm(chunkDir, { recursive: true, force: true }).catch(() => {});
      }
    } catch (error) {
      logger.error('OpenAI Whisper Error', error);
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  /**
   * Generate chat completion using GPT-4o-mini
   * @param {string} systemPrompt - System prompt
   * @param {string} userMessage - User message
   * @param {Object} options - Completion options
   * @param {Array} options.history - Chat history [{role: 'user'|'assistant', content: string}]
   * @returns {Promise<Object>} - Completion result
   */
  async generateCompletion(systemPrompt, userMessage, options = {}) {
    const {
      model = 'gpt-4o-mini',
      temperature = 0.7,
      maxTokens = 2000,
      history = [],
    } = options;

    try {
      // Build messages array with system prompt, history, and current user message
      const messages = [
        { role: 'system', content: systemPrompt },
      ];

      // Add chat history (last 10 exchanges to avoid token limits)
      const recentHistory = history.slice(-20); // Last 20 messages (10 exchanges)
      recentHistory.forEach(msg => {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      });

      // Add current user message
      messages.push({ role: 'user', content: userMessage });

      const completion = await this.client.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      });

      const choice = completion.choices[0];
      
      return {
        success: true,
        content: choice.message.content,
        finishReason: choice.finish_reason,
        usage: {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens,
        },
      };
    } catch (error) {
      logger.error('OpenAI GPT Error', error);
      throw new Error(`Completion failed: ${error.message}`);
    }
  }

  /**
   * Named speakers: LLM assigns descriptive names to diarized segments (e.g. Interviewer, Bewerber).
   * Pipeline: Audio → Deepgram STT + diarization → speaker clustering → this step.
   * @param {Array<{ speaker: number; text: string }>} segments - Diarized segments from STT
   * @param {Object} options - { language?: string }
   * @returns {Promise<{ segments: Array<{ speaker: number; text: string; speakerName: string }>, usage?: Object }>}
   */
  async nameSpeakersFromTranscript(segments, options = {}) {
    const language = options.language || 'de';
    if (!Array.isArray(segments) || segments.length === 0) {
      return { segments: [] };
    }

    const transcript = segments
      .map((s) => `Sprecher ${s.speaker}: ${(s.text || '').trim()}`)
      .filter((line) => line.length > 10)
      .join('\n');

    if (!transcript.trim()) {
      return {
        segments: segments.map((s) => ({ ...s, speakerName: `Sprecher ${s.speaker + 1}` })),
      };
    }

    const systemPrompt = `Du bist ein Assistent für Meeting- und Gesprächsanalyse.
Deine Aufgabe: Ordne jedem Sprecher (0, 1, 2, ...) einen kurzen, beschreibenden Namen zu, der zur Rolle passt (z.B. "Interviewer", "Bewerber", "Moderator", "Teilnehmerin", "Kunde", "Support").
Antworte NUR mit einem JSON-Objekt in diesem exakten Format, ohne anderen Text:
{"speakerNames": {"0": "Name für Sprecher 0", "1": "Name für Sprecher 1", ...}}
Sprache der Bezeichnungen: ${language === 'de' ? 'Deutsch' : 'Englisch'}.`;

    const userMessage = `Transkript:\n${transcript}`;

    const result = await this.generateCompletion(systemPrompt, userMessage, {
      model: 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 500,
    });

    let speakerNames = {};
    try {
      const content = (result.content || '').trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        speakerNames = parsed.speakerNames || {};
      }
    } catch (e) {
      logger.warn('nameSpeakersFromTranscript: could not parse LLM response', e);
    }

    const segmentsWithNames = segments.map((s) => ({
      ...s,
      speakerName: speakerNames[String(s.speaker)] || `Sprecher ${s.speaker + 1}`,
    }));

    return {
      segments: segmentsWithNames,
      usage: result.usage,
    };
  }

  /**
   * Check if OpenAI API is configured
   * @returns {boolean}
   */
  isConfigured() {
    return !!env.OPENAI_API_KEY;
  }
}

module.exports = new OpenAIService();
