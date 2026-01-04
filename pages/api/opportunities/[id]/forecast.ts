// API Route: /api/opportunities/[id]/forecast
// GET, POST, PATCH, DELETE for individual opportunity forecast metadata

import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';
import { ForecastMetadata } from '@/types/forecast';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const opportunityId = parseInt(id as string, 10);

  if (isNaN(opportunityId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid opportunity ID'
    });
  }

  if (!process.env.POSTGRES_URL) {
    return res.status(500).json({
      success: false,
      error: 'Database not configured'
    });
  }

  try {
    switch (req.method) {
      case 'GET':
        return handleGet(opportunityId, res);
      case 'POST':
      case 'PATCH':
        return handleUpsert(opportunityId, req, res);
      case 'DELETE':
        return handleDelete(opportunityId, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error(`[ForecastAPI] Error handling forecast for opportunity ${opportunityId}:`, error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleGet(opportunityId: number, res: NextApiResponse) {
  try {
    const result = await sql`
      SELECT
        opportunity_id,
        probability,
        is_commit,
        revenue_override,
        profit_override,
        is_excluded,
        exclusion_reason,
        notes,
        last_reviewed_at,
        reviewed_by,
        created_at,
        updated_at
      FROM forecast_metadata
      WHERE opportunity_id = ${opportunityId}
    `;

    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        forecast: null,
        message: 'No forecast metadata found for this opportunity'
      });
    }

    return res.status(200).json({
      success: true,
      forecast: result.rows[0] as ForecastMetadata
    });
  } catch (error: any) {
    // Handle table not existing
    if (error?.code === '42P01') {
      return res.status(200).json({
        success: true,
        forecast: null,
        needsMigration: true,
        message: 'forecast_metadata table does not exist'
      });
    }
    throw error;
  }
}

async function handleUpsert(
  opportunityId: number,
  req: NextApiRequest,
  res: NextApiResponse
) {
  const {
    probability,
    is_commit,
    revenue_override,
    profit_override,
    is_excluded,
    exclusion_reason,
    notes,
    reviewed_by
  } = req.body;

  // Validate probability
  if (probability !== undefined && probability !== null) {
    const prob = parseInt(probability, 10);
    if (isNaN(prob) || prob < 0 || prob > 100) {
      return res.status(400).json({
        success: false,
        error: 'Probability must be between 0 and 100'
      });
    }
  }

  // Validate that if excluded, a reason should be provided
  if (is_excluded && !exclusion_reason) {
    return res.status(400).json({
      success: false,
      error: 'Exclusion reason is required when marking as excluded'
    });
  }

  const now = new Date().toISOString();

  try {
    await sql`
      INSERT INTO forecast_metadata (
        opportunity_id,
        probability,
        is_commit,
        revenue_override,
        profit_override,
        is_excluded,
        exclusion_reason,
        notes,
        last_reviewed_at,
        reviewed_by,
        updated_at
      ) VALUES (
        ${opportunityId},
        ${probability ?? 0},
        ${is_commit ?? false},
        ${revenue_override ?? null},
        ${profit_override ?? null},
        ${is_excluded ?? false},
        ${exclusion_reason ?? null},
        ${notes ?? null},
        ${now},
        ${reviewed_by ?? null},
        ${now}
      )
      ON CONFLICT (opportunity_id) DO UPDATE SET
        probability = ${probability ?? 0},
        is_commit = ${is_commit ?? false},
        revenue_override = ${revenue_override ?? null},
        profit_override = ${profit_override ?? null},
        is_excluded = ${is_excluded ?? false},
        exclusion_reason = ${exclusion_reason ?? null},
        notes = ${notes ?? null},
        last_reviewed_at = ${now},
        reviewed_by = ${reviewed_by ?? null},
        updated_at = ${now}
    `;

    // Fetch the updated record
    const result = await sql`
      SELECT * FROM forecast_metadata
      WHERE opportunity_id = ${opportunityId}
    `;

    return res.status(200).json({
      success: true,
      message: 'Forecast metadata saved successfully',
      forecast: result.rows[0]
    });
  } catch (error: any) {
    // Handle table not existing
    if (error?.code === '42P01') {
      return res.status(400).json({
        success: false,
        error: 'Database migration required',
        needsMigration: true,
        message: 'Run POST /api/migrate-database to create the forecast_metadata table'
      });
    }
    throw error;
  }
}

async function handleDelete(opportunityId: number, res: NextApiResponse) {
  try {
    const result = await sql`
      DELETE FROM forecast_metadata
      WHERE opportunity_id = ${opportunityId}
      RETURNING *
    `;

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Forecast metadata not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Forecast metadata deleted successfully'
    });
  } catch (error: any) {
    if (error?.code === '42P01') {
      return res.status(200).json({
        success: true,
        message: 'No forecast metadata to delete (table does not exist)'
      });
    }
    throw error;
  }
}
