---
title: "Impartial Combinatorial Game Theory: From Nim to Sprague-Grundy"
date: 2026-03-30
draft: false
author: "Zakaria Laabsi"
tags: ["game-theory", "combinatorics", "sprague-grundy", "nim", "graph-theory", "mathematics"]
categories: ["mathematics"]
description: "A complete walkthrough of impartial combinatorial game theory: the game of Nim, nim-sum algebra, Bouton's theorem, game graphs, and the Sprague-Grundy theorems with proofs."
summary: "Every impartial combinatorial game reduces to a single XOR computation. This post walks through the full theory — from Nim to the Sprague-Grundy theorem — with proofs, examples, and code."
ShowToc: true
TocOpen: true
math: true
ShowReadingTime: true
ShowCodeCopyButtons: true
---

> *This post is adapted from academic notes I wrote in 2020 during my L3 in mathematics at INU Champollion, supervised by Alain Berthomieu. The content is not recent — it reflects what I was studying six years ago. I'm publishing it here because the results are timeless, and I think the presentation holds up.*

## Introduction

Two players sit across from each other. There are several heaps of tokens on the table. On each turn, a player picks a heap and removes as many tokens as they want — at least one. The player who takes the last token wins. This is the game of **Nim**.

The remarkable fact is that this game — and indeed *every* impartial combinatorial game — admits a complete mathematical solution. The winning strategy reduces to a single operation: **XOR**.

The central result is the **Sprague-Grundy theorem**, proved independently by Roland Sprague (1935) [^1] and Patrick Michael Grundy (1939) [^2]. It states that every impartial game is equivalent to a Nim heap of a certain size. The size is computed recursively using the **Grundy function**, and the winning condition for a sum of games is determined by XOR-ing the Grundy values.

Charles L. Bouton had already solved Nim itself in 1901 [^3], but Sprague and Grundy generalized the result to *all* impartial games by connecting game positions to directed acyclic graphs. John Conway later unified the theory in *On Numbers and Games* (1976) [^4], introducing surreal numbers and the formal framework that Berlekamp, Conway, and Guy expanded in *Winning Ways* (1982) [^5].

This post walks through the full path: Nim, the nim-sum, Bouton's theorem, games as graphs, and the two Sprague-Grundy theorems — with complete proofs.

---

## The Game of Nim

Nim is played with $k$ heaps containing $n_1, n_2, \ldots, n_k$ tokens respectively. On each turn, a player chooses one heap and removes any positive number of tokens from it. Under the **normal play convention**, the player who takes the last token wins — equivalently, the player who cannot move loses.

A game state is a $k$-tuple $(n_1, n_2, \ldots, n_k) \in \mathbb{N}^k$. The terminal state is $(0, 0, \ldots, 0)$.

![Nim heaps](/images/cgt/nim_heaps.svg)

### Binary Matrix Representation

Any Nim position can be written as a binary matrix. Decompose each heap size in base 2:

$$
n_i = \sum_{j=0}^{m} a_{i,j} \cdot 2^j, \quad a_{i,j} \in \{0, 1\}
$$

The position $(n_1, \ldots, n_k)$ becomes a $k \times (m+1)$ binary matrix $M$ where $M_{i,j} = a_{i,j}$.

**Example.** The position $(1, 3, 5)$:

$$
\begin{pmatrix} 1 \\ 3 \\ 5 \end{pmatrix} = \begin{pmatrix} 0 & 0 & 1 \\ 0 & 1 & 1 \\ 1 & 0 & 1 \end{pmatrix}_{\!b}
$$

![Binary matrix](/images/cgt/binary_matrix.svg)

The column-wise sum modulo 2 of this matrix turns out to determine who wins. That operation is the **nim-sum**.

---

## The Nim-Sum

**Definition.** The *nim-sum* of two non-negative integers $a$ and $b$, written $a \oplus b$, is their bitwise addition modulo 2 (XOR):

$$
(a_m \ldots a_1 a_0)_b \oplus (b_m \ldots b_1 b_0)_b = (c_m \ldots c_1 c_0)_b, \quad c_j = (a_j + b_j) \bmod 2
$$

This is exactly the XOR operation from computer science.

