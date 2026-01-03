// API Route: /api/webhook-test-detailed
// Detailed webhook test with full diagnostic output

import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const diagnostics: any = {
    step1_payload_creation: {},
    step2_webhook_call: {},
    step3_database_check: {},
    step4_event_retrieval: {}
  };

  try {
    // Step 1: Create test payload
    diagnostics.step1_payload_creation.status = 'creating';
    const testPayload = {
      action: {
        id: Math.floor(Math.random() * 10000),
        subject_id: 88888,
        subject_type: 'Opportunity',
        member_id: 1,
        action_type: 'test_update',
        name: `Test Webhook ${new Date().toISOString()}`,
        member: {
          id: 1,
          name: 'Test User (Debug)'
        },
        subject: {
          name: `Test Opportunity ${new Date().toISOString()}`,
          organisation_name: 'Debug Test Customer',
          opportunity_status: 'Testing'
        }
      }
    };
    diagnostics.step1_payload_creation.status = 'success';
    diagnostics.step1_payload_creation.payload = testPayload;

    // Step 2: Call webhook endpoint
    diagnostics.step2_webhook_call.status = 'calling';
    const baseUrl = `https://${req.headers.host}`;
    const webhookUrl = `${baseUrl}/api/webhook`;
    diagnostics.step2_webhook_call.url = webhookUrl;

    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    diagnostics.step2_webhook_call.status_code = webhookResponse.status;
    diagnostics.step2_webhook_call.status_ok = webhookResponse.ok;

    const webhookData = await webhookResponse.json();
    diagnostics.step2_webhook_call.response = webhookData;
    diagnostics.step2_webhook_call.status = webhookResponse.ok ? 'success' : 'failed';

    // Step 3: Check database
    diagnostics.step3_database_check.status = 'checking';
    diagnostics.step3_database_check.has_postgres_url = !!process.env.POSTGRES_URL;

    if (!process.env.POSTGRES_URL) {
      diagnostics.step3_database_check.status = 'warning';
      diagnostics.step3_database_check.message = 'No POSTGRES_URL configured - events not being saved';
    } else {
      diagnostics.step3_database_check.status = 'configured';
    }

    // Step 4: Try to retrieve recent events
    diagnostics.step4_event_retrieval.status = 'retrieving';
    try {
      const eventsResponse = await fetch(`${baseUrl}/api/events?limit=10`);
      const eventsData = await eventsResponse.json();

      diagnostics.step4_event_retrieval.status = eventsResponse.ok ? 'success' : 'failed';
      diagnostics.step4_event_retrieval.count = eventsData.count || 0;
      diagnostics.step4_event_retrieval.events = eventsData.events || [];

      // Check if our test event is in there
      const ourEvent = eventsData.events?.find((e: any) =>
        e.opportunityId === testPayload.action.subject_id
      );
      diagnostics.step4_event_retrieval.test_event_found = !!ourEvent;
      if (ourEvent) {
        diagnostics.step4_event_retrieval.test_event = ourEvent;
      }
    } catch (error) {
      diagnostics.step4_event_retrieval.status = 'error';
      diagnostics.step4_event_retrieval.error = error instanceof Error ? error.message : 'Unknown error';
    }

    // Overall assessment
    const overallSuccess =
      diagnostics.step1_payload_creation.status === 'success' &&
      diagnostics.step2_webhook_call.status === 'success' &&
      diagnostics.step3_database_check.has_postgres_url;

    return res.status(200).json({
      success: overallSuccess,
      message: overallSuccess
        ? 'Test webhook completed successfully'
        : 'Test completed with issues',
      diagnostics,
      recommendations: generateRecommendations(diagnostics)
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      diagnostics
    });
  }
}

function generateRecommendations(diagnostics: any): string[] {
  const recommendations: string[] = [];

  if (!diagnostics.step3_database_check.has_postgres_url) {
    recommendations.push('❌ CRITICAL: Set up Postgres database in Vercel dashboard');
    recommendations.push('   → Go to Vercel project → Storage → Create Database → Postgres');
    recommendations.push('   → After creation, redeploy your application');
  }

  if (diagnostics.step2_webhook_call.status !== 'success') {
    recommendations.push('⚠️  Webhook endpoint returned an error');
    recommendations.push('   → Check browser console for detailed error messages');
  }

  if (diagnostics.step4_event_retrieval.count === 0) {
    recommendations.push('⚠️  No events found in database');
    recommendations.push('   → Events may not be saving to the database');
    recommendations.push('   → Check if database tables were created properly');
  }

  if (!diagnostics.step4_event_retrieval.test_event_found && diagnostics.step4_event_retrieval.count > 0) {
    recommendations.push('⚠️  Test event not found in recent events');
    recommendations.push('   → Event may have been saved but not retrieved');
    recommendations.push('   → Try refreshing the page');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Everything looks good!');
    recommendations.push('   → Events are being received and stored correctly');
  }

  return recommendations;
}
