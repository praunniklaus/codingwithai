# Debugging API Connection Issues

## Current Issue: "Failed to load job recommendations"

The dashboard is showing errors when trying to fetch data from the MCP server. Here's how to debug:

## Step 1: Check Browser Console

Open browser DevTools (F12) and check the Console tab. You should see detailed logs like:
- `[API] Calling getRecommendations with params: ...`
- `[API] Response status: ...`
- `[API] Error: ...`

## Step 2: Check Network Tab

1. Open DevTools → Network tab
2. Filter by "mcp" or "XHR"
3. Look for the failed request to `/mcp`
4. Click on it to see:
   - Request headers
   - Request payload
   - Response status
   - Response body

## Common Issues & Solutions

### Issue 1: CORS Error
**Symptoms:** Console shows "CORS error" or network tab shows CORS-related errors

**Solution:** The MCP server needs to allow requests from `http://localhost:5173`

Add CORS headers in the backend (if using Cloudflare Workers, this might be handled automatically, but check).

### Issue 2: Authentication Required
**Symptoms:** 401 or 403 status code, "Authentication required" error

**Solution:** The MCP server requires OAuth authentication. You have two options:

**Option A: Disable OAuth temporarily for testing**
- Modify the backend to allow unauthenticated requests for development

**Option B: Implement OAuth flow**
- Complete the OAuth flow to get a token
- Store the token using `setOAuthToken()` from `api.ts`

### Issue 3: Server Not Running
**Symptoms:** "Cannot connect to MCP server" or network error

**Solution:**
```bash
# Make sure backend is running
npm run dev

# Should see: "Listening on http://localhost:8792"
```

### Issue 4: Wrong API Endpoint
**Symptoms:** 404 Not Found

**Solution:** Check that:
- `.env` file has `VITE_MCP_API_URL=http://localhost:8792`
- Backend is running on port 8792
- The endpoint is `/mcp` (not `/api/mcp` or something else)

### Issue 5: Wrong Request Format
**Symptoms:** 400 Bad Request or unexpected response format

**Solution:** Check the MCP server expects JSON-RPC 2.0 format:
```json
{
  "jsonrpc": "2.0",
  "id": 123,
  "method": "tools/call",
  "params": {
    "name": "getRecommendations",
    "arguments": { ... }
  }
}
```

## Quick Debug Commands

```bash
# Test if MCP server is responding
curl -X POST http://localhost:8792/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "getRecommendations",
      "arguments": {"user_id": "test_user", "limit": 5}
    }
  }'
```

## Next Steps

1. **Check console logs** - Look for `[API]` prefixed logs
2. **Check network tab** - See actual request/response
3. **Test with curl** - Verify server is working
4. **Check backend logs** - See what the server receives

## Temporary Workaround

If you want to test the UI without the backend, you can temporarily use mock data:

In `Dashboard.tsx`, comment out the API calls and use:
```typescript
// Temporary mock data for testing
setRecommendations([
  {
    id: 1,
    job_id: 1,
    title: 'Software Engineer',
    company: 'TechCorp',
    location: 'Zurich',
    salary_min: 80000,
    salary_max: 120000,
    match_score: 92,
    reasoning: 'Strong match with your Python and TypeScript skills',
  },
]);
```

