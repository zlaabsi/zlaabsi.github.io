import { renderDashboardHTML } from "./dashboard";
import dashboardPage from "./dashboard-v2.html";
import { getReport } from "./report";

type DeliveryStatus = "sent" | "failed";
type DispatchStatus = "pending" | "sent" | "partial" | "failed";

interface Env {
  GROWTH_DB: D1Database;
  ACCESS_TEAM_DOMAIN?: string;
  ADMIN_ACCESS_ALLOWED_EMAILS?: string;
  ADMIN_ACCESS_AUD?: string;
  ADMIN_TOKEN?: string;
  CORS_ORIGINS?: string;
  NEWSLETTER_ENABLED?: string;
  NEWSLETTER_FEED_URL?: string;
  PUBLIC_API_BASE_URL?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  RESEND_REPLY_TO?: string;
  RESEND_WEBHOOK_SECRET?: string;
  LOCAL_ADMIN?: string;
  OWNER_TOKEN?: string;
  SITE_BASE_URL?: string;
}

interface SubscriberRow {
  id: number;
  email: string;
  status: string;
  placement: string | null;
  source_page: string | null;
  created_at: string;
  updated_at: string;
  unsubscribe_token: string;
}

interface EventRow {
  id: number;
  event_type: string;
  pathname: string | null;
  page_title: string | null;
  referrer: string | null;
  visitor_id: string | null;
  session_id: string | null;
  context: string | null;
  target_path: string | null;
  target_text: string | null;
  x_ratio: number | null;
  y_ratio: number | null;
  meta_json: string | null;
  created_at: string;
}

interface FeedItem {
  guid: string;
  title: string;
  cleanTitle: string;
  url: string;
  kind: "new" | "updated";
  summary: string;
  publishedAt: string;
}

interface DispatchRow {
  id: number;
  feed_guid: string;
  feed_title: string;
  clean_title: string;
  feed_url: string;
  feed_kind: "new" | "updated";
  summary: string | null;
  published_at: string;
  status: DispatchStatus;
}

interface EmailDeliveryRow {
  kind: "new" | "updated" | "welcome";
  subscriber_email: string;
  subject: string | null;
  source_page: string | null;
  provider_message_id: string | null;
  status: DeliveryStatus;
  error: string | null;
  entry_title: string | null;
  entry_url: string | null;
  created_at: string;
}

const JSON_HEADERS = {
  "content-type": "application/json; charset=UTF-8",
};

const ALLOWED_EVENT_TYPES = new Set([
  "page_view",
  "article_click",
  "newsletter_signup",
  "ui_click",
  "engagement",
  "impression",
  "figure_interact",
  "share",
]);

const ADMIN_PATHS = new Set([
  "/api/admin/report",
  "/api/admin/summary",
  "/api/admin/top-pages",
  "/api/admin/top-clicks",
  "/api/admin/recent-events",
  "/api/admin/subscribers",
  "/api/admin/email-deliveries",
  "/api/admin/heatmap",
  "/api/admin/dispatch-now",
  "/api/admin/exclude",
]);

interface AccessJwtHeader {
  alg?: string;
  kid?: string;
  typ?: string;
}

interface AccessJwtPayload {
  aud?: string | string[];
  email?: string;
  exp?: number;
  iss?: string;
  nbf?: number;
}

interface AccessJwk extends JsonWebKey {
  kid?: string;
  kty?: string;
}

let accessJwksCache:
  | {
      expiresAt: number;
      keys: AccessJwk[];
      teamDomain: string;
    }
  | null = null;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: withCorsHeaders(new Headers(), request, env),
      });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === "/" || url.pathname === "/health") {
        return json(
          {
            ok: true,
            service: "site-growth-api",
            newsletterEnabled: parseBoolean(env.NEWSLETTER_ENABLED, true),
          },
          200,
          request,
          env,
        );
      }

      if (url.pathname === "/dashboard") {
        return html(dashboardPage);
      }

      if (url.pathname === "/dashboard/legacy") {
        return html(renderDashboardHTML());
      }

      if (url.pathname === "/unsubscribe" && request.method === "GET") {
        return handleUnsubscribe(url, env);
      }

      if (ADMIN_PATHS.has(url.pathname)) {
        if (!(await isAuthorized(request, env))) {
          return json({ ok: false, error: "Unauthorized" }, 401, request, env);
        }

        if (url.pathname === "/api/admin/report" && request.method === "GET") {
          return json(await getReport(env.GROWTH_DB, cleanDays(url.searchParams.get("days"))), 200, request, env);
        }

        if (url.pathname === "/api/admin/summary" && request.method === "GET") {
          return json(await getSummary(env, cleanDays(url.searchParams.get("days"))), 200, request, env);
        }

        if (url.pathname === "/api/admin/top-pages" && request.method === "GET") {
          return json(
            {
              ok: true,
              rows: await getTopPages(env, cleanDays(url.searchParams.get("days"))),
            },
            200,
            request,
            env,
          );
        }

        if (url.pathname === "/api/admin/top-clicks" && request.method === "GET") {
          return json(
            {
              ok: true,
              rows: await getTopArticleClicks(env, cleanDays(url.searchParams.get("days"))),
            },
            200,
            request,
            env,
          );
        }

        if (url.pathname === "/api/admin/recent-events" && request.method === "GET") {
          return json(
            {
              ok: true,
              rows: await getRecentEvents(
                env,
                cleanDays(url.searchParams.get("days")),
                cleanLimit(url.searchParams.get("limit"), 80, 5, 200),
              ),
            },
            200,
            request,
            env,
          );
        }

        if (url.pathname === "/api/admin/subscribers" && request.method === "GET") {
          return json(
            {
              ok: true,
              rows: await getSubscribers(env, cleanLimit(url.searchParams.get("limit"), 50, 1, 200)),
            },
            200,
            request,
            env,
          );
        }

        if (url.pathname === "/api/admin/email-deliveries" && request.method === "GET") {
          return json(
            {
              ok: true,
              rows: await getEmailDeliveries(
                env,
                cleanDays(url.searchParams.get("days")),
                cleanLimit(url.searchParams.get("limit"), 40, 1, 200),
              ),
            },
            200,
            request,
            env,
          );
        }

        if (url.pathname === "/api/admin/heatmap" && request.method === "GET") {
          const path = sanitizePath(url.searchParams.get("path"));
          return json(
            await getHeatmap(
              env,
              path,
              cleanDays(url.searchParams.get("days")),
              cleanLimit(url.searchParams.get("xBins"), 12, 4, 24),
              cleanLimit(url.searchParams.get("yBins"), 12, 4, 24),
            ),
            200,
            request,
            env,
          );
        }

        if (url.pathname === "/api/admin/exclude" && request.method === "POST") {
          return handleExclude(request, env);
        }

        if (url.pathname === "/api/admin/dispatch-now" && request.method === "POST") {
          return json(await dispatchPendingNewsletters(env), 200, request, env);
        }

        return json({ ok: false, error: "Not found" }, 404, request, env);
      }

      if (url.pathname === "/api/subscribe" && request.method === "POST") {
        return handleSubscribe(request, env, ctx);
      }

      if (url.pathname === "/api/track" && request.method === "POST") {
        return handleTrack(request, env);
      }

      if (url.pathname === "/api/owner" && request.method === "POST") {
        return handleOwner(request, env);
      }

      if (url.pathname === "/api/webhooks/resend" && request.method === "POST") {
        return handleResendWebhook(request, env);
      }

      return json({ ok: false, error: "Not found" }, 404, request, env);
    } catch (error) {
      console.error("site-growth-api error", error);
      return json(
        {
          ok: false,
          error: error instanceof Error ? error.message : "Unexpected error",
        },
        500,
        request,
        env,
      );
    }
  },

  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(dispatchPendingNewsletters(env));
  },
};

