# Bug Diagnosis Quick Checklist

> One-page reference for evidence-based debugging

## Before Removing ANY Code

```
[ ] Searched static imports?
[ ] Searched string literals in code?
[ ] Checked dynamic invocations (attributes, properties, runtime)?
[ ] Read actual implementations (not just interfaces)?
[ ] Traced full dependency chain?
[ ] Assessed what breaks if removed?
[ ] Documented evidence clearly?
[ ] Confidence level >= 90%?
```

**If ANY unchecked** -> DO MORE INVESTIGATION
**If confidence < 90%** -> REQUEST USER CONFIRMATION

---

## Search Pattern Checklist

| What to Search    | Command               | Notes              |
| ----------------- | --------------------- | ------------------ |
| Direct usage      | `Grep: ClassName`     | Static imports     |
| String references | `Grep: "ClassName"`   | Runtime/reflection |
| Attribute usage   | `Grep: \[.*ClassName` | Decorators         |
| Base class        | `Grep: : ClassName`   | Inheritance        |
| Interface impl    | `Grep: : I{Name}`     | Implementations    |

---

## Evidence Template

```markdown
## Finding: [Brief Description]

**Confidence**: [X]%
**Search Evidence**:

- [ ] Static search: [results]
- [ ] String search: [results]
- [ ] Dynamic search: [results]

**Dependencies Found**: [list]
**Impact if Changed**: [assessment]
**Recommendation**: [action]
```

---

## Red Flags (Stop & Verify)

- Code looks unused but has `[Attribute]` decorators
- Method matches common interface patterns
- File is in shared/common/platform folders
- Name suggests it's a base class or utility
- Located in `**/Extensions/` or `**/Helpers/`

---

## Root Cause Analysis Steps

1. **Reproduce** - Can you trigger the bug consistently?
2. **Locate** - Where does the error originate? (stack trace)
3. **Understand** - Why is this happening? (read code)
4. **Fix** - What's the minimal change needed?
5. **Verify** - Does fix work? Any side effects?
6. **Document** - Update tests, comments if needed

---

## Common EasyPlatform Bug Locations

| Symptom            | Check First                          |
| ------------------ | ------------------------------------ |
| API 500 error      | Command/Query handler validation     |
| Data not saving    | Repository pattern, entity mapping   |
| UI not updating    | Store effects, signal updates        |
| Cross-service fail | Message bus consumer, event handlers |
| Auth issues        | RequestContext, [PlatformAuthorize]  |

---

## Quick Commands

```bash
# Find all usages
grep -r "ClassName" src/

# Find by pattern
grep -rE "pattern" src/

# Find files
find src/ -name "*ClassName*"

# Check git history
git log -p --all -S "ClassName" -- "*.cs"
```
