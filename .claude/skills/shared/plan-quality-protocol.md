# Plan Quality Protocol

> **Purpose:** Ensure plans embed test specifications and AI maintains attention in long-running workflows.
> **Referenced by:** plan, plan-hard, plan-fast, plan-review, plan-validate, plan-analysis, cook, cook-\*, review-changes, code-review.

---

## Part 1: Test Spec Integration in Plans

### Phase Test Spec Section Template

Every plan phase file MUST include this section after `## Success Criteria`:

```markdown
## Test Specifications

> Per `.claude/skills/shared/plan-quality-protocol.md`

| TC ID           | Requirement                   | Priority | Evidence           |
| --------------- | ----------------------------- | -------- | ------------------ |
| TC-{FEAT}-{NNN} | {requirement from this phase} | P0-P3    | {file:line} or TBD |

**Coverage:** {X}/{Y} requirements mapped to TCs
**Missing:** {list any requirements without TCs, or "None"}
```

### Plan Frontmatter

Add to plan.md YAML frontmatter:

```yaml
test_coverage: TBD # or percentage (e.g., "85%") — requirements with mapped TCs
```

### Reference Rules

<HARD-GATE>
- Plans REFERENCE TCs by ID — never embed full TC content (DRY with feature docs Section 17)
- Source of truth: feature docs Section 17 is the canonical TC registry
- If no TCs exist yet (TDD-first): use `Evidence: TBD — generate via /tdd-spec`
- If TCs exist: read Section 17, map each requirement to ≥1 TC
- TC IDs follow `TC-{FEATURE}-{NNN}` format per `shared/references/module-codes.md`
</HARD-GATE>

### Mode-Specific Rules

| Mode                | TC Evidence                                                                   |
| ------------------- | ----------------------------------------------------------------------------- |
| **TDD-first**       | TCs exist before plan → reference them, evidence = `TBD (pre-implementation)` |
| **Implement-first** | Plan created before TCs → use `TBD` → `/tdd-spec` fills them after            |
| **Update**          | After code changes → `/tdd-spec` update mode → refresh TC references          |

### Verification Checklist (for plan-review)

**Required:**

- [ ] Every phase has `## Test Specifications` section
- [ ] Every functional requirement maps to ≥1 TC (or has explicit "TBD" with rationale)
- [ ] TC IDs follow `TC-{FEATURE}-{NNN}` format
- [ ] Authorization TCs present for permission-gated features

**Recommended:**

- [ ] Edge case TCs present
- [ ] Performance TCs for data-heavy features
- [ ] Integration TCs for cross-service features

### TC Satisfaction Verification (for cook/code/fix)

After implementing each plan phase, before marking complete:

<HARD-GATE>
1. Read the phase's `## Test Specifications` section
2. For each mapped TC:
   - [ ] TC has evidence (file:line reference to actual code, not TBD)
   - [ ] Evidence file exists (grep verify)
3. If any TC lacks evidence → phase is NOT complete
4. Update phase file's TC table with actual evidence references
</HARD-GATE>

---

## Part 2: Long-Running Task Attention Management

### Attention Anchoring (MANDATORY at every step boundary)

<HARD-GATE>
Before starting ANY new workflow step or task phase:
1. Call `TaskList` — see all tasks, status, what's done vs pending
2. Read the CURRENT task description — understand what THIS step requires
3. If active plan exists: re-read the relevant phase file
4. Only THEN begin the step's work

DO NOT start a step from memory alone. Re-read before acting.
</HARD-GATE>

### Subtask Structure for Workflow Steps

When workflow skills create internal tasks, structure with prefix:

```
[Workflow] /skill-name - Step description    ← workflow-level (BIG picture)
  [skill-name] Subtask 1                     ← skill-internal (SMALL picture)
  [skill-name] Subtask 2
  [skill-name] Final review
```

**Rules:**

- NEVER combine workflow-level and skill-internal tasks
- Mark workflow task `in_progress` when starting skill
- Mark workflow task `completed` only when ALL skill-internal tasks done

### Context Compaction Recovery

<HARD-GATE>
When context is compacted (prior messages lost):
1. Call `TaskList` FIRST — NEVER create new tasks before checking existing
2. Read active plan from `## Plan Context`
3. Resume from the first `pending` task
4. NEVER duplicate completed work — trust TaskList status
</HARD-GATE>

### Decision Point Re-Verification

Before making decisions that affect multiple phases:

1. Re-read plan overview (plan.md)
2. Verify decision aligns with plan's design rationale
3. If contradicts plan: STOP, ask user via AskUserQuestion

### When to Apply

**MANDATORY** when: workflow ≥10 steps, task list ≥10 items, effort >2h, multiple subagents
**RECOMMENDED** when: workflow 5-9 steps, single skill with multiple phases

---

## Cross-Reference

- **TC format:** `.claude/skills/shared/references/module-codes.md`
- **TC generation:** `tdd-spec/SKILL.md`
- **TC canonical registry:** Feature docs Section 17
- **Phase quality cycles:** `.claude/skills/shared/iterative-phase-quality-protocol.md`
- **Review enforcement:** `.claude/skills/shared/double-round-trip-review-protocol.md`
