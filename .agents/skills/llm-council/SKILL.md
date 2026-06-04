---
name: llm-council
description: '[Decision Support] Use when pressure-testing irreversible, high-stakes decisions with adversarial AI advisors.'
---

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.

<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->

## Codex Project-Reference Loading (No Hooks)

Codex uses static project-reference loading instead of runtime-injected project docs.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

> **[IMPORTANT]** MUST ATTENTION use council only for multi-option, hard-to-reverse, high-stakes decisions. NEVER council trivial, factual, reversible, or single-option questions.
> **[IMPORTANT]** MUST ATTENTION spawn 5 advisors in parallel, then 5 fresh peer reviewers in parallel, then chairman synthesis.
> **[IMPORTANT]** MUST ATTENTION require evidence for code/architecture claims: `file:line`, graph trace, or explicit "insufficient evidence."

# LLM Council

## Quick Summary

**Goal:** Adversarial decision support for costly wrong choices. Five advisors analyze independently, five fresh reviewers critique anonymously, chairman produces final verdict + report artifacts.

**Workflow:** Gate → Frame → 5 parallel advisors → anonymized 5-reviewer peer review → chairman synthesis → paired HTML/MD reports.

**Key Rules:**

- MUST ATTENTION use cheaper ladder first: `$why-review` → `$plan-validate` → `$llm-council`.
- MUST ATTENTION graph-trace code/architecture questions when `.code-graph/graph.db` exists.
- NEVER let earlier advisor responses bleed into later advisors; parallel spawn required.
- ALWAYS mark verdict degraded if fewer than 5 usable advisor responses return.
- ALWAYS regenerate mirrors with `$sync-codex` after editing this skill — NEVER hand-edit `.agents/` or `.codex/` (they are generated artifacts).

---

## Phase 0: Council Gate

Run before advisors.

| Gate              | Required                                                                 | Route if false                          |
| ----------------- | ------------------------------------------------------------------------ | --------------------------------------- |
| Multi-option      | >=2 viable paths                                                         | Single-option rationale → `$why-review` |
| Hard to reverse   | Architecture, stack, pricing, hiring, irreversible refactor              | Reversible choice → answer directly     |
| Real stakes       | Wrong call costs >=1 week, money, trust, or strategic position           | Low stakes → answer directly            |
| Multi-angle value | Contrarian/first-principles/upside/outside/execution views change answer | Factual/single-domain → answer directly |

If any gate fails, state failed gate + lighter route. NEVER council "should I use markdown."

Good prompts: pricing model, positioning angle, pivot, hiring vs automation, architecture bet, high-risk launch, irreversible refactor.
Bad prompts: factual lookup, simple yes/no, content generation, summarization, bugfix, package upgrade, routine refactor, anything decidable with one grep.

---

## Advisor Dimensions

Each advisor = thinking dimension, not persona costume. One strong angle each.

| Advisor                  | Think                                                           |
| ------------------------ | --------------------------------------------------------------- |
| Contrarian               | What fails? What assumption kills plan?                         |
| First Principles Thinker | What problem are we solving? Which assumptions need rebuild?    |
| Expansionist             | What upside, adjacent opportunity, undervalued path is missing? |
| Outsider                 | What confuses someone with no context? What jargon hides value? |
| Executor                 | What can happen Monday morning? Fastest validated path?         |

Tensions: Contrarian vs Expansionist, First Principles vs Executor, Outsider grounds both.

---

## Step 1: Frame Question

When user says "council this", enrich then frame.

**Context discovery budget:** <=30 seconds; read 2-3 high-signal files.

**Search order:** `CLAUDE.md` / `AGENTS.md`; `docs/project-config.json`; `docs/project-reference/project-structure-reference.md`; matching `docs/project-reference/*{domain-entities,backend-patterns,frontend-patterns,code-review-rules}*`; `docs/specs/`; `memory/`; user-referenced files; `plans/reports/council-*`; domain data (pricing -> revenue, architecture -> service map, tech stack -> dependencies).

**Code/architecture gate:** If question references existing code, services, files, or blast radius, run before framing:

```bash
python .claude/scripts/code_graph trace <key-file> --direction both --json
```

Skip graph only when `.code-graph/graph.db` missing or question is non-code.

**Framed question includes:** core decision, user context, workspace evidence, stakes, constraints, known unknowns. Keep the framing neutral and opinion-free. Ask exactly one clarifying question only if prompt is too vague.

---

## Step 2: Advisor Round

Spawn all 5 advisors simultaneously. Each gets identity, framed question, evidence rules, output constraints.

```text
You are [Advisor Name] on an LLM Council.
Thinking style: [advisor dimension from table]

Question:
---
[framed question]
---

EVIDENCE RULES:
- Code/architecture claims require `file:line`, graph trace, or "I don't have enough evidence yet."
- If existing code context is needed, run:
  python .claude/scripts/code_graph trace <file> --direction both --json
  python .claude/scripts/code_graph connections <file> --json
- Cite trace output for blast radius, callers, downstream impact.
- Confidence: 95-100% full trace | 80-94% main paths | 60-79% partial | <60% do not recommend.
- Do NOT speculate. Name missing evidence instead.

Respond from assigned angle. Direct, specific, unbalanced by design. Other advisors cover other angles.
Length: 150-300 words plus one-line confidence declaration. No preamble.
```

