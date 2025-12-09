# Job Application Assistant - Docker Sandbox Setup Guide

This guide explains how to run the Job Application Assistant AI agents with AgentBound Docker sandbox protection.

## Overview

The Job Application Assistant consists of 3 autonomous AI agents that work with a PostgreSQL database:

1. **Job Hunter Agent** (OpenAI) - Searches and scores job matches
2. **CV Crafter Agent** (Claude) - Generates tailored CVs and cover letters
3. **Application Tracker Agent** (Grok) - Tracks applications and generates insights

Each agent can run in a Docker-sandboxed environment for enhanced security.

## Prerequisites

### Required
- Python 3.10+
- PostgreSQL 15+ database (running and initialized with schema)
- Docker Desktop (for sandbox mode)
- API Keys:
  - OpenAI API key
  - Anthropic API key
  - Grok/xAI API key (optional)

### Database Setup

Ensure your PostgreSQL database is running with the job application schema initialized:

```bash
# Using Docker Compose (recommended)
docker-compose up -d

# Or connect to your existing PostgreSQL
psql -U your_user -d job_application -f setup-job-application.sql
```

Database connection string format:
```
postgresql://username:password@host:port/database
```

## Installation

### 1. Clone/Navigate to Project
```bash
cd /path/to/codingwithai
```

### 2. Create Python Virtual Environment

**Linux/macOS/WSL2:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

**Windows PowerShell:**
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

### 3. Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

This installs:
- `openai>=1.50.0` - OpenAI API SDK
- `anthropic>=0.39.0` - Anthropic Claude API SDK  
- `psycopg[binary]>=3.2.0` - PostgreSQL async driver
- `mcp_sandbox_openai_sdk` - AgentBound Docker sandbox (from GitHub)
- `openai-agents-python` - OpenAI Agents SDK (from GitHub)

### 4. Configure Environment Variables

Create a `.dev.vars` file in the project root:

```bash
# Linux/macOS/WSL2
cat > .dev.vars << 'EOF'
DATABASE_URL=postgresql://username:password@localhost:5432/job_application
OPENAI_API_KEY=sk-proj-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here
GROK_API_KEY=xai-your-key-here
TARGET_USER_ID=samuel_student
EOF
```

**Windows PowerShell:**
```powershell
@'
DATABASE_URL=postgresql://username:password@localhost:5432/job_application
OPENAI_API_KEY=sk-proj-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here
GROK_API_KEY=xai-your-key-here
TARGET_USER_ID=samuel_student
'@ | Out-File -Encoding UTF8 .dev.vars
```

**Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string (**required**)
- `OPENAI_API_KEY` - For Job Hunter agent (**required**)
- `ANTHROPIC_API_KEY` - For CV Crafter agent (**required**)
- `GROK_API_KEY` - For Application Tracker agent (optional, falls back gracefully)
- `TARGET_USER_ID` - User profile to process (default: `samuel_student`)

### 5. Verify Docker (For Sandbox Mode)

```bash
# Check Docker is running
docker ps

# Should show no error (empty list is OK)
```

## Running the Agents

### Option 1: Without Sandbox (Direct Execution)

Simpler, faster, no Docker required:

```bash
# Activate venv
source .venv/bin/activate  # Linux/macOS/WSL2
# or
.venv\Scripts\Activate.ps1  # Windows

# Run agents
python scripts/run_job_agents.py
```

**Behavior:**
- Agents connect directly to database
- Tool calls execute in-process
- Faster (~100ms per operation)
- No isolation layer

### Option 2: With Sandbox (Docker Isolation)

Enhanced security with Docker container isolation:

**Linux/macOS/WSL2:**
```bash
USE_SANDBOX=true python scripts/run_job_agents.py
```

**Windows PowerShell:**
```powershell
$env:USE_SANDBOX='true'; python scripts\run_job_agents.py
```

**First Run - Permission Grants:**

You'll be prompted to grant runtime permissions for each agent:

```
Runtime Permission: File System Access Permission
Allow access to file system path: /path/to/codingwithai (read: True, write: True)
Do you want to give the agent the requested access? (yes/no): yes

Runtime Permission: Network Access Permission
Allow access to network domain: api.openai.com (port: 443)
Do you want to give the agent the requested access? (yes/no): yes

Runtime Permission: Network Access Permission
Allow access to network domain: api.anthropic.com (port: 443)
Do you want to give the agent the requested access? (yes/no): yes

Runtime Permission: Environment Variable Access Permission
Allow (read) access to environment variable: OPENAI_API_KEY
Do you want to give the agent the requested access? (yes/no): yes

Runtime Permission: Environment Variable Access Permission
Allow (read) access to environment variable: DATABASE_URL
Do you want to give the agent the requested access? (yes/no): yes
```

