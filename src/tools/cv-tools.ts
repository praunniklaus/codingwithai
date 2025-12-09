import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Props, createErrorResponse, createSuccessResponse } from "../types";
import { withDatabase } from "../database/utils";
import { formatDatabaseError } from "../database/security";

export function registerCVTools(server: McpServer, env: Env, props: Props) {
	// Generate CV
	server.tool(
		"generateCV",
		"Generate a tailored CV for a specific job application. This creates a new CV version.",
		{
			user_id: z.string().describe("User ID"),
			job_id: z.number().int().describe("Job listing ID to tailor CV for"),
			format: z.enum(["markdown", "plain", "html"]).optional().default("markdown").describe("CV format"),
		},
		async ({ user_id, job_id, format = "markdown" }) => {
			try {
				return await withDatabase((env as any).DATABASE_URL, async (db) => {
					// Get user profile data
					const [profile, skills, experience, education] = await Promise.all([
						db.unsafe(`SELECT * FROM user_profiles WHERE user_id = $1`, [user_id]),
						db.unsafe(`SELECT * FROM user_skills WHERE user_id = $1`, [user_id]),
						db.unsafe(`SELECT * FROM user_experience WHERE user_id = $1 ORDER BY start_date DESC`, [user_id]),
						db.unsafe(`SELECT * FROM user_education WHERE user_id = $1 ORDER BY start_date DESC`, [user_id]),
					]);
					
					if (profile.length === 0) {
						return createErrorResponse(`User profile not found for user_id: ${user_id}`);
					}
					
					// Get job details
					const jobs = await db.unsafe(`SELECT * FROM job_listings WHERE id = $1`, [job_id]);
					if (jobs.length === 0) {
						return createErrorResponse(`Job listing not found with ID: ${job_id}`);
					}
					
					const job = jobs[0];
					const userProfile = profile[0];
					
					// Generate CV content (this would normally use LLM, but for now we'll create a structured format)
					// In the actual agent implementation, this will use LLM to tailor the CV
					const cvContent = `# ${userProfile.name}
${userProfile.email || ''} | ${userProfile.location || ''}

## Target Role
${job.title} at ${job.company}

## Skills
${skills.map(s => `- ${s.skill_name} (${s.proficiency}, ${s.years_experience} years)`).join('\n')}

## Experience
${experience.map(exp => `
### ${exp.title} at ${exp.company}
${exp.start_date} - ${exp.is_current ? 'Present' : exp.end_date}
${exp.achievements?.map(a => `- ${a}`).join('\n') || ''}
`).join('\n')}

## Education
${education.map(edu => `
### ${edu.degree} in ${edu.field_of_study || 'N/A'}
${edu.institution}
${edu.start_date} - ${edu.end_date || 'Present'}
${edu.gpa ? `GPA: ${edu.gpa}` : ''}
`).join('\n')}
`;
					
					// Get version number
					const versionResult = await db.unsafe(
						`SELECT COALESCE(MAX(version), 0) + 1 as next_version
						 FROM generated_cvs
						 WHERE user_id = $1 AND job_id = $2`,
						[user_id, job_id]
					);
					const version = parseInt(versionResult[0]?.next_version || '1');
					
					// Save CV
					const result = await db.unsafe(
						`INSERT INTO generated_cvs (user_id, job_id, content, format, version)
						 VALUES ($1, $2, $3, $4, $5)
						 RETURNING id`,
						[user_id, job_id, cvContent, format, version]
					);
					
					return createSuccessResponse("CV generated successfully", {
						cv_id: result[0].id,
						version,
						format,
					});
				});
			} catch (error) {
				console.error('generateCV error:', error);
				return createErrorResponse(`Error generating CV: ${formatDatabaseError(error)}`);
			}
		}
	);

	// Get CV versions
	server.tool(
		"getCVVersions",
		"Get all versions of CVs generated for a specific job application.",
		{
			user_id: z.string().describe("User ID"),
			job_id: z.number().int().describe("Job listing ID"),
		},
		async ({ user_id, job_id }) => {
			try {
				return await withDatabase((env as any).DATABASE_URL, async (db) => {
					const cvs = await db.unsafe(
						`SELECT id, version, format, created_at
						 FROM generated_cvs
						 WHERE user_id = $1 AND job_id = $2
						 ORDER BY version DESC`,
						[user_id, job_id]
					);
					
					return createSuccessResponse(`Found ${cvs.length} CV version(s)`, cvs);
				});
			} catch (error) {
				console.error('getCVVersions error:', error);
				return createErrorResponse(`Error retrieving CV versions: ${formatDatabaseError(error)}`);
			}
		}
	);

	// Generate cover letter
	server.tool(
		"generateCoverLetter",
		"Generate a tailored cover letter for a specific job application.",
		{
			user_id: z.string().describe("User ID"),
			job_id: z.number().int().describe("Job listing ID"),
			tone: z.enum(["professional", "friendly", "formal", "enthusiastic"]).optional().default("professional").describe("Tone of the cover letter"),
		},
		async ({ user_id, job_id, tone = "professional" }) => {
			try {
				return await withDatabase((env as any).DATABASE_URL, async (db) => {
					// Get user profile and job details
					const [profile, jobs] = await Promise.all([
						db.unsafe(`SELECT * FROM user_profiles WHERE user_id = $1`, [user_id]),
						db.unsafe(`SELECT * FROM job_listings WHERE id = $1`, [job_id]),
					]);
					
					if (profile.length === 0) {
						return createErrorResponse(`User profile not found for user_id: ${user_id}`);
					}
					if (jobs.length === 0) {
						return createErrorResponse(`Job listing not found with ID: ${job_id}`);
					}
					
					const userProfile = profile[0];
					const job = jobs[0];
					
					// Generate cover letter content (this would normally use LLM)
					// In the actual agent implementation, this will use LLM to tailor the cover letter
					const coverLetterContent = `Dear Hiring Manager,

I am writing to express my interest in the ${job.title} position at ${job.company}. 

Based on my background in ${userProfile.target_role || 'software development'}, I believe I would be a strong fit for this role.

I look forward to discussing how my skills and experience align with your needs.

Best regards,
${userProfile.name}
`;
					
					// Get version number
					const versionResult = await db.unsafe(
						`SELECT COALESCE(MAX(version), 0) + 1 as next_version
						 FROM cover_letters
						 WHERE user_id = $1 AND job_id = $2`,
						[user_id, job_id]
					);
					const version = parseInt(versionResult[0]?.next_version || '1');
					
					// Save cover letter
					const result = await db.unsafe(
						`INSERT INTO cover_letters (user_id, job_id, content, tone, version)
						 VALUES ($1, $2, $3, $4, $5)
						 RETURNING id`,
						[user_id, job_id, coverLetterContent, tone, version]
					);
					
					return createSuccessResponse("Cover letter generated successfully", {
						cover_letter_id: result[0].id,
						version,
						tone,
					});
				});
			} catch (error) {
				console.error('generateCoverLetter error:', error);
				return createErrorResponse(`Error generating cover letter: ${formatDatabaseError(error)}`);
			}
		}
	);
}