### Algebraic Properties

The pair $(\mathbb{N}_0, \oplus)$ forms an **abelian group**:

1. **Identity:** $a \oplus 0 = a$ for all $a$.
2. **Self-inverse:** $a \oplus a = 0$ for all $a$.
3. **Commutativity:** $a \oplus b = b \oplus a$.
4. **Associativity:** $(a \oplus b) \oplus c = a \oplus (b \oplus c)$.

*Proof sketch.* Properties (1) and (2) follow immediately from the definition: XOR-ing with 0 changes nothing, and XOR-ing a number with itself gives 0 (since $x + x \equiv 0 \pmod{2}$ for $x \in \{0,1\}$).

For *associativity*, it suffices to check at the bit level. For single bits $a, b, c \in \{0,1\}$: when $c = 0$, both sides reduce to $a \oplus b$; when $c = 1$, we use the fact that $b \oplus 1 = \lnot b$ and $a \oplus \lnot b = \lnot(a \oplus b)$, so both sides equal $(a \oplus b) \oplus 1$.

For *commutativity*, set $x = a \oplus b$. Then $x \oplus b = a$ (by associativity and self-inverse), and $x \oplus a = b$, from which $b \oplus a = x = a \oplus b$. $\square$

More precisely, $(\mathbb{N}_0, \oplus)$ is an abelian group of exponent 2 — every element is its own inverse. It is isomorphic to a countably infinite direct sum of copies of $\mathbb{Z}/2\mathbb{Z}$.

### Example

$$
13 \oplus 12 \oplus 8 = 1101_b \oplus 1100_b \oplus 1000_b = 1001_b = 9
$$

And $4 \oplus 12 \oplus 8 = 0100_b \oplus 1100_b \oplus 1000_b = 0000_b = 0$, so the position $(4, 12, 8)$ has nim-sum zero.

---

## Bouton's Theorem

**Theorem** (Bouton, 1901). *A Nim position $(n_1, \ldots, n_k)$ is a P-position (previous player wins, i.e. the player who just moved) if and only if $n_1 \oplus \cdots \oplus n_k = 0$.*

Equivalently: the position is **losing** for the player about to move if and only if the nim-sum is zero.

The proof rests on two lemmas.

### Lemma 1: From nim-sum zero, every move makes it nonzero

**Proof.** Suppose $n_1 \oplus \cdots \oplus n_k = 0$. A move on heap $j$ replaces $n_j$ with some $n_j^* < n_j$. The nim-sum of the remaining heaps (excluding heap $j$) is $m = n_j$ (since $m \oplus n_j = 0$ implies $m = n_j$). The new nim-sum is $m \oplus n_j^* = n_j \oplus n_j^*$. Since $n_j^* \neq n_j$, we have $n_j \oplus n_j^* \neq 0$. $\square$

### Lemma 2: From nim-sum nonzero, there exists a move making it zero

**Proof.** Suppose $k = n_1 \oplus \cdots \oplus n_k \neq 0$. We need to find a heap $j$ and a target value $n_j^* = n_j \oplus k$ such that $n_j^* < n_j$.

**Key claim:** There exists $j$ such that $n_j \oplus k < n_j$.

Let $2^v$ be the highest power of 2 dividing into $k$ (i.e., $v$ is the index of the leading 1 in the binary representation of $k$). Since the $v$-th bit of $k$ is 1, and $k$ is the XOR of all $n_i$, an *odd* number of the $n_i$ must have a 1 in bit position $v$. Pick any such $n_j$.

Then $n_j \oplus k$ has a 0 in bit position $v$ (where $n_j$ has a 1), and all higher bits are unchanged. Therefore $n_j \oplus k < n_j$.

Setting $n_j^* = n_j \oplus k$, the new nim-sum becomes:

$$
n_1 \oplus \cdots \oplus n_j^* \oplus \cdots \oplus n_k = k \oplus n_j \oplus n_j^* = k \oplus n_j \oplus (n_j \oplus k) = 0 \quad \square
$$

### Example: Winning Move from $(1, 3, 5, 5)$

$$
k = 1 \oplus 3 \oplus 5 \oplus 5 = 001_b \oplus 011_b \oplus 101_b \oplus 101_b = 010_b = 2
$$

