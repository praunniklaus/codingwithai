import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, FileText, CheckCircle, RefreshCw } from 'lucide-react';
import { Button } from '../shared/Button';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { useState } from 'react';
import { generateCV, generateCoverLetter } from '../../services/api';
import toast from 'react-hot-toast';

interface CVPreviewProps {
  userId: string;
  jobId: number;
  jobTitle: string;
  company: string;
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
}

export const CVPreview = ({ 
  userId, 
  jobId, 
  jobTitle, 
  company, 
  isOpen, 
  onClose, 
  onApprove 
}: CVPreviewProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [cvContent, setCvContent] = useState<string | null>(null);
  const [coverLetterContent, setCoverLetterContent] = useState<string | null>(null);
  const [generationStep, setGenerationStep] = useState<'cv' | 'cover-letter' | 'complete'>('cv');

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationStep('cv');
    
    try {
      // Generate CV using the API
      toast.loading('Generating CV...', { id: 'generate-cv' });
      const cvResult = await generateCV({
        user_id: userId,
        job_id: jobId,
        format: 'markdown',
      });
      setCvContent(cvResult.content);
      toast.success('CV generated!', { id: 'generate-cv' });
      
      setGenerationStep('cover-letter');
      
      // Generate cover letter using the API
      toast.loading('Generating cover letter...', { id: 'generate-cover' });
      const coverResult = await generateCoverLetter({
        user_id: userId,
        job_id: jobId,
        tone: 'professional',
      });
      setCoverLetterContent(coverResult.content);
      toast.success('Cover letter generated!', { id: 'generate-cover' });
      
      setGenerationStep('complete');
    } catch (error) {
      console.error('Failed to generate documents:', error);
      toast.error('Failed to generate documents. Please try again.', { id: 'generate-error' });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

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
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">CV & Cover Letter Preview</h2>
                  <p className="text-gray-600">{jobTitle} at {company}</p>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center h-full py-12">
                    <LoadingSpinner size="lg" className="mb-6" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {generationStep === 'cv' && 'Generating your CV...'}
                      {generationStep === 'cover-letter' && 'Writing your cover letter...'}
                      {generationStep === 'complete' && 'Almost done...'}
                    </h3>
                    <p className="text-gray-600">
                      Our AI is crafting personalized documents for this role
                    </p>
                  </div>
                ) : !cvContent ? (
                  <div className="flex flex-col items-center justify-center h-full py-12">
                    <FileText className="w-16 h-16 text-gray-300 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Ready to generate your CV?
                    </h3>
                    <p className="text-gray-600 mb-6 text-center max-w-md">
                      We'll create a tailored CV and cover letter specifically for this position
                    </p>
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={handleGenerate}
                      icon={<RefreshCw className="w-5 h-5" />}
                    >
                      Generate CV & Cover Letter
                    </Button>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* CV Preview */}
                    <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">CV</h3>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Download className="w-4 h-4" />}
                        >
                          Download PDF
                        </Button>
                      </div>
                      <div className="prose max-w-none bg-white p-4 rounded border border-gray-200 max-h-96 overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                          {cvContent}
                        </pre>
                      </div>
                    </div>

                    {/* Cover Letter Preview */}
                    <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Cover Letter</h3>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Download className="w-4 h-4" />}
                        >
                          Download PDF
                        </Button>
                      </div>
                      <div className="prose max-w-none bg-white p-4 rounded border border-gray-200 max-h-96 overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                          {coverLetterContent}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              {cvContent && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Documents generated successfully</span>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setCvContent(null);
                        setCoverLetterContent(null);
                        setGenerationStep('cv');
                      }}
                      icon={<RefreshCw className="w-4 h-4" />}
                    >
                      Generate New Version
                    </Button>
                    <Button
                      variant="primary"
                      onClick={onApprove}
                      icon={<CheckCircle className="w-5 h-5" />}
                    >
                      This Looks Good!
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

