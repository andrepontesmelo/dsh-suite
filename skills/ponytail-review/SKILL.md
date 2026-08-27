---
name: ponytail-review
description: >
  Code review focused exclusively on over-engineering. Finds what to delete:
  reinvented standard library, unneeded dependencies, speculative abstractions,
  dead flexibility. One line per finding: location, what to cut, what replaces
  it. Use when the user says "review for over-engineering", "what can we
  delete", "is this over-engineered", "simplify review", or invokes
  /ponytail-review. Complements correctness-focused review; this one only hunts
  complexity.
---

Review diffs for unnecessary complexity. One line per finding: location, what
to cut, what replaces it. The diff's best outcome is getting shorter.

## Format

`L<line>: <tag> <what>. <replacement>.`, or `<file>:L<line>: ...` for multi-file diffs.

Tags: `delete:` dead code; `stdlib:` hand-rolled standard-library feature;
`native:` platform feature replacing dependency/code; `yagni:` one-implementation
abstraction/config/layer; `shrink:` same logic in fewer lines.

End with the only metric that matters: `net: -<N> lines possible.` If nothing
can be cut, say `Lean already. Ship.` and stop.

Scope is over-engineering only. Correctness, security, and performance are out
of scope. Does not apply fixes. A single smoke test or assert self-check is the
minimum, not bloat.