The leading bit of $k = 2$ is at position $v = 1$. Looking for a heap with a 1 at bit position 1: $n_2 = 3 = 011_b$ qualifies.

The winning move: reduce heap 2 from $n_2 = 3$ to $n_2^* = n_2 \oplus k = 011_b \oplus 010_b = 001_b = 1$. Remove 2 tokens from heap 2.

New position: $(1, 1, 5, 5)$ with nim-sum $1 \oplus 1 \oplus 5 \oplus 5 = 0$. The opponent is now in a losing position.

---

## Games as Directed Graphs

Any combinatorial game can be modeled as a **directed acyclic graph** (DAG) $\Gamma = (S, A)$ where:
- $S$ is the set of **positions** (vertices)
- $A \subseteq S \times S$ is the set of **legal moves** (directed edges)
- Terminal positions (no outgoing edges) correspond to the losing position for the player to move

The graph is acyclic because every game must terminate in finitely many moves.

**Successors.** For a vertex $x \in S$, the set $\text{Succ}(x) = \{y \in S \mid (x, y) \in A\}$ is the set of positions reachable in one move.

### The Kernel of a Graph

**Definition.** A *kernel* $K \subseteq S$ of a directed graph $(S, A)$ is a set of vertices that is simultaneously:
- **Stable:** no two vertices in $K$ are connected by an edge. Formally, $\forall x \in K, \ \text{Succ}(x) \cap K = \emptyset$.
- **Absorbing:** every vertex outside $K$ has at least one successor in $K$. Formally, $\forall x \notin K, \ \text{Succ}(x) \cap K \neq \emptyset$.

The kernel, when it exists, is exactly the set of **P-positions** (losing positions for the player to move). From a kernel position, any move leads outside the kernel; from outside the kernel, there's always a move back into it.

![Kernel examples](/images/cgt/kernel_examples.svg)

### Nim as a Graph

**Trivial Nim** (single heap of $n$ tokens): $S = \{0, \ldots, n\}$, $A = \{(x, y) \mid y < x\}$. The kernel is $K = \{0\}$ — take everything.

**Restricted Nim** (remove at most $p$ tokens per turn): $S = \{0, \ldots, n\}$, $A = \{(x, y) \mid x - p \leq y < x\}$. The kernel is $K = (p+1)\mathbb{N} \cap S$ — the multiples of $p+1$.

![Nim linear graph](/images/cgt/nim_linear_graph.svg)

### Sum of Games

**Definition.** Given two games $\Gamma_1 = (S_1, A_1)$ and $\Gamma_2 = (S_2, A_2)$, their *sum* $\Gamma_1 + \Gamma_2 = (S, A)$ is defined by:
- $S = S_1 \times S_2$
- From position $(x_1, x_2)$, a player may either move in $\Gamma_1$ (going to some $(y_1, x_2)$ with $y_1 \in \text{Succ}(x_1)$) or move in $\Gamma_2$ (going to $(x_1, y_2)$ with $y_2 \in \text{Succ}(x_2)$), but not both.

$$
\text{Succ}(x_1, x_2) = \bigl(\text{Succ}(x_1) \times \{x_2\}\bigr) \cup \bigl(\{x_1\} \times \text{Succ}(x_2)\bigr)
$$

![Successor in a sum](/images/cgt/successor_sum.svg)

Standard multi-heap Nim is precisely the sum of $k$ single-heap Nim games.

---

## The Sprague-Grundy Theorems

This is the core of the theory.

### The Mex and the Grundy Function

**Definition.** The *minimum excludant* (mex) of a set $S \subset \mathbb{N}_0$ is the smallest non-negative integer not in $S$:

$$
\text{mex}(S) = \min\{n \in \mathbb{N}_0 \mid n \notin S\}
$$

The term "mex" was coined by Conway [^4].

**Examples:** $\text{mex}\{\} = 0$, $\text{mex}\{1,2,3\} = 0$, $\text{mex}\{0,2,4\} = 1$, $\text{mex}\{0,1,\ldots,n\} = n+1$.

