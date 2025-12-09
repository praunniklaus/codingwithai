const MCP_API_URL = import.meta.env.VITE_MCP_API_URL || 'http://localhost:8792';

// Use dev endpoint in development to bypass OAuth
const MCP_ENDPOINT = import.meta.env.DEV ? '/mcp-dev' : '/mcp';

// Store OAuth token (in production, use secure storage)
let oauthToken: string | null = localStorage.getItem('mcp_oauth_token');

export const setOAuthToken = (token: string) => {
  oauthToken = token;
  localStorage.setItem('mcp_oauth_token', token);
};

export const clearOAuthToken = () => {
  oauthToken = null;
  localStorage.removeItem('mcp_oauth_token');
};

export const getOAuthToken = () => oauthToken;

async function callMCPTool(toolName: string, params: Record<string, any>) {
  try {
    console.log(`[API] Calling ${toolName} with params:`, params);
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add OAuth token if available
    if (oauthToken) {
      headers['Authorization'] = `Bearer ${oauthToken}`;
      console.log('[API] Using OAuth token');
    } else {
      console.warn('[API] No OAuth token available - request may fail if auth is required');
    }

    const requestBody = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: params,
      },
    };

    console.log(`[API] Request to ${MCP_API_URL}${MCP_ENDPOINT}:`, requestBody);

    const response = await fetch(`${MCP_API_URL}${MCP_ENDPOINT}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    console.log(`[API] Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] Error response:`, errorText);
      
      // Check for CORS error
      if (response.status === 0 || response.type === 'opaque') {
        throw new Error('CORS error: Make sure the MCP server allows requests from this origin');
      }
      
      // Check for authentication error
      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication required: Please complete OAuth flow');
      }
      
      throw new Error(`API error (${response.status}): ${errorText || response.statusText}`);
    }

    const data = await response.json();
    console.log(`[API] Response data:`, data);
    
    // Handle JSON-RPC errors
    if (data.error) {
      console.error(`[API] JSON-RPC error:`, data.error);
      throw new Error(data.error.message || `API error: ${JSON.stringify(data.error)}`);
    }

    // Extract result from MCP response format
    if (data.result?.content) {
      // MCP returns content array, extract text
      const textContent = data.result.content.find((c: any) => c.type === 'text');
      if (textContent) {
        const text = textContent.text;
        
        // Check if response contains a JSON code block (from createSuccessResponse)
        const jsonBlockMatch = text.match(/```json\n([\s\S]*?)\n```/);
        if (jsonBlockMatch) {
          try {
            // Extract and parse JSON from code block
            const parsed = JSON.parse(jsonBlockMatch[1]);
            console.log(`[API] Parsed JSON from code block:`, parsed);
            
            // If the parsed result has a 'data' property (from createSuccessResponse structure),
            // return that, otherwise return the whole parsed object
            if (parsed.data !== undefined) {
              return parsed.data;
            }
            
            // Check if it's an array or object with expected structure
            if (Array.isArray(parsed)) {
              return parsed;
            }
            
            // If it has a 'result' property, return that
            if (parsed.result !== undefined) {
              return parsed.result;
            }
            
            return parsed;
          } catch (parseError) {
            console.error(`[API] Failed to parse JSON from code block:`, parseError);
            console.log(`[API] JSON block content:`, jsonBlockMatch[1]);
          }
        }
        
        // Fallback: Try to parse entire text as JSON
        try {
          const parsed = JSON.parse(text);
          console.log(`[API] Parsed entire text as JSON:`, parsed);
          return parsed;
        } catch {
          // If not JSON, return the text
          console.log(`[API] Returning text result:`, text);
          return text;
        }
      }
    }

    console.log(`[API] Returning raw result:`, data.result);
    return data.result;
  } catch (error) {
    console.error(`[API] Error calling ${toolName}:`, error);
    
    // Provide more helpful error messages
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Cannot connect to MCP server at ${MCP_API_URL}. Is the server running?`);
    }
    
    throw error;
  }
}

// User Profile APIs
export const updateUserProfile = async (params: {
  user_id: string;
  name?: string;
  email?: string;
  location?: string;
  target_role?: string;
}) => {
  return callMCPTool('updateUserProfile', params);
};

export const getUserProfile = async (user_id: string) => {
  return callMCPTool('getUserProfile', { user_id });
};

export const addSkill = async (params: {
  user_id: string;
  skill_name: string;
  proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  years_experience?: number;
}) => {
  return callMCPTool('addSkill', params);
};

export const addExperience = async (params: {
  user_id: string;
  company: string;
  title: string;
  start_date: string;
  end_date?: string;
  is_current?: boolean;
  achievements?: string[];
}) => {
  return callMCPTool('addExperience', params);
};

export const addEducation = async (params: {
  user_id: string;
  institution: string;
  degree: string;
  field_of_study?: string;
  start_date: string;
  end_date?: string;
  gpa?: number;
}) => {
  return callMCPTool('addEducation', params);
};

// Job APIs
export const searchJobs = async (params: {
  title?: string;
  location?: string;
  limit?: number;
}) => {
  return callMCPTool('searchJobs', params);
};

export const getJobById = async (job_id: number) => {
  return callMCPTool('getJobById', { job_id });
};

export const getRecommendations = async (params: {
  user_id: string;
  min_score?: number;
  limit?: number;
}) => {
  return callMCPTool('getRecommendations', params);
};

// Application APIs
export const createApplication = async (params: {
  user_id: string;
  job_id: number;
  notes?: string;
}) => {
  return callMCPTool('createApplication', params);
};

export const getApplications = async (params: {
  user_id: string;
  status?: string;
}) => {
  return callMCPTool('getApplications', params);
};

export const updateApplicationStatus = async (params: {
  application_id: number;
  status: string;
  notes?: string;
  applied_date?: string;
}) => {
  return callMCPTool('updateApplicationStatus', params);
};

// CV APIs
export const generateCV = async (params: {
  user_id: string;
  job_id: number;
  format?: 'markdown' | 'plain' | 'html';
}) => {
  return callMCPTool('generateCV', params);
};

export const generateCoverLetter = async (params: {
  user_id: string;
  job_id: number;
  tone?: 'professional' | 'friendly' | 'formal' | 'enthusiastic';
}) => {
  return callMCPTool('generateCoverLetter', params);
};

// Insights APIs
export const getAgentInsights = async (params: {
  user_id: string;
  limit?: number;
}) => {
  return callMCPTool('getAgentInsights', params);
};

// Recommendation creation API
export const createRecommendationsForUser = async (params: {
  user_id: string;
  count?: number;
}) => {
  return callMCPTool('createRecommendationsForUser', params);
};

