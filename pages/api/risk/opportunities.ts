// API Route: /api/risk/opportunities
// Get opportunities by risk level

import { NextApiRequest, NextApiResponse } from 'next';
import { eventStore } from '@/lib/eventStorePostgres';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { level, limit } = req.query;

  // Parse level (can be null for unscored)
  const riskLevel = level === 'null' || level === '' ? null : (level as string);
  const maxLimit = limit ? parseInt(limit as string) : 100;

  try {
    const opportunities = await eventStore.getOpportunitiesByRiskLevel(riskLevel, maxLimit);

    return res.status(200).json({
      success: true,
      data: opportunities,
      count: opportunities.length
    });
  } catch (error) {
    console.error('[RiskAPI] Error fetching opportunities by risk level:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
