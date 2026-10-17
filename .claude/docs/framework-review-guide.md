# Reviewing the framework against vendor guidance

> Read before reviewing, auditing or scoring this framework's skills, hooks or root instructions against Anthropic, OpenAI or Agent Skills guidance. It states how to measure, which designs are intended and which limits are known and already decided, so a review spends its effort on new findings and reports no false ones.

## Contents

- [Measure what a session loads](#measure-what-a-session-loads)
- [Designs that are intended](#designs-that-are-intended)
- [Known limits](#known-limits)
- [What a finding states](#what-a-finding-states)
- [Sources to re-read](#sources-to-re-read)

## Measure what a session loads

1. **Who can start a skill** is the resolved skill profile, never the `SKILL.md` flag alone. `skillProfile` in the project config decides it for every host: `skillOverrides` in `.claude/settings.json`, `agents/openai.yaml` in the Codex mirror and the OpenCode permission map are all generated from it. Run `node .claude/scripts/sync-skill-profile.cjs --check`, then compare hosts by their resolved sets.
2. **The skill listing** holds only descriptions the model sees. Leave out skills with `disable-model-invocation: true` and skills the profile hides before comparing a total with a host's listing budget, and state the context size assumed.
3. **The cost of a skill** is what one run loads: the entry file, every reference it requires in full, and the protocol text hooks deliver when it activates. Entry-file size alone understates it. Moving text into a reference that is still read in full changes a line count and saves nothing; count a saving only when loading became conditional.
4. **Vendor size figures are recommendations.** "Under 500 lines" and "under 5,000 tokens" are advice for best performance. Report them as advice beside the measured load, never as pass or fail. A size divided by four is an estimate: say so, and treat a value near a threshold as undecided. The authoring rule here is the same: size is a triage signal, not proof of quality.
5. **Contents lists.** The rule covers the files of a skill: its `SKILL.md` and the Markdown it bundles, when over 100 lines. It does not cover vendored `node_modules` documents, the shared contracts and protocol bodies under `.claude/skills/shared/` (protocol bodies are delivered verbatim, so a list would be delivered too), or the catalog's own README files. Look for the list anywhere in the first 100 lines (in `SKILL.md` it follows Quick Summary). `node .claude/skills/skill-creator/scripts/validate-skills.cjs` reports a missing or stale list, and `node --test .claude/scripts/tests/skill-contents.test.cjs` runs it over the shipped catalog.
6. **Shared protocol blocks.** A `SYNC` block has an opening and a closing marker, so blocks number half the markers. A block tagged `:reminder` is a short digest; each protocol body lives once under `.claude/skills/shared/protocols/`.
7. **Hook text.** Measure the first prompt, a later prompt and a subagent start separately: delivery records suppress repeats until the context is lost or has grown by the configured distance. Name the active `contextDelivery.profile`.
8. **Fix plans.** Recompute the scoreboard with every proposed fix applied. A plan that promises most failures gone shows it in the numbers.
9. **External claims.** Re-read the vendor page for every limit quoted, because budgets, timeouts and caps change between releases. Mark a claim `Unverified` when its page was not fetched.

## Designs that are intended

Each row is something a review has flagged as a defect. Challenge the reason if the evidence supports it; do not report the observation alone.

| What a review sees | Why it is intended | Owner |
| --- | --- | --- |
| `AskUserPrompt` in the Notification matcher, and Codex tool names such as `apply_patch`, `exec_command` and `update_plan` in Claude matchers | `.claude/settings.json` is the one hook source that every host projection is generated from. The OpenCode bridge emits `AskUserPrompt` for a question prompt, and the Codex names match Codex tools. A name a host never emits is inert on that host. | `.claude/docs/hooks/README.md` → Matcher vocabulary and limits |
| Most hooks declare no `timeout` in settings | Hooks bound themselves: the shared runner stops an async hook after 15 seconds and the formatter stops its child process after 10. Settings declare a `timeout` for two purposes only: a short cap (3 or 10 seconds) on advisory reminder and observer hooks, and the 3-second allowance at session end, where a host gives a hook without its own limit less time than cleanup may need. | `.claude/hooks/lib/hook-runner.cjs`; `.claude/docs/hooks/README.md` → Matcher vocabulary and limits |
| Rules arrive through hooks rather than the root instruction file | One delivery path serves the three hosts and their subagents where the host runs hooks for them (OpenCode child-session delivery is unverified), refreshes after compaction, and keeps the project-owned root file free of framework text. The cost is measured: the `concise` profile reduces it and stays opt-in until its adoption evidence exists. | `.claude/docs/hooks/README.md` → Protocol Delivery; `.claude/docs/configuration/README.md` |
| Codex shortens a hook message above its per-message allowance | The generator raises the allowance for protocol hooks so a full message is delivered whole. | `PROTOCOL_CONTEXT_LIMIT` in `.claude/scripts/codex/sync-hooks.mjs` |
| `:reminder` blocks repeated across skills, and closing reminder sections | Critical rules sit at the start and at the end of long instructions. After compaction a host keeps the start of each skill, so the opening copy survives. | `SYNC:shared-protocol-duplication-policy` in `.claude/skills/shared/sync-inline-versions.md` |
| Top-level `version`, `execution-mode`, `context-budget` or `triggers` in frontmatter | Framework convention fields. The hosts this framework targets ignore unknown keys. The skill validator accepts them where a project declares them in `skillConventions.conventionFields` and reports `Unknown field` where it does not; that count measures the project's declaration, never a host failure. A host with a strict upload schema needs them under `metadata`. | `.claude/skills/skill-creator/references/schema-reference.md` |
| A workflow skill, or another command-only skill, whose description states an outcome with no "Use when" | A workflow's trigger has one owner, `whenToUse` in `.claude/workflows.json`, delivered through the workflow catalog. A skill hidden from the model never enters its listing, so its description serves the command menu. Skills the model does see state when to use them. | `.claude/workflows.json`; the skill profile |
| A host re-attaches only the start of each invoked skill after compaction | The delivered rules tell the agent to restore its saved state and re-read the instructions and files it works from before continuing, and the universal rules are delivered again on the compaction event. Critical rules also open each skill. | `.claude/skills/shared/protocols/task-planning-rules.md`; `.claude/hooks/lib/universal-delivery.cjs` |
| The skill listing budget is left at the host default, although the descriptions the model sees can exceed it on a small context window | Deliberate, and guarded by a test: the bundle sets no `skillListingBudgetFraction`, because a shared override adds always-on context even when the framework's hooks are switched to quiet. The host degrades gracefully: every name stays listed and the least used descriptions are dropped first. A project that needs more lists fewer descriptions through `nameOnly` in its skill profile, and a person may raise the budget in personal settings. Do not recommend raising it in the shared settings. | `.claude/docs/configuration/README.md` → Framework runtime mode; `.claude/scripts/codex/tests/compaction-default.test.mjs` |
| Context hooks exit 0 on their own errors while the commit gate blocks | An advisory hook never stops work. A gate that cannot establish safety refuses. | `.claude/hooks/lib/hook-runner.cjs`; `.claude/hooks/review-commit-gate.cjs` |

## Known limits

These are accurate, already recorded and already decided. A review does not report them as findings. It reports a new measurement, or evidence that a stated reason no longer holds.

| Limit | Why it stands | What reopens it |
| --- | --- | --- |
| **Entry files above the recommended size.** Several skills exceed the recommended lines or tokens. | The size is content, not repetition: outside the designed reminder blocks the large entry files repeat almost no line verbatim, so nothing can be removed mechanically. Shrinking one means moving rules into references loaded by the route the skill detects, with every rule mapped to its new place and the behaviour compared. Done by guesswork, it removes safeguards. The one measured split found little to move: in `why-review` only the code-change path (about 14% of the full-mode reference) belongs to a single route, so plan and document reviews load 7.5% less and a code-change review 2% more (`.claude/skills/why-review/references/code-change-path.md`). | For the skill in question, a measured share of text that one route alone needs, large enough to pay for the extra read, together with paired evaluation cases for that skill. |
| **Evaluation coverage.** The corpus under `.claude/skills/shared/skill-evals/` covers a small part of the catalog, and no case has been run. | A case needs a frozen fixture, a rubric and an authorized model runner, and its routing expectation is the framework owner's to state. Coverage grows with change: a skill whose activation or behaviour changed gets its cases with that change, written from the boundary its description states. The rest of the catalog is uncovered knowingly. | An available runner, which turns the written cases into observed results. Until then a case is a stated expectation, not evidence, and a changed skill without a case is a recorded gap, not a new finding. |
| **Upper-case emphasis.** Many skills mark goals and rules with upper-case emphasis, which vendor prompting guidance says to dial back for current models. | No evaluation yet shows whether the current density helps or hurts, so neither keeping it nor removing it is evidenced. The authoring rule sets no keyword quota in either direction. | Paired evaluation cases comparing reworded text with the current text. |
| **Default hook text.** The `compatible` profile delivers the full rule set on the first prompt and to every subagent. | The `concise` profile is the measured reduction. It stays opt-in until paired behavioural runs and native-host proof exist, because a smaller rule set can drop a safeguard unnoticed. | A new measurement of either profile, or that adoption evidence. |
| **Imperative wording in delivered text.** Vendor guidance prefers factual statements in hook context. | The delivered text states rules an agent must follow, and the compatible text is kept stable so the two profiles can be compared. Wording changes are evaluated in the concise core. | Evidence that a host treats the delivered text as untrusted, or evaluation results for reworded text. |

## What a finding states

- The measurement and how it was taken.
- The vendor sentence it rests on, with its page.
- Whether the design is listed above as intended, and the evidence against the stated reason when it is.
- What the proposed fix changes in the measured load.

Keep three lists apart: defects, intended designs you would still change, and items a vendor words as optional.

## Sources to re-read

- Claude Code skills: <https://code.claude.com/docs/en/skills>
- Claude Code hooks: <https://code.claude.com/docs/en/hooks>
- Skill authoring best practices: <https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices>
- Agent Skills specification: <https://agentskills.io/specification>
- Codex skills: <https://developers.openai.com/codex/skills>
- Codex hooks: <https://developers.openai.com/codex/hooks>
