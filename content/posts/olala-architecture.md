---
title: "Inside Olala: a hybrid Mamba-3 and attention model, taken apart"
date: 2026-11-22
draft: false
url: "/posts/olala-architecture/"
author: "Zakaria Laabsi"
tags: ["llm-architecture", "mamba", "attention", "mixture-of-experts", "normalization", "kv-cache", "llm-systems"]
categories: ["machine-learning"]
keywords: ["Olala", "Mamba-3", "differential attention", "Tensor Product Attention", "Scalable Softmax", "Latent-MoE", "GeoNorm", "hybrid language model", "KV cache", "massive activations"]
description: "A component-by-component walkthrough of Olala-v1.0-mini-7A1B, with interactive figures: hybrid backbone, differential tensor-product attention, Mamba-3 MIMO, Latent-MoE, geodesic normalisation, and the mechanism behind three silently degenerate layers."
summary: "Olala-v1.0-mini-7A1B interleaves 29 Mamba-3 layers with 7 attention layers, routes every token through 6 of 256 latent experts, and keeps its residual stream on a hypersphere. This post rebuilds each component from its equations, with figures you can manipulate."
ShowToc: true
TocOpen: false
math: true
ShowReadingTime: true
ShowCodeCopyButtons: true
---

> Olala-v1.0-mini-7A1B is an open hybrid language model from the OVHai LLM research team: 7B parameters in total, about 1B read per token, trained on 12.8T tokens of public data.[^report] Its technical report is unusually explicit about why each component is there, what was measured, and what went wrong. This post follows the architecture sections of that report and rebuilds each component from its equations. Every figure is interactive, and every number is either quoted from the report or computed live in your browser from the formula next to it. Where I infer something the report does not state, I say so.

The figures are also collected, without the derivations, in the companion explorable: [Olala, taken apart](/explorables/olala/).

Several framings below, in particular the reading of attention and linear mixers as two kinds of associative memory, come from a talk by Alexandre TL,[^talk] who works on LLM pre-training at OVHai LLM and is part of the team that built the model.

## 1. The backbone

Olala has 36 layers. Each layer contains a **mixer**, which moves information between token positions, followed by a **feed-forward block**, which is applied to each position on its own and behaves like a memory of what was learned in training. Twenty-nine of the mixers are Mamba-3 layers and seven are attention layers, placed at every fifth position. Every feed-forward block is a mixture of experts.

{{< olala fig="stack" id="fig-stack" caption="The 36 layers, counted from 0 at the bottom. Blue plates are Mamba-3 mixers, orange plates are attention mixers, and the thin plate on each is its Latent-MoE block. The lanes on the right switch between the layout and three per-layer measurements from the report's appendices. Hover a plate for what is known about that layer." >}}

Three numbers summarise the design. The model dimension is 1,536. The seven attention layers together cache 15.7 kB per token in bf16, against a state of constant size for the 29 Mamba-3 layers. And for any one token only about a seventh of the parameters are touched, because the feed-forward blocks, which hold most of the weights, are sparse.

### 1.1 Two memories

Why mix two kinds of layer at all? The clearest way I know to see it is to treat both as associative memories: devices that store pairs $(k_i, v_i)$ and, given a query $q$, return the value whose key matches.

Softmax attention keeps every pair. Reading is a weighted average of all stored values,

$$
\mathrm{Attn}(Q,K,V)=\mathrm{softmax}\!\left(\frac{QK^\top}{\sqrt{d}}\right)V ,
$$

so the table grows by one row per token and each read costs one dot product per row. A linear mixer keeps a single matrix instead. Writing a pair adds the outer product $k_i v_i^\top$ to a state $S$, and reading is one matrix product, $q^\top S = \sum_i (q^\top k_i)\, v_i$. That is attention with the softmax removed, which is why the family is often called linear attention. The state never grows, but every stored value leaks a little into every read.

{{< olala fig="memory" id="fig-memory" caption="The same pairs written to both memories. Top: what each one stores after T writes; the matrix on the right shows real entries of the state. Bottom: how faithfully a stored value is read back. With random unit keys and no decay, the fixed-size state follows 1/√(1 + (T − 1)/d_k), drawn dashed." >}}

The curve makes the trade explicit. The fixed-size state degrades smoothly once the number of stored pairs passes its key dimension, and attention does not. This is the report's starting observation: linear mixers now match attention on language-modelling loss, but fall behind on recall, the retrieval of one precise piece of context. The two families fail in complementary ways, so a majority of cheap linear layers carries most of the work and a few attention layers supply exact recall.

