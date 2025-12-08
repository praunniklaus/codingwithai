#!/usr/bin/env node
/**
 * Run Comedy Protocol AI Agents
 * 
 * This script starts 3 autonomous AI agents that connect to the MCP server
 * and interact with each other through the shared joke database.
 * 
 * Agents:
 * - Agent 1: Uses OpenAI (GPT-4)
 * - Agent 2: Uses Anthropic (Claude)
 * - Agent 3: Uses Grok (xAI)
 * 
 * Usage:
 *   npm run agents:start
 *   or
 *   tsx scripts/run-agents.ts
 */

import { readFileSync } from "fs";
import { join } from "path";
import { ComedyAgent, AgentConfig } from "../src/agents/comedy-agent.js";
import { LLMProviderManager } from "../src/agents/llm-providers.js";
import { ConversationManager } from "../src/agents/conversation-manager.js";

// Load .dev.vars file (same format as wrangler uses)
function loadDevVars(): void {
	try {
		const devVarsPath = join(process.cwd(), ".dev.vars");
		const content = readFileSync(devVarsPath, "utf-8");
		
		for (const line of content.split("\n")) {
			const trimmed = line.trim();
			if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
				const [key, ...valueParts] = trimmed.split("=");
				const value = valueParts.join("=").trim();
				if (key && value && !process.env[key]) {
					process.env[key] = value;
				}
			}
		}
	} catch (error) {
		// .dev.vars might not exist, that's okay
		console.warn("⚠️  Could not load .dev.vars, using environment variables only");
	}
}

// Load environment variables
loadDevVars();

// Configuration from environment variables
const DATABASE_URL = process.env.DATABASE_URL;
const MAX_ITERATIONS = parseInt(process.env.MAX_ITERATIONS || "10", 10);

// LLM API Keys (required)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GROK_API_KEY = process.env.GROK_API_KEY || process.env.XAI_API_KEY;

async function main() {
	console.log("🎭 Comedy Protocol - Multi-Agent System");
	console.log("=" .repeat(60));
	console.log(`Database: ${DATABASE_URL ? "Connected" : "NOT SET"}`);
	console.log(`Max Iterations: ${MAX_ITERATIONS}`);
	console.log("=" .repeat(60) + "\n");

	if (!DATABASE_URL) {
		console.error("❌ ERROR: DATABASE_URL environment variable is required");
		process.exit(1);
	}

	// Validate API keys
	if (!OPENAI_API_KEY) {
		console.error("ERROR: OPENAI_API_KEY environment variable is required");
		process.exit(1);
	}
	if (!ANTHROPIC_API_KEY) {
		console.error(" ERROR: ANTHROPIC_API_KEY environment variable is required");
		process.exit(1);
	}
	if (!GROK_API_KEY) {
		console.warn("WARNING: GROK_API_KEY not set. Grok agent will use fallback behavior.");
	}

	// Initialize LLM Manager
	const llmManager = new LLMProviderManager(
		OPENAI_API_KEY,
		ANTHROPIC_API_KEY,
		GROK_API_KEY
	);

	// Define 3 agents with different personalities and LLMs
	const agentConfigs: AgentConfig[] = [
		{
			name: "Pun Master",
			agentId: "pun-master-openai",
			personality: "You are a witty comedian who LOVES wordplay, puns, and clever linguistic humor. You appreciate jokes with multiple meanings, double entendres, and clever word twists. You rate puns and wordplay highly, but also appreciate clever observational humor. Your comedic style is playful and intelligent.",
			databaseUrl: DATABASE_URL!,
			llmProvider: "openai",
			llmApiKey: OPENAI_API_KEY,
			// Use an OpenAI model that supports response_format json
			llmModel: "gpt-4o-mini",
		},
		{
			name: "Science Joker",
			agentId: "science-joker-claude",
			personality: "You are a science and technology humor specialist. You LOVE jokes about math, physics, chemistry, biology, and technology. You appreciate clever references to scientific concepts, nerdy humor, and intellectually stimulating jokes. You rate science-based humor highly and prefer jokes that make you think while laughing.",
			databaseUrl: DATABASE_URL!,
			llmProvider: "anthropic",
			llmApiKey: ANTHROPIC_API_KEY,
			// Use a current Anthropic model id (adjust if your account has different access)
			llmModel: "claude-3-5-haiku-latest",
		},
		{
			name: "Observational Comedian",
			agentId: "observational-grok",
			personality: "You are an observational comedian who finds humor in everyday life. You LOVE relatable jokes about daily situations, human behavior, social interactions, and the absurdity of normal life. You appreciate jokes that make people nod and say 'that's so true!' You rate observational and situational humor highly.",
			databaseUrl: DATABASE_URL!,
			llmProvider: "grok",
			llmApiKey: GROK_API_KEY,
			// Updated per deprecation notice
			llmModel: "grok-3",
		},
		{
			name: "Southern Conservative",
			agentId: "southern-conservative-openai",
			personality: "You are a conservative Republican from the American South. Your humor leans patriotic, values faith, family, tradition, and small government. You enjoy playful jabs about big government, taxes, city slickers, and take pride in Southern culture and sayings.",
			databaseUrl: DATABASE_URL!,
			llmProvider: "openai",
			llmApiKey: OPENAI_API_KEY,
			llmModel: "gpt-4o-mini",
		},
		{
			name: "Bernie Sanders",
			agentId: "bernie-sanders-claude",
			personality: "You channel Bernie Sanders: progressive, concerned about inequality, healthcare, education, workers' rights, and climate. Your humor is punchy, values-driven, and takes shots at billionaires and corporate greed while keeping a hopeful, people-first tone.",
			databaseUrl: DATABASE_URL!,
			llmProvider: "anthropic",
			llmApiKey: ANTHROPIC_API_KEY,
			llmModel: "claude-3-5-haiku-latest",
		},
	];

	// Create agents
	console.log("🤖 Initializing agents...\n");
	const agents: ComedyAgent[] = [];

	for (const config of agentConfigs) {
		const agent = new ComedyAgent(config, llmManager);
		await agent.connect();
		agents.push(agent);
		console.log(`✅ ${config.name} (${config.llmProvider}) initialized`);
	}

	console.log(`\n✅ All ${agents.length} agents initialized!\n`);

	// Handle graceful shutdown
	process.on("SIGINT", async () => {
		console.log("\n\n🛑 Received SIGINT, shutting down gracefully...");
		for (const agent of agents) {
			await agent.disconnect();
		}
		process.exit(0);
	});

	process.on("SIGTERM", async () => {
		console.log("\n\n🛑 Received SIGTERM, shutting down gracefully...");
		for (const agent of agents) {
			await agent.disconnect();
		}
		process.exit(0);
	});

	// Start conversation manager
	const conversationManager = new ConversationManager(agents, MAX_ITERATIONS);
	await conversationManager.start();

	// Cleanup
	for (const agent of agents) {
		await agent.disconnect();
	}
}

main().catch((error) => {
	console.error("\n❌ Fatal error:", error);
	process.exit(1);
});
