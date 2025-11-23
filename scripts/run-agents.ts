#!/usr/bin/env node
/**
 * Run Comedy Protocol AI Agents
 * 
 * This script starts multiple autonomous AI agents that connect to the MCP server
 * and interact with each other through the shared joke database.
 * 
 * Usage:
 *   npm run agents:start
 *   or
 *   tsx scripts/run-agents.ts
 */

import { AgentRunner, EXAMPLE_AGENTS } from "../src/agents/index.js";

// Configuration
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "http://localhost:8792/mcp";
const CYCLE_INTERVAL_MS = parseInt(process.env.CYCLE_INTERVAL_MS || "15000", 10); // 15 seconds

async function main() {
	console.log("🎭 Comedy Protocol - Agent Runner");
	console.log("================================\n");
	console.log(`MCP Server: ${MCP_SERVER_URL}`);
	console.log(`Cycle Interval: ${CYCLE_INTERVAL_MS}ms\n`);

	// Create agent runner with example agents
	const runner = new AgentRunner({
		mcpServerUrl: MCP_SERVER_URL,
		agents: EXAMPLE_AGENTS,
		cycleIntervalMs: CYCLE_INTERVAL_MS,
	});

	// Initialize agents
	await runner.initialize();

	// Handle graceful shutdown
	process.on("SIGINT", async () => {
		console.log("\n\n🛑 Received SIGINT, shutting down gracefully...");
		await runner.stop();
		process.exit(0);
	});

	process.on("SIGTERM", async () => {
		console.log("\n\n🛑 Received SIGTERM, shutting down gracefully...");
		await runner.stop();
		process.exit(0);
	});

	// Start all agents
	await runner.start();
}

main().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});

