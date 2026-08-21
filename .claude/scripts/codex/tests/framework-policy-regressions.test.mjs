import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..", "..");

async function read(rel) {
  return fs.readFile(path.join(repoRoot, ...rel.split("/")), "utf8");
}

test("orchestrator tier includes every proven direct-dispatch skill (CR-089)", async () => {
  const source = await read(".claude/scripts/sync-hooks-to-skills.py");
  for (const skill of ["architecture-design", "demo-guide", "feature-presentation", "test"]) {
    assert.match(source, new RegExp(`(?:^|[,\\s])\\"${skill}\\"(?:[,\\s]|$)`));
  }
  assert.match(source, /ORCHESTRATOR_SKILL_BLOCK_ORDER = SKILL_BLOCK_ORDER \+ \["parallel-subagent-dispatch"\]/);
});

test("shared-protocol maintenance documents both skill tiers without fixed inventory counts (CR-095)", async () => {
  const skill = await read(".claude/skills/sync-skills-shared-protocols/SKILL.md");
  assert.match(skill, /ORCHESTRATOR_SKILL_BLOCK_ORDER/);
  assert.match(skill, /on-disk target inventory/);
  assert.doesNotMatch(skill, /all 163 skills|all 29 agents|183 updated/);
});

test("plan metadata is coherent and reference preflight precedes dispatch (CR-092, CR-093)", async () => {
  const [plan, organization, review] = await Promise.all([
    read(".claude/skills/plan/SKILL.md"),
    read(".claude/skills/plan/references/engine-plan-organization.md"),
    read(".claude/skills/plan-review/SKILL.md"),
  ]);
  assert.ok(plan.indexOf("Project-reference preflight — BEFORE dispatch") < plan.indexOf("Research wave — ONE message"));
  for (const content of [plan, organization, review]) {
    assert.match(content, /Mode, Wave, write set, and SEQ dependency/i);
  }
});

test("docs-update reserves spec and generated-doc paths to canonical child skills (CR-096)", async () => {
  const skill = await read(".claude/skills/docs-update/SKILL.md");
  assert.match(skill, /MUST NOT own any `docs\/specs\/\*\*`/);
  assert.match(skill, /explicitly reserved to its child skill/);
  assert.match(skill, /Exclude `docs\/specs\/\*\*`/);
});

test("parallel and adjudication contracts retain fixed-order and exact artifact semantics (CR-024, CR-099..101)", async () => {
  const [canonical, protocol, guide, understand, scale] = await Promise.all([
    read(".claude/skills/shared/sync-inline-versions.md"),
    read(".claude/scripts/lib/hookless-prompt-protocol.cjs"),
    read(".claude/skills/shared/sub-agent-selection-guide.md"),
    read(".claude/skills/understand/SKILL.md"),
    read(".claude/skills/understand/references/scale-protocol.md"),
  ]);
  for (const content of [canonical, protocol]) assert.match(content, /skill or workflow explicitly fixes/i);
  assert.match(guide, /unique exact artifact/i);
  assert.match(understand, /S2.*never assigns fragment ownership/i);
  assert.match(scale, /`[^`]*G\{n\}\.\{axis\}\.md`/);
  for (const verdict of ["SOURCE-WRONG", "TEST-WRONG", "TEST-NOT-OPTIMAL", "ENVIRONMENT-BLOCKED", "AMBIGUOUS"]) {
    assert.match(canonical, new RegExp(verdict));
  }
  assert.match(canonical, /verdict before trace\/edit|provisional verdict[\s\S]{0,160}before touching/i);
});

test("review convergence uses one blocking predicate and byte-identical low-only exit (CR-017, CR-018)", async () => {
  const [canonical, loop] = await Promise.all([
    read(".claude/skills/shared/sync-inline-versions.md"),
    read(".claude/skills/workflow-review-changes-loop/SKILL.md"),
  ]);
  assert.match(canonical, /blocking_findings\(round, findings\)/);
  assert.match(canonical, /binary gate/i);
  assert.match(loop, /ALL LOW/i);
  assert.match(loop, /byte-identical/i);
  assert.match(loop, /changed fingerprint.*re-review/i);

  const reviewCarriers = [
    ".claude/agents/architect.md",
    ".claude/agents/code-reviewer.md",
    ".claude/agents/integration-tester.md",
    ".claude/agents/planner.md",
    ".claude/agents/quality-gate-review.md",
    ".claude/agents/security-auditor.md",
    ".claude/agents/spec-compliance-reviewer.md",
    ".claude/agents/ui-ux-designer.md",
    ".claude/skills/architecture-review-full/SKILL.md",
    ".claude/skills/architecture-review/SKILL.md",
    ".claude/skills/artifact-review/SKILL.md",
    ".claude/skills/changes-review/SKILL.md",
    ".claude/skills/code-review/SKILL.md",
    ".claude/skills/domain-entities-review/SKILL.md",
    ".claude/skills/integration-test-review/SKILL.md",
    ".claude/skills/knowledge-review/SKILL.md",
    ".claude/skills/performance-review/SKILL.md",
    ".claude/skills/plan-review/SKILL.md",
    ".claude/skills/production-readiness-review/SKILL.md",
    ".claude/skills/security-review/SKILL.md",
    ".claude/skills/ui-review/SKILL.md",
    ".claude/skills/why-review/SKILL.md",
  ];
  for (const rel of reviewCarriers) {
    const content = await read(rel);
    assert.match(content, /blocking_findings\(round, findings\)/, rel);
    assert.doesNotMatch(content, /Issues found \(FAIL, or any non-zero findings\)/, rel);
  }
});

test("fan-out skills use capacity waves, unique shards, and one reducer (CR-020..023)", async () => {
  const [scout, discovery, understand, scale, scan] = await Promise.all([
    read(".claude/skills/scout/SKILL.md"),
    read(".claude/skills/spec-discovery/SKILL.md"),
    read(".claude/skills/understand/SKILL.md"),
    read(".claude/skills/understand/references/scale-protocol.md"),
    read(".claude/skills/scan/SKILL.md"),
  ]);
  assert.match(scout, /capacity-bounded wave/i);
  assert.match(scout, /never drop an axis/i);
  assert.match(discovery, /unique (?:artifact|report path)/i);
  assert.match(discovery, /reducer/i);
  assert.match(understand, /S2.*never assigns fragment ownership/i);
  assert.match(scale, /S2 gather agents receive no fragment path/i);
  assert.match(scale, /G\{n\}\.\{axis\}\.md/);
  assert.match(scale, /ORCHESTRATOR spawns axis agents/i);
  assert.match(scale, /Merge shards in SECTION order/i);
  assert.match(scale, /Cap: ≤ 3 axis agents per group/i);
  assert.match(scan, /unique shard/i);
  assert.match(scan, /sole writer/i);
});

test("mutating workflow closures refresh domain-entity references immediately before docs-update (CR-102)", async () => {
  const workflows = JSON.parse(await read(".claude/workflows.json")).workflows;
  for (const id of ["workflow-greenfield-init", "workflow-refactor", "workflow-review-changes"]) {
    const sequence = workflows[id].sequence;
    const scanIndex = sequence.indexOf("scan --target=domain-entities");
    assert.ok(scanIndex >= 0, `${id} must carry the refresh step`);
    assert.equal(sequence[scanIndex + 1], "docs-update");
    assert.match(workflows[id].preActions.domainEntityReferenceRefresh, /cited skip reason/);
  }
});
