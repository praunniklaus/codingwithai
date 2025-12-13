import os
import json
import sys
from typing import Dict, Optional

from .sandbox_tools import run_in_sandbox, SandboxedAgentToolsWrapper


def extract_fields_from_text(text: str) -> Dict[str, Optional[str]]:
    """Extract key CV fields using improved heuristics.

    Returns keys: name, occupation, location.
    """
    import re

    # Improved name extraction: look for longer lines (2-4 words) at the start
    # that look like a name (capitalized)
    name = None
    for line in text.splitlines()[:30]:  # Check first 30 lines
        line = line.strip()
        if not line or len(line) > 100:
            continue
        # Match lines with 2-4 capitalized words
        if re.match(r"^[A-Z][a-z']+(\s+[A-Z][a-z']+){1,3}$", line):
            name = line
            break

    # Improved occupation extraction: look for job titles in various sections
    occupation = None
    # Look for common job title keywords
    job_patterns = [
        r"(Senior|Lead|Principal|Junior)?\s*(Software|Data|Cloud|Full.?Stack|DevOps|QA|UI\/UX)\s*(Engineer|Developer|Architect|Scientist|Analyst|Designer)",
        r"(Manager|Director|Head|VP|CTO|CEO|CFO|COO)",
        r"(Consultant|Specialist|Expert|Officer|Coordinator|Administrator)",
    ]
    
    for line in text.splitlines()[:50]:  # Check first 50 lines
        line = line.strip()
        if not line or len(line) > 120:
            continue
        for pattern in job_patterns:
            if re.search(pattern, line, re.I):
                occupation = line
                break
        if occupation:
            break

    # Improved location extraction: look for city, country or city, state patterns
    location = None
    location_pattern = r"\b([A-Za-z\s\-']+),\s*([A-Za-z\s\-']{2,})\b"
    
    for line in text.splitlines()[:100]:  # Check first 100 lines
        m = re.search(location_pattern, line)
        if m:
            location = f"{m.group(1).strip()}, {m.group(2).strip()}"
            break

    return {
        "name": name,
        "occupation": occupation,
        "location": location,
    }


def parse_cv_file(file_path: str) -> Dict[str, Optional[str]]:
    """Parse a CV using full MCP sandbox tool and return extracted fields."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"CV file not found: {file_path}")

    # Use MCP sandboxed server to call cv_parse_text
    wrapper = SandboxedAgentToolsWrapper()
    try:
        # No db_client needed; pass None as this tool doesn't use it in-process
        result = None
        if getattr(wrapper, 'mcp_server', None):
            # Connect and call tool
            # Note: execute_sandboxed requires async; provide a synchronous shim here
            import asyncio
            async def _call():
                await wrapper.mcp_server.connect()
                resp = await wrapper.mcp_server.call_tool('cv_parse_text', { 'file_path': file_path })
                return resp
            resp = asyncio.get_event_loop().run_until_complete(_call())
            # MCP returns content list with text JSON
            content = resp.get('content', [])
            text_item = next((c for c in content if c.get('type') == 'text'), None)
            payload = json.loads(text_item.get('text')) if text_item else {}
            extracted = payload.get('extracted') or extract_fields_from_text(payload.get('text', '') or '')
            return extracted
        else:
            # Fallback to local extraction if sandbox not available
            print('[CV Parser] MCP sandbox not available, using local heuristics')
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                text = f.read()
            return extract_fields_from_text(text)
    except Exception as e:
        print(f"[CV Parser] MCP call failed: {e}")
        # Fallback in case of errors
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                text = f.read()
            return extract_fields_from_text(text)
        except Exception:
            return { 'name': None, 'occupation': None, 'location': None }


def handle_cv_parse(file_path: str) -> Dict[str, Optional[str]]:
    """Public entry for API to call."""
    return parse_cv_file(file_path)
