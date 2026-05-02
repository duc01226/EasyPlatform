---
name: documentation
version: 2.2.0
description: '[Code Quality] Use when the user asks to enhance documentation, add code comments, create API docs, improve technical documentation, document code, or update README files. Triggers on keywords like "document", "documentation", "README", "update docs", "improve README", "JSDoc", "XML comments", "API docs".'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

## Quick Summary

**Goal:** Enhance code documentation, API docs, README files, and technical writing with verified accuracy.

**Workflow:**

1. **Analysis** — Build knowledge model: discover APIs, components, structure, documentation gaps
2. **Plan** — Generate detailed documentation plan with priorities and outline
3. **Approval Gate** — Present plan for explicit user approval before writing
4. **Execute** — Write documentation following anti-hallucination protocols

**Key Rules:**

- Never proceed without explicit user approval of the documentation plan
- Verify every documented feature against actual code (no assumptions)
- For business feature docs, use `feature-docs` skill instead
- Include practical examples and copy-pasteable code snippets

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

> **Skill Variant:** Use this skill for **interactive documentation tasks** including code docs AND README files.

## Disambiguation

- For **business feature docs** → use `feature-docs`
- This skill covers **code documentation** and **README files**

# Documentation Enhancement

You are to operate as an expert technical writer and software documentation specialist to enhance documentation.

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

## README Structure Template

Use this structure when creating or improving README files:

````markdown
# Project Name

Brief description of the project.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Features

- Feature 1
- Feature 2

## Prerequisites

- Node.js >= 18
- .NET 9 SDK

## Installation

```bash
# Clone the repository
git clone [url]

# Install dependencies
npm install
dotnet restore
```

## Configuration

[Configuration details]

## Usage

[Usage examples]

## Development

[Development setup]

## Testing

[Testing instructions]

## Troubleshooting

[Common issues and solutions]
````

---

## PHASE 1: EXTERNAL MEMORY-DRIVEN DOCUMENTATION ANALYSIS

Build a structured knowledge model in `.ai/workspace/analysis/[task-name].analysis.md`.

### PHASE 1A: INITIALIZATION AND DISCOVERY

1. **Initialize** the analysis file with standard headings
2. **Discovery searches** for all related files

### DOCUMENTATION-SPECIFIC DISCOVERY

**DOCUMENTATION_COMPLETENESS_DISCOVERY**: Focus on documentation-relevant patterns:

1. **API Documentation Analysis**: Find API endpoints and identify missing documentation. Document under `## API Documentation`.

2. **Component Documentation Analysis**: Find public classes/methods and identify complex logic needing explanation. Document under `## Component Documentation`.

3. **Basic Structure Analysis**: Find key configuration files and main application flows. Document under `## Structure Documentation`.

**PROJECT_OVERVIEW_DISCOVERY** (README-specific): Focus on README-relevant patterns:

1. **Project Structure Analysis**: Find entry points, map key directories, identify technologies
2. **Feature Discovery**: Find user-facing features and map API endpoints
3. **Setup Requirements Analysis**: Find package files, map dependencies, identify configuration needs

### PHASE 1B: SYSTEMATIC FILE ANALYSIS FOR DOCUMENTATION

> **IMPORTANT:** Must do with todo list.

For each file, document in `## Knowledge Graph`:

- Standard fields plus documentation-specific:
- `documentationGaps`: Missing or incomplete documentation
- `complexityLevel`: How difficult to understand (1-10)
- `userFacingFeatures`: Features needing user documentation
- `developerNotes`: Technical details needing developer docs
- `exampleRequirements`: Code examples or usage scenarios needed
- `apiDocumentationNeeds`: API endpoints requiring documentation
- `configurationOptions`: Configuration parameters needing explanation
- `troubleshootingAreas`: Common issues requiring troubleshooting docs

README-specific fields (when analyzing for README documentation):

| Field                | Description                                |
| -------------------- | ------------------------------------------ |
| `readmeRelevance`    | How component should be represented (1-10) |
| `userImpact`         | How component affects end users            |
| `setupRequirements`  | Prerequisites for this component           |
| `configurationNeeds` | Configuration required                     |
| `featureDescription` | User-facing features provided              |
| `exampleUsage`       | Usage examples for README                  |
| `projectContext`     | How it fits into overall project           |

### PHASE 1C: OVERALL ANALYSIS

Write comprehensive summary showing:

- Complete end-to-end workflows discovered
- Documentation gaps identified
- Priority areas for documentation
- Key features and capabilities (README)
- Setup and configuration requirements (README)

---

## PHASE 2: DOCUMENTATION PLAN GENERATION

Generate detailed documentation plan under `## Documentation Plan`:

- Focus on completeness
- Ensure clarity
- Include examples
- Maintain consistency

For README plans, generate a detailed outline covering: Project Overview, Installation, Usage, Configuration, Development guidelines.

---

## PHASE 3: APPROVAL GATE

**CRITICAL**: Present documentation plan for explicit approval. **DO NOT** proceed without it.

---

## PHASE 4: DOCUMENTATION EXECUTION

Once approved, execute the plan using all DOCUMENTATION_SAFEGUARDS.

---

## SUCCESS VALIDATION

Verify documentation is:

- Accurate (matches actual code)
- Complete (covers all public APIs)
- Helpful (includes examples)

README-specific checks:

- [ ] **Accurate**: All instructions work
- [ ] **Comprehensive**: Covers all setup needs
- [ ] **Helpful**: New users can get started
- [ ] **Tested**: Commands verified to work

Document under `## Documentation Validation`.

---

## Documentation Guidelines

- **Accuracy-first approach**: Verify every documented feature with actual code
- **User-focused content**: Organize documentation based on user needs
- **Example-driven documentation**: Include practical examples and usage scenarios
- **Consistency maintenance**: Follow established documentation patterns
- **No assumptions**: Always verify behavior before documenting

### README Guidelines

- **User-first approach**: Organize content for new users; start with what the project does and why; provide clear getting-started path
- **Verified instructions**: Test all setup and installation instructions; include exact commands that work; document version requirements
- **Practical examples**: Include working examples users can follow; show common use cases; provide copy-pasteable code snippets
- **No assumptions**: Don't assume user knowledge; explain acronyms and domain terms; link to prerequisite documentation

**⚠️ MUST ATTENTION READ:** CLAUDE.md for code pattern examples (backend/frontend) when writing code documentation. See `.claude/docs/` for existing documentation structure.

---

## Anti-Hallucination Protocols

### ASSUMPTION_VALIDATION_CHECKPOINT

Before every major operation:

1. "What assumptions am I making about [X]?"
2. "Have I verified this with actual code evidence?"

### EVIDENCE_CHAIN_VALIDATION

Before claiming any relationship:

- "I believe X calls Y because..." → show actual code
- "This follows pattern Z because..." → cite specific examples

### TOOL_EFFICIENCY_PROTOCOL

- Batch multiple Grep searches into single calls with OR patterns
- Use parallel Read operations for related files

### CONTEXT_ANCHOR_SYSTEM

Every 10 operations:

1. Re-read the original task description
2. Verify the current operation aligns with original goals

---

## Related

- `feature-docs`
- `changelog`
- `release-notes`

---

### Task Planning Notes (MUST ATTENTION FOLLOW)

- Always plan and break work into many small todo tasks
- Always add a final review todo task to verify work quality and identify fixes/enhancements

---

<!-- SYNC:evidence-based-reasoning:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.
      <!-- /SYNC:evidence-based-reasoning:reminder -->
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

<!-- /SYNC:ai-mistake-prevention -->
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
  **MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
