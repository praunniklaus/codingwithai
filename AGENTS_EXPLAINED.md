# 🤖 What the Three Agents Do

Now that you have **88 real jobs** from the Rise API, here's exactly what each agent does:

---

## 🔍 Agent 1: Job Hunter (OpenAI GPT-4)

### What It Does:
1. **Reads your user profile** from the database (skills, experience, education, location preferences)
2. **Fetches all active jobs** from `job_listings` table (currently 88 real jobs from Rise API)
3. **Scores each job** using OpenAI GPT-4 (0-100 score) based on:
   - Skill match (required vs your skills)
   - Experience level match
   - Location compatibility
   - Salary expectations
   - Overall fit
4. **Saves recommendations** (score >= 60) to `job_recommendations` table with:
   - Match score (0-100)
   - Detailed reasoning (why it matches)
   - Strengths and weaknesses
5. **Generates market insights** about:
   - Top skills in demand
   - Most common locations
   - Experience level trends
   - Stores insights in `agent_insights` table

### When It Runs:
- Every 5 minutes (configurable)
- Or manually via `npm run agents:job`

### Example Output:
```
🔍 Job Hunter (openai) - Turn 1
  👤 Analyzing profile for: Samuel Student
  📋 Found 88 job listings
  🤔 Scoring: Mobile Development Tech Team Lead at NXTKey...
  ✅ Recommended (87/100): Mobile Development Tech Team Lead
     Reasoning: Strong match with your Python and TypeScript skills...
  📊 Market insights generated
  ✅ Turn complete! Scored 88 jobs, recommended 12
```

### What You See:
- **Dashboard**: Job cards with match scores (92%, 87%, etc.)
- **Database**: `job_recommendations` table with scored jobs
- **Insights Panel**: Market trends and skill demand analysis

---

## 📝 Agent 2: CV Crafter (Anthropic Claude)

### What It Does:
1. **Finds draft applications** (applications with status='draft')
2. **For each draft application**:
   - Gets your user profile (skills, experience, education)
   - Gets the job details (requirements, description)
   - **Generates a tailored CV** using Claude:
     - Highlights relevant skills
     - Tailors experience to job requirements
     - Formats professionally
   - **Generates a cover letter** using Claude:
     - Addresses specific job requirements
     - Shows enthusiasm for the role
     - Professional tone
   - **Analyzes skill gaps**:
     - Compares your skills vs job requirements
     - Identifies missing skills
     - Stores gap analysis in `agent_insights`
3. **Saves documents**:
   - CV → `generated_cvs` table
   - Cover letter → `cover_letters` table
4. **Updates application status** to 'ready_to_submit'

### When It Runs:
- Every iteration (whenever agents run)
- Only processes applications with status='draft'

### Example Output:
```
📝 CV Crafter (anthropic) - Turn 1
  📋 Found 2 draft application(s)
  🔨 Processing application #1 for: Software Engineer
  ✨ Generating tailored CV...
  ✅ CV generated (version 1)
  ✨ Generating cover letter...
  ✅ Cover letter generated (version 1)
  📊 Skill gap analysis completed
  ✅ Application status updated to 'ready_to_submit'
  ✅ Turn complete! Processed 2 application(s)
```

### What You See:
- **CV Preview Modal**: When you click "I'm Interested" on a job
- **Database**: `generated_cvs` and `cover_letters` tables
- **Applications**: Status changes from 'draft' → 'ready_to_submit'

---

## 📊 Agent 3: Application Tracker (Grok/xAI)

### What It Does:
1. **Monitors all applications** for a user
2. **Identifies stale applications**:
   - Finds applications with no updates for 7+ days
   - Excludes rejected/withdrawn applications
3. **Calculates success metrics**:
   - Total applications
   - Response rate (submitted vs total)
   - Interview rate
   - Success rate (offers / submitted)
   - Average days since application
4. **Uses LLM to analyze patterns**:
   - Identifies bottlenecks
   - Finds success patterns
   - Suggests improvements
   - Stores insights in `agent_insights` table
5. **Generates follow-up reminders**:
   - For stale applications (7+ days)
   - Creates reminders with days since update
   - Stores in `agent_insights` with type 'follow_up_reminder'

### When It Runs:
- Every iteration (whenever agents run)
- Analyzes all applications, not just new ones

