# AgentBound Sandbox Setup Guide

This guide explains how to run the Python comedy agents with AgentBound Docker sandbox protection.

## Prerequisites

### Windows Users
AgentBound has known compatibility issues with native Windows due to subprocess execution differences. **Use WSL2 (Windows Subsystem for Linux)** for full sandbox functionality.

#### Install WSL2
```powershell
# Run in PowerShell as Administrator
wsl --install -d Ubuntu-22.04
```

After installation, restart your computer and launch Ubuntu from the Start menu.

### Linux/WSL2 Users
Ensure you have:
- Python 3.10 or higher
- Docker Desktop (Windows) or Docker Engine (Linux)
- Git

#### Install Docker on WSL2
```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Docker prerequisites
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Add your user to docker group (avoid sudo for docker commands)
sudo usermod -aG docker $USER

# Start Docker service
sudo service docker start

# Verify installation
docker --version
```

**Note for Windows Docker Desktop users:** Enable WSL2 integration in Docker Desktop settings:
1. Open Docker Desktop
2. Settings → Resources → WSL Integration
3. Enable integration with your Ubuntu distribution

## Project Setup

### 1. Clone and Navigate to Project
```bash
cd /mnt/c/Users/dusve/Documents/HSG/Semester5/ai/codingwithai
# Or clone fresh: git clone <your-repo-url>
```

### 2. Create Python Virtual Environment
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

This installs:
- `openai>=1.50.0` - OpenAI API SDK
- `anthropic>=0.39.0` - Anthropic API SDK
- AgentBound MCP Sandbox SDK (from GitHub)
- OpenAI Agents SDK (from GitHub)

### 4. Configure API Keys
Create a `.dev.vars` file in the project root:

```bash
cat > .dev.vars << 'EOF'
OPENAI_API_KEY=sk-proj-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here
GROK_API_KEY=xai-your-key-here
EOF
```

Or export as environment variables:
```bash
export OPENAI_API_KEY="sk-proj-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export GROK_API_KEY="xai-..."
```

### 5. Verify Docker is Running
```bash
docker ps
# Should show running containers or empty list (not an error)

# Test Docker with hello-world
docker run --rm hello-world
```

## Running the Agents

### With Sandbox (Linux/WSL2 only)
```bash
USE_SANDBOX=true python scripts/run_agents.py
```

**First run:** You'll be prompted to grant runtime permissions:
1. **Filesystem Access**: Read/write to workspace directory
2. **Network Access**: api.openai.com, api.anthropic.com, api.x.ai (port 443)
3. **Environment Variables**: OPENAI_API_KEY, ANTHROPIC_API_KEY, GROK_API_KEY

Type `yes` for each prompt to allow the agents to function.

