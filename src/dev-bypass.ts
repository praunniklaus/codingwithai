/**
 * Development Mode OAuth Bypass
 * 
 * This allows the frontend to work without OAuth in development.
 * DO NOT USE IN PRODUCTION!
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAllTools } from "./tools/register-tools.js";
import { closeDb } from "./database/connection.js";

// Cache the server instance to avoid recreating it on every request
let cachedServer: McpServer | null = null;
let cachedProps: any = null;

export async function handleDevRequest(request: Request, env: any): Promise<Response> {
	// Only allow in development
	if (env.NODE_ENV === 'production') {
		return new Response('Dev mode not available in production', { status: 403 });
	}

	// Create a mock props object for development
	const mockProps = {
		login: 'dev_user',
		name: 'Development User',
		email: 'dev@localhost',
		accessToken: 'dev_token',
	};

	// Create and cache the MCP server (only create once)
	if (!cachedServer || cachedProps !== mockProps) {
		cachedServer = new McpServer({
			name: "Job Assistant MCP Server (Dev Mode)",
			version: "1.0.0",
		});
		registerAllTools(cachedServer, env, mockProps);
		cachedProps = mockProps;
	}

	const server = cachedServer;

	// Handle the MCP request using the server's built-in request handler
	try {
		// Parse the JSON-RPC request
		const body = await request.text();
		const message = JSON.parse(body);

		console.log('[DEV] Handling MCP request:', message.method, message.params?.name);

		// Use the server's handleRequest method if available
		if (typeof (server as any).handleRequest === 'function') {
			const result = await (server as any).handleRequest(message);
			return new Response(JSON.stringify(result), {
				headers: { 
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				},
			});
		}

		// Fallback: Access tools directly
		if (message.method === 'tools/call' && message.params?.name) {
			const toolName = message.params.name;
			let toolArgs = message.params.arguments || {};
			
			// Access tools from _registeredTools (this is where McpServer stores them)
			const registeredTools = (server as any)._registeredTools;
			
			// Debug: Check what _registeredTools actually is
			console.log('[DEV] _registeredTools type:', typeof registeredTools);
			console.log('[DEV] _registeredTools is Map?', registeredTools instanceof Map);
			console.log('[DEV] _registeredTools is Array?', Array.isArray(registeredTools));
			if (registeredTools) {
				if (registeredTools instanceof Map) {
					console.log('[DEV] _registeredTools (Map) size:', registeredTools.size);
					console.log('[DEV] _registeredTools (Map) keys:', Array.from(registeredTools.keys()));
				} else {
					console.log('[DEV] _registeredTools (Object) keys:', Object.keys(registeredTools));
				}
			} else {
				console.error('[DEV] _registeredTools is null/undefined!');
			}
			
			if (!registeredTools) {
				console.error('[DEV] _registeredTools is null/undefined. Server keys:', Object.keys(server));
				return new Response(JSON.stringify({
					jsonrpc: '2.0',
					id: message.id,
					error: { 
						code: -32603, 
						message: 'Server tools not accessible. _registeredTools is null. Make sure tools are registered.' 
					}
				}), {
					headers: { 
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*',
					},
				});
			}
			
			// _registeredTools might be a Map or an object - handle both
			let tool: any = null;
			
			if (registeredTools instanceof Map) {
				tool = registeredTools.get(toolName);
			} else if (registeredTools && typeof registeredTools === 'object') {
				// Try as object/record
				tool = registeredTools[toolName];
			}
			
			if (!tool) {
				// Log what's actually available
				let availableTools: string[] = [];
				if (registeredTools instanceof Map) {
					availableTools = Array.from(registeredTools.keys());
					console.log('[DEV] Available tools (Map):', availableTools);
				} else if (registeredTools && typeof registeredTools === 'object') {
					availableTools = Object.keys(registeredTools);
					console.log('[DEV] Available tools (Object):', availableTools);
				}
				
				console.error(`[DEV] Tool not found: ${toolName}. Available tools:`, availableTools);
				return new Response(JSON.stringify({
					jsonrpc: '2.0',
					id: message.id,
					error: { 
						code: -32601, 
						message: `Tool not found: ${toolName}. Available: ${availableTools.join(', ') || 'none'}` 
					}
				}), {
					headers: { 
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*',
					},
				});
			}

			// The MCP SDK stores tools with a `callback` property
			let toolHandler: Function;
			
			if (tool.callback && typeof tool.callback === 'function') {
				// MCP SDK tool - has callback property
				toolHandler = tool.callback;
			} else if (typeof tool === 'function') {
				// Tool is the handler function directly
				toolHandler = tool;
			} else if (tool.handler && typeof tool.handler === 'function') {
				// Tool has a handler property
				toolHandler = tool.handler;
			} else if (tool.call && typeof tool.call === 'function') {
				// Tool has a call method
				toolHandler = tool.call;
			} else {
				console.error(`[DEV] Tool structure:`, tool);
				return new Response(JSON.stringify({
					jsonrpc: '2.0',
					id: message.id,
					error: { 
						code: -32603, 
						message: `Tool handler not found. Tool structure: ${JSON.stringify(Object.keys(tool || {}))}` 
					}
				}), {
					headers: { 
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*',
					},
				});
			}

			// Validate input using the tool's inputSchema if available
			if (tool.inputSchema && typeof tool.inputSchema.safeParseAsync === 'function') {
				const validation = await tool.inputSchema.safeParseAsync(toolArgs);
				if (!validation.success) {
					return new Response(JSON.stringify({
						jsonrpc: '2.0',
						id: message.id,
						error: { 
							code: -32602, 
							message: `Invalid parameters: ${validation.error.message}` 
						}
					}), {
						headers: { 
							'Content-Type': 'application/json',
							'Access-Control-Allow-Origin': '*',
						},
					});
				}
				// Use validated data
				toolArgs = validation.data;
			}

			// Call the tool handler
			console.log(`[DEV] Calling tool: ${toolName} with args:`, toolArgs);
			const result = await toolHandler(toolArgs);
			console.log(`[DEV] Tool result type:`, typeof result, 'keys:', result ? Object.keys(result) : 'null');
			
			return new Response(JSON.stringify({
				jsonrpc: '2.0',
				id: message.id,
				result: result
			}), {
				headers: { 
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				},
			});
		}

		// Handle tools/list method
		if (message.method === 'tools/list') {
			const registeredTools = (server as any)._registeredTools;
			let toolList: any[] = [];
			
			if (registeredTools instanceof Map) {
				toolList = Array.from(registeredTools.entries()).map(([name, tool]: [string, any]) => ({
					name,
					description: tool.description || '',
					inputSchema: tool.inputSchema || {},
				}));
			} else if (registeredTools && typeof registeredTools === 'object') {
				toolList = Object.entries(registeredTools).map(([name, tool]: [string, any]) => ({
					name,
					description: tool.description || '',
					inputSchema: tool.inputSchema || {},
				}));
			}

			return new Response(JSON.stringify({
				jsonrpc: '2.0',
				id: message.id,
				result: {
					tools: toolList
				}
			}), {
				headers: { 
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				},
			});
		}

		// Handle other methods
		return new Response(JSON.stringify({
			jsonrpc: '2.0',
			id: message.id,
			error: { code: -32601, message: `Method not supported in dev mode: ${message.method}` }
		}), {
			headers: { 
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
			},
		});
	} catch (error) {
		console.error('[DEV] Dev request error:', error);
		// Clear DB connection on error to prevent I/O reuse issues
		await closeDb().catch(() => {});
		return new Response(JSON.stringify({ 
			jsonrpc: '2.0',
			id: null,
			error: { code: -32603, message: String(error) }
		}), {
			status: 500,
			headers: { 
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
			},
		});
	} finally {
		// Clear DB connection after each request to prevent I/O reuse across requests
		// This is necessary because Cloudflare Workers doesn't allow I/O objects
		// to be shared across different request handlers
		await closeDb().catch(() => {});
	}
}

