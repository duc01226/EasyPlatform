---
description: "Systematic 4-phase debugging framework for root cause investigation"
---

# Debugging Framework

Comprehensive debugging protocol ensuring root cause investigation before fixes.

## Core Principle

**NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST**

Random fixes waste time and create new bugs. Find the root cause, fix at source, validate at every layer, verify before claiming success.

## When to Use

**Always use for:** Test failures, bugs, unexpected behavior, performance issues, build failures, integration problems, before claiming work complete

**Especially when:** Under time pressure, "quick fix" seems obvious, tried multiple fixes, don't fully understand issue, about to claim success

## The Four Phases

### Phase 1: Root Cause Investigation

**DO NOT SKIP THIS PHASE - NO FIXES WITHOUT IT**

1. **Read the Error Message**
   - Read ENTIRE error message including stack trace
   - Identify the ACTUAL error (not just first line)
   - Note file, line number, exact error text

2. **Reproduce the Failure**
   - Run the failing test/operation yourself
   - Verify you can reproduce it consistently
   - Note exact conditions that trigger it

3. **Check Recent Changes**
   - What changed that could cause this?
   - Review git diff, recent commits
   - Identify suspicions areas

4. **Gather Evidence**
   - Add logging/debugging to see actual values
   - Check inputs, outputs, intermediate states
   - Build mental model of what's happening

**Exit criteria:** You understand WHY it's failing, not just THAT it's failing

### Phase 2: Pattern Analysis

**Find working examples and compare**

1. **Find Working Cases**
   - Search codebase for similar working code
   - Identify patterns that work correctly
   - Note key differences

2. **Compare Implementations**
   - Side-by-side comparison: working vs broken
   - What's different? Missing? Extra?
   - Focus on structural differences

3. **Identify Root Difference**
   - What EXACTLY is causing the divergence?
   - Is it configuration? Logic? Data?
   - Pinpoint the specific issue

**Exit criteria:** You know what working code does that broken code doesn't

### Phase 3: Hypothesis and Testing

**Form theory and test minimally**

1. **Form Hypothesis**
   - State explicit theory: "The bug occurs because X"
   - Predict: "If I change Y, Z will happen"
   - Must be testable and falsifiable

2. **Test Minimally**
   - ONE small change to test hypothesis
   - Add logging/assertions to verify theory
   - Run test again

3. **Verify or Revise**
   - Did prediction come true?
   - If yes → Root cause found, proceed to Phase 4
   - If no → Revise hypothesis, test again
   - Iterate until hypothesis confirmed

**Exit criteria:** Hypothesis verified with evidence

### Phase 4: Implementation

**Fix once, comprehensively**

1. **Create Test First** (if none exists)
   - Write test that reproduces bug
   - Verify test fails with bug
   - Test should pass after fix

2. **Fix at Source**
   - Fix where bug ORIGINATES, not where it surfaces
   - Make minimal change needed
   - NO random fixes, NO trial-and-error

3. **Verify Fix**
   - Run original failing test → passes
   - Run full test suite → all pass
   - Check related functionality → still works
   - Review code → makes sense

**Exit criteria:** Tests pass, fix verified, no regressions

## Root Cause Tracing

**When error appears deep in execution, trace backward**

```
Error in Layer 5 (symptom)
   ↑
Called from Layer 4
   ↑
Called from Layer 3
   ↑
Called from Layer 2 (INVALID DATA ENTERED HERE) ← FIX HERE
   ↑
Called from Layer 1
```

**Technique:**
1. Start at error location
2. Trace backward through call stack
3. At each level, check: "Is the data valid here?"
4. Find FIRST level where data becomes invalid
5. Fix at that source, not at error location

**Example:** Null reference in service → trace back → controller passes null → fix validation in controller

## Defense in Depth

**After finding root cause, validate at every layer**

1. **Entry Validation**
   - API endpoints: validate all inputs
   - User input: sanitize and validate
   - External data: verify before processing

2. **Business Logic Validation**
   - Pre-conditions before operations
   - Invariants during processing
   - Post-conditions after operations

3. **Environment Guards**
   - Check dependencies exist
   - Verify configuration loaded
   - Validate external services available

4. **Debug Instrumentation**
   - Log key decision points
   - Assert assumptions
   - Track data flow

## Verification Protocol

**NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE**

Before claiming "fixed", "works", "tests pass":

1. **Identify Verification Command**
   - What command proves this works?
   - Test suite? Build? Manual check?

2. **Run Full Command**
   - No partial runs
   - No trusting old output
   - Run fresh, right now

3. **Read Output**
   - Actually read the output
   - Don't assume success
   - Look for failures, warnings

4. **Verify Confirms Claim**
   - Does output match claim?
   - All tests pass? Or some failed?
   - Build succeed? Or errors?

5. **Then Claim Result**
   - Only after steps 1-4
   - Include evidence in claim
   - Be specific and honest

## Red Flags - STOP and Return to Process

If you find yourself thinking:

- ❌ "Quick fix for now, investigate later"
- ❌ "Just try changing X and see if it works"
- ❌ "It's probably X, let me fix that"
- ❌ "Should work now" / "Seems fixed"
- ❌ "Tests pass, we're done"
- ❌ "Let me try a few things"
- ❌ "I'll add this just in case"

**All mean:** You're not following the process. Return to Phase 1.

## Anti-Patterns

| ❌ Don't | ✅ Do |
|---------|-------|
| "Let me try changing this" | "Phase 1: Read error and reproduce" |
| Fix symptoms | Fix root cause |
| Multiple simultaneous changes | One hypothesis at a time |
| Trust old test output | Run fresh verification |
| "Seems to work" | "Tests pass: [evidence]" |
| Random debugging | Systematic investigation |

## Decision Tree

```
Bug/Issue?
├─ Reproduced it? NO → Reproduce first (Phase 1)
├─ Read full error? NO → Read entire message (Phase 1)
├─ Know root cause? NO → Investigate (Phase 1-2)
├─ Tested hypothesis? NO → Form and test (Phase 3)
├─ Written test? NO → Create test first (Phase 4)
├─ Fixed at source? NO → Trace to origin (Phase 4)
├─ Verified passing? NO → Run verification (Phase 4)
└─ All YES → Safe to claim fixed
```

## Workflow Summary

1. **Phase 1: Investigate** - Understand WHY it fails
2. **Phase 2: Compare** - Find working patterns
3. **Phase 3: Hypothesize** - Test theory minimally
4. **Phase 4: Implement** - Fix once, verify completely

**Never skip Phase 1. Never claim success without Phase 4 verification.**

## Quick Commands

```bash
# Reproduce
npm test -- path/to/failing-test

# Check changes
git diff HEAD~1

# Add debugging
console.log('DEBUG:', variable);

# Verify fix
npm test  # Full suite
npm run build  # Full build
```

## Bottom Line

**Systematic investigation → Verified hypothesis → Minimal fix → Complete verification**

No shortcuts. No random fixes. Evidence-based debugging only.
