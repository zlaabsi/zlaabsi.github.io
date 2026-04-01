---
title: "TurboQuant for Embeddings: A Practical Reference Implementation for RAG"
date: 2026-03-31
draft: true
author: "Zakaria Laabsi"
tags: ["rag", "retrieval", "embeddings", "quantization", "vector-search", "llm-systems"]
categories: ["machine-learning"]
keywords: ["TurboQuant", "embedding quantization", "RAG pipeline compression", "vector search optimization", "Lloyd-Max quantization", "QJL residual correction", "BeIR benchmark", "dense retrieval compression", "product quantization comparison"]
description: "A technical deep-dive into turboquant-embed: the TurboQuant algorithm, its implementation details, the benchmark results we can actually defend, and the deployment trade-offs for real RAG pipelines."
summary: "TurboQuant can compress embedding collections aggressively while preserving retrieval quality. This post explains the algorithm, the implementation choices in turboquant-embed, and the benchmark results that hold up on BeIR."
cover:
  image: "/images/turboquant/12_status_quo_quantization.png"
  alt: "TurboQuant vs standard quantizers on BeIR benchmarks"
  hidden: true
ShowToc: true
TocOpen: true
math: true
ShowReadingTime: true
ShowCodeCopyButtons: true
---

> *This post documents `turboquant-embed`, a local reference implementation of TurboQuant for embedding compression and retrieval. The goal is not to market a miracle quantizer. It is to explain exactly what the method does, how the implementation works, what the benchmarks actually measure, and where the trade-offs show up in real retrieval pipelines.*

## Introduction

Modern RAG systems are often bottlenecked by embedding storage before they are bottlenecked by arithmetic.

If a corpus contains $N$ vectors in dimension $d$ and each coordinate is stored in `float32`, the raw storage cost is

$$
4Nd \text{ bytes}.
$$

For `100K x 1536` embeddings, that is about `614 MB` before vector-store overhead, metadata, replication, or ANN index structures. On the same workload, `turboquant-embed` reaches the following packed sizes:

| Configuration | Packed size | Packed compression ratio |
|---|---:|---:|
| FP32 | ~614 MB | 1x |
| TQ 2-bit MSE | ~39 MB | ~16x |
| TQ 4-bit MSE | ~77 MB | ~8x |
| TQ 4-bit QJL | ~62 MB | ~10x |

This post makes a deliberately narrow claim:

1. TurboQuant is a strong **memory-quality trade-off** for dense retrieval.
2. A careful implementation can preserve quality in **dense-only** and **hybrid sparse+dense** pipelines.
3. This does **not** automatically imply lower end-to-end latency or native compressed vector-store support.

That distinction matters. It is the difference between a serious engineering post and a marketing page.

## Problem Setup

Let $q \in \mathbb{R}^d$ be a query embedding and let $x \in \mathbb{R}^d$ be a document embedding. In the dense retrieval regime considered here, ranking is based on the inner product

$$
s(q, x) = q^\top x.
$$

The objective is to replace $x$ by a compact representation $\tilde{x}$ such that

$$
q^\top \tilde{x} \approx q^\top x
$$

for retrieval-relevant queries $q$, while making the storage cost of $\tilde{x}$ much smaller than that of $x$.

## TurboQuant in One Page

TurboQuant is a two-stage construction.

### Stage 1: random rotation plus universal Lloyd-Max quantization

For a unit vector $x \in \mathbb{S}^{d-1}$, the algorithm applies a random orthogonal rotation $\Pi$ and quantizes the rotated coordinates independently. The key trick is that after rotation, each coordinate has a known marginal law that is close to Gaussian at large dimension, so a universal Lloyd-Max codebook is near-optimal.

That is what makes the method **data-oblivious**:

1. the rotation is deterministic once the seed is fixed,
2. the scalar codebooks are universal,
3. there is no k-means training step on the corpus.

For the standard normal distribution, the first codebooks are:

$$
b=1: \{\pm \sqrt{2/\pi}\} \approx \{\pm 0.7979\}
$$

and

$$
b=2: \{-1.5104, -0.4528, 0.4528, 1.5104\}.
$$

Those are precomputed in the implementation and scaled by $1/\sqrt{d}$ for the rotated coordinates.

### Stage 2: QJL residual correction

Pure MSE-optimal quantization is good for reconstruction, but at low bit-rates it introduces bias in the inner product. TurboQuant corrects that bias with a 1-bit Quantized Johnson-Lindenstrauss sketch on the residual.

