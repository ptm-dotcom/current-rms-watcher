// API Route: /api/sync/incremental
// Perform incremental sync of updated opportunities

import { NextApiRequest, NextApiResponse } from 'next';
import { opportunitySync } from '@/lib/opportunitySync';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[API] Starting incremental opportunity sync');

    const result = await opportunitySync.incrementalSync();

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Incremental sync completed successfully',
        syncId: result.syncId,
        recordsSynced: result.recordsSynced,
        recordsFailed: result.recordsFailed,
        duration: result.completedAt
          ? Math.round((result.completedAt.getTime() - result.startedAt.getTime()) / 1000)
          : null
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Incremental sync failed',
        error: result.error,
        recordsSynced: result.recordsSynced,
        recordsFailed: result.recordsFailed
      });
    }
  } catch (error) {
    console.error('[API] Error during incremental sync:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
