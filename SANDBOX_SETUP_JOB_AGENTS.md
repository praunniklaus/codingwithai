# Docker Sandbox Setup for Job Application Agents

This guide explains how to enable Docker sandbox protection for the Job Application Agents using AgentBound.

## Why Sandbox?

The Docker sandbox provides:
- **Process isolation**: Each tool call runs in a separate container
- **Resource limits**: CPU/memory bounds per operation  
- **Network restrictions**: Only approved domains accessible
- **Filesystem isolation**: Limited to project workspace
- **Environment variable control**: Explicit access grants

## Prerequisites

### Required
- Docker Desktop (Mac/Windows) or Docker Engine (Linux)
- WSL2 on Windows (recommended)
- Python 3.10+ venv with requirements installed
- PostgreSQL running (in Docker or locally)

### Verify Setup
```bash
# Check Docker is running
docker ps

# Check Python dependencies
python -c "import psycopg; print('psycopg installed')"
```

## Setup Steps

### 1. Build MCP Server Docker Image

```bash
cd /path/to/codingwithai

# Build the image
docker build -f Dockerfile.mcp -t job-mcp-server:latest .

# Verify
docker images | grep job-mcp-server
```

### 2. Configure AgentBound (Optional)

AgentBound automatically uses the sandbox if `mcp_sandbox_openai_sdk` is installed:

```bash
pip install mcp_sandbox_openai_sdk
```

### 3. Run Agents with Sandbox

**Linux/macOS/WSL2:**
```bash
USE_SANDBOX=true python scripts/run_job_agents.py
```

**Windows PowerShell:**
```powershell
$env:USE_SANDBOX='true'; python scripts\run_job_agents.py
```

## Runtime Permissions

On first run with sandbox enabled, you'll see permission prompts:

```
Runtime Permission: File System Access Permission
Allow access to file system path: /path/to/codingwithai (read: True, write: True)
Do you want to give the agent the requested access? (yes/no): yes

Runtime Permission: Network Access Permission
Allow access to network domain: api.openai.com (port: 443)
Do you want to give the agent the requested access? (yes/no): yes

[... more permissions ...]
```

Type `yes` for each permission. These are saved for future runs.

## Expected Behavior

With sandbox enabled:

```
[Sandbox] AgentBound protection initialized with Docker container
[Sandbox] Connecting to MCP server in Docker container...
[Sandbox] MCP server connected successfully
[Sandbox] Executing add_recommendation in Docker container
✅ Recommendation added (sandboxed)
```

## Troubleshooting

### Docker Not Available
```
Error: [Sandbox] Docker execution failed: Connection refused
```

**Solution**: 
- Start Docker Desktop (GUI)
- Or on Linux: `sudo systemctl start docker`
- Or use WSL2 on Windows

### Permission Denied
```
Error: [Sandbox] Docker execution failed: permission denied
```

**Solution (Linux)**:
```bash
sudo usermod -aG docker $USER
# Logout and login for changes to take effect
```

### MCP Server Crashes
```
Error: [Sandbox] Docker execution failed: Tool execution failed
```

**Solutions**:
1. Verify requirements.txt is in project root
2. Check psycopg[binary] is in requirements.txt
3. Rebuild image: `docker build -f Dockerfile.mcp -t job-mcp-server:latest .`
4. Check Docker logs: `docker logs <container_id>`

### Database Connection Issues
```
Error: [Sandbox] Docker execution failed: could not connect to server
```

**Solutions**:
1. Verify DATABASE_URL in .dev.vars
2. If using localhost, try host.docker.internal:
   ```
   DATABASE_URL=postgresql://user:pass@host.docker.internal:5432/job_application
   ```
3. Or expose PostgreSQL container to host:
   ```bash
   docker ps | grep postgres
   # Check port mapping
   ```

### WSL2 Network Issues

If containers can't reach host.docker.internal:

```bash
# In WSL2, use Docker host IP
cat /etc/resolv.conf | grep nameserver
# Use that IP instead of host.docker.internal
```

## Performance Notes

**Without Sandbox** (default):
- Agent iteration: ~5-15 seconds
- Tool call overhead: <100ms
- Memory: ~150-250 MB

**With Sandbox**:
- Agent iteration: ~10-20 seconds  
- Tool call overhead: 1-2 seconds (Docker startup)
- Memory: ~300-500 MB
- First call slower (~3-5s, image pull/container init)

## Advanced Configuration

### Custom Docker Image

Edit `job_sandbox_tools.py` to use your own image:

```python
exec_command="docker run --rm -v /path/to/code:/app python:3.11-slim python -m pip install -q psycopg && python app/pyagents/job_mcp_server.py"
```

### Resource Limits

Add to `SandboxedMCPStdio` configuration:

```python
resource_limits={
    "cpu": "1",          # 1 CPU core
    "memory": "512m",    # 512 MB RAM
    "timeout": 30        # 30 second timeout
}
```

### Inspect Running Container

```bash
# List containers
docker ps

# View logs
docker logs <container_id>

# Interactive shell
docker exec -it <container_id> /bin/bash
```

## Monitoring

### Docker Events
```bash
docker events --filter 'type=container'
```

### Container Resource Usage
```bash
docker stats
```

### MCP Server Logs
```bash
# Enable verbose logging in run_job_agents.py
export DEBUG=true
USE_SANDBOX=true python scripts/run_job_agents.py 2>&1 | tee sandbox_logs.txt
```

## Disabling Sandbox

To go back to in-process execution:

```bash
# Unset the variable
unset USE_SANDBOX
python scripts/run_job_agents.py

# Or explicitly set to false
USE_SANDBOX=false python scripts/run_job_agents.py
```

## Cleaning Up

```bash
# Remove old containers
docker container prune

# Remove unused images  
docker image prune

# Remove MCP server image
docker rmi job-mcp-server:latest
```

## Architecture

### Without Sandbox
```
Python Process
  ↓
Agent → Database Client → PostgreSQL
         ↓
         LLM APIs
```

### With Sandbox
```
Python Process (main host)
  ↓
AgentBound Wrapper
  ↓
Docker Container (isolated)
  ├── MCP Server
  ├── Database Client (connects to host PostgreSQL)
  ├── LLM API calls (allowed domains only)
  └── Filesystem (workspace only)
```

## References

- [AgentBound SDK](https://github.com/GuardiAgent/python-mcp-sandbox-openai-sdk)
- [MCP Protocol](https://modelcontextprotocol.io)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [Docker Documentation](https://docs.docker.com/)

## Quick Reference

```bash
# Check setup
docker ps  # Docker running?
python -c "import mcp_sandbox_openai_sdk" # AgentBound installed?

# Build image
docker build -f Dockerfile.mcp -t job-mcp-server:latest .

# Run with sandbox
USE_SANDBOX=true python scripts/run_job_agents.py

# Monitor containers
docker stats

# View logs
docker logs <container_id>

# Clean up
docker container prune
```

---

**Note**: Sandbox is optional. Agents work great without it for local development. Sandbox is mainly useful for production deployments or when running untrusted code.
