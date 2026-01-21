/**
 * Recording Routes
 * API endpoints for audio recordings
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const recordingController = require('../controllers/recording.controller');

const router = express.Router();

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/temp'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  // Accept audio files
  const allowedMimes = [
    'audio/wav',
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/webm',
    'audio/ogg',
    'audio/flac',
    'audio/x-m4a',
    'audio/m4a',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only audio files are allowed.`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit (Whisper API limit)
  },
});

/**
 * @route   GET /api/v1/recordings/stats
 * @desc    Get recording statistics
 * @access  Public
 */
router.get('/stats', recordingController.getStats.bind(recordingController));

/**
 * @route   GET /api/v1/recordings
 * @desc    Get all recordings
 * @access  Public
 */
router.get('/', recordingController.getAll.bind(recordingController));

/**
 * @route   GET /api/v1/recordings/:id
 * @desc    Get recording by ID
 * @access  Public
 */
router.get('/:id', recordingController.getById.bind(recordingController));

/**
 * @route   POST /api/v1/recordings
 * @desc    Upload new audio recording
 * @access  Public
 */
router.post('/', upload.single('audio'), recordingController.create.bind(recordingController));

/**
 * @route   POST /api/v1/recordings/:id/transcribe
 * @desc    Transcribe a recording using Whisper
 * @access  Public
 */
router.post('/:id/transcribe', recordingController.transcribe.bind(recordingController));

/**
 * @route   DELETE /api/v1/recordings/:id
 * @desc    Delete a recording
 * @access  Public
 */
router.delete('/:id', recordingController.delete.bind(recordingController));

module.exports = router;
