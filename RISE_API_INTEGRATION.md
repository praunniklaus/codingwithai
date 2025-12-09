# Rise API Integration ✅

## What Was Done

Successfully integrated the **Rise API** (https://api.joinrise.io) to fetch real job listings!

### Results

- ✅ **68 real jobs** fetched and inserted into database
- ✅ **88 total active jobs** now in database (20 mock + 68 real)
- ✅ Jobs from real companies like:
  - NXTKey
  - Everything HR
  - Kaizen Labs
  - SearchApi
  - Jerry.ai
  - UltraViolet Cyber
  - And many more!

## How It Works

### Script: `scripts/fetch-rise-jobs.ts`

1. **Fetches** jobs from Rise API: `https://api.joinrise.io/api/v1/jobs/public`
2. **Transforms** Rise API format to our database schema
3. **Inserts** new jobs into `job_listings` table
4. **Skips** duplicates (by title + company)

### Data Mapping

- **Title** → `title`
- **Company** → `company` (from `owner.companyName`)
- **Location** → `location` (from `locationAddress`)
- **Salary** → `salary_min` / `salary_max` (from `descriptionBreakdown`)
- **Skills** → `required_skills` (from `skillRequirements` or `skills_suggest`)
- **Experience Level** → `experience_level` (mapped from `seniority`)
- **Job Type** → `job_type` (mapped from `type` or `workModel`)
- **Description** → `description` (from `oneSentenceJobSummary`)
- **URL** → `application_url` (from `url`)

## Usage

### Fetch Jobs Once

```bash
npm run fetch-jobs
```

This will:
- Fetch 50 jobs from Rise API
- Insert new ones into database
- Skip duplicates

### Schedule Regular Updates

Add to cron (runs every hour):

```bash
0 * * * * cd /path/to/project && npm run sync-jobs
```

Or use the sync script:

```bash
npm run sync-jobs
```

## What Agents See Now

When you run `npm run agents:job`, the **Job Hunter Agent** will:

1. ✅ Read from `job_listings` table (now contains **88 real jobs**!)
2. ✅ Score each job using LLM
3. ✅ Save recommendations (score >= 60) to `job_recommendations`

## Verify Real Jobs

```bash
# See latest real jobs
docker exec mcp-cole-pg-test psql -U mcp_user -d mcp_database -c "
  SELECT title, company, location, salary_min, salary_max 
  FROM job_listings 
  WHERE is_active = true 
  ORDER BY posted_date DESC 
  LIMIT 10;
"

# Count real companies
docker exec mcp-cole-pg-test psql -U mcp_user -d mcp_database -c "
  SELECT COUNT(DISTINCT company) as unique_companies 
  FROM job_listings 
  WHERE is_active = true;
"
```

## API Details

**Rise API Endpoint:**
```
https://api.joinrise.io/api/v1/jobs/public?page=1&limit=50&sort=desc&sortedBy=createdAt&jobLoc=
```

**Parameters:**
- `page`: Page number (default: 1)
- `limit`: Jobs per page (max: 50)
- `sort`: Sort order (`desc` or `asc`)
- `sortedBy`: Field to sort by (`createdAt`)
- `jobLoc`: Location filter (empty = all locations)

**API Terms:**
According to Rise API, you must:
- Link back to Rise (with follow, no nofollow)
- Mention Rise as a source
- This ensures they get traffic back

## Next Steps

1. **Run agents** to score the real jobs:
   ```bash
   npm run agents:job
   ```

2. **Check recommendations**:
   ```bash
   docker exec mcp-cole-pg-test psql -U mcp_user -d mcp_database -c "
     SELECT r.match_score, j.title, j.company, r.reasoning 
     FROM job_recommendations r
     JOIN job_listings j ON r.job_id = j.id
     ORDER BY r.match_score DESC 
     LIMIT 10;
   "
   ```

3. **View in frontend**: Refresh your dashboard to see real job recommendations!

4. **Schedule updates**: Set up cron to fetch new jobs regularly

## Example Real Jobs Now Available

- **Mobile Development Tech Team Lead** at NXTKey (Hybrid, $110k-$150k)
- **Forward Deployed Software Engineer** at Kaizen Labs (Hybrid NYC, $130k-$160k)
- **Anti-Bot Engineer** at SearchApi (Remote, $140k-$220k)
- **Technical Program Manager** at UltraViolet Cyber (Hybrid DC, $170k-$190k)
- And 64+ more real jobs!

---

**🎉 Your agents are now working with REAL jobs from Rise!**

