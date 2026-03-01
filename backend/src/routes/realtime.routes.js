/**
 * Realtime Transcription Routes
 * WebSocket endpoint for live transcription
 */

const express = require('express');
const WebSocket = require('ws');
const realtimeService = require('../services/realtime.service');
const openaiService = require('../services/openai.service');

const router = express.Router();

// Store active WebSocket connections
const activeConnections = new Map();

function appendTokenWithSpacing(currentText, token) {
  if (!token) return currentText;

  if (!currentText) return token;

  // Avoid adding spaces before punctuation marks.
  if (/^[,.;:!?)]/.test(token)) {
    return `${currentText}${token}`;
  }

  return `${currentText} ${token}`;
}

function extractSpeakerSegments(words = []) {
  if (!Array.isArray(words) || words.length === 0) {
    return [];
  }

  const segments = [];

  for (const entry of words) {
    const speaker = Number.isInteger(entry.speaker) ? entry.speaker : 0;
    const token = entry.punctuated_word || entry.word || '';
    if (!token) continue;

    const lastSegment = segments[segments.length - 1];
    if (!lastSegment || lastSegment.speaker !== speaker) {
      segments.push({ speaker, text: token });
      continue;
    }

    lastSegment.text = appendTokenWithSpacing(lastSegment.text, token);
  }

  return segments;
}

/** Minimum words to keep a speaker turn (merge shorter into neighbor). */
const MIN_WORDS_PER_TURN = 2;
/** Hysteresis: only accept speaker change if new speaker has at least this many words. */
const MIN_WORDS_FOR_SPEAKER_SWITCH = 4;

const wordCount = (s) => (s.text || '').trim().split(/\s+/).filter(Boolean).length;

/**
 * Speaker clustering cleanup with hysteresis:
 * - Merge consecutive same-speaker segments.
 * - Require MIN_WORDS_FOR_SPEAKER_SWITCH words before accepting a new speaker (reduces flip-flop).
 * - Merge very short segments into the dominant neighbor.
 * @param {Array<{ speaker: number; text: string }>} segments
 * @returns {Array<{ speaker: number; text: string }>}
 */
function speakerClusteringCleanup(segments) {
  if (!Array.isArray(segments) || segments.length === 0) return segments;

  const merged = [];
  for (const seg of segments) {
    const text = (seg.text || '').trim();
    if (!text) continue;
    const last = merged[merged.length - 1];
    if (last && last.speaker === seg.speaker) {
      last.text = appendTokenWithSpacing(last.text, text);
      continue;
    }
    merged.push({ speaker: seg.speaker, text });
  }

  if (merged.length === 0) return merged;

  // Hysteresis: short segments that would switch speaker get merged into previous turn
  const afterHysteresis = [];
  for (let i = 0; i < merged.length; i++) {
    const curr = merged[i];
    const words = wordCount(curr);
    const prev = afterHysteresis[afterHysteresis.length - 1];
    const isSpeakerChange = prev && prev.speaker !== curr.speaker;
    if (isSpeakerChange && words < MIN_WORDS_FOR_SPEAKER_SWITCH) {
      prev.text = appendTokenWithSpacing(prev.text, curr.text);
      continue;
    }
    if (prev && prev.speaker === curr.speaker) {
      prev.text = appendTokenWithSpacing(prev.text, curr.text);
      continue;
    }
    afterHysteresis.push({ ...curr });
  }

  if (afterHysteresis.length < 3) return afterHysteresis;

  // Merge very short "island" segments into dominant neighbor
  const smoothed = [];
  for (let i = 0; i < afterHysteresis.length; i++) {
    const curr = afterHysteresis[i];
    const words = wordCount(curr);
    const prev = afterHysteresis[i - 1];
    const next = afterHysteresis[i + 1];
    if (words <= MIN_WORDS_PER_TURN && prev && next && prev.speaker === next.speaker && prev.speaker !== curr.speaker) {
      const last = smoothed[smoothed.length - 1];
      if (last && last.speaker === prev.speaker) {
        last.text = appendTokenWithSpacing(last.text, curr.text);
      } else {
        smoothed.push({ speaker: prev.speaker, text: appendTokenWithSpacing(prev.text, curr.text) });
      }
      continue;
    }
    if (smoothed.length > 0 && smoothed[smoothed.length - 1].speaker === curr.speaker) {
      smoothed[smoothed.length - 1].text = appendTokenWithSpacing(smoothed[smoothed.length - 1].text, curr.text);
      continue;
    }
    smoothed.push({ ...curr });
  }
  return smoothed;
}

