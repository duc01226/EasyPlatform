---
name: debugging
description: >-
  Systematic debugging framework for root cause investigation before fixes.
  Use for bugs, test failures, unexpected behavior, performance issues.
  Use `--autonomous` flag for structured headless debugging with approval gates.
  Triggers: debug, bug, error, fix, diagnose, root cause, stack trace, investigate issue.
  NOT for: code review (use code-review), simplification (use code-simplifier).
version: 4.0.0
languages: all
infer: true
---

# Debugging

Comprehensive debugging framework combining systematic investigation, root cause tracing, defense-in-depth validation, and verification protocols.

## Core Principle

**NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST**

Random fixes waste time and create new bugs. Find the root cause, fix at source, validate at every layer, verify before claiming success.

## When to Use

**Always use for:** Test failures, bugs, unexpected behavior, performance issues, build failures, integration problems, before claiming work complete

**Especially when:** Under time pressure, "quick fix" seems obvious, tried multiple fixes, don't fully understand issue, about to claim success

## Mode Selection

| Mode            | Flag           | Use When                                              | Workflow                                         |
| --------------- | -------------- | ----------------------------------------------------- | ------------------------------------------------ |
| **Interactive** | (default)      | User available for feedback, exploratory debugging    | Real-time collaboration, iterative investigation |
| **Autonomous**  | `--autonomous` | Batch debugging, CI/CD, comprehensive analysis needed | 5-phase structured workflow with approval gates  |

### Interactive Mode (Default)

Standard debugging with user engagement. Use the techniques below with real-time feedback.

### Autonomous Mode (`--autonomous`)

Structured headless debugging workflow with approval gates. Creates artifacts in `.ai/workspace/analysis/`.

**Invocation:** `/debugging --autonomous` or `/debug --autonomous`

**Workflow:**

1. **Phase 1:** Bug Report Analysis → Document in `.ai/workspace/analysis/[bug-name].md`
2. **Phase 2:** Evidence Gathering → Multi-pattern search, dependency tracing
3. **Phase 3:** Root Cause Analysis → Ranked causes with confidence levels
4. **Phase 4:** Solution Proposal → Code changes, risk assessment, testing strategy
5. **Phase 5:** Approval Gate → Present analysis for user approval before implementing

**Key Features:**

- Anti-hallucination protocols (assumption validation, evidence chains)
- Confidence level tracking (High ≥90%, Medium 70-89%, Low <70%)
- Structured evidence documentation
- Explicit approval required before implementation

---

## Autonomous Workflow Details

### Core Anti-Hallucination Protocols

#### ASSUMPTION_VALIDATION_CHECKPOINT

Before every major operation:

1. "What assumptions am I making about [X]?"
2. "Have I verified this with actual code evidence?"
3. "Could I be wrong about [specific pattern/relationship]?"

#### EVIDENCE_CHAIN_VALIDATION

Before claiming any relationship:

- "I believe X calls Y because..." → show actual code
- "This follows pattern Z because..." → cite specific examples
- "Service A owns B because..." → grep for actual boundaries

#### CONTEXT_ANCHOR_SYSTEM

Every 10 operations:

1. Re-read the original task
2. Verify current operation aligns with goals
3. Check if solving the right problem

### Quick Verification Checklist

**Before removing/changing ANY code:**

- [ ] Searched static imports?
- [ ] Searched string literals in code?
- [ ] Checked dynamic invocations (attributes, reflection)?
- [ ] Read actual implementations?
- [ ] Traced who depends on this?
- [ ] Assessed what breaks if removed?
- [ ] Documented evidence clearly?
- [ ] Declared confidence level?

**If ANY unchecked → DO MORE INVESTIGATION**
**If confidence < 90% → REQUEST USER CONFIRMATION**

### Autonomous Phase 1: Bug Report Analysis

Create analysis document in `.ai/workspace/analysis/[bug-name].md`:

```markdown
## Bug Report Analysis

### Reported Behavior

[What is happening]

### Expected Behavior

[What should happen]

### Reproduction Steps

[How to reproduce]

### Error Message

[If available]

### Stack Trace

[If available]

### Environment

[Dev/Staging/Prod, browser, etc.]

### Affected Services

[List affected services/modules]
```

### Autonomous Phase 2: Evidence Gathering

#### Multi-Pattern Search Strategy

