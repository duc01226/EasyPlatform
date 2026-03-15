# BA Team Decision Model Protocol

**Version:** 1.0.0 | **Last Updated:** 2026-03-12

Every BA refinement decision MUST follow this protocol. This is the single source of truth for how the BA team (UX BA, Designer BA, Dev BA PIC) collaborates and makes decisions. Referenced by `/pbi-challenge`, `/dor-gate`, `business-analyst` agent, and `ba-refinement-context.cjs` hook.

---

## 1. 2/3 Majority Vote Model

**Rule:** Every PBI decision requires agreement from at least 2 of 3 BA team members.

| Scenario                           | Rule                                                      |
| ---------------------------------- | --------------------------------------------------------- |
| All 3 agree                        | Decision final                                            |
| 2 of 3 agree                       | Majority wins                                             |
| 3 different opinions (no majority) | Escalate to full squad + Tech Leads + Engineering Manager |

**BA Team Composition (per squad):**

- **Per squad:** Dev BA PIC + UX BA + Designer BA

**How voting works:** During refinement meetings, each member states their position on PBI scope, AC, and priority. Verbal agreement or explicit vote. Decision is recorded in the PBI artifact's Validation Summary.

---

## 2. Technical Veto

**Rule:** Dev BA PIC has unilateral veto on technical feasibility questions.

**Veto scope — Dev BA PIC CAN veto:**

- Architecture feasibility (feature can't be built with current stack)
- Dependency correctness (wrong service, wrong API, wrong data model)
- Cross-service impact (missing message bus events, broken contracts)
- Performance feasibility (proposed approach will cause unacceptable latency)
- Security concerns (proposed approach creates vulnerability)

**Veto scope — Dev BA PIC CANNOT veto:**

- UI/UX design decisions (UX BA's domain)
- Visual design choices (Designer BA's domain)
- Business value prioritization (PO's domain)
- User research insights (UX BA's domain)

**Escalation on veto:** If UX BA + Designer BA disagree with a technical veto, they can escalate to the Engineering Manager for technical consultation. Engineering Manager's decision is final on technical matters.

---

## 3. Disagree-and-Commit

**Rule:** Once a decision is made (2/3 or 3/3), everyone commits. No passive resistance, no re-litigating in grooming.

**Applies to:**

- PBI scope decisions
- AC completeness
- Priority ordering
- Story splitting

**Exception:** New information discovered after decision (e.g., client changes requirements, technical blocker found) can reopen a decision through a new vote.

---

## 4. 75% Grooming Override Rule

**Rule:** BA team's decision can only be changed during grooming if >75% of remaining squad members vote to override.

**Process:**

1. Dev BA PIC presents refined PBI to full squad in grooming
2. Squad members raise concerns
3. If concern requires changing BA team's decision, call a vote
4. Override requires >75% of non-BA squad members to agree
5. If override passes, PBI goes back to BA team for revision

**Why 75%?** Prevents casual overriding. BA team invested significant effort in refinement. Only strong squad consensus should change their work.

---

## 5. Escalation Path

| Situation                                   | Escalation To                          | Resolution              |
| ------------------------------------------- | -------------------------------------- | ----------------------- |
| UX BA + Designer BA unsure if tech-possible | Dev BA PIC                             | Dev BA PIC decides      |
| Dev BA PIC unsure about architecture        | Engineering Manager                    | Engineering Mgr decides |
| 3-way disagreement (no 2/3 majority)        | Full squad + Tech Leads + Eng. Manager | Majority vote           |
| Business value disagreement                 | Product Owner                          | PO decides              |
| Design feasibility disagreement             | UX BA + Designer BA together           | Design-team consensus   |

---

## 6. Role Scope Boundaries

### UX BA — OWNS:

- User stories for UI/UX flows and interactions
- Wireframes, mockups, and UX prototypes
- AC for visual/interaction behavior
- User research insights feeding into stories
- Edge cases related to UX and usability

### UX BA — DOES NOT OWN:

- Business logic user stories and domain rules
- AC for backend/data behavior
- Data model / API-level requirements
- Complex business workflow definitions
- Integration and dependency specifications

### Designer BA — BA Contribution:

- Design feasibility assessment during refinement
- Product thinking — "Is this designable? Will users accept this visually?"
- Brainstorming from design-informed perspective
- Equal vote in 2/3 model

### Designer BA — Design Execution (separate from BA):

- UI visual design for refined PBIs
- Design system maintenance
- Design assets and prototype polish

### Dev BA PIC — OWNS:

- Leading refinement meetings
- Facilitating client discussions
- Technical feasibility review of all PBIs
- AI pre-review of PBIs (using `/pbi-challenge` or `/refine-review`)
- Ensuring DoR gate passes (using `/dor-gate`)
- Presenting PBIs in grooming
- Running AI estimation

### Dev BA PIC — DOES NOT OWN:

- Making solo decisions (2/3 vote model enforced)
- Overriding UX BA/Designer BA opinions (except technical veto)
- UI/UX design decisions
- Visual design execution
- Sprint planning decisions (Squad Lead's job)
- Architecture decisions (Engineering Manager's domain)

---

## 7. Decision Logging Template

Record in the PBI artifact's **Validation Summary** section:

```markdown
### Decision Record

**PBI:** {PBI-ID}
**Date:** {YYYY-MM-DD}
**Team:** {Squad name}

| Member        | Role        | Vote                   | Notes                    |
| ------------- | ----------- | ---------------------- | ------------------------ |
| {Dev BA PIC}  | Dev BA PIC  | Approve/Reject/Abstain | {conditions or concerns} |
| {UX BA}       | UX BA       | Approve/Reject/Abstain | {conditions or concerns} |
| {Designer BA} | Designer BA | Approve/Reject/Abstain | {conditions or concerns} |

**Result:** {2/3 Approve / 3/3 Approve / Escalated}
**Dissent:** {If any member disagreed, record their concern for future reference}
```

### Escalation Record (if applicable)

```markdown
### Escalation Record

**PBI:** {PBI-ID}
**Reason:** {Technical veto / 3-way disagreement / Business value dispute}
**Escalated To:** {Engineering Manager / Full squad / Product Owner}
**Decision:** {What was decided}
**Resolution:** {How to proceed}
```

---

## Cross-Reference

- **Consumed by:** `/pbi-challenge`, `/dor-gate`, `business-analyst` agent, `ba-refinement-context.cjs` hook
- **Source:** BA team working process documentation
- **Related:** `refinement-dor-checklist-protocol.md` (DoR gate rules)
