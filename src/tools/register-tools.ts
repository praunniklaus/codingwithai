import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Props } from "../types";
import { registerDatabaseTools } from "./database-tools";
import { registerComedyProtocolTools } from "./comedy-protocol-tools";
import { registerTranslationTool } from "./translation-tool";

/**
 * Register all MCP tools based on user permissions
 * 
 * This includes:
 * - Database tools (listTables, queryDatabase, executeDatabase)
 * - Comedy Protocol tools (joke management, rating, agent memories)
 * - Translation tools (translate jokes to different languages)
 * - Calculator tool (basic math operations)
 */
export function registerAllTools(server: McpServer, env: Env, props: Props) {
	// Register database tools
	registerDatabaseTools(server, env, props);
	
	// Register Comedy Protocol tools (jokes, ratings, memories)
	registerComedyProtocolTools(server, env, props);
	
	// Register translation tools
	registerTranslationTool(server, env, props);
	
	// Register calculator tool
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