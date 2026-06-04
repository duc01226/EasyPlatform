/**
 * Agent Universal-Rules Coverage Test Suite
 *
 * Guards the invariant that every custom Claude sub-agent (.claude/agents/*.md)
 * carries its tier's universal SYNC blocks — the behavioral rules propagated by
 * `.claude/scripts/sync-hooks-to-skills.py`. Without this, an agent silently
 * drops a rule on edit, or a NEW agent is added with no tier decision.
 *
 * Tiers (MUST mirror the inserter's constants exactly — single invariant, two
 * enforcers: sync-hooks-to-skills.py and this suite):
 *   - CORE          : 6 blocks — every agent.
 *   - READONLY_CODE : CORE + 2 reading-discipline blocks (understand-code-first,
 *                     evidence-based-reasoning) — read-only/design agents that
 *                     locate/read/design code but never fix a layer or cross a
 *                     service boundary. EXCLUDES cross-service-check +
 *                     fix-layer-accountability.
 *   - CODE          : CORE + 4 code-investigation blocks (READONLY_CODE's 2 PLUS
 *                     cross-service-check + fix-layer-accountability) — agents
 *                     that read/review AND fix code.
 *   - CODE_STANDARDS : agent-code-standards (dev-rules + pattern pointers) — gated
 *                    on a SEPARATE axis (CODE_STANDARDS_AGENTS) from the tier sets.
 *                    An agent may be READONLY_CODE (reads/locates code) yet NOT
 *                    code-standards (researcher/scout/ui-ux-designer don't author/review code).
 *
 * Tests:
 *   A (TC-UAR-003) — every agent carries all Core-6 open+close tags.
 *   B (TC-UAR-004) — each CODE agent carries all 4 code tags; each READONLY_CODE
 *                    agent carries the 2 reading-discipline tags but NEITHER
 *                    mutation tag; each core-only agent carries NONE of the 4.
 *   C (TC-UAR-005) — disk agent set == CODE_AGENTS ∪ READONLY_CODE_AGENTS ∪
 *                    CORE_ONLY_AGENTS, pairwise disjoint (a new/renamed agent fails
 *                    until classified — same fail-loud rule as the inserter).
 *   D (TC-UAR-006) — SYNC open/close balance per agent.
 *   E (TC-UAR-007) — agent-code-standards present iff agent ∈ CODE_STANDARDS_AGENTS
 *                    (present in every code-standards agent, ABSENT from every other).
 *   F (TC-UAR-008) — SYNC open/close balance per skill (every .claude/skills SKILL.md).
 *                    Same col-0 fence invariant as D — skills inject the same shared
 *                    SYNC blocks, but no generator owns every skill block, so this
 *                    test suite is the only guard against a malformed/unbalanced fence
 *                    (e.g. a blockquote-indented open) silently shipping in a skill.
 *   G (TC-UAR-009) — code-rule pairing per skill: any SKILL.md carrying
 *                    understand-code-first (full OR :reminder) MUST also carry
 *                    evidence-based-reasoning (full OR :reminder). Code-investigation
 *                    skills hand-curate these two blocks together (the propagator caps
 *                    skills at 2 managed blocks), so this is the only guard against the
 *                    pair drifting apart on edit.
 *   H (TC-UAR-010) — web-research domain block: web-research/SKILL.md MUST carry its
 *                    own SYNC:web-research block (regression guard — the skill's
 *                    primary-behavior protocol must not silently drop on edit).
 *   I (TC-UAR-011) — canonical reminder parity: files carrying managed reminder
 *                    blocks match sync-inline-versions.md exactly.
 *   J (TC-UAR-012) — universal AI mistake prevention blocks/digests stay
 *                    role-neutral; code/debug/fix wording belongs in code-tier
 *                    protocols, not the universal block.
 *   K (TC-UAR-013) — protocol digest aliases must not claim absent managed
 *                    SYNC blocks are in force.
 *   L (TC-UAR-014) — scaffold production-readiness wording stays aligned to
 *                    the canonical 5-foundation protocol.
 *   M (TC-UAR-015) — review-cycle protocols stay limited to agents whose role
 *                    includes review/fix-cycle validation.
 *   N (TC-UAR-016) — off-role protocol trim pins: architect carries NO
 *                    source-test-drift-check / scaffold-production-readiness;
 *                    refine carries NO scaffold-production-readiness /
 *                    cross-cutting-quality; test-ui carries NO source-test-drift-check.
 *                    Confirms the user-validated KEEPS survive: architect &
 *                    solution-architect keep fix-layer-accountability; architect &
 *                    ui-ux-designer keep graph-assisted-investigation. Guards the
 *                    four surgical trims from silently regressing on a future
 *                    matrix/agent edit.
 */

