import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Props, createErrorResponse, createSuccessResponse } from "../types";
import { withDatabase } from "../database/utils";
import { formatDatabaseError } from "../database/security";

export function registerUserProfileTools(server: McpServer, env: Env, props: Props) {
	// Get user profile
	server.tool(
		"getUserProfile",
		"Get a user's profile information including name, location, target role, and preferences.",
		{
			user_id: z.string().describe("User ID to retrieve profile for"),
		},
		async ({ user_id }) => {
			try {
				return await withDatabase((env as any).DATABASE_URL, async (db) => {
					const profile = await db.unsafe(
						`SELECT * FROM user_profiles WHERE user_id = $1`,
						[user_id]
					);
					
					if (profile.length === 0) {
						return createErrorResponse(`User profile not found for user_id: ${user_id}`) as any;
					}
					
					// Get related data
					const [skills, experience, education] = await Promise.all([
						db.unsafe(`SELECT * FROM user_skills WHERE user_id = $1`, [user_id]),
						db.unsafe(`SELECT * FROM user_experience WHERE user_id = $1 ORDER BY start_date DESC`, [user_id]),
						db.unsafe(`SELECT * FROM user_education WHERE user_id = $1 ORDER BY start_date DESC`, [user_id]),
					]);
					
					return createSuccessResponse("User profile retrieved successfully", {
						profile: profile[0],
						skills,
						experience,
						education,
					}) as any;
				});
			} catch (error) {
				console.error('getUserProfile error:', error);
				return createErrorResponse(`Error retrieving user profile: ${formatDatabaseError(error)}`) as any;
			}
		}
	);

	// Update user profile
	server.tool(
		"updateUserProfile",
		"Update a user's profile information. Can update name, email, location, target_role, or preferences.",
		{
			user_id: z.string().describe("User ID to update"),
			name: z.string().optional().describe("User's name"),
			email: z.string().email().optional().describe("User's email"),
			location: z.string().optional().describe("User's location"),
			target_role: z.string().optional().describe("Target job role"),
			preferences: z.record(z.any()).optional().describe("User preferences as JSON object"),
		},
		async ({ user_id, ...updates }) => {
			try {
				return await withDatabase((env as any).DATABASE_URL, async (db) => {
					const updateFields: string[] = [];
					const insertFields: string[] = ['user_id'];
					const insertValues: any[] = [user_id];
					let paramIndex = 1;
					
					if (updates.name) {
						updateFields.push(`name = $${paramIndex}`);
						insertFields.push('name');
						insertValues.push(updates.name);
						paramIndex++;
					}
					if (updates.email) {
						updateFields.push(`email = $${paramIndex}`);
						insertFields.push('email');
						insertValues.push(updates.email);
						paramIndex++;
					}
					if (updates.location) {
						updateFields.push(`location = $${paramIndex}`);
						insertFields.push('location');
						insertValues.push(updates.location);
						paramIndex++;
					}
					if (updates.target_role) {
						updateFields.push(`target_role = $${paramIndex}`);
						insertFields.push('target_role');
						insertValues.push(updates.target_role);
						paramIndex++;
					}
					if (updates.preferences) {
						updateFields.push(`preferences = $${paramIndex}::jsonb`);
						insertFields.push('preferences');
						insertValues.push(JSON.stringify(updates.preferences));
						paramIndex++;
					}
					
					if (updateFields.length === 0) {
						return createErrorResponse("No fields to update") as any;
					}
					
					// Build UPSERT query - use EXCLUDED for conflict resolution
					const placeholders = insertFields.map((_, i) => `$${i + 1}`).join(', ');
					
					// For UPDATE clause, reference EXCLUDED values
					const updateClause = updateFields.map((field) => {
						// Extract field name and use EXCLUDED reference
						const fieldName = field.split('=')[0].trim();
						return `${fieldName} = EXCLUDED.${fieldName}`;
					}).join(', ');
					
					await db.unsafe(
						`INSERT INTO user_profiles (${insertFields.join(', ')}, created_at, updated_at) 
						 VALUES (${placeholders}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
						 ON CONFLICT (user_id) 
						 DO UPDATE SET ${updateClause}, updated_at = CURRENT_TIMESTAMP`,
						insertValues
					);
					
					return createSuccessResponse("User profile updated successfully") as any;
				});
			} catch (error) {
				console.error('updateUserProfile error:', error);
				return createErrorResponse(`Error updating user profile: ${formatDatabaseError(error)}`) as any;
			}
		}
	);

	// Add skill
	server.tool(
		"addSkill",
		"Add a skill to a user's profile with proficiency level and years of experience.",
		{
			user_id: z.string().describe("User ID"),
			skill_name: z.string().describe("Name of the skill"),
			proficiency: z.enum(["beginner", "intermediate", "advanced", "expert"]).describe("Proficiency level"),
			years_experience: z.number().int().min(0).optional().describe("Years of experience"),
		},
		async ({ user_id, skill_name, proficiency, years_experience = 0 }) => {
			try {
				return await withDatabase((env as any).DATABASE_URL, async (db) => {
					await db.unsafe(
						`INSERT INTO user_skills (user_id, skill_name, proficiency, years_experience)
						 VALUES ($1, $2, $3, $4)
						 ON CONFLICT (user_id, skill_name) 
						 DO UPDATE SET proficiency = $3, years_experience = $4`,
						[user_id, skill_name, proficiency, years_experience]
					);
					
					return createSuccessResponse(`Skill "${skill_name}" added/updated successfully`) as any;
				});
			} catch (error) {
				console.error('addSkill error:', error);
				return createErrorResponse(`Error adding skill: ${formatDatabaseError(error)}`) as any;
			}
		}
	);

	// Add experience
	server.tool(
		"addExperience",
		"Add work experience to a user's profile.",
		{
			user_id: z.string().describe("User ID"),
			company: z.string().describe("Company name"),
			title: z.string().describe("Job title"),
			start_date: z.string().describe("Start date (YYYY-MM-DD)"),
			end_date: z.string().optional().describe("End date (YYYY-MM-DD), omit if current"),
			is_current: z.boolean().optional().describe("Whether this is the current position"),
			achievements: z.array(z.string()).optional().describe("List of achievements"),
		},
		async ({ user_id, company, title, start_date, end_date, is_current = false, achievements = [] }) => {
			try {
				return await withDatabase((env as any).DATABASE_URL, async (db) => {
					await db.unsafe(
						`INSERT INTO user_experience (user_id, company, title, start_date, end_date, is_current, achievements)
						 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
						[user_id, company, title, start_date, end_date || null, is_current, achievements]
					);
					
					return createSuccessResponse(`Experience at ${company} added successfully`) as any;
				});
			} catch (error) {
				console.error('addExperience error:', error);
				return createErrorResponse(`Error adding experience: ${formatDatabaseError(error)}`) as any;
			}
		}
	);

	// Add education
	server.tool(
		"addEducation",
		"Add education to a user's profile.",
		{
			user_id: z.string().describe("User ID"),
			institution: z.string().describe("Institution name"),
			degree: z.string().describe("Degree type (e.g., Bachelor, Master)"),
			field_of_study: z.string().optional().describe("Field of study"),
			start_date: z.string().describe("Start date (YYYY-MM-DD)"),
			end_date: z.string().optional().describe("End date (YYYY-MM-DD)"),
			gpa: z.number().optional().describe("GPA (0-4.0 scale)"),
		},
		async ({ user_id, institution, degree, field_of_study, start_date, end_date, gpa }) => {
			try {
				return await withDatabase((env as any).DATABASE_URL, async (db) => {
					await db.unsafe(
						`INSERT INTO user_education (user_id, institution, degree, field_of_study, start_date, end_date, gpa)
						 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
						[user_id, institution, degree, field_of_study || null, start_date, end_date || null, gpa || null]
					);
					
					return createSuccessResponse(`Education at ${institution} added successfully`) as any;
				});
			} catch (error) {
				console.error('addEducation error:', error);
				return createErrorResponse(`Error adding education: ${formatDatabaseError(error)}`) as any;
			}
		}
	);
}