```bash
# 1. Exact class/method name
grep -r "ExactClassName" --include="*.cs" --include="*.ts"

# 2. Partial variations (camelCase, PascalCase, snake_case)
grep -r "ClassName\|className\|class_name" --include="*.cs"

# 3. String literals (runtime/config references)
grep -r '"ClassName"' --include="*.cs" --include="*.json" --include="*.config"

# 4. Reflection/dynamic usage
grep -r "typeof(.*ClassName)\|nameof(.*ClassName)" --include="*.cs"

# 5. Configuration files
grep -r "ClassName" --include="*.json" --include="appsettings*.json"

# 6. Attribute-based usage
grep -r "\[.*ClassName.*\]" --include="*.cs"
```

#### Dependency Tracing

```bash
# Direct usages (imports)
grep -r "using.*{Namespace}" --include="*.cs"

# Interface implementations
grep -r ": I{ClassName}\|: I{ClassName}," --include="*.cs"

# Base class inheritance
grep -r ": {BaseClassName}" --include="*.cs"

# DI registrations
grep -r "AddScoped.*{ClassName}\|AddTransient.*{ClassName}\|AddSingleton.*{ClassName}" --include="*.cs"

# Test references
grep -r "{ClassName}" --include="*Test*.cs" --include="*Spec*.cs"
```

#### Error-Specific Searches

```bash
# Find exception handling
grep -r "catch.*{ExceptionType}" --include="*.cs"

# Find validation logic
grep -r "Validate.*{EntityName}\|{EntityName}.*Validate" --include="*.cs"

# Find error messages
grep -r "error message text from report" --include="*.cs" --include="*.ts"
```

#### EasyPlatform-Specific Searches

```bash
# EventHandlers for entity
grep -r ".*EventHandler.*{EntityName}|{EntityName}.*EventHandler" --include="*.cs"

# Background jobs
grep -r ".*BackgroundJob.*{EntityName}|{EntityName}.*BackgroundJob" --include="*.cs"

# Message bus consumers
grep -r ".*Consumer.*{EntityName}|{EntityName}.*Consumer" --include="*.cs"

# Platform validation
grep -r "PlatformValidationResult\|EnsureValid\|EnsureFound" --include="*.cs"
```

### Autonomous Phase 3: Root Cause Analysis

#### Analysis Dimensions

```markdown
## Root Cause Analysis

### 1. Technical Dimension

- Code defects identified: [List]
- Architectural issues: [List]
- Race conditions possible: [Yes/No, evidence]

### 2. Business Logic Dimension

- Rule violations: [List]
- Validation failures: [List]
- Edge cases missed: [List]

### 3. Data Dimension

- Data integrity issues: [List]
- State corruption possible: [Yes/No]
- Migration issues: [Yes/No]

### 4. Integration Dimension

- Cross-service failures: [List]
- API contract violations: [List]
- Message bus issues: [List]
- LastMessageSyncDate race conditions: [Yes/No]

### 5. Environment Dimension

- Configuration issues: [List]
- Environment-specific: [Dev/Staging/Prod differences]
```

#### Ranked Causes

```markdown
## Potential Root Causes (Ranked by Probability)

1. **[Cause 1]** - Confidence: XX%
    - Evidence: [What supports this]
    - Location: [file:line]

2. **[Cause 2]** - Confidence: XX%
    - Evidence: [What supports this]
    - Location: [file:line]
```

### Autonomous Phase 4: Solution Proposal

```markdown
## Proposed Fix

### Solution Description

[Describe the fix approach]

### Code Changes

- File: `path/to/file.cs`
- Lines: XX-YY
- Change: [Description]

### Risk Assessment

- **Impact Level**: Low | Medium | High
- **Regression Risk**: [What could break]
- **Affected Components**: [List]

### Testing Strategy

- [ ] Unit test for the fix
- [ ] Regression tests for affected area
- [ ] Integration test if cross-service
- [ ] Manual testing checklist

### Rollback Plan

[How to revert if fix causes issues]
```

### Autonomous Phase 5: Approval Gate

**CRITICAL**: Present analysis and proposed fix for approval before implementing.

Format:

```markdown
## Bug Analysis Complete - Approval Required

### Root Cause Summary

[Primary root cause with evidence]

### Proposed Fix

[Fix description with specific files and changes]

### Risk Assessment

- **Risk Level**: [Low/Medium/High]
- **Regression Risk**: [assessment]

### Confidence Level: [X%]

### Files to Modify:

1. `path/to/file.cs:line` - [change description]

**Awaiting approval to proceed.**
```

