---
name: dual-ai
description: '[User-Invoked] Use ONLY when the user explicitly types /dual-ai or /dual-ai <workflow-id> — fans out one prompt, or one workflow invocation per tool, to two fresh parallel AI sessions (Claude Code + Codex CLI), both pre-set to xhigh reasoning effort and full-permission mode before the prompt executes. NEVER auto-activate.'
disable-model-invocation: true
---

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.

<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->

## Codex Project-Reference Loading (No Hooks)

Codex does not receive Claude hook-based doc injection.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

## Quick Summary

**Goal:** Take a user prompt, or a workflow id, and spawn TWO brand-new AI sessions in parallel — one Claude Code, one Codex — each launched with xhigh effort and full-permission mode already applied, then auto-submit the prompt in both.

**Workflow:**

1. **Capture** — persist USER_PROMPT to a run folder (avoids shell-quoting corruption)
2. **Generate launchers** — one launcher script per tool, OS-specific (`.ps1` on Windows, `.sh` on macOS/Linux), effort and full-permission mode set via launch flags
3. **Spawn** — open two new terminal windows via the OS spawner, one session per tool, prompt auto-submitted
4. **Report** — run folder path + how to find each window; `--orchestrate` (alias `--headless`) instead supervises both sessions via the bundled Node runner — waits for completion, watches statuses, collects both results, and presents a comparison

**Key Rules:**

- **MANUAL-ONLY:** This skill spawns external AI sessions that consume quota. Run it ONLY on explicit user invocation (`$dual-ai ...`). NEVER auto-activate it because a task "could benefit" from parallel AI
- Effort and full-permission mode MUST be set via launch flags (`claude --dangerously-skip-permissions --effort xhigh`, `codex --dangerously-bypass-approvals-and-sandbox -c model_reasoning_effort="xhigh"`) — flags apply BEFORE the prompt is processed; NEVER attempt to type `/model`, `/effort`, permission, approval, or sandbox commands into a running TUI
- The prompt is read from the per-tool prompt file (`prompt-claude.txt` / `prompt-codex.txt`) INSIDE the launcher script (`Get-Content -Raw` / `cat`) — NEVER inline-escape multi-line prompts through shell argument chains
- Detect the OS first (`uname -s`) and use the matching launcher + spawn branch; never assume Windows
- This skill ONLY orchestrates the two external sessions. Do NOT answer the prompt yourself in the current session
- Orchestrated mode (`--orchestrate`) is the ONLY way to get results back into this session — interactive TUI window output cannot be captured. The runner persists `status.json` + `events.ndjson` start-to-end as the external status report
- Verify both CLIs exist (`claude --version`, `codex --version`) before spawning; report which one is missing instead of half-launching

# Dual AI Session Fan-Out

## Purpose

Run the same task through two independent frontier agents at maximum reasoning effort and let the user compare results side by side. Each session is a NEW session (no shared context with the current one) so both agents reason from a clean slate in the repo working directory.

## Variables

- `USER_PROMPT`: $ARGUMENTS (required — if empty, ask the user for the prompt before doing anything)
- `WORKFLOW_ID`: optional first non-mode token. If it exactly matches a key in `.claude/workflows.json` `commandMapping`, treat it as a workflow invocation instead of free-text prompt. This preserves plain `$dual-ai` behavior: non-matching text remains the original fan-out prompt.
- `WORKFLOW_ARGS`: any remaining non-mode text after WORKFLOW_ID. Append it verbatim to BOTH per-tool workflow prompts as extra instructions.
- `CLAUDE_PROMPT` / `CODEX_PROMPT`: per-tool prompt values. Default: both = USER_PROMPT. Workflow-id mode sets `CLAUDE_PROMPT` to the `commandMapping[WORKFLOW_ID].claude` value and `CODEX_PROMPT` to `$WORKFLOW_ID`, then appends WORKFLOW_ARGS to both when present. Treat both prompt values as opaque literals — do not expand, rewrite, or "fix" `$`/`/` prefixes.
- `MODE`: `--orchestrate` (alias `--headless`) flag anywhere in $ARGUMENTS → non-interactive orchestrated run: both sessions supervised by the bundled runner, statuses watched, outputs collected and compared (strip the flag from USER_PROMPT)
- `RUN_DIR`: `.ai/workspace/dual-ai/{YYMMDD-HHmm}/` (absolute path when generating launchers)

