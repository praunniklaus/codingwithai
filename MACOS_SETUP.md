# macOS Setup and Running Guide

This guide walks you through setting up and running the Python comedy agents with optional AgentBound Docker sandbox on macOS.

## Prerequisites

### Required
- macOS 11.0+ (Big Sur or later)
- Python 3.10+ (check with `python3 --version`)
- Homebrew (for package management)

### Optional (for sandbox)
- Docker Desktop for Mac
- Git

## Installation Steps

### 1. Install Homebrew (if not already installed)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Install Python 3.10+ (if needed)
```bash
brew install python@3.11
```

Verify installation:
```bash
python3 --version
```

### 3. Install Docker Desktop (Optional - for sandbox)
Download and install [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop).

After installation:
1. Open Docker Desktop from Applications
2. Go to Preferences → Resources → File Sharing
3. Add your project directory (e.g., `/Users/your-username/Documents/codingwithai`)
4. Apply & Restart Docker

Verify Docker is running:
```bash
docker ps
# Should show no error
```

### 4. Clone or Navigate to Project
```bash
cd /path/to/codingwithai
# or clone:
# git clone <your-repo-url> codingwithai
# cd codingwithai
```

### 5. Create Python Virtual Environment
```bash
python3 -m venv .venv
source .venv/bin/activate
```

Verify activation (you should see `(.venv)` in your terminal prompt):
```bash
which python
# Should show: /path/to/codingwithai/.venv/bin/python
```

### 6. Upgrade pip and Install Dependencies
```bash
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

Expected installed packages:
- `openai>=1.50.0`
- `anthropic>=0.39.0`
- `mcp_sandbox_openai_sdk` (AgentBound from GitHub)
- `openai-agents-python` (OpenAI Agents SDK from GitHub)

### 7. Configure API Keys
Create a `.dev.vars` file in the project root:

```bash
cat > .dev.vars << 'EOF'
OPENAI_API_KEY=sk-proj-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here
GROK_API_KEY=xai-your-key-here
EOF
```

Or set as environment variables:
```bash
export OPENAI_API_KEY="sk-proj-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export GROK_API_KEY="xai-..."
```

## Running the Agents

### Option 1: Without Sandbox (Simpler, Works Everywhere)
```bash
# Ensure venv is activated
source .venv/bin/activate

# Run agents
python scripts/run_agents.py
```

**Behavior:**
- Direct execution without Docker isolation
- Same functionality as sandbox mode
- Faster startup (~1-2 seconds)
- No Docker required

### Option 2: With Sandbox (Linux-Style Security on macOS)
Requires Docker Desktop running.

```bash
# Ensure venv is activated
source .venv/bin/activate

# Run with sandbox
USE_SANDBOX=true python scripts/run_agents.py
```

**First run:** You'll be prompted to grant runtime permissions for each agent:
```
Runtime Permission: Network Access Permission
Allow access to network domain: api.openai.com (port: 443)
Do you want to give the agent the requested access? (yes/no):
```

Type `yes` for each permission. Permissions include:
- Filesystem: Read/write to project directory
- Network: api.openai.com, api.anthropic.com, api.x.ai (port 443)
- Environment: OPENAI_API_KEY, ANTHROPIC_API_KEY, GROK_API_KEY

**Expected behavior:**
- Docker containers created/destroyed automatically
- Tool calls show `[Sandbox] Executing {tool} in Docker container`
- Slightly slower startup (~3-5 seconds for first container)

### Troubleshooting Sandbox on macOS

**Docker daemon not running:**
```bash
# Solution: Open Docker Desktop from Applications menu
# Or restart it: killall Docker; open /Applications/Docker.app
```

**"Cannot connect to Docker daemon" error:**
```bash
# Ensure Docker Desktop is running and user has access:
docker ps
# If permission denied:
sudo dscacheutil -flushcache
# Or restart Docker Desktop
```

**File permissions issues with Docker:**
```bash
# Ensure project directory is in Docker's file sharing (see Prerequisites step 3)
# Or move project to home directory:
mv /path/to/codingwithai ~/codingwithai
cd ~/codingwithai
```

## Agent Workflow

All modes (sandbox/no-sandbox) follow identical flow:

### Phase 1: Automatic Iterations (3 rounds)
Agents automatically:
1. Read a random joke from database
2. Evaluate using their LLM (OpenAI/Anthropic/Grok)
3. Rate the joke (1-10)
4. Store memory with comedic tags
5. Generate a new joke (50% probability)

### Phase 2: Human-in-Loop Feedback
After 3 iterations, you receive:
```
--- Human Feedback ---
Commands:
- rate <agent_name> <rating> [comment]: Rate agent contribution
- comment <agent_name> <feedback>: Give qualitative feedback
- direction <instruction>: Give agents new comedic direction
- summary: View joke database and agent memories
- stop: End session
- <Enter>: Continue for 3 more iterations

