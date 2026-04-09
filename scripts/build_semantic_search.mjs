import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { pipeline, env } from '@huggingface/transformers';
import { createQuantizer, flattenEmbeddings } from '@zlaabsi/turboquant-wasm';

const DEFAULT_INPUT = 'public/index.json';
const DEFAULT_OUTPUT = 'static/semantic-search';
const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
const TRANSFORMERS_VERSION = '4.0.1';
const EMBEDDING_DIM = 384;
const QUANT_BITS = 4;
const MAX_CHUNK_CHARS = 900;
const OVERLAP_SENTENCES = 1;
const BATCH_SIZE = 8;

const HTML_ENTITIES = new Map([
  ['&amp;', '&'],
  ['&lt;', '<'],
  ['&gt;', '>'],
  ['&quot;', '"'],
  ['&#39;', "'"],
  ['&rsquo;', "'"],
  ['&lsquo;', "'"],
  ['&ldquo;', '"'],
  ['&rdquo;', '"'],
  ['&ndash;', '-'],
  ['&mdash;', '-'],
  ['&nbsp;', ' '],
  ['&hellip;', '...'],
]);

function decodeHtml(text) {
  return String(text || '').replace(/&[a-zA-Z#0-9]+;/g, (entity) => HTML_ENTITIES.get(entity) || entity);
}

function cleanText(text) {
  return decodeHtml(text)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferKind(url) {
  let pathname = '/';
  try {
    pathname = new URL(url).pathname;
  } catch {
    pathname = url;
  }
  if (pathname.startsWith('/posts/')) return 'Post';
  if (pathname.startsWith('/projects/')) return 'Projects';
  if (pathname.startsWith('/about/')) return 'About';
  return 'Page';
}

function trimSnippet(text, maxLength = 240) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}

function splitIntoSentences(text) {
  if (!text) return [];
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function chunkPage(page) {
  const contextPrefix = [page.title, page.summary].filter(Boolean).join('. ').trim();
  const content = cleanText(page.content);
  const sentences = splitIntoSentences(content);

  if (!sentences.length) {
    return [
      {
        canonicalUrl: page.url,
        url: page.url,
        title: page.title,
        summary: page.summary,
        snippet: trimSnippet(contextPrefix || content || page.title),
        searchText: [page.title, page.summary].filter(Boolean).join(' '),
        kind: page.kind,
        embedText: [contextPrefix, content].filter(Boolean).join(' ').trim() || page.title,
      },
    ];
  }

  const chunks = [];
  let current = [];
  let currentLength = 0;

  for (const sentence of sentences) {
    const nextLength = currentLength + sentence.length + (current.length ? 1 : 0);
    if (current.length && nextLength > MAX_CHUNK_CHARS) {
      chunks.push(current.join(' '));
      current = current.slice(-OVERLAP_SENTENCES);
      currentLength = current.join(' ').length;
    }
    current.push(sentence);
    currentLength = current.join(' ').length;
  }

  if (current.length) {
    chunks.push(current.join(' '));
  }

  return chunks.map((chunk) => ({
    canonicalUrl: page.url,
    url: page.url,
    title: page.title,
    summary: page.summary,
    snippet: trimSnippet(chunk),
    searchText: [page.title, page.summary, trimSnippet(chunk, 160)].filter(Boolean).join(' '),
    kind: page.kind,
    embedText: [contextPrefix, chunk].filter(Boolean).join(' ').trim(),
  }));
}

function tensorToRows(tensor) {
  const [batch, dim] = tensor.dims;
  const rows = [];
  for (let row = 0; row < batch; row += 1) {
    const start = row * dim;
    rows.push(Array.from(tensor.data.slice(start, start + dim)));
  }
  return rows;
}

function parseArgs() {
  const [inputPath = DEFAULT_INPUT, outputDir = DEFAULT_OUTPUT] = process.argv.slice(2);
  return { inputPath, outputDir };
}

async function readPublishedPages(inputPath) {
  const raw = JSON.parse(await fs.readFile(inputPath, 'utf8'));
  if (!Array.isArray(raw) || !raw.length) {
    throw new Error(`No searchable pages found in ${inputPath}`);
  }

  return raw
    .filter((entry) => entry?.title && entry?.permalink)
    .map((entry) => ({
      title: cleanText(entry.title),
      summary: cleanText(entry.summary),
      content: cleanText(entry.content),
      url: entry.permalink,
      kind: inferKind(entry.permalink),
    }));
}

async function buildSearchArtifacts(inputPath, outputDir) {
  const pages = await readPublishedPages(inputPath);
  const chunks = pages.flatMap((page) => chunkPage(page));
  if (!chunks.length) {
    throw new Error(`No semantic chunks produced from ${inputPath}`);
  }

  console.log(`Embedding ${chunks.length} chunks from ${pages.length} published pages...`);

  env.allowLocalModels = false;

  const extractor = await pipeline('feature-extraction', MODEL_ID);
  const embeddings = [];

  for (let offset = 0; offset < chunks.length; offset += BATCH_SIZE) {
    const batch = chunks.slice(offset, offset + BATCH_SIZE);
    const tensor = await extractor(
      batch.map((chunk) => chunk.embedText),
      { pooling: 'mean', normalize: true }
    );
    embeddings.push(...tensorToRows(tensor));
    console.log(`Embedded ${Math.min(offset + batch.length, chunks.length)}/${chunks.length}`);
  }

  const quantizer = await createQuantizer({ dim: EMBEDDING_DIM, bits: QUANT_BITS });
  const flat = flattenEmbeddings(embeddings);
  const index = quantizer.buildIndex(flat, embeddings.length);

  await fs.mkdir(outputDir, { recursive: true });

  await fs.writeFile(path.join(outputDir, 'search.index.bin'), Buffer.from(index.save()));
  await fs.writeFile(
    path.join(outputDir, 'search.meta.json'),
    JSON.stringify(
      chunks.map(({ embedText, ...meta }, id) => ({ id, ...meta })),
      null,
      2
    )
  );
  await fs.writeFile(
    path.join(outputDir, 'search.version.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        pages: pages.length,
        chunks: chunks.length,
        model: MODEL_ID,
        transformersVersion: TRANSFORMERS_VERSION,
        dim: EMBEDDING_DIM,
        bits: QUANT_BITS,
      },
      null,
      2
    )
  );

  index.free();
  quantizer.free();

  console.log(`Semantic search artifacts written to ${outputDir}`);
}

const { inputPath, outputDir } = parseArgs();
await buildSearchArtifacts(inputPath, outputDir);
