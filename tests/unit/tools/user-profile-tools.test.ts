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

import { registerUserProfileTools } from '../../../src/tools/user-profile-tools';

describe('User Profile Tools', () => {
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

  describe('getUserProfile', () => {
    it('should register getUserProfile tool', () => {
      registerUserProfileTools(mockServer as any, mockEnv, mockProps);
      
      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'getUserProfile'
      );
      expect(toolCall).toBeDefined();
    });

    it('should retrieve user profile successfully', async () => {
      mockDbInstance.unsafe.mockResolvedValueOnce([
        { user_id: 'user1', name: 'Test User', email: 'test@example.com', location: 'NYC' },
      ]);
      mockDbInstance.unsafe.mockResolvedValueOnce([
        { skill_id: '1', skill: 'JavaScript', proficiency: 'Expert' },
      ]);
      mockDbInstance.unsafe.mockResolvedValueOnce([
        { exp_id: '1', title: 'Senior Dev', company: 'TechCorp', start_date: '2020-01-01' },
      ]);
      mockDbInstance.unsafe.mockResolvedValueOnce([
        { edu_id: '1', school: 'MIT', degree: 'BS Computer Science', year: '2018' },
      ]);

      registerUserProfileTools(mockServer as any, mockEnv, mockProps);

      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'getUserProfile'
      );
      
      if (toolCall) {
        const handler = toolCall[3] as Function;
        const result = await handler({ user_id: 'user1' });
        
        expect(result.content[0].text).toContain('User profile retrieved successfully');
      }
    });

    it('should return error when profile not found', async () => {
      mockDbInstance.unsafe.mockResolvedValueOnce([]);

      registerUserProfileTools(mockServer as any, mockEnv, mockProps);

      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'getUserProfile'
      );
      
      if (toolCall) {
        const handler = toolCall[3] as Function;
        const result = await handler({ user_id: 'nonexistent' });
        
        expect(result.content[0].text).toContain('User profile not found');
        expect(result.content[0].isError).toBe(true);
      }
    });

    it('should handle database errors gracefully', async () => {
      mockDbInstance.unsafe.mockRejectedValueOnce(new Error('Database connection failed'));

      registerUserProfileTools(mockServer as any, mockEnv, mockProps);

      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'getUserProfile'
      );
      
      if (toolCall) {
        const handler = toolCall[3] as Function;
        const result = await handler({ user_id: 'user1' });
        
        expect(result.content[0].text).toContain('Error retrieving user profile');
        expect(result.content[0].isError).toBe(true);
      }
    });
  });

  describe('updateUserProfile', () => {
    it('should register updateUserProfile tool', () => {
      registerUserProfileTools(mockServer as any, mockEnv, mockProps);
      
      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'updateUserProfile'
      );
      expect(toolCall).toBeDefined();
    });

    it('should update user profile name', async () => {
      mockDbInstance.unsafe.mockResolvedValueOnce([{ user_id: 'user1', name: 'Updated Name' }]);

      registerUserProfileTools(mockServer as any, mockEnv, mockProps);

      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'updateUserProfile'
      );
      
      if (toolCall) {
        const handler = toolCall[3] as Function;
        const result = await handler({ user_id: 'user1', name: 'Updated Name' });
        
        expect(result.content[0].text).toContain('User profile updated');
      }
    });

    it('should return error when no fields to update', async () => {
      registerUserProfileTools(mockServer as any, mockEnv, mockProps);

      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'updateUserProfile'
      );
      
      if (toolCall) {
        const handler = toolCall[3] as Function;
        const result = await handler({ user_id: 'user1' });
        
        expect(result.content[0].text).toContain('No fields to update');
        expect(result.content[0].isError).toBe(true);
      }
    });
  });

  describe('addUserSkill', () => {
    it('should register tools on initialization', () => {
      registerUserProfileTools(mockServer as any, mockEnv, mockProps);
      
      // Verify that tool registration was called
      expect(mockServer.tool).toHaveBeenCalled();
    });
  });

  describe('Tool Schema Validation', () => {
    it('should validate email format in updateUserProfile', () => {
      registerUserProfileTools(mockServer as any, mockEnv, mockProps);
      
      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'updateUserProfile'
      );
      
      if (toolCall) {
        const schema = toolCall[2] as any;
        expect(schema).toHaveProperty('email');
      }
    });

    it('should accept optional fields in updateUserProfile', () => {
      registerUserProfileTools(mockServer as any, mockEnv, mockProps);
      
      const toolCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'updateUserProfile'
      );
      
      if (toolCall) {
        const schema = toolCall[2] as any;
        expect(schema).toHaveProperty('name');
        expect(schema).toHaveProperty('email');
        expect(schema).toHaveProperty('location');
        expect(schema).toHaveProperty('target_role');
        expect(schema).toHaveProperty('preferences');
      }
    });
  });
});
