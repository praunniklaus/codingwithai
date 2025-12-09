"""Job Hunter Agent (Agent 1) - Python implementation with sandboxing support.

Autonomous AI agent that:
- Searches job listings matching user profile
- Scores each job 0-100 based on skills/location/salary match
- Stores recommendations with reasoning in job_recommendations table
- Generates market insights about job trends
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
class JobHunterConfig:
    name: str
    agent_id: str
    database_url: str
    llm_provider: str
    llm_api_key: Optional[str] = None
    llm_model: Optional[str] = None
    target_user_id: str = ""


class JobHunterAgent:
    """Job Hunter Agent - finds and scores job matches."""

    def __init__(
        self,
        config: JobHunterConfig,
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
        """Agent's iteration: Search and score jobs."""
        print(f"\n🔍 {self.config.name} ({self.config.llm_provider}) - Turn {iteration}")

        try:
            # 1. Fetch user profile
            user_profile = await self.db_client.get_user_profile(self.config.target_user_id)
            if not user_profile:
                print(f"  ⚠️  User profile not found for {self.config.target_user_id}")
                return

            print(f"  👤 Analyzing profile for: {user_profile.get('name', 'Unknown')}")

            # 2. Get job listings
            job_listings = await self.db_client.get_job_listings(50)
            print(f"  📋 Found {len(job_listings)} job listings")

            if len(job_listings) == 0:
                print("  ⚠️  No job listings found, skipping turn")
                return

            # 3. Score each job with LLM
            scored_count = 0
            recommended_count = 0

            for job in job_listings:
                try:
                    print(f"  🤔 Scoring: {job.get('title', 'Unknown')} at {job.get('company', 'Unknown')}...")

                    match_result = self.llm_manager.score_job_match(
                        self.config.llm_provider,
                        self.config.llm_model or "default",
                        user_profile,
                        job,
                    )

                    scored_count += 1

                    # 4. If score >= 60, save to recommendations
                    if match_result.score >= 60:
                        if self.sandbox_tools:
                            await self.sandbox_tools.execute_sandboxed(
                                "add_recommendation",
                                {
                                    "user_id": self.config.target_user_id,
                                    "job_id": job["id"],
                                    "match_score": match_result.score,
                                    "reasoning": match_result.reasoning,
                                },
                                self.db_client,
                            )
                        else:
                            await self.db_client.add_recommendation(
                                self.config.target_user_id,
                                job["id"],
                                match_result.score,
                                match_result.reasoning,
                            )

                        recommended_count += 1
                        print(f"  ✅ Recommended ({match_result.score}/100): {job.get('title', 'Unknown')}")
                        print(f"     Reasoning: {match_result.reasoning[:100]}...")
                    else:
                        print(f"  ⏭️  Skipped ({match_result.score}/100): {job.get('title', 'Unknown')}")
                except Exception as error:
                    print(f"  ❌ Error scoring job {job.get('id', 'unknown')}: {error}")
                    continue

            # 5. Generate market insights
            if scored_count > 0:
                await self._generate_market_insights(
                    user_profile, job_listings, scored_count, recommended_count
                )

            print(f"  ✅ Turn complete! Scored {scored_count} jobs, recommended {recommended_count}")
        except Exception as error:
            print(f"  ❌ Error in turn: {error}")

    async def _generate_market_insights(
        self,
        user_profile: Dict[str, Any],
        job_listings: list,
        scored_count: int,
        recommended_count: int,
    ) -> None:
        """Generate market insights about job trends."""
        try:
            # Analyze job market trends
            skills_in_demand = {}
            locations = {}
            experience_levels = {}

            for job in job_listings:
                for skill in job.get("required_skills", []):
                    skills_in_demand[skill] = skills_in_demand.get(skill, 0) + 1
                location = job.get("location")
                if location:
                    locations[location] = locations.get(location, 0) + 1
                exp_level = job.get("experience_level")
                if exp_level:
                    experience_levels[exp_level] = experience_levels.get(exp_level, 0) + 1

            top_skills = sorted(
                skills_in_demand.items(), key=lambda x: x[1], reverse=True
            )[:5]
            top_skills_list = [skill for skill, _ in top_skills]

            insight_description = f"""Market Analysis:
- Analyzed {scored_count} job listings
- Found {recommended_count} strong matches (score >= 60)
- Top skills in demand: {', '.join(top_skills_list)}
- Most common locations: {', '.join(list(locations.keys())[:3])}
- Experience levels: {', '.join(list(experience_levels.keys()))}"""

            if self.sandbox_tools:
                await self.sandbox_tools.execute_sandboxed(
                    "add_insight",
                    {
                        "agent_id": self.config.agent_id,
                        "user_id": self.config.target_user_id,
                        "insight_type": "market_trend",
                        "description": insight_description,
                        "metadata": {
                            "scored_count": scored_count,
                            "recommended_count": recommended_count,
                            "top_skills": top_skills_list,
                            "locations": list(locations.keys()),
                        },
                    },
                    self.db_client,
                )
            else:
                await self.db_client.add_insight(
                    self.config.agent_id,
                    self.config.target_user_id,
                    "market_trend",
                    insight_description,
                    {
                        "scored_count": scored_count,
                        "recommended_count": recommended_count,
                        "top_skills": top_skills_list,
                        "locations": list(locations.keys()),
                    },
                )

            print("  📊 Market insights generated")
        except Exception as error:
            print(f"  ⚠️  Error generating insights: {error}")

