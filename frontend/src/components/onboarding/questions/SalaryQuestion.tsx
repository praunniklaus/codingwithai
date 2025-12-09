import { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '../../shared/Input';

const CURRENCIES = ['USD', 'EUR', 'CHF', 'GBP'];

interface SalaryQuestionProps {
  defaultValue?: { min: number; max: number; currency: string };
  onAnswer: (answer: { min: number; max: number; currency: string }) => void;
}

export const SalaryQuestion = ({ defaultValue, onAnswer }: SalaryQuestionProps) => {
  const [min, setMin] = useState(defaultValue?.min || 60000);
  const [max, setMax] = useState(defaultValue?.max || 120000);
  const [currency, setCurrency] = useState(defaultValue?.currency || 'USD');

  const handleChange = (field: 'min' | 'max' | 'currency', value: number | string) => {
    if (field === 'currency') {
      setCurrency(value as string);
      onAnswer({ min, max, currency: value as string });
    } else {
      const numValue = typeof value === 'string' ? parseInt(value) || 0 : value;
      if (field === 'min') {
        setMin(numValue);
        onAnswer({ min: numValue, max, currency });
      } else {
        setMax(numValue);
        onAnswer({ min, max: numValue, currency });
      }
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="card">
        <label className="block text-sm font-medium text-gray-700 mb-4">
          Salary Range
        </label>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Minimum</label>
            <Input
              type="number"
              value={min}
              onChange={(e) => handleChange('min', parseInt(e.target.value) || 0)}
              className="text-lg"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Maximum</label>
            <Input
              type="number"
              value={max}
              onChange={(e) => handleChange('max', parseInt(e.target.value) || 0)}
              className="text-lg"
            />
          </div>
          <div className="flex gap-2">
            {CURRENCIES.map((curr) => (
              <motion.button
                key={curr}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleChange('currency', curr)}
                className={`px-4 py-2 rounded-lg border-2 font-medium ${
                  currency === curr
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-300 bg-white text-gray-700'
                }`}
              >
                {curr}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

