/**
 * Content-Presence Test Suite
 *
 * Re-homes the parity guarantees that USED to be enforced by the now-deleted
 * context-injection hooks. Those hooks injected guidance at runtime; the guidance
 * now lives statically in CLAUDE.md / agent .md so a hookless harness (Codex)
 * reads identical instructions. These are GENUINE presence asserts — each FAILS
 * if the relocated guidance goes missing. No tautologies (we assert specific
 * load-bearing phrases, not "file is non-empty").
 *
 * Coverage (what THIS suite asserts today):
 *   TC-CP-001 — CLAUDE.md carries the workflow routing gate + the
 *               path→reference-doc pointer table (backend/frontend/integration/
 *               e2e/spec/scss rows). Replaces the deleted workflow-router injection.
 *   TC-CP-008 — CLAUDE.md carries the full workflow SELECTION catalog (Workflows Index
 *               listing every workflow id from workflows.json) so a hookless read picks
 *               the right workflow WITHOUT the workflow-router.cjs hook. This is the
 *               static-bake half of "Claude has no hooks"; the mirrors (AGENTS.md)
 *               bake the same catalog from the same source.
 *   TC-CP-002 — the universal subagent-bootstrap phrases are present in a
 *               representative sample of agents (one code, one non-code).
 *   TC-CP-003 — agent-code-standards (dev-rules + pattern docs) is present in a
 *               code agent and ABSENT from a non-code agent — the relocated
 *               dev-rules guidance reaches code agents only.
 *   TC-CP-004 — design-system-canonical-guide hook's "read the canonical design-system
 *               doc first for tokens/components/BEM" guidance relocated into the design skill.
 *   TC-CP-005 — figma-context-extractor hook's Figma-URL→MCP extraction commands
 *               relocated into the figma-design skill.
 *   TC-CP-006 — ba-refinement-context hook's DoR / hypothesis-validation BA guidance
 *               relocated into the refine skill.
 *   TC-CP-007 — graph-grep-suggester hook's post-grep "run a graph trace, grep can't find
 *               callers/consumers/events" mandate relocated into the scout skill.
 *
 * The 4 per-context inject hooks (design-system-canonical-guide / figma-context-extractor /
 * ba-refinement-context / graph-grep-suggester) are now presence-asserted by TC-CP-004..007
 * against the verbatim load-bearing phrases their guidance relocated to. A future skill edit
 * that drops a relocated block fails the matching TC, restoring hookless (Codex) parity.
 */

const fs = require('fs');
const path = require('path');
const { assertTrue } = require('../lib/assertions.cjs');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR;
const AGENTS_DIR = path.resolve(PROJECT_DIR, '.claude', 'agents');
const SKILLS_DIR = path.resolve(PROJECT_DIR, '.claude', 'skills');

const readFile = p => fs.readFileSync(p, 'utf8');
const readAgent = name => readFile(path.join(AGENTS_DIR, `${name}.md`));
const readSkill = name => readFile(path.join(SKILLS_DIR, name, 'SKILL.md'));

// Assert a relocated inject-hook's guidance survives in its target skill. Each phrase is a
// verbatim load-bearing fragment of the deleted hook's output — NOT a tautology. Fails loudly
// (naming the deleted hook) if the relocation is dropped, so hookless parity can't silently rot.
const assertRelocated = (deletedHook, skill, phrases) => {
    const body = readSkill(skill);
    const missing = phrases.filter(p => !body.includes(p));
    assertTrue(missing.length === 0,
        `${deletedHook} guidance lost from ${skill}/SKILL.md (relocation regressed):\n  ${missing.join('\n  ')}`);
};

