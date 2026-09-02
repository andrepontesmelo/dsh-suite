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

## Delegation Transport

Two dispatch tools. `subagent`: in-process child agent, tracked via
`list_agents`, stoppable via `interrupt_agent`. `wayfinder_spawn_session`:
a new top-level session, outside that tree, isolated — per-task failures
aren't fatal to the caller. Applies once Workflow step 2 says delegate
(>15 changed lines); it doesn't change that threshold.

1. **Default to `wayfinder_spawn_session`.** 2026-09-01: three `subagent`
   executors on one chain were all killed by their parent session before
   finishing (session-6045df66, tasks 02-04). The same map's task 12, sent
   out the way every other task was — `wayfinder_spawn_session`, same model
   `zai/glm-5.3-flash` — ran unattended end to end (read, edit, gates,
   commit) and finished clean in ~4 min (commit 34b3529). The kills
   followed a mid-session detour into `subagent` dispatch; the map's normal
   pattern held up before and after.
2. **`subagent` is for same-turn lookups only** — `run_in_background:
   false`, you need the answer before your next step and will consume it
   yourself. Not for unattended multi-step implementation.
3. Using `subagent` for real work anyway? Executor Liveness below is
   mandatory, not optional.

## Executor Liveness

Governs `subagent` executors — what `list_agents`/`interrupt_agent` can see
and stop. (`wayfinder_spawn_session` sits outside that tree; wait for its
result instead of polling it.)

2026-09-01: three `subagent` executors were killed on a target-file-mtime
check while still reading/grepping/analyzing — work that never touches the
target file. One (43d7ea82) had made 7 `run_code` calls and 4.8k output
tokens of real work in the 2.2 minutes it got before the kill. The
orchestrator then redid the same task inline in 4.7 minutes — over double
the budget it gave the executor.

1. **Signal: `list_agents` status — never target-file mtime, git status, or
   served output.** Those show what shipped, not whether the executor is
   working. `status: "running"` means mid-turn and alive; leave it.
2. **Patience floor: 6 minutes minimum before the first check.** 09-01's
   inline redo cost 4.7 min for a small task — floor at or above your own
   inline estimate, never below it. Bigger task, bigger floor.
3. **Suspected stall** (`status` is `"idle"`/`"ready"`, no result, floor
   elapsed): ping once via `send_message`, then wait a second full floor
   for a reply or for `status` to read `"running"` again. Don't act in
   between.
4. **Genuine stall** (still idle/ready, no reply, second floor elapsed):
   escalate — take over inline yourself, or `interrupt_agent` and
   redispatch once with a narrower prompt. Say which, and why.
   Done when: the executor delivered, or you said what you did and why —
   a silent kill is what turned three working executors into three
   redone-inline tasks on 09-01.

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
