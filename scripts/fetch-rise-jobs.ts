#!/usr/bin/env node
/**
 * Fetch Real Jobs from Rise API
 * 
 * This script fetches real job listings from the Rise API (https://api.joinrise.io)
 * and inserts them into the job_listings table in the database.
 * 
 * Usage:
 *   tsx scripts/fetch-rise-jobs.ts
 *   or
 *   npm run fetch-jobs
 */

import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load .dev.vars file
function loadDevVars(): Record<string, string> {
  try {
    const devVarsPath = join(process.cwd(), '.dev.vars');
    const content = readFileSync(devVarsPath, 'utf-8');
    const vars: Record<string, string> = {};
    
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').trim();
        if (key && value) {
          vars[key] = value;
        }
      }
    }
    return vars;
  } catch (error) {
    console.error('Could not load .dev.vars:', error);
    return {};
  }
}

const env = loadDevVars();
const DATABASE_URL = env.DATABASE_URL || process.env.DATABASE_URL;

interface RiseJob {
  _id: string;
  title: string;
  owner: {
    companyName: string;
    locationAddress?: string;
  };
  locationAddress?: string;
  descriptionBreakdown?: {
    salaryRangeMinYearly?: number;
    salaryRangeMaxYearly?: number;
    skillRequirements?: string[];
    employmentType?: string;
    workModel?: string;
    oneSentenceJobSummary?: string;
  };
  skills_suggest?: string[];
  department?: string;
  seniority?: string;
  type?: string;
  url?: string;
  createdAt?: string;
}

interface RiseAPIResponse {
  success: boolean;
  result: {
    count: number;
    jobs: RiseJob[];
  };
}

async function fetchJobsFromRise(page: number = 1, limit: number = 50): Promise<RiseJob[]> {
  const url = `https://api.joinrise.io/api/v1/jobs/public?page=${page}&limit=${limit}&sort=desc&sortedBy=createdAt&jobLoc=`;
  
  console.log(`📡 Fetching jobs from Rise API (page ${page}, limit ${limit})...`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data: RiseAPIResponse = await response.json();
    
    if (!data.success) {
      throw new Error('API returned success: false');
    }
    
    console.log(`✅ Fetched ${data.result.jobs.length} jobs (total available: ${data.result.count})`);
    return data.result.jobs;
  } catch (error) {
    console.error('❌ Error fetching from Rise API:', error);
    throw error;
  }
}

function mapRiseJobToDatabase(job: RiseJob): {
  title: string;
  company: string;
  location: string;
  salary_min: number | null;
  salary_max: number | null;
  job_type: string | null;
  experience_level: string | null;
  required_skills: string[];
  preferred_skills: string[];
  description: string;
  application_url: string | null;
  posted_date: Date;
} {
  // Map experience level
  const experienceLevelMap: Record<string, string> = {
    'Entry Level': 'entry',
    'Mid-Level': 'mid',
    'Senior Level': 'senior',
    'Executive': 'executive',
  };
  
  // Map work model to job type
  const workModelMap: Record<string, string> = {
    'Remote': 'full-time',
    'Hybrid': 'full-time',
    'Onsite': 'full-time',
  };
  
  const experienceLevel = job.seniority 
    ? experienceLevelMap[job.seniority] || 'mid'
    : 'mid';
  
  const jobType = job.type || job.descriptionBreakdown?.workModel
    ? workModelMap[job.type || job.descriptionBreakdown?.workModel || ''] || 'full-time'
    : 'full-time';
  
  const location = job.locationAddress || job.owner.locationAddress || 'Remote';
  
  const salaryMin = job.descriptionBreakdown?.salaryRangeMinYearly || null;
  const salaryMax = job.descriptionBreakdown?.salaryRangeMaxYearly || null;
  
  const requiredSkills = job.descriptionBreakdown?.skillRequirements || job.skills_suggest || [];
  const preferredSkills: string[] = []; // Rise API doesn't separate required/preferred
  
  const description = job.descriptionBreakdown?.oneSentenceJobSummary || 
    `Join ${job.owner.companyName} as a ${job.title}. ${job.department ? `Department: ${job.department}` : ''}`;
  
  const postedDate = job.createdAt ? new Date(job.createdAt) : new Date();
  
  return {
    title: job.title,
    company: job.owner.companyName,
    location,
    salary_min: salaryMin,
    salary_max: salaryMax,
    job_type: jobType,
    experience_level: experienceLevel,
    required_skills: requiredSkills,
    preferred_skills: preferredSkills,
    description,
    application_url: job.url || null,
    posted_date: postedDate,
  };
}

async function insertJobsIntoDatabase(db: postgres.Sql, jobs: ReturnType<typeof mapRiseJobToDatabase>[]): Promise<void> {
  console.log(`💾 Inserting ${jobs.length} jobs into database...`);
  
  let inserted = 0;
  let skipped = 0;
  
  for (const job of jobs) {
    try {
      // Check if job already exists (by title + company)
      const existing = await db`
        SELECT id FROM job_listings 
        WHERE title = ${job.title} AND company = ${job.company}
        LIMIT 1
      `;
      
      if (existing.length > 0) {
        skipped++;
        continue;
      }
      
      await db`
        INSERT INTO job_listings (
          title, company, location, salary_min, salary_max,
          job_type, experience_level, required_skills, preferred_skills,
          description, application_url, posted_date, is_active
        ) VALUES (
          ${job.title},
          ${job.company},
          ${job.location},
          ${job.salary_min},
          ${job.salary_max},
          ${job.job_type},
          ${job.experience_level},
          ${job.required_skills},
          ${job.preferred_skills},
          ${job.description},
          ${job.application_url},
          ${job.posted_date},
          true
        )
      `;
      
      inserted++;
    } catch (error) {
      console.error(`❌ Error inserting job "${job.title}" at ${job.company}:`, error);
    }
  }
  
  console.log(`✅ Inserted ${inserted} new jobs, skipped ${skipped} duplicates`);
}

async function main() {
  if (!DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable is required');
    process.exit(1);
  }
  
  console.log('🚀 Rise Job Fetcher');
  console.log('=' .repeat(60));
  
  const db = postgres(DATABASE_URL, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  
  try {
    // Fetch jobs from Rise API
    const riseJobs = await fetchJobsFromRise(1, 50); // Fetch first 50 jobs
    
    if (riseJobs.length === 0) {
      console.log('⚠️  No jobs fetched from API');
      return;
    }
    
    // Transform jobs to database format
    console.log(`🔄 Transforming ${riseJobs.length} jobs...`);
    const dbJobs = riseJobs.map(mapRiseJobToDatabase);
    
    // Insert into database
    await insertJobsIntoDatabase(db, dbJobs);
    
    // Show summary
    const totalJobs = await db`SELECT COUNT(*) as count FROM job_listings WHERE is_active = true`;
    console.log(`\n📊 Total active jobs in database: ${totalJobs[0].count}`);
    
    console.log('\n✅ Job fetching complete!');
    console.log('\n💡 Next steps:');
    console.log('   1. Run agents to score these jobs: npm run agents:job');
    console.log('   2. Check recommendations: docker exec mcp-cole-pg-test psql -U mcp_user -d mcp_database -c "SELECT * FROM job_recommendations ORDER BY match_score DESC LIMIT 5;"');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

main();

