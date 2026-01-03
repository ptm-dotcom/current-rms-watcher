# Webhook Troubleshooting Guide

## Problem: Test Webhooks Don't Create Events

If clicking the "Test Webhook" button doesn't create any new events, follow these steps:

### Step 1: Check if Database is Configured

The most common cause is **missing Postgres database**.

**To check:**
1. Go to your Vercel dashboard
2. Select your project
3. Go to "Storage" tab
4. Look for a Postgres database

**If no database exists:**

1. In Vercel dashboard → Storage → Create Database
2. Choose "Postgres"
3. Give it a name (e.g., "current-rms-watcher-db")
4. Select region (same as your app for best performance)
5. Click "Create"
6. Vercel will automatically add `POSTGRES_URL` to your environment variables
7. **IMPORTANT:** Redeploy your application after database creation

### Step 2: Verify Database Connection

1. Go to `/webhooks` page in your app
2. Click "🔄 Refresh" button
3. Check "Environment Configuration" section
4. Look for "Database" row - should show "Connected ✓"

If it shows "NOT SET ✗":
- Database wasn't created yet, or
- Application hasn't been redeployed after database creation

###Step 3: Test the Webhook Flow

Use the diagnostic endpoint to test the full flow:

```bash
curl -X POST https://your-app.vercel.app/api/quick-webhook-test
```

This will test:
1. Database configuration
2. Webhook endpoint functionality
3. Event storage and retrieval

### Step 4: Check Webhook Configuration in Current RMS

If database is working but real webhooks aren't arriving:

1. Log in to Current RMS admin panel
2. Go to Settings → Webhooks
3. Look for webhooks with "Watcher" in the name
4. Verify:
   - They are **active** (enabled)
   - Target URL points to your current Vercel deployment
   - Events are configured (opportunity_update, etc.)

**To update webhooks:**
1. Run `npm run build` locally (triggers webhook setup script)
2. Or manually update webhooks in Current RMS to point to:
   ```
   https://your-app.vercel.app/api/webhook
   ```

### Step 5: Monitor Logs

Check Vercel logs for webhook activity:

1. Go to Vercel dashboard → Your Project → Logs
2. Filter for "webhook" or "event"
3. Look for:
   - `📥 Webhook received` - Webhook was received
   - `✅ Event processed successfully` - Event was saved
   - Any error messages

## Common Issues

### Issue: "No events found in database"

**Cause:** Database tables weren't created

**Solution:**
1. Database tables are created automatically on first use
2. Send a test webhook to trigger table creation
3. Check Vercel logs for any database errors

### Issue: "Webhook rejected: 400"

**Cause:** Invalid webhook payload

**Solution:**
- Check webhook payload format in Current RMS
- Ensure payload includes required fields (action, subject_id, etc.)
- Review `/api/webhook.ts` for payload validation

### Issue: Events appear in Vercel logs but not in dashboard

**Cause:** Events are being processed but not retrieved

**Solution:**
1. Check `/api/events` endpoint directly: `/api/events?limit=10`
2. Verify database queries in `lib/eventStorePostgres.ts`
3. Check browser console for JavaScript errors

## Quick Diagnostic Checklist

- [ ] Postgres database created in Vercel
- [ ] Application redeployed after database creation
- [ ] `POSTGRES_URL` environment variable set
- [ ] Webhooks configured in Current RMS
- [ ] Webhooks pointing to correct URL (current deployment)
- [ ] Webhooks are active/enabled
- [ ] Test webhook button returns success

## Testing Workflow

### 1. Manual Test

```bash
# Send test webhook
curl -X POST https://your-app.vercel.app/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "action": {
      "id": 12345,
      "subject_id": 99999,
      "subject_type": "Opportunity",
      "member_id": 1,
      "action_type": "test",
      "name": "Manual Test",
      "member": {"id": 1, "name": "Test User"},
      "subject": {
        "name": "Test Opportunity",
        "organisation_name": "Test Customer",
        "opportunity_status": "Testing"
      }
    }
  }'
```

### 2. Check Events

```bash
# Retrieve recent events
curl https://your-app.vercel.app/api/events?limit=10
```

### 3. Check Health

```bash
# System health check
curl https://your-app.vercel.app/api/health
```

## Need More Help?

1. Check `/webhooks` diagnostic page for detailed status
2. Review Vercel deployment logs
3. Check Current RMS webhook delivery logs
4. Contact support with diagnostic output from `/api/quick-webhook-test`
