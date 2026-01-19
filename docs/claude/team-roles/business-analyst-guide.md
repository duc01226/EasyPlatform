# Business Analyst Guide

> **Complete guide for Business Analysts using Claude Code to refine requirements, write user stories, and define acceptance criteria.**

---

## Quick Start

```bash
# Refine an idea into a PBI
/refine team-artifacts/ideas/260119-po-idea-dark-mode.md

# Create user stories from PBI
/story team-artifacts/pbis/260119-ba-pbi-dark-mode.md
```

**Output Location:** `team-artifacts/pbis/`
**Naming Pattern:** `{YYMMDD}-ba-pbi-{slug}.md` or `{YYMMDD}-ba-story-{slug}.md`

---

## Your Role in the Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                  REQUIREMENTS WORKFLOW                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   PO ──/idea──> [YOU] ──/refine──> PBI ──> Dev              │
│                   │                                          │
│                   └──/story──> User Stories ──> QA          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Your Responsibilities

| Task | Command | Output |
|------|---------|--------|
| Refine ideas to PBIs | `/refine` | `team-artifacts/pbis/*.md` |
| Write user stories | `/story` | `team-artifacts/pbis/stories/*.md` |
| Define acceptance criteria | Manual | GIVEN/WHEN/THEN format |
| Gap analysis | Research | Requirements gaps identified |

---

## Commands

### `/refine` - Refine Idea to PBI

**Purpose:** Transform raw ideas into structured Product Backlog Items with acceptance criteria.

#### Basic Usage

```bash
# Refine from idea file
/refine team-artifacts/ideas/260119-po-idea-biometric-auth.md

# Refine with stakeholder context
/refine IDEA-260119-001 --stakeholders "Mobile team, Security team"

# Refine as bug type
/refine --type bug team-artifacts/ideas/260119-po-idea-login-bug.md
```

#### What Claude Generates

```markdown
---
id: PBI-260119-001
title: "Biometric Authentication for Mobile Login"
source_idea: IDEA-260119-001
priority: 800
effort: 13
status: draft
created: 2026-01-19
---

## Overview
Brief description of the feature.

## User Stories
1. As a [persona], I want [goal], so that [benefit]
2. ...

## Acceptance Criteria

### AC-001: [Scenario Name]
**GIVEN** [precondition]
**AND** [additional precondition]
**WHEN** [action]
**THEN** [expected result]
**AND** [additional result]

## Technical Notes
- [Implementation considerations]
- [API requirements]
- [Data model changes]

## Dependencies
- [Upstream dependencies]
- [Downstream impacts]

## Definition of Done
- [ ] Code complete and reviewed
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] Documentation updated
- [ ] QA sign-off
```

---

### `/story` - Create User Stories

**Purpose:** Break down PBIs into detailed user stories with scenarios.

#### Basic Usage

```bash
# Create stories from PBI
/story team-artifacts/pbis/260119-ba-pbi-biometric-auth.md

# Create stories for specific personas
/story PBI-260119-001 --personas "mobile-user,admin,security-officer"

# Create epic-level stories
/story PBI-260119-001 --level epic
```

#### What Claude Generates

```markdown
---
id: US-260119-001
parent_pbi: PBI-260119-001
title: "As a mobile user, I want to login with Face ID"
persona: "mobile-user"
priority: 800
effort: 5
status: draft
---

## User Story
**As a** mobile user
**I want to** login using Face ID
**So that** I can access the app quickly without typing my password

## Acceptance Criteria

### AC-001: Successful Face ID Login
**GIVEN** I have Face ID enabled on my device
**AND** I have enabled biometric login in app settings
**WHEN** I open the app
**THEN** the Face ID prompt appears
**AND** after successful scan, I am logged in within 2 seconds

### AC-002: Face ID Not Available
**GIVEN** my device does not support Face ID
**WHEN** I view login options
**THEN** Face ID option is not displayed
**AND** I see password login as primary option

### AC-003: Face ID Disabled
**GIVEN** I have Face ID on my device
**AND** I have NOT enabled biometric login in settings
**WHEN** I open the app
**THEN** I see password login screen
**AND** I see option to "Enable Face ID"

## Scenarios

### Happy Path
1. User opens app
2. Face ID prompt appears
3. User completes Face ID
4. User lands on dashboard

### Error Path
1. User opens app
2. Face ID prompt appears
3. Face ID fails
4. System shows "Try again" or "Use password"

### Edge Cases
- Device locked during scan
- App backgrounded during scan
- Multiple face profiles on device

## UI/UX Notes
- Face ID icon: SF Symbol "faceid"
- Animation: Subtle pulse while waiting
- Timeout: 30 seconds before fallback

## Technical Notes
- Use LocalAuthentication framework
- Store biometric preference in Keychain
- Log authentication attempts for security
```

