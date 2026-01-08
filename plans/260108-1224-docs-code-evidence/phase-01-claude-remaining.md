# Phase 1: Claude Code Remaining Files

**Parent**: [plan.md](./plan.md)
**Status**: Pending
**Effort**: 30min

## Target Files

### 1. `.claude/skills/test-specs-docs/SKILL.md`

**Current State**: Has evidence requirements but needs format standardization

**Changes Required**:
- Add `[CRITICAL] MANDATORY CODE EVIDENCE RULE` section at top
- Standardize evidence format to `file:line`
- Add valid/invalid evidence table
- Add evidence sources by test type table
- Update quality checklist with evidence validation

### 2. `.claude/agents/docs-manager.md`

**Current State**: General documentation agent, no evidence enforcement

**Changes Required**:
- Add evidence verification responsibility
- Include verification protocol in agent instructions
- Add quality gate for evidence completeness

## Implementation Steps

1. Read current test-specs-docs/SKILL.md
2. Add mandatory evidence section (copy from feature-docs)
3. Update quality checklist
4. Read docs-manager.md agent
5. Add evidence verification instructions
6. Test by running skill on sample feature

## Code Evidence Section (Standard Template)

```markdown
## [CRITICAL] MANDATORY CODE EVIDENCE RULE

**EVERY test case MUST have verifiable code evidence.** This is non-negotiable.

### Evidence Format

**Evidence**: `{RelativeFilePath}:{LineNumber}` or `{RelativeFilePath}:{StartLine}-{EndLine}`

### Valid vs Invalid Evidence

| ✅ Valid | ❌ Invalid |
|----------|-----------|
| `ErrorMessage.cs:83` | `{FilePath}:{LineRange}` (template) |
| `Handler.cs:42-52` | `SomeFile.cs` (no line) |
| `interviews.service.ts:115-118` | "Based on CQRS pattern" (vague) |

### Evidence Sources by Test Type

| Test Type | Primary Evidence Source |
|-----------|------------------------|
| Validation errors | `{Module}.Application/Common/Constants/ErrorMessage.cs` |
| Entity operations | `{Entity}.cs`, `{Command}Handler.cs` |
| Permission checks | `CanAccess()`, `[PlatformAuthorize]` |
| Frontend behavior | `*.service.ts`, `*.component.ts` |
```

## Success Criteria

- [ ] test-specs-docs has evidence section
- [ ] docs-manager agent enforces verification
- [ ] Quality checklists updated
