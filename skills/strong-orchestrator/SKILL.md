---
name: strong-orchestrator
description: Strong orchestrator: delegate implementation to subagents, review every round, iterate until no major findings remain.
disable-model-invocation: true
---

# Strong Orchestrator

## Workflow

1. **Split** the request into vertical tasks, each shippable on its own.
   Done when: every task delivers user-visible value independently, and no
   two tasks need agents editing the same files at the same time.
2. **Implement** sequentially: one agent changes code at any moment;
   tasks touching disjoint files may run in parallel.
   Changed lines <= 15: edit inline. Anything larger: delegate (Target Models).
3. **Review** every delegated implementation in a dedicated review session.
   Done when: the reviewer returns findings, each tagged `major` or `minor`.
4. **Iterate**: send findings to the same implementer via `send_message`;
   keep it alive across rounds instead of spawning fresh agents per fix.
   Exit when a round returns zero `major` findings, then summarize what shipped.

Prefer a better-fitting orchestration when the case warrants one; sketch the
deviation briefly before running it.

## Target Models

All delegations use one call shape (verified against the live runtime
2026-08-27):

`workflow.agent(prompt, { provider: "zai", model: "zai/glm-5.3-flash" })`

## One-time setup: raise code-run ceilings

run_code workers default to 10 min wall clock / 60 s busy budget; long
orchestrations die with "wall-clock ceiling reached (600000ms)". Put in
~/.dsh/cordis.patch.yml (hot-reloads, applies to every profile):

    - id: code-runtime
      config:
        maxWallMs: 3600000
        computeMs: 300000   # awaiting tools accrues nothing

Verify: dsh --profile web --dump-config | grep -A4 code-runtime. Still dying
at exactly 10 min? Restart the harness server once. Cannot edit config? Run
long roles as background subagents with send_message continuation and say so
under the workflow-proposal rule.
