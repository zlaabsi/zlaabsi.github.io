---
title: "Olala, taken apart"
date: 2026-11-22
draft: false
description: "Twelve interactive figures on the architecture of Olala-v1.0-mini-7A1B, a hybrid Mamba-3 and attention mixture-of-experts language model. Each concept is drawn in the dimension that suits it: flat where the idea is a curve or a wiring diagram, layered where it is a stack, solid where it is a sphere."
math: true
companion:
  title: "Inside Olala: a hybrid Mamba-3 and attention model, taken apart"
  url: "/posts/olala-architecture/"
---

## The whole model

The report's overview figure, redrawn so that it can be opened. The network runs bottom to top on the left; the frame on the right shows the inside of whichever block is selected. A wiring diagram, so it is flat.

{{< olala fig="arch" caption="Olala as a block diagram, redrawn from Figure 1 of the technical report." >}}

[Derivation in the article](/posts/olala-architecture/#fig-arch)

## The backbone

Thirty-six layers, counted from the bottom: 29 Mamba-3 mixers, 7 attention mixers at every fifth position, and a mixture-of-experts block after each. Drawn as a tower because depth is a real axis of the model, and because several of the report's measurements are per layer and are easiest to read at the height of the layer they describe.

{{< olala fig="stack" caption="The 36 layers of Olala. Switch the lane on the right between the layout, the attention sink, gate closure and the outlier magnitudes; hover a plate for what is known about that layer." >}}

Where should the attention layers sit? At benchmark scale the report tries nine orderings. This one is flat: a strip per ordering and a dot per result.

{{< olala fig="placement" caption="Nine placements of four attention layers among twenty linear-mixer layers, with validation loss or recall. From the report's Table 4." >}}

[Derivation in the article](/posts/olala-architecture/#fig-stack)

## Two kinds of memory

Attention keeps every key and value it has seen. A linear mixer folds them all into one matrix of fixed size. Write the same pairs to both and read them back: the difference between the two curves is the reason the model is a hybrid.

{{< olala fig="memory" caption="A growing table and a fixed matrix receiving the same pairs, and how faithfully each returns a stored value." >}}

[Derivation in the article](/posts/olala-architecture/#fig-memory)

## The attention layer

Four fixes are stacked inside each of the seven attention layers. Each one answers a specific, documented flaw of softmax attention, and each is a statement about one function, so each is drawn flat, except the cache.

**Length.** A fixed logit gap buys less attention as the window grows. Scalable Softmax multiplies the logits by $s \log n$.

{{< olala fig="ssmax" caption="Weight on the leading key against window size, for softmax and Scalable Softmax." >}}

**Noise and sinks.** Two attention maps are computed and one is subtracted from the other, which cancels whatever they share.

{{< olala fig="diff" caption="Signal map, noise map and their difference on toy logits; then the sink mass measured on the trained model, layer by layer." >}}

**Attending to nothing.** An output gate that starts as the identity in expectation and can still close completely.

{{< olala fig="gate" caption="The sigmoid gate and the three zero-centered variants, read against the distribution of the pre-activation at initialisation." >}}

**The cache.** Keys and values are stored as a few pairs of short vectors and rebuilt by outer products. This one is layered: the object is a stack of rank-one sheets above the tensor they sum to.

{{< olala fig="tpa" caption="Cached factors, the rank-one sheets they generate, and the dense tensor those sheets average to." >}}

[Derivation in the article](/posts/olala-architecture/#fig-ssmax)

## The feed-forward block

Each token is routed to 6 of 256 small experts that work in a 384-dimensional copy of the stream, plus one shared expert. Drawn as a floor plan with the selected experts rising out of it, so that sparsity is seen and not counted.

{{< olala fig="moe" caption="One Latent-MoE block. Route a few tokens, change the number of experts selected, and watch the weight count against a dense feed-forward block; the second view plots the ablations." >}}

[Derivation in the article](/posts/olala-architecture/#fig-moe)

## Writing on a sphere

The residual stream of Olala lives on a hypersphere. Start with the wiring, which is flat, and the one quantity that separates the three schemes: the angle of each write.

{{< olala fig="norms" caption="Pre-Norm, Post-Norm and GeoNorm as wiring, and the angle each one turns the stream by as depth grows." >}}

Then the geometry, which is not flat. A sphere, a tangent plane and a geodesic need a solid: the hard projection leaves the surface and is pulled back, the geodesic update never leaves it.

{{< olala fig="geonorm" caption="One write onto the residual sphere, by hard projection and by geodesic update. Drag to rotate. The cross-section view is the exact planar picture; the third view chains several writes." >}}

[Derivation in the article](/posts/olala-architecture/#fig-norms)

## A silent failure

Three Mamba-3 layers degenerated during training without any sign in the loss. The report reconstructs the mechanism from four ingredients, each a function with a kink in it.

{{< olala fig="ratchet" caption="The four ingredients of the runaway: a clamp that creates a corner, a sum that must grow, a saturated step that makes growth free, and the rounding that erases the other heads." >}}

[Derivation in the article](/posts/olala-architecture/#fig-ratchet)