/**
 * Setup WebSocket server for live transcription
 */
function setupWebSocketServer(server) {
  const wss = new WebSocket.Server({ 
    server,
    path: '/api/v1/realtime/transcribe',
  });

  wss.on('connection', (clientWs, req) => {
    const connectionId = req.headers['x-connection-id'] || `conn_${Date.now()}`;
    let deepgramWs = null;
    let language = 'de';
    let model = 'nova-2';

    console.log(`[Realtime] New client connection: ${connectionId}`);

    // Parse language, model, and sample rate from query string
    const url = new URL(req.url, `http://${req.headers.host}`);
    language = url.searchParams.get('language') || 'de';
    model = url.searchParams.get('model') || realtimeService.defaultModel;
    const sampleRate = url.searchParams.get('sample_rate') || null;

    // Check if Deepgram is configured
    if (!realtimeService.isConfigured()) {
      clientWs.send(JSON.stringify({
        type: 'error',
        error: 'Deepgram API key is not configured',
      }));
      clientWs.close();
      return;
    }

    try {
      // Create connection to Deepgram Realtime API (pass sample_rate so it matches client audio)
      deepgramWs = realtimeService.createConnection(language, model, sampleRate || undefined);

      deepgramWs.on('open', () => {
        console.log(`[Realtime] Deepgram connection established for ${connectionId}`);
        clientWs.send(JSON.stringify({
          type: 'ready',
          connectionId,
          model,
          language,
        }));
      });

      deepgramWs.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());

          if (message.type === 'Metadata') {
            console.log(`[Realtime] Metadata received for ${connectionId}`);
            clientWs.send(JSON.stringify({
              type: 'session.ready',
            }));
            return;
          }

          if (message.type === 'UtteranceEnd') {
            clientWs.send(JSON.stringify({
              type: 'transcription.utterance_end',
            }));
            return;
          }

          if (message.type === 'Results') {
            const alternative = message.channel?.alternatives?.[0];
            const transcript = (alternative?.transcript || '').trim();

            if (!transcript) {
              return;
            }

            const rawSegments = extractSpeakerSegments(alternative?.words || []);
            const speakerSegments = message.is_final
              ? speakerClusteringCleanup(rawSegments)
              : rawSegments;
            const payload = {
              text: transcript,
              speakerSegments,
              isFinal: !!message.is_final,
            };

            if (message.is_final) {
              clientWs.send(JSON.stringify({
                type: 'transcription.completed',
                ...payload,
              }));
              return;
            }

            clientWs.send(JSON.stringify({
              type: 'transcription.delta',
              ...payload,
            }));
          } else if (message.type === 'Error') {
            console.error(`[Realtime] Deepgram error for ${connectionId}:`, message);
            clientWs.send(JSON.stringify({
              type: 'error',
              error: message.description || 'Deepgram API error',
            }));
          }
        } catch (err) {
          console.error(`[Realtime] Error parsing Deepgram message:`, err);
        }
      });

      deepgramWs.on('error', (error) => {
        console.error(`[Realtime] Deepgram WebSocket error for ${connectionId}:`, error);
        clientWs.send(JSON.stringify({
          type: 'error',
          error: error.message || 'Deepgram connection error',
        }));
      });

      deepgramWs.on('close', () => {
        console.log(`[Realtime] Deepgram connection closed for ${connectionId}`);
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.close();
        }
      });

      // Handle messages from client
      clientWs.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());

          if (message.type === 'audio') {
            // Convert base64 audio to buffer and send to Deepgram
            if (deepgramWs && deepgramWs.readyState === WebSocket.OPEN) {
              const audioBuffer = Buffer.from(message.data, 'base64');
              realtimeService.sendAudio(deepgramWs, audioBuffer);
            }
          } else if (message.type === 'commit') {
            // Ask Deepgram to flush an utterance
            if (deepgramWs && deepgramWs.readyState === WebSocket.OPEN) {
              realtimeService.finalizeAudio(deepgramWs);
            }
          } else if (message.type === 'close') {
            // Close connection
            if (deepgramWs) {
              realtimeService.finalizeAudio(deepgramWs);
              realtimeService.closeConnection(deepgramWs);
            }
            clientWs.close();
          }
        } catch (err) {
          console.error(`[Realtime] Error handling client message:`, err);
          clientWs.send(JSON.stringify({
            type: 'error',
            error: err.message || 'Error processing message',
          }));
        }
      });

      clientWs.on('close', () => {
        console.log(`[Realtime] Client connection closed: ${connectionId}`);
        if (deepgramWs) {
          realtimeService.finalizeAudio(deepgramWs);
          realtimeService.closeConnection(deepgramWs);
        }
        activeConnections.delete(connectionId);
      });

      clientWs.on('error', (error) => {
        console.error(`[Realtime] Client WebSocket error for ${connectionId}:`, error);
        if (deepgramWs) {
          realtimeService.closeConnection(deepgramWs);
        }
        activeConnections.delete(connectionId);
      });

      activeConnections.set(connectionId, { clientWs, deepgramWs });
    } catch (error) {
      console.error(`[Realtime] Error setting up connection for ${connectionId}:`, error);
      clientWs.send(JSON.stringify({
        type: 'error',
        error: error.message || 'Failed to establish connection',
      }));
      clientWs.close();
    }
  });

  wss.on('error', (error) => {
    console.error('[Realtime] WebSocket server error:', error);
  });

  return wss;
}

