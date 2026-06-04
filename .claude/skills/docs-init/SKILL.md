---
name: docs-init
version: 2.0.0
description: '[Documentation] Use when you need to initialize project reference docs via hook + scan skills.'
disable-model-invocation: true
---

## Quick Summary

**Goal:** Initialize project reference documentation by verifying the `session-init-docs.cjs` hook has created placeholder files, then running scan skills to populate them.

**Workflow:**

1. **Verify** -- Check that `session-init-docs.cjs` hook has created placeholder docs in `docs/`
2. **List** -- Show which reference docs exist and which are still placeholders
3. **Populate** -- Ask user which scan skills to run (or run all)

**Key Rules:**

- Let the hook create placeholders automatically -- do not create docs manually
- Each reference doc has a corresponding `/scan-*` skill that populates it
- Scan skills do deep codebase scanning; expect 5-15 min per skill

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Step 1: Verify Reference Doc Stubs

Check that `session-init-docs.cjs` has created the project reference docs declared for the project:

1. Read `docs/project-config.json` and use `referenceDocs[*].filename` as the source of truth.
2. If `referenceDocs` is empty or missing, use `DEFAULT_REFERENCE_DOCS` from `.claude/hooks/lib/session-init-helpers.cjs`.
3. Do not manually add missing `docs/project-reference/` files. Add or correct the project config/template entry first, then rerun the session-init/docs-init path.

Common mappings when configured:

```
docs/project-reference/project-structure-reference.md     -> /scan --target=project-structure
docs/project-reference/backend-patterns-reference.md      -> /scan --target=backend-patterns
docs/project-reference/seed-test-data-reference.md       -> /scan --target=seed-test-data
docs/project-reference/frontend-patterns-reference.md     -> /scan --target=frontend-patterns
docs/project-reference/integration-test-reference.md      -> /scan --target=integration-tests
docs/project-reference/feature-spec-reference.md          -> /scan --target=feature-spec
docs/project-reference/spec-system-reference.md           -> static template (no scan skill)
docs/project-reference/spec-principles.md                -> static template (no scan skill)
docs/project-reference/workflow-spec-test-code-cycle-reference.md -> static template (no scan skill)
docs/project-reference/code-review-rules.md              -> /scan --target=code-review-rules
docs/project-reference/scss-styling-guide.md             -> /scan --target=scss-styling
docs/project-reference/design-system/README.md           -> /scan --target=design-system
docs/project-reference/e2e-test-reference.md             -> /scan --target=e2e-tests
docs/project-reference/domain-entities-reference.md      -> /scan --target=domain-entities
docs/project-reference/docs-index-reference.md           -> /scan --target=docs-index
docs/project-reference/lessons.md                        -> /learn (managed separately)
```

If configured files are missing, the hook should create them on next prompt/session start. Verify by checking `docs/project-reference/` against the configured filenames.

## Step 2: Detect Placeholder vs Populated

Read the first 512 bytes of each file. If it contains `<!-- Fill in your project's details below. -->`, it is still a placeholder and needs scanning.

## Step 3: Offer Scan Options

Use `AskUserQuestion` to present:

1. **"Run /claude-md-init + all configured scan skills" (Recommended for first-time init)** -- Generates CLAUDE.md from config, then runs scan skills for configured docs
2. **"Run configured scan skills only"** -- Runs scan skills without CLAUDE.md generation
3. **"Select specific skills"** -- Let user choose which ones to run
4. **"Skip -- docs are already populated"** -- Exit if all docs have content

For each selected scan target, invoke it via the Skill tool (e.g., `/scan --target=backend-patterns`).

## Step 4: M1-M5 Compliance Gate (BLOCKING)

See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M6)" for BLOCKING criteria. After the scan skills generate/populate the reference docs, gate the generated output:

- **M1/M2 — tech-agnostic prose:** Spec/feature-facing docs (and any populated `spec-principles.md` extension) keep narrative and headings free of framework/product/language/design-pattern names and source identifiers; those appear only in evidence carriers (`[Source: namespace/service/id]`, `**Evidence**`), frontmatter, and Mermaid. Authority: `docs/project-reference/spec-principles.md` §3.
- **M3 — logical-IDs-first:** Where docs carry requirements/rules/TCs, the logical IDs (`FR-`/`BR-`/`OP-`/`TC-`) are the primary spine and `[Source: namespace/service/id]` (a stack-portable abstract anchor — never physical code coordinates or repository-root paths; physical coords live only in the provenance sidecar) is the secondary carrier.
- **M4/M5 — implementability:** Generated content is testable, observable, one-interpretation, and sufficient to rebuild the described behavior on any stack.

**Verification step (run after generation):** Run the exact SDD compliance verifier documented by the project and resolve any failures before declaring init complete. Do not invent a verifier command; if the verifier or project config is not yet initialized, record that and re-run once available.

## Configuration

Reference doc definitions are in `docs/project-config.json` under `referenceDocs`. The hook reads this config to determine which files to create. Static local-extension docs use `.claude/templates/reference-docs/` templates. See `.claude/hooks/session-init-docs.cjs` for the full implementation.

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

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

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
