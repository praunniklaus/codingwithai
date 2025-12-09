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
import os
import asyncio
from typing import Any, Dict

# Add project root to path for lazy imports later
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# Global database client
db_client = None


def read_message() -> Dict[str, Any]:
    """Read a JSON-RPC message from stdin."""
    line = sys.stdin.readline()
    if not line:
        return {}
    return json.loads(line.strip())


def write_message(message: Dict[str, Any]) -> None:
    """Write a JSON-RPC message to stdout."""
    print(json.dumps(message), flush=True)
    sys.stdout.flush()


def handle_initialize(id: Any) -> None:
    """Handle initialize request."""
    response = {
        "jsonrpc": "2.0",
        "id": id,
        "result": {
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "tools": {},
            },
            "serverInfo": {
                "name": "job-application-mcp-server",
                "version": "1.0.0",
            },
        },
    }
    write_message(response)

    # Send initialized notification with required params
    notification = {
        "jsonrpc": "2.0",
        "method": "notifications/initialized",
        "params": {},
    }
    write_message(notification)


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


async def execute_tool(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute a tool call with actual database operations."""
    global db_client
    # Lazy import to avoid exit when psycopg is missing before pip install
    try:
        from pyagents.job_database_client import JobDatabaseClient
    except ImportError as e:
        return {
            "status": "error",
            "tool": tool_name,
            "error": f"Database client import failed (psycopg missing?): {e}",
        }

    if not db_client:
        # Initialize database connection on first use
        database_url = os.environ.get("DATABASE_URL")
        if not database_url:
            return {
                "status": "error",
                "tool": tool_name,
                "error": "DATABASE_URL not set in container environment",
            }
        try:
            db_client = JobDatabaseClient(database_url)
            await db_client.connect()
        except Exception as e:
            return {
                "status": "error",
                "tool": tool_name,
                "error": f"Database connect failed: {e}",
            }
    
    try:
        if tool_name == "add_recommendation":
            result = await db_client.add_recommendation(
                arguments["user_id"],
                arguments["job_id"],
                arguments["match_score"],
                arguments["reasoning"],
            )
        elif tool_name == "save_cv":
            result = await db_client.save_cv(
                arguments["user_id"],
                arguments["job_id"],
                arguments["content"],
                arguments.get("format", "markdown"),
            )
        elif tool_name == "save_cover_letter":
            result = await db_client.save_cover_letter(
                arguments["user_id"],
                arguments["job_id"],
                arguments["content"],
                arguments.get("tone", "professional"),
            )
        elif tool_name == "update_application_status":
            result = await db_client.update_application_status(
                arguments["application_id"],
                arguments["status"],
                arguments.get("notes"),
            )
        elif tool_name == "add_insight":
            result = await db_client.add_insight(
                arguments["agent_id"],
                arguments["user_id"],
                arguments["insight_type"],
                arguments["description"],
                arguments.get("metadata"),
            )
        else:
            raise ValueError(f"Unknown tool: {tool_name}")
        
        return {
            "status": "success",
            "tool": tool_name,
            "result": result,
        }
    except Exception as e:
        return {
            "status": "error",
            "tool": tool_name,
            "error": str(e),
        }


def handle_call_tool(id: Any, tool_name: str, arguments: Dict[str, Any]) -> None:
    """Execute a tool call (sandboxed with actual database operations)."""
    try:
        # Run async operation in event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        exec_result = loop.run_until_complete(execute_tool(tool_name, arguments))
        loop.close()
        
        result = {
            "content": [
                {
                    "type": "text",
                    "text": json.dumps(exec_result),
                }
            ]
        }
        
        response = {"jsonrpc": "2.0", "id": id, "result": result}
        write_message(response)
    except Exception as e:
        error_response = {
            "jsonrpc": "2.0",
            "id": id,
            "error": {
                "code": -32603,
                "message": f"Tool execution failed: {str(e)}",
            },
        }
        write_message(error_response)


def main() -> None:
    """Main MCP server loop."""
    global db_client
    
    try:
        while True:
            try:
                message = read_message()
                if not message:
                    break

                method = message.get("method")
                params = message.get("params", {})
                msg_id = message.get("id")

                if method == "initialize":
                    handle_initialize(msg_id)
                elif method == "tools/list":
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
                    "id": msg_id if 'msg_id' in locals() else None,
                    "error": {"code": -32603, "message": str(e)},
                }
                write_message(error_response)
    finally:
        # Cleanup database connection on exit
        if db_client:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(db_client.disconnect())
            except Exception:
                pass
            loop.close()


if __name__ == "__main__":
    main()

