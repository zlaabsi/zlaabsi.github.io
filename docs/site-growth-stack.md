# Site Growth Stack

This repo now has a homegrown growth stack built around:

- a `Cloudflare Worker`
- a `D1` database
- the blog's dedicated `/updates.xml` feed
- an optional `Resend` integration for outbound emails

The goal is to avoid a dead subscribe page and to keep the tracking model under our control.

## What it covers

- email subscriptions
- email notifications for new posts and meaningful revisions
- pageviews
- article clicks
- generic click coordinates for a coarse click heatmap
- a private admin dashboard

## Files

- `workers/growth-api/wrangler.jsonc`
- `workers/growth-api/migrations/0001_init.sql`
- `workers/growth-api/src/index.ts`
- `workers/growth-api/src/dashboard.ts`
- `workers/growth-api/.dev.vars.example`
- `layouts/partials/newsletter_cta.html`
- `layouts/partials/extend_footer.html`
- `content/subscribe.md`
- `layouts/index.updates.xml`
- `hugo.yaml`

## Architecture

The static blog stays on GitHub Pages.

The dynamic pieces move to the Worker:

- `POST /api/subscribe`
- `POST /api/track`
- `GET /api/admin/*`
- `GET /dashboard`
- `GET /unsubscribe`
- `scheduled()` for newsletter dispatch

The Worker stores everything in D1:

- subscribers
- tracked events
- newsletter dispatches
- delivery logs

## Email flow

The notification source of truth is still `/updates.xml`.

That feed already distinguishes:

- new posts
- revised posts via `notify_lastmod`

The Worker cron fetches the feed, creates pending dispatches for unseen items, and sends them to active subscribers.

Outbound mail is not handled by Cloudflare itself here. The Worker is prepared to call `Resend` once these secrets exist:

- `RESEND_API_KEY`
- `RESEND_FROM`

Without these, subscriptions still work and are stored, but no email is sent yet.

## Tracking model

The site sends four event types:

- `page_view`
- `article_click`
- `newsletter_signup`
- `ui_click`

`ui_click` stores normalized click coordinates, which is enough for a coarse click-grid heatmap in the admin dashboard.

This is intentionally much lighter than a full replay product. It does not try to replace session-recording tools.

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the local secrets template:

   ```bash
   cp workers/growth-api/.dev.vars.example workers/growth-api/.dev.vars
   ```

3. Apply the local D1 migration:

   ```bash
   npm run growth:db:apply:local
   ```

4. Start the Worker:

   ```bash
   npm run growth:worker:dev
   ```

5. Start Hugo:

   ```bash
   hugo server --bind 127.0.0.1 --port 1313 --disableFastRender
   ```

In local dev, the site points automatically at `http://127.0.0.1:8787`.

Useful local URLs:

- site: `http://localhost:1313/`
- subscribe page: `http://localhost:1313/subscribe/`
- worker dashboard: `http://127.0.0.1:8787/dashboard`
- cron test: `http://127.0.0.1:8787/cdn-cgi/handler/scheduled`

## First Cloudflare deployment

1. Authenticate:

   ```bash
   npx wrangler login
   ```

2. Create the D1 database:

   ```bash
   npx wrangler d1 create zlaabsi-growth
   ```

3. Copy the returned `database_id` into `workers/growth-api/wrangler.jsonc`.

4. Apply the remote migration:

   ```bash
   npm run growth:db:apply:remote
   ```

5. Set secrets:

   ```bash
   npx wrangler secret put ADMIN_TOKEN --config workers/growth-api/wrangler.jsonc
   npx wrangler secret put RESEND_API_KEY --config workers/growth-api/wrangler.jsonc
   npx wrangler secret put RESEND_FROM --config workers/growth-api/wrangler.jsonc
   ```

6. Set public Worker vars in `workers/growth-api/wrangler.jsonc`:

   - `PUBLIC_API_BASE_URL`
   - `SITE_BASE_URL`
   - `NEWSLETTER_FEED_URL`

7. Deploy:

   ```bash
   npm run growth:worker:deploy
   ```

8. Copy the deployed Worker URL into `hugo.yaml`:

   - `params.integrations.cloudflareWorker.apiBase`
   - `params.integrations.cloudflareWorker.dashboardUrl`

9. Push the blog again so the public site posts to the Worker instead of showing the fallback.

## Admin dashboard

The Worker serves a private dashboard at `/dashboard`.

It is token-gated through `ADMIN_TOKEN` and exposes:

- summary metrics
- daily visitors and pageviews
- top pages
- top article clicks
- recent event timeline
- subscriber list
- click-grid heatmap

## Known limits

- This is not a full replay product. There is no session video, DOM diffing, or rage-click classifier.
- Email delivery still depends on an external outbound provider.
- Until the public Worker URL is filled into `hugo.yaml`, the public `/subscribe/` page will keep showing the fallback message.