---

## Step 3: Peer Review Round

Collect responses. Randomize/anonymize as Response A-E. Spawn 5 fresh reviewers in parallel.

```text
You are reviewing an LLM Council.

Question:
---
[framed question]
---

Anonymized responses:
**Response A:** [response]
**Response B:** [response]
**Response C:** [response]
**Response D:** [response]
**Response E:** [response]

Answer:
1. Strongest response? Why?
2. Biggest blind spot? What is missing?
3. What did all five miss?

Reference responses by letter. Be specific. Under 200 words.
```

---

## Step 4: Chairman Synthesis

Chairman receives original question, framed question, de-anonymized advisor responses, peer reviews, anonymization map.

```text
You are Chairman of an LLM Council. Synthesize 5 advisors + peer reviews into final verdict.

Question:
---
[framed question]
---

ADVISOR RESPONSES:
**Contrarian:** [response]
**First Principles Thinker:** [response]
**Expansionist:** [response]
**Outsider:** [response]
**Executor:** [response]

PEER REVIEWS:
[all peer reviews]

Produce exact structure:
## Where the Council Agrees
[Independent convergences; high-confidence signals.]
## Where the Council Clashes
[Genuine disagreements. Present both sides; explain why reasonable advisors disagree.]
## Blind Spots the Council Caught
[Only emerged through peer review.]
## The Recommendation
[Clear direct recommendation. Not "it depends."]
## The One Thing to Do First
[Single concrete next step.]

Be direct. Do not hedge. Give clarity unavailable from one perspective.
```

**Quality loop:** If chairman misses required sections, ignores degraded-quality state, or makes unsupported code claims, repair with fresh chairman prompt. Max 3 repair rounds; then escalate with missing evidence.

---

## Step 5: Report Artifacts

Write both files; create `plans/reports/` if missing.

```text
plans/reports/council-{YYMMDD-HHMM}-{kebab-slug}.html
plans/reports/council-{YYMMDD-HHMM}-{kebab-slug}.md
```

`{YYMMDD-HHMM}` = session datetime. `{kebab-slug}` = 3-6 word question descriptor. Both share prefix. NEVER write artifacts to workspace root or `docs/`.

**HTML:** self-contained inline CSS, question top, prominent chairman verdict, agreement/disagreement visual, collapsed advisor responses, collapsed peer review highlights, footer timestamp/topic, professional briefing style, open after generation.

**Markdown transcript:** original question, framed question, all advisor responses, all peer reviews, anonymization mapping, chairman synthesis.

---

## Output Format

```text
Council complete.

Report: plans/reports/council-{YYMMDD-HHMM}-{kebab-slug}.html
Transcript: plans/reports/council-{YYMMDD-HHMM}-{kebab-slug}.md

Verdict: [1-2 sentence chairman recommendation]
First action: [single next step]
```

---

## Workflow Integration

Opt-in escalation hook from host skills. NEVER wire into `workflow-bugfix`, `workflow-refactor`, or `test-*` workflows. Blacklist is enforced at the `why-review` gate (Step A — workflow context check) before the 8-OR frontmatter gate evaluates.

| Host skill            | Mode                                       | Default                  | Gate                                                             |
| --------------------- | ------------------------------------------ | ------------------------ | ---------------------------------------------------------------- |
| `architecture-design` | Always-offer after `## Next Steps`         | Skip                     | User chooses                                                     |
| `tech-stack-research` | Always-offer after `## Next Steps`         | Skip                     | User chooses                                                     |
| `domain-analysis`     | Always-offer after `## Next Steps`         | Skip                     | User chooses                                                     |
| `why-review`          | Conditional on active plan/PBI frontmatter | Escalate when gate fires | Step A workflow blacklist suppression THEN 8-OR frontmatter gate |
| `prioritize`          | Conditional on ranking output              | Escalate when gate fires | RICE top-2 within 15%, MoSCoW tie, or stakeholder disagreement   |

### `why-review` Gate Schema

Gate fires when ANY field true. Absent fields default no-fire; gate opt-in via frontmatter, never opt-out.

| Field                  | Convention                             | Fires when                                  |
| ---------------------- | -------------------------------------- | ------------------------------------------- |
| `cross_service_impact` | `NONE` / `PARTIAL` / `FULL`            | value != `NONE`                             |
| `breaking_changes`     | bool                                   | true                                        |
| `complexity`           | `low` / `medium` / `high` / `critical` | `high`, `critical`, or `story_points >= 13` |
| `new_framework`        | bool                                   | true                                        |
| `irreversible`         | bool                                   | true                                        |
| `security_critical`    | bool                                   | true                                        |
| `performance_critical` | bool                                   | true                                        |
| `cost_high`            | bool                                   | true                                        |

