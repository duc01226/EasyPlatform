# AI Debugging Protocol

## Core Principles

- NEVER assume based on first glance
- ALWAYS verify with multiple search patterns
- CHECK both static AND dynamic code usage
- READ actual implementation, not just interfaces
- TRACE full dependency chains
- DECLARE confidence level and uncertainties
- REQUEST user confirmation when confidence < 90%

## Anti-Hallucination Protocols

### ASSUMPTION_VALIDATION_CHECKPOINT

Before every major operation:

1. "What assumptions am I making about [X]?"
2. "Have I verified this with actual code evidence?"
3. "Could I be wrong about [specific pattern/relationship]?"

### EVIDENCE_CHAIN_VALIDATION

Before claiming any relationship:

- "I believe X calls Y because..." → show actual code
- "This follows pattern Z because..." → cite specific examples
- "Service A owns B because..." → grep for actual boundaries

### TOOL_EFFICIENCY_PROTOCOL

- Batch multiple Grep searches into single calls with OR patterns
- Use parallel Read operations for related files
- Combine semantic searches with related keywords

### CONTEXT_ANCHOR_SYSTEM

Every 10 operations:

1. Re-read the original task description
2. Verify current operation aligns with original goals
3. Check if we're solving the right problem

**Quick Reference**:

- **Context Drift** → Re-read original task
- **Assumption Creep** → Halt, validate with code
- **Evidence Gap** → Mark as "inferred"

## Verification Checklist

Before removing/changing ANY code, verify:

- [ ] Searched static imports?
- [ ] Searched string literals in code?
- [ ] Checked dynamic invocations (attributes, properties, runtime)?
- [ ] Read actual implementations?
- [ ] Traced who depends on this?
- [ ] Assessed what breaks if removed?
- [ ] Documented evidence clearly?
- [ ] Declared confidence level?

**If ANY unchecked → DO MORE INVESTIGATION**
**If confidence < 90% → REQUEST USER CONFIRMATION**

## Search Strategy

### Multi-Pattern Search

```
1. Search exact class/method name
2. Search partial name variations
3. Search string literals that might reference it
4. Search for reflection/dynamic usage patterns
5. Search configuration files
```

### Dependency Tracing

```
1. Find all direct usages (imports, references)
2. Find all indirect usages (interfaces, base classes)
3. Find configuration/DI registrations
4. Find runtime/reflection usage
5. Find test references
```

## Bug Analysis Workflow

### Step 1: Reproduce & Understand

- Understand the reported behavior
- Identify the expected behavior
- Reproduce the issue if possible

### Step 2: Gather Evidence

- Search for related code patterns
- Read actual implementations
- Trace data flow
- Check related tests

### Step 3: Analyze Root Cause

- Identify the actual cause vs symptoms
- Verify assumptions with code evidence
- Consider edge cases

### Step 4: Propose Solution

- Present findings with evidence
- Declare confidence level
- Request confirmation if uncertain

## Confidence Levels

### High Confidence (90-100%)

- Multiple independent evidence sources
- Clear code path traced
- No contradicting evidence
- Can proceed with changes

### Medium Confidence (70-89%)

- Some evidence found
- Some uncertainty remains
- Should present findings first
- Request confirmation before major changes

### Low Confidence (< 70%)

- Limited evidence
- Multiple possible interpretations
- MUST request user confirmation
- Present all possibilities found

## Common Mistakes to Avoid

### Assumption Errors

- Assuming code is unused because it's not directly imported
- Assuming a function isn't called because you can't find direct calls
- Assuming tests cover all usage patterns

### Search Errors

- Only searching for exact matches
- Not considering string-based or reflection-based usage
- Not checking configuration files
- Not checking related services/modules

### Analysis Errors

- Not reading full implementation
- Not checking base classes
- Not considering inheritance chains
- Not checking event handlers/subscribers

## Evidence Documentation

When presenting findings, include:

1. What was searched
2. What was found
3. What was NOT found
4. Confidence level
5. Remaining uncertainties
6. Recommendation with reasoning