### 1.2 Where the attention layers go

The report compares hybrid templates at equal parameter count. Running attention and the linear mixer in parallel inside each layer reaches the same loss as alternating them, but trains about 20% slower, so the layout is sequential. It then sweeps where the attention layers sit, at benchmark scale: 24 layers, four of them attention.

{{< olala fig="placement" id="fig-placement" caption="Nine placements of four attention layers among twenty linear-mixer layers, from the report's Table 4. The shaded band is the seed-to-seed noise of the benchmark around the adopted layout." >}}

Two things are worth reading off this figure. Uniform spacing wins on loss, and placements that put attention late beat their mirror images that put it early. And the recall metrics are much noisier than the loss: switch the metric and most of the differences fall inside the band. The report is candid that this noise calibration came late in the project and that several recall-driven decisions never properly cleared it. I come back to that at the end.

## 2. The attention layer

The report lists five documented flaws of softmax attention and maps each to a fix. The first four are fixed inside the layer; the fifth, quadratic cost, is addressed only by having few attention layers.

| Flaw | Fix adopted |
|---|---|
| Scores depend on context length and do not extrapolate | No positional encoding, a context-window schedule, Scalable Softmax |
| No way to attend to nothing; attention sinks | Zero-centered gate, differential attention |
| Small weights on irrelevant tokens add up to noise | Grouped differential attention |
| The KV cache grows linearly with context | Hybrid backbone, Tensor Product Attention |
| Weak local mixing | A two-token convolution at the layer input |

The resulting layer, which the report calls DiffTPA, processes its input in this order: token shift, normalisation, factorised keys and values, a length-aware softmax, a subtraction between two groups of heads, and an output gate.

### 2.1 Length: Scalable Softmax

Softmax normalises over however many tokens are in the window. Suppose one key leads the rest by a logit gap $\Delta$. Its weight is

$$
p = \frac{1}{1 + (n-1)\,e^{-\Delta}} ,
$$

which decays like $e^{\Delta}/n$: as the context grows, the same preference buys less and less attention. Scalable Softmax[^ssmax] multiplies the logits by $s \log n$, with one learned scalar $s$ per head,

$$
\mathrm{softmax}\!\left(\frac{(s \log n)\,QK^\top}{\sqrt{d}}\right),
$$

which amounts to replacing the base $e$ by $n^{s}$. The same leading key now receives

$$
p = \frac{1}{1 + (n-1)\,n^{-s\Delta}} ,
$$

and the behaviour splits cleanly at $s\Delta = 1$. Above it the weight rises towards one with $n$. Below it the weight still fades, but polynomially.

{{< olala fig="ssmax" id="fig-ssmax" caption="Weight on the leading key against the number of tokens in the window, for plain softmax and for Scalable Softmax. The dashed verticals mark the attention windows of the three training phases." >}}

There is a catch that the report points out. A model trained at one context length sees one value of $\log n$ and has nothing from which to learn $s$. Olala's attention layers carry no positional encoding at all, and position is left to the Mamba-3 layers around them, which are position-aware by construction. In isolation that costs loss. It is paired with SkyLadder,[^skyladder] a schedule that ramps the attention window from 8 tokens to 8,192 over the first 60% of pretraining and to 32,768 during annealing. The ramp is what exposes the model to many values of $n$. On the final checkpoint the 336 learned scales run from 0.35 to 19.75 with a median of 2.09, and they correlate with how sharp each head is.

The absence of positional encoding has a practical consequence later: extending the context from 32k to 256k tokens needs no rescaling or interpolation scheme, only removing the cap and training on long documents for 44.6B tokens.

### 2.2 Noise: differential attention

A softmax must spend a total mass of one. Whatever it does not put on the relevant key lands somewhere, as a floor of small weights and often as a lump on an uninformative position, the attention sink. Differential attention[^diff] computes two maps and subtracts one from the other,

$$
\mathrm{DiffAttn}(x)=\left[\mathrm{softmax}\!\left(\frac{Q_1K_1^\top}{\sqrt{d}}\right)-\lambda\,\mathrm{softmax}\!\left(\frac{Q_2K_2^\top}{\sqrt{d}}\right)\right]V ,
$$

