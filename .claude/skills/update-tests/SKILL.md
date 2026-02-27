---
name: update-tests
description: "[Testing] Update existing tests when feature docs change. Detects changed/added/removed TC-IDs via git diff and synchronizes test files accordingly. For changed TC-IDs, proposes test modifications. For added TC-IDs, invokes /generate-tests. For removed TC-IDs, flags for human-confirmed deletion."
keywords: "update tests, sync tests, tests out of date, feature doc changed, refresh tests, test sync"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
skill-type: user-invoked
---

# Update Tests Skill

## Summary

**Goal:** Detect changes in `docs/test-specs/` feature documents and update corresponding test files to reflect added, modified, or removed TC-IDs.

| Step | Action | Key Notes |
|------|--------|-----------|
| 1 | Accept feature name | Locate spec doc under `docs/test-specs/{Feature}/README.md` |
| 2 | Detect changes via git diff | Compare current vs previous version of spec doc |
| 3 | Diff TC-IDs old vs new | Identify added, modified, removed TC-IDs |
| 4 | Locate affected test files | Map TC-IDs to existing test methods via Grep |
| 5 | Apply updates | Add new, modify changed, mark removed as skipped |
| 6 | Update sync marker | Write `.last-sync` with timestamp and TC-ID list |
| 7 | Report changes | Summary of all modifications |

## Input

```
/update-tests <FeatureName> [--since <commit-ref>] [--dry-run]
```

- **FeatureName** (required): Module name matching a folder under `docs/test-specs/`
- **--since** (optional): Git ref to diff against (default: `HEAD~1`; also checks `.last-sync` marker)
- **--dry-run** (optional): Show what would change without modifying any files

## Keywords (Trigger Phrases)

- `update tests`
- `sync tests`
- `tests out of date`
- `feature doc changed`
- `refresh tests`
- `test sync`

## Workflow

### Step 1 -- Accept Feature Name and Locate Spec

1. Verify `docs/test-specs/{FeatureName}/README.md` exists
2. Check if `docs/test-specs/{FeatureName}/.last-sync` exists for incremental detection

```
Glob: docs/test-specs/{FeatureName}/README.md
```

### Step 2 -- Detect Changed Feature Docs

Determine the diff base:

1. If `.last-sync` file exists, read its commit hash as the base
2. If `--since` flag provided, use that as the base
3. Otherwise, default to `HEAD~1`

```bash
# Check if spec file has changed since base
git diff {base}..HEAD -- docs/test-specs/{FeatureName}/README.md
```

If no diff detected, report "No changes detected" and exit.

### Step 3 -- Diff TC-IDs Old vs New

Extract TC-IDs from both versions:

```bash
# Old version TC-IDs
git show {base}:docs/test-specs/{FeatureName}/README.md | grep -oE 'TC-[A-Z]{2,5}-[A-Z]{2,5}-[0-9]{3}'

# Current version TC-IDs
grep -oE 'TC-[A-Z]{2,5}-[A-Z]{2,5}-[0-9]{3}' docs/test-specs/{FeatureName}/README.md
```

Classify into three sets:

| Set | Definition | Action |
|-----|-----------|--------|
| **Added** | In new, not in old | Generate new test via `/generate-tests` pattern |
| **Removed** | In old, not in new | Mark existing test as `[Skip]` (never delete) |
| **Modified** | In both, but section content changed | Update test docstring and assertions |

For modified detection, compare the full section content (heading through next `---` separator) between old and new versions.

### Step 4 -- Locate Affected Test Files

For each TC-ID in the changed sets, find existing test files:

```
# Backend
Grep: pattern="TC-ID" in src/Backend/PlatformExampleApp.Tests.Integration/

# Frontend
Grep: pattern="TC-ID" in src/Frontend/e2e/tests/
```

Build a map: `TC-ID -> { filePath, lineNumber, methodName, layer }`

### Step 5 -- Apply Updates

#### For Added TC-IDs

Invoke the same generation logic as `/generate-tests`:
1. Read the TC-ID section from the spec doc
2. Classify as backend or frontend
3. Generate test method using reference templates
4. Append to the appropriate existing test class file, or create new file if needed

#### For Modified TC-IDs