async function handleSubscribe(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const payload = await readPayload(request);
  const email = normalizeEmail(payload.email);
  if (!email || !isValidEmail(email)) {
    return json({ ok: false, error: "A valid email address is required." }, 400, request, env);
  }

  const placement = sanitizeText(payload.placement, 120);
  const sourcePage = sanitizePath(payload.sourcePage || payload.source_page || payload.source);
  const metaJson = stringifyJson({
    userAgent: request.headers.get("user-agent") || null,
  });

  const existing = await env.GROWTH_DB.prepare(
    `SELECT id, email, status, placement, source_page, created_at, updated_at, unsubscribe_token
     FROM subscribers
     WHERE email = ?1`,
  )
    .bind(email)
    .first<SubscriberRow>();

  let subscriberStatus = "subscribed";
  let unsubscribeToken = existing?.unsubscribe_token ?? makeToken();

  if (!existing) {
    await env.GROWTH_DB.prepare(
      `INSERT INTO subscribers (
        email,
        status,
        placement,
        source_page,
        created_at,
        updated_at,
        unsubscribe_token,
        notes_json
      ) VALUES (?1, 'active', ?2, ?3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?4, ?5)`,
    )
      .bind(email, placement, sourcePage, unsubscribeToken, metaJson)
      .run();
  } else {
    subscriberStatus = existing.status === "active" ? "already_subscribed" : "re_subscribed";
    await env.GROWTH_DB.prepare(
      `UPDATE subscribers
       SET status = 'active',
           placement = COALESCE(?2, placement),
           source_page = COALESCE(?3, source_page),
           updated_at = CURRENT_TIMESTAMP,
           unsubscribed_at = NULL,
           notes_json = ?4
       WHERE email = ?1`,
    )
      .bind(email, placement, sourcePage, metaJson)
      .run();
  }

  await insertEvent(env, {
    eventType: "newsletter_signup",
    pathname: sourcePage,
    pageTitle: sanitizeText(payload.pageTitle, 240),
    visitorId: sanitizeText(payload.visitorId, 64),
    sessionId: sanitizeText(payload.sessionId, 64),
    context: placement || "newsletter",
    targetPath: null,
    targetText: email,
    xRatio: null,
    yRatio: null,
    meta: {
      placement,
      sourcePage,
    },
  });

  if (subscriberStatus !== "already_subscribed") {
    ctx.waitUntil(sendWelcomeEmail(env, email, unsubscribeToken, sourcePage));
  }

  return json(
    {
      ok: true,
      status: subscriberStatus,
      message:
        subscriberStatus === "already_subscribed"
          ? "This email is already subscribed."
          : "You are now on the list.",
    },
    200,
    request,
    env,
  );
}

// The owner's personal link (?owner=<OWNER_TOKEN>) marks the browser it is
// opened in: its visitor id is excluded from the statistics, past and future.
async function handleOwner(request: Request, env: Env): Promise<Response> {
  const payload = await readPayload(request);
  const token = sanitizeText(payload.token, 128);
  const visitorId = sanitizeText(payload.visitorId, 64);
  const expected = env.OWNER_TOKEN?.trim();
  if (!expected || !token || !timingSafeEqual(token, expected)) {
    return json({ ok: false, error: "Unknown link." }, 403, request, env);
  }
  if (visitorId) {
    await env.GROWTH_DB.prepare(
      `INSERT OR IGNORE INTO excluded_visitors (visitor_id, source) VALUES (?1, 'owner-link')`,
    )
      .bind(visitorId)
      .run();
  }
  return json({ ok: true }, 200, request, env);
}

async function handleExclude(request: Request, env: Env): Promise<Response> {
  const payload = await readPayload(request);
  const visitorId = sanitizeText(payload.visitorId, 64);
  if (!visitorId) {
    return json({ ok: false, error: "Missing visitor." }, 400, request, env);
  }
  if (payload.exclude === false) {
    await env.GROWTH_DB.prepare(`DELETE FROM excluded_visitors WHERE visitor_id = ?1`).bind(visitorId).run();
  } else {
    await env.GROWTH_DB.prepare(
      `INSERT OR IGNORE INTO excluded_visitors (visitor_id, source) VALUES (?1, 'dashboard')`,
    )
      .bind(visitorId)
      .run();
  }
  return json({ ok: true }, 200, request, env);
}