---

## Writing Acceptance Criteria

### BDD Format (GIVEN/WHEN/THEN)

**Always use this format:**

```markdown
**GIVEN** [precondition - the initial context]
**AND** [additional precondition - optional]
**WHEN** [action - what the user does]
**THEN** [outcome - what should happen]
**AND** [additional outcome - optional]
```

### Good vs Bad Examples

**BAD - Vague and untestable:**
```markdown
- User can login with biometrics
- System should be fast
- Error handling should work
```

**GOOD - Specific and testable:**
```markdown
### AC-001: Face ID Login Success
**GIVEN** user has Face ID enabled on device
**AND** user has enabled biometric login in app settings
**WHEN** user opens the app
**THEN** Face ID prompt appears within 500ms
**AND** successful scan logs user in within 2 seconds
**AND** user lands on dashboard screen
```

### Acceptance Criteria Checklist

- [ ] Each AC has unique ID (AC-001, AC-002, etc.)
- [ ] GIVEN states clear preconditions
- [ ] WHEN describes single user action
- [ ] THEN has measurable/observable outcomes
- [ ] Covers happy path, error paths, edge cases
- [ ] No implementation details (HOW, not WHAT)
- [ ] Testable by QA without clarification

---

## INVEST Criteria

Every user story must meet INVEST:

| Criteria | Question | Check |
|----------|----------|-------|
| **I**ndependent | Can this be delivered without other stories? | No dependencies on incomplete work |
| **N**egotiable | Can scope be discussed with team? | Not locked into specific implementation |
| **V**aluable | Does it deliver user/business value? | Clear benefit stated |
| **E**stimable | Can team estimate effort? | Enough detail to size |
| **S**mall | Can it be done in one sprint? | <5 days of work typically |
| **T**estable | Can QA write test cases? | Clear acceptance criteria |

### INVEST Validation

```bash
# Claude can validate INVEST criteria
/story PBI-260119-001 --validate-invest

# Output:
# ✓ Independent - No blocking dependencies
# ✓ Negotiable - Implementation flexible
# ✓ Valuable - Reduces login time by 90%
# ⚠ Estimable - Need technical spike for iOS 15 support
# ✓ Small - Estimated 3 days
# ✓ Testable - 5 acceptance criteria defined
```

---

## Real-World Examples

### Example 1: E-commerce Feature

**Input Idea:**
```
"Add wishlist functionality so users can save products"
```

**Refined PBI:**
```markdown
---
id: PBI-260119-002
title: "Product Wishlist Feature"
---

## User Stories
1. As a shopper, I want to save products to a wishlist, so that I can buy them later
2. As a shopper, I want to view my wishlist, so that I can see saved products
3. As a shopper, I want to remove items from wishlist, so that I can manage my saved products
4. As a shopper, I want to move wishlist items to cart, so that I can purchase them easily

## Acceptance Criteria

### AC-001: Add to Wishlist
**GIVEN** I am viewing a product detail page
**AND** the product is in stock
**WHEN** I tap the heart icon
**THEN** the product is added to my wishlist
**AND** the heart icon fills in (solid)
**AND** I see toast message "Added to wishlist"

### AC-002: Wishlist Full
**GIVEN** my wishlist has 50 items (maximum)
**WHEN** I try to add another product
**THEN** I see error "Wishlist full. Remove items to add more."
**AND** product is NOT added

### AC-003: Already in Wishlist
**GIVEN** a product is already in my wishlist
**WHEN** I view that product's detail page
**THEN** the heart icon is filled (solid)
**AND** tapping it removes from wishlist
```

