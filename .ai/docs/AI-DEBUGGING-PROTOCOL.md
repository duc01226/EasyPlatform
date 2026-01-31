# AI Debugging Protocol for EasyPlatform

> **MANDATORY** for bug analysis, code removal, "unused" code analysis, and major refactoring.
> **Philosophy:** Better to ask 10 questions than make 1 wrong assumption. Never assume—always verify.

---

## Quick Reference

### Verification Checklist (ALL required before code removal)

```text
☐ Static imports searched?
☐ String literals searched ('.property', "property")?
☐ Dynamic invocations checked (.attr(), .prop(), runtime)?
☐ Actual implementation read (not just interfaces)?
☐ Dependency chain traced?
☐ Framework integration verified (polyfills, ControlValueAccessor)?
☐ Business purpose understood (git history)?
☐ Confidence level declared?

✅ ALL checked + confidence ≥90% → Proceed
❌ ANY unchecked OR confidence <90% → STOP, ask user
```

### Confidence Levels

| Level      | Range   | Action                           |
| ---------- | ------- | -------------------------------- |
| **High**   | 90-100% | Proceed with recommendation      |
| **Medium** | 70-89%  | Proceed with caution + user note |
| **Low**    | <70%    | STOP - Request user guidance     |

---

## Core Rules

### ❌ NEVER

1. **Assume without evidence** — First impressions are often wrong
2. **Trust static analysis alone** — Dynamic access, string literals, and framework integrations are invisible
3. **Remove code without comprehensive search** — Static + dynamic + string literals + templates
4. **Propose solutions without file:line evidence**
5. **Proceed when confidence < 90%** — Ask user explicitly

### ✅ ALWAYS

