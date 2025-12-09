# 🚀 How to Run the Frontend

## Quick Start

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The app will start on **http://localhost:5173**

### 3. Open in Browser

Open your browser and navigate to:
```
http://localhost:5173
```

## What You'll See

1. **Landing Page** - Click "Get Started" to begin
2. **Onboarding Flow** - Answer 10 questions about yourself
3. **Dashboard** - View job matches and applications

## Prerequisites

- **Node.js** (v18 or higher)
- **npm** (comes with Node.js)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Troubleshooting

### Port Already in Use

If port 5173 is already in use, Vite will automatically use the next available port (5174, 5175, etc.). Check the terminal output for the actual URL.

### Dependencies Not Installing

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors

The app should compile without errors. If you see TypeScript errors, try:

```bash
npm run build
```

This will show any type errors that need fixing.

## Connecting to Backend (Optional)

The frontend currently uses mock data. To connect to the MCP server backend:

1. Make sure the MCP server is running:
   ```bash
   cd ..  # Go back to project root
   npm run dev  # Start MCP server on port 8792
   ```

2. The frontend is configured to connect to `http://localhost:8792` by default (see `.env` file)

3. Update API calls in `src/services/api.ts` to use real endpoints instead of mocks

## Development Tips

- **Hot Reload**: Changes automatically refresh in the browser
- **Console**: Check browser console for any errors
- **Network Tab**: Check Network tab in DevTools to see API calls
- **State**: User progress is saved to localStorage automatically

## Next Steps

1. Complete the onboarding flow
2. View job recommendations on the dashboard
3. Connect to real MCP API endpoints
4. Test CV generation flow (when implemented)

---

**Happy coding!** 🎉

