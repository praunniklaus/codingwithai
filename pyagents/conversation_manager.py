"""Conversation manager for the Python demo."""

from __future__ import annotations

import asyncio
from typing import Iterable, List

from .agents import ComedyAgent


class ConversationManager:
	def __init__(self, agents: Iterable[ComedyAgent], max_iterations: int = 10):
		self.agents: List[ComedyAgent] = list(agents)
		self.max_iterations = max_iterations
		self.iteration = 0

	async def start(self) -> None:
		print("Starting conversation loop")
		for _ in range(self.max_iterations):
			self.iteration += 1
			await self.run_iteration(self.iteration)

		print("Conversation complete")
		self.print_summary()

	async def run_iteration(self, iteration: int) -> None:
		print(f"\n=== Iteration {iteration} ===")
		for agent in self.agents:
			await agent.take_turn(iteration)
			await asyncio.sleep(0.1)

	def print_summary(self) -> None:
		print("\nSummary")
		for agent in self.agents:
			history = agent.get_conversation_history()
			print(f"- {agent.config.name}: {len(history)} jokes shared")
