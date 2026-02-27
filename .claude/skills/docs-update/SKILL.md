---
name: docs-update
description: '[Docs] ⚡⚡⚡ Analyze the codebase and update documentation (general + feature docs)'
---

# Documentation Update (Holistic)

Update general project documentation AND run feature-specific documentation updates when source code changes are detected.

> **⛔ MANDATORY:** This skill is the SINGLE documentation orchestrator. After updating general docs (Phase 2), you MUST run Phase 3 to evaluate and execute `/feature-docs` for any module with source code changes. Do NOT skip Phase 3. Do NOT consider documentation complete until Phase 3 has run.

## Summary

| Phase | Action | Key Notes |
|-------|--------|-----------|
| 0 | Change Detection | Detect changed modules from git diff; decide feature-docs trigger |
| 1 | Parallel Codebase Scouting | Spawn scouts to gather file context |
| 2 | General Documentation Update | README, PDR, architecture, code standards |
| 3 | **Feature Documentation (MANDATORY)** | Evaluate and invoke `/feature-docs` per affected module, or log skip reason |

---

## Phase 0: Change Detection

Determine which modules have source code changes that may require documentation updates.

### Steps

1. **Detect changes** — Run both, merge and deduplicate:
   - `git diff --name-only` (unstaged)
   - `git diff --cached --name-only` (staged)

2. **Map files to modules** — For each changed file, extract the module:
   - `src/Backend/PlatformExampleApp.{Module}.*/**` → `{Module}` (e.g., `TextSnippet`)
   - `src/Frontend/apps/playground-text-snippet/**` → `TextSnippet`
   - `src/Frontend/libs/**` → skip (shared libraries)
   - `src/Platform/**` → skip (framework)
   - `docs/**`, `.claude/**`, `plans/**` → skip (non-source paths)
   - Other paths → skip

3. **Find existing feature docs** — For each identified module:
   - Search `docs/business-features/{Module}/detailed-features/README.*.md`
   - Also search `docs/features/README.*.md`
   - If docs exist → mark module for Phase 3 feature-docs update
   - If no docs exist → log "No feature docs found for {Module}, skipping"

4. **Store detection result** — Remember which modules need feature-docs updates for Phase 3.

### Skip Conditions (No Feature-Docs Trigger)

Skip feature-docs entirely if:
- No changed files detected (clean working tree)
- All changes are in non-source paths (docs, config, tests, plans only)
- No modules could be identified from changed file paths
- No existing feature docs found for any identified module

---

## Phase 1: Parallel Codebase Scouting

**You (main agent) must spawn scouts** - subagents cannot spawn subagents.

1. Run `ls -la` to identify actual project directories
2. Spawn 2-4 `scout-external` (preferred, uses Gemini 2M context) or `scout` (fallback) via Task tool
3. Target directories **that actually exist** - adapt to project structure, don't hardcode paths
4. Merge scout results into context summary

---

## Phase 2: General Documentation Update (docs-manager Agent)

Pass the gathered file list to `docs-manager` agent to update documentation:

- `README.md`: Update README (keep it under 300 lines)
- `docs/project-overview-pdr.md`: Update project overview and PDR (Product Development Requirements)
- `docs/codebase-summary.md`: Update codebase summary
- `docs/code-standards.md`: Update codebase structure and code standards
- `docs/system-architecture.md`: Update system architecture
- `docs/project-roadmap.md`: Update project roadmap
- `docs/deployment-guide.md` [optional]: Update deployment guide
- `docs/design-guidelines.md` [optional]: Update design guidelines

---

## Phase 3: Feature Documentation Update (MANDATORY)

> **⛔ YOU MUST EXECUTE THIS PHASE.** This is not optional. After Phase 2, you must evaluate feature-docs needs and either invoke `/feature-docs` or log a skip reason with evidence.

### Step 3.1: Evaluate Phase 0 Results

Review the modules and detection results collected in Phase 0.

### Step 3.2: Execute Based on Results

**If modules with existing feature docs were detected:**

For EACH module identified in Phase 0 that has existing feature docs:

1. **Invoke the `/feature-docs` skill** using the Skill tool:
   ```
   Skill: feature-docs
   Args: {Module}
   ```
   This triggers the feature-docs skill which updates feature-specific documentation (26-section business docs, API reference, test specs) incrementally based on changed files.

2. **Log result:** `"Feature docs: TRIGGERED for {Module} — source changes detected in {count} files"`

3. **Repeat** for each affected module.

**If NO modules detected (all skip conditions met):**

1. **Log with evidence:** `"Feature docs: SKIPPED — [reason]"` where reason is one of:
   - "clean working tree (no changed files)"
   - "all changes in non-source paths: {list paths}"
   - "no modules identified from changed paths"
   - "no existing feature docs found for modules: {list modules}"
2. Proceed to completion.

### Phase 3 Checklist

- [ ] Phase 0 detection results reviewed
- [ ] For each detected module: `/feature-docs {Module}` invoked OR skip reason logged
- [ ] All feature-docs invocations completed successfully
- [ ] Final log entry confirming Phase 3 completion

---

## Additional requests

<additional_requests>
$ARGUMENTS
</additional_requests>

## [CRITICAL] Code Evidence Requirements

All documentation MUST follow evidence rules from `.claude/skills/feature-docs/SKILL.md` → `[CRITICAL] MANDATORY CODE EVIDENCE RULE`

### Quick Reference

- **Format**: `**Evidence**: {FilePath}:{LineNumber}`
- **Status**: ✅ Verified / ⚠️ Stale / ❌ Missing
- **Verification**: 3-pass verification required before completion

### Stale Evidence Detection

When updating documentation:

1. **Read actual source files** at claimed line numbers
2. **Verify evidence matches** documented behavior
3. **Update stale references** - mark with ⚠️ if line numbers changed
4. **Refresh line numbers** after code changes

### Evidence Verification Table (Required)

| Entity/Component | Documented Lines | Actual Lines | Status      |
| ---------------- | ---------------- | ------------ | ----------- |
| `Entity.cs`      | L6-15            | L6-15        | ✅ Verified |
| `Handler.cs`     | L45-60           | L52-67       | ⚠️ Stale    |

## Important

- Use `docs/` directory as the source of truth for documentation.

**IMPORTANT**: **Do not** start implementing.

## IMPORTANT Task Planning Notes

- Always plan and break many small todo tasks
- Always add a final review todo task to review the works done at the end to find any fix or enhancement needed