Type `yes` for each permission. These grants are needed because:
- **Filesystem**: Mount project code into Docker container
- **Network**: Allow API calls to OpenAI/Anthropic/Grok
- **Environment**: Pass credentials to sandboxed MCP server

**Expected Behavior:**
- Docker containers created/destroyed automatically per agent
- Tool calls show `[Sandbox] Executing {tool} in Docker container`
- Operations isolated in containers
- Slightly slower (~1-2 seconds per operation due to Docker overhead)

## Agent Workflow

### Automatic Iterations

Agents run continuously in a loop:

```
==========================================================
ITERATION 1
==========================================================

🔍 Job Hunter (openai) - Turn 1
   👤 Analyzing profile for: Samuel Student
   📋 Found 50 job listings
   🤔 Scoring: Software Engineer at TechCorp...
   ✅ Recommended (85/100): Software Engineer
   ✅ Turn complete! Scored 50 jobs, recommended 12

📝 CV Crafter (anthropic) - Turn 1
   📋 Found 3 draft applications
   📝 Generating CV for: Frontend Developer at StartupXYZ
   ✅ CV saved (ID: 45)
   📧 Cover letter saved (ID: 23)
   ✅ Turn complete! Generated 3 CVs, 3 cover letters

📊 Application Tracker (grok) - Turn 1
   📋 Found 15 active applications
   🔄 Processing: Frontend Developer at StartupXYZ
   ✅ Updated status to 'interview_scheduled'
   📊 Generated 5 insights
   ✅ Turn complete!

Press Ctrl+C to stop
```

### Iteration Flow

Each iteration:
1. **Job Hunter** searches and scores jobs, adds recommendations (score ≥ 60)
2. **CV Crafter** generates CVs/cover letters for recommended jobs
3. **Application Tracker** updates statuses and generates insights

Agents run in parallel per iteration for efficiency.

## Security Features (Sandbox Mode)

AgentBound provides:

- **Process Isolation**: Each tool executes in a separate Docker container
- **Filesystem Restrictions**: Only project workspace accessible (read/write)
- **Network Allowlist**: Only approved domains (OpenAI, Anthropic, xAI)
- **Environment Variable Control**: Explicit permission for each variable
- **User Consent**: Runtime prompts for all access requests
- **Ephemeral Containers**: Auto-removal after execution
- **Database Isolation**: Sandboxed MCP server handles DB operations

## Troubleshooting

### Database Connection Errors

**Error:** `connection refused` or `could not connect to server`

**Solutions:**
```bash
# Check PostgreSQL is running
docker ps | grep postgres
# or
pg_isready -h localhost -p 5432

# Test connection manually
psql "postgresql://username:password@localhost:5432/job_application"

# Verify DATABASE_URL in .dev.vars
echo $DATABASE_URL
```

### Docker Not Available (Sandbox Mode)

**Error:** `[Sandbox] AgentBound SDK not available, falling back to in-process`

**Solution:**
```bash
# Start Docker Desktop (GUI application)
# or on Linux:
sudo systemctl start docker

# Verify:
docker ps
```

Agents will gracefully fall back to in-process execution if Docker unavailable.

### Win32 Error (Windows Native)

**Error:** `[WinError 193] %1 ist keine zulässige Win32-Anwendung`

**Solution:** Use WSL2 instead of Windows native PowerShell:

```bash
# In WSL2 terminal:
cd /mnt/c/Users/your-username/path/to/codingwithai
source .venv/bin/activate
USE_SANDBOX=true python scripts/run_job_agents.py
```

AgentBound has better compatibility with Linux environments.

### API Key Errors

**Error:** Agents report authentication failures

**Solutions:**
```bash
# Verify keys are set
echo $OPENAI_API_KEY
echo $ANTHROPIC_API_KEY

# Check .dev.vars file exists and has correct format
cat .dev.vars

# Reload environment
source .venv/bin/activate
python scripts/run_job_agents.py
```

### Import Errors

