## Goal

Pull your Limitless pendant lifelogs into the app automatically every hour, store them, and feed recent transcripts into the AI so insights and suggestions reflect what you actually talked about.

## What gets built

### 1. Storage
A new `limitless_lifelogs` table (user-scoped, RLS-protected) to hold synced entries:
- lifelog id (from Limitless), start/end time, title, summary, transcript, speakers, raw payload
- `synced_at` timestamp, last-cursor tracking per user so we only pull new entries

A new `limitless_sync_state` table to track each user's last successful sync time + cursor.

### 2. Secret
Store your **Limitless API key** as a backend secret (`LIMITLESS_API_KEY`). You'll grab it from the Limitless developer dashboard and paste it into the secure prompt — never stored in code.

### 3. Edge functions
- **`limitless-sync`** — fetches new lifelogs from `https://api.limitless.ai/v1/lifelogs` since the last cursor, upserts into the table, updates sync state. Can be called by cron OR manually.
- **`limitless-manual-sync`** (thin wrapper, optional) — lets the UI trigger an on-demand pull with the user's auth.

### 4. Scheduled automation
Enable `pg_cron` + `pg_net` and schedule `limitless-sync` to run **every hour**. Runs server-side, no browser needed.

### 5. AI integration
Update the existing AI insights / suggestions flow (the `ai-command-center` / `smart-suggestions` / `generate-session-summary` functions where appropriate) so when building the user context, it also pulls the **last ~24h of Limitless summaries** and includes them in the system prompt. Result: suggestions like "You mentioned the Q3 launch in a call this morning — want a session on it?"

### 6. Light UI touchpoint
- A small "Limitless" status row in **Settings** showing: connected ✓, last sync time, "Sync now" button, and recent lifelog count.
- No new full page — the data flows invisibly into existing insights.

## Out of scope (for this pass)
- Auto-creating Future Notes / tasks from transcripts (easy to add later if you like it)
- Per-project linking via keyword matching
- A dedicated lifelog browser page

## Technical notes
- Limitless API: `GET /v1/lifelogs` with `X-API-Key` header, supports `start`/`end`/`cursor` pagination. We page until empty.
- Since the API key is yours (single-user-style), the hourly cron will sync **only your account** initially. If you later want multi-user, each user would store their own key — flag this and we'll restructure.
- All Limitless data scoped by `user_id` with RLS so it's safe either way.
- No Zapier/n8n — native edge function + pg_cron keeps it simple and free of extra moving parts.

## After approval
1. Migration: tables + RLS + grants + cron extensions
2. Add `LIMITLESS_API_KEY` secret (you'll paste it)
3. Build `limitless-sync` edge function
4. Schedule the cron job
5. Wire recent lifelogs into the AI context in `ai-command-center` / `smart-suggestions`
6. Add the Settings status row + manual sync button
