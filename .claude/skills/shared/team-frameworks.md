# Team Frameworks Reference

Consolidated prioritization and quality frameworks used across team skills.

---

## RICE Score

```
Score = (Reach x Impact x Confidence) / Effort
```

| Factor | Scale | Values |
| ------ | ----- | ------ |
| Reach | Users affected per quarter | Numeric count |
| Impact | Per-user effect | 0.25 (minimal), 0.5 (low), 1 (medium), 2 (high), 3 (massive) |
| Confidence | Certainty level | 0.5 (low), 0.8 (medium), 1.0 (high) |
| Effort | Person-months | Numeric estimate |

### Example

| Item | Reach | Impact | Confidence | Effort | RICE |
| ---- | ----- | ------ | ---------- | ------ | ---- |
| Feature A | 500 | 2 | 0.8 | 2 | 400 |
| Feature B | 1000 | 1 | 1.0 | 5 | 200 |

---

## MoSCoW

| Category | Definition | Sprint Impact |
| -------- | ---------- | ------------- |
| **Must Have** | Critical, non-negotiable | Release blocker |
| **Should Have** | Important but not vital | High priority |
| **Could Have** | Nice to have, low effort | If time permits |
| **Won't Have** | Out of scope this cycle | Defer explicitly |

### Rules

- Must Haves should not exceed 60% of sprint capacity
- Should Haves fill remaining 40%
- Could Haves only if ahead of schedule
- Won't Haves are documented for future reference

---

## Value vs Effort Matrix

```
         High Value
             |
    Quick    |    Strategic
    Wins     |    Priorities
-------------+-------------
    Fill     |    Time
    Ins      |    Sinks
             |
         Low Value
   Low Effort    High Effort
```

| Quadrant | Action | Priority |
| -------- | ------ | -------- |
| Quick Wins (High Value + Low Effort) | Do first | P1 |
| Strategic (High Value + High Effort) | Plan carefully | P2 |
| Fill-ins (Low Value + Low Effort) | If time permits | P3 |
| Time Sinks (Low Value + High Effort) | Avoid | P4 |

---

## INVEST Criteria (User Stories)

| Criterion | Definition | Validation Question |
| --------- | ---------- | ------------------- |
| **I**ndependent | No dependencies on other stories | Can this be developed in any order? |
| **N**egotiable | Details can change | Is the "how" open for discussion? |
| **V**aluable | Delivers user value | Does user get observable benefit? |
| **E**stimable | Can estimate effort | Can team size this? |
| **S**mall | Completable in sprint | Effort <= 8? (prefer <= 5) |
| **T**estable | Clear acceptance criteria | Can we write pass/fail tests? |

---

## SPIDR Splitting (Stories > 8 points)

| Pattern | Question | Split Strategy |
| ------- | -------- | -------------- |
| **S**pike | Unknown complexity? | Research spike first, then stories |
| **P**aths | Multiple workflow branches? | One story per path/choice |
| **I**nterfaces | Multiple UIs or APIs? | One story per interface |
| **D**ata | Multiple data formats/types? | One story per data variation |
| **R**ules | Multiple business rules? | One story per rule variation |

### Size Validation

```
Effort 1-5:  Good size
Effort 6-8:  Consider splitting (apply SPIDR)
Effort >8:   MUST split (apply SPIDR, repeat until <= 8)
```

---

## SMART Goals (Requirements Quality)

| Criterion | Definition | Example |
| --------- | ---------- | ------- |
| **S**pecific | Clear, unambiguous outcome | "Reduce page load to <2s" not "Make faster" |
| **M**easurable | Quantifiable success criteria | Has a metric or test to verify |
| **A**chievable | Realistic within constraints | Team has skills and resources |
| **R**elevant | Aligns with business objectives | Delivers user or business value |
| **T**ime-bound | Has a deadline or sprint target | "By Sprint 12" or "Before release" |

---

## 5 Whys Root Cause Analysis

Iteratively ask "Why?" to trace symptoms to root cause:

```
Problem: Users abandon checkout
Why 1: Payment form times out → Why 2: API response >10s
Why 3: N+1 query on order items → Why 4: No eager loading
Why 5: Repository missing include → ROOT CAUSE: Add .Include(x => x.Items)
```

**Rules:** Stop at actionable root cause. Max 5 levels. Document each level.

---

## Risk Scoring Matrix

```
Score = Probability x Impact
```

| Factor | Low (1) | Medium (2) | High (3) |
| ------ | ------- | ---------- | -------- |
| **Probability** | Unlikely (<25%) | Possible (25-75%) | Likely (>75%) |
| **Impact** | Minor delay | Feature at risk | Release blocker |

| Score | Action |
| ----- | ------ |
| 7-9 | Escalate immediately, assign owner |
| 4-6 | Monitor weekly, mitigation plan required |
| 1-3 | Accept risk, review monthly |

---

## Velocity & Burndown

**Velocity** = story points completed per sprint (rolling 3-sprint average).

| Sprint | Planned | Completed | Velocity |
| ------ | ------- | --------- | -------- |
| S10 | 25 | 22 | - |
| S11 | 24 | 24 | - |
| S12 | 23 | 21 | 22.3 |

**Burndown:** Track remaining work daily. Ideal line = total / days. Actual above ideal = behind schedule.

---

## Priority Conventions

- Use numeric ordering: 1 (highest) to 999 (lowest)
- Never use High/Medium/Low categories
- Priority field in frontmatter: `priority: 1`