const EMAIL_EVENT_TYPES = new Set([
  "email.sent",
  "email.delivered",
  "email.delivery_delayed",
  "email.opened",
  "email.clicked",
  "email.bounced",
  "email.complained",
]);

// Resend signs its webhooks the Svix way: HMAC-SHA256 of "id.timestamp.body"
// with the base64 part of the whsec_ secret. Unsigned or stale calls are refused.
async function handleResendWebhook(request: Request, env: Env): Promise<Response> {
  const secret = env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return json({ ok: false, error: "Webhook is not configured." }, 503, request, env);
  }

  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signatures = request.headers.get("svix-signature");
  const body = await request.text();
  if (!id || !timestamp || !signatures) {
    return json({ ok: false, error: "Missing signature." }, 401, request, env);
  }

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) {
    return json({ ok: false, error: "Stale signature." }, 401, request, env);
  }

  const keyBytes = Uint8Array.from(atob(secret.replace(/^whsec_/, "")), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${body}`));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  const valid = signatures
    .split(" ")
    .map((part) => part.split(",")[1])
    .some((candidate) => candidate !== undefined && timingSafeEqual(candidate, expected));
  if (!valid) {
    return json({ ok: false, error: "Invalid signature." }, 401, request, env);
  }

  let event: { type?: string; created_at?: string; data?: Record<string, any> };
  try {
    event = JSON.parse(body);
  } catch {
    return json({ ok: false, error: "Invalid body." }, 400, request, env);
  }

  const eventType = sanitizeText(event.type, 64);
  if (!eventType || !EMAIL_EVENT_TYPES.has(eventType)) {
    return json({ ok: true, ignored: true }, 200, request, env);
  }

  const data = event.data ?? {};
  const recipient = Array.isArray(data.to) ? data.to[0] : data.to;
  await env.GROWTH_DB.prepare(
    `INSERT OR IGNORE INTO email_events (
      webhook_id,
      event_type,
      provider_message_id,
      recipient,
      subject,
      link,
      occurred_at,
      created_at
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, CURRENT_TIMESTAMP)`,
  )
    .bind(
      id,
      eventType.replace(/^email\./, ""),
      sanitizeText(data.email_id, 128),
      sanitizeText(typeof recipient === "string" ? recipient.toLowerCase() : null, 255),
      sanitizeText(data.subject, 255),
      sanitizeText(data.click?.link, 1024),
      sanitizeText(event.created_at, 64) ?? new Date().toISOString(),
    )
    .run();

  return json({ ok: true }, 200, request, env);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function handleTrack(request: Request, env: Env): Promise<Response> {
  const payload = await readPayload(request);
  const eventType = sanitizeText(payload.eventType || payload.event_type, 64);
  if (!eventType || !ALLOWED_EVENT_TYPES.has(eventType)) {
    return json({ ok: false, error: "Unsupported event type." }, 400, request, env);
  }

  await insertEvent(env, {
    eventType,
    pathname: sanitizePath(payload.pathname),
    pageTitle: sanitizeText(payload.pageTitle || payload.page_title, 240),
    referrer: sanitizeReferrer(payload.referrer),
    visitorId: sanitizeText(payload.visitorId || payload.visitor_id, 64),
    sessionId: sanitizeText(payload.sessionId || payload.session_id, 64),
    context: sanitizeText(payload.context, 120),
    targetPath: sanitizePath(payload.targetPath || payload.target_path),
    targetText: sanitizeText(payload.targetText || payload.target_text, 240),
    xRatio: sanitizeRatio(payload.xRatio ?? payload.x_ratio),
    yRatio: sanitizeRatio(payload.yRatio ?? payload.y_ratio),
    meta: payload.meta && typeof payload.meta === "object" ? payload.meta : null,
  });

  return json({ ok: true }, 200, request, env);
}

async function insertEvent(
  env: Env,
  event: {
    eventType: string;
    pathname: string | null;
    pageTitle: string | null;
    referrer?: string | null;
    visitorId?: string | null;
    sessionId?: string | null;
    context?: string | null;
    targetPath?: string | null;
    targetText?: string | null;
    xRatio?: number | null;
    yRatio?: number | null;
    meta?: unknown;
  },
): Promise<void> {
  await env.GROWTH_DB.prepare(
    `INSERT INTO events (
      event_type,
      pathname,
      page_title,
      referrer,
      visitor_id,
      session_id,
      context,
      target_path,
      target_text,
      x_ratio,
      y_ratio,
      meta_json,
      created_at
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, CURRENT_TIMESTAMP)`,
  )
    .bind(
      event.eventType,
      event.pathname,
      event.pageTitle,
      event.referrer ?? null,
      event.visitorId ?? null,
      event.sessionId ?? null,
      event.context ?? null,
      event.targetPath ?? null,
      event.targetText ?? null,
      event.xRatio ?? null,
      event.yRatio ?? null,
      stringifyJson(event.meta),
    )
    .run();
}

async function getSummary(env: Env, days: number): Promise<Record<string, unknown>> {
  const window = daysWindow(days);
  const [pageviews, uniqueVisitors, articleClicks, uiClicks, activeSubscribers, newSubscribers] = await Promise.all([
    countEvents(env, "page_view", window),
    countUniqueVisitors(env, window),
    countEvents(env, "article_click", window),
    countEvents(env, "ui_click", window),
    countSubscribers(env, "active"),
    countNewSubscribers(env, window),
  ]);

  const [dailyPageviews, dailyVisitors] = await Promise.all([
    env.GROWTH_DB.prepare(
      `SELECT date(created_at) AS day, COUNT(*) AS count
       FROM events
       WHERE event_type = 'page_view'
         AND created_at >= datetime('now', ?1)
       GROUP BY day
       ORDER BY day ASC`,
    )
      .bind(window)
      .all<{ day: string; count: number }>(),
    env.GROWTH_DB.prepare(
      `SELECT date(created_at) AS day, COUNT(DISTINCT visitor_id) AS count
       FROM events
       WHERE event_type = 'page_view'
         AND visitor_id IS NOT NULL
         AND created_at >= datetime('now', ?1)
       GROUP BY day
       ORDER BY day ASC`,
    )
      .bind(window)
      .all<{ day: string; count: number }>(),
  ]);

  return {
    ok: true,
    days,
    pageviews,
    uniqueVisitors,
    articleClicks,
    uiClicks,
    activeSubscribers,
    newSubscribers,
    dailyPageviews: dailyPageviews.results ?? [],
    dailyVisitors: dailyVisitors.results ?? [],
  };
}

async function getTopPages(env: Env, days: number): Promise<Record<string, unknown>[]> {
  const window = daysWindow(days);
  const result = await env.GROWTH_DB.prepare(
    `SELECT
      pathname,
      COUNT(*) AS pageviews,
      COUNT(DISTINCT visitor_id) AS uniqueVisitors
     FROM events
     WHERE event_type = 'page_view'
       AND pathname IS NOT NULL
       AND created_at >= datetime('now', ?1)
     GROUP BY pathname
     ORDER BY pageviews DESC, pathname ASC
     LIMIT 20`,
  )
    .bind(window)
    .all<{ pathname: string; pageviews: number; uniqueVisitors: number }>();

  return (result.results ?? []).map((row) => ({
    pathname: row.pathname,
    pageviews: Number(row.pageviews || 0),
    uniqueVisitors: Number(row.uniqueVisitors || 0),
  }));
}

async function getTopArticleClicks(env: Env, days: number): Promise<Record<string, unknown>[]> {
  const window = daysWindow(days);
  const result = await env.GROWTH_DB.prepare(
    `SELECT
      target_path AS targetPath,
      COUNT(*) AS clicks,
      COUNT(DISTINCT visitor_id) AS uniqueVisitors
     FROM events
     WHERE event_type = 'article_click'
       AND target_path IS NOT NULL
       AND created_at >= datetime('now', ?1)
     GROUP BY target_path
     ORDER BY clicks DESC, target_path ASC
     LIMIT 20`,
  )
    .bind(window)
    .all<{ targetPath: string; clicks: number; uniqueVisitors: number }>();

  return (result.results ?? []).map((row) => ({
    targetPath: row.targetPath,
    clicks: Number(row.clicks || 0),
    uniqueVisitors: Number(row.uniqueVisitors || 0),
  }));
}

async function getRecentEvents(env: Env, days: number, limit: number): Promise<Record<string, unknown>[]> {
  const window = daysWindow(days);
  const result = await env.GROWTH_DB.prepare(
    `SELECT
      id,
      event_type,
      pathname,
      page_title,
      referrer,
      visitor_id,
      session_id,
      context,
      target_path,
      target_text,
      x_ratio,
      y_ratio,
      meta_json,
      created_at
     FROM events
     WHERE created_at >= datetime('now', ?1)
     ORDER BY created_at DESC, id DESC
     LIMIT ?2`,
  )
    .bind(window, limit)
    .all<EventRow>();

  return (result.results ?? []).map((row) => ({
    id: row.id,
    eventType: row.event_type,
    pathname: row.pathname,
    pageTitle: row.page_title,
    referrer: row.referrer,
    visitorId: row.visitor_id,
    sessionId: row.session_id,
    context: row.context,
    targetPath: row.target_path,
    targetText: row.target_text,
    xRatio: row.x_ratio,
    yRatio: row.y_ratio,
    meta: parseJson(row.meta_json),
    createdAt: row.created_at,
  }));
}

async function getSubscribers(env: Env, limit: number): Promise<Record<string, unknown>[]> {
  const result = await env.GROWTH_DB.prepare(
    `SELECT
      email,
      status,
      placement,
      source_page,
      created_at,
      updated_at
     FROM subscribers
     ORDER BY updated_at DESC, id DESC
     LIMIT ?1`,
  )
    .bind(limit)
    .all<Pick<SubscriberRow, "email" | "status" | "placement" | "source_page" | "created_at" | "updated_at">>();

  return (result.results ?? []).map((row) => ({
    email: row.email,
    status: row.status,
    placement: row.placement,
    sourcePage: row.source_page,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

async function getEmailDeliveries(env: Env, days: number, limit: number): Promise<Record<string, unknown>[]> {
  const window = daysWindow(days);
  const result = await env.GROWTH_DB.prepare(
    `SELECT
      kind,
      subscriber_email,
      subject,
      source_page,
      provider_message_id,
      status,
      error,
      entry_title,
      entry_url,
      created_at
     FROM (
       SELECT
         d.feed_kind AS kind,
         l.subscriber_email,
         '[Zakaria Laabsi] ' ||
           CASE
             WHEN d.feed_kind = 'updated' THEN 'Updated article: '
             ELSE 'New article: '
           END || d.clean_title AS subject,
         NULL AS source_page,
         l.provider_message_id,
         l.status,
         l.error,
         d.clean_title AS entry_title,
         d.feed_url AS entry_url,
         l.sent_at AS created_at
       FROM newsletter_delivery_log l
       INNER JOIN newsletter_dispatches d
         ON d.id = l.dispatch_id
       WHERE l.sent_at >= datetime('now', ?1)

       UNION ALL

       SELECT
         email_kind AS kind,
         subscriber_email,
         subject,
         source_page,
         provider_message_id,
         status,
         error,
         NULL AS entry_title,
         NULL AS entry_url,
         created_at
       FROM transactional_email_log
       WHERE created_at >= datetime('now', ?1)
     )
     ORDER BY created_at DESC
     LIMIT ?2`,
  )
    .bind(window, limit)
    .all<EmailDeliveryRow>();

  return (result.results ?? []).map((row) => ({
    kind: row.kind,
    subscriberEmail: row.subscriber_email,
    subject: row.subject,
    sourcePage: row.source_page,
    providerMessageId: row.provider_message_id,
    status: row.status,
    error: row.error,
    entryTitle: row.entry_title,
    entryUrl: row.entry_url,
    createdAt: row.created_at,
  }));
}

async function getHeatmap(
  env: Env,
  path: string | null,
  days: number,
  xBins: number,
  yBins: number,
): Promise<Record<string, unknown>> {
  if (!path) {
    return {
      ok: true,
      path: null,
      xBins,
      yBins,
      totalClicks: 0,
      cells: [],
    };
  }

  const window = daysWindow(days);
  const result = await env.GROWTH_DB.prepare(
    `SELECT x_ratio, y_ratio
     FROM events
     WHERE event_type IN ('ui_click', 'article_click')
       AND (visitor_id IS NULL OR visitor_id NOT IN (SELECT visitor_id FROM excluded_visitors))
       AND pathname = ?1
       AND x_ratio IS NOT NULL
       AND y_ratio IS NOT NULL
       AND created_at >= datetime('now', ?2)`,
  )
    .bind(path, window)
    .all<{ x_ratio: number; y_ratio: number }>();

  const grid = Array.from({ length: xBins * yBins }, (_, index) => ({
    x: index % xBins,
    y: Math.floor(index / xBins),
    count: 0,
  }));

  let totalClicks = 0;
  for (const row of result.results ?? []) {
    const x = Math.min(xBins - 1, Math.max(0, Math.floor(Number(row.x_ratio) * xBins)));
    const y = Math.min(yBins - 1, Math.max(0, Math.floor(Number(row.y_ratio) * yBins)));
    grid[y * xBins + x].count += 1;
    totalClicks += 1;
  }

  return {
    ok: true,
    path,
    xBins,
    yBins,
    totalClicks,
    cells: grid,
  };
}

async function dispatchPendingNewsletters(env: Env): Promise<Record<string, unknown>> {
  if (!parseBoolean(env.NEWSLETTER_ENABLED, true)) {
    return { ok: true, skipped: true, reason: "Newsletter dispatch disabled." };
  }

  if (!env.RESEND_API_KEY || !env.RESEND_FROM) {
    return {
      ok: true,
      skipped: true,
      reason: "Resend is not configured yet. Set RESEND_API_KEY and RESEND_FROM.",
    };
  }

  const feedItems = await fetchFeedItems(env);
  let createdDispatches = 0;
  for (const item of feedItems) {
    const insert = await env.GROWTH_DB.prepare(
      `INSERT OR IGNORE INTO newsletter_dispatches (
        feed_guid,
        feed_title,
        clean_title,
        feed_url,
        feed_kind,
        summary,
        published_at,
        status,
        recipient_count,
        failure_count,
        created_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'pending', 0, 0, CURRENT_TIMESTAMP)`,
    )
      .bind(item.guid, item.title, item.cleanTitle, item.url, item.kind, item.summary, item.publishedAt)
      .run();
    createdDispatches += Number(insert.meta?.changes || 0);
  }

  const pendingResult = await env.GROWTH_DB.prepare(
    `SELECT
      id,
      feed_guid,
      feed_title,
      clean_title,
      feed_url,
      feed_kind,
      summary,
      published_at,
      status
     FROM newsletter_dispatches
     WHERE status = 'pending'
     ORDER BY published_at ASC, id ASC`,
  ).all<DispatchRow>();

  const subscribersResult = await env.GROWTH_DB.prepare(
    `SELECT id, email, status, placement, source_page, created_at, updated_at, unsubscribe_token
     FROM subscribers
     WHERE status = 'active'
     ORDER BY created_at ASC`,
  ).all<SubscriberRow>();

  let sentDeliveries = 0;
  let failedDeliveries = 0;

  for (const dispatch of pendingResult.results ?? []) {
    let dispatchSent = 0;
    let dispatchFailed = 0;

    for (const subscriber of subscribersResult.results ?? []) {
      const alreadyLogged = await env.GROWTH_DB.prepare(
        `SELECT id
         FROM newsletter_delivery_log
         WHERE dispatch_id = ?1
           AND subscriber_email = ?2
         LIMIT 1`,
      )
        .bind(dispatch.id, subscriber.email)
        .first<{ id: number }>();

      if (alreadyLogged) {
        continue;
      }

      const delivery = await sendDispatchEmail(env, dispatch, subscriber);
      await env.GROWTH_DB.prepare(
        `INSERT INTO newsletter_delivery_log (
          dispatch_id,
          subscriber_email,
          provider_message_id,
          status,
          error,
          sent_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, CURRENT_TIMESTAMP)`,
      )
        .bind(
          dispatch.id,
          subscriber.email,
          delivery.messageId,
          delivery.status,
          delivery.error,
        )
        .run();

      if (delivery.status === "sent") {
        dispatchSent += 1;
        sentDeliveries += 1;
      } else {
        dispatchFailed += 1;
        failedDeliveries += 1;
      }
    }

    const status: DispatchStatus =
      dispatchFailed === 0 ? "sent" : dispatchSent > 0 ? "partial" : "failed";

    await env.GROWTH_DB.prepare(
      `UPDATE newsletter_dispatches
       SET status = ?2,
           recipient_count = ?3,
           failure_count = ?4,
           processed_at = CURRENT_TIMESTAMP
       WHERE id = ?1`,
    )
      .bind(dispatch.id, status, dispatchSent, dispatchFailed)
      .run();
  }

  return {
    ok: true,
    createdDispatches,
    sentDeliveries,
    failedDeliveries,
  };
}

async function sendDispatchEmail(
  env: Env,
  dispatch: DispatchRow,
  subscriber: SubscriberRow,
): Promise<{ status: DeliveryStatus; messageId: string | null; error: string | null }> {
  const siteBaseUrl = stripTrailingSlash(env.SITE_BASE_URL || "https://zlaabsi.github.io");
  const apiBaseUrl = stripTrailingSlash(env.PUBLIC_API_BASE_URL || siteBaseUrl);
  const rssUrl = `${siteBaseUrl}/updates.xml`;
  const unsubscribeUrl = `${apiBaseUrl}/unsubscribe?token=${encodeURIComponent(subscriber.unsubscribe_token)}`;
  const isUpdated = dispatch.feed_kind === "updated";
  const subjectPrefix = isUpdated ? "Revised essay" : "New essay";
  const subject = `[Zakaria Laabsi] ${subjectPrefix}: ${dispatch.clean_title}`;
  const summary = dispatch.summary || (isUpdated
    ? "A substantial revision has been made to this essay."
    : "A fresh piece has been published on the blog.");
  const readTime = estimateReadTime(summary);
  const publishedAt = formatEmailDate(dispatch.published_at);

  const variables: Record<string, string> = isUpdated
    ? {
        ARTICLE_TITLE: dispatch.clean_title,
        ARTICLE_URL: dispatch.feed_url,
        UPDATE_SUMMARY: summary,
        ARTICLE_READ_TIME: readTime,
        ARTICLE_UPDATED_AT: publishedAt,
        SITE_URL: siteBaseUrl,
        RSS_URL: rssUrl,
        UNSUBSCRIBE_URL: unsubscribeUrl,
      }
    : {
        ARTICLE_TITLE: dispatch.clean_title,
        ARTICLE_URL: dispatch.feed_url,
        ARTICLE_SUMMARY: summary,
        ARTICLE_READ_TIME: readTime,
        ARTICLE_PUBLISHED_AT: publishedAt,
        SITE_URL: siteBaseUrl,
        RSS_URL: rssUrl,
        UNSUBSCRIBE_URL: unsubscribeUrl,
      };

  return sendResendEmail(env, {
    to: subscriber.email,
    subject,
    idempotencyKey: `${dispatch.feed_guid}:${subscriber.email}`,
    tags: [
      { name: "kind", value: dispatch.feed_kind },
      { name: "entry_guid", value: dispatch.feed_guid.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 200) },
    ],
    template: {
      alias: isUpdated ? "blog-updated-article" : "blog-new-article",
      variables,
    },
  });
}

async function sendWelcomeEmail(
  env: Env,
  email: string,
  unsubscribeToken: string,
  sourcePage: string | null,
): Promise<void> {
  const siteBaseUrl = stripTrailingSlash(env.SITE_BASE_URL || "https://zlaabsi.github.io");
  const apiBaseUrl = stripTrailingSlash(env.PUBLIC_API_BASE_URL || siteBaseUrl);
  const unsubscribeUrl = `${apiBaseUrl}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
  const rssUrl = `${siteBaseUrl}/updates.xml`;
  const subject = "[Zakaria Laabsi] Subscription confirmed";

  const latest = await fetchLatestDispatch(env, siteBaseUrl);
  void sourcePage;

  const variables: Record<string, string> = {
    SITE_URL: siteBaseUrl,
    SITE_NAME: "Zakaria Laabsi",
    RSS_URL: rssUrl,
    LATEST_ARTICLE_TITLE: latest?.title || "Browse the catalog",
    LATEST_ARTICLE_URL: latest?.url || siteBaseUrl,
    LATEST_ARTICLE_SUMMARY:
      latest?.summary ||
      "Visit the site to browse the full catalog of essays and notes.",
    UNSUBSCRIBE_URL: unsubscribeUrl,
  };

  const delivery = await sendResendEmail(env, {
    to: email,
    subject,
    idempotencyKey: `welcome:${email}`,
    tags: [{ name: "kind", value: "welcome" }],
    template: {
      alias: "blog-welcome",
      variables,
    },
  });

  await env.GROWTH_DB.prepare(
    `INSERT INTO transactional_email_log (
      email_kind,
      subscriber_email,
      subject,
      source_page,
      provider_message_id,
      status,
      error,
      created_at
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, CURRENT_TIMESTAMP)`,
  )
    .bind(
      "welcome",
      email,
      subject,
      sourcePage,
      delivery.messageId,
      delivery.status,
      delivery.error,
    )
    .run();
}