**Definition.** The *Sprague-Grundy function* (or *Grundy function*) $\gamma : S \to \mathbb{N}_0$ of a game graph $\Gamma = (S, A)$ is defined recursively:

$$
\gamma(x) = \text{mex}\bigl\{\gamma(y) \mid y \in \text{Succ}(x)\bigr\}
$$

For terminal positions (no successors), $\gamma(x) = \text{mex}(\emptyset) = 0$.

The value $\gamma(x)$ is also called the *Grundy number* or *nimber* of position $x$.

![Grundy values](/images/cgt/grundy_values.svg)

### Theorem I: Additivity of the Grundy Function

**Theorem** (Sprague-Grundy I). *Let $\Gamma = \Gamma_1 + \cdots + \Gamma_n$ be a sum of games. If $\gamma_i$ is the Grundy function of $\Gamma_i$, then the Grundy function of $\Gamma$ is:*

$$
\gamma(x_1, \ldots, x_n) = \gamma_1(x_1) \oplus \cdots \oplus \gamma_n(x_n)
$$

**Proof.** Let $(x_1, \ldots, x_n) \in S$ and set $b = \gamma_1(x_1) \oplus \cdots \oplus \gamma_n(x_n)$. We must show that $\gamma(x_1, \ldots, x_n) = b$, i.e., that $b = \text{mex}\{\gamma(y) \mid y \in \text{Succ}(x_1, \ldots, x_n)\}$.

**Part 1: For every $a < b$, there exists a successor with Grundy value $a$.**

Let $d = a \oplus b$. Since $a < b$, the leading bit of $d$ (say at position $v$) is a 1 where $b$ has a 1 and $a$ has a 0. Since $b = \gamma_1(x_1) \oplus \cdots \oplus \gamma_n(x_n)$, there exists some $i$ such that $\gamma_i(x_i)$ has a 1 at bit position $v$.

Then $\gamma_i(x_i) \oplus d < \gamma_i(x_i)$ (the bit at position $v$ flips from 1 to 0, and higher bits are unchanged). By the definition of the Grundy function, there exists $x_i^* \in \text{Succ}(x_i)$ with $\gamma_i(x_i^*) = \gamma_i(x_i) \oplus d$.

The successor $(x_1, \ldots, x_i^*, \ldots, x_n)$ has Grundy value:

$$
\gamma_i(x_i^*) \oplus \bigoplus_{j \neq i} \gamma_j(x_j) = (\gamma_i(x_i) \oplus d) \oplus \bigoplus_{j \neq i} \gamma_j(x_j) = b \oplus d = b \oplus (a \oplus b) = a
$$

**Part 2: No successor has Grundy value $b$.**

Suppose for contradiction that some successor $(x_1, \ldots, x_i^*, \ldots, x_n)$ has $\gamma_i(x_i^*) \oplus \bigoplus_{j \neq i} \gamma_j(x_j) = b = \gamma_1(x_1) \oplus \cdots \oplus \gamma_n(x_n)$. Then $\gamma_i(x_i^*) = \gamma_i(x_i)$. But $x_i^* \in \text{Succ}(x_i)$, and by definition of mex, no successor of $x_i$ can have the same Grundy value as $x_i$. Contradiction. $\square$

### Theorem II: Every Impartial Game is Equivalent to a Nim Heap

**Theorem** (Sprague-Grundy II). *Every impartial game $\Gamma$ is equivalent to a single Nim heap of size $\gamma(\Gamma)$:*

$$
\Gamma \sim \text{Nim}(\gamma(\Gamma))
$$

Here, $\Gamma \sim \Gamma'$ means that $\Gamma$ and $\Gamma'$ have the same outcome (P-position or N-position) when added to any other game.

**Proof.** We show two intermediate results:

**(i)** For any game $\Gamma$, the sum $\Gamma + \Gamma$ is a P-position.

This follows from the **mirror strategy**: whenever the opponent moves in one copy, respond with the identical move in the other copy. The opponent will always be the first player unable to move.

**(ii)** If $K$ is a P-position, then $\Gamma \sim \Gamma + K$.

Adding a P-position to any game preserves the outcome: a P-position contributes Grundy value 0, and $x \oplus 0 = x$.

