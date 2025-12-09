# Project Structure & Architecture

## 📁 Project Structure

```
codingwithai/
├── src/                          # Main source code
│   ├── index.ts                  # MCP Server entry point (Cloudflare Worker)
│   ├── types.ts                  # TypeScript type definitions
│   │
│   ├── auth/                     # GitHub OAuth Authentication
│   │   ├── github-handler.ts     # OAuth flow handlers
│   │   └── oauth-utils.ts        # OAuth utilities (approval dialogs, token exchange)
│   │
│   ├── database/                 # Database layer
│   │   ├── connection.ts          # PostgreSQL connection pooling
│   │   ├── security.ts           # SQL validation, injection protection
│   │   └── utils.ts              # Database helper functions
│   │
│   ├── tools/                    # MCP Tools (exposed via MCP protocol)
│   │   ├── register-tools.ts    # Tool registration orchestrator
│   │   ├── database-tools.ts    # Database query tools (listTables, queryDatabase, executeDatabase)
│   │   ├── comedy-protocol-tools.ts  # Comedy Protocol tools (jokes, ratings, memories)
│   │   └── translation-tool.ts # Translation tools
│   │
│   └── agents/                   # Autonomous AI Agents
│       ├── index.ts              # Agent exports
│       ├── comedy-agent.ts       # Individual agent implementation
│       ├── conversation-manager.ts  # Multi-agent conversation orchestration
│       ├── database-client.ts    # Direct DB access for agents (bypasses MCP)
│       └── llm-providers.ts      # LLM integrations (OpenAI, Anthropic, Grok)
│
├── scripts/
│   └── run-agents.ts             # Agent runner script
│
├── tests/                        # Test suite
│   ├── fixtures/                 # Test data fixtures
│   ├── mocks/                    # Mock implementations
│   └── unit/                     # Unit tests
│
├── PRPs/                         # Product Requirement Prompts
│   ├── templates/               # PRP templates
│   └── ai_docs/                  # AI documentation
│
├── docker-compose.yml            # PostgreSQL container configuration
├── setup-database.sh             # Database initialization script
├── setup-comedy-protocol.sql     # Database schema
├── wrangler.jsonc                # Cloudflare Workers configuration
├── package.json                  # Dependencies and scripts
└── tsconfig.json                 # TypeScript configuration
```

---

## 🏗️ Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Server Layer                         │
│              (Cloudflare Workers + OAuth)                   │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   /mcp       │  │   /sse       │  │  /authorize  │    │
│  │  endpoint    │  │  endpoint    │  │  OAuth flow  │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                  │                  │            │
│  ┌──────▼──────────────────▼──────────────────▼──────┐     │
│  │         MCP Tools (via registerAllTools)         │     │
│  │  • Database Tools                                │     │
│  │  • Comedy Protocol Tools                          │     │
│  │  • Translation Tools                              │     │
│  └──────────────────────────────────────────────────┘     │
└───────────────────────┬───────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
│  Agent 1     │ │  Agent 2    │ │  Agent 3    │
│  (OpenAI)    │ │  (Claude)   │ │  (Grok)    │
│              │ │             │ │             │
│  Direct DB  │ │  Direct DB  │ │  Direct DB  │
│  Access      │ │  Access     │ │  Access     │
└───────┬──────┘ └─────┬───────┘ └─────┬───────┘
        │              │               │
        └──────────────┼───────────────┘
                       │
            ┌──────────▼──────────┐
            │   PostgreSQL DB     │
            │   (Docker)          │
            │                     │
            │  • jokes            │
            │  • joke_ratings     │
            │  • agent_memories   │
            │  • users            │
            │  • products          │
            └─────────────────────┘
