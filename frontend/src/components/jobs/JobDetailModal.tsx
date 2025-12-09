import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, DollarSign, Check, X as XIcon } from 'lucide-react';
import { Button } from '../shared/Button';
import { Badge } from '../shared/Badge';
import type { JobRecommendation } from '../../store/useStore';

interface JobDetailModalProps {
  job: JobRecommendation | null;
  isOpen: boolean;
  onClose: () => void;
  onApply: (jobId: number) => void;
}

export const JobDetailModal = ({ job, isOpen, onClose, onApply }: JobDetailModalProps) => {
  if (!job) return null;

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 75) return 'info';
    if (score >= 60) return 'warning';
    return 'default';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-3xl font-bold text-gray-900">{job.title}</h2>
                    <Badge variant={getScoreColor(job.match_score)} className="text-lg px-4 py-1">
                      {job.match_score}% match
                    </Badge>
                  </div>
                  <p className="text-xl text-gray-600">{job.company}</p>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-6">
                {/* Job Info */}
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-5 h-5 mr-2" />
                    <span>{job.location}</span>
                  </div>
                  {job.salary_min && job.salary_max && (
                    <div className="flex items-center text-gray-600">
                      <DollarSign className="w-5 h-5 mr-2" />
                      <span>
                        {job.salary_min.toLocaleString()} - {job.salary_max.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Match Breakdown */}
                <div className="bg-blue-50 rounded-xl p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Why this matches you:
                  </h3>
                  <p className="text-gray-700 mb-4">{job.reasoning}</p>
                  
                  {/* Skills Checklist (mock data - would come from API) */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Skills Match:</h4>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                        <Check className="w-4 h-4" />
                        Python
                      </span>
                      <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                        <Check className="w-4 h-4" />
                        TypeScript
                      </span>
                      <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">
                        <XIcon className="w-4 h-4" />
                        React
                      </span>
                    </div>
                  </div>
                </div>

                {/* Job Description */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Job Description</h3>
                  <div className="prose max-w-none">
                    <p className="text-gray-700">
                      {job.reasoning || 'We are looking for a talented Software Engineer to join our team...'}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4 border-t border-gray-200">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => {
                      onApply(job.job_id);
                      onClose();
                    }}
                    className="flex-1"
                  >
                    I'm Interested
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={onClose}
                  >
                    Not for me
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