with $\lambda$ learned. The second map serves as an estimate of the noise in the first. The analogy from the talk is a noise-cancelling headphone: a second microphone records the ambient noise, and subtracting it leaves the signal. The difference sums to $1-\lambda$ and can be close to zero everywhere, which no single softmax can do.

{{< olala fig="diff" id="fig-diff" caption="Mechanism view: a signal map, a noise map and their weighted difference over the same keys, on toy logits. Measured view: mean attention mass on position 0 for the seven attention layers of the trained model, from the report's Table 50." >}}

Two refinements are in the final layer. The first is an uneven split. Estimating noise is easier than extracting signal, so the heads are divided three to one: 36 signal heads and 12 noise heads, each noise head shared by three signal heads. At matched parameters this leaves loss unchanged and improves the recall metrics. The second is a change of shape: queries, keys and values are given the same width by adding query heads, 48 in total, so that the layer runs on stock attention kernels.

The measured view of the figure shows what the subtraction does on the trained model, and the accounting matters. The subtraction's weights sum to about 0.39, so everything a head outputs is rescaled by $1/0.39 = 2.59$. The sink mass on the first four positions shrinks by 3.61 overall. The part that is specific to the sink is therefore $3.61/2.59 = 1.40$. Where a noise head carries the same lump as its signal heads, the net is near zero. Where it does not, the sink passes through untouched, and the report finds four such dedicated sink heads. The sink is also positional: in six of the seven layers, removing the `<bos>` token leaves the mass on position 0 unchanged.

### 2.3 A null option: the zero-centered gate

Differential attention softens the pressure to put mass somewhere but does not remove it. Gated attention gives the layer an explicit way to write nothing, by multiplying the attention output by a learned function of the input, $y \mapsto y \odot g(W_g x)$.

The usual choice is a sigmoid. At initialisation, with zero-mean weights, a sigmoid gate sits at one half, so the layer starts by halving its own output, and reaching values near one requires large weights that weight decay keeps pulling back. The report's variant asks for a gate that is the identity when the weights are small, so that the weights encode only the deviation from identity, which is exactly what weight decay should shrink. It tries three forms:

$$
\text{ZCG-1: } y \odot \mathrm{SiLU}(W_g x) + 1, \qquad
\text{ZCG-2: } y \odot \big(\mathrm{SiLU}(W_g x) + 1\big), \qquad
\text{ZCG-3: } y \odot \mathrm{SiLU}(W_g x + c).
$$

{{< olala fig="gate" id="fig-gate" caption="The four gates as functions of the pre-activation, over the distribution that pre-activation has at initialisation. The marked point is the expected gate value, computed by numerical integration for the gate and offset selected." >}}

The figure shows why only the third works. ZCG-1 is not a gate at zero weights: its output is the constant one. ZCG-2 is the identity at zero but cannot go below 0.72, so it cannot close. ZCG-3 can do both, provided the offset is chosen well, and the choice is subtle. $\mathrm{SiLU}(1.28) = 1$ would make the gate exactly one at a zero pre-activation. But the pre-activation at initialisation is not zero; it is roughly a unit Gaussian, and the condition that matters is

$$
\mathbb{E}_{z\sim\mathcal{N}(0,1)}\big[\mathrm{SiLU}(z + c)\big] = 1 \quad\Longrightarrow\quad c \approx 1.15 .
$$

Move the offset slider to 1.28 and the expectation overshoots. In the ablation, ZCG-3 lowers validation loss from 2.789 to 2.778 and is the only variant that beats the sigmoid gate. On the trained model the gate is used heavily: the share of (token, head) slots that are fully closed rises from 8% at the first attention layer to 52% at the last.

### 2.4 Cache: Tensor Product Attention

At inference the keys and values of every past token are cached, $2 H_{kv} d_h$ numbers per token per layer for $H_{kv}$ KV heads of dimension $d_h$. Tensor Product Attention[^tpa] replaces each of the two tensors by a sum of $R$ outer products,

$$
K_t = \frac{1}{R}\sum_{r=1}^{R} a^K_r(x_t)\otimes b^K_r(x_t), \qquad
V_t = \frac{1}{R}\sum_{r=1}^{R} a^V_r(x_t)\otimes b^V_r(x_t),
$$

where each head factor $a_r \in \mathbb{R}^{H_{kv}}$ and each feature factor $b_r \in \mathbb{R}^{d_h}$ is a small linear projection of the token. Only the factors are cached: $2R(H_{kv} + d_h)$ numbers. The cost is a sum where it used to be a product.

