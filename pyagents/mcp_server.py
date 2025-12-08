"""MCP server implementation for comedy protocol.

This server provides tools for joke operations (rating, memory, generation)
and runs in an AgentBound sandbox for security.
"""

import json
import sys
from typing import Any, Dict

# MCP protocol structure for stdio communication
def read_message() -> Dict[str, Any]:
	"""Read a JSON-RPC message from stdin."""
	line = sys.stdin.readline()
	if not line:
		return {}
	return json.loads(line)


def write_message(msg: Dict[str, Any]) -> None:
	"""Write a JSON-RPC message to stdout."""
	sys.stdout.write(json.dumps(msg) + "\n")
	sys.stdout.flush()


def handle_initialize(id: Any) -> None:
	"""Respond to initialize request."""
	response = {
		"jsonrpc": "2.0",
		"id": id,
		"result": {
			"protocolVersion": "2024-11-05",
			"capabilities": {
				"tools": {},
			},
			"serverInfo": {
				"name": "comedy-protocol-server",
				"version": "1.0.0",
			},
		},
	}
	write_message(response)


def handle_list_tools(id: Any) -> None:
	"""List available tools."""
	tools = [
		{
			"name": "rate_joke",
			"description": "Rate a joke 1-10 based on agent personality",
			"inputSchema": {
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
			"description": "Store agent's personal memory about a joke",
			"inputSchema": {
				"type": "object",
				"properties": {
					"joke_id": {"type": "integer"},
					"agent_id": {"type": "string"},
					"rating": {"type": "integer"},
					"notes": {"type": "string"},
					"tags": {
						"type": "array",
						"items": {"type": "string"},
						"description": "Comedic style tags",
					},
				},
				"required": ["joke_id", "agent_id", "rating"],
			},
		},
		{
			"name": "add_joke",
			"description": "Add a new joke to the database",
			"inputSchema": {
				"type": "object",
				"properties": {
					"content": {"type": "string", "description": "The joke text"},
					"category": {"type": "string"},
					"language": {"type": "string", "default": "en"},
					"agent_id": {"type": "string"},
				},
				"required": ["content", "agent_id"],
			},
		},
		{
			"name": "get_random_joke",
			"description": "Fetch a random joke",
			"inputSchema": {
				"type": "object",
				"properties": {
					"category": {"type": "string", "description": "Optional category filter"},
				},
			},
		},
	]

	response = {"jsonrpc": "2.0", "id": id, "result": {"tools": tools}}
	write_message(response)


def handle_call_tool(id: Any, tool_name: str, arguments: Dict[str, Any]) -> None:
	"""Execute a tool call (sandboxed)."""
	# In the sandbox, these operations are isolated
	result = {
		"content": [
			{
				"type": "text",
				"text": json.dumps(
					{
						"status": "success",
						"tool": tool_name,
						"arguments": arguments,
						"message": f"Sandboxed execution of {tool_name}",
					}
				),
			}
		]
	}

	response = {"jsonrpc": "2.0", "id": id, "result": result}
	write_message(response)


def main() -> None:
	"""Main MCP server loop."""
	write_message({"jsonrpc": "2.0", "method": "notifications/initialized"})

	while True:
		try:
			message = read_message()
			if not message:
				break

			method = message.get("method")
			msg_id = message.get("id")
			params = message.get("params", {})

			if method == "initialize":
				handle_initialize(msg_id)
			elif method == "tools/list":
				handle_list_tools(msg_id)
			elif method == "tools/call":
				tool_name = params.get("name")
				arguments = params.get("arguments", {})
				handle_call_tool(msg_id, tool_name, arguments)
			elif method == "notifications/initialized":
				pass  # Client acknowledged initialization
			else:
				# Unknown method
				error_response = {
					"jsonrpc": "2.0",
					"id": msg_id,
					"error": {"code": -32601, "message": f"Method not found: {method}"},
				}
				write_message(error_response)

		except Exception as e:
			error_response = {
				"jsonrpc": "2.0",
				"id": msg_id if "msg_id" in locals() else None,
				"error": {"code": -32603, "message": f"Internal error: {str(e)}"},
			}
			write_message(error_response)
			break


if __name__ == "__main__":
	main()
