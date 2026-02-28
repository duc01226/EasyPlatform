# Understand Code First Protocol

**MANDATORY** for all skills that modify code, create plans, or diagnose issues.

## Core Rule

> **#1 Priority: FIND EXISTING EXAMPLE CODE PATTERNS FIRST.** Before writing any code, search the codebase for 3+ similar implementations. Follow the established pattern — never invent new patterns when existing ones work.

> **Before ANY code modification, plan creation, or fix attempt: READ and UNDERSTAND the existing code FIRST.**

## Protocol Steps

### 1. Read Before Write

- **Read existing files** in the target area before making any changes
- **Understand the current patterns** — how is the code structured? What base classes, conventions, DI patterns are used?
- **Map dependencies** — what other files reference or depend on the target code?

### 2. Validate Assumptions

Before every major operation, ask:

1. "What assumptions am I making about this code?"
2. "Have I verified this with actual code evidence (grep, read)?"
3. "Could I be wrong about this pattern/relationship?"

### 3. Evidence-Based Actions

Before claiming any relationship or making any change:

- "I believe X calls Y because..." → cite actual code (file:line)
- "This follows pattern Z because..." → cite specific existing examples
- "This service owns X because..." → grep for actual boundaries

### 4. Search Before Create

Before creating new files or patterns:

- Search codebase for existing implementations of similar functionality
- Check if a base class, helper, or utility already handles this
- Follow established patterns rather than inventing new ones

### 5. External Memory (Prevent Knowledge Loss)

For non-trivial tasks (multi-file changes, complex fixes, feature implementation):

1. **Write analysis to file** — Save investigation results to `.ai/workspace/analysis/{task-name}.analysis.md`
   - Include: file list, key patterns found, dependencies, business context, assumptions validated
   - This prevents losing knowledge during long operations or context compaction
2. **Re-read before acting** — Before generating plans or implementing changes, re-read the ENTIRE analysis file
   - Ensures decisions are based on complete investigation, not partial memory
3. **Update during execution** — Keep the analysis file updated with progress and new findings

**When to use external memory:**
- Any task touching 3+ files
- Bug diagnosis requiring root cause analysis
- Feature implementation requiring codebase understanding
- Refactoring with dependency mapping
- Planning that requires codebase analysis

**Skip external memory only for:** single-file fixes, typo corrections, simple config changes.

## Quick Checklist

Before modifying code:

- [ ] Read the target file(s) completely
- [ ] Searched for existing patterns (`Grep`/`Glob`)
- [ ] Identified dependencies and consumers
- [ ] Verified assumptions with code evidence
- [ ] Confirmed approach follows existing conventions
- [ ] **Wrote analysis to `.ai/workspace/analysis/` (if non-trivial task)**
- [ ] **Re-read analysis file before implementation (if analysis was written)**

### Extended Discovery (for data access/business logic tasks)

When implementing features that affect data filtering, queries, or business logic, search ALL related files:

**Backend:**
- Query handlers: `grep -r "Query.*{Entity}" Application/ApplyPlatform/UseCaseQueries/ --include="*.cs"`
- Command handlers: `grep -r "Command.*{Entity}" Application/UseCaseCommands/ --include="*.cs"`
- Repository usages: `grep -r "{entity}Repository\\.FindByExprAsync" Application/ --include="*.cs"`
- Controller endpoints: `grep -r "Route.*{entity}" Controllers/ --include="*.cs"`

**Frontend:**
- API calls: `grep -r "{endpoint-path}" src/ --include="*.ts"`
- Components: `grep -r "{ApiServiceName}" src/ --include="*.component.ts"`

**Cross-service:**
- Check ALL services: `for svc in $(ls src/Services/); do grep -r "{pattern}" "src/Services/$svc"; done`

## Anti-Patterns (DO NOT)

- **DO NOT** start fixing/implementing before reading the relevant code
- **DO NOT** assume a pattern exists — verify with grep
- **DO NOT** create new abstractions without checking for existing ones
- **DO NOT** guess at constructor signatures, DI registrations, or API contracts
- **DO NOT** recommend code removal without full usage trace
- **DO NOT** skip writing analysis to external file for non-trivial tasks
- **DO NOT** implement from memory alone — re-read your analysis file first

## See Also

- `.claude/skills/shared/evidence-based-reasoning-protocol.md` — Detailed validation protocols
- `.ai/docs/common-prompt.md` — Full investigation & knowledge graph protocol (Phase 1: Knowledge Model → Phase 2: Plan → Phase 3: Approval → Phase 4: Execute)
- `CLAUDE.md` "Investigation & Recommendation Protocol" — Breaking change assessment