/**
 * POST /api/v1/realtime/name-speakers
 * Pipeline: diarized segments → speaker clustering cleanup → LLM → named speakers
 * Body: { segments: [{ speaker: number, text: string }], language?: string }
 */
router.post('/name-speakers', async (req, res) => {
  try {
    const { segments = [], language = 'de' } = req.body;

    if (!Array.isArray(segments) || segments.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'segments array is required' },
      });
    }

    if (!openaiService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: { code: 'SERVICE_UNAVAILABLE', message: 'OpenAI API key is not configured' },
      });
    }

    const cleaned = speakerClusteringCleanup(segments.map((s) => ({
      speaker: Number(s.speaker) || 0,
      text: typeof s.text === 'string' ? s.text : '',
    })));
    const result = await openaiService.nameSpeakersFromTranscript(cleaned, { language });

    return res.json({
      success: true,
      data: {
        segments: result.segments,
        usage: result.usage,
      },
    });
  } catch (err) {
    console.error('[Realtime] name-speakers error:', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message || 'Named speakers failed',
      },
    });
  }
});

/**
 * POST /api/v1/realtime/translate
 * Stream translation of text to target language
 */
router.post('/translate', async (req, res) => {
  try {
    const { text, targetLanguage = 'de' } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Text is required',
        },
      });
    }

    // Set up streaming response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const systemPrompt = `Du bist ein professioneller Übersetzer.
Übersetze den folgenden Text ins Deutsche.
Behalte den Ton und die Bedeutung bei.
Antworte nur mit der Übersetzung, ohne zusätzliche Erklärungen.`;

    try {
      // Use OpenAI streaming API for translation
      const completion = await openaiService.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        stream: true,
      });

      // Stream the response
      for await (const chunk of completion) {
        const data = JSON.stringify(chunk);
        res.write(`data: ${data}\n\n`);
      }

      // Send done signal
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      console.error('[Realtime] Translation error:', error);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  } catch (error) {
    console.error('[Realtime] Translation route error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Translation failed',
      },
    });
  }
});

module.exports = { router, setupWebSocketServer };
