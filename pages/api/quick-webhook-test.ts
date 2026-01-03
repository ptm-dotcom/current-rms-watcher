// API Route: /api/quick-webhook-test
// Quick diagnostic test for webhook functionality

import { NextApiRequest, NextApiResponse } from 'next';
import { eventStore } from '@/lib/eventStorePostgres';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const results: any = {
    timestamp: new Date().toISOString(),
    tests: []
  };

  // Test 1: Database configured?
  const test1 = {
    name: 'Database Configuration',
    status: '',
    details: ''
  };

  if (!process.env.POSTGRES_URL) {
    test1.status = 'FAILED';
    test1.details = '❌ POSTGRES_URL not configured. Events cannot be saved.';
    results.tests.push(test1);

    return res.status(200).json({
      success: false,
      message: 'Database not configured - webhooks cannot work',
      ...results
    });
  }

  test1.status = 'PASSED';
  test1.details = '✅ Database is configured';
  results.tests.push(test1);

  // Test 2: Can we send a webhook?
  const test2 = {
    name: 'Webhook Endpoint',
    status: '',
    details: '',
    webhookResponse: null
  };

  try {
    const testPayload = {
      action: {
        id: Date.now(),
        subject_id: 99999,
        subject_type: 'Opportunity',
        member_id: 1,
        action_type: 'quick_test',
        name: `Quick Test ${new Date().toLocaleTimeString()}`,
        member: { id: 1, name: 'Test User' },
        subject: {
          name: 'Test Opportunity',
          organisation_name: 'Test Customer',
          opportunity_status: 'Testing'
        }
      }
    };

    const baseUrl = `https://${req.headers.host}`;
    const webhookResponse = await fetch(`${baseUrl}/api/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });

    const webhookData = await webhookResponse.json();
    test2.webhookResponse = webhookData;

    if (webhookResponse.ok) {
      test2.status = 'PASSED';
      test2.details = `✅ Webhook accepted (Event ID: ${webhookData.eventId})`;
    } else {
      test2.status = 'FAILED';
      test2.details = `❌ Webhook rejected: ${webhookResponse.status}`;
    }
  } catch (error) {
    test2.status = 'ERROR';
    test2.details = `❌ Error calling webhook: ${error instanceof Error ? error.message : 'Unknown'}`;
  }
  results.tests.push(test2);

  // Test 3: Can we query events?
  const test3 = {
    name: 'Event Retrieval',
    status: '',
    details: '',
    eventCount: 0
  };

  try {
    const events = await eventStore.getRecentEvents(10);
    test3.eventCount = events.length;

    if (events.length > 0) {
      test3.status = 'PASSED';
      test3.details = `✅ Found ${events.length} events in database`;
    } else {
      test3.status = 'WARNING';
      test3.details = `⚠️ No events in database yet`;
    }
  } catch (error) {
    test3.status = 'ERROR';
    test3.details = `❌ Error querying events: ${error instanceof Error ? error.message : 'Unknown'}`;
  }
  results.tests.push(test3);

  // Overall result
  const allPassed = results.tests.every((t: any) => t.status === 'PASSED');
  const anyFailed = results.tests.some((t: any) => t.status === 'FAILED' || t.status === 'ERROR');

  return res.status(200).json({
    success: allPassed,
    message: allPassed
      ? '✅ All tests passed! Webhooks are working.'
      : anyFailed
        ? '❌ Some tests failed. Check details below.'
        : '⚠️ Tests completed with warnings.',
    ...results,
    nextSteps: generateNextSteps(results.tests)
  });
}

function generateNextSteps(tests: any[]): string[] {
  const steps: string[] = [];

  const dbTest = tests.find(t => t.name === 'Database Configuration');
  if (dbTest?.status === 'FAILED') {
    steps.push('1. Create a Postgres database in your Vercel project');
    steps.push('2. Redeploy your application');
    return steps;
  }

  const webhookTest = tests.find(t => t.name === 'Webhook Endpoint');
  if (webhookTest?.status !== 'PASSED') {
    steps.push('1. Check server logs for webhook errors');
    steps.push('2. Verify webhook endpoint is accessible');
  }

  const eventTest = tests.find(t => t.name === 'Event Retrieval');
  if (eventTest?.eventCount === 0) {
    steps.push('1. Send a test webhook using the button above');
    steps.push('2. Trigger a real event in Current RMS');
    steps.push('3. Check if webhooks are configured in Current RMS');
  }

  if (steps.length === 0) {
    steps.push('✅ System is healthy and ready to receive webhooks!');
  }

  return steps;
}
