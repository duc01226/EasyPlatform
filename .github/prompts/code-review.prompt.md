---
description: "Comprehensive code review with quality gates and verification"
---

# Code Review Protocol

Systematic code review emphasizing technical rigor, evidence-based claims, and verification over performative responses.

## Core Principle

**Technical correctness over social comfort.**

Verify before implementing. Ask before assuming. Evidence before claims.

Always honor **YAGNI**, **KISS**, and **DRY** principles.

**Be honest, be brutal, straight to the point, and be concise.**

## Three Practices

1. **Receiving Feedback** - Technical evaluation over performative agreement
2. **Requesting Reviews** - Systematic review for completed work
3. **Verification Gates** - Evidence before any completion claims

## 1. Receiving Code Review Feedback

### When to Use

- Receiving code review comments from any source
- Feedback seems unclear or technically questionable
- Multiple review items need prioritization
- External reviewer lacks full context
- Suggestion conflicts with existing decisions

### Response Pattern

**READ → UNDERSTAND → VERIFY → EVALUATE → RESPOND → IMPLEMENT**

### Key Rules

**❌ NEVER Do:**
- Performative agreement: "You're absolutely right!", "Great point!", "Thanks for catching that!"
- Implement before verification
- Accept all feedback blindly
- Skip questions on unclear items

**✅ ALWAYS Do:**
- Restate requirement to confirm understanding
- Ask questions on ALL unclear items (stop and ask first)
- Push back with technical reasoning if wrong
- Verify suggested approach won't break things
- Check YAGNI: grep for usage before implementing "proper" features
- Just start working (no performative agreement)

### Source-Specific Handling

**Human Partner (Trusted):**
- Understand requirement
- Ask if unclear
- Implement after understanding
- No performative agreement needed

**External Reviewers (Verify):**
- Read technically, not socially
- Verify suggestion is correct
- Check for breakage with grep/search
- Push back if technically wrong
- Prioritize: Critical → Important → Minor

### Example Responses

**❌ Bad (Performative):**
```
"You're absolutely right! Great catch! I'll implement that right away.
Thanks for the thorough review!"
```

**✅ Good (Technical):**
```
"Clarifying: you want validation moved to entry point because X?

Current approach handles Y case - does your suggestion cover that?

Will grep for usage to verify impact."
```

## 2. Requesting Code Reviews

### When to Request

- After completing major feature or refactor
- Before merging to main branch
- After each task in subagent workflows
- When stuck and need fresh perspective
- After fixing complex bugs

### Review Checklist

**Architecture:**
- [ ] Follows established patterns
- [ ] Proper layer separation
- [ ] No inappropriate dependencies
- [ ] Correct service boundaries

**Code Quality:**
- [ ] Single Responsibility per function/class
- [ ] Consistent abstraction levels
- [ ] Meaningful names (no abbreviations)
- [ ] No code duplication
- [ ] YAGNI compliance (no unused features)

**Security:**
- [ ] Input validation at boundaries
- [ ] Authorization checks present
- [ ] No secrets in code
- [ ] SQL injection prevention
- [ ] XSS prevention

**Performance:**
- [ ] No N+1 queries
- [ ] Proper pagination
- [ ] Efficient algorithms
- [ ] Resource cleanup
- [ ] Caching where appropriate

**Testing:**
- [ ] Critical paths tested
- [ ] Edge cases covered
- [ ] Error handling tested
- [ ] No test data pollution
- [ ] Tests actually run and pass

**Patterns:**
- [ ] Repository pattern used correctly
- [ ] CQRS structure proper
- [ ] Validation uses fluent API
- [ ] DTOs own mapping
- [ ] Events for side effects

### Quality Gates

**CRITICAL Issues (Must Fix Before Proceeding):**
- Security vulnerabilities
- Data corruption risks
- Breaking changes
- Memory leaks
- Failed tests

**IMPORTANT Issues (Fix Before Merge):**
- Performance problems
- Pattern violations
- Missing validation
- Poor error handling
- Code duplication

**MINOR Issues (Note for Later):**
- Naming improvements
- Comment additions
- Refactoring opportunities
- Nice-to-have features

## 3. Verification Before Completion

### The Iron Law

**NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE**

