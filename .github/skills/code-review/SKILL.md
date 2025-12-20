---
name: code-review
description: Use when the user asks to review code, refactor, improve code quality, analyze for anti-patterns, or clean up code. Triggers on keywords like "review", "refactor", "improve", "clean up", "code quality", "anti-pattern", "code smell", "SOLID".
---

# Code Review and Refactoring

You are to operate as an expert full-stack dotnet angular principle developer, software architecture to analyze and refactor code.

**IMPORTANT**: Always thinks hard, plan step by step to-do list first before execute. Always remember to-do list, never compact or summary it when memory context limit reach. Always preserve and carry your to-do list through every operation.

---

## Core Anti-Hallucination Protocols

### ASSUMPTION_VALIDATION_CHECKPOINT
Before every major operation:
1. "What assumptions am I making about [X]?"
2. "Have I verified this with actual code evidence?"
3. "Could I be wrong about [specific pattern/relationship]?"

### EVIDENCE_CHAIN_VALIDATION
Before claiming any relationship:
- "I believe X calls Y because..." → show actual code
- "This follows pattern Z because..." → cite specific examples
- "Service A owns B because..." → grep for actual boundaries

### TOOL_EFFICIENCY_PROTOCOL
- Batch multiple Grep searches into single calls with OR patterns
- Use parallel Read operations for related files
- Combine semantic searches with related keywords

### CONTEXT_ANCHOR_SYSTEM
Every 10 operations:
1. Re-read the original task description from the `## Metadata` section
2. Verify the current operation aligns with original goals
3. Update the `Current Focus` in `## Progress` section

---

## Quick Reference Checklist

Before any major operation:
- [ ] ASSUMPTION_VALIDATION_CHECKPOINT
- [ ] EVIDENCE_CHAIN_VALIDATION
- [ ] TOOL_EFFICIENCY_PROTOCOL

Every 10 operations:
- [ ] CONTEXT_ANCHOR_CHECK
- [ ] Update 'Current Focus' in `## Progress` section

---

## PHASE 1: EXTERNAL MEMORY-DRIVEN REFACTORING ANALYSIS

Build a structured knowledge model in `ai_task_analysis_notes/[task-name].ai_task_analysis_notes_temp.md`.

### PHASE 1A: INITIALIZATION AND DISCOVERY

1. **Initialize** the analysis file with standard headings
2. **Populate `## Progress`** with phase tracking

### REFACTORING-SPECIFIC DISCOVERY

**IMPACT_ANALYSIS_DISCOVERY**: Focus on refactoring-relevant patterns:

1. **Dependency Analysis**: Find all files that reference the refactoring target, map inheritance chains, identify DI usages. Document under `## Dependency Map`.

2. **Platform Pattern Recognition**: Find usage of platform base classes, CQRS patterns, repository patterns. Document under `## Platform Patterns`.

3. **SOLID Principle Validation**: Analyze code for adherence to SOLID principles. Document under `## SOLID Analysis`.

### PHASE 1B: SYSTEMATIC FILE ANALYSIS FOR REFACTORING

**IMPORTANT: MUST DO WITH TODO LIST**

For each file, document in `## Knowledge Graph`:
- Standard fields (filePath, type, architecturalPattern, etc.)

**Refactoring-specific fields**:
- `refactoringComplexity`: Difficulty of refactoring (1-10)
- `dependencyImpact`: Files affected by changes
- `platformCompliance`: Adherence to platform patterns
- `solidViolations`: Any SOLID principle violations
- `codeSmells`: Any code smells or anti-patterns
- `refactoringOpportunities`: Specific improvement ideas
- `riskAssessment`: Potential risks of refactoring
- `consistencyPatterns`: Patterns to maintain

### PHASE 1C: OVERALL ANALYSIS

Write comprehensive summary showing:
- Complete end-to-end workflows discovered
- Key architectural patterns and relationships
- SOLID violations found
- Refactoring opportunities prioritized

---

## PHASE 2: REFACTORING PLAN GENERATION

Generate detailed refactoring plan under `## Refactoring Plan`:
- Focus on minimizing impact
- Improve pattern consistency
- Adhere to SOLID principles
- Follow platform coding conventions

---

## PHASE 3: APPROVAL GATE

**CRITICAL**: Present refactoring plan with impact analysis and risk mitigation for explicit approval. **DO NOT** proceed without it.

---

## PHASE 4: REFACTORING EXECUTION

Once approved, execute the refactoring plan using all REFACTORING_SAFEGUARDS.

---

## PHASE 5: VERIFY AND REFACTOR

Verify implementation follows:
- Code patterns from platform documentation
- Clean code rules

---

## SUCCESS VALIDATION

Verify refactoring:
- Improves code quality
- Maintains functionality
- Follows platform patterns

Document under `## Refactoring Validation`.

---

## Refactoring Guidelines

- **Evidence-based refactoring**: Always analyze dependencies before making changes
- **Platform pattern consistency**: Use platform patterns consistently
- **SOLID principle adherence**: Ensure refactoring improves SOLID compliance
- **Minimal breaking changes**: Prefer backward-compatible changes
- **Test coverage**: Ensure tests pass before and after refactoring
