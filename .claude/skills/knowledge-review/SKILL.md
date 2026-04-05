---
name: knowledge-review
version: 1.0.0
description: '[Research] Review knowledge artifacts for completeness, citation quality, confidence accuracy, and template compliance.'
allowed-tools: Read, Grep, Glob, TaskCreate, Bash
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

**Prerequisites:** **MUST ATTENTION READ** before executing:

<!-- SYNC:web-research -->

> **Web Research** — Structured web search for evidence gathering.
>
> 1. Form 3-5 specific search queries (not generic questions)
> 2. Use WebSearch for each query, collect top 3-5 sources
> 3. Validate source credibility (official docs > blogs > forums)
> 4. Cross-validate claims across 2+ sources before citing
> 5. Write findings to research report with source URLs
>
> **NEVER cite a single source as authoritative. Always cross-validate.**

<!-- /SYNC:web-research -->

> **OOP & DRY Enforcement:** MANDATORY IMPORTANT MUST ATTENTION — flag duplicated patterns that should be extracted to a base class, generic, or helper. Classes in the same group or suffix (ex *Entity, *Dto, \*Service, etc...) MUST ATTENTION inherit a common base (even if empty now — enables future shared logic and child overrides). Verify project has code linting/analyzer configured for the stack.

## Quick Summary

**Goal:** Review knowledge artifacts for quality, completeness, and protocol compliance.

**Workflow:**

1. **Read artifact** — Load the knowledge report/course/strategy
2. **Template compliance** — Verify all enforced sections present
3. **Citation audit** — Check inline citations and source table
4. **Confidence check** — Verify scores match evidence
5. **Output review** — Summary with pass/warn/fail per check

**Key Rules:**

- Every section from template must be present and non-empty
- Every factual claim must have inline citation
- Confidence scores must match evidence basis
- READ-ONLY — do not modify the artifact

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Knowledge Review

## Review Checklist

### 1. Template Compliance

- [ ] All enforced sections present
- [ ] No sections are empty placeholders
- [ ] Section order matches template

### 2. Citation Audit

- [ ] Every factual claim has inline citation `[N]`
- [ ] Every source in Sources table is referenced in text
- [ ] No orphan citations
- [ ] Sources table has: Title, URL, Author, Date, Tier

### 3. Confidence Accuracy

- [ ] Per-finding confidence scores declared
- [ ] Overall confidence declared
- [ ] Scores match evidence basis (not inflated)
- [ ] Findings <60% flagged prominently

### 4. Source Quality

- [ ] Tier distribution appropriate (not all Tier 4)
- [ ] At least 50% Tier 1-2 sources for key claims
- [ ] Recency appropriate for topic type

### 5. Knowledge Gaps

- [ ] Gaps section is present and honest
- [ ] Known limitations declared
- [ ] Suggestions for further research included

### 6. Cross-Validation

- [ ] Key claims verified by 2+ sources
- [ ] Discrepancies noted where sources conflict
- [ ] Single-source claims marked as unverified

### 7. Actionability

- [ ] Recommendations are concrete (not vague)
- [ ] Next steps are evidence-based
- [ ] Executive summary captures key findings

## Output Format

```markdown
## Knowledge Review Result

**Status:** PASS | WARN | FAIL
**Artifact:** {path}

### Checks (N/7 passed)

- [x] Template compliance
- [x] Citation audit
- [ ] Confidence accuracy — {issue}
- [ ] Source quality — {issue}
      ...

### Issues

- {specific issues found}

### Verdict

{APPROVED | REVISE | BLOCKED}
```

## Round 2: Focused Re-Review (MANDATORY)

<!-- SYNC:double-round-trip-review -->

> **Deep Multi-Round Review** — THREE mandatory escalating-depth rounds. NEVER combine. NEVER PASS after Round 1 alone.
>
> **Round 1:** Normal review building understanding. Read all files, note issues.
> **Round 2:** MANDATORY re-read ALL files from scratch. Focus on:
>
> - Cross-cutting concerns missed in Round 1
> - Interaction bugs between changed files
> - Convention drift (new code vs existing patterns)
> - Missing pieces (what should exist but doesn't)
>
> **Round 3:** MANDATORY adversarial simulation (for >3 files or cross-cutting changes). Pretend you are using/running this code RIGHT NOW:
>
> - "What input causes failure? What error do I get?"
> - "1000 concurrent users — what breaks?"
> - "After deployment rollback — backward compatible?"
> - "Can I debug issues from logs/monitoring output?"
>
> **Rules:** NEVER rely on prior round memory — re-read everything. NEVER declare PASS after Round 1. Final verdict must incorporate ALL rounds.
> **Report must include `## Round 2 Findings` and `## Round 3 Findings` sections.**

<!-- /SYNC:double-round-trip-review -->

After completing Round 1 evaluation, execute a **second full review round**:

1. **Re-read** the Round 1 verdict and checklist results
2. **Re-evaluate** ALL checklist items — do NOT rely on Round 1 memory
3. **Challenge** Round 1 PASS items: "Is this really PASS? Did I verify citations and confidence?"
4. **Focus on** what Round 1 typically misses:
    - Citation accuracy (do sources actually say what's claimed?)
    - Confidence calibration (are percentages realistic?)
    - Knowledge gaps that weren't flagged
    - Template compliance shortcuts
5. **Update verdict** if Round 2 found new issues
6. **Final verdict** must incorporate findings from BOTH rounds

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
- **IMPORTANT MUST ATTENTION** execute two review rounds (Round 1: understand, Round 2: catch missed issues)
  **MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:
      <!-- SYNC:web-research:reminder -->
- **IMPORTANT MUST ATTENTION** cite 2+ independent sources per claim. NEVER fabricate — "No evidence found" is valid output.
      <!-- /SYNC:web-research:reminder -->
      <!-- SYNC:double-round-trip-review:reminder -->
- **IMPORTANT MUST ATTENTION** execute TWO review rounds. Round 2 re-reads from scratch — never skip or combine with Round 1.
    <!-- /SYNC:double-round-trip-review:reminder -->