{{< olala fig="tpa" id="fig-tpa" caption="The cached factor vectors, the rank-one sheets they generate, and the dense key tensor those sheets average to. Only the vectors along the two back edges are stored. Factor values are random." >}}

Olala uses $R = 4$ with queries left dense, which gives 1,120 cached numbers per token per layer. That figure is consistent with $H_{kv} = 12$ and $d_h = 128$, since $2 \cdot 4 \cdot (12 + 128) = 1120$; the report states the total and the head dimension, and the count of twelve KV heads is my inference. Over seven layers in bf16 this is $7 \times 1120 \times 2 = 15{,}680$ bytes per token, the report's 15.7 kB. At a 32k context the report puts this at roughly 4.5 times less cache than a dense 3B transformer of the same depth.

At benchmark scale, rank 2 matched grouped-query attention on loss with a cache 3.9 times smaller. The report is careful about the recall side of this comparison, and I repeat the caveat: the recall evidence for the combined layer is not robust at benchmark scale, and at full scale it is validated only indirectly, through long-context scores of the final model.

### 2.5 Local mixing

The last piece is the cheapest. A depthwise convolution of kernel size two at the input of each attention layer lets every token blend with its predecessor,

$$
k_t \leftarrow \alpha_t\, k_{t-1} + (1-\alpha_t)\, k_t ,
$$

so the expensive global mixer need not spend heads on adjacent-token patterns. It is nearly free at inference and takes validation loss from 2.789 to 2.779, one of the two largest gains of the attention study, next to the gate's 2.778.

## 3. The linear mixer: Mamba-3 MIMO

The 29 linear layers are Mamba-3[^mamba3] in its multi-input multi-output form. For one head, the state evolves as

$$
S_t = \alpha_t\, S_{t-1} + \Delta t_t \sum_{r=1}^{R} k_r(t)\otimes v_r(t), \qquad \alpha_t = \exp(A\,\Delta t_t),
$$

with $A < 0$ learned per head and $\Delta t_t > 0$ computed from the input. This is the fixed-size memory of section 1.1 with two additions. The factor $\alpha_t \in (0,1)$ is a decay: it is the fraction of the state that survives each step, and because it depends on the input the head can hold its memory or clear it. And each step writes $R = 4$ outer products instead of one.

The argument for rank four is about hardware, not expressivity alone. Decoding from a state-space layer is bound by memory bandwidth: the state is read and written every step, and the single-output form performs about 2.5 arithmetic operations per byte moved, two orders of magnitude below what accelerators sustain on matrix products. A rank-$R$ update turns the write into a small matrix-matrix product and multiplies the useful work by up to $R$ at the same state size and the same latency. In the benchmark this takes validation loss from 2.789 (Gated DeltaNet) to 2.781 (Mamba-3, rank one) to 2.775 (rank four).

One detail of this section becomes important later. Supporting tensor parallelism over these layers required removing the normalisation inside the kernel, which would otherwise force a collective communication in the middle of it. At small scale, once the normalisation scheme of section 5 was in place, the difference was below the noise floor (2.900 against 2.897), so the norm was removed. Keep that in mind for section 6.

## 4. The feed-forward block: Latent-MoE

In a mixture-of-experts block a router sends each token to a few small feed-forward networks out of many. Parameters grow with the number of experts and compute per token does not. Olala follows the routing recipe of DeepSeek-V3: sigmoid scores, the top six kept and renormalised, one shared expert evaluated for every token, and load balancing through a router bias. The experts use a squared ReLU, $\mathrm{FFN}(x) = W_2\,\mathrm{ReLU}(W_1 x)^2$, which needs two matrices where SwiGLU needs three.

The change that matters is where the experts read from. In Latent-MoE, a projection shared by all experts first maps the 1,536-dimensional stream to 384 dimensions; experts work there; a second projection maps the sum back.

{{< olala fig="moe" id="fig-moe" caption="Routing view: the 256 experts of one block as a floor plan. The experts selected for the current token rise in proportion to their renormalised router weight; the bar below counts the weights read. Ablation view: validation loss against granularity and against the number of active experts, from the report's Tables 16 and 17." >}}

