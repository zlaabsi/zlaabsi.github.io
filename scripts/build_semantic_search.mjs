import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { AutoModel, AutoTokenizer, env } from '@huggingface/transformers';
import { createQuantizer, flattenEmbeddings } from '@zlaabsi/turboquant-wasm';

const DEFAULT_INPUT = 'public/index.json';
const DEFAULT_OUTPUT = 'static/semantic-search';
const MODEL_ID = 'onnx-community/embeddinggemma-300m-ONNX';
const MODEL_DTYPE = 'q4';
const MODEL_FILE_NAME = 'model_no_gather';
const TRANSFORMERS_VERSION = '4.0.1';
const EMBEDDING_DIM = 768;
const QUANT_BITS = 4;
const MAX_CHUNK_CHARS = 900;
const OVERLAP_SENTENCES = 1;
const BATCH_SIZE = 8;
const QUERY_PREFIX = 'task: search result | query: ';
const DOCUMENT_PREFIX = 'title: ';

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
  return String(text || '').replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z0-9]+);/g, (entity, body) => {
    if (HTML_ENTITIES.has(entity)) return HTML_ENTITIES.get(entity);
    if (body.startsWith('#x') || body.startsWith('#X')) {
      return String.fromCodePoint(Number.parseInt(body.slice(2), 16));
    }
    if (body.startsWith('#')) {
      return String.fromCodePoint(Number.parseInt(body.slice(1), 10));
    }
    return entity;
  });
}

function cleanText(text) {
  return decodeHtml(text)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function htmlToText(html) {
  return decodeHtml(
    String(html || '')
      .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/(p|div|section|article|li|ul|ol|blockquote|pre|code|figure|figcaption|tr|td|th|h[1-6])>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
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

function formatQueryForEmbedding(query) {
  return `${QUERY_PREFIX}${String(query || '').trim()}`;
}

function formatDocumentForEmbedding({ title, text }) {
  const safeTitle = cleanText(title) || 'none';
  const safeText = cleanText(text);
  return `${DOCUMENT_PREFIX}${safeTitle} | text: ${safeText}`;
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
    sectionTitle: '',
    snippet: trimSnippet(chunk),
    searchText: [page.title, page.summary, trimSnippet(chunk, 160)].filter(Boolean).join(' '),
    kind: page.kind,
    embedText: [contextPrefix, chunk].filter(Boolean).join(' ').trim(),
  }));
}

function splitTextIntoChunks(text) {
  const sentences = splitIntoSentences(text);
  if (!sentences.length) {
    return text ? [text] : [];
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

  return chunks;
}

function publicHtmlPathForUrl(url, publicRoot) {
  const pathname = new URL(url).pathname;
  if (pathname === '/' || !pathname) {
    return path.join(publicRoot, 'index.html');
  }

  const cleanPath = pathname.replace(/^\/|\/$/g, '');
  return path.join(publicRoot, cleanPath, 'index.html');
}

function extractPostContentHtml(html) {
  const startMatch = /<div class=(?:"post-content"|post-content)[^>]*>/i.exec(html);
  if (!startMatch || startMatch.index === undefined) {
    return html;
  }

  const contentStart = startMatch.index + startMatch[0].length;
  const footerMatch = /<footer class=(?:"post-footer"|post-footer)\b/i.exec(html.slice(contentStart));
  if (!footerMatch || footerMatch.index === undefined) {
    return html.slice(contentStart);
  }

  return html.slice(contentStart, contentStart + footerMatch.index);
}

function extractSectionsFromHtml(html, page) {
  const contentHtml = extractPostContentHtml(html);
  const headingRegex = /<h([2-6])\s+id=(?:"([^"]+)"|([^ >]+))[^>]*>([\s\S]*?)<\/h\1>/gi;
  const headings = [];

  let match;
  while ((match = headingRegex.exec(contentHtml))) {
    const id = match[2] || match[3] || '';
    const title = htmlToText(
      match[4].replace(/<a[^>]*class=(?:"anchor"|anchor)[\s\S]*?<\/a>/gi, ' ')
    );

    if (!title) continue;
    headings.push({
      id,
      title,
      start: match.index,
      end: headingRegex.lastIndex,
    });
  }

  const sections = [];
  const introText = htmlToText(contentHtml.slice(0, headings[0]?.start ?? contentHtml.length));
  if (introText) {
    sections.push({
      url: page.url,
      sectionTitle: '',
      text: introText,
    });
  }

  for (let index = 0; index < headings.length; index += 1) {
    const current = headings[index];
    const next = headings[index + 1];
    const sectionHtml = contentHtml.slice(current.end, next?.start ?? contentHtml.length);
    const sectionText = htmlToText(sectionHtml) || current.title;
    sections.push({
      url: current.id ? `${page.url}#${current.id}` : page.url,
      sectionTitle: current.title,
      text: sectionText,
    });
  }

  return sections;
}

function fallbackSectionsFromPage(page) {
  const content = cleanText(page.content);
  return [
    {
      url: page.url,
      sectionTitle: '',
      text: content || [page.title, page.summary].filter(Boolean).join('. '),
    },
  ];
}

