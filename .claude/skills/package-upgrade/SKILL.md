---
name: package-upgrade
version: 1.0.1
description: '[Code Quality] Use when the user asks to analyze package upgrades, check for outdated dependencies, plan npm/NuGet updates, or assess breaking changes in package updates. Triggers on keywords like "upgrade packages", "outdated", "npm update", "breaking changes", "dependency upgrade", "package update", "version upgrade".'
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

## Quick Summary

**Goal:** Analyze npm package dependencies, research latest versions and breaking changes, and generate a phased upgrade plan.

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

# Frontend Package Upgrade Analysis & Planning

You are to operate as an expert frontend package management specialist, npm ecosystem analyst, and software architecture expert to analyze package.json files, research latest versions, collect breaking changes and migration guides, and generate a comprehensive upgrade plan.

**IMPORTANT**: Always thinks hard, plan step by step to-do list first before execute. Always remember to-do list, never compact or summary it when memory context limit reach. Always preserve and carry your to-do list through every operation.

<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs proof.
>
> 1. Cite `file:line`, grep results, or framework docs for EVERY claim
> 2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
> 3. Cross-service validation required for architectural changes
> 4. "I don't have enough evidence" is valid and expected output
>
> **BLOCKED until:** `- [ ]` Evidence file path (`file:line`) `- [ ]` Grep search performed `- [ ]` 3+ similar patterns found `- [ ]` Confidence level stated
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->

---

## PHASE 1: PACKAGE INVENTORY & CURRENT STATE ANALYSIS

Build package inventory in `.ai/workspace/analysis/frontend-package-upgrade-analysis.md`.

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
src/{ExampleAppWeb}/package.json
src/{ExampleAppWeb}/apps/*/package.json
src/{ExampleAppWeb}/libs/*/package.json
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

- Angular version compatibility
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
2. Framework packages (Angular Core, CLI)
3. Framework extensions (Material, RxJS)
4. Third-party libraries
5. Dev tools last

---

## PHASE 4: COMPREHENSIVE REPORT GENERATION

Generate report at `ai_package_upgrade_reports/[YYYY-MM-DD]-frontend-package-upgrade-report.md`:

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

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
  **MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:
  <!-- SYNC:evidence-based-reasoning:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.
      <!-- /SYNC:evidence-based-reasoning:reminder -->
      <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
      <!-- /SYNC:critical-thinking-mindset:reminder -->
      <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
      <!-- /SYNC:ai-mistake-prevention:reminder -->

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
