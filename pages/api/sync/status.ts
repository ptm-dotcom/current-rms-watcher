// API Route: /api/sync/status
// Get sync status and history

import { NextApiRequest, NextApiResponse } from 'next';
import { opportunitySync } from '@/lib/opportunitySync';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const [lastSync, history] = await Promise.all([
      opportunitySync.getLastSyncStatus(),
      opportunitySync.getSyncHistory(10)
    ]);

    return res.status(200).json({
      success: true,
      lastSync,
      history
    });
  } catch (error) {
    console.error('[API] Error fetching sync status:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
