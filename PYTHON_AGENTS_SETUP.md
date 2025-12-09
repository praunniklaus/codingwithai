# Python Agents with Sandboxing Setup

## Overview

The Job Application Assistant agents have been converted from TypeScript to Python with AgentBound Docker sandboxing support. This provides the same functionality as the TypeScript version but with enhanced security through sandbox isolation.

## Architecture

### Components

1. **Database Client** (`pyagents/job_database_client.py`)
   - PostgreSQL client using `psycopg`
   - All database operations for job applications

2. **LLM Providers** (`pyagents/job_llm_providers.py`)
   - Supports OpenAI, Anthropic (Claude), and Grok (xAI)
   - Methods: `score_job_match`, `generate_cv`, `generate_cover_letter`, `analyze_applications`

3. **Agents**:
   - **Job Hunter** (`pyagents/job_hunter_agent.py`) - OpenAI
   - **CV Crafter** (`pyagents/cv_crafter_agent.py`) - Anthropic
   - **Application Tracker** (`pyagents/application_tracker_agent.py`) - Grok

4. **Sandbox Tools** (`pyagents/job_sandbox_tools.py`)
   - Wraps tool calls in Docker containers via AgentBound
   - Falls back to in-process execution if sandbox unavailable

5. **MCP Server** (`pyagents/job_mcp_server.py`)
   - Runs inside Docker container
   - Handles tool execution requests

## Installation

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

Required packages:
- `openai>=1.50.0`
- `anthropic>=0.39.0`
- `psycopg[binary]>=3.2.0`
- AgentBound SDK (from GitHub)
- OpenAI Agents SDK (from GitHub)

### 2. Install Docker (for sandboxing)

- **macOS**: Install Docker Desktop
- **Linux**: Install Docker Engine
- **Windows**: Use WSL2 (sandbox not fully supported on native Windows)

### 3. Configure Environment Variables

Ensure `.dev.vars` contains:
```
DATABASE_URL=postgresql://mcp_user:mcp_password@localhost:5432/mcp_database
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
GROK_API_KEY=xai-...
TARGET_USER_ID=samuel_student
```

## Usage

### Without Sandbox (Faster, Works Everywhere)

```bash
npm run agents:python
# or
python scripts/run_job_agents.py
```

### With Sandbox (Secure, Linux/macOS/WSL2)

```bash
npm run agents:python:sandbox
# or
USE_SANDBOX=true python scripts/run_job_agents.py
```

## How It Works

### Without Sandbox

1. Agents connect directly to PostgreSQL
2. Tool calls execute in-process
3. Fast execution (<100ms per tool call)
4. No isolation

### With Sandbox

1. Agents connect to PostgreSQL
2. Tool calls routed through AgentBound SDK
3. Each tool executes in isolated Docker container
4. Filesystem, network, and environment restrictions
5. Slower execution (~1-2 seconds per tool call)
6. Strong security guarantees

## Sandbox Features

- **Process Isolation**: Each tool executes in separate Docker container
- **Filesystem Restrictions**: Only workspace directory accessible
- **Network Allowlist**: Only approved domains (OpenAI, Anthropic, xAI)
- **Environment Variable Control**: Explicit permission for each variable
- **Ephemeral Containers**: Auto-removal after execution

## Agent Behavior

### Job Hunter Agent (OpenAI)
- Fetches user profile
- Scores jobs 0-100 using LLM
- Creates recommendations (score >= 60)
- Generates market insights

### CV Crafter Agent (Anthropic)
- Finds draft applications
- Generates tailored CVs
- Generates cover letters
- Analyzes skill gaps
- Updates application status

### Application Tracker Agent (Grok)
- Monitors all applications
- Identifies stale applications (7+ days)
- Calculates success metrics
- Generates insights using LLM
- Creates follow-up reminders

## Troubleshooting

### Sandbox Fails to Initialize

```
[Sandbox] AgentBound SDK not available, falling back to in-process
```

**Note**: This is expected and not an error! The agents will work fine without sandboxing. Sandboxing requires:
1. Docker installed and running
2. AgentBound SDK properly installed (may require additional setup)
3. Proper permissions configured

**To enable sandboxing** (optional):
```bash
# Install packaging first (required for AgentBound SDK build)
pip install --upgrade packaging

# Install AgentBound SDK
pip install git+https://github.com/GuardiAgent/python-mcp-sandbox-openai-sdk.git

# Run with sandbox
USE_SANDBOX=true python scripts/run_job_agents.py
```

**Note**: If AgentBound SDK import fails, agents will automatically fall back to in-process execution (no sandboxing). This is safe for development.

### Docker Not Found

**Solution**: Install Docker Desktop (macOS) or Docker Engine (Linux)

### Database Connection Errors

**Solution**: Ensure PostgreSQL is running and `DATABASE_URL` is correct:
```bash
docker ps | grep postgres
```

### Missing API Keys

**Solution**: Add API keys to `.dev.vars`:
```
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
GROK_API_KEY=xai-...
```

## Migration from TypeScript

The TypeScript agents (`src/agents/`) are still available but deprecated. The Python agents provide:

✅ Same functionality
✅ Sandboxing support
✅ Better security
✅ Same database schema
✅ Compatible with existing frontend

## Next Steps

1. Test agents: `npm run agents:python`
2. Enable sandbox: `npm run agents:python:sandbox`
3. Monitor logs for agent activity
4. Check database for recommendations, CVs, and insights

## Files Created

- `pyagents/job_database_client.py` - Database operations
- `pyagents/job_llm_providers.py` - LLM integrations
- `pyagents/job_hunter_agent.py` - Job Hunter agent
- `pyagents/cv_crafter_agent.py` - CV Crafter agent
- `pyagents/application_tracker_agent.py` - Application Tracker agent
- `pyagents/job_sandbox_tools.py` - Sandbox wrapper
- `pyagents/job_mcp_server.py` - MCP server for sandbox
- `scripts/run_job_agents.py` - Main run script

## Notes

- Frontend remains in TypeScript (no changes needed)
- MCP tools still work via TypeScript server
- Python agents run independently
- Both TypeScript and Python agents can run simultaneously (different processes)

