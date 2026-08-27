---
name: ponytail-debt
description: >
  Harvest every `ponytail:` comment in the codebase into a debt ledger, so
  deliberate shortcuts and deferrals get tracked. Use when the user says
  "ponytail debt", "/ponytail-debt", "what did ponytail defer", "list the
  shortcuts", "ponytail ledger", or "what did we mark to do later". One-shot
  report, changes nothing.
---

Grep the repo for `ponytail:` comment markers, skipping node_modules, .git, and
build output. Each hit is one ledger row grouped by file:

`<file>:<line>, <what was simplified>. ceiling: <named limit>. upgrade: <named trigger>.`

Flag markers with no upgrade path as `no-trigger`. End with
`<N> markers, <M> with no trigger.` Nothing found: `No ponytail: debt. Clean ledger.`

Reads and reports only. To persist it, ask first and write a ledger file.
