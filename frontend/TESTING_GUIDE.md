# Testing Guide: Frontend to Backend Connection

## ✅ What We've Completed

1. ✅ Created `.env` file with MCP API URL
2. ✅ Installed `react-hot-toast` for notifications
3. ✅ Updated API service with OAuth token handling
4. ✅ Connected onboarding to save data to API
5. ✅ Replaced Dashboard mock data with real API calls
6. ✅ Replaced Applications mock data with real API calls
7. ✅ Added error handling and toast notifications

## 🚀 How to Test

### Step 1: Start the Backend MCP Server

```bash
# In the root directory
npm run dev
```

This starts the MCP server on `http://localhost:8792`

### Step 2: Start the Frontend

```bash
# In the frontend directory
cd frontend
npm run dev
```

This starts the frontend on `http://localhost:5173` (or another port)

### Step 3: Test the Flow

1. **Landing Page**
   - Open `http://localhost:5173`
   - Click "Get Started"

2. **Onboarding**
   - Complete all 10 questions
   - When you finish, it will:
     - Save your profile to the database
     - Save your skills, education, and experience
     - Show success/error toasts
     - Redirect to dashboard

3. **Dashboard**
   - Should load job recommendations from API
   - Should show insights from agents
   - Click "View Details" on a job card
   - Click "I'm Interested" to create an application

4. **Applications Page**
   - Navigate to Applications from header
   - Should load your applications from API
   - Filter by status
   - View stats (response rate, interview rate, etc.)

## 🔧 Troubleshooting

### API Errors

If you see API errors:

1. **Check MCP Server is Running**
   ```bash
   # Should see: "Listening on http://localhost:8792"
   ```

2. **Check CORS**
   - The MCP server should allow requests from `http://localhost:5173`
   - If not, you may need to configure CORS in the backend

3. **Check OAuth Token**
   - Currently, the frontend doesn't have OAuth implemented
   - For now, API calls may fail if OAuth is required
   - You can temporarily disable OAuth in the backend for testing

### Data Not Appearing

1. **Check Browser Console**
   - Look for API errors
   - Check network tab for failed requests

2. **Check Database**
   ```bash
   # Connect to PostgreSQL
   psql -U mcp_user -d mcp_database
   
   # Check if data was saved
   SELECT * FROM user_profiles;
   SELECT * FROM user_skills;
   ```

3. **Check API Response Format**
   - The API returns MCP format: `{ result: { content: [...] } }`
   - Our code tries to parse this, but may need adjustment based on actual response

## 📝 Next Steps (Optional Improvements)

1. **OAuth Integration**
   - Implement OAuth flow in frontend
   - Store tokens securely
   - Add token refresh logic

2. **Better Error Handling**
   - Parse MCP error responses
   - Show user-friendly error messages
   - Add retry logic for failed requests

3. **Loading States**
   - Add skeleton loaders
   - Show progress for long operations
   - Disable buttons during API calls

4. **Data Validation**
   - Validate API responses
   - Handle missing fields gracefully
   - Add type guards

5. **Real-time Updates**
   - Poll for new recommendations
   - Update dashboard when agents finish
   - Show notifications for new insights

## 🎯 Current Status

- ✅ Frontend is fully built and styled
- ✅ API service is connected
- ✅ Onboarding saves to database
- ✅ Dashboard fetches real data
- ✅ Applications page fetches real data
- ⚠️ OAuth authentication not yet implemented (may need to disable for testing)
- ⚠️ API response parsing may need adjustment based on actual MCP format

## 💡 Quick Test Commands

```bash
# Terminal 1: Start backend
npm run dev

# Terminal 2: Start frontend
cd frontend && npm run dev

# Terminal 3: Watch database
watch -n 1 'psql -U mcp_user -d mcp_database -c "SELECT COUNT(*) FROM user_profiles;"'
```

