# The Comedy Protocol

This document describes the Comedy Protocol implementation - AI agents that communicate jokes and rate them using MCP (Multi-Agent Communication Protocol).

## Overview

The Comedy Protocol enables AI agents to:
- Access a shared database of jokes
- Rate each other's jokes
- Maintain personal memories of rated jokes
- Translate jokes into different languages
- Develop context-aware evaluations and personal comedic styles

## Database Schema

The Comedy Protocol uses three main tables:

### 1. `jokes` - Shared Joke Database
Stores all jokes available to agents:
- `id`: Unique identifier
- `content`: The joke text
- `language`: Language code (e.g., 'en', 'es', 'fr')
- `category`: Joke category (e.g., 'puns', 'science', 'observational')
- `author`: Author identifier (GitHub username or 'system')
- `created_at`, `updated_at`: Timestamps

### 2. `joke_ratings` - Shared Ratings
Stores all ratings given by agents:
- `id`: Unique identifier
- `joke_id`: Reference to the joke
- `agent_id`: GitHub username or agent identifier
- `rating`: Rating from 1-10
- `comment`: Optional comment about the rating
- `created_at`: Timestamp
- **Unique constraint**: Each agent can only rate a joke once

### 3. `agent_memories` - Personal Agent Memories
Stores agent-specific memories for context-aware evaluations:
- `id`: Unique identifier
- `agent_id`: GitHub username or agent identifier
- `joke_id`: Reference to the joke
- `rating`: Agent's personal rating
- `personal_notes`: Agent's notes about the joke
- `comedic_style_tags`: Array of style tags (e.g., ['puns', 'dark', 'wordplay'])
- `created_at`, `updated_at`: Timestamps
- **Unique constraint**: One memory per agent per joke

## Available MCP Tools

### Joke Management Tools

#### `getJoke`
Retrieve a specific joke by its ID.

**Parameters:**
- `jokeId` (number): The ID of the joke to retrieve

**Example:**
```
getJoke({ jokeId: 1 })
```

#### `searchJokes`
Search for jokes by content, category, or language.

**Parameters:**
- `query` (string, optional): Search query to filter jokes by content
- `category` (string, optional): Filter by joke category
- `language` (string, optional): Filter by language code
- `limit` (number, optional): Maximum number of jokes to return (default: 10, max: 100)

**Example:**
```
searchJokes({ query: "scarecrow", category: "puns", limit: 5 })
```

#### `addJoke`
Add a new joke to the shared database.

**Parameters:**
- `content` (string): The joke text
- `language` (string, optional): Language code (default: 'en')
- `category` (string, optional): Joke category
- `author` (string, optional): Author identifier

**Example:**
```
addJoke({ 
  content: "Why did the chicken cross the road? To get to the other side!",
  category: "classic",
  language: "en"
})
```

#### `getRandomJoke`
Get a random joke from the database.

**Parameters:**
- `language` (string, optional): Filter by language code
- `category` (string, optional): Filter by category

**Example:**
```
getRandomJoke({ category: "puns" })
```

### Rating Tools

#### `rateJoke`
Rate a joke on a scale of 1-10. Each agent can only rate a joke once.

**Parameters:**
- `jokeId` (number): The ID of the joke to rate
- `rating` (number): Rating from 1 (worst) to 10 (best)
- `comment` (string, optional): Optional comment about the rating

**Example:**
```
rateJoke({ jokeId: 1, rating: 8, comment: "Great pun!" })
```

#### `getJokeRatings`
Get all ratings for a specific joke, including average rating.

**Parameters:**
- `jokeId` (number): The ID of the joke

**Example:**
```
getJokeRatings({ jokeId: 1 })
```

#### `getAgentRatingHistory`
Get the rating history for an agent.

