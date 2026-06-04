import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, "..", "..", "..", "..");
const syncHooksScript = path.join(repoRoot, ".claude", "scripts", "codex", "sync-hooks.mjs");

test("sync-hooks preserves non-bash and prompt-event matchers", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-sync-hooks-"));
  try {
    await fs.mkdir(path.join(tempRoot, ".claude"), { recursive: true });
    const settings = {
      hooks: {
        PreToolUse: [
          {
            matcher: "Edit|Write|MultiEdit",
            hooks: [{ type: "command", command: "node ./scripts/pre-edit.cjs" }],
          },
          {
            matcher: "Bash",
            hooks: [{ type: "command", command: "node ./scripts/pre-bash.cjs" }],
          },
        ],
        UserPromptSubmit: [
          {
            matcher: "manual|auto",
            hooks: [{ type: "command", command: "node ./scripts/user-prompt.cjs" }],
          },
        ],
        Stop: [
          {
            matcher: "clear|exit",
            hooks: [{ type: "command", command: "node ./scripts/stop.cjs" }],
          },
        ],
      },
    };
    await fs.writeFile(
      path.join(tempRoot, ".claude", "settings.json"),
      `${JSON.stringify(settings, null, 2)}\n`,
      "utf8"
    );

    await execFileAsync(process.execPath, [syncHooksScript], { cwd: tempRoot });

    const rawHooks = await fs.readFile(path.join(tempRoot, ".codex", "hooks.json"), "utf8");
    const hooksConfig = JSON.parse(rawHooks);
    const hooks = hooksConfig.hooks;

    assert.ok(hooks);
    assert.deepEqual(Object.keys(hooksConfig), ["hooks"]);
    const preMatchers = (hooks.PreToolUse ?? []).map((group) => group.matcher);
    assert.ok(preMatchers.includes("Edit|Write|MultiEdit"));
    assert.ok(preMatchers.includes("Bash"));
    assert.equal(hooks.UserPromptSubmit?.[0]?.matcher, "manual|auto");
    assert.equal(hooks.UserPromptSubmit?.[0]?.hooks?.[0]?.command, "node ./scripts/user-prompt.cjs");
    assert.equal(hooks.Stop?.[0]?.matcher, "clear|exit");
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("sync-hooks omits Claude SessionStart hooks and writes a skip report", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-sync-hooks-skip-"));
  try {
    await fs.mkdir(path.join(tempRoot, ".claude"), { recursive: true });
    const settings = {
      hooks: {
        SessionStart: [
          {
            matcher: "startup",
            hooks: [
              {
                type: "command",
                command: 'node "$CLAUDE_PROJECT_DIR"/.claude/hooks/session-init.cjs',
              },
              {
                type: "command",
                command: 'node "$CLAUDE_PROJECT_DIR"/.claude/hooks/npm-auto-install.cjs',
              },
              {
                type: "command",
                command: 'node "$CLAUDE_PROJECT_DIR"/.claude/hooks/graph-session-init.cjs',
              },
            ],
          },
        ],
      },
    };
    await fs.writeFile(
      path.join(tempRoot, ".claude", "settings.json"),
      `${JSON.stringify(settings, null, 2)}\n`,
      "utf8"
    );

    await execFileAsync(process.execPath, [syncHooksScript], { cwd: tempRoot });

    const rawHooks = await fs.readFile(path.join(tempRoot, ".codex", "hooks.json"), "utf8");
    const hooksConfig = JSON.parse(rawHooks);
    const hooks = hooksConfig.hooks;
    assert.ok(hooks);
    assert.deepEqual(Object.keys(hooksConfig), ["hooks"]);
    assert.equal(hooks.SessionStart, undefined);

    const rawReport = await fs.readFile(path.join(tempRoot, ".codex", "hooks.sync.report.json"), "utf8");
    const report = JSON.parse(rawReport);
    assert.ok(
      report.skipped_events.some(
        (event) =>
          event.event === "SessionStart" &&
          event.reason === "disabled-for-codex-hookless-startup-context"
      )
    );
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