1. **Search multiple patterns** (see [Search Cheat Sheet](#search-pattern-cheat-sheet))
2. **Read actual implementations** — Not just interfaces; check lifecycle hooks
3. **Trace full dependency chains** — Who uses this? What breaks if removed?
4. **Document evidence** — File:line references, search commands, results
5. **Declare confidence level** — With justification
6. **Request confirmation when unsure** — Provide specific questions and verification commands

---

## Evidence Collection

### Required Search Types

| Type                   | Why Critical                               | Example Pattern                                   |
| ---------------------- | ------------------------------------------ | ------------------------------------------------- |
| **Static imports**     | Direct references                          | `grep -r "ClassName" --include="*.ts"`            |
| **String literals**    | Dynamic property access                    | `grep -r "'propName'" --include="*.ts"`           |
| **Template usage**     | Angular bindings                           | `grep -r "[propName]" --include="*.html"`         |
| **Framework patterns** | ControlValueAccessor, providers, polyfills | `grep -r "implements.*Accessor" --include="*.ts"` |

### Implementation Reading (MANDATORY)

For each file under investigation:

1. Read the actual class/component body (not just imports)
2. Check lifecycle hooks (ngOnInit, ngOnChanges)
3. Understand business purpose — Why does this exist? What breaks without it?
4. Verify framework integration — ControlValueAccessor, providers, side-effect imports

---

## Investigation Protocol

### Phase 1: Evidence Collection

1. Run all search patterns
2. Read actual implementations
3. Document findings with file:line references

### Phase 2: Multi-Perspective Analysis

| Question               | What to Check                                               |
| ---------------------- | ----------------------------------------------------------- |
| **What does it do?**   | Read code, map inputs → outputs                             |
| **Why does it exist?** | Git history, commit messages, business requirements         |
| **Who uses it?**       | Imports, string refs, framework integrations, cross-service |
| **When invoked?**      | Lifecycle hooks, event handlers, jobs, message consumers    |
| **How invoked?**       | Direct calls, DI, events, dynamic property access           |

### Phase 3: Self-Doubt Questions (CRITICAL)

Before concluding, ask yourself:

1. Could this be used dynamically (string refs, `.attr()`, runtime config)?
2. Could this be a framework integration (ControlValueAccessor, polyfill, provider)?
3. Could this provide invisible functionality (framework hooks, global side effects)?
4. **What breaks if I'm wrong?** Which features? Which users?
5. What evidence might I be missing?

### Phase 4: Risk Assessment

| Risk   | Criteria                              | Action                   |
| ------ | ------------------------------------- | ------------------------ |
| Low    | No usage evidence, clear obsolescence | Proceed                  |
| Medium | Minor usage, clear migration path     | Proceed with caution     |
| High   | Core functionality, widespread usage  | STOP - User confirmation |

---

## Red Flags 🚩

**STOP and investigate deeper when you see:**

| Surface Appearance             | Hidden Reality                                      | Verification                             |
| ------------------------------ | --------------------------------------------------- | ---------------------------------------- |
| "Not used in any template"     | May be `ControlValueAccessor` for `[(ngModel)]`     | Search `implements ControlValueAccessor` |
| "Property not referenced"      | `element.attr('prop')` creates runtime dependency   | Search `.attr(`, `.prop(`                |
| "Import has no function calls" | Side-effect import initializes features             | Check if polyfill/init import            |
| "No direct code references"    | Library enables features via `forRoot()`, providers | Check module registration                |
| "Only used in one place"       | That place may be critical infrastructure           | Assess blast radius                      |

**Dangerous phrases in your own analysis:**

- "Looks like..." / "Probably..." / "Should be straightforward" → These are assumptions, not evidence
- "Template doesn't use it" → Check TypeScript for dynamic access
- "No imports found, safe to remove" → Could be polyfill or provider

---

## Case Studies (Lessons Learned)

### 1. ng-contenteditable Incident

- **Wrong:** "No template usage → safe to remove"
- **Right:** Library implements `ControlValueAccessor`, used via `element.attr('contenteditable')`
- **Lesson:** Framework integration libraries have ZERO visible template usage; search string literals

### 2. Polyfill Side-Effect Import

- **Wrong:** "`@angular/localize/init` has no function calls → dead code"
- **Right:** Side-effect import required for `$localize` to work
- **Lesson:** Removing polyfills breaks features silently; understand purpose, not just references

### 3. Message Bus Race Condition

- **Wrong:** "`LastMessageSyncDate` only used once → can remove"
- **Right:** Prevents race conditions in message bus; removal causes data corruption
- **Lesson:** "Only used in one place" ≠ unimportant; understand business logic

---

## Documentation Template

```markdown
## Analysis: [Code Name]

### Evidence:
- **Static:** `grep -r "Name"` → [results with file:line]
- **Dynamic:** `grep -r "'name'"` → [results or NONE FOUND]
- **Templates:** `grep -r "[name]"` → [results or NONE FOUND]
- **Framework:** [polyfill? ControlValueAccessor? provider?]

### Purpose:
- **Git history:** [when/why added]
- **Business logic:** [what it does, what breaks without it]

### Dependencies:
- **Used by:** [list with file:line]
- **Cross-service:** [affected services]

### Assessment:
- **Risk:** [Low/Medium/High] — [justification]
- **Confidence:** [X%] — [certainties and uncertainties]

### Recommendation:
[IF ≥90% + Low risk:] Safe to proceed. Rollback: [plan]
[IF <90% OR Medium+ risk:] ⚠️ User confirmation needed: [specific questions]
```

---

## Escalation Rules

| Condition                        | Action                                          |
| -------------------------------- | ----------------------------------------------- |
| Confidence ≥90%, Risk=Low        | Proceed with recommendation                     |
| Confidence 70-89% OR Risk=Medium | Proceed with caution, notify user               |
| Confidence <90% OR Risk≥Medium   | STOP — Request user confirmation                |
| Confidence <70% OR Risk=High     | STOP — Provide findings only, no recommendation |

**When requesting confirmation, provide:**

- What you found (with file:line evidence)
- What's unclear (specific questions)
- Verification commands for user
- Rollback plan

---

## Search Pattern Cheat Sheet

```bash
# Static imports
grep -r "ClassName\|ServiceName" --include="*.ts" --include="*.cs"

# String literals (CRITICAL for dynamic usage)
grep -r "'propertyName'\|\"propertyName\"" --include="*.ts" --include="*.cs"

# Template bindings (Angular)
grep -r "\[propertyName\]\|propertyName=" --include="*.html"

# Dynamic property access
grep -r "\.attr\(\|\.prop\(" --include="*.ts"

# Framework integration
grep -r "implements.*Accessor\|forRoot\|providers:" --include="*.ts"

# Two-way binding
grep -r "\[\(ngModel\)\]" --include="*.html"

# EasyPlatform specific
grep -r "EntityEventBusMessage\|Consumer\|Producer" --include="*.cs"
grep -r "Repository<.*>\|GetByIdAsync" --include="*.cs"
```

---

**Remember:** Breaking production is expensive. When in doubt, ask. When uncertain, verify. When unsure, admit it.
