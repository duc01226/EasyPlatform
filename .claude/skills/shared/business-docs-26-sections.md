# Business Feature Documentation - 26-Section Structure

Canonical template outline for enterprise module documentation in `docs/business-features/`.

**Gold Standard:** `docs/features/README.ExampleFeature1.md`
**Full Template:** `docs/templates/detailed-feature-docs-template.md`

---

## Output Structure

```
docs/
├── BUSINESS-FEATURES.md              # Master index (UPDATE if new module)
└── business-features/
    ├── {Module}/
    │   ├── README.md                 # Complete module documentation
    │   ├── INDEX.md                  # Navigation hub
    │   ├── API-REFERENCE.md          # Endpoint documentation
    │   ├── TROUBLESHOOTING.md        # Issue resolution guide
    │   └── detailed-features/
    │       ├── README.{Feature}.md        # Deep dive (~1000 lines)
    │       └── README.{Feature}.ai.md     # AI companion (~300 lines)
    └── ...
```

---

## Mandatory 26-Section Order

| #   | Section                    | Stakeholder Focus      |
| --- | -------------------------- | ---------------------- |
| 1   | Executive Summary          | PO, BA                 |
| 2   | Business Value             | PO, BA                 |
| 3   | Business Requirements      | PO, BA                 |
| 4   | Business Rules             | BA, Dev                |
| 5   | Process Flows              | BA, Dev, Architect     |
| 6   | Design Reference           | BA, UX, Dev            |
| 7   | System Design              | Dev, Architect         |
| 8   | Architecture               | Dev, Architect         |
| 9   | Domain Model               | Dev, Architect         |
| 10  | API Reference              | Dev, Architect         |
| 11  | Frontend Components        | Dev                    |
| 12  | Backend Controllers        | Dev                    |
| 13  | Cross-Service Integration  | Dev, Architect         |
| 14  | Security Architecture      | Dev, Architect         |
| 15  | Performance Considerations | Dev, Architect, DevOps |
| 16  | Implementation Guide       | Dev                    |
| 17  | Test Specifications        | QA                     |
| 18  | Test Data Requirements     | QA                     |
| 19  | Edge Cases Catalog         | QA, Dev                |
| 20  | Regression Impact          | QA                     |
| 21  | Troubleshooting            | Dev, QA, DevOps        |
| 22  | Operational Runbook        | DevOps                 |
| 23  | Roadmap and Dependencies   | PO, BA                 |
| 24  | Related Documentation      | All                    |
| 25  | Glossary                   | PO, BA                 |
| 26  | Version History            | All                    |

---

## Quick Navigation by Role

```markdown
| Role                 | Priority Sections                                               | Key Concerns                                   |
| -------------------- | --------------------------------------------------------------- | ---------------------------------------------- |
| **Product Owner**    | Executive Summary, Business Value, Roadmap                      | ROI, scope, timeline, dependencies             |
| **Business Analyst** | Business Requirements, Business Rules, Process Flows            | Requirements traceability, acceptance criteria  |
| **Developer**        | Architecture, Domain Model, API Reference, Implementation Guide | Code patterns, integration points              |
| **Tech Architect**   | System Design, Architecture, Cross-Service, Performance         | System design, scalability, tech debt          |
| **QA Engineer**      | Test Specifications, Test Data, Edge Cases Catalog              | Test coverage, automation feasibility          |
| **QC Analyst**       | All sections                                                    | Evidence verification, documentation accuracy  |
| **DevOps**           | Operational Runbook, Troubleshooting, Performance               | Deployment, monitoring, incident response      |
```

---

## Key Format Templates

### Business Requirements (FR-XX)

```markdown
#### FR-{MOD}-01: {Requirement Title}

| Aspect          | Details                           |
| --------------- | --------------------------------- |
| **Description** | {What this requirement enables}   |
| **Scope**       | {Who can use / affected entities} |
| **Validation**  | {Business rules and constraints}  |
| **Priority**    | {P0/P1/P2/P3}                    |
| **Evidence**    | `{FilePath}:{LineRange}`          |
```

### User Stories (US-XX)

```markdown
#### US-{MOD}-01: {Story Title}

**As a** {role}
**I want** {goal/desire}
**So that** {benefit/value}

**Acceptance Criteria**:
- [ ] AC-01: {Criterion with evidence reference}
- [ ] AC-02: {Criterion with evidence reference}

**Related Requirements**: FR-{MOD}-01, FR-{MOD}-02
**Evidence**: `{FilePath}:{LineRange}`
```

### Business Value

```markdown
| Value Type      | Description          | Impact  | Quantification          |
| --------------- | -------------------- | ------- | ----------------------- |
| Revenue         | {Revenue impact}     | {H/M/L} | {$ or % if available}   |
| Efficiency      | {Time/cost savings}  | {H/M/L} | {Hours/costs saved}     |
| User Experience | {UX improvement}     | {H/M/L} | {Satisfaction metric}   |
| Compliance      | {Regulatory benefit} | {H/M/L} | {Risk reduction}        |
```

