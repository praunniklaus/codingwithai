"""In-memory stand-in for the database client.

The TypeScript version connects to PostgreSQL. For the Python demo we keep
state in memory so the script can run without external services.
"""

import itertools
import random
from typing import Any, Dict, List, Optional


class AgentDatabaseClient:
	def __init__(self, database_url: Optional[str]):
		self.database_url = database_url
		self._jokes: List[Dict[str, Any]] = []
		self._ratings: List[Dict[str, Any]] = []
		self._ids = itertools.count(1)
		self._connected = False

	async def connect(self) -> None:
		self._connected = True
		if not self._jokes:
			self._seed_jokes()

	async def disconnect(self) -> None:
		self._connected = False

	async def get_random_joke(self, category: Optional[str] = None) -> Dict[str, Any]:
		filtered = [j for j in self._jokes if not category or j.get("category") == category]
		if not filtered:
			return {"id": None, "content": "No jokes available yet."}
		return random.choice(filtered)

	async def add_joke(
		self,
		content: str,
		category: Optional[str],
		language: str,
		agent_id: str,
	) -> Dict[str, Any]:
		joke = {
			"id": next(self._ids),
			"content": content,
			"category": category or "general",
			"language": language,
			"agent_id": agent_id,
		}
		self._jokes.append(joke)
		return joke

	async def rate_joke(
		self,
		joke_id: Optional[int],
		agent_id: str,
		rating: int,
		comment: Optional[str],
	) -> Dict[str, Any]:
		rating_entry = {
			"joke_id": joke_id,
			"agent_id": agent_id,
			"rating": rating,
			"comment": comment,
		}
		self._ratings.append(rating_entry)
		return rating_entry

	async def store_memory(
		self,
		joke_id: Optional[int],
		agent_id: str,
		rating: int,
		notes: Optional[str],
		tags: Optional[List[str]],
	) -> Dict[str, Any]:
		return {
			"joke_id": joke_id,
			"agent_id": agent_id,
			"rating": rating,
			"notes": notes,
			"tags": tags or [],
		}

	async def search_jokes(
		self,
		query: Optional[str],
		category: Optional[str],
		language: Optional[str],
		limit: int,
	) -> List[Dict[str, Any]]:
		matches = [
			j for j in self._jokes
			if (not query or query.lower() in j.get("content", "").lower())
			and (not category or j.get("category") == category)
			and (not language or j.get("language") == language)
		]
		return matches[:limit]

	def _seed_jokes(self) -> None:
		self._jokes.extend(
			[
				{
					"id": next(self._ids),
					"content": "Why did the agent cross the road? To get better context.",
					"category": "general",
					"language": "en",
					"agent_id": "seed",
				},
				{
					"id": next(self._ids),
					"content": "The database went on vacation. It needed a little replication.",
					"category": "tech",
					"language": "en",
					"agent_id": "seed",
				},
			]
		)