async function sendResendEmail(
  env: Env,
  message: {
    to: string;
    subject: string;
    idempotencyKey: string;
    tags?: Array<{ name: string; value: string }>;
    template: { alias: string; variables: Record<string, string> };
  },
): Promise<{ status: DeliveryStatus; messageId: string | null; error: string | null }> {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM) {
    return {
      status: "failed",
      messageId: null,
      error: "Resend is not configured yet. Set RESEND_API_KEY and RESEND_FROM.",
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": message.idempotencyKey,
      },
      body: JSON.stringify({
        from: env.RESEND_FROM,
        to: [message.to],
        reply_to: env.RESEND_REPLY_TO || undefined,
        subject: message.subject,
        template: {
          id: message.template.alias,
          variables: message.template.variables,
        },
        tags: message.tags,
      }),
    });

    const payload = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;
    if (!response.ok) {
      return {
        status: "failed",
        messageId: null,
        error: payload?.message || `Resend request failed with ${response.status}`,
      };
    }

    return {
      status: "sent",
      messageId: payload?.id || null,
      error: null,
    };
  } catch (error) {
    console.error("resend email failed", error);
    return {
      status: "failed",
      messageId: null,
      error: error instanceof Error ? error.message : "Unexpected send failure",
    };
  }
}

async function handleUnsubscribe(url: URL, env: Env): Promise<Response> {
  const token = sanitizeText(url.searchParams.get("token"), 128);
  if (!token) {
    return html(
      `<!doctype html><html><body style="font-family:system-ui;padding:32px"><h1>Missing token</h1><p>The unsubscribe link is incomplete.</p></body></html>`,
      400,
    );
  }

  const row = await env.GROWTH_DB.prepare(
    `SELECT email
     FROM subscribers
     WHERE unsubscribe_token = ?1
     LIMIT 1`,
  )
    .bind(token)
    .first<{ email: string }>();

  if (!row) {
    return html(
      `<!doctype html><html><body style="font-family:system-ui;padding:32px"><h1>Invalid link</h1><p>This unsubscribe link is invalid or has already expired.</p></body></html>`,
      404,
    );
  }

  await env.GROWTH_DB.prepare(
    `UPDATE subscribers
     SET status = 'unsubscribed',
         unsubscribed_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE unsubscribe_token = ?1`,
  )
    .bind(token)
    .run();

  return html(
    `<!doctype html><html><body style="font-family:system-ui;padding:32px;background:#faf7f2;color:#2c2418"><h1>Unsubscribed</h1><p>${escapeHtml(
      row.email,
    )} has been removed from future newsletter sends.</p><p><a href="${escapeHtml(
      stripTrailingSlash(env.SITE_BASE_URL || "https://zlaabsi.github.io"),
    )}">Return to the site</a></p></body></html>`,
    200,
  );
}

