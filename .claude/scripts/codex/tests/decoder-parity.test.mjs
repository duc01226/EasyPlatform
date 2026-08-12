import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, "..", "..", "..", "..");

// The YAML-frontmatter scalar decoder is independently reimplemented in THREE scripts. Each renders
// skill descriptions onto a different surface — CLAUDE.md/AGENTS.md (workflow-skills-catalog.cjs),
// the Codex mirrors (migrate-claude-to-codex.mjs), and the GC report (skill-gc.cjs) — so any
// divergence makes the SAME description render differently depending on which surface you read.
//
// That is not hypothetical: stripQuotes() de-wrapped double-quoted scalars WITHOUT decoding their
// backslash escapes while the other two decoded them, so `"a \"quoted\" path"` reached the Codex
// mirror as `a \"quoted\" path`. It went unnoticed because each script was only ever tested through
// its own output, never against its siblings.
//
// None of the three is exported (all are private module-locals, and PORT-001 bars the codex
// pipeline from importing across the tree anyway), so parity is proven by extracting each function
// from source and running one shared case table through all of them.
const DECODERS = [
  ["unquote", path.join(repoRoot, ".claude", "scripts", "lib", "workflow-skills-catalog.cjs")],
  ["unquoteYamlScalar", path.join(repoRoot, ".claude", "scripts", "skill-gc.cjs")],
  ["stripQuotes", path.join(repoRoot, ".claude", "scripts", "codex", "migrate-claude-to-codex.mjs")],
];

function extractDecoder(name, file) {
  const src = fs.readFileSync(file, "utf8");
  const start = src.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name}() not found in ${path.relative(repoRoot, file)} — was it renamed or extracted? Update DECODERS.`);
  const end = src.indexOf("\n}", start);
  assert.notEqual(end, -1, `no top-level closing brace for ${name}() in ${path.relative(repoRoot, file)}`);
  return new Function(`${src.slice(start, end + 2)}; return ${name};`)();
}

// Every case states the CORRECT decoding, so agreement can never be satisfied by all three being
// identically wrong.
const CASES = [
  ["single-quoted apostrophe", "'a bug''s root cause'", "a bug's root cause"],
  ["double-quoted escaped quote", '"Use the \\"quoted\\" path"', 'Use the "quoted" path'],
  ["double-quoted escaped slash", '"a\\/b"', "a/b"],
  ["double-quoted escaped backslash", '"a\\\\b"', "a\\b"],
  ["plain scalar untouched", "Use when nothing needs escaping", "Use when nothing needs escaping"],
  ["plain scalar is trimmed", "  spaced  ", "spaced"],
  ["single-quoted inner padding trimmed", "'trailing  '", "trailing"],
  ["quote-like but unwrapped", "it's fine", "it's fine"],
];

test("TC-DEC-001 all three YAML scalar decoders agree, and decode correctly", () => {
  const decoders = DECODERS.map(([name, file]) => [name, extractDecoder(name, file)]);
  assert.equal(decoders.length, 3, "expected exactly three decoder copies");

  for (const [label, input, expected] of CASES) {
    for (const [name, fn] of decoders) {
      assert.equal(
        fn(input),
        expected,
        `${name}() disagrees on "${label}": ${JSON.stringify(input)} -> ${JSON.stringify(fn(input))}, expected ${JSON.stringify(expected)}`
      );
    }
  }
});

// A parity comparator that cannot fail proves nothing. This asserts the check above actually KILLS
// a divergent implementation — the guard against the whole test silently degrading to a no-op.
test("TC-DEC-002 MUTATION PROBE: the parity check kills a de-wrap-only decoder", () => {
  const dewrapOnly = (value) => {
    const s = String(value).trim();
    if (s.length < 2) return s;
    if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
      return s.slice(1, -1).trim();
    }
    return s;
  };
  const survived = CASES.filter(([, input, expected]) => dewrapOnly(input) === expected);
  assert.ok(
    survived.length < CASES.length,
    "the de-wrap-only mutant passed every case — the case table no longer discriminates"
  );
});

// TC-DEC-003 — the decoders are only half the contract. TC-WSC-007 proves the BUILDER emits no
// artifact, but it recomputes the catalog in memory; it passes happily while the bytes actually
// shipped in CLAUDE.md/AGENTS.md still carry the leak. This pins the shipped bytes.
test("TC-DEC-003 shipped catalog surfaces carry no YAML escape artifacts", () => {
  const START = "<!-- CK:WORKFLOW-SKILLS -->";
  const END = "<!-- /CK:WORKFLOW-SKILLS -->";
  const surfaces = ["CLAUDE.md", "AGENTS.md", path.join(".codex", "CODEX_CONTEXT.md")];

  let checked = 0;
  for (const rel of surfaces) {
    const abs = path.join(repoRoot, rel);
    if (!fs.existsSync(abs)) continue;
    const body = fs.readFileSync(abs, "utf8");
    const from = body.indexOf(START);
    const to = body.indexOf(END, from + 1);
    if (from === -1 || to === -1) continue;
    checked++;
    const offenders = body
      .slice(from, to)
      .split("\n")
      .filter((line) => line.startsWith("| `") && /''|\\"/.test(line));
    assert.deepEqual(
      offenders,
      [],
      `${rel} catalog rows still carry a YAML escape artifact — regenerate via /sync-codex:\n${offenders.join("\n")}`
    );
  }
  // Tripwire: a guard that quietly stops finding its subject passes by doing nothing.
  assert.ok(checked >= 2, `expected to check at least 2 catalog surfaces, checked ${checked}`);
});
