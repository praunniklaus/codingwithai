import { motion } from 'framer-motion';
import { Card } from '../shared/Card';
import { Badge } from '../shared/Badge';
import type { Application } from '../../store/useStore';
import { Clock } from 'lucide-react';

interface ApplicationsListProps {
  applications: Application[];
}

const getStatusVariant = (status: Application['status']): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
  switch (status) {
    case 'submitted':
    case 'under_review':
      return 'info';
    case 'interview':
      return 'success';
    case 'offer':
      return 'success';
    case 'rejected':
      return 'danger';
    default:
      return 'default';
  }
};

export const ApplicationsList = ({ applications }: ApplicationsListProps) => {
  if (applications.length === 0) {
    return (
      <Card>
        <p className="text-gray-500 text-center py-8">
          No applications yet. Start by viewing job matches above!
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {applications.map((app) => (
        <motion.div
          key={app.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Card className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-gray-900">{app.job_company}</h4>
              <p className="text-sm text-gray-600">{app.job_title}</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant={getStatusVariant(app.status)}>
                {app.status.replace('_', ' ')}
              </Badge>
              {app.applied_date && (
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="w-4 h-4 mr-1" />
                  {new Date(app.applied_date).toLocaleDateString()}
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

