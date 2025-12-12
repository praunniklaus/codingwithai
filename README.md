# Job Application Assistant – Multi-Agent MCP Server

This project runs three agents that collaborate to help with job applications:
- **Job Hunter** (OpenAI) – finds and scores relevant jobs
- **CV Crafter** (Anthropic) – drafts tailored CVs and cover letters
- **Application Tracker** (Grok) – tracks application status and creates insights/reminders

It is built on Cloudflare Workers (MCP server) with a PostgreSQL backend and a React frontend.

## Quick Start

1) Install dependencies  
```bash
npm install
```

2) Start PostgreSQL and load schema/data  
```bash
./setup-database.sh
```

3) Run the MCP worker (for API/Inspector)  
```bash
npm run dev
```

4) Run the agents (Node)  
```bash
npm run agents:start
```

5) Frontend (optional)  
```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

## Environment

Set in `.dev.vars`:
- `DATABASE_URL` PostgreSQL connection string
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GROK_API_KEY` (or `XAI_API_KEY`)
- `TARGET_USER_ID` (defaults to `samuel_student`)

## Project Structure

```
src/
  index.ts                 # Cloudflare Worker MCP server
  tools/                   # MCP tools (profiles, jobs, applications, CVs, insights)
  agents/                  # Job agents + shared LLM helpers
scripts/
  run-job-agents.ts        # Node agent runner
setup-database.sh          # Starts Postgres container and applies schema
setup-job-assistant.sql    # Database schema + seed data
frontend/                  # React UI
pyagents/                  # Python implementation of the job agents (optional)
```

## MCP Endpoints

- Dev (no OAuth): `POST http://localhost:8792/mcp-dev`
- Auth: `POST http://localhost:8792/mcp`

Tools include user profile CRUD, job search, application management, CV/cover-letter generation (deterministic text), recommendations, and insights.

## Tests

```bash
npm test
```

## Notes

- `setup-database.sh` applies the job schema from `setup-job-assistant.sql`.
- The LLM helper uses lightweight heuristics for scoring and document generation to avoid blocking on external calls during local runs.
