import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ProgressBar } from './ProgressBar';
import { Button } from '../shared/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface QuestionScreenProps {
  currentStep: number;
  totalSteps: number;
  question: string;
  children: ReactNode;
  onNext: () => void;
  onBack: () => void;
  canProceed?: boolean;
  showBack?: boolean;
}

export const QuestionScreen = ({
  currentStep,
  totalSteps,
  question,
  children,
  onNext,
  onBack,
  canProceed = true,
  showBack = true,
}: QuestionScreenProps) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canProceed) {
      onNext();
    } else if (e.key === 'Escape' && showBack) {
      onBack();
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-gradient-to-br from-blue-50 to-indigo-50"
      onKeyDown={handleKeyPress}
      tabIndex={0}
    >
      <div className="w-full max-w-2xl">
        <ProgressBar current={currentStep} total={totalSteps} />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {question}
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          {children}
        </motion.div>

        <div className="flex justify-between items-center">
          {showBack && (
            <Button
              variant="secondary"
              onClick={onBack}
              icon={<ChevronLeft className="w-5 h-5" />}
            >
              Back
            </Button>
          )}
          
          <div className="flex-1" />
          
          <Button
            variant="primary"
            onClick={onNext}
            disabled={!canProceed}
            icon={<ChevronRight className="w-5 h-5" />}
            iconPosition="right"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

