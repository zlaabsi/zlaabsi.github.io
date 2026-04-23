import { renderDashboardHTML } from "./dashboard";

type DeliveryStatus = "sent" | "failed";
type DispatchStatus = "pending" | "sent" | "partial" | "failed";

interface Env {
  GROWTH_DB: D1Database;
  ADMIN_TOKEN?: string;
  CORS_ORIGINS?: string;
  NEWSLETTER_ENABLED?: string;
  NEWSLETTER_FEED_URL?: string;
  PUBLIC_API_BASE_URL?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  RESEND_REPLY_TO?: string;
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
]);

const ADMIN_PATHS = new Set([
  "/api/admin/summary",
  "/api/admin/top-pages",
  "/api/admin/top-clicks",
  "/api/admin/recent-events",
  "/api/admin/subscribers",
  "/api/admin/email-deliveries",
  "/api/admin/heatmap",
  "/api/admin/dispatch-now",
]);

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
        return html(renderDashboardHTML());
      }

      if (url.pathname === "/unsubscribe" && request.method === "GET") {
        return handleUnsubscribe(url, env);
      }

      if (ADMIN_PATHS.has(url.pathname)) {
        if (!isAuthorized(request, env)) {
          return json({ ok: false, error: "Unauthorized" }, 401, request, env);
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
  const unsubscribeUrl = `${apiBaseUrl}/unsubscribe?token=${encodeURIComponent(subscriber.unsubscribe_token)}`;
  const articleUrl = dispatch.feed_url;
  const subjectPrefix = dispatch.feed_kind === "updated" ? "Updated article" : "New article";
  const subject = `[Zakaria Laabsi] ${subjectPrefix}: ${dispatch.clean_title}`;
  const summary = dispatch.summary || "A fresh update is available on the blog.";
  const html = renderEmailHtml(dispatch, articleUrl, unsubscribeUrl, summary);
  const text = renderEmailText(dispatch, articleUrl, unsubscribeUrl, summary);

  return sendResendEmail(env, {
    to: subscriber.email,
    subject,
    html,
    text,
    idempotencyKey: `${dispatch.feed_guid}:${subscriber.email}`,
    tags: [
      { name: "kind", value: dispatch.feed_kind },
      { name: "entry_guid", value: dispatch.feed_guid.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 200) },
    ],
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
  const updatesUrl = `${siteBaseUrl}/updates.xml`;
  const sourceUrl = sourcePage ? `${siteBaseUrl}${sourcePage}` : siteBaseUrl;
  const subject = "[Zakaria Laabsi] Subscription confirmed";
  const html =
    `<p>You are now subscribed to blog updates from Zakaria Laabsi.</p>` +
    `<p>You will only receive emails for new essays and substantial revisions.</p>` +
    `<p><a href="${escapeHtml(sourceUrl)}">Return to the page you subscribed from</a><br>` +
    `<a href="${escapeHtml(updatesUrl)}">Prefer RSS instead?</a><br>` +
    `<a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe</a></p>`;
  const text =
    `You are now subscribed to blog updates from Zakaria Laabsi.\n\n` +
    `Return: ${sourceUrl}\n` +
    `RSS: ${updatesUrl}\n` +
    `Unsubscribe: ${unsubscribeUrl}`;

  const delivery = await sendResendEmail(env, {
    to: email,
    subject,
    html,
    text,
    idempotencyKey: `welcome:${email}`,
    tags: [{ name: "kind", value: "welcome" }],
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
    html: string;
    text: string;
    idempotencyKey: string;
    tags?: Array<{ name: string; value: string }>;
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
        html: message.html,
        text: message.text,
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

function renderEmailHtml(
  dispatch: DispatchRow,
  articleUrl: string,
  unsubscribeUrl: string,
  summary: string,
): string {
  const kindLabel = dispatch.feed_kind === "updated" ? "Updated article" : "New article";
  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #1f1f1f; padding: 24px;">
    <p style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #8a6a24; margin: 0 0 12px;">${kindLabel}</p>
    <h1 style="margin: 0 0 16px; font-size: 24px; line-height: 1.2;">${escapeHtml(dispatch.clean_title)}</h1>
    <p style="margin: 0 0 18px;">${escapeHtml(summary)}</p>
    <p style="margin: 0 0 18px;"><a href="${escapeHtml(
      articleUrl,
    )}" style="display: inline-block; padding: 10px 14px; background: #b8860b; color: #fff8ea; text-decoration: none; border-radius: 8px;">Read the update</a></p>
    <p style="margin: 22px 0 0; color: #555;">You are receiving this because you subscribed to blog updates on zlaabsi.github.io.</p>
    <p style="margin: 6px 0 0;"><a href="${escapeHtml(unsubscribeUrl)}" style="color: #8a6a24;">Unsubscribe</a></p>
  </div>`;
}

function renderEmailText(
  dispatch: DispatchRow,
  articleUrl: string,
  unsubscribeUrl: string,
  summary: string,
): string {
  const kindLabel = dispatch.feed_kind === "updated" ? "Updated article" : "New article";
  return `${kindLabel}: ${dispatch.clean_title}

${summary}

Read: ${articleUrl}
Unsubscribe: ${unsubscribeUrl}`;
}

function isAuthorized(request: Request, env: Env): boolean {
  const expected = env.ADMIN_TOKEN;
  if (!expected) {
    return false;
  }
  const authHeader = request.headers.get("authorization");
  const headerToken =
    authHeader?.toLowerCase().startsWith("bearer ")
      ? authHeader.slice("bearer ".length).trim()
      : request.headers.get("x-admin-token")?.trim() || "";
  return headerToken === expected;
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
