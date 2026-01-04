import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function SalesSettings() {
  const router = useRouter();
  const [commitingOrders, setCommitingOrders] = useState(false);
  const [commitResult, setCommitResult] = useState<{
    success: boolean;
    message: string;
    details?: {
      newRecordsCreated: number;
      existingRecordsUpdated: number;
      totalCommitOrders: number;
    };
  } | null>(null);

  const handleCommitOrders = async () => {
    setCommitingOrders(true);
    setCommitResult(null);

    try {
      const response = await fetch('/api/forecast/commit-orders', {
        method: 'POST'
      });
      const result = await response.json();

      if (result.success) {
        setCommitResult({
          success: true,
          message: result.message,
          details: result.details
        });
      } else {
        setCommitResult({
          success: false,
          message: result.error || 'Failed to update orders'
        });
      }
    } catch (error) {
      setCommitResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setCommitingOrders(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sales Settings - Current RMS Watcher</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/settings')}
                className="text-white hover:text-blue-100 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-3xl font-bold">Sales Settings</h1>
                <p className="mt-1 text-blue-100">Configure sales tracking and forecast settings</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Forecast Commit Settings */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white flex-shrink-0">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Forecast Commit Settings</h2>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Automatically mark all opportunities with status &quot;Order&quot; as committed in the sales forecast.
                  This sets the commit flag to true and ensures a minimum 90% probability for accurate forecasting.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleCommitOrders}
                disabled={commitingOrders}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {commitingOrders ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Mark All Orders as Commit
                  </>
                )}
              </button>
            </div>

            {commitResult && (
              <div className={`mt-4 p-4 rounded-lg ${
                commitResult.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className={`font-medium ${
                  commitResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {commitResult.success ? '✓ ' : '✗ '}{commitResult.message}
                </div>
                {commitResult.success && commitResult.details && (
                  <ul className="mt-2 text-sm text-green-700 space-y-1">
                    <li>• New forecast records created: {commitResult.details.newRecordsCreated}</li>
                    <li>• Existing records updated: {commitResult.details.existingRecordsUpdated}</li>
                    <li>• Total orders marked as commit: {commitResult.details.totalCommitOrders}</li>
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Additional Settings Placeholder */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Additional Sales Settings</h2>
            <p className="text-gray-600 mb-6">
              Manage opportunity stages, conversion tracking, and sales team assignments.
            </p>

            <div className="text-center py-8">
              <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Coming Soon</h3>
              <p className="text-gray-500 text-sm">Additional sales settings will be available in a future update.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