const fs = require('fs');
const path = require('path');
const { assertEqual, assertTrue } = require('../lib/assertions.cjs');

const AGENTS_DIR = path.resolve(process.env.CLAUDE_PROJECT_DIR, '.claude', 'agents');
const SKILLS_DIR = path.resolve(process.env.CLAUDE_PROJECT_DIR, '.claude', 'skills');
const SYNC_INLINE_PATH = path.resolve(process.env.CLAUDE_PROJECT_DIR, '.claude', 'skills', 'shared', 'sync-inline-versions.md');

// ── Tier constants — mirror sync-hooks-to-skills.py tier sets verbatim ────────
const CORE_TAGS = [
    'critical-thinking-mindset',
    'ai-mistake-prevention',
    'sequential-thinking-protocol',
    'task-tracking-external-report',
    'project-reference-docs-guide',
    'agent-bootstrap',
];
// CODE_TAGS splits into two axes for the readonly-code sub-tier:
//   READONLY_CODE_TAGS — shared by CODE and READONLY_CODE agents (reading discipline).
//   MUTATION_CODE_TAGS — CODE agents ONLY; readonly-code agents must NOT carry them.
const READONLY_CODE_TAGS = [
    'understand-code-first',
    'evidence-based-reasoning',
];
const MUTATION_CODE_TAGS = [
    'cross-service-check',
    'fix-layer-accountability',
];
const CODE_TAGS = [...READONLY_CODE_TAGS, ...MUTATION_CODE_TAGS];
const CODE_AGENTS = new Set([
    'architect', 'backend-developer', 'code-reviewer', 'code-simplifier',
    'database-admin', 'debugger', 'e2e-runner', 'framework-maintainer', 'frontend-developer',
    'fullstack-developer', 'integration-tester', 'performance-optimizer',
    'planner', 'security-auditor',
    'solution-architect', 'spec-compliance-reviewer', 'tester',
]);
// Read-only/design agents: READONLY_CODE_TAGS only, NOT MUTATION_CODE_TAGS.
const READONLY_CODE_AGENTS = new Set([
    'researcher', 'scout', 'scout-external', 'ui-ux-designer',
]);
const CORE_ONLY_AGENTS = new Set([
    'business-analyst', 'docs-manager', 'git-manager', 'journal-writer',
    'knowledge-worker', 'product-owner', 'project-manager', 'quality-gate-review',
]);
// agent-code-standards audience — SEPARATE axis (mirror sync-hooks-to-skills.py
// CODE_STANDARDS_AGENTS verbatim). NOT the same set as CODE_AGENTS.
const CODE_STANDARDS_AGENTS = new Set([
    'architect', 'backend-developer', 'code-reviewer', 'code-simplifier',
    'database-admin', 'debugger', 'e2e-runner', 'framework-maintainer',
    'frontend-developer', 'fullstack-developer', 'integration-tester',
    'performance-optimizer', 'planner', 'security-auditor', 'solution-architect',
    'spec-compliance-reviewer', 'tester',
]);
const REVIEW_CYCLE_TAGS = [
    'fresh-context-review',
    'double-round-trip-review',
    'review-protocol-injection',
];
const REVIEW_CYCLE_AGENTS = new Set([
    'architect',
    'code-reviewer',
    'integration-tester',
    'planner',
    'quality-gate-review',
    'security-auditor',
    'spec-compliance-reviewer',
    'ui-ux-designer',
]);

const diskAgents = fs
    .readdirSync(AGENTS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace(/\.md$/, ''));

const read = name => fs.readFileSync(path.join(AGENTS_DIR, `${name}.md`), 'utf8');
const hasBlock = (body, tag) =>
    body.includes(`<!-- SYNC:${tag} -->`) && body.includes(`<!-- /SYNC:${tag} -->`);

