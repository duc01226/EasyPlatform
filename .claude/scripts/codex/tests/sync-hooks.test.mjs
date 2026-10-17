import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { mapMatcherForCodex, normalizeCommand, isProtocolHookPath } from "../sync-hooks.mjs";

const execFileAsync = promisify(execFile);
const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, "..", "..", "..", "..");
const syncHooksScript = path.join(repoRoot, ".claude", "scripts", "codex", "sync-hooks.mjs");

// Matcher translation, unit-tested directly. The renderer applies this to every group,
// so a wrong row is only visible here or as an opaque diff in the divergence table.
// Each alias row gets its OWN case: a row exercised only inside a multi-tool group is
// indistinguishable from a missing row, because any one mutation tool in the group
// already contributes `apply_patch`.
test("mapMatcherForCodex widens each Claude mutation tool with Codex's patch tool", () => {
  for (const tool of ["Edit", "Write", "MultiEdit", "NotebookEdit"]) {
    assert.equal(
      mapMatcherForCodex(tool),
      `${tool}|apply_patch`,
      `${tool} is a Claude mutation tool, so a matcher naming only it must still reach Codex`
    );
  }
});

// The read/mutate boundary. `apply_patch` MUTATES, so aliasing a read-only tool to it
// would deliver write events to a read-gated hook. This pins the absence of that row:
// if someone re-adds `["Read", ["apply_patch"]]`, this fails and names the reason.
test("mapMatcherForCodex never widens a read-only tool with the mutation tool", () => {
  assert.equal(mapMatcherForCodex("Read"), "Read", "a read-gated matcher must not receive write events");
  assert.equal(mapMatcherForCodex("Glob|Grep|Read"), "Glob|Grep|Read", "an all-read matcher is left alone");
  // A matcher mixing read and mutation tools is widened because of the MUTATION tool.
  assert.equal(mapMatcherForCodex("Read|Edit"), "Read|Edit|apply_patch");
});

test("mapMatcherForCodex leaves non-file matchers, existing aliases, and empty input alone", () => {
  // No Claude mutation tool: mirrored verbatim, not blanket-widened.
  assert.equal(mapMatcherForCodex("Bash"), "Bash");
  assert.equal(mapMatcherForCodex("TodoWrite|TaskCreate|TaskUpdate|update_plan"), "TodoWrite|TaskCreate|TaskUpdate|update_plan");
  assert.equal(mapMatcherForCodex("mcp__filesystem__*"), "mcp__filesystem__*");

  // Already carries the alias: appended once, never twice, wherever it sits.
  assert.equal(mapMatcherForCodex("Edit|apply_patch"), "Edit|apply_patch");
  assert.equal(mapMatcherForCodex("apply_patch|Write"), "apply_patch|Write");
  assert.equal(mapMatcherForCodex("Edit|Write|MultiEdit|apply_patch"), "Edit|Write|MultiEdit|apply_patch");

  // Absent or empty matcher: passed through untouched, so the renderer's own
  // `matcher && matcher !== '*'` guard stays the only place that decides omission.
  assert.equal(mapMatcherForCodex(undefined), undefined);
  assert.equal(mapMatcherForCodex(""), "");
  assert.equal(mapMatcherForCodex(null), null);

  // Order and separator survive: the source order is preserved and aliases append.
  assert.equal(mapMatcherForCodex("Bash|Glob|Grep|Read|Edit|Write|NotebookEdit"), "Bash|Glob|Grep|Read|Edit|Write|NotebookEdit|apply_patch");
  assert.equal(mapMatcherForCodex("Write|Edit|MultiEdit"), "Write|Edit|MultiEdit|apply_patch");
  // One alias for the whole group, even when several tools map to it.
  assert.equal(mapMatcherForCodex("Edit|Write").split("|").filter(tool => tool === "apply_patch").length, 1);
});

function runSync(cwd, ambient = process.env) {
  return execFileAsync(process.execPath, [syncHooksScript], { cwd, env: { ...ambient, CLAUDE_PROJECT_DIR: cwd } });
}

