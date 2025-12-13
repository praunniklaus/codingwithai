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
		{
			"name": "cv_parse_text",
			"description": "Parse a CV file (pdf/docx/txt) and return extracted fields",
			"inputSchema": {
				"type": "object",
				"properties": {
					"file_path": {"type": "string", "description": "Absolute path to CV file"},
				},
				"required": ["file_path"],
			},
		},
	]

	response = {"jsonrpc": "2.0", "id": id, "result": {"tools": tools}}
	write_message(response)


def handle_call_tool(id: Any, tool_name: str, arguments: Dict[str, Any]) -> None:
	"""Execute a tool call (sandboxed)."""
	try:
		if tool_name == "cv_parse_text":
			file_path = arguments.get("file_path")
			if not file_path:
				raise ValueError("file_path is required")
			ext = (file_path.split(".")[-1] or "").lower()
			text = ""
			try:
				if ext == "txt":
					with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
						text = f.read()
				elif ext == "docx":
					try:
						from docx import Document
						d = Document(file_path)
						text = "\n".join([p.text for p in d.paragraphs])
					except Exception:
						text = ""
				elif ext == "pdf":
					try:
						from pdfminer.high_level import extract_text
						text = extract_text(file_path) or ""
					except Exception:
						text = ""
				else:
					with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
						text = f.read()
			except Exception as e:
				text = ""

			# Lightweight extraction similar to cv_parser_agent
			import re
			name = None
			for line in text.splitlines()[:30]:
				line = line.strip()
				if not line or len(line) > 100:
					continue
				if re.match(r"^[A-Z][a-z']+(\s+[A-Z][a-z']+){1,3}$", line):
					name = line
					break

			occupation = None
			job_patterns = [
				r"(Senior|Lead|Principal|Junior)?\s*(Software|Data|Cloud|Full.?Stack|DevOps|QA|UI\/UX)\s*(Engineer|Developer|Architect|Scientist|Analyst|Designer)",
				r"(Manager|Director|Head|VP|CTO|CEO|CFO|COO)",
				r"(Consultant|Specialist|Expert|Officer|Coordinator|Administrator)",
			]
			for line in text.splitlines()[:50]:
				line = line.strip()
				if not line or len(line) > 120:
					continue
				for pattern in job_patterns:
					if re.search(pattern, line, re.I):
						occupation = line
						break
				if occupation:
					break

			location = None
			m = None
			for line in text.splitlines()[:100]:
				m = re.search(r"\b([A-Za-z\s\-']+),\s*([A-Za-z\s\-']{2,})\b", line)
				if m:
					location = f"{m.group(1).strip()}, {m.group(2).strip()}"
					break

			payload = {
				"status": "success",
				"tool": tool_name,
				"arguments": arguments,
				"text": text,
				"extracted": {"name": name, "occupation": occupation, "location": location},
			}
		else:
			payload = {
				"status": "success",
				"tool": tool_name,
				"arguments": arguments,
				"message": f"Sandboxed execution of {tool_name}",
			}

		result = {"content": [{"type": "text", "text": json.dumps(payload)}]}
	except Exception as e:
		result = {"content": [{"type": "text", "text": json.dumps({"status": "error", "error": str(e)})}]}

	response = {"jsonrpc": "2.0", "id": id, "result": result}
	write_message(response)


def main() -> None:
	"""Main MCP server loop."""

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
				# Ignore unexpected notification; server should not send it proactively
				pass
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
