"""Python port of the multi-agent launcher.

This script mirrors `scripts/run-agents.ts` but uses the lightweight Python
implementations under `pyagents`. External API calls are stubbed so the script
runs without cloud credentials while keeping the flow familiar.
"""

from __future__ import annotations

import asyncio
import os
from pathlib import Path
from typing import List

from pyagents.agents import AgentConfig, ComedyAgent
from pyagents.conversation_manager import ConversationManager
from pyagents.llm_providers import LLMProviderManager


def load_dev_vars() -> None:
	"""Populate environment variables from a `.dev.vars` file if present."""
	dev_vars_path = Path(".dev.vars")
	if not dev_vars_path.exists():
		return

	for line in dev_vars_path.read_text(encoding="utf-8").splitlines():
		trimmed = line.strip()
		if not trimmed or trimmed.startswith("#") or "=" not in trimmed:
			continue
		key, value = trimmed.split("=", 1)
		if key and value and key not in os.environ:
			os.environ[key] = value.strip()


def build_agent_configs(database_url: str, llm_manager: LLMProviderManager) -> List[ComedyAgent]:
	configs = [
		AgentConfig(
			name="Pun Master",
			agent_id="pun-master-openai",
			personality=(
				"Witty comedian who loves wordplay, puns, and clever linguistic humor."
			),
			database_url=database_url,
			llm_provider="openai",
			llm_api_key=os.getenv("OPENAI_API_KEY"),
			llm_model="gpt-4o-mini",
		),
		AgentConfig(
			name="Science Joker",
			agent_id="science-joker-claude",
			personality=(
				"Science and technology humor specialist focused on math and physics jokes."
			),
			database_url=database_url,
			llm_provider="anthropic",
			llm_api_key=os.getenv("ANTHROPIC_API_KEY"),
			llm_model="claude-3-5-haiku-latest",
		),
		AgentConfig(
			name="Observational Comedian",
			agent_id="observational-grok",
			personality=(
				"Observational comedian who finds humor in everyday life and human behavior."
			),
			database_url=database_url,
			llm_provider="grok",
			llm_api_key=os.getenv("GROK_API_KEY") or os.getenv("XAI_API_KEY"),
			llm_model="grok-3",
		),
		AgentConfig(
			name="Southern Conservative",
			agent_id="southern-conservative-openai",
			personality=(
				"Conservative humor with emphasis on tradition, family, and small government."
			),
			database_url=database_url,
			llm_provider="openai",
			llm_api_key=os.getenv("OPENAI_API_KEY"),
			llm_model="gpt-4o-mini",
		),
		AgentConfig(
			name="Bernie Sanders",
			agent_id="bernie-sanders-claude",
			personality=(
				"Progressive humor focused on inequality, healthcare, education, and climate."
			),
			database_url=database_url,
			llm_provider="anthropic",
			llm_api_key=os.getenv("ANTHROPIC_API_KEY"),
			llm_model="claude-3-5-haiku-latest",
		),
	]

	agents: List[ComedyAgent] = [ComedyAgent(config, llm_manager) for config in configs]
	return agents


async def main() -> None:
	load_dev_vars()

	database_url = os.getenv("DATABASE_URL", "memory://jokes")
	max_iterations = int(os.getenv("MAX_ITERATIONS", "10"))

	openai_api_key = os.getenv("OPENAI_API_KEY")
	anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
	grok_api_key = os.getenv("GROK_API_KEY") or os.getenv("XAI_API_KEY")

	if not database_url:
		print("DATABASE_URL not set. Using in-memory store for demo purposes.")

	llm_manager = LLMProviderManager(openai_api_key, anthropic_api_key, grok_api_key)
	agents = build_agent_configs(database_url, llm_manager)

	print("Comedy Protocol - Python agents")
	print(f"Database: {database_url}")
	print(f"Max iterations: {max_iterations}")

	for agent in agents:
		await agent.connect()

	manager = ConversationManager(agents, max_iterations=max_iterations)
	await manager.start()

	for agent in agents:
		await agent.disconnect()


if __name__ == "__main__":
	asyncio.run(main())