1. Locate the existing test method via TC-ID map
2. Update the XML doc comment (C#) or JSDoc (TypeScript) with new Gherkin steps
3. **Assertion quality audit** (MANDATORY, not advisory):
   - Verify test still meets minimum assertion rules (see generate-tests Assertion Quality Rules)
   - Check: does the test assert at least one domain field per mutation, or execute a follow-up query?
   - Check: does the test inspect error body for validation scenarios?
   - Check: does the test assert setup steps with descriptive `because` strings?
   - Check: are domain boolean flags (`wasCreated`, `wasSoftDeleted`, `wasRestored`) asserted when available?
   - If any check fails, update the test assertions to meet rules before presenting to user
4. Present diff (including assertion fixes) to user for confirmation before applying

#### For Removed TC-IDs

**Never delete test methods.** Instead:

**C# (Backend)**:
```csharp
/// <summary>
/// {TC-ID}: REMOVED from spec on {date}.
/// Original: {original title}
/// </summary>
[Fact(Skip = "TC-ID removed from spec - pending human review")]
[Trait("TestCase", "{TC-ID}")]
public async Task {OriginalMethodName}()
{
    // Original test body preserved for audit
}
```

**TypeScript (Frontend)**:
```typescript
test.skip('{TC-ID}: REMOVED - {original title}', async ({ page }) => {
    /**
     * @removed {date}
     * @reason TC-ID removed from spec - pending human review
     */
    // Original test body preserved for audit
});
```

### Step 6 -- Update Sync Marker

After successful sync, write (or update) the marker file:

```
docs/test-specs/{FeatureName}/.last-sync
```

Format:
```
# Auto-generated by /update-tests skill
# Do not edit manually
timestamp: 2026-02-23T16:19:00Z
commit: {current HEAD hash}
tc-ids:
  - TC-SNP-CRT-001
  - TC-SNP-CRT-002
  - TC-SNP-UPD-001
  ...
```

### Step 7 -- Report

Output a structured summary:

```markdown
## Update-Tests Report

### Feature: {FeatureName}
- Spec file: docs/test-specs/{FeatureName}/README.md
- Diff base: {commit ref or .last-sync}
- Sync marker updated: yes/no

### Changes Summary
| Change | Count |
|--------|-------|
| TC-IDs added | N |
| TC-IDs modified | N |
| TC-IDs removed | N |
| Test files updated | N |

### Added TC-IDs
| TC-ID | Title | Layer | Generated File |
|-------|-------|-------|----------------|
| TC-XXX-010 | New feature test | Backend | path/to/Tests.cs |

### Modified TC-IDs
| TC-ID | Title | Changes | File:Line |
|-------|-------|---------|-----------|
| TC-XXX-003 | Updated title | Steps changed | path/to/file:42 |

### Removed TC-IDs
| TC-ID | Original Title | Action | File:Line |
|-------|----------------|--------|-----------|
| TC-XXX-007 | Old feature | Marked [Skip] | path/to/file:87 |
```

## Dependencies

- `/generate-tests` skill (reused for generating new test methods)
- `docs/test-specs/` directory with TC-ID specs
- Git history accessible for diffing
- Existing test infrastructure (base classes, page objects, helpers)

## References

- **Generate tests skill**: `.claude/skills/generate-tests/SKILL.md`
- **Integration test template**: `.claude/skills/generate-tests/references/integration-test-template.md`
- **E2E test template**: `.claude/skills/generate-tests/references/e2e-test-template.md`
- **Test specs**: `docs/test-specs/`
- **Backend tests**: `src/Backend/PlatformExampleApp.Tests.Integration/`
- **Frontend tests**: `src/Frontend/e2e/tests/`

## Anti-Patterns to Avoid

- **Never delete test methods** -- always mark as `[Skip]` to preserve audit trail
- **Never auto-apply assertion changes** without user review -- present diff first
- **Never modify tests that have no TC-ID match** -- only touch tests linked to changed TC-IDs
- **Never ignore the sync marker** -- always update it after a successful sync
- **Never force-overwrite manual test modifications** -- check git status of test file first
- **Never leave assertion quality review as advisory-only** -- modified TC-IDs must have assertions audited against minimum rules, not just a `// TODO` comment

## Status

- [x] Skill scaffolded (Phase 1.7)
- [x] Step 1 -- Feature spec locator (Phase 4)
- [x] Step 2 -- Changed-doc detector via git diff (Phase 4)
- [x] Step 3 -- TC-ID differ with add/modify/remove classification (Phase 4)
- [x] Step 4 -- Test-file locator via Grep (Phase 4)
- [x] Step 5 -- Update applicator with add/modify/skip logic (Phase 4)
- [x] Step 6 -- Sync marker read/write (Phase 4)
- [x] Step 7 -- Report generator (Phase 4)