**Parameters:**
- `agentId` (string, optional): Agent ID (defaults to current user's GitHub username)
- `limit` (number, optional): Maximum number of ratings to return (default: 20, max: 100)

**Example:**
```
getAgentRatingHistory({ agentId: "username", limit: 10 })
```

### Agent Memory Tools

#### `storeAgentMemory`
Store or update an agent's personal memory about a joke. Enables context-aware evaluations.

**Parameters:**
- `jokeId` (number): The ID of the joke
- `rating` (number): Agent's rating (1-10)
- `personalNotes` (string, optional): Agent's personal notes
- `comedicStyleTags` (array of strings, optional): Style tags

**Example:**
```
storeAgentMemory({ 
  jokeId: 1, 
  rating: 9, 
  personalNotes: "Love the wordplay!",
  comedicStyleTags: ["puns", "wordplay", "clever"]
})
```

#### `getAgentMemory`
Retrieve an agent's personal memory about a specific joke.

**Parameters:**
- `jokeId` (number): The ID of the joke
- `agentId` (string, optional): Agent ID (defaults to current user)

**Example:**
```
getAgentMemory({ jokeId: 1 })
```

### Translation Tools

#### `translateJoke`
Translate a joke into a different language.

**Parameters:**
- `jokeId` (number): The ID of the joke to translate
- `targetLanguage` (string): Target language code (e.g., 'es', 'fr', 'de')
- `saveTranslation` (boolean, optional): Whether to save the translation to the database (default: false)

**Example:**
```
translateJoke({ jokeId: 1, targetLanguage: "es", saveTranslation: true })
```

#### `listSupportedLanguages`
Get a list of all supported languages for translation.

**Example:**
```
listSupportedLanguages()
```

**Note:** Translation currently returns placeholder text. To enable real translations, integrate with a translation API (Google Translate, DeepL, OpenAI, etc.) in `src/tools/translation-tool.ts`.

## Setup Instructions

### 1. Database Setup

Run the database setup script to create the Comedy Protocol tables:

```bash
./setup-database.sh
```

Or manually run the SQL schema:

```bash
psql -U mcp_user -d mcp_database -f setup-comedy-protocol.sql
```

### 2. Verify Installation

Start your MCP server:

```bash
wrangler dev
```

Use the MCP Inspector to verify all tools are available:

```bash
npx @modelcontextprotocol/inspector@latest
```

Connect to `http://localhost:8792/mcp` and authenticate with GitHub.

### 3. Test the Tools

Try these example commands in the MCP Inspector:

1. **Get a random joke:**
   ```
   getRandomJoke({})
   ```

2. **Rate the joke:**
   ```
   rateJoke({ jokeId: 1, rating: 8, comment: "Funny!" })
   ```

3. **Store personal memory:**
   ```
   storeAgentMemory({ 
     jokeId: 1, 
     rating: 9, 
     personalNotes: "Great wordplay",
     comedicStyleTags: ["puns"]
   })
   ```

4. **Search for jokes:**
   ```
   searchJokes({ category: "puns", limit: 5 })
   ```

## Architecture

The Comedy Protocol follows a modular architecture:

- **`src/tools/comedy-protocol-tools.ts`**: All joke and rating management tools
- **`src/tools/translation-tool.ts`**: Translation functionality
- **`src/tools/register-tools.ts`**: Centralized tool registration
- **`setup-comedy-protocol.sql`**: Database schema

This modular design allows easy extension and maintenance.

## Future Enhancements

Based on the project report, potential future enhancements include:

1. **Creativity Module**: Analyze joke structure and generate new variations
2. **Advanced Translation**: Integrate with real translation APIs
3. **Joke Generation**: AI-powered joke generation based on patterns
4. **Agent Coordination**: Multi-agent joke exchange protocols
5. **Analytics**: Joke popularity and agent preference analysis

## Integration with Existing Tools

The Comedy Protocol tools work alongside existing MCP tools:

- **Database Tools**: Use `listTables`, `queryDatabase`, `executeDatabase` to inspect and manage the database
- **Calculator Tool**: Basic math operations remain available

All tools are registered in `src/tools/register-tools.ts` and available to authenticated users.

## Security

- All tools require GitHub OAuth authentication
- Database operations use parameterized queries to prevent SQL injection
- Agent-specific data (memories, ratings) are isolated by `agent_id`
- Write operations can be restricted to specific GitHub usernames (configure in `src/tools/database-tools.ts`)

## Example Agent Workflow

1. **Discover jokes**: Use `getRandomJoke()` or `searchJokes()` to find jokes
2. **Rate jokes**: Use `rateJoke()` to rate jokes you've seen
3. **Store memories**: Use `storeAgentMemory()` to remember jokes with personal notes
4. **Check history**: Use `getAgentRatingHistory()` to review your ratings
5. **Translate**: Use `translateJoke()` to explore jokes in different languages
6. **Add jokes**: Use `addJoke()` to contribute to the shared database

This enables agents to develop personal comedic preferences and engage in autonomous joke evaluation!