**DO NOT implement without user approval.**

### Confidence Levels

| Level  | Range   | Criteria                                                      | Action                                 |
| ------ | ------- | ------------------------------------------------------------- | -------------------------------------- |
| High   | 90-100% | Multiple evidence sources, clear code path, no contradictions | Proceed with fix                       |
| Medium | 70-89%  | Some evidence, some uncertainty                               | Present findings, request confirmation |
| Low    | < 70%   | Limited evidence, multiple interpretations                    | MUST request user confirmation         |

### Evidence Documentation Template

```markdown
## Investigation Evidence

### Searches Performed

1. Pattern: `{search1}` - Found: [X files]
2. Pattern: `{search2}` - Found: [Y files]

### Key Findings

- File: `path/to/file.cs:123` - [What was found]
- File: `path/to/another.cs:45` - [What was found]

### Not Found (Important Negatives)

- Expected `{pattern}` but not found in `{location}`
- No references to `{component}` in `{scope}`

### Confidence Level: [XX]%

### Remaining Uncertainties

1. [Uncertainty 1 - how to resolve]
2. [Uncertainty 2 - how to resolve]

### Recommendation

[Clear recommendation with reasoning]
```

### Common Bug Categories (Autonomous)

#### Null Reference Exceptions

```bash
grep -r "\.{PropertyName}" --include="*.cs" -A 2 -B 2
# Check for null checks before access
```

#### Validation Failures

```bash
grep -r "Validate\|EnsureValid\|IsValid\|PlatformValidationResult" --include="*.cs"
# Trace validation chain
```

#### Cross-Service Issues

```bash
grep -r "Consumer.*{Entity}\|Producer.*{Entity}" --include="*.cs"
# Check message bus communication
grep -r "LastMessageSyncDate" --include="*.cs"
# Check for race condition handling
```

#### Authorization Issues

```bash
grep -r "PlatformAuthorize\|RequestContext.*Role\|HasRole" --include="*.cs"
# Check auth patterns
```

#### Frontend Issues

```bash
grep -r "observerLoadingErrorState\|tapResponse\|untilDestroyed" --include="*.ts"
# Check state management patterns
```

### Autonomous Verification Before Closing

- [ ] Root cause identified with evidence
- [ ] Fix addresses root cause, not symptoms
- [ ] No new issues introduced
- [ ] Tests cover the fix
- [ ] Confidence level declared
- [ ] User confirmed if confidence < 90%

---

## The Four Techniques

### 1. Systematic Debugging

Four-phase debugging framework that ensures root cause investigation before attempting fixes.

#### The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If haven't completed Phase 1, cannot propose fixes.

#### The Four Phases

Must complete each phase before proceeding to next.

##### Phase 1: Root Cause Investigation

**BEFORE attempting ANY fix:**

1. **Read Error Messages Carefully** - Don't skip past errors/warnings, read stack traces completely
2. **Reproduce Consistently** - Can trigger reliably? Exact steps? If not reproducible → gather more data
3. **Check Recent Changes** - What changed? Git diff, recent commits, new dependencies, config changes
4. **Gather Evidence in Multi-Component Systems**
   - For EACH component boundary: log data entering/exiting, verify environment propagation
   - Run once to gather evidence showing WHERE it breaks
   - THEN analyze to identify failing component
5. **Trace Data Flow** - Where does bad value originate? Trace up call stack until finding source

##### Phase 2: Pattern Analysis

**Find pattern before fixing:**

1. **Find Working Examples** - Locate similar working code in same codebase
2. **Compare Against References** - Read reference implementation COMPLETELY, understand fully before applying
3. **Identify Differences** - List every difference however small, don't assume "that can't matter"
4. **Understand Dependencies** - What other components, settings, config, environment needed?

##### Phase 3: Hypothesis and Testing

**Scientific method:**

1. **Form Single Hypothesis** - "I think X is root cause because Y", be specific not vague
2. **Test Minimally** - SMALLEST possible change to test hypothesis, one variable at a time
3. **Verify Before Continuing** - Worked? → Phase 4. Didn't work? → NEW hypothesis. DON'T add more fixes
4. **When Don't Know** - Say "I don't understand X", don't pretend, ask for help

##### Phase 4: Implementation

**Fix root cause, not symptom:**

