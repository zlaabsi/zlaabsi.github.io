#!/usr/bin/env node
// Sync email templates with Resend.
// Reads workers/growth-api/templates/*.html, creates or updates templates
// by alias (= template name), publishes them, and prints the alias → id map.
//
// Usage:
//   RESEND_API_KEY=re_xxx node workers/growth-api/scripts/sync-resend-templates.mjs
//
// Optional flags:
//   --dry-run        Print what would change, no API calls.

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const TEMPLATES_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "templates");
const API_BASE = "https://api.resend.com";

const TEMPLATES = [
  {
    name: "blog-welcome",
    file: "welcome.html",
    variables: [
      { key: "SITE_URL", type: "string", fallbackValue: "https://zlaabsi.github.io" },
      { key: "SITE_NAME", type: "string", fallbackValue: "Zakaria Laabsi" },
      { key: "RSS_URL", type: "string", fallbackValue: "https://zlaabsi.github.io/updates.xml" },
      { key: "LATEST_ARTICLE_TITLE", type: "string", fallbackValue: "A recent piece to start with" },
      { key: "LATEST_ARTICLE_URL", type: "string", fallbackValue: "https://zlaabsi.github.io/" },
      { key: "LATEST_ARTICLE_SUMMARY", type: "string", fallbackValue: "Browse the index for the full catalog of essays and notes." },
      { key: "UNSUBSCRIBE_URL", type: "string", fallbackValue: "https://zlaabsi.github.io/" },
    ],
  },
  {
    name: "blog-new-article",
    file: "new-article.html",
    variables: [
      { key: "ARTICLE_TITLE", type: "string", fallbackValue: "A new essay" },
      { key: "ARTICLE_URL", type: "string", fallbackValue: "https://zlaabsi.github.io/" },
      { key: "ARTICLE_SUMMARY", type: "string", fallbackValue: "A fresh piece has been published on the blog." },
      { key: "ARTICLE_READ_TIME", type: "string", fallbackValue: "5 min read" },
      { key: "ARTICLE_PUBLISHED_AT", type: "string", fallbackValue: "Today" },
      { key: "SITE_URL", type: "string", fallbackValue: "https://zlaabsi.github.io" },
      { key: "RSS_URL", type: "string", fallbackValue: "https://zlaabsi.github.io/updates.xml" },
      { key: "UNSUBSCRIBE_URL", type: "string", fallbackValue: "https://zlaabsi.github.io/" },
    ],
  },
  {
    name: "blog-updated-article",
    file: "updated-article.html",
    variables: [
      { key: "ARTICLE_TITLE", type: "string", fallbackValue: "A revised essay" },
      { key: "ARTICLE_URL", type: "string", fallbackValue: "https://zlaabsi.github.io/" },
      { key: "UPDATE_SUMMARY", type: "string", fallbackValue: "A substantial revision has been made to this essay." },
      { key: "ARTICLE_READ_TIME", type: "string", fallbackValue: "5 min read" },
      { key: "ARTICLE_UPDATED_AT", type: "string", fallbackValue: "Today" },
      { key: "SITE_URL", type: "string", fallbackValue: "https://zlaabsi.github.io" },
      { key: "RSS_URL", type: "string", fallbackValue: "https://zlaabsi.github.io/updates.xml" },
      { key: "UNSUBSCRIBE_URL", type: "string", fallbackValue: "https://zlaabsi.github.io/" },
    ],
  },
];

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const apiKey = process.env.RESEND_API_KEY;

if (!dryRun && !apiKey) {
  console.error("RESEND_API_KEY is not set. Either export it or run with --dry-run.");
  process.exit(1);
}

async function call(method, path, body) {
  if (dryRun) {
    console.log(`[dry-run] ${method} ${path}`, body ? JSON.stringify(body).slice(0, 120) + "..." : "");
    return { id: "dry-run-id", name: body?.name };
  }
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    throw new Error(`Resend API ${method} ${path} failed (${response.status}): ${typeof data === "string" ? data : JSON.stringify(data)}`);
  }
  return data;
}

async function findTemplateByName(name) {
  const list = await call("GET", "/templates?limit=100");
  const items = list?.data || list?.templates || [];
  return items.find((t) => t.name === name) || null;
}

function validateVariablesInHtml(html, declaredVars) {
  const declared = new Set(declaredVars.map((v) => v.key));
  const usedMatches = html.matchAll(/\{\{\{\s*([A-Z0-9_]+)\s*\}\}\}/g);
  const used = new Set(Array.from(usedMatches, (m) => m[1]));

  const missing = Array.from(used).filter((key) => !declared.has(key));
  const unused = Array.from(declared).filter((key) => !used.has(key));

  return { missing, unused };
}

async function main() {
  const filesPresent = readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith(".html"));
  console.log(`Found ${filesPresent.length} template files, syncing ${TEMPLATES.length} definitions.`);

  const results = [];
  for (const tpl of TEMPLATES) {
    const html = readFileSync(join(TEMPLATES_DIR, tpl.file), "utf8");

    const check = validateVariablesInHtml(html, tpl.variables);
    if (check.missing.length) {
      console.error(`  ✗ ${tpl.name}: missing variable declarations for ${check.missing.join(", ")}`);
      process.exitCode = 1;
      continue;
    }
    if (check.unused.length) {
      console.warn(`  ! ${tpl.name}: declared but unused in HTML: ${check.unused.join(", ")}`);
    }

    console.log(`\n→ ${tpl.name}  (${tpl.file}, ${html.length} bytes, ${tpl.variables.length} vars)`);

    const existing = dryRun ? null : await findTemplateByName(tpl.name);
    let record;
    if (existing) {
      console.log(`  update ${existing.id}`);
      record = await call("PATCH", `/templates/${existing.id}`, {
        name: tpl.name,
        html,
        variables: tpl.variables,
      });
    } else {
      console.log("  create");
      record = await call("POST", "/templates", {
        name: tpl.name,
        html,
        variables: tpl.variables,
      });
    }

    console.log(`  publish ${record.id}`);
    await call("POST", `/templates/${record.id}/publish`, {});

    results.push({ name: tpl.name, id: record.id });
  }

  console.log("\nAlias → id map:");
  for (const r of results) console.log(`  ${r.name.padEnd(24)} ${r.id}`);

  console.log("\nThe worker references templates by alias (= name), so you don't need to store IDs in env vars.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
