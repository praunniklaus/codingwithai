import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Props, createErrorResponse, createSuccessResponse } from "../types";
import { withDatabase } from "../database/utils";
import { formatDatabaseError } from "../database/security";

export function registerApplicationTools(server: McpServer, env: Env, props: Props) {
	// Create application
	server.tool(
		"createApplication",
		"Create a new job application for a user.",
		{
			user_id: z.string().describe("User ID"),
			job_id: z.number().int().describe("Job listing ID"),
			cv_id: z.number().int().optional().describe("CV ID (if CV already generated)"),
			cover_letter_id: z.number().int().optional().describe("Cover letter ID (if cover letter already generated)"),
			notes: z.string().optional().describe("Application notes"),
		},
		async ({ user_id, job_id, cv_id, cover_letter_id, notes }) => {
			try {
				return await withDatabase((env as any).DATABASE_URL, async (db) => {
					const result = await db.unsafe(
						`INSERT INTO applications (user_id, job_id, cv_id, cover_letter_id, notes, status)
						 VALUES ($1, $2, $3, $4, $5, 'draft')
						 RETURNING id`,
						[user_id, job_id, cv_id || null, cover_letter_id || null, notes || null]
					);
					
					// Create initial event
					await db.unsafe(
						`INSERT INTO application_events (application_id, event_type, notes)
						 VALUES ($1, 'created', 'Application created')`,
						[result[0].id]
					);
					
					return createSuccessResponse("Application created successfully", { application_id: result[0].id });
				});
			} catch (error) {
				console.error('createApplication error:', error);
				return createErrorResponse(`Error creating application: ${formatDatabaseError(error)}`);
			}
		}
	);

	// Get applications
	server.tool(
		"getApplications",
		"Get all applications for a user, optionally filtered by status.",
		{
			user_id: z.string().describe("User ID"),
			status: z.enum(["draft", "ready_to_submit", "submitted", "under_review", "interview", "offer", "rejected", "withdrawn"]).optional().describe("Filter by status"),
		},
		async ({ user_id, status }) => {
			try {
				return await withDatabase((env as any).DATABASE_URL, async (db) => {
					let query = `
						SELECT a.*, j.title as job_title, j.company as job_company, j.location as job_location
						FROM applications a
						JOIN job_listings j ON a.job_id = j.id
						WHERE a.user_id = $1
					`;
					const values: any[] = [user_id];
					
					if (status) {
						query += ` AND a.status = $2`;
						values.push(status);
					}
					
					query += ` ORDER BY a.created_at DESC`;
					
					const applications = await db.unsafe(query, values);
					
					// Get events for each application
					const applicationsWithEvents = await Promise.all(
						applications.map(async (app) => {
							const events = await db.unsafe(
								`SELECT * FROM application_events WHERE application_id = $1 ORDER BY event_date DESC`,
								[app.id]
							);
							return { ...app, events };
						})
					);
					
					return createSuccessResponse(`Found ${applicationsWithEvents.length} application(s)`, applicationsWithEvents);
				});
			} catch (error) {
				console.error('getApplications error:', error);
				return createErrorResponse(`Error retrieving applications: ${formatDatabaseError(error)}`);
			}
		}
	);

	// Update application status
	server.tool(
		"updateApplicationStatus",
		"Update the status of a job application and add an event record.",
		{
			application_id: z.number().int().describe("Application ID"),
			status: z.enum(["draft", "ready_to_submit", "submitted", "under_review", "interview", "offer", "rejected", "withdrawn"]).describe("New status"),
			notes: z.string().optional().describe("Notes about the status change"),
			applied_date: z.string().optional().describe("Date applied (YYYY-MM-DD) - required when status is 'submitted'"),
		},
		async ({ application_id, status, notes, applied_date }) => {
			try {
				return await withDatabase((env as any).DATABASE_URL, async (db) => {
					// Update application
					const updateFields: string[] = [`status = $1`, `updated_at = CURRENT_TIMESTAMP`];
					const values: any[] = [status];
					
					if (status === 'submitted' && applied_date) {
						updateFields.push(`applied_date = $${values.length + 1}`);
						values.push(applied_date);
					}
					
					values.push(application_id);
					
					await db.unsafe(
						`UPDATE applications SET ${updateFields.join(', ')} WHERE id = $${values.length}`,
						values
					);
					
					// Create event
					await db.unsafe(
						`INSERT INTO application_events (application_id, event_type, notes)
						 VALUES ($1, $2, $3)`,
						[application_id, `status_${status}`, notes || `Status changed to ${status}`]
					);
					
					return createSuccessResponse(`Application status updated to ${status}`);
				});
			} catch (error) {
				console.error('updateApplicationStatus error:', error);
				return createErrorResponse(`Error updating application status: ${formatDatabaseError(error)}`);
			}
		}
	);

	// Get application statistics
	server.tool(
		"getApplicationStats",
		"Get statistics about a user's job applications including counts by status and success metrics.",
		{
			user_id: z.string().describe("User ID"),
		},
		async ({ user_id }) => {
			try {
				return await withDatabase((env as any).DATABASE_URL, async (db) => {
					// Get counts by status
					const statusCounts = await db.unsafe(
						`SELECT status, COUNT(*) as count
						 FROM applications
						 WHERE user_id = $1
						 GROUP BY status`,
						[user_id]
					);
					
					// Get total applications
					const totalResult = await db.unsafe(
						`SELECT COUNT(*) as total FROM applications WHERE user_id = $1`,
						[user_id]
					);
					const total = parseInt(totalResult[0].total);
					
					// Get success rate (offer / submitted)
					const successResult = await db.unsafe(
						`SELECT 
							COUNT(*) FILTER (WHERE status = 'offer') as offers,
							COUNT(*) FILTER (WHERE status IN ('submitted', 'under_review', 'interview', 'offer', 'rejected')) as submitted
						 FROM applications
						 WHERE user_id = $1`,
						[user_id]
					);
					
					const offers = parseInt(successResult[0].offers || '0');
					const submitted = parseInt(successResult[0].submitted || '0');
					const successRate = submitted > 0 ? (offers / submitted * 100).toFixed(2) : '0.00';
					
					// Get average days since application
					const avgDaysResult = await db.unsafe(
						`SELECT AVG(CURRENT_DATE - applied_date) as avg_days
						 FROM applications
						 WHERE user_id = $1 AND applied_date IS NOT NULL`,
						[user_id]
					);
					const avgDays = avgDaysResult[0]?.avg_days ? Math.round(parseFloat(avgDaysResult[0].avg_days)) : null;
					
					return createSuccessResponse("Application statistics retrieved", {
						total,
						by_status: statusCounts,
						success_rate: `${successRate}%`,
						offers,
						submitted,
						avg_days_since_application: avgDays,
					});
				});
			} catch (error) {
				console.error('getApplicationStats error:', error);
				return createErrorResponse(`Error retrieving application statistics: ${formatDatabaseError(error)}`);
			}
		}
	);
}

