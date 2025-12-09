import { useState, useEffect } from 'react';
import { Input } from '../../shared/Input';

interface EducationQuestionProps {
  defaultValue?: { degree?: string; field?: string; university?: string };
  onAnswer: (answer: { degree: string; field: string; university: string }) => void;
}

export const EducationQuestion = ({ defaultValue, onAnswer }: EducationQuestionProps) => {
  const [degree, setDegree] = useState(defaultValue?.degree || '');
  const [field, setField] = useState(defaultValue?.field || '');
  const [university, setUniversity] = useState(defaultValue?.university || '');
  
  const [errors, setErrors] = useState<{ degree?: string; field?: string; university?: string }>({});

  useEffect(() => {
    // Validate and call onAnswer when all fields are filled
    const newErrors: { degree?: string; field?: string; university?: string } = {};
    
    if (degree.length > 0 && degree.length < 2) {
      newErrors.degree = 'Please enter at least 2 characters';
    }
    if (field.length > 0 && field.length < 2) {
      newErrors.field = 'Please enter at least 2 characters';
    }
    if (university.length > 0 && university.length < 2) {
      newErrors.university = 'Please enter at least 2 characters';
    }
    
    setErrors(newErrors);

    // Call onAnswer if all fields are valid
    if (degree.length >= 2 && field.length >= 2 && university.length >= 2) {
      onAnswer({ degree, field, university });
    }
  }, [degree, field, university, onAnswer]);

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <Input
        value={degree}
        onChange={(e) => setDegree(e.target.value)}
        label="Degree"
        placeholder="e.g., Bachelor's, Master's"
        autoFocus
        error={errors.degree}
      />
      <Input
        value={field}
        onChange={(e) => setField(e.target.value)}
        label="Field of Study"
        placeholder="e.g., Computer Science, Economics"
        error={errors.field}
      />
      <Input
        value={university}
        onChange={(e) => setUniversity(e.target.value)}
        label="University"
        placeholder="e.g., University of St. Gallen"
        error={errors.university}
      />
    </div>
  );
};