### Business Rules

```markdown
| Rule ID     | Rule        | Condition        | Action        | Evidence        |
| ----------- | ----------- | ---------------- | ------------- | --------------- |
| BR-{MOD}-01 | {Rule name} | {When condition} | {Then action} | `{File}:{Line}` |
```

### State Transitions

```markdown
| From State | Event    | To State | Conditions   | Evidence        |
| ---------- | -------- | -------- | ------------ | --------------- |
| Draft      | Activate | Active   | {Conditions} | `{File}:{Line}` |
```

### Test Specifications (TC-XX)

**Test Summary Table (MANDATORY):**

```markdown
| Category    | P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low) | Total   |
| ----------- | :-----------: | :-------: | :---------: | :------: | :-----: |
| {Category}  |      {N}      |    {N}    |     {N}     |   {N}    |   {N}   |
| **Total**   |    **{N}**    |  **{N}**  |   **{N}**   | **{N}**  | **{N}** |
```

**Test Case Format:**

```markdown
#### TC-{MOD}-001: {Test Name} [P0]

**GIVEN** {initial context}
**WHEN** {action performed}
**THEN** {expected outcome}

**Edge Cases:**
- {Invalid scenario} -> {Expected error/behavior}

**Evidence**: `{FilePath}:{LineRange}`
```

### Edge Cases Catalog

```markdown
| ID    | Scenario     | Input/Condition | Expected Behavior | Evidence        |
| ----- | ------------ | --------------- | ----------------- | --------------- |
| EC-01 | Empty string | `""`            | Validation error  | `{File}:{Line}` |
```

### Security Architecture

```markdown
| Role    | View | Create | Edit | Delete | Special Permissions |
| ------- | :--: | :----: | :--: | :----: | ------------------- |
| Admin   |  Y   |   Y    |  Y   |   Y    | Full access         |
| Manager |  Y   |   Y    |  Y   |   N    | Company scope       |
| User    |  Y   |   N    |  N   |   N    | Own data only       |
```

### Technical Decisions Log

```markdown
| Decision    | Date   | Options Considered | Chosen   | Rationale | Evidence        |
| ----------- | ------ | ------------------ | -------- | --------- | --------------- |
| {Decision}  | {Date} | {Option A, B}      | {Chosen} | {Why}     | `{File}:{Line}` |
```

### Operational Runbook

```markdown
### Deployment Checklist
- [ ] Database migrations applied
- [ ] Configuration values verified
- [ ] Health checks passing
- [ ] Smoke tests executed
- [ ] Rollback plan ready
```

### Evidence Verification Protocol

```markdown
| Category              | Total Claims | Verified | Stale | Missing | Last Verified |
| --------------------- | ------------ | -------- | ----- | ------- | ------------- |
| Business Requirements | {N}          | {N}      | {N}   | {N}     | {Date}        |
| Architecture          | {N}          | {N}      | {N}   | {N}     | {Date}        |
| Test Specifications   | {N}          | {N}      | {N}   | {N}     | {Date}        |
```

### Glossary

```markdown
| Term      | Definition                                  | Context      |
| --------- | ------------------------------------------- | ------------ |
| {Term}    | {Definition for non-technical stakeholders} | {Where used} |
```

---

## AI Companion File (~300 lines)

Place at `README.{Feature}.ai.md`. Compressed version with 10 sections:

| Section         | Content                          | Source Section           |
| --------------- | -------------------------------- | ------------------------ |
| Context         | Purpose, entities, service       | Executive Summary        |
| File Locations  | Exact paths to all key files     | Implementation Guide     |
| Domain Model    | Properties, expressions          | Domain Model             |
| API Contracts   | Endpoints, request/response      | API Reference            |
| Business Rules  | Validation, state transitions    | Business Rules           |
| Patterns        | Required / Anti-patterns         | Architecture             |
| Integration     | Events, dependencies             | Cross-Service            |
| Security        | Authorization matrix             | Security Architecture    |
| Test Scenarios  | Key GIVEN/WHEN/THEN cases        | Test Specifications      |
| Quick Reference | Decision tree, code snippets     | Implementation Guide     |

### Compression Rules

1. Tables over prose
2. Paths over descriptions (`File:Line` over "located in...")
3. Signatures over examples (`{ id: string } -> { entity: Dto }`)
4. Decisions over explanations (what to do, not why)

---

## Quality Checklist

- [ ] All 26 mandatory sections present in correct order
- [ ] Quick Navigation by Role included
- [ ] Business Requirements use FR-{MOD}-XX format
- [ ] Test cases use TC-{MOD}-XXX format with GIVEN/WHEN/THEN
- [ ] Test Summary table with P0-P3 counts
- [ ] Edge Cases Catalog included
- [ ] Evidence Verification Protocol with audit trail
- [ ] Glossary for non-technical stakeholders
- [ ] Version History table at end
- [ ] All code references verified with actual files
- [ ] Master index (BUSINESS-FEATURES.md) updated
- [ ] AI companion file <= 300 lines (if created)
