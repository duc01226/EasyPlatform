# Anti-Hallucination Patterns

> **Note**: The mandatory protocol has been consolidated into `.claude/skills/shared/evidence-based-reasoning-protocol.md`.
> This file remains as an optional deep-dive reference with comprehensive examples and verification commands.
>
> **Purpose**: Prevent AI speculation by requiring evidence before claims.
> **Usage**: Reference this file for detailed examples and verification commands.

---

## CRITICAL: Evidence-Based Reasoning (MANDATORY)

Before making ANY claim about code behavior, you MUST complete this checklist:

### Pre-Claim Verification Checklist

**For ANY statement starting with:**

- "This is wrong because..."
- "This should be..."
- "The issue is..."
- "X doesn't work because..."
- "The problem is..."
- "This needs to be changed to..."

**You are BLOCKED from proceeding until you provide:**

- [ ] **Evidence File Path** - Which file did you read? Include `file:line` format
- [ ] **Grep Search Performed** - What search validated your claim? Show command + results
- [ ] **Similar Pattern Found** - Found 3+ examples of similar code in codebase?
- [ ] **Framework Documentation** - Cited official docs if claiming framework behavior?
- [ ] **Confidence Level** - Stated X% confidence with evidence list?

**If you cannot complete checklist → REQUIRED OUTPUT:**

```
Insufficient evidence to determine root cause.

What I've verified: [list what you checked]
What I haven't verified: [list missing evidence]

Recommended next steps:
1. [specific investigation action]
2. [specific investigation action]

Would you like me to investigate further?
```

---

## Forbidden Phrases (NEVER USE WITHOUT EVIDENCE)

These phrases indicate speculation:

| Forbidden Phrase                  | Why It's Dangerous          | Evidence-Based Alternative                                             |
| --------------------------------- | --------------------------- | ---------------------------------------------------------------------- |
| ❌ "should be public"             | Assumes visibility issue    | ✅ "Grep shows 12 similar private methods work fine at [files]"        |
| ❌ "the order matters"            | Assumes framework behavior  | ✅ "Framework docs at [URL] specify order requirements"                |
| ❌ "need to configure both sides" | Assumes ORM requirement     | ✅ "Grep search of 20 FK configs shows single-side pattern at [files]" |
| ❌ "this is because..."           | Claims causation            | ✅ "Evidence from [file:line] shows [concrete behavior]"               |
| ❌ "obviously..."                 | Dismisses verification need | ✅ "Pattern found in 8 locations: [list files]"                        |
| ❌ "I think..."                   | Pure speculation            | ✅ "Based on [evidence], confidence: X%"                               |
| ❌ "probably..."                  | Uncertain guess             | ✅ "Needs verification: [list what to check]"                          |
| ❌ "usually..."                   | Generalization              | ✅ "Found in 15/20 cases: [pattern description]"                       |

---

## Required Replacement Phrases

Always use evidence-first language:

✅ **"Evidence from [file:line] shows..."**
✅ **"Grep search reveals X instances where..."**
✅ **"Framework docs at [URL] specify..."**
✅ **"Found pattern in [list 3+ files with line numbers]..."**
✅ **"Confidence: X% based on [evidence list]..."**
✅ **"I don't have enough evidence yet. Need to investigate..."**
✅ **"Verified by reading [file:line] which shows..."**
✅ **"Compared with working pattern at [file:line]..."**

---

## Common Hallucination Patterns (AVOID)

### 1. Visibility Speculation

**Hallucination**: "Method not working because it's private, should be public"

**Why Wrong**: C# access modifiers don't affect method execution within the class. Private methods are commonly used for helper/internal logic.

**Evidence-Based Approach**:

```bash
# Step 1: Search for similar patterns
grep -r "private.*async Task.*SyncUserData" src/Services/ --include="*.cs"

# Step 2: Check if similar private methods exist and work
grep -r "private static async Task" src/Services/{ServiceName} --include="*.cs" -l

# Step 3: State finding
"Found 23 private async Task methods in the target service. Private visibility is common pattern, not the issue."
```

**Rule**: NEVER claim visibility causes functionality issues without evidence from error messages or runtime exceptions.

---

### 2. Framework Behavior Guesses

**Hallucination**: "Parameter order matters in dependency injection"

**Why Wrong**: .NET DI container matches by type, not position. Parameter order is irrelevant for DI resolution.

**Evidence-Based Approach**:

```bash
# Step 1: Search for varied parameter orders
grep -r "public.*DbContext.*DbContext" --include="*.cs" -A 3

# Step 2: Cite framework docs
"Microsoft.Extensions.DependencyInjection resolves by type. Source: https://docs.microsoft.com/en-us/aspnet/core/fundamentals/dependency-injection"

# Step 3: Show examples from codebase
"Found 8 constructors with varied DbContext parameter orders at:
- File1:line (primary first)
- File2:line (secondary first)
All work correctly regardless of order."
```

