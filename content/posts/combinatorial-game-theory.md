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

> *This post is adapted from academic notes I wrote in 2020 during my BSc in Mathematics at the National University Institute Jean-François Champollion, supervised by Alain Berthomieu. The content is not recent — it reflects what I was studying six years ago. I'm publishing it here because the results are timeless, and I think the presentation holds up.*

## Introduction

Two players sit across from each other. There are several heaps of tokens on the table. On each turn, a player picks a heap and removes as many tokens as they want — at least one. The player who takes the last token wins. This is the game of **Nim**.

The remarkable fact is that this game — and indeed *every* impartial combinatorial game — admits a complete mathematical solution. The winning strategy reduces to a single operation: **XOR**.

The central result is the **Sprague-Grundy theorem**, proved independently by Roland Sprague (1935) [^1] and Patrick Michael Grundy (1939) [^2]. It states that every impartial game is equivalent to a Nim heap of a certain size. The size is computed recursively using the **Grundy function**, and the winning condition for a sum of games is determined by XOR-ing the Grundy values.

Charles L. Bouton had already solved Nim itself in 1901 [^3], but Sprague and Grundy generalized the result to *all* impartial games by connecting game positions to directed acyclic graphs. John Conway later unified the theory in *On Numbers and Games* (1976) [^4], introducing surreal numbers and the formal framework that Berlekamp, Conway, and Guy expanded in *Winning Ways* (1982) [^5].

This post walks through the full path: Nim, the nim-sum, Bouton's theorem, games as graphs, and the two Sprague-Grundy theorems — with complete proofs.

---

## Combinatorial Games: Formal Setup

Before diving into Nim, we define precisely the class of games under study.

**Definition.** A *combinatorial game* is a game satisfying all of the following:

1. **Two players** alternate turns.
2. The game has a **finite set of positions** and a designated **starting position**.
3. The rules define, for each position, the set of positions reachable in one move (the **options**).
4. Both players have **complete information** — the full game state is visible to both.
5. There is **no randomness** (no dice, no card draws).
6. The game must **terminate** in finitely many moves (the *ending condition*).
7. Under the **normal play convention**, the player who cannot move **loses**.

A combinatorial game is called **impartial** if both players have exactly the same moves available from any position. Games like Nim are impartial. Games like Chess or Go, where each player has different pieces, are *partizan* — these fall outside our scope.

### $\mathcal{P}$-positions and $\mathcal{N}$-positions

Every position in a combinatorial game belongs to exactly one of two classes:

- A **$\mathcal{P}$-position** (*previous player wins*): the player who just moved is winning. Equivalently, the player *to move* is losing with perfect play.
- An **$\mathcal{N}$-position** (*next player wins*): the player to move has a winning strategy.

These classes are characterized recursively:
- All terminal positions are $\mathcal{P}$-positions (the player to move loses because they cannot move).
- A position is an $\mathcal{N}$-position if it has at least one option that is a $\mathcal{P}$-position.
- A position is a $\mathcal{P}$-position if all of its options are $\mathcal{N}$-positions.

The entire theory that follows is about computing which class a position belongs to — efficiently.

![Recursive classification of P and N positions](/images/cgt/formal_setup.svg)

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

**Example.** The position $(1, 3, 5)$. First, decompose each heap size as a sum of powers of 2:

$$
1 = 0 \cdot 2^2 + 0 \cdot 2^1 + 1 \cdot 2^0, \quad 3 = 0 \cdot 2^2 + 1 \cdot 2^1 + 1 \cdot 2^0, \quad 5 = 1 \cdot 2^2 + 0 \cdot 2^1 + 1 \cdot 2^0
$$

Arranging as a matrix with columns indexed by powers of 2:

$$
\begin{pmatrix} 1 \\ 3 \\ 5 \end{pmatrix} = \begin{pmatrix} 0 & 0 & 1 \\ 0 & 1 & 1 \\ 1 & 0 & 1 \end{pmatrix}_{\!2}
$$

Now compute the column-wise XOR (sum mod 2):
- Column $2^2$: $0 + 0 + 1 \equiv 1 \pmod{2}$
- Column $2^1$: $0 + 1 + 0 \equiv 1 \pmod{2}$
- Column $2^0$: $1 + 1 + 1 \equiv 1 \pmod{2}$

