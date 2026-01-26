# Anti-Hallucination Protocol

Shared validation checkpoints to prevent assumptions, context drift, and unverified claims.

---

## ASSUMPTION_VALIDATION_CHECKPOINT

Before every major operation:

1. "What assumptions am I making about [X]?"
2. "Have I verified this with actual code evidence?"
3. "Could I be wrong about [specific pattern/relationship]?"

## EVIDENCE_CHAIN_VALIDATION

Before claiming any relationship:

- "I believe X calls Y because..." -> show actual code
- "This follows pattern Z because..." -> cite specific examples
- "Service A owns B because..." -> grep for actual boundaries

## TOOL_EFFICIENCY_PROTOCOL

- Batch multiple Grep searches into single calls with OR patterns
- Use parallel Read operations for related files
- Combine semantic searches with related keywords
- Batch Write operations when creating multiple files

## CONTEXT_ANCHOR_SYSTEM

Every 10 operations:

1. Re-read the original task description from `## Metadata`
2. Verify the current operation aligns with original goals
3. Check if we're solving the right problem
4. Update the `Current Focus` bullet point in `## Progress`

---

## Confidence Level Thresholds

When making claims about code relationships, patterns, or behavior, declare confidence:

| Level | Threshold | Meaning | Action |
| ----- | --------- | ------- | ------ |
| **High** | ≥90% | Verified with code evidence | Proceed with implementation |
| **Medium** | 70-89% | Partially verified, some inference | Note assumptions, proceed cautiously |
| **Low** | <70% | Inferred, not fully verified | HALT — gather more evidence before proceeding |

**Usage:** "I believe X calls Y (High confidence — verified via grep at `file:line`)."

If confidence is Low on any critical decision, do NOT proceed. Instead: read more code, run tests, or ask the user.

---

## Quick Reference Checklist

**Before any major operation:**

- [ ] ASSUMPTION_VALIDATION_CHECKPOINT
- [ ] EVIDENCE_CHAIN_VALIDATION
- [ ] TOOL_EFFICIENCY_PROTOCOL

**Every 10 operations:**

- [ ] CONTEXT_ANCHOR_CHECK
- [ ] Update 'Current Focus' in `## Progress`

**Emergency:**

- **Context Drift** -> Re-read `## Metadata` section
- **Assumption Creep** -> Halt, validate with code
- **Evidence Gap** -> Mark as "inferred"
