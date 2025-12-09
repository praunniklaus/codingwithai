import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { Input } from '../../shared/Input';

interface DreamCompaniesQuestionProps {
  defaultValue?: string[];
  onAnswer: (answer: string[]) => void;
}

export const DreamCompaniesQuestion = ({ defaultValue = [], onAnswer }: DreamCompaniesQuestionProps) => {
  const [companies, setCompanies] = useState<string[]>(defaultValue);
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    if (inputValue.trim() && !companies.includes(inputValue.trim())) {
      const updated = [...companies, inputValue.trim()];
      setCompanies(updated);
      onAnswer(updated);
      setInputValue('');
    }
  };

  const handleRemove = (company: string) => {
    const updated = companies.filter(c => c !== company);
    setCompanies(updated);
    onAnswer(updated);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a company name and press Enter"
          className="flex-1"
          autoFocus
        />
        <button
          onClick={handleAdd}
          className="px-4 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {companies.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {companies.map((company) => (
            <motion.span
              key={company}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center gap-2 bg-primary-100 text-primary-800 px-4 py-2 rounded-full text-sm font-medium"
            >
              {company}
              <button
                onClick={() => handleRemove(company)}
                className="hover:text-primary-600"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.span>
          ))}
        </div>
      )}

      <p className="text-sm text-gray-500 text-center">
        This is optional - you can skip by clicking Next
      </p>
    </div>
  );
};

