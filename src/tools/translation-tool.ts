import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Props, createSuccessResponse, createErrorResponse } from "../types";
import { withDatabase } from "../database/utils";

/**
 * Translation Tool
 * Translates jokes into different languages to explore cultural and linguistic humor variations.
 * 
 * Note: This is a basic implementation. For production, integrate with a translation API
 * like Google Translate, DeepL, or OpenAI's translation capabilities.
 */

// Schema for translating a joke
const TranslateJokeSchema = {
	jokeId: z.number().int().positive().describe("The ID of the joke to translate"),
	targetLanguage: z.string().min(2).max(10).describe("Target language code (e.g., 'es', 'fr', 'de', 'it', 'pt')"),
	saveTranslation: z.boolean().optional().default(false).describe("Whether to save the translation to the database"),
};

// Supported languages mapping
const SUPPORTED_LANGUAGES: Record<string, string> = {
	en: "English",
	es: "Spanish",
	fr: "French",
	de: "German",
	it: "Italian",
	pt: "Portuguese",
	ru: "Russian",
	ja: "Japanese",
	zh: "Chinese",
	ar: "Arabic",
};

/**
 * Simple translation function using a mock/placeholder approach
 * In production, replace this with actual translation API calls
 */
async function translateText(text: string, targetLanguage: string): Promise<string> {
	// TODO: Replace with actual translation API
	// Options:
	// 1. Google Translate API
	// 2. DeepL API
	// 3. OpenAI API with translation prompt
	// 4. LibreTranslate (open source)
	
	// For now, return a placeholder that indicates translation is needed
	// This allows the tool structure to be in place while you integrate a real service
	
	return `[TRANSLATED TO ${targetLanguage.toUpperCase()}] ${text}`;
}

export function registerTranslationTool(server: McpServer, env: Env, props: Props) {
	server.tool(
		"translateJoke",
		"Translate a joke from the database into a different language. This helps explore cultural and linguistic humor variations. The translation can optionally be saved to the database as a new joke entry.",
		TranslateJokeSchema,
		async ({ jokeId, targetLanguage, saveTranslation = false }) => {
			try {
				// Validate target language
				if (!SUPPORTED_LANGUAGES[targetLanguage]) {
					return createErrorResponse(
						`Unsupported language: ${targetLanguage}. Supported languages: ${Object.keys(SUPPORTED_LANGUAGES).join(", ")}`
					);
				}

				return await withDatabase((env as any).DATABASE_URL, async (db) => {
					// Get the original joke
					const jokes = await db.unsafe(
						`SELECT id, content, language, category, author 
						 FROM jokes 
						 WHERE id = $1`,
						[jokeId]
					);

					if (jokes.length === 0) {
						return createErrorResponse(`Joke with ID ${jokeId} not found`);
					}

					const originalJoke = jokes[0];

					// Check if translation already exists
					if (saveTranslation) {
						const existingTranslation = await db.unsafe(
							`SELECT id, content 
							 FROM jokes 
							 WHERE id = $1 AND language = $2`,
							[jokeId, targetLanguage]
						);

						// For now, we'll create a new joke entry for the translation
						// In a more sophisticated system, you might want to link translations
					}

					// Translate the joke content
					const translatedContent = await translateText(originalJoke.content, targetLanguage);

					// If saveTranslation is true, save it to the database
					let savedJoke = null;
					if (saveTranslation) {
						const result = await db.unsafe(
							`INSERT INTO jokes (content, language, category, author) 
							 VALUES ($1, $2, $3, $4) 
							 RETURNING id, content, language, category, author, created_at`,
							[
								translatedContent,
								targetLanguage,
								originalJoke.category,
								`${originalJoke.author || "system"}_translated`
							]
						);
						savedJoke = result[0];
					}

					return createSuccessResponse(
						`Joke translated to ${SUPPORTED_LANGUAGES[targetLanguage]}`,
						{
							original: {
								id: originalJoke.id,
								content: originalJoke.content,
								language: originalJoke.language,
							},
							translation: {
								content: translatedContent,
								language: targetLanguage,
								languageName: SUPPORTED_LANGUAGES[targetLanguage],
							},
							saved: saveTranslation,
							savedJoke: savedJoke,
							note: "This is a placeholder translation. Integrate with a real translation API for production use."
						}
					);
				});
			} catch (error) {
				console.error('translateJoke error:', error);
				return createErrorResponse(`Error translating joke: ${String(error)}`);
			}
		}
	);

	// Tool to list supported languages
	server.tool(
		"listSupportedLanguages",
		"Get a list of all supported languages for joke translation.",
		{},
		async () => {
			return createSuccessResponse(
				"Supported languages for translation",
				{
					languages: Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => ({
						code,
						name,
					})),
					count: Object.keys(SUPPORTED_LANGUAGES).length,
					note: "Translation functionality requires integration with a translation API. Currently returns placeholder translations."
				}
			);
		}
	);
}