### Example 2: Bug Fix PBI

**Input Idea:**
```
"BUG: Search results not showing products with special characters"
```

**Refined PBI:**
```markdown
---
id: PBI-260119-003
title: "Fix Search Special Character Handling"
type: bug
---

## Bug Description
Products with special characters (é, ñ, ü) in names don't appear in search results.

## Acceptance Criteria

### AC-001: Search with Accented Characters
**GIVEN** product "Café Blend" exists in catalog
**WHEN** user searches for "cafe"
**THEN** "Café Blend" appears in results

### AC-002: Search with Exact Accents
**GIVEN** product "Café Blend" exists
**WHEN** user searches for "café"
**THEN** "Café Blend" appears in results

### AC-003: Unicode Normalization
**GIVEN** products with various Unicode names exist
**WHEN** user searches using ASCII equivalents
**THEN** all matching products appear (NFC normalization)

## Technical Notes
- Implement Unicode normalization (NFC)
- Add accent-insensitive collation to search index
- Test with: é, è, ê, ë, ñ, ü, ö, ß
```

---

## Gap Analysis

### Identifying Requirement Gaps

```bash
# Compare idea to PBI for gaps
/refine IDEA-260119-001 --gap-analysis

# Output:
## Gap Analysis: IDEA-260119-001 → PBI-260119-001

### Missing Information
1. ❓ What happens when biometric fails?
2. ❓ Maximum retry attempts before lockout?
3. ❓ Should we support both Face ID AND fingerprint?

### Assumptions Made
1. ⚠️ Assumed iOS 14+ only (Face ID API)
2. ⚠️ Assumed single device per user
3. ⚠️ Assumed English-only for now

### Clarification Needed
- [ ] Security team approval for biometric storage
- [ ] UX team input on failure flows
- [ ] Legal review for biometric data handling
```

### Gap Analysis with Business Documentation

The `/refine` command now automatically searches `docs/business-features/{Module}/` to enhance gap analysis:

1. **Similar Features** - Searches `detailed-features/*.md` by keyword
   - Finds existing features related to the idea
   - Shows descriptions and current implementation status

2. **Existing Requirements** - Extracts FR-XX IDs for reference
   - Links new PBI to existing functional requirements
   - Identifies requirements that need extension

3. **Test Specifications** - Notes TC-XX IDs for related tests
   - References existing test patterns for acceptance criteria
   - Identifies test coverage gaps

4. **Documentation Gaps** - Identifies missing coverage
   - "This extends existing feature FR-XX"
   - "This fills documentation gap: {description}"
   - "This may overlap with FR-XX - verify differentiation"

**Example Gap Analysis Output:**
```markdown
## Business Documentation Reference
- **Module**: TextSnippet
- **Module Docs**: [docs/business-features/TextSnippet/](docs/business-features/TextSnippet/)
- **Related Features**: FR-TS-003 (Search Snippets)
- **Related Test Specs**: TC-TS-002 (Search tests)
- **Gap Analysis**: This extends FR-TS-003 with advanced filtering capabilities
```

**Documentation Paths:**

| Content | Path |
|---------|------|
| Feature Index | `docs/business-features/{Module}/INDEX.md` |
| Requirements | `docs/business-features/{Module}/README.md` |
| Test Specs | `docs/test-specs/{Module}/README.md` |
| Detailed Features | `docs/business-features/{Module}/detailed-features/` |

---

## Working with Other Roles

### ← From Product Owner

**Receiving Ideas:**
1. Check `team-artifacts/ideas/` for `status: needs-refinement`
2. Read problem statement and value proposition
3. Clarify with PO if needed before refining

**Quality Check:**
- [ ] Problem statement is clear
- [ ] Value proposition is quantified
- [ ] Priority is assigned
- [ ] Stakeholders are identified

### → To QA Engineer