The result is $111_2 = 7 \neq 0$.

![Binary matrix](/images/cgt/binary_matrix.svg)

The column-wise sum modulo 2 of this matrix turns out to determine who wins. That operation is the **nim-sum**.

### Example: Playing Out a Nim Game

Starting from $(1, 3, 5)$, the nim-sum is $1 \oplus 3 \oplus 5 = 7 \neq 0$, so **Player 1 (P1) has a winning strategy**.

**Move 1 (P1).** P1 must restore the nim-sum to 0. One option: reduce heap 3 from 5 to 2. New position: $(1, 3, 2)$.
- Check: $1 \oplus 3 \oplus 2 = 001_2 \oplus 011_2 \oplus 010_2 = 000_2 = 0$. $\checkmark$

**Move 2 (P2).** Any move from a $\mathcal{P}$-position breaks the zero nim-sum. Suppose P2 reduces heap 2 from 3 to 2. New position: $(1, 2, 2)$.
- Check: $1 \oplus 2 \oplus 2 = 001_2 \oplus 010_2 \oplus 010_2 = 001_2 = 1 \neq 0$. P1 is back in an $\mathcal{N}$-position.

**Move 3 (P1).** Restore zero: reduce heap 1 from 1 to 0. New position: $(0, 2, 2)$.
- Check: $0 \oplus 2 \oplus 2 = 0$. $\checkmark$

**Move 4 (P2).** P2 must move — say, reduce heap 2 from 2 to 1. New position: $(0, 1, 2)$.
- Check: $0 \oplus 1 \oplus 2 = 3 \neq 0$.

**Move 5 (P1).** Reduce heap 3 from 2 to 1: $(0, 1, 1)$, nim-sum $= 0$. $\checkmark$

**Move 6 (P2).** Forced: remove heap 2: $(0, 0, 1)$, nim-sum $= 1$.

**Move 7 (P1).** Take the last token: $(0, 0, 0)$. P1 wins.

The pattern is clear: P1 always restores nim-sum to 0, and P2 is forced to break it.

![Nim gameplay steps](/images/cgt/nim_gameplay_steps.svg)

{{< anim-svg src="images/cgt/nim_animation.svg" caption="Animated: Playing out a Nim game from (1,3,5) — the binary matrix and nim-sum update after each move" >}}

---

## The Nim-Sum

**Definition.** The *nim-sum* (or *binary addition modulo 2*) of two non-negative integers $a$ and $b$, written $a \oplus b$, is defined by summing their binary representations digit by digit modulo 2:

$$
(a_m \ldots a_1 a_0)_2 \oplus (b_m \ldots b_1 b_0)_2 = (c_m \ldots c_1 c_0)_2, \quad c_j = (a_j + b_j) \bmod 2
$$

This is exactly the XOR operation from Boolean algebra.

### Algebraic Properties

The pair $(\mathbb{N}, \oplus)$ forms an **abelian group**:

- $0$ is the **identity element**: $\forall a \in \mathbb{N}, \; a \oplus 0 = a$
- **Self-inverse:** $\forall a \in \mathbb{N}, \; a \oplus a = 0$
- **Commutativity:** $\forall (a,b) \in \mathbb{N}^2, \; a \oplus b = b \oplus a$
- **Associativity:** $\forall (a,b,c) \in \mathbb{N}^3, \; (a \oplus b) \oplus c = a \oplus (b \oplus c)$

*Proof sketch.* Since the nim-sum operates **independently on each binary digit**, it suffices to verify each property at the bit level for $a, b, c \in \{0,1\}$ — the result then extends to all of $\mathbb{N}$ componentwise.

The identity and self-inverse properties follow from the definition: XOR-ing with 0 changes nothing, and $x + x \equiv 0 \pmod{2}$ for $x \in \{0,1\}$.

For *associativity*, verify at the bit level: when $c = 0$, both sides reduce to $a \oplus b$; when $c = 1$, we use $b \oplus 1 = \lnot b$ and $a \oplus \lnot b = \lnot(a \oplus b)$, so both sides equal $(a \oplus b) \oplus 1$.

For *commutativity*, set $x = a \oplus b$. Then $x \oplus b = a$ (by associativity and self-inverse), and $x \oplus a = b$, from which $b \oplus a = x = a \oplus b$. $\square$