async function fetchFeedItems(env: Env): Promise<FeedItem[]> {
  const feedUrl = env.NEWSLETTER_FEED_URL || `${stripTrailingSlash(env.SITE_BASE_URL || "https://zlaabsi.github.io")}/updates.xml`;
  const response = await fetch(feedUrl, {
    headers: {
      "User-Agent": "zlaabsi-growth-api/1.0",
      Accept: "application/rss+xml, application/xml, text/xml",
    },
  });
  if (!response.ok) {
    throw new Error(`Unable to fetch newsletter feed (${response.status})`);
  }

  const xml = await response.text();
  const matches = Array.from(xml.matchAll(/<item\b[\s\S]*?<\/item>/gi));
  return matches
    .map((match) => parseFeedItem(match[0]))
    .filter((item): item is FeedItem => Boolean(item));
}

function parseFeedItem(itemXml: string): FeedItem | null {
  const title = decodeXml(stripCdata(extractTag(itemXml, "title")) || "");
  const url = decodeXml(stripCdata(extractTag(itemXml, "link")) || "");
  const guid = decodeXml(stripCdata(extractTag(itemXml, "guid")) || url);
  const publishedAtRaw = decodeXml(stripCdata(extractTag(itemXml, "pubDate")) || "");
  const summary = cleanupSummary(decodeXml(stripCdata(extractTag(itemXml, "description")) || ""));

  if (!title || !url || !guid) {
    return null;
  }

  const kind = title.startsWith("Updated:") ? "updated" : "new";
  const cleanTitle = title.replace(/^(Updated|New):\s*/i, "").trim();
  const parsedDate = new Date(publishedAtRaw);
  const publishedAt = Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();

  return {
    guid,
    title,
    cleanTitle,
    url,
    kind,
    summary,
    publishedAt,
  };
}

