import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, "..", "..", "..", "..");
const require = createRequire(import.meta.url);

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
// `stripQuotes` now lives in the shared `.claude/scripts/lib/agent-frontmatter.mjs` owner, which the
// Codex migration imports (it previously carried a private copy). All three are still proven by
// extracting each function from source and running one shared case table through them, so the parity
// proof keeps testing every decoder through the SAME path rather than trusting an export.
const DECODERS = [
  ["unquote", path.join(repoRoot, ".claude", "scripts", "lib", "workflow-skills-catalog.cjs")],
  ["unquoteYamlScalar", path.join(repoRoot, ".claude", "scripts", "skill-gc.cjs")],
  ["stripQuotes", path.join(repoRoot, ".claude", "scripts", "lib", "agent-frontmatter.mjs")],
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

test("TC-DEC-003 runtime workflow catalog carries no YAML escape artifacts", () => {
  const { buildWorkflowSkillsCatalog } = require(path.join(repoRoot, ".claude", "scripts", "lib", "workflow-skills-catalog.cjs"));
  const body = buildWorkflowSkillsCatalog({ rootDir: repoRoot, sections: ["workflows", "skills"] });
  const offenders = body.split("\n").filter((line) => line.startsWith("| `") && /''|\\"/.test(line));
  assert.deepEqual(offenders, [], `runtime catalog rows carry YAML escape artifacts:\n${offenders.join("\n")}`);
  for (const rel of ["CLAUDE.md", "AGENTS.md"]) {
    const abs = path.join(repoRoot, rel);
    if (fs.existsSync(abs)) assert.doesNotMatch(fs.readFileSync(abs, "utf8"), /<!-- CK:WORKFLOW-SKILLS -->/);
  }
});
