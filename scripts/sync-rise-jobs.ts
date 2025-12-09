#!/usr/bin/env node
/**
 * Sync Jobs from Rise API (Scheduled)
 * 
 * This script can be run periodically (e.g., every hour) to keep job listings updated.
 * It fetches new jobs from Rise API and adds them to the database.
 * 
 * Usage:
 *   tsx scripts/sync-rise-jobs.ts
 *   or schedule with cron: 0 * * * * cd /path/to/project && npm run sync-jobs
 */

import { execSync } from 'child_process';

console.log(`🔄 Syncing jobs from Rise API at ${new Date().toISOString()}`);

try {
  execSync('npm run fetch-jobs', { stdio: 'inherit' });
  console.log('✅ Sync complete');
} catch (error) {
  console.error('❌ Sync failed:', error);
  process.exit(1);
}