Now, $\Gamma + \text{Nim}(\gamma(\Gamma))$ is a P-position because its Grundy value is $\gamma(\Gamma) \oplus \gamma(\Gamma) = 0$ (by Theorem I and the fact below that $\gamma(\text{Nim}(m)) = m$). Therefore:

$$
\Gamma \sim \Gamma + \underbrace{(\Gamma + \text{Nim}(\gamma(\Gamma)))}_{\text{P-position}} \sim \underbrace{(\Gamma + \Gamma)}_{\text{P-position}} + \text{Nim}(\gamma(\Gamma)) \sim \text{Nim}(\gamma(\Gamma)) \quad \square
$$

### Grundy Value of a Nim Heap

**Proposition.** *For a Nim heap of size $m$, $\gamma(m) = m$.*

**Proof** (by strong induction). Base case: $\gamma(0) = 0$ since the empty heap is terminal.

Inductive step: From a heap of size $m+1$, the reachable positions are heaps of size $0, 1, \ldots, m$. By the induction hypothesis, $\gamma(j) = j$ for all $j \leq m$. Therefore:

$$
\gamma(m+1) = \text{mex}\{0, 1, \ldots, m\} = m+1 \quad \square
$$

![Nim game tree](/images/cgt/nim_game_tree.svg)

This closes the loop: the Sprague-Grundy value of the sum $\text{Nim}(n_1) + \cdots + \text{Nim}(n_k)$ is $n_1 \oplus \cdots \oplus n_k$, recovering Bouton's theorem as a special case.

### The Kernel via Sprague-Grundy

The connection to graph kernels is now immediate. Define:

$$
K = \{x \in S \mid \gamma(x) = 0\}
$$

**Claim.** $K$ is a kernel of the game graph.

**Proof.** If $x \in K$, then $\gamma(x) = 0 = \text{mex}\{\gamma(y) \mid y \in \text{Succ}(x)\}$. This means $0 \notin \{\gamma(y) \mid y \in \text{Succ}(x)\}$, so every successor has $\gamma(y) \neq 0$, i.e., $\text{Succ}(x) \cap K = \emptyset$. Stable.

If $x \notin K$, then $\gamma(x) \neq 0$, so $0 \in \{\gamma(y) \mid y \in \text{Succ}(x)\}$ (since mex skipped 0 means 0 is present). Hence there exists $y \in \text{Succ}(x)$ with $\gamma(y) = 0$, i.e., $\text{Succ}(x) \cap K \neq \emptyset$. Absorbing. $\square$

---

## Winning Strategy in Practice

The Sprague-Grundy theory gives a concrete algorithm:

1. **Compute** $\gamma(x_i)$ for each component game
2. **XOR** all the values: $g = \gamma(x_1) \oplus \cdots \oplus \gamma(x_n)$
3. If $g = 0$: you are in a P-position (losing with perfect play). No winning move exists.
4. If $g \neq 0$: find component $i$ where $\gamma(x_i) \oplus g < \gamma(x_i)$, then move to reduce $\gamma(x_i)$ to $\gamma(x_i) \oplus g$.

For standard Nim, $\gamma(n_i) = n_i$, so the algorithm is $O(k \log m)$ where $k$ is the number of heaps and $m$ is the maximum heap size.

---

## Implementation

Here is a clean Python implementation of the Nim solver:

