---
agent: 'agent'
description: 'Analyze the codebase through investigation and create initial documentation'
tools: ['read', 'search', 'edit', 'execute']
---

# Initialize Documentation

Analyze the codebase through systematic investigation and create initial documentation structure.

## Workflow Sequence

This prompt follows the workflow: `@workspace /scout` → `@workspace /investigate` → `@workspace /docs-init` → `@workspace /watzup`

---

## Phase 1: Scout Codebase

**Reference:** `@workspace /scout` patterns

### Step 1: Directory Discovery

Run `ls -la` to identify actual project directories, then explore:

| Priority | Directories |
|----------|-------------|
| HIGH | `src/PlatformExampleApp/*/Domain/`, `*/Application/UseCaseCommands/`, `*/Application/UseCaseQueries/` |
| MEDIUM | `src/Platform/Easy.Platform/`, `src/PlatformExampleAppWeb/libs/` |
| LOW | Config files, test directories |

### Step 2: Search Patterns

Apply priority-based file discovery:

**HIGH PRIORITY:**
```
**/Domain/Entities/**/*.cs
**/UseCaseCommands/**/*.cs
**/UseCaseQueries/**/*.cs
**/UseCaseEvents/**/*.cs
**/Controllers/**/*.cs
```

**MEDIUM PRIORITY:**
```
**/*Service.cs
**/*Helper.cs
**/*.component.ts
**/*.store.ts
```

### Step 3: Scout Report

Create a numbered file list categorized by priority for subsequent investigation.

---

## Phase 2: Investigate Architecture

**Reference:** `@workspace /investigate` patterns

### Step 1: Technology Stack

Identify from source files:
- Backend: Framework, language version, database
- Frontend: Framework, state management, styling
- Infrastructure: Message bus, caching, deployment

### Step 2: Architectural Patterns

Document patterns found:
- **CQRS**: Commands, Queries, Handlers
- **Repository**: Data access patterns
- **Event-Driven**: Entity events, message bus
- **Clean Architecture**: Layer separation

### Step 3: Knowledge Graph

Build understanding:
```markdown
## Architecture Summary

### Services
| Service | Purpose | Key Files |
|---------|---------|-----------|
| ... | ... | ... |

### Cross-Service Communication
| Source | Message | Target |
|--------|---------|--------|
| ... | ... | ... |

### Key Patterns
- [Pattern]: [How it's used]
```

---

## Phase 3: Documentation Creation

### Required Documentation

| File | Content | Max Lines |
|------|---------|-----------|
| `README.md` | Project overview | 300 |
| `docs/project-overview-pdr.md` | Project overview and PDR | - |
| `docs/codebase-summary.md` | Codebase summary | - |
| `docs/code-standards.md` | Coding standards | - |
| `docs/system-architecture.md` | System architecture | - |

### Documentation Standards

- Use `docs/` directory as the source of truth
- Include code examples where helpful
- Reference actual file paths from the codebase
- Keep documentation actionable and concise
- Base all content on Phase 2 investigation findings

---

## Phase 4: Summary (watzup)

After documentation creation:

1. List all files created
2. Summarize documentation structure
3. Note any areas needing more detail
4. Suggest follow-up actions

---

## [CRITICAL] Code Evidence Requirements

**All feature documentation MUST include verifiable code evidence.** This is non-negotiable.

### Evidence Format

```markdown
**Evidence**: `{RelativeFilePath}:{LineNumber}` or `{RelativeFilePath}:{StartLine}-{EndLine}`
```

### Evidence Verification Table

| Entity/Component | Documented Lines | Actual Lines | Status |
|------------------|------------------|--------------|--------|
| `Entity.cs` | L6-15 | L6-15 | ✅ Verified |

### Status Indicators

- ✅ **Verified**: Line numbers confirmed by reading source
- ⚠️ **Stale**: Code changed, line numbers need refresh
- ❌ **Missing**: No evidence provided

### Evidence Sources

| Content Type | Primary Evidence Source |
|--------------|------------------------|
| Validation errors | `ErrorMessage.cs` |
| Entity properties | `{Entity}.cs` |
| API endpoints | Controller + Handler files |
| Frontend behavior | `*.service.ts`, `*.component.ts` |

---

## Quality Checklist

### Structure
- [ ] Scouted codebase structure (Phase 1)
- [ ] Investigated architecture (Phase 2)
- [ ] Created documentation with evidence (Phase 3)
- [ ] Provided creation summary (Phase 4)
- [ ] Referenced actual file paths
- [ ] Included code examples
- [ ] Documented key patterns

### Code Evidence (MANDATORY)
- [ ] **EVERY test case has Evidence field** with `file:line` format
- [ ] **No template placeholders** remain (`{FilePath}`, `{LineRange}`)
- [ ] **Line numbers verified** by reading actual source files
- [ ] **Status column included** (✅/⚠️/❌) for verification tables

**IMPORTANT**: Focus on documentation only - do not start implementing code changes.
