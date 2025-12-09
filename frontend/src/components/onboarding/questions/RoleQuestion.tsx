import { motion } from 'framer-motion';
import { GraduationCap, Briefcase, RefreshCw, ArrowRight } from 'lucide-react';

const options = [
  { value: 'student', label: 'Student', icon: GraduationCap },
  { value: 'employed', label: 'Employed', icon: Briefcase },
  { value: 'between', label: 'Between jobs', icon: RefreshCw },
  { value: 'career_change', label: 'Career change', icon: ArrowRight },
];

interface RoleQuestionProps {
  defaultValue?: string;
  onAnswer: (answer: string) => void;
}

export const RoleQuestion = ({ defaultValue, onAnswer }: RoleQuestionProps) => {
  return (
    <div className="grid grid-cols-2 gap-4 w-full max-w-2xl mx-auto">
      {options.map((option) => {
        const Icon = option.icon;
        const isSelected = defaultValue === option.value;
        
        return (
          <motion.div
            key={option.value}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <button
              onClick={() => onAnswer(option.value)}
              className={`w-full p-6 rounded-xl border-2 transition-all duration-200 ${
                isSelected
                  ? 'border-primary-500 bg-primary-50 shadow-md'
                  : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow-sm'
              }`}
            >
              <Icon className={`w-8 h-8 mx-auto mb-3 ${
                isSelected ? 'text-primary-500' : 'text-gray-400'
              }`} />
              <p className={`font-medium ${
                isSelected ? 'text-primary-700' : 'text-gray-700'
              }`}>
                {option.label}
              </p>
            </button>
          </motion.div>
        );
      })}
    </div>
  );
};