The reason is an aspect ratio. Dense MLPs work best when the hidden layer is two to four times wider than the input. A routed expert of hidden size 768 reading a 1,536-wide stream has a ratio of one half; reading a 384-wide latent it has a ratio of two. To keep the active budget constant, the number of active experts, and with it the total, is multiplied by four.

The report says the arithmetic of the final block is exact, and it is. Counting weights: the two projections are $2 \cdot 1536 \cdot 384$; six routed experts are $6 \cdot 2 \cdot 384 \cdot 768$; and if the shared expert, of hidden size 1,536, reads the full stream, it is $2 \cdot 1536 \cdot 1536$. The total is 9,437,184, which is $2 \cdot 1536 \cdot 3072$: precisely a dense two-matrix feed-forward block of hidden size 3,072. The report gives the equality and the shared expert's hidden size; that it reads the full-width stream is what makes the sum come out, and is my inference. One block holds about 157M feed-forward weights and reads about 6% of them per token.

In the ablations, the latent formulation is worth about 0.04 nats over a standard MoE at every granularity, more than ten times the noise floor. Finer experts keep helping, so the final choice of granularity four is an inference-efficiency compromise. So is the sparse routing: in the sweep, halving the number of active experts costs 0.006, and going down to an eighth costs 0.030.

Two blemishes are reported. The first two MoE blocks resisted load balancing throughout training; several recent models avoid the issue by keeping their first layers dense. And the squared ReLU, being exactly $x^2$ on the positive side, amplifies outliers: four blocks spike to between $2 \times 10^7$ and $3 \times 10^8$ on particular tokens.

## 5. Normalisation: writing on a sphere

The last departure from the standard recipe concerns how a block's output is written onto the residual stream. It was adopted during the full-scale run, to resolve instabilities that nothing else resolved.

{{< olala fig="norms" id="fig-norms" caption="Three ways to write a block output onto the stream, and the angle by which each write turns the stream as depth grows. The two curves are closed forms; the gold segment is the plateau the report measures on the trained model." >}}

Modern language models are Pre-Norm: each block reads a normalised copy of the stream and adds its output to the un-normalised stream. The stream's norm then grows with depth, and each new output is a smaller fraction of it. Post-Norm renormalises after every block and avoids that, but is notoriously unstable at scale.

Geometrically, Post-Norm forms $x + s$, which leaves the sphere of radius $\lVert x\rVert$, and projects it back along the radius. GeoNorm[^geonorm] replaces the projection by a move along the sphere. With $v$ the component of $s$ tangent to the sphere at $x$,

$$
v = s - \frac{x^\top s}{\lVert x\rVert^2}\,x, \qquad
x' = \exp_x(\alpha v) = \cos\theta\; x + \lVert x\rVert \sin\theta\;\frac{v}{\lVert v\rVert}, \qquad \theta = \alpha\,\frac{\lVert v\rVert}{\lVert x\rVert},
$$

where $\alpha$ is one learned scalar per block. Because $v \perp x$, the norm is preserved exactly, whatever $\alpha$ and $s$ are.

{{< olala fig="geonorm" id="fig-geonorm" caption="One write onto the residual sphere. The update s leaves from the tip of x. Post-Norm projects x + s back along the radius, giving the pink endpoint. GeoNorm keeps only the tangent part v and walks the gold geodesic. Drag to rotate; the cross-section view is the exact planar picture, and the third view chains several writes." >}}

Whether the two writes differ in practice depends on the angle between $x$ and $s$. If the update were nearly parallel to the stream, both would do almost nothing; the difference is largest when the update is orthogonal. The report measures this angle on BERT-base and on three dense Qwen3 models and finds it close to 90° at every depth, in Pre-Norm and Post-Norm networks alike. Set the first slider near 90° and increase the size of the update: the hard-projection angle is an arctangent and saturates, while the geodesic angle is linear in $\lVert v\rVert$.

**Pre-Norm is a special case.** Rescaling the Pre-Norm stream as $x^{\text{alt}}_k = x_k/\sqrt{k+1}$ turns its recursion into

$$
x^{\text{alt}}_k = \frac{\sqrt{k}}{\sqrt{k+1}}\,x^{\text{alt}}_{k-1} + \frac{1}{\sqrt{k+1}}\,\phi_k\big(\mathrm{Norm}(x^{\text{alt}}_{k-1})\big),
$$