More precisely, $(\mathbb{N}, \oplus)$ is an abelian group of exponent 2 — every element is its own inverse. It is isomorphic to a countably infinite direct sum of copies of $\mathbb{Z}/2\mathbb{Z}$.

### XOR at the Bit Level

At the single-bit level, the nim-sum is the XOR truth table:

| $a$ | $b$ | $a \oplus b$ |
|:---:|:---:|:---:|
| 0 | 0 | 0 |
| 0 | 1 | 1 |
| 1 | 0 | 1 |
| 1 | 1 | 0 |

**Worked computation of $1 \oplus 3 \oplus 5$:**

| | $2^2$ | $2^1$ | $2^0$ |
|:---|:---:|:---:|:---:|
| $1$ | 0 | 0 | 1 |
| $3$ | 0 | 1 | 1 |
| Column XOR so far | 0 | 1 | 0 |
| $5$ | 1 | 0 | 1 |
| **Final XOR** | **1** | **1** | **1** |

Reading the result: $111_2 = 7$. Therefore $1 \oplus 3 \oplus 5 = 7 \neq 0$, confirming that $(1, 3, 5)$ is an $\mathcal{N}$-position.

### Example

$$
13 \oplus 12 \oplus 8 = 1101_2 \oplus 1100_2 \oplus 1000_2 = 1001_2 = 9
$$

And $4 \oplus 12 \oplus 8 = 0100_2 \oplus 1100_2 \oplus 1000_2 = 0000_2 = 0$, so the position $(4, 12, 8)$ has nim-sum zero.

---

## Bouton's Theorem

**Theorem** (Bouton, 1901). *A position $(n_1, \ldots, n_l)$ in the game of Nim is a $\mathcal{P}$-position (losing for the player to move) if and only if $n_1 \oplus \cdots \oplus n_l = 0$.*

The proof rests on two lemmas.

### Lemma 1: From nim-sum zero, every move makes it nonzero

**Proof.** Let $(n_1, \ldots, n_l)$ be a Nim position with $n_1 \oplus \cdots \oplus n_l = 0$. Suppose a player moves on heap $j$ (where $1 \leq j \leq l$), replacing $n_j$ by some $n^* < n_j$.

The nim-sum $m$ of all heaps except heap $j$ satisfies $m \oplus n_j = n_1 \oplus \cdots \oplus n_l = 0$, hence $m = n_j$. The nim-sum of the new position is therefore $m \oplus n^* = n_j \oplus n^*$. Since $n^* \neq n_j$, we have $n_j \oplus n^* \neq 0$. $\square$

### Lemma 2: From nim-sum nonzero, there exists a move making it zero

**Proof.** Let $(n_1, \ldots, n_l)$ be a Nim position with $n_1 \oplus \cdots \oplus n_l = k \neq 0$. A move on heap $j$ replaces $n_j$ by $n^*$ where $n^* < n_j$. The nim-sum $m$ of all heaps except heap $j$ satisfies $m = n_j \oplus k$. The new nim-sum is:

$$
m \oplus n^* = n_j \oplus n^* \oplus k
$$

We seek $n_j \oplus n^* \oplus k = 0$, i.e. $n^* = n_j \oplus k$. It remains to show that $n^* < n_j$ for a suitable choice of $j$.

**Claim:** $\exists \, j$ such that $n_j \oplus k < n_j$.

Let $2^v$ be the largest power of $2 \leq k$, i.e. $v$ is the index of the leading 1 in the binary representation of $k$. Since the $v$-th bit of $k$ equals 1, and $k = n_1 \oplus \cdots \oplus n_l$, an odd number of the $n_i$ have a 1 at bit position $v$. Let $n_j$ be one of them.

Then $n_j \oplus k$ has a 0 at position $v$ (where $n_j$ has a 1) and all higher bits are unchanged. Therefore $n_j \oplus k < n_j$. $\square$

### Example: Winning Move from (1, 3, 5, 5)

Let us apply Lemma 2 step by step to the position $(1, 3, 5, 5)$.

**Step 1.** Compute the nim-sum:

