# 📚 Complete Setup & Run Guide - macOS & WSL

A comprehensive guide to set up and run the **Job Application Assistant** on macOS and WSL (Windows Subsystem for Linux).

---

## Table of Contents

1. [Platform Prerequisites](#platform-prerequisites)
2. [Project Setup](#project-setup)
3. [Database Setup](#database-setup)
4. [Configuration](#configuration)
5. [Running the Application](#running-the-application)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)
8. [Quick Command Reference](#quick-command-reference)

---

## Platform Prerequisites

### macOS

#### 1. Install Homebrew (if not already installed)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

#### 2. Install Required Tools
```bash
# Install Node.js (v18+)
brew install node

# Install Python (3.10+)
brew install python3

# Install Docker Desktop
brew install --cask docker

# Start Docker Desktop
open /Applications/Docker.app
```

#### 3. Verify Installation
```bash
node --version        # Should be v18+
python3 --version     # Should be 3.10+
docker --version      # Should be 24+
git --version         # Should be 2.30+
```

---

### WSL2 (Windows)

#### 1. Enable WSL2 and Install Ubuntu

Open PowerShell as Administrator and run:

```powershell
wsl --install -d Ubuntu-22.04
```

After installation, restart your computer and launch Ubuntu from the Start menu.

#### 2. Update Ubuntu Packages

```bash
sudo apt update && sudo apt upgrade -y
```

#### 3. Install Required Tools

```bash
# Install Node.js (v18+)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python (3.10+)
sudo apt install -y python3 python3-venv python3-pip

# Install Git
sudo apt install -y git

# Install Docker (or use Docker Desktop for WSL2)
sudo apt install -y docker.io
sudo usermod -aG docker $USER
newgrp docker
```

#### 4. Install Docker Desktop for WSL2

1. Download [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
2. Install it
3. Open Docker Desktop → Settings → Resources → WSL Integration
4. Enable integration with Ubuntu-22.04

#### 5. Verify Installation

```bash
node --version        # Should be v18+
python3 --version     # Should be 3.10+
docker --version      # Should be 24+
git --version         # Should be 2.30+
```

---

## Project Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd codingwithai
```

### 2. Install Node Dependencies

```bash
npm install
```

This installs all JavaScript/TypeScript dependencies for the backend and frontend.

### 3. Create Python Virtual Environment

**macOS/WSL2/Linux:**

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
```

**Windows PowerShell (if not using WSL):**

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

### 4. Install Python Dependencies

```bash
pip install -r requirements.txt
```

This installs:
- `openai>=1.50.0` - OpenAI API SDK
- `anthropic>=0.39.0` - Anthropic Claude SDK
- `psycopg[binary]>=3.2.0` - PostgreSQL async driver
- `mcp_sandbox_openai_sdk` - Docker sandbox support (optional)
- Other agents and utilities

---

## Database Setup

### 1. Start PostgreSQL Container

```bash
# Start Docker container (runs in background)
docker compose up -d

# Wait for database to be ready (optional but recommended)
sleep 5

# Verify it's running
docker ps | grep mcp-cole-pg-test
```

You should see output like:
```
CONTAINER ID   IMAGE                 PORTS
abc123def456   postgres:15-alpine    0.0.0.0:5432->5432/tcp
```

### 2. Initialize Database Schema

```bash
# Run the database migration script
./setup-database.sh
```

This script:
- Creates all required tables (`user_profiles`, `job_listings`, `applications`, etc.)
- Inserts sample data (user profile, 20 job listings)
- Initializes the database schema

### 3. Verify Database Setup

```bash
# Connect to the database and list tables
docker exec mcp-cole-pg-test psql -U mcp_user -d mcp_database -c "\dt"
```

You should see:
```
            List of relations
 Schema |        Name        | Type  | Owner
--------+--------------------+-------+---------
 public | applications       | table | mcp_user
 public | job_listings       | table | mcp_user
 public | job_recommendations| table | mcp_user
 public | user_profiles      | table | mcp_user
 ...
```

### 4. (Optional) Fetch Real Jobs

To populate the database with real job listings from the Rise API:

```bash
npm run fetch-jobs
```

This fetches ~50 real job listings and inserts them into the database.

---

## Configuration

### 1. Create `.dev.vars` File

Create a `.dev.vars` file in the project root with your API keys:

**Using a text editor:**

Create a file named `.dev.vars` with the following content:

```env
# Database
DATABASE_URL=postgresql://mcp_user:mcp_password@localhost:5432/mcp_database

# LLM API Keys
OPENAI_API_KEY=sk-proj-your-openai-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here
GROK_API_KEY=xai-your-grok-key-here

# Optional Settings
TARGET_USER_ID=samuel_student
COOKIE_ENCRYPTION_KEY=your-32-byte-encryption-key-here-change-me
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

**Or using command line (macOS/WSL2/Linux):**

```bash
cat > .dev.vars << 'EOF'
DATABASE_URL=postgresql://mcp_user:mcp_password@localhost:5432/mcp_database
OPENAI_API_KEY=sk-proj-your-openai-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here
GROK_API_KEY=xai-your-grok-key-here
TARGET_USER_ID=samuel_student
COOKIE_ENCRYPTION_KEY=your-32-byte-encryption-key-here-change-me
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
EOF
```

### 2. Get API Keys

You'll need to obtain API keys from these services:

#### OpenAI (Required)
1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key and paste into `.dev.vars`

#### Anthropic (Required)
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create a new API key
3. Copy the key and paste into `.dev.vars`

#### Grok/xAI (Optional)
1. Go to [xAI Platform](https://platform.x.ai/)
2. Create a new API key
3. Copy the key and paste into `.dev.vars`

### 3. Verify Configuration

```bash
# Check that .dev.vars exists
ls -la .dev.vars

# Check that it contains required keys (don't print actual values)
grep -c "OPENAI_API_KEY" .dev.vars && echo "✅ OpenAI key found"
grep -c "ANTHROPIC_API_KEY" .dev.vars && echo "✅ Anthropic key found"
```

---

## Running the Application

The application has multiple components that need to run together. Start them in this order:

### Step 1: Database (Already Running)

The database should already be running from the setup step:

```bash
# Verify PostgreSQL is running
docker ps | grep mcp-cole-pg-test
```

### Step 2: Start Backend MCP Server

Open a **new terminal** and run:

```bash
npm run dev
```

You should see:
```
⬣ wrangler dev
[INFO] Ready on http://localhost:8792
```

**Keep this terminal open!** The MCP server provides the backend API.

### Step 3: Start Frontend (Optional)

Open a **new terminal** and run:

```bash
cd frontend
npm install  # Only needed once
npm run dev
```

You should see:
```
  VITE v5.0.0  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

### Step 4: Run Python Agents (Optional)

Python agents are optional and provide intelligent job hunting, CV generation, and more.

Open a **new terminal** and activate your Python environment:

```bash
source .venv/bin/activate  # macOS/WSL2/Linux
# or
.venv\Scripts\Activate.ps1  # Windows PowerShell
```

#### Option A: With Docker Sandbox (Recommended)

Run agents in isolated Docker containers for security:

```bash
# First, build the Docker image
./setup-sandbox.sh

# Then run agents with sandbox enabled
USE_SANDBOX=true python scripts/run_job_agents.py
```

**Note:** On first run, you may be prompted to approve permissions (filesystem, network, environment variables). Approve them to continue.

#### Option B: Without Sandbox (Fallback)

If Docker sandbox fails or isn't available, run agents directly:

```bash
python scripts/run_job_agents.py
```

You should see:
```
💼 Job Application Assistant - Multi-Agent System
============================================================
Database: Connected
Target User: samuel_student
============================================================
```

---

## Verification

### 1. Check Database Connection

In the backend terminal (where `npm run dev` is running), you should see queries being logged when agents or frontend interact with the database.

### 2. Check Frontend

Open your browser and navigate to [http://localhost:5173](http://localhost:5173)

You should see:
- "Job Application Assistant" header
- "Get Started" button
- Dashboard with job recommendations

### 3. Check Agents

If agents are running, the terminal should show:
```
💼 Job Application Assistant - Multi-Agent System
Database: Connected
[Agent] Job Hunter Agent initialized
[Agent] CV Crafter Agent initialized
[Agent] Application Tracker Agent initialized
```

### 4. Test Full Workflow

1. Go to [http://localhost:5173](http://localhost:5173)
2. Click "Get Started"
3. Complete the onboarding form
4. View dashboard with job recommendations
5. Watch the agents work in their terminal window

---

## Troubleshooting

### Docker Issues

#### Docker not running

**macOS:**
```bash
open /Applications/Docker.app
# Wait for "Docker is running" in menu bar
```

**WSL2:**
```bash
sudo service docker start
```

#### Permission Denied (Docker)

```bash
# Add current user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker ps
```

#### Container fails to start

```bash
# Check Docker logs
docker logs mcp-cole-pg-test

# Restart container
docker compose down
docker compose up -d
```

### Database Issues

#### Connection Refused

Check if database is running and accessible:

```bash
# Check if container is running
docker ps | grep mcp-cole-pg-test

# If not running, start it
docker compose up -d

# Test connection
psql -h localhost -U mcp_user -d mcp_database -c "SELECT 1"
```

#### Database tables don't exist

Re-run the setup script:

```bash
./setup-database.sh
```

### Python Issues

#### ModuleNotFoundError

Make sure virtual environment is activated:

```bash
source .venv/bin/activate  # macOS/WSL2/Linux
.venv\Scripts\Activate.ps1  # Windows

# Reinstall dependencies
pip install -r requirements.txt
```

#### API Key not found

Ensure `.dev.vars` exists and contains the required keys:

```bash
cat .dev.vars | grep OPENAI_API_KEY
cat .dev.vars | grep ANTHROPIC_API_KEY
```

If empty, add your keys and try again.

### Agent Sandbox Issues

#### Sandbox initialization fails

This is expected behavior. Agents will automatically fall back to non-sandboxed mode.

To fix and enable sandbox:

```bash
# Install Docker (if not already done)
# Already covered in platform prerequisites

# Build sandbox image
./setup-sandbox.sh

# Run with sandbox enabled
USE_SANDBOX=true python scripts/run_job_agents.py
```

#### Docker exec timeout

If agents timeout connecting to the database through Docker:

Update your `.dev.vars`:

```env
# For agents running in Docker containers, use host.docker.internal
DATABASE_URL=postgresql://mcp_user:mcp_password@host.docker.internal:5432/mcp_database
```

### Node Issues

#### npm command not found

Reinstall Node.js:

**macOS:**
```bash
brew install node
```

**WSL2:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

#### Port already in use

If port 8792 (backend) or 5173 (frontend) is already in use:

**Find what's using the port:**

```bash
# macOS/WSL2
lsof -i :8792  # For backend
lsof -i :5173  # For frontend
```

**Kill the process:**

```bash
kill -9 <PID>
```

Or use different ports:

```bash
# For frontend, modify vite.config.ts and specify port
# For backend, use: npm run dev -- --port 8793
```

---

## Quick Command Reference

### Essential Commands

```bash
# Start everything from scratch
docker compose up -d              # Start database
npm install                       # Install dependencies
./setup-database.sh               # Initialize database
npm run dev                       # Start backend (Terminal 1)
cd frontend && npm run dev        # Start frontend (Terminal 2)
source .venv/bin/activate         # Activate Python env (Terminal 3)
python scripts/run_job_agents.py  # Start agents (Terminal 3)
```

### Database Commands

```bash
# Start database
docker compose up -d

# Stop database
docker compose down

# View logs
docker logs mcp-cole-pg-test

# Connect to database
docker exec -it mcp-cole-pg-test psql -U mcp_user -d mcp_database

# Reset database
docker compose down
docker volume rm codingwithai_postgres_data
docker compose up -d
./setup-database.sh
```

### Backend Commands

```bash
# Start development server
npm run dev

# Type check
npm run type-check

# Run tests
npm test

# Run specific agents
npm run agents:start         # Node agents
npm run agents:python        # Python agents (non-sandboxed)
npm run agents:python:sandbox  # Python agents (with Docker sandbox)
```

### Frontend Commands

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Python Commands

```bash
# Activate environment
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run agents
python scripts/run_job_agents.py

# Run with sandbox
USE_SANDBOX=true python scripts/run_job_agents.py

# Run API server
python scripts/api_server.py
```

### Data Management

```bash
# Fetch real jobs from Rise API
npm run fetch-jobs

# Create sample recommendations
npm run create-recommendations
```

---

## Additional Resources

- **Project README:** See [README.md](README.md) for project overview
- **How to Run:** See [HOW_TO_RUN.md](HOW_TO_RUN.md) for detailed run instructions
- **Job Assistant Setup:** See [JOB_ASSISTANT_SETUP.md](JOB_ASSISTANT_SETUP.md) for job-specific features
- **Sandbox Setup:** See [SANDBOX_SETUP_JOB_AGENTS.md](SANDBOX_SETUP_JOB_AGENTS.md) for Docker sandbox details
- **Python Agents:** See [PYTHON_AGENTS_SETUP.md](PYTHON_AGENTS_SETUP.md) for Python agent configuration

---

## Support

If you encounter issues not covered in this guide:

1. Check the [Troubleshooting](#troubleshooting) section above
2. Review the individual setup guides referenced above
3. Check Docker and database logs for error messages
4. Ensure all prerequisite tools are installed and up-to-date

---

**Last Updated:** December 2024