1. **Create Failing Test Case** - Simplest reproduction, automated if possible, MUST have before fixing
2. **Implement Single Fix** - Address root cause identified, ONE change, no "while I'm here" improvements
3. **Verify Fix** - Test passes? No other tests broken? Issue actually resolved?
4. **If Fix Doesn't Work**
   - STOP. Count: How many fixes tried?
   - If < 3: Return to Phase 1, re-analyze with new information
   - **If ≥ 3: STOP and question architecture**
5. **If 3+ Fixes Failed: Question Architecture**
   - Pattern: Each fix reveals new shared state/coupling problem elsewhere
   - STOP and question fundamentals: Is pattern sound? Wrong architecture?
   - Discuss with human partner before more fixes

#### Red Flags - STOP and Follow Process

If catch yourself thinking:
- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "Add multiple changes, run tests"
- "Skip the test, I'll manually verify"
- "It's probably X, let me fix that"
- "I don't fully understand but this might work"
- "One more fix attempt" (when already tried 2+)

**ALL mean:** STOP. Return to Phase 1.

#### Human Partner Signals You're Doing It Wrong

- "Is that not happening?" - Assumed without verifying
- "Will it show us...?" - Should have added evidence gathering
- "Stop guessing" - Proposing fixes without understanding
- "Ultrathink this" - Question fundamentals, not just symptoms
- "We're stuck?" (frustrated) - Approach isn't working

**When see these:** STOP. Return to Phase 1.

#### Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Issue is simple, don't need process" | Simple issues have root causes too |
| "Emergency, no time for process" | Systematic is FASTER than guess-and-check |
| "Just try this first, then investigate" | First fix sets pattern. Do right from start |
| "One more fix attempt" (after 2+ failures) | 3+ failures = architectural problem |

#### Real-World Impact

From debugging sessions:
- Systematic approach: 15-30 minutes to fix
- Random fixes approach: 2-3 hours of thrashing
- First-time fix rate: 95% vs 40%
- New bugs introduced: Near zero vs common

---

### 2. Root Cause Tracing

Systematically trace bugs backward through call stack to find original trigger.

#### Core Principle

**Trace backward through call chain until finding original trigger, then fix at source.**

Bugs often manifest deep in call stack (git init in wrong directory, file created in wrong location). Instinct is to fix where error appears, but that's treating symptom.

#### When to Use

- Error happens deep in execution (not at entry point)
- Stack trace shows long call chain
- Unclear where invalid data originated
- Need to find which test/code triggers problem

#### The Tracing Process

##### 1. Observe the Symptom

```
Error: git init failed in /Users/jesse/project/packages/core
```

##### 2. Find Immediate Cause

What code directly causes this?

```typescript
await execFileAsync('git', ['init'], { cwd: projectDir });
```

##### 3. Ask: What Called This?

```typescript
WorktreeManager.createSessionWorktree(projectDir, sessionId)
  → called by Session.initializeWorkspace()
  → called by Session.create()
  → called by test at Project.create()
```

##### 4. Keep Tracing Up

What value was passed?
- `projectDir = ''` (empty string!)
- Empty string as `cwd` resolves to `process.cwd()`
- That's the source code directory!

##### 5. Find Original Trigger

Where did empty string come from?

```typescript
const context = setupCoreTest(); // Returns { tempDir: '' }
Project.create('name', context.tempDir); // Accessed before beforeEach!
```

#### Adding Stack Traces

When can't trace manually, add instrumentation:

```typescript
async function gitInit(directory: string) {
  const stack = new Error().stack;
  console.error('DEBUG git init:', {
    directory,
    cwd: process.cwd(),
    stack,
  });

  await execFileAsync('git', ['init'], { cwd: directory });
}
```

**Critical:** Use `console.error()` in tests (not logger - may not show)

**Run and capture:**

```bash
npm test 2>&1 | grep 'DEBUG git init'
```

**Analyze stack traces:**
- Look for test file names
- Find line number triggering call
- Identify pattern (same test? same parameter?)

#### Finding Which Test Causes Pollution

If something appears during tests but don't know which test:

Use bisection script: `scripts/find-polluter.sh`

```bash
./scripts/find-polluter.sh '.git' 'src/**/*.test.ts'
```

Runs tests one-by-one, stops at first polluter.

#### Key Principle

**NEVER fix just where error appears.** Trace back to find original trigger.

When found immediate cause:
- Can trace one level up? → Trace backwards
- Is this the source? → Fix at source
- Then add validation at each layer (see Defense-in-Depth section)

