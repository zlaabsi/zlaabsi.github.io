import * as params from '@params';

const root = document.querySelector('[data-semantic-search]');

if (root) {
  /** Strip LaTeX markup from text for clean display in search results. */
  function stripLatex(text) {
    if (!text) return text;
    return text
      .replace(/\$\$[^$]*\$\$/g, '')
      .replace(/\$([^$]+)\$/g, (_, inner) => {
        return inner
          .replace(/\\(?:text|mathrm|textbf|mathbf|mathbb|operatorname)\{([^}]*)\}/g, '$1')
          .replace(/\\[lr]Vert\b/g, '‖').replace(/\\[lr]angle\b/g, '')
          .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1/$2')
          .replace(/\\sqrt\{([^}]*)\}/g, 'sqrt($1)')
          .replace(/\\(log|exp|min|max|arg|sup|inf|cos|sin|tan)\b/g, '$1')
          .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1')
          .replace(/\\[a-zA-Z]+/g, '')
          .replace(/[{}]/g, '').replace(/_/g, '').replace(/\^/g, '')
          .replace(/\s+/g, ' ').trim();
      })
      .replace(/\s{2,}/g, ' ').trim();
  }
  const input = document.getElementById('semanticSearchInput');
  const form = document.getElementById('semanticSearchForm');
  const resultsNode = document.getElementById('semanticSearchResults');
  const statusNode = document.getElementById('semanticSearchStatus');
  const statsNode = document.getElementById('semanticSearchStats');
  const emptyNode = document.getElementById('semanticSearchEmpty');
  const suggestionButtons = Array.from(document.querySelectorAll('[data-semantic-query]'));

  const state = {
    graph: null,
    pages: [],
    sections: [],
    chunks: [],
    pagesById: new Map(),
    sectionsById: new Map(),
    chunksById: new Map(),
    version: null,
    quantizer: null,
    index: null,
    embedder: null,
    embedderPromise: null,
    assetPromise: null,
    searchToken: 0,
    semanticEnabled: true,
    ready: false,
  };

  let turboQuantRuntimePromise = null;

  function setStatus(text, tone) {
    statusNode.textContent = text;
    statusNode.dataset.tone = tone || 'default';
  }

  function setStats(text) {
    statsNode.textContent = text || '';
  }

  async function loadTurboQuantRuntime() {
    if (turboQuantRuntimePromise) return turboQuantRuntimePromise;

    turboQuantRuntimePromise = (async () => {
      const glueUrl = `https://cdn.jsdelivr.net/npm/@zlaabsi/turboquant-wasm@${params.turboquantVersion}/pkg-bundler/turboquant_wasm_bg.js`;
      const wasmUrl = `https://cdn.jsdelivr.net/npm/@zlaabsi/turboquant-wasm@${params.turboquantVersion}/pkg-bundler/turboquant_wasm_bg.wasm`;

      const glue = await import(glueUrl);
      const imports = { './turboquant_wasm_bg.js': glue };
      const response = await fetch(wasmUrl);

      let instantiated;
      try {
        instantiated = await WebAssembly.instantiateStreaming(response, imports);
      } catch {
        const bytes = await response.arrayBuffer();
        instantiated = await WebAssembly.instantiate(bytes, imports);
      }

      glue.__wbg_set_wasm(instantiated.instance.exports);

      class Quantizer {
        constructor(inner, dim, bits) {
          this.inner = inner;
          this.dim = dim;
          this.bits = bits;
        }

        free() {
          this.inner.free();
        }
      }

      class SearchIndex {
        constructor(inner, quantizer) {
          this.inner = inner;
          this.quantizer = quantizer;
        }

        static load(data, quantizer) {
          return new SearchIndex(glue.CompressedIndex.load(data), quantizer);
        }

        search(query, k = 10) {
          return Array.from(this.inner.search(this.quantizer.inner, query, k));
        }

        free() {
          this.inner.free();
        }
      }

      return {
        async createQuantizer({ dim, bits = 4, seed = 42n }) {
          return new Quantizer(new glue.TurboQuantizer(dim, bits, BigInt(seed)), dim, bits);
        },
        Index: SearchIndex,
      };
    })();

    return turboQuantRuntimePromise;
  }

  function normalizeText(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function relativeUrl(value) {
    try {
      const url = new URL(value);
      return `${url.pathname}${url.hash}`;
    } catch {
      return value;
    }
  }

  function resultKey(doc) {
    return doc.url || doc.canonicalUrl || '';
  }

  function trimText(value, maxLength = 320) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength).trimEnd()}...`;
  }

  function legacyMetaToGraph(meta) {
    const pages = [];
    const sections = [];
    const chunks = [];
    const pageByUrl = new Map();
    const sectionByUrl = new Map();

    for (const entry of meta) {
      const canonicalUrl = entry.canonicalUrl || entry.url;
      let page = pageByUrl.get(canonicalUrl);
      if (!page) {
        page = {
          id: pages.length,
          url: canonicalUrl,
          title: entry.title,
          summary: entry.summary,
          kind: entry.kind,
          sectionIds: [],
        };
        pages.push(page);
        pageByUrl.set(canonicalUrl, page);
      }

      let section = sectionByUrl.get(entry.url);
      if (!section) {
        section = {
          id: sections.length,
          pageId: page.id,
          url: entry.url,
          title: entry.sectionTitle || '',
          isIntro: !entry.sectionTitle,
          chunkIds: [],
        };
        sections.push(section);
        sectionByUrl.set(entry.url, section);
        page.sectionIds.push(section.id);
      }

      const chunk = {
        id: chunks.length,
        pageId: page.id,
        sectionId: section.id,
        url: entry.url,
        snippet: entry.snippet,
        searchText: entry.searchText,
        chunkIndex: section.chunkIds.length,
        prevChunkId: section.chunkIds.length ? section.chunkIds[section.chunkIds.length - 1] : null,
        nextChunkId: null,
      };

      if (chunk.prevChunkId !== null) {
        chunks[chunk.prevChunkId].nextChunkId = chunk.id;
      }

      chunks.push(chunk);
      section.chunkIds.push(chunk.id);
    }

    return { pages, sections, chunks };
  }

  function ingestGraph(rawMeta) {
    const graph = Array.isArray(rawMeta) ? legacyMetaToGraph(rawMeta) : rawMeta;
    const pages = Array.isArray(graph.pages) ? graph.pages : [];
    const sections = Array.isArray(graph.sections) ? graph.sections : [];
    const chunks = Array.isArray(graph.chunks) ? graph.chunks : [];

    state.graph = graph;
    state.pages = pages;
    state.sections = sections;
    state.chunks = chunks;
    state.pagesById = new Map(pages.map((page) => [page.id, page]));
    state.sectionsById = new Map(sections.map((section) => [section.id, section]));
    state.chunksById = new Map(chunks.map((chunk) => [chunk.id, chunk]));
  }

  function pageForSection(section) {
    return state.pagesById.get(section.pageId);
  }

  function sectionForChunk(chunk) {
    return state.sectionsById.get(chunk.sectionId);
  }

  function buildSectionSnippet(section, preferredChunkIds = []) {
    const picked = [];

    function addChunk(chunkId) {
      const chunk = state.chunksById.get(chunkId);
      if (!chunk) return;
      if (picked.some((item) => item.id === chunk.id)) return;
      picked.push(chunk);
    }

    for (const chunkId of preferredChunkIds) {
      const chunk = state.chunksById.get(chunkId);
      if (!chunk) continue;
      addChunk(chunk.prevChunkId);
      addChunk(chunk.id);
      addChunk(chunk.nextChunkId);
      if (picked.length >= 3) break;
    }

    if (!picked.length && Array.isArray(section.chunkIds)) {
      for (const chunkId of section.chunkIds.slice(0, 2)) {
        addChunk(chunkId);
      }
    }

    return trimText(
      picked
        .map((chunk) => chunk.snippet)
        .filter(Boolean)
        .join(' ... ')
    );
  }

  function rememberChunk(entry, chunkId, score) {
    if (chunkId === null || chunkId === undefined) return;
    const existing = entry.chunkHits.find((item) => item.chunkId === chunkId);
    if (existing) {
      existing.score = Math.max(existing.score, score);
    } else {
      entry.chunkHits.push({ chunkId, score });
    }
    entry.chunkHits.sort((a, b) => b.score - a.score);
    if (entry.chunkHits.length > 4) entry.chunkHits.length = 4;
  }

  function renderEmpty(message) {
    resultsNode.innerHTML = '';
    emptyNode.hidden = false;
    emptyNode.textContent = message;
  }

  function renderResults(results, query) {
    if (!results.length) {
      renderEmpty(`No result for "${query}".`);
      return;
    }

    emptyNode.hidden = true;
    resultsNode.innerHTML = '';

    for (const result of results) {
      const item = document.createElement('li');
      item.className = 'post-entry semantic-search-result';

      const header = document.createElement('header');
      header.className = 'entry-header';

      if (result.sectionTitle) {
        const context = document.createElement('div');
        context.className = 'semantic-search-result__context';
        context.textContent = stripLatex(result.title);
        header.appendChild(context);
      }

      const title = document.createElement('span');
      title.className = 'semantic-search-result__title';
      title.textContent = stripLatex(result.sectionTitle || result.title);
      header.appendChild(title);

      const badgeWrap = document.createElement('span');
      badgeWrap.className = 'semantic-search-result__badges';

      const kindBadge = document.createElement('span');
      kindBadge.className = 'semantic-search-result__badge semantic-search-result__badge--kind';
      kindBadge.textContent = result.kind;
      badgeWrap.appendChild(kindBadge);

      for (const reason of result.reasons) {
        const badge = document.createElement('span');
        badge.className = 'semantic-search-result__badge';
        badge.textContent = reason;
        badgeWrap.appendChild(badge);
      }

      header.appendChild(badgeWrap);
      item.appendChild(header);

      const content = document.createElement('div');
      content.className = 'entry-content';
      content.textContent = stripLatex(result.snippet || result.summary || result.title);
      item.appendChild(content);

      const footer = document.createElement('footer');
      footer.className = 'entry-footer';
      footer.textContent = relativeUrl(result.url || result.canonicalUrl);
      item.appendChild(footer);

      const link = document.createElement('a');
      link.className = 'entry-link';
      link.href = relativeUrl(result.url);
      link.setAttribute('aria-label', result.sectionTitle || result.title);
      item.appendChild(link);

      resultsNode.appendChild(item);
    }
  }

  function tokensForQuery(query) {
    return normalizeText(query)
      .split(' ')
      .filter((token) => token.length > 1);
  }

  function rankLexical(query) {
    const normalized = normalizeText(query);
    const tokens = tokensForQuery(query);
    const bySection = new Map();

    for (const chunk of state.chunks) {
      const section = sectionForChunk(chunk);
      const page = section ? pageForSection(section) : null;
      if (!section || !page) continue;

      const sectionTitle = normalizeText(section.title);
      const title = normalizeText(page.title);
      const summary = normalizeText(page.summary);
      const snippet = normalizeText(chunk.snippet);
      const haystack = normalizeText(chunk.searchText);

      let score = 0;
      if (normalized && sectionTitle.includes(normalized)) score += 160;
      if (normalized && title.includes(normalized)) score += 120;
      if (normalized && summary.includes(normalized)) score += 55;
      if (normalized && snippet.includes(normalized)) score += 42;
      if (normalized && haystack.includes(normalized)) score += 24;

      let coverage = 0;
      for (const token of tokens) {
        let matched = false;
        if (sectionTitle.includes(token)) {
          score += 30;
          matched = true;
        }
        if (title.includes(token)) {
          score += 18;
          matched = true;
        }
        if (summary.includes(token)) {
          score += 9;
          matched = true;
        }
        if (snippet.includes(token)) {
          score += 10;
          matched = true;
        }
        if (haystack.includes(token)) {
          score += 4;
          matched = true;
        }
        if (matched) coverage += 1;
      }

      if (coverage) score += coverage * 12;
      if (tokens.length > 1 && coverage === tokens.length) score += 28;
      if (!score) continue;

      let entry = bySection.get(section.id);
      if (!entry) {
        entry = {
          page,
          section,
          score: 0,
          chunkHits: [],
          maxCoverage: 0,
          hasNormalizedMatch: false,
        };
        bySection.set(section.id, entry);
      }

      const weight = entry.chunkHits.length ? 0.38 : 1;
      entry.score += score * weight;
      entry.maxCoverage = Math.max(entry.maxCoverage, coverage);
      entry.hasNormalizedMatch =
        entry.hasNormalizedMatch ||
        (Boolean(normalized) && (
          sectionTitle.includes(normalized) ||
          title.includes(normalized) ||
          summary.includes(normalized) ||
          snippet.includes(normalized) ||
          haystack.includes(normalized)
        ));
      rememberChunk(entry, chunk.id, score);
    }

    return Array.from(bySection.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, params.keywordLimit || 8);
  }

  async function loadAssets() {
    if (state.assetPromise) return state.assetPromise;

    state.assetPromise = (async () => {
      setStatus('Loading semantic index...', 'loading');

      const [version, meta, bytes] = await Promise.all([
        fetch(params.semanticVersionUrl).then((response) => response.json()),
        fetch(params.semanticMetaUrl).then((response) => response.json()),
        fetch(params.semanticIndexUrl).then((response) => response.arrayBuffer()),
      ]);

      const runtime = await loadTurboQuantRuntime();
      const quantizer = await runtime.createQuantizer({ dim: version.dim, bits: version.bits });
      const index = runtime.Index.load(new Uint8Array(bytes), quantizer);

      state.version = version;
      ingestGraph(meta);
      state.quantizer = quantizer;
      state.index = index;
      state.ready = true;

      const stats = version.sections
        ? `${version.pages} pages · ${version.sections} sections · ${version.chunks} chunks · ${version.bits}-bit · ${version.dtype || 'fp32'} · ${version.model}`
        : `${version.pages} pages · ${version.chunks} chunks · ${version.bits}-bit · ${version.dtype || 'fp32'} · ${version.model}`;

      setStats(stats);
      setStatus('Semantic index ready. Results can jump to precise sections.', 'ready');

      return state;
    })().catch((error) => {
      state.semanticEnabled = false;
      setStatus('Semantic index failed to load. Keyword fallback only.', 'error');
      throw error;
    });

    return state.assetPromise;
  }

  async function loadEmbedder() {
    if (state.embedder) return state.embedder;
    if (state.embedderPromise) return state.embedderPromise;

    state.embedderPromise = (async () => {
      setStatus('Loading EmbeddingGemma q4 in your browser...', 'loading');

      const moduleUrl = `https://cdn.jsdelivr.net/npm/@huggingface/transformers@${params.transformersVersion}`;
      const { AutoTokenizer, AutoModel, env } = await import(moduleUrl);
      env.allowLocalModels = false;

      const [tokenizer, model] = await Promise.all([
        AutoTokenizer.from_pretrained(params.embeddingModel),
        AutoModel.from_pretrained(params.embeddingModel, {
          dtype: params.embeddingModelDtype || 'q4',
          model_file_name: params.embeddingModelFileName || null,
        }),
      ]);

      state.embedder = { tokenizer, model };
      setStatus('Embedding model ready.', 'ready');
      return state.embedder;
    })().catch((error) => {
      state.semanticEnabled = false;
      setStatus('Semantic model failed to load. Keyword fallback only.', 'error');
      throw error;
    });

    return state.embedderPromise;
  }

  function mergeResults(lexical, semantic) {
    const merged = new Map();

    function ensure(entry) {
      const key = entry.section.id;
      if (!merged.has(key)) {
        merged.set(key, {
          page: entry.page,
          section: entry.section,
          title: entry.page.title,
          url: entry.section.url,
          canonicalUrl: entry.page.url,
          sectionTitle: entry.section.title || '',
          kind: entry.page.kind,
          summary: entry.page.summary,
          reasons: new Set(),
          score: 0,
          chunkHits: [],
        });
      }
      return merged.get(key);
    }

    lexical.forEach((entry, rank) => {
      const target = ensure(entry);
      target.score += Math.min(5.25, entry.score / 36) + 0.85 / (rank + 1);
      target.reasons.add('exact');
      entry.chunkHits.forEach((hit) => rememberChunk(target, hit.chunkId, hit.score));
    });

    semantic.forEach((entry, rank) => {
      const target = ensure(entry);
      target.score += entry.score + 0.35 / (rank + 1);
      target.reasons.add('semantic');
      entry.chunkHits.forEach((hit) => rememberChunk(target, hit.chunkId, hit.score));
    });

    return Array.from(merged.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, params.resultLimit || 8)
      .map((result) => ({
        title: result.title,
        url: result.url,
        canonicalUrl: result.canonicalUrl,
        sectionTitle: result.sectionTitle,
        kind: result.kind,
        summary: result.summary,
        snippet: buildSectionSnippet(result.section, result.chunkHits.map((hit) => hit.chunkId)),
        reasons: Array.from(result.reasons),
      }));
  }

  async function rankSemantic(query, token) {
    if (!state.semanticEnabled || !state.index) return [];

    const embedder = await loadEmbedder();
    if (token !== state.searchToken) return [];

    const inputs = embedder.tokenizer(
      [`${params.embeddingQueryPrefix || 'task: search result | query: '}${query}`],
      { padding: true, truncation: true }
    );
    const { sentence_embedding } = await embedder.model(inputs);
    if (token !== state.searchToken) return [];

    const embedding = new Float32Array(sentence_embedding.data);
    const ids = state.index.search(embedding, params.semanticLimit || 12);

    const bySection = new Map();

    ids.forEach((id, rank) => {
      const chunk = state.chunksById.get(id);
      if (!chunk) return;
      const section = sectionForChunk(chunk);
      const page = section ? pageForSection(section) : null;
      if (!section || !page) return;

      let entry = bySection.get(section.id);
      if (!entry) {
        entry = {
          page,
          section,
          score: 0,
          chunkHits: [],
        };
        bySection.set(section.id, entry);
      }

      const chunkScore = 1.6 / (rank + 1);
      const weight = entry.chunkHits.length ? 0.42 : 1;
      entry.score += chunkScore * weight;
      rememberChunk(entry, chunk.id, chunkScore);
    });

    return Array.from(bySection.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, params.semanticLimit || 12);
  }

  function updateQueryInUrl(query) {
    const url = new URL(window.location.href);
    if (query) {
      url.searchParams.set('q', query);
    } else {
      url.searchParams.delete('q');
    }
    window.history.replaceState({}, '', url);
  }

  function renderableSectionResult(entry, reasons = ['exact']) {
    return {
      title: entry.page.title,
      url: entry.section.url,
      canonicalUrl: entry.page.url,
      sectionTitle: entry.section.title || '',
      kind: entry.page.kind,
      summary: entry.page.summary,
      snippet: buildSectionSnippet(entry.section, entry.chunkHits.map((hit) => hit.chunkId)),
      reasons,
    };
  }

  function pruneLexicalResults(query, lexical) {
    if (!lexical.length) return lexical;

    const tokenCount = tokensForQuery(query).length;
    if (tokenCount <= 1) return lexical;

    const topScore = lexical[0]?.score || 0;
    const requiredCoverage = tokenCount === 2 ? 2 : Math.max(2, Math.ceil(tokenCount * 0.67));

    const filtered = lexical.filter((entry) => {
      const scoreRatio = topScore ? entry.score / topScore : 1;
      return (
        entry.hasNormalizedMatch ||
        entry.maxCoverage >= requiredCoverage ||
        scoreRatio >= 0.45
      );
    });

    return filtered.length ? filtered : lexical.slice(0, Math.min(3, lexical.length));
  }

  function classifyQuery(query, lexical) {
    const tokenCount = tokensForQuery(query).length;
    const topLexicalScore = lexical[0]?.score || 0;
    const exactDominant =
      Boolean(lexical.length) && (
        (tokenCount <= 1 && topLexicalScore >= 80) ||
        (tokenCount === 2 && topLexicalScore >= 130) ||
        (tokenCount >= 3 && topLexicalScore >= 220)
      );

    return {
      tokenCount,
      topLexicalScore,
      exactDominant,
    };
  }

  function filterSemanticResults(query, lexical, semantic) {
    if (!lexical.length) return semantic;

    const queryMode = classifyQuery(query, lexical);
    if (queryMode.exactDominant) return [];

    const allowedPageIds = new Set(lexical.map((entry) => entry.page.id));
    return semantic.filter((entry) => allowedPageIds.has(entry.page.id));
  }

  async function executeSearch(query) {
    const trimmed = query.trim();
    const token = ++state.searchToken;

    updateQueryInUrl(trimmed);

    if (!trimmed) {
      renderEmpty('Type a concept, a topic, or a paper idea.');
      setStatus(state.ready ? 'Semantic index ready. Published pages only.' : 'Loading semantic index...', state.ready ? 'ready' : 'loading');
      return;
    }

    await loadAssets();
    if (token !== state.searchToken) return;

    const lexical = rankLexical(trimmed);
    const lexicalPool = pruneLexicalResults(trimmed, lexical);
    const queryMode = classifyQuery(trimmed, lexical);
    const shortQuery = normalizeText(trimmed).length < 3;

    if (shortQuery || !state.semanticEnabled) {
      renderResults(
        lexicalPool.map((entry) => renderableSectionResult(entry)),
        trimmed
      );
      setStatus(shortQuery ? 'Short query: exact match only.' : 'Keyword fallback only.', shortQuery ? 'ready' : 'error');
      return;
    }

    if (lexical.length) {
      renderResults(
        lexicalPool.map((entry) => renderableSectionResult(entry)),
        trimmed
      );
    } else {
      renderEmpty(`Searching for "${trimmed}"...`);
    }

    if (queryMode.exactDominant) {
      setStatus('Exact matches are strong for this query. Semantic expansion skipped.', 'ready');
      return;
    }

    setStatus('Running semantic search locally in your browser...', 'loading');

    try {
      const semanticRaw = await rankSemantic(trimmed, token);
      if (token !== state.searchToken) return;

      const semantic = filterSemanticResults(trimmed, lexicalPool, semanticRaw);

      const merged = mergeResults(lexicalPool, semantic);
      renderResults(merged, trimmed);
      setStatus(
        semantic.length
          ? `Showing ${merged.length} local result(s). Published pages only.`
          : 'Showing exact-match results only. Semantic expansion found no aligned sections.',
        'ready'
      );
    } catch (error) {
      if (token !== state.searchToken) return;
      if (lexical.length) {
        renderResults(
          lexicalPool.map((entry) => renderableSectionResult(entry)),
          trimmed
        );
      } else {
        renderEmpty(`No result for "${trimmed}".`);
      }
      setStatus('Semantic search failed for this query. Showing exact matches only.', 'error');
      console.error(error);
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    await executeSearch(input.value);
  });

  let inputTimer = null;
  input.addEventListener('input', () => {
    window.clearTimeout(inputTimer);
    inputTimer = window.setTimeout(() => {
      executeSearch(input.value);
    }, 180);
  });

  input.addEventListener(
    'focus',
    () => {
      loadAssets().catch(() => {});
    },
    { once: true }
  );

  for (const button of suggestionButtons) {
    button.addEventListener('click', () => {
      input.value = button.dataset.semanticQuery || '';
      executeSearch(input.value);
      input.focus();
    });
  }

  const initialQuery = new URLSearchParams(window.location.search).get('q') || '';
  if (initialQuery) {
    input.value = initialQuery;
    executeSearch(initialQuery);
  } else {
    renderEmpty('Type a concept, a topic, or a paper idea.');
    loadAssets().catch(() => {});
  }

  window.addEventListener('beforeunload', () => {
    state.index?.free?.();
    state.quantizer?.free?.();
  });
}