## Workflow

### 1. Validate + detect OS

- Strip MODE flags from USER_PROMPT first.
- Resolve workflow-id mode before validation:
    - Read `.claude/workflows.json` and parse `commandMapping`.
    - If the first non-mode token exactly matches a `commandMapping` key, set WORKFLOW_ID to that token and remove it from USER_PROMPT.
    - Set `CLAUDE_PROMPT = commandMapping[WORKFLOW_ID].claude`.
    - Set `CODEX_PROMPT = "$" + WORKFLOW_ID`.
    - If remaining text exists, append one space plus that remaining text verbatim to both prompts.
    - Example: `$dual-ai workflow-review-changes --orchestrate` writes `$workflow-review-changes` for Claude and `$workflow-review-changes` for Codex, preserving the former review wrapper behavior.
- If USER_PROMPT is empty AND no per-tool prompts were derived from WORKFLOW_ID → ask the user, stop.
- Check tool availability: `claude --version` and `codex --version`. If either is missing, report it and offer to run the available one only.
- Detect OS in the same Bash call: `uname -s` → `MINGW*`/`MSYS*`/`CYGWIN*` = Windows, `Darwin` = macOS, `Linux` = Linux. Pick the matching launcher + spawn branch below.

### 2. Persist prompts

Write CLAUDE_PROMPT verbatim (no escaping, no reformatting, no expansion) to `{RUN_DIR}/prompt-claude.txt` and CODEX_PROMPT to `{RUN_DIR}/prompt-codex.txt` using the Write tool. When no per-tool override exists, both files contain USER_PROMPT.

### 3. Generate launchers (Write tool, absolute paths)

Both CLIs accept a positional prompt that starts the new interactive session with that prompt auto-submitted; the effort and full-permission flags take effect at session init — before prompt execution. Replace `<REPO_ROOT>` with the absolute repo root.

**Windows** — `{RUN_DIR}/launch-claude.ps1` / `{RUN_DIR}/launch-codex.ps1`:

```powershell
$ErrorActionPreference = 'Stop'
Set-Location '<REPO_ROOT>'
$prompt = Get-Content -Raw "$PSScriptRoot\prompt-claude.txt"
Add-Content "$PSScriptRoot\events.ndjson" ('{"at":"' + (Get-Date -Format o) + '","event":"session-start","agent":"claude"}')
claude --dangerously-skip-permissions --effort xhigh -n 'dual-ai-claude' $prompt
Add-Content "$PSScriptRoot\events.ndjson" ('{"at":"' + (Get-Date -Format o) + '","event":"session-end","agent":"claude","exitCode":' + $LASTEXITCODE + '}')
# codex variant: reads prompt-codex.txt, runs codex --dangerously-bypass-approvals-and-sandbox -c model_reasoning_effort="xhigh" $prompt, logs agent "codex"
```

**macOS / Linux** — `{RUN_DIR}/launch-claude.sh` / `{RUN_DIR}/launch-codex.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "<REPO_ROOT>"
here="$(cd "$(dirname "$0")" && pwd)"
prompt="$(cat "$here/prompt-claude.txt")"
echo "{\"at\":\"$(date -u +%FT%TZ)\",\"event\":\"session-start\",\"agent\":\"claude\"}" >> "$here/events.ndjson"
code=0
claude --dangerously-skip-permissions --effort xhigh -n 'dual-ai-claude' "$prompt" || code=$?
echo "{\"at\":\"$(date -u +%FT%TZ)\",\"event\":\"session-end\",\"agent\":\"claude\",\"exitCode\":$code}" >> "$here/events.ndjson"
# codex variant: reads prompt-codex.txt, runs codex --dangerously-bypass-approvals-and-sandbox -c model_reasoning_effort="xhigh" "$prompt", logs agent "codex"
exec "$SHELL"   # keep the terminal interactive after the session ends (reachable even on nonzero exit)
```