module.exports = {
    name: 'content-presence',
    tests: [
        {
            name: '[content-presence] TC-CP-001 CLAUDE.md carries workflow routing gate + path→doc pointers',
            fn: () => {
                const claudeMd = readFile(path.resolve(PROJECT_DIR, 'CLAUDE.md'));
                const missing = [];
                // Workflow routing gate (Phase 01 — replaces a runtime router injection).
                if (!claudeMd.includes('WORKFLOW-GATE')) missing.push('WORKFLOW-GATE routing header');
                if (!/Path\s*→\s*Reference Doc/.test(claudeMd)) missing.push('Path → Reference Doc table heading');
                // The path→doc pointer rows — each names the reference doc a hook used to inject.
                for (const doc of [
                    'backend-patterns-reference.md',
                    'frontend-patterns-reference.md',
                    'integration-test-reference.md',
                    'e2e-test-reference.md',
                    'spec-system-reference.md',
                ]) {
                    if (!claudeMd.includes(doc)) missing.push(`pointer to ${doc}`);
                }
                assertTrue(missing.length === 0,
                    `CLAUDE.md missing relocated routing guidance:\n  ${missing.join('\n  ')}`);
            },
        },
        {
            name: '[content-presence] TC-CP-008 CLAUDE.md carries the full workflow selection catalog (hook-independent)',
            fn: () => {
                const claudeMd = readFile(path.resolve(PROJECT_DIR, 'CLAUDE.md'));
                const workflowsDoc = JSON.parse(
                    readFile(path.resolve(PROJECT_DIR, '.claude', 'workflows.json'))
                );
                const ids = Object.keys(workflowsDoc.workflows || {});
                const missing = [];
                // The Workflows Index heading — proves the selection catalog (not just the
                // skills-only table) is statically baked into CLAUDE.md.
                if (!/###\s+Workflows Index \(\d+\)/.test(claudeMd)) {
                    missing.push('Workflows Index heading (### Workflows Index (N))');
                }
                // Every workflow id must be selectable from the file alone — no hook required.
                for (const id of ids) {
                    if (!claudeMd.includes(`\`${id}\``)) missing.push(`workflow row for ${id}`);
                }
                assertTrue(missing.length === 0,
                    `CLAUDE.md missing the hook-independent workflow selection catalog:\n  ${missing.join('\n  ')}`);
            },
        },
        {
            name: '[content-presence] TC-CP-002 universal subagent-bootstrap phrases present in sampled agents',
            fn: () => {
                // Sample one code agent + one non-code agent — bootstrap is universal (all 29).
                // The meta-rationale header was removed (no operational value to the agent);
                // assert only the actionable load-bearing guidance.
                const phrases = [
                    'Plan first, then act',               // plan-first
                    'Context guard / progress file',      // progress-file protocol
                    'tmp/ck-agent-',                      // progress-file path contract
                ];
                const missing = [];
                for (const agent of ['backend-developer', 'product-owner']) {
                    const body = readAgent(agent);
                    for (const p of phrases) {
                        if (!body.includes(p)) missing.push(`${agent} → "${p}"`);
                    }
                    // Autonomy was REMOVED in the Phase-03 rework — assert it did not return.
                    if (/run autonomously until the task/.test(body)) {
                        missing.push(`${agent} → autonomy paragraph re-appeared (should be removed)`);
                    }
                }
                assertTrue(missing.length === 0,
                    `subagent-bootstrap guidance drift:\n  ${missing.join('\n  ')}`);
            },
        },
        {
            name: '[content-presence] TC-CP-003 agent-code-standards reaches code agents, not non-code agents',
            fn: () => {
                const codeBody = readAgent('backend-developer');
                const nonCodeBody = readAgent('product-owner');
                const missing = [];
                // Code agent MUST carry dev-rules + pattern-doc guidance. The meta-rationale
                // header was removed; key on the actionable content ("Development rules" lead-in
                // is unique to the code-standards block) instead of a header phrase.
                if (!codeBody.includes('Development rules')) missing.push('code agent missing dev-rules guidance');
                if (!codeBody.includes('backend-patterns-reference.md')) missing.push('code agent missing pattern-doc pointer');
                // Non-code agent MUST NOT carry it — "Development rules" appears only in this block.
                if (nonCodeBody.includes('Development rules')) missing.push('non-code agent LEAKS code-standards guidance');
                assertTrue(missing.length === 0,
                    `agent-code-standards relocation drift:\n  ${missing.join('\n  ')}`);
            },
        },
        {
            name: '[content-presence] TC-CP-004 design-system-canonical guidance relocated into design skill',
            fn: () => assertRelocated('design-system-canonical-guide', 'design', [
                'design-system-canonical.md',
                'first for design tokens, component patterns, and BEM conventions',
            ]),
        },
        {
            name: '[content-presence] TC-CP-005 figma URL→MCP extraction relocated into figma-design skill',
            fn: () => assertRelocated('figma-context-extractor', 'figma-design', [
                'Figma URL Detection & MCP Extraction',
                'mcp__figma__get_file_nodes',
            ]),
        },
        {
            name: '[content-presence] TC-CP-006 ba-refinement DoR/hypothesis guidance relocated into refine skill',
            fn: () => assertRelocated('ba-refinement-context', 'refine', [
                'Definition of Ready',
                'hypothesis validation',
            ]),
        },
        {
            name: '[content-presence] TC-CP-007 graph-grep post-grep trace mandate relocated into scout skill',
            fn: () => assertRelocated('graph-grep-suggester', 'scout', [
                'Post-Grep Trace Trigger',
                'grep CANNOT find',
            ]),
        },
    ],
};
