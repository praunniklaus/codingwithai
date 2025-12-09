#!/usr/bin/env python3
"""Run the FastAPI server for the job application assistant."""

import sys
from pathlib import Path

# Add pyagents to path
sys.path.insert(0, str(Path(__file__).parent.parent))

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
