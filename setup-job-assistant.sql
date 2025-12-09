-- Job Application Assistant Database Schema
-- Migration from Comedy Protocol to Job Application Assistant

-- Drop old Comedy Protocol tables
DROP TABLE IF EXISTS agent_memories CASCADE;
DROP TABLE IF EXISTS joke_ratings CASCADE;
DROP TABLE IF EXISTS jokes CASCADE;

-- Keep users and products tables for now (can be removed if not needed)

-- ============================================
-- USER PROFILE TABLES
-- ============================================

-- Main user profile table
CREATE TABLE IF NOT EXISTS user_profiles (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    location VARCHAR(255),
    target_role VARCHAR(255),
    preferences JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User skills table
CREATE TABLE IF NOT EXISTS user_skills (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    skill_name VARCHAR(255) NOT NULL,
    proficiency VARCHAR(50) CHECK (proficiency IN ('beginner', 'intermediate', 'advanced', 'expert')),
    years_experience INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, skill_name)
);

-- User work experience table
CREATE TABLE IF NOT EXISTS user_experience (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    company VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT FALSE,
    achievements TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User education table
CREATE TABLE IF NOT EXISTS user_education (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    institution VARCHAR(255) NOT NULL,
    degree VARCHAR(255) NOT NULL,
    field_of_study VARCHAR(255),
    start_date DATE,
    end_date DATE,
    gpa DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- JOB LISTINGS TABLES
-- ============================================

-- Job listings table
CREATE TABLE IF NOT EXISTS job_listings (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    salary_min INTEGER,
    salary_max INTEGER,
    salary_currency VARCHAR(10) DEFAULT 'USD',
    job_type VARCHAR(50) CHECK (job_type IN ('full-time', 'part-time', 'contract', 'internship')),
    experience_level VARCHAR(50) CHECK (experience_level IN ('entry', 'mid', 'senior', 'executive')),
    required_skills TEXT[],
    preferred_skills TEXT[],
    description TEXT,
    posted_date DATE DEFAULT CURRENT_DATE,
    application_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job recommendations table (Agent 1 output)
CREATE TABLE IF NOT EXISTS job_recommendations (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    job_id INTEGER NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE,
    match_score INTEGER CHECK (match_score >= 0 AND match_score <= 100),
    reasoning TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'applied', 'dismissed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, job_id)
);

-- ============================================
-- APPLICATION TRACKING TABLES
-- ============================================

-- Applications table
CREATE TABLE IF NOT EXISTS applications (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    job_id INTEGER NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'ready_to_submit', 'submitted', 'under_review', 'interview', 'offer', 'rejected', 'withdrawn')),
    cv_id INTEGER,
    cover_letter_id INTEGER,
    applied_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Application events table (tracking history)
CREATE TABLE IF NOT EXISTS application_events (
    id SERIAL PRIMARY KEY,
    application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    notes TEXT,
    event_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- GENERATED DOCUMENTS TABLES
-- ============================================

-- Generated CVs table (Agent 2 output)
CREATE TABLE IF NOT EXISTS generated_cvs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    job_id INTEGER NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    format VARCHAR(50) DEFAULT 'markdown',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cover letters table (Agent 2 output)
CREATE TABLE IF NOT EXISTS cover_letters (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    job_id INTEGER NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    tone VARCHAR(50) DEFAULT 'professional',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- AGENT INSIGHTS TABLE
-- ============================================

-- Agent insights table (Agent 3 output)
CREATE TABLE IF NOT EXISTS agent_insights (
    id SERIAL PRIMARY KEY,
    agent_id VARCHAR(100) NOT NULL,
    user_id VARCHAR(255) NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    insight_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_experience_user_id ON user_experience(user_id);
CREATE INDEX IF NOT EXISTS idx_user_education_user_id ON user_education(user_id);
CREATE INDEX IF NOT EXISTS idx_job_listings_location ON job_listings(location);
CREATE INDEX IF NOT EXISTS idx_job_listings_title ON job_listings(title);
CREATE INDEX IF NOT EXISTS idx_job_listings_posted_date ON job_listings(posted_date);
CREATE INDEX IF NOT EXISTS idx_job_recommendations_user_id ON job_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_job_recommendations_match_score ON job_recommendations(match_score);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_application_events_application_id ON application_events(application_id);
CREATE INDEX IF NOT EXISTS idx_generated_cvs_user_id ON generated_cvs(user_id);
CREATE INDEX IF NOT EXISTS idx_cover_letters_user_id ON cover_letters(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_insights_user_id ON agent_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_insights_agent_id ON agent_insights(agent_id);

-- ============================================
-- SAMPLE DATA
-- ============================================

-- Sample user profile
INSERT INTO user_profiles (user_id, name, email, location, target_role) VALUES
('samuel_student', 'Samuel Student', 'samuel@example.com', 'St. Gallen', 'Software Engineer')
ON CONFLICT (user_id) DO NOTHING;

-- Sample skills
INSERT INTO user_skills (user_id, skill_name, proficiency, years_experience) VALUES
('samuel_student', 'Python', 'intermediate', 2),
('samuel_student', 'Java', 'beginner', 1),
('samuel_student', 'SQL', 'intermediate', 1),
('samuel_student', 'TypeScript', 'intermediate', 1),
('samuel_student', 'Economics', 'advanced', 3)
ON CONFLICT (user_id, skill_name) DO NOTHING;

-- Sample work experience
INSERT INTO user_experience (user_id, company, title, start_date, end_date, is_current, achievements) VALUES
('samuel_student', 'Tech Startup', 'Software Developer Intern', '2023-06-01', '2023-12-31', FALSE, ARRAY['Built REST API', 'Improved performance by 30%']),
('samuel_student', 'University Lab', 'Research Assistant', '2022-01-01', '2023-05-31', FALSE, ARRAY['Data analysis', 'Report writing'])
ON CONFLICT DO NOTHING;

-- Sample education
INSERT INTO user_education (user_id, institution, degree, field_of_study, start_date, end_date) VALUES
('samuel_student', 'University of St. Gallen', 'Bachelor', 'Economics', '2020-09-01', '2024-06-30')
ON CONFLICT DO NOTHING;

-- Sample job listings (20 jobs)
INSERT INTO job_listings (title, company, location, salary_min, salary_max, experience_level, required_skills, preferred_skills, description, posted_date) VALUES
('Software Engineer', 'TechCorp', 'Zurich', 80000, 120000, 'mid', ARRAY['Python', 'SQL', 'TypeScript'], ARRAY['React', 'AWS'], 'Full-stack development role', CURRENT_DATE - INTERVAL '5 days'),
('Data Analyst', 'DataCo', 'St. Gallen', 60000, 90000, 'entry', ARRAY['SQL', 'Python'], ARRAY['Tableau', 'R'], 'Analyze business data and create reports', CURRENT_DATE - INTERVAL '3 days'),
('Product Manager', 'ProductInc', 'Zurich', 90000, 130000, 'mid', ARRAY['SQL', 'Economics'], ARRAY['Agile', 'Product Strategy'], 'Lead product development', CURRENT_DATE - INTERVAL '7 days'),
('Backend Developer', 'CloudSystems', 'Bern', 85000, 115000, 'mid', ARRAY['Python', 'Java', 'SQL'], ARRAY['Docker', 'Kubernetes'], 'Build scalable backend systems', CURRENT_DATE - INTERVAL '2 days'),
('Frontend Developer', 'WebApps', 'Zurich', 70000, 100000, 'entry', ARRAY['TypeScript', 'React'], ARRAY['Next.js', 'Tailwind'], 'Create user interfaces', CURRENT_DATE - INTERVAL '4 days'),
('Full Stack Engineer', 'StartupXYZ', 'St. Gallen', 75000, 110000, 'mid', ARRAY['Python', 'TypeScript', 'SQL'], ARRAY['React', 'PostgreSQL'], 'End-to-end development', CURRENT_DATE - INTERVAL '6 days'),
('Junior Software Engineer', 'BigTech', 'Zurich', 70000, 95000, 'entry', ARRAY['Python', 'Java'], ARRAY['Algorithms', 'System Design'], 'Entry-level software development', CURRENT_DATE - INTERVAL '1 day'),
('Data Engineer', 'AnalyticsPro', 'Basel', 80000, 120000, 'mid', ARRAY['Python', 'SQL'], ARRAY['Spark', 'Airflow'], 'Build data pipelines', CURRENT_DATE - INTERVAL '8 days'),
('Software Developer', 'DevShop', 'Lausanne', 65000, 95000, 'entry', ARRAY['TypeScript', 'Python'], ARRAY['Node.js', 'MongoDB'], 'General software development', CURRENT_DATE - INTERVAL '9 days'),
('Python Developer', 'PythonCorp', 'Zurich', 75000, 105000, 'mid', ARRAY['Python'], ARRAY['Django', 'FastAPI'], 'Python-focused development', CURRENT_DATE - INTERVAL '10 days'),
('Business Analyst', 'ConsultingFirm', 'St. Gallen', 65000, 90000, 'entry', ARRAY['SQL', 'Economics'], ARRAY['Excel', 'Power BI'], 'Business analysis and reporting', CURRENT_DATE - INTERVAL '11 days'),
('Machine Learning Engineer', 'AITech', 'Zurich', 95000, 140000, 'senior', ARRAY['Python'], ARRAY['TensorFlow', 'PyTorch'], 'ML model development', CURRENT_DATE - INTERVAL '12 days'),
('DevOps Engineer', 'CloudOps', 'Bern', 85000, 125000, 'mid', ARRAY['Python'], ARRAY['Kubernetes', 'Terraform'], 'Infrastructure and automation', CURRENT_DATE - INTERVAL '13 days'),
('Software Architect', 'EnterpriseSoft', 'Zurich', 110000, 150000, 'senior', ARRAY['Python', 'Java', 'TypeScript'], ARRAY['System Design', 'Microservices'], 'Design software systems', CURRENT_DATE - INTERVAL '14 days'),
('API Developer', 'APIServices', 'St. Gallen', 70000, 100000, 'mid', ARRAY['Python', 'TypeScript'], ARRAY['REST', 'GraphQL'], 'API development', CURRENT_DATE - INTERVAL '15 days'),
('Database Developer', 'DataSystems', 'Zurich', 75000, 110000, 'mid', ARRAY['SQL'], ARRAY['PostgreSQL', 'MongoDB'], 'Database design and optimization', CURRENT_DATE - INTERVAL '16 days'),
('Software Consultant', 'TechConsult', 'Basel', 80000, 120000, 'mid', ARRAY['Python', 'TypeScript', 'SQL'], ARRAY['Agile', 'Scrum'], 'Client software solutions', CURRENT_DATE - INTERVAL '17 days'),
('Junior Data Scientist', 'DataScienceCo', 'Zurich', 70000, 100000, 'entry', ARRAY['Python', 'SQL'], ARRAY['Machine Learning', 'Statistics'], 'Data science and analytics', CURRENT_DATE - INTERVAL '18 days'),
('Backend API Developer', 'APIBuilders', 'St. Gallen', 75000, 105000, 'mid', ARRAY['Python', 'Java'], ARRAY['REST', 'gRPC'], 'Backend API development', CURRENT_DATE - INTERVAL '19 days'),
('Software Engineer - Python', 'PythonStartup', 'Zurich', 80000, 115000, 'mid', ARRAY['Python'], ARRAY['Django', 'Flask'], 'Python backend development', CURRENT_DATE - INTERVAL '20 days')
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mcp_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mcp_user;

