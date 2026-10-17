# `$work-item --mode=review` — `--type=task` checklist and output template

Loaded by `references/mode-review.md` when the resolved type is `task`. Scoring, verdict rule, M1-M7 gate and the validated-fix loop stay in `references/mode-review.md`; the M1-M7 criteria live in `.claude/skills/shared/m1-m7-gates.md`.

## Checklist — Task Review

> **Fresh context.** Review the task from a context that did not draft it. When this session drafted or edited the task (for example, a workflow that just ran `--mode=refine`), run the review as a fresh sub-agent built as in `references/mode-review.md` → Validated Fix + Full Re-Review steps 1-5, with the Task set to a first full review of the task. Record the reviewer context in the report header. Rows 10-12 hold the module, feasibility and cross-cutting checks; a later `--mode=challenge` in the same run starts from them.

| #   | Check                                                                                                      | Presence                                                  | Quality Depth                                                                                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Releasable outcome and full flow are defined** — the task is an independently releasable actor-facing outcome, not a technical layer | Is the actor, outcome, complete journey, and gate evidence present? For UI, are pages/views, navigation, components, states, and demo journey present? | Can a stakeholder recognize the value from entry through result and exit? Are persistence, access, failure, recovery, and visible truth covered where applicable? Does the scope hide foundation/setup/migration work as the outcome? A UI task represented by one isolated screen FAILS. |
| 2   | **Problem statement is clear** — the problem being solved is described in concrete terms                   | Is a problem statement present? Is it 2+ sentences?       | Is the problem scoped correctly? Could it be framed differently to lead to a different (simpler) solution? Are symptoms confused with root cause?                                              |
| 3   | **Acceptance criteria are testable and measurable** — each AC can be verified by a test                    | Are ACs present? Do they use measurable language?         | Can a QA engineer write an automated test for EACH AC without clarification? Are they specific enough to catch regressions? Vague ACs ("feature works correctly") are not acceptance criteria. |
| 4   | **Scope is well-defined (what's in and out)** — both in-scope and out-of-scope items are explicitly listed | Is an in/out scope list present? Does it have both sides? | Are out-of-scope items specific enough to prevent scope creep? Is anything ambiguously in/out? A scope that says nothing is out of scope is an undefined scope.                                |
| 5   | **Dependencies are identified** — all external dependencies the task relies on are listed                   | Is a dependencies section present? Does it list items?    | Are ALL dependencies listed (technical, data, service, team)? Are "can-parallel" items truly safe to parallelize, or do they share a shared resource?                                          |
| 6   | **Business value is articulated** — the why behind the task is stated in terms of user or business outcome  | Is business value described?                              | Is the value quantified or just stated? Does it connect to a user outcome, not just a feature delivery? "Users can now do X" is better than "we implemented feature Y".                        |
| 7   | **Priority is assigned** — the task has an explicit priority level                                          | Is a priority level assigned?                             | Is priority justified with data (RICE/MoSCoW), or arbitrary? Is it consistent with other tasks in the same delivery wave? A task that is "high priority" without justification is unranked.             |
| 8   | **Acceptance-criteria set is complete** — the ACs together cover the whole releasable outcome, not only the happy path | Is there an AC for every in-scope behavior, including the negative/failure, empty, permission-denied, and recovery paths the scope implies? | Could the task be marked done with every AC passing while a stated in-scope behavior is still missing? An AC set that admits that gap is incomplete — FAIL. Are ACs in GIVEN/WHEN/THEN (or equivalently structured) form so each is independently decidable? |
| 9   | **PO sign-off readiness** — a product owner could render a per-AC PASS/FAIL verdict from this artifact alone | Does each AC name the observable evidence that would settle it (test result, visible state, demo step)? Is the design approved where applicable, and are dependencies resolved or explicitly deferred? | Would two reviewers reach the SAME verdict on every AC? An AC whose verdict depends on the reviewer's taste or on unstated context is not sign-off-ready. Every AC must be decidable PASS or FAIL with named evidence — a criterion that can only be judged "looks fine" FAILS this check. |
| 10  | **Module confirmed** — the module that owns the behavior is identified before domain context is judged | Does the task name its module (`module` frontmatter, set by `--mode=refine` Phase 1)? Cite it. | Do that module's business spec subtree and entity definitions actually own the entities and rules the ACs touch? A wrong module means rows 11-12 were judged against the wrong context — FAIL. |
| 11  | **Technically feasible against entities and service ownership** | Are the entities, rules and services the task touches named, with evidence from `domain-entities-reference.md` and the module's feature docs? | Does the outcome fit the project architecture with no entity conflict? For each cross-service implication (events, shared data, another owner's data), is the owning service named and the contract risk (none / additive / breaking) stated? Does the estimate fit the complexity found? |
| 12  | **Cross-cutting concerns addressed** — authorization, seed data, data migration, performance, UI layout | Is each concern answered or marked `N/A` with a reason: authorization as a roles × operations matrix, seed data, migration for schema changes, performance for list/grid/export features, `## UI Layout` for UI tasks? | Would a planner first find a missing permission, seed record, migration step, volume limit or view during implementation? Each such gap is a finding. A backend-only `N/A` needs an observable no-UI reason. |

## Output template

```markdown
## Task Review Result

**Status:** PASS | WARN | FAIL
**Artifact:** {task-path}
**Artifact identity:** {task path} · sha256:{hex digest of the file bytes}
**Reviewer context:** fresh sub-agent | {why the review ran in the drafting context}

### Required ({X}/{Y})

- ✅/❌ Check description

### Recommended ({X}/{Y})

- ✅/⚠️ Check description

### Issues Found

- ❌ FAIL: {issue}
- ⚠️ WARN: {issue}

### Releasable Outcome Evidence

- **Actor and outcome:** { ... }
- **Full-flow journey:** {entry → action → result → exit}
- **Technical-only work:** {attached enabling subtasks | none}
- **UI surface:** {page/view inventory + navigation + components + states + demo journey | N/A — backend-only with reason}
- **Gate:** PASS | BLOCKED

### Module, Feasibility and Cross-Cutting (rows 10-12)

- **Module:** {module} — {evidence}
- **Feasibility:** FEASIBLE | CONCERNS | INFEASIBLE — {entities, owning services, contract risk}
- **Cross-cutting:** authorization ✅/❌ · seed data ✅/❌/N/A · migration ✅/❌/N/A · performance ✅/❌/N/A · UI layout ✅/❌/N/A

### Verdict

{PROCEED | REVISE_FIRST}
```