async function fetchLatestDispatch(
  env: Env,
  siteBaseUrl: string,
): Promise<{ title: string; url: string; summary: string } | null> {
  const row = await env.GROWTH_DB.prepare(
    `SELECT clean_title, feed_url, summary
     FROM newsletter_dispatches
     WHERE status = 'sent'
     ORDER BY published_at DESC, id DESC
     LIMIT 1`,
  ).first<{ clean_title: string; feed_url: string; summary: string | null }>();

  if (!row) return null;
  void siteBaseUrl;
  return {
    title: row.clean_title,
    url: row.feed_url,
    summary: row.summary || "A recent piece on the blog.",
  };
}

function estimateReadTime(summary: string): string {
  const words = summary.trim().split(/\s+/).length;
  const minutes = Math.max(3, Math.round(words / 200) + 3);
  return `${minutes} min read`;
}

function formatEmailDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

async function isAuthorized(request: Request, env: Env): Promise<boolean> {
  // Local use only: wrangler dev started with --var LOCAL_ADMIN:true, and the
  // request must also come through localhost. It is never set in production.
  const host = new URL(request.url).hostname;
  if (env.LOCAL_ADMIN === "true" && (host === "localhost" || host === "127.0.0.1")) {
    return true;
  }
  if (hasValidAdminToken(request, env)) {
    return true;
  }
  return hasValidAccessSession(request, env);
}

