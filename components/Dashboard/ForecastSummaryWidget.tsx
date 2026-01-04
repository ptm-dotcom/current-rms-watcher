import React from 'react';
import { useRouter } from 'next/router';
import { ForecastSummary } from '@/types/forecast';
import { formatCurrency } from '@/lib/forecastCalculation';

interface ForecastSummaryWidgetProps {
  data: ForecastSummary | null;
  loading?: boolean;
}

export function ForecastSummaryWidget({ data, loading }: ForecastSummaryWidgetProps) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
          <div className="space-y-2">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Sales Forecast</h3>
        <p className="text-gray-500 text-sm">No forecast data available</p>
      </div>
    );
  }

  const categories = [
    {
      label: 'Commit',
      count: data.commit_count,
      value: data.commit_revenue,
      colors: {
        bg: 'bg-green-50',
        border: 'border-green-300',
        text: 'text-green-700',
        bar: 'bg-green-500'
      }
    },
    {
      label: 'Upside',
      count: data.upside_count,
      value: data.upside_revenue,
      colors: {
        bg: 'bg-blue-50',
        border: 'border-blue-300',
        text: 'text-blue-700',
        bar: 'bg-blue-500'
      }
    },
    {
      label: 'Unreviewed',
      count: data.unreviewed_count,
      value: data.unreviewed_revenue,
      colors: {
        bg: 'bg-gray-50',
        border: 'border-gray-300',
        text: 'text-gray-600',
        bar: 'bg-gray-400'
      }
    }
  ];

  const totalCount = data.commit_count + data.upside_count + data.unreviewed_count;
  const maxValue = Math.max(...categories.map(c => c.value), 1);

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Sales Forecast</h3>
        <button
          onClick={() => router.push('/sales-forecast')}
          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
        >
          View All
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-600">
            {formatCurrency(data.weighted_revenue)}
          </div>
          <div className="text-sm text-gray-500">Weighted Forecast</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(data.total_pipeline_revenue)}
          </div>
          <div className="text-sm text-gray-500">Total Pipeline</div>
        </div>
      </div>

      {/* Category Cards */}
      <div className="space-y-2">
        {categories.map((category) => {
          if (category.count === 0) return null;

          const percentage = totalCount > 0
            ? ((category.count / totalCount) * 100).toFixed(0)
            : 0;

          const barWidth = maxValue > 0
            ? (category.value / maxValue) * 100
            : 0;

          return (
            <button
              key={category.label}
              onClick={() => router.push('/sales-forecast')}
              className={`w-full text-left p-4 rounded-lg border-2 ${category.colors.border} ${category.colors.bg} hover:opacity-80 transition-opacity`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`font-semibold ${category.colors.text}`}>
                  {category.label}
                </span>
                <span className={`text-sm font-medium ${category.colors.text}`}>
                  {percentage}%
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className={category.colors.text}>
                  {category.count} {category.count === 1 ? 'opportunity' : 'opportunities'}
                </span>
                <span className={`font-medium ${category.colors.text}`}>
                  {formatCurrency(category.value)}
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-2 w-full bg-white bg-opacity-50 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${category.colors.bar}`}
                  style={{ width: `${barWidth}%` }}
                ></div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Excluded indicator */}
      {data.excluded_count > 0 && (
        <div className="mt-3 text-xs text-gray-500">
          {data.excluded_count} excluded ({formatCurrency(data.excluded_revenue)})
        </div>
      )}

      {/* Help Text */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Click to view and manage your sales forecast pipeline
        </p>
      </div>
    </div>
  );
}
