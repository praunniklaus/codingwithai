#!/usr/bin/env node
/**
 * Run Job Application Assistant AI Agents
 * 
 * This script starts 3 autonomous AI agents that help with job applications:
 * - Agent 1: Job Hunter (OpenAI) - Searches and scores job matches
 * - Agent 2: CV Crafter (Claude) - Generates tailored CVs and cover letters
 * - Agent 3: Application Tracker (Grok) - Tracks applications and generates insights
 * 
 * Usage:
 *   npm run agents:start
 *   or
 *   tsx scripts/run-job-agents.ts
 */

import { readFileSync } from "fs";
import { join } from "path";
import { JobHunterAgent, JobHunterConfig } from "../src/agents/job-hunter-agent.js";
import { CVCrafterAgent, CVCrafterConfig } from "../src/agents/cv-crafter-agent.js";
import { ApplicationTrackerAgent, ApplicationTrackerConfig } from "../src/agents/application-tracker-agent.js";
import { LLMProviderManager } from "../src/agents/llm-providers.js";
import { JobDatabaseClient } from "../src/agents/job-database-client.js";

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
const TARGET_USER_ID = process.env.TARGET_USER_ID || "samuel_student"; // Default user

// LLM API Keys (required)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GROK_API_KEY = process.env.GROK_API_KEY || process.env.XAI_API_KEY;

async function main() {
	console.log("💼 Job Application Assistant - Multi-Agent System");
	console.log("=" .repeat(60));
	console.log(`Database: ${DATABASE_URL ? "Connected" : "NOT SET"}`);
	console.log(`Target User: ${TARGET_USER_ID}`);
	console.log("=" .repeat(60) + "\n");

	if (!DATABASE_URL) {
		console.error("❌ ERROR: DATABASE_URL environment variable is required");
		process.exit(1);
	}

	// Validate API keys
	if (!OPENAI_API_KEY) {
		console.error("❌ ERROR: OPENAI_API_KEY environment variable is required");
		process.exit(1);
	}
	if (!ANTHROPIC_API_KEY) {
		console.error("❌ ERROR: ANTHROPIC_API_KEY environment variable is required");
		process.exit(1);
	}
	if (!GROK_API_KEY) {
		console.warn("⚠️  WARNING: GROK_API_KEY not set. Application Tracker agent will use fallback behavior.");
	}

	// Wait for user input from the frontend before starting iterations
	const onboardingSnapshot = await waitForUserSetup(DATABASE_URL!, TARGET_USER_ID);
	printUserSnapshot(onboardingSnapshot);

	// Initialize LLM Manager
	const llmManager = new LLMProviderManager(
		OPENAI_API_KEY,
		ANTHROPIC_API_KEY,
		GROK_API_KEY
	);

	// Define 3 agents
	const jobHunterConfig: JobHunterConfig = {
		name: "Job Hunter",
		agentId: "job-hunter-openai",
		databaseUrl: DATABASE_URL!,
		llmProvider: "openai",
		llmApiKey: OPENAI_API_KEY,
		llmModel: "gpt-4o-mini",
		targetUserId: TARGET_USER_ID,
	};

	const cvCrafterConfig: CVCrafterConfig = {
		name: "CV Crafter",
		agentId: "cv-crafter-claude",
		databaseUrl: DATABASE_URL!,
		llmProvider: "anthropic",
		llmApiKey: ANTHROPIC_API_KEY,
		llmModel: "claude-3-5-haiku-latest",
		targetUserId: TARGET_USER_ID,
	};

	const applicationTrackerConfig: ApplicationTrackerConfig = {
		name: "Application Tracker",
		agentId: "application-tracker-grok",
		databaseUrl: DATABASE_URL!,
		llmProvider: "grok",
		llmApiKey: GROK_API_KEY,
		llmModel: "grok-3",
		targetUserId: TARGET_USER_ID,
	};

	// Create agents
	console.log("🤖 Initializing agents...\n");
	const jobHunter = new JobHunterAgent(jobHunterConfig, llmManager);
	const cvCrafter = new CVCrafterAgent(cvCrafterConfig, llmManager);
	const applicationTracker = new ApplicationTrackerAgent(applicationTrackerConfig, llmManager);

	await jobHunter.connect();
	console.log(`✅ ${jobHunterConfig.name} (${jobHunterConfig.llmProvider}) initialized`);

	await cvCrafter.connect();
	console.log(`✅ ${cvCrafterConfig.name} (${cvCrafterConfig.llmProvider}) initialized`);

	await applicationTracker.connect();
	console.log(`✅ ${applicationTrackerConfig.name} (${applicationTrackerConfig.llmProvider}) initialized`);

	console.log(`\n✅ All 3 agents initialized!\n`);

	// Handle graceful shutdown
	process.on("SIGINT", async () => {
		console.log("\n\n🛑 Received SIGINT, shutting down gracefully...");
		await jobHunter.disconnect();
		await cvCrafter.disconnect();
		await applicationTracker.disconnect();
		process.exit(0);
	});

	process.on("SIGTERM", async () => {
		console.log("\n\n🛑 Received SIGTERM, shutting down gracefully...");
		await jobHunter.disconnect();
		await cvCrafter.disconnect();
		await applicationTracker.disconnect();
		process.exit(0);
	});

	// Run agents in a loop (every 5 minutes for Job Hunter, as needed for others)
	console.log("🚀 Starting agent iterations...\n");
	console.log("Press Ctrl+C to stop\n");

	let iteration = 0;
	const runIteration = async () => {
		iteration++;
		console.log(`\n${"=".repeat(60)}`);
		console.log(`ITERATION ${iteration}`);
		console.log(`${"=".repeat(60)}`);

		// Agent 1: Job Hunter (runs every iteration)
		await jobHunter.takeTurn(iteration);
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// Agent 2: CV Crafter (runs every iteration)
		await cvCrafter.takeTurn(iteration);
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// Agent 3: Application Tracker (runs every iteration)
		await applicationTracker.takeTurn(iteration);
		await new Promise((resolve) => setTimeout(resolve, 2000));

		console.log(`\n✅ Iteration ${iteration} complete!`);
		console.log(`⏰ Next iteration in 5 minutes...\n`);
	};

	// Run first iteration immediately
	await runIteration();

	// Then run every 5 minutes
	const interval = setInterval(async () => {
		await runIteration();
	}, 5 * 60 * 1000); // 5 minutes

	// Keep process alive
	process.on("SIGINT", () => {
		clearInterval(interval);
	});
}

