#!/usr/bin/env python3
"""
Run Job Application Assistant AI Agents (Python with sandboxing).

This script starts 3 autonomous AI agents that help with job applications:
- Agent 1: Job Hunter (OpenAI) - Searches and scores job matches
- Agent 2: CV Crafter (Claude) - Generates tailored CVs and cover letters
- Agent 3: Application Tracker (Grok) - Tracks applications and generates insights

Usage:
    python scripts/run_job_agents.py
    or
    USE_SANDBOX=true python scripts/run_job_agents.py
"""

import asyncio
import os
import sys
from pathlib import Path

# Add pyagents to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from pyagents.job_hunter_agent import JobHunterAgent, JobHunterConfig
from pyagents.cv_crafter_agent import CVCrafterAgent, CVCrafterConfig
from pyagents.application_tracker_agent import ApplicationTrackerAgent, ApplicationTrackerConfig
from pyagents.job_llm_providers import JobLLMProviderManager


def load_dev_vars() -> dict:
    """Load environment variables from .dev.vars file."""
    vars_dict = {}
    dev_vars_path = Path(__file__).parent.parent / ".dev.vars"
    
    if dev_vars_path.exists():
        with open(dev_vars_path, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    vars_dict[key.strip()] = value.strip()
    
    return vars_dict


async def main():
    """Main function to run all agents."""
    # Load environment variables
    dev_vars = load_dev_vars()
    for key, value in dev_vars.items():
        if key not in os.environ:
            os.environ[key] = value

    # Configuration from environment variables
    database_url = os.environ.get("DATABASE_URL")
    target_user_id = os.environ.get("TARGET_USER_ID", "samuel_student")

    # LLM API Keys
    openai_api_key = os.environ.get("OPENAI_API_KEY")
    anthropic_api_key = os.environ.get("ANTHROPIC_API_KEY")
    grok_api_key = os.environ.get("GROK_API_KEY") or os.environ.get("XAI_API_KEY")

    # Sandbox setting
    use_sandbox = os.environ.get("USE_SANDBOX", "false").lower() == "true"

    print("💼 Job Application Assistant - Multi-Agent System (Python)")
    print("=" * 60)
    print(f"Database: {'Connected' if database_url else 'NOT SET'}")
    print(f"Target User: {target_user_id}")
    print(f"Sandbox: {'Enabled' if use_sandbox else 'Disabled'}")
    print("=" * 60 + "\n")

    if not database_url:
        print("❌ ERROR: DATABASE_URL environment variable is required")
        sys.exit(1)

    # Validate API keys
    if not openai_api_key:
        print("❌ ERROR: OPENAI_API_KEY environment variable is required")
        sys.exit(1)
    if not anthropic_api_key:
        print("❌ ERROR: ANTHROPIC_API_KEY environment variable is required")
        sys.exit(1)
    if not grok_api_key:
        print("⚠️  WARNING: GROK_API_KEY not set. Application Tracker agent will use fallback behavior.")

    # Initialize LLM manager
    llm_manager = JobLLMProviderManager(
        openai_api_key=openai_api_key,
        anthropic_api_key=anthropic_api_key,
        grok_api_key=grok_api_key,
    )

    print("🤖 Initializing agents...\n")

    # Create agent configs
    job_hunter_config = JobHunterConfig(
        name="Job Hunter",
        agent_id="job-hunter-openai",
        database_url=database_url,
        llm_provider="openai",
        llm_api_key=openai_api_key,
        llm_model="gpt-4o",
        target_user_id=target_user_id,
    )

    cv_crafter_config = CVCrafterConfig(
        name="CV Crafter",
        agent_id="cv-crafter-claude",
        database_url=database_url,
        llm_provider="anthropic",
        llm_api_key=anthropic_api_key,
        llm_model="claude-3-sonnet-20240229",
        target_user_id=target_user_id,
    )

    application_tracker_config = ApplicationTrackerConfig(
        name="Application Tracker",
        agent_id="application-tracker-grok",
        database_url=database_url,
        llm_provider="grok",
        llm_api_key=grok_api_key,
        llm_model="grok-beta",
        target_user_id=target_user_id,
    )

    # Create agents
    job_hunter = JobHunterAgent(job_hunter_config, llm_manager, use_sandbox=use_sandbox)
    cv_crafter = CVCrafterAgent(cv_crafter_config, llm_manager, use_sandbox=use_sandbox)
    application_tracker = ApplicationTrackerAgent(
        application_tracker_config, llm_manager, use_sandbox=use_sandbox
    )

    # Connect all agents
    await job_hunter.connect()
    await cv_crafter.connect()
    await application_tracker.connect()

    print("\n✅ All 3 agents initialized!")
    print("\n🚀 Starting agent iterations...\n")
    print("Press Ctrl+C to stop\n")

    iteration = 1
    try:
        while True:
            print("=" * 60)
            print(f"ITERATION {iteration}")
            print("=" * 60)

            # Run all agents in parallel
            await asyncio.gather(
                job_hunter.take_turn(iteration),
                cv_crafter.take_turn(iteration),
                application_tracker.take_turn(iteration),
            )

            print(f"\n✅ Iteration {iteration} complete!")
            print("⏰ Next iteration in 5 minutes...\n")

            # Wait 5 minutes before next iteration
            await asyncio.sleep(300)  # 5 minutes
            iteration += 1

    except KeyboardInterrupt:
        print("\n\n🛑 Stopping agents...")
    finally:
        # Disconnect all agents
        await job_hunter.disconnect()
        await cv_crafter.disconnect()
        await application_tracker.disconnect()
        print("\n✅ All agents disconnected. Goodbye!")


if __name__ == "__main__":
    # On Windows, psycopg async requires selector-based loops instead of Proactor.
    if sys.platform.startswith("win"):
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())

