# Where Agents Get Jobs From

## Current Setup

**The agents are currently looking at the `job_listings` table in your PostgreSQL database.**

Right now, you have **20 sample/mock job listings** (TechCorp, DataCo, ProductInc, etc.) - these are **NOT real companies**. They're placeholder data for testing.

## How It Works

### Agent 1: Job Hunter
1. Reads from `job_listings` table: `SELECT * FROM job_listings WHERE is_active = true`
2. Scores each job (0-100) using LLM based on user profile
3. Saves recommendations (score >= 60) to `job_recommendations` table

### Current Job Sources
- **Database**: `job_listings` table (20 mock jobs)
- **Not connected to**: LinkedIn, Indeed, Glassdoor, or any real job APIs

## View Current Jobs

Check what jobs are in your database:

```bash
# See all jobs
docker exec mcp-cole-pg-test psql -U mcp_user -d mcp_database -c "SELECT id, title, company, location FROM job_listings WHERE is_active = true;"

# Count jobs
docker exec mcp-cole-pg-test psql -U mcp_user -d mcp_database -c "SELECT COUNT(*) FROM job_listings WHERE is_active = true;"
```

## Adding Real Jobs

### Option 1: Manual Entry via MCP Tools

Use the MCP server tools to add real jobs:

```bash
# Via MCP Inspector or API call
addJobListing({
  title: "Software Engineer",
  company: "Google",
  location: "Zurich",
  salary_min: 120000,
  salary_max: 180000,
  required_skills: ["Python", "TypeScript", "React"],
  description: "Real job description here..."
})
```

### Option 2: SQL Insert

Add jobs directly to database:

```sql
INSERT INTO job_listings (
  title, company, location, salary_min, salary_max,
  required_skills, description, posted_date
) VALUES (
  'Software Engineer',
  'Google',
  'Zurich',
  120000,
  180000,
  ARRAY['Python', 'TypeScript'],
  'Join Google Zurich...',
  CURRENT_DATE
);
```

### Option 3: Connect to Real Job APIs (Future)

To connect to real job sources, you would need to:

1. **Create a job scraper/fetcher service** that:
   - Connects to LinkedIn Jobs API
   - Or scrapes Indeed/Glassdoor
   - Or uses job board APIs
   - Saves jobs to `job_listings` table

2. **Example integration** (pseudo-code):
```typescript
// scripts/fetch-real-jobs.ts
async function fetchJobsFromLinkedIn() {
  const jobs = await linkedInAPI.search({
    location: 'Zurich',
    keywords: 'Software Engineer'
  });
  
  for (const job of jobs) {
    await db.insert('job_listings', {
      title: job.title,
      company: job.company,
      location: job.location,
      // ... etc
    });
  }
}
```

## Recommended Next Steps

1. **Add real jobs manually** using MCP tools or SQL
2. **Run agents** to see them score real jobs:
   ```bash
   npm run agents:job
   ```
3. **Check recommendations**:
   ```bash
   docker exec mcp-cole-pg-test psql -U mcp_user -d mcp_database -c "SELECT * FROM job_recommendations ORDER BY match_score DESC LIMIT 5;"
   ```

## Current Status

- ✅ **Database**: Connected and working
- ✅ **Agents**: Ready to score jobs
- ⚠️ **Job Source**: Currently using mock data
- 🔄 **Next**: Add real jobs or integrate job APIs

---

**To see what the agents are currently working with, check the database!**

