---
name: branch-comparison
version: 1.0.1
description: '[Git] Use when the user asks to compare branches, analyze git diffs, review changes between branches, update specifications based on code changes, or analyze what changed.'
---

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
- Proceed past the approval gate only after explicit user approval, never before

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Branch Comparison & Specification Update

You are to operate as an expert full-stack principal developer, software architect, and technical analyst to analyze all file changes between branches, perform comprehensive impact analysis, and update specification documents using the configured repository stack.

**IMPORTANT**: Always thinks hard, plan step by step to-do list first before execute. Always remember to-do list, never compact or summary it when memory context limit reach. Always preserve and carry your to-do list through every operation.

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

- All standard fields from feature skill
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
- **Enterprise Architecture Awareness**: Respect the project's architectural patterns, CQRS, and Clean Architecture
- **Quality-Focused Approach**: Perform thorough code review and identify refactoring opportunities
- **Specification Completeness**: Ensure full traceability between code, requirements, and tests

## Related

- `commit`
- `code-review`

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

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

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:evidence-based-reasoning:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.
  <!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Evidence:** cite `file:line` for every claim; confidence >80% to act, <60% don't recommend.
- **Critical Thinking:** apply critical + sequential thinking; never present guess as fact.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
  **MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