$$
k = 1 \oplus 3 \oplus 5 \oplus 5 = 001_2 \oplus 011_2 \oplus 101_2 \oplus 101_2 = 010_2 = 2
$$

Since $k = 2 \neq 0$, this is an $\mathcal{N}$-position. A winning move exists.

**Step 2.** Find the leading bit of $k = 2 = 010_2$. The leading 1 is at position $v = 1$.

**Step 3.** Find a heap with a 1 at bit position $v = 1$:
- $n_1 = 1 = 001_2$ — bit 1 is 0
- $n_2 = 3 = 011_2$ — bit 1 is **1** $\checkmark$
- $n_3 = 5 = 101_2$ — bit 1 is 0
- $n_4 = 5 = 101_2$ — bit 1 is 0

Choose heap 2.

**Step 4.** Compute the new heap size: $n_2^* = n_2 \oplus k = 011_2 \oplus 010_2 = 001_2 = 1$. Since $1 < 3$, this is a valid move: remove $3 - 1 = 2$ tokens from heap 2.

**Step 5.** Verify: the new position is $(1, 1, 5, 5)$ with nim-sum $1 \oplus 1 \oplus 5 \oplus 5 = 0$. The opponent is now in a $\mathcal{P}$-position — losing with perfect play.

![Winning move strategy](/images/cgt/winning_move_strategy.svg)

---

## Games as Directed Graphs

**Definition.** A *game graph* is a triple $\varGamma = (V, A, v_0)$ where:
- $V$ is a finite set of **positions** (vertices)
- $A \subseteq V \times V$ is the set of **legal moves** (directed edges)
- $v_0 \in V$ is the **starting position**
- Terminal positions (no outgoing edges) correspond to the losing position for the player to move (normal play convention)

The graph is **acyclic**: every game must terminate in finitely many moves. This is guaranteed by the existence of a *well-founded ordering* — a function $\mu : V \to \mathbb{N}$ such that $(x, y) \in A$ implies $\mu(y) < \mu(x)$. In Nim, for example, $\mu(n_1, \ldots, n_k) = n_1 + \cdots + n_k$ (the total number of tokens strictly decreases on every move).

When the starting position is understood from context, we write simply $\varGamma = (V, A)$.

**Successors.** For a vertex $x \in V$, the set of successors is $\operatorname{Succ}(x) = \{y \in V \mid (x, y) \in A\}$.

**Example.** The full game graph of Nim(1,1,3). Each node is a position vector $(n_1, n_2, n_3)$ — the colored digits correspond to the three heaps. Positions with nim-sum $= 0$ are $\mathcal{P}$-positions (only $(1,1,0)$ and $(0,0,0)$); all others are $\mathcal{N}$-positions. Note how equivalent games (e.g. removing heap 1 or heap 2 from $(1,1,3)$) lead to the same multiset of heaps.

![Game graph of Nim(1,1,3)](/images/cgt/nim_game_graph.svg)

### The Kernel of a Graph

**Definition.** A *kernel* $K \subseteq V$ of a directed graph $(V, A)$ is a set of vertices that is simultaneously:
- **Stable:** $\forall x \in K, \; \operatorname{Succ}(x) \cap K = \emptyset$ (no arc between vertices of $K$)
- **Absorbing:** $\forall x \notin K, \; \operatorname{Succ}(x) \cap K \neq \emptyset$ (every vertex outside $K$ has a successor in $K$)

The kernel, when it exists, is exactly the set of $\mathcal{P}$**-positions** (losing positions for the player to move). From a kernel position, any move leads outside the kernel; from outside the kernel, there's always a move back into it.

![Kernel examples](/images/cgt/kernel_examples.svg)

<details style="font-size: 0.85rem; color: var(--theme-text-secondary); margin-top: -0.5rem; margin-bottom: 1.5rem; text-align: center;">
<summary style="cursor: pointer; font-weight: 700; font-size: 1rem;">Verification of each example</summary>

<div style="text-align: center; margin-top: 0.75rem;">

**(a)** $S=\{1,6\}$, arcs $1{\to}2, 2{\to}5, 3{\to}6, 4{\to}1, 5{\to}4, 6{\to}5$

Stable: $\text{succ}(1)=\{2\}$, $\text{succ}(6)=\{5\}$ — none in $S$ ✓