async function extractSectionsForPage(page, publicRoot) {
  try {
    const html = await fs.readFile(publicHtmlPathForUrl(page.url, publicRoot), 'utf8');
    const sections = extractSectionsFromHtml(html, page);
    return sections.length ? sections : fallbackSectionsFromPage(page);
  } catch {
    return fallbackSectionsFromPage(page);
  }
}

async function buildGraph(pages, publicRoot) {
  const graph = {
    pages: [],
    sections: [],
    chunks: [],
  };

  for (const page of pages) {
    const pageId = graph.pages.length;
    const pageNode = {
      id: pageId,
      url: page.url,
      title: page.title,
      summary: page.summary,
      kind: page.kind,
      sectionIds: [],
    };
    graph.pages.push(pageNode);

    const sections = await extractSectionsForPage(page, publicRoot);

    for (const rawSection of sections) {
      const sectionId = graph.sections.length;
      const sectionNode = {
        id: sectionId,
        pageId,
        url: rawSection.url,
        title: rawSection.sectionTitle || '',
        isIntro: !rawSection.sectionTitle,
        chunkIds: [],
      };
      graph.sections.push(sectionNode);
      pageNode.sectionIds.push(sectionId);

      const contextPrefix = [page.title, sectionNode.title, page.summary].filter(Boolean).join('. ').trim();
      const text = cleanText(rawSection.text);
      const rawChunks = splitTextIntoChunks(text);
      const chunkTexts = rawChunks.length ? rawChunks : [contextPrefix || page.title];
      const documentTitle = cleanText(sectionNode.title ? `${page.title} - ${sectionNode.title}` : page.title);

      let previousChunkId = null;

      chunkTexts.forEach((chunkText, chunkIndex) => {
        const chunkId = graph.chunks.length;
        const snippet = trimSnippet(chunkText || contextPrefix || page.title);

        const chunkNode = {
          id: chunkId,
          pageId,
          sectionId,
          url: sectionNode.url,
          snippet,
          searchText: [page.title, sectionNode.title, page.summary, trimSnippet(chunkText || snippet, 180)].filter(Boolean).join(' '),
          chunkIndex,
          prevChunkId: previousChunkId,
          nextChunkId: null,
          embedText: formatDocumentForEmbedding({
            title: documentTitle,
            text: [page.summary, sectionNode.title, chunkText].filter(Boolean).join(' ').trim() || page.title,
          }),
        };

        if (previousChunkId !== null) {
          graph.chunks[previousChunkId].nextChunkId = chunkId;
        }

        graph.chunks.push(chunkNode);
        sectionNode.chunkIds.push(chunkId);
        previousChunkId = chunkId;
      });
    }
  }

  return graph;
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

async function loadEmbeddingGemma() {
  env.allowLocalModels = false;

  const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID);
  const model = await AutoModel.from_pretrained(MODEL_ID, {
    dtype: MODEL_DTYPE,
    model_file_name: MODEL_FILE_NAME,
  });

  return { tokenizer, model };
}

async function embedTexts(texts, embedder) {
  const inputs = embedder.tokenizer(texts, { padding: true, truncation: true });
  const { sentence_embedding } = await embedder.model(inputs);
  return tensorToRows(sentence_embedding);
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
  const publicRoot = path.resolve(path.dirname(inputPath));
  const graph = await buildGraph(pages, publicRoot);
  if (!graph.chunks.length) {
    throw new Error(`No semantic chunks produced from ${inputPath}`);
  }

  console.log(`Embedding ${graph.chunks.length} chunks from ${pages.length} published pages...`);

  const embedder = await loadEmbeddingGemma();
  const embeddings = [];

  for (let offset = 0; offset < graph.chunks.length; offset += BATCH_SIZE) {
    const batch = graph.chunks.slice(offset, offset + BATCH_SIZE);
    const batchRows = await embedTexts(batch.map((chunk) => chunk.embedText), embedder);
    embeddings.push(...batchRows);
    console.log(`Embedded ${Math.min(offset + batch.length, graph.chunks.length)}/${graph.chunks.length}`);
  }

  const quantizer = await createQuantizer({ dim: EMBEDDING_DIM, bits: QUANT_BITS });
  const flat = flattenEmbeddings(embeddings);
  const index = quantizer.buildIndex(flat, embeddings.length);

  await fs.mkdir(outputDir, { recursive: true });

  await fs.writeFile(path.join(outputDir, 'search.index.bin'), Buffer.from(index.save()));
  await fs.writeFile(
    path.join(outputDir, 'search.meta.json'),
    JSON.stringify(
      {
        pages: graph.pages,
        sections: graph.sections,
        chunks: graph.chunks.map(({ embedText, ...meta }) => meta),
      },
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
        sections: graph.sections.length,
        chunks: graph.chunks.length,
        model: MODEL_ID,
        dtype: MODEL_DTYPE,
        modelFileName: MODEL_FILE_NAME,
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
