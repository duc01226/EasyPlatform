---
name: scan-codebase-health
version: 2.0.0
description: '[Documentation] Detect codebase health issues: unused exports, doc count-drift, orphan files, stale config references. Generic — reads project structure from project-config.json dynamically.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources, admit uncertainty, self-check output, cross-reference independently. Certainty without evidence = root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

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

## Quick Summary

**Goal:** Detect structural rot in AI-assisted codebases — dead code, count-drift, orphan files, stale configs, dead feature flags, broken cross-references. Works on any project via `docs/project-config.json`.

**Workflow:**

1. **Classify** — Load config, detect available tooling (graph.db, CI, feature-flag patterns)
2. **Run Detections** — Execute 7 detection categories (graph-dependent checks skipped if no graph.db)
3. **Fresh-Eyes Review** — Verify findings before writing report
4. **Generate Report** — Write to `plans/reports/codebase-health-scan-{YYMMDD}.md`
5. **Present Summary** — Show actionable findings with severity levels

**Key Rules:**

- Generic — reads all paths from project-config.json, never hardcodes project names
- Graceful degradation — graph-dependent checks skipped if `.code-graph/graph.db` not found
- Report format — each finding has `file:line`, category, severity (HIGH/MEDIUM/LOW), suggested action
  **MUST ATTENTION** NEVER report a finding without `file:line` proof

---

# Scan Codebase Health

## Phase 0: Classify & Detect

**Before any other step**, in parallel:

1. Read `docs/project-config.json` for the `codebaseHealth` section:

```json
{
    "codebaseHealth": {
        "sourcePaths": ["src/"],
        "docPaths": ["docs/"],
        "configPatterns": ["**/appsettings*.json", "**/environment*.ts"],
        "excludePaths": ["node_modules", "dist", "bin", "obj"]
    }
}
```

If `codebaseHealth` section missing, use defaults: `sourcePaths: ["src/"]`, `docPaths: ["docs/"]`.

2. Detect available tooling to determine which phases to run:

| Signal                                                                          | Phase Enabled                                     |
| ------------------------------------------------------------------------------- | ------------------------------------------------- |
| `.code-graph/graph.db` exists                                                   | Phase 3 (Unused Exports) + Phase 4 (Orphan Files) |
| CI config found (`.github/workflows`, `azure-pipelines.yml`)                    | Phase 6 (CI Health) — optional                    |
| Feature flag patterns found (`FeatureFlags`, `IFeatureManager`, `LaunchDarkly`) | Phase 6 (Dead Feature Flags)                      |
| Cross-reference patterns in docs (`file:line`, `[link]()`)                      | Phase 7 (Broken Cross-References)                 |

3. Create `TaskCreate` entries for each enabled phase before proceeding.

**Evidence gate:** If `docs/project-config.json` not found and no detectable source paths, report and ask user for guidance. DO NOT guess project structure.

## Phase 1: Doc Count-Drift Detection (No Graph Required)

**Think:** Which numeric claims in docs can actually be verified? What's the drift threshold that signals a real maintenance problem vs normal growth?

Scan `docs/` for numeric claims: "N files", "N tests", "N hooks", "N services", "N skills", "N components".
For each claim:

1. Extract number and what it counts
2. Glob/grep to verify actual count
3. Flag if actual differs from claimed

**Severity thresholds:**

- Drift ≤10% → LOW (normal growth)
- Drift >10% and ≤30% → MEDIUM (needs update)
- Drift >30% → HIGH (significantly stale)
- Claim cannot be verified → MEDIUM (ambiguous claim)

Write findings incrementally to report after each doc scanned. NEVER batch at end.

## Phase 2: Stale Config Reference Detection (No Graph Required)

**Think:** Which config values reference code artifacts (class names, module names, connection strings)? Could those artifacts have been renamed or deleted?

For each file matching `configPatterns`:

1. Extract class names, module names, or connection strings referenced
2. Grep codebase to verify each reference still exists
3. Flag missing references as HIGH severity

**Evidence gate:** NEVER flag a reference as stale without attempting grep. Confidence <80% → flag as MEDIUM "unverified" only.

## Phase 3: Unused Exports Detection (Graph Required)

**Skip if `.code-graph/graph.db` does not exist — log "Phase 3 skipped: no graph.db".**

**Think:** Which public API surface has zero consumers? Could be dead code, or could be an intentional entry point — distinguish by file type.

For key exported symbols in source files:

1. Run `python .claude/scripts/code_graph query importers_of <symbol> --json`
2. Flag symbols with zero importers as MEDIUM severity
3. Exclude known entry points (main files, test files, config files, startup files)

## Phase 4: Orphan File Detection (Graph Required)

**Skip if `.code-graph/graph.db` does not exist — log "Phase 4 skipped: no graph.db".**

Find source files (.ts,.cs,.py, etc.) with zero inbound edges:

1. Run `python .claude/scripts/code_graph query importers_of <file> --json`
2. Flag files with zero importers as LOW severity (may be entry points)
3. Exclude known entry points

