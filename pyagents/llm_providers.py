"""Minimal LLM provider facade.

This keeps interfaces compatible with the TypeScript version while avoiding
external API calls. Ratings and jokes are generated locally so the Python demo
can run without network access or API credentials.
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Dict, Optional


@dataclass
class JokeEvaluation:
	rating: int
	comment: str
	notes: str
	tags: list[str]


class LLMProviderManager:
	"""Stubbed LLM manager that generates synthetic results."""

	def __init__(
		self,
		openai_api_key: Optional[str],
		anthropic_api_key: Optional[str],
		grok_api_key: Optional[str],
	):
		self.providers: Dict[str, Optional[str]] = {
			"openai": openai_api_key,
			"anthropic": anthropic_api_key,
			"grok": grok_api_key,
		}

	def evaluate_joke(
		self,
		provider: str,
		model: str,
		personality: str,
		joke: Dict[str, str],
	) -> JokeEvaluation:
		# Generate deterministic pseudo-rating to keep behavior stable
		seed_basis = (joke.get("content") or "") + provider + personality
		random.seed(seed_basis)
		rating = random.randint(5, 10)
		comment = f"Auto-rated {rating}/10 using {provider or 'local'}"
		notes = f"Personality hint: {personality[:120]}"
		tags = [provider or "local", "synthetic"]
		return JokeEvaluation(rating=rating, comment=comment, notes=notes, tags=tags)

	def generate_joke(
		self,
		provider: str,
		model: str,
		personality: str,
	) -> Dict[str, str]:
		candidates = [
			"Why did the database go to therapy? Too many unresolved relations.",
			"I told my LLM a joke about overfitting. It didn't get the general idea.",
			"The cloud worker quit. It couldn't handle the load balancing.",
			"I tried to join a table, but it was already committed.",
			"My agent walked into a bar and immediately started collecting context.",
		]
		seed_basis = provider + model + personality
		random.seed(seed_basis)
		content = random.choice(candidates)
		category = "tech"
		return {"content": content, "category": category}