which is the exponential map above with the fixed angle $\theta_k = \arccos\big(\sqrt{k}/\sqrt{k+1}\big)$. That angle is 45° at the first write and decays like $1/\sqrt{k}$. So Pre-Norm already moves on a sphere; it simply has no say over how far. GeoNorm lets the angle depend on a learned step size, the current state and the update.

**The sphere as a global invariant.** The exponential map keeps each token on the sphere it starts on, but nothing in it puts all tokens on the same sphere. Left alone, each token would carry the radius of its embedding through the whole network. Two boundary conditions remove that freedom: input embeddings are L2-normalised on entry, and the usual final normalisation before the output layer is removed, since the last block's output is already normalised. The report states that intermediate configurations breaking any one of the three conditions were unstable at full scale.

**What the model learned.** On the final checkpoint, 61 of the 72 writes exceed the Pre-Norm reference angle, by a median factor of 2.4 for mixer writes and 3.3 for MLP writes. The MLP angles are flat at about 0.55 rad across the second half of the network, where Pre-Norm would have decayed to 0.12. The third view of the figure above chains writes under both schedules.

The benchmark case for GeoNorm is mostly about gradients. Loss improves by 0.011 at matched iterations, but the 99th percentile of the gradient norm falls from 1.01 to 0.61.

Two findings in that measurement are less comfortable, and the report states them plainly. A third of the writes, 24 of 72, have a strictly constant angle: their tangent norm saturates a clamp on the step angle for every token, so the write is a fixed rotation that ignores its input. And GeoNorm renormalises the stream at every block, which can hide a defect elsewhere in the network. Both lead to the next section.

## 6. Three layers that failed silently

During the full run, three of the 29 Mamba-3 layers degenerated. Training never became unstable, and nothing in the loss curve shows it. The team found it afterwards, as an engineering failure: every standard quantization recipe produced a model that generated plausibly on short prompts and collapsed to NaN on realistic ones.

The measurements are stark. In layers 1, 7 and 23, a single head holds a recurrent state of magnitude $10^9$ to $10^{10}$ and emits outputs up to $1.8 \times 10^{16}$, while every other head in the same layer stays around $0.1$. The residual stream itself never exceeds 0.69. The report assembles the cause from four ingredients, each traceable to one design choice.

{{< olala fig="ratchet" id="fig-ratchet" caption="The four ingredients of the runaway, in the order the report assembles them: a clamp that creates a corner, an undecayed sum that must grow, a saturated step angle that makes growth free, and the bf16 rounding that then erases the other heads." >}}

**A corner on the integrator.** The kernel clamps the decay parameter so that $-A \ge 10^{-4}$. A head that benefits from longer memory is pushed towards $\alpha = 1$. Under an unclamped parameterisation that approach is asymptotic and the gradient never vanishes. With the clamp, once $A$ crosses the bound the forward pass uses the clamped value regardless, and the gradient with respect to $A$ is exactly zero. Heads arrive at the corner and stay. All three runaway heads sit exactly on it.

**Growth forced by the algebra.** With $\alpha \approx 1$ the recursion telescopes to $S_T \approx \sum_{t \le T}\Delta t_t \sum_r k_r(t)\otimes v_r(t)$ and the readout to $\sum_{t \le T}\sum_r (q^\top k_r(t))\,v_r(t)$: linear attention over the entire prefix with no normalising denominator. The norm of such a sum grows with $T$, between $\sqrt{T}$ and $T$ depending on how coherent the terms are. Decay was the formulation's only bound.

**The brake that was removed.** A normalisation on the mixer output would bound the readout regardless. It is the norm that was removed for tensor parallelism in section 3, after a small-scale ablation showed no difference. Toggle it in the second panel of the figure.

**A flat direction.** Once the tangent component exceeds about $0.8\,\lVert x\rVert$, the clamp on the step angle makes the forward pass invariant to further growth, so the magnitude carries no loss penalty. The gradient through the direction normalisation scales as $1/\lVert g\rVert$, so the head also decouples from the training signal as it grows. Growth is easy to enter, free while it lasts, and has no restoring force. The report reads the observed magnitudes, far beyond what saturation requires, as drift along that flat direction and not as something the model uses.

The last panel shows the consequence. Heads are summed by an output projection, and bf16 keeps eight significant bits: adding a contribution of order one to a value of $10^{15}$ changes nothing. Removing the other 47 heads leaves 96 to 100% of the layer output bit-identical. Three layers of the network compute 141 heads and then erase them.

