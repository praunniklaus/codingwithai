import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Props, createErrorResponse, createSuccessResponse } from "../types";
import { withDatabase } from "../database/utils";
import { formatDatabaseError } from "../database/security";

export function registerJobListingTools(server: McpServer, env: Env, props: Props) {
	// Search jobs
	server.tool(
		"searchJobs",
		"Search for job listings based on title, company, location, skills, or other criteria.",
		{
			title: z.string().optional().describe("Job title keyword"),
			company: z.string().optional().describe("Company name"),
			location: z.string().optional().describe("Location keyword"),
			required_skill: z.string().optional().describe("Required skill"),
			experience_level: z.enum(["entry", "mid", "senior", "executive"]).optional().describe("Experience level"),
			job_type: z.enum(["full-time", "part-time", "contract", "internship"]).optional().describe("Job type"),
			limit: z.number().int().min(1).max(100).optional().default(20).describe("Maximum number of results"),
		},
		async ({ title, company, location, required_skill, experience_level, job_type, limit = 20 }) => {
			try {
				return await withDatabase((env as any).DATABASE_URL, async (db) => {
					let query = `SELECT * FROM job_listings WHERE is_active = true`;
					const conditions: string[] = [];
					const values: any[] = [];
					let paramIndex = 1;
					
					if (title) {
						conditions.push(`title ILIKE $${paramIndex++}`);
						values.push(`%${title}%`);
					}
					if (company) {
						conditions.push(`company ILIKE $${paramIndex++}`);
						values.push(`%${company}%`);
					}
					if (location) {
						conditions.push(`location ILIKE $${paramIndex++}`);
						values.push(`%${location}%`);
					}
					if (required_skill) {
						conditions.push(`$${paramIndex++} = ANY(required_skills)`);
						values.push(required_skill);
					}
					if (experience_level) {
						conditions.push(`experience_level = $${paramIndex++}`);
						values.push(experience_level);
					}
					if (job_type) {
						conditions.push(`job_type = $${paramIndex++}`);
						values.push(job_type);
					}
					
					if (conditions.length > 0) {
						query += ` AND ${conditions.join(' AND ')}`;
					}
					
					query += ` ORDER BY posted_date DESC LIMIT $${paramIndex}`;
					values.push(limit);
					
					const jobs = await db.unsafe(query, values);
					
					return createSuccessResponse(`Found ${jobs.length} job listing(s)`, jobs);
				});
			} catch (error) {
				console.error('searchJobs error:', error);
				return createErrorResponse(`Error searching jobs: ${formatDatabaseError(error)}`);
			}
		}
	);

	// Get job by ID
	server.tool(
		"getJobById",
		"Get detailed information about a specific job listing by its ID.",
		{
			job_id: z.number().int().describe("Job listing ID"),
		},
		async ({ job_id }) => {
			try {
				return await withDatabase((env as any).DATABASE_URL, async (db) => {
					const jobs = await db.unsafe(`SELECT * FROM job_listings WHERE id = $1`, [job_id]);
					
					if (jobs.length === 0) {
						return createErrorResponse(`Job listing not found with ID: ${job_id}`);
					}
					
					return createSuccessResponse("Job listing retrieved successfully", jobs[0]);
				});
			} catch (error) {
				console.error('getJobById error:', error);
				return createErrorResponse(`Error retrieving job listing: ${formatDatabaseError(error)}`);
			}
		}
	);

	// Add job listing (privileged)
	const ALLOWED_USERNAMES = new Set<string>([
		'coleam00'
	]);

	if (ALLOWED_USERNAMES.has(props.login)) {
		server.tool(
			"addJobListing",
			"Add a new job listing to the database. Requires write permissions.",
			{
				title: z.string().describe("Job title"),
				company: z.string().describe("Company name"),
				location: z.string().optional().describe("Location"),
				salary_min: z.number().int().optional().describe("Minimum salary"),
				salary_max: z.number().int().optional().describe("Maximum salary"),
				salary_currency: z.string().optional().default("USD").describe("Salary currency"),
				job_type: z.enum(["full-time", "part-time", "contract", "internship"]).optional().describe("Job type"),
				experience_level: z.enum(["entry", "mid", "senior", "executive"]).optional().describe("Experience level"),
				required_skills: z.array(z.string()).optional().describe("Required skills"),
				preferred_skills: z.array(z.string()).optional().describe("Preferred skills"),
				description: z.string().optional().describe("Job description"),
				application_url: z.string().url().optional().describe("Application URL"),
			},
			async (jobData) => {
				try {
					return await withDatabase((env as any).DATABASE_URL, async (db) => {
						const result = await db.unsafe(
							`INSERT INTO job_listings (
								title, company, location, salary_min, salary_max, salary_currency,
								job_type, experience_level, required_skills, preferred_skills,
								description, application_url
							) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
							RETURNING id`,
							[
								jobData.title,
								jobData.company,
								jobData.location || null,
								jobData.salary_min || null,
								jobData.salary_max || null,
								jobData.salary_currency || "USD",
								jobData.job_type || null,
								jobData.experience_level || null,
								jobData.required_skills || [],
								jobData.preferred_skills || [],
								jobData.description || null,
								jobData.application_url || null,
							]
						);
						
						return createSuccessResponse(`Job listing added successfully`, { job_id: result[0].id });
					});
				} catch (error) {
					console.error('addJobListing error:', error);
					return createErrorResponse(`Error adding job listing: ${formatDatabaseError(error)}`);
				}
			}
		);

		server.tool(
			"updateJobListing",
			"Update an existing job listing. Requires write permissions.",
			{
				job_id: z.number().int().describe("Job listing ID to update"),
				title: z.string().optional().describe("Job title"),
				company: z.string().optional().describe("Company name"),
				location: z.string().optional().describe("Location"),
				salary_min: z.number().int().optional().describe("Minimum salary"),
				salary_max: z.number().int().optional().describe("Maximum salary"),
				is_active: z.boolean().optional().describe("Whether the listing is active"),
			},
			async ({ job_id, ...updates }) => {
				try {
					return await withDatabase((env as any).DATABASE_URL, async (db) => {
						const updateFields: string[] = [];
						const values: any[] = [];
						let paramIndex = 1;
						
						if (updates.title) {
							updateFields.push(`title = $${paramIndex++}`);
							values.push(updates.title);
						}
						if (updates.company) {
							updateFields.push(`company = $${paramIndex++}`);
							values.push(updates.company);
						}
						if (updates.location) {
							updateFields.push(`location = $${paramIndex++}`);
							values.push(updates.location);
						}
						if (updates.salary_min !== undefined) {
							updateFields.push(`salary_min = $${paramIndex++}`);
							values.push(updates.salary_min);
						}
						if (updates.salary_max !== undefined) {
							updateFields.push(`salary_max = $${paramIndex++}`);
							values.push(updates.salary_max);
						}
						if (updates.is_active !== undefined) {
							updateFields.push(`is_active = $${paramIndex++}`);
							values.push(updates.is_active);
						}
						
						if (updateFields.length === 0) {
							return createErrorResponse("No fields to update");
						}
						
						updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
						values.push(job_id);
						
						await db.unsafe(
							`UPDATE job_listings SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
							values
						);
						
						return createSuccessResponse("Job listing updated successfully");
					});
				} catch (error) {
					console.error('updateJobListing error:', error);
					return createErrorResponse(`Error updating job listing: ${formatDatabaseError(error)}`);
				}
			}
		);
	}
}