test('failure reminder mirrors shell preflight and reset, reports unsupported native failure, and skips the Git probe', async () => {
  const hookPath = '.claude/hooks/failure-investigation-remind.cjs';
  const command = `node "$CLAUDE_PROJECT_DIR"/${hookPath}`;
  assert.equal(isProtocolHookPath(hookPath), false, 'an advisory digest must not inherit full-protocol routing');
  for (const windows of [false, true]) {
    const rendered = normalizeCommand(command, { windows });
    assert.ok(rendered.includes(hookPath));
    assert.ok(!rendered.includes('windows-git.cjs'), 'the reminder executes no Git and needs no capability probe');
  }
  const target = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'failure-reminder-mirror-')));
  try {
    const hookDir = path.join(target, '.claude/hooks');
    await fs.mkdir(hookDir, { recursive: true });
    // The fixture entry prints its resolved root; the generated launcher, not a
    // duplicate launcher in this test, owns discovery on the current platform.
    await fs.writeFile(path.join(target, hookPath), 'console.log(process.env.CLAUDE_PROJECT_DIR);\n');
    const entry = { type: 'command', command, timeout: 3 };
    await fs.writeFile(path.join(target, '.claude/settings.json'), JSON.stringify({ hooks: {
      PreToolUse: [{ matcher: 'Bash|exec_command', hooks: [entry] }],
      PostToolUseFailure: [{ matcher: '*', hooks: [entry] }],
      SessionStart: [{ matcher: 'compact|clear', hooks: [entry] }]
    } }));
    await runSync(target);
    const { hooks } = JSON.parse(await fs.readFile(path.join(target, '.codex/hooks.json'), 'utf8'));
    assert.equal(hooks.PreToolUse.length, 1);
    assert.equal(hooks.PreToolUse[0].matcher, 'Bash|exec_command');
    assert.equal(hooks.SessionStart.length, 1);
    assert.equal(hooks.SessionStart[0].matcher, 'compact|clear');
    assert.equal(hooks.PostToolUseFailure, undefined);
    const report = JSON.parse(await fs.readFile(path.join(target, 'tmp/hooks.sync.report.json'), 'utf8'));
    assert.ok(report.skipped_events.some(row => row.event === 'PostToolUseFailure' && row.reason === 'unsupported-by-codex'));
    assert.ok(report.session_start_mirrors.some(row => row.hook === hookPath));
    const nested = path.join(target, 'nested session');
    await fs.mkdir(nested);
    const rendered = hooks.PreToolUse[0].hooks[0];
    const result = await runCommand(process.platform === 'win32' ? rendered.commandWindows : rendered.command, nested);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(normalizePathForComparison(result.stdout.trim()), normalizePathForComparison(target));
  } finally {
    await fs.rm(target, { recursive: true, force: true });
  }
});

test('sync-hooks fixture overrides a competing ambient root without touching it', async () => {
  const owner = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-hooks-isolation-'));
  const target = path.join(owner, 'target');
  const foreign = path.join(owner, 'foreign');
  try {
    for (const dir of [target, foreign]) {
      await fs.mkdir(path.join(dir, '.claude'), { recursive: true });
      await fs.writeFile(path.join(dir, '.claude/settings.json'), JSON.stringify({ hooks: {} }));
    }
    await fs.mkdir(path.join(foreign, '.codex'));
    await fs.writeFile(path.join(foreign, '.codex/hooks.json'), 'foreign-sentinel');
    await runSync(target, { ...process.env, CLAUDE_PROJECT_DIR: foreign });
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(target, '.codex/hooks.json'), 'utf8')), { hooks: {} });
    assert.equal(await fs.readFile(path.join(foreign, '.codex/hooks.json'), 'utf8'), 'foreign-sentinel');
    assert.deepEqual(await fs.readdir(path.join(foreign, '.codex')), ['hooks.json']);
  } finally {
    await fs.rm(owner, { recursive: true, force: true });
  }
});

