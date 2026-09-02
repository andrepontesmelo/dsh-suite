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
3. **Review** every implementation, delegated or inline — no size
   exemption, never by whoever wrote it (Review).
   Done when: the reviewer returns a verdict.
4. **Iterate**: on a `major` finding, redo the work — redispatch via
   whichever transport step 2 chose, or re-edit inline if step 2 chose
   inline — carrying the findings (Review). Not a kept-alive
   `send_message` channel; nothing is usually listening on one by the
   time review finishes.
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

## Review

Governs Workflow step 3. Applies to every implementation, inline or
delegated, any size — 2026-09-01's failure was 11 unreviewed tasks (1
delegated, 10 inline after its own executors were killed), each
self-certified by whichever agent wrote it, no independent review
anywhere in the run.

1. **Spawner: whoever received the implementation as done — the
   orchestrator that dispatched it, or that got the
   `wayfinder_spawn_session` result back — dispatches the reviewer next,
   via `subagent`.** Same-turn: you need the verdict before your next step
   and consume it yourself, same as any other same-turn lookup (Delegation
   Transport). Never the implementer. Never the orchestrator waving
   through its own inline edit.
2. **Input: the diff (`git diff`, or `git show <sha>` if already
   committed) and the originating dex task's full text (`dex show <id>
   --full`).** Not the implementer's commit message or self-report as
   evidence — the reviewer checks each "Done when" clause against the
   diff and source itself.
3. **No write access: enforced procedurally, not by sandbox.** `subagent`
   exposes only `description`/`prompt` — no read-only dispatch flag
   exists, and the session permission preset isn't overridable per call.
   Instruct the reviewer in-prompt not to edit/write/commit/run mutating
   commands, then run `git status --short` yourself right after it
   returns, before trusting the verdict. Any change it made voids the
   round and is itself a `major` finding.
4. **Verdict, required in the reply:**

       VERDICT: PASS | FAIL
       FINDINGS: `major: ...` / `minor: ...` lines (file:line where it
       applies), or "none".

   `FAIL` iff >= 1 `major`. A `major` on a false premise or claim — in the
   ticket or the diff — is correct even when the code matches what was
   literally asked; the reviewer owes truth, not compliance.
5. **On FAIL: append the findings to the dex task description (`dex edit
   <id> -d`, original text plus a new `## Review round N` block).** The
   only channel a redispatched `wayfinder_spawn_session` executor reads —
   its prompt is built from the dex locator, not a free-text argument
   (verified: the tool takes `root`/`tasks`/`provider`/`model` only, no
   message field). Redispatch through Delegation Transport next. Don't
   reach for `send_message`: it addresses `subagent`-tree children only
   (`subagent_id`, confirmed against session-6045df66's own dispatch log);
   `wayfinder_spawn_session` sessions run at `delegationDepth: 0`, outside
   that tree (confirmed: session-163c4f6f vs 43d7ea82 session headers),
   and by review time a spawned implementer has typically already
   finished and exited — task 12/session-163c4f6f ran unattended end to
   end (read, edit, gates, commit) with nothing left to message.
   Implementer still a live same-turn `subagent`? `send_message` is fine
   for that case.
6. **Loop exit.** Done when: a round returns zero `major` findings — then
   summarize what shipped (Workflow step 4). Three consecutive `FAIL`
   rounds on the same task: stop, escalate to Andre with the findings
   history instead of respawning again — silent infinite iteration is its
   own failure mode.

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
