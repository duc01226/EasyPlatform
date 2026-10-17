## Workflow route cues

Honor explicit skill/workflow requests. Otherwise choose direct work, a suitable registered skill or a lean custom sequence by risk and unresolved decisions. Load the skill and safe additive overlays before execution through the current host.

| Task signals | Route / skills to consider |
| --- | --- |
| Question, lookup, trivial low-risk edit | Direct, or one matching skill |
| Read-only code audit with solution options | Custom-simple: `investigate` → compare options → rationale check → report |
| Focused implementation with clear intent | Custom-simple: `plan` when needed → `feature-implement`; retain test, review and spec/doc gates |
| Bug with unknown cause or wide reach | Inspect `workflow-bugfix` fit; a known cause in one module: `investigate --mode=debug` → `fix`; retain regression and review gates |
| Behavior already in a canonical spec | Inspect `workflow-implement-spec` fit |
| Behavior-preserving restructure across modules | Inspect `workflow-refactor` fit; a local tidy-up stays direct |
| Tasks from an idea, ticket, brief or spec, or a first spec from an idea, before any build | Inspect `workflow-planned-work` fit |
| New product from scratch | Inspect `workflow-greenfield-init` fit |
| Saved plan or rationale review | `plan --mode=review` or `why-review`, according to the request |
| Cross-module behavior/contract or material ambiguity | Inspect catalog fit before choosing a standard workflow |

Judge by observable behavior: it worked or met its spec and now fails → bug; it changes and is not yet specified → feature; specified but not yet built → implement-spec; it stays the same → refactor; planning only, nothing built (an idea, or specs to turn into tasks) → planned work; a new product → greenfield. Size alone never makes a task a workflow.

Resolve custom steps from the current host's registered skill descriptions; if unavailable, read `.claude/docs/skills/README.md`. Read the selected `SKILL.md` before calling it. Comparison and a brief self-check are reasoning steps, not invented skills; formal rationale audits use `why-review`. Declare `Route: custom-simple [steps] — because <scope/risk>` (or the selected skill/workflow/direct). Mid-session, keep optional chains to three skills; required quality gates do not count toward that cap.

- In ask mode, starting a self-selected catalog workflow on the first task requires one question: full workflow, slimmer gate-preserving route, or direct work. Direct, skill and custom routes ask no workflow question. Wait for the answer.
- In auto mode, ask the same question with the full workflow recommended first (never for a manual tier).
- In off mode, do not self-select a workflow. Named user requests and required steps/nested workflows of authorized operations still run.
- Mid-session, do not self-start or ask to start a catalog workflow; honor explicit requests and required nested workflows. A session mode directive re-arms the first-task rule as its state line says.
- Skill auto-trigger restrictions remain independent. A disabled switch permits named requests and required calls while suitable unrequested candidates follow its single skill-choice question.

Before choosing a workflow, run `node .claude/scripts/workflow-catalog.cjs --mode=<mode>` for the current compact catalog and tiers, then read `.claude/skills/shared/workflow-first-gate.md` for fit/authority exceptions. Resolve the complete selected sequence with `node .claude/scripts/codex/read-workflow-entry.mjs <workflow-id>` and load registered `start-workflow` before executing. Gates, occurrence identities and declared all-return barriers remain binding. Missing catalog/reader: report the gap and read the canonical registry, never invent a sequence.