function hasValidAdminToken(request: Request, env: Env): boolean {
  const expected = env.ADMIN_TOKEN?.trim();
  if (!expected) return false;

  const authHeader = request.headers.get("authorization");
  const headerToken =
    authHeader?.toLowerCase().startsWith("bearer ")
      ? authHeader.slice("bearer ".length).trim()
      : request.headers.get("x-admin-token")?.trim() || "";
  return headerToken === expected;
}

async function hasValidAccessSession(request: Request, env: Env): Promise<boolean> {
  const teamDomain = stripTrailingSlash(env.ACCESS_TEAM_DOMAIN || "");
  const expectedAud = env.ADMIN_ACCESS_AUD?.trim();
  if (!teamDomain || !expectedAud) return false;

  const jwt = getAccessJwt(request);
  if (!jwt) return false;

  const payload = await verifyAccessJwt(jwt, teamDomain, expectedAud);
  if (!payload) return false;

  const allowedEmails = parseCsv(env.ADMIN_ACCESS_ALLOWED_EMAILS).map((email) => email.toLowerCase());
  if (allowedEmails.length > 0) {
    const email = payload.email?.toLowerCase();
    if (!email || !allowedEmails.includes(email)) {
      return false;
    }
  }

  return true;
}

function getAccessJwt(request: Request): string | null {
  const assertion = request.headers.get("cf-access-jwt-assertion")?.trim();
  if (assertion) return assertion;

  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = cookieHeader.split(";").map((part) => part.trim());
  for (const cookie of cookies) {
    const separator = cookie.indexOf("=");
    if (separator === -1) continue;
    const name = cookie.slice(0, separator);
    if (name === "CF_Authorization") {
      return decodeURIComponent(cookie.slice(separator + 1));
    }
  }
  return null;
}

