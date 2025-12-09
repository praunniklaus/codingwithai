import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';

const LOCATIONS = [
  'Remote', 'Zurich', 'London', 'Berlin', 'Amsterdam', 'Paris', 'New York',
  'San Francisco', 'Toronto', 'Singapore', 'Tokyo', 'Sydney', 'Other',
];

interface LocationQuestionProps {
  defaultValue?: string[];
  onAnswer: (answer: string[]) => void;
}

export const LocationQuestion = ({ defaultValue = [], onAnswer }: LocationQuestionProps) => {
  const [selectedLocations, setSelectedLocations] = useState<string[]>(defaultValue);

  const handleToggle = (location: string) => {
    const updated = selectedLocations.includes(location)
      ? selectedLocations.filter(l => l !== location)
      : [...selectedLocations, location];
    setSelectedLocations(updated);
    onAnswer(updated);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full max-w-2xl mx-auto">
      {LOCATIONS.map((location) => {
        const isSelected = selectedLocations.includes(location);
        
        return (
          <motion.button
            key={location}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleToggle(location)}
            className={`p-4 rounded-xl border-2 transition-all ${
              isSelected
                ? 'border-primary-500 bg-primary-50 shadow-md'
                : 'border-gray-300 bg-white hover:border-gray-400'
            }`}
          >
            <MapPin className={`w-6 h-6 mx-auto mb-2 ${
              isSelected ? 'text-primary-500' : 'text-gray-400'
            }`} />
            <p className={`font-medium ${
              isSelected ? 'text-primary-700' : 'text-gray-700'
            }`}>
              {location}
            </p>
          </motion.button>
        );
      })}
    </div>
  );
};

