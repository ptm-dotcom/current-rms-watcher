// API Route: /api/test-webhook
// Sends a test webhook to verify the system is working

import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create a test webhook payload
    const testPayload = {
      action: {
        id: Math.floor(Math.random() * 10000),
        subject_id: 99999,
        subject_type: 'Opportunity',
        member_id: 1,
        action_type: 'update',
        name: 'Test Opportunity',
        member: {
          id: 1,
          name: 'Test User'
        },
        subject: {
          name: 'Test Opportunity',
          organisation_name: 'Test Customer',
          opportunity_status: 'Provisional'
        }
      }
    };

    // Send the test webhook to our own endpoint
    const baseUrl = `https://${req.headers.host}`;
    const webhookUrl = `${baseUrl}/api/webhook`;

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    const responseData = await response.json();

    return res.status(200).json({
      success: true,
      message: 'Test webhook sent successfully',
      webhookResponse: responseData,
      testPayload
    });

  } catch (error) {
    console.error('Error sending test webhook:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
