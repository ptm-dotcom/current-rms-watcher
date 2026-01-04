// API Route: /api/forecast/export
// Export forecast data as CSV

import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';
import { enrichOpportunityWithForecast } from '@/lib/forecastCalculation';
import { ForecastMetadata } from '@/types/forecast';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!process.env.POSTGRES_URL) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    // Parse query parameters
    const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
    const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
    const includeExcluded = req.query.includeExcluded === 'true';

    // Build query
    let opportunitiesResult;

    try {
      if (startDate && endDate) {
        opportunitiesResult = await sql`
          SELECT
            o.id,
            o.name,
            o.subject,
            o.organisation_name,
            o.owner_name,
            o.starts_at,
            o.ends_at,
            o.opportunity_status,
            o.charge_total,
            o.provisional_cost_total,
            o.predicted_cost_total,
            o.actual_cost_total,
            fm.probability,
            fm.is_commit,
            fm.revenue_override,
            fm.profit_override,
            fm.is_excluded,
            fm.exclusion_reason,
            fm.notes,
            fm.last_reviewed_at,
            fm.reviewed_by
          FROM opportunities o
          LEFT JOIN forecast_metadata fm ON o.id = fm.opportunity_id
          WHERE o.starts_at >= ${startDate}::date
            AND o.starts_at <= ${endDate}::date
          ORDER BY o.starts_at ASC
        `;
      } else {
        // Default: future opportunities
        opportunitiesResult = await sql`
          SELECT
            o.id,
            o.name,
            o.subject,
            o.organisation_name,
            o.owner_name,
            o.starts_at,
            o.ends_at,
            o.opportunity_status,
            o.charge_total,
            o.provisional_cost_total,
            o.predicted_cost_total,
            o.actual_cost_total,
            fm.probability,
            fm.is_commit,
            fm.revenue_override,
            fm.profit_override,
            fm.is_excluded,
            fm.exclusion_reason,
            fm.notes,
            fm.last_reviewed_at,
            fm.reviewed_by
          FROM opportunities o
          LEFT JOIN forecast_metadata fm ON o.id = fm.opportunity_id
          WHERE o.starts_at >= CURRENT_DATE - INTERVAL '30 days'
          ORDER BY o.starts_at ASC
        `;
      }
    } catch (dbError: any) {
      // Handle missing table
      if (dbError?.code === '42P01') {
        if (startDate && endDate) {
          opportunitiesResult = await sql`
            SELECT
              id, name, subject, organisation_name, owner_name,
              starts_at, ends_at, opportunity_status, charge_total,
              provisional_cost_total, predicted_cost_total, actual_cost_total,
              NULL as probability, NULL as is_commit, NULL as revenue_override,
              NULL as profit_override, NULL as is_excluded, NULL as exclusion_reason,
              NULL as notes, NULL as last_reviewed_at, NULL as reviewed_by
            FROM opportunities
            WHERE starts_at >= ${startDate}::date AND starts_at <= ${endDate}::date
            ORDER BY starts_at ASC
          `;
        } else {
          opportunitiesResult = await sql`
            SELECT
              id, name, subject, organisation_name, owner_name,
              starts_at, ends_at, opportunity_status, charge_total,
              provisional_cost_total, predicted_cost_total, actual_cost_total,
              NULL as probability, NULL as is_commit, NULL as revenue_override,
              NULL as profit_override, NULL as is_excluded, NULL as exclusion_reason,
              NULL as notes, NULL as last_reviewed_at, NULL as reviewed_by
            FROM opportunities
            WHERE starts_at >= CURRENT_DATE - INTERVAL '30 days'
            ORDER BY starts_at ASC
          `;
        }
      } else {
        throw dbError;
      }
    }

    // Transform and enrich opportunities
    let opportunities = opportunitiesResult.rows.map(row => {
      const typedRow = row as {
        id: number;
        name: string;
        subject?: string;
        organisation_name?: string;
        owner_name?: string;
        starts_at?: string;
        ends_at?: string;
        opportunity_status?: string;
        charge_total?: string | number | null;
        provisional_cost_total?: string | number | null;
        predicted_cost_total?: string | number | null;
        actual_cost_total?: string | number | null;
        probability?: number | null;
        is_commit?: boolean | null;
        revenue_override?: number | null;
        profit_override?: number | null;
        is_excluded?: boolean | null;
        exclusion_reason?: string | null;
        notes?: string | null;
        last_reviewed_at?: string | null;
        reviewed_by?: string | null;
      };

      const forecast: ForecastMetadata | null = typedRow.probability !== null && typedRow.probability !== undefined ? {
        opportunity_id: typedRow.id,
        probability: typedRow.probability,
        is_commit: typedRow.is_commit ?? false,
        revenue_override: typedRow.revenue_override ?? null,
        profit_override: typedRow.profit_override ?? null,
        is_excluded: typedRow.is_excluded ?? false,
        exclusion_reason: typedRow.exclusion_reason ?? null,
        notes: typedRow.notes ?? null,
        last_reviewed_at: typedRow.last_reviewed_at ?? null,
        reviewed_by: typedRow.reviewed_by ?? null
      } : null;

      return enrichOpportunityWithForecast(typedRow, forecast);
    });

    // Filter excluded if needed
    if (!includeExcluded) {
      opportunities = opportunities.filter(o => !o.forecast?.is_excluded);
    }

    // Generate CSV
    const headers = [
      'ID',
      'Name',
      'Subject',
      'Customer',
      'Owner',
      'Start Date',
      'End Date',
      'Status',
      'Base Revenue',
      'Provisional Cost',
      'Base Profit',
      'Base Margin',
      'Probability',
      'Is Commit',
      'Revenue Override',
      'Profit Override',
      'Effective Revenue',
      'Effective Profit',
      'Weighted Revenue',
      'Weighted Profit',
      'Is Excluded',
      'Exclusion Reason',
      'Notes',
      'Last Reviewed',
      'Reviewed By'
    ];

    const csvRows = [headers.join(',')];

    for (const opp of opportunities) {
      const row = [
        opp.id,
        escapeCsvField(opp.name),
        escapeCsvField(opp.subject || ''),
        escapeCsvField(opp.organisation_name || ''),
        escapeCsvField(opp.owner_name || ''),
        opp.starts_at ? new Date(opp.starts_at).toISOString().split('T')[0] : '',
        opp.ends_at ? new Date(opp.ends_at).toISOString().split('T')[0] : '',
        escapeCsvField(opp.opportunity_status || ''),
        opp.charge_total.toFixed(2),
        opp.provisional_cost_total.toFixed(2),
        opp.base_profit.toFixed(2),
        (opp.base_margin * 100).toFixed(1) + '%',
        opp.forecast?.probability ?? 0,
        opp.forecast?.is_commit ? 'Yes' : 'No',
        opp.forecast?.revenue_override?.toFixed(2) ?? '',
        opp.forecast?.profit_override?.toFixed(2) ?? '',
        opp.effective_revenue.toFixed(2),
        opp.effective_profit.toFixed(2),
        opp.weighted_revenue.toFixed(2),
        opp.weighted_profit.toFixed(2),
        opp.forecast?.is_excluded ? 'Yes' : 'No',
        escapeCsvField(opp.forecast?.exclusion_reason || ''),
        escapeCsvField(opp.forecast?.notes || ''),
        opp.forecast?.last_reviewed_at ? new Date(opp.forecast.last_reviewed_at).toISOString() : '',
        escapeCsvField(opp.forecast?.reviewed_by || '')
      ];

      csvRows.push(row.join(','));
    }

    const csv = csvRows.join('\n');

    // Set headers for file download
    const filename = `forecast-export-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return res.status(200).send(csv);

  } catch (error) {
    console.error('[ForecastExport] Error exporting forecast:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
