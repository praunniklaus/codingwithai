"""MCP server for Job Application Assistant tools (sandboxed execution).

This server runs inside a Docker container and handles tool calls for:
- add_recommendation
- save_cv
- save_cover_letter
- update_application_status
- add_insight
"""

import json
import sys
from typing import Any, Dict


def read_message() -> Dict[str, Any]:
    """Read a JSON-RPC message from stdin."""
    line = sys.stdin.readline()
    if not line:
        return {}
    return json.loads(line.strip())


def write_message(message: Dict[str, Any]) -> None:
    """Write a JSON-RPC message to stdout."""
    print(json.dumps(message))
    sys.stdout.flush()


def handle_list_tools(id: Any) -> None:
    """Handle tools/list request."""
    tools = [
        {
            "name": "add_recommendation",
            "description": "Add a job recommendation for a user",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "user_id": {"type": "string"},
                    "job_id": {"type": "integer"},
                    "match_score": {"type": "integer"},
                    "reasoning": {"type": "string"},
                },
                "required": ["user_id", "job_id", "match_score", "reasoning"],
            },
        },
        {
            "name": "save_cv",
            "description": "Save a generated CV",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "user_id": {"type": "string"},
                    "job_id": {"type": "integer"},
                    "content": {"type": "string"},
                    "format": {"type": "string"},
                },
                "required": ["user_id", "job_id", "content"],
            },
        },
        {
            "name": "save_cover_letter",
            "description": "Save a generated cover letter",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "user_id": {"type": "string"},
                    "job_id": {"type": "integer"},
                    "content": {"type": "string"},
                    "tone": {"type": "string"},
                },
                "required": ["user_id", "job_id", "content"],
            },
        },
        {
            "name": "update_application_status",
            "description": "Update application status",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "application_id": {"type": "integer"},
                    "status": {"type": "string"},
                    "notes": {"type": "string"},
                },
                "required": ["application_id", "status"],
            },
        },
        {
            "name": "add_insight",
            "description": "Add an agent insight",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "agent_id": {"type": "string"},
                    "user_id": {"type": "string"},
                    "insight_type": {"type": "string"},
                    "description": {"type": "string"},
                    "metadata": {"type": "object"},
                },
                "required": ["agent_id", "user_id", "insight_type", "description"],
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
    while True:
        try:
            message = read_message()
            if not message:
                break

            method = message.get("method")
            params = message.get("params", {})
            msg_id = message.get("id")

            if method == "tools/list":
                handle_list_tools(msg_id)
            elif method == "tools/call":
                tool_name = params.get("name", "")
                arguments = params.get("arguments", {})
                handle_call_tool(msg_id, tool_name, arguments)
            else:
                error_response = {
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "error": {"code": -32601, "message": f"Method not found: {method}"},
                }
                write_message(error_response)
        except Exception as e:
            error_response = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {"code": -32603, "message": str(e)},
            }
            write_message(error_response)


if __name__ == "__main__":
    main()

