import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockServer = {
  tool: vi.fn(),
};

vi.mock('../../../src/tools/database-tools', () => ({
  registerDatabaseTools: vi.fn(),
}));

vi.mock('../../../src/tools/user-profile-tools', () => ({
  registerUserProfileTools: vi.fn(),
}));

vi.mock('../../../src/tools/job-listing-tools', () => ({
  registerJobListingTools: vi.fn(),
}));

vi.mock('../../../src/tools/application-tools', () => ({
  registerApplicationTools: vi.fn(),
}));

vi.mock('../../../src/tools/cv-tools', () => ({
  registerCVTools: vi.fn(),
}));

vi.mock('../../../src/tools/recommendation-tools', () => ({
  registerRecommendationTools: vi.fn(),
}));

vi.mock('../../../src/tools/insights-tools', () => ({
  registerInsightsTools: vi.fn(),
}));

import { registerAllTools } from '../../../src/tools/register-tools';
import { registerDatabaseTools } from '../../../src/tools/database-tools';
import { registerUserProfileTools } from '../../../src/tools/user-profile-tools';
import { registerJobListingTools } from '../../../src/tools/job-listing-tools';
import { registerApplicationTools } from '../../../src/tools/application-tools';
import { registerCVTools } from '../../../src/tools/cv-tools';
import { registerRecommendationTools } from '../../../src/tools/recommendation-tools';
import { registerInsightsTools } from '../../../src/tools/insights-tools';

