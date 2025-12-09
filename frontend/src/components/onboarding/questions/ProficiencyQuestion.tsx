import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const PROFICIENCY_LEVELS = [
  { value: 'beginner', label: 'Beginner', color: 'bg-blue-100 text-blue-800' },
  { value: 'intermediate', label: 'Intermediate', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'advanced', label: 'Advanced', color: 'bg-orange-100 text-orange-800' },
  { value: 'expert', label: 'Expert', color: 'bg-green-100 text-green-800' },
];

interface ProficiencyQuestionProps {
  skills?: string[];
  defaultValue?: Record<string, string>;
  onAnswer: (answer: Record<string, string>) => void;
}

export const ProficiencyQuestion = ({ skills = [], defaultValue = {}, onAnswer }: ProficiencyQuestionProps) => {
  const [proficiencies, setProficiencies] = useState<Record<string, string>>(defaultValue);

  useEffect(() => {
    // Auto-advance when all skills are rated
    if (skills.length > 0 && Object.keys(proficiencies).length === skills.length) {
      onAnswer(proficiencies);
    }
  }, [proficiencies, skills, onAnswer]);

  const handleSelect = (skill: string, level: string) => {
    const updated = { ...proficiencies, [skill]: level };
    setProficiencies(updated);
    onAnswer(updated);
  };

  if (!skills || skills.length === 0) {
    return <p className="text-gray-500">No skills selected. Please go back and add skills.</p>;
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {skills.map((skill) => {
        const currentLevel = proficiencies[skill];
        
        return (
          <div key={skill} className="card">
            <h3 className="text-lg font-semibold mb-4">{skill}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {PROFICIENCY_LEVELS.map((level) => {
                const isSelected = currentLevel === level.value;
                
                return (
                  <motion.button
                    key={level.value}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSelect(skill, level.value)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? `${level.color} border-primary-500 shadow-md`
                        : 'bg-white border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {isSelected && <Check className="w-5 h-5 mx-auto mb-1" />}
                    <p className={`text-sm font-medium ${isSelected ? '' : 'text-gray-700'}`}>
                      {level.label}
                    </p>
                  </motion.button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

