import { Card } from '../shared/Card';
import type { Insight } from '../../store/useStore';
import { Lightbulb, TrendingUp, AlertCircle } from 'lucide-react';

interface InsightsPanelProps {
  insights: Insight[];
}

const getInsightIcon = (type: string) => {
  if (type.includes('trend') || type.includes('market')) return TrendingUp;
  if (type.includes('reminder') || type.includes('alert')) return AlertCircle;
  return Lightbulb;
};

export const InsightsPanel = ({ insights }: InsightsPanelProps) => {
  if (insights.length === 0) {
    return (
      <Card>
        <h3 className="text-lg font-semibold mb-4">Insights</h3>
        <p className="text-sm text-gray-500">
          Agent insights will appear here as they analyze your applications
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold mb-4">Insights</h3>
      <div className="space-y-4">
        {insights.map((insight) => {
          const Icon = getInsightIcon(insight.insight_type);
          
          return (
            <div key={insight.id} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start gap-3">
                <Icon className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-700">{insight.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(insight.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