If $r = x - \hat{x}_{\text{MSE}}$ and $S \in \mathbb{R}^{k \times d}$ is the sketching matrix, the implementation uses

$$
\operatorname{qjl}(r) = \operatorname{sign}(Sr).
$$

The asymmetric score estimator used at search time is:

$$
\widehat{\langle q, x \rangle}
= \|x\|_2 \langle q, \tilde{x}_{\text{MSE}}\rangle
+ \|x\|_2 \sqrt{\frac{\pi}{2}} \cdot \frac{\gamma}{k} \cdot (Sq)^\top \operatorname{qjl}(r),
$$

where $\gamma = \|r\|_2$ and $k$ is the sketch dimension. In the implementation, the first term comes from the packed MSE codes and the second term is the QJL bias correction. This is the core reason the product variant remains attractive at very low bit-rates.

## What `turboquant-embed` Actually Implements

The repo is not just a toy notebook. It gives you a compressor, serialization, direct compressed search, and adapter layers for local pipeline experiments.

The critical flow is:

```python
from turboquant_embed import TurboQuantEmbedCompressor, CompressedEmbeddings

compressor = TurboQuantEmbedCompressor(dim=1536, bits=4)
compressed = compressor.compress(embeddings)

scores, top_idx = compressor.topk_inner_product(compressed, query_vector, k=10)

compressed.save("index.npz")
loaded = CompressedEmbeddings.load("index.npz")
```

Two details matter a lot in practice.

### Serialized bytes vs resident bytes

The implementation distinguishes:

1. `serialized_nbytes`: packed on-disk or transferable size,
2. `resident_nbytes`: actual in-memory NumPy buffers currently materialized.

That distinction is not cosmetic. The blog and paper claims should be tied to **serialized storage** when comparing compression.

### Rotation backends

The compressor exposes three rotation modes:

| Backend | Time / memory profile | When it makes sense |
|---|---|---|
| `qr` | dense Haar rotation; roughly $O(d^3)$ init and $O(d^2)$ storage | research-faithful baseline, comfortable below `d=2048` |
| `hadamard` | sign flips, permutations, and FWHT mixing; roughly $O(d \log d)$ application and much lighter state | larger-dimensional pipeline experiments |
| `auto` | uses `hadamard` only when `dim >= 2048` and the largest power-of-two divisor is at least `128`, otherwise falls back to `qr` | pragmatic default |

For publication-facing claims about the canonical algorithm, the repo keeps `qr` as the reference backend. For engineering experiments at larger dimensions, the structured backend is much cheaper to initialize and avoids carrying a full dense rotation matrix around.

## Why Not Just Use PQ?

This is the main conceptual advantage of TurboQuant over the standard `PQ / OPQ` family:

1. **no training**,
2. **no corpus-specific codebooks**,
3. **no fitting step before compression**,
4. **deterministic build path** once the seeds are fixed.

That does not make `PQ` or `OPQ` bad baselines. They are strong baselines, and the blog uses them as such. But it does change the engineering story. TurboQuant can be applied to a new corpus immediately, without learning a quantizer on that corpus first.

## Benchmark Design

The benchmark slate used here has four distinct roles.

### 1. Status-quo comparison

This is the main question:

> At a matched serialized storage budget, how does TurboQuant compare to standard FAISS quantizers on a relevance-labeled retrieval benchmark?

![TurboQuant vs SQ, PQ, and OPQ on BeIR qrels](/images/turboquant/12_status_quo_quantization.png)

The answer is clear in the ultra-compact regime. On SciFact with MiniLM, `TQ-2b` reaches `0.640` nDCG@10 at `100.0` bytes/vector, while `PQ16` reaches only `0.526` at `99.9` bytes/vector. On SciFact with mpnet, `TQ-2b` reaches `0.649` at `196.0` bytes/vector, while `PQ16` reaches `0.590` at `199.7` bytes/vector. Even on the harder NFCorpus split, `TQ-2b` stays above `PQ16` while using comparable or smaller storage.

At around `8x` compression, `TQ-4b` stays very close to `SQ4`. For example:

