/**
 * OpenAI Service
 * Handles all OpenAI API interactions (Whisper & GPT)
 */

const OpenAI = require('openai');
const fs = require('fs');
const { env } = require('../config/env');

class OpenAIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  /**
   * Transcribe audio file using Whisper API
   * @param {string} filePath - Path to audio file
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} - Transcription result
   */
  async transcribeAudio(filePath, options = {}) {
    const {
      language = 'de',
      prompt,
      responseFormat = 'verbose_json',
    } = options;

    try {
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
        text: transcription.text,
        language: transcription.language || language,
        duration: transcription.duration,
        segments: transcription.segments || [],
        words: transcription.words || [],
      };
    } catch (error) {
      console.error('OpenAI Whisper Error:', error.message);
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
      console.error('OpenAI GPT Error:', error.message);
      throw new Error(`Completion failed: ${error.message}`);
    }
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
