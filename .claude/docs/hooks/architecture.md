# Hook Architecture

Hooks are small CommonJS entry points that run at Claude Code lifecycle events. They inject context, enforce safety gates, persist session state, and keep workflow progress recoverable across compaction.

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
              -> PreCompact / SessionEnd / SubagentStart / Notification / Stop
```

Session hooks initialize project context, recover workflow/todo state, and load routing guidance. Prompt hooks route workflows and assemble context. PreToolUse hooks inject file-specific guidance or block unsafe actions. PostToolUse hooks persist state, track workflow progress, format outputs, and update the code graph.

## Layer Boundaries

- Hook entry points should stay thin: parse input, call shared helpers, print the final message, and return the correct exit code.
- Shared behavior belongs in `.claude/hooks/lib/`, not duplicated across hook files.
- Project-specific paths and conventions come from `docs/project-config.json`, `.claude/.ck.json`, or project-reference docs.
- Generated mirrors (`.agents/`, `.codex/`, `AGENTS.md`, `.github/instructions/`) are not hook sources. Update canonical `.claude` sources, then sync mirrors.
- Workflow advancement is model-driven. `workflow-step-tracker.cjs` is an accelerator only; correctness must not depend on it.

## Context Injection

Context hooks should inject only the guidance needed for the current event. For large references, inject a read-on-demand pointer rather than whole files. Use stable dedup markers from `.claude/hooks/lib/dedup-constants.cjs` when a hook can fire repeatedly in one session.

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
