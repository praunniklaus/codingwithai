#!/bin/bash

echo "🚀 Setting up PostgreSQL database for MCP server..."

# Start PostgreSQL container
echo "Starting PostgreSQL container..."
docker compose up -d

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
sleep 5

echo "Creating database tables..."
docker exec -i mcp-cole-pg-test psql -U mcp_user -d mcp_database < setup-job-assistant.sql

echo "✅ Database setup complete!"
echo ""
echo "Connection details:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: mcp_database"
echo "  Username: mcp_user"
echo "  Password: mcp_password"
echo ""
echo "Connection string for .dev.vars:"
echo "DATABASE_URL=postgresql://mcp_user:mcp_password@localhost:5432/mcp_database"
