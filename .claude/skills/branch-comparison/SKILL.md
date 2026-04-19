---
name: branch-comparison
version: 1.0.1
description: "[Git] Use when the user asks to compare branches, analyze git diffs, review changes between branches, update specifications based on code changes, or analyze what changed. Triggers on keywords like "compare branches", "git diff", "what changed", "branch comparison", "code changes", "spec update"."

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

**Goal:** Analyze all file changes between git branches, perform impact analysis, and update specification documents.

**Workflow:**

1. **Discovery** — Run git diff/log, classify changes (Frontend/Backend, Feature/Bugfix)
2. **Knowledge Graph** — Document each changed file with dependencies, impact level, service context
3. **Analysis** — Code review (strengths, weaknesses, security), refactoring recommendations
4. **Approval Gate** — Present findings for explicit approval before updating specs
5. **Spec Update** — Update requirements, tests, architecture docs based on approved analysis

**Key Rules:**

- All analysis must be evidence-based from actual git diffs
- Never proceed past approval gate without explicit user approval

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Branch Comparison & Specification Update

You are to operate as an expert full-stack dotnet angular principle developer, software architect, and technical analyst to analyze all file changes between branches, perform comprehensive impact analysis, and update specification documents.

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

## PHASE 1: EXTERNAL MEMORY-DRIVEN BRANCH ANALYSIS

Build a structured knowledge model in `.ai/workspace/analysis/[comparison-name].analysis.md`.

### PHASE 1A: INITIALIZATION AND DISCOVERY

1. **Initialize** the analysis file with standard headings

### GIT BRANCH ANALYSIS DISCOVERY

**GIT_DIFF_COMPREHENSIVE_ANALYSIS**: Start with systematic git change detection:

1. **Primary Change Detection Commands**:

```bash
git diff --name-status [source-branch]..[target-branch]
git diff --stat [source-branch]..[target-branch]
git log --oneline [source-branch]..[target-branch]
```

Document results under `## Git Diff Analysis` and `## Commit History`.

2. **Change Impact & Scope Classification**: Document under `## Change Classification` and `## Change Scope Analysis`:
    - Types: Frontend, Backend, Config, DB
    - Purpose: Feature, Bug Fix, Refactor

**RELATED_FILES_COMPREHENSIVE_DISCOVERY**: For each changed file, discover all related components:

- Importers
- Dependencies
- Test files
- API consumers
- UI components

Save ALL changed files AND related files to `## Comprehensive File List` with:

- `filePath`
- `changeType`
- `relationshipType`
- `impactLevel`
- `serviceContext`

**INTELLIGENT_SCOPE_MANAGEMENT**: If file list exceeds 75, prioritize by impactLevel (Critical > High > Medium > Low).

### PHASE 1B: KNOWLEDGE GRAPH CONSTRUCTION

**IMPORTANT: MUST ATTENTION DO WITH TODO LIST**

For each file, document in `## Knowledge Graph`:

- All standard fields from feature-implementation skill
- Focus on change-specific context

### PHASE 1C: OVERALL ANALYSIS

Write comprehensive summary showing:

- Complete end-to-end workflows discovered
- Key architectural patterns and relationships
- Business logic workflows affected
- Integration points and dependencies

---

## PHASE 2: COMPREHENSIVE ANALYSIS AND PLANNING

Generate detailed analysis under these headings:

### 1. Code Review Analysis

- Strengths
- Weaknesses
- Security concerns
- Performance implications
- Maintainability

### 2. Refactoring Recommendations

- Immediate improvements
- Structural changes
- Technical debt items

### 3. Specification Update Plan

- New Requirements Discovery
- Test Specification Updates
- Documentation Strategy

---

## PHASE 3: APPROVAL GATE

**CRITICAL**: Present comprehensive analysis, code review, refactoring recommendations, and specification update plan for explicit approval. **DO NOT** proceed without it.

---

## PHASE 4: SPECIFICATION UPDATE EXECUTION

Once approved, read existing specification document and update with:

- Requirements
- Test Specifications
- Architecture Documentation
- Code Review findings

---

## SUCCESS VALIDATION

Verify updated specification accurately reflects all changes. Document under `## Specification Validation`.

---

## Branch Comparison Guidelines

- **Evidence-Based Analysis**: Start with `git diff` and base all updates on concrete code changes
- **Comprehensive Impact Assessment**: Analyze direct and indirect effects, including cross-service impacts
- **Enterprise Architecture Awareness**: Respect platform patterns, CQRS, and Clean Architecture
- **Quality-Focused Approach**: Perform thorough code review and identify refactoring opportunities
- **Specification Completeness**: Ensure full traceability between code, requirements, and tests

## Related

- `commit`
- `code-review`

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