### Example Output:
```
📊 Application Tracker (grok) - Turn 1
  📋 Found 5 total application(s)
  ⏰ Found 2 stale application(s)
  📈 Success rate: 20.00%
  📊 Status breakdown: { submitted: 3, interview: 1, offer: 0 }
  💡 Generated 3 insight(s)
  📧 Generated 2 follow-up reminder(s)
  ✅ Turn complete!
```

### What You See:
- **Insights Panel**: Reminders, patterns, suggestions
- **Database**: `agent_insights` table with analysis
- **Applications Page**: Status tracking and metrics

---

## 🔄 Complete Workflow

### Step-by-Step Flow:

1. **You complete onboarding** → User profile saved to database

2. **Agent 1 (Job Hunter) runs**:
   - Reads 88 real jobs from database
   - Scores each job (0-100) using LLM
   - Saves top matches (score >= 60) to recommendations
   - **Result**: You see job cards on dashboard with match scores

3. **You click "I'm Interested"** on a job:
   - Creates application with status='draft'
   - Application saved to `applications` table

4. **Agent 2 (CV Crafter) runs**:
   - Finds draft application
   - Generates tailored CV using Claude
   - Generates cover letter using Claude
   - Analyzes skill gaps
   - Updates status to 'ready_to_submit'
   - **Result**: CV and cover letter ready for review

5. **You submit application**:
   - Status changes to 'submitted'
   - Event logged in `application_events`

6. **Agent 3 (Application Tracker) runs**:
   - Monitors all applications
   - Identifies stale ones (7+ days)
   - Generates insights and reminders
   - **Result**: You get reminders and insights about your applications

---

## 📊 Database Tables Used

### Agent 1 (Job Hunter):
- **Reads**: `user_profiles`, `user_skills`, `user_experience`, `user_education`, `job_listings`
- **Writes**: `job_recommendations`, `agent_insights`

### Agent 2 (CV Crafter):
- **Reads**: `user_profiles`, `user_skills`, `user_experience`, `user_education`, `job_listings`, `applications`
- **Writes**: `generated_cvs`, `cover_letters`, `agent_insights`, `applications` (status update)

### Agent 3 (Application Tracker):
- **Reads**: `applications`, `application_events`
- **Writes**: `agent_insights`

---

## 🎯 Real-World Example

Let's say you're "Samuel Student" with Python, TypeScript, SQL skills:

1. **Agent 1** finds 88 jobs, scores them:
   - "Forward Deployed Software Engineer" at Kaizen Labs → **92% match**
   - "Mobile Development Tech Team Lead" at NXTKey → **75% match**
   - "Anti-Bot Engineer" at SearchApi → **45% match** (skipped, score < 60)

2. **You click "I'm Interested"** on Kaizen Labs job:
   - Application created (status='draft')

3. **Agent 2** generates:
   - Tailored CV highlighting your Python/TypeScript experience
   - Cover letter mentioning React/Next.js interest
   - Skill gap: "Missing React experience" (stored as insight)

4. **You submit application**:
   - Status → 'submitted'
   - Date logged

5. **Agent 3** (after 7 days):
   - Creates reminder: "Application to Kaizen Labs has been submitted for 7 days. Consider following up."

---

## 🚀 How to See Agents in Action

### Run Agents:
```bash
npm run agents:job
```

### Check What They Did:

```bash
# See job recommendations (Agent 1)
docker exec mcp-cole-pg-test psql -U mcp_user -d mcp_database -c "
  SELECT r.match_score, j.title, j.company, r.reasoning 
  FROM job_recommendations r
  JOIN job_listings j ON r.job_id = j.id
  ORDER BY r.match_score DESC LIMIT 5;
"

# See generated CVs (Agent 2)
docker exec mcp-cole-pg-test psql -U mcp_user -d mcp_database -c "
  SELECT job_id, version, created_at 
  FROM generated_cvs 
  ORDER BY created_at DESC LIMIT 5;
"

# See insights (Agent 3)
docker exec mcp-cole-pg-test psql -U mcp_user -d mcp_database -c "
  SELECT agent_id, insight_type, description 
  FROM agent_insights 
  ORDER BY created_at DESC LIMIT 5;
"
```

---

## 💡 Key Points

- **Agent 1**: Finds and scores jobs → **You see recommendations**
- **Agent 2**: Creates CVs/cover letters → **You get tailored documents**
- **Agent 3**: Tracks and analyzes → **You get insights and reminders**

All three agents work together to help you:
1. **Find** the right jobs
2. **Apply** with tailored documents
3. **Track** and improve your applications

---

**🎉 Your agents are now working with 88 real jobs from Rise API!**