After writing `.sh` launchers run `chmod +x {RUN_DIR}/launch-*.sh`.

### 4. Spawn both sessions (single Bash call, per OS)

**Windows** (`<RUN_DIR_WIN>` = Windows-style absolute path):

```bash
pwsh -NoProfile -Command "Start-Process pwsh -ArgumentList '-NoExit','-ExecutionPolicy','Bypass','-File','<RUN_DIR_WIN>\launch-claude.ps1'; Start-Process pwsh -ArgumentList '-NoExit','-ExecutionPolicy','Bypass','-File','<RUN_DIR_WIN>\launch-codex.ps1'; Write-Output 'both spawned'"
```

- `-NoExit` keeps each window open as a live interactive session after the prompt completes.
- Prefer `pwsh` (PowerShell 7+, check `pwsh -v`) over `powershell` — Windows PowerShell 5.1 mangles embedded double quotes when passing args to native executables; fall back to `powershell` only if `pwsh` is absent.
- If a path-boundary or similar hook blocks `cmd //c start ...`, this `Start-Process` form is the workaround — it contains no slash-prefixed flags.

**macOS**:

```bash
open -a Terminal "{RUN_DIR}/launch-claude.sh" && open -a Terminal "{RUN_DIR}/launch-codex.sh" && echo "both spawned"
```

If the user runs iTerm2, `open -a iTerm <script>` works the same way. If macOS Gatekeeper/automation permission blocks Terminal from running the script, fall back to headless mode and tell the user.

**Linux**:

```bash
x-terminal-emulator -e "{RUN_DIR}/launch-claude.sh" & x-terminal-emulator -e "{RUN_DIR}/launch-codex.sh" & echo "both spawned"
```

(Substitute `gnome-terminal --`, `konsole -e`, or `xterm -e` if `x-terminal-emulator` is absent. No display server → fall back to headless mode.)

### 5. Orchestrated mode (`--orchestrate` / `--headless` only)

