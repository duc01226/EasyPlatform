# Product Roadmap Template

Use this structure for the roadmap document — default `docs/product-roadmap.md`, overridden by a `docsRoots.productRoadmap.path` entry in `docs/project-config.json`. Keep milestones outcome-based and keep implementation details out. Replace `{plans-root}` below with the resolved plans root before writing: a `docsRoots.plans.path` entry in `docs/project-config.json` wins, `.ck.json` `paths.plans` is the fallback when project-config declares nothing, and `plans` is the last-resort default.

```markdown
---
title: {product or capability}
status: draft | approved | superseded
owner: {person or role}
updated: {YYYY-MM-DD}
selected_milestone: M0
---

# {Product} Roadmap

## Product Outcome
{User/business outcome and the hypothesis this roadmap will validate.}

## Actors and Boundary
{Primary user, owner/operator, other actors, and explicit product boundary.}

## Business Truth
- Source-of-truth state: {state that determines correctness}
- Critical terms: {definitions for ambiguous lifecycle words}
- Persistence expectation: {what must remain correct after refresh/reopen/redeploy}

## Milestones

| ID | Milestone / outcome | Risk retired | Non-goals now | Human decisions | Evidence gate | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| M0 | {user can...} | {uncertainty reduced} | {not included} | {owner decisions} | {observable proof} | — |

## Open Decisions
| ID | Decision | Options | Recommended | Owner | Status |
| --- | --- | --- | --- | --- | --- |

## Selected Milestone
- ID: M0
- Scope brief: {plans-root}/{plan-id}/scope-brief.md
- Approval: required | approved
- Approved on/by: {date and role}
```
Do not add dates, delivery commitments, framework names, database tables, endpoint lists, or screen inventories to this artifact.
