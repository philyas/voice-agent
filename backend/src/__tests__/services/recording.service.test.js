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
jest.mock('../../models/recording.model');
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    rename: jest.fn(),
    unlink: jest.fn(),
  },
}));

const recordingService = require('../../services/recording.service');
const recordingModel = require('../../models/recording.model');
const fs = require('fs').promises;

describe('RecordingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createRecording', () => {
    it('should create a recording and save file', async () => {
      const mockFile = {
        path: '/tmp/temp-file.mp3',
        originalname: 'test.mp3',
        mimetype: 'audio/mpeg',
        size: 1024,
      };

      const mockRecording = {
        id: '123',
        filename: 'test-filename.mp3',
        original_filename: 'test.mp3',
        mime_type: 'audio/mpeg',
        file_size: 1024,
        storage_path: '/uploads/test-filename.mp3',
      };

      recordingModel.createRecording.mockResolvedValue(mockRecording);
      fs.mkdir.mockResolvedValue();
      fs.rename.mockResolvedValue();

      const result = await recordingService.createRecording(mockFile);

      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.rename).toHaveBeenCalledWith(
        mockFile.path,
        expect.stringContaining('.mp3')
      );
      expect(recordingModel.createRecording).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: expect.any(String),
          originalFilename: mockFile.originalname,
          mimeType: mockFile.mimetype,
          fileSize: mockFile.size,
          storagePath: expect.any(String),
        })
      );
      expect(result).toEqual(mockRecording);
    });
  });

  describe('getRecordingById', () => {
    it('should return recording by ID', async () => {
      const mockRecording = {
        id: '123',
        filename: 'test.mp3',
      };

      recordingModel.findWithTranscription.mockResolvedValue(mockRecording);

      const result = await recordingService.getRecordingById('123');

      expect(recordingModel.findWithTranscription).toHaveBeenCalledWith('123');
      expect(result).toEqual(mockRecording);
    });

    it('should return null if recording not found', async () => {
      recordingModel.findWithTranscription.mockResolvedValue(null);

      const result = await recordingService.getRecordingById('123');

      expect(result).toBeNull();
    });
  });

  describe('deleteRecording', () => {
    it('should delete recording and file', async () => {
      const mockRecording = {
        id: '123',
        storage_path: '/uploads/test.mp3',
      };

      recordingModel.findById.mockResolvedValue(mockRecording);
      recordingModel.delete.mockResolvedValue(true);
      fs.unlink.mockResolvedValue();

      const result = await recordingService.deleteRecording('123');

      expect(recordingModel.findById).toHaveBeenCalledWith('123');
      expect(fs.unlink).toHaveBeenCalledWith(mockRecording.storage_path);
      expect(recordingModel.delete).toHaveBeenCalledWith('123');
      expect(result).toBe(true);
    });

    it('should return false if recording not found', async () => {
      recordingModel.findById.mockResolvedValue(null);

      const result = await recordingService.deleteRecording('123');

      expect(result).toBe(false);
      expect(fs.unlink).not.toHaveBeenCalled();
    });

    it('should continue deletion even if file deletion fails', async () => {
      const mockRecording = {
        id: '123',
        storage_path: '/uploads/test.mp3',
      };

      recordingModel.findById.mockResolvedValue(mockRecording);
      fs.unlink.mockRejectedValue(new Error('File not found'));
      recordingModel.delete.mockResolvedValue(true);

      const result = await recordingService.deleteRecording('123');

      expect(result).toBe(true);
      expect(recordingModel.delete).toHaveBeenCalled();
    });
  });

  describe('updateDuration', () => {
    it('should update recording duration', async () => {
      const mockRecording = {
        id: '123',
        duration_ms: 5000,
      };

      recordingModel.update.mockResolvedValue(mockRecording);

      const result = await recordingService.updateDuration('123', 5000);

      expect(recordingModel.update).toHaveBeenCalledWith('123', {
        duration_ms: 5000,
      });
      expect(result).toEqual(mockRecording);
    });
  });

  describe('getCount', () => {
    it('should return recording count', async () => {
      recordingModel.count.mockResolvedValue(10);

      const result = await recordingService.getCount();

      expect(recordingModel.count).toHaveBeenCalled();
      expect(result).toBe(10);
    });
  });
});
