/**
 * Direct Database Client for Agents
 * 
 * Agents can access the database directly without going through MCP protocol.
 * This is simpler for autonomous agents and avoids OAuth complexity.
 */

import postgres from "postgres";

export class AgentDatabaseClient {
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
	 * Get a random joke
	 */
	async getRandomJoke(category?: string, language?: string): Promise<any> {
		await this.connect();
		if (!this.db) throw new Error("Database not connected");

		let query = "SELECT * FROM jokes WHERE 1=1";
		const params: any[] = [];

		if (category) {
			query += " AND category = $1";
			params.push(category);
		}
		if (language) {
			query += ` AND language = $${params.length + 1}`;
			params.push(language);
		}

		query += " ORDER BY RANDOM() LIMIT 1";

		const result = await this.db.unsafe(query, params);
		return result.length > 0 ? result[0] : null;
	}

	/**
	 * Add a joke
	 */
	async addJoke(content: string, category?: string, language: string = "en", author?: string): Promise<any> {
		await this.connect();
		if (!this.db) throw new Error("Database not connected");

		const result = await this.db`
			INSERT INTO jokes (content, language, category, author)
			VALUES (${content}, ${language}, ${category || null}, ${author || "agent"})
			RETURNING *
		`;
		return result[0];
	}

	/**
	 * Rate a joke
	 */
	async rateJoke(jokeId: number, agentId: string, rating: number, comment?: string): Promise<any> {
		await this.connect();
		if (!this.db) throw new Error("Database not connected");

		const result = await this.db`
			INSERT INTO joke_ratings (joke_id, agent_id, rating, comment)
			VALUES (${jokeId}, ${agentId}, ${rating}, ${comment || null})
			ON CONFLICT (joke_id, agent_id)
			DO UPDATE SET rating = ${rating}, comment = ${comment || null}, created_at = CURRENT_TIMESTAMP
			RETURNING *
		`;
		return result[0];
	}

	/**
	 * Store agent memory
	 */
	async storeMemory(
		jokeId: number,
		agentId: string,
		rating: number,
		notes?: string,
		tags?: string[]
	): Promise<any> {
		await this.connect();
		if (!this.db) throw new Error("Database not connected");

		const result = await this.db`
			INSERT INTO agent_memories (agent_id, joke_id, rating, personal_notes, comedic_style_tags)
			VALUES (${agentId}, ${jokeId}, ${rating}, ${notes || null}, ${tags || null})
			ON CONFLICT (agent_id, joke_id)
			DO UPDATE SET
				rating = ${rating},
				personal_notes = ${notes || null},
				comedic_style_tags = ${tags || null},
				updated_at = CURRENT_TIMESTAMP
			RETURNING *
		`;
		return result[0];
	}

	/**
	 * Get joke ratings
	 */
	async getJokeRatings(jokeId: number): Promise<any> {
		await this.connect();
		if (!this.db) throw new Error("Database not connected");

		const ratings = await this.db`
			SELECT * FROM joke_ratings WHERE joke_id = ${jokeId} ORDER BY created_at DESC
		`;

		const avgResult = await this.db`
			SELECT AVG(rating) as avg_rating, COUNT(*) as rating_count
			FROM joke_ratings
			WHERE joke_id = ${jokeId}
		`;

		return {
			jokeId,
			averageRating: avgResult[0]?.avg_rating ? parseFloat(avgResult[0].avg_rating).toFixed(2) : null,
			ratingCount: parseInt(avgResult[0]?.rating_count || "0"),
			ratings,
		};
	}

	/**
	 * Search jokes
	 */
	async searchJokes(query?: string, category?: string, language?: string, limit: number = 10): Promise<any[]> {
		await this.connect();
		if (!this.db) throw new Error("Database not connected");

		let sql = "SELECT * FROM jokes WHERE 1=1";
		const params: any[] = [];
		let paramCount = 0;

		if (query) {
			paramCount++;
			sql += ` AND content ILIKE $${paramCount}`;
			params.push(`%${query}%`);
		}
		if (category) {
			paramCount++;
			sql += ` AND category = $${paramCount}`;
			params.push(category);
		}
		if (language) {
			paramCount++;
			sql += ` AND language = $${paramCount}`;
			params.push(language);
		}

		sql += ` ORDER BY created_at DESC LIMIT $${++paramCount}`;
		params.push(limit);

		return await this.db.unsafe(sql, params);
	}
}

