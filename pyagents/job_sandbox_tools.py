"""AgentBound sandbox-protected tool definitions for Job Application Assistant.

This module wraps the job application tools to execute safely inside Docker containers
via the MCP sandbox, similar to the comedy protocol sandbox.
"""

from typing import Any, Dict, Optional
import json
import os
from pathlib import Path

try:
    from mcp_sandbox_openai_sdk import (
        SandboxedMCPStdio,
        DevMCPManifest,
        MCPManifest,
        RuntimePermission,
        Egress,
        FSAccess,
        Permission,
        Registry,
        DomainPort,
        EnvironmentVariable,
    )
except ImportError:
    SandboxedMCPStdio = None
    DevMCPManifest = None
    MCPManifest = None
    RuntimePermission = None
    Egress = None
    FSAccess = None
    Permission = None
    Registry = None
    DomainPort = None
    EnvironmentVariable = None


# Define manifest with least-privilege permissions for job application tools
JOB_MANIFEST = {
    "version": "1.0",
    "resources": [
        {
            "type": "database",
            "path": "/tmp/job_db",
            "permissions": ["read", "write"],
        }
    ],
    "network": {
        "enabled": True,
        "allowedDomains": [
            "api.openai.com",
            "api.anthropic.com",
            "api.x.ai",
        ],
    },
}


class SandboxedJobToolsWrapper:
    """Wraps job application tool calls to execute in sandboxed Docker containers via AgentBound."""

    def __init__(self):
        self.mcp_server = None
        self.sandbox_initialized = False
        self.server_connected = False

        # Windows Docker + AgentBound combo can fail with WinError 193; allow override via env.
        force_sandbox = os.environ.get("FORCE_JOB_SANDBOX", "false").lower() == "true"
        if os.name == "nt" and not force_sandbox:
            print("[Sandbox] Windows detected; skipping Docker sandbox and using in-process tools")
            return
        if os.name == "nt" and force_sandbox:
            print("[Sandbox] Windows detected but FORCE_JOB_SANDBOX=true set; attempting sandbox anyway")

        # Initialize sandbox if SDK is available
        if not SandboxedMCPStdio or not DevMCPManifest:
            print("[Sandbox] AgentBound SDK not available, falling back to in-process")
            return

        try:
            # Use DevMCPManifest for local development (mounts local code)
            workspace_root = str(Path(__file__).parent.parent.absolute())
            workspace_root_posix = workspace_root.replace("\\", "/")

            # Create manifest with proper Docker command format
            manifest = DevMCPManifest(
                name="job-application-server",
                description="Sandboxed MCP server for job application assistant",
                registry=Registry.NPM if Registry else "npm",  # type: ignore
                package_name="@local/job-application",
                permissions=[
                    Permission.MCP_AC_FILESYSTEM_READ if Permission else "mcp.ac.filesystem.read",  # type: ignore
                    Permission.MCP_AC_FILESYSTEM_WRITE if Permission else "mcp.ac.filesystem.write",  # type: ignore
                    Permission.MCP_AC_NETWORK_CLIENT if Permission else "mcp.ac.network.client",  # type: ignore
                    Permission.MCP_AC_SYSTEM_ENV_READ if Permission else "mcp.ac.system.env.read",  # type: ignore
                ],
                code_mount=workspace_root_posix,
                exec_command=(
                    f"cd {workspace_root_posix} && "
                    "/usr/bin/python3 pyagents/job_mcp_server.py"
                ),
            )

            # Define runtime permissions
            runtime_perms = [
                FSAccess(path=workspace_root_posix, read=True, write=True),
                DomainPort(domain="api.openai.com", port=443),
                DomainPort(domain="api.anthropic.com", port=443),
                DomainPort(domain="api.x.ai", port=443),
                EnvironmentVariable(name="OPENAI_API_KEY"),
                EnvironmentVariable(name="ANTHROPIC_API_KEY"),
                EnvironmentVariable(name="GROK_API_KEY"),
                EnvironmentVariable(name="DATABASE_URL"),
            ]

            self.mcp_server = SandboxedMCPStdio(
                manifest=manifest,
                runtime_permissions=runtime_perms,
                remove_container_after_run=True,
            )
            self.sandbox_initialized = True
            print("[Sandbox] AgentBound protection initialized with Docker container")
        except Exception as e:
            print(f"[Sandbox] Initialization failed: {e}")
            print("[Sandbox] Falling back to in-process execution")

    async def execute_sandboxed(
        self,
        tool_name: str,
        tool_input: Dict[str, Any],
        db_client: Any,  # JobDatabaseClient instance
    ) -> Dict[str, Any]:
        """
        Execute a tool call safely via sandbox or fall back to in-process.

        Args:
            tool_name: Name of the tool (add_recommendation, save_cv, etc.)
            tool_input: Arguments for the tool
            db_client: Database client for actual operations

        Returns:
            Tool execution result
        """
        if not self.sandbox_initialized:
            # Fallback: execute directly in-process (no sandbox protection)
            return await self._execute_in_process(tool_name, tool_input, db_client)

        try:
            # Connect to MCP server on first use
            if not self.server_connected:
                print(f"[Sandbox] Connecting to MCP server in Docker container...")
                await self.mcp_server.connect()
                self.server_connected = True
                print(f"[Sandbox] MCP server connected successfully")

            # Execute via Docker-sandboxed MCP server
            print(f"[Sandbox] Executing {tool_name} in Docker container")
            result = await self.mcp_server.call_tool(tool_name, tool_input)
            return result
        except Exception as e:
            print(f"[Sandbox] Docker execution failed: {e}")
            print(f"[Sandbox] Falling back to in-process for {tool_name}")
            return await self._execute_in_process(tool_name, tool_input, db_client)

    async def _execute_in_process(
        self,
        tool_name: str,
        tool_input: Dict[str, Any],
        db_client: Any,
    ) -> Dict[str, Any]:
        """Execute tool directly in-process (fallback when sandbox unavailable)."""
        # Map tool names to database client methods
        tool_map = {
            "add_recommendation": db_client.add_recommendation,
            "save_cv": db_client.save_cv,
            "save_cover_letter": db_client.save_cover_letter,
            "update_application_status": db_client.update_application_status,
            "add_insight": db_client.add_insight,
        }

        handler = tool_map.get(tool_name)
        if not handler:
            raise ValueError(f"Unknown tool: {tool_name}")

        # Call the handler with unpacked arguments
        if tool_name == "add_recommendation":
            return await handler(
                tool_input["user_id"],
                tool_input["job_id"],
                tool_input["match_score"],
                tool_input["reasoning"],
            )
        elif tool_name == "save_cv":
            return await handler(
                tool_input["user_id"],
                tool_input["job_id"],
                tool_input["content"],
                tool_input.get("format", "markdown"),
            )
        elif tool_name == "save_cover_letter":
            return await handler(
                tool_input["user_id"],
                tool_input["job_id"],
                tool_input["content"],
                tool_input.get("tone", "professional"),
            )
        elif tool_name == "update_application_status":
            return await handler(
                tool_input["application_id"],
                tool_input["status"],
                tool_input.get("notes"),
            )
        elif tool_name == "add_insight":
            return await handler(
                tool_input["agent_id"],
                tool_input["user_id"],
                tool_input["insight_type"],
                tool_input["description"],
                tool_input.get("metadata"),
            )

        raise ValueError(f"Tool {tool_name} not implemented in fallback")

