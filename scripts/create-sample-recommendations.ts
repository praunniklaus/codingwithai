#!/usr/bin/env node
/**
 * Create Sample Recommendations
 * 
 * This script creates sample job recommendations for a user so jobs appear in the dashboard.
 * 
 * Usage:
 *   tsx scripts/create-sample-recommendations.ts <user_id>
 *   or
 *   npm run create-recommendations <user_id>
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

// Get user_id from command line args or use default
const userId = process.argv[2] || 'user_1765227401077';

async function main() {
  if (!DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable is required');
    process.exit(1);
  }
  
  console.log('🚀 Creating Sample Recommendations');
  console.log('='.repeat(60));
  console.log(`👤 User ID: ${userId}`);
  
  const db = postgres(DATABASE_URL, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  
  try {
    // Get 10 random active jobs
    const jobs = await db`
      SELECT id, title, company, location, required_skills
      FROM job_listings
      WHERE is_active = true
      ORDER BY RANDOM()
      LIMIT 10
    `;
    
    if (jobs.length === 0) {
      console.log('⚠️  No jobs found in database. Run "npm run fetch-jobs" first.');
      return;
    }
    
    console.log(`📋 Found ${jobs.length} jobs to recommend`);
    
    let created = 0;
    let skipped = 0;
    
    // Create recommendations with varying scores
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      // Assign scores: 65-95 (all above 60 threshold)
      const matchScore = 65 + Math.floor(Math.random() * 30);
      const reasoning = `Good match based on skills and location. ${job.required_skills ? `Requires: ${Array.isArray(job.required_skills) ? job.required_skills.slice(0, 3).join(', ') : 'various skills'}` : 'General fit for your profile'}.`;
      
      try {
        // Check if recommendation already exists
        const existing = await db`
          SELECT id FROM job_recommendations
          WHERE user_id = ${userId} AND job_id = ${job.id}
          LIMIT 1
        `;
        
        if (existing.length > 0) {
          skipped++;
          continue;
        }
        
        await db`
          INSERT INTO job_recommendations (user_id, job_id, match_score, reasoning, status)
          VALUES (${userId}, ${job.id}, ${matchScore}, ${reasoning}, 'pending')
        `;
        
        created++;
        console.log(`  ✅ Recommended: ${job.title} at ${job.company} (Score: ${matchScore})`);
      } catch (error) {
        console.error(`  ❌ Error creating recommendation for job ${job.id}:`, error);
      }
    }
    
    console.log(`\n✅ Created ${created} recommendations, skipped ${skipped} duplicates`);
    
    // Show summary
    const totalRecs = await db`
      SELECT COUNT(*) as count FROM job_recommendations WHERE user_id = ${userId}
    `;
    console.log(`📊 Total recommendations for user: ${totalRecs[0].count}`);
    
    console.log('\n💡 Refresh your dashboard to see the recommendations!');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

main();