**Expected behavior:**
- Each of the 5 agents requests permissions separately
- Docker containers are created/destroyed automatically during tool execution
- Tool calls show `[Sandbox] Executing {tool_name} in Docker container`
- Containers are ephemeral (won't persist in `docker ps`)

### Without Sandbox (All Platforms)
```bash
python scripts/run_agents.py
```

**Behavior:**
- Direct execution (no Docker isolation)
- Same functionality, just without security sandboxing
- Works on Windows, Linux, and macOS

## Agent Workflow

Both modes (sandbox/no-sandbox) follow the same workflow:

1. **Automatic Phase**: 3 iterations where agents:
   - Read a random joke from the database
   - Evaluate using their LLM provider (OpenAI/Anthropic)
   - Rate the joke (1-10)
   - Store memory with tags
   - Sometimes generate a new joke (50% probability)

2. **Human-in-Loop Phase**: After 3 iterations, you're prompted for feedback:
   ```
   --- Human Feedback ---
   Commands:
   - rate <agent_name> <rating> [comment]: Rate an agent's contribution
   - comment <agent_name> <feedback>: Provide qualitative feedback
   - direction <instruction>: Give agents a new comedic direction
   - summary: See conversation summary
   - stop: End the session
   - <Enter>: Continue for 3 more iterations
   
   Your input:
   ```

3. **Commands:**
   - `rate pun-master 9 Great wordplay!` - Rate agent performance
   - `comment science-joker Focus more on physics humor` - Give feedback
   - `direction Make jokes more family-friendly` - Change direction
   - `summary` - View joke database and agent memories
   - `stop` - Exit gracefully
   - Press Enter - Continue 3 more iterations

## Agent Personalities

The system runs 5 distinct comedy agents:

| Agent | Provider | Personality |
|-------|----------|-------------|
| Pun Master | OpenAI | Wordplay, puns, linguistic humor |
| Science Joker | Anthropic | Math, physics, technology jokes |
| Observational | OpenAI | Everyday life humor |
| Southern Conservative | OpenAI | Traditional values, family humor |
| Bernie Sanders | Anthropic | Progressive political satire |

## Troubleshooting

### Sandbox Fails on Windows
**Error:** `[WinError 193] %1 ist keine zulässige Win32-Anwendung`

**Solution:** Use WSL2 (see Prerequisites). Windows native Python has subprocess incompatibilities with AgentBound.

### Docker Not Found
**Error:** `Error initializing MCP server: Cannot connect to Docker daemon`

**Solutions:**
- Linux: `sudo service docker start`
- WSL2: Enable Docker Desktop WSL2 integration
- Verify: `docker ps` should not show connection errors

### Permission Denied (Docker)
**Error:** `permission denied while trying to connect to Docker daemon`

**Solution:**
```bash
sudo usermod -aG docker $USER
# Log out and back in, or run:
newgrp docker
```

### API Key Not Found
**Error:** Agents use synthetic fallback responses

**Solution:**
- Verify `.dev.vars` exists with valid keys
- Or export keys: `export OPENAI_API_KEY="sk-proj-..."`
- Check keys are loaded: `echo $OPENAI_API_KEY`

### Import Errors
**Error:** `ModuleNotFoundError: No module named 'openai'`

**Solution:**
```bash
source .venv/bin/activate  # Ensure venv is active
pip install -r requirements.txt
```

### OpenAI SDK Conflict
**Error:** `TypeError: 'NoneType' object is not callable` when creating OpenAI client

**Issue:** OpenAI Agents SDK has an `openai` submodule that conflicts with the OpenAI API SDK.

**Solution:** Already handled in `llm_providers.py` with explicit import resolution. If issues persist:
```bash
pip uninstall openai-agents-sdk openai
pip install openai>=1.50.0
pip install git+https://github.com/openai/openai-agents-python.git
```

## Architecture

### Sandboxed Execution Flow
```
┌─────────────────┐
│  run_agents.py  │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  ComedyAgent    │
└────────┬────────┘
         │ use_sandbox=true
         v
┌─────────────────────────┐
│ SandboxedToolsWrapper   │
└────────┬────────────────┘
         │
         v
┌─────────────────────────┐
│  DevMCPManifest         │
│  - code_mount           │
│  - runtime_permissions  │
└────────┬────────────────┘
         │
         v
┌─────────────────────────┐
│  SandboxedMCPStdio      │
│  (AgentBound SDK)       │
└────────┬────────────────┘
         │
         v
┌─────────────────────────┐
│  Docker Container       │
│  (ephemeral)            │
│                         │
│  ┌──────────────────┐   │
│  │  mcp_server.py   │   │
│  │  (JSON-RPC)      │   │
│  └──────────────────┘   │
│                         │
│  ┌──────────────────┐   │
│  │  Tool Execution  │   │
│  │  - rate_joke     │   │
│  │  - store_memory  │   │
│  │  - add_joke      │   │
│  └──────────────────┘   │
└─────────────────────────┘
```

### Security Features

AgentBound provides:
- **Process Isolation**: Each tool executes in a separate Docker container
- **Filesystem Restrictions**: Only workspace directory accessible (read/write)
- **Network Allowlist**: Only approved domains (OpenAI, Anthropic, xAI)
- **Environment Variable Control**: Explicit permission for each variable
- **User Consent**: Runtime prompts for all access requests
- **Ephemeral Containers**: Auto-removal after execution

## Performance Notes

- **First tool call**: ~2-5 seconds (Docker container startup)
- **Subsequent calls**: ~1-2 seconds (container reuse within session)
- **Without sandbox**: <100ms per tool call

The sandbox adds latency but provides strong isolation guarantees.

## Windows Native Support

Currently **not recommended** due to AgentBound compatibility issues. The fallback mode works perfectly on Windows:

```powershell
# Windows PowerShell (graceful fallback to in-process)
python scripts\run_agents.py
```

You'll see:
```
[Sandbox] AgentBound SDK not available, falling back to in-process
```

This is expected and safe - agents function identically, just without Docker isolation.

## Further Resources

- [AgentBound GitHub](https://github.com/GuardiAgent/python-mcp-sandbox-openai-sdk)
- [OpenAI Agents SDK](https://github.com/openai/openai-agents-python)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [Docker Desktop WSL2 Backend](https://docs.docker.com/desktop/wsl/)

## Contributing

To improve sandbox support:
1. Test on your platform (Linux/WSL2/macOS)
2. Report Win32 issues to AgentBound repository
3. Submit PRs for cross-platform compatibility improvements

---

**Questions?** Check existing issues or create a new one with your platform details and error logs.
