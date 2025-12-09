import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

const COMMON_SKILLS = [
  'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'SQL', 'Java',
  'C++', 'Go', 'Rust', 'Docker', 'Kubernetes', 'AWS', 'Git', 'MongoDB',
  'PostgreSQL', 'Redis', 'GraphQL', 'REST API', 'Machine Learning',
  'Data Analysis', 'Product Management', 'Agile', 'Scrum',
];

interface SkillsQuestionProps {
  defaultValue?: string[];
  onAnswer: (answer: string[]) => void;
}

export const SkillsQuestion = ({ defaultValue = [], onAnswer }: SkillsQuestionProps) => {
  const [selectedSkills, setSelectedSkills] = useState<string[]>(defaultValue);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSkills = COMMON_SKILLS.filter(skill =>
    skill.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !selectedSkills.includes(skill)
  );

  const handleAddSkill = (skill: string) => {
    const updated = [...selectedSkills, skill];
    setSelectedSkills(updated);
    onAnswer(updated);
    setSearchTerm('');
  };

  const handleRemoveSkill = (skill: string) => {
    const updated = selectedSkills.filter(s => s !== skill);
    setSelectedSkills(updated);
    onAnswer(updated);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search or type a skill..."
          className="input-field"
          autoFocus
        />
      </div>

      {selectedSkills.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-2">Your Skills:</p>
          <div className="flex flex-wrap gap-2">
            {selectedSkills.map((skill) => (
              <motion.span
                key={skill}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="inline-flex items-center gap-2 bg-primary-100 text-primary-800 px-4 py-2 rounded-full text-sm font-medium"
              >
                {skill}
                <button
                  onClick={() => handleRemoveSkill(skill)}
                  className="hover:text-primary-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.span>
            ))}
          </div>
        </div>
      )}

      {searchTerm && filteredSkills.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {filteredSkills.map((skill) => (
            <motion.button
              key={skill}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleAddSkill(skill)}
              className="p-3 text-left bg-white border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
            >
              {skill}
            </motion.button>
          ))}
        </div>
      )}

      {!searchTerm && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {COMMON_SKILLS.filter(s => !selectedSkills.includes(s)).slice(0, 9).map((skill) => (
            <motion.button
              key={skill}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleAddSkill(skill)}
              className="p-3 text-left bg-white border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
            >
              {skill}
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
};