### Gate Function

```
IDENTIFY command → RUN full command → READ output → VERIFY confirms claim → THEN claim
```

Skip any step = lying, not verifying.

### Verification Requirements

**Tests Pass:**
```bash
npm test  # or dotnet test
# Output must show: 0 failures
```

**Build Succeeds:**
```bash
npm run build  # or dotnet build
# Exit code: 0
# No errors in output
```

**Bug Fixed:**
```bash
# Run original failing case
# Must now pass
```

**Requirements Met:**
```
Checklist with line-by-line verification
Each item checked against actual implementation
```

### Red Flags - STOP

If you catch yourself:

- ❌ Using "should"/"probably"/"seems to"
- ❌ Expressing satisfaction before verification
- ❌ Committing without running tests
- ❌ Trusting subagent reports without verification
- ❌ ANY wording implying success without proof

**Action:** Stop. Run verification. Then claim.

### Verification Protocol

1. **Identify What Needs Verification**
   - What command proves this claim?
   - What output confirms success?

2. **Run Full Command Fresh**
   - No partial runs
   - No trusting old output
   - Execute right now

3. **Read Actual Output**
   - Don't assume
   - Look for failures
   - Check warnings

4. **Verify Output Confirms Claim**
   - Tests pass? Check count: 0 failures
   - Build works? Check exit code: 0
   - Feature works? Test manually

5. **State Claim WITH Evidence**
   - "Tests pass: 47 passed, 0 failed"
   - "Build succeeds: exit code 0"
   - "Verified: tested manually, works"

## Anti-Patterns

| ❌ Don't | ✅ Do |
|---------|-------|
| "Great catch!" | "Clarifying: you mean X?" |
| Implement blindly | Verify approach first |
| "Should work now" | "Tests pass: [output]" |
| Accept all feedback | Push back on wrong suggestions |
| Trust old test run | Run fresh verification |
| Performative thanks | Technical discussion |

## Review Response Examples

### Unclear Feedback

**Reviewer:** "This should be refactored"

**❌ Bad Response:**
```
"You're right! I'll refactor this right away."
```

**✅ Good Response:**
```
"Can you clarify the refactoring goal?

Are you suggesting:
1. Extract method for readability?
2. Change pattern to match X?
3. Something else?

Want to ensure I understand before making changes."
```

### Questionable Suggestion

**Reviewer:** "Add caching here"

**❌ Bad Response:**
```
"Great idea! I'll add caching."
```

**✅ Good Response:**
```
"Checking: this is called once per request.

Caching would add complexity without benefit.

Are you seeing a performance issue? If so, can you share metrics?"
```

### Valid Feedback

**Reviewer:** "Missing validation for null input"

**❌ Bad Response:**
```
"You're absolutely right! Thanks for catching that! I'll add it now."
```

**✅ Good Response:**
```
"Adding null check at entry point:

if (input == null) throw new ArgumentNullException(nameof(input));

Will include test case."
```

## Decision Tree

```
Received Feedback?
├─ Unclear items?
│  └─ STOP → Ask for clarification first
├─ From human partner?
│  └─ Understand → Implement
├─ From external reviewer?
│  ├─ Technically correct? → Verify → Implement
│  └─ Technically wrong? → Push back with reasoning
│
Completed Work?
├─ Major feature? → Request review
├─ Before merge? → Request review
└─ Complex changes? → Request review
│
About to Claim Status?
├─ Have fresh verification? → State claim WITH evidence
└─ No verification? → RUN command first → Then claim
```

## Workflow Integration

### Subagent-Driven Development
1. Complete task
2. Request code review
3. Fix Critical/Important issues
4. Verify all tests pass
5. Move to next task

### Pull Requests
1. Complete feature
2. Run full verification
3. Request code review
4. Address feedback
5. Re-verify
6. Merge

### General Development
1. Implement changes
2. Apply verification gates
3. Get feedback if complex
4. Address issues
5. Verify again
6. Commit

## Bottom Line

**Three iron rules:**

1. **Technical rigor over social performance** - No performative agreement
2. **Systematic review processes** - Use proper review workflow
3. **Evidence before claims** - Verification gates always

Verify. Question. Then implement. Evidence. Then claim.
