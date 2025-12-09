import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserProfile {
  userId?: string;
  name?: string;
  email?: string;
  currentSituation?: string;
  education?: {
    degree?: string;
    field?: string;
    university?: string;
  };
  skills?: Array<{
    name: string;
    proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  }>;
  workExperience?: Array<{
    company: string;
    title: string;
    description?: string;
  }>;
  locations?: string[];
  targetRoles?: string[];
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
  };
  dreamCompanies?: string[];
}

export interface JobRecommendation {
  id: number;
  job_id: number;
  title: string;
  company: string;
  location: string;
  salary_min?: number;
  salary_max?: number;
  match_score: number;
  reasoning: string;
}

export interface Application {
  id: number;
  job_id: number;
  job_title: string;
  job_company: string;
  status: 'draft' | 'ready_to_submit' | 'submitted' | 'under_review' | 'interview' | 'offer' | 'rejected' | 'withdrawn';
  applied_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Insight {
  id: number;
  agent_id: string;
  insight_type: string;
  description: string;
  metadata?: any;
  created_at: string;
}

interface AppState {
  // User data
  userProfile: UserProfile | null;
  onboardingComplete: boolean;
  onboardingStep: number;
  
  // Job data
  recommendations: JobRecommendation[];
  applications: Application[];
  insights: Insight[];
  
  // UI state
  loading: boolean;
  error: string | null;
  
  // Actions
  setUserProfile: (profile: UserProfile) => void;
  updateOnboardingStep: (step: number) => void;
  setOnboardingComplete: (complete: boolean) => void;
  setRecommendations: (recommendations: JobRecommendation[]) => void;
  setApplications: (applications: Application[]) => void;
  setInsights: (insights: Insight[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetOnboarding: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      userProfile: null,
      onboardingComplete: false,
      onboardingStep: 0,
      recommendations: [],
      applications: [],
      insights: [],
      loading: false,
      error: null,
      
      setUserProfile: (profile) => set({ userProfile: profile }),
      updateOnboardingStep: (step) => set({ onboardingStep: step }),
      setOnboardingComplete: (complete) => set({ onboardingComplete: complete }),
      setRecommendations: (recommendations) => set({ recommendations }),
      setApplications: (applications) => set({ applications }),
      setInsights: (insights) => set({ insights }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      resetOnboarding: () => {
        // Clear localStorage
        localStorage.removeItem('job-assistant-storage');
        localStorage.removeItem('onboarding-answers');
        // Reset state
        set({
          userProfile: null,
          onboardingComplete: false,
          onboardingStep: 0,
          recommendations: [],
          applications: [],
          insights: [],
          loading: false,
          error: null,
        });
      },
    }),
    {
      name: 'job-assistant-storage',
    }
  )
);

