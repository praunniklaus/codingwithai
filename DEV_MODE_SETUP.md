# Development Mode Setup - OAuth Bypass

## ✅ What I've Done

I've added a **development mode** that bypasses OAuth authentication so you can test the frontend without going through the OAuth flow.

## 🔧 Changes Made

### Backend (`src/index.ts`)
- Added `/mcp-dev` endpoint that bypasses OAuth
- Only works in development mode (not in production)
- Handles CORS automatically

### Frontend (`frontend/src/services/api.ts`)
- Automatically uses `/mcp-dev` endpoint when in development mode
- Uses `/mcp` endpoint in production (requires OAuth)

## 🚀 How to Use

1. **Restart your backend server:**
   ```bash
   npm run dev
   ```

2. **The frontend will automatically use the dev endpoint:**
   - No changes needed - it detects development mode automatically
   - Uses `import.meta.env.DEV` to detect if it's in dev mode

3. **Test it:**
   - Refresh your browser
   - The "Authentication required" errors should be gone
   - API calls should now work!

## ⚠️ Important Notes

- **This only works in development mode** - production will still require OAuth
- **The dev endpoint uses mock user credentials:**
  - login: `dev_user`
  - name: `Development User`
  - email: `dev@localhost`
- **All tools are available** in dev mode (no permission restrictions)

## 🔍 Troubleshooting

If you still see errors:

1. **Make sure backend is restarted** - the new code needs to be loaded
2. **Check backend logs** - you should see requests to `/mcp-dev`
3. **Check browser console** - look for `[API]` logs showing the endpoint being used
4. **Verify the endpoint** - the frontend should log: `Request to http://localhost:8792/mcp-dev`

## 🎯 Next Steps

Once this works, you can:
1. Test the full onboarding flow
2. Test job recommendations loading
3. Test creating applications
4. Test CV generation

All without OAuth! 🎉

