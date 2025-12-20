# AI Debugging Protocol for EasyPlatform

> **Critical Protocol for AI Agents** - Evidence-Based Analysis & Code Investigation
> **Version:** 1.0
> **Last Updated:** 2025-11-06
> **Status:** MANDATORY for all bug analysis, code removal decisions, and debugging tasks

---

## 📋 Table of Contents

1. [Core Mission](#core-mission)
2. [When to Apply This Protocol](#when-to-apply-this-protocol)
3. [Universal Core Principles](#universal-core-principles)
4. [Quick Verification Checklist](#quick-verification-checklist)
5. [Evidence Collection Framework](#evidence-collection-framework)
6. [Investigation Protocol](#investigation-protocol)
7. [Code Removal Safety Protocol](#code-removal-safety-protocol)
8. [Confidence Assessment Framework](#confidence-assessment-framework)
9. [Red Flags & Warning Signs](#red-flags--warning-signs)
10. [Case Studies](#case-studies)
11. [Evidence Documentation Templates](#evidence-documentation-templates)
12. [Escalation & User Confirmation Rules](#escalation--user-confirmation-rules)

---

## Core Mission

**Primary Objective:** Prevent breaking changes through comprehensive, evidence-based analysis.

**Key Philosophy:**
- ✅ **It's better to ask 10 questions than make 1 wrong assumption**
- ✅ **The best suggestion is one that doesn't break existing functionality**
- ✅ **Never assume - always verify with code evidence**

---

## When to Apply This Protocol

**MANDATORY for:**
- ❗ Any code removal or deletion suggestions
- ❗ Bug analysis and debugging
- ❗ Analyzing "unused" or "dead" code
- ❗ Dependency removal recommendations
- ❗ Refactoring that involves removing functionality
- ❗ Major code changes affecting multiple files

**RECOMMENDED for:**
- Feature implementation planning
- Architecture decisions
- Performance optimization
- Security analysis
- Code review and refactoring

---

## Universal Core Principles

### ❌ NEVER (Absolute Prohibitions)

1. **NEVER assume without evidence**
   - First impressions are often wrong
   - Surface-level analysis is insufficient
   - Interfaces don't show the full picture

2. **NEVER trust static analysis alone**
   - Dynamic property access (`element.attr()`, `element.prop()`) creates runtime dependencies
   - String literals in code create hidden references
   - Framework integrations may have zero visible imports

3. **NEVER remove code without comprehensive search**
   - Must search: static imports + dynamic usage + string literals
   - Must verify: template usage + runtime behavior + framework integration

4. **NEVER propose solutions without documented evidence**
   - Provide file:line references for all claims
   - Show actual code, not summaries
   - Include search commands used

5. **NEVER proceed when confidence < 90%**
   - Request user confirmation explicitly
   - Document uncertainties clearly
   - Provide investigation commands for user

### ✅ ALWAYS (Mandatory Actions)

1. **ALWAYS search multiple patterns**
   ```bash
   # Static imports
   grep -r "ImportName" --include="*.ts" --include="*.cs"

   # Dynamic usage (string literals)
   grep -r "'propertyName'|\"propertyName\"" --include="*.ts" --include="*.cs"

   # Template/HTML usage
   grep -r "propertyName|\[propertyName\]" --include="*.html"

   # Runtime access
   grep -r "\.attr\(.*property\)|\.prop\(.*property\)" --include="*.ts"
   ```

2. **ALWAYS read actual implementations**
   - Don't stop at interfaces or type definitions
   - Read the actual class/component code
   - Check lifecycle hooks (ngOnInit, ngOnChanges, etc.)
   - Verify business logic and purpose

3. **ALWAYS trace full dependency chains**
   - Who depends on this code?
   - What breaks if removed?
   - What calls this function/component?
   - What consumes this service/event?

4. **ALWAYS document evidence**
   - File paths with line numbers
   - Search commands executed
   - Results found (or explicitly "NONE FOUND")
   - Implementation details

5. **ALWAYS declare confidence level**
   - **High (90-100%):** Strong evidence, all boxes checked, no contradictions
   - **Medium (70-89%):** Some gaps, minor uncertainties, edge cases unclear
   - **Low (<70%):** Significant unknowns, contradictory evidence, missing info

6. **ALWAYS request confirmation when unsure**
   - If confidence < 90%: STOP and ask user
   - Provide specific questions
   - Suggest verification commands
   - Admit what you don't know

---

## Quick Verification Checklist

**BEFORE analyzing code as "unused" or proposing removal:**

```
☐ Searched static imports/usage?
☐ Searched string literals in code ('.property', "property")?
☐ Checked dynamic invocations (element.attr(), element.prop(), runtime calls)?
☐ Read actual implementation (not just interfaces)?
☐ Traced dependency chains (who depends on this)?
☐ Assessed what breaks if removed?
☐ Checked for framework integration patterns?
☐ Verified no polyfill/side-effect imports?
☐ Documented all evidence clearly?
☐ Declared confidence level (High/Medium/Low)?

✅ If ALL boxes checked → Proceed with recommendation
❌ If ANY box unchecked → DO MORE INVESTIGATION
⚠️ If confidence < 90% → REQUEST USER CONFIRMATION
```

---

## Evidence Collection Framework

### 1. Multi-Pattern Search Strategy

**Complete all search types - static analysis alone is INSUFFICIENT:**

#### 1.1 Static Analysis (Direct References)

```bash
# Component/Service imports
grep -r "ComponentName\|ServiceName" --include="*.ts" --include="*.html" --include="*.cs"

# Module imports
grep -r "from.*ModuleName\|import.*ModuleName" --include="*.ts" --include="*.cs"

# Type usage
grep -r ": TypeName\|<TypeName>" --include="*.ts" --include="*.cs"

# Inheritance
grep -r "extends ClassName\|implements InterfaceName" --include="*.ts" --include="*.cs"
```

#### 1.2 Dynamic Usage Analysis (String Literals & Runtime) ⚡ CRITICAL

```bash
# String literals (property names, attributes)
grep -r "'propertyName'\|\"propertyName\"" --include="*.ts" --include="*.html" --include="*.cs"

# Dynamic property access
grep -r "\.attr\(.*property\)\|\.prop\(.*property\)" --include="*.ts"

# Element selectors
grep -r "querySelector.*property\|querySelectorAll.*property" --include="*.ts"

# Runtime configuration
grep -r "providers.*ServiceName\|forRoot.*ModuleName" --include="*.ts"
```

#### 1.3 Framework Integration Points

```bash
# Angular directives/components (template usage)
grep -r "\[propertyName\]\|propertyName=" --include="*.html"

# Two-way binding
grep -r "\[\(ngModel\)\]\|\[\(formControl\)\]" --include="*.html"

# Dependency injection
grep -r "constructor.*ServiceName\|@Inject.*Token" --include="*.ts"

# Providers and module imports
grep -r "providers:\|imports:\|@NgModule" --include="*.ts"
```

#### 1.4 Implementation Reading (MANDATORY)

**For each file under investigation:**

1. **Read the actual implementation**
   - Don't just check imports
   - Read the class/component body
   - Check all methods and lifecycle hooks

2. **Understand the business purpose**
   - Why does this code exist?
   - What problem does it solve?
   - What would break without it?

3. **Check for dynamic behavior**
   - Property setting in ngOnInit, ngOnChanges
   - Event handlers that modify properties
   - Conditional usage based on runtime state

4. **Verify framework integration**
   - ControlValueAccessor implementation
   - Provider registration
   - Global side effects (polyfills, initializers)

### 2. Evidence Documentation Requirements

**For EVERY investigation, document:**

| Evidence Type       | Required Information              | Example                                          |
| ------------------- | --------------------------------- | ------------------------------------------------ |
| Static Imports      | File paths, line numbers, context | `src/app/component.ts:15 - import { Service }`   |
| String Literals     | Locations of string references    | `src/app/logic.ts:42 - element.attr('property')` |
| Dynamic Invocations | Runtime access patterns           | `src/app/handler.ts:67 - obj[propertyName]`      |
| Template Usage      | HTML/template references          | `src/app/component.html:23 - [property]="value"` |
| Implementation      | What code does, why it exists     | "Provides validation for form control X"         |
| Dependencies        | What depends on this code         | "Used by ComponentA, ServiceB, ModuleC"          |
| Breaking Changes    | What fails if removed             | "Feature X stops working, validation breaks"     |

**Document format:**

```markdown
## Evidence Collection Results

### Static Analysis:
- **Command:** `grep -r "ImportName" --include="*.ts"`
- **Results:** 3 matches found
  - `src/app/module-a.ts:12` - import statement
  - `src/app/component-b.ts:45` - type annotation
  - `src/app/service-c.ts:78` - dependency injection

### Dynamic Usage:
- **Command:** `grep -r "'propertyName'" --include="*.ts"`
- **Results:** NONE FOUND

### Template Usage:
- **Command:** `grep -r "\[propertyName\]" --include="*.html"`
- **Results:** 1 match found
  - `src/app/component.html:23` - property binding

### Implementation Analysis:
- **File:** `src/app/service.ts`
- **Purpose:** Handles user authentication state
- **Business Logic:** Validates JWT tokens and manages session
- **Dependencies:** Used by AuthGuard, LoginComponent, HeaderComponent
```

---

## Investigation Protocol

### Phase 0: Pre-Investigation Checklist

**Before starting investigation:**

1. **Clarify the objective**
   - What exactly are we investigating?
   - What decision needs to be made?
   - What's the expected outcome?

2. **Identify scope**
   - Which files/components are involved?
   - Which microservices are affected?
   - What's the blast radius?

3. **Set success criteria**
   - What evidence proves the hypothesis?
   - What confidence level is needed?
   - What risks are acceptable?

### Phase 1: Evidence Collection

**Execute all search patterns from [Evidence Collection Framework](#evidence-collection-framework)**

1. Run static analysis searches
2. Run dynamic usage searches
3. Read actual implementations
4. Document all findings with file:line references

### Phase 2: Multi-Perspective Analysis

**Analyze the code from multiple angles:**

#### 2.1 What Does the Code Do? (Implementation)
- Read the actual code
- Understand the logic flow
- Map inputs → processing → outputs

#### 2.2 Why Does the Code Exist? (Purpose)
- Check git history (`git log` for the file)
- Read commit messages
- Understand business requirements
- Identify original problem being solved

#### 2.3 Who Uses the Code? (Consumers)
- Direct references (imports)
- Indirect references (string literals)
- Framework integrations
- Cross-service dependencies

#### 2.4 When is the Code Invoked? (Lifecycle)
- Component lifecycle hooks
- Event handlers
- Background jobs
- Message bus consumers

#### 2.5 How is the Code Invoked? (Mechanism)
- Direct function calls
- Dependency injection
- Event-driven (messages, observables)
- Dynamic property access

### Phase 3: Self-Doubt Questions (CRITICAL)

**Ask yourself these questions BEFORE concluding:**

1. **Could this code be used dynamically?**
   - Via string references?
   - Via element.attr() or element.prop()?
   - Via runtime configuration?

2. **Could this be a framework integration point?**
   - ControlValueAccessor (invisible form integration)?
   - Provider (global service registration)?
   - Polyfill (side-effect import)?
   - Directive (template-level integration)?

3. **Could this provide invisible functionality?**
   - Framework hooks (no visible calls)?
   - Global side effects?
   - Passive listeners?

4. **What breaks if I'm wrong?**
   - Which features stop working?
   - Which users are affected?
   - What's the recovery plan?

5. **Why might someone disagree with my analysis?**
   - What evidence could I be missing?
   - What assumptions am I making?
   - What edge cases haven't I considered?

### Phase 4: Risk Assessment

**Evaluate the risk of your recommendation:**

| Risk Level | Criteria                                                   | Action                            |
| ---------- | ---------------------------------------------------------- | --------------------------------- |
| **Low**    | No evidence of usage, clear obsolescence, easy rollback    | Proceed with confidence           |
| **Medium** | Minor usage, easy to replace, clear migration path         | Proceed with caution + monitoring |
| **High**   | Core functionality, widespread usage, complex dependencies | STOP - Need user confirmation     |

---

## Code Removal Safety Protocol

**⚠️ CRITICAL: Removing code requires EXCEPTIONAL evidence that it's truly unused**

### Removal Verification Matrix

**ALL boxes must be checked before recommending removal:**

| Check Type            | Evidence Required                              | Status |
| --------------------- | ---------------------------------------------- | ------ |
| Static imports        | No imports found in any file                   | ☐      |
| String literals       | No string references to names/properties       | ☐      |
| Dynamic invocations   | No `.attr()`, `.prop()`, runtime access        | ☐      |
| Template usage        | No HTML references or directives               | ☐      |
| Framework integration | Not a polyfill, ControlValueAccessor, provider | ☐      |
| Dependency check      | No other code breaks if removed                | ☐      |
| Purpose analysis      | Understand WHY it was added (git history)      | ☐      |
| Business validation   | Feature still needed or obsolete?              | ☐      |

**Decision Rules:**

```
IF all 8 boxes checked + confidence >= 90% + risk = low:
  → Safe to recommend removal

IF any box unchecked OR confidence < 90% OR risk > low:
  → DO NOT recommend removal
  → Request user confirmation
  → Provide evidence gaps
```

### Removal Documentation Template

```markdown
## Code Removal Analysis: [Code Name]

### Summary:
[One-sentence description of what you're proposing to remove]

### Evidence of Non-Usage:

#### Static Analysis:
- **Command:** `grep -r "CodeName" --include="*.ts" --include="*.cs"`
- **Results:** [0 matches / list all matches with file:line]

#### Dynamic Analysis:
- **Command:** `grep -r "'codeName'|\"codeName\"" --include="*.ts" --include="*.cs"`
- **Results:** [findings with file:line or "NONE FOUND"]

#### Template Analysis:
- **Command:** `grep -r "codeName|\[codeName\]" --include="*.html"`
- **Results:** [findings or "NONE FOUND"]

### Purpose Analysis:

#### Git History:
- **Command:** `git log --all --grep="CodeName" --oneline`
- **When added:** [date, commit hash]
- **Why added:** [from commit message/PR description]
- **Original purpose:** [explanation]
- **Current relevance:** [still needed or obsolete - with evidence]

### Framework Integration Check:

- **Is polyfill?** [Yes/No - evidence]
- **Is ControlValueAccessor?** [Yes/No - evidence]
- **Is provider/side-effect import?** [Yes/No - evidence]
- **Global initialization?** [Yes/No - evidence]

### Dependency Impact:

- **Breaking changes if removed:** [list impacts with evidence or "NONE FOUND"]
- **Dependent features:** [list with file:line or "none found"]
- **Cross-service impact:** [list affected services or "none"]

### Risk Assessment:

**Risk Level:** [Low / Medium / High]

**Justification:**
- [Reason 1]
- [Reason 2]

### Confidence Level:

**Confidence:** [X%] - [High 90-100% / Medium 70-89% / Low <70%]

**Certainties:**
- ✅ [What we're certain about]
- ✅ [What we're certain about]

**Uncertainties:**
- ⚠️ [What's unclear]
- ⚠️ [What needs verification]

### Recommendation:

**IF High confidence (>90%) + Low Risk:**
```
Safe to remove [CodeName]. All verification checks passed.
Rollback plan: [how to restore if needed]
```

**IF Medium confidence (70-89%) OR Medium Risk:**
```
Removal possible with caution. Monitor [specific areas] after deployment.
User confirmation recommended for: [specific concerns]
```

**IF Low confidence (<70%) OR High Risk:**
```
⚠️ DO NOT REMOVE without user confirmation.

Verification Needed:
1. [Specific question 1]
2. [Specific question 2]

Commands for User:
```bash
# Command 1 - purpose
grep -r "pattern" /path
```
```

---

## Confidence Assessment Framework

### Confidence Level Definition

| Level      | Range   | Criteria                                                          | Action                                |
| ---------- | ------- | ----------------------------------------------------------------- | ------------------------------------- |
| **High**   | 90-100% | Strong evidence, all checks passed, no contradictions             | Proceed with recommendation           |
| **Medium** | 70-89%  | Some evidence gaps, minor uncertainties, edge cases unclear       | Proceed with caution + user awareness |
| **Low**    | <70%    | Significant unknowns, contradictory evidence, missing information | STOP - Request user guidance          |

### Confidence Calculation Factors

**Increase confidence when:**
- ✅ All verification checks completed
- ✅ Multiple search patterns show consistent results
- ✅ Implementation reading confirms expectations
- ✅ Business purpose clearly understood
- ✅ No contradictory evidence found
- ✅ Dependency chain fully mapped
- ✅ Risk level is low

**Decrease confidence when:**
- ❌ Any verification check incomplete
- ❌ Search results inconsistent or ambiguous
- ❌ Implementation purpose unclear
- ❌ Business requirements unknown
- ❌ Contradictory evidence exists
- ❌ Dependency chain has gaps
- ❌ Risk level medium or high

### Confidence Documentation Template

```markdown
## Confidence Assessment

**Overall Confidence:** [X%] - [High/Medium/Low]

### Evidence Summary:
- ✅ **Static analysis:** [findings with file:line references]
- ✅ **Dynamic usage:** [findings with file:line references]
- ✅ **Implementation reading:** [key insights]
- ⚠️ **Uncertainties:** [list or "None"]

### Verification Matrix:
[X/8] boxes checked in removal verification matrix

### Search Patterns Executed:
1. `grep -r "pattern1"` → [results]
2. `grep -r "pattern2"` → [results]
3. [etc.]

### Files Analyzed:
- Total files: [count]
- Files read in detail: [count]
- Files with evidence: [count]

### Assumptions Made:
- [Assumption 1 - basis for assumption]
- [Assumption 2 - basis for assumption]
- [Or "None - fully evidence-based"]

### Potential Risks:
- **Risk 1:** [description]
  - **Mitigation:** [strategy]
- **Risk 2:** [description]
  - **Mitigation:** [strategy]
- [Or "No identified risks"]

### Gaps in Analysis:
- **Gap 1:** [what's missing]
  - **Impact:** [if this assumption is wrong, what breaks]
  - **Verification:** [how to verify]
- [Or "No gaps identified"]

### Recommendation:

**IF Confidence >= 90%:**
```
Recommendation is solid. Proceed with [action].
Monitor [specific areas] for regressions.
```

**IF Confidence 70-89%:**
```
Recommendation is reasonable but has uncertainties.
User should verify: [specific points]
Monitor: [specific areas]
```

**IF Confidence < 70%:**
```
⚠️ Cannot recommend with confidence.
Need clarification on:
1. [Question 1]
2. [Question 2]

Suggested verification steps:
[Steps for user to take]
```
```

---

## Red Flags & Warning Signs

### 🚩 Critical Red Flags (High Alert)

**Angular libraries with no visible template usage:**
- ❌ **Surface appearance:** "Not used in any template"
- ✅ **Reality:** May provide `ControlValueAccessor` for `[(ngModel)]` binding
- 🔍 **Check:** Search for `implements ControlValueAccessor`
- 📝 **Example:** ng-contenteditable library

**Dynamic property access:**
- ❌ **Surface appearance:** "Property not referenced"
- ✅ **Reality:** `element.attr('propertyName', value)` creates runtime dependency
- 🔍 **Check:** Search for `.attr(`, `.prop(`, `[propertyName]`
- 📝 **Example:** jQuery-style property manipulation

**Polyfills and init imports:**
- ❌ **Surface appearance:** "Import has no function calls"
- ✅ **Reality:** Side-effect imports initialize framework features
- 🔍 **Check:** Search for `/init`, `polyfill`, check if import has side effects
- 📝 **Example:** `@angular/localize/init`

**Framework integration libraries:**
- ❌ **Surface appearance:** "No direct code references"
- ✅ **Reality:** Import once, enable features globally
- 🔍 **Check:** Look for `forRoot()`, `providers`, global registration
- 📝 **Example:** Library that extends framework behavior

### ⚠️ Warning Signs (Exercise Caution)

**"This appears to be unused"**
- 🛑 **STOP:** Have you searched for string literals?
- 🛑 **STOP:** Have you checked dynamic property access?
- 🛑 **STOP:** Have you read the actual implementation?

**"No imports found, safe to remove"**
- 🛑 **STOP:** Could this be a polyfill with side effects?
- 🛑 **STOP:** Could this be a provider registered at module level?
- 🛑 **STOP:** Could this be used via runtime configuration?

**"Looks like..." or "Probably..."**
- 🛑 **STOP:** These are assumptions, not facts
- 🛑 **STOP:** Get concrete evidence before proceeding
- 🛑 **STOP:** Don't guess - verify

**"Should be straightforward"**
- 🛑 **STOP:** Famous last words before breaking production
- 🛑 **STOP:** Verify with actual code reading
- 🛑 **STOP:** Check for hidden dependencies

**"Template doesn't use it"**
- 🛑 **STOP:** Check TypeScript for dynamic property access
- 🛑 **STOP:** Check for property setting in lifecycle hooks
- 🛑 **STOP:** Check for runtime manipulation

**"Only used in one place"**
- 🛑 **STOP:** Verify that place is actually safe to change
- 🛑 **STOP:** Check if that place is critical infrastructure
- 🛑 **STOP:** Assess blast radius of changes

---

## Case Studies

### Case Study 1: ng-contenteditable Incident

**Scenario:** Library appeared unused based on template analysis

**Surface Analysis (WRONG):**
- ❌ No visible usage in templates
- ❌ Import statement with no function calls
- ❌ Conclusion: "Safe to remove"

**Reality (CORRECT):**
- ✅ Library implements `ControlValueAccessor`
- ✅ Enables `[(ngModel)]` on `contenteditable` elements
- ✅ Used via `element.attr('contenteditable', value)` dynamic property setting
- ✅ Framework integration is invisible in templates

**Key Lessons:**
1. Framework integration libraries can have ZERO visible template usage
2. Dynamic property setting creates hidden dependencies
3. ControlValueAccessor pattern is invisible to static analysis
4. Must search for string literals like `'contenteditable'`

**Correct Investigation:**
```bash
# Search for string literal references
grep -r "'contenteditable'|\"contenteditable\"" --include="*.ts"

# Search for ControlValueAccessor implementation
grep -r "implements ControlValueAccessor" --include="*.ts"

# Search for dynamic property access
grep -r "\.attr\(.*contenteditable\)" --include="*.ts"
```

### Case Study 2: Polyfill Side-Effect Import

**Scenario:** `@angular/localize/init` import appeared unused

**Surface Analysis (WRONG):**
- ❌ Import has no function calls
- ❌ No references to imported symbols
- ❌ Conclusion: "Dead code"

**Reality (CORRECT):**
- ✅ Side-effect import initializes i18n runtime
- ✅ Required for `$localize` template tag to work
- ✅ Removes this import → all translations break silently

**Key Lessons:**
1. Side-effect imports have no visible usage
2. Removing polyfills breaks runtime features
3. Must understand purpose, not just search for references
4. Check package.json and Angular docs for polyfill requirements

**Correct Investigation:**
```bash
# Check if $localize is used in templates
grep -r "\$localize" --include="*.ts" --include="*.html"

# Check package.json for localize package
grep "localize" package.json

# Read Angular documentation for this import
# Understand it's a required polyfill
```

### Case Study 3: Message Bus Race Condition

**Scenario:** Removing `LastMessageSyncDate` field to "simplify" entity

**Surface Analysis (WRONG):**
- ❌ "Only used in one consumer"
- ❌ "Seems redundant"
- ❌ Conclusion: "Can be removed"

**Reality (CORRECT):**
- ✅ Prevents race conditions when events arrive out-of-order
- ✅ Critical for data consistency in message bus integration
- ✅ Removing it → data corruption in production

**Key Lessons:**
1. "Only used in one place" doesn't mean unimportant
2. Race condition prevention is critical
3. Must understand business logic, not just count usages
4. Message bus patterns have specific requirements

**Correct Investigation:**
```bash
# Search for all usages
grep -r "LastMessageSyncDate" --include="*.cs"

# Read the consumer implementation
# Understand the race condition it prevents

# Check message bus documentation
# Verify this is a standard pattern
```

---

## Evidence Documentation Templates

### Template 1: "Unused" Code Analysis

```markdown
## Analysis: [Code/Feature Name] Unused?

### Investigation Summary:
[One-sentence summary of what was investigated]

### Evidence Collected:

#### 1. Static Analysis:
**Command:** `grep -r "CodeName" --include="*.ts" --include="*.cs"`
**Results:**
- [File path:line - context] OR "NONE FOUND"

#### 2. Dynamic Usage:
**Command:** `grep -r "'propertyName'|\"propertyName\"" --include="*.ts"`
**Results:**
- [File path:line - context] OR "NONE FOUND"

#### 3. Template Usage:
**Command:** `grep -r "propertyName|\[propertyName\]" --include="*.html"`
**Results:**
- [File path:line - context] OR "NONE FOUND"

#### 4. Implementation Reading:
**Files Analyzed:**
- [File 1]: [Purpose, key methods, business logic]
- [File 2]: [Purpose, key methods, business logic]

**Business Purpose:**
[Why this code exists, what problem it solves]

#### 5. Dependency Chain:
**What depends on this:**
- [Component/Service A] - [file:line]
- [Component/Service B] - [file:line]

**What this depends on:**
- [Dependency A] - [purpose]
- [Dependency B] - [purpose]

### Risk Assessment:
- **Breaking Changes:** [what breaks if removed]
- **Affected Features:** [list features that rely on this]
- **Rollback Plan:** [how to restore if removal causes issues]

### Confidence Level: [X%] - [High/Medium/Low]

**Certainties:**
- [What we're certain about]

**Uncertainties:**
- [What's unclear and needs verification]

### Recommendation:

[IF confidence >= 90%:]
**Safe to remove.** All verification passed.

[IF confidence 70-89%:]
**Removal possible with caution.** User should verify: [specific points]

[IF confidence < 70%:]
**⚠️ DO NOT remove.** Need clarification on: [specific questions]
```

### Template 2: Bug Root Cause Analysis

```markdown
## Bug Analysis: [Bug Description]

### Symptoms:
- [Observed behavior]
- [Error messages]
- [Affected users/scenarios]

### Evidence Collection:

#### 1. Error Stack Trace:
```
[Full stack trace]
```

#### 2. Code Analysis:
**Suspected Files:**
- [File 1:lines] - [what it does, why it's suspicious]
- [File 2:lines] - [what it does, why it's suspicious]

**Implementation Reading:**
- [Key findings from reading actual code]

#### 3. Data Analysis:
- [Relevant data states]
- [Reproduction steps]
- [Environmental factors]

### Root Cause Hypothesis:

**Primary Hypothesis:** [Most likely cause]
- **Evidence:** [supporting evidence with file:line]
- **Confidence:** [X%]

**Alternative Hypotheses:**
1. [Alternative cause] - [evidence] - [confidence]
2. [Alternative cause] - [evidence] - [confidence]

### Fix Strategy:

**Proposed Fix:** [Description]
- **Files to change:** [list with file:line]
- **Risk:** [Low/Medium/High]
- **Testing approach:** [how to verify fix]

**Rollback Plan:** [how to revert if fix fails]

### Confidence Level: [X%] - [High/Medium/Low]

**User Confirmation Needed:**
[IF confidence < 90%:] Please verify [specific aspects] before deploying fix.
```

### Template 3: Change Impact Analysis

```markdown
## Change Impact Analysis: [Proposed Change]

### Change Summary:
[One-sentence description]

### Evidence of Impact:

#### 1. Direct Impact (Immediate):
**Files Modified:**
- [File 1:lines] - [change description]
- [File 2:lines] - [change description]

**Breaking Changes:**
- [API changes, signature changes, etc.]

#### 2. Indirect Impact (Downstream):
**Dependent Code:**
- [Component A] - [file:line] - [how it's affected]
- [Service B] - [file:line] - [how it's affected]

**Cross-Service Impact:**
- [Service X] - [affected features]
- [Service Y] - [affected features]

#### 3. Runtime Impact:
**Performance:** [expected impact]
**Memory:** [expected impact]
**Data:** [migration needed?]

### Risk Assessment:

| Risk Type        | Level          | Mitigation |
| ---------------- | -------------- | ---------- |
| Breaking Changes | [Low/Med/High] | [strategy] |
| Data Loss        | [Low/Med/High] | [strategy] |
| Performance      | [Low/Med/High] | [strategy] |
| Security         | [Low/Med/High] | [strategy] |

### Testing Strategy:
1. [Test scenario 1]
2. [Test scenario 2]
3. [Test scenario 3]

### Confidence Level: [X%] - [High/Medium/Low]

**Recommendation:**
[IF confidence >= 90%:] Safe to proceed. Monitor [specific areas].
[IF confidence < 90%:] User confirmation needed for [specific concerns].
```

---

## Escalation & User Confirmation Rules

### When to Request User Confirmation

**MANDATORY user confirmation when:**

1. **Confidence Level < 90%**
   - Any uncertainties in analysis
   - Gaps in evidence
   - Contradictory findings
   - Ambiguous requirements

2. **Risk Level = Medium or High**
   - Potential breaking changes
   - Affects critical functionality
   - Cross-service impact
   - Data migration required

3. **Any Verification Box Unchecked**
   - Incomplete evidence collection
   - Unable to verify specific aspects
   - Missing information

4. **Assumption Red Flags Present**
   - Using words like "probably", "likely", "should"
   - Making inferences without verification
   - Generalizing from limited evidence

### How to Request Confirmation

**Structure your confirmation request:**

```markdown
## ⚠️ User Confirmation Required

### Summary:
[One-sentence description of what needs confirmation]

### What I Found:
- ✅ [Evidence 1 with file:line]
- ✅ [Evidence 2 with file:line]
- ⚠️ [Uncertainty 1]
- ⚠️ [Uncertainty 2]

### What's Unclear:
1. **[Specific Question 1]**
   - Why it matters: [impact if wrong]
   - How to verify: [verification steps]

2. **[Specific Question 2]**
   - Why it matters: [impact if wrong]
   - How to verify: [verification steps]

### Confidence Level: [X%] - [Medium/Low]

### Proposed Action:
[What you recommend IF user confirms]

### Alternative Actions:
- **Option A:** [alternative approach]
- **Option B:** [alternative approach]

### Verification Commands for User:
```bash
# Command 1 - what it checks
grep -r "pattern" /path

# Command 2 - what it checks
npm ls package-name
```

### Rollback Plan:
[How to undo if this goes wrong]

### Next Steps:
Please confirm:
- [ ] [Specific confirmation point 1]
- [ ] [Specific confirmation point 2]

Once confirmed, I will proceed with [action].
```

### Escalation Levels

| Level                     | Criteria                                                  | Response                                                    |
| ------------------------- | --------------------------------------------------------- | ----------------------------------------------------------- |
| **Level 1: Proceed**      | Confidence >= 90%, All checks passed, Risk = Low          | Implement with standard monitoring                          |
| **Level 2: Caution**      | Confidence 70-89%, Most checks passed, Risk = Low-Medium  | Implement with enhanced monitoring + user awareness         |
| **Level 3: Confirmation** | Confidence < 90% OR Any check failed OR Risk >= Medium    | STOP - Request user confirmation with specific questions    |
| **Level 4: Block**        | Confidence < 70% OR Multiple checks failed OR Risk = High | STOP - Cannot recommend, provide investigation results only |

---

## Final Checklist Before Submitting Analysis

**Before submitting ANY analysis, bug fix, or code change recommendation:**

```
☐ Completed all evidence collection steps
☐ Documented all search commands and results
☐ Read actual implementations (not just searched)
☐ Traced full dependency chains
☐ Identified business purpose and requirements
☐ Assessed risk level
☐ Calculated confidence level
☐ Documented uncertainties explicitly
☐ Provided file:line references for all claims
☐ Included rollback plan if applicable
☐ Requested user confirmation if confidence < 90%
☐ Used evidence documentation templates
☐ Checked for red flags and warning signs
☐ Applied self-doubt questions
☐ Verified no assumptions without evidence

✅ All boxes checked → Safe to submit
❌ Any box unchecked → Complete missing steps before submitting
```

---

## Appendix: Search Pattern Cheat Sheet

```bash
# Static imports (TypeScript/C#)
grep -r "import.*ClassName\|using.*Namespace" --include="*.ts" --include="*.cs"

# Dynamic property access (TypeScript)
grep -r "\.attr\(|\.prop\(|\[.*\]" --include="*.ts"

# String literals
grep -r "'propertyName'\|\"propertyName\"" --include="*.ts" --include="*.cs"

# Template usage (Angular)
grep -r "\[propertyName\]\|propertyName=" --include="*.html"

# Two-way binding
grep -r "\[\(ngModel\)\]\|\[\(.*\)\]" --include="*.html"

# Dependency injection
grep -r "constructor.*ServiceName\|@Inject" --include="*.ts"
grep -r "public.*ServiceName.*\)" --include="*.cs"

# Framework integration
grep -r "implements.*Accessor\|extends.*Base\|@NgModule" --include="*.ts"

# Message bus (EasyPlatform specific)
grep -r "EntityEventBusMessage\|Consumer\|Producer" --include="*.cs"

# Repository usage (EasyPlatform specific)
grep -r "Repository<.*>\|GetByIdAsync\|CreateOrUpdateAsync" --include="*.cs"

# Platform base classes (EasyPlatform specific)
grep -r "extends AppBase\|extends PlatformBase" --include="*.ts" --include="*.cs"
```

---

**Remember:** This protocol exists because breaking production is expensive. Following it rigorously prevents costly mistakes and builds user trust in AI-generated recommendations.

**When in doubt, ask. When uncertain, verify. When unsure, admit it.**
