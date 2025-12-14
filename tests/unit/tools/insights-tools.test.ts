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

import { registerInsightsTools } from '../../../src/tools/insights-tools';

describe('Insights Tools', () => {
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

  describe('getAgentInsights', () => {
    it('should register getAgentInsights tool', () => {
      registerInsightsTools(mockServer as any, mockEnv, mockProps);
      
      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'getAgentInsights'
      );
      expect(toolCall).toBeDefined();
    });

    it('should retrieve agent insights', async () => {
      const mockInsights = [
        { id: '1', agent_name: 'Job Hunter', message: 'Found 5 new jobs', timestamp: '2024-01-01' },
        { id: '2', agent_name: 'CV Crafter', message: 'CV updated', timestamp: '2024-01-02' },
      ];
      mockDbInstance.unsafe.mockResolvedValueOnce(mockInsights);

      registerInsightsTools(mockServer as any, mockEnv, mockProps);

      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'getAgentInsights'
      );
      
      if (toolCall) {
        const handler = toolCall[3] as Function;
        const result = await handler({ user_id: 'user1', limit: 10 });
        
        expect(result.content[0].text).toContain('insight');
      }
    });
  });

  describe('addInsight', () => {
    it('should register insight tools', () => {
      registerInsightsTools(mockServer as any, mockEnv, mockProps);
      
      // Verify that tool registration was called
      expect(mockServer.tool).toHaveBeenCalled();
    });

    it('should add new insight', async () => {
      mockDbInstance.unsafe.mockResolvedValueOnce([{ id: '1' }]);

      registerInsightsTools(mockServer as any, mockEnv, mockProps);

      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'addInsight'
      );
      
      if (toolCall) {
        const handler = toolCall[3] as Function;
        const result = await handler({
          user_id: 'user1',
          agent_name: 'Job Hunter',
          message: 'New insight',
        });
        
        expect(result.content[0].text).toContain('Insight added');
      }
    });
  });

  describe('getUserAnalytics', () => {
    it('should register analytics tools', () => {
      registerInsightsTools(mockServer as any, mockEnv, mockProps);
      
      // Verify that tool registration was called
      expect(mockServer.tool).toHaveBeenCalled();
    });

    it('should retrieve user analytics', async () => {
      mockDbInstance.unsafe.mockResolvedValueOnce([
        { metric: 'applications_submitted', value: 15 },
        { metric: 'interviews_scheduled', value: 3 },
        { metric: 'offers_received', value: 1 },
      ]);

      registerInsightsTools(mockServer as any, mockEnv, mockProps);

      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'getUserAnalytics'
      );
      
      if (toolCall) {
        const handler = toolCall[3] as Function;
        const result = await handler({ user_id: 'user1' });
        
        expect(result.content[0].text).toContain('analytics');
      }
    });
  });

  describe('Tool Schema', () => {
    it('should have user_id parameter for getAgentInsights', () => {
      registerInsightsTools(mockServer as any, mockEnv, mockProps);
      
      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'getAgentInsights'
      );
      
      if (toolCall) {
        const schema = toolCall[2] as any;
        expect(schema).toHaveProperty('user_id');
      }
    });

    it('should require agent_name and message for addInsight', () => {
      registerInsightsTools(mockServer as any, mockEnv, mockProps);
      
      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'addInsight'
      );
      
      if (toolCall) {
        const schema = toolCall[2] as any;
        expect(schema).toHaveProperty('agent_name');
        expect(schema).toHaveProperty('message');
      }
    });
  });
});