**Handoff Checklist:**
- [ ] All acceptance criteria in GIVEN/WHEN/THEN
- [ ] Edge cases documented
- [ ] Error scenarios included
- [ ] Technical notes for test environment

```bash
# Notify QA that PBI is ready
# In PBI file, set: status: ready-for-qa

# QA picks up with
/test-spec team-artifacts/pbis/260119-ba-pbi-biometric-auth.md
```

### → To Development Team

**Handoff Checklist:**
- [ ] Technical notes included
- [ ] API contracts defined (if applicable)
- [ ] Dependencies listed
- [ ] Definition of Done agreed

---

## Templates

### PBI Template

```markdown
---
id: PBI-{YYMMDD}-{NNN}
title: "{Brief descriptive title}"
source_idea: "{IDEA-ID or N/A}"
priority: {1-999}
effort: {story points}
status: {draft|ready|in-progress|done}
created: {YYYY-MM-DD}
---

## Overview
{2-3 sentence description of the feature/change}

## User Stories
1. As a {persona}, I want {goal}, so that {benefit}
2. ...

## Acceptance Criteria

### AC-001: {Scenario Name}
**GIVEN** {precondition}
**WHEN** {action}
**THEN** {outcome}

## Technical Notes
- {Implementation consideration}
- {API requirement}

## Dependencies
- Upstream: {what this depends on}
- Downstream: {what depends on this}

## Out of Scope
- {What we're explicitly NOT doing}

## Definition of Done
- [ ] Code reviewed
- [ ] Unit tests (>80%)
- [ ] Integration tests
- [ ] Documentation
- [ ] QA sign-off
```

### User Story Template

```markdown
---
id: US-{YYMMDD}-{NNN}
parent_pbi: {PBI-ID}
title: "As a {persona}, I want {goal}"
persona: "{persona-name}"
priority: {1-999}
effort: {1-13}
status: {draft|ready|done}
---

## User Story
**As a** {persona}
**I want to** {goal/action}
**So that** {benefit/value}

## Acceptance Criteria

### AC-001: {Happy Path}
**GIVEN** {precondition}
**WHEN** {action}
**THEN** {outcome}

### AC-002: {Error Path}
**GIVEN** {precondition}
**WHEN** {error condition}
**THEN** {error handling}

### AC-003: {Edge Case}
**GIVEN** {edge condition}
**WHEN** {action}
**THEN** {expected behavior}

## Scenarios
- Happy path: {flow}
- Error path: {flow}
- Edge cases: {list}

## UI/UX Notes
{Design considerations}

## Technical Notes
{Implementation hints}
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│               BUSINESS ANALYST QUICK REFERENCE               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  REFINE IDEAS                                                │
│  /refine team-artifacts/ideas/IDEA-XXX.md                    │
│  /refine IDEA-XXX --stakeholders "team1, team2"              │
│  /refine --type bug IDEA-XXX                                 │
│                                                              │
│  CREATE STORIES                                              │
│  /story team-artifacts/pbis/PBI-XXX.md                       │
│  /story PBI-XXX --personas "user,admin"                      │
│                                                              │
│  ACCEPTANCE CRITERIA FORMAT                                  │
│  GIVEN [precondition]                                        │
│  AND [additional precondition]                               │
│  WHEN [action]                                               │
│  THEN [outcome]                                              │
│  AND [additional outcome]                                    │
│                                                              │
│  INVEST CRITERIA                                             │
│  I - Independent    N - Negotiable                           │
│  V - Valuable       E - Estimable                            │
│  S - Small          T - Testable                             │
│                                                              │
│  OUTPUT LOCATIONS                                            │
│  PBIs:    team-artifacts/pbis/                               │
│  Stories: team-artifacts/pbis/stories/                       │
│                                                              │
│  NAMING: {YYMMDD}-ba-{type}-{slug}.md                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Related Documentation

- [Team Collaboration Guide](../team-collaboration-guide.md) - Full system overview
- [Product Owner Guide](./product-owner-guide.md) - Idea handoff details
- [QA Engineer Guide](./qa-engineer-guide.md) - Test handoff details

---

*Last updated: 2026-01-19*
