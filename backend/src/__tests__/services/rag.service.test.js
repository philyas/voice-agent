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
jest.mock('../../services/embedding.service');
jest.mock('../../services/openai.service');
jest.mock('../../models/transcription.model');
jest.mock('../../models/enrichment.model');

const ragService = require('../../services/rag.service');
const embeddingService = require('../../services/embedding.service');
const openaiService = require('../../services/openai.service');
const transcriptionModel = require('../../models/transcription.model');
const enrichmentModel = require('../../models/enrichment.model');

describe('RAGService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('answerQuestion', () => {
    it('should answer question with relevant context', async () => {
      const question = 'What was discussed?';
      const mockDocs = [
        {
          recording_id: 'rec-1',
          transcription_id: 'trans-1',
          recording_filename: 'test.mp3',
          recording_created_at: new Date('2024-01-01'),
          content: 'This is relevant content',
          similarity: 0.85,
          source_type: 'transcription',
        },
      ];

      const mockCompletion = {
        content: 'Based on the context, this was discussed...',
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
        },
      };

      embeddingService.search.mockResolvedValue(mockDocs);
      openaiService.generateCompletion.mockResolvedValue(mockCompletion);

      const result = await ragService.answerQuestion(question);

      expect(embeddingService.search).toHaveBeenCalledWith(question, {
        limit: 5,
        minSimilarity: 0.0,
        sourceTypes: ['transcription', 'enrichment'],
      });
      expect(openaiService.generateCompletion).toHaveBeenCalled();
      expect(result.answer).toBe(mockCompletion.content);
      expect(result.hasContext).toBe(true);
      expect(result.sources).toHaveLength(1);
    });

    it('should return no context message when no relevant docs found', async () => {
      embeddingService.search.mockResolvedValue([]);

      const result = await ragService.answerQuestion('What was discussed?');

      expect(result.hasContext).toBe(false);
      expect(result.answer).toContain('keine relevanten Informationen');
      expect(result.sources).toEqual([]);
      expect(openaiService.generateCompletion).not.toHaveBeenCalled();
    });
  });

  describe('buildContext', () => {
    it('should format context from documents', () => {
      const docs = [
        {
          recording_filename: 'test.mp3',
          recording_created_at: new Date('2024-01-01'),
          content: 'Test content',
          similarity: 0.85,
          source_type: 'transcription',
        },
      ];

      const context = ragService.buildContext(docs);

      expect(context).toContain('test.mp3');
      expect(context).toContain('Test content');
      expect(context).toContain('85.0%');
    });
  });

  describe('buildSystemPrompt', () => {
    it('should return German prompt for de language', () => {
      const prompt = ragService.buildSystemPrompt('de');
      expect(prompt).toContain('hilfreicher Assistent');
      expect(prompt).toContain('Deutsch');
    });

    it('should return English prompt for en language', () => {
      const prompt = ragService.buildSystemPrompt('en');
      expect(prompt).toContain('helpful assistant');
      expect(prompt).toContain('English');
    });
  });

  describe('formatSources', () => {
    it('should group sources by recording', () => {
      const docs = [
        {
          recording_id: 'rec-1',
          transcription_id: 'trans-1',
          recording_filename: 'test1.mp3',
          recording_created_at: new Date('2024-01-01'),
          content: 'Content 1',
          similarity: 0.9,
          source_type: 'transcription',
        },
        {
          recording_id: 'rec-1',
          transcription_id: 'trans-1',
          recording_filename: 'test1.mp3',
          recording_created_at: new Date('2024-01-01'),
          content: 'Content 2',
          similarity: 0.8,
          source_type: 'transcription',
        },
        {
          recording_id: 'rec-2',
          transcription_id: 'trans-2',
          recording_filename: 'test2.mp3',
          recording_created_at: new Date('2024-01-02'),
          content: 'Content 3',
          similarity: 0.7,
          source_type: 'enrichment',
        },
      ];

      const sources = ragService.formatSources(docs);

      expect(sources).toHaveLength(2);
      expect(sources[0].recordingId).toBe('rec-1');
      expect(sources[0].chunks).toHaveLength(2);
      expect(sources[1].recordingId).toBe('rec-2');
    });
  });

  describe('isFollowUpQuestion', () => {
    it('should detect follow-up questions', () => {
      expect(ragService.isFollowUpQuestion('Was ist das?')).toBe(true);
      expect(ragService.isFollowUpQuestion('Mehr Details dazu')).toBe(true);
      expect(ragService.isFollowUpQuestion('What about this?')).toBe(true);
      expect(ragService.isFollowUpQuestion('Normal question')).toBe(false);
    });
  });
});
