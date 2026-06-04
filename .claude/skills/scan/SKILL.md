---
name: scan
version: 1.0.0
description: '[Documentation] Use when scanning the codebase to (re)generate ONE project-reference doc. Parameterized by `--target=<key>`: project-structure | backend-patterns | frontend-patterns | scss-styling | design-system | code-review-rules | domain-entities | feature-spec | docs-index | e2e-tests | integration-tests | seed-test-data | ui-system. Shared 4-phase scan engine; per-target detail lives in references/targets.md. `ui-system` is an orchestrator meta-target (`kind: orchestrator`) that runs the 3 UI child scans in parallel instead of the 4-phase engine.'
---

## Quick Summary

**Goal:** Scan the codebase for ONE target reference doc and surgically (re)populate it with actual patterns — every example from real project files with `file:line`. The 4-phase engine below is shared; the per-target data (which doc, how many sub-agents, what to detect, what sections to write, what NOT to do) comes from the target's entry in `references/targets.md`. (read directly when relevant; do not rely on hook-injected conversation text)

**Workflow:**

1. **Resolve target** — Read `--target=<key>`; load its entry from `references/targets.md`
2. **Assess** — Read target doc, detect init vs sync (vs force) mode, run the target's Phase-0 detection table(s)
3. **Scan** — Launch the target's sub-agents in parallel; discover patterns with `file:line` evidence
4. **Report** — Write structured findings to report file (incremental, not batched)
5. **Generate** — Surgical update of the reference doc from report (apply target's Target Sections + Content Rules)
6. **Verify** — Multi-round fresh-eyes review validates examples and coverage; then prompt-enhance the doc

**Key Rules:**

**MUST ATTENTION** resolve `--target` FIRST and load its manifest entry — every target-specific behavior (doc path, sub-agent count/roles, Phase-0 tables, Target Sections, Content Rules, special gates, anti-rationalization rows) comes from that entry, NOT from memory
**MUST ATTENTION** detect framework/type FIRST (per the target's Phase-0 table) — scan strategy derives from detection, never hardcoded
**MUST ATTENTION** every code example from actual project files with `file:line` — NEVER fabricate
**MUST ATTENTION** run graph command on key files before concluding — grep finds text, graph finds structure

- Surgical update only — NEVER rewrite entire doc, NEVER remove a section without evidence it's obsolete
- Some targets OVERRIDE shared output rules or add a branch (e.g. `feature-spec` intentionally includes directory trees; `design-system` has an init-mode Authoring branch with a sentinel-removal step). Always honor the target entry's "Content Rules / exceptions" and "Special slivers".

---

# Scan (parameterized reference-doc scanner)

## Phase 0.0: Resolve Target (BLOCKING — do this before anything else)

1. Parse `--target=<key>` from the invocation (e.g. `/scan --target=backend-patterns`). Accept the key with or without the `--target=` prefix.
2. If no target is supplied or the key is unknown → **STOP** and list the valid keys (see frontmatter / `references/targets.md`), ask the user which target to scan.
3. **Read the target's entry in `references/targets.md`.** That entry is the single source of truth for this run and supplies:
    - `doc` — the reference doc path this scan writes
    - `description` — the doc's purpose blurb
    - `sub-agents` — exact count + role of each parallel sub-agent
    - **Phase 0 detection** — the classification table(s) and BLOCKING gates for this target
    - **Sub-agent Think scopes** — each sub-agent's Think question(s) + scan-target bullets
    - **Target Sections** — the output doc's section list
    - **Content Rules / exceptions** — including any override of the shared output-quality rules
    - **Special slivers** — target-unique BLOCKING gates, Authoring branches, sentinel removals, whitelist scopes
    - **Anti-Rationalization rows** — target-specific evasions to refuse
    - **prompt-enhance** — the final `/prompt-enhance <doc>` step
4. **Orchestrator branch (BLOCKING check):** if the loaded entry is marked **`kind: orchestrator`** (e.g. `ui-system`), it does NOT run the 4-phase doc engine. SKIP Phases 0–4 below and instead follow the entry's **Orchestration Procedure** (pre-flight gate → launch the child `--target=` scans in parallel → verify each child doc has real content → summarize). Standard (single-doc scanner) targets ignore this step and continue with the shared engine below.

> Everything below is the SHARED engine (standard single-doc scanner targets). Wherever it says "the target entry," read the loaded manifest entry — do not assume values from another target. **Orchestrator-kind targets do not use this engine** — they run their entry's Orchestration Procedure instead.

## Phase 0: Classify & Assess

**Before any other step**, run in parallel:

1. Read the target's `doc`.
    - Detect mode: **Init** (placeholder — headings only / sentinel present) or **Sync** (populated). Some targets add a **Force** mode (user says "rebuild"/"reset" → treat as Init even if the doc exists) — honor it if the target entry defines it.
    - In Sync mode: list already-documented sections → skip re-scanning those unless staleness suspected.
2. Run the target entry's **Phase 0 detection** table(s) — detect framework / system type / architecture exactly as that table specifies. This is BLOCKING: grep terms and sub-agent scope derive from detection.
3. Load relevant paths from `docs/project-config.json` (e.g. `contextGroups`/`modules`/`designSystem`/`e2eTesting`/`integrationTestVerify`) if the target entry references them.
4. Run a graph command on the primary entry point: `python .claude/scripts/code_graph trace <entry-file> --direction both --json` (when `.code-graph/graph.db` exists).

**Evidence gate:** Confidence <60% on the target's primary detection axis → report uncertainty, DO NOT proceed with detection-specific scanning (or fall back exactly as the target entry's evidence-gate instruction specifies, e.g. "proceed with Agent 1 only").

## Phase 1: Plan Scan Strategy

From the detected framework/type, derive the concrete patterns to search (naming conventions, base classes, config locations). NEVER assume these — derive from actual file evidence.

**Create `TaskCreate` entries** for each sub-agent listed in the target entry and for each phase before proceeding.

## Phase 2: Execute Scan (Parallel Sub-Agents)

Launch the **N general-purpose sub-agents** defined in the target entry (count + roles vary per target — e.g. backend-patterns/domain-entities use 4, project-structure/frontend-patterns/design-system/code-review-rules/e2e-tests use 3, scss-styling/feature-spec/integration-tests use 2, docs-index uses a single main-agent scan + a fresh-eyes verifier). Give each sub-agent its **Think scope** + scan-target bullets verbatim from the entry. Each sub-agent MUST:

- Write findings incrementally after each file/section — NEVER batch at end
- Cite `file:line` for every pattern example
- Confidence: >80% document as pattern; 60-80% document as "observed (unverified)"; <60% omit

All findings → `plans/reports/scan-{target}-{YYMMDD}-{HHMM}-report.md`.

> Honor any **conditional / ordered** sub-agents from the entry (e.g. an Anti-Pattern agent that runs AFTER the discovery agents; a Cross-Service agent that runs ONLY for microservices; a BDD agent that runs ONLY if a BDD framework is detected). Honor any **CRITICAL security flag** the entry defines (e.g. hardcoded credentials).

## Phase 3: Analyze & Generate

Read the full report. Apply the fresh-eyes protocol:

**Round 1 (main agent):** Build section drafts from report findings, using the target entry's **Target Sections** + **Content Rules / exceptions**.

**Round 2 (fresh sub-agent, zero memory of Round 1):** Sub-agent re-reads report + draft doc independently and checks (apply the target entry's Round-2 verification specifics):

- Does every code example match an actual existing file (Glob verify)?
- Do class/token/variable names in examples match actual declarations (Grep verify)?
- Are required sections (Anti-Patterns / Coverage Report / Gap Analysis / M1-M2 Compliance / etc. as the target mandates) populated?
- Coverage gaps: which Target Sections have no examples?

**Round 3 only if Round 2 finds issues.** Max 3 rounds → escalate to user if unresolved. (Clean Round 1 ends the scan; fresh-eyes is mandatory only after issues are found and fixed.)

> **Authoring branch (init mode):** if the target entry defines one (e.g. `design-system` authors the canonical doc + token `.scss`), follow it exactly — including any **sentinel removal** (e.g. "First: REMOVE `PLACEHOLDER_MARKER_SCSS`") and regen-marker prepend.

## Phase 4: Write & Verify

1. Write the updated doc with `<!-- Last scanned: YYYY-MM-DD -->` at top.
2. Surgical update only — preserve sections with no staleness, update only diverged sections; preserve manual annotations.
3. Verify (Glob check): **ALL** code example file paths exist — not just a sample of 5.
4. Verify (Grep check): class/token/variable names in examples match actual declarations.
5. Verify any target-mandated section is real, not hypothetical (Anti-Patterns / Coverage gaps / M1-M2 leaks / ports-from-config / etc.).
6. Run a graph command on 2-3 key files to validate call-chain accuracy.
7. Report: sections updated / unchanged / coverage gaps / violations found.

> **Output-rule overrides:** apply the target entry's "Content Rules / exceptions" — e.g. `feature-spec` intentionally INCLUDES a directory tree (overriding the shared no-trees rule); `docs-index` intentionally OUTPUTS glob-verified counts (its counts are the deliverable); `e2e-tests`/`integration-tests` forbid hardcoded counts and use grep-expression statistics.

<!-- SCAN:prompt-enhance-final-step -->

## Final Step: Enhance Scanned Doc (MANDATORY)

**MUST ATTENTION** after the doc is written and verified, create a REQUIRED final todo task and run `/prompt-enhance <the target entry's doc>` — why: this reference doc is injected into AI context; attention-anchoring (top/bottom Goal, inline READ summaries, token density) directly raises downstream AI output quality. A scan is NOT complete until its doc is prompt-enhanced.

**TaskCreate (required, last task):** `Run /prompt-enhance <target doc> on the scanned doc`

<!-- /SCAN:prompt-enhance-final-step -->

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks per file read. Prevents context loss from long files. Simple tasks: ask user whether to skip.

**Prerequisites:** **MUST ATTENTION READ** before executing:

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources, admit uncertainty, self-check output, cross-reference independently. Certainty without evidence = root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:scan-and-update-reference-doc -->

> **Scan & Update Reference Doc** — Surgical updates only, NEVER full rewrite.
>
> 1. **Read existing doc** first — understand structure and manual annotations
> 2. **Detect mode:** Placeholder (headings only) → Init. Has content → Sync.
> 3. **Scan codebase** (grep/glob) for current patterns
> 4. **Diff** findings vs doc — identify stale sections only
> 5. **Update ONLY** diverged sections. Preserve manual annotations.
> 6. **Update metadata** (date, version) in frontmatter/header
> 7. **NEVER** rewrite entire doc. **NEVER** remove sections without evidence obsolete.

<!-- /SYNC:scan-and-update-reference-doc -->

<!-- SYNC:output-quality-principles -->

> **Output Quality** — Token efficiency without sacrificing quality.
>
> 1. No inventories/counts — stale instantly
> 2. No directory trees — use 1-line path conventions
> 3. No TOCs — AI reads linearly
> 4. One example per pattern — only if non-obvious
> 5. Lead with answer, not reasoning
> 6. Sacrifice grammar for concision in reports
> 7. Unresolved questions at end

<!-- /SYNC:output-quality-principles -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.
> **Keep domain concepts out of generic/shared/infrastructure layers.** A reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. The leak compiles and runs, so it passes review silently while coupling the "reusable" layer to one consumer. Push domain fields/logic down into the consumer via subclass or composition.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:scan-and-update-reference-doc:reminder -->

**IMPORTANT MUST ATTENTION** read existing doc first, scan codebase, diff, surgical update only. Never rewrite entire doc.

<!-- /SYNC:scan-and-update-reference-doc:reminder -->

<!-- SYNC:output-quality-principles:reminder -->

**IMPORTANT MUST ATTENTION** output quality: no counts/trees/TOCs, 1 example per pattern, lead with answer. (Per-target exceptions in the manifest entry override this — e.g. feature-spec trees, docs-index counts.)

<!-- /SYNC:output-quality-principles:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** resolve `--target` and load its manifest entry FIRST — never scan from memory of "what a backend/frontend/design scan does"
**IMPORTANT MUST ATTENTION Final Step:** run `/prompt-enhance <target doc>` as the REQUIRED last todo task — never end the scan without enhancing the doc it just wrote
**IMPORTANT MUST ATTENTION** break work into small `TaskCreate` tasks BEFORE starting — one task per sub-agent, one per phase
**IMPORTANT MUST ATTENTION** detect framework/type FIRST in Phase 0 — all grep terms derive from detection, never hardcoded
**IMPORTANT MUST ATTENTION** cite `file:line` for every pattern (confidence >80% to document; <60% omit)
**IMPORTANT MUST ATTENTION** run graph command on key files — grep finds text, graph finds structure (callers, event chains, blast radius)
**IMPORTANT MUST ATTENTION** sub-agents write findings incrementally after each file — NEVER batch at end (context loss)
**IMPORTANT MUST ATTENTION** read existing doc FIRST, diff findings, surgical update only — NEVER rewrite entire doc
**IMPORTANT MUST ATTENTION** multi-round fresh-eyes review — main agent rationalizes its own mistakes; Round 2 sub-agent catches what main agent dismissed
**IMPORTANT MUST ATTENTION** honor the target entry's Content-Rule exceptions, Special slivers, and Anti-Rationalization rows — they encode why this target differs from the others

**Anti-Rationalization (shared — the target entry adds its own rows):**

| Evasion                                                       | Rebuttal                                                                                              |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| "I know what a `<target>` scan does, skip the manifest entry" | The entry holds the BLOCKING gates, sub-agent count, and exceptions — scanning from memory drops them |
| "Framework/type already known, skip Phase 0 detection"        | Phase 0 is BLOCKING — derive grep terms from evidence, not assumption                                 |
| "Doc has content, skip re-read"                               | Show section list extracted from doc as proof of re-read                                              |
| "Examples look right"                                         | Glob-verify ALL file paths + Grep-verify ALL names — looking right ≠ verified                         |
| "Round 2 review not needed for small scan"                    | Main agent rationalizes own mistakes. Fresh sub-agent is non-negotiable.                              |

**[TASK-PLANNING]** Before acting, analyze task scope and break into small todo tasks and sub-tasks using TaskCreate.
