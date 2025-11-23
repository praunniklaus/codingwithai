import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Props, createSuccessResponse, createErrorResponse } from "../types";
import { withDatabase } from "../database/utils";

/**
 * Comedy Protocol Tools
 * These tools enable AI agents to interact with jokes, rate them, and maintain personal memories
 */

// Schema for getting a joke by ID
const GetJokeSchema = {
	jokeId: z.number().int().positive().describe("The ID of the joke to retrieve"),
};

// Schema for searching jokes
const SearchJokesSchema = {
	query: z.string().optional().describe("Search query to filter jokes by content"),
	category: z.string().optional().describe("Filter by joke category"),
	language: z.string().optional().describe("Filter by language code (e.g., 'en', 'es', 'fr')"),
	limit: z.number().int().positive().max(100).optional().default(10).describe("Maximum number of jokes to return"),
};

// Schema for adding a new joke
const AddJokeSchema = {
	content: z.string().min(1).describe("The joke content/text"),
	language: z.string().optional().default("en").describe("Language code (default: 'en')"),
	category: z.string().optional().describe("Joke category (e.g., 'puns', 'science', 'observational')"),
	author: z.string().optional().describe("Author of the joke"),
};

// Schema for getting a random joke
const GetRandomJokeSchema = {
	language: z.string().optional().describe("Filter by language code"),
	category: z.string().optional().describe("Filter by category"),
};

// Schema for rating a joke
const RateJokeSchema = {
	jokeId: z.number().int().positive().describe("The ID of the joke to rate"),
	rating: z.number().int().min(1).max(10).describe("Rating from 1 (worst) to 10 (best)"),
	comment: z.string().optional().describe("Optional comment about the rating"),
};

// Schema for getting joke ratings
const GetJokeRatingsSchema = {
	jokeId: z.number().int().positive().describe("The ID of the joke to get ratings for"),
};

// Schema for getting agent's rating history
const GetAgentRatingHistorySchema = {
	agentId: z.string().optional().describe("Agent ID (defaults to current user's GitHub username)"),
	limit: z.number().int().positive().max(100).optional().default(20).describe("Maximum number of ratings to return"),
};

// Schema for storing agent memory
const StoreAgentMemorySchema = {
	jokeId: z.number().int().positive().describe("The ID of the joke"),
	rating: z.number().int().min(1).max(10).describe("Agent's rating of the joke"),
	personalNotes: z.string().optional().describe("Agent's personal notes about the joke"),
	comedicStyleTags: z.array(z.string()).optional().describe("Tags describing the joke's comedic style"),
};

// Schema for retrieving agent memory
const GetAgentMemorySchema = {
	jokeId: z.number().int().positive().describe("The ID of the joke"),
	agentId: z.string().optional().describe("Agent ID (defaults to current user's GitHub username)"),
};