1. SciFact + MiniLM: `TQ-4b = 0.650`, `SQ4 = 0.649`, `FP32 = 0.645`
2. SciFact + mpnet: `TQ-4b = 0.657`, `SQ4 = 0.654`, `FP32 = 0.656`
3. NFCorpus + MiniLM: `TQ-4b = 0.313`, `SQ4 = 0.314`, `FP32 = 0.317`
4. NFCorpus + mpnet: `TQ-4b = 0.333`, `SQ4 = 0.334`, `FP32 = 0.334`

That is a much stronger result than "compression looks okay." It says TurboQuant is competitive with the classical baselines that people actually use.

### 2. Cross-model robustness

The second question is whether the result depends on one lucky encoder.

![Cross-model stability of TurboQuant 4-bit on BeIR](/images/turboquant/05_text_embedding_models.png)

At roughly `7.8x-7.9x` packed compression, the 4-bit result is stable across three real encoders:

1. **SciFact**
   - MiniLM: `FP32 0.645` vs `TQ-4b 0.650`
   - mpnet: `FP32 0.656` vs `TQ-4b 0.657`
   - BGE-M3: `FP32 0.641` vs `TQ-4b 0.647`
2. **NFCorpus**
   - MiniLM: `FP32 0.317` vs `TQ-4b 0.313`
   - mpnet: `FP32 0.334` vs `TQ-4b 0.333`
   - BGE-M3: `FP32 0.255` vs `TQ-4b 0.252`

The pattern is the one you want from a serious compression method: close enough to FP32 that the remaining gap is small compared to dataset difficulty.

### 3. Hybrid retrieval

The third question is the RAG-facing one:

> If dense retrieval is only one signal among others, does compression destroy the hybrid pipeline?

The benchmark uses a Lucene-style BM25 baseline (`bm25s` with Snowball stemming), a dense MiniLM retriever, and `RRF@100` fusion.

![Hybrid BM25+dense retrieval under TurboQuant compression](/images/turboquant/07_hybrid_dense_sparse.png)

The answer is no.

1. **SciFact**
   - BM25: `0.679` nDCG@10
   - Dense FP32: `0.645`
   - Dense TQ-4bit: `0.650`
   - Hybrid BM25+FP32: `0.713`
   - Hybrid BM25+TQ-4bit: `0.711`
   - paired delta for the hybrid pipeline: `-0.0012` nDCG@10, CI `[-0.0088, 0.0062]`
2. **NFCorpus**
   - BM25: `0.318`
   - Dense FP32: `0.317`
   - Dense TQ-4bit: `0.313`
   - Hybrid BM25+FP32: `0.345`
   - Hybrid BM25+TQ-4bit: `0.344`
   - paired delta for the hybrid pipeline: `-0.0006` nDCG@10, CI `[-0.0043, 0.0032]`

That is the right RAG conclusion: compressing the dense branch does not destroy the lift you get from combining lexical and dense evidence.

### 4. Deployment path

The last benchmark separates two deployment stories:

1. direct compressed search in-process,
2. reconstruction-based upload into a FP32 vector store.

![Direct compressed search vs vector-store reconstruction path](/images/turboquant/11_beir_relevance_server.png)

The direct in-process path stays very close to exact dense quality:

1. SciFact + MiniLM: `+0.0045` nDCG@10 vs exact FP32
2. SciFact + mpnet: `+0.0014`
3. NFCorpus + MiniLM: `-0.0037`
4. NFCorpus + mpnet: `-0.0007`

The Chroma reconstruction path also stays close to the FP32 Chroma baseline:

1. SciFact + MiniLM: `+0.0026` nDCG@10
2. SciFact + mpnet: `-0.0019`
3. NFCorpus + MiniLM: `-0.0021`
4. NFCorpus + mpnet: `-0.0018`

But this figure should be read carefully. It does **not** mean that Chroma is indexing compressed vectors natively. The server still sees reconstructed FP32 vectors.

## Results We Can Defend

The benchmark evidence supports the following claims.

### TurboQuant is strong at aggressive compression

`TQ-2b` is materially stronger than `PQ16` and `OPQ16` at the low-byte end of the curve on BeIR qrels.

### TurboQuant remains competitive with scalar quantization

The honest statement is not "TurboQuant crushes SQ everywhere." The defensible statement is that `TQ-4b` stays competitive with `SQ4/SQ8` while being data-oblivious and training-free.

### TurboQuant preserves hybrid retrieval gains

Compression of the dense branch does not collapse the BM25+dense hybrid gains on the datasets tested here.

### The implementation is good for experimentation and prototyping

