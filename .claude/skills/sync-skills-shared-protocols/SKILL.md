---
name: sync-skills-shared-protocols
version: 1.0.1
description: '[Skill Management] Use when shared protocol checklists change and need propagating across skills.'
disable-model-invocation: true
---

## Quick Summary

**Goal:** Propagate canonical protocol updates or new tiered blocks to their declared carriers and published projection, with verified parity.

**Summary:** A: select tags → read canonical → inspect updater dry-run inventory → propagate → rebuild/check projection and carriers → sync reminders only when requested. B: author canonical → update tiers/connections → dry-run → insert → rebuild/check coverage and parity. Preserve guide entrypoints, full-text carriers and dispatch overrides.

**Canonical source:** `.claude/skills/shared/sync-inline-versions.md`

**Key Rules:** Edit the canonical source first; change only SYNC block bodies; sync a `:reminder` block the same mechanical way — by passing the `{tag}:reminder` tag to the script — and only when asked; use the script for bulk insertion; verify balance, parity, and the computed target inventory.

**Workflow:** Choose Operation A or B → follow its canonical-source and target-inventory steps → verify before reporting.

## Contents

- [Quick Summary](#quick-summary)
- [Workflow](#workflow)
- [Usage Examples](#usage-examples)
- [Rules](#rules)
- [Closing Reminders](#closing-reminders)

## Workflow

### Operation A: Update Existing Block Content

Use when a SYNC: block already exists in files and push updated content to all of them.

### Step 1: Identify What Changed

If user specifies a tag name (e.g., `sync-skills-shared-protocols understand-code-first`):

- Sync only that tag

If no tag specified:

- Read `sync-inline-versions.md`
- Ask user which tag(s) to sync, or "all"

### Step 2: Read Canonical Content

For each tag to sync:

1. Read `.claude/skills/shared/sync-inline-versions.md`
2. Extract content under `## SYNC:{tag-name}` heading (everything between that heading and the next `---` or `## SYNC:`)

### Step 3: Inspect the Updater's Carrier Inventory

```bash
# macOS/Linux; on Windows use py -3 instead of python3
python3 .claude/scripts/sync-update-blocks.py "{tag-name}" --dry-run
```

The updater discovers skill entrypoints, skill templates, mode references and agents. Inspect its dry-run results before writing; searching only `*/SKILL.md` misses full-text carriers. The helper uses Python 3 and framework-local modules, with no third-party package requirement. Probe it with `--help` when runtime availability is uncertain.

### Step 4: Propagate with the Owning Helper

```bash
# macOS/Linux; on Windows use py -3 instead of python3
python3 .claude/scripts/sync-update-blocks.py "{tag-name}"
node .claude/scripts/build-protocol-projection.cjs
```

Require successful exit status; report malformed/missing fences rather than hand-replacing a failed carrier. Keep generated guide entrypoints as guides. A plain tag does not modify its separate `:reminder` fence pair; pass `{tag}:reminder` only when reminders are requested. Preserve the OVERRIDE handling below.

### Step 5: Verify

Run these checks after propagation and projection rebuild:

```bash
node .claude/scripts/codex/verify-sync-adoption-parity.mjs
rg -n "SYNC:{tag-name}" .claude
```

Verify balanced fences, exact canonical bodies and unchanged unrelated authored content. Inspect the search for carriers outside the updater's inventory, including framework docs, and reconcile them through their owner. Verify every requested tag and applicable tier; a command success alone is not full coverage. Projection tooling uses Node >=18 built-ins.

Report:

- Tags synced
- Files updated (count)
- Any balance issues

### Step 6: Reminder Blocks

`:reminder` blocks (`<!-- SYNC:{tag}:reminder -->`) are 1-line summaries at the bottom of skills for AI recency attention (Primacy-Recency).

**Where a canonical `:reminder` section exists, they ARE mechanically syncable — do NOT hand-edit those.** `sync-update-blocks.py` treats `{tag}:reminder` as an ordinary tag: it reads the `## SYNC:{tag}:reminder` section from the canonical source and replaces the matching fence pair (`sync-update-blocks.py:11-14,25-35`). Hand-writing such a reminder desynchronizes it from the canonical text the very next time the script runs.

> **Coverage is PARTIAL — check before you rely on the script.** The canonical source does NOT yet carry a `:reminder` section for every reminder tag in use: roughly half the live reminder tags have no canonical section, and running the script on one of those fails hard with `ERROR: section not found` (`sync-update-blocks.py:33`) rather than doing nothing. Confirm the section exists first:
>
> ```bash
> grep -n "^## SYNC:{tag}:reminder" .claude/skills/shared/<canonical-source>.md
> ```
>
> **Section present** → sync it with the script; never hand-edit. **Section absent** → the script cannot serve you at all. Add the canonical `## SYNC:{tag}:reminder` section first and then sync, so the reminder becomes managed like the rest. Do not silently hand-edit the fenced body as a workaround: that leaves a fenced block the script believes it owns and will overwrite the moment the section appears.

What is true is that a reminder is a SEPARATE tag from its parent, not a shorter view of it: syncing `foo` never touches `foo:reminder`, because the script's fence regexes require whitespace before the closing marker and so cannot cross between the two (`sync-update-blocks.py:64-66`). Update a reminder by running the script on `{tag}:reminder` explicitly, after editing that section in the canonical source — and only when the user asks for reminders too.

```bash
# Windows (dry-run first, then the real run)
py -3 .claude/scripts/sync-update-blocks.py --dry-run {tag}:reminder
py -3 .claude/scripts/sync-update-blocks.py {tag}:reminder
# macOS/Linux (dry-run first, then the real run)
python3 .claude/scripts/sync-update-blocks.py --dry-run {tag}:reminder
python3 .claude/scripts/sync-update-blocks.py {tag}:reminder
```

### Step 7: OVERRIDE Blocks — the sanctioned divergence

Not every carrier can take the canonical body verbatim. A review skill that must route its
sub-agents to a DIFFERENT specialist needs the same protocol substance with a different
`subagent_type`. That is what `<!-- OVERRIDE:{tag} -->` … `<!-- /OVERRIDE:{tag} -->` is for.

**The contract:**

- **`sync-update-blocks.py` does NOT touch an OVERRIDE block.** It is an intentional per-skill
  divergence, so the equality property that binds `SYNC:` carriers is deliberately not applied.
- **Divergence is limited to ROUTING, not substance — for `review-protocol-injection`.** The
  `sync-carrier-parity` suite's OVERRIDE-SUBSTANCE GUARD pins each `OVERRIDE:review-protocol-injection`
  copy to the canonical protocol COUNT and to each protocol's header AND body verbatim; only the
  Subagent-Type / Agent-Call / Reference-Docs sections may differ. Silent staleness on substance is
  the failure mode it exists to catch.
- **The carrier set is pinned — for that tag only.** The guard asserts exactly 2
  `OVERRIDE:review-protocol-injection` carriers (`sync-carrier-parity.test.cjs:440-446`), so a new
  one appearing — or an existing one vanishing — fails the suite rather than passing quietly.
- **Both markers are recognized as fences.** `check-subagent-routing.cjs` treats `SYNC` and
  `OVERRIDE` openers/closers identically for balance checking.

**Live carriers (2 files × 1 tag):** `architecture/references/mode-review.md` and `ui-design/references/mode-review.md` each override
`review-protocol-injection`.

**Maintaining one:** edit the canonical section, run the script for the `SYNC:` carriers, then
**hand-merge** the same substance change into each OVERRIDE block, preserving its
`subagent_type` customization. The guard detects a missed `review-protocol-injection` carrier.

**Do NOT reach for OVERRIDE to avoid a sync conflict.** It is for a carrier that genuinely must
dispatch elsewhere. Any other divergence belongs in the canonical source, so every carrier gets it.

---

### Operation B: Add a New Tiered Block

Use when a NEW SYNC: block needs tiered propagation. Derive the on-disk target inventory at runtime; never copy a fixed skill or agent count into this contract.

- `SKILL_BLOCK_ORDER` is the base tier for every skill (empty: the universal protocols are never inserted).
- `ORCHESTRATOR_SKILL_BLOCK_ORDER` extends that base only for skills in `ORCHESTRATOR_SKILLS`.
- Agent tiers remain independently governed by the injector's explicit agent sets.

#### Agent quality parity and skill connections

When the new block applies to work performed by a sub-agent, update the canonical agent matrix before injection:

1. Add the applicable quality tag(s) to `AGENT_QUALITY_BLOCKS` in `.claude/scripts/agent_protocol_matrix.py`; keep orchestration-only blocks out of leaf agents.
2. Confirm every agent has a valid `AGENT_SKILL_CONNECTIONS` entry to its canonical task skill(s), and add the carrier owner for any newly propagated review/test protocol.
3. Run `py -3 .claude/scripts/agent_protocol_matrix.py --validate` (macOS/Linux: `python3` instead of `py -3`), then run both `inject_agent_protocol_blocks.py` and `inject_agent_skill_connections.py` (dry-run first, real run second).
4. Verify the generated `AGENT-SKILL-CONNECTIONS` sections and the agent-universal-rules suite before regenerating mirrors.

The connection map is explicit routing metadata. It links the agent prompt to the canonical skill procedure while the matrix injects only applicable quality blocks; do not blanket-copy skill bodies into a leaf agent when that would import caller-owned orchestration.

This is a bulk-insert operation, not a content update. Verify the computed target set before writing so orchestration-only rules never leak into every skill.

**When to use:** A new protocol rule is added to `.claude/skills/shared/sync-inline-versions.md` and needs declared skill/agent carriers and hook projection. Roots carry project information only; universal protocols remain hook-only.

#### Step B1: Add block content to canonical source

Edit `.claude/skills/shared/sync-inline-versions.md` and add a new section:

```markdown
## SYNC:{new-block-name}

> **[Rule content here]**

---
```

#### Step B2: Add block to `sync-hooks-to-skills.py`

The script reads every body and reminder it inserts from the canonical file at import time, so no block text is typed here. Edit `.claude/scripts/sync-hooks-to-skills.py`:

1. Add the tag to `BODY_TAGS` (and to `REMINDER_TAGS` when canonical defines `## SYNC:{new-block-name}:reminder`).
2. Add the tag to the relevant tier list(s) (controls which targets receive it and the insertion order):

```python
# Skills and orchestrators currently carry no default inserted blocks.
SKILL_BLOCK_ORDER = []
ORCHESTRATOR_SKILL_BLOCK_ORDER = []

# Core-2: every agent (skills/SKILL.md is unaffected).
CORE_BLOCK_ORDER = ["sequential-thinking-protocol", "agent-bootstrap"]

# Code-6: Core-2 + code-investigation blocks, for agents that read/review AND fix code.
CODE_BLOCK_ORDER = CORE_BLOCK_ORDER + ["understand-code-first", "evidence-based-reasoning",
                                       "cross-service-check", "fix-layer-accountability"]

# Readonly-Code-4: Core-2 + reading-discipline blocks only, for read-only/design
# agents that locate/read/design code but never fix a layer or cross a service
# boundary (excludes the two mutation-oriented blocks).
READONLY_CODE_BLOCK_ORDER = CORE_BLOCK_ORDER + ["understand-code-first", "evidence-based-reasoning"]
```

**Universal protocols are not tier blocks.** The protocols of the `universal` group in `.claude/skills/shared/protocol-groups.json` are delivered by the universal hook, in the authored `bins` layout of that group; no skill (including any explicitly approved `inlineSkills` exception) and no agent carries a body, `:reminder` or guide line of one. `py -3 .claude/scripts/sync-update-blocks.py --mode=strip-root-pointer` removes any that reappear, together with a retired `Root-carried protocols` pointer line (agents also drop `task-tracking-external-report`, which `agent-bootstrap` states); `sync-hooks-to-skills.py` runs the same step on every target and never inserts a universal block. Never add a universal tag to a tier list, `BODY_TAGS` or `AGENT_QUALITY_BLOCKS`; `agent_protocol_matrix.py --validate` check (j) and TC-UAR-011 fail on it.

**Agent tiering:** agents no longer share one block list. `find_target_files()` classifies each `.claude/agents/*.md` by explicit membership in one of three sets:

- `CODE_AGENTS` (code/review/fix agents → `CODE_BLOCK_ORDER`, Code-6).
- `READONLY_CODE_AGENTS` (2 read-only/design agents — `researcher`, `ui-ux-designer` → `READONLY_CODE_BLOCK_ORDER`, Core-2 + understand-code-first + evidence-based-reasoning; the mutation-oriented `cross-service-check` + `fix-layer-accountability` are deliberately excluded to save tokens on agents that only locate/read/design code).
- `CORE_ONLY_AGENTS` (non-code agents → `CORE_BLOCK_ORDER`, Core-2).

An agent in **none of the three sets (or in more than one)** raises `SystemExit` — no silent default; classify it before the script will run. Skills use `SKILL_BLOCK_ORDER` (`ORCHESTRATOR_SKILL_BLOCK_ORDER` for `ORCHESTRATOR_SKILLS`). Pass `--agents-only` to scope a run to agents (skip skills).

> **Adding a new agent:** add its basename to exactly one of `CODE_AGENTS` / `READONLY_CODE_AGENTS` / `CORE_ONLY_AGENTS` in `sync-hooks-to-skills.py` **and** in the regression suite `.claude/hooks/tests/suites/agent-universal-rules.test.cjs` (TC-UAR-005 fails until both agree). The two enforce one invariant.
>
> **Note — the inserter is insert-only.** Moving an agent from CODE to READONLY_CODE (or otherwise dropping a block from its tier) does NOT remove the now-excess SYNC block from its `.md` on disk — `process_file` only inserts missing blocks. Strip the excess block(s) from the agent `.md` source by hand (or a scoped one-off) so the regression suite's tier assertions pass.

**Skill-only blocks (orchestration).** A block in `SKILL_BLOCK_ORDER` but in NO agent tier reaches every skill and zero agents. TC-UAR-017 treats that shape as drift by default — a protocol that reached ≥3 skills but no agent is usually an oversight — so declare a genuinely skill-only block in BOTH lists:

- `.claude/hooks/tests/suites/agent-universal-rules.test.cjs` → `AGENT_ADOPTION_EXEMPT` — the ONLY list TC-UAR-017 reads. Omit the block here and the suite fails.
- `.claude/scripts/agent_protocol_matrix.py` → `EXCLUDED_ORCHESTRATION` — read only by that file's own `--validate` check (b) (`agent_protocol_matrix.py:481`), which rejects a per-agent manifest that assigns an excluded block without an `ORCHESTRATION_WHITELIST` entry. Omit it here and no test fails; the manifest is simply free to assign the block to an agent.

> **No cross-check exists.** The two lists are enforced by two SEPARATE mechanisms and nothing verifies they agree — TC-UAR-017 never reads `EXCLUDED_ORCHESTRATION` (it appears in that test file only in a comment and a failure-message string). Keeping them in step is a **convention**, not an enforced invariant: update both by hand in the same change.

The bar for that exemption is caller-side ownership: the block must drive orchestration the leaf either **cannot perform** (it has no access to the parent conversation, workflow state, or the user) or **has no basis to perform** (the decision was already made upstream before its brief was issued). Examples — `subagent-return-contract`, `sub-agent-selection`, `parallel-phase-advancement`, `goal-contract-satisfaction-loop` — govern caller-side briefing, routing, workflow barriers or user-facing convergence. An agent that legitimately fans out carries its scope in its own definition.

#### Step B3: Run the script (dry-run first)

```bash
python .claude/scripts/sync-hooks-to-skills.py --dry-run --verbose
# Verify: expected N updated, 0 errors

python .claude/scripts/sync-hooks-to-skills.py --verbose
# Verify: the computed on-disk tier inventory was processed; already-current targets skip
```

#### Step B4: Verify

```bash
# Confirm target files now contain the new block. Expected count is TIER-AWARE.
# The skill tier and the agent tiers are INDEPENDENT lists — a block reaches
# agents only if it is ALSO in an agent tier, so union the rows that apply:
#   - block in SKILL_BLOCK_ORDER ONLY     → every discovered skill, 0 agents
#                                           (skill-only ⇒ must be declared in BOTH
#                                            exemption lists — see "Skill-only blocks")
#   - block in SKILL_BLOCK_ORDER + CORE   → every discovered skill + every discovered agent
#   - block in CORE_BLOCK_ORDER           → every discovered agent (skills excluded)
#   - block in READONLY_CODE_BLOCK_ORDER  → every code and readonly-code agent
#   - block in CODE_BLOCK_ORDER           → every code agent only
grep -rl "SYNC:new-block-name" .claude/skills/*/SKILL.md .claude/agents/*.md | wc -l

# Then run the agent-coverage regression suite — it asserts tier membership,
# disjointness, and SYNC tag balance across the discovered agent inventory.
node .claude/hooks/tests/run-all-tests.cjs --filter=agent-universal
```

Check a representative file of each affected tier manually to confirm placement and formatting.

Rebuild the published projection with `node .claude/scripts/build-protocol-projection.cjs`, run `node .claude/scripts/codex/verify-sync-adoption-parity.mjs`, and search `.claude` for out-of-inventory carriers before reporting completion.

---

## Usage Examples

```
/sync-skills-shared-protocols understand-code-first     # Sync one tag (Operation A)
/sync-skills-shared-protocols all                        # Sync all tags (Operation A)
/sync-skills-shared-protocols                            # Interactive — asks which tags
# Adding new block: use Operation B workflow above (script-driven)
```

## Rules

- ALWAYS edit `sync-inline-versions.md` FIRST, then run this skill
- For Operation A, preserve unrelated authored content outside the selected SYNC fences; rebuild generated projections through their owner. Operation B inserts only the declared tier blocks and connection metadata.
- NEVER touch `:reminder` blocks unless explicitly asked — and when asked, sync them WITH THE SCRIPT on the `{tag}:reminder` tag; never hand-write one
- If close tag is missing in a target file, SKIP that file and report it as an error
- Use the `Grep` tool (not shell grep) per project conventions
- Verify tag balance after every sync run
- For bulk-insert (Operation B): use `sync-hooks-to-skills.py` — NEVER do it manually across 288 files

---

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `shared-protocol-duplication-policy` — Protocol copies in carriers are intentional: edit the canonical source, then propagate; editing a shared protocol or its carriers → .claude/skills/shared/protocols/shared-protocol-duplication-policy.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:shared-protocol-duplication-policy:reminder -->

**IMPORTANT** Edit the canonical protocol, propagate skills and agents, then rebuild projections. Keep guides, inline exceptions and role reminders; universal protocols remain hook-only.

<!-- /SYNC:shared-protocol-duplication-policy:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Propagate canonical protocol updates or new tiered blocks to their declared carriers and published projection, with verified parity.

**IMPORTANT MUST ATTENTION Workflow:** A: select tags → read canonical → inspect updater dry-run inventory → propagate → rebuild/check projection and all carriers → sync reminders only when requested. B: author canonical → update tiers/connections → dry-run → insert → rebuild/check coverage/parity → report. Preserve guides, full-text carriers, overrides and unrelated authored content.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Shared Protocol Duplication:** follow the hybrid duplication policy (`SYNC:shared-protocol-duplication-policy`) — skills keep guide lines, agents and mode-reference SYNC carriers keep full bodies, and every fresh reviewer prompt keeps all 11 bodies VERBATIM, and only the sync tool converts or propagates them.

**IMPORTANT MUST ATTENTION** edit `sync-inline-versions.md` FIRST before syncing to skills
**IMPORTANT MUST ATTENTION** verify SYNC tag balance after every sync run
**IMPORTANT MUST ATTENTION** preserve unrelated authored content; projections are regenerated by their owner
**IMPORTANT MUST ATTENTION** skip files with missing close tags and report as errors

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
