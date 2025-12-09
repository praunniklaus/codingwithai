@echo off
REM Quick setup script for Job Agents Docker sandbox (Windows)

setlocal enabledelayedexpansion

REM Get script directory
for %%I in ("%~dp0.") do set "PROJECT_DIR=%%~fI"

echo.
echo 🐳 Building Job Application MCP Server Docker image...
echo ==================================================
echo.

if not exist "%PROJECT_DIR%\Dockerfile.mcp" (
    echo ❌ Error: Dockerfile.mcp not found in %PROJECT_DIR%
    exit /b 1
)

if not exist "%PROJECT_DIR%\requirements.txt" (
    echo ❌ Error: requirements.txt not found in %PROJECT_DIR%
    exit /b 1
)

REM Build the Docker image
docker build ^
    -f "%PROJECT_DIR%\Dockerfile.mcp" ^
    -t job-mcp-server:latest ^
    "%PROJECT_DIR%"

if errorlevel 1 (
    echo.
    echo ❌ Docker build failed!
    echo.
    echo Troubleshooting:
    echo - Is Docker Desktop running?
    echo - Do you have permission to run Docker commands?
    exit /b 1
)

echo.
echo ✅ Docker image built successfully!
echo.
echo Next steps:
echo 1. Ensure PostgreSQL is running:
echo    docker-compose up -d
echo.
echo 2. Run agents with sandbox enabled:
echo    $env:USE_SANDBOX='true'; python scripts\run_job_agents.py
echo.
echo 3. (Optional) Approve runtime permissions when prompted
echo.
echo To disable sandbox and run directly:
echo    python scripts\run_job_agents.py
echo.
echo For more info, see: SANDBOX_SETUP_JOB_AGENTS.md
echo.
