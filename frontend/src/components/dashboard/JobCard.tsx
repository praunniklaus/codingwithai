import { Card } from '../shared/Card';
import { Badge } from '../shared/Badge';
import { Button } from '../shared/Button';
import { MapPin, DollarSign, ArrowRight } from 'lucide-react';
import type { JobRecommendation } from '../../store/useStore';

interface JobCardProps {
  job: JobRecommendation;
  onClick?: () => void;
}

export const JobCard = ({ job, onClick }: JobCardProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 75) return 'info';
    if (score >= 60) return 'warning';
    return 'default';
  };

  return (
    <div className="cursor-pointer" onClick={onClick}>
      <Card hover className="relative">
      <div className="absolute top-4 right-4">
        <Badge variant={getScoreColor(job.match_score)}>
          {job.match_score}% match
        </Badge>
      </div>

      <h3 className="text-xl font-bold text-gray-900 mb-2 pr-20">
        {job.title}
      </h3>
      
      <p className="text-lg text-gray-600 mb-4">{job.company}</p>

      <div className="space-y-2 mb-4">
        <div className="flex items-center text-gray-600">
          <MapPin className="w-4 h-4 mr-2" />
          <span>{job.location}</span>
        </div>
        {job.salary_min && job.salary_max && (
          <div className="flex items-center text-gray-600">
            <DollarSign className="w-4 h-4 mr-2" />
            <span>
              {job.salary_min.toLocaleString()} - {job.salary_max.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      <p className="text-sm text-gray-500 mb-4 line-clamp-2">
        {job.reasoning}
      </p>

      <Button
        variant="primary"
        size="sm"
        className="w-full"
        icon={<ArrowRight className="w-4 h-4" />}
        iconPosition="right"
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
      >
        View Details
      </Button>
      </Card>
    </div>
  );
};