export function registerComedyProtocolTools(server: McpServer, env: Env, props: Props) {
	// Tool 1: Get a joke by ID
	server.tool(
		"getJoke",
		"Retrieve a specific joke by its ID from the shared joke database.",
		GetJokeSchema,
		async ({ jokeId }) => {
			try {
				return await withDatabase((env as any).DATABASE_URL, async (db) => {
					const jokes = await db.unsafe(
						`SELECT id, content, language, category, author, created_at 
						 FROM jokes 
						 WHERE id = $1`,
						[jokeId]
					);

					if (jokes.length === 0) {
						return createErrorResponse(`Joke with ID ${jokeId} not found`);
					}

					return createSuccessResponse(`Joke #${jokeId}`, jokes[0]);
				});
			} catch (error) {
				console.error('getJoke error:', error);
				return createErrorResponse(`Error retrieving joke: ${String(error)}`);
			}
		}
	);

	// Tool 2: Search jokes
	server.tool(
		"searchJokes",
		"Search for jokes in the database by content, category, or language. Returns a list of matching jokes.",
		SearchJokesSchema,
		async ({ query, category, language, limit = 10 }) => {
			try {
				return await withDatabase((env as any).DATABASE_URL, async (db) => {
					let sql = "SELECT id, content, language, category, author, created_at FROM jokes WHERE 1=1";
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

					const jokes = await db.unsafe(sql, params);

					return createSuccessResponse(
						`Found ${jokes.length} joke(s)`,
						{ jokes, count: jokes.length }
					);
				});
			} catch (error) {
				console.error('searchJokes error:', error);
				return createErrorResponse(`Error searching jokes: ${String(error)}`);
			}
		}
	);

	// Tool 3: Add a new joke
	server.tool(
		"addJoke",
		"Add a new joke to the shared joke database. The joke will be available to all agents.",
		AddJokeSchema,
		async ({ content, language = "en", category, author }) => {
			try {
				return await withDatabase((env as any).DATABASE_URL, async (db) => {
					const result = await db.unsafe(
						`INSERT INTO jokes (content, language, category, author) 
						 VALUES ($1, $2, $3, $4) 
						 RETURNING id, content, language, category, author, created_at`,
						[content, language, category || null, author || props.login]
					);

					return createSuccessResponse(
						`Joke added successfully!`,
						{ joke: result[0] }
					);
				});
			} catch (error) {
				console.error('addJoke error:', error);
				return createErrorResponse(`Error adding joke: ${String(error)}`);
			}
		}
	);

	// Tool 4: Get a random joke
	server.tool(
		"getRandomJoke",
		"Get a random joke from the database. Optionally filter by language or category.",
		GetRandomJokeSchema,
		async ({ language, category }) => {
			try {
				return await withDatabase((env as any).DATABASE_URL, async (db) => {
					let sql = "SELECT id, content, language, category, author, created_at FROM jokes WHERE 1=1";
					const params: any[] = [];
					let paramCount = 0;

					if (language) {
						paramCount++;
						sql += ` AND language = $${paramCount}`;
						params.push(language);
					}

					if (category) {
						paramCount++;
						sql += ` AND category = $${paramCount}`;
						params.push(category);
					}

					sql += " ORDER BY RANDOM() LIMIT 1";

					const jokes = await db.unsafe(sql, params);

					if (jokes.length === 0) {
						return createErrorResponse("No jokes found matching the criteria");
					}

					return createSuccessResponse("Random joke", jokes[0]);
				});
			} catch (error) {
				console.error('getRandomJoke error:', error);
				return createErrorResponse(`Error retrieving random joke: ${String(error)}`);
			}
		}
	);

	// Tool 5: Rate a joke
	server.tool(
		"rateJoke",
		"Rate a joke on a scale of 1-10. Each agent can only rate a joke once. The rating is stored in the shared ratings table.",
		RateJokeSchema,
		async ({ jokeId, rating, comment }) => {
			try {
				return await withDatabase((env as any).DATABASE_URL, async (db) => {
					// Check if joke exists
					const jokeCheck = await db.unsafe("SELECT id FROM jokes WHERE id = $1", [jokeId]);
					if (jokeCheck.length === 0) {
						return createErrorResponse(`Joke with ID ${jokeId} not found`);
					}

					// Insert or update rating (using ON CONFLICT for upsert)
					const result = await db.unsafe(
						`INSERT INTO joke_ratings (joke_id, agent_id, rating, comment)
						 VALUES ($1, $2, $3, $4)
						 ON CONFLICT (joke_id, agent_id) 
						 DO UPDATE SET rating = $3, comment = $4, created_at = CURRENT_TIMESTAMP
						 RETURNING id, joke_id, agent_id, rating, comment, created_at`,
						[jokeId, props.login, rating, comment || null]
					);

					return createSuccessResponse(
						`Joke #${jokeId} rated ${rating}/10 by ${props.login}`,
						{ rating: result[0] }
					);
				});
			} catch (error) {
				console.error('rateJoke error:', error);
				return createErrorResponse(`Error rating joke: ${String(error)}`);
			}
		}
	);

	// Tool 6: Get ratings for a joke
	server.tool(
		"getJokeRatings",
		"Get all ratings for a specific joke, including average rating and individual agent ratings.",
		GetJokeRatingsSchema,
		async ({ jokeId }) => {
			try {
				return await withDatabase((env as any).DATABASE_URL, async (db) => {
					// Get all ratings
					const ratings = await db.unsafe(
						`SELECT id, agent_id, rating, comment, created_at
						 FROM joke_ratings
						 WHERE joke_id = $1
						 ORDER BY created_at DESC`,
						[jokeId]
					);

					// Calculate average rating
					const avgResult = await db.unsafe(
						`SELECT AVG(rating) as avg_rating, COUNT(*) as rating_count
						 FROM joke_ratings
						 WHERE joke_id = $1`,
						[jokeId]
					);

					const avgRating = avgResult[0]?.avg_rating 
						? parseFloat(avgResult[0].avg_rating).toFixed(2)
						: null;
					const ratingCount = parseInt(avgResult[0]?.rating_count || "0");

					return createSuccessResponse(
						`Ratings for joke #${jokeId}`,
						{
							jokeId,
							averageRating: avgRating,
							ratingCount,
							ratings
						}
					);
				});
			} catch (error) {
				console.error('getJokeRatings error:', error);
				return createErrorResponse(`Error retrieving joke ratings: ${String(error)}`);
			}
		}
	);

	// Tool 7: Get agent's rating history
	server.tool(
		"getAgentRatingHistory",
		"Get the rating history for an agent, showing all jokes they have rated. Defaults to the current user's GitHub username.",
		GetAgentRatingHistorySchema,
		async ({ agentId, limit = 20 }) => {
			try {
				const targetAgentId = agentId || props.login;
				
				return await withDatabase((env as any).DATABASE_URL, async (db) => {
					const ratings = await db.unsafe(
						`SELECT jr.id, jr.joke_id, jr.rating, jr.comment, jr.created_at,
						        j.content as joke_content, j.category, j.language
						 FROM joke_ratings jr
						 JOIN jokes j ON jr.joke_id = j.id
						 WHERE jr.agent_id = $1
						 ORDER BY jr.created_at DESC
						 LIMIT $2`,
						[targetAgentId, limit]
					);

					return createSuccessResponse(
						`Rating history for agent: ${targetAgentId}`,
						{ agentId: targetAgentId, ratings, count: ratings.length }
					);
				});
			} catch (error) {
				console.error('getAgentRatingHistory error:', error);
				return createErrorResponse(`Error retrieving agent rating history: ${String(error)}`);
			}
		}
	);

	// Tool 8: Store agent memory (personal notes about a joke)
	server.tool(
		"storeAgentMemory",
		"Store or update an agent's personal memory about a joke. This enables context-aware evaluations and personal comedic style development.",
		StoreAgentMemorySchema,
		async ({ jokeId, rating, personalNotes, comedicStyleTags }) => {
			try {
				return await withDatabase((env as any).DATABASE_URL, async (db) => {
					// Check if joke exists
					const jokeCheck = await db.unsafe("SELECT id FROM jokes WHERE id = $1", [jokeId]);
					if (jokeCheck.length === 0) {
						return createErrorResponse(`Joke with ID ${jokeId} not found`);
					}

					// Insert or update agent memory
					const result = await db.unsafe(
						`INSERT INTO agent_memories (agent_id, joke_id, rating, personal_notes, comedic_style_tags)
						 VALUES ($1, $2, $3, $4, $5)
						 ON CONFLICT (agent_id, joke_id)
						 DO UPDATE SET 
						   rating = $3,
						   personal_notes = $4,
						   comedic_style_tags = $5,
						   updated_at = CURRENT_TIMESTAMP
						 RETURNING id, agent_id, joke_id, rating, personal_notes, comedic_style_tags, created_at, updated_at`,
						[props.login, jokeId, rating, personalNotes || null, comedicStyleTags || null]
					);

					return createSuccessResponse(
						`Memory stored for joke #${jokeId}`,
						{ memory: result[0] }
					);
				});
			} catch (error) {
				console.error('storeAgentMemory error:', error);
				return createErrorResponse(`Error storing agent memory: ${String(error)}`);
			}
		}
	);

	// Tool 9: Get agent memory for a joke
	server.tool(
		"getAgentMemory",
		"Retrieve an agent's personal memory about a specific joke, including their rating, notes, and comedic style tags.",
		GetAgentMemorySchema,
		async ({ jokeId, agentId }) => {
			try {
				const targetAgentId = agentId || props.login;
				
				return await withDatabase((env as any).DATABASE_URL, async (db) => {
					const memories = await db.unsafe(
						`SELECT am.id, am.agent_id, am.joke_id, am.rating, am.personal_notes, 
						        am.comedic_style_tags, am.created_at, am.updated_at,
						        j.content as joke_content
						 FROM agent_memories am
						 JOIN jokes j ON am.joke_id = j.id
						 WHERE am.joke_id = $1 AND am.agent_id = $2`,
						[jokeId, targetAgentId]
					);

					if (memories.length === 0) {
						return createErrorResponse(
							`No memory found for agent ${targetAgentId} and joke #${jokeId}`
						);
					}

					return createSuccessResponse(
						`Memory for joke #${jokeId}`,
						{ memory: memories[0] }
					);
				});
			} catch (error) {
				console.error('getAgentMemory error:', error);
				return createErrorResponse(`Error retrieving agent memory: ${String(error)}`);
			}
		}
	);
}

