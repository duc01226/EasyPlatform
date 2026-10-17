---
name: scan-codebase-health
description: '[Documentation] Use when detecting codebase health issues: unused exports, doc count-drift, orphan files, stale config references.'
disable-model-invocation: true
---

> Codex compatibility note:
> - Invoke `$skill-name`: load the registered `.agents/skills/<name>/SKILL.md` and execute it with Codex tools; no separate `Skill` tool or Claude mode switch is needed. Author `.claude/**`; mirrors are generated.
> - Track steps before execution and keep progress/evidence current. Explicit skill requests execute their protocol. Use the native question tool for required questions.
> - Map foreign tool names to available host capabilities. A name mismatch needs no approval; an actually unavailable required capability stops with its step/evidence and a user question before adaptation.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Preserve protocol order unless the user approves a deviation. Workflows use `$start-workflow`: gates stay fixed; other steps may flex with logged reasons and evidence.
## Quick Summary

> **Review modes:** For review/audit work, standalone defaults to `--review-only` (`--report-only` alias); `--fix-loop` enables review → validate → authorized fix → fresh re-review, default cap 3. `--fix-loop --loop-owner=caller` returns a read-only pass to the caller that owns fixes/re-review. Create triage, review, validation and re-review todo tasks first; apply the carried `review-policy` contract for LOW deferral and user-approved bounded extensions. Non-review modes and terminal findings validation keep their own dispatch.

**Goal:** Detect structural rot — dead code, count-drift, orphan files, stale configs, dead feature flags and broken cross-references — in AI-assisted codebases through `docs/project-config.json`, then report evidence-backed maintenance actions.

**Summary:** Classify scope/tooling → check doc counts, config references, unused exports, orphan files, pattern drift, feature flags and cross-references → fresh-eyes verification → report → actionable summary. Log graph/flag-dependent skips; retain optional CI detection.

**Workflow:**

1. **Classify** — Load config, detect available tooling (graph.db, CI, feature-flag patterns)
2. **Run Detections** — Execute 7 detection categories (graph-dependent checks skipped if no graph.db)
3. **Fresh-Eyes Review** — Verify findings before writing report
4. **Generate Report** — Write to `tmp/reports/codebase-health-scan-{YYMMDD}.md`
5. **Present Summary** — Show actionable findings with severity levels

**Key Rules:**

- Generic — reads all paths from project-config.json, never hardcodes project names
- Graceful degradation — graph-dependent checks skipped if `.code-graph/graph.db` not found
- Report format — each finding has `file:line`, category, severity (HIGH/MEDIUM/LOW), suggested action
  **MUST ATTENTION** NEVER report a finding without `file:line` proof

---

## Contents

