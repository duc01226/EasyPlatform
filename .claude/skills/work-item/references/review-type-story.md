# `/work-item --mode=review` — `--type=story` checklist and output template

Loaded by `references/mode-review.md` when the resolved type is `story`. Scoring, verdict rule, M1-M7 gate and the validated-fix loop stay in `references/mode-review.md`; the M1-M7 criteria live in `.claude/skills/shared/m1-m7-gates.md`.

## Checklist — User Story Review

| #   | Check                                                                                                                    | Presence                                                       | Quality Depth                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Follows GIVEN/WHEN/THEN format** — the story uses the structured BDD format                                            | Are all three parts (GIVEN, WHEN, THEN) present?               | Are all 3 parts present AND meaningful? Or is GIVEN trivial ("Given a user exists")? A GIVEN that describes no precondition adds no value.                    |
| 2   | **Is independent (not dependent on other stories)** — the story can be implemented without requiring another story first | Is independence stated or inferable?                           | Would descoping other stories prevent this story from being implemented? Implicit dependencies are as blocking as explicit ones.                              |
| 3   | **Is estimable (team can size it)** — the team has enough information to assign effort points                             | Is the story sized or estimable based on content?              | Does the team have enough info to estimate? Is "can't estimate" a sign of missing AC? If it can't be sized, it's not ready for implementation.                        |
| 4   | **Is small enough for one delivery slice** — the story fits within the agreed delivery capacity                                    | Is the story sized at ≤8 effort points or scoped to one delivery slice? | Could this be split further? Stories >8EP should always be split. A story that "could fit" as one slice but requires multiple sub-systems is likely too large. |
| 5   | **Has acceptance criteria** — the story defines measurable conditions for completion                                     | Are acceptance criteria present?                               | Are criteria testable? Would they catch a bug if the feature works in 9/10 cases? ACs that only describe the happy path are incomplete.                       |

## Output template

```markdown
## Story Review Result

**Status:** PASS | WARN | FAIL
**Stories reviewed:** {count}
**Source task:** {task-path}
**Artifact identity:** {story-file path(s)} · sha256:{hex digest of each file}

### AC Coverage Matrix

| Acceptance Criterion | Covered By Story | Status |
| -------------------- | ---------------- | ------ |

### Required ({X}/{Y})

- ✅/❌ Check description

### Recommended ({X}/{Y})

- ✅/⚠️ Check description

### Missing Stories

- {Any task AC not covered}

### Dependency Issues

- {Circular deps, missing ordering}

### Verdict

{PROCEED | REVISE_FIRST}
```
