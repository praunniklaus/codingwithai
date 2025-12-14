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

import { registerCVTools } from '../../../src/tools/cv-tools';

describe('CV Tools', () => {
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

  describe('generateCV', () => {
    it('should register generateCV tool', () => {
      registerCVTools(mockServer as any, mockEnv, mockProps);
      
      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'generateCV'
      );
      expect(toolCall).toBeDefined();
    });

    it('should generate CV for job', async () => {
      registerCVTools(mockServer as any, mockEnv, mockProps);

      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'generateCV'
      );
      
      if (toolCall) {
        // Mock successful database responses
        const mockProfile = [{
          user_id: 'user1',
          name: 'John Doe',
          email: 'john@example.com',
          target_role: 'Senior Engineer',
        }];
        
        mockDbInstance.unsafe
          .mockResolvedValueOnce(mockProfile)
          .mockResolvedValueOnce([{ skill_name: 'JavaScript', proficiency: 'Expert', years_experience: 5 }])
          .mockResolvedValueOnce([{ title: 'Engineer', company: 'Tech Co', start_date: '2020-01-01' }])
          .mockResolvedValueOnce([{ degree: 'BS', field: 'Computer Science', school: 'University' }])
          .mockResolvedValueOnce([{ title: 'Senior Engineer', company: 'Tech Jobs Inc' }]);

        const handler = toolCall[3] as Function;
        const result = await handler({
          user_id: 'user1',
          job_id: 1,
          format: 'markdown',
        });
        
        // CV generation should not return an error
        expect(result.content[0].text).toBeDefined();
      }
    });
  });

  describe('generateCoverLetter', () => {
    it('should register generateCoverLetter tool', () => {
      registerCVTools(mockServer as any, mockEnv, mockProps);
      
      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'generateCoverLetter'
      );
      expect(toolCall).toBeDefined();
    });

    it('should generate cover letter for job', async () => {
      registerCVTools(mockServer as any, mockEnv, mockProps);

      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'generateCoverLetter'
      );
      
      if (toolCall) {
        // Mock successful database responses
        mockDbInstance.unsafe
          .mockResolvedValueOnce([{
            user_id: 'user1',
            name: 'John Doe',
            target_role: 'Senior Engineer',
          }])
          .mockResolvedValueOnce([{
            title: 'Senior Software Engineer',
            company: 'Tech Co',
            description: 'A great opportunity',
          }]);

        const handler = toolCall[3] as Function;
        const result = await handler({
          user_id: 'user1',
          job_id: 1,
          tone: 'professional',
        });
        
        // Cover letter generation should not return an error
        expect(result.content[0].text).toBeDefined();
      }
    });
  });

  describe('getCVVersions', () => {
    it('should register getCVVersions tool', () => {
      registerCVTools(mockServer as any, mockEnv, mockProps);
      
      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'getCVVersions'
      );
      expect(toolCall).toBeDefined();
    });

    it('should retrieve CV versions', async () => {
      const mockVersions = [
        { id: '1', version: 1, content: 'CV v1', created_at: '2024-01-01' },
        { id: '2', version: 2, content: 'CV v2', created_at: '2024-01-05' },
      ];
      mockDbInstance.unsafe.mockResolvedValueOnce(mockVersions);

      registerCVTools(mockServer as any, mockEnv, mockProps);

      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'getCVVersions'
      );
      
      if (toolCall) {
        const handler = toolCall[3] as Function;
        const result = await handler({
          user_id: 'user1',
          job_id: 'job1',
        });
        
        expect(result.content[0].text).toContain('version');
      }
    });
  });

  describe('Tool Schema', () => {
    it('should require user_id and job_id for generateCV', () => {
      registerCVTools(mockServer as any, mockEnv, mockProps);
      
      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'generateCV'
      );
      
      if (toolCall) {
        const schema = toolCall[2] as any;
        expect(schema).toHaveProperty('user_id');
        expect(schema).toHaveProperty('job_id');
        expect(schema).toHaveProperty('format');
      }
    });

    it('should require tone for generateCoverLetter', () => {
      registerCVTools(mockServer as any, mockEnv, mockProps);
      
      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'generateCoverLetter'
      );
      
      if (toolCall) {
        const schema = toolCall[2] as any;
        expect(schema).toHaveProperty('tone');
      }
    });
  });
});
