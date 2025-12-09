# 🚀 How to Run the Complete Application

This guide shows you how to run all parts of the Job Application Assistant.

---

## 📋 Prerequisites

- ✅ Node.js (v18+)
- ✅ Docker Desktop (for PostgreSQL)
- ✅ API Keys: OpenAI, Anthropic (Grok optional)

---

## Step 1: Setup Database

### Start PostgreSQL Container

```bash
# Start Docker container
docker compose up -d

# Wait a few seconds for it to start
sleep 5

# Verify it's running
docker ps | grep mcp-cole-pg-test
```

### Initialize Database Schema

```bash
# Run database migration
./setup-database.sh
```

This creates all tables and inserts sample data.

### (Optional) Fetch Real Jobs from Rise API

```bash
# Fetch 50 real jobs from Rise API
npm run fetch-jobs
```

---

## Step 2: Configure Environment Variables

Make sure `.dev.vars` has all required keys:

```bash
# Check your .dev.vars file
cat .dev.vars
```

Required variables:
- `DATABASE_URL` ✅
- `OPENAI_API_KEY` ✅
- `ANTHROPIC_API_KEY` ✅
- `GROK_API_KEY` (optional)
- `GITHUB_CLIENT_ID` ✅
- `GITHUB_CLIENT_SECRET` ✅
- `COOKIE_ENCRYPTION_KEY` ✅

---

## Step 3: Run Backend MCP Server

Open a terminal and run:

```bash
npm run dev
```

This starts the MCP server on **http://localhost:8792**

You should see:
```
⬣ wrangler dev
[INFO] Ready on http://localhost:8792
```

**Keep this terminal open!**

---

## Step 4: Run Frontend

Open a **new terminal** and run:

```bash
cd frontend
npm install  # Only needed first time
npm run dev
```

This starts the frontend on **http://localhost:5173**

You should see:
```
  VITE v7.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

---

## Step 5: (Optional) Run Agents

Open a **third terminal** (optional) to run the AI agents:

```bash
npm run agents:job
```

This will:
- Agent 1: Score jobs and create recommendations
- Agent 2: Generate CVs for draft applications
- Agent 3: Track applications and generate insights

**Note**: Agents can run independently - they don't need the frontend or MCP server to be running.

---

## 🎯 Quick Start (All at Once)

### Terminal 1: Database + Backend
```bash
# Start database
docker compose up -d
sleep 5
./setup-database.sh

# Start MCP server
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

---

## 🌐 Access the Application

1. **Frontend**: Open **http://localhost:5173**
   - Landing page → Click "Get Started"
   - Complete onboarding (10 questions)
   - View dashboard with job recommendations

2. **MCP Server**: **http://localhost:8792**
   - `/mcp` - MCP protocol endpoint
   - `/authorize` - OAuth authorization
   - Use MCP Inspector to test tools

3. **Agents**: Check terminal output
   - See job scoring in real-time
   - View CV generation progress
   - See application tracking insights

---

## ✅ Verify Everything Works

### Check Database
```bash
# See jobs
docker exec mcp-cole-pg-test psql -U mcp_user -d mcp_database -c "SELECT COUNT(*) FROM job_listings WHERE is_active = true;"

# See recommendations
docker exec mcp-cole-pg-test psql -U mcp_user -d mcp_database -c "SELECT COUNT(*) FROM job_recommendations;"
```

### Check Frontend
- Open http://localhost:5173
- Should see landing page
- Complete onboarding flow

### Check Backend
- Open http://localhost:8792/mcp
- Should see OAuth error (expected - need to authorize first)

---

## 🔧 Troubleshooting

### Port Already in Use

**Port 8792 (MCP Server)**:
```bash
lsof -ti:8792 | xargs kill
```

**Port 5173 (Frontend)**:
```bash
lsof -ti:5173 | xargs kill
```

**Port 5432 (PostgreSQL)**:
```bash
docker compose down
docker compose up -d
```

### Database Not Connected

```bash
# Check if PostgreSQL is running
docker ps | grep mcp-cole-pg-test

# Restart if needed
docker compose restart
```

### Frontend Not Loading

```bash
cd frontend
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Agents Not Running

```bash
# Check API keys in .dev.vars
cat .dev.vars | grep API_KEY

# Verify database connection
docker exec mcp-cole-pg-test psql -U mcp_user -d mcp_database -c "SELECT 1;"
```

---

## 📊 What to Expect

### First Time Setup:
1. ✅ Database initialized with 20 sample jobs (+ 68 real jobs if you ran `fetch-jobs`)
2. ✅ MCP server running on port 8792
3. ✅ Frontend running on port 5173
4. ✅ Agents ready to score jobs

### After Onboarding:
1. ✅ User profile saved
2. ✅ Agents can score jobs for your profile
3. ✅ Dashboard shows job recommendations
4. ✅ Can create applications

### After Running Agents:
1. ✅ Job recommendations in database
2. ✅ Market insights generated
3. ✅ CVs/cover letters ready (if you created applications)
4. ✅ Application tracking insights

---

## 🎯 Typical Workflow

1. **Start everything**:
   ```bash
   # Terminal 1
   docker compose up -d && ./setup-database.sh && npm run dev
   
   # Terminal 2
   cd frontend && npm run dev
   ```

2. **Complete onboarding**:
   - Go to http://localhost:5173
   - Answer 10 questions
   - See dashboard

3. **Run agents** (optional):
   ```bash
   # Terminal 3
   npm run agents:job
   ```

4. **View results**:
   - Refresh dashboard to see job recommendations
   - Click "View Details" on jobs
   - Click "I'm Interested" to create application

---

## 📝 Quick Commands Reference

```bash
# Database
docker compose up -d              # Start PostgreSQL
./setup-database.sh              # Initialize schema
npm run fetch-jobs               # Fetch real jobs from Rise API

# Backend
npm run dev                      # Start MCP server (port 8792)

# Frontend
cd frontend && npm run dev       # Start frontend (port 5173)

# Agents
npm run agents:job               # Run all 3 agents

# Check status
docker ps                        # See running containers
docker exec mcp-cole-pg-test psql -U mcp_user -d mcp_database -c "SELECT COUNT(*) FROM job_listings;"
```

---

**🎉 You're all set! Start with Terminal 1 (database + backend), then Terminal 2 (frontend).**

