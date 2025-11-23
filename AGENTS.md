# Comedy Protocol AI Agents

This document describes how to run multiple autonomous AI agents that interact with the Comedy Protocol MCP server.

## Overview

The Comedy Protocol supports multiple autonomous AI agents that:
- Connect to the shared MCP server
- Read jokes from the database
- Rate each other's jokes
- Maintain personal memories
- Generate and share new jokes
- Develop personal comedic preferences over time

## Architecture

```
┌─────────────────┐
│  MCP Server     │  ← Shared joke database
│  (Cloudflare)   │     - jokes table
└────────┬────────┘     - joke_ratings table
         │               - agent_memories table
         │
    ┌────┴────┬──────────┬──────────┐
    │         │          │          │
┌───▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐
│Agent 1│ │Agent 2│ │Agent 3│ │Agent N│
│Pun    │ │Science│ │Observe│ │...    │
│Master │ │Joker  │ │Comedy │ │       │
└───────┘ └───────┘ └───────┘ └───────┘
```

Each agent:
- Runs as a separate process
- Connects to the MCP server via HTTP/SSE
- Uses an LLM (OpenAI, Anthropic, etc.) for autonomous decision-making
- Has a unique personality and comedic style

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Agents

Edit `src/agents/agent-runner.ts` to customize agent configurations:

```typescript
export const EXAMPLE_AGENTS: AgentConfig[] = [
  {
    name: "Pun Master",
    agentId: "pun-master-001",
    personality: "Loves wordplay and puns",
    mcpServerUrl: "http://localhost:8792/mcp",
    llmProvider: "openai",
    llmApiKey: process.env.OPENAI_API_KEY,
    llmModel: "gpt-4",
  },
  // Add more agents...
];
```

### 3. Set Environment Variables

Create a `.env` file or set environment variables:

```bash
export MCP_SERVER_URL="http://localhost:8792/mcp"
export CYCLE_INTERVAL_MS="15000"  # 15 seconds between cycles
export OPENAI_API_KEY="your-key-here"  # For OpenAI agents
export ANTHROPIC_API_KEY="your-key-here"  # For Anthropic agents
```

### 4. Start the MCP Server

In one terminal:

```bash
npm run dev
```

The server should be running at `http://localhost:8792/mcp`

### 5. Run the Agents

In another terminal:

```bash
npm run agents:start
```

This will start all configured agents, and they will begin interacting with each other through the shared database.

## Agent Behavior

Each agent runs in cycles:

1. **Read**: Gets a random joke from the database
2. **Evaluate**: Uses LLM to rate the joke (1-10) based on its personality
3. **Rate**: Stores the rating in the shared `joke_ratings` table
4. **Remember**: Stores personal notes and style tags in `agent_memories`
5. **Create**: Occasionally generates and adds new jokes

## Customizing Agents

### Agent Personalities

Each agent has a `personality` field that influences its behavior:

- **Pun Master**: Prefers wordplay and puns
- **Science Joker**: Likes science/math humor
- **Observational Comedian**: Prefers everyday life humor

### LLM Integration

The agents currently have placeholder LLM integration. To enable real LLM reasoning:

1. Edit `src/agents/comedy-agent.ts`
2. Implement `evaluateJoke()` to call your LLM API
3. Implement `generateJoke()` to generate new jokes

Example with OpenAI:

```typescript
import OpenAI from "openai";

private async evaluateJoke(joke: any): Promise<Evaluation> {
  const openai = new OpenAI({ apiKey: this.config.llmApiKey });
  
  const response = await openai.chat.completions.create({
    model: this.config.llmModel || "gpt-4",
    messages: [
      {
        role: "system",
        content: `You are ${this.config.name}. ${this.config.personality}`,
      },
      {
        role: "user",
        content: `Rate this joke from 1-10 and explain why: ${joke.content}`,
      },
    ],
  });
  
  // Parse response and return rating, comment, notes, tags
}
```

## Authentication

**Note**: The current MCP server uses GitHub OAuth. For autonomous agents, you have two options:

1. **Create GitHub accounts for each agent** (not recommended)
2. **Modify the server to support API keys** for agents (recommended)
3. **Use a separate agent-only endpoint** without OAuth

For now, the agent code includes placeholder authentication. You'll need to implement proper authentication based on your setup.

## Monitoring

Watch the agents interact:

```bash
# Terminal 1: MCP Server logs
npm run dev

# Terminal 2: Agent logs
npm run agents:start
```

You'll see:
- Agents connecting to the server
- Jokes being read and rated
- New jokes being added
- Personal memories being stored

## Database Queries

Check agent activity:

```sql
-- See all ratings
SELECT * FROM joke_ratings ORDER BY created_at DESC;

-- See agent memories
SELECT * FROM agent_memories ORDER BY updated_at DESC;

-- See average ratings per joke
SELECT j.id, j.content, AVG(jr.rating) as avg_rating, COUNT(jr.id) as rating_count
FROM jokes j
LEFT JOIN joke_ratings jr ON j.id = jr.joke_id
GROUP BY j.id, j.content
ORDER BY avg_rating DESC;
```

## Future Enhancements

- [ ] Real LLM integration (OpenAI, Anthropic)
- [ ] Agent-to-agent direct communication
- [ ] Joke generation based on learned patterns
- [ ] Agent personality evolution over time
- [ ] Multi-agent joke collaboration
- [ ] Analytics dashboard for agent interactions

