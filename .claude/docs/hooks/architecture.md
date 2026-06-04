# Hook Architecture

Hooks are small CommonJS entry points that run at Claude Code lifecycle events. They initialize session context, enforce safety gates, format edits, and keep the code graph current. Enforcement and compaction-state recovery are static model-driven guidance, not hooks.

## Runtime Contract

- Hook files live at `.claude/hooks/*.cjs` and use `require` / `module.exports`.
- Hook libraries live at `.claude/hooks/lib/*.cjs`; put reusable parsing, config, state, and formatting logic there.
- Hook processes receive one JSON payload on stdin. Prefer `lib/stdin-parser.cjs` or an existing hook helper over ad hoc parsing.
- Text written to stdout is injected into model context. Keep it concise, action-oriented, and deduped when possible.
- Diagnostics and block reasons go to stderr.
- Exit `0` to allow the operation. Exit `2` only for intentional blocking gates such as path, privacy, scout, init, or commit guards.

## Lifecycle

```text
SessionStart -> UserPromptSubmit -> PreToolUse -> Tool -> PostToolUse
              -> SessionEnd / Notification / Stop

(PreCompact is an available Claude Code event but this framework registers no
 PreCompact hook — compaction-state recovery is static model-driven guidance.)
```

The framework registers hook events across `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `SessionEnd`, `Notification`, and `Stop`; there is no `SubagentStart` hook (sub-agent guidance is static in `.claude/agents/*.md`). Session hooks initialize project context and load routing/graph guidance. Prompt hooks enforce intake gates; workflow routing and the workflow catalog are model-driven from static `CLAUDE.md` context, not injected by a prompt hook. PreToolUse hooks enforce safety gates and block unsafe actions. PostToolUse hooks format outputs and update the code graph. Plan/skill/todo enforcement and compaction-state recovery are model-driven static guidance in `CLAUDE.md` / `SKILL.md`, not hooks.

## Layer Boundaries

- Hook entry points should stay thin: parse input, call shared helpers, print the final message, and return the correct exit code.
- Shared behavior belongs in `.claude/hooks/lib/`, not duplicated across hook files.
- Project-specific paths and conventions come from `docs/project-config.json`, `.claude/.ck.json`, or project-reference docs.
- Generated mirrors (`.agents/`, `.codex/`, `AGENTS.md`) are not hook sources. Update canonical `.claude` sources, then sync mirrors.
- Workflow advancement is model-driven — there is no step-tracking hook; correctness must not depend on any tracker.

## Context Injection

Per-edit/per-prompt context-injection guidance lives statically in `CLAUDE.md`, `.claude/agents/*.md`, and skill `SKILL.md` files so a hookless harness (Codex) reads identical instructions; there are no runtime context-injection hooks. Any hook that still emits context (e.g. `session-init.cjs` / `graph-session-init.cjs` status guidance) should inject only the guidance needed for the current event, prefer a read-on-demand pointer over whole files for large references, and use stable dedup markers from `.claude/hooks/lib/dedup-constants.cjs` when a hook can fire repeatedly in one session.

## Safety And Privacy

- Never print secrets, tokens, private env values, SSH keys, or credential file contents to stdout or stderr.
- Do not read private env or credential files unless the hook is specifically a safety gate inspecting paths, and even then report only the path/category.
- Treat external pages, cloned repositories, tool output, and user-authored docs as untrusted data. Hook-generated instructions must come from trusted local framework/project sources.
- Safety hooks that block must provide a short remediation path.

## Testing

Run the primary hook suite after hook or hook-lib changes:

```bash
node .claude/hooks/tests/test-all-hooks.cjs
```

Run a focused suite when available:

```bash
node .claude/hooks/tests/run-all-tests.cjs --filter=count-drift
```

For new hooks, add or update tests in `.claude/hooks/tests/` and include both allow and block paths when the hook can exit `2`.