**Rule**: NEVER claim framework behavior without doc citation OR multiple code examples showing the behavior.

---

### 3. ORM Configuration Assumptions

**Hallucination**: "Must configure foreign key relationship from both sides"

**Why Wrong**: EF Core requires FK configuration from ONE side only (parent OR child entity, not both).

**Evidence-Based Approach**:

```bash
# Step 1: Search for existing FK patterns
grep -r "HasOne.*WithMany.*HasForeignKey" --include="*.cs" -A 3 -B 1

# Step 2: Count one-way vs two-way configs
# Count: 45 one-way configs, 0 two-way configs in the target service

# Step 3: Cite EF Core docs
"EF Core docs specify one-side configuration sufficient. Found 45 examples of one-way FK config in codebase."
```

**Rule**: NEVER claim ORM requirements without verifying existing patterns in codebase OR citing official docs.

---

### 4. "Should Be" Syndrome

**Hallucination**: "This should be X instead of Y"

**Why Wrong**: "Should be" implies design flaw without understanding original intent or constraints.

**Evidence-Based Approach**:

```
# Instead of: "This should use Repository pattern"
# Say: "Found 12 similar components using Repository pattern at [files]. This component uses direct DbContext.
# Confidence: 60% that Repository pattern would be better, but need to understand why direct DbContext was chosen."
```

**Rule**: Replace "should be" with evidence comparison: "Pattern X used in N places, but Y used here. Reason for difference: [investigate or admit unknown]."

---

## Verification Commands by Topic

### C# Method Visibility

```bash
# Check if private methods commonly used
grep -r "private.*async Task" --include="*.cs" | head -20

# Check if public methods commonly used
grep -r "public.*async Task" --include="*.cs" | head -20
```

### Dependency Injection Patterns

```bash
# Find constructor parameter orders
grep -r "public.*constructor.*DbContext" --include="*.cs" -A 5

# Check varied DI parameter positions
grep -r "DbContext.*DbContext" --include="*.cs" -A 3
```

### EF Core Relationships

```bash
# Find HasOne/WithMany patterns
grep -r "HasOne.*WithMany" --include="*.cs" -A 3 -B 1

# Check if FK configured from both sides or one side
grep -r "HasForeignKey" --include="*.cs" -B 5 | grep -E "HasOne|WithMany"
```

### Foreign Key Cascade Behavior

```bash
# Find cascade delete patterns
grep -r "OnDelete.*Cascade" --include="*.cs"

# Find set null patterns
grep -r "OnDelete.*SetNull" --include="*.cs"

# Check default behavior (no OnDelete specified)
grep -r "HasForeignKey" --include="*.cs" -A 1 | grep -v "OnDelete"
```

### Static vs Instance Method Usage

```bash
# Find static method patterns
grep -r "private static.*Execute" --include="*.cs"

# Find instance method patterns
grep -r "private.*Execute" --include="*.cs" | grep -v "static"
```

---

## Confidence Declaration Format (MANDATORY)

For ANY architectural recommendation, code removal, or refactoring suggestion:

```markdown
## Recommendation: [Your Recommendation]

### Evidence

1. **[file:line]** - [What it shows concretely]
2. **Grep Result** - Found X instances of [pattern] in [files]
3. **Framework Documentation** - [URL or citation] states [specific quote]
4. **Similar Patterns** - [List 3+ files where similar code exists]

### Confidence: X%

**Why This Confidence Level**:

- ✅ Verified: [What evidence you have]
- ⚠️ Unverified: [What you haven't checked yet]
- ❓ Assumptions: [Any remaining assumptions]

### Missing Evidence

[List what you haven't verified yet and would need to reach higher confidence]

### Risk Assessment

**If Wrong**: [What breaks if this recommendation is incorrect]
**Mitigation**: [How to validate before implementing]
```

**Confidence Thresholds**:

- **< 60%**: DO NOT RECOMMEND → Say "Insufficient evidence. Need to investigate [list items]"
- **60-79%**: Recommend with heavy caveats ("Need to verify X, Y, Z before implementing")
- **80-94%**: Recommend with minor caveats ("Verified main pattern, edge cases remain")
- **95-100%**: Strong recommendation ("Full evidence chain complete, all 5 services checked")

---

## "I Don't Know" Culture (ENCOURAGED)

**Saying "I don't know yet" is BETTER than guessing wrong.**

### When to Say "I Don't Know"

1. Haven't read the relevant code files
2. Haven't run Grep searches to verify pattern
3. Unfamiliar with specific framework behavior
4. Can't find 3+ similar examples in codebase
5. Confidence level < 60%

### How to Say It (Examples)

✅ **Good**:

```
I don't have enough evidence to determine if this is the root cause.
What I've checked:
- Read [file:line] - shows X
- Grepped for Y - found 0 results

What I haven't verified:
- Framework behavior for Z
- Similar patterns in other services
- Error message stack trace

Would you like me to investigate further, or do you have additional context?
```