The repository is a strong **reference CPU/NumPy implementation** for experimentation, reproducibility, and pipeline prototyping. It is not yet a native compressed ANN engine.

## What This Does Not Prove

There are three claims the post should avoid.

### It does not prove universal latency wins

In the direct search benchmark, the compressed in-process path can still be slower than exact dense BLAS. On the tested setups, the direct TurboQuant path ranges from roughly `1.28x` to `1.58x` the query latency of exact FP32.

### It does not prove native compressed vector-store support

If a vector store accepts reconstructed FP32 vectors, then the stored server-side representation is still FP32.

### It does not prove production readiness by itself

Publication-grade benchmarks and a clean reference implementation are not the same thing as a fully optimized production retrieval stack.

## Why This Matters for RAG

For many RAG systems, the first practical question is not "what is the absolute best ANN index?" but rather:

> *Can I keep dense retrieval quality while making the embedding footprint small enough to be practical?*

That is exactly where TurboQuant is interesting. It gives you a dense retrieval representation that is much smaller than FP32, empirically strong against standard quantization baselines, and still usable in pipelines that combine dense and sparse signals.

## Reproducibility

Everything used in this post is local and scriptable:

1. implementation: [`turboquant-embed`](https://github.com/zlaabsi/turboquant-embed)
2. status-quo benchmark: [`benchmarks/status_quo_quantization_bench.py`](https://github.com/zlaabsi/turboquant-embed/blob/main/benchmarks/status_quo_quantization_bench.py)
3. hybrid benchmark: [`benchmarks/rag_benchmarks.py`](https://github.com/zlaabsi/turboquant-embed/blob/main/benchmarks/rag_benchmarks.py)
4. deployment benchmark: [`benchmarks/beir_relevance_bench.py`](https://github.com/zlaabsi/turboquant-embed/blob/main/benchmarks/beir_relevance_bench.py)
5. publication notes: [`docs/ARXIV_EXPERIMENTS.md`](https://github.com/zlaabsi/turboquant-embed/blob/main/docs/ARXIV_EXPERIMENTS.md)
6. figure metadata:
   - [`12_status_quo_quantization.json`](https://github.com/zlaabsi/turboquant-embed/blob/main/benchmarks/results/12_status_quo_quantization.json)
   - [`05_text_embedding_models.json`](https://github.com/zlaabsi/turboquant-embed/blob/main/benchmarks/results/05_text_embedding_models.json)
   - [`07_hybrid_dense_sparse.json`](https://github.com/zlaabsi/turboquant-embed/blob/main/benchmarks/results/07_hybrid_dense_sparse.json)
   - [`11_beir_relevance_server.json`](https://github.com/zlaabsi/turboquant-embed/blob/main/benchmarks/results/11_beir_relevance_server.json)
7. underlying paper: [TurboQuant](https://arxiv.org/abs/2504.19874)

## References

1. A. Zandieh et al. *TurboQuant: Online Vector Quantization with Near-optimal Distortion Rate*. arXiv:2504.19874, ICLR 2026.
2. A. Zandieh, A. Daliri, I. Han. *QJL: Quantized Johnson-Lindenstrauss*. arXiv:2406.03482, AAAI 2025.
3. J. Johnson, M. Douze, H. Jegou. *Billion-scale similarity search with GPUs*. IEEE Transactions on Big Data, 2019. FAISS reference implementation by Meta Research.
4. N. Thakur et al. *BEIR: A Heterogeneous Benchmark for Zero-shot Evaluation of Information Retrieval Models*. NeurIPS Datasets and Benchmarks, 2021.
5. H. Jegou, M. Douze, C. Schmid. *Product Quantization for Nearest Neighbor Search*. IEEE TPAMI, 2011.
6. T. Ge, K. He, Q. Ke, J. Sun. *Optimized Product Quantization for Approximate Nearest Neighbor Search*. CVPR, 2013.

---

<details class="citation-block">
<summary>Cited as</summary>

> Laabsi, Zakaria. "TurboQuant for Embeddings: A Practical Reference Implementation for RAG." *zlaabsi.github.io*, Mar 2026.

```bibtex
@misc{laabsi2026turboquantembed,
  title        = {TurboQuant for Embeddings: A Practical Reference Implementation for RAG},
  author       = {Laabsi, Zakaria},
  year         = {2026},
  month        = {Mar},
  howpublished = {\url{https://zlaabsi.github.io/posts/turboquant-embed/}},
  note         = {Blog post}
}
```

</details>
