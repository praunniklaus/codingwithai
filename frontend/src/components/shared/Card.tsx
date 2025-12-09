import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export const Card = ({ children, className = '', hover = false }: CardProps) => {
  const baseClasses = 'card';
  
  if (hover) {
    return (
      <motion.div
        whileHover={{ y: -4, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
        className={`${baseClasses} ${className}`}
      >
        {children}
      </motion.div>
    );
  }
  
  return (
    <div className={`${baseClasses} ${className}`}>
      {children}
    </div>
  );
};

