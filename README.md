# dsh-suite

**The DeepSeek Harness productivity suite**: self-authored plugins + agent skills for [DSH](https://www.npmjs.com/package/@deepseek-ai/dsh), installable in one command.

## What's inside

| Piece | Type | What it does |
|---|---|---|
| [`dsh-model-router`](https://github.com/andrepontesmelo/dsh-model-router) | plugin | Virtual model ids routed over real provider/model candidates — priority failover, round-robin rotation, sleep windows |
| strong-orchestrator | skill | Sequential implement → review-loop orchestration with a persistent implementer |
| dex / dex-plan | skills | Task hierarchies: epics, subtasks, verification via the dex CLI |
| ponytail (+ audit, debt, gain, help, review) | skills | Lazy-senior-dev output style family: shortest working diff wins |

## Install

```bash
dsh plugin --profile <profile> add github:andrepontesmelo/dsh-suite
```

That single command installs this package, pulls the plugin dependencies (currently `dsh-model-router`), and registers the bundle patch — which points DSH skill discovery at the nine bundled skills. Restart the harness and every suite piece is live in that profile.

Plugin *configuration* (model-router routes, provider credentials) stays yours: add route rows to your profile's `cordis.patch.yml`.

## Companion pieces

Standalone siblings that don't ride in this bundle:

- [`archloop`](https://github.com/andrepontesmelo/archloop) — overnight architecture-improvement loop driver
- [`hkrc`](https://github.com/andrepontesmelo/hkrc) — Hermes Kanban blocker recovery controller

## Validate

```bash
npm test   # structural check: 9 skills present, valid names/frontmatter, bundle wiring intact
```

## License

MIT — © 2026 André Pontes Melo