#### Real Example

**Symptom:** `.git` created in `packages/core/` (source code)

**Trace chain:**
1. `git init` runs in `process.cwd()` ← empty cwd parameter
2. WorktreeManager called with empty projectDir
3. Session.create() passed empty string
4. Test accessed `context.tempDir` before beforeEach
5. setupCoreTest() returns `{ tempDir: '' }` initially

**Root cause:** Top-level variable initialization accessing empty value

**Fix:** Made tempDir a getter that throws if accessed before beforeEach

**Also added defense-in-depth:**
- Layer 1: Project.create() validates directory
- Layer 2: WorkspaceManager validates not empty
- Layer 3: NODE_ENV guard refuses git init outside tmpdir
- Layer 4: Stack trace logging before git init

---

### 3. Defense-in-Depth Validation

Validate at every layer data passes through to make bugs impossible.

#### Core Principle

**Validate at EVERY layer data passes through. Make bug structurally impossible.**

When fix bug caused by invalid data, adding validation at one place feels sufficient. But single check can be bypassed by different code paths, refactoring, or mocks.

#### Why Multiple Layers

Single validation: "We fixed bug"
Multiple layers: "We made bug impossible"

Different layers catch different cases:
- Entry validation catches most bugs
- Business logic catches edge cases
- Environment guards prevent context-specific dangers
- Debug logging helps when other layers fail

#### The Four Layers

##### Layer 1: Entry Point Validation

**Purpose:** Reject obviously invalid input at API boundary

```typescript
function createProject(name: string, workingDirectory: string) {
  if (!workingDirectory || workingDirectory.trim() === '') {
    throw new Error('workingDirectory cannot be empty');
  }
  if (!existsSync(workingDirectory)) {
    throw new Error(`workingDirectory does not exist: ${workingDirectory}`);
  }
  if (!statSync(workingDirectory).isDirectory()) {
    throw new Error(`workingDirectory is not a directory: ${workingDirectory}`);
  }
  // proceed
}
```

##### Layer 2: Business Logic Validation

**Purpose:** Ensure data makes sense for this operation

```typescript
function initializeWorkspace(projectDir: string, sessionId: string) {
  if (!projectDir) {
    throw new Error('projectDir required for workspace initialization');
  }
  // proceed
}
```

##### Layer 3: Environment Guards

**Purpose:** Prevent dangerous operations in specific contexts

```typescript
async function gitInit(directory: string) {
  // In tests, refuse git init outside temp directories
  if (process.env.NODE_ENV === 'test') {
    const normalized = normalize(resolve(directory));
    const tmpDir = normalize(resolve(tmpdir()));

    if (!normalized.startsWith(tmpDir)) {
      throw new Error(
        `Refusing git init outside temp dir during tests: ${directory}`
      );
    }
  }
  // proceed
}
```

##### Layer 4: Debug Instrumentation

**Purpose:** Capture context for forensics

```typescript
async function gitInit(directory: string) {
  const stack = new Error().stack;
  logger.debug('About to git init', {
    directory,
    cwd: process.cwd(),
    stack,
  });
  // proceed
}
```

#### Applying the Pattern

When find bug:

1. **Trace data flow** - Where does bad value originate? Where used?
2. **Map all checkpoints** - List every point data passes through
3. **Add validation at each layer** - Entry, business, environment, debug
4. **Test each layer** - Try to bypass layer 1, verify layer 2 catches it

#### Example from Real Session

Bug: Empty `projectDir` caused `git init` in source code

**Data flow:**
1. Test setup → empty string
2. `Project.create(name, '')`
3. `WorkspaceManager.createWorkspace('')`
4. `git init` runs in `process.cwd()`

**Four layers added:**
- Layer 1: `Project.create()` validates not empty/exists/writable
- Layer 2: `WorkspaceManager` validates projectDir not empty
- Layer 3: `WorktreeManager` refuses git init outside tmpdir in tests
- Layer 4: Stack trace logging before git init

**Result:** All 1847 tests passed, bug impossible to reproduce

#### Key Insight

All four layers were necessary. During testing, each layer caught bugs others missed:
- Different code paths bypassed entry validation
- Mocks bypassed business logic checks
- Edge cases on different platforms needed environment guards
- Debug logging identified structural misuse

**Don't stop at one validation point.** Add checks at every layer.

---

