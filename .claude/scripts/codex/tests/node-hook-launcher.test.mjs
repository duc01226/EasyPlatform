import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { normalizeCommand } from "../sync-hooks.mjs";

const sourceCommand = 'node "$CLAUDE_PROJECT_DIR"/.claude/hooks/probe.cjs';
const posixOnly = { skip: process.platform === "win32" };
const standardNodeLocations = ["/opt/homebrew/bin/node", "/usr/local/bin/node", "/usr/bin/node", "/bin/node"];

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "node hook's runtime-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const home = path.join(root, "home space's");
  const emptyPath = path.join(root, "empty-bin");
  const cwd = path.join(root, "nested", "session");
  const hookDir = path.join(root, ".claude", "hooks");
  await Promise.all([home, emptyPath, cwd, hookDir].map(dir => fs.mkdir(dir, { recursive: true })));
  await fs.writeFile(path.join(hookDir, "probe.cjs"), `
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const input = JSON.parse(fs.readFileSync(0, 'utf8'));
console.log(JSON.stringify({ input, root: process.cwd(), child: execFileSync('node', ['-p', 'process.version'], { encoding: 'utf8' }).trim() }));
process.exitCode = input.exitCode || 0;
`);
  const env = { ...process.env, HOME: home, PATH: emptyPath };
  for (const key of ["CK_NODE_PATH", "NVM_DIR", "VOLTA_HOME", "ASDF_DATA_DIR", "MISE_DATA_DIR", "XDG_DATA_HOME", "NODE_OPTIONS"]) delete env[key];
  const linkNode = async dir => {
    await fs.mkdir(dir, { recursive: true });
    const executable = path.join(dir, "node");
    await fs.symlink(process.execPath, executable);
    return executable;
  };
  return { root, home, cwd, env, linkNode };
}

function run(command, cwd, env, input = { text: "stdin survives", exitCode: 0 }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, { cwd, env, shell: true, windowsHide: true });
    let stdout = "", stderr = "";
    child.stdout.on("data", data => { stdout += data; });
    child.stderr.on("data", data => { stderr += data; });
    child.on("error", reject);
    child.on("close", code => resolve({ code, stdout, stderr }));
    child.stdin.end(JSON.stringify(input));
  });
}

test("POSIX desktop hook resolves NVM default without consuming input or printing initialization noise", posixOnly, async t => {
  const f = await fixture(t);
  const nvmDir = path.join(f.home, ".nvm");
  await f.linkNode(path.join(nvmDir, "versions", "node", "v99", "bin"));
  await fs.writeFile(path.join(nvmDir, "nvm.sh"), `
printf 'initialization noise\\n'
nvm() { [ "$1" = which ] && [ "$2" = default ] || return 1; printf '%s\\n' "$NVM_DIR/versions/node/v99/bin/node"; }
`);
  const input = { text: "payload with 'quotes' and $HOME", exitCode: 2 };
  const result = await run(normalizeCommand(sourceCommand), f.cwd, f.env, input);
  assert.equal(result.code, 2, result.stderr);
  assert.equal(result.stderr, "");
  const output = JSON.parse(result.stdout);
  assert.deepEqual(output.input, input);
  assert.equal(output.root, await fs.realpath(f.root));
  assert.equal(output.child, process.version, "descendant processes must find the resolved Node");
});

test("POSIX hook keeps PATH-selected Node and supports an explicit executable with spaces and apostrophes", posixOnly, async t => {
  const f = await fixture(t);
  const executable = await f.linkNode(path.join(f.home, "chosen runtime's bin"));
  for (const env of [{ ...f.env, PATH: path.dirname(executable) }, { ...f.env, CK_NODE_PATH: executable }]) {
    const result = await run(normalizeCommand(sourceCommand), f.cwd, env);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).child, process.version);
  }
});

test("POSIX hook honors configured manager directories under a stripped GUI PATH", posixOnly, async t => {
  const f = await fixture(t);
  for (const [key, suffix] of [["VOLTA_HOME", "bin"], ["ASDF_DATA_DIR", "shims"], ["MISE_DATA_DIR", "shims"], ["NVM_DIR", "versions/node/v99/bin"]]) {
    const managerDir = path.join(f.home, key);
    await f.linkNode(path.join(managerDir, suffix));
    if (key === "NVM_DIR") await fs.writeFile(path.join(managerDir, "nvm.sh"), 'nvm() { printf "%s\\n" "$NVM_DIR/versions/node/v99/bin/node"; }');
    const result = await run(normalizeCommand(sourceCommand), f.cwd, { ...f.env, [key]: managerDir });
    assert.equal(result.code, 0, `${key}: ${result.stderr}`);
    assert.equal(JSON.parse(result.stdout).child, process.version);
  }
});

test("a relative runtime remains available to descendants after the launcher changes to the project root", posixOnly, async t => {
  const f = await fixture(t);
  const executable = await f.linkNode(path.join(f.root, "runtime-bin"));
  for (const env of [
    { ...f.env, CK_NODE_PATH: path.relative(f.cwd, executable) },
    { ...f.env, PATH: path.relative(f.cwd, path.dirname(executable)) },
  ]) {
    const result = await run(normalizeCommand(sourceCommand), f.cwd, env);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).child, process.version);
  }
});

test("an invalid explicit runtime fails visibly without running the hook or silently selecting another Node", posixOnly, async t => {
  const f = await fixture(t);
  const result = await run(normalizeCommand(sourceCommand), f.cwd, { ...f.env, CK_NODE_PATH: path.join(f.home, "missing-node") });
  assert.equal(result.code, 127);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /CK_NODE_PATH is not an executable file/);
});

test("POSIX hook recovers a standard installation or reports an absent runtime without a false success", posixOnly, async t => {
  const f = await fixture(t);
  const installations = await Promise.all(standardNodeLocations.map(async candidate => {
    try { await fs.access(candidate, 1); return candidate; } catch { return null; }
  }));
  const result = await run(normalizeCommand(sourceCommand), f.cwd, f.env);
  if (installations.some(Boolean)) {
    assert.equal(result.code, 0, result.stderr);
    assert.match(JSON.parse(result.stdout).child, /^v\d+\./);
  } else {
    assert.equal(result.code, 127);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /Node\.js was not found.*CK_NODE_PATH/);
  }
});

test("Windows retains the native Node launcher and non-project commands retain their authored semantics", () => {
  const command = normalizeCommand(sourceCommand, { windows: true });
  assert.match(command, /^node -e "/);
  assert.match(command, /-- "\.claude\/hooks\/probe\.cjs"$/);
  assert.doesNotMatch(command, /\/bin\/sh|CK_NODE_PATH|nvm\.sh/);
  for (const windows of [false, true]) assert.equal(normalizeCommand("node ./custom.cjs", { windows }), "node ./custom.cjs");
});

test("native Windows launcher preserves input and exit status", { skip: process.platform !== "win32" }, async t => {
  const f = await fixture(t);
  const result = await run(normalizeCommand(sourceCommand, { windows: true }), f.cwd, process.env, { text: "Windows input", exitCode: 2 });
  assert.equal(result.code, 2, result.stderr);
  assert.equal(JSON.parse(result.stdout).input.text, "Windows input");
});