The ablations show the magnitudes are vestigial. Zeroing the massive dimensions shifts held-out loss by at most 0.018, and keeping only the runaway head reproduces the baseline. This is the opposite of what is reported for transformers, where massive activations stay around $10^3$ to $10^4$ and removing them is catastrophic. The same geodesic write that let the runaway happen is also why training survived it: in an additive residual stream, a branch output of $10^{15}$ would have destroyed optimisation at once.

The report draws two lessons, and I think they generalise. Keep the output norm, whose communication cost is a better price than silent degeneracy. And stability is not health: a training setup this forgiving needs per-layer monitoring of output norms and state statistics, where a state norm that grows linearly with position is an unambiguous early warning. It also notes the epistemic status of the account, which is a reconstruction from one final checkpoint: the gradient arguments are exact properties of the architecture, while the order of events is inferred.

## 7. What the benchmark could and could not tell

Every component above was chosen on a small benchmark: 750M parameters, 10B tokens, a learning-rate sweep per candidate, and a noise floor measured from six seeds. The threshold for a real difference is 0.003 on validation loss and several points on recall. Candidates were screened alone against a reference hybrid, then re-validated on top of everything already adopted.

The protocol caught a good deal, and the report is equally clear about what it missed. Hyperparameters transferred: the optimal learning rate was the same at 124M and 540M parameters and from 5B to 15B tokens, under the CompletedP parameterisation. An optimizer did not: AdEMAMix won clearly at benchmark scale and was unstable at full scale, so the run used AdamW. The removal of the Mamba-3 output norm passed the benchmark and produced the failure of section 6, which needs both the corner dynamics and enough training steps to appear. And the recall metrics that motivated several attention choices turned out to be noisier than assumed.

That is the part of the report I find most useful. The architecture is a combination of known ideas, and the contribution is the account of how each was tested, including where the test was not strong enough.

## Configuration at a glance

| Component | Setting |
|---|---|
| Layers | 36: 29 Mamba-3 and 7 attention, every fifth layer |
| Model dimension | 1,536 |
| Vocabulary | 151,936, untied embeddings |
| Normalisation | GeoNorm, normalised embeddings, no final norm |
| Position encoding | none, with the SkyLadder window schedule |
| Attention heads | 48 query heads of dimension 128, 36 signal and 12 noise |
| KV cache | Tensor Product Attention, rank 4, 1,120 numbers per token per layer |
| Attention gate | ZCG-3, SiLU with offset 1.15 |
| Softmax | Scalable Softmax, logits soft-capped at 150 |
| Local mixing | convolution of kernel 2 at the attention input |
| Mamba-3 | state dimension 128, head dimension 64, MIMO rank 4 |
| Experts | 256 routed, hidden 768, latent input 384; one shared, hidden 1,536 |
| Routing | sigmoid scores, top 6, squared ReLU experts |
| Parameters | 7B total, about 1B active |

## Sources

All measurements, tables and equations are from the Olala technical report. The interactive figures recompute the formulas; where a figure uses toy or random values it says so in its own notes.

[^report]: OVHai LLM Research Team, *Olala v1.0 mini Technical Report*. Models at [huggingface.co/OVHaiLLM](https://huggingface.co/OVHaiLLM), code at [github.com/OVHai-LLM](https://github.com/orgs/OVHai-LLM). Section, table and appendix numbers in this post refer to that report.
[^talk]: Alexandre TL, *Le Transformer en passe d'être dépassé ?*, talk published 27 June 2026, [youtube.com/watch?v=SqyHPlEM40Q](https://www.youtube.com/watch?v=SqyHPlEM40Q). The associative-memory reading of attention and Mamba, and the noise-cancelling analogy for differential attention, are from this talk.
[^ssmax]: Nakanishi, Scalable-Softmax, 2025, as cited in the report.
[^skyladder]: Zhu et al., *SkyLadder: Better and faster pretraining via context window scheduling*, 2025.
[^diff]: Ye et al., Differential Transformer, 2024; grouped variant by Lim et al., 2025, both as cited in the report.
[^tpa]: Zhang et al., *Tensor product attention is all you need*, 2025.
[^mamba3]: Dao and Gu, Mamba-3, 2026, as cited in the report.
[^geonorm]: Zheng et al., *GeoNorm: Unify Pre-Norm and Post-Norm with geodesic optimization*, 2026. The report also relates the update to the spherical interpolation of nGPT (Loshchilov et al., 2024).
