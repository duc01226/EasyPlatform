---
name: package-upgrade
description: '[Code Quality] Use when analyzing npm package upgrades, outdated dependencies or breaking changes and preparing a phased upgrade plan.'
---

> Codex compatibility note:
> - Invoke `$skill-name`: load the registered `.agents/skills/<name>/SKILL.md` and execute it with Codex tools; no separate `Skill` tool or Claude mode switch is needed. Author `.claude/**`; mirrors are generated.
> - Track steps before execution and keep progress/evidence current. Explicit skill requests execute their protocol. Use the native question tool for required questions.
> - Map foreign tool names to available host capabilities. A name mismatch needs no approval; an actually unavailable required capability stops with its step/evidence and a user question before adaptation.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Preserve protocol order unless the user approves a deviation. Workflows use `$start-workflow`: gates stay fixed; other steps may flex with logged reasons and evidence.
## Quick Summary

**Goal:** Analyze npm package dependencies, research latest versions and breaking changes, and generate a phased upgrade plan.

**Summary:** Inventory manifests and usage → research official version/migration evidence → assess risk and dependency order → write the phased report → obtain approval before migration → declare confidence and gaps. This skill analyzes npm packages; it does not implement upgrades.

**Workflow:**

1. **Inventory** — Discover all package.json files, catalog dependencies and usage
2. **Web Research** — Batch-research latest versions, breaking changes, migration guides (groups of 10)
3. **Risk Assessment** — Categorize risk (Critical/High/Medium/Low), build dependency upgrade order
4. **Report** — Generate comprehensive upgrade report with phased migration plan
5. **Approval Gate** — Present report for user confirmation before any action

**Key Rules:**

- Must read anti-hallucination protocols before executing
- Research only from official sources (npm, GitHub, official docs)
- Declare confidence level; if < 90%, request user verification

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Contents

