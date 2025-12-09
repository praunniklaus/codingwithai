"""CV Crafter Agent (Agent 2) - Python implementation with sandboxing support.

Autonomous AI agent that:
- Generates tailored CVs for specific job applications
- Creates cover letters optimized for each role
- Analyzes skill gaps between user profile and job requirements
- Stores generated documents in generated_cvs and cover_letters tables
"""

from dataclasses import dataclass
from typing import Any, Dict, Optional

from .job_database_client import JobDatabaseClient
from .job_llm_providers import JobLLMProviderManager

try:
    from .job_sandbox_tools import SandboxedJobToolsWrapper
except ImportError:
    SandboxedJobToolsWrapper = None


@dataclass
class CVCrafterConfig:
    name: str
    agent_id: str
    database_url: str
    llm_provider: str
    llm_api_key: Optional[str] = None
    llm_model: Optional[str] = None
    target_user_id: str = ""


class CVCrafterAgent:
    """CV Crafter Agent - generates CVs and cover letters."""

    def __init__(
        self,
        config: CVCrafterConfig,
        llm_manager: JobLLMProviderManager,
        use_sandbox: bool = False,
    ):
        self.config = config
        self.db_client = JobDatabaseClient(config.database_url)
        self.llm_manager = llm_manager
        self.is_connected = False
        self.sandbox_tools = None

        # Initialize sandbox wrapper if requested and available
        if use_sandbox and SandboxedJobToolsWrapper:
            try:
                self.sandbox_tools = SandboxedJobToolsWrapper()
                print(f"[{config.name}] Sandbox protection enabled")
            except Exception as e:
                print(f"[{config.name}] Sandbox initialization failed: {e}, falling back to in-process")

    async def connect(self) -> None:
        """Connect to the database."""
        try:
            print(f"Agent {self.config.name} ({self.config.agent_id}) connecting...")
            await self.db_client.connect()
            self.is_connected = True
            print(f"Agent {self.config.name} connected!")
        except Exception as error:
            print(f"Failed to connect agent {self.config.name}: {error}")
            raise

    async def disconnect(self) -> None:
        """Disconnect from the database."""
        self.is_connected = False
        await self.db_client.disconnect()
        print(f"Agent {self.config.name} disconnected")

    async def take_turn(self, iteration: int) -> None:
        """Agent's iteration: Generate CVs and cover letters for draft applications."""
        print(f"\n📝 {self.config.name} ({self.config.llm_provider}) - Turn {iteration}")

        try:
            # 1. Find applications with status='draft'
            draft_applications = await self.db_client.get_applications(
                self.config.target_user_id, "draft"
            )
            print(f"  📋 Found {len(draft_applications)} draft application(s)")

            if len(draft_applications) == 0:
                print("  ⚠️  No draft applications found, skipping turn")
                return

            # 2. Get user profile
            user_profile = await self.db_client.get_user_profile(self.config.target_user_id)
            if not user_profile:
                print("  ⚠️  User profile not found")
                return

            # 3. Process each draft application
            for application in draft_applications:
                try:
                    job_title = application.get("job_title", "Unknown")
                    print(f"  🔨 Processing application #{application.get('id')} for: {job_title}")

                    # Get job details
                    job = await self.db_client.get_job_by_id(application["job_id"])
                    if not job:
                        print(f"  ⚠️  Job {application['job_id']} not found, skipping")
                        continue

                    # 4. Generate tailored CV using LLM
                    print("  ✨ Generating tailored CV...")
                    cv_result = self.llm_manager.generate_cv(
                        self.config.llm_provider,
                        self.config.llm_model or "default",
                        user_profile,
                        job,
                    )

                    if self.sandbox_tools:
                        saved_cv = await self.sandbox_tools.execute_sandboxed(
                            "save_cv",
                            {
                                "user_id": self.config.target_user_id,
                                "job_id": application["job_id"],
                                "content": cv_result.content,
                                "format": cv_result.format,
                            },
                            self.db_client,
                        )
                    else:
                        saved_cv = await self.db_client.save_cv(
                            self.config.target_user_id,
                            application["job_id"],
                            cv_result.content,
                            cv_result.format,
                        )
                    print(f"  ✅ CV generated (version {saved_cv.get('version', 1)})")

                    # 5. Generate cover letter using LLM
                    print("  ✨ Generating cover letter...")
                    cover_letter_result = self.llm_manager.generate_cover_letter(
                        self.config.llm_provider,
                        self.config.llm_model or "default",
                        user_profile,
                        job,
                        "professional",
                    )

                    if self.sandbox_tools:
                        saved_cover_letter = await self.sandbox_tools.execute_sandboxed(
                            "save_cover_letter",
                            {
                                "user_id": self.config.target_user_id,
                                "job_id": application["job_id"],
                                "content": cover_letter_result.content,
                                "tone": cover_letter_result.tone,
                            },
                            self.db_client,
                        )
                    else:
                        saved_cover_letter = await self.db_client.save_cover_letter(
                            self.config.target_user_id,
                            application["job_id"],
                            cover_letter_result.content,
                            cover_letter_result.tone,
                        )
                    print(f"  ✅ Cover letter generated (version {saved_cover_letter.get('version', 1)})")

                    # 6. Analyze skill gaps
                    await self._analyze_skill_gaps(user_profile, job)

                    # 7. Update application status to 'ready_to_submit'
                    if self.sandbox_tools:
                        await self.sandbox_tools.execute_sandboxed(
                            "update_application_status",
                            {
                                "application_id": application["id"],
                                "status": "ready_to_submit",
                                "notes": f"CV and cover letter generated by {self.config.name}",
                            },
                            self.db_client,
                        )
                    else:
                        await self.db_client.update_application_status(
                            application["id"],
                            "ready_to_submit",
                            f"CV and cover letter generated by {self.config.name}",
                        )
                    print("  ✅ Application status updated to 'ready_to_submit'")
                except Exception as error:
                    print(f"  ❌ Error processing application {application.get('id')}: {error}")
                    continue

            print(f"  ✅ Turn complete! Processed {len(draft_applications)} application(s)")
        except Exception as error:
            print(f"  ❌ Error in turn: {error}")

    async def _analyze_skill_gaps(self, user_profile: Dict[str, Any], job: Dict[str, Any]) -> None:
        """Analyze skill gaps between user profile and job requirements."""
        try:
            user_skills = {
                s.get("skill_name", "").lower() for s in user_profile.get("skills", [])
            }
            required_skills = [s.lower() for s in job.get("required_skills", [])]
            preferred_skills = [s.lower() for s in job.get("preferred_skills", [])]

            missing_required = [s for s in required_skills if s not in user_skills]
            missing_preferred = [s for s in preferred_skills if s not in user_skills]

            if missing_required or missing_preferred:
                insight_description = f"""Skill Gap Analysis for {job.get('title', 'Job')}:
Missing Required Skills: {', '.join(missing_required) or 'None'}
Missing Preferred Skills: {', '.join(missing_preferred) or 'None'}
Recommendation: Consider learning these skills to improve match."""

                if self.sandbox_tools:
                    await self.sandbox_tools.execute_sandboxed(
                        "add_insight",
                        {
                            "agent_id": self.config.agent_id,
                            "user_id": self.config.target_user_id,
                            "insight_type": "skill_gap",
                            "description": insight_description,
                            "metadata": {
                                "job_id": job["id"],
                                "job_title": job.get("title", ""),
                                "missing_required": missing_required,
                                "missing_preferred": missing_preferred,
                            },
                        },
                        self.db_client,
                    )
                else:
                    await self.db_client.add_insight(
                        self.config.agent_id,
                        self.config.target_user_id,
                        "skill_gap",
                        insight_description,
                        {
                            "job_id": job["id"],
                            "job_title": job.get("title", ""),
                            "missing_required": missing_required,
                            "missing_preferred": missing_preferred,
                        },
                    )

                print("  📊 Skill gap analysis completed")
        except Exception as error:
            print(f"  ⚠️  Error analyzing skill gaps: {error}")