### 4. Verification Before Completion

Run verification commands and confirm output before claiming success.

#### Core Principle

**Evidence before claims, always.**

Claiming work complete without verification is dishonesty, not efficiency.

#### The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If haven't run verification command in this message, cannot claim it passes.

#### The Gate Function

```
BEFORE claiming any status or expressing satisfaction:

1. IDENTIFY: What command proves this claim?
2. RUN: Execute FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. VERIFY: Does output confirm claim?
   - If NO: State actual status with evidence
   - If YES: State claim WITH evidence
5. ONLY THEN: Make claim

Skip any step = lying, not verifying
```

#### Common Failures

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| Tests pass | Test command output: 0 failures | Previous run, "should pass" |
| Linter clean | Linter output: 0 errors | Partial check, extrapolation |
| Build succeeds | Build command: exit 0 | Linter passing, logs look good |
| Bug fixed | Test original symptom: passes | Code changed, assumed fixed |
| Regression test works | Red-green cycle verified | Test passes once |
| Agent completed | VCS diff shows changes | Agent reports "success" |
| Requirements met | Line-by-line checklist | Tests passing |

#### Red Flags - STOP

- Using "should", "probably", "seems to"
- Expressing satisfaction before verification ("Great!", "Perfect!", "Done!")
- About to commit/push/PR without verification
- Trusting agent success reports
- Relying on partial verification
- Thinking "just this once"
- Tired and wanting work over
- **ANY wording implying success without having run verification**

#### Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Should work now" | RUN verification |
| "I'm confident" | Confidence ≠ evidence |
| "Just this once" | No exceptions |
| "Linter passed" | Linter ≠ compiler |
| "Agent said success" | Verify independently |
| "Partial check is enough" | Partial proves nothing |

#### Key Patterns

**Tests:**

```
✅ [Run test command] [See: 34/34 pass] "All tests pass"
❌ "Should pass now" / "Looks correct"
```

**Regression tests (TDD Red-Green):**

```
✅ Write → Run (pass) → Revert fix → Run (MUST FAIL) → Restore → Run (pass)
❌ "I've written regression test" (without red-green verification)
```

**Build:**

```
✅ [Run build] [See: exit 0] "Build passes"
❌ "Linter passed" (linter doesn't check compilation)
```

**Requirements:**

```
✅ Re-read plan → Create checklist → Verify each → Report gaps or completion
❌ "Tests pass, phase complete"
```

**Agent delegation:**

```
✅ Agent reports success → Check VCS diff → Verify changes → Report actual state
❌ Trust agent report
```

#### When To Apply

**ALWAYS before:**
- ANY variation of success/completion claims
- ANY expression of satisfaction
- ANY positive statement about work state
- Committing, PR creation, task completion
- Moving to next task
- Delegating to agents

**Rule applies to:**
- Exact phrases
- Paraphrases and synonyms
- Implications of success
- ANY communication suggesting completion/correctness

#### The Bottom Line

**No shortcuts for verification.**

Run command. Read output. THEN claim result.

Non-negotiable.

---

### 5. EasyPlatform-Specific Debugging

Platform-specific debugging patterns for the Easy.Platform .NET 9 + Angular 19 monorepo.

#### Platform Error Patterns

##### Backend (.NET/C#)

| Error Type                           | Source            | Investigation                                |
| ------------------------------------ | ----------------- | -------------------------------------------- |
| `PlatformValidationResult.Invalid()` | Validation layer  | Check `.And()` chain, find failing condition |
| `PlatformException`                  | Business logic    | Read exception message, trace to handler     |
| `EnsureFound()` failures             | Repository calls  | Verify entity exists, check query predicates |
| `EnsureValidAsync()` failures        | Entity validation | Check entity's `ValidateAsync()` method      |

##### Frontend (Angular)

| Error Type                  | Source         | Investigation                        |
| --------------------------- | -------------- | ------------------------------------ |
| `observerLoadingErrorState` | API calls      | Check network tab, verify endpoint   |
| Signal update errors        | Store state    | Verify store initialization order    |
| Form validation             | Reactive forms | Check `initialFormConfig` validators |
| Missing `untilDestroyed()`  | Subscriptions  | Memory leak - add cleanup operator   |

#### Common Bug Categories

##### Backend

1. **Validation Failures**
    - Missing `.And()` in validation chain
    - Async validation not awaited
    - Wrong entity expression filter

