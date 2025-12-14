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

import { registerApplicationTools } from '../../../src/tools/application-tools';

describe('Application Tools', () => {
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

  describe('createApplication', () => {
    it('should register createApplication tool', () => {
      registerApplicationTools(mockServer as any, mockEnv, mockProps);
      
      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'createApplication'
      );
      expect(toolCall).toBeDefined();
    });

    it('should create a new application', async () => {
      mockDbInstance.unsafe.mockResolvedValueOnce([{ application_id: '1' }]);

      registerApplicationTools(mockServer as any, mockEnv, mockProps);

      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'createApplication'
      );
      
      if (toolCall) {
        const handler = toolCall[3] as Function;
        const result = await handler({
          user_id: 'user1',
          job_id: 'job1',
          status: 'applied',
        });
        
        expect(result.content[0].text).toContain('Application created');
      }
    });
  });

  describe('getApplications', () => {
    it('should register getApplications tool', () => {
      registerApplicationTools(mockServer as any, mockEnv, mockProps);
      
      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'getApplications'
      );
      expect(toolCall).toBeDefined();
    });

    it('should retrieve user applications', async () => {
      const mockApps = [
        { application_id: '1', job_id: 'job1', status: 'applied', applied_date: '2024-01-01' },
        { application_id: '2', job_id: 'job2', status: 'rejected', applied_date: '2024-01-05' },
      ];
      mockDbInstance.unsafe.mockResolvedValueOnce(mockApps);

      registerApplicationTools(mockServer as any, mockEnv, mockProps);

      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'getApplications'
      );
      
      if (toolCall) {
        const handler = toolCall[3] as Function;
        const result = await handler({ user_id: 'user1' });
        
        expect(result.content[0].text).toContain('application');
      }
    });
  });

  describe('updateApplicationStatus', () => {
    it('should register updateApplicationStatus tool', () => {
      registerApplicationTools(mockServer as any, mockEnv, mockProps);
      
      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'updateApplicationStatus'
      );
      expect(toolCall).toBeDefined();
    });

    it('should update application status', async () => {
      mockDbInstance.unsafe.mockResolvedValueOnce([{ application_id: '1', status: 'interview' }]);

      registerApplicationTools(mockServer as any, mockEnv, mockProps);

      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'updateApplicationStatus'
      );
      
      if (toolCall) {
        const handler = toolCall[3] as Function;
        const result = await handler({
          application_id: '1',
          status: 'interview',
        });
        
        expect(result.content[0].text).toContain('status updated');
      }
    });
  });

  describe('Tool Schema', () => {
    it('should require user_id and job_id for createApplication', () => {
      registerApplicationTools(mockServer as any, mockEnv, mockProps);
      
      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'createApplication'
      );
      
      if (toolCall) {
        const schema = toolCall[2] as any;
        expect(schema).toHaveProperty('user_id');
        expect(schema).toHaveProperty('job_id');
      }
    });
  });
});
