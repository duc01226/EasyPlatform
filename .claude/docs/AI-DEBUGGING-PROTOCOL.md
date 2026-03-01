# AI Debugging Protocol

> **MANDATORY** for bug analysis, code removal decisions, and debugging tasks.
> **Philosophy:** Better to ask 10 questions than make 1 wrong assumption.

---

## When to Apply

**MANDATORY:** Code removal, bug analysis, "unused" code claims, dependency removal, refactoring with removals
**RECOMMENDED:** Feature planning, architecture decisions, performance optimization, security analysis

---

## Core Principles

### ❌ NEVER

| Rule                                         | Reason                                                                              |
| -------------------------------------------- | ----------------------------------------------------------------------------------- |
| Assume without evidence                      | First impressions are often wrong                                                   |
| Trust static analysis alone                  | Dynamic access (`element.attr()`, string literals) creates hidden dependencies      |
| Remove code without comprehensive search     | Must verify: static + dynamic + string literals + templates + framework integration |
| Propose solutions without file:line evidence | Show actual code, not summaries                                                     |
| Proceed when confidence < 90%                | Request user confirmation instead                                                   |

### ✅ ALWAYS

| Rule                             | How                                                                  |
| -------------------------------- | -------------------------------------------------------------------- |
| Search multiple patterns         | Static imports + dynamic usage + string literals + templates         |
| Read actual implementations      | Don't stop at interfaces—check lifecycle hooks, business logic       |
| Trace full dependency chains     | Who depends on this? What breaks if removed?                         |
| Document evidence                | File paths with line numbers, search commands, explicit "NONE FOUND" |
| Declare confidence level         | High (90-100%), Medium (70-89%), Low (<70%)                          |
| Request confirmation when unsure | If confidence < 90%: STOP and ask user                               |

---

## Quick Verification Checklist

Before claiming code is "unused" or proposing removal:

```
☐ Searched static imports?
☐ Searched string literals ('.property', "property")?
☐ Checked dynamic invocations (.attr(), .prop(), runtime calls)?
☐ Read actual implementation (not just interfaces)?
☐ Traced dependency chains?
☐ Checked framework integration (ControlValueAccessor, providers, polyfills)?
☐ Understood WHY code was added (git history)?
☐ Declared confidence level?

✅ ALL checked + confidence ≥90% → Proceed
❌ ANY unchecked OR confidence <90% → Request user confirmation
```

---

## Search Patterns (Execute ALL)

```bash
# 1. Static imports
grep -r "ClassName\|ServiceName" --include="*.ts" --include="*.cs"

# 2. Dynamic usage (CRITICAL - often missed)
grep -r "'propertyName'\|\"propertyName\"" --include="*.ts" --include="*.cs"
grep -r "\.attr\(.*property\)\|\.prop\(.*property\)" --include="*.ts"

# 3. Template usage
grep -r "propertyName\|\[propertyName\]" --include="*.html"

# 4. Framework integration
grep -r "implements ControlValueAccessor\|forRoot\|providers:" --include="*.ts"

# 5. Project-specific patterns (adapt to your codebase)
grep -r "EventBusMessage\|Consumer\|Repository<" --include="*.cs"
grep -r "extends.*Base" --include="*.ts" --include="*.cs"
```

---

## Investigation Protocol

### Phase 1: Evidence Collection

- Run ALL search patterns above
- Read actual implementations (not just interfaces)
- Document findings with `file:line` references

### Phase 2: Multi-Perspective Analysis

| Question                | What to Check                                       |
| ----------------------- | --------------------------------------------------- |
| **What** does it do?    | Read code logic, map inputs → outputs               |
| **Why** does it exist?  | Git history, commit messages, business purpose      |
| **Who** uses it?        | Direct imports, string refs, framework integrations |
| **When** is it invoked? | Lifecycle hooks, event handlers, background jobs    |
| **How** is it invoked?  | Direct calls, DI, events, dynamic property access   |

### Phase 3: Self-Doubt Questions (CRITICAL)

Ask BEFORE concluding:

1. Could this be used dynamically via string refs or `element.attr()`?
2. Could this be a framework integration (ControlValueAccessor, provider, polyfill)?
3. Could this provide invisible functionality (hooks, global side effects)?
4. **What breaks if I'm wrong?**
5. Why might someone disagree with my analysis?

### Phase 4: Risk Assessment