2. **Repository Issues**
    - Using wrong repository type
    - Missing `loadRelatedEntities` parameter
    - N+1 query patterns

3. **Event Handler Problems**
    - Handler not registered
    - `HandleWhen` returning false
    - Missing `await` in async handler

4. **Message Bus**
    - Consumer not receiving messages
    - Serialization issues with message payload
    - Missing `TryWaitUntilAsync` for dependencies

##### Frontend

1. **Component Lifecycle**
    - Missing `super.ngOnInit()` call
    - Store not provided in component
    - Missing `untilDestroyed()` cleanup

2. **State Management**
    - Stale VM state after navigation
    - Race conditions in `effectSimple`
    - Missing `observerLoadingErrorState` key

3. **Form Issues**
    - `initialFormConfig` not returning controls
    - Async validators not checking `isViewMode`
    - Missing `dependentValidations`

#### Investigation Workflow

##### Step 1: Identify Layer

```
Error location?
├── Controller → Check authorization, request binding
├── Command Handler → Check validation, business logic
├── Repository → Check query, entity state
├── Entity Event → Check HandleWhen, async operations
├── Message Consumer → Check message format, dependencies
├── Angular Component → Check store, subscriptions
├── Angular Service → Check API URL, request format
└── Angular Store → Check state updates, effects
```

##### Step 2: Platform-Specific Checks

**Backend checklist:**

- [ ] Is the correct repository type used? (`IPlatformQueryableRootRepository`)
- [ ] Is validation using `PlatformValidationResult` fluent API?
- [ ] Are side effects in entity event handlers (not command handlers)?
- [ ] Is message bus used for cross-service communication?

**Frontend checklist:**

- [ ] Does component extend correct base class?
- [ ] Is store provided in component decorator?
- [ ] Are subscriptions cleaned up with `untilDestroyed()`?
- [ ] Is `observerLoadingErrorState` used for API calls?

##### Step 3: Find Working Example

Search codebase for similar working patterns:

```bash
# Find similar command handlers
grep -r "PlatformCqrsCommandApplicationHandler" src/Backend/

# Find similar entity events
grep -r "PlatformCqrsEntityEventApplicationHandler" src/Backend/

# Find similar Angular components
grep -r "AppBaseVmStoreComponent" src/Frontend/
```

##### Step 4: Compare Differences

Common differences causing bugs:

- Missing `await` keyword
- Wrong parameter order
- Missing base class method call
- Different constructor injection
- Missing decorator or attribute

#### Verification Commands

```bash
# Backend build
dotnet build EasyPlatform.sln

# Backend tests
dotnet test src/Backend/PlatformExampleApp.TextSnippet.UnitTests/

# Frontend build
cd src/Frontend && nx build playground-text-snippet

# Frontend tests
cd src/Frontend && nx test platform-core
```

---

## Quick Reference

```
Bug → Systematic Debugging (Phase 1-4)
  Error deep in stack? → Root Cause Tracing (trace backward)
  Found root cause? → Defense-in-Depth (add layers)
  EasyPlatform issue? → EasyPlatform-Specific (platform patterns)
  About to claim success? → Verification (verify first)
```

## Red Flags

Stop and follow process if thinking:

- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "It's probably X, let me fix that"
- "Should work now" / "Seems fixed"
- "Tests pass, we're done"

**All mean:** Return to systematic process.

## Related

- **Follow-up:** `code-simplifier` - Simplify code after debugging
- **Review:** `code-review` - Review fixes before committing
- **Testing:** `test-specs-docs` - Generate tests for the fix
- **Upstream:** `feature-investigation` - General codebase investigation
- **Protocol:** `.github/AI-DEBUGGING-PROTOCOL.md` - Comprehensive debugging protocol

## Version History

| Version | Date       | Changes                                                                  |
| ------- | ---------- | ------------------------------------------------------------------------ |
| 4.0.0   | 2026-01-20 | Merged tasks-bug-diagnosis, added autonomous mode with --autonomous flag |
| 3.0.0   | 2025-12-01 | Added EasyPlatform-specific debugging, verification protocols            |
| 2.0.0   | 2025-10-15 | Added defense-in-depth, root cause tracing                               |
| 1.0.0   | 2025-08-01 | Initial release with systematic debugging                                |

## IMPORTANT Task Planning Notes

- Always plan and break many small todo tasks
- Always add a final review todo task to review the works done at the end to find any fix or enhancement needed
