/**
 * Audio Chunking Utility
 * Splits large audio files into segments under Whisper's 25MB limit for parallel transcription.
 */

const path = require('path');
const fs = require('fs').promises;
const ffmpeg = require('fluent-ffmpeg');

const WHISPER_MAX_BYTES = 25 * 1024 * 1024; // 25 MB
/** Segment duration in seconds; ~10 min keeps typical bitrates well under 25MB */
const SEGMENT_DURATION_SEC = 600;

/**
 * Get audio duration in seconds using ffmpeg.
 * @param {string} filePath - Path to audio file
 * @returns {Promise<number>} - Duration in seconds
 */
function getAudioDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const duration = metadata?.format?.duration;
      if (typeof duration !== 'number' || duration <= 0) {
        return reject(new Error('Could not determine audio duration'));
      }
      resolve(duration);
    });
  });
}

/**
 * Extract one segment from an audio file.
 * @param {string} inputPath - Source file
 * @param {string} outputPath - Segment output path
 * @param {number} startSec - Start time in seconds
 * @param {number} durationSec - Segment length in seconds
 * @returns {Promise<void>}
 */
function extractSegment(inputPath, outputPath, startSec, durationSec) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .seekInput(startSec)
      .duration(durationSec)
      .outputOptions('-acodec copy')
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

/**
 * Split audio file into chunks under WHISPER_MAX_BYTES.
 * Uses fixed segment duration (SEGMENT_DURATION_SEC); each chunk is written as a valid audio file.
 * @param {string} filePath - Path to audio file
 * @param {string} tempDir - Directory for temporary chunk files (caller should create and clean up)
 * @returns {Promise<{ chunks: Array<{ path: string, index: number, startSec: number, durationSec: number }>, totalDuration: number }>}
 */
async function splitAudioIntoChunks(filePath, tempDir) {
  const stat = await fs.stat(filePath);
  const fileSizeBytes = stat.size;

  if (fileSizeBytes <= WHISPER_MAX_BYTES) {
    return { chunks: [{ path: filePath, index: 0, startSec: 0, durationSec: null }], totalDuration: null };
  }

  const totalDuration = await getAudioDuration(filePath);
  const basename = path.basename(filePath, path.extname(filePath));
  const ext = path.extname(filePath) || '.mp3';

  const chunks = [];
  let startSec = 0;
  let index = 0;

  while (startSec < totalDuration) {
    const durationSec = Math.min(SEGMENT_DURATION_SEC, totalDuration - startSec);
    const chunkPath = path.join(tempDir, `${basename}_chunk_${String(index).padStart(4, '0')}${ext}`);

    await extractSegment(filePath, chunkPath, startSec, durationSec);

    chunks.push({
      path: chunkPath,
      index,
      startSec,
      durationSec,
    });

    startSec += durationSec;
    index += 1;
  }

  return { chunks, totalDuration };
}

/**
 * Delete temporary chunk files (not the original).
 * @param {Array<{ path: string }>} chunks - Chunks from splitAudioIntoChunks
 * @param {string} originalPath - Original file path to never delete
 */
async function cleanupChunkFiles(chunks, originalPath) {
  const toDelete = chunks.filter((c) => c.path !== originalPath);
  await Promise.all(
    toDelete.map((c) => fs.unlink(c.path).catch((err) => { /* ignore missing */ }))
  );
}

module.exports = {
  WHISPER_MAX_BYTES,
  getAudioDuration,
  splitAudioIntoChunks,
  cleanupChunkFiles,
};