main().catch((error) => {
	console.error("\n❌ Fatal error:", error);
	process.exit(1);
});

/**
 * Wait until the user has completed onboarding in the frontend.
 * We consider onboarding "ready" once the user profile exists with at least
 * one skill or experience entry so the agents have context to work with.
 */
async function waitForUserSetup(databaseUrl: string, userId: string) {
	const db = new JobDatabaseClient(databaseUrl);
	await db.connect();

	console.log("⏳ Waiting for user input from the frontend...");
	console.log("   Complete onboarding in the UI, then data will sync here.");

	while (true) {
		const profile = await db.getUserProfile(userId);
		const skills = profile?.skills || [];
		const experience = profile?.experience || [];

		if (profile && (skills.length > 0 || experience.length > 0)) {
			const applications = await db.getApplications(userId);
			const draftApplications = await db.getApplications(userId, "draft");
			const jobs = await db.getJobListings(5);

			await db.disconnect();

			return {
				profile,
				skillsCount: skills.length,
				experienceCount: experience.length,
				applications,
				draftApplications,
				jobListingsSample: jobs.slice(0, 3),
			};
		}

		console.log("   • Still waiting... no completed profile found. Retrying in 5s.");
		await new Promise((resolve) => setTimeout(resolve, 5000));
	}
}

/**
 * Print a friendly snapshot of the inputs before agents start iterating.
 */
function printUserSnapshot(snapshot: {
	profile: any;
	skillsCount: number;
	experienceCount: number;
	applications: any[];
	draftApplications: any[];
	jobListingsSample: any[];
}) {
	const { profile, skillsCount, experienceCount, applications, draftApplications, jobListingsSample } = snapshot;

	console.log("\n✅ User input detected — starting agents.");
	console.log("------------------------------------------------------------");
	console.log(`👤 Profile: ${profile.name || profile.user_id}`);
	console.log(`📍 Location: ${profile.location || "N/A"} | Target role: ${profile.target_role || "N/A"}`);
	console.log(`🧠 Skills: ${skillsCount} | Experience entries: ${experienceCount}`);
	console.log(`📄 Applications: ${applications.length} (draft: ${draftApplications.length})`);
	console.log("🗂️  Sample job listings the agents will see:");
	jobListingsSample.forEach((job) => {
		console.log(`   - ${job.title} at ${job.company} (${job.location || "Remote/Unknown"})`);
	});
	console.log("------------------------------------------------------------\n");
}