```

---

## 🔧 Component Details

### 1. MCP Server (`src/index.ts`)

**Technology**: Cloudflare Workers + Durable Objects

**Responsibilities**:
- Exposes MCP protocol endpoints (`/mcp`, `/sse`)
- Handles OAuth 2.0 authentication flow
- Manages tool registration and execution
- Provides stateful MCP agent via Durable Objects

**Key Classes**:
- `MyMCP extends McpAgent` - Main MCP server class
- `OAuthProvider` - OAuth 2.0 server implementation

**Endpoints**:
- `GET/POST /authorize` - OAuth authorization
- `GET /callback` - OAuth callback
- `POST /register` - Client registration
- `POST /token` - Token exchange
- `POST /mcp` - MCP protocol endpoint (Streamable HTTP)
- `GET /sse` - MCP protocol endpoint (Server-Sent Events)

---

### 2. Authentication Layer (`src/auth/`)

**Files**:
- `github-handler.ts` - GitHub OAuth flow handlers
- `oauth-utils.ts` - OAuth utilities (approval dialogs, token exchange)

**Flow**:
1. Client registers via `/register`
2. Client requests authorization via `/authorize`
3. User approves → redirects to GitHub
4. GitHub callback → exchanges code for token
5. Token stored in KV → used for authenticated requests

**Security**:
- HMAC-signed approval cookies
- Token-based authentication
- GitHub username-based permissions

---

### 3. Database Layer (`src/database/`)

**Files**:
- `connection.ts` - PostgreSQL connection pooling
- `security.ts` - SQL validation, injection protection
- `utils.ts` - Database helper functions

**Features**:
- Connection pooling (max 5 connections)
- SQL injection protection
- Query validation (read vs write operations)
- Error sanitization

**Connection**:
- Uses `postgres` package
- Connection string from `DATABASE_URL` env var
- Automatic connection management

---

### 4. Tools Layer (`src/tools/`)

**Tool Categories**:

#### Database Tools (`database-tools.ts`)
- `listTables` - List all tables and schemas (all users)
- `queryDatabase` - Execute SELECT queries (all users)
- `executeDatabase` - Execute write operations (privileged users only)

#### Comedy Protocol Tools (`comedy-protocol-tools.ts`)
- `getJoke` - Get joke by ID
- `searchJokes` - Search jokes by content/category
- `addJoke` - Add new joke
- `getRandomJoke` - Get random joke
- `rateJoke` - Rate a joke (1-10)
- `getJokeRatings` - Get all ratings for a joke
- `getAgentRatingHistory` - Get agent's rating history
- `storeAgentMemory` - Store personal notes
- `getAgentMemory` - Retrieve agent memory

#### Translation Tools (`translation-tool.ts`)
- `translateJoke` - Translate joke to different language
- `listSupportedLanguages` - List supported languages

#### Calculator Tool (`register-tools.ts`)
- `calculate` - Basic math operations

**Tool Registration**:
- Tools registered via `server.tool(name, schema, handler)`
- Zod schemas for input validation
- Permission-based tool availability

---

### 5. Agents Layer (`src/agents/`)

**Files**:
- `comedy-agent.ts` - Individual agent implementation
- `conversation-manager.ts` - Multi-agent conversation orchestration
- `database-client.ts` - Direct DB access (bypasses MCP)
- `llm-providers.ts` - LLM integrations

**Agent Types**:
1. **Pun Master** (OpenAI GPT-4) - Wordplay and puns
2. **Science Joker** (Anthropic Claude) - Science/math humor
3. **Observational Comedian** (Grok) - Everyday life humor

**Agent Behavior**:
- Read jokes from database
- Rate jokes using their LLM
- Store personal memories
- Generate new jokes
- Develop preferences over time

**Communication**:
- Agents communicate via shared database
- No direct agent-to-agent communication
- Human-in-the-loop after 3 iterations

---

## 🗄️ Database Schema

### Tables

1. **`jokes`**
   - `id` (SERIAL PRIMARY KEY)
   - `content` (TEXT)
   - `language` (VARCHAR)
   - `category` (VARCHAR)
   - `author` (VARCHAR)
   - `created_at` (TIMESTAMP)
   - `updated_at` (TIMESTAMP)

2. **`joke_ratings`**
   - `id` (SERIAL PRIMARY KEY)
   - `joke_id` (INTEGER REFERENCES jokes)
   - `agent_id` (VARCHAR)
   - `rating` (INTEGER 1-10)
   - `comment` (TEXT)
   - `created_at` (TIMESTAMP)
   - UNIQUE(joke_id, agent_id)

3. **`agent_memories`**
   - `id` (SERIAL PRIMARY KEY)
   - `agent_id` (VARCHAR)
   - `joke_id` (INTEGER REFERENCES jokes)
   - `rating` (INTEGER 1-10)
   - `personal_notes` (TEXT)
   - `comedic_style_tags` (TEXT[])
   - `created_at` (TIMESTAMP)
   - `updated_at` (TIMESTAMP)
   - UNIQUE(agent_id, joke_id)

4. **`users`** (test data)
5. **`products`** (test data)

---

## 🔄 Data Flow

### MCP Tool Call Flow

```
Client (MCP Inspector/Claude Desktop)
  ↓
