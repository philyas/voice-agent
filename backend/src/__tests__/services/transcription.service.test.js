// Mock database and knexfile BEFORE any imports
jest.mock('../../../knexfile', () => ({
  test: {
    client: 'postgresql',
    connection: {
      host: 'localhost',
      port: 5432,
      database: 'voice_agent_test',
      user: 'test',
      password: 'test',
    },
  },
  development: {
    client: 'postgresql',
    connection: {
      host: 'localhost',
      port: 5432,
      database: 'voice_agent_test',
      user: 'test',
      password: 'test',
    },
  },
}));

jest.mock('../../config/database', () => ({
  raw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  first: jest.fn().mockResolvedValue(null),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  del: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue([]),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  count: jest.fn().mockResolvedValue([{ count: '0' }]),
  destroy: jest.fn().mockResolvedValue(),
}));

// Mock dependencies
jest.mock('../../models/transcription.model');
jest.mock('../../models/recording.model');
jest.mock('../../services/openai.service');
jest.mock('../../services/embedding.service');

const transcriptionService = require('../../services/transcription.service');
const transcriptionModel = require('../../models/transcription.model');
const recordingModel = require('../../models/recording.model');
const openaiService = require('../../services/openai.service');
const embeddingService = require('../../services/embedding.service');

describe('TranscriptionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('transcribeRecording', () => {
    it('should transcribe a new recording', async () => {
      const recordingId = 'recording-123';
      const mockRecording = {
        id: recordingId,
        storage_path: '/uploads/test.mp3',
      };

      const mockTranscription = {
        id: 'transcription-123',
        recording_id: recordingId,
        text: 'Test transcription',
        language: 'de',
      };

      const mockOpenAIResult = {
        text: 'Test transcription',
        language: 'de',
        duration: 10.5,
      };

      recordingModel.findById.mockResolvedValue(mockRecording);
      transcriptionModel.findByRecordingId.mockResolvedValue(null);
      openaiService.isConfigured.mockReturnValue(true);
      openaiService.transcribeAudio.mockResolvedValue(mockOpenAIResult);
      transcriptionModel.createTranscription.mockResolvedValue(mockTranscription);
      recordingModel.update.mockResolvedValue({});
      embeddingService.isConfigured.mockReturnValue(true);
      embeddingService.embedTranscription.mockResolvedValue();

      const result = await transcriptionService.transcribeRecording(recordingId);

      expect(recordingModel.findById).toHaveBeenCalledWith(recordingId);
      expect(transcriptionModel.findByRecordingId).toHaveBeenCalledWith(recordingId);
      expect(openaiService.transcribeAudio).toHaveBeenCalledWith(
        mockRecording.storage_path,
        expect.objectContaining({ language: 'de' })
      );
      expect(transcriptionModel.createTranscription).toHaveBeenCalled();
      expect(result.isNew).toBe(true);
      expect(result.transcription).toEqual(mockTranscription);
    });

    it('should return existing transcription if already transcribed', async () => {
      const recordingId = 'recording-123';
      const mockRecording = {
        id: recordingId,
        storage_path: '/uploads/test.mp3',
      };

      const mockTranscription = {
        id: 'transcription-123',
        text: 'Existing transcription',
      };

      recordingModel.findById.mockResolvedValue(mockRecording);
      transcriptionModel.findByRecordingId.mockResolvedValue(mockTranscription);

      const result = await transcriptionService.transcribeRecording(recordingId);

      expect(result.isNew).toBe(false);
      expect(result.transcription).toEqual(mockTranscription);
      expect(openaiService.transcribeAudio).not.toHaveBeenCalled();
    });

    it('should throw error if recording not found', async () => {
      recordingModel.findById.mockResolvedValue(null);

      await expect(
        transcriptionService.transcribeRecording('invalid-id')
      ).rejects.toThrow('Recording not found');
    });

    it('should throw error if OpenAI not configured', async () => {
      const mockRecording = {
        id: 'recording-123',
        storage_path: '/uploads/test.mp3',
      };

      recordingModel.findById.mockResolvedValue(mockRecording);
      transcriptionModel.findByRecordingId.mockResolvedValue(null);
      openaiService.isConfigured.mockReturnValue(false);

      await expect(
        transcriptionService.transcribeRecording('recording-123')
      ).rejects.toThrow('OpenAI API key is not configured');
    });
  });

  describe('updateTranscriptionText', () => {
    it('should update transcription text and re-embed', async () => {
      const transcriptionId = 'transcription-123';
      const newText = 'Updated text';
      const mockUpdated = {
        id: transcriptionId,
        text: newText,
      };

      transcriptionModel.updateText.mockResolvedValue(mockUpdated);
      embeddingService.isConfigured.mockReturnValue(true);
      embeddingService.embedTranscription.mockResolvedValue();

      const result = await transcriptionService.updateTranscriptionText(
        transcriptionId,
        newText
      );

      expect(transcriptionModel.updateText).toHaveBeenCalledWith(
        transcriptionId,
        newText
      );
      expect(result).toEqual(mockUpdated);
    });
  });

  describe('getTranscriptionById', () => {
    it('should return transcription with enrichments', async () => {
      const mockTranscription = {
        id: 'transcription-123',
        text: 'Test',
        enrichments: [],
      };

      transcriptionModel.findWithEnrichments.mockResolvedValue(mockTranscription);

      const result = await transcriptionService.getTranscriptionById('transcription-123');

      expect(transcriptionModel.findWithEnrichments).toHaveBeenCalledWith('transcription-123');
      expect(result).toEqual(mockTranscription);
    });
  });
});
