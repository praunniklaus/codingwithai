/**
 * Job Application Database Client for Agents
 * 
 * Agents can access the database directly without going through MCP protocol.
 * This is simpler for autonomous agents and avoids OAuth complexity.
 */

import postgres from "postgres";

export class JobDatabaseClient {
	private db: postgres.Sql | null = null;
	private databaseUrl: string;

	constructor(databaseUrl: string) {
		this.databaseUrl = databaseUrl;
	}

	/**
	 * Connect to database
	 */
	async connect(): Promise<void> {
		if (!this.db) {
			this.db = postgres(this.databaseUrl, {
				max: 5,
				idle_timeout: 20,
				connect_timeout: 10,
			});
		}
	}

	/**
	 * Disconnect from database
	 */
	async disconnect(): Promise<void> {
		if (this.db) {
			await this.db.end();
			this.db = null;
		}
	}

	/**
	 * Get user profile
	 */
	async getUserProfile(userId: string): Promise<any> {
		await this.connect();
		if (!this.db) throw new Error("Database not connected");

		const profile = await this.db`SELECT * FROM user_profiles WHERE user_id = ${userId}`;
		if (profile.length === 0) return null;

		const [skills, experience, education] = await Promise.all([
			this.db`SELECT * FROM user_skills WHERE user_id = ${userId}`,
			this.db`SELECT * FROM user_experience WHERE user_id = ${userId} ORDER BY start_date DESC`,
			this.db`SELECT * FROM user_education WHERE user_id = ${userId} ORDER BY start_date DESC`,
		]);

		return {
			...profile[0],
			skills,
			experience,
			education,
		};
	}

	/**
	 * Get all active job listings
	 */
	async getJobListings(limit: number = 100): Promise<any[]> {
		await this.connect();
		if (!this.db) throw new Error("Database not connected");

		return await this.db`
			SELECT * FROM job_listings 
			WHERE is_active = true 
			ORDER BY posted_date DESC 
			LIMIT ${limit}
		`;
	}

	/**
	 * Get job by ID
	 */
	async getJobById(jobId: number): Promise<any> {
		await this.connect();
		if (!this.db) throw new Error("Database not connected");

		const jobs = await this.db`SELECT * FROM job_listings WHERE id = ${jobId}`;
		return jobs.length > 0 ? jobs[0] : null;
	}

	/**
	 * Add job recommendation
	 */
	async addRecommendation(
		userId: string,
		jobId: number,
		matchScore: number,
		reasoning: string
	): Promise<any> {
		await this.connect();
		if (!this.db) throw new Error("Database not connected");

		const result = await this.db`
			INSERT INTO job_recommendations (user_id, job_id, match_score, reasoning, status)
			VALUES (${userId}, ${jobId}, ${matchScore}, ${reasoning}, 'pending')
			ON CONFLICT (user_id, job_id)
			DO UPDATE SET match_score = ${matchScore}, reasoning = ${reasoning}, updated_at = CURRENT_TIMESTAMP
			RETURNING *
		`;
		return result[0];
	}

	/**
	 * Get applications for a user
	 */
	async getApplications(userId: string, status?: string): Promise<any[]> {
		await this.connect();
		if (!this.db) throw new Error("Database not connected");

		if (status) {
			return await this.db`
				SELECT a.*, j.title as job_title, j.company as job_company
				FROM applications a
				JOIN job_listings j ON a.job_id = j.id
				WHERE a.user_id = ${userId} AND a.status = ${status}
				ORDER BY a.created_at DESC
			`;
		}

		return await this.db`
			SELECT a.*, j.title as job_title, j.company as job_company
			FROM applications a
			JOIN job_listings j ON a.job_id = j.id
			WHERE a.user_id = ${userId}
			ORDER BY a.created_at DESC
		`;
	}

	/**
	 * Create application
	 */
	async createApplication(
		userId: string,
		jobId: number,
		cvId?: number,
		coverLetterId?: number
	): Promise<any> {
		await this.connect();
		if (!this.db) throw new Error("Database not connected");

		const result = await this.db`
			INSERT INTO applications (user_id, job_id, cv_id, cover_letter_id, status)
			VALUES (${userId}, ${jobId}, ${cvId || null}, ${coverLetterId || null}, 'draft')
			RETURNING *
		`;

		// Create initial event
		await this.db`
			INSERT INTO application_events (application_id, event_type, notes)
			VALUES (${result[0].id}, 'created', 'Application created')
		`;

		return result[0];
	}

	/**
	 * Update application status
	 */
	async updateApplicationStatus(
		applicationId: number,
		status: string,
		notes?: string
	): Promise<void> {
		await this.connect();
		if (!this.db) throw new Error("Database not connected");

		await this.db`
			UPDATE applications 
			SET status = ${status}, updated_at = CURRENT_TIMESTAMP
			WHERE id = ${applicationId}
		`;

		await this.db`
			INSERT INTO application_events (application_id, event_type, notes)
			VALUES (${applicationId}, ${`status_${status}`}, ${notes || `Status changed to ${status}`})
		`;
	}

	/**
	 * Save generated CV
	 */
	async saveCV(
		userId: string,
		jobId: number,
		content: string,
		format: string = "markdown"
	): Promise<any> {
		await this.connect();
		if (!this.db) throw new Error("Database not connected");

		// Get next version
		const versionResult = await this.db`
			SELECT COALESCE(MAX(version), 0) + 1 as next_version
			FROM generated_cvs
			WHERE user_id = ${userId} AND job_id = ${jobId}
		`;
		const version = parseInt(versionResult[0]?.next_version || "1");

		const result = await this.db`
			INSERT INTO generated_cvs (user_id, job_id, content, format, version)
			VALUES (${userId}, ${jobId}, ${content}, ${format}, ${version})
			RETURNING *
		`;

		return result[0];
	}

	/**
	 * Save cover letter
	 */
	async saveCoverLetter(
		userId: string,
		jobId: number,
		content: string,
		tone: string = "professional"
	): Promise<any> {
		await this.connect();
		if (!this.db) throw new Error("Database not connected");

		// Get next version
		const versionResult = await this.db`
			SELECT COALESCE(MAX(version), 0) + 1 as next_version
			FROM cover_letters
			WHERE user_id = ${userId} AND job_id = ${jobId}
		`;
		const version = parseInt(versionResult[0]?.next_version || "1");

		const result = await this.db`
			INSERT INTO cover_letters (user_id, job_id, content, tone, version)
			VALUES (${userId}, ${jobId}, ${content}, ${tone}, ${version})
			RETURNING *
		`;

		return result[0];
	}

	/**
	 * Add agent insight
	 */
	async addInsight(
		agentId: string,
		userId: string,
		insightType: string,
		description: string,
		metadata?: any
	): Promise<any> {
		await this.connect();
		if (!this.db) throw new Error("Database not connected");

		const result = await this.db`
			INSERT INTO agent_insights (agent_id, user_id, insight_type, description, metadata)
			VALUES (${agentId}, ${userId}, ${insightType}, ${description}, ${metadata ? JSON.stringify(metadata) : null}::jsonb)
			RETURNING *
		`;

		return result[0];
	}

	/**
	 * Get application events
	 */
	async getApplicationEvents(applicationId: number): Promise<any[]> {
		await this.connect();
		if (!this.db) throw new Error("Database not connected");

		return await this.db`
			SELECT * FROM application_events
			WHERE application_id = ${applicationId}
			ORDER BY event_date DESC
		`;
	}
}