OAuth Authentication (/authorize → GitHub → /callback)
  ↓
Access Token Obtained
  ↓
POST /mcp with token
  ↓
MyMCP.serve() → Durable Object
  ↓
Tool Registration (registerAllTools)
  ↓
Tool Execution (server.tool handler)
  ↓
Database Query (via withDatabase)
  ↓
Response → Client
```

### Agent Flow

```
Agent Initialization
  ↓
Direct DB Connection (AgentDatabaseClient)
  ↓
Read Jokes from DB
  ↓
LLM Evaluation (rate joke)
  ↓
Store Rating & Memory
  ↓
Generate New Joke
  ↓
Store in DB
  ↓
Next Iteration
```

---

## 🔐 Security Architecture

### Authentication
- **OAuth 2.0** flow via GitHub
- **Token-based** authentication for MCP endpoints
- **Cookie-based** approval for client registration

### Authorization
- **GitHub username** based permissions
- **ALLOWED_USERNAMES** set for write operations
- **Read-only** tools available to all authenticated users

### Database Security
- **SQL injection** protection via validation
- **Query type** detection (read vs write)
- **Connection pooling** limits
- **Error sanitization** (hides sensitive details)

---

## 📦 Dependencies

### Core
- `@modelcontextprotocol/sdk` - MCP protocol
- `agents/mcp` - Cloudflare Workers MCP agent
- `@cloudflare/workers-oauth-provider` - OAuth 2.0 server
- `hono` - Web framework
- `postgres` - PostgreSQL client
- `zod` - Schema validation

### LLM Providers
- `openai` - OpenAI API
- `@anthropic-ai/sdk` - Anthropic API
- `agents` - Agent framework

### Development
- `wrangler` - Cloudflare Workers CLI
- `vitest` - Testing framework
- `typescript` - TypeScript compiler

---

## 🚀 Deployment Architecture

### Development
- **MCP Server**: `wrangler dev` → `localhost:8792`
- **Database**: Docker PostgreSQL → `localhost:5432`
- **Agents**: Node.js processes → Direct DB access

### Production
- **MCP Server**: Cloudflare Workers (global edge)
- **Database**: Managed PostgreSQL (Supabase/Neon)
- **Agents**: Node.js processes (can run anywhere)

---

## 🔄 Communication Patterns

### MCP Server ↔ Client
- **Protocol**: MCP (Model Context Protocol)
- **Transport**: Streamable HTTP or SSE
- **Authentication**: OAuth 2.0 tokens

### Agents ↔ Database
- **Direct connection**: Bypasses MCP for efficiency
- **Connection pooling**: Shared pool per agent
- **No authentication**: Agents run server-side

### Agents ↔ Agents
- **Indirect**: Via shared database
- **No direct communication**: Database acts as message bus

---

## 📊 Key Design Patterns

1. **Modular Tool Registration**: Tools organized by domain
2. **Permission-Based Access**: Tools available based on user permissions
3. **Connection Pooling**: Efficient database connection management
4. **Error Handling**: Standardized error responses
5. **Type Safety**: Full TypeScript with Zod validation
6. **Separation of Concerns**: Clear boundaries between layers

---

## 🎯 Current Application Purpose

**Comedy Protocol** - A multi-agent system where 3 AI agents:
- Tell and rate jokes
- Develop comedic preferences
- Store personal memories
- Generate new content

**MCP Server** provides:
- Human access via OAuth
- Database query tools
- Joke management tools
- Translation capabilities

**Agents** operate:
- Independently via direct DB access
- With LLM-based decision making
- With persistent memory

