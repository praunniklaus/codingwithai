/**
 * Job Hunter Agent (Agent 1)
 * 
 * Autonomous AI agent that:
 * - Searches job listings matching user profile
 * - Scores each job 0-100 based on skills/location/salary match
 * - Stores recommendations with reasoning in job_recommendations table
 * - Generates market insights about job trends
 */

import { LLMProviderManager, LLMProvider } from "./llm-providers.js";
import { JobDatabaseClient } from "./job-database-client.js";

export interface JobHunterConfig {
	name: string;
	agentId: string;
	databaseUrl: string;
	llmProvider: LLMProvider;
	llmApiKey?: string;
	llmModel?: string;
	targetUserId: string; // User to find jobs for
}

export class JobHunterAgent {
	private config: JobHunterConfig;
	private dbClient: JobDatabaseClient;
	private llmManager: LLMProviderManager;
	private isConnected: boolean = false;

	constructor(config: JobHunterConfig, llmManager: LLMProviderManager) {
		this.config = config;
		this.dbClient = new JobDatabaseClient(config.databaseUrl);
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
	 * Agent's iteration: Search and score jobs
	 */
	async takeTurn(iteration: number): Promise<void> {
		console.log(`\n🔍 ${this.config.name} (${this.config.llmProvider}) - Turn ${iteration}`);

		try {
			// 1. Fetch user profile
			const userProfile = await this.dbClient.getUserProfile(this.config.targetUserId);
			if (!userProfile) {
				console.log(`  ⚠️  User profile not found for ${this.config.targetUserId}`);
				return;
			}

			console.log(`  👤 Analyzing profile for: ${userProfile.name}`);

			// 2. Get job listings
			const jobListings = await this.dbClient.getJobListings(50);
			console.log(`  📋 Found ${jobListings.length} job listings`);

			if (jobListings.length === 0) {
				console.log(`  ⚠️  No job listings found, skipping turn`);
				return;
			}

			// 3. Score each job with LLM
			let scoredCount = 0;
			let recommendedCount = 0;

			for (const job of jobListings) {
				try {
					console.log(`  🤔 Scoring: ${job.title} at ${job.company}...`);

					const matchResult = await this.llmManager.scoreJobMatch(
						this.config.llmProvider,
						this.config.llmModel || "default",
						userProfile,
						job
					);

					scoredCount++;

					// 4. If score >= 60, save to recommendations
					if (matchResult.score >= 60) {
						await this.dbClient.addRecommendation(
							this.config.targetUserId,
							job.id,
							matchResult.score,
							matchResult.reasoning
						);

						recommendedCount++;
						console.log(`  ✅ Recommended (${matchResult.score}/100): ${job.title}`);
						console.log(`     Reasoning: ${matchResult.reasoning.substring(0, 100)}...`);
					} else {
						console.log(`  ⏭️  Skipped (${matchResult.score}/100): ${job.title}`);
					}
				} catch (error) {
					console.error(`  ❌ Error scoring job ${job.id}:`, error);
					continue;
				}
			}

			// 5. Generate market insights
			if (scoredCount > 0) {
				await this.generateMarketInsights(userProfile, jobListings, scoredCount, recommendedCount);
			}

			console.log(`  ✅ Turn complete! Scored ${scoredCount} jobs, recommended ${recommendedCount}`);
		} catch (error) {
			console.error(`  ❌ Error in turn:`, error);
		}
	}

	/**
	 * Generate market insights about job trends
	 */
	private async generateMarketInsights(
		userProfile: any,
		jobListings: any[],
		scoredCount: number,
		recommendedCount: number
	): Promise<void> {
		try {
			// Analyze job market trends
			const skillsInDemand = new Map<string, number>();
			const locations = new Map<string, number>();
			const experienceLevels = new Map<string, number>();

			jobListings.forEach((job) => {
				job.required_skills?.forEach((skill: string) => {
					skillsInDemand.set(skill, (skillsInDemand.get(skill) || 0) + 1);
				});
				if (job.location) {
					locations.set(job.location, (locations.get(job.location) || 0) + 1);
				}
				if (job.experience_level) {
					experienceLevels.set(job.experience_level, (experienceLevels.get(job.experience_level) || 0) + 1);
				}
			});

			const topSkills = Array.from(skillsInDemand.entries())
				.sort((a, b) => b[1] - a[1])
				.slice(0, 5)
				.map(([skill]) => skill);

			const insightDescription = `Market Analysis:
- Analyzed ${scoredCount} job listings
- Found ${recommendedCount} strong matches (score >= 60)
- Top skills in demand: ${topSkills.join(", ")}
- Most common locations: ${Array.from(locations.keys()).slice(0, 3).join(", ")}
- Experience levels: ${Array.from(experienceLevels.keys()).join(", ")}`;

			await this.dbClient.addInsight(
				this.config.agentId,
				this.config.targetUserId,
				"market_trend",
				insightDescription,
				{
					scored_count: scoredCount,
					recommended_count: recommendedCount,
					top_skills: topSkills,
					locations: Array.from(locations.keys()),
				}
			);

			console.log(`  📊 Market insights generated`);
		} catch (error) {
			console.error(`  ⚠️  Error generating insights:`, error);
		}
	}
}

