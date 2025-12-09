-- Create draft applications from top job recommendations
-- This converts the top-scored recommendations into draft applications for CV generation

-- Insert draft applications for recommendations with score >= 80
INSERT INTO applications (user_id, job_id, status, notes, applied_at)
SELECT 
    jr.user_id,
    jr.job_id,
    'draft' as status,
    CONCAT('Auto-created from recommendation (score: ', jr.match_score, '). ', jr.reasoning) as notes,
    NOW() as applied_at
FROM job_recommendations jr
LEFT JOIN applications a ON a.user_id = jr.user_id AND a.job_id = jr.job_id
WHERE jr.match_score >= 80
  AND a.id IS NULL  -- Don't create duplicates
ORDER BY jr.match_score DESC, jr.created_at DESC
LIMIT 5;  -- Create draft applications for top 5 recommendations

-- Show what was created
SELECT 
    a.id as application_id,
    a.status,
    j.title as job_title,
    j.company,
    jr.match_score,
    a.applied_at
FROM applications a
JOIN jobs j ON j.id = a.job_id
JOIN job_recommendations jr ON jr.job_id = a.job_id AND jr.user_id = a.user_id
WHERE a.status = 'draft'
ORDER BY a.applied_at DESC;
