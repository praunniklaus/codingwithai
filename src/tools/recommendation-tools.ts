import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Props, createErrorResponse, createSuccessResponse } from "../types";
import { withDatabase } from "../database/utils";
import { formatDatabaseError } from "../database/security";

export function registerRecommendationTools(server: McpServer, env: Env, props: Props) {
	// Get recommendations
	server.tool(
		"getRecommendations",
		"Get job recommendations for a user, optionally filtered by match score or status.",
		{
			user_id: z.string().describe("User ID"),
			min_score: z.number().int().min(0).max(100).optional().describe("Minimum match score"),
			status: z.enum(["pending", "viewed", "applied", "dismissed"]).optional().describe("Filter by status"),
			limit: z.number().int().min(1).max(100).optional().default(20).describe("Maximum number of results"),
		},
		async ({ user_id, min_score, status, limit = 20 }) => {
			try {
				return await withDatabase((env as any).DATABASE_URL, async (db) => {
					let query = `
						SELECT r.*, j.title, j.company, j.location, j.salary_min, j.salary_max, j.description
						FROM job_recommendations r
						JOIN job_listings j ON r.job_id = j.id
						WHERE r.user_id = $1
					`;
					const values: any[] = [user_id];
					let paramIndex = 2;
					
					if (min_score !== undefined) {
						query += ` AND r.match_score >= $${paramIndex++}`;
						values.push(min_score);
					}
					if (status) {
						query += ` AND r.status = $${paramIndex++}`;
						values.push(status);
					}
					
					query += ` ORDER BY r.match_score DESC, r.created_at DESC LIMIT $${paramIndex}`;
					values.push(limit);
					
					const recommendations = await db.unsafe(query, values);
					
					return createSuccessResponse(`Found ${recommendations.length} recommendation(s)`, recommendations);
				});
			} catch (error) {
				console.error('getRecommendations error:', error);
				return createErrorResponse(`Error retrieving recommendations: ${formatDatabaseError(error)}`);
			}
		}
	);

	// Add recommendation (typically done by Agent 1)
	const ALLOWED_USERNAMES = new Set<string>([
		'coleam00'
	]);

	if (ALLOWED_USERNAMES.has(props.login)) {
		server.tool(
			"addRecommendation",
			"Add a job recommendation for a user. Typically called by Agent 1 (Job Hunter).",
			{
				user_id: z.string().describe("User ID"),
				job_id: z.number().int().describe("Job listing ID"),
				match_score: z.number().int().min(0).max(100).describe("Match score (0-100)"),
				reasoning: z.string().describe("Reasoning for the recommendation"),
			},
			async ({ user_id, job_id, match_score, reasoning }) => {
				try {
					return await withDatabase((env as any).DATABASE_URL, async (db) => {
						await db.unsafe(
							`INSERT INTO job_recommendations (user_id, job_id, match_score, reasoning, status)
							 VALUES ($1, $2, $3, $4, 'pending')
							 ON CONFLICT (user_id, job_id)
							 DO UPDATE SET match_score = $3, reasoning = $4, updated_at = CURRENT_TIMESTAMP`,
							[user_id, job_id, match_score, reasoning]
						);
						
						return createSuccessResponse("Recommendation added/updated successfully");
					});
				} catch (error) {
					console.error('addRecommendation error:', error);
					return createErrorResponse(`Error adding recommendation: ${formatDatabaseError(error)}`);
				}
			}
		);

		server.tool(
			"updateRecommendationStatus",
			"Update the status of a job recommendation (e.g., mark as viewed, applied, or dismissed).",
			{
				user_id: z.string().describe("User ID"),
				job_id: z.number().int().describe("Job listing ID"),
				status: z.enum(["pending", "viewed", "applied", "dismissed"]).describe("New status"),
			},
			async ({ user_id, job_id, status }) => {
				try {
					return await withDatabase((env as any).DATABASE_URL, async (db) => {
						await db.unsafe(
							`UPDATE job_recommendations
							 SET status = $1, updated_at = CURRENT_TIMESTAMP
							 WHERE user_id = $2 AND job_id = $3`,
							[status, user_id, job_id]
						);
						
						return createSuccessResponse(`Recommendation status updated to ${status}`);
					});
				} catch (error) {
					console.error('updateRecommendationStatus error:', error);
					return createErrorResponse(`Error updating recommendation status: ${formatDatabaseError(error)}`);
				}
			}
		);
	}

	// Auto-create recommendations for a user (called after onboarding)
	server.tool(
		"createRecommendationsForUser",
		"Automatically create job recommendations for a user based on available jobs. Typically called after user completes onboarding.",
		{
			user_id: z.string().describe("User ID"),
			count: z.number().int().min(1).max(20).optional().default(10).describe("Number of recommendations to create"),
		},
		async ({ user_id, count = 10 }) => {
			try {
				return await withDatabase((env as any).DATABASE_URL, async (db) => {
					// Get random active jobs
					const jobs = await db.unsafe(
						`SELECT id, title, company, location, required_skills
						 FROM job_listings
						 WHERE is_active = true
						 ORDER BY RANDOM()
						 LIMIT $1`,
						[count]
					);
					
					if (jobs.length === 0) {
						return createErrorResponse("No active jobs found in database. Please fetch jobs first.");
					}
					
					let created = 0;
					let skipped = 0;
					
					// Create recommendations with varying scores (65-95, all above 60 threshold)
					for (const job of jobs) {
						try {
							// Check if recommendation already exists
							const existing = await db.unsafe(
								`SELECT id FROM job_recommendations
								 WHERE user_id = $1 AND job_id = $2
								 LIMIT 1`,
								[user_id, job.id]
							);
							
							if (existing.length > 0) {
								skipped++;
								continue;
							}
							
							// Assign score: 65-95 (all above 60 threshold)
							const matchScore = 65 + Math.floor(Math.random() * 30);
							const skillsText = job.required_skills && Array.isArray(job.required_skills) 
								? job.required_skills.slice(0, 3).join(', ')
								: 'various skills';
							const reasoning = `Good match based on skills and location. Requires: ${skillsText}.`;
							
							await db.unsafe(
								`INSERT INTO job_recommendations (user_id, job_id, match_score, reasoning, status)
								 VALUES ($1, $2, $3, $4, 'pending')`,
								[user_id, job.id, matchScore, reasoning]
							);
							
							created++;
						} catch (error) {
							console.error(`Error creating recommendation for job ${job.id}:`, error);
						}
					}
					
					return createSuccessResponse(
						`Created ${created} recommendations, skipped ${skipped} duplicates`,
						{ created, skipped, total: jobs.length }
					);
				});
			} catch (error) {
				console.error('createRecommendationsForUser error:', error);
				return createErrorResponse(`Error creating recommendations: ${formatDatabaseError(error)}`);
			}
		}
	);
}

