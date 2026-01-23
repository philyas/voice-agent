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
jest.mock('../../services/recording.service');
jest.mock('../../services/transcription.service');

const recordingController = require('../../controllers/recording.controller');
const recordingService = require('../../services/recording.service');
const transcriptionService = require('../../services/transcription.service');
const { ApiError } = require('../../middleware/error.middleware');

describe('RecordingController', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      body: {},
      file: null,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return paginated recordings', async () => {
      const mockRecordings = [
        { id: '1', filename: 'test1.mp3' },
        { id: '2', filename: 'test2.mp3' },
      ];

      recordingService.getAllRecordings.mockResolvedValue(mockRecordings);

      await recordingController.getAll(req, res, next);

      expect(recordingService.getAllRecordings).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      const error = new Error('Database error');
      recordingService.getAllRecordings.mockRejectedValue(error);

      await recordingController.getAll(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getById', () => {
    it('should return recording by ID', async () => {
      req.params.id = '123';
      const mockRecording = { id: '123', filename: 'test.mp3' };

      recordingService.getRecordingById.mockResolvedValue(mockRecording);

      await recordingController.getById(req, res, next);

      expect(recordingService.getRecordingById).toHaveBeenCalledWith('123');
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 404 if recording not found', async () => {
      req.params.id = '123';
      recordingService.getRecordingById.mockResolvedValue(null);

      await recordingController.getById(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
    });
  });

  describe('create', () => {
    it('should create recording from uploaded file', async () => {
      req.file = {
        path: '/tmp/test.mp3',
        originalname: 'test.mp3',
        mimetype: 'audio/mpeg',
        size: 1024,
      };

      const mockRecording = {
        id: '123',
        filename: 'test.mp3',
      };

      recordingService.createRecording.mockResolvedValue(mockRecording);

      await recordingController.create(req, res, next);

      expect(recordingService.createRecording).toHaveBeenCalledWith(req.file);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 400 if no file uploaded', async () => {
      req.file = null;

      await recordingController.create(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toBeInstanceOf(ApiError);
      expect(next.mock.calls[0][0].statusCode).toBe(400);
    });
  });

  describe('delete', () => {
    it('should delete recording', async () => {
      req.params.id = '123';
      recordingService.deleteRecording.mockResolvedValue(true);

      await recordingController.delete(req, res, next);

      expect(recordingService.deleteRecording).toHaveBeenCalledWith('123');
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 404 if recording not found', async () => {
      req.params.id = '123';
      recordingService.deleteRecording.mockResolvedValue(false);

      await recordingController.delete(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
    });
  });

  describe('transcribe', () => {
    it('should transcribe recording', async () => {
      req.params.id = '123';
      req.body.language = 'de';

      const mockResult = {
        transcription: { id: 'trans-1', text: 'Test' },
        isNew: true,
      };

      transcriptionService.transcribeRecording.mockResolvedValue(mockResult);

      await recordingController.transcribe(req, res, next);

      expect(transcriptionService.transcribeRecording).toHaveBeenCalledWith('123', {
        language: 'de',
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 200 if transcription already exists', async () => {
      req.params.id = '123';
      req.body.language = 'de';

      const mockResult = {
        transcription: { id: 'trans-1', text: 'Test' },
        isNew: false,
      };

      transcriptionService.transcribeRecording.mockResolvedValue(mockResult);

      await recordingController.transcribe(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getStats', () => {
    it('should return recording statistics', async () => {
      recordingService.getCount.mockResolvedValue(10);

      await recordingController.getStats(req, res, next);

      expect(recordingService.getCount).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalRecordings: 10,
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
});
