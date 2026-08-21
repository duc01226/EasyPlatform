import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, "..", "..", "..", "..");
const syncHooksScript = path.join(repoRoot, ".claude", "scripts", "codex", "sync-hooks.mjs");

function runCommand(command, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, { cwd, shell: true, windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => { stdout += data; });
    child.stderr.on("data", (data) => { stderr += data; });
    child.on("error", reject);
    child.on("close", (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
}

function normalizePathForComparison(value) {
  return path.normalize(value).replaceAll("\\", "/").toLowerCase();
}

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

test("sync-hooks launches project-root Node hooks from Git and bare .claude roots", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-sync-hooks-root-"));
  try {
    const hookDir = path.join(tempRoot, ".claude", "hooks");
    const nestedDir = path.join(tempRoot, "nested", "session");
    await fs.mkdir(hookDir, { recursive: true });
    await fs.mkdir(nestedDir, { recursive: true });
    const settings = {
      hooks: {
        PreToolUse: [
          {
            matcher: "Read",
            hooks: [
              {
                type: "command",
                command: 'node "$CLAUDE_PROJECT_DIR"/.claude/hooks/scout-block.cjs',
              },
              {
                type: "command",
                command: 'node "${CLAUDE_PROJECT_DIR}"/.claude/hooks/privacy-block.cjs',
              },
              {
                type: "command",
                command: "node $CLAUDE_PROJECT_DIR/.claude/hooks/path-boundary-block.cjs",
              },
              {
                type: "command",
                command: "node ${CLAUDE_PROJECT_DIR}/.claude/hooks/fourth-variant.cjs",
              },
            ],
          },
        ],
      },
    };
    await Promise.all([
      fs.writeFile(
        path.join(hookDir, "scout-block.cjs"),
        "console.log(JSON.stringify({ cwd: process.cwd(), root: process.env.CLAUDE_PROJECT_DIR }));\n",
        "utf8"
      ),
      fs.writeFile(path.join(hookDir, "privacy-block.cjs"), "process.exit(2);\n", "utf8"),
      fs.writeFile(path.join(hookDir, "path-boundary-block.cjs"), "console.log(process.env.CLAUDE_PROJECT_DIR);\n", "utf8"),
      fs.writeFile(path.join(hookDir, "fourth-variant.cjs"), "console.log(process.cwd());\n", "utf8"),
    ]);
    await fs.writeFile(
      path.join(tempRoot, ".claude", "settings.json"),
      `${JSON.stringify(settings, null, 2)}\n`,
      "utf8"
    );

    await execFileAsync(process.execPath, [syncHooksScript], { cwd: tempRoot });

    const rawHooks = await fs.readFile(path.join(tempRoot, ".codex", "hooks.json"), "utf8");
    const hooksConfig = JSON.parse(rawHooks);
    const commands = hooksConfig.hooks.PreToolUse[0].hooks.map((hook) => hook.command);
    assert.equal(commands.length, 4);
    for (const [index, name] of ["scout-block", "privacy-block", "path-boundary-block", "fourth-variant"].entries()) {
      assert.match(commands[index], /^node -e ".*fs\.existsSync\(path\.join\(candidate, '\.claude'\)\)/);
      assert.doesNotMatch(commands[index], /git rev-parse/);
      assert.match(commands[index], new RegExp(`-- \\\"\\.claude/hooks/${name}\\.cjs\\\"$`));
    }
    assert.ok(
      commands.every((command) => !command.includes(tempRoot)),
      "tracked hook commands must not embed the generating checkout path"
    );

    async function assertLauncherBehavior() {
      const [scout, privacy, boundary, fourth] = await Promise.all(
        commands.map((command) => runCommand(command, nestedDir))
      );
      assert.equal(scout.code, 0, scout.stderr);
      const observedRoot = JSON.parse(scout.stdout);
      assert.equal(normalizePathForComparison(observedRoot.cwd), normalizePathForComparison(observedRoot.root));
      assert.notEqual(normalizePathForComparison(observedRoot.cwd), normalizePathForComparison(nestedDir));
      assert.equal(privacy.code, 2, privacy.stderr);
      assert.equal(boundary.code, 0, boundary.stderr);
      assert.equal(normalizePathForComparison(boundary.stdout.trim()), normalizePathForComparison(observedRoot.root));
      assert.equal(fourth.code, 0, fourth.stderr);
      assert.equal(normalizePathForComparison(fourth.stdout.trim()), normalizePathForComparison(observedRoot.root));
    }

    await assertLauncherBehavior();

    await execFileAsync("git", ["init", "--quiet"], { cwd: tempRoot });
    await assertLauncherBehavior();
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