Not absorbing: $\text{succ}(2)=\{5\}$, $\text{succ}(5)=\{4\}$ — neither 2 nor 5 can reach $S$ ✗

**(b)** $S=\{1,2,3\}$, arcs $1{\to}2, 4{\to}1, 4{\to}5, 5{\to}3, 6{\to}2$

Absorbing: $\text{succ}(4)\cap S=\{1\}$, $\text{succ}(5)\cap S=\{3\}$, $\text{succ}(6)\cap S=\{2\}$ ✓

Not stable: arc $1{\to}2$ between vertices of $S$ ✗

**(c)** $K=\{2,6\}$, arcs $1{\to}2, 1{\to}4, 3{\to}5, 3{\to}6, 4{\to}2, 5{\to}6$

Stable: $\text{succ}(2)=\emptyset$, $\text{succ}(6)=\emptyset$ — no arc between vertices of $K$ ✓

Absorbing: $1{\to}2$, $3{\to}6$, $4{\to}2$, $5{\to}6$ ✓ → **Kernel** ✓

**(d)** $K=\{3,6\}$, arcs $1{\to}3, 1{\to}5, 2{\to}3, 2{\to}4, 4{\to}6, 5{\to}6$

Stable: $\text{succ}(3)=\emptyset$, $\text{succ}(6)=\emptyset$ ✓

Absorbing: $1{\to}3$, $2{\to}3$, $4{\to}6$, $5{\to}6$ ✓ → **Kernel** ✓

</div>
</details>

### Nim as a Graph

**Trivial Nim** (single heap of $n$ tokens): $S = \{0, \ldots, n\}$, $A = \{(x, y) \mid y < x\}$. The kernel is $K = \{0\}$ — take everything.

**Restricted Nim** (remove at most $p$ tokens per turn): $S = \{0, \ldots, n\}$, $A = \{(x, y) \mid x - p \leq y < x\}$. The kernel is $K = (p+1)\mathbb{N} \cap S$ — the multiples of $p+1$.

**Proposition.** *In Restricted Nim with parameter $p$, the Grundy value is $\gamma(n) = n \bmod (p+1)$.*

**Proof** (by strong induction). Base case: $\gamma(0) = 0$ since the empty heap is terminal, and $0 \bmod (p+1) = 0$.

Inductive step: From a heap of size $n$, the reachable positions are $\{n-1, n-2, \ldots, n-p\}$ (or $\{0, \ldots, n-1\}$ if $n \leq p$). By the induction hypothesis, their Grundy values are $\{(n-1) \bmod (p+1), \ldots, (n-p) \bmod (p+1)\}$.

If $n \bmod (p+1) = r$, the successors' Grundy values cover $\{0, 1, \ldots, p\} \setminus \{r\}$ when $r \leq p$, so $\operatorname{mex} = r = n \bmod (p+1)$. $\square$

**Example** ($p = 2$): $\gamma(0) = 0$, $\gamma(1) = 1$, $\gamma(2) = 2$, $\gamma(3) = 0$, $\gamma(4) = 1$, $\gamma(5) = 2$, $\gamma(6) = 0, \ldots$ The $\mathcal{P}$-positions are the multiples of 3.

![Nim linear graph](/images/cgt/nim_linear_graph.svg)

### Sum of Games

**Definition.** Given two games $\varGamma_1 = (V_1, A_1)$ and $\varGamma_2 = (V_2, A_2)$, their *sum* $\varGamma_1 + \varGamma_2 = (V, A)$ is defined by:
- $V = V_1 \times V_2$
- From position $(x_1, x_2)$, a player may either move in $\varGamma_1$ (going to some $(y_1, x_2)$ with $y_1 \in \operatorname{Succ}(x_1)$) or move in $\varGamma_2$ (going to $(x_1, y_2)$ with $y_2 \in \operatorname{Succ}(x_2)$), but not both.

$$
\operatorname{Succ}(x_1, x_2) = \bigl(\operatorname{Succ}(x_1) \times \{x_2\}\bigr) \cup \bigl(\{x_1\} \times \operatorname{Succ}(x_2)\bigr)
$$

![Successor in a sum](/images/cgt/successor_sum.svg)

Standard multi-heap Nim is precisely the sum of $k$ single-heap Nim games.

---

