"""Conversation manager for the Python demo, mirroring the TypeScript flow."""

import asyncio
from typing import Iterable, List, Optional

from .agents import ComedyAgent


class ConversationManager:
	def __init__(self, agents: Iterable[ComedyAgent], max_iterations: int = 10):
		self.agents: List[ComedyAgent] = list(agents)
		self.max_iterations = max_iterations
		self.iteration = 0
		self.human_feedback_enabled = False

	async def start(self) -> None:
		print("\nComedy Protocol - Multi-Agent Conversation (Python)")
		print("=" * 50)
		print(f"Starting conversation with {len(self.agents)} agents")
		print(f"Max iterations: {self.max_iterations}")
		print("=" * 50 + "\n")

		# Run initial iterations without human feedback
		for _ in range(min(3, self.max_iterations)):
			await self.run_iteration()

		# Enable human feedback after initial iterations
		self.human_feedback_enabled = True
		print("\nHuman feedback enabled! You can now interact with the agents.\n")

		while self.iteration < self.max_iterations:
			await self.run_iteration()
			await self.request_human_feedback()

		print("\nConversation complete!")
		self.print_summary()

	async def run_iteration(self) -> None:
		self.iteration += 1
		print(f"\n{'=' * 50}")
		print(f"ITERATION {self.iteration}")
		print(f"{'=' * 50}")

		for agent in self.agents:
			await agent.take_turn(self.iteration)
			await asyncio.sleep(1)

	async def request_human_feedback(self) -> None:
		if not self.human_feedback_enabled:
			return

		print("\nHuman Feedback Options:")
		print("  [Enter] - Continue to next iteration")
		print("  'rate <agent> <1-10>' - Rate an agent's performance")
		print("  'comment <agent> <text>' - Comment on an agent")
		print("  'direction <text>' - Give direction to all agents")
		print("  'stop' - End conversation")
		print("  'summary' - Show conversation summary")

		# Use thread executor to avoid blocking the event loop
		loop = asyncio.get_event_loop()
		answer: str = await loop.run_in_executor(None, input, "\nYour input: ")
		feedback = self.parse_human_input(answer)
		if feedback:
			await self.apply_human_feedback(feedback)

	def parse_human_input(self, raw: str) -> Optional[dict]:
		trimmed = raw.strip()
		if not trimmed:
			return None

		lowered = trimmed.lower()
		if lowered == "stop":
			return {"type": "stop", "content": "Stop conversation"}

		if lowered == "summary":
			self.print_summary()
			return None

		if lowered.startswith("rate "):
			parts = lowered.split()
			if len(parts) == 3 and parts[2].isdigit():
				return {"type": "rating", "target": parts[1], "content": parts[2]}

		if lowered.startswith("comment "):
			parts = trimmed.split(maxsplit=2)
			if len(parts) == 3:
				return {"type": "comment", "target": parts[1], "content": parts[2]}

		if lowered.startswith("direction "):
			return {"type": "direction", "content": trimmed[len("direction "):].strip()}

		return None

	async def apply_human_feedback(self, feedback: dict) -> None:
		ftype = feedback.get("type")
		if ftype == "stop":
			print("\nStopping conversation per human request...")
			self.max_iterations = self.iteration  # stop after current iteration
			return

		if ftype == "direction":
			print(f"\nBroadcasting direction to all agents: \"{feedback.get('content')}\"")
			return

		target = feedback.get("target")
		if target:
			agent = next((a for a in self.agents if target.lower() in a.config.name.lower()), None)
			if agent:
				print(f"\n💬 Feedback for {agent.config.name}: {feedback.get('content')}")
			else:
				print(f"\n⚠️  Agent '{target}' not found")

	def print_summary(self) -> None:
		print("\n📊 Conversation Summary")
		print("=" * 50)
		print(f"Total iterations: {self.iteration}")
		print(f"Agents: {len(self.agents)}")

		for agent in self.agents:
			history = agent.get_conversation_history()
			print(f"\n{agent.config.name}:")
			print(f"  - Jokes contributed: {len(history)}")
			print(f"  - LLM: {agent.config.llm_provider}")

		print("\n" + "=" * 50)
