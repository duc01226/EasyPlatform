# Phase 2: GitHub Copilot Prompts

**Parent**: [plan.md](./plan.md)
**Status**: Pending
**Effort**: 45min

## Target Files

### 1. `.github/prompts/documentation.prompt.md`

**Current State**: Core documentation standards, no evidence requirements

**Changes Required**:
- Add code evidence requirements section
- Add verification table format
- Update quality checklist

### 2. `.github/prompts/docs-init.prompt.md`

**Current State**: Initialize documentation workflow

**Changes Required**:
- Add evidence gathering in investigation phase
- Include evidence validation in output requirements

### 3. `.github/prompts/docs-update.prompt.md`

**Current State**: Update documentation workflow

**Changes Required**:
- Add evidence verification step
- Include stale line number detection
- Add evidence refresh protocol

## Implementation Steps

1. Read each prompt file
2. Identify insertion point for evidence section
3. Add standardized evidence format section
4. Update quality checklists
5. Ensure consistency with Claude Code skills

## Standard Sections to Add

### Code Evidence Requirements

```markdown
## Code Evidence Requirements

All feature documentation MUST include code evidence verification.

### Evidence Format
**Evidence**: `{FilePath}:{LineNumber}` or `{FilePath}:{StartLine}-{EndLine}`

### Evidence Verification Table
| Code Reference | Source File | Lines | Status |
|----------------|-------------|-------|--------|
| Entity creation | `Entity.cs` | 45-60 | ✅ Verified |

### Quality Gate
- [ ] Every test case has Evidence field
- [ ] No template placeholders remain
- [ ] Line numbers verified against source
- [ ] Edge case errors match ErrorMessage.cs
```

## Success Criteria

- [ ] All 3 prompts have evidence sections
- [ ] Consistent format with Claude Code skills
- [ ] Quality checklists updated
