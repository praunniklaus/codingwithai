/**
 * Conversation Manager
 * 
 * Manages the conversation loop between agents and handles human-in-the-loop
 */

import { ComedyAgent } from "./comedy-agent.js";
import * as readline from "readline";

export interface HumanFeedback {
	type: "rating" | "comment" | "direction" | "stop";
	content: string;
	targetAgent?: string;
}

export class ConversationManager {
	private agents: ComedyAgent[];
	private iteration: number = 0;
	private maxIterations: number = 10;
	private humanFeedbackEnabled: boolean = false;
	private rl?: readline.Interface;

	constructor(agents: ComedyAgent[], maxIterations: number = 10) {
		this.agents = agents;
		this.maxIterations = maxIterations;
	}

	/**
	 * Start the conversation loop
	 */
	async start(): Promise<void> {
		console.log("\n🎭 Comedy Protocol - Multi-Agent Conversation");
		console.log("=" .repeat(50));
		console.log(`Starting conversation with ${this.agents.length} agents`);
		console.log(`Max iterations: ${this.maxIterations}`);
		console.log("=" .repeat(50) + "\n");

		// Run initial iterations without human feedback
		for (let i = 0; i < 3 && this.iteration < this.maxIterations; i++) {
			await this.runIteration();
		}

		// Enable human feedback after initial iterations
		this.humanFeedbackEnabled = true;
		console.log("\n👤 Human feedback enabled! You can now interact with the agents.\n");

		// Set up readline for human input
		this.rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		// Continue with human-in-the-loop
		while (this.iteration < this.maxIterations) {
			await this.runIteration();
			
			// Ask for human feedback
			await this.requestHumanFeedback();
		}

		if (this.rl) {
			this.rl.close();
		}

		console.log("\n✅ Conversation complete!");
		this.printSummary();
	}

	/**
	 * Run one iteration of the conversation
	 */
	private async runIteration(): Promise<void> {
		this.iteration++;
		console.log(`\n${"=".repeat(50)}`);
		console.log(`ITERATION ${this.iteration}`);
		console.log(`${"=".repeat(50)}`);

		// Each agent takes a turn
		for (const agent of this.agents) {
			await agent.takeTurn(this.iteration);
			// Small delay between agents
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
	}

	/**
	 * Request human feedback
	 */
	private async requestHumanFeedback(): Promise<void> {
		if (!this.rl) {
			return;
		}

		return new Promise((resolve) => {
			try {
				console.log("\n👤 Human Feedback Options:");
				console.log("  [Enter] - Continue to next iteration");
				console.log("  'rate <agent> <1-10>' - Rate an agent's performance");
				console.log("  'comment <agent> <text>' - Comment on an agent");
				console.log("  'direction <text>' - Give direction to all agents");
				console.log("  'stop' - End conversation");
				console.log("  'summary' - Show conversation summary");

				this.rl!.question("\nYour input: ", async (answer) => {
					const feedback = this.parseHumanInput(answer);
					if (feedback) {
						await this.applyHumanFeedback(feedback);
					}
					resolve();
				});
			} catch (error) {
				// Readline might be closed, just continue
				resolve();
			}
		});
	}

	/**
	 * Parse human input into feedback
	 */
	private parseHumanInput(input: string): HumanFeedback | null {
		const trimmed = input.trim().toLowerCase();
		
		if (!trimmed || trimmed === "") {
			return null; // Continue
		}

		if (trimmed === "stop") {
			return { type: "stop", content: "Stop conversation" };
		}

		if (trimmed === "summary") {
			this.printSummary();
			return null;
		}

		const rateMatch = trimmed.match(/^rate\s+(\w+)\s+(\d+)$/);
		if (rateMatch) {
			return {
				type: "rating",
				content: rateMatch[2],
				targetAgent: rateMatch[1],
			};
		}

		const commentMatch = trimmed.match(/^comment\s+(\w+)\s+(.+)$/);
		if (commentMatch) {
			return {
				type: "comment",
				content: commentMatch[2],
				targetAgent: commentMatch[1],
			};
		}

		const directionMatch = trimmed.match(/^direction\s+(.+)$/);
		if (directionMatch) {
			return {
				type: "direction",
				content: directionMatch[1],
			};
		}

		return null;
	}

	/**
	 * Apply human feedback
	 */
	private async applyHumanFeedback(feedback: HumanFeedback): Promise<void> {
		if (feedback.type === "stop") {
			console.log("\n🛑 Stopping conversation per human request...");
			this.maxIterations = this.iteration; // Stop after current iteration
			return;
		}

		if (feedback.type === "direction") {
			console.log(`\n📢 Broadcasting direction to all agents: "${feedback.content}"`);
			// In a full implementation, you'd send this to agents
			// For now, just log it
			return;
		}

		if (feedback.targetAgent) {
			const agent = this.agents.find((a) => 
				a['config'].name.toLowerCase().includes(feedback.targetAgent!.toLowerCase())
			);
			
			if (agent) {
				console.log(`\n💬 Feedback for ${agent['config'].name}: ${feedback.content}`);
				// In a full implementation, you'd apply this feedback
			} else {
				console.log(`\n⚠️  Agent "${feedback.targetAgent}" not found`);
			}
		}
	}

	/**
	 * Print conversation summary
	 */
	private printSummary(): void {
		console.log("\n📊 Conversation Summary");
		console.log("=" .repeat(50));
		console.log(`Total iterations: ${this.iteration}`);
		console.log(`Agents: ${this.agents.length}`);
		
		for (const agent of this.agents) {
			const history = agent.getConversationHistory();
			console.log(`\n${agent['config'].name}:`);
			console.log(`  - Jokes contributed: ${history.length}`);
			console.log(`  - LLM: ${agent['config'].llmProvider}`);
		}
		
		console.log("\n" + "=".repeat(50));
	}
}

