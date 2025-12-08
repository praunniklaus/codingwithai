"""AgentBound sandbox-protected tool definitions.

This module wraps the comedy protocol tools (joke rating, generation, storage)
to execute safely inside Docker containers via the MCP sandbox.
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
	from agents import Agent, Runner
	from agents.mcp import MCPServer
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
	Agent = None
	Runner = None
	MCPServer = None


# Define manifest with least-privilege permissions for comedy tools
COMEDY_MANIFEST = {
	"version": "1.0",
	"resources": [
		{
			"type": "database",
			"path": "/tmp/comedy_db",  # Sandboxed access only
			"permissions": ["read", "write"],
		}
	],
	"network": {
		"enabled": True,
		"allowedDomains": ["api.openai.com", "api.anthropic.com", "api.x.ai"],
	},
}


def get_sandboxed_joke_tools() -> list:
	"""Return a list of sandboxed tool definitions for joke operations."""
	return [
		{
			"name": "rate_joke",
			"description": "Rate a joke 1-10 based on agent personality",
			"input_schema": {
				"type": "object",
				"properties": {
					"joke_id": {"type": "integer", "description": "ID of joke to rate"},
					"rating": {"type": "integer", "minimum": 1, "maximum": 10},
					"comment": {"type": "string", "description": "Optional rating comment"},
					"agent_id": {"type": "string", "description": "Agent providing the rating"},
				},
				"required": ["joke_id", "rating", "agent_id"],
			},
		},
		{
			"name": "store_agent_memory",
			"description": "Store agent's personal memory and comedic preferences about a joke",
			"input_schema": {
				"type": "object",
				"properties": {
					"joke_id": {"type": "integer"},
					"agent_id": {"type": "string"},
					"rating": {"type": "integer"},
					"notes": {"type": "string"},
					"tags": {
						"type": "array",
						"items": {"type": "string"},
						"description": "Comedic style tags (e.g., 'wordplay', 'science', 'observational')",
					},
				},
				"required": ["joke_id", "agent_id", "rating"],
			},
		},
		{
			"name": "add_joke",
			"description": "Generate and add a new joke to the shared database",
			"input_schema": {
				"type": "object",
				"properties": {
					"content": {"type": "string", "description": "The joke text"},
					"category": {"type": "string", "description": "Joke category (e.g., 'tech', 'wordplay')"},
					"language": {"type": "string", "default": "en"},
					"agent_id": {"type": "string", "description": "Agent creating the joke"},
				},
				"required": ["content", "agent_id"],
			},
		},
		{
			"name": "get_random_joke",
			"description": "Fetch a random joke from the database",
			"input_schema": {
				"type": "object",
				"properties": {
					"category": {"type": "string", "description": "Optional category filter"},
				},
			},
		},
		{
			"name": "search_jokes",
			"description": "Search jokes by content, category, or language",
			"input_schema": {
				"type": "object",
				"properties": {
					"query": {"type": "string"},
					"category": {"type": "string"},
					"language": {"type": "string"},
					"limit": {"type": "integer", "default": 10},
				},
			},
		},
	]


class SandboxedAgentToolsWrapper:
	"""Wraps agent tool calls to execute in sandboxed Docker containers via AgentBound."""

	def __init__(self):
		self.mcp_server = None
		self.sandbox_initialized = False
		self.server_connected = False

		# Initialize sandbox if SDK is available
		if not SandboxedMCPStdio or not DevMCPManifest:
			print("[Sandbox] AgentBound SDK not available, falling back to in-process")
			return

		try:
			# Use DevMCPManifest for local development (mounts local code)
			workspace_root = str(Path(__file__).parent.parent.absolute())
			# Convert Windows path to forward slashes for Docker mount
			workspace_root_posix = workspace_root.replace("\\", "/")
			
			# Create manifest with proper Docker command format
			manifest = DevMCPManifest(
				name="comedy-protocol-server",
				description="Sandboxed MCP server for comedy protocol",
				registry=Registry.NPM if Registry else "npm",  # type: ignore
				package_name="@local/comedy-protocol",
				permissions=[
					Permission.MCP_AC_FILESYSTEM_READ if Permission else "mcp.ac.filesystem.read",  # type: ignore
					Permission.MCP_AC_FILESYSTEM_WRITE if Permission else "mcp.ac.filesystem.write",  # type: ignore
					Permission.MCP_AC_NETWORK_CLIENT if Permission else "mcp.ac.network.client",  # type: ignore
					Permission.MCP_AC_SYSTEM_ENV_READ if Permission else "mcp.ac.system.env.read",  # type: ignore
				],
				code_mount=workspace_root_posix,
				exec_command=f"cd {workspace_root_posix} && /usr/bin/python3 pyagents/mcp_server.py",
			)

			# Define runtime permissions (user will be prompted)
			runtime_perms = [
				FSAccess(path=workspace_root_posix, read=True, write=True),
				DomainPort(domain="api.openai.com", port=443),
				DomainPort(domain="api.anthropic.com", port=443),
				DomainPort(domain="api.x.ai", port=443),
				EnvironmentVariable(name="OPENAI_API_KEY"),
				EnvironmentVariable(name="ANTHROPIC_API_KEY"),
				EnvironmentVariable(name="GROK_API_KEY"),
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
		db_client: Any,  # AgentDatabaseClient instance
	) -> Dict[str, Any]:
		"""
		Execute a tool call safely via sandbox or fall back to in-process.

		Args:
			tool_name: Name of the tool (rate_joke, store_agent_memory, etc.)
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
		"""Execute tool in-process as fallback."""
		if tool_name == "rate_joke":
			return await db_client.rate_joke(
				tool_input.get("joke_id"),
				tool_input.get("agent_id"),
				tool_input.get("rating"),
				tool_input.get("comment"),
			)
		elif tool_name == "store_agent_memory":
			return await db_client.store_memory(
				tool_input.get("joke_id"),
				tool_input.get("agent_id"),
				tool_input.get("rating"),
				tool_input.get("notes"),
				tool_input.get("tags"),
			)
		elif tool_name == "add_joke":
			return await db_client.add_joke(
				tool_input.get("content"),
				tool_input.get("category"),
				tool_input.get("language", "en"),
				tool_input.get("agent_id"),
			)
		elif tool_name == "get_random_joke":
			return await db_client.get_random_joke(tool_input.get("category"))
		elif tool_name == "search_jokes":
			return await db_client.search_jokes(
				tool_input.get("query"),
				tool_input.get("category"),
				tool_input.get("language"),
				tool_input.get("limit", 10),
			)
		else:
			return {"error": f"Unknown tool: {tool_name}"}
