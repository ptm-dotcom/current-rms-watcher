// API Route: /api/forecast/commit-orders
// Force all opportunities with status "Order" to have is_commit = true

import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!process.env.POSTGRES_URL) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    // First, ensure forecast_metadata records exist for all orders
    // Insert new records for orders that don't have forecast_metadata yet
    const insertResult = await sql`
      INSERT INTO forecast_metadata (opportunity_id, probability, is_commit, is_excluded)
      SELECT o.id, 100, true, false
      FROM opportunities o
      LEFT JOIN forecast_metadata fm ON o.id = fm.opportunity_id
      WHERE LOWER(o.opportunity_status) = 'order'
        AND fm.opportunity_id IS NULL
      ON CONFLICT (opportunity_id) DO NOTHING
    `;

    const insertedCount = insertResult.rowCount || 0;

    // Update existing forecast_metadata records for orders to set is_commit = true
    const updateResult = await sql`
      UPDATE forecast_metadata fm
      SET
        is_commit = true,
        probability = GREATEST(probability, 90)
      FROM opportunities o
      WHERE fm.opportunity_id = o.id
        AND LOWER(o.opportunity_status) = 'order'
        AND (fm.is_commit = false OR fm.probability < 90)
    `;

    const updatedCount = updateResult.rowCount || 0;

    // Get total count of orders now marked as commit
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM opportunities o
      INNER JOIN forecast_metadata fm ON o.id = fm.opportunity_id
      WHERE LOWER(o.opportunity_status) = 'order'
        AND fm.is_commit = true
    `;

    const totalCommitOrders = parseInt(countResult.rows[0]?.total || '0', 10);

    return res.status(200).json({
      success: true,
      message: `Successfully marked orders as commit`,
      details: {
        newRecordsCreated: insertedCount,
        existingRecordsUpdated: updatedCount,
        totalCommitOrders
      }
    });

  } catch (error) {
    console.error('[CommitOrders] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update orders',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
