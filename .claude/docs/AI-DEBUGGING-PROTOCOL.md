# AI Debugging Protocol

> **MANDATORY** for bug analysis, code removal decisions, and debugging tasks.
> **Philosophy:** Better to ask 10 questions than make 1 wrong assumption.

---

## When to Apply

**MANDATORY:** Code removal, bug analysis, "unused" code claims, dependency removal, refactoring with removals
**RECOMMENDED:** Feature planning, architecture decisions, performance optimization, security analysis

---

## Core Principles

### End-to-Start Debugger Trace

For any non-trivial bug, failed verification, regression fix, or behavior-changing investigation, do not begin at the first suspicious handler. Begin at the final observed effect and walk backward like a debugger.

**Required trace shape:**

1. **Frame 0 - observed end state:** Name the exact failing output: UI state, API response, persisted value, log line, failed assertion, dashboard aggregate, or user-visible symptom.
2. **Final reader:** Identify the renderer/query/assertion/aggregator that produced that output.
3. **Read model/storage:** Identify the field, row, document, cache entry, index, or projection the reader consumes.
4. **Writer/projection path:** Identify who writes that read model and whether writes replace, merge, append, cache, dedupe, retry, or race.
5. **Consumer/handler/job path:** Identify every handler, job, event consumer, command, or subscription that can reach the writer.
6. **Producer/origin path:** Identify every UI/API/job/message/source trigger that can create the input.
7. **Forward proof:** After the fix is chosen, replay origin -> final output and show why the observed symptom can no longer persist.

**Required artifact:**

```markdown
## Debugger Trace: End -> Start

Frame 0 - Observed final state:

- Symptom:
- Reader/query/renderer:
- Evidence:

Frame N..1 - Backward hops:
| Hop | From | To | Transformation | Owner | Evidence | Notes |
| --- | --- | --- | --- | --- | --- | --- |

Feeder paths:
| Path | Producer/origin | Can write final state? | Evidence | Status |
| --- | --- | --- | --- | --- |

Hypothesis matrix:
| RC | Hypothesis | Evidence for | Evidence against | Status | Verification |
| --- | --- | --- | --- | --- | --- |

Fix mapping:
| Fix part | Root cause killed | Owning layer | Why this layer | Test/proof |
| --- | --- | --- | --- | --- |

Forward convergence proof:

- Start trigger:
- Corrected transformations:
- Final state:
- Why stale/bad state cannot persist:
```

**BLOCKED until:** final state named, backward trace complete, all feeder paths listed, hypothesis matrix written, owning fix layer justified, and forward proof mapped to verification.

### ❌ NEVER

| Rule                                         | Reason                                                                              |
| -------------------------------------------- | ----------------------------------------------------------------------------------- |
| Assume without evidence                      | First impressions are often wrong                                                   |
| Trust static analysis alone                  | Dynamic access (`element.attr()`, string literals) creates hidden dependencies      |
| Remove code without comprehensive search     | Must verify: static + dynamic + string literals + templates + framework integration |
| Propose solutions without file:line evidence | Show actual code, not summaries                                                     |
| Proceed when confidence < 90%                | Request user confirmation instead                                                   |
| Fix from the first suspicious code path      | The bug may originate upstream or through a different producer path                 |

### ✅ ALWAYS

| Rule                             | How                                                                  |
| -------------------------------- | -------------------------------------------------------------------- |
| Search multiple patterns         | Static imports + dynamic usage + string literals + templates         |
| Read actual implementations      | Don't stop at interfaces—check lifecycle hooks, business logic       |
| Trace full dependency chains     | Who depends on this? What breaks if removed?                         |
| Document evidence                | File paths with line numbers, search commands, explicit "NONE FOUND" |
| Declare confidence level         | High (90-100%), Medium (70-89%), Low (<70%)                          |
| Request confirmation when unsure | If confidence < 90%: STOP and ask user                               |
| Trace end-to-start before fixing | Symptom -> reader -> storage/projection -> writer -> producer/origin |

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

### Phase 1: Frame the Observed End State

- Name the final symptom in concrete terms
- Identify the reader/query/renderer/assertion that produced it
- Identify the exact storage/projection/cache/index/field consumed by that reader
- Record `file:line` evidence before forming root-cause theories

### Phase 2: Backward Trace

- Run ALL search patterns above
- Read actual implementations (not just interfaces)
- Document findings with `file:line` references
- Walk backward from final reader to storage/projection, writer, handler/job/consumer, producer, and origin trigger
- Enumerate all alternate feeder paths that can write into the same final state

### Phase 3: Multi-Perspective Analysis

| Question                | What to Check                                       |
| ----------------------- | --------------------------------------------------- |
| **What** does it do?    | Read code logic, map inputs → outputs               |
| **Why** does it exist?  | Git history, commit messages, business purpose      |
| **Who** uses it?        | Direct imports, string refs, framework integrations |
| **When** is it invoked? | Lifecycle hooks, event handlers, background jobs    |
| **How** is it invoked?  | Direct calls, DI, events, dynamic property access   |

### Phase 4: Hypothesis Matrix

Do not carry only one favorite theory. Enumerate plausible root causes and explicitly classify them.

| Status           | Meaning                                                        |
| ---------------- | -------------------------------------------------------------- |
| **Primary**      | Necessary root cause; fix must address it                      |
| **Contributing** | Makes the bug visible or worse but is not sufficient alone     |
| **Ruled out**    | Evidence proves it is not the current cause                    |
| **Latent**       | Real risk but not required for the reported failure            |
| **Unknown**      | Not enough evidence; must verify or disclose before proceeding |

### Phase 5: Self-Doubt Questions (CRITICAL)

Ask BEFORE concluding:

1. Could this be used dynamically via string refs or `element.attr()`?
2. Could this be a framework integration (ControlValueAccessor, provider, polyfill)?
3. Could this provide invisible functionality (hooks, global side effects)?
4. **What breaks if I'm wrong?**
5. Why might someone disagree with my analysis?
6. What final-state reader proves the symptom is a read artifact vs a write artifact?
7. Which other producer could write the same final state?
8. If this fix is correct, what exact forward path makes the symptom disappear?

### Phase 6: Risk Assessment

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