async function verifyAccessJwt(
  jwt: string,
  teamDomain: string,
  expectedAud: string,
): Promise<AccessJwtPayload | null> {
  const parts = jwt.split(".");
  if (parts.length !== 3) return null;

  let header: AccessJwtHeader;
  let payload: AccessJwtPayload;
  try {
    header = decodeJwtSegment<AccessJwtHeader>(parts[0]);
    payload = decodeJwtSegment<AccessJwtPayload>(parts[1]);
  } catch {
    return null;
  }

  if (header.alg !== "RS256" || !header.kid) return null;
  if (!hasAudience(payload.aud, expectedAud)) return null;

  const expectedIssuer = `https://${teamDomain}`;
  if (stripTrailingSlash(payload.iss || "") !== expectedIssuer) return null;

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp <= now) return null;
  if (typeof payload.nbf === "number" && payload.nbf > now + 30) return null;

  const keys = await getAccessJwks(teamDomain);
  const jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk || jwk.kty !== "RSA") return null;

  const signingInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const signature = base64UrlToBytes(parts[2]);
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const verified = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, signingInput);
  return verified ? payload : null;
}

async function getAccessJwks(teamDomain: string): Promise<AccessJwk[]> {
  const now = Date.now();
  if (accessJwksCache && accessJwksCache.teamDomain === teamDomain && accessJwksCache.expiresAt > now) {
    return accessJwksCache.keys;
  }

  const response = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!response.ok) {
    throw new Error("Unable to load Cloudflare Access certificates");
  }
  const data = (await response.json()) as { keys?: AccessJwk[] };
  const keys = Array.isArray(data.keys) ? data.keys : [];
  accessJwksCache = {
    expiresAt: now + 10 * 60 * 1000,
    keys,
    teamDomain,
  };
  return keys;
}

function decodeJwtSegment<T>(segment: string): T {
  const bytes = base64UrlToBytes(segment);
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function hasAudience(actual: string | string[] | undefined, expected: string): boolean {
  return Array.isArray(actual) ? actual.includes(expected) : actual === expected;
}

function parseCsv(value: string | undefined): string[] {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function withCorsHeaders(headers: Headers, request: Request, env: Env): Headers {
  const origin = request.headers.get("origin");
  const allowedOrigins = new Set(
    [env.SITE_BASE_URL, "http://localhost:1313", "http://127.0.0.1:1313"]
      .concat((env.CORS_ORIGINS || "").split(","))
      .map((value) => stripTrailingSlash((value || "").trim()))
      .filter(Boolean),
  );

  if (origin && allowedOrigins.has(stripTrailingSlash(origin))) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Token");
  headers.set("Access-Control-Max-Age", "86400");
  return headers;
}

function json(data: unknown, status: number, request: Request, env: Env): Response {
  const headers = new Headers(JSON_HEADERS);
  withCorsHeaders(headers, request, env);
  return new Response(JSON.stringify(data), { status, headers });
}

function html(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=UTF-8",
    },
  });
}

async function readPayload(request: Request): Promise<Record<string, any>> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await request.json()) as Record<string, any>;
  }
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    return Object.fromEntries(formData.entries());
  }

  const text = await request.text();
  if (!text.trim()) {
    return {};
  }
  try {
    return JSON.parse(text) as Record<string, any>;
  } catch {
    return {};
  }
}

async function countEvents(env: Env, eventType: string, window: string): Promise<number> {
  const row = await env.GROWTH_DB.prepare(
    `SELECT COUNT(*) AS count
     FROM events
     WHERE event_type = ?1
       AND created_at >= datetime('now', ?2)`,
  )
    .bind(eventType, window)
    .first<{ count: number }>();
  return Number(row?.count || 0);
}

async function countUniqueVisitors(env: Env, window: string): Promise<number> {
  const row = await env.GROWTH_DB.prepare(
    `SELECT COUNT(DISTINCT visitor_id) AS count
     FROM events
     WHERE event_type = 'page_view'
       AND visitor_id IS NOT NULL
       AND created_at >= datetime('now', ?1)`,
  )
    .bind(window)
    .first<{ count: number }>();
  return Number(row?.count || 0);
}

async function countSubscribers(env: Env, status: string): Promise<number> {
  const row = await env.GROWTH_DB.prepare(
    `SELECT COUNT(*) AS count
     FROM subscribers
     WHERE status = ?1`,
  )
    .bind(status)
    .first<{ count: number }>();
  return Number(row?.count || 0);
}

async function countNewSubscribers(env: Env, window: string): Promise<number> {
  const row = await env.GROWTH_DB.prepare(
    `SELECT COUNT(*) AS count
     FROM subscribers
     WHERE created_at >= datetime('now', ?1)`,
  )
    .bind(window)
    .first<{ count: number }>();
  return Number(row?.count || 0);
}

function cleanupSummary(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 320);
}

function extractTag(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? match[1] : null;
}

function stripCdata(value: string | null): string | null {
  if (!value) {
    return value;
  }
  return value.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value === "") {
    return fallback;
  }
  return /^(1|true|yes|on)$/i.test(value);
}

function makeToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function normalizeEmail(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function sanitizePath(value: unknown): string | null {
  const stringValue = String(value || "").trim();
  if (!stringValue) {
    return null;
  }
  if (stringValue.startsWith("http://") || stringValue.startsWith("https://")) {
    try {
      const url = new URL(stringValue);
      return url.pathname || "/";
    } catch {
      return null;
    }
  }
  if (!stringValue.startsWith("/")) {
    return null;
  }
  return stringValue.length > 1024 ? stringValue.slice(0, 1024) : stringValue;
}

function sanitizeReferrer(value: unknown): string | null {
  const stringValue = String(value || "").trim();
  if (!stringValue) {
    return null;
  }
  return stringValue.slice(0, 1024);
}

function sanitizeText(value: unknown, maxLength = 255): string | null {
  const stringValue = String(value || "").trim();
  if (!stringValue) {
    return null;
  }
  return stringValue.slice(0, maxLength);
}

function sanitizeRatio(value: unknown): number | null {
  if (value == null || value === "") {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return Math.max(0, Math.min(0.999999, numeric));
}

function stringifyJson(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function parseJson(value: string | null): unknown {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function cleanDays(value: string | null): number {
  return cleanLimit(value, 30, 1, 365);
}

function cleanLimit(value: string | null, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number(value || fallback);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(maximum, Math.max(minimum, Math.floor(parsed)));
}

function daysWindow(days: number): string {
  return `-${days} days`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
