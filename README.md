# Comedy Protocol - Multi-Agent MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) server that enables **3 autonomous AI agents** to tell jokes, rate each other's jokes, and develop comedic preferences over time. Built on Cloudflare Workers with PostgreSQL.

## 🎭 What This Does

Three AI agents (using OpenAI, Anthropic Claude, and Grok) interact with each other through a shared joke database:
- **Pun Master** (OpenAI GPT-4): Loves wordplay and puns
- **Science Joker** (Anthropic Claude): Specializes in science/math humor
- **Observational Comedian** (Grok): Finds humor in everyday life

Each agent:
- Reads jokes from the shared database
- Rates jokes (1-10) using their LLM based on their personality
- Stores personal memories and comedic style preferences
- Generates and adds new jokes
- Evolves preferences over time

After 3 automatic iterations, **human-in-the-loop** feedback is enabled for controlling the conversation.

## 🏗️ Architecture

- **MCP Server**: Cloudflare Workers (runs with `wrangler dev`)
- **Database**: Docker PostgreSQL (local development)
- **Agents**: Node.js processes that connect directly to the database

```
┌─────────────────┐
│  MCP Server     │  ← Cloudflare Workers (for human users)
│  (Cloudflare)   │     - OAuth authentication
└────────┬────────┘     - MCP tools via /mcp endpoint
         │
    ┌────┴────┬──────────┬──────────┐
    │         │          │          │
┌───▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐
│Agent 1│ │Agent 2│ │Agent 3│ │Human  │
│OpenAI │ │Claude │ │Grok   │ │User   │
└───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘
    │         │          │          │
    └─────────┴──────────┴──────────┘
              │
         ┌────▼────┐
         │PostgreSQL│  ← Shared joke database
         │ (Docker) │     - jokes table
         └──────────┘     - joke_ratings table
                          - agent_memories table
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Edit `.dev.vars`:

```bash
# Database (from docker-compose.yml)
DATABASE_URL=postgresql://mcp_user:mcp_password@localhost:5432/mcp_database

# LLM API Keys (REQUIRED)
OPENAI_API_KEY=sk-your-openai-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here
GROK_API_KEY=xai-your-grok-key-here  # Optional, will use fallback if unavailable
```

### 3. Start Database

```bash
./setup-database.sh
```

This starts PostgreSQL in Docker and creates all Comedy Protocol tables.

### 4. Run the System

**Terminal 1 - MCP Server** (optional, for human users):
```bash
npm run dev
```

**Terminal 2 - Agents**:
```bash
npm run agents:start
```

## 📋 What Happens

1. **3 agents initialize** with different personalities and LLMs
2. **3 automatic iterations** where agents:
   - Read random jokes from database
   - Evaluate and rate them using their LLM
   - Store personal memories
   - Generate new jokes
3. **Human-in-the-loop enabled** - you can:
   - Press Enter to continue
   - Type `summary` to see stats
   - Type `rate <agent> <1-10>` to rate an agent
   - Type `stop` to end

## 🗄️ Database Schema

### `jokes` - Shared Joke Database
- `id`, `content`, `language`, `category`, `author`, `created_at`

### `joke_ratings` - All Ratings
- `id`, `joke_id`, `agent_id`, `rating` (1-10), `comment`, `created_at`
- Unique constraint: Each agent can only rate a joke once

### `agent_memories` - Personal Agent Memories
- `id`, `agent_id`, `joke_id`, `rating`, `personal_notes`, `comedic_style_tags`, `created_at`
- Enables context-aware evaluations and preference development

## 🛠️ Available MCP Tools

### Joke Management
- `getJoke` - Get joke by ID
- `searchJokes` - Search by content, category, language
- `addJoke` - Add new joke
- `getRandomJoke` - Get random joke

### Rating System
- `rateJoke` - Rate a joke (1-10)
- `getJokeRatings` - Get all ratings for a joke
- `getAgentRatingHistory` - Get agent's rating history

### Agent Memory
- `storeAgentMemory` - Store personal notes and style tags
- `getAgentMemory` - Retrieve agent's memory about a joke

### Translation
- `translateJoke` - Translate joke to different language
- `listSupportedLanguages` - List supported languages

## 📁 Project Structure

```
src/
├── index.ts                    # Main MCP server (Cloudflare Worker)
├── types.ts                    # Type definitions
├── auth/                       # GitHub OAuth
├── database/                   # Database connection & utilities
├── tools/                      # MCP tools
│   ├── comedy-protocol-tools.ts
│   ├── translation-tool.ts
│   ├── database-tools.ts
│   └── register-tools.ts
└── agents/                     # AI agents
    ├── comedy-agent.ts         # Individual agent
    ├── conversation-manager.ts # Conversation loop + human feedback
    ├── database-client.ts      # Direct DB access for agents
    ├── llm-providers.ts        # OpenAI, Claude, Grok integrations
    └── index.ts

scripts/
└── run-agents.ts               # Agent runner script

docker-compose.yml              # PostgreSQL container
setup-database.sh               # Database setup script
setup-comedy-protocol.sql       # Comedy Protocol schema
```

## 🔧 Configuration

### MCP Server (Cloudflare Workers)
- Config: `wrangler.jsonc`
- Port: `8792` (dev mode)
- Endpoints: `/mcp` (recommended), `/sse` (legacy)

### Agents
- Config: Environment variables in `.dev.vars`
- Script: `scripts/run-agents.ts`
- Run: `npm run agents:start`

## 🧪 Testing

```bash
npm test              # Run tests
npm run test:ui       # Run tests with UI
```

## 📊 Database Queries

After running agents, check the database:

```sql
-- See all jokes
SELECT * FROM jokes ORDER BY created_at DESC;

-- See all ratings
SELECT * FROM joke_ratings ORDER BY created_at DESC;

-- Average ratings per joke
SELECT j.id, j.content, AVG(jr.rating) as avg_rating, COUNT(jr.id) as rating_count
FROM jokes j
LEFT JOIN joke_ratings jr ON j.id = jr.joke_id
GROUP BY j.id, j.content
ORDER BY avg_rating DESC;

-- Agent memories
SELECT * FROM agent_memories ORDER BY updated_at DESC;
```

## 🐛 Troubleshooting

### Database Connection Error
- Make sure Docker is running
- Run `./setup-database.sh` to start database
- Check `DATABASE_URL` in `.dev.vars`

### API Key Errors
- Verify all 3 API keys are set in `.dev.vars`
- Grok API may not be publicly available - agent will use fallback

### MCP Server 404
- MCP server uses `/mcp` endpoint, not root `/`
- For testing, use MCP Inspector: `npx @modelcontextprotocol/inspector@latest`

## 📚 Key Features

- **Modular Architecture**: Clean separation of concerns
- **Direct Database Access**: Agents bypass MCP for efficiency
- **LLM Integration**: OpenAI, Anthropic, and Grok support
- **Human-in-the-Loop**: Control conversation after initial iterations
- **Personal Memory**: Agents develop preferences over time
- **OAuth Security**: MCP server uses GitHub OAuth for human users

## 🚢 Deployment

### MCP Server (Cloudflare)
```bash
wrangler deploy
```

### Database
Use a managed PostgreSQL service (Supabase, Neon, etc.) and update `DATABASE_URL`.

## 📄 License

See LICENSE file.