Your input:
```

**Available commands:**
```bash
rate science-joker 9 Loved the physics humor!
comment pun-master Focus on wordplay
direction Make jokes more family-friendly
summary
stop
```

## Agent Personalities

| Agent | LLM Provider | Specialty |
|-------|--------------|-----------|
| **Pun Master** | OpenAI | Wordplay, linguistic humor, puns |
| **Science Joker** | Anthropic | Science, math, physics jokes |
| **Observational Comedian** | Grok | Everyday life, human behavior |
| **Southern Conservative** | Grok | Traditional values, family themes |
| **Bernie Sanders** | Anthropic | Political satire, progressive humor |

## Performance Notes

### Without Sandbox
- Startup: ~1-2 seconds
- Per tool call: <100ms
- Memory: ~80-150 MB
- Best for: Development, quick testing

### With Sandbox
- Startup: ~3-5 seconds (first container only)
- Per tool call: ~1-2 seconds (Docker overhead)
- Memory: ~200-300 MB (Docker + Python)
- Best for: Security-conscious deployments

## Deactivating Virtual Environment

When done, exit the venv:
```bash
deactivate
```

## Updating Dependencies

If dependencies change:
```bash
source .venv/bin/activate
pip install -r requirements.txt
```

## Troubleshooting

### "Command not found: python3"
```bash
# Install Python via Homebrew:
brew install python@3.11

# Or use pyenv for version management:
brew install pyenv
pyenv install 3.11.0
```

### "ModuleNotFoundError: No module named 'openai'"
```bash
# Ensure venv is activated:
source .venv/bin/activate

# Reinstall dependencies:
pip install -r requirements.txt
```

### Agents using synthetic fallback (no real API calls)
Check that API keys are present:
```bash
echo $OPENAI_API_KEY
echo $ANTHROPIC_API_KEY
echo $GROK_API_KEY
```

If empty, set them:
```bash
export OPENAI_API_KEY="sk-proj-..."
```

Or verify `.dev.vars` exists with keys.

### "Port already in use" error
Not expected in this setup, but if you see it:
```bash
# Kill any hung agent processes:
pkill -f "python scripts/run_agents.py"

# Then try again
python scripts/run_agents.py
```

### macOS M1/M2 (Apple Silicon) Issues
Python and Docker should work seamlessly on Apple Silicon. If you encounter issues:

```bash
# Force native architecture:
arch -arm64 brew install python@3.11

# Or use Rosetta if needed:
arch -x86_64 python3 -m venv .venv
```

## Advanced: Running Multiple Sessions

You can run multiple agent conversations in parallel:

```bash
# Terminal 1
source .venv/bin/activate
python scripts/run_agents.py

# Terminal 2 (different window/tab)
source .venv/bin/activate
python scripts/run_agents.py
```

Each runs independently with separate in-memory databases. With sandbox, each gets its own Docker container instances.

## Architecture Overview

### Without Sandbox (Direct Execution)
```
macOS Terminal
    ↓
Python Script (scripts/run_agents.py)
    ↓
LLM Providers (OpenAI/Anthropic/Grok APIs)
    ↓
In-Memory Database (pyagents/database_client.py)
```

### With Sandbox (Docker Isolation)
```
macOS Terminal
    ↓
Python Script (scripts/run_agents.py)
    ↓
AgentBound Sandbox Wrapper
    ↓
Docker Container (Linux environment)
    ├── MCP Server (JSON-RPC)
    ├── Tool Execution (rate/store/add jokes)
    └── Restricted Access (FS/Network/Env)
    ↓
LLM Providers & Database
```

## Contributing & Feedback

To report macOS-specific issues:
1. Note your macOS version (`sw_vers`)
2. Python version (`python3 --version`)
3. Docker version if using sandbox (`docker --version`)
4. Full error output
5. Submit as GitHub issue

## Resources

- [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)
- [Python on macOS](https://docs.python.org/3/using/mac.html)
- [AgentBound GitHub](https://github.com/GuardiAgent/python-mcp-sandbox-openai-sdk)
- [OpenAI Agents SDK](https://github.com/openai/openai-agents-python)
- [MCP Protocol](https://modelcontextprotocol.io)

## Quick Reference

### Activate venv every session
```bash
source .venv/bin/activate
```

### Run without sandbox (fastest)
```bash
python scripts/run_agents.py
```

### Run with sandbox (secure)
```bash
USE_SANDBOX=true python scripts/run_agents.py
```

### Exit interactive session
```bash
stop
# or Ctrl+C
```

### Deactivate venv when done
```bash
deactivate
```

---

**Tested on:** macOS 12.x, 13.x, 14.x (both Intel and Apple Silicon)

**Questions?** Check the main [README.md](README.md) or [SANDBOX_SETUP.md](SANDBOX_SETUP.md) for more details.
