import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, "..", "..", "..", "..");
const modulePath = path.join(repoRoot, ".claude", "scripts", "opencode", "sync-agents.mjs");

const {
  CLAUDE_AGENTS_RELATIVE,
  OPENCODE_AGENTS_RELATIVE,
  renderAgentDocument,
  materializeOpencodeAgents,
  checkOpencodeAgents,
  resolveClaudeAgentsDir,
  resolveOpencodeAgentsDir,
} = await import(pathToFileURL(modulePath).href);

const SOURCE = [
  "---",
  "name: architect",
  "description: >-",
  "    Use when making system design decisions, reviewing architecture, or",
  "    writing an ADR.",
  "model: inherit",
  "memory: project",
  "---",
  "",
  "# Architect",
  "",
  "Body line one.",
  "",
].join("\n");

async function withTempRoot(prefix, fn) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  try {
    await fn(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

async function seedSource(root, fileName, text) {
  const dir = resolveClaudeAgentsDir(root);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, fileName), text, "utf8");
}

test("TC-OPENCODE-AGENTS-001: paths resolve to the declared relative roots", () => {
  assert.equal(CLAUDE_AGENTS_RELATIVE, path.join(".claude", "agents"));
  assert.equal(OPENCODE_AGENTS_RELATIVE, path.join(".opencode", "agent"));
  assert.equal(resolveClaudeAgentsDir("/x"), path.join("/x", ".claude", "agents"));
  assert.equal(resolveOpencodeAgentsDir("/x"), path.join("/x", ".opencode", "agent"));
});

test("TC-OPENCODE-AGENTS-002: a rendered agent carries description, subagent mode, a mirror note, and the verbatim body", () => {
  const rendered = renderAgentDocument("architect.md", SOURCE);
  const lines = rendered.split("\n");

  assert.equal(lines[0], "---");
  assert.equal(
    lines[1],
    'description: "Use when making system design decisions, reviewing architecture, or writing an ADR."'
  );
  assert.equal(lines[2], "mode: subagent");
  assert.equal(lines[3], "---");
  assert.match(rendered, /GENERATED MIRROR of \.claude\/agents\/architect\.md/);
  assert.match(rendered, /^Source: \.claude\/agents\/architect\.md$/m);

  // The body is copied verbatim, not rewritten: no `/skill` -> `$skill` substitution.
  assert.ok(rendered.endsWith("# Architect\n\nBody line one.\n"), "body must be the canonical body, verbatim");
});

test("TC-OPENCODE-AGENTS-003: description falls back to a migration note when the source declares none", () => {
  const rendered = renderAgentDocument("mystery.md", ["---", "name: mystery", "---", "", "Body."].join("\n"));
  assert.match(rendered, /^description: "Migrated from \.claude\/agents\/mystery\.md"$/m);
});

