// Aggregates behind the dashboard: one call returns every section for a period.

type Row = Record<string, unknown>;

async function all(db: D1Database, sql: string, ...binds: unknown[]): Promise<Row[]> {
  const result = await db.prepare(sql).bind(...binds).all<Row>();
  return result.results ?? [];
}

export async function getReport(db: D1Database, days: number): Promise<Record<string, unknown>> {
  const since = `-${days} days`;

  // One row per page load: the largest running total it reported, capped at
  // thirty minutes so a tab left open does not pass for a long read.
  const READS = `
    SELECT pathname,
           json_extract(meta_json, '$.pageId') AS page_id,
           MIN(MAX(json_extract(meta_json, '$.activeMs')), 1800000) AS active_ms,
           MAX(json_extract(meta_json, '$.maxScroll')) AS max_scroll
    FROM events
    WHERE event_type = 'engagement' AND created_at >= datetime('now', ?1)
    GROUP BY pathname, page_id`;

  const [
    totals,
    readTotals,
    daily,
    pages,
    reads,
    cardImpressions,
    cardClicks,
    figures,
    referrers,
    sections,
    sharesByNetwork,
    sharesByPage,
    journeys,
    subscribers,
    subscriberDays,
    dispatches,
    emailTotals,
    emailLinks,
    recent,
  ] = await Promise.all([
    all(
      db,
      `SELECT
         SUM(event_type = 'page_view') AS page_views,
         SUM(event_type = 'page_view' AND visitor_id IS NOT NULL) AS identified_views,
         COUNT(DISTINCT visitor_id) AS visitors,
         COUNT(DISTINCT session_id) AS sessions,
         SUM(event_type = 'share') AS shares
       FROM events WHERE created_at >= datetime('now', ?1)`,
      since,
    ),
    all(db, `SELECT COUNT(*) AS reads, AVG(active_ms) AS avg_ms, AVG(max_scroll) AS avg_scroll FROM (${READS})`, since),
    all(
      db,
      `SELECT date(created_at) AS day,
              SUM(event_type = 'page_view') AS page_views,
              COUNT(DISTINCT visitor_id) AS visitors
       FROM events WHERE created_at >= datetime('now', ?1)
       GROUP BY day ORDER BY day`,
      since,
    ),
    all(
      db,
      `SELECT pathname, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors
       FROM events
       WHERE event_type = 'page_view' AND created_at >= datetime('now', ?1) AND pathname IS NOT NULL
       GROUP BY pathname ORDER BY views DESC LIMIT 40`,
      since,
    ),
    all(
      db,
      `SELECT pathname, COUNT(*) AS reads, AVG(active_ms) AS avg_ms, AVG(max_scroll) AS avg_scroll
       FROM (${READS}) GROUP BY pathname`,
      since,
    ),
    all(
      db,
      `SELECT target_path, COUNT(*) AS impressions
       FROM events
       WHERE event_type = 'impression' AND context = 'article-card' AND created_at >= datetime('now', ?1)
       GROUP BY target_path ORDER BY impressions DESC LIMIT 40`,
      since,
    ),
    all(
      db,
      `SELECT target_path, COUNT(*) AS clicks
       FROM events
       WHERE event_type = 'article_click' AND context = 'listing' AND created_at >= datetime('now', ?1)
         AND created_at >= (SELECT COALESCE(MIN(created_at), '9999') FROM events WHERE event_type = 'impression')
       GROUP BY target_path`,
      since,
    ),
    all(
      db,
      `SELECT pathname, target_text AS figure,
              SUM(event_type = 'impression') AS impressions,
              SUM(event_type = 'figure_interact') AS interactions
       FROM events
       WHERE context = 'figure' AND event_type IN ('impression', 'figure_interact')
         AND created_at >= datetime('now', ?1)
       GROUP BY pathname, figure ORDER BY impressions DESC LIMIT 60`,
      since,
    ),
    all(
      db,
      `SELECT referrer, COUNT(*) AS visits
       FROM events
       WHERE event_type = 'page_view' AND referrer IS NOT NULL AND referrer != ''
         AND created_at >= datetime('now', ?1)
       GROUP BY referrer ORDER BY visits DESC LIMIT 200`,
      since,
    ),
    all(
      db,
      `SELECT COALESCE(target_path, target_text) AS target, COUNT(*) AS clicks
       FROM events
       WHERE event_type = 'ui_click' AND context = 'nav' AND created_at >= datetime('now', ?1)
       GROUP BY target ORDER BY clicks DESC LIMIT 20`,
      since,
    ),
    all(
      db,
      `SELECT context AS network, COUNT(*) AS shares
       FROM events WHERE event_type = 'share' AND created_at >= datetime('now', ?1)
       GROUP BY network ORDER BY shares DESC`,
      since,
    ),
    all(
      db,
      `SELECT target_path, COUNT(*) AS shares
       FROM events WHERE event_type = 'share' AND created_at >= datetime('now', ?1)
       GROUP BY target_path ORDER BY shares DESC LIMIT 20`,
      since,
    ),
    all(
      db,
      `SELECT from_path, to_path, COUNT(*) AS times FROM (
         SELECT pathname AS from_path,
                LEAD(pathname) OVER (PARTITION BY session_id ORDER BY id) AS to_path
         FROM events
         WHERE event_type = 'page_view' AND session_id IS NOT NULL AND created_at >= datetime('now', ?1)
       )
       WHERE to_path IS NOT NULL AND to_path != from_path
       GROUP BY from_path, to_path ORDER BY times DESC LIMIT 20`,
      since,
    ),
    all(
      db,
      `SELECT SUM(status = 'active') AS active, SUM(status != 'active') AS unsubscribed, COUNT(*) AS total
       FROM subscribers`,
    ),
    all(
      db,
      `SELECT day, SUM(joined) AS joined, SUM(left_list) AS left_list FROM (
         SELECT date(created_at) AS day, 1 AS joined, 0 AS left_list FROM subscribers
         WHERE created_at >= datetime('now', ?1)
         UNION ALL
         SELECT date(unsubscribed_at), 0, 1 FROM subscribers
         WHERE unsubscribed_at IS NOT NULL AND unsubscribed_at >= datetime('now', ?1)
       ) GROUP BY day ORDER BY day`,
      since,
    ),
    all(
      db,
      `SELECT d.id, d.clean_title, d.feed_kind, d.published_at, d.status, d.recipient_count,
              COUNT(DISTINCT CASE WHEN e.event_type = 'delivered' THEN l.subscriber_email END) AS delivered,
              COUNT(DISTINCT CASE WHEN e.event_type = 'opened' THEN l.subscriber_email END) AS opened,
              COUNT(DISTINCT CASE WHEN e.event_type = 'clicked' THEN l.subscriber_email END) AS clicked,
              COUNT(DISTINCT CASE WHEN e.event_type IN ('bounced', 'complained') THEN l.subscriber_email END) AS failed
       FROM newsletter_dispatches d
       LEFT JOIN newsletter_delivery_log l ON l.dispatch_id = d.id
       LEFT JOIN email_events e ON e.provider_message_id = l.provider_message_id
       GROUP BY d.id ORDER BY d.published_at DESC LIMIT 20`,
    ),
    all(
      db,
      `SELECT event_type, COUNT(*) AS events, COUNT(DISTINCT provider_message_id) AS emails
       FROM email_events WHERE occurred_at >= datetime('now', ?1)
       GROUP BY event_type`,
      since,
    ),
    all(
      db,
      `SELECT link, COUNT(*) AS clicks FROM email_events
       WHERE event_type = 'clicked' AND link IS NOT NULL AND occurred_at >= datetime('now', ?1)
       GROUP BY link ORDER BY clicks DESC LIMIT 15`,
      since,
    ),
    all(
      db,
      `SELECT created_at, event_type, pathname, context, COALESCE(target_path, target_text) AS target,
              visitor_id IS NOT NULL AS identified
       FROM events ORDER BY id DESC LIMIT 40`,
    ),
  ]);

  return {
    ok: true,
    days,
    generatedAt: new Date().toISOString(),
    totals: { ...(totals[0] ?? {}), ...(readTotals[0] ?? {}) },
    daily,
    pages,
    reads,
    impressions: { cards: cardImpressions, cardClicks, figures },
    referrers,
    sections,
    shares: { byNetwork: sharesByNetwork, byPage: sharesByPage },
    journeys,
    newsletter: {
      subscribers: subscribers[0] ?? {},
      days: subscriberDays,
      dispatches,
      emailTotals,
      emailLinks,
    },
    recent,
  };
}
