#!/bin/bash
# Quick setup script for Job Agents Docker sandbox

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🐳 Building Job Application MCP Server Docker image..."
echo "=================================================="

if [ ! -f "$PROJECT_DIR/Dockerfile.mcp" ]; then
    echo "❌ Error: Dockerfile.mcp not found in $PROJECT_DIR"
    exit 1
fi

if [ ! -f "$PROJECT_DIR/requirements.txt" ]; then
    echo "❌ Error: requirements.txt not found in $PROJECT_DIR"
    exit 1
fi

# Build the Docker image
docker build \
    -f "$PROJECT_DIR/Dockerfile.mcp" \
    -t job-mcp-server:latest \
    "$PROJECT_DIR"

echo ""
echo "✅ Docker image built successfully!"
echo ""
echo "Next steps:"
echo "1. Ensure PostgreSQL is running:"
echo "   docker-compose up -d"
echo ""
echo "2. Run agents with sandbox enabled:"
echo "   USE_SANDBOX=true python scripts/run_job_agents.py"
echo ""
echo "3. (Optional) Approve runtime permissions when prompted"
echo ""
echo "To disable sandbox and run directly:"
echo "   python scripts/run_job_agents.py"
echo ""
echo "For more info, see: SANDBOX_SETUP_JOB_AGENTS.md"
