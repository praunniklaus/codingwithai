import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Props } from "../types";
import { registerDatabaseTools } from "./database-tools";
import { registerUserProfileTools } from "./user-profile-tools";
import { registerJobListingTools } from "./job-listing-tools";
import { registerApplicationTools } from "./application-tools";
import { registerCVTools } from "./cv-tools";
import { registerRecommendationTools } from "./recommendation-tools";
import { registerInsightsTools } from "./insights-tools";

/**
 * Register all MCP tools for the Job Application Assistant
 * 
 * This includes:
 * - Database tools (listTables, queryDatabase, executeDatabase)
 * - User Profile tools (getUserProfile, updateUserProfile, manage skills/experience/education)
 * - Job Listing tools (searchJobs, getJobById, manage job listings)
 * - Application tools (createApplication, updateApplicationStatus, track applications)
 * - CV tools (generateCV, generateCoverLetter, manage CV versions)
 * - Recommendation tools (getRecommendations, updateRecommendationStatus)
 * - Insights tools (getAgentInsights, addInsight, getUserAnalytics)
 * - Calculator tool (basic math operations)
 */
export function registerAllTools(server: McpServer, env: Env, props: Props) {
	// Register database tools
	registerDatabaseTools(server, env, props);
	
	// Register Job Application Assistant tools
	registerUserProfileTools(server, env, props);
	registerJobListingTools(server, env, props);
	registerApplicationTools(server, env, props);
	registerCVTools(server, env, props);
	registerRecommendationTools(server, env, props);
	registerInsightsTools(server, env, props);
	
	// Register calculator tool (useful utility)
	server.tool(
		"calculate",
		{
			operation: z.enum(["add", "subtract", "multiply", "divide"]),
			a: z.number(),
			b: z.number(),
		},
		async ({ operation, a, b }) => {
			let result: number;
			switch (operation) {
				case "add":
					result = a + b;
					break;
				case "subtract":
					result = a - b;
					break;
				case "multiply":
					result = a * b;
					break;
				case "divide":
					if (b === 0)
						return {
							content: [{ type: "text", text: "Error: Cannot divide by zero" }],
						};
					result = a / b;
					break;
			}
			return { content: [{ type: "text", text: String(result) }] };
		}
	);
}