**Error:** `ModuleNotFoundError: No module named 'psycopg'`

**Solution:**
```bash
# Ensure venv is activated
source .venv/bin/activate  # Linux/macOS/WSL2
# or
.venv\Scripts\Activate.ps1  # Windows

# Reinstall dependencies
pip install -r requirements.txt
```

### Sandbox Connection Timeout

**Error:** `[Sandbox] Docker execution failed: Connection closed`

**Solutions:**
1. Increase Docker resources (CPU/Memory) in Docker Desktop settings
2. Check Docker logs: `docker logs <container_id>`
3. Verify DATABASE_URL is accessible from container:
   ```bash
   # If using localhost, try host.docker.internal:
   DATABASE_URL=postgresql://user:pass@host.docker.internal:5432/db
   ```

## Performance Notes

### Without Sandbox
- Agent iteration: ~5-15 seconds (depends on LLM response time)
- Tool call overhead: <100ms
- Memory: ~150-250 MB

### With Sandbox
- Agent iteration: ~8-20 seconds (includes Docker overhead)
- Tool call overhead: ~1-2 seconds per call (container lifecycle)
- Memory: ~300-500 MB (Docker + Python + containers)
- First tool call slower (~3-5 seconds, container startup)

## Database Schema

The agents expect these tables:

- `user_profiles` - User skills, experience, education
- `job_listings` - Available job postings
- `job_recommendations` - Agent-scored matches
- `applications` - User applications tracking
- `generated_cvs` - AI-generated CVs
- `cover_letters` - AI-generated cover letters
- `agent_insights` - Agent observations and suggestions

See `setup-job-application.sql` for full schema.

## Stopping the Agents

```bash
# Graceful shutdown
Ctrl+C

# Agents will:
# 1. Complete current iteration
# 2. Disconnect from database
# 3. Clean up Docker containers (sandbox mode)
# 4. Exit
```

## Advanced Usage

### Custom Agent Configuration

Edit `scripts/run_job_agents.py` to customize:
- LLM models (e.g., `gpt-4o`, `claude-3-5-sonnet-20241022`)
- Target user ID
- Iteration delays
- Agent personalities

### Running Single Agent

Modify `scripts/run_job_agents.py` main loop to comment out unwanted agents.

### Monitoring Docker Containers

```bash
# List containers (ephemeral, may not persist)
docker ps

# View container logs
docker logs <container_id>

# Inspect running sandbox
docker inspect <container_id>
```

## Architecture

### Without Sandbox
```
Python Script (scripts/run_job_agents.py)
    ↓
Agent Classes (job_hunter_agent.py, etc.)
    ↓
Database Client (job_database_client.py)
    ↓
PostgreSQL Database
    ↓
LLM Providers (OpenAI/Anthropic/Grok)
```

### With Sandbox (Docker Isolation)
```
Python Script (scripts/run_job_agents.py)
    ↓
Agent Classes with Sandbox Wrapper
    ↓
AgentBound SDK (SandboxedMCPStdio)
    ↓
Docker Container (Linux environment)
    ├── MCP Server (job_mcp_server.py)
    ├── Database Client
    ├── Restricted Network Access
    └── Isolated Filesystem
    ↓
PostgreSQL Database + LLM APIs
```

## Resources

- [AgentBound GitHub](https://github.com/GuardiAgent/python-mcp-sandbox-openai-sdk)
- [MCP Protocol](https://modelcontextprotocol.io)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [PostgreSQL Docker](https://hub.docker.com/_/postgres)

## Quick Reference

### Activate venv (every session)
```bash
source .venv/bin/activate  # Linux/macOS/WSL2
.venv\Scripts\Activate.ps1  # Windows
```

### Run without sandbox
```bash
python scripts/run_job_agents.py
```

### Run with sandbox
```bash
USE_SANDBOX=true python scripts/run_job_agents.py  # Linux/macOS/WSL2
$env:USE_SANDBOX='true'; python scripts\run_job_agents.py  # Windows
```

### Check database connection
```bash
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM user_profiles;"
```

### View agent logs
```bash
# Agents log to stdout, redirect to file:
python scripts/run_job_agents.py 2>&1 | tee agent_logs.txt
```

---

**Tested on:** Linux (Ubuntu 22.04), macOS 13+, Windows 11 WSL2

**Questions?** Check main [README.md](README.md) or open an issue.
