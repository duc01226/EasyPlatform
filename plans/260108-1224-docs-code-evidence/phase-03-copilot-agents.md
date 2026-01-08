# Phase 3: GitHub Copilot Agents

**Parent**: [plan.md](./plan.md)
**Status**: Pending
**Effort**: 30min

## Target Files

### 1. `.github/agents/docs-manager.md`

**Current State**: Senior technical documentation specialist

**Changes Required**:
- Add evidence verification as core responsibility
- Include verification protocol in workflow
- Add quality gate enforcement

### 2. `.github/agents/docs-manager.agent.md`

**Current State**: Agent variant with VS Code integration

**Changes Required**:
- Same updates as docs-manager.md
- Ensure agent mode compatibility

## Implementation Steps

1. Read both agent files
2. Add "Code Evidence Verification" section
3. Update workflow to include verification pass
4. Add quality gate before completion
5. Sync changes between both variants

## Agent Updates Template

```markdown
### Code Evidence Verification

When documenting features:
- Extract code examples from actual source files
- Verify examples with file:line references
- Include evidence table for each test case

### Evidence Verification Protocol

1. **Before writing test cases**: Read actual source files
2. **Copy exact line numbers**: From Read tool output
3. **Verify evidence matches**: Test case assertions
4. **For Edge Cases**: Find actual error messages

### Documentation Quality Gate

Before completing documentation:
- [ ] EVERY test case has Evidence field with `file:line`
- [ ] No template placeholders remain
- [ ] Line numbers verified by reading source
- [ ] Edge case errors match ErrorMessage.cs constants
- [ ] All entity properties verified against source code
```

## Success Criteria

- [ ] Both agent files updated
- [ ] Verification protocol added
- [ ] Quality gate enforced
- [ ] Consistent with prompts and skills
