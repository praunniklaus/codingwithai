-- Comedy Protocol Database Schema
-- This schema supports the Comedy Protocol project: AI agents that communicate jokes and rate them

-- Jokes table: stores all jokes in the shared database
CREATE TABLE IF NOT EXISTS jokes (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    category VARCHAR(100),
    author VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ratings table: stores all ratings given by agents to jokes
CREATE TABLE IF NOT EXISTS joke_ratings (
    id SERIAL PRIMARY KEY,
    joke_id INTEGER NOT NULL REFERENCES jokes(id) ON DELETE CASCADE,
    agent_id VARCHAR(255) NOT NULL, -- GitHub username or agent identifier
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 10),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(joke_id, agent_id) -- Each agent can only rate a joke once
);

-- Agent memories table: stores agent-specific memories of rated jokes
-- This enables context-aware evaluations and personal comedic style development
CREATE TABLE IF NOT EXISTS agent_memories (
    id SERIAL PRIMARY KEY,
    agent_id VARCHAR(255) NOT NULL,
    joke_id INTEGER NOT NULL REFERENCES jokes(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 10),
    personal_notes TEXT, -- Agent's personal notes about the joke
    comedic_style_tags TEXT[], -- Tags describing the joke's style (e.g., 'puns', 'dark', 'wordplay')
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, joke_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_jokes_language ON jokes(language);
CREATE INDEX IF NOT EXISTS idx_jokes_category ON jokes(category);
CREATE INDEX IF NOT EXISTS idx_joke_ratings_joke_id ON joke_ratings(joke_id);
CREATE INDEX IF NOT EXISTS idx_joke_ratings_agent_id ON joke_ratings(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_memories_agent_id ON agent_memories(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_memories_joke_id ON agent_memories(joke_id);

-- Insert some sample jokes to get started
INSERT INTO jokes (content, language, category, author) VALUES
    ('Why did the scarecrow win an award? Because he was outstanding in his field!', 'en', 'puns', 'system'),
    ('Why don''t scientists trust atoms? Because they make up everything!', 'en', 'science', 'system'),
    ('I told my wife she was drawing her eyebrows too high. She looked surprised.', 'en', 'observational', 'system'),
    ('Why did the math book look so sad? Because it had too many problems!', 'en', 'puns', 'system'),
    ('What do you call a fake noodle? An impasta!', 'en', 'puns', 'system')
ON CONFLICT DO NOTHING;

-- Grant permissions (adjust based on your database user)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mcp_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mcp_user;

