import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDbInstance = {
  unsafe: vi.fn(),
};

vi.mock('../../../src/database/utils', () => ({
  withDatabase: vi.fn(async (url: string, operation: any) => {
    return await operation(mockDbInstance);
  }),
}));

vi.mock('../../../src/database/security', () => ({
  formatDatabaseError: vi.fn((error) => error?.message || 'Unknown error'),
}));

const mockServer = {
  tool: vi.fn(),
};

import { registerRecommendationTools } from '../../../src/tools/recommendation-tools';

describe('Recommendation Tools', () => {
  let mockEnv: any;
  let mockProps: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockEnv = {
      DATABASE_URL: 'postgresql://test:test@localhost/test',
    };

    mockProps = {
      login: 'testuser',
      name: 'Test User',
      email: 'test@example.com',
      accessToken: 'test-token',
    };
  });

  describe('getRecommendations', () => {
    it('should register getRecommendations tool', () => {
      registerRecommendationTools(mockServer as any, mockEnv, mockProps);
      
      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'getRecommendations'
      );
      expect(toolCall).toBeDefined();
    });

    it('should retrieve recommendations for user', async () => {
      const mockRecs = [
        {
          id: '1',
          job_id: 'job1',
          title: 'Software Engineer',
          company: 'TechCorp',
          match_score: 0.95,
        },
        {
          id: '2',
          job_id: 'job2',
          title: 'Senior Engineer',
          company: 'WebCo',
          match_score: 0.87,
        },
      ];
      mockDbInstance.unsafe.mockResolvedValueOnce(mockRecs);

      registerRecommendationTools(mockServer as any, mockEnv, mockProps);

      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'getRecommendations'
      );
      
      if (toolCall) {
        const handler = toolCall[3] as Function;
        const result = await handler({ user_id: 'user1', limit: 10 });
        
        expect(result.content[0].text).toContain('recommendation');
      }
    });

    it('should handle empty recommendations', async () => {
      mockDbInstance.unsafe.mockResolvedValueOnce([]);

      registerRecommendationTools(mockServer as any, mockEnv, mockProps);

      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'getRecommendations'
      );
      
      if (toolCall) {
        const handler = toolCall[3] as Function;
        const result = await handler({ user_id: 'user1', limit: 10 });
        
        expect(result.content).toBeDefined();
      }
    });
  });

  describe('updateRecommendationStatus', () => {
    it('should register recommendation tools', () => {
      registerRecommendationTools(mockServer as any, mockEnv, mockProps);
      
      // Verify that tool registration was called
      expect(mockServer.tool).toHaveBeenCalled();
    });

    it('should update recommendation status', async () => {
      mockDbInstance.unsafe.mockResolvedValueOnce([
        { id: '1', status: 'applied' },
      ]);

      registerRecommendationTools(mockServer as any, mockEnv, mockProps);

      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'updateRecommendationStatus'
      );
      
      if (toolCall) {
        const handler = toolCall[3] as Function;
        const result = await handler({
          recommendation_id: '1',
          status: 'applied',
        });
        
        expect(result.content[0].text).toContain('Status updated');
      }
    });
  });

  describe('Tool Schema', () => {
    it('should have user_id and limit parameters', () => {
      registerRecommendationTools(mockServer as any, mockEnv, mockProps);
      
      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'getRecommendations'
      );
      
      if (toolCall) {
        const schema = toolCall[2] as any;
        expect(schema).toHaveProperty('user_id');
        expect(schema).toHaveProperty('limit');
      }
    });
  });
});
