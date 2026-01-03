import React from 'react';
import { getRiskLevelColor, RiskLevel } from '@/lib/riskAssessment';

interface RiskSummaryData {
  level: RiskLevel;
  count: number;
  totalValue: number;
}

interface RiskStatusSummaryProps {
  data: RiskSummaryData[];
  onCategoryClick: (level: RiskLevel) => void;
}

export function RiskStatusSummary({ data, onCategoryClick }: RiskStatusSummaryProps) {
  const totalOpportunities = data.reduce((sum, item) => sum + item.count, 0);
  const totalValue = data.reduce((sum, item) => sum + item.totalValue, 0);

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Risk Assessment Status</h3>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{totalOpportunities}</div>
          <div className="text-sm text-gray-500">Total Opportunities</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            ${(totalValue / 1000).toFixed(0)}k
          </div>
          <div className="text-sm text-gray-500">Total Value</div>
        </div>
      </div>

      {/* Risk Level Cards */}
      <div className="space-y-2">
        {data.map((item) => {
          if (item.count === 0) return null;

          const colors = getRiskLevelColor(item.level);
          const percentage = totalOpportunities > 0
            ? ((item.count / totalOpportunities) * 100).toFixed(0)
            : 0;

          return (
            <button
              key={item.level || 'unscored'}
              onClick={() => onCategoryClick(item.level)}
              className={`w-full text-left p-4 rounded-lg border-2 ${colors.border} ${colors.bg} hover:opacity-80 transition-opacity`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`font-semibold ${colors.text}`}>
                  {item.level || 'UNSCORED'}
                </span>
                <span className={`text-sm font-medium ${colors.text}`}>
                  {percentage}%
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className={colors.text}>
                  {item.count} {item.count === 1 ? 'opportunity' : 'opportunities'}
                </span>
                <span className={`font-medium ${colors.text}`}>
                  ${(item.totalValue / 1000).toFixed(1)}k
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-2 w-full bg-white bg-opacity-50 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${colors.text.replace('text-', 'bg-')}`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Help Text */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Click a risk level to view and assess opportunities in that category
        </p>
      </div>
    </div>
  );
}
