"""LLM provider manager for Job Application Assistant agents.

Supports OpenAI, Anthropic (Claude), and Grok (xAI) APIs for:
- Scoring job matches
- Generating CVs
- Generating cover letters
- Analyzing application patterns
"""

import json
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

try:
    from anthropic import Anthropic, AnthropicError  # type: ignore
except ImportError:
    Anthropic = None  # type: ignore
    AnthropicError = Exception  # type: ignore

try:
    import sys
    import importlib.util
    
    openai_spec = importlib.util.find_spec('openai')
    if openai_spec and openai_spec.origin:
        import openai as openai_module
        OpenAI = getattr(openai_module, 'OpenAI', None)
        OpenAIError = getattr(openai_module, 'OpenAIError', Exception)
        
        if not OpenAI:
            OpenAI = None  # type: ignore
            OpenAIError = Exception  # type: ignore
    else:
        OpenAI = None  # type: ignore
        OpenAIError = Exception  # type: ignore
except Exception as e:
    print(f"[LLM] OpenAI import failed: {e}")
    OpenAI = None  # type: ignore
    OpenAIError = Exception  # type: ignore


@dataclass
class JobMatchResult:
    score: int  # 0-100
    reasoning: str


@dataclass
class CVResult:
    content: str
    format: str  # 'markdown', 'plain', 'html'


@dataclass
class CoverLetterResult:
    content: str
    tone: str  # 'professional', 'friendly', 'formal', 'enthusiastic'


@dataclass
class ApplicationInsight:
    insight_type: str
    description: str
    metadata: Dict[str, Any]


