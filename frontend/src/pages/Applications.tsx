import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { Header } from '../components/shared/Header';
import { Badge } from '../components/shared/Badge';
import { Button } from '../components/shared/Button';
import { Card } from '../components/shared/Card';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { getApplications } from '../services/api';
import toast from 'react-hot-toast';
import { 
  Briefcase, 
  Calendar, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  Clock,
  FileText,
  Plus
} from 'lucide-react';

type ApplicationStatus = 'all' | 'draft' | 'submitted' | 'under_review' | 'interview' | 'offer' | 'rejected' | 'withdrawn';

export const Applications = () => {
  const { userProfile, applications, setApplications, loading, setLoading } = useStore();
  const [filter, setFilter] = useState<ApplicationStatus>('all');

  useEffect(() => {
    const loadApplications = async () => {
      if (!userProfile?.userId) return;
      
      setLoading(true);
      try {
        // Fetch applications from API
        const applicationsData = await getApplications({
          user_id: userProfile.userId,
          status: filter !== 'all' ? filter : undefined,
        });

        // Transform API response to match our type
        if (applicationsData && Array.isArray(applicationsData)) {
          const transformed = applicationsData.map((app: any) => ({
            id: app.id,
            job_id: app.job_id,
            job_title: app.job_title || app.title || 'Unknown',
            job_company: app.job_company || app.company || 'Unknown',
            status: app.status || 'draft',
            applied_date: app.applied_date || app.applied_at,
            created_at: app.created_at || new Date().toISOString(),
            updated_at: app.updated_at || app.created_at || new Date().toISOString(),
          }));
          setApplications(transformed);
        } else {
          setApplications([]);
        }
      } catch (error) {
        console.error('Failed to load applications', error);
        toast.error('Failed to load applications');
        setApplications([]);
      } finally {
        setLoading(false);
      }
    };

    loadApplications();
  }, [userProfile, filter, setApplications, setLoading]);

  const filteredApplications = filter === 'all' 
    ? applications 
    : applications.filter(app => app.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'submitted': return 'info';
      case 'under_review': return 'info';
      case 'interview': return 'success';
      case 'offer': return 'success';
      case 'rejected': return 'danger';
      case 'withdrawn': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
      case 'under_review':
        return <Clock className="w-4 h-4" />;
      case 'interview':
      case 'offer':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const stats = {
    total: applications.length,
    submitted: applications.filter(a => ['submitted', 'under_review', 'interview'].includes(a.status)).length,
    interviews: applications.filter(a => a.status === 'interview').length,
    offers: applications.filter(a => a.status === 'offer').length,
  };

  const responseRate = stats.total > 0 ? Math.round((stats.submitted / stats.total) * 100) : 0;
  const interviewRate = stats.submitted > 0 ? Math.round((stats.interviews / stats.submitted) * 100) : 0;
  const successRate = stats.submitted > 0 ? Math.round((stats.offers / stats.submitted) * 100) : 0;

  const filters: { value: ApplicationStatus; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: applications.length },
    { value: 'draft', label: 'Draft', count: applications.filter(a => a.status === 'draft').length },
    { value: 'submitted', label: 'Submitted', count: applications.filter(a => a.status === 'submitted').length },
    { value: 'under_review', label: 'Under Review', count: applications.filter(a => a.status === 'under_review').length },
    { value: 'interview', label: 'Interview', count: applications.filter(a => a.status === 'interview').length },
    { value: 'offer', label: 'Offer', count: applications.filter(a => a.status === 'offer').length },
    { value: 'rejected', label: 'Rejected', count: applications.filter(a => a.status === 'rejected').length },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Application Tracker
              </h1>
              <p className="text-gray-600">
                Monitor and manage all your job applications
              </p>
            </div>
            <Button
              variant="primary"
              icon={<Plus className="w-5 h-5" />}
            >
              New Application
            </Button>
          </div>
        </motion.div>

        {/* Stats Panel */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Total Applications</span>
              <Briefcase className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Response Rate</span>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{responseRate}%</div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${responseRate}%` }}
              />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Interview Rate</span>
              <Calendar className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{interviewRate}%</div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${interviewRate}%` }}
              />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Success Rate</span>
              <CheckCircle className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{successRate}%</div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-500 h-2 rounded-full transition-all"
                style={{ width: `${successRate}%` }}
              />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {filters.map((filterOption) => (
            <button
              key={filterOption.value}
              onClick={() => setFilter(filterOption.value)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === filterOption.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {filterOption.label} ({filterOption.count})
            </button>
          ))}
        </div>

        {/* Applications List */}
        <div className="space-y-4">
          {filteredApplications.length === 0 ? (
            <Card className="p-12 text-center">
              <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No applications found
              </h3>
              <p className="text-gray-600 mb-6">
                {filter === 'all' 
                  ? "Start applying to jobs to track your progress here"
                  : `No applications with status "${filter}"`
                }
              </p>
              <Button variant="primary" icon={<Plus className="w-5 h-5" />}>
                Create Application
              </Button>
            </Card>
          ) : (
            filteredApplications.map((app) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <div className="cursor-pointer" onClick={() => {
                  // TODO: Open application details modal
                }}>
                  <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {app.job_title}
                        </h3>
                        <Badge variant={getStatusColor(app.status)}>
                          {getStatusIcon(app.status)}
                          <span className="ml-1 capitalize">{app.status.replace('_', ' ')}</span>
                        </Badge>
                      </div>
                      <p className="text-gray-600 mb-3">{app.job_company}</p>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        {app.applied_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Applied {formatDate(app.applied_date)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>Updated {formatDate(app.updated_at)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle update status
                        }}
                      >
                        Update Status
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Open application details modal
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                  </Card>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

