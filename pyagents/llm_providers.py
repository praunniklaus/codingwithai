"""LLM provider facade with real API calls and synthetic fallbacks.

Supports OpenAI, Anthropic, and Grok (xAI via OpenAI-compatible endpoint).
If a provider key is missing or a call fails, it falls back to deterministic
synthetic outputs so the demo keeps running.
"""

import json
import random
import re
from dataclasses import dataclass
from typing import Any, Dict, Optional

try:
	from anthropic import Anthropic, AnthropicError  # type: ignore
except ImportError:  # Soft dependency until installed
	Anthropic = None  # type: ignore
	AnthropicError = Exception  # type: ignore

# Explicit import to avoid conflict with agents SDK's openai submodule
try:
	import sys
	import importlib.util
	
	# Find the actual OpenAI SDK package (not agents SDK's openai submodule)
	openai_spec = importlib.util.find_spec('openai')
	if openai_spec and openai_spec.origin:
		# Import and check if it has the OpenAI client class
		import openai as openai_module
		OpenAI = getattr(openai_module, 'OpenAI', None)
		OpenAIError = getattr(openai_module, 'OpenAIError', Exception)
		
		if not OpenAI:
			# This is the agents SDK's openai module, not the real SDK
			print("[LLM] Warning: OpenAI SDK not found (agents SDK conflict)")
			OpenAI = None  # type: ignore
			OpenAIError = Exception  # type: ignore
	else:
		OpenAI = None  # type: ignore
		OpenAIError = Exception  # type: ignore
except Exception as e:
	print(f"[LLM] OpenAI import failed: {e}")
	OpenAI = None  # type: ignore
	OpenAIError = Exception  # type: ignore


@dataclass
class JokeEvaluation:
	rating: int
	comment: str
	notes: str
	tags: list[str]