## Phase 5: Pattern Drift Detection (No Graph Required)

**Think:** Where does the same pattern appear across services/modules? Does it look different in different places? Is that divergence intentional or accidental?

Compare the same pattern across services/modules:

1. Pick a pattern (e.g., repository registration, service configuration, error handling)
2. Grep across all services/modules
3. Flag inconsistencies as MEDIUM severity

## Phase 6: Dead Feature Flag Detection (If Feature Flags Detected)

**Skip if no feature flag patterns found in Phase 0.**

**Think:** Which flags exist in config but have no code references? Which code references flags that no longer exist in config?

1. Grep for feature flag names in config files
2. Grep for feature flag usage in code
3. Flag config-only flags (no code usage) as LOW
4. Flag code-only flags (no config entry) as HIGH (runtime error risk)

## Phase 7: Broken Cross-Reference Detection (No Graph Required)

**Think:** Which doc links point to files that no longer exist? Which `file:line` references in docs are stale?

For docs containing markdown links `[text](path)` or `file:line` references:

1. Extract all file path references
2. Glob to verify each path exists
3. Flag missing paths as MEDIUM severity

## Phase 8: Fresh-Eyes Review

**Before writing final report**, spawn a fresh sub-agent (zero memory) to:

- Sample 5-10 findings from the report
- Verify each has a real `file:line` evidence source
- Check: is the severity classification justified by the description?
- Flag false positives (things flagged but actually acceptable)

Max 2 rounds → escalate to user if review finds >30% false positive rate.

## Phase 9: Generate Report

Write to `plans/reports/codebase-health-scan-{YYMMDD}.md`:

```markdown
# Codebase Health Scan Report

**Date:** {YYYY-MM-DD}
**Phases Completed:** {N}/{total} ({reason for skipped phases})
**Findings:** {total} ({HIGH} high, {MEDIUM} medium, {LOW} low)

## Summary

| Phase                   | Status                              | Findings   |
| ----------------------- | ----------------------------------- | ---------- |
| Doc Count-Drift         | Scanned                             | N findings |
| Stale Config Refs       | Scanned                             | N findings |
| Unused Exports          | Scanned/Skipped (no graph.db)       | N findings |
| Orphan Files            | Scanned/Skipped (no graph.db)       | N findings |
| Pattern Drift           | Scanned                             | N findings |
| Dead Feature Flags      | Scanned/Skipped (no flags detected) | N findings |
| Broken Cross-References | Scanned                             | N findings |

## Findings

### HIGH Severity

- `{file}:{line}`: {description} — Action: {action}

### MEDIUM Severity

- `{file}:{line}`: {description} — Action: {action}

### LOW Severity

- `{file}:{line}`: {description} — Action: {action}

## False Positives (Fresh-Eyes Review)

{Findings dismissed by Round 2 review with reasoning}
```

---

<!-- SYNC:output-quality-principles:reminder -->

**IMPORTANT MUST ATTENTION** output quality: no counts/trees/TOCs, 1 example per pattern, lead with answer.

<!-- /SYNC:output-quality-principles:reminder -->
<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid:
>
> **Verify AI-generated content against actual code.** AI hallucinates class names/signatures. Grep to confirm existence before documenting.
> **Trace full dependency chain after edits.** Always trace full chain.
> **Holistic-first — resist nearest-attention trap.** List EVERY precondition before forming hypothesis.
> **Surface ambiguity before coding.** NEVER pick silently.

<!-- /SYNC:ai-mistake-prevention -->
<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** break work into small `TaskCreate` tasks BEFORE starting — one per phase
**IMPORTANT MUST ATTENTION** detect available tooling in Phase 0 — never assume graph.db exists
**IMPORTANT MUST ATTENTION** NEVER report a finding without `file:line` evidence
**IMPORTANT MUST ATTENTION** write findings incrementally after each phase — NEVER batch at end
**IMPORTANT MUST ATTENTION** severity thresholds are concrete: HIGH = runtime failure risk; MEDIUM = drift/dead code; LOW = cleanup candidate
**IMPORTANT MUST ATTENTION** Phase 8 fresh-eyes review is mandatory — prevents false positives from rationalization

**Anti-Rationalization:**

| Evasion                                      | Rebuttal                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------- |
| "Graph not needed, skip Phases 3-4"          | Phases 3-4 are explicitly gated — state skip reason in report, don't silently omit    |
| "Count drift is small, LOW severity is fine" | Apply the threshold table: >10% = MEDIUM, >30% = HIGH. No discretionary override.     |
| "Finding looks valid, skip Round 2 review"   | Main agent rationalizes own findings. Fresh-eyes is non-negotiable.                   |
| "No feature flags found, skip Phase 6"       | Log "Phase 6 skipped: no feature flag patterns detected" in report                    |
| "Config reference might still exist"         | Grep to verify. Confidence <80% → flag as MEDIUM "unverified" not LOW "probably fine" |

**[TASK-PLANNING]** Before acting, analyze task scope and break into small todo tasks and sub-tasks using TaskCreate.