test("TC-OPENCODE-AGENTS-004: a description carrying quotes and backslashes stays valid single-line YAML", () => {
  const source = ["---", 'description: "says \\"hi\\" and C:\\\\tmp"', "---", "", "Body."].join("\n");
  const rendered = renderAgentDocument("quoted.md", source);
  const descriptionLine = rendered.split("\n").find((line) => line.startsWith("description: "));

  assert.ok(descriptionLine, "description line must exist");
  assert.ok(!descriptionLine.slice("description: ".length + 1, -1).includes("\n"), "must stay single-line");
  const inner = descriptionLine.slice("description: ".length + 1, -1);
  assert.ok(!/(?<!\\)"/.test(inner), "every inner quote must be escaped");
});

test("TC-OPENCODE-AGENTS-005: materialize writes one file per canonical agent and is idempotent", async () => {
  await withTempRoot("opencode-agents-write-", async (root) => {
    await seedSource(root, "architect.md", SOURCE);
    await seedSource(root, "tester.md", ["---", "description: Tests things.", "---", "", "Body."].join("\n"));

    const first = await materializeOpencodeAgents({ rootDir: root });
    assert.equal(first.count, 2);
    assert.deepEqual(first.written.sort(), ["architect.md", "tester.md"]);
    assert.deepEqual(first.unchanged, []);

    const written = await fs.readFile(path.join(resolveOpencodeAgentsDir(root), "architect.md"), "utf8");
    assert.equal(written, renderAgentDocument("architect.md", SOURCE));

    const second = await materializeOpencodeAgents({ rootDir: root });
    assert.deepEqual(second.written, [], "a re-run must write nothing");
    assert.equal(second.unchanged.length, 2);
  });
});

test("TC-OPENCODE-AGENTS-006: check passes on a fresh mirror, and fails on a stale or missing file", async () => {
  await withTempRoot("opencode-agents-check-", async (root) => {
    await seedSource(root, "architect.md", SOURCE);
    await materializeOpencodeAgents({ rootDir: root });

    const fresh = await checkOpencodeAgents({ rootDir: root });
    assert.equal(fresh.ok, true);
    assert.deepEqual(fresh.orphans, []);

    const target = path.join(resolveOpencodeAgentsDir(root), "architect.md");
    await fs.writeFile(target, "tampered\n", "utf8");
    const stale = await checkOpencodeAgents({ rootDir: root });
    assert.equal(stale.ok, false);
    assert.match(stale.reason, /stale generated agent architect\.md/);

    await fs.rm(target);
    const missing = await checkOpencodeAgents({ rootDir: root });
    assert.equal(missing.ok, false);
    assert.match(missing.reason, /missing generated agent architect\.md/);
  });
});

test("TC-OPENCODE-AGENTS-007: an unmarked custom agent is reported but preserved", async () => {
  await withTempRoot("opencode-agents-orphan-", async (root) => {
    // Given a fresh generated mirror plus a custom file that only mentions the marker in prose.
    await seedSource(root, "architect.md", SOURCE);
    await materializeOpencodeAgents({ rootDir: root });
    await fs.writeFile(
      path.join(resolveOpencodeAgentsDir(root), "handwritten.md"),
      "---\n---\nNotes: <!-- GENERATED MIRROR of .claude/agents/example.md -->\n",
      "utf8",
    );

    // When the mirror is checked and synchronized again.
    const result = await checkOpencodeAgents({ rootDir: root });
    assert.equal(result.ok, true);
    assert.deepEqual(result.orphans, ["handwritten.md"]);

    const second = await materializeOpencodeAgents({ rootDir: root });

    // Then the unowned custom file remains byte-for-byte intact.
    assert.deepEqual(second.deleted, []);
    assert.equal(
      await fs.readFile(path.join(resolveOpencodeAgentsDir(root), "handwritten.md"), "utf8"),
      "---\n---\nNotes: <!-- GENERATED MIRROR of .claude/agents/example.md -->\n",
    );
  });
});

test("TC-OPENCODE-AGENTS-010: a generated agent whose canonical source was deleted fails check and is removed by sync", async () => {
  await withTempRoot("opencode-agents-stale-generated-", async (root) => {
    // Given two canonical agents mirrored into OpenCode and one canonical source removed later.
    await seedSource(root, "architect.md", SOURCE);
    await seedSource(root, "tester.md", ["---", "description: Tests things.", "---", "", "Body."].join("\n"));
    await materializeOpencodeAgents({ rootDir: root });
    await fs.rm(path.join(resolveClaudeAgentsDir(root), "architect.md"));

    // When check observes the marker-owned stale output and sync reconciles it.
    const stale = await checkOpencodeAgents({ rootDir: root });
    assert.equal(stale.ok, false);
    assert.match(stale.reason, /stale generated agent without canonical counterpart: architect\.md/);

    const repaired = await materializeOpencodeAgents({ rootDir: root });

    // Then only the stale generated file is deleted and the mirror becomes clean.
    assert.deepEqual(repaired.deleted, ["architect.md"]);
    await assert.rejects(() => fs.access(path.join(resolveOpencodeAgentsDir(root), "architect.md")), /ENOENT/);
    assert.equal((await checkOpencodeAgents({ rootDir: root })).ok, true);
  });
});

test("TC-OPENCODE-AGENTS-008: materialize refuses an empty canonical agent set", async () => {
  await withTempRoot("opencode-agents-empty-", async (root) => {
    await assert.rejects(
      () => materializeOpencodeAgents({ rootDir: root }),
      /no canonical agents found/
    );
  });
});

test("TC-OPENCODE-AGENTS-009: the committed .opencode/agent mirror is current with .claude/agents", async () => {
  const result = await checkOpencodeAgents({ rootDir: repoRoot });
  assert.equal(result.ok, true, result.reason ?? "mirror must be current");

  const canonical = (await fs.readdir(resolveClaudeAgentsDir(repoRoot))).filter((name) => name.endsWith(".md"));
  const generated = (await fs.readdir(resolveOpencodeAgentsDir(repoRoot))).filter((name) => name.endsWith(".md"));
  assert.equal(generated.length, canonical.length, "one generated agent per canonical agent");
  assert.deepEqual(generated.sort(), canonical.sort());
});