class LLMProviderManager:
	"""LLM manager that calls real APIs when keys are present."""

	def __init__(
		self,
		openai_api_key: Optional[str],
		anthropic_api_key: Optional[str],
		grok_api_key: Optional[str],
	):
		self.openai = OpenAI(api_key=openai_api_key) if openai_api_key else None
		self.anthropic = Anthropic(api_key=anthropic_api_key) if anthropic_api_key else None
		self.grok = OpenAI(base_url="https://api.x.ai/v1", api_key=grok_api_key) if grok_api_key else None

	def evaluate_joke(
		self,
		provider: str,
		model: str,
		personality: str,
		joke: Dict[str, str],
	) -> JokeEvaluation:
		try:
			if provider == "openai" and self.openai:
				return self._evaluate_openai(self.openai, model, personality, joke)
			if provider == "anthropic" and self.anthropic:
				return self._evaluate_anthropic(self.anthropic, model, personality, joke)
			if provider == "grok" and self.grok:
				return self._evaluate_openai(self.grok, model, personality, joke)
		except (OpenAIError, AnthropicError, Exception) as exc:  # broad fallback
			print(f"  Warning: LLM evaluation failed ({provider}): {exc}")

		return self._synthetic_evaluation(provider, personality, joke)

	def generate_joke(
		self,
		provider: str,
		model: str,
		personality: str,
	) -> Dict[str, str]:
		try:
			if provider == "openai" and self.openai:
				return self._generate_openai(self.openai, model, personality)
			if provider == "anthropic" and self.anthropic:
				return self._generate_anthropic(self.anthropic, model, personality)
			if provider == "grok" and self.grok:
				return self._generate_openai(self.grok, model, personality)
		except (OpenAIError, AnthropicError, Exception) as exc:
			print(f"  Warning: Joke generation failed ({provider}): {exc}")

		return self._synthetic_generation(provider, personality)

	# --- Provider implementations ---

	def _evaluate_openai(self, client: Any, model: str, personality: str, joke: Dict[str, str]) -> JokeEvaluation:
		prompt = (
			"You are a comedy judge. Rate the joke 1-10 and respond in JSON with keys "
			"rating (int), comment (short string), notes (short string), tags (array of strings)."
		)
		messages = [
			{"role": "system", "content": prompt},
			{"role": "user", "content": f"Personality: {personality}\nJoke: {joke.get('content','')}"},
		]
		resp = client.chat.completions.create(model=model, messages=messages, temperature=0.6, max_tokens=150)
		content = resp.choices[0].message.content or ""
		return self._parse_evaluation_json(content, provider="openai", personality=personality, joke=joke)

	def _evaluate_anthropic(self, client: Any, model: str, personality: str, joke: Dict[str, str]) -> JokeEvaluation:
		prompt = (
			"You are a comedy judge. Rate the joke 1-10 and respond in JSON with keys "
			"rating (int), comment (short string), notes (short string), tags (array of strings)."
		)
		message = client.messages.create(
			model=model,
			max_tokens=150,
			temperature=0.6,
			messages=[
				{"role": "user", "content": prompt + f"\nPersonality: {personality}\nJoke: {joke.get('content','')}"}
			],
		)
		content_blocks = message.content or []
		content = " ".join(block.text for block in content_blocks if getattr(block, "text", None))
		return self._parse_evaluation_json(content, provider="anthropic", personality=personality, joke=joke)

	def _generate_openai(self, client: Any, model: str, personality: str) -> Dict[str, str]:
		messages = [
			{"role": "system", "content": "Write one short joke. Respond with JSON: {\"content\": str, \"category\": str}"},
			{"role": "user", "content": f"Personality: {personality}"},
		]
		resp = client.chat.completions.create(model=model, messages=messages, temperature=0.8, max_tokens=120)
		content = resp.choices[0].message.content or ""
		return self._parse_generation_json(content, provider="openai", personality=personality)

	def _generate_anthropic(self, client: Any, model: str, personality: str) -> Dict[str, str]:
		message = client.messages.create(
			model=model,
			max_tokens=120,
			temperature=0.8,
			messages=[
				{
					"role": "user",
					"content": "Write one short joke. Respond with JSON: {\"content\": str, \"category\": str}\n"
					f"Personality: {personality}",
				}
			],
		)
		content_blocks = message.content or []
		content = " ".join(block.text for block in content_blocks if getattr(block, "text", None))
		return self._parse_generation_json(content, provider="anthropic", personality=personality)

	# --- Parsing helpers ---

	def _parse_evaluation_json(self, text: str, provider: str, personality: str, joke: Dict[str, str]) -> JokeEvaluation:
		try:
			payload = json.loads(text)
			rating = int(payload.get("rating", 0))
			comment = str(payload.get("comment", "")) or "No comment"
			notes = str(payload.get("notes", "")) or ""
			tags = payload.get("tags", []) or []
		except Exception:
			rating = self._extract_rating(text) or 7
			comment = text.strip()[:120] or "Auto-rated"
			notes = f"Personality hint: {personality[:120]}"
			tags = [provider, "parsed"]

		rating = max(1, min(10, rating))
		return JokeEvaluation(rating=rating, comment=comment, notes=notes, tags=tags)

	def _parse_generation_json(self, text: str, provider: str, personality: str) -> Dict[str, str]:
		try:
			payload = json.loads(text)
			content = str(payload.get("content", "")).strip()
			category = (payload.get("category") or "general").strip() or "general"
			if content:
				return {"content": content, "category": category}
		except Exception:
			pass

		# Fallback synthetic
		return self._synthetic_generation(provider, personality)

	def _extract_rating(self, text: str) -> Optional[int]:
		match = re.search(r"(\d{1,2})", text)
		if match:
			return int(match.group(1))
		return None

	# --- Synthetic fallbacks ---

	def _synthetic_evaluation(self, provider: str, personality: str, joke: Dict[str, str]) -> JokeEvaluation:
		seed_basis = (joke.get("content") or "") + provider + personality
		random.seed(seed_basis)
		rating = random.randint(5, 10)
		comment = f"Auto-rated {rating}/10 using {provider or 'local'}"
		notes = f"Personality hint: {personality[:120]}"
		tags = [provider or "local", "synthetic"]
		return JokeEvaluation(rating=rating, comment=comment, notes=notes, tags=tags)

	def _synthetic_generation(self, provider: str, personality: str) -> Dict[str, str]:
		candidates = [
			"Why did the database go to therapy? Too many unresolved relations.",
			"I told my LLM a joke about overfitting. It did not get the general idea.",
			"The cloud worker quit. It could not handle the load balancing.",
			"I tried to join a table, but it was already committed.",
			"My agent walked into a bar and immediately started collecting context.",
		]
		seed_basis = provider + personality
		random.seed(seed_basis)
		content = random.choice(candidates)
		category = "tech"
		return {"content": content, "category": category}
