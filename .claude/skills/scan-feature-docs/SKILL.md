---
name: scan-feature-docs
version: 2.0.0
last_reviewed: 2026-04-22
description: '[Documentation] Scan project and populate/sync docs/project-reference/feature-docs-reference.md with app-to-service mapping, doc structure, templates, and documentation conventions.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks per file read. Prevents context loss from long files. Simple tasks: ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources, admit uncertainty, self-check output, cross-reference independently. Certainty without evidence = root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid:
>
> - **Verify AI-generated content against actual code.** AI hallucinates file paths and section headings. Glob to confirm existence before documenting.
> - **Trace full dependency chain after edits.** Always trace full chain.
> - **Surface ambiguity before coding.** NEVER pick silently.
> - **Check downstream references before deleting.** Map referencing files before removal.

<!-- /SYNC:ai-mistake-prevention -->

**Prerequisites:** **MUST ATTENTION READ** before executing:

<!-- SYNC:scan-and-update-reference-doc -->

> **Scan & Update Reference Doc** — Surgical updates only, NEVER full rewrite.
>
> 1. **Read existing doc** first — understand structure and manual annotations
> 2. **Detect mode:** Placeholder (headings only) → Init. Has content → Sync.
> 3. **Scan codebase** (grep/glob) for current state
> 4. **Diff** findings vs doc — identify stale sections only
> 5. **Update ONLY** diverged sections. Preserve manual annotations.
> 6. **Update metadata** (date, version) in frontmatter/header
> 7. **NEVER** rewrite entire doc. **NEVER** remove sections without evidence obsolete.

<!-- /SYNC:scan-and-update-reference-doc -->

> **Output note:** This skill's primary output (`feature-docs-reference.md`) MUST include the actual directory tree — it is the source of truth for doc locations. This is intentionally different from spec output documents which suppress directory trees.

## Quick Summary

**Goal:** Scan existing business feature documentation → populate `docs/project-reference/feature-docs-reference.md` with app-to-service mapping, documentation structure conventions, template usage, and section standards.

**Workflow:**

1. **Classify** — Detect doc mode and documentation structure type
2. **Scan** — Parallel sub-agents discover structure and app-service mappings
3. **Report** — Write findings incrementally
4. **Generate** — Build/update reference doc from report
5. **Fresh-Eyes** — Round 2 verification validates paths and mappings

**Key Rules:**

- Generic — works with any documentation structure
- Discover organization dynamically from file system
- Every reference must point to real files

---

# Scan Feature Docs

## Phase 0: Classify Doc Mode & Structure

**[BLOCKING]** Determine mode before any other step:

```bash
test -f docs/project-reference/feature-docs-reference.md && echo "SYNC mode" || echo "INIT mode"
```

| Mode      | Condition                                  | Behavior                                                   |
| --------- | ------------------------------------------ | ---------------------------------------------------------- |
| **INIT**  | `feature-docs-reference.md` does not exist | Create from scratch; scan entire `docs/business-features/` |
| **SYNC**  | `feature-docs-reference.md` exists         | Read existing file first; update changed sections only     |
| **FORCE** | User explicitly says "rebuild" or "reset"  | Treat as INIT even if file exists                          |

Detect documentation structure type:

| Signal                                      | Type                            | Scan Approach                       |
| ------------------------------------------- | ------------------------------- | ----------------------------------- |
| `docs/business-features/{App}/` directories | BravoSUITE-style (app-bucketed) | Scan per-app, map to services       |
| `docs/features/{Feature}.md` flat structure | Feature-per-file                | Scan each file, derive categories   |
| `wiki/` or external doc system links        | Wiki-based                      | Scan wiki references, note external |
| README.md embedded in service dirs          | Source-embedded                 | Scan `src/**/*.md` files            |

**Path:** INIT → Phase 1 → Phase 2 (full scan) → Phase 3 (full write) → Phase 4 (verify)
**Path:** SYNC → Phase 0 read existing → Phase 1 → Phase 2 (diff scan, new/changed only) → Phase 3 (targeted update) → Phase 4 (verify)

## Phase 1: Plan Scan Strategy

Create `TaskCreate` entries for each sub-agent and each verification step.

Discover documentation locations:

- `docs/` directory structure (business features, architecture, guides)
- `docs/business-features/` or similar feature doc directories
- `docs/templates/` or similar template directories
- README.md files across service directories

Use `docs/project-config.json` if available for module lists and app mappings.

## Phase 2: Execute Scan (Parallel Sub-Agents)

Launch **2 general-purpose sub-agents** in parallel. Each MUST:

- Write findings incrementally after each section — NEVER batch at end
- Cite `file:line` for every finding
- Confidence: >80% document; 60-80% note as "observed (unverified)"; <60% omit

All findings → `plans/reports/scan-feature-docs-{YYMMDD}-{HHMM}-report.md`

### Agent 1: Documentation Structure