function runCommand(command, cwd) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    delete env.CLAUDE_PROJECT_DIR;
    const child = spawn(command, { cwd, env, shell: true, windowsHide: true });
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
          {
            matcher: "Glob|Grep|Read",
            hooks: [{ type: "command", command: "node ./scripts/pre-read.cjs" }],
          },
          {
            matcher: "NotebookEdit",
            hooks: [{ type: "command", command: "node ./scripts/pre-notebook.cjs" }],
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

    await runSync(tempRoot);

    const rawHooks = await fs.readFile(path.join(tempRoot, ".codex", "hooks.json"), "utf8");
    const hooksConfig = JSON.parse(rawHooks);
    const hooks = hooksConfig.hooks;

    assert.ok(hooks);
    assert.deepEqual(Object.keys(hooksConfig), ["hooks"]);
    const preMatchers = (hooks.PreToolUse ?? []).map((group) => group.matcher);
    // A Claude file-tool matcher is preserved AND widened with Codex's patch tool: Codex
    // performs every file mutation through `apply_patch`, so mirroring the Claude names
    // verbatim would gate the hook on tools that host never emits.
    assert.ok(preMatchers.includes("Edit|Write|MultiEdit|apply_patch"), "file-tool matcher gains the Codex patch tool");
    // Widening is per-mutation-tool, so a lone NotebookEdit group must reach Codex too.
    assert.ok(preMatchers.includes("NotebookEdit|apply_patch"), "a single-mutation-tool matcher is widened");
    // Targeted, not blanket: a matcher with no Claude file tool is mirrored unchanged.
    assert.ok(preMatchers.includes("Bash"), "Bash is not widened");
    // Read-only group stays read-only through the REAL renderer: `apply_patch` mutates,
    // so widening a read matcher with it would hand write events to a read-gated hook.
    assert.ok(preMatchers.includes("Glob|Grep|Read"), "a read-only matcher is never widened with the mutation tool");
    assert.equal(hooks.UserPromptSubmit?.[0]?.matcher, "manual|auto", "prompt-event matchers are not tool names");
    assert.equal(hooks.UserPromptSubmit?.[0]?.hooks?.[0]?.command, "node ./scripts/user-prompt.cjs");
    assert.equal(hooks.Stop?.[0]?.matcher, "clear|exit", "stop-event matchers are not tool names");
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
                command: 'node "${CLAUDE_PROJECT_DIR}"/.claude/hooks/sample-block.cjs',
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
      fs.writeFile(path.join(hookDir, "sample-block.cjs"), "process.exit(2);\n", "utf8"),
      fs.writeFile(path.join(hookDir, "path-boundary-block.cjs"), "console.log(process.env.CLAUDE_PROJECT_DIR);\n", "utf8"),
      fs.writeFile(path.join(hookDir, "fourth-variant.cjs"), "console.log(process.cwd());\n", "utf8"),
    ]);
    await fs.writeFile(
      path.join(tempRoot, ".claude", "settings.json"),
      `${JSON.stringify(settings, null, 2)}\n`,
      "utf8"
    );

    await runSync(tempRoot);

    const rawHooks = await fs.readFile(path.join(tempRoot, ".codex", "hooks.json"), "utf8");
    const hooksConfig = JSON.parse(rawHooks);
    const entries = hooksConfig.hooks.PreToolUse[0].hooks;
    const commands = entries.map((hook) => process.platform === "win32" ? hook.commandWindows : hook.command);
    assert.equal(commands.length, 4);
    for (const [index, name] of ["scout-block", "sample-block", "path-boundary-block", "fourth-variant"].entries()) {
      assert.match(entries[index].commandWindows, /^node -e ".*fs\.existsSync\(path\.join\(candidate, '\.claude'\)\)/);
      assert.match(entries[index].command, /^\/bin\/sh -c /);
      assert.doesNotMatch(commands[index], /git rev-parse/);
      assert.match(entries[index].commandWindows, new RegExp(`-- \\\"\\.claude/hooks/${name}\\.cjs\\\"$`));
    }
    assert.ok(
      commands.every((command) => !command.includes(tempRoot)),
      "tracked hook commands must not embed the generating checkout path"
    );

    async function assertLauncherBehavior() {
      const [scout, sample, boundary, fourth] = await Promise.all(
        commands.map((command) => runCommand(command, nestedDir))
      );
      assert.equal(scout.code, 0, scout.stderr);
      const observedRoot = JSON.parse(scout.stdout);
      assert.equal(normalizePathForComparison(observedRoot.cwd), normalizePathForComparison(observedRoot.root));
      assert.notEqual(normalizePathForComparison(observedRoot.cwd), normalizePathForComparison(nestedDir));
      assert.equal(sample.code, 2, sample.stderr);
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

test("sync-hooks omits Claude SessionStart hooks and writes a skip report under tmp", async () => {
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

    await runSync(tempRoot);

    const rawHooks = await fs.readFile(path.join(tempRoot, ".codex", "hooks.json"), "utf8");
    const hooksConfig = JSON.parse(rawHooks);
    const hooks = hooksConfig.hooks;
    assert.ok(hooks);
    assert.deepEqual(Object.keys(hooksConfig), ["hooks"]);
    assert.equal(hooks.SessionStart, undefined);

    await assert.rejects(
      fs.access(path.join(tempRoot, ".codex", "hooks.sync.report.json")),
      { code: "ENOENT" },
      "disposable reports must not be written into the generated Codex mirror"
    );
    const rawReport = await fs.readFile(path.join(tempRoot, "tmp", "hooks.sync.report.json"), "utf8");
    const report = JSON.parse(rawReport);
    assert.ok(
      report.skipped_events.some(
        (event) =>
          event.event === "SessionStart" &&
          event.reason === "static-startup-context-authoritative"
      )
    );
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("sync-hooks mirrors the Git capability producer while static-only SessionStart hooks remain omitted", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-sync-hooks-git-capability-"));
  try {
    await fs.mkdir(path.join(tempRoot, ".claude"), { recursive: true });
    const settings = {
      hooks: {
        SessionStart: [
          {
            matcher: "startup|resume|clear|compact",
            hooks: [
              {
                type: "command",
                command: 'node "$CLAUDE_PROJECT_DIR"/.claude/hooks/session-init.cjs',
              },
              {
                type: "command",
                command: 'node "$CLAUDE_PROJECT_DIR"/.claude/hooks/verify-install.cjs',
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
    await fs.writeFile(path.join(tempRoot, ".claude", "settings.json"), `${JSON.stringify(settings, null, 2)}\n`, "utf8");

    await runSync(tempRoot);

    const hooksConfig = JSON.parse(await fs.readFile(path.join(tempRoot, ".codex", "hooks.json"), "utf8"));
    const commands = hooksConfig.hooks.SessionStart.flatMap((group) => group.hooks.map((hook) => hook.command));
    assert.equal(commands.length, 1, "only the runtime-capability producer is mirrored");
    assert.match(commands[0], /verify-install\.cjs/);
    assert.match(commands[0], /windows-git\.cjs/);
    assert.match(commands[0], /withGitEnvironment/);
    assert.doesNotMatch(commands[0], /session-init\.cjs|graph-session-init\.cjs/);

    const report = JSON.parse(await fs.readFile(path.join(tempRoot, "tmp", "hooks.sync.report.json"), "utf8"));
    const mirror = report.session_start_mirrors.find((entry) => entry.hook === ".claude/hooks/verify-install.cjs");
    assert.ok(mirror, "the Git capability producer must carry an explicit mirror reason");
    assert.equal(report.skipped_events.some((event) => event.event === "SessionStart"), false);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});


test("sync-hooks mirrors the compaction re-delivery of prompt-time context hooks", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-sync-hooks-compaction-"));
  const hookFiles = ["core-principles-inject", "judgement-integrity-route", "ai-feature-route", "workflow-route-inject", "workflow-catalog-inject"];
  try {
    await fs.mkdir(path.join(tempRoot, ".claude"), { recursive: true });
    const settings = {
      hooks: {
        SessionStart: [
          { matcher: "compact", hooks: hookFiles.map(name => ({ type: "command", command: `node "$CLAUDE_PROJECT_DIR"/.claude/hooks/${name}.cjs` })) },
          { matcher: "startup", hooks: [{ type: "command", command: 'node "$CLAUDE_PROJECT_DIR"/.claude/hooks/session-init.cjs' }] },
        ],
      },
    };
    await fs.writeFile(path.join(tempRoot, ".claude", "settings.json"), JSON.stringify(settings), "utf8");
    await runSync(tempRoot);
    const hooksConfig = JSON.parse(await fs.readFile(path.join(tempRoot, ".codex", "hooks.json"), "utf8"));
    const groups = hooksConfig.hooks.SessionStart;
    assert.equal(groups.length, 1, "only the compaction group mirrors; a static-context restatement stays skipped");
    assert.equal(groups[0].matcher, "compact");
    const report = JSON.parse(await fs.readFile(path.join(tempRoot, "tmp", "hooks.sync.report.json"), "utf8"));
    for (const name of hookFiles) {
      assert.ok(groups[0].hooks.some(hook => hook.command.includes(`${name}.cjs`)), `${name} mirrored`);
      assert.ok(report.session_start_mirrors.some(entry => entry.hook === `.claude/hooks/${name}.cjs`), `${name} carries a mirror reason`);
    }
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("sync-hooks mirrors compact/clear UI reminder resets for contexts without transcripts", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-sync-hooks-ui-reuse-"));
  try {
    await fs.mkdir(path.join(tempRoot, ".claude"), { recursive: true });
    const settings = {
      hooks: {
        SessionStart: [{ matcher: "compact|clear", hooks: [{
          type: "command", command: 'node "$CLAUDE_PROJECT_DIR"/.claude/hooks/ui-reuse-remind.cjs',
        }] }],
      },
    };
    await fs.writeFile(path.join(tempRoot, ".claude", "settings.json"), JSON.stringify(settings), "utf8");
    await runSync(tempRoot);
    const hooksConfig = JSON.parse(await fs.readFile(path.join(tempRoot, ".codex", "hooks.json"), "utf8"));
    const groups = hooksConfig.hooks.SessionStart;
    assert.equal(groups.length, 1);
    assert.equal(groups[0].matcher, "compact|clear");
    assert.match(groups[0].hooks[0].command, /ui-reuse-remind\.cjs/);
    const report = JSON.parse(await fs.readFile(path.join(tempRoot, "tmp", "hooks.sync.report.json"), "utf8"));
    assert.ok(report.session_start_mirrors.some(entry => entry.hook === ".claude/hooks/ui-reuse-remind.cjs"));
    assert.equal(report.skipped_events.some(event => event.event === "SessionStart"), false);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
