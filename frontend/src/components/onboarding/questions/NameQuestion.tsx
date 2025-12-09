import { useState, useEffect } from 'react';
import { Input } from '../../shared/Input';

interface NameQuestionProps {
  defaultValue?: string;
  onAnswer: (answer: string) => void;
}

export const NameQuestion = ({ defaultValue = '', onAnswer }: NameQuestionProps) => {
  const [name, setName] = useState(defaultValue);
  const [error, setError] = useState('');

  useEffect(() => {
    // Call onAnswer immediately when name changes and is valid
    if (name.length >= 2) {
      setError('');
      onAnswer(name);
    } else if (name.length > 0) {
      setError('Please enter at least 2 characters');
    } else {
      setError('');
    }
  }, [name, onAnswer]);

  return (
    <div className="w-full max-w-md mx-auto">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter your name"
        autoFocus
        className="text-center text-xl"
        error={error}
      />
    </div>
  );
};

