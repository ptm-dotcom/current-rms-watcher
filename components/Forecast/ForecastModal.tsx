import React, { useState, useEffect } from 'react';
import {
  ForecastMetadata,
  OpportunityWithForecast,
  EXCLUSION_REASONS
} from '@/types/forecast';
import {
  calculateBaseProfit,
  calculateMargin,
  getEffectiveRevenue,
  getEffectiveProfit,
  calculateWeightedValue,
  getProbabilityColor,
  formatCurrency,
  formatMargin
} from '@/lib/forecastCalculation';

interface ForecastModalProps {
  opportunity: OpportunityWithForecast | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (opportunityId: number, forecastData: Partial<ForecastMetadata>) => Promise<void>;
  currentUser?: string;
}

export function ForecastModal({
  opportunity,
  isOpen,
  onClose,
  onSave,
  currentUser = 'Unknown'
}: ForecastModalProps) {
  const [probability, setProbability] = useState<number>(0);
  const [isCommit, setIsCommit] = useState<boolean>(false);
  const [revenueOverride, setRevenueOverride] = useState<string>('');
  const [profitOverride, setProfitOverride] = useState<string>('');
  const [isExcluded, setIsExcluded] = useState<boolean>(false);
  const [exclusionReason, setExclusionReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [lastReviewedAt, setLastReviewedAt] = useState<string | null>(null);
  const [reviewedBy, setReviewedBy] = useState<string | null>(null);

  // Load existing forecast data when opportunity changes
  useEffect(() => {
    if (opportunity?.forecast) {
      const f = opportunity.forecast;
      setProbability(f.probability ?? 0);
      setIsCommit(f.is_commit ?? false);
      setRevenueOverride(f.revenue_override?.toString() ?? '');
      setProfitOverride(f.profit_override?.toString() ?? '');
      setIsExcluded(f.is_excluded ?? false);
      setExclusionReason(f.exclusion_reason ?? '');
      setNotes(f.notes ?? '');
      setLastReviewedAt(f.last_reviewed_at ?? null);
      setReviewedBy(f.reviewed_by ?? null);
    } else {
      // Reset to defaults
      setProbability(0);
      setIsCommit(false);
      setRevenueOverride('');
      setProfitOverride('');
      setIsExcluded(false);
      setExclusionReason('');
      setNotes('');
      setLastReviewedAt(null);
      setReviewedBy(null);
    }
  }, [opportunity]);

  if (!isOpen || !opportunity) return null;

  // Calculate values for display
  const baseRevenue = opportunity.charge_total;
  const baseCost = opportunity.provisional_cost_total;
  const baseProfit = calculateBaseProfit(baseRevenue, baseCost);
  const baseMargin = calculateMargin(baseProfit, baseRevenue);

  const effectiveRevenue = revenueOverride
    ? parseFloat(revenueOverride)
    : baseRevenue;
  const effectiveProfit = profitOverride
    ? parseFloat(profitOverride)
    : baseProfit;

  const weightedRevenue = calculateWeightedValue(effectiveRevenue, probability);
  const weightedProfit = calculateWeightedValue(effectiveProfit, probability);

  const probColors = getProbabilityColor(probability);

  const handleSave = async () => {
    if (isExcluded && !exclusionReason) {
      alert('Please provide a reason for exclusion');
      return;
    }

    setSaving(true);
    try {
      const forecastData: Partial<ForecastMetadata> = {
        probability,
        is_commit: isCommit,
        revenue_override: revenueOverride ? parseFloat(revenueOverride) : null,
        profit_override: profitOverride ? parseFloat(profitOverride) : null,
        is_excluded: isExcluded,
        exclusion_reason: isExcluded ? exclusionReason : null,
        notes: notes || null,
        reviewed_by: currentUser
      };

      await onSave(opportunity.id, forecastData);
      onClose();
    } catch (error) {
      console.error('Error saving forecast:', error);
      alert('Failed to save forecast. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Probability slider presets
  const probabilityPresets = [0, 25, 50, 75, 100];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Sales Forecast</h2>
              <p className="text-sm text-gray-600 mt-1">
                {opportunity.subject || opportunity.name} - {opportunity.organisation_name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Summary Box */}
        <div className={`mx-6 mt-6 p-4 rounded-lg border-2 ${probColors.border} ${probColors.bg}`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm font-medium text-gray-600">Probability</div>
              <div className={`text-3xl font-bold ${probColors.text}`}>
                {probability}%
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Weighted Revenue</div>
              <div className={`text-2xl font-bold ${probColors.text}`}>
                {formatCurrency(weightedRevenue)}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Weighted Profit</div>
              <div className={`text-2xl font-bold ${probColors.text}`}>
                {formatCurrency(weightedProfit)}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Status</div>
              <div className={`text-xl font-bold ${probColors.text}`}>
                {isExcluded ? 'EXCLUDED' : isCommit ? 'COMMIT' : 'UPSIDE'}
              </div>
            </div>
          </div>
          {lastReviewedAt && (
            <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
              Last reviewed: {new Date(lastReviewedAt).toLocaleString()}
              {reviewedBy && ` by ${reviewedBy}`}
            </div>
          )}
        </div>

        {/* Base Values Reference */}
        <div className="mx-6 mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">CurrentRMS Values</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Revenue:</span>{' '}
              <span className="font-medium">{formatCurrency(baseRevenue)}</span>
            </div>
            <div>
              <span className="text-gray-500">Prov. Cost:</span>{' '}
              <span className="font-medium">{formatCurrency(baseCost)}</span>
            </div>
            <div>
              <span className="text-gray-500">Profit:</span>{' '}
              <span className="font-medium">{formatCurrency(baseProfit)}</span>
            </div>
            <div>
              <span className="text-gray-500">Margin:</span>{' '}
              <span className="font-medium">{formatMargin(baseMargin)}</span>
            </div>
          </div>
        </div>

        {/* Probability Section */}
        <div className="px-6 py-6">
          <h3 className="text-lg font-semibold mb-4">Probability</h3>
          <div className="space-y-4">
            {/* Slider */}
            <div>
              <input
                type="range"
                min="0"
                max="100"
                value={probability}
                onChange={(e) => setProbability(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Preset buttons */}
            <div className="flex gap-2">
              {probabilityPresets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setProbability(preset)}
                  className={`flex-1 px-3 py-2 text-sm rounded border-2 transition-colors ${
                    probability === preset
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {preset}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Commit vs Upside */}
        <div className="px-6 pb-6">
          <h3 className="text-lg font-semibold mb-4">Forecast Classification</h3>
          <div className="flex gap-4">
            <button
              onClick={() => setIsCommit(true)}
              disabled={isExcluded}
              className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                isCommit && !isExcluded
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              } ${isExcluded ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="font-semibold text-lg">Commit</div>
              <div className="text-sm opacity-75">High confidence - will close</div>
            </button>
            <button
              onClick={() => setIsCommit(false)}
              disabled={isExcluded}
              className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                !isCommit && !isExcluded
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              } ${isExcluded ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="font-semibold text-lg">Upside</div>
              <div className="text-sm opacity-75">Stretch target - possible</div>
            </button>
          </div>
        </div>

        {/* Overrides */}
        <div className="px-6 pb-6">
          <h3 className="text-lg font-semibold mb-4">Management Overrides (Optional)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Revenue Override
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  value={revenueOverride}
                  onChange={(e) => setRevenueOverride(e.target.value)}
                  placeholder={baseRevenue.toString()}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Leave blank to use CurrentRMS value
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profit Override
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  value={profitOverride}
                  onChange={(e) => setProfitOverride(e.target.value)}
                  placeholder={baseProfit.toString()}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Leave blank to use calculated profit
              </p>
            </div>
          </div>
        </div>

        {/* Exclusion */}
        <div className="px-6 pb-6 border-t border-gray-200 pt-6">
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="isExcluded"
              checked={isExcluded}
              onChange={(e) => {
                setIsExcluded(e.target.checked);
                if (!e.target.checked) {
                  setExclusionReason('');
                }
              }}
              className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <label htmlFor="isExcluded" className="ml-2 text-sm font-medium text-gray-700">
              Exclude from Forecast
            </label>
          </div>

          {isExcluded && (
            <div className="ml-6 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exclusion Reason
                </label>
                <select
                  value={exclusionReason}
                  onChange={(e) => setExclusionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">Select a reason...</option>
                  {EXCLUSION_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>
              {exclusionReason === 'Other' && (
                <input
                  type="text"
                  placeholder="Specify reason..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              )}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="px-6 pb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Add management commentary..."
          />
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save Forecast'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
