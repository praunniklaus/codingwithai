import { useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase } from 'lucide-react';

const ROLES = [
  'Software Engineer', 'Data Analyst', 'Product Manager', 'Data Scientist',
  'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
  'DevOps Engineer', 'Machine Learning Engineer', 'UX Designer',
  'Business Analyst', 'Project Manager', 'Consultant', 'Other',
];

interface TargetRolesQuestionProps {
  defaultValue?: string[];
  onAnswer: (answer: string[]) => void;
}

export const TargetRolesQuestion = ({ defaultValue = [], onAnswer }: TargetRolesQuestionProps) => {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(defaultValue);

  const handleToggle = (role: string) => {
    const updated = selectedRoles.includes(role)
      ? selectedRoles.filter(r => r !== role)
      : [...selectedRoles, role];
    setSelectedRoles(updated);
    onAnswer(updated);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full max-w-2xl mx-auto">
      {ROLES.map((role) => {
        const isSelected = selectedRoles.includes(role);
        
        return (
          <motion.button
            key={role}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleToggle(role)}
            className={`p-4 rounded-xl border-2 transition-all ${
              isSelected
                ? 'border-primary-500 bg-primary-50 shadow-md'
                : 'border-gray-300 bg-white hover:border-gray-400'
            }`}
          >
            <Briefcase className={`w-6 h-6 mx-auto mb-2 ${
              isSelected ? 'text-primary-500' : 'text-gray-400'
            }`} />
            <p className={`text-sm font-medium ${
              isSelected ? 'text-primary-700' : 'text-gray-700'
            }`}>
              {role}
            </p>
          </motion.button>
        );
      })}
    </div>
  );
};

