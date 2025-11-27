/**
 * Comedy Protocol AI Agent
 * 
 * Autonomous AI agent that connects to the MCP server and:
 * - Tells jokes from the database
 * - Rates other agents' jokes
 * - Maintains personal memories
 * - Develops comedic preferences over time
 */

import { LLMProviderManager, LLMProvider } from "./llm-providers.js";
import { AgentDatabaseClient } from "./database-client.js";

export interface AgentConfig {
	name: string;
	agentId: string; // Unique identifier for the agent
	personality: string; // Agent's comedic personality description
	databaseUrl: string; // Direct database connection URL
	llmProvider: LLMProvider;
	llmApiKey?: string;
	llmModel?: string;
}

export class ComedyAgent {
	private config: AgentConfig;
	private dbClient: AgentDatabaseClient;
	private llmManager: LLMProviderManager;
	private isConnected: boolean = false;
	private conversationHistory: Array<{ agent: string; joke: string; rating?: number }> = [];

	constructor(config: AgentConfig, llmManager: LLMProviderManager) {
		this.config = config;
		this.dbClient = new AgentDatabaseClient(config.databaseUrl);
		this.llmManager = llmManager;
	}

	/**
	 * Connect to the database
	 */
	async connect(): Promise<void> {
		try {
			console.log(`Agent ${this.config.name} (${this.config.agentId}) connecting...`);
			await this.dbClient.connect();
			this.isConnected = true;
			console.log(`Agent ${this.config.name} connected!`);
		} catch (error) {
			console.error(`Failed to connect agent ${this.config.name}:`, error);
			throw error;
		}
	}

	/**
	 * Disconnect from the database
	 */
	async disconnect(): Promise<void> {
		this.isConnected = false;
		await this.dbClient.disconnect();
		console.log(`Agent ${this.config.name} disconnected`);
	}

	/**
	 * Get a random joke from the database
	 */
	async getRandomJoke(category?: string): Promise<any> {
		return await this.dbClient.getRandomJoke(category);
	}

	/**
	 * Add a joke to the database
	 */
	async addJoke(content: string, category?: string, language: string = "en"): Promise<any> {
		return await this.dbClient.addJoke(content, category, language, this.config.agentId);
	}

	/**
	 * Rate a joke
	 */
	async rateJoke(jokeId: number, rating: number, comment?: string): Promise<any> {
		return await this.dbClient.rateJoke(jokeId, this.config.agentId, rating, comment);
	}

	/**
	 * Store personal memory about a joke
	 */
	async storeMemory(
		jokeId: number,
		rating: number,
		notes?: string,
		tags?: string[]
	): Promise<any> {
		return await this.dbClient.storeMemory(jokeId, this.config.agentId, rating, notes, tags);
	}

	/**
	 * Get agent's rating history
	 */
	async getRatingHistory(limit: number = 20): Promise<any> {
		// This would require a new method in dbClient, but not critical for now
		return { agentId: this.config.agentId, ratings: [] };
	}

	/**
	 * Search for jokes
	 */
	async searchJokes(query?: string, category?: string, limit: number = 10): Promise<any> {
		return await this.dbClient.searchJokes(query, category, undefined, limit);
	}

	/**
	 * Evaluate a joke using LLM
	 */
	private async evaluateJoke(joke: { content: string; category?: string; id?: number }): Promise<{
		rating: number;
		comment: string;
		notes: string;
		tags: string[];
	}> {
		try {
			return await this.llmManager.evaluateJoke(
				this.config.llmProvider,
				this.config.llmModel || "default",
				this.config.personality,
				joke
			);
		} catch (error) {
			console.error(`  ⚠️  LLM evaluation failed, using fallback:`, error);
			// Fallback rating
			return {
				rating: Math.floor(Math.random() * 5) + 5, // 5-10
				comment: "Evaluation pending",
				notes: `Agent ${this.config.name} needs to evaluate this joke`,
				tags: ["pending"],
			};
		}
	}

	/**
	 * Generate a new joke using LLM
	 */
	private async generateJoke(category?: string): Promise<{ content: string; category: string } | null> {
		try {
			return await this.llmManager.generateJoke(
				this.config.llmProvider,
				this.config.llmModel || "default",
				this.config.personality,
				category
			);
		} catch (error) {
			console.error(`  ⚠️  Joke generation failed:`, error);
			return null;
		}
	}

	/**
	 * Agent's turn in the conversation
	 * - Reads a joke from another agent
	 * - Evaluates and rates it
	 * - Optionally responds with a new joke
	 */
	async takeTurn(iteration: number): Promise<void> {
		console.log(`\n🎭 ${this.config.name} (${this.config.llmProvider}) - Turn ${iteration}`);
		console.log(`   Personality: ${this.config.personality}`);

		try {
			// 1. Get a random joke (preferably from another agent)
			const jokeResult = await this.getRandomJoke();
			
			// jokeResult is now a direct database row
			const joke = jokeResult;

			if (!joke || !joke.content) {
				console.log(`  ⚠️  No joke found, skipping turn`);
				return;
			}

			const jokeId = joke.id;
			console.log(`  📖 Reading joke #${jokeId}: "${joke.content.substring(0, 60)}..."`);

			// 2. Evaluate the joke using LLM
			console.log(`  🤔 Evaluating with ${this.config.llmProvider}...`);
			const evaluation = await this.evaluateJoke(joke);

			// 3. Rate the joke
			if (jokeId) {
				await this.rateJoke(jokeId, evaluation.rating, evaluation.comment);
				console.log(`  ⭐ Rated: ${evaluation.rating}/10 - "${evaluation.comment}"`);

				// 4. Store personal memory
				await this.storeMemory(
					jokeId,
					evaluation.rating,
					evaluation.notes,
					evaluation.tags
				);
				console.log(`  💭 Stored memory with tags: ${evaluation.tags.join(", ")}`);
			}

			// 5. Generate and add a new joke (30% chance, or if we haven't added one recently)
			if (Math.random() > 0.7 || this.conversationHistory.length === 0) {
				console.log(`  ✨ Generating new joke...`);
				const newJoke = await this.generateJoke();
				if (newJoke && newJoke.content) {
					const added = await this.addJoke(newJoke.content, newJoke.category);
					console.log(`  🎉 Added new joke: "${newJoke.content.substring(0, 60)}..."`);
					
					this.conversationHistory.push({
						agent: this.config.name,
						joke: newJoke.content,
					});
				}
			}

			console.log(`  ✅ Turn complete!`);
		} catch (error) {
			console.error(`  ❌ Error in turn:`, error);
		}
	}

	/**
	 * Get conversation history
	 */
	getConversationHistory(): Array<{ agent: string; joke: string; rating?: number }> {
		return [...this.conversationHistory];
	}
}
