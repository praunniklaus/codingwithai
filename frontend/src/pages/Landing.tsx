import { motion } from 'framer-motion';
import { Button } from '../components/shared/Button';
import { ArrowRight, Briefcase, Sparkles, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-4xl mx-auto"
        >
          <h1 className="text-6xl md:text-7xl font-bold text-gray-900 mb-6">
            Your AI-Powered
            <span className="block text-primary-500">Job Assistant</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Let three intelligent agents help you find the perfect job, craft tailored CVs, 
            and track your applications—all in one place.
          </p>

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              size="lg"
              onClick={() => navigate('/onboarding')}
              icon={<ArrowRight className="w-6 h-6" />}
              iconPosition="right"
            >
              Get Started
            </Button>
          </motion.div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 mt-24 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card text-center"
          >
            <Briefcase className="w-12 h-12 text-primary-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Job Hunter</h3>
            <p className="text-gray-600">
              AI agent searches and scores jobs matching your profile
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card text-center"
          >
            <Sparkles className="w-12 h-12 text-primary-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">CV Crafter</h3>
            <p className="text-gray-600">
              Generates tailored CVs and cover letters for each application
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="card text-center"
          >
            <Target className="w-12 h-12 text-primary-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Application Tracker</h3>
            <p className="text-gray-600">
              Monitors applications and provides insights and reminders
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