| Risk       | Criteria                              | Action                            |
| ---------- | ------------------------------------- | --------------------------------- |
| **Low**    | No usage evidence, clear obsolescence | Proceed                           |
| **Medium** | Minor usage, easy to replace          | Proceed with monitoring           |
| **High**   | Core functionality, widespread usage  | STOP - User confirmation required |

---

## 🚩 Red Flags (High Alert)

| Appearance                     | Reality                                                 | Check                                    |
| ------------------------------ | ------------------------------------------------------- | ---------------------------------------- |
| "No template usage"            | May implement `ControlValueAccessor` for `[(ngModel)]`  | Search `implements ControlValueAccessor` |
| "Property not referenced"      | `element.attr('prop', value)` creates hidden dependency | Search string literals                   |
| "Import has no function calls" | Side-effect imports initialize features                 | Check if polyfill or `/init` import      |
| "No direct code references"    | Library enables features globally via `forRoot()`       | Check module providers                   |

### Warning Phrases → STOP and Verify

- "This appears to be unused" → Searched string literals? Dynamic access?
- "No imports found" → Polyfill? Provider? Runtime config?
- "Looks like..." or "Probably..." → These are assumptions, not facts
- "Should be straightforward" → Verify with actual code reading
- "Only used in one place" → Is that place critical infrastructure?

---

## Key Lessons from Past Incidents

### ng-contenteditable Incident

- **Wrong:** "Not used in any template → safe to remove"
- **Right:** Implements `ControlValueAccessor`, enables `[(ngModel)]` on contenteditable, used via `element.attr('contenteditable')`
- **Lesson:** Framework integration libraries can have ZERO visible template usage

### Polyfill Side-Effect Import

- **Wrong:** "Import has no function calls → dead code"
- **Right:** `@angular/localize/init` initializes i18n runtime; removing breaks all translations silently
- **Lesson:** Side-effect imports have no visible usage but are critical

### Message Bus Race Condition

- **Wrong:** "Only used in one consumer → redundant"
- **Right:** `LastMessageSyncDate` prevents race conditions when events arrive out-of-order
- **Lesson:** "Only used in one place" doesn't mean unimportant

---

## Confidence & Escalation

| Level      | Range   | Criteria                                     | Action                                |
| ---------- | ------- | -------------------------------------------- | ------------------------------------- |
| **High**   | 90-100% | All checks passed, no contradictions         | Proceed                               |
| **Medium** | 70-89%  | Some gaps, minor uncertainties               | Proceed with caution + user awareness |
| **Low**    | <70%    | Significant unknowns, contradictory evidence | **STOP** - Request user guidance      |

### Mandatory User Confirmation When

- Confidence < 90%
- Risk = Medium or High
- Any verification box unchecked
- Using words like "probably", "likely", "should"

---

## Evidence Documentation Template

```markdown
## Analysis: [Code Name]

### Evidence:

- **Static:** `grep -r "Name" --include="*.ts"` → [results or NONE FOUND]
- **Dynamic:** `grep -r "'name'" --include="*.ts"` → [results or NONE FOUND]
- **Template:** `grep -r "[name]" --include="*.html"` → [results or NONE FOUND]
- **Implementation:** [file:line - purpose, business logic]
- **Dependencies:** [what depends on this with file:line]

### Git History:

- **When added:** [date, commit]
- **Why added:** [from commit message]

### Framework Check:

- Polyfill? [Yes/No]
- ControlValueAccessor? [Yes/No]
- Provider/side-effect? [Yes/No]

### Risk: [Low/Medium/High]

### Confidence: [X%] - [High/Medium/Low]

### Recommendation:

[IF ≥90%:] Safe to [action]. Rollback: [plan]
[IF <90%:] ⚠️ Need confirmation on: [questions]
```

---

## User Confirmation Request Format

````markdown
## ⚠️ User Confirmation Required

**Summary:** [one sentence]

**Found:**

- ✅ [Evidence with file:line]
- ⚠️ [Uncertainty]

**Questions:**

1. [Specific question] - Impact if wrong: [consequence]

**Confidence:** [X%]

**Verification commands:**

```bash
grep -r "pattern" /path
```
````

**Once confirmed, I will:** [action]

```

---

## Final Pre-Submission Check

```

☐ All evidence collection completed
☐ Documented search commands + results
☐ Read actual implementations
☐ Traced dependency chains
☐ Identified business purpose
☐ Risk level assessed
☐ Confidence level declared
☐ File:line references for all claims
☐ User confirmation requested if confidence <90%
☐ No assumptions without evidence

```

---

**Remember:** Breaking production is expensive. When in doubt, ask. When uncertain, verify. When unsure, admit it.
```