Skip steps 3–4 (no terminal windows). The bundled supervisor `scripts/dual-ai-runner.mjs` (relative to this skill's directory) runs both sessions as supervised child processes — main-agent → external-main-agents orchestration with start-to-end status reporting.

**a. Write `{RUN_DIR}/run-config.json`** (the runner pipes each prompt via stdin — quoting-proof; args hold fixed flags ONLY, never prompt content). The runner enforces exactly the supported `claude`/`codex` identities, at most 2 agents, fixed flag templates, `cwd` inside the project/run dir, and bounded output (`maxOutputBytes`, default 25 MiB):

```json
{
    "runId": "{YYMMDD-HHmm}",
    "cwd": "<REPO_ROOT>",
    "timeoutSec": 3600,
    "maxOutputBytes": 26214400,
    "agents": [
        {
            "name": "claude",
            "command": "claude",
            "args": ["-p", "--dangerously-skip-permissions", "--effort", "xhigh"],
            "promptFile": "prompt-claude.txt",
            "outputFile": "claude-output.md",
            "outputMode": "stdout"
        },
        {
            "name": "codex",
            "command": "codex",
            "args": ["exec", "--dangerously-bypass-approvals-and-sandbox", "-c", "model_reasoning_effort=xhigh", "-o", "<RUN_DIR>/codex-output.md"],
            "promptFile": "prompt-codex.txt",
            "outputFile": "codex-output.md",
            "outputMode": "file"
        }
    ]
}
```

(`codex exec -o` writes the final message itself → `outputMode: "file"`; its live session log streams to `codex-progress.log`. The `-o` value MUST be the ABSOLUTE `<RUN_DIR>` path — the child runs from `cwd` = repo root, so a relative `-o` would land outside the run dir while the runner collects from `{RUN_DIR}/codex-output.md`. `outputFile` stays the bare file name; the runner always resolves it inside the run dir. `claude -p` prints the result on stdout → `outputMode: "stdout"`. Do not add more agents; use separate runs for additional tools.)

**b. Launch the supervisor** in ONE background Bash call (`run_in_background: true`) and let the harness notify on completion — do NOT busy-poll:

```bash
node <SKILL_DIR>/scripts/dual-ai-runner.mjs --run-dir "{RUN_DIR}"
```

The runner maintains the external status report start-to-end:

- `status.json` — atomically updated snapshot: run state + per-agent `starting|running|completed|failed|timeout`, pid, exit code, output bytes, last activity timestamp
- `events.ndjson` — append-only audit: `run-start`, `agent-start`, `agent-failed` (spawn error / unreadable prompt file), `agent-exit`, `kill`, `run-timeout`, `run-end`
- `<name>-stderr.log` / `codex-progress.log` — diagnostics

**c. Watch** — report initial per-agent statuses right after spawn; while the background task runs, read `{RUN_DIR}/status.json` on demand (user asks, or before long waits) and report each agent's state + outputBytes + lastActivityAt. Caveat: stdout-mode agents (`claude -p`) buffer the result until the end — `outputBytes: 0` / `lastActivityAt: null` is NORMAL for a healthy long run; only treat it as a stall after checking `runnerPid` and the process itself.

**d. Collect & compare** — when the background runner exits (exit 0 = all agents succeeded; 1 = at least one failed/timed out; 2 = config error), read `status.json` + both output files and present a comparison (agreements, disagreements, unique findings) citing the output files. On per-agent failure, surface `stderrTail` from `status.json` verbatim.

### 6. Report

State: run folder, the two window titles (or output file paths in orchestrated mode), effort level and permission mode applied to each, and that both sessions are independent new sessions. In interactive mode also state: TUI results cannot be collected back into this session — `events.ndjson` records session start/end lifecycle only; re-run with `--orchestrate` to wait, watch, and auto-collect both results.

## Failure Modes

- **Window opens then closes instantly** → launcher threw; re-run the launcher script (`.ps1`/`.sh`) directly in a foreground Bash call to surface the error, fix, respawn.
- **No GUI terminal available** (SSH session, container, no display server) → use headless mode and tell the user why.
- **Codex rejects xhigh** → the configured codex model does not support xhigh; fall back to `-c model_reasoning_effort="high"` and tell the user which model/effort was actually used.
- **Quota/auth errors** → surface verbatim from the session window or orchestrated output; do not retry silently.
- **Runner exits 2** → `run-config.json` missing/invalid; fix the config, relaunch.
- **Agent state `failed` in `status.json`** → read `{name}-stderr.log` and the `stderrTail` field; report verbatim.
- **`status.json` stops updating** (no heartbeat, `lastActivityAt` stale) → check whether `runnerPid` is still alive; if dead, treat outputs as partial and report what was collected. Note: stale `lastActivityAt` alone is NOT a stall signal for stdout-mode agents — they print only at the end (see Watch caveat).
- **Headless free-text prompts vs interactive-only hooks** → a spawned session's project hooks may demand interactive answers; slash-command prompts are exempt. If orchestrated output looks gate-blocked, mention this and suggest interactive mode for that prompt.

---

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.
> **Keep domain concepts out of generic/shared/infrastructure layers.** A reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. The leak compiles and runs, so it passes review silently while coupling the "reusable" layer to one consumer. Push domain fields/logic down into the consumer via subclass or composition.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** verify both CLIs are installed before spawning; never half-launch
**IMPORTANT MUST ATTENTION** set effort and full-permission mode via launch flags only — never via keystrokes into a running session
**IMPORTANT MUST ATTENTION** pass each prompt through its per-tool prompt file (`prompt-claude.txt` / `prompt-codex.txt`) read inside the launcher — never inline shell escaping
**IMPORTANT MUST ATTENTION** detect OS first (`uname -s`) and use the matching launcher/spawn branch
**IMPORTANT MUST ATTENTION** do not answer the prompt in the current session — orchestrate only
**IMPORTANT MUST ATTENTION** orchestrated mode: launch the runner ONCE in background, watch `status.json`, collect + compare outputs when it exits — never re-implement supervision inline and never busy-poll

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
   **Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
   **Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