Host prompt copy MUST cite cheaper rungs: `$why-review`, `$plan-validate`, `$llm-council`.

---

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing.** Before changing a constant, limit, flag, wording, or pattern, read nearby context and history.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** use council only for multi-option, hard-to-reverse, high-stakes decisions.

**Protocols in force — MUST ATTENTION (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** apply critical + sequential thinking; traced `file:line` proof, confidence >80% to act.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**IMPORTANT MUST ATTENTION** spawn 5 advisors in parallel, then 5 fresh peer reviewers in parallel, then chairman synthesis.
**IMPORTANT MUST ATTENTION** require evidence for code/architecture claims: `file:line`, graph trace, or explicit "insufficient evidence."
**IMPORTANT MUST ATTENTION** mark verdict degraded if fewer than 5 usable advisor responses return.
**IMPORTANT MUST ATTENTION** write paired HTML + Markdown artifacts under `plans/reports/` and open HTML.
**IMPORTANT MUST ATTENTION** after editing this skill, run `$sync-codex` to regenerate mirrors — NEVER hand-edit `.agents/` or `.codex/` (generated).

**Anti-Rationalization:**

| Evasion                         | Rebuttal                                                                                                 |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- |
| "This decision feels important" | Gate it: multi-option, hard-to-reverse, real stakes, multi-angle value.                                  |
| "One advisor can handle it"     | Council value comes from independent angles + anonymous peer review.                                     |
| "Sequential spawn is simpler"   | Sequential spawn contaminates independence. Parallel spawn required.                                     |
| "Four advisors is close enough" | Missing angle changes verdict quality. Mark degraded.                                                    |
| "Evidence would slow us down"   | Unsupported code/architecture claims are speculation. Use graph/file proof or say insufficient evidence. |

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)

## Shared AI-SDD Protocol Markers

Source: `.claude/skills/shared/sync-inline-versions.md`

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Trace every requirement or invariant through decision, task, TC/test, source evidence, and docs/spec update.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.
  **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
   **Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
   **Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

## Common AI Mistake Prevention (System Lessons)

- **Re-read files after context compaction.** Edit requires prior Read in same context; compaction wipes read state. Re-read before editing.
- **Grep for old terms after bulk replacements.** AI over-trusts find/replace completeness. Grep full repo after bulk edits for missed refs in docs/configs/catalogs.
- **Check downstream references before deleting.** Deletions cascade doc/code staleness. Map referencing files before removal.
- **After memory loss, check existing state before creating new.** Compaction wipes prior-work memory. Query current state to resume — never blindly duplicate.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace full dependency chain after edits.** Changing a definition misses downstream consumers. Trace the full chain.
- **When renaming, grep ALL consumer file types.** Some file types silently ignore missing refs (no compile error). Search code, templates, configs, generated files.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Update docs that embed canonical data when source changes.** Docs inlining derived data (workflows, schemas, configs) go stale silently. Update all embedding docs alongside source.
- **Verify sub-agent results after context recovery.** Background agents may finish while parent compacted — grep-verify output, don't trust assumed completion.
- **Cross-check full target list against sub-agent assignments.** Parallel sub-agents by category miss boundary items. Reconcile union of assignments against target list before proceeding.
- **Sub-agents inherit knowledge only from their agent .md definition — use custom agent types, not built-in Explore.** Tool adoption = permission + knowledge + enforcement (numbered workflow step).
- **Persist sub-agent findings incrementally, not as a final batch.** Long sub-agents hit cutoffs before final write — findings lost. Instruct append-per-section to report file.
- **When debugging, ask "whose responsibility?" before fixing.** Trace caller (wrong data) vs callee (wrong handling). Fix at responsible layer — never patch symptom site.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing.** Pattern-matching as "wrong" skips context. Before changing any constant/limit/flag: read comments, git blame, surrounding code.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic-first debugging — resist nearest-attention trap.** Don't dive into first plausible cause. List EVERY precondition (config, env vars, paths, DB, endpoints, creds, versions, DI, data). Verify each against evidence (grep/query — not reasoning). Ask "what would falsify this?" — if nothing, it's not a hypothesis. Most expensive failure: going deeper in "obvious" layer while bug sits in layer never questioned.
- **Surgical changes — apply the diff test (context-aware).** Two modes: (1) Bug fix → every line traces to the bug; no restyling; orphan cleanup only for imports YOUR changes made unused. (2) Review/enhancement → implement improvements AND announce as "Enhancement beyond main request: [what]". Never silently scope-creep. Diff test: "Would this line exist if I wasn't asked to do X?" — if no, delete or announce.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **[MANDATORY FIRST ACTION] ALWAYS activate a suitable skill or workflow BEFORE responding.** Match task against workflow catalog + skill list; invoke via skill invocation or `$start-workflow <workflowId>`. NEVER answer or write code before checking. Skip = protocol violation.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
