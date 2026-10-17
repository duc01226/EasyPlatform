# Scenario Analysis Template

Use this structure for `{plan-id}/scenario-analysis.md` under the plans root (default `plans/`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path). Keep scenarios tied to the owning slice, explicit milestone, framework scope, or isolated boundary and express expected behavior in business/operational language.

```markdown
# Scenario Analysis: {slice ID / milestone ID / technical scope} — {scope}

## Scope Inputs
- Applicability: EMBEDDED | EXPLICIT-ROADMAP | FRAMEWORK-LIBRARY | EXEMPT
- Owning artifact: {task/spec path and slice ID, or explicit scope owner}
- Roadmap: {the product-roadmap artifact, default docs/product-roadmap.md, relocated by docsRoots.productRoadmap.path in docs/project-config.json — explicit branch only | NOT APPLICABLE — embedded/framework/EXEMPT}
- Scope handoff: {{plan-id}/scope-brief.md under the plans root, default plans/, relocated by docsRoots.plans.path in docs/project-config.json | owning artifact reference | N/A with reason}
- Outcome: {actor can... | technical/operational proof...}

## Scenarios
| ID | Situation / trigger | Expected business outcome or invariant | Risk if wrong | Prevention / detection expectation | TC/evidence | Decision owner |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-M0-001 | {refresh, duplicate, edit conflict...} | {state remains correct} | High | {observable behavior} | TC-... | {role} |

## Open Decisions
| ID | Question | Options | Status |
| --- | --- | --- | --- |

## Scenario Gate
- High-impact scenarios have expected outcomes: PASS | BLOCKED
- Evidence/TC mapping complete: PASS | BLOCKED
- Material decisions confirmed: PASS | BLOCKED
- Secrets/personal data excluded from evidence: PASS | BLOCKED
```
