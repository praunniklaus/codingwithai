# Quick Start: Frontend + Backend

## 🚀 Start Everything

### Terminal 1: Backend MCP Server
```bash
npm run dev
```

### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```

### Terminal 3: Agents (Optional)
```bash
npm run agents:job
```

## 📱 Access

- **Frontend**: http://localhost:5173
- **Backend MCP**: http://localhost:8792
- **MCP Endpoint**: http://localhost:8792/mcp

## ✅ Test Checklist

- [ ] Landing page loads
- [ ] Onboarding flow works (10 questions)
- [ ] Data saves to database after onboarding
- [ ] Dashboard loads job recommendations
- [ ] Applications page loads applications
- [ ] Toast notifications appear on errors/success

## 🔧 If API Calls Fail

The frontend is now connected to the API, but you may need to:

1. **Disable OAuth temporarily** for testing (if backend requires it)
2. **Check CORS settings** in backend
3. **Verify database connection** is working
4. **Check API response format** matches what frontend expects

See `frontend/TESTING_GUIDE.md` for detailed troubleshooting.