## The Sprague-Grundy Theorems

This is the core of the theory.

### The Mex and the Grundy Function

**Definition.** The *minimum excludant* (mex) of a set $T \subset \mathbb{N}$ is the smallest non-negative integer not in $T$:

$$
\operatorname{mex}(T) = \min\{n \in \mathbb{N} \mid n \notin T\}
$$

The term "mex" was coined by Conway [^4].

**Examples:** $\operatorname{mex}\{\} = 0$, $\; \operatorname{mex}\{1,2,3\} = 0$, $\; \operatorname{mex}\{0,2,4\} = 1$, $\; \operatorname{mex}\{0,1,\ldots,n\} = n+1$.

**Definition.** Let $\varGamma = (V, A)$ be a game graph. The *Sprague-Grundy function* $\gamma : V \to \mathbb{N}$ is defined recursively:

$$
\gamma(x) = \operatorname{mex}\bigl\{\gamma(y) \mid y \in \operatorname{Succ}(x)\bigr\}
$$

For terminal positions (no successors), $\gamma(x) = \operatorname{mex}(\emptyset) = 0$.

The value $\gamma(x)$ is also called the *Grundy number* or *nimber* of position $x$.

![Grundy values](/images/cgt/grundy_values.svg)

### Computing Grundy Values: A Worked Example

Consider a small game graph with 6 nodes $\{0, 1, 2, 3, 4, 5\}$ and edges:

$$
1 \to 0, \quad 2 \to 0, \quad 3 \to 1, \quad 3 \to 2, \quad 4 \to 1, \quad 4 \to 3, \quad 5 \to 0, \quad 5 \to 4
$$

We compute $\gamma$ bottom-up, starting from terminal nodes:

1. **Node 0** (terminal): $\operatorname{Succ}(0) = \emptyset$, so $\gamma(0) = \operatorname{mex}(\emptyset) = 0$
2. **Node 1**: $\operatorname{Succ}(1) = \{0\}$, so $\gamma(1) = \operatorname{mex}\{\gamma(0)\} = \operatorname{mex}\{0\} = 1$
3. **Node 2**: $\operatorname{Succ}(2) = \{0\}$, so $\gamma(2) = \operatorname{mex}\{\gamma(0)\} = \operatorname{mex}\{0\} = 1$
4. **Node 3**: $\operatorname{Succ}(3) = \{1, 2\}$, so $\gamma(3) = \operatorname{mex}\{\gamma(1), \gamma(2)\} = \operatorname{mex}\{1, 1\} = \operatorname{mex}\{1\} = 0$
5. **Node 4**: $\operatorname{Succ}(4) = \{1, 3\}$, so $\gamma(4) = \operatorname{mex}\{\gamma(1), \gamma(3)\} = \operatorname{mex}\{1, 0\} = 2$
6. **Node 5**: $\operatorname{Succ}(5) = \{0, 4\}$, so $\gamma(5) = \operatorname{mex}\{\gamma(0), \gamma(4)\} = \operatorname{mex}\{0, 2\} = 1$

![Grundy computation](/images/cgt/grundy_computation.svg)

The $\mathcal{P}$-positions (losing for the player to move) are exactly the nodes with $\gamma = 0$: nodes 0 and 3. From node 3, both successors (1 and 2) have $\gamma \neq 0$ — the player to move at node 3 cannot win.

### Theorem I: Additivity of the Grundy Function

**Theorem** (Sprague-Grundy I). *Let $\varGamma = \varGamma_1 + \cdots + \varGamma_n$ be a sum of games. If $\gamma_i$ is the Sprague-Grundy function of $\varGamma_i$, then the Sprague-Grundy function of $\varGamma$ is:*

$$
\gamma(x_1, \ldots, x_n) = \gamma_1(x_1) \oplus \cdots \oplus \gamma_n(x_n)
$$

**Proof.** Let $(x_1, \ldots, x_n) \in V$ and set $b = \gamma_1(x_1) \oplus \cdots \oplus \gamma_n(x_n)$. We must show that $\gamma(x_1, \ldots, x_n) = b$, i.e., that $b = \operatorname{mex}\{\gamma(y) \mid y \in \operatorname{Succ}(x_1, \ldots, x_n)\}$.

