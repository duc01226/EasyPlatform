# `/investigate --mode=debug` — root-cause investigation reference

> Read in full for `--mode=debug [bug description]`. Replaces default Phase 0, workflow and output format; READ-ONLY and `file:line` rules remain. Investigate and recommend; `/fix` implements. The code graph remains optional.

## Quick Summary

**Goal:** Deliver a `/why-review`-validated root cause at the invariant-owning layer so `/fix` corrects the cause; otherwise report an unconfirmed hypothesis and evidence gaps.

**Summary:** Classify → conditional test adjudication → reproduce → rank 2–3 hypotheses → trace end-to-start/all feeders → confirm ownership and forward proof → `/why-review` → report/handoff. Direct invocation asks no workflow question; standalone completion asks how to continue.

**Key Rules:**

- Never patch here. Read actual code, search 3+ comparable patterns, and cite `file:line` + `Confidence: X%`.
- Resolve or bound competing causes and bypasses before recommending; preserve intent rather than forcing green.
- Confirm only after same-main-session `/why-review` PASS; two unsuccessful rounds → STOP/ask.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute steps in order; skipping, reordering or merging requires explicit user approval.
> **[BLOCKING]** Bootstrap task tracking before the first file read. Track each step/sub-skill with evidence or a skip reason; keep one `in_progress`, then mark `completed`. Use an equivalent tracker if Task tools are unavailable. Include a final consistency review.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

<!-- SKILL-NAV:START -->
## Contents