// Skills carrying a SKILL.md (a subdir like `shared/` without one is excluded).
const skillNames = fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && fs.existsSync(path.join(SKILLS_DIR, d.name, 'SKILL.md')))
    .map(d => d.name);
const readSkill = name => fs.readFileSync(path.join(SKILLS_DIR, name, 'SKILL.md'), 'utf8');
const instructionDocs = () => [
    ...diskAgents.map(name => ({ kind: 'agent', name, body: read(name) })),
    ...skillNames.map(name => ({ kind: 'skill', name, body: readSkill(name) })),
];

const canonicalBody = tag => {
    const source = fs.readFileSync(SYNC_INLINE_PATH, 'utf8');
    const match = new RegExp(`^## ${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n([\\s\\S]*?)(?=^---\\s*$)`, 'm').exec(source);
    assertTrue(Boolean(match), `canonical block not found: ${tag}`);
    return match[1].trim();
};

const blockBody = (body, tag) => {
    const match = new RegExp(`<!-- ${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} -->\\s*([\\s\\S]*?)\\s*<!-- /${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} -->`).exec(body);
    return match ? match[1].trim() : null;
};

const aiMistakeDigestLines = body => body
    .split(/\r?\n/)
    .filter(line => line.includes('AI Mistake Prevention:'));

const codeSpecificAiMistakePattern = /\b(holistic[- ]first|debugging|debug\b|fix(?:es|ing)?\s+(?:at|the|responsible|owning)|owning layer|responsible layer|surgical diff|surgical diffs|symptom site|crash site)\b/i;
const managedProtocolDigestAliases = new Map([
    ['Cross-Cutting Quality', 'SYNC:cross-cutting-quality'],
    ['Scaffold Production Readiness', 'SYNC:scaffold-production-readiness'],
    ['Source Test Drift', 'SYNC:source-test-drift-check'],
    ['Source-Test Drift Check', 'SYNC:source-test-drift-check'],
    ['UI System Context', 'SYNC:ui-system-context'],
    ['End-to-Start Debugger Trace', 'SYNC:end-to-start-debugger-trace'],
    ['Fix-Layer Accountability', 'SYNC:fix-layer-accountability'],
]);
const protocolDigestLinePattern = /^\s*-\s+\*\*([^:*]+):\*\*/;

// Count ONLY real fences at column 0 (multiline-anchored). A block body may
// document the fence syntax inline — e.g. the shared-protocol-duplication-policy
// body contains a backtick-wrapped `<!-- SYNC:tag -->` example mid-line. That is
// prose, not a fence, and must not skew the balance. Every authored fence is
// emitted at line-start by sync-hooks-to-skills.py / the skill+agent injectors,
// so `^` is exact — a genuinely missing or indented close is still caught.
const fenceBalance = body => ({
    opens: (body.match(/^<!-- SYNC:/gm) || []).length,
    closes: (body.match(/^<!-- \/SYNC:/gm) || []).length,
});

