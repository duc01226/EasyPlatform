---
module: '{Module}'
service: '{ServiceName}.Service'
feature_code: '{FC}'
entities: ['{Entity1}', '{Entity2}']
status: draft | active | deprecated
owner: '{Team or role that maintains this capability}'
last_updated: '{YYYY-MM-DD}'
---

# {FeatureName} — Feature Spec

> **Tech-free Feature Spec.** One doc per module-level capability. A Business Analyst, QA/QC engineer, or AI
> understands the whole capability from this single read.
> **No technical terms in prose** — no API routes, command/handler names, message-bus or event-contract schemas,
> code, or file paths. The code is the technical source of truth; this doc owns the business truth.
> Every rule has an ID, every test case is BDD. Domain events appear only as business occurrences, never as
> message/bus schemas.

## Sections

1. [Overview](#1-overview)
2. [Glossary](#2-glossary)
3. [User Stories & Acceptance Criteria](#3-user-stories--acceptance-criteria)
4. [Business Rules](#4-business-rules)
5. [Domain Model](#5-domain-model)
6. [Process Flows](#6-process-flows)
7. [Permissions & Roles](#7-permissions--roles)
8. [Test Specifications](#8-test-specifications)

---

## 1. Overview

> **Purpose:** Set the reader's mental model in 2-3 plain sentences before any detail.
> **Instructions:** What the capability does, who uses it, why it matters. Plain business language.
> **Anti-pattern:** No ROI tables, no architecture, no technology names.

{2-3 sentences: what this capability does, who it serves, what problem it solves.}

---

## 2. Glossary

> **Purpose:** Define domain / ubiquitous-language terms BEFORE they are used. A reader (or AI) parses
> top-to-bottom — an undefined term cascades into misreading.
> **Instructions:** 5-15 key terms. One definition per concept. No synonyms.
> **Anti-pattern:** Do NOT skip. Do NOT place the glossary at the end.

| Term   | Definition                | Context                                       |
| ------ | ------------------------- | --------------------------------------------- |
| {Term} | {One-sentence definition} | {When/where this term is used in the feature} |

---

## 3. User Stories & Acceptance Criteria

> **Purpose:** What each role needs and how we agree it is done. The business requirements spine.
> **Instructions:** One `US-{FC}-NN` per need (As a / I want / So that), each with one or more
> `AC-{FC}-NN` acceptance criteria in Given/When/Then form. Acceptance criteria must be observable and testable.
> **Anti-pattern:** No implementation detail, no code evidence, no file paths.

### US-{FC}-01: {Story Title}

**As a** {role}
**I want to** {action}
**So that** {benefit}

**Acceptance Criteria:**

- **AC-{FC}-01** — **Given** {context} **When** {action} **Then** {observable outcome}
- **AC-{FC}-02** — **Given** {context} **When** {action} **Then** {observable outcome}

---

## 4. Business Rules

> **Purpose:** The laws governing the domain — validation, invariants, state transitions.
> **Instructions:** Each rule has a `BR-{FC}-NN` ID, a plain IF/THEN statement (decision table for complex
> multi-condition rules), and a `[HARD]` (blocking) / `[SOFT]` (warning) marker.
> **Anti-pattern:** No vague "the field is validated." State the exact condition and the exact business message.

### Rule Catalog

| Rule ID    | Name   | Category   | Enforcement     |
| ---------- | ------ | ---------- | --------------- |
| BR-{FC}-01 | {Name} | {Category} | [HARD] / [SOFT] |

### BR-{FC}-01: {Rule Name} [HARD]

**Statement:** {Clear, unambiguous rule statement.}

```
IF {condition}
  → REJECT: "{Exact business message}"
ELSE
  → ALLOW
```

**Decision Table** (for complex multi-condition rules):

| Condition A | Condition B | Outcome |
| ----------- | ----------- | ------- |
| empty       | —           | REJECT  |
| valid       | No          | REJECT  |
| valid       | Yes         | ALLOW   |

---

## 5. Domain Model

> **Purpose:** The nouns of the capability — entities, value objects, enums, relationships.
> **Instructions:** Tables with a **Business Meaning** column. Use plain types only — text, number, date,
> yes/no, or a named enum. Business-meaningful domain events (e.g. "Goal Approved") are listed here as
> occurrences.
> **Anti-pattern:** No framework/language type names, no namespaces, no file paths, no message/bus schemas.

### Relationships (overview)

```
{Entity1} 1──N {Entity2}   (a {Entity1} has many {Entity2})
{Entity1} 1──N {Entity3}   (role: Owner | Watcher)
```

### Entity: {EntityName}

| Property   | Type                         | Required | Constraints  | Business Meaning                    |
| ---------- | ---------------------------- | -------- | ------------ | ----------------------------------- |
| {Property} | text/number/date/yes-no/enum | {Yes/No} | {Constraint} | {What this means in business terms} |

### Enum: {EnumName}

| Value  | Meaning                                      |
| ------ | -------------------------------------------- |
| {Name} | {Business scenario where this value applies} |

### Relationships (detail)

| From      | To        | Cardinality | Business Meaning                    |
| --------- | --------- | ----------- | ----------------------------------- |
| {Entity1} | {Entity2} | 1→N         | {What this relationship represents} |

### Domain Events (business occurrences)

| Occurrence      | When it happens             | Who/what reacts (business outcome)       |
| --------------- | --------------------------- | ---------------------------------------- |
| {Goal Approved} | {A manager approves a goal} | {Owner is notified; goal becomes active} |

---

## 6. Process Flows

> **Purpose:** The key user journeys as business steps.
> **Instructions:** 3-5 most important flows (create, update, the key business process). Step tables and/or
> simple diagrams. Describe screens as business steps/states, not component names.
> **Anti-pattern:** No code files, no component names, no implementation flow.

### Flow: {Process Name}

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│  Start   │───▶│  Step 1  │───▶│   End    │
└──────────┘    └──────────┘    └──────────┘
```

| Step | Actor   | Action   | System Response | Next |
| ---- | ------- | -------- | --------------- | ---- |
| 1    | {Actor} | {Action} | {Response}      | 2    |

---

## 7. Permissions & Roles

> **Purpose:** Who may do what, in business terms (RBAC matrix).
> **Instructions:** Roles × View/Create/Edit/Delete plus any scope rules. Note special business-permission codes.
> **Anti-pattern:** No auth-implementation detail — no tokens, no authorization attributes, no config.

### Role-Permission Matrix

| Role       | View | Create | Edit | Delete | Scope         |
| ---------- | :--: | :----: | :--: | :----: | ------------- |
| Admin      | yes  |  yes   | yes  |  yes   | All companies |
| HR Manager | yes  |  yes   | yes  |   no   | Own company   |
| Manager    | yes  |   no   | own  |   no   | Own team      |
| Employee   | yes  |   no   |  no  |   no   | Own data      |

### Granular Permissions (if applicable)

| Permission            | Description                   | Default Roles                    |
| --------------------- | ----------------------------- | -------------------------------- |
| Can {Action} {Entity} | {What this permission allows} | {Which roles have it by default} |

---

## 8. Test Specifications

> **Purpose:** The complete, business-readable test cases — the QA half of the audience. Each TC proves a
> specific `AC-` or `BR-`.
> **Instructions:** Each TC: `TC-{FC}-NNN` ID, priority, the AC/BR it proves, BDD Given/When/Then, inline edge
> cases. Cover every user story and every rule.
> **Hidden machine-only carrier:** Each TC ends with a visually-separated `[Source: namespace/service/id]`
> anchor line. BA/QA ignore it; the doc⇄code sync check and AI consume it. It is the ONLY place an anchor
> appears, and it is NOT prose. Use an abstract anchor (`namespace ∈ operation | event | component | schema |
requirement | rule | constraint | test`) — never a `file:line`, `.cs`, or `src/` path.

### Test Summary

| Priority  | Count   | Automated | Manual |
| --------- | ------- | --------- | ------ |
| P0        | {n}     | {n}       | 0      |
| P1        | {n}     | {n}       | 0      |
| P2        | {n}     | {n}       | 0      |
| **Total** | **{N}** | **{N}**   | **0**  |

### TC-{FC}-001: {Test Name} [P0]

**Objective:** {What this test validates and why it matters.}

**Business Intent / Invariant Guarded:** {Business rule, invariant, or user promise this TC protects; the TC must fail if it breaks.}

**Proves:** AC-{FC}-01 / BR-{FC}-01

**Preconditions:**

- {Required state or seeded data}

```gherkin
Given {initial context/state}
When {action performed}
Then {expected business outcome}
And {additional verification}
```

**Edge Cases (inline):**

- {Invalid input/condition} → REJECT: "{Exact business message}"
- {Boundary condition} → {Expected behavior}

<!-- machine-only carrier — ignore when reading as BA/QA -->

> `[Source: {namespace}/{service}/{id}]`
> **IntegrationTest:** `{configured-test-path}/{TestFile}::{MethodName}` · **Status:** Tested | Untested | Planned

---

## Authoring Rules

> **Tech-free:** Sections 1-8 prose contains zero technical terms — no API routes, command/handler names,
> message-bus/event-contract schemas, code, or file paths. Technical detail lives in code (the technical
> source of truth); an API reference can be regenerated from code if needed.
> **Size:** Body (sections 1-7) target ≤1200 lines; whole file hard-cap ≤1800 lines. **Split** the capability
> into two Feature Specs when the body exceeds 1200 lines OR the doc exceeds 40 test cases, OR when two
> distinct module-level capabilities emerge.
> **IDs required:** Every user story (`US-{FC}-NN`), acceptance criterion (`AC-{FC}-NN`), business rule
> (`BR-{FC}-NN`), and test case (`TC-{FC}-NNN`) has a unique ID.
> **Anchors:** A source anchor appears ONLY in the Section 8 hidden carrier — never in prose. Use the abstract
> `[Source: namespace/service/id]` form, never `file:line`.
> **Glossary first:** Section 2 defines terms BEFORE they appear in later sections.

---

_Feature Spec — tech-free 8-section template v4.0_
