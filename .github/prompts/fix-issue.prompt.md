---
agent: 'agent'
description: 'Fix a GitHub issue following systematic debugging workflow'
tools: ['read', 'edit', 'search', 'execute']
---

# Fix GitHub Issue

Fix a GitHub issue following the systematic debugging workflow.

## Issue Number
${input:issue}

## Anti-Hallucination Protocol

Before any operation, ask yourself:
1. "What assumptions am I making about this issue?"
2. "Have I verified this with actual code evidence?"
3. "Could I be wrong about the root cause?"

## Workflow

### Phase 1: Fetch Issue Details

```bash
gh issue view {issue_number}
```

Extract:
- Issue title and description
- Labels (bug, feature, enhancement)
- Related PRs or issues
- Stack traces or error messages

### Phase 2: Understand the Issue

1. What is the expected behavior?
2. What is the actual behavior?
3. Are there reproduction steps?
4. Is there a stack trace or error message?

### Phase 3: Evidence Gathering

**Multi-pattern search:**
- Static imports and usages
- String literals (runtime/config references)
- Dynamic invocations (reflection, attributes)

**Trace dependency chains:**
- Who calls this code?
- Who depends on this code?
- Cross-service message flows

**Read actual implementations** (not just interfaces)

### Phase 4: Root Cause Analysis

Analyze across dimensions:
- **Technical:** Code defects, architectural issues
- **Business Logic:** Rule violations, validation failures
- **Data:** Corruption, integrity violations, race conditions
- **Integration:** API contract violations, cross-service failures
- **Environmental:** Configuration issues, deployment problems

### Phase 5: Propose Fix

Present analysis with:

```markdown
## Issue Analysis Complete - Approval Required

### Issue
#{number} - {title}

### Root Cause Summary
{Primary root cause with evidence at file:line}

### Proposed Fix
{Fix description with specific files and changes}

### Risk Assessment
- **Risk Level:** Low/Medium/High
- **Regression Risk:** {assessment}

### Confidence Level: {X}%

### Files to Modify:
1. `path/to/file.cs:line` - {change description}

**Awaiting approval to proceed with implementation.**
```

### Phase 6: Implement Fix (after approval)

1. Make code changes following platform patterns
2. Add/update tests
3. Verify fix works
4. Create PR with issue reference

## Verification Checklist

Before proposing any change:
- [ ] Searched static imports?
- [ ] Searched string literals?
- [ ] Checked dynamic invocations?
- [ ] Read actual implementations?
- [ ] Traced dependencies?
- [ ] Assessed what breaks?
- [ ] Documented evidence?
- [ ] Declared confidence?

**If ANY unchecked → DO MORE INVESTIGATION**
**If confidence < 90% → REQUEST USER CONFIRMATION**

**IMPORTANT**: Do NOT make code changes without explicit user approval.
