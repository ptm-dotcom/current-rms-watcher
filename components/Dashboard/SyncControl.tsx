import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface SyncStatus {
  lastSync: any;
  history: any[];
}

export function SyncControl() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncType, setSyncType] = useState<'initial' | 'incremental' | null>(null);

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/sync/status');
      const data = await response.json();
      if (data.success) {
        setSyncStatus(data);
      }
    } catch (error) {
      console.error('Error fetching sync status:', error);
    }
  };

  useEffect(() => {
    fetchSyncStatus();
    const interval = setInterval(fetchSyncStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleSync = async (type: 'initial' | 'incremental') => {
    setSyncing(true);
    setSyncType(type);

    try {
      const response = await fetch(`/api/sync/${type}`, { method: 'POST' });
      const data = await response.json();

      if (data.success) {
        alert(`${type === 'initial' ? 'Initial' : 'Incremental'} sync completed!\n\nSynced: ${data.recordsSynced}\nFailed: ${data.recordsFailed}\nDuration: ${data.duration}s`);
        fetchSyncStatus();
      } else {
        alert(`Sync failed: ${data.error || data.message}`);
      }
    } catch (error) {
      console.error('Error during sync:', error);
      alert('Sync failed. Check console for details.');
    } finally {
      setSyncing(false);
      setSyncType(null);
    }
  };

  const lastSync = syncStatus?.lastSync;
  const hasInitialSync = syncStatus?.history?.some(s => s.sync_type === 'initial_sync' && s.status === 'completed');

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Opportunity Sync</h3>

      {/* Sync Status */}
      {lastSync && (
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Last Sync</span>
            <span className={`px-2 py-1 text-xs rounded-full ${
              lastSync.status === 'completed' ? 'bg-green-100 text-green-800' :
              lastSync.status === 'failed' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {lastSync.status}
            </span>
          </div>
          <div className="text-xs text-gray-600 space-y-1">
            <div>Type: {lastSync.sync_type.replace('_', ' ')}</div>
            <div>Started: {formatDistanceToNow(new Date(lastSync.started_at), { addSuffix: true })}</div>
            {lastSync.completed_at && (
              <div>Completed: {formatDistanceToNow(new Date(lastSync.completed_at), { addSuffix: true })}</div>
            )}
            <div>Records synced: {lastSync.records_synced || 0}</div>
            {lastSync.records_failed > 0 && (
              <div className="text-red-600">Failed: {lastSync.records_failed}</div>
            )}
            {lastSync.error && (
              <div className="text-red-600 mt-2">Error: {lastSync.error}</div>
            )}
          </div>
        </div>
      )}

      {/* Sync Buttons */}
      <div className="space-y-3">
        {!hasInitialSync && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800 mb-3">
            <strong>First-time setup:</strong> Click "Initial Sync" to load all opportunities from -30 days to +1 year.
          </div>
        )}

        <button
          onClick={() => handleSync('initial')}
          disabled={syncing}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {syncing && syncType === 'initial' ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Syncing...
            </span>
          ) : (
            'Initial Sync (Full Load)'
          )}
        </button>

        <button
          onClick={() => handleSync('incremental')}
          disabled={syncing || !hasInitialSync}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          title={!hasInitialSync ? 'Run Initial Sync first' : ''}
        >
          {syncing && syncType === 'incremental' ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Syncing...
            </span>
          ) : (
            'Incremental Sync (Updates Only)'
          )}
        </button>
      </div>

      {/* Info Text */}
      <div className="mt-4 text-xs text-gray-500">
        <p><strong>Initial Sync:</strong> Loads all opportunities from -30 days to +1 year.</p>
        <p className="mt-1"><strong>Incremental Sync:</strong> Updates opportunities changed since last sync.</p>
        <p className="mt-1"><strong>Webhooks:</strong> Auto-sync individual opportunities on events.</p>
      </div>

      {/* Sync History */}
      {syncStatus?.history && syncStatus.history.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Syncs</h4>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {syncStatus.history.slice(0, 5).map((sync) => (
              <div key={sync.id} className="text-xs flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-gray-600">
                  {sync.sync_type.replace('_', ' ')} - {sync.records_synced || 0} records
                </span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  sync.status === 'completed' ? 'bg-green-100 text-green-700' :
                  sync.status === 'failed' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {sync.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