**Part 1: For every $a < b$, there exists a successor with Grundy value $a$.**

Let $d = a \oplus b$. Since $a \neq b$, we have $d \neq 0$. Let $v$ be the position of the leading 1 in $d$ — this is the highest bit position where $a$ and $b$ differ. Since $a < b$ and all bits above position $v$ are the same in $a$ and $b$, the bit at position $v$ must be 1 in $b$ and 0 in $a$ (otherwise we would have $a > b$). Since $b = \gamma_1(x_1) \oplus \cdots \oplus \gamma_n(x_n)$ has a 1 at bit position $v$, and XOR is a bitwise sum mod 2, there exists some $i$ such that $\gamma_i(x_i)$ has a 1 at bit position $v$.

Then $\gamma_i(x_i) \oplus d < \gamma_i(x_i)$ (the bit at position $v$ flips from 1 to 0, and higher bits are unchanged). By the definition of the Grundy function, there exists $x_i^* \in \operatorname{Succ}(x_i)$ with $\gamma_i(x_i^*) = \gamma_i(x_i) \oplus d$.

The successor $(x_1, \ldots, x_i^*, \ldots, x_n)$ has Grundy value:

$$
\gamma_i(x_i^*) \oplus \bigoplus_{j \neq i} \gamma_j(x_j) = (\gamma_i(x_i) \oplus d) \oplus \bigoplus_{j \neq i} \gamma_j(x_j) = b \oplus d = b \oplus (a \oplus b) = a
$$

**Part 2: No successor has Grundy value $b$.**

Suppose for contradiction that some successor $(x_1, \ldots, x_i^*, \ldots, x_n)$ has $\gamma_i(x_i^*) \oplus \bigoplus_{j \neq i} \gamma_j(x_j) = b = \gamma_1(x_1) \oplus \cdots \oplus \gamma_n(x_n)$. Then $\gamma_i(x_i^*) = \gamma_i(x_i)$. But $x_i^* \in \operatorname{Succ}(x_i)$, and by definition of mex, no successor of $x_i$ can have the same Grundy value as $x_i$. Contradiction. $\square$

### Theorem II: Every Impartial Game is Equivalent to a Nim Heap

**Theorem** (Sprague-Grundy II). *Every impartial game $\varGamma$ is equivalent to a single Nim heap of size $\gamma(\varGamma)$:*

$$
\varGamma \sim \operatorname{Nim}(\gamma(\varGamma))
$$

Here, $\varGamma \sim \varGamma'$ means that $\varGamma$ and $\varGamma'$ have the same outcome ($\mathcal{P}$-position or $\mathcal{N}$-position) when added to any other game.

**Proof.** We show two intermediate results:

**(i)** For any game $\varGamma$, the sum $\varGamma + \varGamma$ is a $\mathcal{P}$-position.

This follows from the **mirror strategy**: whenever the opponent moves in one copy, respond with the identical move in the other copy.

More precisely: consider the game $\varGamma + \varGamma$ played on two identical copies. The second player's strategy is as follows — whenever the first player makes a move $x \to y$ in copy $i$, the second player responds with the same move $x \to y$ in copy $j \neq i$. This is always legal because the two copies are in identical states before the first player's turn.

Since the game is finite and every move strictly reduces the number of available positions, the first player will eventually be unable to move in both copies simultaneously. The second player, having always mirrored, will make the last move. Therefore $\varGamma + \varGamma$ is a $\mathcal{P}$-position — the first player loses.

**(ii)** If $K$ is a $\mathcal{P}$-position, then $\varGamma \sim \varGamma + K$.

By Theorem I, the Grundy value of a sum is the XOR of the components' Grundy values. Since $K$ is a $\mathcal{P}$-position, $\gamma(K) = 0$, so $\gamma(\varGamma + K) = \gamma(\varGamma) \oplus 0 = \gamma(\varGamma)$. The Grundy value — and therefore the $\mathcal{P}/\mathcal{N}$ classification — is unchanged.

Now, $\varGamma + \operatorname{Nim}(\gamma(\varGamma))$ is a $\mathcal{P}$-position because its Grundy value is $\gamma(\varGamma) \oplus \gamma(\varGamma) = 0$ (by Theorem I and the fact below that $\gamma(\operatorname{Nim}(m)) = m$). Therefore, using the associativity of the game sum (which holds because the canonical bijection $(S_1 \times S_2) \times S_3 \cong S_1 \times (S_2 \times S_3)$ preserves the successor structure) and (ii):

