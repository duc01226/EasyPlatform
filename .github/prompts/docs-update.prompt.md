---
agent: 'agent'
description: 'Analyze the codebase through investigation and update documentation to reflect current state'
tools: ['read', 'search', 'edit', 'execute']
---

# Update Documentation

Analyze the codebase through systematic investigation and update documentation to reflect the current state.

## Workflow Sequence

This prompt follows the workflow: `@workspace /scout` → `@workspace /investigate` → `@workspace /docs-update` → `@workspace /watzup`

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

## Phase 2: Investigate Current State

**Reference:** `@workspace /investigate` patterns

### Step 1: Compare Documentation vs Code

For each major feature/module:
1. Read existing documentation
2. Read corresponding source code
3. Identify discrepancies:
   - Missing documentation for new features
   - Outdated documentation for changed features
   - Documentation for removed features

### Step 2: Knowledge Graph

Build understanding of:
- **Architecture changes**: New services, modified patterns
- **API changes**: New endpoints, modified contracts
- **Frontend changes**: New components, updated flows
- **Cross-service changes**: New message bus integrations

### Step 3: Change Summary

Document findings:
```markdown
## Changes Detected

### New Features
- [Feature]: [Description] - [Source files]

### Modified Features
- [Feature]: [What changed] - [Source files]

### Removed Features
- [Feature]: [Reason if known]

### Documentation Gaps
- [Topic]: [Missing coverage]
```

---

## Phase 3: Documentation Update

### Core Documentation

Update these files as needed:

| File | Content | Max Lines |
|------|---------|-----------|
| `README.md` | Project overview | 300 |
| `docs/project-overview-pdr.md` | Project overview and PDR | - |
| `docs/codebase-summary.md` | Codebase summary | - |
| `docs/code-standards.md` | Coding standards | - |
| `docs/system-architecture.md` | System architecture | - |

### Optional Documentation

| File | Content |
|------|---------|
| `docs/project-roadmap.md` | Project roadmap |
| `docs/deployment-guide.md` | Deployment guide |
| `docs/design-guidelines.md` | Design guidelines |

### Update Guidelines

- Preserve existing content structure where possible
- Mark deprecated or removed features clearly
- Include timestamps for major updates
- Reference actual file paths from the codebase
- Use evidence from Phase 2 investigation

---

## Phase 4: Summary (watzup)

After documentation updates:

1. List all files modified
2. Summarize key changes
3. Note any remaining gaps
4. Suggest follow-up actions if needed

---

## Additional Requests

${input:requests}

---

## [CRITICAL] Code Evidence Requirements

**All feature documentation MUST include verifiable code evidence.** This is non-negotiable.

### Evidence Format

```markdown
**Evidence**: `{RelativeFilePath}:{LineNumber}` or `{RelativeFilePath}:{StartLine}-{EndLine}`
```

### Evidence Verification Protocol

When updating documentation:
1. **Read actual source files** at claimed line numbers
2. **Verify evidence matches** the documented behavior
3. **Update stale references** - mark with ⚠️ if line numbers changed
4. **Refresh line numbers** after code changes

### Evidence Verification Table

| Entity/Component | Documented Lines | Actual Lines | Status |
|------------------|------------------|--------------|--------|
| `Entity.cs` | L6-15 | L6-15 | ✅ Verified |
| `Handler.cs` | L45-60 | L52-67 | ⚠️ Stale (update needed) |

### Status Indicators

- ✅ **Verified**: Line numbers confirmed by reading source
- ⚠️ **Stale**: Code changed, line numbers need refresh
- ❌ **Missing**: No evidence provided

---

## Quality Checklist

### Structure
- [ ] Scouted codebase structure (Phase 1)
- [ ] Investigated discrepancies (Phase 2)
- [ ] Updated documentation with evidence (Phase 3)
- [ ] Provided change summary (Phase 4)
- [ ] Referenced actual file paths
- [ ] Preserved existing structure
- [ ] Marked deprecated features

### Code Evidence (MANDATORY)
- [ ] **EVERY test case has Evidence field** with `file:line` format
- [ ] **No template placeholders** remain (`{FilePath}`, `{LineRange}`)
- [ ] **Line numbers verified** by reading actual source files
- [ ] **Stale evidence detected** and marked with ⚠️
- [ ] **Status column included** (✅/⚠️/❌) for verification tables

**IMPORTANT**: Focus on documentation updates only - do not implement code changes.