- [Quick Summary](#quick-summary)
- [Scan Codebase Health](#scan-codebase-health)
- [Phase 0: Classify & Detect](#phase-0-classify--detect)
- [Phase 1: Doc Count-Drift Detection (No Graph Required)](#phase-1-doc-count-drift-detection-no-graph-required)
- [Phase 2: Stale Config Reference Detection (No Graph Required)](#phase-2-stale-config-reference-detection-no-graph-required)
- [Phase 3: Unused Exports Detection (Graph Required)](#phase-3-unused-exports-detection-graph-required)
- [Phase 4: Orphan File Detection (Graph Required)](#phase-4-orphan-file-detection-graph-required)
- [Phase 5: Pattern Drift Detection (No Graph Required)](#phase-5-pattern-drift-detection-no-graph-required)
- [Phase 6: Dead Feature Flag Detection (If Feature Flags Detected)](#phase-6-dead-feature-flag-detection-if-feature-flags-detected)
- [Phase 7: Broken Cross-Reference Detection (No Graph Required)](#phase-7-broken-cross-reference-detection-no-graph-required)
- [Phase 8: Fresh-Eyes Review](#phase-8-fresh-eyes-review)
- [Phase 9: Generate Report](#phase-9-generate-report)
- [Closing Reminders](#closing-reminders)

# Scan Codebase Health

## Phase 0: Classify & Detect

**Before any other step**, in parallel:

1. Read `docs/project-config.json` for the `codebaseHealth` section:

```json
{
    "codebaseHealth": {
        "sourcePaths": ["{discovered-source-root}/"],
        "docPaths": ["docs/"],
        "configPatterns": ["**/appsettings*.json", "**/environment*.ts"],
        "excludePaths": ["node_modules", "dist", "bin", "obj"]
    }
}
```

If `codebaseHealth` section is missing, discover source roots from project config, manifests, and populated code directories; use `docPaths: ["docs/"]` when docs exist.

2. Detect available tooling to determine which phases to run:

| Signal                                                                          | Phase Enabled                                     |
| ------------------------------------------------------------------------------- | ------------------------------------------------- |
| `.code-graph/graph.db` exists                                                   | Phase 3 (Unused Exports) + Phase 4 (Orphan Files) |
| CI config found (`.github/workflows`, `azure-pipelines.yml`)                    | Phase 6 (CI Health) — optional                    |
| Feature flag patterns found (`FeatureFlags`, `IFeatureManager`, `LaunchDarkly`) | Phase 6 (Dead Feature Flags)                      |
| Cross-reference patterns in docs (`file:line`, `[link]()`)                      | Phase 7 (Broken Cross-References)                 |

3. Create todo tracking entries for each enabled phase before proceeding.

**Evidence gate:** If `docs/project-config.json` not found and no detectable source paths, report and ask user for guidance. DO NOT guess project structure.

## Phase 1: Doc Count-Drift Detection (No Graph Required)

Verify numeric claims against filesystem evidence; distinguish normal growth from maintenance drift using the thresholds below.

Scan `docs/` **and the AI-harness instruction surface when present** (`.claude/**/*.md`, root `AGENTS.md`, `CLAUDE.md`) for numeric claims: "N files", "N tests", "N hooks", "N services", "N skills", "N components", "N stages", "N verifiers", "N agents", "N workflows". Derive harness counts by globbing `.claude/` skill dirs, hook entries, `scripts/**/verify-*` scripts, pipeline stages, agent files and `workflows.json` entries. Prioritize these claims: artifact additions leave prose counts frozen. Apply to any `.claude/` harness; never hardcode project or framework counts.
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

Check whether configured code artifacts (class names, module names, connection strings) were renamed or deleted.

For each file matching `configPatterns`:

1. Extract class names, module names, or connection strings referenced
2. Grep codebase to verify each reference still exists
3. Flag missing references as HIGH severity

**Evidence gate:** NEVER flag a reference as stale without attempting grep. Confidence <80% → flag as MEDIUM "unverified" only.

## Phase 3: Unused Exports Detection (Graph Required)

**Skip if `.code-graph/graph.db` does not exist — log "Phase 3 skipped: no graph.db".**

Distinguish dead public API from intentional entry points by file type.

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

Compare patterns across services/modules, distinguishing intentional from accidental divergence:

1. Pick a pattern (e.g., repository registration, service configuration, error handling)
2. Grep across all services/modules
3. Flag inconsistencies as MEDIUM severity

## Phase 6: Dead Feature Flag Detection (If Feature Flags Detected)

**Skip if no feature flag patterns found in Phase 0.**

1. Grep for feature flag names in config files
2. Grep for feature flag usage in code
3. Flag config-only flags (no code usage) as LOW
4. Flag code-only flags (no config entry) as HIGH (runtime error risk)

## Phase 7: Broken Cross-Reference Detection (No Graph Required)

Check doc links and `file:line` references for missing or stale targets.

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

Max 3 review rounds → escalate to user if review finds >30% false positive rate.

## Phase 9: Generate Report

Write to `tmp/reports/codebase-health-scan-{YYMMDD}.md`:

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

> **[IMPORTANT]** Use todo tracking to break ALL work into small tasks BEFORE starting.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `output-quality-principles` — Readable guidance and verified contents for long skill/doc files; writing, updating or auditing a skill or reference document, or another Markdown artifact over 200 lines → .claude/skills/shared/protocols/output-quality-principles.md
- `review-decision-autonomy` — Choose supported review decisions and ask before extending the round budget; running any review or audit skill or mode → .claude/skills/shared/protocols/review-decision-autonomy.md
- `review-policy` — Review-only or a three-round fix loop with explicit extension and fresh post-fix evidence; deciding round eligibility, blocking findings or review state → .claude/skills/shared/protocols/review-policy.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:output-quality-principles:reminder -->

**IMPORTANT MUST ATTENTION** lead with useful guidance and readable priorities; preserve action-changing conditions/numbers and required structures. When writing, updating or auditing Markdown skill/doc content, verify top, heading-linked contents over 200 lines (stricter owner thresholds remain); refresh after edits and report gaps in read-only audits. Remove report bulk; judge semantic value rather than word counts.

<!-- /SYNC:output-quality-principles:reminder -->

<!-- SYNC:review-decision-autonomy:reminder -->

**MUST ATTENTION** Decide supported review choices and recommendations, record the rationale, and finish without routine user questions. Keep round-limit extension, indispensable facts and actual action authority; preserve source coverage, validation, tests, read-only boundaries and budgets. Review decisions do not accept open risks or make a failed gate pass.

<!-- /SYNC:review-decision-autonomy:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Detect structural rot — dead code, count-drift, orphan files, stale configs, dead feature flags and broken cross-references — in AI-assisted codebases through `docs/project-config.json`, then report evidence-backed maintenance actions.

**MUST ATTENTION Main steps:** classify scope/tooling → doc counts → config references → unused exports → orphan files → pattern drift → feature flags → cross-references → fresh-eyes verification → report → actionable summary. Log graph/flag-dependent skips and retain optional CI detection.

**IMPORTANT MUST ATTENTION** break work into small todo tracking tasks BEFORE starting — one per phase

**MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Output Quality:** honor the requested audit output; keep guide content actionable and use examples only when they clarify a necessary distinction.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

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

**[TASK-PLANNING]** Before acting, analyze task scope and break into small todo tasks and sub-tasks using todo tracking.


<!-- SYNC:review-policy:reminder -->

**MUST ATTENTION** Triage all targets, plan and create review/validation/fix/fresh re-review tasks first. Review-only reports without edits; fix-loop freshly reviews every repair under one fixing owner. Default cap three rounds: disclose deferred LOWs, ask and wait before a bounded extension for MEDIUM+ or failed required checks. Preserve scope, coverage and actual operation authority.

<!-- /SYNC:review-policy:reminder -->