- [Quick Summary](#quick-summary)
- [Phase 0: Classify and Route (BLOCKING)](#phase-0-classify-and-route-blocking)
- [Phase 1: Reproduce](#phase-1-reproduce)
- [Phase 2: Hypothesize](#phase-2-hypothesize)
- [Phase 3: Trace End-to-Start](#phase-3-trace-end-to-start)
- [Phase 4: Confirm Ownership and Completeness](#phase-4-confirm-ownership-and-completeness)
- [Phase 5: Root Cause Validation (`/why-review` Gate)](#phase-5-root-cause-validation-why-review-gate)
- [Phase 6: Report and Hand Off](#phase-6-report-and-hand-off)
- [Mode protocols](#mode-protocols)
- [Closing Reminders](#closing-reminders)

<!-- SKILL-NAV:END -->

## Phase 0: Classify and Route (BLOCKING)

Route by failure type:

| Bug type | Signals | Specialized agent |
| --- | --- | --- |
| Frontend UI / rendering | Console errors, visual regression, component state | `debugger` |
| Backend logic / data | Wrong response, corrupt data, validation failure | `debugger` |
| Cross-service / message bus | Missing events, failed consumers, sync lag | `debugger` |
| Performance / memory | Slow queries, OOM, N+1, unbounded results | `performance-optimizer` |
| Security / auth | Access denied, token issues, permission bypass | `security-auditor` |
| Failing / flaky integration test | Regression, intermittent or full-suite-only failure | `debugger`; Phase 0.5 FIRST |

- Cross-service bugs: grep/read producers, consumers, sagas and shared contracts.
- OOM: check row COUNT before row SIZE — missing DB filter, then excessive row size.
- When the defect or proposed fix touches model calls, prompts, agents, tools/MCP, retrieval or evals, record inputs/traces and reproducible evidence (`AE-6`, `AE-7`), not one sample. Read `.claude/skills/shared/protocols/ai-engineering-gate.md` then; `node .claude/scripts/ai-signal-scan.cjs` assists discovery. Otherwise skip.
- When business entity/model ownership or relationships matter, read `domain-entities-reference.md` under the reference-docs root (default `docs/project-reference`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides it).

### Phase 0.5: Fault Adjudication (failing/flaky integration tests ONLY)

**Integration Test Review** — Read `.claude/skills/integration-test/references/mode-review.md` §"Single Review Pass — Eight Gates" and apply it; NEVER invoke `/integration-test --mode=review` here. It covers assertion value, data state, repeatability, domain alignment, spec traceability, sync, changed-behavior coverage and scenario fidelity. The verify fix-loop owns invocation (`.claude/skills/integration-test/references/fix-loop.md`, FL-1 step 5); reading suffices standalone.

Emit ONE provisional verdict before tracing:

| Verdict | Evidence / next action |
| --- | --- |
| **TEST-WRONG** | Stale/dead assertion, incorrect setup, non-unique data or unreachable scenario → trace the test's root cause; recommend correcting it without weakening the invariant. |
| **TEST-NOT-OPTIMAL** | Valid intent but fragile timing, shared state, ordering or low signal → trace the test seam/barrier or shared infrastructure assertion. |
| **SOURCE-WRONG** | Production violates the governing spec or invariant → trace to its owner; keep or strengthen the detecting test. |
| **ENVIRONMENT-BLOCKED** | Config, dependencies, DB, credentials, ports, versions or resource pressure prevent a verdict → preserve diagnostics, name the environment remedy; block application tracing and source/test mutation. |
| **AMBIGUOUS** | Intended behavior or ownership is silent/contradictory → STOP and ask the user or canonical owner. |

Read `.claude/docs/development-rules.md` when adjudicating: verify observable intent, triangulate spec/source per the full protocol below, and propose surgical repairs. Never weaken assertions, add skips, relax timeouts or alter source to force green; this mode returns proposed repairs only.

## Phase 1: Reproduce

Record expected/actual behavior, exact trigger (data/action/timing/environment) and error, stack trace, screenshot or assertion. Before deep tracing, sweep environment preconditions and resource/transience suspects; run and cite a discriminator. Retry success alone leaves the failure unexplained.

## Phase 2: Hypothesize

Rank 2–3 theories with evidence for/against and a falsifiable verification. Keep the environment as a competing cause until ruled out; test one variable at a time.

## Phase 3: Trace End-to-Start

Apply the full trace protocol below: name Frame 0 and its reader, trace each hop to origin with input/transformation/output/owner/evidence, and enumerate ALL feeders (retry, async/background, alternate entries) and error branches. Complete the hypothesis matrix before recommending.

**Optional graph advice:** For shared contracts, many callers, public APIs or cross-module/service flows, `.code-graph/graph.db` may reveal dependencies/tests/message-bus hints. Verify them with grep/read; stale, missing or local/low-risk graphs never block. Use a verified Python 3 launcher: `python3` on macOS/Linux, `py -3` on Windows.

```bash
python3 .claude/scripts/code_graph query callers_of <function> --json
python3 .claude/scripts/code_graph trace <suspect-file> --direction both --json
```

## Phase 4: Confirm Ownership and Completeness

Classify hypotheses as primary, contributing, ruled out, latent or unknown; cover ALL symptoms and resolve or bound competing causes. Check bypasses (direct construction, clone/spread without revalidation, external mutation). Prove the correction point owns the invariant and protects consumers; the crash site qualifies only when it owns the contract. Walk origin → observed end state forward, mapping each cause to a correction and each correction to tests/proof.

## Phase 5: Root Cause Validation (`/why-review` Gate)

Persist findings; run `/why-review` in the SAME session and SAME main agent; do NOT delegate this gate. Verify conclusive `file:line` proof, ALL symptoms, no evidence gaps, correct ownership and no downstream/bypass regressions.

- **PASS:** May confirm and hand findings to `/fix`.
- **Gaps/risks:** Gather evidence and repeat validation.
- **Two rounds without PASS:** STOP and escalate through `ask user question tool`.

Every root-cause claim needs `Confidence: X%` and traced evidence; verify before acting at ≤80%.

| Confidence | Evidence | Reporting |
| --- | --- | --- |
| 95–100% | Full trace verified | Confirmed only after validation PASS |
| 80–94% | Main path verified; edges uncertain | Report with caveats |
| 60–79% | Partial trace | Hypothesis, not confirmed |
| <60% | Insufficient evidence | Gather evidence; report only the unconfirmed hypothesis and named gaps, never a root-cause verdict |

## Phase 6: Report and Hand Off

Append evidence incrementally to `tmp/reports/debug-investigate-{YYMMDD}-{slug}.md`; `/fix` recognizes this prefix. Return:

- Expected/actual behavior, trigger and environment discriminator.
- Root cause or "hypothesis, not confirmed", confidence, `file:line` chain, affected files and gaps.
- `Debugger Trace: End -> Start`, feeder statuses, hypothesis matrix and data flow.
- Invariant owner, proposed correction, forward convergence, tests/proof and full report link.

**Standalone next steps:** Use `ask user question tool`; never auto-continue. Offer the appropriate full workflow (recommended), `/fix`, `/plan`, or manual continuation. Skip this choice ONLY for `nested=true`: a linked step of an active `[Workflow]` row with its own phase tasks; an abandoned/existing row alone does not qualify. Return nested findings to the parent.

## Mode protocols

Keep these six full SYNC bodies intact. The entrypoint's required protocol delivery also applies: cross-service, environment, fix-layer, root-cause, sequential-thinking, source/test-drift, task/report and understand-code guides.

<!-- SYNC:end-to-start-debugger-trace -->

> **End-to-Start Debugger Trace** — For non-trivial bugs, failed verification, regression fixes, behavior-changing code, or unclear code flow, start from the observed final state and walk backward before proposing a fix.
>
> 1. **Frame 0: observed end state** — Name the exact user-visible output, failing assertion, log line, persisted value, API response, rendered UI, or aggregate bucket. Record the reader/query/renderer that produced it with `file:line` evidence.
> 2. **Walk backward one hop at a time** — Trace final reader -> projection/cache/storage -> writer -> consumer/handler/job -> producer/caller -> original trigger. At every hop record: input, transformation, output, owner, and evidence.
> 3. **Enumerate all feeder paths** — Find every upstream producer/caller/event/job that can write into the final path, including retry, async, cache, background, and alternate UI/API paths. Mark each path verified, ruled out, or still unknown.
> 4. **Build the hypothesis matrix** — For each plausible cause, list evidence for, evidence against, how to reproduce/verify, blast radius, and status (`primary`, `contributing`, `ruled out`, `latent`). Do not fix until competing causes are explicitly resolved or bounded.
> 5. **Choose the owning fix layer** — Identify the invariant owner and select the authoritative correction and enforcement points from traced contracts and the project's architecture. Keep validation at untrusted boundaries. Choose a shared point only when evidence shows it owns the invariant for those consumers. A fix at the symptom site is rejected unless the symptom site owns the invariant.
> 6. **Prove convergence forward** — After choosing the fix, walk start -> end again and show how the corrected state reaches the observed final output. Map each root cause to a fix part and each fix part to a test/proof.
>
> **BLOCKED until:** final state named · backward trace written · all feeder paths enumerated · hypothesis matrix completed · owning fix layer justified · forward convergence proof mapped to tests.
>
> **NEVER:** Start at the first suspicious code path. Collapse multiple producers into one "flow". Treat duplicate symptoms as duplicate records without proving the read model. Skip ruled-out hypotheses.

<!-- /SYNC:end-to-start-debugger-trace -->

<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Do not present inference as fact; ground material claims in evidence appropriate to the task.
>
> 1. Cite `file:line` for repository claims, configuration or reference paths for project rules, and URLs or artifact locations for external or observed claims.
> 2. State confidence when a conclusion is uncertain; verify material assumptions before acting and withhold recommendations when evidence is insufficient.
> 3. Trace the consumers, boundaries, or dependencies that exist in the affected path; do not assume services, modules, or architectural styles that the project does not use.
> 4. "I don't have enough evidence" is valid and expected output.
>
> **BLOCKED until:** material claims have traceable evidence, relevant searches are complete, and uncertainties are stated. Search comparable patterns when the task has existing implementations; record when none are available.
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->

<!-- SYNC:incremental-persistence -->

> **Incremental Result Persistence** — MANDATORY for every visual-artifact review and for all sub-agents or heavy inline steps processing >3 files.
>
> 1. **Before starting:** Create report file `tmp/reports/{skill}-{date}-{slug}.md` and record Run ID, Task ID, Attempt ID, target scope, and target fingerprint. When visual artifacts are in scope, also record their ordered inventory and total; identify each screenshot, image, photo, or snapshot by path/name plus state and viewport when known.
> 2. **Checkpoint each review unit:** After each file or section, append findings, evidence, changed paths, and gaps immediately. For visual artifacts, open exactly ONE artifact, inspect it, and append its record BEFORE opening the next artifact. Each record includes artifact identity, state/viewport, inspection status, observations, severity-tagged issues with evidence, an explicit `none` when no issue exists, and any gap. NEVER batch multiple visual artifacts into one later write and never hold their findings in memory.
> 2a. **Resume from disk:** Treat the report's artifact records as the progress ledger. After interruption or context loss, read the report, derive processed and remaining artifacts from the ordered inventory, and continue at the first unprocessed artifact without duplicating completed records.
> 3. **Delegated return:** A sub-agent emits only the structured `SYNC:subagent-return-contract` envelope with exact totals, salient Critical/High findings (maximum ten), current attempt, and `Full report:` path. **Inline user-facing output:** Preserve the skill's requested explanation or teaching, with links to the persisted evidence; the delegated transport limit does not replace that deliverable. Do not paste a full review report into an envelope.
> 4. **Parent synthesis from persisted evidence:** The main agent reads the full report for synthesis, acceptance, deduplication, and repair planning — not only when a named blocker exists. For visual review, reconcile the ordered inventory against the artifact records before concluding; a missing record is incomplete review, never a clean result. Preserve all severities beyond the transport cap.
> 5. **Read-only boundary:** A read-only leaf may write its report/repair proposal but MUST NOT edit source, generated output, or user data; the parent/owner performs repairs after acceptance.
> 6. **Advancement gate:** The parent records `ACCEPTED` for the current Attempt ID only after reconciling target, totals, gaps, and changed paths; stale or late attempts cannot advance dependent work.
>
> **Why:** Context cutoff mid-execution loses ALL in-memory findings, and a large image set makes a final batch write especially fragile. Each per-unit disk write survives compaction. Partial results are better than no results, while explicit identity prevents a late result or a resumed image from being mistaken for the current run.
>
> **Report naming:** `tmp/reports/{skill-name}-{YYMMDD}-{HHmm}-{slug}.md`

<!-- /SYNC:incremental-persistence -->

<!-- SYNC:red-flag-stop-conditions -->

> **Red Flag Stop Conditions** — STOP and escalate to user via ask user question tool when:
>
> 1. Confidence drops below 70% on any critical decision
> 2. Cross-service boundary is being crossed
> 3. Security-sensitive code (auth, crypto, PII handling)
> 4. Breaking change detected (interface, API contract, DB schema)
> 5. Test coverage would decrease after changes
> 6. Approach requires technology/pattern not in the project
>
> **NEVER proceed past a red flag without explicit user approval.**

<!-- /SYNC:red-flag-stop-conditions -->

<!-- SYNC:subagent-return-contract -->

> **Sub-Agent Return Contract** — When this skill spawns a sub-agent, the sub-agent MUST return ONLY the structured envelope below. Main agent reads the envelope first, then opens the referenced report for synthesis, acceptance, deduplication, or repair planning; a full report is never pasted inline.
>
> ```markdown
> ## Sub-Agent Result: [skill-name]
>
> Status: ✅ PASS | ⚠️ PARTIAL | ❌ FAIL
> Confidence: [0-100]%
> Run ID: [stable run identifier]
> Task ID: [parent task or phase identifier]
> Attempt ID: [monotonic attempt/revision identifier]
> Target: [exact files/paths or scope] @ [target fingerprint/commit]
> Changed paths: [none | exact paths]
> Finding totals: Critical=[n] | High=[n] | Medium=[n] | Low=[n]
> Acceptance: PENDING | ACCEPTED | REJECTED — parent records the decision
>
> ### Findings (Critical/High surfaced — max 10 bullets)
>
> - [severity] [file:line] [finding]
>
> ### Gaps / Unverified
>
> - [missing host, runtime, coverage, or evidence limitation]
>
> ### Actions Taken
>
> - [file changed] [what changed]
>
> ### Blockers (if any)
>
> - [blocker description, or `none`]
>
> Full report: tmp/reports/[skill-name]-[date]-[slug].md
> ```
>
> The ten-bullet limit is a transport limit, not a visibility limit: the full report may contain more than ten Medium/Low findings when no named blocker exists, and the parent MUST read it when synthesizing or deduplicating. The parent MUST reject a stale, duplicate, or superseded `Attempt ID` and MUST accept the current attempt before advancing a dependent step. Read-only leaves write repair proposals/reports only; they do not edit source, generated carriers, or user files.
>
> **Context budget** — the return payload is a SUMMARY, not a transcript: no raw file contents / full diffs / verbatim logs inline, no re-pasted source. Everything beyond the envelope lives in the incrementally-written report. A sub-agent that would exceed the summary shape MUST persist the detail and return only the pointer; bounded transport must never become bounded visibility.

<!-- /SYNC:subagent-return-contract -->

<!-- SYNC:test-failure-fault-adjudication -->

> **Test-Failure Fault Adjudication** — When a test fails (or you are debugging or fixing a failure), the job is to determine *who is at fault — the source code or the test code*. Getting that verdict right matters more than turning the suite green. Binds every debug / fix / test skill identically.
>
> 1. **Provisional verdict before touching either side.** Classify the observed evidence as SOURCE-WRONG, TEST-WRONG, TEST-NOT-OPTIMAL, ENVIRONMENT-BLOCKED, or AMBIGUOUS; then `/investigate --mode=debug` and trace end-to-start before editing. A green-again suite is NOT the goal.
> 2. **Triangulate against the owner artifact AND the source.** Use the business root selected by `specRoots.business.path`, following the framework config loader's fallback only when the project leaves it unset. Resolve `specArtifacts`: when valid, read its configured `intent/contracts/evidence` sections and locate native cases through configured carriers; when absent, use the strict-default §3 AC / §4 BR / §5 invariant / §8 TC sections. A malformed or unsupported declaration blocks without fallback. Inspect the assertion tied to owner + case/scenario ID + optional variant. The canonical intent decides expected behavior — compare BOTH production source and failing test against it. With no spec, use documented intent / acceptance criteria / caller contract and name that limit. Decide from evidence whether SOURCE or TEST is wrong.
> 3. **Classify who is at fault, then fix the wrong side at its root:**
>     - **SOURCE-WRONG** — production code violates the spec's intended behavior or a clear invariant → fix the source at the owning layer; keep or strengthen the test that caught it.
>     - **TEST-WRONG** — the test encodes a stale or incorrect assertion, setup, or expectation that contradicts intended behavior → fix the test at its root. NEVER weaken an assertion, add a skip, or relax a timeout to force green.
>     - **TEST-NOT-OPTIMAL** — intended behavior is valid but the test seam, timing, or assertion signal is fragile → improve the test without weakening the invariant.
>     - **ENVIRONMENT-BLOCKED** — infrastructure, setup, or external state — including transient resource pressure (RAM/OOM, CPU saturation, disk or temp exhaustion, handle and connection-pool limits, network flakiness, a timeout that is really slowness) — prevents a source/test verdict → preserve diagnostics (exact command, exit code, full output, resource evidence), name the environment remedy, and STOP mutating source or tests until the environment is healthy. This verdict is a FIRST-CLASS candidate weighed in step 1 alongside SOURCE-WRONG and TEST-WRONG — never a fallback reached only after the code looks fine; run `SYNC:environment-fault-hypothesis` to rule it in or out with a stated discriminator. A failure that vanishes on retry stays UNEXPLAINED until its mechanism is named — "flaky" is a symptom, not a verdict.
>     - **AMBIGUOUS** — evidence or intended behavior does not safely select an owner → ask the user or canonical owner before editing.
>     - NEVER change a test to match broken source, and NEVER change source to satisfy a broken test. (Migration code excluded — schema/data migrations are one-time execution paths, not core application logic.)
> 4. **Ask the user when intended behavior is unclear.** If no owner artifact covers the behavior, the configured sections are silent, or the owner is ambiguous about which side is correct, STOP and ask the user or canonical spec owner before editing either side — never silently pick source or test just to make the suite pass.
>
> Reconcile to intended behavior, never to whichever side currently passes — green can encode the very bug.
>
> **Read-only/report-only role boundary:** when this block is carried by a report-only role (`code-reviewer`, `spec-compliance-reviewer`, `tester`, and any other agent whose definition declares it never edits source), "fix the wrong side" means RETURN the adjudicated verdict and the proposed repair to the parent — do not modify source, tests, generated carriers, or user data. The adjudication is the deliverable; the edit is the caller's. Without this sentence the block's step-3 imperatives read as write authority and directly contradict those agents' own declarations (e.g. `tester.md` "NEVER implement fixes").

<!-- /SYNC:test-failure-fault-adjudication -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Deliver a `/why-review`-validated root cause at the invariant-owning layer so `/fix` corrects the cause; otherwise report an unconfirmed hypothesis and evidence gaps.

**Route:** Classify → conditional adjudication (read, never invoke review) → reproduce → rank 2–3 hypotheses → trace/all feeders → ownership/forward proof → same-main-session `/why-review` → report → standalone user choice or nested return.

- **READ-ONLY:** No quick patches; read code, search 3+ patterns, preserve intent and cite `file:line` + confidence. Below 60%, return only an unconfirmed hypothesis and gaps.
- **Validation:** Solid-looking findings still need `/why-review` PASS. Two unsuccessful rounds → STOP/ask; 3+ failed fix attempts → STOP, question the architecture and escalate.
- **Evidence:** Retry/local success is insufficient; reproduce in the failing environment and name the mechanism/discriminator.
- **Completion:** Follow phase order, link nested tasks, restrict parallel work to disjoint write sets with a barrier, persist evidence, update task status and finish the consistency review.
