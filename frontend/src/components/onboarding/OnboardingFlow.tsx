import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { QuestionScreen } from './QuestionScreen';
import { NameQuestion } from './questions/NameQuestion';
import { RoleQuestion } from './questions/RoleQuestion';
import { EducationQuestion } from './questions/EducationQuestion';
import { SkillsQuestion } from './questions/SkillsQuestion';
import { ProficiencyQuestion } from './questions/ProficiencyQuestion';
import { ExperienceQuestion } from './questions/ExperienceQuestion';
import { LocationQuestion } from './questions/LocationQuestion';
import { TargetRolesQuestion } from './questions/TargetRolesQuestion';
import { SalaryQuestion } from './questions/SalaryQuestion';
import { DreamCompaniesQuestion } from './questions/DreamCompaniesQuestion';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { useStore } from '../../store/useStore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  updateUserProfile, 
  addSkill, 
  addExperience, 
  addEducation,
  createRecommendationsForUser
} from '../../services/api';
import toast from 'react-hot-toast';

const TOTAL_STEPS = 10;

export const OnboardingFlow = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUserProfile, setOnboardingComplete, setLoading } = useStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<any>({});
  const [isCompleting, setIsCompleting] = useState(false);

  // Reset onboarding if reset param is present
  useEffect(() => {
    if (searchParams.get('reset') === 'true') {
      localStorage.removeItem('onboarding-answers');
      localStorage.removeItem('job-assistant-storage');
      setOnboardingComplete(false);
      setAnswers({});
      setCurrentStep(0);
      // Remove reset param from URL
      window.history.replaceState({}, '', '/onboarding');
    }
  }, [searchParams, setOnboardingComplete]);

  useEffect(() => {
    // Load saved progress (only if not resetting)
    if (searchParams.get('reset') !== 'true') {
      const saved = localStorage.getItem('onboarding-answers');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setAnswers(parsed);
          // Find last answered step
          const lastStep = Object.keys(parsed).length;
          if (lastStep > 0 && lastStep < TOTAL_STEPS) {
            setCurrentStep(lastStep);
          }
        } catch (e) {
          console.error('Failed to load saved progress', e);
        }
      }
    }
  }, [searchParams]);

  const saveProgress = (step: number, answer: any) => {
    const updated = { ...answers, [step]: answer };
    setAnswers(updated);
    localStorage.setItem('onboarding-answers', JSON.stringify(updated));
  };

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAnswer = (step: number, answer: any) => {
    saveProgress(step, answer);
  };

  // Define questions array BEFORE any hooks that use it
  const questions = [
    { question: "What's your name?", component: NameQuestion },
    { question: "What's your current situation?", component: RoleQuestion },
    { question: "What did you study?", component: EducationQuestion },
    { question: "What are your top skills?", component: SkillsQuestion },
    { question: "Rate your proficiency", component: ProficiencyQuestion },
    { question: "Any work experience?", component: ExperienceQuestion },
    { question: "Where do you want to work?", component: LocationQuestion },
    { question: "What roles interest you?", component: TargetRolesQuestion },
    { question: "Salary expectations?", component: SalaryQuestion },
    { question: "Dream companies?", component: DreamCompaniesQuestion },
  ];

  // Debug logging - MUST be before any early returns, AFTER questions definition
  useEffect(() => {
    console.log('📊 OnboardingFlow State:', {
      currentStep,
      totalSteps: TOTAL_STEPS,
      answersCount: Object.keys(answers).length,
      question: questions[currentStep]?.question,
      isCompleting,
      questionsLength: questions.length,
    });
  }, [currentStep, answers, isCompleting]);

  const handleComplete = async () => {
    setIsCompleting(true);
    setLoading(true);

    try {
      const userId = `user_${Date.now()}`;
      
      // Create user profile object for frontend state
      const profile = {
        userId,
        name: answers[0],
        currentSituation: answers[1],
        education: answers[2],
        skills: Object.keys(answers[4] || {}).map(skill => ({
          name: skill,
          proficiency: answers[4][skill],
        })),
        workExperience: answers[5] || [],
        locations: answers[6] || [],
        targetRoles: answers[7] || [],
        salaryRange: answers[8],
        dreamCompanies: answers[9] || [],
      };

      setUserProfile(profile);

      // Save to backend via API
      try {
        // 1. Create user profile
        await updateUserProfile({
          user_id: userId,
          name: answers[0],
          location: answers[6]?.[0] || '',
          target_role: answers[7]?.[0] || '',
        });

        // 2. Add education
        if (answers[2]?.degree && answers[2]?.field && answers[2]?.university) {
          await addEducation({
            user_id: userId,
            institution: answers[2].university,
            degree: answers[2].degree,
            field_of_study: answers[2].field,
            start_date: new Date().toISOString().split('T')[0], // Use current date as placeholder
          });
        }

        // 3. Add skills
        for (const [skillName, proficiency] of Object.entries(answers[4] || {})) {
          await addSkill({
            user_id: userId,
            skill_name: skillName,
            proficiency: proficiency as 'beginner' | 'intermediate' | 'advanced' | 'expert',
          });
        }

        // 4. Add work experience
        if (Array.isArray(answers[5])) {
          for (const exp of answers[5]) {
            if (exp.company && exp.title) {
              await addExperience({
                user_id: userId,
                company: exp.company,
                title: exp.title,
                achievements: exp.description ? [exp.description] : undefined,
                start_date: new Date().toISOString().split('T')[0], // Use current date as placeholder
                is_current: !exp.end_date,
              });
            }
          }
        }

        // 5. Automatically create job recommendations
        try {
          console.log('[Onboarding] Creating job recommendations...');
          await createRecommendationsForUser({
            user_id: userId,
            count: 10,
          });
          console.log('[Onboarding] Job recommendations created successfully');
        } catch (recError) {
          console.warn('[Onboarding] Failed to create recommendations (non-critical):', recError);
          // Don't block onboarding if recommendations fail
        }

        toast.success('Profile created successfully! Finding your perfect job matches...');
        setOnboardingComplete(true);
        navigate('/dashboard');
      } catch (apiError) {
        console.error('API error:', apiError);
        // Even if API fails, allow user to proceed (data is saved locally)
        toast.error('Failed to save to server, but you can continue');
        setOnboardingComplete(true);
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Failed to complete onboarding', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      setIsCompleting(false);
    }
  };

  const canProceed = 
    (currentStep === 0 && answers[0] && typeof answers[0] === 'string' && answers[0].length >= 2) || // Name must be at least 2 chars
    (currentStep === 1 && answers[1]) || // Situation selected
    (currentStep === 2 && answers[2] && answers[2].degree && answers[2].degree.length >= 2 && answers[2].field && answers[2].field.length >= 2 && answers[2].university && answers[2].university.length >= 2) || // Education complete
    (currentStep === 3 && answers[3] && Array.isArray(answers[3]) && answers[3].length > 0) || // At least one skill
    (currentStep === 4 && answers[4] && Object.keys(answers[4]).length === (Array.isArray(answers[3]) ? answers[3].length : 0)) || // All skills rated
    (currentStep === 5 && answers[5] !== undefined) || // Experience (can be empty array)
    (currentStep === 6 && answers[6] && Array.isArray(answers[6]) && answers[6].length > 0) || // At least one location
    (currentStep === 7 && answers[7] && Array.isArray(answers[7]) && answers[7].length > 0) || // At least one role
    (currentStep === 8 && answers[8] && answers[8].min && answers[8].max) || // Salary range set
    (currentStep === 9 && true); // Dream companies is optional

  // Render the appropriate question component
  const renderQuestion = () => {
    const QuestionComponent = questions[currentStep]?.component;
    
    if (!QuestionComponent) {
      return null;
    }
    
    if (currentStep === 4) {
      // Proficiency question - needs skills array
      return (
        <QuestionComponent
          skills={Array.isArray(answers[3]) ? answers[3] : []}
          defaultValue={answers[4]}
          onAnswer={(answer) => handleAnswer(4, answer)}
        />
      );
    } else {
      // All other questions
      return (
        <QuestionComponent
          defaultValue={answers[currentStep]}
          onAnswer={(answer) => handleAnswer(currentStep, answer)}
        />
      );
    }
  };

  // Safety check - AFTER all hooks
  if (!questions[currentStep]) {
    console.error('❌ No question found for step:', currentStep);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error: No question found</h1>
          <p className="text-gray-600">Current step: {currentStep}</p>
          <p className="text-gray-600">Total questions: {questions.length}</p>
          <button 
            onClick={() => setCurrentStep(0)}
            className="mt-4 px-4 py-2 bg-primary-500 text-white rounded"
          >
            Reset to Step 0
          </button>
        </div>
      </div>
    );
  }

  // Show loading state AFTER all hooks
  if (isCompleting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <LoadingSpinner size="lg" className="mb-6" />
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Analyzing job market... 🔍
          </h2>
          <p className="text-gray-600 mb-8">
            Our AI agents are finding the perfect matches for you
          </p>
          <div className="space-y-2 text-left max-w-md mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-3"
            >
              <div className="w-2 h-2 bg-primary-500 rounded-full" />
              <span>Agent 1: Scanning jobs...</span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="flex items-center gap-3"
            >
              <div className="w-2 h-2 bg-primary-500 rounded-full" />
              <span>Agent 2: Scoring matches...</span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="flex items-center gap-3"
            >
              <div className="w-2 h-2 bg-primary-500 rounded-full" />
              <span>Agent 3: Generating insights...</span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <QuestionScreen
        key={currentStep}
        currentStep={currentStep + 1}
        totalSteps={TOTAL_STEPS}
        question={questions[currentStep]?.question || 'Loading...'}
        onNext={handleNext}
        onBack={handleBack}
        canProceed={canProceed}
        showBack={currentStep > 0}
      >
        {renderQuestion()}
      </QuestionScreen>
    </AnimatePresence>
  );
};
