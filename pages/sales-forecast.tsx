import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DateRangeFilter, DateRange } from '@/components/DateRangeFilter';
import { ForecastModal } from '@/components/Forecast/ForecastModal';
import {
  ForecastSummary,
  ForecastByOwner,
  ForecastByCustomer,
  ForecastByProbabilityBand,
  OpportunityWithForecast,
  ForecastMetadata
} from '@/types/forecast';
import {
  formatCurrency,
  formatPercentage,
  getProbabilityColor,
  getForecastStatusLabel,
  getForecastStatusColor
} from '@/lib/forecastCalculation';

interface ForecastData {
  summary: ForecastSummary;
  byOwner: ForecastByOwner[];
  byCustomer: ForecastByCustomer[];
  byProbabilityBand: ForecastByProbabilityBand[];
  opportunities: OpportunityWithForecast[];
  filters: {
    owners: string[];
    customers: string[];
  };
}

type ViewTab = 'summary' | 'by-owner' | 'by-customer' | 'opportunities';

export default function SalesForecast() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ForecastData | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>('summary');

  // Filters
  const [dateRange, setDateRange] = useState<DateRange>({
    preset: '12-months',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  const [selectedOwner, setSelectedOwner] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [includeExcluded, setIncludeExcluded] = useState(false);
  const [showCommitOnly, setShowCommitOnly] = useState(false);
  const [showUpsideOnly, setShowUpsideOnly] = useState(false);

  // Modal state
  const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityWithForecast | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      if (selectedOwner) params.append('owner', selectedOwner);
      if (selectedCustomer) params.append('customer', selectedCustomer);
      if (includeExcluded) params.append('includeExcluded', 'true');

      const response = await fetch(`/api/forecast/summary?${params.toString()}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch forecast data');
      }

      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedOwner, selectedCustomer, includeExcluded]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveForecast = async (opportunityId: number, forecastData: Partial<ForecastMetadata>) => {
    const response = await fetch(`/api/opportunities/${opportunityId}/forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(forecastData)
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to save forecast');
    }

    // Refresh data after save
    await fetchData();
  };

  const handleOpenModal = (opportunity: OpportunityWithForecast) => {
    setSelectedOpportunity(opportunity);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOpportunity(null);
  };

  // Filter opportunities for display
  const getFilteredOpportunities = () => {
    if (!data) return [];

    let filtered = [...data.opportunities];

    if (showCommitOnly) {
      filtered = filtered.filter(o => o.forecast?.is_commit === true);
    }
    if (showUpsideOnly) {
      filtered = filtered.filter(o => o.forecast?.is_commit === false && o.forecast !== undefined);
    }

    return filtered;
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading forecast data...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Sales Forecast - Current RMS Watcher</title>
        <meta name="description" content="Sales forecast and pipeline management" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold">Sales Forecast</h1>
                <p className="mt-1 text-emerald-100">Pipeline Management & Forecasting</p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/')}
                  className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Dashboard
                </button>
                <button
                  onClick={() => {
                    const params = new URLSearchParams();
                    if (dateRange.startDate) params.append('startDate', dateRange.startDate);
                    if (dateRange.endDate) params.append('endDate', dateRange.endDate);
                    if (includeExcluded) params.append('includeExcluded', 'true');
                    window.open(`/api/forecast/export?${params.toString()}`, '_blank');
                  }}
                  className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export CSV
                </button>
                <button
                  onClick={fetchData}
                  disabled={loading}
                  className="px-4 py-2 bg-white text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors font-medium disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Filters Section */}
          <div className="mb-6 space-y-4">
            <DateRangeFilter value={dateRange} onChange={setDateRange} />

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Owner Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Owner</label>
                  <select
                    value={selectedOwner}
                    onChange={(e) => setSelectedOwner(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="">All Owners</option>
                    {data?.filters.owners.map(owner => (
                      <option key={owner} value={owner}>{owner}</option>
                    ))}
                  </select>
                </div>

                {/* Customer Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                  <select
                    value={selectedCustomer}
                    onChange={(e) => setSelectedCustomer(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="">All Customers</option>
                    {data?.filters.customers.map(customer => (
                      <option key={customer} value={customer}>{customer}</option>
                    ))}
                  </select>
                </div>

                {/* Toggle Filters */}
                <div className="flex flex-col justify-end">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={showCommitOnly}
                        onChange={(e) => {
                          setShowCommitOnly(e.target.checked);
                          if (e.target.checked) setShowUpsideOnly(false);
                        }}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      Commit Only
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={showUpsideOnly}
                        onChange={(e) => {
                          setShowUpsideOnly(e.target.checked);
                          if (e.target.checked) setShowCommitOnly(false);
                        }}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      Upside Only
                    </label>
                  </div>
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={includeExcluded}
                      onChange={(e) => setIncludeExcluded(e.target.checked)}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    Include Excluded
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          {data?.summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <SummaryCard
                title="Total Pipeline"
                value={formatCurrency(data.summary.total_pipeline_revenue)}
                subtitle={`${data.summary.total_pipeline_count} opportunities`}
                color="blue"
              />
              <SummaryCard
                title="Weighted Forecast"
                value={formatCurrency(data.summary.weighted_revenue)}
                subtitle={`Weighted profit: ${formatCurrency(data.summary.weighted_profit)}`}
                color="emerald"
              />
              <SummaryCard
                title="Commit"
                value={formatCurrency(data.summary.commit_revenue)}
                subtitle={`${data.summary.commit_count} opportunities`}
                color="green"
              />
              <SummaryCard
                title="Upside"
                value={formatCurrency(data.summary.upside_revenue)}
                subtitle={`${data.summary.upside_count} opportunities`}
                color="yellow"
              />
            </div>
          )}

          {/* Status Indicators */}
          {data?.summary && (
            <div className="flex gap-4 mb-6">
              {data.summary.unreviewed_count > 0 && (
                <div className="bg-gray-100 border border-gray-300 px-4 py-2 rounded-lg text-sm">
                  <span className="font-medium text-gray-700">{data.summary.unreviewed_count}</span>
                  <span className="text-gray-600"> unreviewed ({formatCurrency(data.summary.unreviewed_revenue)})</span>
                </div>
              )}
              {data.summary.excluded_count > 0 && (
                <div className="bg-red-50 border border-red-200 px-4 py-2 rounded-lg text-sm">
                  <span className="font-medium text-red-700">{data.summary.excluded_count}</span>
                  <span className="text-red-600"> excluded ({formatCurrency(data.summary.excluded_revenue)})</span>
                </div>
              )}
            </div>
          )}

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex gap-6">
              {(['summary', 'by-owner', 'by-customer', 'opportunities'] as ViewTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab
                      ? 'border-emerald-500 text-emerald-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab === 'summary' && 'Probability Funnel'}
                  {tab === 'by-owner' && 'By Owner'}
                  {tab === 'by-customer' && 'By Customer'}
                  {tab === 'opportunities' && 'All Opportunities'}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {activeTab === 'summary' && data?.byProbabilityBand && (
              <ProbabilityFunnelView bands={data.byProbabilityBand} />
            )}

            {activeTab === 'by-owner' && data?.byOwner && (
              <ByOwnerTable data={data.byOwner} />
            )}

            {activeTab === 'by-customer' && data?.byCustomer && (
              <ByCustomerTable data={data.byCustomer} />
            )}

            {activeTab === 'opportunities' && (
              <OpportunitiesTable
                opportunities={getFilteredOpportunities()}
                onEditForecast={handleOpenModal}
              />
            )}
          </div>
        </div>
      </div>

      {/* Forecast Modal */}
      <ForecastModal
        opportunity={selectedOpportunity}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveForecast}
        currentUser="Dashboard User"
      />
    </>
  );
}

// Summary Card Component
function SummaryCard({
  title,
  value,
  subtitle,
  color
}: {
  title: string;
  value: string;
  subtitle: string;
  color: 'blue' | 'emerald' | 'green' | 'yellow';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700'
  };

  return (
    <div className={`p-4 rounded-lg border-2 ${colorClasses[color]}`}>
      <div className="text-sm font-medium opacity-75">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      <div className="text-xs mt-1 opacity-75">{subtitle}</div>
    </div>
  );
}

// Probability Funnel View Component
function ProbabilityFunnelView({ bands }: { bands: ForecastByProbabilityBand[] }) {
  const maxRevenue = Math.max(...bands.map(b => b.revenue), 1);

  const bandColors = [
    { bg: 'bg-gray-200', bar: 'bg-gray-500' },
    { bg: 'bg-yellow-100', bar: 'bg-yellow-500' },
    { bg: 'bg-blue-100', bar: 'bg-blue-500' },
    { bg: 'bg-green-100', bar: 'bg-green-500' }
  ];

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Forecast by Probability Band</h3>
      <div className="space-y-4">
        {bands.map((band, index) => (
          <div key={band.band} className={`p-4 rounded-lg ${bandColors[index].bg}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-gray-900">{band.band}</div>
              <div className="text-right">
                <div className="font-bold text-gray-900">{formatCurrency(band.revenue)}</div>
                <div className="text-sm text-gray-600">{band.count} opportunities</div>
              </div>
            </div>
            <div className="h-4 bg-white rounded-full overflow-hidden">
              <div
                className={`h-full ${bandColors[index].bar} transition-all duration-500`}
                style={{ width: `${(band.revenue / maxRevenue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// By Owner Table Component
function ByOwnerTable({ data }: { data: ForecastByOwner[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pipeline</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Weighted</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Commit</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Upside</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Prob</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row) => (
            <tr key={row.owner_name} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {row.owner_name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                {formatCurrency(row.pipeline_revenue)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-600 font-medium text-right">
                {formatCurrency(row.weighted_revenue)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right">
                {formatCurrency(row.commit_revenue)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600 text-right">
                {formatCurrency(row.upside_revenue)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                {formatPercentage(row.avg_probability)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                {row.opportunity_count}
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// By Customer Table Component
function ByCustomerTable({ data }: { data: ForecastByCustomer[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pipeline</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Weighted</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Prob</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.slice(0, 20).map((row) => (
            <tr key={row.organisation_name} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {row.organisation_name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                {formatCurrency(row.pipeline_revenue)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-600 font-medium text-right">
                {formatCurrency(row.weighted_revenue)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                {formatPercentage(row.avg_probability)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                {row.opportunity_count}
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {data.length > 20 && (
        <div className="px-6 py-3 bg-gray-50 text-center text-sm text-gray-500">
          Showing top 20 of {data.length} customers
        </div>
      )}
    </div>
  );
}

// Opportunities Table Component
function OpportunitiesTable({
  opportunities,
  onEditForecast
}: {
  opportunities: OpportunityWithForecast[];
  onEditForecast: (opportunity: OpportunityWithForecast) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opportunity</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Prob</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Weighted</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {opportunities.map((opp) => {
            const probColors = getProbabilityColor(opp.forecast?.probability ?? 0);
            const statusColors = getForecastStatusColor(opp.forecast);
            const statusLabel = getForecastStatusLabel(opp.forecast);

            return (
              <tr key={opp.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                    {opp.subject || opp.name}
                  </div>
                  <div className="text-xs text-gray-500">{opp.owner_name}</div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                  {opp.organisation_name}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                  {opp.starts_at ? new Date(opp.starts_at).toLocaleDateString() : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">
                  {formatCurrency(opp.effective_revenue)}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${probColors.bg} ${probColors.text}`}>
                    {opp.forecast?.probability ?? 0}%
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-emerald-600 font-medium text-right whitespace-nowrap">
                  {formatCurrency(opp.weighted_revenue)}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text}`}>
                    {statusLabel}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => onEditForecast(opp)}
                    className="text-emerald-600 hover:text-emerald-900 text-sm font-medium"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            );
          })}
          {opportunities.length === 0 && (
            <tr>
              <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                No opportunities found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