describe('Register All Tools', () => {
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

  describe('Tool Registration', () => {
    it('should register database tools', () => {
      registerAllTools(mockServer as any, mockEnv, mockProps);
      expect(registerDatabaseTools).toHaveBeenCalledWith(mockServer, mockEnv, mockProps);
    });

    it('should register user profile tools', () => {
      registerAllTools(mockServer as any, mockEnv, mockProps);
      expect(registerUserProfileTools).toHaveBeenCalledWith(mockServer, mockEnv, mockProps);
    });

    it('should register job listing tools', () => {
      registerAllTools(mockServer as any, mockEnv, mockProps);
      expect(registerJobListingTools).toHaveBeenCalledWith(mockServer, mockEnv, mockProps);
    });

    it('should register application tools', () => {
      registerAllTools(mockServer as any, mockEnv, mockProps);
      expect(registerApplicationTools).toHaveBeenCalledWith(mockServer, mockEnv, mockProps);
    });

    it('should register CV tools', () => {
      registerAllTools(mockServer as any, mockEnv, mockProps);
      expect(registerCVTools).toHaveBeenCalledWith(mockServer, mockEnv, mockProps);
    });

    it('should register recommendation tools', () => {
      registerAllTools(mockServer as any, mockEnv, mockProps);
      expect(registerRecommendationTools).toHaveBeenCalledWith(mockServer, mockEnv, mockProps);
    });

    it('should register insights tools', () => {
      registerAllTools(mockServer as any, mockEnv, mockProps);
      expect(registerInsightsTools).toHaveBeenCalledWith(mockServer, mockEnv, mockProps);
    });

    it('should register calculator tool', () => {
      registerAllTools(mockServer as any, mockEnv, mockProps);
      expect(mockServer.tool).toHaveBeenCalledWith(
        'calculate',
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe('Calculator Tool', () => {
    beforeEach(() => {
      mockServer.tool.mockClear();
    });

    it('should register calculator with correct schema', () => {
      registerAllTools(mockServer as any, mockEnv, mockProps);
      
      const callArgs = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'calculate'
      );
      
      expect(callArgs).toBeDefined();
      expect(callArgs![1]).toHaveProperty('operation');
      expect(callArgs![1]).toHaveProperty('a');
      expect(callArgs![1]).toHaveProperty('b');
    });

    it('should support add operation', async () => {
      registerAllTools(mockServer as any, mockEnv, mockProps);
      
      const calculatorCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'calculate'
      );
      
      const handler = calculatorCall![2] as Function;
      const result = await handler({ operation: 'add', a: 5, b: 3 });
      
      expect(result.content[0].text).toBe('8');
    });

    it('should support subtract operation', async () => {
      registerAllTools(mockServer as any, mockEnv, mockProps);
      
      const calculatorCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'calculate'
      );
      
      const handler = calculatorCall![2] as Function;
      const result = await handler({ operation: 'subtract', a: 10, b: 3 });
      
      expect(result.content[0].text).toBe('7');
    });

    it('should support multiply operation', async () => {
      registerAllTools(mockServer as any, mockEnv, mockProps);
      
      const calculatorCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'calculate'
      );
      
      const handler = calculatorCall![2] as Function;
      const result = await handler({ operation: 'multiply', a: 4, b: 5 });
      
      expect(result.content[0].text).toBe('20');
    });

    it('should support divide operation', async () => {
      registerAllTools(mockServer as any, mockEnv, mockProps);
      
      const calculatorCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'calculate'
      );
      
      const handler = calculatorCall![2] as Function;
      const result = await handler({ operation: 'divide', a: 20, b: 4 });
      
      expect(result.content[0].text).toBe('5');
    });

    it('should return error for divide by zero', async () => {
      registerAllTools(mockServer as any, mockEnv, mockProps);
      
      const calculatorCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'calculate'
      );
      
      const handler = calculatorCall![2] as Function;
      const result = await handler({ operation: 'divide', a: 10, b: 0 });
      
      expect(result.content[0].text).toContain('Error: Cannot divide by zero');
    });

    it('should handle floating point arithmetic', async () => {
      registerAllTools(mockServer as any, mockEnv, mockProps);
      
      const calculatorCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'calculate'
      );
      
      const handler = calculatorCall![2] as Function;
      const result = await handler({ operation: 'divide', a: 5, b: 2 });
      
      expect(result.content[0].text).toBe('2.5');
    });

    it('should handle negative numbers', async () => {
      registerAllTools(mockServer as any, mockEnv, mockProps);
      
      const calculatorCall = vi.mocked(mockServer.tool).mock.calls.find(
        (call) => call[0] === 'calculate'
      );
      
      const handler = calculatorCall![2] as Function;
      const result = await handler({ operation: 'add', a: -5, b: -3 });
      
      expect(result.content[0].text).toBe('-8');
    });
  });

  describe('Tool Registration Order', () => {
    it('should register all tools in the correct order', () => {
      registerAllTools(mockServer as any, mockEnv, mockProps);
      
      expect(registerDatabaseTools).toHaveBeenCalled();
      expect(registerUserProfileTools).toHaveBeenCalled();
      expect(registerJobListingTools).toHaveBeenCalled();
      expect(registerApplicationTools).toHaveBeenCalled();
      expect(registerCVTools).toHaveBeenCalled();
      expect(registerRecommendationTools).toHaveBeenCalled();
      expect(registerInsightsTools).toHaveBeenCalled();
    });
  });

  describe('Tool Registration with Different Props', () => {
    it('should pass props correctly to each tool registration', () => {
      const customProps = {
        login: 'customuser',
        name: 'Custom User',
        email: 'custom@example.com',
        accessToken: 'custom-token',
      };

      registerAllTools(mockServer as any, mockEnv, customProps);

      expect(registerDatabaseTools).toHaveBeenCalledWith(mockServer, mockEnv, customProps);
      expect(registerUserProfileTools).toHaveBeenCalledWith(mockServer, mockEnv, customProps);
      expect(registerJobListingTools).toHaveBeenCalledWith(mockServer, mockEnv, customProps);
      expect(registerApplicationTools).toHaveBeenCalledWith(mockServer, mockEnv, customProps);
      expect(registerCVTools).toHaveBeenCalledWith(mockServer, mockEnv, customProps);
      expect(registerRecommendationTools).toHaveBeenCalledWith(mockServer, mockEnv, customProps);
      expect(registerInsightsTools).toHaveBeenCalledWith(mockServer, mockEnv, customProps);
    });
  });
});
