---
name: ponytail-audit
description: >
  Whole-repo audit for over-engineering. Like ponytail-review, but scans the
  entire codebase instead of a diff: a ranked list of what to delete,
  simplify, or replace with standard-library/native equivalents. Use when the
  user says "audit this codebase", "audit for over-engineering", "what can I
  delete from this repo", "find bloat", "ponytail-audit", or "/ponytail-audit".
  One-shot report, does not apply fixes.
---

Ponytail-review, repo-wide. Scan the whole tree instead of a diff. Rank
findings biggest cut first.

Tags: `delete:`, `stdlib:`, `native:`, `yagni:`, and `shrink:`.
Hunt dependencies the standard library or platform already ships, single-
implementation interfaces, factories with one product, delegating wrappers,
dead flags/config, and hand-rolled standard-library features.

Output one line per finding, ranked: `<tag> <what to cut>. <replacement>. [path]`.
End with `net: -<N> lines, -<M> deps possible.` Nothing to cut: `Lean already. Ship.`

Scope is over-engineering only. Lists findings and applies nothing. One-shot.
