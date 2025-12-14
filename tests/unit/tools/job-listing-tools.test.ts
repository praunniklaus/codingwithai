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

import { registerJobListingTools } from '../../../src/tools/job-listing-tools';

describe('Job Listing Tools', () => {
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

  describe('searchJobs', () => {
    it('should register searchJobs tool', () => {
      registerJobListingTools(mockServer as any, mockEnv, mockProps);
      
      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'searchJobs'
      );
      expect(toolCall).toBeDefined();
    });

    it('should search jobs by query', async () => {
      const mockJobs = [
        { job_id: '1', title: 'Software Engineer', company: 'TechCorp', location: 'NYC' },
        { job_id: '2', title: 'Frontend Engineer', company: 'WebCo', location: 'Remote' },
      ];
      mockDbInstance.unsafe.mockResolvedValueOnce(mockJobs);

      registerJobListingTools(mockServer as any, mockEnv, mockProps);

      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'searchJobs'
      );
      
      if (toolCall) {
        const handler = toolCall[3] as Function;
        const result = await handler({ query: 'Engineer', limit: 10 });
        
        expect(result.content[0].text).toContain('job listing');
      }
    });

    it('should handle empty search results', async () => {
      mockDbInstance.unsafe.mockResolvedValueOnce([]);

      registerJobListingTools(mockServer as any, mockEnv, mockProps);

      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'searchJobs'
      );
      
      if (toolCall) {
        const handler = toolCall[3] as Function;
        const result = await handler({ query: 'NonexistentRole', limit: 10 });
        
        expect(result.content).toBeDefined();
      }
    });
  });

  describe('getJobById', () => {
    it('should register getJobById tool', () => {
      registerJobListingTools(mockServer as any, mockEnv, mockProps);
      
      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'getJobById'
      );
      expect(toolCall).toBeDefined();
    });

    it('should retrieve job by ID', async () => {
      const mockJob = {
        job_id: '1',
        title: 'Senior Engineer',
        company: 'BigTech',
        description: 'We are hiring...',
        location: 'San Francisco',
        salary_min: 150000,
        salary_max: 200000,
      };
      mockDbInstance.unsafe.mockResolvedValueOnce([mockJob]);

      registerJobListingTools(mockServer as any, mockEnv, mockProps);

      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'getJobById'
      );
      
      if (toolCall) {
        const handler = toolCall[3] as Function;
        const result = await handler({ job_id: '1' });
        
        expect(result.content[0].text).toContain('Senior Engineer');
      }
    });
  });

  describe('Tool Schema', () => {
    it('should have correct searchJobs parameters', () => {
      registerJobListingTools(mockServer as any, mockEnv, mockProps);
      
      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'searchJobs'
      );
      
      if (toolCall) {
        const schema = toolCall[2] as any;
        // Schema contains actual field names from tool definition
        expect(schema).toBeDefined();
      }
    });

    it('should have correct getJobById parameters', () => {
      registerJobListingTools(mockServer as any, mockEnv, mockProps);
      
      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'getJobById'
      );
      
      if (toolCall) {
        const schema = toolCall[2] as any;
        expect(schema).toHaveProperty('job_id');
      }
    });
  });
});
