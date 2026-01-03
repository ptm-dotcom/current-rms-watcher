// API Route: /api/debug
// Provides diagnostic information about the webhook system

import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasSubdomain: !!process.env.CURRENT_RMS_SUBDOMAIN,
        hasApiKey: !!process.env.CURRENT_RMS_API_KEY,
        hasWebhookSecret: !!process.env.WEBHOOK_SECRET,
      },
      endpoints: {
        webhook: `https://${req.headers.host}/api/webhook`,
        health: `https://${req.headers.host}/api/health`,
        events: `https://${req.headers.host}/api/events`,
      },
      server: {
        host: req.headers.host,
        platform: process.platform,
        nodeVersion: process.version,
      }
    };

    return res.status(200).json({
      success: true,
      diagnostics
    });

  } catch (error) {
    console.error('Error retrieving diagnostics:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