**Think (Coverage dimension):** Which apps/modules have feature documentation? Which are missing? What's the distribution — evenly documented or concentrated?

**Think (Accuracy dimension):** What section headings actually appear across feature docs? What's the frequency? Which sections are standard (≥80% coverage) vs optional (20-80%) vs rare (<20%)?

**Think (Completeness dimension):** Are there documentation naming patterns? Section numbering? Required fields (evidence fields, TC IDs, CHANGELOG)?

- Glob for `docs/**/*.md` to map full documentation tree
- Find documentation templates (template files, skeleton docs)
- Discover documentation section patterns (recurring H2/H3 headings across docs)
- Count docs per app/module to assess coverage distribution
- Identify documentation naming patterns across feature docs

### Agent 2: App-to-Service Mapping

**Think (Relationships dimension):** Which frontend apps map to which backend services? Where is this documented vs inferred? Which apps have no service mapping?

**Think (Conventions dimension):** What naming, numbering, and tagging conventions appear consistently? Are TC IDs present? What format?

- Map frontend apps to backend services (from config, imports, or API calls)
- Find API reference docs and their relationship to services
- Discover troubleshooting docs and their coverage
- Find cross-references between docs (links, mentions)
- Look for doc generation tools or scripts

## Phase 3: Analyze & Generate

Read report. Apply fresh-eyes protocol:

**Round 1 (main agent):** Build section drafts.

**Round 2 (fresh sub-agent, zero memory):**

- Does every template path in the Templates section exist on filesystem?
- Does the app-to-service mapping match actual directory structure?
- Are coverage distribution numbers based on real glob counts?
- Are undocumented apps explicitly listed (not silently omitted)?

### Target Sections

| Section                       | Content                                                      |
| ----------------------------- | ------------------------------------------------------------ |
| **App-to-Service Mapping**    | Table: App name, Backend services, Doc directory, Doc count  |
| **Directory Structure**       | Tree showing docs/ organization with purpose annotations     |
| **Template Paths**            | Table: Template name, Path, Purpose, Used by N docs          |
| **Section Structure**         | Standard sections across feature docs (with frequency table) |
| **Documentation Conventions** | Naming, numbering, required fields, evidence rules           |
| **Coverage Gaps**             | Apps/services without documentation, incomplete docs         |

### Content Rules

- Use tables for all structured data (mappings, templates, conventions)
- Include actual directory tree output (top 3 levels) — **this skill intentionally includes trees**
- Section heading patterns with frequency percentages
- Coverage Gaps section is mandatory — list undocumented areas explicitly

## Phase 4: Write & Verify

1. Write updated doc with `<!-- Last scanned: YYYY-MM-DD -->` at top
2. Surgical update only — preserve unchanged sections
3. **Verify these 3 template paths exist:**
    - `docs/business-features/{Module}/detailed-features/README.{FeatureName}.md` — feature doc template
    - `.claude/skills/feature-docs/SKILL.md` — feature doc generation skill
    - `.claude/skills/shared/tc-format.md` — canonical TC format
4. Verify app-to-service mappings match actual directory structure
5. Verify Coverage Gaps section is present
6. Report: sections updated, coverage statistics, gaps identified

---

## Closing Reminders

- **[REQUIRED]** break work into small `TaskCreate` tasks BEFORE starting
- **[REQUIRED]** cite `file:line` evidence for every claim (confidence >80% to act)
- **[REQUIRED]** detect doc mode (INIT/SYNC) in Phase 0 — it is BLOCKING
- **[REQUIRED]** sub-agents write findings incrementally after each section — NEVER batch at end
- **[REQUIRED]** Coverage Gaps section is mandatory — NEVER silently omit undocumented apps
- **[REQUIRED]** Round 2 fresh-eyes validation before writing final doc
      <!-- SYNC:scan-and-update-reference-doc:reminder -->
- **[REQUIRED]** read existing doc first, scan codebase, diff, surgical update only. Never rewrite entire doc.
      <!-- /SYNC:scan-and-update-reference-doc:reminder -->
      <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
      <!-- /SYNC:critical-thinking-mindset:reminder -->
      <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
      <!-- /SYNC:ai-mistake-prevention:reminder -->

**Anti-Rationalization:**

| Evasion                                     | Rebuttal                                                                     |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| "Mode obvious, skip Phase 0 detection"      | Phase 0 mode detection is BLOCKING — INIT vs SYNC paths differ significantly |
| "Coverage Gaps not needed"                  | Coverage Gaps is a required section — omitting it hides maintenance debt     |
| "Template paths probably exist"             | Verify all 3 template paths exist before writing — "probably" ≠ verified     |
| "App-service mapping looks right"           | Verify mappings match actual directory structure via glob                    |
| "Round 2 not needed for documentation scan" | Main agent rationalizes own section extractions. Fresh-eyes mandatory.       |

**[TASK-PLANNING]** Before acting, analyze task scope and break into small todo tasks and sub-tasks using TaskCreate.
