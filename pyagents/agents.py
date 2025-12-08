"""Python port of the ComedyAgent.

The implementation mirrors the behavior of the TypeScript agent but uses
in-memory helpers to keep the demo self contained.
"""

import random
from dataclasses import dataclass
from typing import Dict, List, Optional

from .database_client import AgentDatabaseClient
from .llm_providers import LLMProviderManager


@dataclass
class AgentConfig:
	name: str
	agent_id: str
	personality: str
	database_url: str
	llm_provider: str
	llm_api_key: Optional[str] = None
	llm_model: Optional[str] = None


class ComedyAgent:
	def __init__(self, config: AgentConfig, llm_manager: LLMProviderManager):
		self.config = config
		self.db_client = AgentDatabaseClient(config.database_url)
		self.llm_manager = llm_manager
		self.is_connected = False
		self.conversation_history: List[Dict[str, str]] = []

	async def connect(self) -> None:
		await self.db_client.connect()
		self.is_connected = True

	async def disconnect(self) -> None:
		await self.db_client.disconnect()
		self.is_connected = False

	async def get_random_joke(self, category: Optional[str] = None) -> Dict[str, str]:
		return await self.db_client.get_random_joke(category)

	async def add_joke(
		self,
		content: str,
		category: Optional[str],
		language: str = "en",
	) -> Dict[str, str]:
		return await self.db_client.add_joke(content, category, language, self.config.agent_id)

	async def rate_joke(self, joke_id: Optional[int], rating: int, comment: Optional[str]) -> Dict[str, str]:
		return await self.db_client.rate_joke(joke_id, self.config.agent_id, rating, comment)

	async def store_memory(
		self,
		joke_id: Optional[int],
		rating: int,
		notes: Optional[str],
		tags: Optional[List[str]],
	) -> Dict[str, str]:
		return await self.db_client.store_memory(joke_id, self.config.agent_id, rating, notes, tags)

	async def search_jokes(
		self,
		query: Optional[str] = None,
		category: Optional[str] = None,
		limit: int = 10,
	) -> List[Dict[str, str]]:
		return await self.db_client.search_jokes(query, category, None, limit)

	async def _evaluate_joke(self, joke: Dict[str, str]):
		provider = self.config.llm_provider
		model = self.config.llm_model or "default"
		try:
			return self.llm_manager.evaluate_joke(provider, model, self.config.personality, joke)
		except Exception as exc:
			# Fallback to a deterministic pseudo-score if stub ever fails
			print(f"  ⚠️  LLM evaluation failed, using fallback: {exc}")
			return self.llm_manager.evaluate_joke("local", "fallback", self.config.personality, joke)

	async def _generate_joke(self):
		provider = self.config.llm_provider
		model = self.config.llm_model or "default"
		try:
			return self.llm_manager.generate_joke(provider, model, self.config.personality)
		except Exception as exc:
			print(f"  ⚠️  Joke generation failed: {exc}")
			return None

	async def take_turn(self, iteration: int) -> None:
		print(f"\n[Agent] {self.config.name} ({self.config.llm_provider}) - Turn {iteration}")
		print(f"   Personality: {self.config.personality}")

		try:
			joke = await self.get_random_joke()
			if not joke or not joke.get("content"):
				print("  ⚠️  No joke found, skipping turn")
				return

			joke_id = joke.get("id")
			print(f"  Reading joke #{joke_id}: \"{joke.get('content')}\"")

			print(f"  Evaluating with {self.config.llm_provider}...")
			evaluation = await self._evaluate_joke(joke)

			if joke_id is not None:
				await self.rate_joke(joke_id, evaluation.rating, evaluation.comment)
				print(f"  Rated: {evaluation.rating}/10 - \"{evaluation.comment}\"")

				await self.store_memory(
					joke_id,
					evaluation.rating,
					evaluation.notes,
					evaluation.tags,
				)
				print(f"  Stored memory with tags: {', '.join(evaluation.tags)}")

			if random.random() >= 0.5:
				print("  Generating new joke...")
				generated = await self._generate_joke()
				if generated and generated.get("content"):
					await self.add_joke(generated["content"], generated.get("category"))
					self.conversation_history.append({
						"agent": self.config.name,
						"joke": generated["content"],
					})
					print(f"  Added new joke: \"{generated['content']}\"")

			print("  ✅ Turn complete!")
		except Exception as exc:
			print(f"  ❌ Error in turn: {exc}")

	def get_conversation_history(self) -> List[Dict[str, str]]:
		return list(self.conversation_history)
