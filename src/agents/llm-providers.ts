/**
 * LLM Provider Integrations
 * 
 * Supports OpenAI, Anthropic (Claude), and Grok APIs
 */

import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export interface LLMResponse {
	rating: number;
	comment: string;
	notes: string;
	tags: string[];
}

export interface JokeGeneration {
	content: string;
	category: string;
}

export type LLMProvider = "openai" | "anthropic" | "grok";

export class LLMProviderManager {
	private openai?: OpenAI;
	private anthropic?: Anthropic;
	private grokApiKey?: string;

	constructor(openaiKey?: string, anthropicKey?: string, grokKey?: string) {
		if (openaiKey) {
			this.openai = new OpenAI({ apiKey: openaiKey });
		}
		if (anthropicKey) {
			this.anthropic = new Anthropic({ apiKey: anthropicKey });
		}
		this.grokApiKey = grokKey;
	}

	/**
	 * Evaluate a joke using the specified LLM
	 */
	async evaluateJoke(
		provider: LLMProvider,
		model: string,
		personality: string,
		joke: { content: string; category?: string }
	): Promise<LLMResponse> {
		const prompt = `You are a comedy critic with this personality: ${personality}

Evaluate this joke and provide:
1. A rating from 1-10 (where 10 is hilarious)
2. A brief comment
3. Personal notes about why you rated it this way
4. Comedic style tags (e.g., ["puns", "wordplay", "dark", "observational"])

Joke: "${joke.content}"
${joke.category ? `Category: ${joke.category}` : ""}

Respond in JSON format:
{
  "rating": <number 1-10>,
  "comment": "<brief comment>",
  "notes": "<personal notes>",
  "tags": ["tag1", "tag2"]
}`;

		switch (provider) {
			case "openai":
				return await this.evaluateWithOpenAI(model, prompt);
			case "anthropic":
				return await this.evaluateWithAnthropic(model, prompt);
			case "grok":
				return await this.evaluateWithGrok(model, prompt);
			default:
				throw new Error(`Unknown provider: ${provider}`);
		}
	}

	/**
	 * Generate a joke using the specified LLM
	 */
	async generateJoke(
		provider: LLMProvider,
		model: string,
		personality: string,
		category?: string
	): Promise<JokeGeneration | null> {
		const prompt = `You are a comedian with this personality: ${personality}

Generate a funny joke${category ? ` in the "${category}" category` : ""}. 
Make it original and match your personality.

Respond with JSON:
{
  "content": "<the joke>",
  "category": "<category>"
}`;

		switch (provider) {
			case "openai":
				return await this.generateWithOpenAI(model, prompt);
			case "anthropic":
				return await this.generateWithAnthropic(model, prompt);
			case "grok":
				return await this.generateWithGrok(model, prompt);
			default:
				throw new Error(`Unknown provider: ${provider}`);
		}
	}

	private async evaluateWithOpenAI(model: string, prompt: string): Promise<LLMResponse> {
		if (!this.openai) throw new Error("OpenAI not configured");

		const response = await this.openai.chat.completions.create({
			model: model || "gpt-4",
			messages: [
				{
					role: "system",
					content: "You are a comedy critic. Always respond with valid JSON.",
				},
				{ role: "user", content: prompt },
			],
			response_format: { type: "json_object" },
		});

		const content = response.choices[0]?.message?.content;
		if (!content) throw new Error("No response from OpenAI");

		return JSON.parse(content);
	}

	private async evaluateWithAnthropic(model: string, prompt: string): Promise<LLMResponse> {
		if (!this.anthropic) throw new Error("Anthropic not configured");

		const response = await this.anthropic.messages.create({
			model: model || "claude-3-5-sonnet-20241022",
			max_tokens: 1024,
			messages: [
				{
					role: "user",
					content: prompt,
				},
			],
		});

		const content = response.content[0];
		if (content.type !== "text") throw new Error("Unexpected response type from Anthropic");

		// Extract JSON from response
		const text = content.text;
		const jsonMatch = text.match(/\{[\s\S]*\}/);
		if (!jsonMatch) throw new Error("No JSON found in Anthropic response");

		return JSON.parse(jsonMatch[0]);
	}

	private async evaluateWithGrok(model: string, prompt: string): Promise<LLMResponse> {
		if (!this.grokApiKey) throw new Error("Grok not configured");

		// Grok API via HTTP (xAI API)
		// Note: The xAI API endpoint may vary - check https://docs.x.ai for latest
		try {
			const response = await fetch("https://api.x.ai/v1/chat/completions", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.grokApiKey}`,
				},
				body: JSON.stringify({
					model: model || "grok-beta",
					messages: [
						{
							role: "system",
							content: "You are a comedy critic. Always respond with valid JSON.",
						},
						{ role: "user", content: prompt },
					],
					response_format: { type: "json_object" },
				}),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Grok API error (${response.status}): ${errorText}`);
			}

			const data = await response.json();
			const content = data.choices?.[0]?.message?.content;
			if (!content) throw new Error("No response from Grok");

			return JSON.parse(content);
		} catch (error: any) {
			// If Grok API is not available (404, etc.), fall back to mock response
			console.warn(`⚠️  Grok API unavailable (${error.message}), using fallback`);
			return {
				rating: Math.floor(Math.random() * 5) + 5,
				comment: "Grok API unavailable - using fallback evaluation",
				notes: "Grok API endpoint returned error, using default evaluation",
				tags: ["fallback"],
			};
		}
	}

	private async generateWithOpenAI(model: string, prompt: string): Promise<JokeGeneration | null> {
		if (!this.openai) throw new Error("OpenAI not configured");

		const response = await this.openai.chat.completions.create({
			model: model || "gpt-4",
			messages: [
				{
					role: "system",
					content: "You are a comedian. Always respond with valid JSON.",
				},
				{ role: "user", content: prompt },
			],
			response_format: { type: "json_object" },
		});

		const content = response.choices[0]?.message?.content;
		if (!content) return null;

		return JSON.parse(content);
	}

	private async generateWithAnthropic(model: string, prompt: string): Promise<JokeGeneration | null> {
		if (!this.anthropic) throw new Error("Anthropic not configured");

		const response = await this.anthropic.messages.create({
			model: model || "claude-3-5-sonnet-20241022",
			max_tokens: 1024,
			messages: [{ role: "user", content: prompt }],
		});

		const content = response.content[0];
		if (content.type !== "text") return null;

		const text = content.text;
		const jsonMatch = text.match(/\{[\s\S]*\}/);
		if (!jsonMatch) return null;

		return JSON.parse(jsonMatch[0]);
	}

	private async generateWithGrok(model: string, prompt: string): Promise<JokeGeneration | null> {
		if (!this.grokApiKey) throw new Error("Grok not configured");

		try {
			const response = await fetch("https://api.x.ai/v1/chat/completions", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.grokApiKey}`,
				},
				body: JSON.stringify({
					model: model || "grok-beta",
					messages: [
						{
							role: "system",
							content: "You are a comedian. Always respond with valid JSON.",
						},
						{ role: "user", content: prompt },
					],
					response_format: { type: "json_object" },
				}),
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.warn(`⚠️  Grok API error (${response.status}): ${errorText}`);
				return null;
			}

			const data = await response.json();
			const content = data.choices?.[0]?.message?.content;
			if (!content) return null;

			return JSON.parse(content);
		} catch (error: any) {
			console.warn(`⚠️  Grok API unavailable (${error.message}), skipping joke generation`);
			return null;
		}
	}
}

