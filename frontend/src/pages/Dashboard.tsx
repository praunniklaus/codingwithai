import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { JobCard } from '../components/dashboard/JobCard';
import { ApplicationsList } from '../components/dashboard/ApplicationsList';
import { InsightsPanel } from '../components/dashboard/InsightsPanel';
import { JobDetailModal } from '../components/jobs/JobDetailModal';
import { CVPreview } from '../components/cv/CVPreview';
import { Header } from '../components/shared/Header';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { createApplication, getRecommendations, getAgentInsights } from '../services/api';
import toast from 'react-hot-toast';
import type { JobRecommendation } from '../store/useStore';

export const Dashboard = () => {
  const { userProfile, recommendations, applications, insights, loading, setRecommendations, setInsights, setLoading, setUserProfile } = useStore();
  const [selectedJob, setSelectedJob] = useState<JobRecommendation | null>(null);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [isCVModalOpen, setIsCVModalOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      console.log('[Dashboard] userProfile:', userProfile);
      console.log('[Dashboard] userProfile.userId:', userProfile?.userId);
      
      if (!userProfile?.userId) {
        console.warn('[Dashboard] No userId found, cannot load data');
        // Try to get userId from localStorage if not in store
        const storedProfile = localStorage.getItem('job-assistant-storage');
        if (storedProfile) {
          try {
            const parsed = JSON.parse(storedProfile);
            console.log('[Dashboard] Found stored profile:', parsed);
            if (parsed.state?.userProfile?.userId) {
              // Update store with userId from localStorage
              setUserProfile({ ...userProfile, userId: parsed.state.userProfile.userId });
              return; // Will trigger re-render and retry
            }
          } catch (e) {
            console.error('[Dashboard] Failed to parse stored profile:', e);
          }
        }
        return;
      }
      
      setLoading(true);
      try {
        // Fetch recommendations from API
        const recommendationsData = await getRecommendations({
          user_id: userProfile.userId,
          limit: 10,
          min_score: 60,
        });

        // Transform API response to match our type
        // The API returns data in MCP format, we need to parse it
        console.log('[Dashboard] Recommendations data:', recommendationsData);
        
        if (recommendationsData && Array.isArray(recommendationsData)) {
          const transformed = recommendationsData.map((rec: any) => ({
            id: rec.id,
            job_id: rec.job_id,
            title: rec.title || 'Unknown',
            company: rec.company || rec.company_name || 'Unknown',
            location: rec.location || 'Unknown',
            salary_min: rec.salary_min,
            salary_max: rec.salary_max,
            match_score: rec.match_score || 0,
            reasoning: rec.reasoning || 'No reasoning provided',
          }));
          console.log('[Dashboard] Transformed recommendations:', transformed);
          setRecommendations(transformed);
        } else {
          console.warn('[Dashboard] Recommendations data is not an array:', recommendationsData);
          // Fallback to empty array if no data
          setRecommendations([]);
        }

        // Fetch insights
        const insightsData = await getAgentInsights({
          user_id: userProfile.userId,
          limit: 5,
        });

        console.log('[Dashboard] Insights data:', insightsData);

        if (insightsData && Array.isArray(insightsData)) {
          setInsights(insightsData.map((insight: any) => ({
            id: insight.id,
            agent_id: insight.agent_id,
            insight_type: insight.insight_type,
            description: insight.description,
            metadata: insight.metadata,
            created_at: insight.created_at,
          })));
        } else {
          console.warn('[Dashboard] Insights data is not an array:', insightsData);
          setInsights([]);
        }

        // Applications are loaded separately (or from Applications page)
        // Keep existing applications in store
      } catch (error) {
        console.error('Failed to load dashboard data', error);
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'Failed to load job recommendations';
        toast.error(errorMessage);
        // Use empty arrays on error
        setRecommendations([]);
        setInsights([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userProfile, setRecommendations, setInsights, setLoading, setUserProfile]);

  // Show loading or error state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Show error if no user profile
  if (!userProfile?.userId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-yellow-800 mb-2">Profile Not Found</h2>
            <p className="text-yellow-700">
              Unable to load your profile. Please complete the onboarding process.
            </p>
            <button
              onClick={() => window.location.href = '/onboarding?reset=true'}
              className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            >
              Start Onboarding
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleJobClick = (job: JobRecommendation) => {
    setSelectedJob(job);
    setIsJobModalOpen(true);
  };

  const handleApply = async (jobId: number) => {
    if (!userProfile?.userId) return;
    
    try {
      toast.loading('Creating application...', { id: 'create-app' });
      
      // Create application
      await createApplication({
        user_id: userProfile.userId,
        job_id: jobId,
      });
      
      toast.success('Application created!', { id: 'create-app' });
      
      // Close job modal and open CV generation
      setIsJobModalOpen(false);
      setIsCVModalOpen(true);
    } catch (error) {
      console.error('Failed to create application', error);
      toast.error('Failed to create application', { id: 'create-app' });
    }
  };

  const handleCVApprove = async () => {
    // Mark application as ready to submit
    setIsCVModalOpen(false);
    // Refresh applications list
    // In production, would reload from API
  };

  // Debug info (remove in production)
  console.log('[Dashboard] Render - userProfile:', userProfile);
  console.log('[Dashboard] Render - recommendations:', recommendations);
  console.log('[Dashboard] Render - applications:', applications);
  console.log('[Dashboard] Render - insights:', insights);
  console.log('[Dashboard] Render - loading:', loading);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome back, {userProfile?.name || 'there'}! 👋
          </h1>
          <p className="text-gray-600">
            Here are your job matches and application updates
          </p>
          {/* Debug info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-4 bg-gray-100 rounded text-xs">
              <p>Debug: userId = {userProfile?.userId || 'MISSING'}</p>
              <p>Debug: recommendations count = {recommendations.length}</p>
              <p>Debug: applications count = {applications.length}</p>
              <p>Debug: insights count = {insights.length}</p>
            </div>
          )}
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Job Matches</h2>
              {recommendations.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                  <p>No job recommendations yet. Complete your profile to get personalized matches!</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {recommendations.map((job) => (
                    <JobCard 
                      key={job.id} 
                      job={job}
                      onClick={() => handleJobClick(job)}
                    />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Your Applications</h2>
              <ApplicationsList applications={applications} />
            </section>
          </div>

          <div>
            <InsightsPanel insights={insights} />
          </div>
        </div>
      </div>

      {/* Job Detail Modal */}
      <JobDetailModal
        job={selectedJob}
        isOpen={isJobModalOpen}
        onClose={() => setIsJobModalOpen(false)}
        onApply={handleApply}
      />

      {/* CV Preview Modal */}
      {selectedJob && (
        <CVPreview
          userId={userProfile?.userId || ''}
          jobId={selectedJob.job_id}
          jobTitle={selectedJob.title}
          company={selectedJob.company}
          isOpen={isCVModalOpen}
          onClose={() => setIsCVModalOpen(false)}
          onApprove={handleCVApprove}
        />
      )}
    </div>
  );
};

