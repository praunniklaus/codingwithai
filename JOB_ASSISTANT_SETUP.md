# Job Application Assistant: Setup & Start Guide (Sandboxed Agents)

This guide walks you through setting up and running the full Job Application Assistant system—including database, backend, frontend, and sandboxed Python agents—on **WSL2 (Windows Subsystem for Linux)** and **macOS**.

---

## Prerequisites

- **WSL2 (Windows):**
  - Install Ubuntu via PowerShell:
    ```powershell
    wsl --install -d Ubuntu-22.04
    ```
  - Restart your computer and launch Ubuntu from the Start menu.
  - [Install Docker Desktop](https://www.docker.com/products/docker-desktop/) and enable WSL2 integration in Docker Desktop settings.

- **macOS:**
  - Install [Homebrew](https://brew.sh/) if not already installed.
  - Install Docker:
    ```bash
    brew install --cask docker
    ```
  - Start Docker Desktop from Applications.

- **Both:**
  - Python 3.10+
  - Git
  - Node.js 18+

---

## 1. Clone and Set Up the Project

```bash
git clone <your-repo-url>
cd codingwithai
```

---

## 2. Set Up Python Environment

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

---

## 3. Configure API Keys

Create a `.dev.vars` file in the project root:

```bash
cat > .dev.vars << 'EOF'
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-your-anthropic-key
GROK_API_KEY=xai-your-grok-key
EOF
```

Or export them in your shell:

```bash
export OPENAI_API_KEY="sk-your-openai-key"
export ANTHROPIC_API_KEY="sk-your-anthropic-key"
export GROK_API_KEY="xai-your-grok-key"
```

---

## 4. Start the Database

```bash
docker compose up -d
sleep 5
./setup-database.sh
```

---

## 5. Start the MCP Server (Backend API)

```bash
npm install
npm run dev
# MCP server runs at http://localhost:8792
```

---

## 6. Start the Frontend

```bash
cd frontend
npm install
npm run dev
# Frontend runs at http://localhost:5173
```

---


## 7. Run Python Agents (Sandboxed)

**Recommended (WSL2/macOS/Linux):**

```bash
npm run agents:python:sandbox
```

- The first run will prompt for permissions (filesystem, network, environment variables).
- Each agent runs in an ephemeral Docker container for security.

**Fallback (All Platforms, no sandbox):**

```bash
npm run agents:python
```

---

## 8. Access the Application

- Open your browser: [http://localhost:5173](http://localhost:5173)
- Click "Get Started" and complete onboarding.
- Dashboard will show job recommendations and agent activity.

---

## 🛠️ Troubleshooting

- **Docker not running:**
  - WSL2: `sudo service docker start`
  - macOS: Start Docker Desktop from Applications.

- **Permission denied (Docker):**
  - Add your user to the docker group:
    ```bash
    sudo usermod -aG docker $USER
    newgrp docker
    ```

- **API key errors:**
  - Ensure `.dev.vars` exists and is loaded, or export keys in your shell.

- **Module import errors:**
  - Activate your virtual environment:
    ```bash
    source .venv/bin/activate
    pip install -r requirements.txt
    ```

- **Sandbox fails on Windows native:**
  - Use WSL2 for sandboxed mode. Native Windows Python is not supported for sandboxing.

---

## 📝 Notes

- **Order matters:** Start the database first, then the MCP server, then the frontend, then the agents.
- **Sandboxed agents** provide strong isolation and security, but add some startup latency.
- **Non-sandboxed mode** works everywhere, but without Docker isolation.

---

For more details, see `SANDBOX_SETUP.md` and `README.md`.