class JobLLMProviderManager:
    """LLM manager for job application operations."""

    def __init__(
        self,
        openai_api_key: Optional[str],
        anthropic_api_key: Optional[str],
        grok_api_key: Optional[str],
    ):
        self.openai = OpenAI(api_key=openai_api_key) if openai_api_key and OpenAI else None
        self.anthropic = Anthropic(api_key=anthropic_api_key) if anthropic_api_key and Anthropic else None
        self.grok_api_key = grok_api_key
        self.grok = OpenAI(base_url="https://api.x.ai/v1", api_key=grok_api_key) if grok_api_key and OpenAI else None

    def score_job_match(
        self,
        provider: str,
        model: str,
        user_profile: Dict[str, Any],
        job: Dict[str, Any],
    ) -> JobMatchResult:
        """Score how well a job matches a user profile (0-100)."""
        prompt = self._build_job_match_prompt(user_profile, job)
        
        try:
            if provider == "openai" and self.openai:
                return self._score_match_openai(self.openai, model, prompt)
            if provider == "anthropic" and self.anthropic:
                return self._score_match_anthropic(self.anthropic, model, prompt)
            if provider == "grok" and self.grok:
                return self._score_match_openai(self.grok, model, prompt)
        except Exception as exc:
            print(f"  Warning: Job match scoring failed ({provider}): {exc}")

        return self._synthetic_job_match(user_profile, job)

    def generate_cv(
        self,
        provider: str,
        model: str,
        user_profile: Dict[str, Any],
        job: Dict[str, Any],
    ) -> CVResult:
        """Generate a tailored CV for a specific job."""
        prompt = self._build_cv_prompt(user_profile, job)
        
        try:
            if provider == "openai" and self.openai:
                return self._generate_cv_openai(self.openai, model, prompt)
            if provider == "anthropic" and self.anthropic:
                return self._generate_cv_anthropic(self.anthropic, model, prompt)
            if provider == "grok" and self.grok:
                return self._generate_cv_openai(self.grok, model, prompt)
        except Exception as exc:
            print(f"  Warning: CV generation failed ({provider}): {exc}")

        return self._synthetic_cv(user_profile, job)

    def generate_cover_letter(
        self,
        provider: str,
        model: str,
        user_profile: Dict[str, Any],
        job: Dict[str, Any],
        tone: str = "professional",
    ) -> CoverLetterResult:
        """Generate a cover letter for a specific job."""
        prompt = self._build_cover_letter_prompt(user_profile, job, tone)
        
        try:
            if provider == "openai" and self.openai:
                return self._generate_cover_letter_openai(self.openai, model, prompt)
            if provider == "anthropic" and self.anthropic:
                return self._generate_cover_letter_anthropic(self.anthropic, model, prompt)
            if provider == "grok" and self.grok:
                return self._generate_cover_letter_openai(self.grok, model, prompt)
        except Exception as exc:
            print(f"  Warning: Cover letter generation failed ({provider}): {exc}")

        return self._synthetic_cover_letter(user_profile, job, tone)

    def analyze_applications(
        self,
        provider: str,
        model: str,
        applications: List[Dict[str, Any]],
    ) -> List[ApplicationInsight]:
        """Analyze application patterns and generate insights."""
        prompt = self._build_analysis_prompt(applications)
        
        try:
            if provider == "openai" and self.openai:
                return self._analyze_applications_openai(self.openai, model, prompt, applications)
            if provider == "anthropic" and self.anthropic:
                return self._analyze_applications_anthropic(self.anthropic, model, prompt, applications)
            if provider == "grok" and self.grok:
                return self._analyze_applications_openai(self.grok, model, prompt, applications)
        except Exception as exc:
            print(f"  Warning: Application analysis failed ({provider}): {exc}")

        return self._synthetic_analysis(applications)

    # --- Prompt builders ---

    def _build_job_match_prompt(self, user_profile: Dict[str, Any], job: Dict[str, Any]) -> str:
        skills = [s.get("skill_name", "") for s in user_profile.get("skills", [])]
        return f"""Analyze how well this job matches the user profile and provide a score from 0-100.

User Profile:
- Name: {user_profile.get('name', 'N/A')}
- Target Role: {user_profile.get('target_role', 'N/A')}
- Location: {user_profile.get('location', 'N/A')}
- Skills: {', '.join(skills[:10])}
- Experience: {len(user_profile.get('experience', []))} positions
- Education: {len(user_profile.get('education', []))} entries

Job:
- Title: {job.get('title', 'N/A')}
- Company: {job.get('company', 'N/A')}
- Location: {job.get('location', 'N/A')}
- Required Skills: {', '.join(job.get('required_skills', [])[:10])}
- Experience Level: {job.get('experience_level', 'N/A')}
- Description: {job.get('description', '')[:500]}

Respond with JSON:
{{
  "score": <integer 0-100>,
  "reasoning": "<brief explanation of the match score>"
}}"""

    def _build_cv_prompt(self, user_profile: Dict[str, Any], job: Dict[str, Any]) -> str:
        return f"""Generate a tailored CV/resume for this job application.

User Profile:
{json.dumps(user_profile, indent=2)[:2000]}

Job Requirements:
- Title: {job.get('title', 'N/A')}
- Company: {job.get('company', 'N/A')}
- Required Skills: {', '.join(job.get('required_skills', [])[:10])}
- Description: {job.get('description', '')[:500]}

Create a professional CV in markdown format that highlights relevant experience and skills.
Respond with JSON:
{{
  "content": "<markdown CV content>",
  "format": "markdown"
}}"""

    def _build_cover_letter_prompt(
        self, user_profile: Dict[str, Any], job: Dict[str, Any], tone: str
    ) -> str:
        return f"""Generate a {tone} cover letter for this job application.

User Profile:
- Name: {user_profile.get('name', 'N/A')}
- Skills: {', '.join([s.get('skill_name', '') for s in user_profile.get('skills', [])][:5])}

Job:
- Title: {job.get('title', 'N/A')}
- Company: {job.get('company', 'N/A')}
- Description: {job.get('description', '')[:500]}

Write a {tone} cover letter (2-3 paragraphs) explaining why the candidate is a good fit.
Respond with JSON:
{{
  "content": "<cover letter text>",
  "tone": "{tone}"
}}"""

    def _build_analysis_prompt(self, applications: List[Dict[str, Any]]) -> str:
        apps_summary = "\n".join([
            f"- {app.get('job_title', 'N/A')} at {app.get('job_company', 'N/A')}: {app.get('status', 'N/A')}"
            for app in applications[:20]
        ])
        return f"""Analyze these job applications and identify patterns, trends, and actionable insights.

Applications ({len(applications)} total):
{apps_summary}

Provide insights in JSON array format:
[
  {{
    "insight_type": "<type>",
    "description": "<insight description>",
    "metadata": {{"key": "value"}}
  }}
]

Insight types: success_pattern, bottleneck, improvement_area, trend"""

    # --- Provider implementations ---

    def _score_match_openai(self, client: Any, model: str, prompt: str) -> JobMatchResult:
        messages = [
            {"role": "system", "content": "You are a job matching expert. Always respond with valid JSON."},
            {"role": "user", "content": prompt},
        ]
        resp = client.chat.completions.create(
            model=model or "gpt-4",
            messages=messages,
            temperature=0.3,
            max_tokens=200,
            response_format={"type": "json_object"},
        )
        content = resp.choices[0].message.content or ""
        return self._parse_match_result(content)

    def _score_match_anthropic(self, client: Any, model: str, prompt: str) -> JobMatchResult:
        message = client.messages.create(
            model=model or "claude-3-5-sonnet-20241022",
            max_tokens=200,
            temperature=0.3,
            messages=[{"role": "user", "content": prompt}],
        )
        content_blocks = message.content or []
        content = " ".join(block.text for block in content_blocks if getattr(block, "text", None))
        return self._parse_match_result(content)

    def _generate_cv_openai(self, client: Any, model: str, prompt: str) -> CVResult:
        messages = [
            {"role": "system", "content": "You are a professional CV writer. Always respond with valid JSON."},
            {"role": "user", "content": prompt},
        ]
        resp = client.chat.completions.create(
            model=model or "gpt-4",
            messages=messages,
            temperature=0.7,
            max_tokens=2000,
            response_format={"type": "json_object"},
        )
        content = resp.choices[0].message.content or ""
        return self._parse_cv_result(content)

    def _generate_cv_anthropic(self, client: Any, model: str, prompt: str) -> CVResult:
        message = client.messages.create(
            model=model or "claude-3-5-sonnet-20241022",
            max_tokens=2000,
            temperature=0.7,
            messages=[{"role": "user", "content": prompt}],
        )
        content_blocks = message.content or []
        content = " ".join(block.text for block in content_blocks if getattr(block, "text", None))
        return self._parse_cv_result(content)

    def _generate_cover_letter_openai(self, client: Any, model: str, prompt: str) -> CoverLetterResult:
        messages = [
            {"role": "system", "content": "You are a professional cover letter writer. Always respond with valid JSON."},
            {"role": "user", "content": prompt},
        ]
        resp = client.chat.completions.create(
            model=model or "gpt-4",
            messages=messages,
            temperature=0.7,
            max_tokens=800,
            response_format={"type": "json_object"},
        )
        content = resp.choices[0].message.content or ""
        return self._parse_cover_letter_result(content)

    def _generate_cover_letter_anthropic(self, client: Any, model: str, prompt: str) -> CoverLetterResult:
        message = client.messages.create(
            model=model or "claude-3-5-sonnet-20241022",
            max_tokens=800,
            temperature=0.7,
            messages=[{"role": "user", "content": prompt}],
        )
        content_blocks = message.content or []
        content = " ".join(block.text for block in content_blocks if getattr(block, "text", None))
        return self._parse_cover_letter_result(content)

    def _analyze_applications_openai(
        self, client: Any, model: str, prompt: str, applications: List[Dict[str, Any]]
    ) -> List[ApplicationInsight]:
        messages = [
            {"role": "system", "content": "You are an application tracking analyst. Always respond with valid JSON."},
            {"role": "user", "content": prompt},
        ]
        resp = client.chat.completions.create(
            model=model or "gpt-4",
            messages=messages,
            temperature=0.5,
            max_tokens=1000,
            response_format={"type": "json_object"},
        )
        content = resp.choices[0].message.content or ""
        return self._parse_analysis_result(content, applications)

    def _analyze_applications_anthropic(
        self, client: Any, model: str, prompt: str, applications: List[Dict[str, Any]]
    ) -> List[ApplicationInsight]:
        message = client.messages.create(
            model=model or "claude-3-5-sonnet-20241022",
            max_tokens=1000,
            temperature=0.5,
            messages=[{"role": "user", "content": prompt}],
        )
        content_blocks = message.content or []
        content = " ".join(block.text for block in content_blocks if getattr(block, "text", None))
        return self._parse_analysis_result(content, applications)

    # --- Parsing helpers ---

    def _parse_match_result(self, text: str) -> JobMatchResult:
        try:
            json_match = re.search(r'\{[\s\S]*\}', text)
            if json_match:
                payload = json.loads(json_match.group(0))
                score = int(payload.get("score", 50))
                reasoning = str(payload.get("reasoning", "No reasoning provided"))
                return JobMatchResult(score=max(0, min(100, score)), reasoning=reasoning)
        except Exception:
            pass
        # Fallback
        return JobMatchResult(score=50, reasoning="Failed to parse LLM response")

    def _parse_cv_result(self, text: str) -> CVResult:
        try:
            json_match = re.search(r'\{[\s\S]*\}', text)
            if json_match:
                payload = json.loads(json_match.group(0))
                content = str(payload.get("content", ""))
                format_type = str(payload.get("format", "markdown"))
                if content:
                    return CVResult(content=content, format=format_type)
        except Exception:
            pass
        # Fallback
        return CVResult(content="# CV\n\n[Failed to generate]", format="markdown")

    def _parse_cover_letter_result(self, text: str) -> CoverLetterResult:
        try:
            json_match = re.search(r'\{[\s\S]*\}', text)
            if json_match:
                payload = json.loads(json_match.group(0))
                content = str(payload.get("content", ""))
                tone = str(payload.get("tone", "professional"))
                if content:
                    return CoverLetterResult(content=content, tone=tone)
        except Exception:
            pass
        # Fallback
        return CoverLetterResult(content="[Failed to generate cover letter]", tone="professional")

    def _parse_analysis_result(self, text: str, applications: List[Dict[str, Any]]) -> List[ApplicationInsight]:
        try:
            json_match = re.search(r'\{[\s\S]*\}', text)
            if json_match:
                payload = json.loads(json_match.group(0))
                insights_list = payload.get("insights", []) or payload.get("data", [])
                if isinstance(insights_list, list):
                    return [
                        ApplicationInsight(
                            insight_type=ins.get("insight_type", "general"),
                            description=ins.get("description", ""),
                            metadata=ins.get("metadata", {}),
                        )
                        for ins in insights_list
                    ]
        except Exception:
            pass
        return self._synthetic_analysis(applications)

    # --- Synthetic fallbacks ---

    def _synthetic_job_match(self, user_profile: Dict[str, Any], job: Dict[str, Any]) -> JobMatchResult:
        # Simple scoring based on skills overlap
        user_skills = {s.get("skill_name", "").lower() for s in user_profile.get("skills", [])}
        job_skills = {s.lower() for s in job.get("required_skills", [])}
        overlap = len(user_skills & job_skills)
        total_required = len(job_skills) if job_skills else 1
        score = min(100, int((overlap / total_required) * 100) + 40)  # Base score 40-100
        reasoning = f"Skill overlap: {overlap}/{total_required} required skills match"
        return JobMatchResult(score=score, reasoning=reasoning)

    def _synthetic_cv(self, user_profile: Dict[str, Any], job: Dict[str, Any]) -> CVResult:
        name = user_profile.get("name", "Candidate")
        skills = [s.get("skill_name", "") for s in user_profile.get("skills", [])[:5]]
        content = f"""# {name}

## Skills
{', '.join(skills)}

## Experience
[Experience details would go here]

## Education
[Education details would go here]
"""
        return CVResult(content=content, format="markdown")

    def _synthetic_cover_letter(
        self, user_profile: Dict[str, Any], job: Dict[str, Any], tone: str
    ) -> CoverLetterResult:
        name = user_profile.get("name", "Candidate")
        company = job.get("company", "Company")
        content = f"""Dear Hiring Manager,

I am writing to express my interest in the {job.get('title', 'position')} at {company}.

[Cover letter content would be generated here]

Best regards,
{name}
"""
        return CoverLetterResult(content=content, tone=tone)

    def _synthetic_analysis(self, applications: List[Dict[str, Any]]) -> List[ApplicationInsight]:
        if not applications:
            return []
        
        statuses = {}
        for app in applications:
            status = app.get("status", "unknown")
            statuses[status] = statuses.get(status, 0) + 1
        
        return [
            ApplicationInsight(
                insight_type="trend",
                description=f"Application status breakdown: {dict(statuses)}",
                metadata={"status_breakdown": statuses},
            )
        ]