- [Quick Summary](#quick-summary)
- [Frontend Package Upgrade Analysis & Planning](#frontend-package-upgrade-analysis--planning)
- [PHASE 1: PACKAGE INVENTORY & CURRENT STATE ANALYSIS](#phase-1-package-inventory--current-state-analysis)
- [PHASE 2: WEB RESEARCH & VERSION DISCOVERY](#phase-2-web-research--version-discovery)
- [PHASE 3: RISK ASSESSMENT & PRIORITIZATION](#phase-3-risk-assessment--prioritization)
- [PHASE 4: COMPREHENSIVE REPORT GENERATION](#phase-4-comprehensive-report-generation)
- [PHASE 5: APPROVAL GATE](#phase-5-approval-gate)
- [PHASE 6: CONFIDENCE DECLARATION](#phase-6-confidence-declaration)
- [Package Upgrade Guidelines](#package-upgrade-guidelines)
- [Closing Reminders](#closing-reminders)

# Frontend Package Upgrade Analysis & Planning

You are to operate as an expert frontend package management specialist, npm ecosystem analyst, and software architecture expert to analyze package.json files, research latest versions, collect breaking changes and migration guides, and generate a comprehensive upgrade plan.

**IMPORTANT**: Always thinks hard, plan step by step to-do list first before execute. Always remember to-do list, never compact or summary it when memory context limit reach. Always preserve and carry your to-do list through every operation.

---

## PHASE 1: PACKAGE INVENTORY & CURRENT STATE ANALYSIS

Build package inventory in `tmp/analysis/frontend-package-upgrade-analysis.md`.

### PHASE 1A: INITIALIZATION AND PACKAGE DISCOVERY

Initialize analysis file with:

- `## Metadata` - Original prompt and task description
- `## Progress` - Track phase, items processed, total items
- `## Package Inventory` - All package.json files and dependencies
- `## Version Research Results` - Latest versions and changelogs
- `## Breaking Changes Analysis` - Breaking changes catalog
- `## Migration Complexity Assessment` - Risk levels and effort estimates
- `## Upgrade Strategy` - Phased migration plan

**Find all package.json files**:

```
<frontend-workspace>/package.json
<frontend-workspace>/apps/*/package.json
<frontend-workspace>/libs/*/package.json
```

For each package.json, document:

- Project Name & Location
- Framework Version
- Dependencies (categorized: Framework, UI, Build Tools, Testing, Utilities)
- DevDependencies

Create **Master Package List** consolidating all unique packages.

### PHASE 1B: PACKAGE USAGE ANALYSIS

For each unique package, analyze codebase usage:

- **Projects Using**: Which projects depend on this
- **Import Count**: Number of files importing
- **Key Usage Areas**: Where primarily used
- **Configuration Files**: Config files for this package
- **Upgrade Risk Level**: Low/Medium/High/Critical based on usage breadth

---

## PHASE 2: WEB RESEARCH & VERSION DISCOVERY

**IMPORTANT: BATCH INTO GROUPS OF 10**

For EACH package in Master Package List:

### Latest Version Discovery

- Search: "[package-name] npm latest version"
- Check: https://www.npmjs.com/package/[package-name]
- Extract: Latest stable version, release date, downloads

### Breaking Changes Research

- Search: "[package-name] migration guide [old-version] to [new-version]"
- Search: "[package-name] v[X] breaking changes"
- Search: "[package-name] changelog"
- GitHub: Check CHANGELOG.md, releases

### Ecosystem Compatibility

- Frontend framework version compatibility
- Check peerDependencies
- Cross-package dependencies

Document:

- Current vs. Latest versions
- Version gap (major/minor/patch versions behind)
- Breaking changes with migration steps
- Deprecation warnings
- Peer dependency changes

---

## PHASE 3: RISK ASSESSMENT & PRIORITIZATION

### Risk Categories

- **Critical Risk**: 5+ major versions behind, framework packages, 50+ breaking changes
- **High Risk**: 3-4 major versions, state management, 20-30 breaking changes
- **Medium Risk**: 1-2 major versions, some breaking changes
- **Low Risk**: Patch/minor updates, backward compatible

### Dependency Graph (Upgrade Order)

1. Foundation packages (Node.js, TypeScript)
2. Framework packages (core packages, CLI/build tooling)
3. Framework extensions (Material, RxJS)
4. Third-party libraries
5. Dev tools last

---

## PHASE 4: COMPREHENSIVE REPORT GENERATION

Generate report at `tmp/reports/package-upgrade/[YYYY-MM-DD]-frontend-package-upgrade-report.md`:

### Report Structure

1. **Executive Summary**
2. **Package Inventory by Project**
3. **Version Gap Analysis**
4. **Breaking Changes Catalog**
5. **Migration Complexity Assessment**
6. **Ecosystem Compatibility Analysis**
7. **Recommended Upgrade Strategy** (Phased Migration Plan)
8. **Detailed Migration Guides**
9. **Testing Strategy**
10. **Rollback Plan**
11. **Timeline & Resource Estimation**
12. **Appendices**

---

## PHASE 5: APPROVAL GATE

**CRITICAL**: Present comprehensive package upgrade report for explicit approval. **DO NOT** proceed without it.

---

## PHASE 6: CONFIDENCE DECLARATION

Before marking complete, provide:

### Solution Confidence Assessment

**Overall Confidence**: [High 90-100% / Medium 70-89% / Low <70%]

**Evidence Summary**:

- All package.json files discovered: [count]
- Web research completed: [X/Y packages]
- Breaking changes documented: [count]
- Official sources used: npm, GitHub, official docs

**Assumptions Made**: [List or "None"]

**User Confirmation Needed**:

- IF confidence < 90%: "Please verify [specific packages] before proceeding"
- IF confidence >= 90%: "Analysis is comprehensive, ready for migration"

---

## Package Upgrade Guidelines

- **Comprehensive Discovery**: Find ALL package.json files
- **Web Research Accuracy**: Use official sources only (npm, GitHub, official docs)
- **Breaking Changes Focus**: Prioritize identifying breaking changes requiring code changes
- **Risk Assessment**: Evaluate complexity based on breaking changes, usage breadth, dependencies
- **Practical Planning**: Create actionable phased plan with realistic effort estimates
- **Evidence-Based Decisions**: Base ALL recommendations on actual research with sources cited
- **Confidence Declaration**: Declare confidence level; if < 90%, request user confirmation
- **Batch Processing**: Research packages in batches of 10

---

> **[IMPORTANT]** Use todo tracking to break ALL work into small tasks BEFORE starting. This prevents context loss from long files. Keep task depth proportional to the work.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `evidence-based-reasoning` — Ground every material claim in file:line, config or source evidence, with stated confidence; making any claim, finding or recommendation → .claude/skills/shared/protocols/evidence-based-reasoning.md
- `source-test-drift-check` — When source behavior changes, reconcile the affected tests from evidence; code, fix, test or review work changes behavior → .claude/skills/shared/protocols/source-test-drift-check.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

## Closing Reminders

**Goal:** Analyze npm dependencies and produce an evidence-backed phased upgrade plan.
**MUST ATTENTION Route:** inventory manifests/usage → research official sources → assess risk/order → report → obtain migration approval → declare confidence and gaps. Keep the report under `tmp/reports/`; research is not authorization to change dependencies.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Source/Test Drift:** on source change, evidence-decide whether tests update or source is a bug.
- **Evidence:** cite `file:line` for every claim; confidence >80% to act, <60% don't recommend.

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using todo tracking BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
  **MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using todo tracking.
