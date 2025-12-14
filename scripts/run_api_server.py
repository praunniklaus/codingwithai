#!/usr/bin/env python3
"""Run the FastAPI server for the job application assistant."""

import sys
import os
from pathlib import Path

# Add repo root to path so pyagents is importable
repo_root = Path(__file__).parent.parent
sys.path.insert(0, str(repo_root))

# Load .dev.vars early so env is available during app import
try:
    from dotenv import dotenv_values
    dev_vars_path = repo_root / ".dev.vars"
    if dev_vars_path.exists():
        values = dotenv_values(str(dev_vars_path))
        for k, v in values.items():
            if k and v and (k not in os.environ or not os.environ.get(k)):
                os.environ[k] = v
except Exception as e:
    print(f"[warn] Failed to load .dev.vars: {e}")

if __name__ == "__main__":
    import uvicorn
    from pyagents.api_server import app
    
    print("🚀 Starting Job Application Assistant API Server...")
    print("📡 Server will be available at: http://localhost:8000")
    print("📚 API docs available at: http://localhost:8000/docs")
    print("\nPress Ctrl+C to stop\n")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
    )
