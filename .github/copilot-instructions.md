# Copilot / AI Agent Instructions — Current RMS Watcher

Objective: be immediately productive making changes to the webhook watcher, dashboard, rules, and sync logic.

1) Big picture
- Flow: Current RMS -> webhooks -> app (`/api/webhook`) -> business rules (`lib/businessRules.ts`) -> actions; dashboard reads events from event store (`lib/eventStorePostgres.ts`). See [README.md](README.md) for overview.

2) Key files to read first
- Webhook entry: [pages/api/webhook.ts](pages/api/webhook.ts#L1-L120)
- Business rules engine: [lib/businessRules.ts](lib/businessRules.ts#L1-L120)
- Event storage (Postgres): [lib/eventStorePostgres.ts](lib/eventStorePostgres.ts#L1-L80)
- In-memory fallback store: [lib/eventStore.ts](lib/eventStore.ts#L1-L80)
- Current RMS client & date helpers: [lib/currentRmsClient.ts](lib/currentRmsClient.ts#L1-L120)
- Sync service (initial/incremental): [lib/opportunitySync.ts](lib/opportunitySync.ts#L1-L120)
- Auto-webhook setup script (runs after `next build`): [`scripts/setup-webhooks-auto.js`](scripts/setup-webhooks-auto.js#L1-L40)

3) Important runtime conventions & workflows
- Local dev: `npm install` then `npm run dev` (Next.js). Webhooks are NOT auto-created locally; use `test-webhook.js` or `setup-webhooks.sh` for manual testing: `node test-webhook.js http://localhost:3000/api/webhook convert_to_order`.
- Build/deploy: `npm run build` triggers `postbuild` which runs `scripts/setup-webhooks-auto.js` to register webhooks on Vercel. See `package.json` scripts.
- Env vars required on Vercel: `CURRENT_RMS_SUBDOMAIN`, `CURRENT_RMS_API_KEY`. Optional: `WEBHOOK_SECRET`, `VERCEL_PRODUCTION_URL`, `POSTGRES_URL` (for Vercel Postgres).
- Storage: if `POSTGRES_URL` is set the app uses the Vercel Postgres backed `eventStorePostgres`. Otherwise serverless `/tmp` fallback is available in `lib/eventStore.ts` (short-lived, per-container).

4) Patterns to follow when editing
- Business rules: register with `rulesEngine.registerRule({...})` in `lib/businessRules.ts`. Triggers use `actionTypes` and/or `statusChanges`. Example rule snippet in that file shows how to access `event.opportunityId` and `event.customerName`.
- Unique event IDs use `evt_{action.id}_{Date.now()}` in `pages/api/webhook.ts`; preserve that shape if creating alternate IDs.
- Webhook names are created as `Watcher - <Description>` in setup scripts; the auto-setup script looks for existing webhooks by that exact name.
- Syncs are fire-and-forget from the webhook handler: `opportunitySync.syncOpportunity(id)` runs in background — avoid awaiting long-running tasks in the request handler.

5) Integration points & side-effects to watch
- `scripts/setup-webhooks-auto.js` calls Current RMS REST API during `postbuild`. It relies on `VERCEL_PRODUCTION_URL` (fallback configured inside script). Editing this script will change deployment-time behaviour.
- Database migrations and schema are created dynamically in `lib/eventStorePostgres.ts` (the file contains many `CREATE TABLE IF NOT EXISTS` statements). Changing schema here affects runtime initialization.
- Many modules export singletons (e.g., `rulesEngine`, `eventStore`, `opportunitySync`) — tests and imports expect singleton behaviour.

6) Helpful commands & quick examples
- Local dev server: `npm run dev`
- Run initial sync manually: POST to `/api/sync/initial` (or call `node scripts/setup-webhooks.sh` to create webhooks)
- Send a test webhook: `node test-webhook.js http://localhost:3000/api/webhook convert_to_order`
- Recreate webhooks (manual): `./manage-webhooks.sh create opportunity_update https://your-app.vercel.app/api/webhook`

7) What not to change lightly
- Don't remove or rename the webhook naming pattern (`Watcher - ...`) unless you update `scripts/setup-webhooks-auto.js` and `setup-webhooks.sh` accordingly.
- Avoid blocking the `/api/webhook` response with heavy I/O — the code intentionally stores events and spins background syncs.

8) If you need to extend
- Add rules by editing `lib/businessRules.ts` or expose a rules registration API that imports `rulesEngine` and registers rules at startup.
- For production durability enable Postgres (set `POSTGRES_URL`) and ensure Vercel Postgres is configured — `lib/eventStorePostgres.ts` will initialize schema automatically.

Questions or unclear areas? Tell me which section to expand (deployment, DB, rules examples, or API flows) and I will iterate.
