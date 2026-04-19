---
name: scan-feature-docs
version: 1.0.0
description: '[Documentation] Scan project and populate/sync docs/project-reference/feature-docs-reference.md with app-to-service mapping, doc structure, templates, and documentation conventions.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> - **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> - **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> - **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> - **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> - **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> - **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> - **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> - **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> - **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> - **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->

**Prerequisites:** **MUST ATTENTION READ** before executing:

<!-- SYNC:scan-and-update-reference-doc -->

> **Scan & Update Reference Doc** — When updating reference docs: (1) Read existing doc first. (2) Scan codebase for current state (grep/glob). (3) Diff findings vs doc content. (4) Update ONLY sections where code diverged from doc. (5) Preserve manual annotations. (6) Update metadata (date, counts). NEVER rewrite entire doc — surgical updates only.

<!-- /SYNC:scan-and-update-reference-doc -->

<!-- SYNC:output-quality-principles -->

> **Output Quality** — 10 rules for reference docs: (1) No inventories/counts, (2) No directory trees, (3) No TOCs, (4) Rules over descriptions, (5) 1 example per pattern, (6) Tables over prose, (7) Primacy-recency anchoring (critical rules in first+last 5 lines), (8) No checkbox checklists — use "MUST ATTENTION verify X", (9) Min density: 8 MUST ATTENTION/NEVER/ALWAYS per 100 lines, (10) Verify base class names and code examples preserved.

<!-- /SYNC:output-quality-principles -->

## Quick Summary

**Goal:** Scan existing business feature documentation and populate `docs/project-reference/feature-docs-reference.md` with app-to-service mapping, documentation structure conventions, template usage, and section standards.

**Workflow:**

1. **Read** — Load current target doc, detect init vs sync mode
2. **Scan** — Discover documentation patterns via parallel sub-agents
3. **Report** — Write findings to external report file
4. **Generate** — Build/update reference doc from report
5. **Verify** — Validate discovered paths and templates exist

**Key Rules:**

- Generic — works with any documentation structure (docs/, wiki/, etc.)
- Discover documentation organization dynamically from file system
- Map relationships between apps/services and their documentation
- Every reference must point to real files found in this project

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Scan Feature Docs

## Phase 0: Read & Assess

1. Read `docs/project-reference/feature-docs-reference.md`
2. Detect mode: init (placeholder) or sync (populated)
3. If sync: extract existing sections and note what's already well-documented

## Phase 1: Plan Scan Strategy

Discover documentation locations:

- `docs/` directory structure (business features, architecture, guides)
- `docs/business-features/` or similar feature doc directories
- `docs/templates/` or similar template directories
- README.md files across service directories
- Wiki or external doc references in config files

Use `docs/project-config.json` if available for module lists and app mappings.

## Phase 2: Execute Scan (Parallel Sub-Agents)

Launch **2 Explore agents** in parallel:

### Agent 1: Documentation Structure

- Glob for `docs/**/*.md` to map full documentation tree
- Find documentation templates (template files, skeleton docs)
- Discover documentation section patterns (recurring H2/H3 headings across docs)
- Identify INDEX.md / README.md hub files and their link structures
- Count docs per app/module to assess coverage distribution
- Identify documentation naming patterns across feature docs

### Agent 2: App-to-Service Mapping

- Map frontend apps to backend services (from config, imports, or API calls)
- Find API reference docs and their relationship to services
- Discover troubleshooting docs and their coverage
- Find cross-references between docs (links, mentions)
- Identify documentation conventions (naming, numbering, tagging patterns)
- Look for doc generation tools or scripts

Write all findings to: `plans/reports/scan-feature-docs-{YYMMDD}-{HHMM}-report.md`

## Phase 3: Analyze & Generate

Read the report. Build these sections:

### Target Sections

| Section                       | Content                                                      |
| ----------------------------- | ------------------------------------------------------------ |
| **App-to-Service Mapping**    | Table: App name, Backend services, Doc directory, Doc count  |
| **Directory Structure**       | Tree showing docs/ organization with purpose annotations     |
| **Template Paths**            | Table: Template name, Path, Purpose, Used by N docs          |
| **Section Structure**         | Standard sections found across feature docs (with frequency) |
| **Documentation Conventions** | Naming conventions, numbering schemes, required fields       |
| **Evidence Rules**            | How docs reference code (file:line patterns, test case IDs)  |
| **Coverage Gaps**             | Apps/services without documentation, incomplete docs         |

### Content Rules

- Use tables for all structured data (mappings, templates, conventions)
- Include actual directory tree output (top 3 levels)
- Show section heading patterns with frequency counts
- Highlight well-documented vs under-documented areas

## Phase 4: Write & Verify

1. Write updated doc with `<!-- Last scanned: YYYY-MM-DD -->` at top
2. Verify: 3 template paths exist on filesystem
3. Verify: app-to-service mappings match actual directory structure
4. Report: sections updated, coverage statistics, gaps identified

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
  **MANDATORY IMPORTANT MUST ATTENTION** READ the following before starting:
  <!-- SYNC:scan-and-update-reference-doc:reminder -->
- **IMPORTANT MUST ATTENTION** read existing doc first, scan codebase, diff, surgical update only. Never rewrite entire doc.
    <!-- /SYNC:scan-and-update-reference-doc:reminder -->
    <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
      <!-- /SYNC:critical-thinking-mindset:reminder -->
      <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
      <!-- /SYNC:ai-mistake-prevention:reminder -->