```python
"""Nim Game Solver — Sprague-Grundy strategy using XOR (nim-sum)."""

from functools import reduce
from operator import xor


def nim_sum(heaps: list[int]) -> int:
    """Compute the nim-sum (XOR of all heap sizes)."""
    return reduce(xor, heaps, 0)


def is_losing_position(heaps: list[int]) -> bool:
    """A position is losing (P-position) iff its nim-sum is zero."""
    return nim_sum(heaps) == 0


def find_winning_move(heaps: list[int]) -> tuple[int, int] | None:
    """Find an optimal move: return (heap_index, new_size) or None if losing.

    Strategy: find a heap j where heap[j] ^ nim_sum < heap[j],
    then reduce that heap to heap[j] ^ nim_sum.
    """
    s = nim_sum(heaps)
    if s == 0:
        return None  # no winning move exists
    for j, heap in enumerate(heaps):
        target = heap ^ s
        if target < heap:
            return (j, target)
    return None  # unreachable when s != 0


def describe_position(heaps: list[int]) -> str:
    """Summarize the game state and the optimal move, if any."""
    s = nim_sum(heaps)
    header = f"Heaps: {heaps}  |  Nim-sum: {s}"
    if s == 0:
        return f"{header}\n  → Losing position (P-position). No winning move."
    j, target = find_winning_move(heaps)  # type: ignore[misc]
    removed = heaps[j] - target
    return (
        f"{header}\n"
        f"  → Winning move: take {removed} from heap {j} "
        f"({heaps[j]} → {target})  →  {heaps[:j] + [target] + heaps[j+1:]}"
    )


# ── Demo ─────────────────────────────────────────────────────
if __name__ == "__main__":
    for position in [(1, 3, 5), (1, 3, 5, 5)]:
        print(describe_position(list(position)), end="\n\n")

# Heaps: [1, 3, 5]  |  Nim-sum: 7
#   → Winning move: take 5 from heap 2 (5 → 0)  →  [1, 3, 0]
#
# Heaps: [1, 3, 5, 5]  |  Nim-sum: 2
#   → Winning move: take 2 from heap 1 (3 → 1)  →  [1, 1, 5, 5]
```

---

## Closing Thoughts

The Sprague-Grundy theorem reduces every finite impartial game — no matter how complex its rules — to a single integer, and the analysis of a sum of such games to a single XOR. The theory is complete: it tells you exactly who wins and how.

A few threads worth pulling on, for the curious:

**Partizan games.** When the two players have *different* available moves (chess, Go, Hex), the theory extends to Conway's surreal numbers and partizan game values $G = \{G^L \mid G^R\}$. The algebra becomes much richer — and much harder [^4] [^5].

**Computational game theory.** Computing Grundy values is polynomial for most "nice" games, but determining the winner of arbitrary combinatorial games can be PSPACE-complete. See Roughgarden's *Twenty Lectures on Algorithmic Game Theory* [^7] for the complexity-theoretic perspective.

**Modern game search.** MCTS and AlphaZero-style approaches are in some sense the opposite of Sprague-Grundy: they don't compute exact values but learn approximate strategies through self-play. For impartial games, exact computation wins. For partizan games of practical size (Go, chess), approximation is the only option.

---

## References

[^1]: R. P. Sprague, "Uber mathematische Kampfspiele," *Tohoku Mathematical Journal*, 41, 438--444, 1935.

[^2]: P. M. Grundy, "Mathematics and Games," *Eureka* (Cambridge), 2, 6--8, 1939.

[^3]: C. L. Bouton, "Nim, A Game with a Complete Mathematical Theory," *Annals of Mathematics*, Second Series, 3(1/4), 35--39, 1901--1902.

[^4]: J. H. Conway, *On Numbers and Games*, London Mathematical Society Monographs No. 6, Academic Press, 1976. Second edition: A K Peters, 2001.

[^5]: E. R. Berlekamp, J. H. Conway, and R. K. Guy, *Winning Ways for Your Mathematical Plays*, Vols. 1--2, Academic Press, 1982.

[^6]: A. N. Siegel, *Combinatorial Game Theory*, Graduate Studies in Mathematics, Vol. 146, American Mathematical Society, 2013.

[^7]: T. S. Ferguson, *A Course in Game Theory*, World Scientific, 2020. Part I: Impartial Combinatorial Games. Freely available at [math.ucla.edu/~tom/](https://www.math.ucla.edu/~tom/gamescourse.html).

---

<details class="citation-block">
<summary>Cited as</summary>

> Laabsi, Zakaria. "Impartial Combinatorial Game Theory: From Nim to Sprague-Grundy." *zlaabsi.github.io*, Mar 2026.

```bibtex
@article{laabsi2026cgt,
  title   = {Impartial Combinatorial Game Theory: From Nim to Sprague-Grundy},
  author  = {Laabsi, Zakaria},
  journal = {zlaabsi.github.io},
  year    = {2026},
  month   = {Mar},
  url     = {https://zlaabsi.github.io/posts/combinatorial-game-theory/}
}
```

</details>
