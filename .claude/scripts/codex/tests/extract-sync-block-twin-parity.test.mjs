import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// PARITY GUARD (M1): .claude/scripts/codex/sync-context-workflows.mjs carries a CRLF-safe
// hand-maintained TWIN of the SYNC-block parser in .claude/scripts/lib/extract-sync-block.cjs.
// The twin DELEGATES to the shared lib when present and only runs its inline fallback in a
// stripped portable Codex consumer where the lib was removed. That fallback can silently
// drift from the canonical lib. This test exercises the fallback IN ISOLATION (with the
// shared-lib reference forced null) and asserts it produces byte-identical output to the lib
// across the entire real canonical corpus + edge cases — so any algorithm drift fails CI.

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, "..", "..", "..", "..");
const libPath = path.join(repoRoot, ".claude", "scripts", "lib", "extract-sync-block.cjs");
const twinPath = path.join(repoRoot, ".claude", "scripts", "codex", "sync-context-workflows.mjs");
const canonicalPath = path.join(repoRoot, ".claude", "skills", "shared", "sync-inline-versions.md");

const require = createRequire(import.meta.url);
const lib = require(libPath);

// Lift the twin's fallback functions verbatim. sync-context-workflows.mjs self-runs main()
// on import, so it cannot be imported as a module — instead extract the two function sources
// and evaluate them in a sandbox with `sharedSyncBlockExtractor` null to force the fallback
// branch. The functions are top-level (closing brace at column 0), so `\n}` terminates each.
function liftTwinFallback(source) {
  const reBlock = /function extractSyncBlock\(markdown, tag\) \{[\s\S]*?\n\}/;
  const reBody = /function extractSyncBody\(markdown, tag\) \{[\s\S]*?\n\}/;
  const blockSrc = source.match(reBlock);
  const bodySrc = source.match(reBody);
  assert.ok(blockSrc, "twin extractSyncBlock source not found — has the function shape changed?");
  assert.ok(bodySrc, "twin extractSyncBody source not found — has the function shape changed?");
  const ctx = { sharedSyncBlockExtractor: null, result: {} };
  vm.createContext(ctx);
  vm.runInContext(
    `${blockSrc[0]}\n${bodySrc[0]}\nresult.extractSyncBlock = extractSyncBlock;\nresult.extractSyncBody = extractSyncBody;`,
    ctx
  );
  return ctx.result;
}

function parseTags(markdown) {
  const tags = [];
  const re = /^## SYNC:(\S+)\s*$/gm;
  let m;
  while ((m = re.exec(markdown)) !== null) tags.push(m[1]);
  return tags;
}

test("codex twin fallback ≡ shared lib over every canonical SYNC tag", async () => {
  const canonical = await fs.readFile(canonicalPath, "utf8");
  const twinSource = await fs.readFile(twinPath, "utf8");
  const twin = liftTwinFallback(twinSource);
  const tags = parseTags(canonical);

  assert.ok(tags.length >= 70, `expected the full canonical corpus, parsed only ${tags.length} tags`);

  for (const tag of tags) {
    assert.equal(
      twin.extractSyncBlock(canonical, tag),
      lib.extractSyncBlock(canonical, tag),
      `extractSyncBlock drift for tag "${tag}"`
    );
    assert.equal(
      twin.extractSyncBody(canonical, tag),
      lib.extractSyncBody(canonical, tag),
      `extractSyncBody drift for tag "${tag}"`
    );
  }
});

test("shared lib extracts a whole-line block for every canonical tag", async () => {
  const canonical = await fs.readFile(canonicalPath, "utf8");
  const tags = parseTags(canonical);

  for (const tag of tags) {
    const block = lib.extractSyncBlock(canonical, tag);
    assert.ok(block !== null, `tag "${tag}" did not resolve to a block`);
    // The block must begin with EXACTLY this tag's heading line, never a suffixed sibling's.
    assert.ok(
      block.startsWith(`## SYNC:${tag}\n`) || block === `## SYNC:${tag}`,
      `tag "${tag}" resolved to a block whose heading is not the exact tag line`
    );
  }
});

test("whole-line match rejects prefix-collision false positives (lib and twin)", async () => {
  const canonical = await fs.readFile(canonicalPath, "utf8");
  const twin = liftTwinFallback(await fs.readFile(twinPath, "utf8"));

  // Real prefix-collision pairs in the canonical source: base tag is a literal prefix of a
  // longer sibling that differs by ':' (suffix tier) or '-' (distinct tag). The base block
  // must NOT swallow the sibling's heading.
  const pairs = [
    ["critical-thinking-mindset", "critical-thinking-mindset:full"],
    ["ai-mistake-prevention", "ai-mistake-prevention:full"],
    ["cross-service-check", "cross-service-check:reminder"],
    ["ui-wireframe", "ui-wireframe-protocol"],
  ];

  for (const [base, sibling] of pairs) {
    for (const extractor of [lib, twin]) {
      const baseBlock = extractor.extractSyncBlock(canonical, base);
      assert.ok(baseBlock !== null, `base tag "${base}" missing`);
      assert.ok(
        baseBlock.startsWith(`## SYNC:${base}\n`),
        `base tag "${base}" did not anchor to its own heading line`
      );
      assert.ok(
        !baseBlock.includes(`## SYNC:${sibling}`),
        `base tag "${base}" leaked into sibling "${sibling}"`
      );
    }
  }
});

test("twin fallback matches lib on edge cases (missing tag, CRLF, EOF block)", async () => {
  const twin = liftTwinFallback(await fs.readFile(twinPath, "utf8"));

  const sample = [
    "## SYNC:alpha",
    "alpha body",
    "",
    "---",
    "",
    "## SYNC:alpha:full",
    "alpha full body",
    "",
    "---",
    "",
    "## SYNC:omega",
    "last block body, no trailing separator",
  ].join("\n");
  const crlf = sample.replace(/\n/g, "\r\n");

  for (const tag of ["alpha", "alpha:full", "omega", "does-not-exist"]) {
    assert.equal(twin.extractSyncBlock(sample, tag), lib.extractSyncBlock(sample, tag), `LF block "${tag}"`);
    assert.equal(twin.extractSyncBody(sample, tag), lib.extractSyncBody(sample, tag), `LF body "${tag}"`);
    assert.equal(twin.extractSyncBlock(crlf, tag), lib.extractSyncBlock(crlf, tag), `CRLF block "${tag}"`);
    assert.equal(twin.extractSyncBody(crlf, tag), lib.extractSyncBody(crlf, tag), `CRLF body "${tag}"`);
  }

  // Base "alpha" must not swallow "alpha:full"; CRLF must normalize identically.
  assert.equal(lib.extractSyncBlock(sample, "alpha"), "## SYNC:alpha\nalpha body");
  assert.equal(lib.extractSyncBlock(crlf, "alpha"), "## SYNC:alpha\nalpha body");
  assert.equal(lib.extractSyncBlock(sample, "does-not-exist"), null);
});
