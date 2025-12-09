"""Application Tracker Agent (Agent 3) - Python implementation with sandboxing support.

Autonomous AI agent that:
- Monitors all applications across different statuses
- Identifies stale applications (7+ days without updates)
- Generates follow-up reminders
- Analyzes patterns (success rates, bottlenecks)
- Creates weekly reports with insights
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from .job_database_client import JobDatabaseClient
from .job_llm_providers import JobLLMProviderManager

try:
    from .job_sandbox_tools import SandboxedJobToolsWrapper
except ImportError:
    SandboxedJobToolsWrapper = None


@dataclass
class ApplicationTrackerConfig:
    name: str
    agent_id: str
    database_url: str
    llm_provider: str
    llm_api_key: Optional[str] = None
    llm_model: Optional[str] = None
    target_user_id: str = ""


class ApplicationTrackerAgent:
    """Application Tracker Agent - monitors and analyzes applications."""

    def __init__(
        self,
        config: ApplicationTrackerConfig,
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
        """Agent's iteration: Track applications and generate insights."""
        print(f"\n📊 {self.config.name} ({self.config.llm_provider}) - Turn {iteration}")

        try:
            # 1. Fetch all applications
            all_applications = await self.db_client.get_applications(self.config.target_user_id)
            print(f"  📋 Found {len(all_applications)} total application(s)")

            if len(all_applications) == 0:
                print("  ⚠️  No applications found, skipping turn")
                return

            # 2. Identify stale applications (7+ days without updates)
            stale_applications = await self._identify_stale_applications(all_applications)
            print(f"  ⏰ Found {len(stale_applications)} stale application(s)")

            # 3. Calculate success metrics
            metrics = self._calculate_metrics(all_applications)
            print(f"  📈 Success rate: {metrics['success_rate']}%")
            print(f"  📊 Status breakdown: {metrics['status_breakdown']}")

            # 4. Use LLM to identify patterns
            if len(all_applications) > 0:
                insights = self.llm_manager.analyze_applications(
                    self.config.llm_provider,
                    self.config.llm_model or "default",
                    all_applications,
                )

                # 5. Store insights
                for insight in insights:
                    if self.sandbox_tools:
                        await self.sandbox_tools.execute_sandboxed(
                            "add_insight",
                            {
                                "agent_id": self.config.agent_id,
                                "user_id": self.config.target_user_id,
                                "insight_type": insight.insight_type,
                                "description": insight.description,
                                "metadata": insight.metadata,
                            },
                            self.db_client,
                        )
                    else:
                        await self.db_client.add_insight(
                            self.config.agent_id,
                            self.config.target_user_id,
                            insight.insight_type,
                            insight.description,
                            insight.metadata,
                        )

                print(f"  💡 Generated {len(insights)} insight(s)")

            # 6. Generate follow-up reminders for stale applications
            if len(stale_applications) > 0:
                await self._generate_follow_up_reminders(stale_applications)

            print("  ✅ Turn complete!")
        except Exception as error:
            print(f"  ❌ Error in turn: {error}")

    async def _identify_stale_applications(
        self, applications: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Identify stale applications (7+ days without updates)."""
        stale = []
        seven_days_ago = datetime.now() - timedelta(days=7)

        for app in applications:
            # Get latest event
            events = await self.db_client.get_application_events(app["id"])
            if len(events) == 0:
                continue

            latest_event = events[0]
            event_date = latest_event.get("event_date")
            if isinstance(event_date, str):
                event_date = datetime.fromisoformat(event_date.replace("Z", "+00:00"))

            app_status = app.get("status", "")
            if (
                event_date < seven_days_ago
                and app_status != "rejected"
                and app_status != "withdrawn"
            ):
                stale.append(app)

        return stale

    def _calculate_metrics(self, applications: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate success metrics."""
        status_breakdown = {}
        submitted = 0
        offers = 0

        for app in applications:
            status = app.get("status", "")
            status_breakdown[status] = status_breakdown.get(status, 0) + 1

            if status in ["submitted", "under_review", "interview", "offer", "rejected"]:
                submitted += 1
            if status == "offer":
                offers += 1

        success_rate = f"{(offers / submitted * 100):.2f}" if submitted > 0 else "0.00"

        return {
            "total": len(applications),
            "submitted": submitted,
            "offers": offers,
            "success_rate": success_rate,
            "status_breakdown": status_breakdown,
        }

    async def _generate_follow_up_reminders(
        self, stale_applications: List[Dict[str, Any]]
    ) -> None:
        """Generate follow-up reminders for stale applications."""
        for app in stale_applications:
            updated_at = app.get("updated_at", "")
            if isinstance(updated_at, str):
                updated_at = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
            else:
                updated_at = datetime.now()

            days_since_update = (datetime.now() - updated_at).days

            reminder_description = f"""Follow-up Reminder:
Application for {app.get('job_title', 'Unknown')} at {app.get('job_company', 'Unknown')} has been {app.get('status', 'unknown')} for {days_since_update} days.
Consider following up with the employer to check on status."""

            if self.sandbox_tools:
                await self.sandbox_tools.execute_sandboxed(
                    "add_insight",
                    {
                        "agent_id": self.config.agent_id,
                        "user_id": self.config.target_user_id,
                        "insight_type": "follow_up_reminder",
                        "description": reminder_description,
                        "metadata": {
                            "application_id": app["id"],
                            "job_title": app.get("job_title", ""),
                            "company": app.get("job_company", ""),
                            "status": app.get("status", ""),
                            "days_since_update": days_since_update,
                        },
                    },
                    self.db_client,
                )
            else:
                await self.db_client.add_insight(
                    self.config.agent_id,
                    self.config.target_user_id,
                    "follow_up_reminder",
                    reminder_description,
                    {
                        "application_id": app["id"],
                        "job_title": app.get("job_title", ""),
                        "company": app.get("job_company", ""),
                        "status": app.get("status", ""),
                        "days_since_update": days_since_update,
                    },
                )

        print(f"  📧 Generated {len(stale_applications)} follow-up reminder(s)")