✅ **Good**:

```
Confidence: 40% that private visibility is the issue.

Evidence: None yet - this is speculation based on visibility.

Need to verify:
1. Search for similar private methods
2. Check error message for visibility-related exception
3. Test if making it public actually fixes the issue

I recommend investigating these 3 items before claiming visibility is the cause.
```

❌ **Bad**:

```
The issue is that the method is private. It should be public.
```

---

## Testing Your Response for Hallucination

Before submitting response, ask yourself:

### Checklist

- [ ] Did I use any forbidden phrases without evidence?
- [ ] Did I make claims about framework behavior without citations?
- [ ] Did I recommend changes without confidence declaration?
- [ ] Did I say "should be" without comparing to existing patterns?
- [ ] Did I skip the Pre-Claim Verification Checklist?
- [ ] Did I provide file:line references for ALL claims?
- [ ] Did I admit what I don't know / haven't verified?

**If ANY checkbox unchecked → Revise response to add evidence.**

---

## Examples: Bad vs Good Responses

### Example 1: Method Visibility

❌ **HALLUCINATION (Bad)**:

```
The issue is that the SyncUserCompanyInfos method is declared as private.
This prevents it from being called by ExecuteInjectScopedPagingAsync.
You should change it to public.
```

✅ **EVIDENCE-BASED (Good)**:

```
Let me verify if visibility is the issue.

[Runs grep -r "private.*async Task" src/Services/{ServiceName} --include="*.cs"]

Evidence: Found 23 private async Task methods in the target service, including:
- File1:45 - private async Task ProcessBatch() - works fine
- File2:78 - private async Task SyncData() - works fine

Conclusion: Private visibility is NOT the issue. Private async methods are common pattern in this codebase.

Confidence: 95% that visibility is not the root cause.

Need to investigate actual error message or execution failure instead.
```

---

### Example 2: Parameter Order

❌ **HALLUCINATION (Bad)**:

```
The problem is that the DbContext parameters are in the wrong order.
The PRIMARY DbContext should come before the SECONDARY DbContext.
```

✅ **EVIDENCE-BASED (Good)**:

```
Let me verify if parameter order matters for DI.

[Runs grep -r "public.*DbContext.*DbContext" --include="*.cs" -A 3]

Evidence from codebase:
- File1:line - SurveyDbContext, AccountDbContext (survey first)
- File2:line - AccountDbContext, SurveyDbContext (account first)
- File3:line - Primary, Secondary (primary first)

Both orders work correctly. .NET DI resolves by type, not position.

Framework Documentation: Microsoft.Extensions.DependencyInjection matches parameters by type.
Source: https://docs.microsoft.com/en-us/aspnet/core/fundamentals/dependency-injection

Confidence: 100% that parameter order does NOT matter.

The root cause must be elsewhere - need to investigate the actual error message.
```

---

### Example 3: ORM Configuration

❌ **HALLUCINATION (Bad)**:

```
You're missing the FK configuration from OrganizationalUnitUser to User.
You need to configure the relationship from both sides:
- User → OrganizationalUnitUsers (already exists)
- OrganizationalUnitUser → User (missing, need to add)
```

✅ **EVIDENCE-BASED (Good)**:

```
Let me verify if two-way FK configuration is required.

[Runs grep -r "HasOne.*WithMany.*HasForeignKey" --include="*.cs" -A 3 -B 1]

Evidence from the target service FK configurations:
- UserCompanyInfo → User: ONE-WAY config from UserCompanyInfo only (line 30-33)
- UserCompanyInfo → Company: ONE-WAY config from UserCompanyInfo only (line 35-38)
- 45 total FK relationships found, ALL use one-way configuration

EF Core Pattern: FK configured from ONE side only (parent OR child, not both).

Already configured:
- ApplicationUserEntityConfiguration.cs:38-40 - User.HasMany(UserOrganizationalUnits)

This IS sufficient. No additional config needed on OrganizationalUnitUser side.

Confidence: 98% that one-way config is correct pattern.

The FK relationship exists and is properly configured.
```

---

## Summary: The Evidence-First Mindset

### Before (Hallucination-Prone)

1. See code
2. Make assumption
3. State as fact
4. User corrects
5. Lose trust

### After (Evidence-Based)

1. See code
2. Form hypothesis
3. **Gather evidence** (Grep, Read, Docs)
4. State finding with confidence level
5. Admit what you don't know
6. Build trust

**Key Principle**: **Slow down, verify first, then claim.**

---

## When to Use This File

- ✅ Before making ANY architectural recommendation
- ✅ Before claiming "X is wrong because Y"
- ✅ Before saying "this should be..."
- ✅ Before diagnosing root cause
- ✅ When confidence < 80%
- ✅ When user asks "are you sure?"

**Default Mode**: Evidence-based reasoning, not speculation.

---

**Version**: 1.0
**Last Updated**: 2026-02-06
**Incidents Prevented**: Target 95% hallucination reduction
