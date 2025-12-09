/**
 * Application Tracker Agent (Agent 3)
 * 
 * Autonomous AI agent that:
 * - Monitors all applications across different statuses
 * - Identifies stale applications (7+ days without updates)
 * - Generates follow-up reminders
 * - Analyzes patterns (success rates, bottlenecks)
 * - Creates weekly reports with insights
 */

import { LLMProviderManager, LLMProvider } from "./llm-providers.js";
import { JobDatabaseClient } from "./job-database-client.js";

export interface ApplicationTrackerConfig {
	name: string;
	agentId: string;
	databaseUrl: string;
	llmProvider: LLMProvider;
	llmApiKey?: string;
	llmModel?: string;
	targetUserId: string; // User to track applications for
}

export class ApplicationTrackerAgent {
	private config: ApplicationTrackerConfig;
	private dbClient: JobDatabaseClient;
	private llmManager: LLMProviderManager;
	private isConnected: boolean = false;

	constructor(config: ApplicationTrackerConfig, llmManager: LLMProviderManager) {
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
	 * Agent's iteration: Track applications and generate insights
	 */
	async takeTurn(iteration: number): Promise<void> {
		console.log(`\n📊 ${this.config.name} (${this.config.llmProvider}) - Turn ${iteration}`);

		try {
			// 1. Fetch all applications
			const allApplications = await this.dbClient.getApplications(this.config.targetUserId);
			console.log(`  📋 Found ${allApplications.length} total application(s)`);

			if (allApplications.length === 0) {
				console.log(`  ⚠️  No applications found, skipping turn`);
				return;
			}

			// 2. Identify stale applications (7+ days without updates)
			const staleApplications = await this.identifyStaleApplications(allApplications);
			console.log(`  ⏰ Found ${staleApplications.length} stale application(s)`);

			// 3. Calculate success metrics
			const metrics = this.calculateMetrics(allApplications);
			console.log(`  📈 Success rate: ${metrics.successRate}%`);
			console.log(`  📊 Status breakdown:`, metrics.statusBreakdown);

			// 4. Use LLM to identify patterns
			if (allApplications.length > 0) {
				const insights = await this.llmManager.analyzeApplications(
					this.config.llmProvider,
					this.config.llmModel || "default",
					allApplications
				);

				// 5. Store insights
				for (const insight of insights) {
					await this.dbClient.addInsight(
						this.config.agentId,
						this.config.targetUserId,
						insight.insight_type,
						insight.description,
						insight.metadata
					);
				}

				console.log(`  💡 Generated ${insights.length} insight(s)`);
			}

			// 6. Generate follow-up reminders for stale applications
			if (staleApplications.length > 0) {
				await this.generateFollowUpReminders(staleApplications);
			}

			console.log(`  ✅ Turn complete!`);
		} catch (error) {
			console.error(`  ❌ Error in turn:`, error);
		}
	}

	/**
	 * Identify stale applications (7+ days without updates)
	 */
	private async identifyStaleApplications(applications: any[]): Promise<any[]> {
		const stale: any[] = [];
		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

		for (const app of applications) {
			// Get latest event
			const events = await this.dbClient.getApplicationEvents(app.id);
			if (events.length === 0) continue;

			const latestEvent = events[0];
			const eventDate = new Date(latestEvent.event_date);

			if (eventDate < sevenDaysAgo && app.status !== "rejected" && app.status !== "withdrawn") {
				stale.push(app);
			}
		}

		return stale;
	}

	/**
	 * Calculate success metrics
	 */
	private calculateMetrics(applications: any[]): {
		total: number;
		submitted: number;
		offers: number;
		successRate: string;
		statusBreakdown: Record<string, number>;
	} {
		const statusBreakdown: Record<string, number> = {};
		let submitted = 0;
		let offers = 0;

		applications.forEach((app) => {
			statusBreakdown[app.status] = (statusBreakdown[app.status] || 0) + 1;

			if (["submitted", "under_review", "interview", "offer", "rejected"].includes(app.status)) {
				submitted++;
			}
			if (app.status === "offer") {
				offers++;
			}
		});

		const successRate = submitted > 0 ? ((offers / submitted) * 100).toFixed(2) : "0.00";

		return {
			total: applications.length,
			submitted,
			offers,
			successRate,
			statusBreakdown,
		};
	}

	/**
	 * Generate follow-up reminders for stale applications
	 */
	private async generateFollowUpReminders(staleApplications: any[]): Promise<void> {
		for (const app of staleApplications) {
			const daysSinceUpdate = Math.floor(
				(Date.now() - new Date(app.updated_at).getTime()) / (1000 * 60 * 60 * 24)
			);

			const reminderDescription = `Follow-up Reminder:
Application for ${app.job_title} at ${app.job_company} has been ${app.status} for ${daysSinceUpdate} days.
Consider following up with the employer to check on status.`;

			await this.dbClient.addInsight(
				this.config.agentId,
				this.config.targetUserId,
				"follow_up_reminder",
				reminderDescription,
				{
					application_id: app.id,
					job_title: app.job_title,
					company: app.job_company,
					status: app.status,
					days_since_update: daysSinceUpdate,
				}
			);
		}

		console.log(`  📧 Generated ${staleApplications.length} follow-up reminder(s)`);
	}
}