$$
\varGamma \sim \varGamma + \underbrace{\bigl(\varGamma + \operatorname{Nim}(\gamma(\varGamma))\bigr)}_{\mathcal{P}\text{-position}} \sim \underbrace{(\varGamma + \varGamma)}_{\mathcal{P}\text{-position}} + \operatorname{Nim}(\gamma(\varGamma)) \sim \operatorname{Nim}(\gamma(\varGamma)) \quad \square
$$

### Grundy Value of a Nim Heap

**Proposition.** *For a Nim heap of size $m$, $\gamma(m) = m$.*

**Proof** (by strong induction). Base case: $\gamma(0) = 0$ since the empty heap is terminal.

Inductive step: From a heap of size $m+1$, the reachable positions are heaps of size $0, 1, \ldots, m$. By the induction hypothesis, $\gamma(j) = j$ for all $j \leq m$. Therefore:

$$
\gamma(m+1) = \operatorname{mex}\{0, 1, \ldots, m\} = m+1 \quad \square
$$

![Nim game tree](/images/cgt/nim_game_tree.svg)

This closes the loop: the Sprague-Grundy value of the sum $\operatorname{Nim}(n_1) + \cdots + \operatorname{Nim}(n_k)$ is $n_1 \oplus \cdots \oplus n_k$, recovering Bouton's theorem as a special case.

### The Kernel via Sprague-Grundy

The connection to graph kernels is now immediate. Define:

$$
K = \{x \in V \mid \gamma(x) = 0\}
$$

**Claim.** $K$ is a kernel of the game graph.

**Proof.** If $x \in K$, then $\gamma(x) = 0 = \operatorname{mex}\{\gamma(y) \mid y \in \operatorname{Succ}(x)\}$. This means $0 \notin \{\gamma(y) \mid y \in \operatorname{Succ}(x)\}$, so every successor has $\gamma(y) \neq 0$, i.e., $\operatorname{Succ}(x) \cap K = \emptyset$. Stable.

If $x \notin K$, then $\gamma(x) \neq 0$, so $0 \in \{\gamma(y) \mid y \in \operatorname{Succ}(x)\}$ (since mex skipped 0 means 0 is present). Hence there exists $y \in \operatorname{Succ}(x)$ with $\gamma(y) = 0$, i.e., $\operatorname{Succ}(x) \cap K \neq \emptyset$. Absorbing. $\square$

---

## Winning Strategy in Practice

The Sprague-Grundy theory gives a concrete algorithm:

1. **Compute** $\gamma(x_i)$ for each component game
2. **XOR** all the values: $g = \gamma(x_1) \oplus \cdots \oplus \gamma(x_n)$
3. If $g = 0$: you are in a $\mathcal{P}$-position (losing with perfect play). No winning move exists.
4. If $g \neq 0$: find component $i$ where $\gamma(x_i) \oplus g < \gamma(x_i)$, then move to reduce $\gamma(x_i)$ to $\gamma(x_i) \oplus g$.

For standard Nim, $\gamma(n_i) = n_i$, so the algorithm is $O(k \log m)$ where $k$ is the number of heaps and $m$ is the maximum heap size.

---

## Implementation

### Pseudocode: Grundy Value Computation

The Grundy function can be computed recursively with memoization. Given a game graph $(V, A)$, the following algorithm computes $\gamma(x)$ for any position $x$:

```
function GRUNDY(x, memo):
    if x in memo:
        return memo[x]
    reachable ← {}
    for each y in Succ(x):
        reachable ← reachable ∪ { GRUNDY(y, memo) }
    memo[x] ← mex(reachable)
    return memo[x]

function MEX(S):
    i ← 0
    while i in S:
        i ← i + 1
    return i
```

**Complexity.** Each position is visited once and each edge traversed once, giving $O(|S| + |A|)$ time. The mex computation over the successor set is $O(\max \gamma)$ in the worst case, but for games where the maximum Grundy value is bounded by the out-degree, this is absorbed into the edge traversal cost.

### Python: Nim Solver

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
