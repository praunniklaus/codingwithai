import { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '../../shared/Input';
import { Button } from '../../shared/Button';
import { Plus, X } from 'lucide-react';

interface Experience {
  company: string;
  title: string;
  description?: string;
}

interface ExperienceQuestionProps {
  defaultValue?: Experience[];
  onAnswer: (answer: Experience[]) => void;
}

export const ExperienceQuestion = ({ defaultValue = [], onAnswer }: ExperienceQuestionProps) => {
  const [experiences, setExperiences] = useState<Experience[]>(defaultValue.length > 0 ? defaultValue : [{ company: '', title: '', description: '' }]);

  const handleAdd = () => {
    setExperiences([...experiences, { company: '', title: '', description: '' }]);
  };

  const handleRemove = (index: number) => {
    const updated = experiences.filter((_, i) => i !== index);
    setExperiences(updated);
    onAnswer(updated.filter(e => e.company && e.title));
  };

  const handleChange = (index: number, field: keyof Experience, value: string) => {
    const updated = experiences.map((exp, i) =>
      i === index ? { ...exp, [field]: value } : exp
    );
    setExperiences(updated);
    onAnswer(updated.filter(e => e.company && e.title));
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {experiences.map((exp, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          {experiences.length > 1 && (
            <button
              onClick={() => handleRemove(index)}
              className="float-right text-gray-400 hover:text-red-500"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          
          <Input
            label="Company"
            value={exp.company}
            onChange={(e) => handleChange(index, 'company', e.target.value)}
            placeholder="e.g., Tech Startup"
            className="mb-4"
          />
          <Input
            label="Job Title"
            value={exp.title}
            onChange={(e) => handleChange(index, 'title', e.target.value)}
            placeholder="e.g., Software Developer"
            className="mb-4"
          />
          <Input
            label="Description (Optional)"
            value={exp.description || ''}
            onChange={(e) => handleChange(index, 'description', e.target.value)}
            placeholder="Brief description of your role"
          />
        </motion.div>
      ))}
      
      <Button
        variant="outline"
        onClick={handleAdd}
        icon={<Plus className="w-5 h-5" />}
        className="w-full"
      >
        Add Another Experience
      </Button>
    </div>
  );
};

