/**
 * Agent Runner
 * 
 * Manages multiple Comedy Protocol AI agents and coordinates their interactions
 */

import { ComedyAgent, AgentConfig } from "./comedy-agent.js";

export interface AgentRunnerConfig {
	mcpServerUrl: string;
	agents: AgentConfig[];
	cycleIntervalMs?: number;
}

export class AgentRunner {
	private agents: ComedyAgent[] = [];
	private config: AgentRunnerConfig;
	private isRunning: boolean = false;

	constructor(config: AgentRunnerConfig) {
		this.config = config;
	}

	/**
	 * Initialize all agents
	 */
	async initialize(): Promise<void> {
		console.log(`🤖 Initializing ${this.config.agents.length} agents...`);

		for (const agentConfig of this.config.agents) {
			const agent = new ComedyAgent(agentConfig);
			this.agents.push(agent);
		}

		console.log(`✅ All agents initialized!`);
	}

	/**
	 * Start all agents
	 */
	async start(): Promise<void> {
		if (this.isRunning) {
			console.log("⚠️  Agents are already running!");
			return;
		}

		this.isRunning = true;
		console.log(`\n🎭 Starting Comedy Protocol with ${this.agents.length} agents...\n`);

		// Start all agents concurrently
		const promises = this.agents.map((agent) =>
			agent.start(this.config.cycleIntervalMs || 10000).catch((error) => {
				console.error(`Error starting agent:`, error);
			})
		);

		// Wait for all agents to start
		await Promise.all(promises);
	}

	/**
	 * Stop all agents
	 */
	async stop(): Promise<void> {
		if (!this.isRunning) {
			return;
		}

		this.isRunning = false;
		console.log(`\n🛑 Stopping all agents...`);

		const promises = this.agents.map((agent) => agent.stop());
		await Promise.all(promises);

		console.log(`✅ All agents stopped!`);
	}

	/**
	 * Get status of all agents
	 */
	getStatus(): { agentCount: number; isRunning: boolean } {
		return {
			agentCount: this.agents.length,
			isRunning: this.isRunning,
		};
	}
}

/**
 * Example agent configurations
 */
export const EXAMPLE_AGENTS: AgentConfig[] = [
	{
		name: "Pun Master",
		agentId: "pun-master-001",
		personality: "Loves wordplay, puns, and clever linguistic humor. Prefers jokes with multiple meanings.",
		mcpServerUrl: "http://localhost:8792/mcp",
		llmProvider: "openai",
		llmModel: "gpt-4",
	},
	{
		name: "Science Joker",
		agentId: "science-joker-001",
		personality: "Specializes in science, math, and technology humor. Appreciates clever references to scientific concepts.",
		mcpServerUrl: "http://localhost:8792/mcp",
		llmProvider: "openai",
		llmModel: "gpt-4",
	},
	{
		name: "Observational Comedian",
		agentId: "observational-001",
		personality: "Loves observational humor about everyday life. Prefers relatable, situational jokes.",
		mcpServerUrl: "http://localhost:8792/mcp",
		llmProvider: "anthropic",
		llmModel: "claude-3-5-sonnet",
	},
];

