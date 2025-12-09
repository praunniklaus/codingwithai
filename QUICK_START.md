# 🚀 Quick Start Guide - Job Application Assistant

## Prerequisites

✅ **Database**: PostgreSQL container is running  
✅ **Environment**: `.dev.vars` file configured with API keys  
✅ **Dependencies**: `npm install` completed

## Step 1: Setup Database Schema

Run the database migration to create all new tables:

```bash
./setup-database.sh
```

This will:
- Load the new schema from `setup-job-assistant.sql`
- Create all job application tables
- Insert sample data (user profile, skills, 20 job listings)

**Verify it worked:**
```bash
docker exec mcp-cole-pg-test psql -U mcp_user -d mcp_database -c "\dt"
```

You should see tables like: `user_profiles`, `job_listings`, `applications`, `job_recommendations`, etc.

## Step 2: Run the Agents

Start the 3 autonomous agents:

```bash
npm run agents:job
```

Or directly:
```bash
tsx scripts/run-job-agents.ts
```

**What happens:**
- **Agent 1 (Job Hunter)**: Searches jobs, scores them (0-100), saves recommendations (score >= 60)
- **Agent 2 (CV Crafter)**: Finds draft applications, generates tailored CVs and cover letters
- **Agent 3 (Application Tracker)**: Monitors applications, identifies stale ones, generates insights

**Agent Iteration:**
- First iteration runs immediately
- Then runs every 5 minutes
- Press `Ctrl+C` to stop

## Step 3: (Optional) Run MCP Server

To expose the MCP tools via HTTP for clients like MCP Inspector:

```bash
npm run dev
```

This starts the MCP server on `http://localhost:8792`

**Then connect via:**
- MCP Inspector: `http://localhost:8792/mcp`
- Claude Desktop: Configure MCP server URL
- Any MCP client

## Step 4: Verify Everything Works

### Check Database Content

```bash
# Check user profile
docker exec mcp-cole-pg-test psql -U mcp_user -d mcp_database -c "SELECT * FROM user_profiles;"

# Check job listings
docker exec mcp-cole-pg-test psql -U mcp_user -d mcp_database -c "SELECT id, title, company FROM job_listings LIMIT 5;"

# Check recommendations (after agents run)
docker exec mcp-cole-pg-test psql -U mcp_user -d mcp_database -c "SELECT * FROM job_recommendations;"

# Check applications
docker exec mcp-cole-pg-test psql -U mcp_user -d mcp_database -c "SELECT * FROM applications;"

# Check insights
docker exec mcp-cole-pg-test psql -U mcp_user -d mcp_database -c "SELECT * FROM agent_insights ORDER BY created_at DESC LIMIT 5;"
```

### Check Agent Output

The agents will print logs showing:
- ✅ Job scoring results
- ✅ CV generation progress
- ✅ Application tracking insights
- ✅ Market trends analysis

## Troubleshooting

### Database Connection Error
```bash
# Check if PostgreSQL is running
docker ps | grep mcp-cole-pg-test

# Restart if needed
docker compose up -d
```

### Missing API Keys
Ensure `.dev.vars` has:
- `OPENAI_API_KEY` ✅
- `ANTHROPIC_API_KEY` ✅
- `GROK_API_KEY` ✅ (optional, but recommended)
- `DATABASE_URL` ✅

### Schema Not Loaded
```bash
# Manually load schema
docker exec -i mcp-cole-pg-test psql -U mcp_user -d mcp_database < setup-job-assistant.sql
```

### Agents Not Finding Jobs
- Check that job listings exist: `SELECT COUNT(*) FROM job_listings;`
- Verify user profile exists: `SELECT * FROM user_profiles WHERE user_id = 'samuel_student';`

## Expected Behavior

### First Iteration (Immediate)
1. **Job Hunter**: Scores ~20 jobs, saves ~5-10 recommendations
2. **CV Crafter**: No draft applications yet (will create them later)
3. **Application Tracker**: No applications yet (will track them later)

### After Creating Applications
1. Create an application manually or via MCP tool
2. **CV Crafter** will generate CV and cover letter
3. **Application Tracker** will monitor and generate insights

### Every 5 Minutes
- **Job Hunter** runs again, updates recommendations
- **CV Crafter** processes any new draft applications
- **Application Tracker** analyzes all applications

## Next Steps

1. **Create Applications**: Use MCP tools to create applications for recommended jobs
2. **View Recommendations**: Query `job_recommendations` table
3. **Check Insights**: View `agent_insights` for market trends and reminders
4. **Customize**: Modify agent behavior, scoring thresholds, iteration intervals

## Full Workflow Example

```bash
# 1. Setup database
./setup-database.sh

# 2. Start agents (in one terminal)
npm run agents:job

# 3. Start MCP server (in another terminal)
npm run dev

# 4. Use MCP Inspector to:
#    - Get user profile
#    - Search jobs
#    - Create applications
#    - View recommendations
#    - Check insights
```

---

**Ready to go!** 🎉 The agents will start working immediately.

