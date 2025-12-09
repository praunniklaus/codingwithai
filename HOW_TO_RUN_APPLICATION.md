# 🚀 How to Run the Job Application Assistant

## Quick Start (3 Steps)

### Step 1: Start Database (Terminal 1)

```bash
# Start PostgreSQL container
docker compose up -d

# Wait a few seconds for database to initialize
sleep 5

# Setup database schema (if not already done)
./setup-database.sh
```

**Verify database is running:**
```bash
docker ps | grep mcp-cole-pg-test
```

### Step 2: Start MCP Server (Terminal 2)

```bash
# From project root
npm run dev
```

**What happens:**
- MCP server starts on **http://localhost:8792**
- Provides API endpoints for frontend
- Handles database operations
- Development mode uses `/mcp-dev` endpoint (bypasses OAuth)

**You should see:**
```
⬣ Listening on http://localhost:8792
```

### Step 3: Start Frontend (Terminal 3)

```bash
cd frontend
npm run dev
```

**What happens:**
- Frontend starts on **http://localhost:5173**
- Connects to MCP server at `http://localhost:8792`
- Uses `/mcp-dev` endpoint in development (no OAuth needed)

**You should see:**
```
VITE v7.2.7  ready in XXX ms
➜  Local:   http://localhost:5173/
```

## 🎯 Access the Application

1. **Open browser**: http://localhost:5173
2. **Click "Get Started"** on landing page
3. **Complete onboarding** (10 questions)
4. **View dashboard** with job recommendations

## 📋 Optional: Run Python Agents (Terminal 4)

The Python agents run independently and can be started anytime:

```bash
# Without sandboxing (faster)
npm run agents:python

# With sandboxing (secure, requires Docker)
npm run agents:python:sandbox
```

**What agents do:**
- **Job Hunter**: Scores jobs and creates recommendations
- **CV Crafter**: Generates CVs and cover letters for draft applications
- **Application Tracker**: Monitors applications and generates insights

## ✅ Verify Everything Works

### Check Database
```bash
# See job listings
docker exec mcp-cole-pg-test psql -U mcp_user -d mcp_database -c "SELECT COUNT(*) FROM job_listings WHERE is_active = true;"

# See recommendations (after onboarding)
docker exec mcp-cole-pg-test psql -U mcp_user -d mcp_database -c "SELECT COUNT(*) FROM job_recommendations;"
```

### Check Frontend
- Open http://localhost:5173
- Should see landing page
- Complete onboarding flow
- Dashboard should load with job recommendations

### Check Backend
- MCP server should be running on port 8792
- Check terminal for any errors
- Frontend should successfully call API endpoints

## 🔧 Troubleshooting

### Port Already in Use

**Port 8792 (MCP Server):**
```bash
lsof -ti:8792 | xargs kill -9
```

**Port 5173 (Frontend):**
```bash
lsof -ti:5173 | xargs kill -9
```

**Port 5432 (PostgreSQL):**
```bash
docker compose down
docker compose up -d
```

### Database Not Running

```bash
# Check if container is running
docker ps | grep mcp-cole-pg-test

# If not running, start it
docker compose up -d

# Check logs
docker compose logs mcp-cole-pg-test
```

### Frontend Can't Connect to Backend

1. **Verify MCP server is running** on port 8792
2. **Check `.env` file** in `frontend/` directory:
   ```
   VITE_MCP_API_URL=http://localhost:8792
   ```
3. **Check browser console** for CORS or connection errors
4. **Verify `/mcp-dev` endpoint** is accessible (development mode)

### No Jobs Showing

1. **Fetch jobs first:**
   ```bash
   npm run fetch-jobs
   ```

2. **Create recommendations** (or wait for agents):
   ```bash
   npm run create-recommendations <user_id>
   ```

3. **Or complete onboarding** - it automatically creates recommendations

## 📊 Complete Startup Sequence

```bash
# Terminal 1: Database
docker compose up -d
sleep 5
./setup-database.sh

# Terminal 2: MCP Server (Backend API)
npm run dev

# Terminal 3: Frontend
cd frontend
npm run dev

# Terminal 4: Python Agents (Optional)
npm run agents:python
```

## 🎯 Expected Flow

1. **Database** → Running (Docker container)
2. **MCP Server** → Running (port 8792)
3. **Frontend** → Running (port 5173)
4. **User visits** → http://localhost:5173
5. **Completes onboarding** → Data saved to database
6. **Dashboard loads** → Shows job recommendations
7. **Agents run** → Continuously score jobs and generate insights

## 🔍 Quick Health Check

Run this to verify everything:
```bash
# Check database
docker ps | grep mcp-cole-pg-test && echo "✅ Database running"

# Check MCP server
curl -s http://localhost:8792/mcp-dev > /dev/null && echo "✅ MCP server responding" || echo "❌ MCP server not responding"

# Check frontend
curl -s http://localhost:5173 > /dev/null && echo "✅ Frontend running" || echo "❌ Frontend not running"
```

## 📝 Notes

- **MCP Server must be running** before frontend (frontend makes API calls to it)
- **Database must be running** before MCP server (server connects to database)
- **Python agents are optional** - they work independently
- **Development mode** uses `/mcp-dev` endpoint (no OAuth required)
- **Production mode** would use `/mcp` endpoint (OAuth required)

