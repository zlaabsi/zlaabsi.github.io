import * as params from '@params';

const root = document.querySelector('[data-semantic-search]');

if (root) {
  const input = document.getElementById('semanticSearchInput');
  const form = document.getElementById('semanticSearchForm');
  const resultsNode = document.getElementById('semanticSearchResults');
  const statusNode = document.getElementById('semanticSearchStatus');
  const statsNode = document.getElementById('semanticSearchStats');
  const emptyNode = document.getElementById('semanticSearchEmpty');
  const suggestionButtons = Array.from(document.querySelectorAll('[data-semantic-query]'));

  const state = {
    meta: [],
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
      return new URL(value).pathname;
    } catch {
      return value;
    }
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

      const title = document.createElement('span');
      title.className = 'semantic-search-result__title';
      title.textContent = result.title;
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
      content.textContent = result.snippet || result.summary || result.title;
      item.appendChild(content);

      const footer = document.createElement('footer');
      footer.className = 'entry-footer';
      footer.textContent = relativeUrl(result.url);
      item.appendChild(footer);

      const link = document.createElement('a');
      link.href = result.url;
      link.setAttribute('aria-label', result.title);
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
    const byUrl = new Map();

    for (const doc of state.meta) {
      const title = normalizeText(doc.title);
      const summary = normalizeText(doc.summary);
      const snippet = normalizeText(doc.snippet);
      const haystack = normalizeText(doc.searchText);

      let score = 0;
      if (normalized && title.includes(normalized)) score += 120;
      if (normalized && summary.includes(normalized)) score += 50;
      if (normalized && snippet.includes(normalized)) score += 36;

      for (const token of tokens) {
        if (title.includes(token)) score += 18;
        if (summary.includes(token)) score += 8;
        if (snippet.includes(token)) score += 6;
        if (haystack.includes(token)) score += 3;
      }

      if (!score) continue;

      const key = doc.canonicalUrl || doc.url;
      const existing = byUrl.get(key);
      if (!existing || score > existing.lexicalScore) {
        byUrl.set(key, { doc, lexicalScore: score });
      }
    }

    return Array.from(byUrl.values())
      .sort((a, b) => b.lexicalScore - a.lexicalScore)
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
      state.meta = meta;
      state.quantizer = quantizer;
      state.index = index;
      state.ready = true;

      setStats(`${version.pages} pages · ${version.chunks} chunks · ${version.bits}-bit · ${version.model}`);
      setStatus('Semantic index ready. The embedding model loads on first real query.', 'ready');

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
      setStatus('Loading the query embedding model in your browser...', 'loading');

      const moduleUrl = `https://cdn.jsdelivr.net/npm/@huggingface/transformers@${params.transformersVersion}`;
      const { pipeline, env } = await import(moduleUrl);
      env.allowLocalModels = false;

      const extractor = await pipeline('feature-extraction', params.embeddingModel);
      state.embedder = extractor;
      setStatus('Embedding model ready.', 'ready');
      return extractor;
    })().catch((error) => {
      state.semanticEnabled = false;
      setStatus('Semantic model failed to load. Keyword fallback only.', 'error');
      throw error;
    });

    return state.embedderPromise;
  }

  function mergeResults(lexical, semantic) {
    const merged = new Map();

    function ensure(doc) {
      const key = doc.canonicalUrl || doc.url;
      if (!merged.has(key)) {
        merged.set(key, {
          title: doc.title,
          url: doc.url,
          canonicalUrl: doc.canonicalUrl || doc.url,
          kind: doc.kind,
          summary: doc.summary,
          snippet: doc.snippet,
          reasons: new Set(),
          score: 0,
        });
      }
      return merged.get(key);
    }

    lexical.forEach((entry, rank) => {
      const target = ensure(entry.doc);
      target.score += 1.35 / (rank + 1);
      target.reasons.add('exact');
      if (!target.snippet) target.snippet = entry.doc.snippet;
    });

    semantic.forEach((entry, rank) => {
      const target = ensure(entry.doc);
      target.score += 2.1 / (rank + 1);
      target.reasons.add('semantic');
      target.snippet = entry.doc.snippet || target.snippet;
    });

    return Array.from(merged.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, params.resultLimit || 8)
      .map((result) => ({
        ...result,
        reasons: Array.from(result.reasons),
      }));
  }

  async function rankSemantic(query, token) {
    if (!state.semanticEnabled || !state.index) return [];

    const extractor = await loadEmbedder();
    if (token !== state.searchToken) return [];

    const tensor = await extractor(query, { pooling: 'mean', normalize: true });
    if (token !== state.searchToken) return [];

    const embedding = new Float32Array(tensor.data);
    const ids = state.index.search(embedding, params.semanticLimit || 12);

    const seen = new Set();
    const ranked = [];

    for (const id of ids) {
      const doc = state.meta[id];
      if (!doc) continue;
      const key = doc.canonicalUrl || doc.url;
      if (seen.has(key)) continue;
      seen.add(key);
      ranked.push({ doc });
    }

    return ranked;
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
    const shortQuery = normalizeText(trimmed).length < 3;

    if (shortQuery || !state.semanticEnabled) {
      renderResults(
        lexical.map((entry) => ({
          title: entry.doc.title,
          url: entry.doc.url,
          kind: entry.doc.kind,
          summary: entry.doc.summary,
          snippet: entry.doc.snippet,
          reasons: ['exact'],
        })),
        trimmed
      );
      setStatus(shortQuery ? 'Short query: exact match only.' : 'Keyword fallback only.', shortQuery ? 'ready' : 'error');
      return;
    }

    if (lexical.length) {
      renderResults(
        lexical.map((entry) => ({
          title: entry.doc.title,
          url: entry.doc.url,
          kind: entry.doc.kind,
          summary: entry.doc.summary,
          snippet: entry.doc.snippet,
          reasons: ['exact'],
        })),
        trimmed
      );
    } else {
      renderEmpty(`Searching for "${trimmed}"...`);
    }

    setStatus('Running semantic search locally in your browser...', 'loading');

    try {
      const semantic = await rankSemantic(trimmed, token);
      if (token !== state.searchToken) return;

      const merged = mergeResults(lexical, semantic);
      renderResults(merged, trimmed);
      setStatus(`Showing ${merged.length} local result(s). Published pages only.`, 'ready');
    } catch (error) {
      if (token !== state.searchToken) return;
      if (lexical.length) {
        renderResults(
          lexical.map((entry) => ({
            title: entry.doc.title,
            url: entry.doc.url,
            kind: entry.doc.kind,
            summary: entry.doc.summary,
            snippet: entry.doc.snippet,
            reasons: ['exact'],
          })),
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
      loadEmbedder().catch(() => {});
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
