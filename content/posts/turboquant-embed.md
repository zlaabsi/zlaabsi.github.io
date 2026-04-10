---
title: "Compressing RAG Embeddings with TurboQuant"
date: 2026-04-03
draft: false
author: "Zakaria Laabsi"
tags: ["rag", "retrieval", "embeddings", "quantization", "vector-search", "llm-systems"]
categories: ["machine-learning"]
keywords: ["TurboQuant", "Google Research", "RAG compression", "embedding quantization", "vector search", "BeIR", "PQ vs SQ vs OPQ", "hybrid retrieval"]
description: "TurboQuant applied to dense retrieval: how the algorithm works, what turboquant-embed implements, and what the BeIR benchmarks actually establish against scalar and product quantization."
summary: "TurboQuant compresses embeddings aggressively without corpus-specific training. This post covers the algorithm, the turboquant-embed implementation, and the retrieval benchmarks that hold up on BeIR."
cover:
  image: "/images/turboquant/12v2_status_quo_quantization.svg"
  alt: "TurboQuant retention versus standard quantizers"
  hidden: true
ShowToc: true
TocOpen: true
math: true
ShowReadingTime: true
ShowCodeCopyButtons: true
---

> *This post is a figure-driven reading of `turboquant-embed`, a local reference implementation of TurboQuant for embedding compression and retrieval. The question is not whether TurboQuant looks elegant on paper. The question is whether it buys anything tangible for RAG once we compare it against FP32, scalar quantization, product quantization, and hybrid retrieval pipelines. For the full mathematical theory (proofs, distortion bounds, and the QJL/PolarQuant lineage), see the [companion article on data-oblivious vector quantization](/posts/kv-cache-quantization-theory/).*

## Why TurboQuant Exists

A corpus of $N$ vectors in dimension $d$, stored in `float32`, costs $4Nd$ bytes. For `100K` documents embedded with a `1536`-dimensional model, that is roughly `614 MB` before any vector-store overhead, metadata, replication, or ANN index structures. This is manageable on a server. It is much less manageable on a laptop, across per-tenant indexes, or when the corpus changes faster than a codebook can be retrained.

