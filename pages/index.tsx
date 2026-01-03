import { useState, useEffect } from 'react';
import Head from 'next/head';
import { ProcessedEvent, HealthMetrics } from '@/types';
import { formatDistanceToNow } from 'date-fns';

export default function Dashboard() {
  const [events, setEvents] = useState<ProcessedEvent[]>([]);
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [testWebhookStatus, setTestWebhookStatus] = useState<string>('');

  const fetchData = async () => {
    try {
      const [eventsRes, metricsRes] = await Promise.all([
        fetch('/api/events?limit=50'),
        fetch('/api/health')
      ]);

      const eventsData = await eventsRes.json();
      const metricsData = await metricsRes.json();

      setEvents(eventsData.events || []);
      setMetrics(metricsData.metrics || null);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const fetchDebugInfo = async () => {
    try {
      const response = await fetch('/api/debug');
      const data = await response.json();
      setDebugInfo(data.diagnostics);
      setShowDebug(true);
    } catch (error) {
      console.error('Error fetching debug info:', error);
    }
  };

  const sendTestWebhook = async () => {
    setTestWebhookStatus('sending');
    try {
      const response = await fetch('/api/test-webhook', { method: 'POST' });
      const data = await response.json();

      if (data.success) {
        setTestWebhookStatus('success');
        setTimeout(() => {
          setTestWebhookStatus('');
          fetchData(); // Refresh to show the new test event
        }, 2000);
      } else {
        setTestWebhookStatus('error');
        setTimeout(() => setTestWebhookStatus(''), 3000);
      }
    } catch (error) {
      console.error('Error sending test webhook:', error);
      setTestWebhookStatus('error');
      setTimeout(() => setTestWebhookStatus(''), 3000);
    }
  };

  useEffect(() => {
    fetchData();

    if (autoRefresh) {
      const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const getActionTypeColor = (actionType: string): string => {
    const statusColors: Record<string, string> = {
      'convert_to_order': 'bg-green-100 text-green-800',
      'mark_as_reserved': 'bg-blue-100 text-blue-800',
      'mark_as_lost': 'bg-red-100 text-red-800',
      'mark_as_dead': 'bg-gray-100 text-gray-800',
      'update': 'bg-yellow-100 text-yellow-800',
      'create': 'bg-purple-100 text-purple-800',
      'cancel': 'bg-orange-100 text-orange-800'
    };
    return statusColors[actionType] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Current RMS Watcher - Health Dashboard</title>
        <meta name="description" content="Monitor Current RMS opportunity changes in real-time" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Current RMS Watcher</h1>
                <p className="mt-1 text-sm text-gray-500">Monitoring opportunity stage changes</p>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Auto-refresh (5s)
                </label>
                <button
                  onClick={sendTestWebhook}
                  disabled={testWebhookStatus === 'sending'}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testWebhookStatus === 'sending' ? 'Sending...' : testWebhookStatus === 'success' ? '✓ Sent!' : 'Test Webhook'}
                </button>
                <button
                  onClick={fetchDebugInfo}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Debug Info
                </button>
                <button
                  onClick={fetchData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Refresh Now
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500">Status</div>
              <div className="mt-2 flex items-center">
                <div className="flex-1">
                  <div className="text-2xl font-bold text-green-600">Healthy</div>
                </div>
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500">Total Events</div>
              <div className="mt-2 text-2xl font-bold text-gray-900">
                {metrics?.totalEvents || 0}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500">Successful</div>
              <div className="mt-2 text-2xl font-bold text-green-600">
                {metrics?.successfulEvents || 0}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500">Failed</div>
              <div className="mt-2 text-2xl font-bold text-red-600">
                {metrics?.failedEvents || 0}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500">Uptime</div>
              <div className="mt-2 text-lg font-bold text-gray-900">
                {metrics ? formatUptime(metrics.uptime) : '0h 0m 0s'}
              </div>
            </div>
          </div>

          {/* Debug Panel */}
          {showDebug && debugInfo && (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Debug Information</h2>
                <button
                  onClick={() => setShowDebug(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Environment */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Environment Configuration</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Node Environment:</span>
                      <span className="font-mono">{debugInfo.environment.nodeEnv}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">RMS Subdomain Set:</span>
                      <span className={debugInfo.environment.hasSubdomain ? 'text-green-600' : 'text-red-600'}>
                        {debugInfo.environment.hasSubdomain ? '✓ Yes' : '✗ No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">API Key Set:</span>
                      <span className={debugInfo.environment.hasApiKey ? 'text-green-600' : 'text-red-600'}>
                        {debugInfo.environment.hasApiKey ? '✓ Yes' : '✗ No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Webhook Secret Set:</span>
                      <span className={debugInfo.environment.hasWebhookSecret ? 'text-green-600' : 'text-yellow-600'}>
                        {debugInfo.environment.hasWebhookSecret ? '✓ Yes' : '⚠ Optional'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Endpoints */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">API Endpoints</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Webhook URL:</span>
                      <div className="font-mono text-xs bg-gray-100 p-2 rounded mt-1 break-all">
                        {debugInfo.endpoints.webhook}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Health Check:</span>
                      <div className="font-mono text-xs bg-gray-100 p-2 rounded mt-1 break-all">
                        {debugInfo.endpoints.health}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Server Info */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Server Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Host:</span>
                      <span className="font-mono text-xs">{debugInfo.server.host}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Platform:</span>
                      <span className="font-mono">{debugInfo.server.platform}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Node Version:</span>
                      <span className="font-mono">{debugInfo.server.nodeVersion}</span>
                    </div>
                  </div>
                </div>

                {/* Troubleshooting */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Troubleshooting</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    {!debugInfo.environment.hasSubdomain || !debugInfo.environment.hasApiKey ? (
                      <div className="bg-red-50 border border-red-200 rounded p-3">
                        <p className="text-red-800 font-medium">⚠ Missing Configuration</p>
                        <p className="text-red-700 text-xs mt-1">
                          Set environment variables in Vercel dashboard:
                          {!debugInfo.environment.hasSubdomain && <span className="block">• CURRENT_RMS_SUBDOMAIN</span>}
                          {!debugInfo.environment.hasApiKey && <span className="block">• CURRENT_RMS_API_KEY</span>}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-green-50 border border-green-200 rounded p-3">
                        <p className="text-green-800 font-medium">✓ Configuration OK</p>
                        <p className="text-green-700 text-xs mt-1">
                          Environment variables are properly set.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Events Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Events</h2>
              <p className="text-sm text-gray-500 mt-1">
                {events.length > 0 
                  ? `Last event: ${formatDistanceToNow(new Date(events[0].timestamp), { addSuffix: true })}`
                  : 'No events received yet'
                }
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Opportunity ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {events.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center">
                          <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                          <p className="text-lg font-medium">No events yet</p>
                          <p className="text-sm mt-2">Webhook endpoint: <code className="bg-gray-100 px-2 py-1 rounded">/api/webhook</code></p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    events.map((event) => (
                      <tr key={event.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(event.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{event.opportunityId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {event.customerName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          #{event.userId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {event.userName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionTypeColor(event.actionType)}`}>
                            {event.actionType}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {event.error ? (
                            <span className="flex items-center text-red-600">
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                              Failed
                            </span>
                          ) : event.processed ? (
                            <span className="flex items-center text-green-600">
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Processed
                            </span>
                          ) : (
                            <span className="flex items-center text-yellow-600">
                              <svg className="w-4 h-4 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