module.exports = {
    name: 'agent-universal-rules',
    tests: [
        {
            name: '[agent-universal-rules] TC-UAR-003 every agent carries all Core-6 open+close tags',
            fn: () => {
                const missing = [];
                for (const name of diskAgents) {
                    const body = read(name);
                    for (const tag of CORE_TAGS) {
                        if (!hasBlock(body, tag)) missing.push(`${name} → ${tag}`);
                    }
                }
                assertEqual(missing.length, 0, `agents missing Core-6 blocks:\n  ${missing.join('\n  ')}`);
            },
        },
        {
            name: '[agent-universal-rules] TC-UAR-004 code agents carry all 4 code tags; readonly-code carry 2 reading tags but not the 2 mutation tags; core-only carry none',
            fn: () => {
                const problems = [];
                for (const name of diskAgents) {
                    const isCode = CODE_AGENTS.has(name);
                    const isReadonly = READONLY_CODE_AGENTS.has(name);
                    const isCore = CORE_ONLY_AGENTS.has(name);
                    if (!isCode && !isReadonly && !isCore) continue; // Test C owns this
                    const body = read(name);
                    // Reading-discipline tags: CODE + READONLY_CODE must carry; core-only must not.
                    for (const tag of READONLY_CODE_TAGS) {
                        const present = hasBlock(body, tag);
                        if ((isCode || isReadonly) && !present) problems.push(`${isCode ? 'code' : 'readonly-code'} agent ${name} MISSING ${tag}`);
                        if (isCore && present) problems.push(`core-only agent ${name} LEAKS ${tag}`);
                    }
                    // Mutation tags: CODE only; readonly-code AND core-only must NOT carry.
                    for (const tag of MUTATION_CODE_TAGS) {
                        const present = hasBlock(body, tag);
                        if (isCode && !present) problems.push(`code agent ${name} MISSING ${tag}`);
                        if (isReadonly && present) problems.push(`readonly-code agent ${name} LEAKS mutation tag ${tag}`);
                        if (isCore && present) problems.push(`core-only agent ${name} LEAKS ${tag}`);
                    }
                }
                assertEqual(problems.length, 0, `code-tier violations:\n  ${problems.join('\n  ')}`);
            },
        },
        {
            name: '[agent-universal-rules] TC-UAR-005 disk agent set == classified set, pairwise disjoint (new-agent guard)',
            fn: () => {
                // Pairwise disjointness across all three tier sets.
                const overlap = (a, b) => [...a].filter(x => b.has(x));
                const codeReadonly = overlap(CODE_AGENTS, READONLY_CODE_AGENTS);
                const codeCore = overlap(CODE_AGENTS, CORE_ONLY_AGENTS);
                const readonlyCore = overlap(READONLY_CODE_AGENTS, CORE_ONLY_AGENTS);
                assertEqual(codeReadonly.length, 0, `agents in BOTH CODE and READONLY_CODE: ${codeReadonly.join(', ')}`);
                assertEqual(codeCore.length, 0, `agents in BOTH CODE and CORE_ONLY: ${codeCore.join(', ')}`);
                assertEqual(readonlyCore.length, 0, `agents in BOTH READONLY_CODE and CORE_ONLY: ${readonlyCore.join(', ')}`);

                const classified = new Set([...CODE_AGENTS, ...READONLY_CODE_AGENTS, ...CORE_ONLY_AGENTS]);
                const unclassified = diskAgents.filter(a => !classified.has(a));
                assertEqual(
                    unclassified.length, 0,
                    `unclassified agent(s) on disk — add to CODE_AGENTS, READONLY_CODE_AGENTS, or CORE_ONLY_AGENTS in this suite AND sync-hooks-to-skills.py: ${unclassified.join(', ')}`,
                );

                const onDisk = new Set(diskAgents);
                const ghosts = [...classified].filter(a => !onDisk.has(a));
                assertEqual(
                    ghosts.length, 0,
                    `classified agent(s) not on disk (renamed/deleted?): ${ghosts.join(', ')}`,
                );
            },
        },
        {
            name: '[agent-universal-rules] TC-UAR-006 SYNC open/close tags balance per agent',
            fn: () => {
                const unbalanced = [];
                for (const name of diskAgents) {
                    const { opens, closes } = fenceBalance(read(name));
                    if (opens !== closes) unbalanced.push(`${name}: ${opens} open / ${closes} close`);
                }
                assertTrue(unbalanced.length === 0, `unbalanced SYNC tags:\n  ${unbalanced.join('\n  ')}`);
            },
        },
        {
            name: '[agent-universal-rules] TC-UAR-008 SYNC open/close tags balance per skill',
            fn: () => {
                assertTrue(skillNames.length > 0, `no SKILL.md files found under ${SKILLS_DIR}`);
                const unbalanced = [];
                for (const name of skillNames) {
                    const { opens, closes } = fenceBalance(readSkill(name));
                    if (opens !== closes) unbalanced.push(`${name}: ${opens} open / ${closes} close`);
                }
                assertTrue(unbalanced.length === 0, `unbalanced SYNC tags in skills:\n  ${unbalanced.join('\n  ')}`);
            },
        },
        {
            name: '[agent-universal-rules] TC-UAR-007 agent-code-standards present iff agent in CODE_STANDARDS_AGENTS',
            fn: () => {
                const problems = [];
                for (const name of diskAgents) {
                    const present = hasBlock(read(name), 'agent-code-standards');
                    const expected = CODE_STANDARDS_AGENTS.has(name);
                    if (expected && !present) problems.push(`code-standards agent ${name} MISSING agent-code-standards`);
                    if (!expected && present) problems.push(`non-code-standards agent ${name} LEAKS agent-code-standards`);
                }
                assertEqual(problems.length, 0, `agent-code-standards gating violations:\n  ${problems.join('\n  ')}`);

                // CODE_STANDARDS_AGENTS must all exist on disk (catch rename/delete).
                const onDisk = new Set(diskAgents);
                const ghosts = [...CODE_STANDARDS_AGENTS].filter(a => !onDisk.has(a));
                assertEqual(ghosts.length, 0, `CODE_STANDARDS_AGENTS not on disk: ${ghosts.join(', ')}`);
            },
        },
        {
            name: '[agent-universal-rules] TC-UAR-009 skills with understand-code-first also carry evidence-based-reasoning',
            fn: () => {
                // Prefix match catches both the full block (`<!-- SYNC:tag -->`) and the
                // condensed reminder (`<!-- SYNC:tag:reminder -->`). A code-investigation
                // skill that demands code reading must also demand evidence discipline.
                const missing = [];
                for (const name of skillNames) {
                    const body = readSkill(name);
                    const hasUnderstand = body.includes('<!-- SYNC:understand-code-first');
                    if (!hasUnderstand) continue;
                    const hasEvidence = body.includes('<!-- SYNC:evidence-based-reasoning');
                    if (!hasEvidence) missing.push(name);
                }
                assertEqual(
                    missing.length, 0,
                    `skill(s) carry understand-code-first but NOT evidence-based-reasoning (add the EBR block — full or :reminder):\n  ${missing.join('\n  ')}`,
                );
            },
        },
        {
            name: '[agent-universal-rules] TC-UAR-010 web-research carries its own SYNC:web-research domain block',
            fn: () => {
                const body = readSkill('web-research');
                assertTrue(
                    body.includes('<!-- SYNC:web-research'),
                    'web-research/SKILL.md is missing its own SYNC:web-research domain block',
                );
            },
        },
        {
            name: '[agent-universal-rules] TC-UAR-011 managed reminder bodies match canonical sync-inline source',
            fn: () => {
                const checkedTags = ['SYNC:critical-thinking-mindset:reminder', 'SYNC:ai-mistake-prevention:reminder'];
                const problems = [];
                for (const tag of checkedTags) {
                    const expected = canonicalBody(tag);
                    for (const doc of instructionDocs()) {
                        const actual = blockBody(doc.body, tag);
                        if (actual === null) continue;
                        if (actual !== expected) problems.push(`${doc.kind}:${doc.name} ${tag}`);
                    }
                }
                assertEqual(
                    problems.length,
                    0,
                    `managed reminder block(s) drift from canonical sync-inline source:\n  ${problems.join('\n  ')}`,
                );
            },
        },
        {
            name: '[agent-universal-rules] TC-UAR-012 universal AI mistake prevention stays role-neutral',
            fn: () => {
                const problems = [];
                for (const doc of instructionDocs()) {
                    for (const tag of ['SYNC:ai-mistake-prevention', 'SYNC:ai-mistake-prevention:reminder']) {
                        const actual = blockBody(doc.body, tag);
                        if (actual !== null && codeSpecificAiMistakePattern.test(actual)) {
                            problems.push(`${doc.kind}:${doc.name} ${tag}`);
                        }
                    }
                    for (const line of aiMistakeDigestLines(doc.body)) {
                        if (codeSpecificAiMistakePattern.test(line)) {
                            problems.push(`${doc.kind}:${doc.name} digest: ${line.trim()}`);
                        }
                    }
                }
                assertEqual(
                    problems.length,
                    0,
                    `universal AI mistake prevention carries code/debug-specific wording:\n  ${problems.join('\n  ')}`,
                );
            },
        },
        {
            name: '[agent-universal-rules] TC-UAR-013 protocol digest aliases require matching managed SYNC blocks',
            fn: () => {
                const problems = [];
                for (const doc of instructionDocs()) {
                    for (const line of doc.body.split(/\r?\n/)) {
                        const digestMatch = protocolDigestLinePattern.exec(line);
                        if (!digestMatch) continue;

                        const tag = managedProtocolDigestAliases.get(digestMatch[1]);
                        if (!tag) continue;

                        if (blockBody(doc.body, tag) === null) {
                            problems.push(`${doc.kind}:${doc.name} digest references absent ${tag}: ${line.trim()}`);
                        }
                    }
                }
                assertEqual(
                    problems.length,
                    0,
                    `protocol digest references absent managed block(s):\n  ${problems.join('\n  ')}`,
                );
            },
        },
        {
            name: '[agent-universal-rules] TC-UAR-014 scaffold production-readiness wording uses 5 foundations',
            fn: () => {
                const scaffold = readSkill('scaffold');
                assertTrue(
                    scaffold.includes('Every scaffolded project MUST ATTENTION include these 5 foundations'),
                    'scaffold quick-reference must state 5 production-readiness foundations',
                );
                assertTrue(
                    scaffold.includes('### 5. Integration Points'),
                    'scaffold quick-reference must include integration points as foundation 5',
                );
                assertEqual(
                    /\b(?:all\s+)?4 foundations\b/i.test(scaffold),
                    false,
                    'scaffold must not retain stale 4-foundation wording',
                );
            },
        },
        {
            name: '[agent-universal-rules] TC-UAR-015 review-cycle protocols stay on review-capable agents',
            fn: () => {
                const problems = [];
                for (const name of diskAgents) {
                    const body = read(name);
                    const carried = REVIEW_CYCLE_TAGS.filter(tag => hasBlock(body, tag));
                    if (carried.length > 0 && !REVIEW_CYCLE_AGENTS.has(name)) {
                        problems.push(`${name}: ${carried.join(', ')}`);
                    }
                }
                assertEqual(
                    problems.length,
                    0,
                    `review-cycle protocol(s) assigned to non-review agent(s):\n  ${problems.join('\n  ')}`,
                );
            },
        },
        {
            name: '[agent-universal-rules] TC-UAR-016 off-role protocol trims stay removed; validated keeps stay present',
            fn: () => {
                const problems = [];

                // Removed off-role blocks (body + :reminder + digest must all be gone).
                const removed = [
                    { kind: 'agent', name: 'architect', tag: 'source-test-drift-check', labels: ['Source-Test Drift Check', 'Source Test Drift'] },
                    { kind: 'agent', name: 'architect', tag: 'scaffold-production-readiness', label: 'Scaffold Production Readiness' },
                    { kind: 'skill', name: 'refine', tag: 'scaffold-production-readiness', label: 'Scaffold Production Readiness' },
                    { kind: 'skill', name: 'refine', tag: 'cross-cutting-quality', label: 'Cross-Cutting Quality' },
                    { kind: 'skill', name: 'test-ui', tag: 'source-test-drift-check', labels: ['Source-Test Drift Check', 'Source Test Drift'] },
                ];
                for (const { kind, name, tag, label, labels } of removed) {
                    const body = kind === 'agent' ? read(name) : readSkill(name);
                    if (body.includes(`SYNC:${tag}`)) {
                        problems.push(`${kind}:${name} still carries SYNC:${tag} (must be trimmed)`);
                    }
                    for (const digestLabel of labels || [label]) {
                        if (body.includes(`- **${digestLabel}:**`)) {
                            problems.push(`${kind}:${name} still carries Closing-Reminders digest "${digestLabel}" (must be trimmed)`);
                        }
                    }
                }

                // User-validated keeps — these blocks MUST remain on their owning files.
                const kept = [
                    { name: 'architect', tag: 'fix-layer-accountability' },
                    { name: 'solution-architect', tag: 'fix-layer-accountability' },
                    { name: 'architect', tag: 'graph-assisted-investigation' },
                    { name: 'ui-ux-designer', tag: 'graph-assisted-investigation' },
                ];
                for (const { name, tag } of kept) {
                    if (!hasBlock(read(name), tag)) {
                        problems.push(`agent:${name} lost required keep SYNC:${tag}`);
                    }
                }

                assertEqual(
                    problems.length,
                    0,
                    `off-role-trim regression:\n  ${problems.join('\n  ')}`,
                );
            },
        },
    ],
};
