/**
 * AudioWorklet processor for live transcription.
 * Converts Float32 mic input to PCM16 and sends to main thread in chunks.
 * Runs on audio thread for stable timing and no main-thread blocking.
 */
const SEND_FRAME_SIZE = 4096;

class LiveAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(SEND_FRAME_SIZE);
    this.index = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input.length) return true;
    const channel = input[0];
    if (!channel) return true;

    for (let i = 0; i < channel.length; i++) {
      this.buffer[this.index++] = channel[i];
      if (this.index >= SEND_FRAME_SIZE) {
        const pcm16 = new Int16Array(SEND_FRAME_SIZE);
        for (let j = 0; j < SEND_FRAME_SIZE; j++) {
          const s = Math.max(-1, Math.min(1, this.buffer[j]));
          pcm16[j] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        this.port.postMessage({ type: 'pcm', data: pcm16.buffer }, [pcm16.buffer]);
        this.index = 0;
      }
    }
    return true;
  }
}

registerProcessor('live-audio-processor', LiveAudioProcessor);