Google Research introduced TurboQuant [^1] as part of a broader compression story covering both vector search and LLM KV-cache efficiency. The [official blog post](https://research.google/blog/turboquant-redefining-ai-efficiency-with-extreme-compression/) frames the ambition clearly: high-dimensional vectors are memory-hungry, traditional quantizers carry nontrivial codebook overhead, and TurboQuant is presented as a theoretically grounded, data-oblivious alternative for extreme compression.

The [paper](https://arxiv.org/abs/2504.19874) makes the claim precise. TurboQuant is an **online**, **data-oblivious** quantization scheme that aims at near-optimal distortion rates for both mean-squared error and inner-product distortion. The recipe has three steps:

1. **Random rotation.** Apply a random orthogonal matrix $\mathbf{\Pi}$ to the vector. This induces a [Beta distribution on each coordinate](/posts/kv-cache-quantization-theory/#random-rotation-and-beta-distribution), a known, universal shape that does not depend on the input data.
2. **Lloyd-Max quantization.** Quantize each rotated coordinate independently using [scalar codebooks matched to the Beta density](/posts/kv-cache-quantization-theory/#lloyd-max). Because the density is the same for every coordinate and every input, a single precomputed codebook suffices.
3. **QJL residual correction.** The MSE quantizer introduces inner-product bias. A 1-bit [QJL sketch](/posts/kv-cache-quantization-theory/#qjl) [^2] on the residual $\mathbf{r} = \mathbf{x} - \tilde{\mathbf{x}}_\text{mse}$ corrects this: the resulting estimator is provably [unbiased with concentration guarantees](/posts/kv-cache-quantization-theory/#theorem-2).

The critical word is *data-oblivious*. There is no k-means fitting on the corpus. The rotation is deterministic once the seed is fixed, and the scalar codebooks are universal. A new corpus can be compressed immediately, without a training pass. The [theoretical guarantee](/posts/kv-cache-quantization-theory/#theorem-1) is that MSE distortion is at most $\frac{\sqrt{3}\pi}{2} \cdot 4^{-b}$, within a factor of 2.7 of the [information-theoretic lower bound](/posts/kv-cache-quantization-theory/#theorem-3).

That is the context for `turboquant-embed`. The repository does not try to reproduce the full systems story of the Google blog. It focuses on the embedding and retrieval side of TurboQuant, with a local, CPU, NumPy-first implementation that is useful for RAG experiments, benchmark reproduction, and integration prototyping. The question it asks is not *"Is TurboQuant theoretically interesting?"*; the paper answers that. The question is:

> *For RAG, when does TurboQuant beat the usual alternatives, and what exactly do the current figures prove?*

---

## What `turboquant-embed` Implements

At the API level, the implementation is deliberately simple:

```python
from turboquant_embed import TurboQuantEmbedCompressor, CompressedEmbeddings

compressor = TurboQuantEmbedCompressor(dim=1536, bits=4)
compressed = compressor.compress(embeddings)

scores, top_idx = compressor.topk_inner_product(compressed, query_vector, k=10)

compressed.save("index.npz")
loaded = CompressedEmbeddings.load("index.npz")
```

Under the hood, the repo tracks a few distinctions that matter when discussing RAG systems seriously. First, it separates **serialized bytes** (packed on-disk or transferable size) from **resident bytes** (actual in-memory NumPy buffers). The blog and paper claims should be tied to serialized storage when comparing compression. Second, it exposes three rotation backends: `qr` for the canonical dense Haar-style baseline, `hadamard` for an engineering-oriented $O(d \log d)$ approximation at larger dimensions, and `auto` to select between them. Third, it distinguishes **MSE-only** scoring from **QJL-corrected** scoring, because pure reconstruction quality and unbiased inner-product estimation are not the same problem.

The asymmetric inner-product estimator used by the product variant is:

$$\widehat{\langle q, x \rangle} = \lVert x \rVert_{2} \, \langle q, \tilde{x}_{\mathrm{MSE}} \rangle + \lVert x \rVert_{2} \sqrt{\frac{\pi}{2}} \cdot \frac{\gamma}{k} \cdot (Sq)^{\top} \operatorname{sign}(Sr),$$

where $r = x - \hat{x}_{\mathrm{MSE}}$ is the residual, $\gamma = \lVert r \rVert_{2}$, and $k$ is the sketch dimension. The first term comes from the MSE quantizer; the second is the QJL bias correction. The $\sqrt{\pi/2}$ factor compensates for the information lost in the sign quantization: it arises because $\mathbb{E}[|g|] = \sqrt{2/\pi}$ for $g \sim \mathcal{N}(0,1)$, and the estimator must cancel this scaling to remain [unbiased](/posts/kv-cache-quantization-theory/#qjl). The derivation and complete proof are in the [theoretical companion](/posts/kv-cache-quantization-theory/#theorem-2).

---

## How to Read the Figure Slate

The benchmark directory mixes two kinds of figures. Some are **primary comparative evidence for RAG**: plots that actually answer whether TurboQuant is useful against meaningful baselines on labeled retrieval benchmarks. Others are **internal or synthetic diagnostics**: useful for building intuition about the quantizer's behavior, but not the main evidence for deployment claims.


---

## Storage and Operational Motivation

Before asking whether TurboQuant *retrieves well*, it is worth establishing that the compression itself is real, stable, and operationally interesting. That is what the first three figures do.

### Packed Memory Scaling

![FP32 vs TurboQuant packed memory scaling](/images/turboquant/01_memory_comparison.svg)

The first figure plots serialized storage in megabytes for `FP32`, `TQ-2bit`, `TQ-3bit`, and `TQ-4bit` as the corpus grows from `10K` to `100K` vectors at $d = 1536$. The compression ratios are large and remarkably stable:

| Method | Packed size | Ratio vs FP32 |
|---|---:|---:|
| FP32 | 614 MB | 1.0x |
| TQ-2bit | 38.8 MB | 15.8x |
| TQ-3bit | 58.0 MB | 10.6x |
| TQ-4bit | 77.2 MB | 8.0x |

This is a storage figure, not a retrieval figure. It establishes that packed bytes scale linearly with corpus size (the ratio does not degrade) but says nothing about whether indexing overhead, latency, or retrieval quality follow the same pattern.

### Equal-Memory Retrieval

![Retrieval quality at equal memory budget](/images/turboquant/02_equal_memory_recall.svg)

The natural follow-up question is: if memory is the actual constraint, does compression buy retrieval quality by fitting more vectors into the same budget? On synthetic data, the answer is yes, dramatically so at small budgets:

| Budget | FP32 | TQ-2bit | TQ-4bit |
|---|---:|---:|---:|
| 10 MB | 0.03 | 0.34 | 0.27 |
| 20 MB | 0.07 | 0.50 | 0.53 |
| 40 MB | 0.13 | 0.50 | 0.84 |
| 160 MB | 0.54 | 0.50 | 0.84 |

At `10 MB`, FP32 can barely fit any vectors and recall is nearly zero, while `TQ-2bit` already reaches `0.34`. The effect saturates (`TQ-2bit` plateaus around `50%` recall and `TQ-4bit` around `84%`), so this should be read as a budget intuition plot rather than a public retrieval-effectiveness claim. But the intuition is sound: under tight memory constraints, compression is not just a storage optimization; it is a retrieval enabler.

### Encoding Speed

![Encoding cost of TurboQuant versus Product Quantization](/images/turboquant/02b_encoding_speed.svg)

The training-free nature of TurboQuant is not just a conceptual convenience. It translates into concrete encoding speed differences relative to PQ-style pipelines that need to fit codebooks on the corpus:

| Number of vectors | TQ | PQ | Speedup |
|---|---:|---:|---:|
| 1K | 0.51 s | 70.8 s | 138x |
| 10K | 7.89 s | 2109 s | 267x |
| 50K | 8.58 s | 757.8 s | 88x |

This is the weakest operational figure in the slate: the PQ timings are noisy and likely sensitive to hyperparameters and implementation choices. It supports the training-free story, but I would not use it as the lead public performance claim without a tighter experimental protocol.

---

## What the Quantizer Itself Is Doing

With the storage motivation established, the next step is to understand the quantizer's behavior before trusting it on real retrieval data. The figures in this section are all synthetic: controlled experiments designed to isolate specific properties of the method. They are not publication-grade retrieval results, but they are necessary to build confidence that the quantizer behaves predictably.

### Fidelity vs Compression

![Recall versus compression ratio for TurboQuant MSE and product variants](/images/turboquant/03_recall_vs_compression.svg)

The most basic diagnostic question is: how does retrieval fidelity degrade as the bitrate drops? The figure below traces Recall@10 on synthetic data as a function of compression ratio for the pure MSE variant and the QJL-corrected product variant.

| Bits | MSE ratio | MSE recall | Product ratio | Product recall |
|---|---:|---:|---:|---:|
| 8 | 4.0x | 0.984 | 4.4x | 0.923 |
| 6 | 5.3x | 0.950 | 6.1x | 0.769 |
| 4 | 8.0x | 0.851 | 10.0x | 0.373 |
| 2 | 15.8x | 0.520 | 26.5x | 0.046 |

The MSE variant degrades gracefully: `0.984` at 8-bit, `0.851` at 4-bit, `0.520` at 2-bit. The product variant buys more aggressive compression but pays for it steeply: at 2-bit, recall collapses to `0.046`. That collapse is the most important negative result visible in the entire benchmark suite. The product/QJL path is not magic at very low bitrates.

### Dimension Robustness

![4-bit accuracy across embedding dimensions](/images/turboquant/04_accuracy_by_dimension.svg)

A practical concern for any quantizer intended for real embedding stacks is dimensional robustness. Models in production span from `128`-dimensional MiniLM to `3072`-dimensional BGE-M3 and beyond. After random rotation, TurboQuant stays remarkably stable:

| Dimension | TQ-4bit | SQ4 | PQ |
|---|---:|---:|---:|
| 128 | 0.856 | 0.818 | 0.193 |
| 384 | 0.863 | 0.812 | 0.190 |
| 1536 | 0.869 | 0.812 | 0.199 |
| 3072 | 0.860 | 0.799 | 0.207 |

The TQ column barely moves. SQ4 drifts slightly downward at higher dimensions. PQ is essentially flat but at a much lower level; this is synthetic data, and the PQ baseline is not especially strong in this setup. The figure supports the intuition that TurboQuant is dimension-stable, but it should not be oversold as a superiority proof by itself.

### Top-1 Recovery

![Recall@1@k for TurboQuant and Product Quantization](/images/turboquant/05_recall_at_1_k.svg)

A different angle on quantization quality: how often is the true top-1 result recovered inside the approximate top-$k$? This matters for applications where the best answer must not be lost entirely, even if the approximate ranking is imperfect.

For $d = 1536$ at 2-bit:

| k | TQ | PQ |
|---|---:|---:|
| 1 | 0.465 | 0.505 |
| 4 | 0.785 | 0.770 |
| 16 | 0.950 | 0.955 |
| 64 | 1.000 | 1.000 |

Both methods recover the true top-1 with high probability once the reranking depth reaches 16 or so. The metric is relatively forgiving (it only asks whether the best result appears somewhere in the top-$k$, not whether the full ranking is preserved), but it confirms that TurboQuant does not catastrophically lose the best answer.

### Scaling with Corpus Size

![Scaling of fidelity and packed storage with corpus size](/images/turboquant/08_scaling_corpus.svg)

The last diagnostic question before turning to real retrieval benchmarks: does the compression ratio hold as the corpus grows? The answer is yes: the ratio stays fixed at `7.8x` from `1K` to `100K` vectors:

| Corpus | FP32 | TQ-4bit | Ratio | Recall@10 |
|---|---:|---:|---:|---:|
| 1K | 2 MB | 0.2 MB | 7.8x | 0.71 |
| 10K | 15 MB | 2.0 MB | 7.8x | 0.38 |
| 100K | 154 MB | 19.6 MB | 7.8x | 0.27 |

The recall values here are pessimistic synthetic diagnostics; the absolute numbers are not meaningful for real retrieval claims. The reliable takeaway is the linear packed-storage scaling: the compression ratio does not erode with corpus size.

---

## Comparative Evidence on BeIR

Everything so far has been either operational motivation or synthetic diagnostics. The figures in this section are different: they measure TurboQuant against meaningful baselines on **labeled retrieval benchmarks** (BeIR), with real embedding models, and in pipeline configurations that resemble actual RAG systems. This is where the claims must be the most careful, and where the results are the most interesting.

### Hybrid Retrieval Under Compression

![Hybrid dense+sparse retrieval under TurboQuant compression](/images/turboquant/07_hybrid_dense_sparse.svg)

This is the most directly RAG-relevant figure in the entire repository. In practice, most RAG systems do not rely on dense retrieval alone; they combine a sparse leg (BM25 or similar) with a dense leg, fusing the results with reciprocal rank fusion or a learned combiner. The deployment question is concrete: if we compress the dense leg, do we lose the hybrid lift?

The figure shows paired query-wise deltas for dense-only and hybrid (BM25 + dense) retrieval, comparing `TQ-4bit` against `FP32` on BeIR `scifact` and `nfcorpus`:

| Comparison | SciFact ΔNDCG@10 | NFCorpus ΔNDCG@10 |
|---|---:|---:|
| Dense TQ - FP32 | `+0.005` [`-0.001`, `+0.010`] | `-0.003` [`-0.007`, `-0.001`] |
| Hybrid TQ - FP32 | `-0.001` [`-0.009`, `+0.006`] | `-0.001` [`-0.004`, `+0.003`] |

The hybrid deltas are negligible; confidence intervals comfortably include zero on both datasets. The sparse leg absorbs whatever small perturbations the quantizer introduces in the dense ranking. It is worth noting that the sparse leg here is a local `bm25s` reference with Snowball stemming, not a production search server. The right claim is therefore not that TurboQuant *improves* hybrid retrieval, but that **it does not materially damage it in this setup**.

### Status Quo Against Standard Quantizers

![TurboQuant vs standard quantizers on BeIR](/images/turboquant/12_status_quo_quantization.svg)

This is the central comparative figure, the one that answers the question a RAG engineer would actually ask: *why should I care about TurboQuant instead of just using the standard FAISS quantizers?*

The figure plots NDCG@10 against actual bytes per vector for `FP32`, `TurboQuant`, `SQ`, `PQ16`, and `OPQ16`, on two BeIR datasets (SciFact and NFCorpus) with two embedding models (MiniLM and mpnet). For SciFact with MiniLM:

| Method | Bytes / vector | NDCG@10 |
|---|---:|---:|
| FP32 | 1536 | 0.645 |
| TQ-4b | 196 | 0.650 |
| SQ4 | 193 | 0.649 |
| OPQ16 | 214 | 0.602 |
| PQ16 | 100 | 0.526 |

Two results stand out. First, in the ultra-compact regime, `TQ-2b` is materially stronger than `PQ16`; the gap is not small. Second, around the `~8x` compression point, `TQ-4b` is essentially tied with `SQ4`. The advantage over scalar quantization is not dramatic at 4-bit; the honest result is narrower and still useful: TurboQuant clearly beats `PQ/OPQ` at low byte counts, and remains competitive with `SQ` at moderate compression.

### Retention Relative to FP32

![Retention relative to FP32 for TurboQuant and standard quantizers](/images/turboquant/12v2_status_quo_quantization.svg)

The same story told differently: NDCG@10 normalized as retention relative to FP32, which makes the practical message easier to read at a glance.

| Method | Mean retention | Compression regime |
|---|---:|---:|
| TQ-2b | ~100% | ~15x |
| TQ-4b | ~102% | ~8x |
| SQ4 | ~100% | ~8x |
| PQ16 | ~85% | ~15x |
| OPQ16 | ~98% | ~7x |

TurboQuant stays in the near-lossless band across both bitrates, while PQ sits visibly below it. Retention above `100%` is not a real quality gain; it is evaluation noise and finite-sample variance. The right reading is "essentially equal to FP32," not "better than FP32."

---

## Synthesis

Taken together, the figures tell a coherent story with clear boundaries.

The storage and scaling figures establish that TurboQuant delivers `8x`–`16x` packed compression with strictly linear scaling; the ratio does not erode with corpus size. The encoding speed figure supports the claim that the compression path is materially lighter than PQ-like fitting, even if the exact timings need a tighter protocol. The synthetic diagnostic figures confirm that the quantizer degrades gracefully with bitrate, remains stable across dimensions, and does not catastrophically lose the best results, with the important exception that the product/QJL path collapses at 2-bit.

The RAG-facing figures are the real evidence. Hybrid retrieval is preserved: compressing the dense leg with `TQ-4bit` does not damage the BM25+dense lift on the BeIR datasets tested. Against standard FAISS quantizers, TurboQuant materially outperforms `PQ` and `OPQ` in the ultra-compact regime and stays competitive with scalar quantization at 4-bit. The advantage over `SQ` is not huge, but TurboQuant achieves it without any corpus-specific training.

The honest limits are equally clear. Several figures are synthetic diagnostics, not publication-grade retrieval benchmarks. The product/QJL variant is not magic at very low bitrates. The advantage over scalar quantization is narrow at 4-bit. And the repository measures a reference CPU/NumPy implementation, not a production ANN system. These figures say something real about compression quality and retrieval preservation, but they do not prove end-to-end serving superiority.

---

## What This Means for RAG

For RAG, the strongest argument for TurboQuant is not that it is mathematically elegant. The strongest argument is this: it reduces embedding storage by roughly one order of magnitude, stays competitive with the quantization baselines people actually use, preserves hybrid retrieval quality, and does all of this without fitting a corpus-specific quantizer.

That is a meaningful niche. It is especially relevant for local RAG, per-tenant indexes, fast-moving corpora, and experiments where you want a compression layer without turning the pipeline into a codebook-training project.

For a deeper understanding of *why* these compression-versus-quality tradeoffs look the way they do (why the product variant collapses at 2-bit, why scalar quantization is competitive at 4-bit, and what the information-theoretic limits actually are), see the [theoretical article on data-oblivious vector quantization](/posts/kv-cache-quantization-theory/).

The thing it does **not** justify is a broad systems claim:

> *TurboQuant is already a better production vector store than the usual ANN stack.*

That is a different claim, and this repository is not trying to make it.

---

## Reproducibility

Everything discussed here is tied to local artifacts and scripts:

1. implementation: [`turboquant-embed`](https://github.com/zlaabsi/turboquant-embed)
2. figure analysis guide: [`benchmarks/FIGURES_ANALYSIS.md`](https://github.com/zlaabsi/turboquant-embed/blob/main/benchmarks/FIGURES_ANALYSIS.md)
3. status-quo benchmark: [`benchmarks/status_quo_quantization_bench.py`](https://github.com/zlaabsi/turboquant-embed/blob/main/benchmarks/status_quo_quantization_bench.py)
4. retrieval benchmark slate: [`benchmarks/rag_benchmarks.py`](https://github.com/zlaabsi/turboquant-embed/blob/main/benchmarks/rag_benchmarks.py)
5. official paper: [TurboQuant: Online Vector Quantization with Near-optimal Distortion Rate](https://arxiv.org/abs/2504.19874)
6. official Google Research post: [TurboQuant: Redefining AI efficiency with extreme compression](https://research.google/blog/turboquant-redefining-ai-efficiency-with-extreme-compression/)

## References

[^1]: Amir Zandieh, Majid Daliri, Majid Hadian, Vahab Mirrokni. *TurboQuant: Online Vector Quantization with Near-optimal Distortion Rate*. arXiv:2504.19874, 2025.

[^2]: Amir Zandieh, Majid Daliri, Ibrahim Han. *QJL: 1-Bit Quantized JL Transform for KV Cache Quantization with Zero Overhead*. arXiv:2406.03482, 2024.

[^8]: Jinjie Zhang, Amir Zandieh. *PolarQuant: Quantization of Random Vectors via Polar Coordinates*. arXiv:2502.02617, 2025.

[^3]: Jeff Johnson, Matthijs Douze, Herve Jegou. *Billion-scale similarity search with GPUs*. IEEE Transactions on Big Data, 2019.

[^4]: Nandan Thakur et al. *BEIR: A Heterogeneous Benchmark for Zero-shot Evaluation of Information Retrieval Models*. NeurIPS Datasets and Benchmarks, 2021.

[^5]: Herve Jegou, Matthijs Douze, Cordelia Schmid. *Product Quantization for Nearest Neighbor Search*. IEEE TPAMI, 2011.

[^6]: Tiezheng Ge, Kaiming He, Qifa Ke, Jian Sun. *Optimized Product Quantization for Approximate Nearest Neighbor Search*. CVPR, 2013.

[^7]: Amir Zandieh, Vahab Mirrokni. *TurboQuant: Redefining AI efficiency with extreme compression*. Google Research Blog, March 24, 2026.

---

<details class="citation-block">
<summary>Cited as</summary>

> Laabsi, Zakaria. "Compressing RAG Embeddings with TurboQuant." *zlaabsi.github.io*, Apr 2026.

```bibtex
@misc{laabsi2026turboquantrag,
  title        = {Compressing RAG Embeddings with TurboQuant},
  author       = {Laabsi, Zakaria},
  year         = {2026},
  month        = {Apr},
  howpublished = {\url{https://zlaabsi.github.io/posts/turboquant-embed/}},
  note         = {Blog post}
}
```

</details>
