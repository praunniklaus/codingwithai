import os
import json
import sys
from typing import Dict, Optional

from .sandbox_tools import run_in_sandbox


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
    """Parse a CV from PDF, DOCX, or TXT in a sandbox and return extracted fields."""
    ext = os.path.splitext(file_path)[1].lower()
    
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"CV file not found: {file_path}")

    # Use a raw string (not f-string) to avoid escaping issues
    script = """
import sys, os, json

ext = os.path.splitext(sys.argv[1])[1].lower()
text = ""

try:
    if ext == ".txt":
        with open(sys.argv[1], "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()
    elif ext == ".docx":
        try:
            from docx import Document
            d = Document(sys.argv[1])
            text = "\\n".join([p.text for p in d.paragraphs])
        except Exception:
            text = ""
    elif ext == ".pdf":
        try:
            from pdfminer.high_level import extract_text
            text = extract_text(sys.argv[1]) or ""
        except Exception:
            text = ""
    else:
        with open(sys.argv[1], "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()
except Exception as e:
    import traceback
    sys.stderr.write(f"Error reading file: {e}\\n")
    sys.stderr.write(traceback.format_exc())
    text = ""

print(json.dumps({"text": text}))
"""

    result = run_in_sandbox(script, args=[file_path])
    
    # Log subprocess results for debugging
    if result.get("stderr"):
        print(f"[CV Parser] Sandbox stderr: {result.get('stderr')}")
    
    if result.get("returncode") != 0:
        raise RuntimeError(f"Sandbox process failed (code {result.get('returncode')}): {result.get('stderr', 'no error message')}")
    
    try:
        payload = json.loads(result["stdout"]) if result and result.get("stdout") else {"text": ""}
    except Exception as e:
        raise ValueError(f"Failed to parse sandbox output: {str(e)}. Output was: {result.get('stdout', 'empty')}")

    return extract_fields_from_text(payload.get("text", ""))


def handle_cv_parse(file_path: str) -> Dict[str, Optional[str]]:
    """Public entry for API to call."""
    return parse_cv_file(file_path)
