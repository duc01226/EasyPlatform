/**
 * Agent Universal-Rules Coverage Test Suite
 *
 * Guards the invariant that every custom Claude sub-agent (.claude/agents/*.md)
 * carries its tier's universal SYNC blocks — the behavioral rules propagated by
 * `.claude/scripts/sync-hooks-to-skills.py`. Without this, an agent silently
 * drops a rule on edit, or a NEW agent is added with no tier decision.
 *
 * The universal protocols (the `universal` group of protocol-groups.json) are NOT tier blocks:
 * the universal hook delivers them and no agent carries any part of them (TC-UAR-011). `task-tracking-external-report` is folded into agent-bootstrap.
 *
 * Tiers (MUST mirror the inserter's constants exactly — single invariant, two
 * enforcers: sync-hooks-to-skills.py and this suite):
 *   - CORE          : 2 blocks — every agent.
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
 *                    code-standards (researcher/ui-ux-designer don't author/review code).
 *
 * Tests:
 *   A (TC-UAR-003) — every agent carries all Core-2 open+close tags.
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
 *   I (TC-UAR-011) — universal contract: no skill or agent holds a body, `:reminder`,
 *                    guide line or pointer line of a universal tag (agents also none of
 *                    the agent-folded tags).
 *   J (TC-UAR-012) — universal AI mistake prevention text (canonical body, reminder
 *                    and any surviving digest) stays role-neutral; code/debug/fix
 *                    wording belongs in code-tier protocols, not the universal block.
 *   K (TC-UAR-013) — protocol digest aliases must not claim absent managed
 *                    SYNC blocks are in force.
 *   L (TC-UAR-014) — scaffold production-readiness wording stays aligned to
 *                    the canonical 5-foundation protocol.
 *   M (TC-UAR-015) — review-cycle protocols stay limited to agents whose role
 *                    includes review/fix-cycle validation.
 *   N (TC-UAR-016) — off-role protocol trim pins: architect carries NO
 *                    source-test-drift-check / scaffold-production-readiness;
 *                    the work-item refine mode reference carries NO scaffold-production-readiness /
 *                    cross-cutting-quality.
 *                    Confirms the user-validated KEEPS survive: architect &
 *                    solution-architect keep fix-layer-accountability; architect &
 *                    ui-ux-designer keep graph-assisted-investigation. Guards the
 *                    four surgical trims from silently regressing on a future
 *                    matrix/agent edit.
 *   O (TC-UAR-017) — agent-adoption triage gate: any canonical SYNC block that
 *                    reaches >= AGENT_ADOPTION_MIN_SKILL_REACH skills must be
 *                    carried by at least one agent OR be declared orchestration
 *                    in AGENT_ADOPTION_EXEMPT. Catches the drift class where a
 *                    new protocol propagates to every skill but no agent, so
 *                    agents silently run weaker protocols than their twin skills.
 *   P (TC-UAR-018) — every canonical agent exposes a valid generated skill
 *                    connection, native frontmatter links resolve and are
 *                    connected, and every test-architecture carrier has an
 *                    agent owner. Prevents skill/agent routing drift.
 */

const fs = require('fs');
const path = require('path');
const { assertEqual, assertTrue } = require('../lib/assertions.cjs');

const AGENTS_DIR = path.resolve(process.env.CLAUDE_PROJECT_DIR, '.claude', 'agents');
const SKILLS_DIR = path.resolve(process.env.CLAUDE_PROJECT_DIR, '.claude', 'skills');
const SYNC_INLINE_PATH = path.resolve(process.env.CLAUDE_PROJECT_DIR, '.claude', 'skills', 'shared', 'sync-inline-versions.md');
const GROUPS_PATH = path.resolve(process.env.CLAUDE_PROJECT_DIR, '.claude', 'skills', 'shared', 'protocol-groups.json');

// ── Tier constants — mirror sync-hooks-to-skills.py tier sets verbatim ────────
const CORE_TAGS = [
    'sequential-thinking-protocol',
    'agent-bootstrap',
];
// Never on an agent: task-tracking-external-report is folded into agent-bootstrap (mirror of
// sync_blocks.AGENT_FOLDED_TAGS); the universal tags come from the universal group (TC-UAR-011).
const AGENT_FOLDED_TAGS = ['task-tracking-external-report'];
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
    'ai-engineering-reviewer', 'architect', 'backend-developer', 'code-reviewer', 'code-simplifier',
    'database-admin', 'debugger', 'e2e-runner', 'framework-maintainer', 'frontend-developer',
    'fullstack-developer', 'integration-tester', 'performance-optimizer', 'performance-tester',
    'planner', 'security-auditor',
    'solution-architect', 'spec-compliance-reviewer', 'tester',
]);
// Read-only/design agents: READONLY_CODE_TAGS only, NOT MUTATION_CODE_TAGS.
const READONLY_CODE_AGENTS = new Set([
    'researcher', 'ui-ux-designer',
]);
const CORE_ONLY_AGENTS = new Set([
    'docs-manager', 'git-manager', 'journal-writer',
    'knowledge-worker',
]);

// ── TC-UAR-017 agent-adoption triage gate ────────────────────────────────────
// The drift this catches: a new canonical SYNC block gets propagated across the
// SKILLS but never triaged for AGENTS, so every agent silently runs a weaker
// protocol than its similar-purpose skill. That is invisible to the matrix
// validator (which only checks blocks already DECLARED) and to
// verify-sync-adoption-parity (which only checks declared carriers match
// canonical) -- nothing owned the "declared nowhere" case until this gate.
// A block reaching this many skills is real, propagated policy -- not a
// one-off -- so it must be either adopted by some agent or explicitly exempt.
const AGENT_ADOPTION_MIN_SKILL_REACH = 3;
// Orchestration blocks a headless leaf sub-agent structurally CANNOT act on.
// Mirrors agent_protocol_matrix.py EXCLUDED_ORCHESTRATION -- keep the two in step.
const AGENT_ADOPTION_EXEMPT = new Set([
    'subagent-return-contract',    // instructs ITS sub-agents how to return (inverted for a leaf)
    'parallel-phase-advancement',  // all-return barrier across a parallel phase group
    'sub-agent-selection',         // a dispatcher choosing which sub-agents to spawn
    'goal-contract-satisfaction-loop', // session goal file + convergence loop + user escalation
    'task-tracking-external-report', // folded into agent-bootstrap: an agent keeps one statement of the task and report rules (sync_blocks.AGENT_FOLDED_TAGS)
    'project-protocol-overlay',    // overlay resolution is performed by whoever INVOKES the skill; a headless leaf sub-agent receives one already-scoped brief whose overlay the dispatching orchestrator already resolved
    'session-goal-ledger',         // tracks the USER's session prompts; a headless leaf never sees the user conversation (its brief already carries the goal) and the prompt-ledger hook injects nothing inside a helper agent
    'verify-last-order',           // orders test runs ACROSS a task's steps (build, static review, one verify); the orchestrator owns it, and the leaf rules are written into fullstack-developer.md / frontend-developer.md (agent_protocol_matrix.py EXCLUDED_ORCHESTRATION)
    'workflow-registry-binding',   // binds a workflow SKILL.md to its .claude/workflows.json entry so whoever RESOLVES a step reads both projections; a headless leaf gets one already-resolved brief and never evaluates a sequence's applicability
    // Review-loop orchestration: the orchestrating review skill runs batching, the round loop,
    // reviewer-prompt construction and the round record; a leaf reviewer gets one scoped brief with
    // the rules it applies already embedded (agent_protocol_matrix.py EXCLUDED_ORCHESTRATION).
    'review-protocol-injection',
    'systematic-review-batching',
    'review-policy',
]);
const AGENT_SKILL_CONNECTIONS_OPEN = '<!-- AGENT-SKILL-CONNECTIONS:START -->';
const AGENT_SKILL_CONNECTIONS_CLOSE = '<!-- AGENT-SKILL-CONNECTIONS:END -->';
const TEST_ARCHITECTURE_SKILLS = [
    'architecture',
    'scaffold', 'harness-setup', 'workflow-greenfield-init',
    'integration-test', 'performance-test',
    'e2e-test', 'workflow-e2e',
    'workflow-integration-test', 'test',
    'seed-test-data',
];
// agent-code-standards audience — SEPARATE axis (mirror sync-hooks-to-skills.py
// CODE_STANDARDS_AGENTS verbatim). NOT the same set as CODE_AGENTS.
const CODE_STANDARDS_AGENTS = new Set([
    'ai-engineering-reviewer', 'architect', 'backend-developer', 'code-reviewer', 'code-simplifier',
    'database-admin', 'debugger', 'e2e-runner', 'framework-maintainer',
    'frontend-developer', 'fullstack-developer', 'integration-tester',
    'performance-optimizer', 'performance-tester', 'planner', 'security-auditor', 'solution-architect',
    'spec-compliance-reviewer', 'tester',
]);
const REVIEW_CYCLE_TAGS = [
    'review-protocol-injection',
];
const REVIEW_CYCLE_AGENTS = new Set([
    'architect',
    'code-reviewer',
    'integration-tester',
    'planner',
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

// ── Guide carriers (P48 pattern; P26 sensor rows N6, N7, N8) ─────────────────
// A converted SKILL.md carries a shared protocol as one guide line (the shared P25
// recognizer, never a copied line format) and the hook delivers the projection file
// `<skills root>/shared/protocols/<tag>.md`. For SKILLS a guide entry backed by an
// existing projection counts as carrying the protocol; AGENTS keep full text (owner
// answer), so an agent guide never counts. A file with neither form still fails.
const guideCarrier = require(path.join(__dirname, '..', '..', '..', 'scripts', 'lib', 'protocol-guide-carrier.cjs'));
const skillGuides = (body, tag, skillsDir = SKILLS_DIR) =>
    guideCarrier.hasGuideEntry(body, tag) && fs.existsSync(path.join(skillsDir, 'shared', 'protocols', `${tag}.md`));
// Full block, `:reminder` or (skills) a guide entry: the TC-UAR-009/-010 notion of "carries".
const skillCarriesAnyForm = (body, tag, skillsDir = SKILLS_DIR) =>
    body.includes(`<!-- SYNC:${tag}`) || skillGuides(body, tag, skillsDir);
// TC-UAR-009: a skill demanding code reading must also demand evidence discipline.
const missesEvidencePair = (body, skillsDir = SKILLS_DIR) =>
    skillCarriesAnyForm(body, 'understand-code-first', skillsDir) && !skillCarriesAnyForm(body, 'evidence-based-reasoning', skillsDir);
// TC-UAR-013: a digest alias line needs its managed block, or (skills only) its guide entry.
function digestAliasProblems(doc, skillsDir = SKILLS_DIR) {
    const problems = [];
    for (const line of doc.body.split(/\r?\n/)) {
        const digestMatch = protocolDigestLinePattern.exec(line);
        if (!digestMatch) continue;
        const tag = managedProtocolDigestAliases.get(digestMatch[1]);
        if (!tag) continue;
        const guided = doc.kind === 'skill' && skillGuides(doc.body, tag.replace(/^SYNC:/, ''), skillsDir);
        if (blockBody(doc.body, tag) === null && !guided) {
            problems.push(`${doc.kind}:${doc.name} digest references absent ${tag}: ${line.trim()}`);
        }
    }
    return problems;
}

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

const connectedSkills = body => {
    const escapedOpen = AGENT_SKILL_CONNECTIONS_OPEN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedClose = AGENT_SKILL_CONNECTIONS_CLOSE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = new RegExp(`${escapedOpen}([\\s\\S]*?)${escapedClose}`).exec(body);
    if (!match) return null;
    return [...match[1].matchAll(/^- `([^`]+)`\s*$/gm)].map(m => m[1]);
};

const nativeFrontmatterSkills = body => {
    const frontmatter = /^---\s*\n([\s\S]*?)\n---\s*\n/.exec(body);
    if (!frontmatter) return [];
    const match = /^skills:\s*(.+)$/m.exec(frontmatter[1]);
    if (!match || match[1].trim() === '[]') return [];
    return match[1].split(',').map(skill => skill.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
};

module.exports = {
    name: 'agent-universal-rules',
    tests: [
        {
            name: '[agent-universal-rules] TC-UAR-003 every agent carries all Core-2 open+close tags',
            fn: () => {
                const missing = [];
                for (const name of diskAgents) {
                    const body = read(name);
                    for (const tag of CORE_TAGS) {
                        if (!hasBlock(body, tag)) missing.push(`${name} → ${tag}`);
                    }
                }
                assertEqual(missing.length, 0, `agents missing Core-2 blocks:\n  ${missing.join('\n  ')}`);
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
                // condensed reminder (`<!-- SYNC:tag:reminder -->`); a converted skill's guide
                // entry counts on both sides (N6). A code-investigation skill that demands code
                // reading must also demand evidence discipline.
                const missing = skillNames.filter(name => missesEvidencePair(readSkill(name)));
                assertEqual(
                    missing.length, 0,
                    `skill(s) carry understand-code-first but NOT evidence-based-reasoning (add the EBR block — full or :reminder):\n  ${missing.join('\n  ')}`,
                );
            },
        },
        {
            name: '[agent-universal-rules] TC-UAR-010 web-research carries its own SYNC:web-research domain block',
            fn: () => {
                // The block or, once converted, its guide entry backed by the projection (N7).
                const body = readSkill('web-research');
                assertTrue(
                    skillCarriesAnyForm(body, 'web-research'),
                    'web-research/SKILL.md is missing its own SYNC:web-research domain block (or its guide entry)',
                );
            },
        },
        {
            name: '[agent-universal-rules] TC-UAR-011 the universal bundle is hook-delivered only: no skill or agent holds a body, reminder, guide line or pointer line for it',
            fn: () => {
                // Given the universal group (the hook-delivered bundle)
                const groups = JSON.parse(fs.readFileSync(GROUPS_PATH, 'utf8'));
                const universalTags = Object.keys((groups.groups && groups.groups.universal && groups.groups.universal.tags) || {});
                assertTrue(universalTags.length >= 4, `the universal group holds the bundle, found ${JSON.stringify(universalTags)}`);
                const escapeTag = tag => tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const problems = [];
                const docs = instructionDocs();
                assertTrue(docs.length > 0, 'no skill or agent found (vacuous scan)');
                // When every skill and agent is scanned
                for (const doc of docs) {
                    // Then no universal body, reminder or guide line is left (agents also none of the agent-folded tags)
                    const banned = doc.kind === 'agent' ? [...universalTags, ...AGENT_FOLDED_TAGS] : universalTags;
                    for (const tag of banned) {
                        for (const variant of [tag, `${tag}:reminder`]) {
                            if (new RegExp(`^<!-- SYNC:${escapeTag(variant)} -->`, 'm').test(doc.body)) problems.push(`${doc.kind}:${doc.name} carries SYNC:${variant}`);
                        }
                        if (guideCarrier.hasGuideEntry(doc.body, tag)) problems.push(`${doc.kind}:${doc.name} carries a guide line for ${tag}`);
                    }
                    // And no retired pointer line stands in their place
                    const lines = guideCarrier.rootPointerLines(doc.body);
                    if (lines.length !== 0) problems.push(`${doc.kind}:${doc.name} has ${lines.length} retired pointer line(s)`);
                }
                assertEqual(
                    problems.length,
                    0,
                    `universal-bundle contract violations:\n  ${problems.join('\n  ')}\n  Fix: py -3 .claude/scripts/sync-update-blocks.py --mode=strip-root-pointer (python3 on macOS/Linux)`,
                );
            },
        },
        {
            name: '[agent-universal-rules] TC-UAR-012 universal AI mistake prevention stays role-neutral',
            fn: () => {
                const problems = [];
                // The canonical body is the only text of the protocol (the universal hook delivers it); a
                // carrier that reappears with an embed is checked as before.
                for (const tag of ['SYNC:ai-mistake-prevention']) {
                    if (codeSpecificAiMistakePattern.test(canonicalBody(tag))) problems.push(`canonical ${tag}`);
                }
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
                // A skill's guide entry counts as the managed block (N8); an agent's never does.
                const problems = instructionDocs().flatMap(doc => digestAliasProblems(doc));
                assertEqual(
                    problems.length,
                    0,
                    `protocol digest references absent managed block(s):\n  ${problems.join('\n  ')}`,
                );
            },
        },
        {
            // Sensor rows N6, N7, N8 (P26 scratch run): each check accepts a skill guide entry backed by
            // its projection, and still fails when the guide is gone, the projection is missing, or the
            // guide sits in an agent (agents keep full text).
            name: '[agent-universal-rules] TC-PDL-065 TC-UAR-009/-010/-013 accept a skill guide carrier only while its projection exists',
            fn: () => {
                const os = require('os');
                const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uar-guide-'));
                try {
                    // Given a skills root with projection files and guide blocks built by the format owner
                    const skillsDir = path.join(tmp, 'skills');
                    const projectionFile = tag => path.join(skillsDir, 'shared', 'protocols', `${tag}.md`);
                    fs.mkdirSync(path.dirname(projectionFile('x')), { recursive: true });
                    for (const tag of ['evidence-based-reasoning', 'web-research', 'ui-system-context']) fs.writeFileSync(projectionFile(tag), `> ${tag} fixture body.\n`);
                    const guides = (...tags) => [guideCarrier.GUIDE_BLOCK_START, '',
                        ...tags.map(tag => guideCarrier.formatGuideLine({ tag, summary: 'Fixture summary', when: 'fixture work', path: `.claude/skills/shared/protocols/${tag}.md` })),
                        '', guideCarrier.GUIDE_BLOCK_END].join('\n');
                    const understand = '<!-- SYNC:understand-code-first:reminder -->\n\n> read first\n\n<!-- /SYNC:understand-code-first:reminder -->\n';

                    // When TC-UAR-009 checks a skill whose evidence protocol is a guide, Then it passes
                    assertEqual(missesEvidencePair(`${understand}${guides('evidence-based-reasoning')}`, skillsDir), false, 'N6: guide carrier must satisfy the pair');
                    // When both forms of the evidence protocol are missing, Then it fails
                    assertEqual(missesEvidencePair(understand, skillsDir), true, 'N6: a missing evidence protocol must fail');

                    // When TC-UAR-010 checks web-research carried as a guide, Then it passes
                    assertTrue(skillCarriesAnyForm(guides('web-research'), 'web-research', skillsDir), 'N7: guide carrier must count');
                    assertTrue(!skillCarriesAnyForm('# web-research\n', 'web-research', skillsDir), 'N7: no block and no guide must fail');

                    // When TC-UAR-013 checks a digest alias whose protocol is a guide, Then only a skill passes
                    const digest = '- **UI System Context:** resolve UI conventions first.';
                    const doc = (kind, body) => ({ kind, name: 'fx', body: `${body}\n${digest}\n` });
                    assertEqual(digestAliasProblems(doc('skill', guides('ui-system-context')), skillsDir).length, 0, 'N8: skill guide carrier must satisfy the alias');
                    assertEqual(digestAliasProblems(doc('skill', '# fx'), skillsDir).length, 1, 'N8: an alias with no block and no guide must fail');
                    assertEqual(digestAliasProblems(doc('agent', guides('ui-system-context')), skillsDir).length, 1, 'N8: an agent guide must not satisfy the alias');

                    // When the projection files are removed, Then every guide carrier stops counting
                    for (const tag of ['evidence-based-reasoning', 'web-research', 'ui-system-context']) fs.rmSync(projectionFile(tag));
                    assertEqual(missesEvidencePair(`${understand}${guides('evidence-based-reasoning')}`, skillsDir), true, 'N6: no projection, no carrier');
                    assertTrue(!skillCarriesAnyForm(guides('web-research'), 'web-research', skillsDir), 'N7: no projection, no carrier');
                    assertEqual(digestAliasProblems(doc('skill', guides('ui-system-context')), skillsDir).length, 1, 'N8: no projection, no carrier');
                } finally {
                    fs.rmSync(tmp, { recursive: true, force: true });
                }
            },
        },
        {
            name: '[agent-universal-rules] TC-UAR-014 scaffold production-readiness wording uses 5 foundations',
            fn: () => {
                const scaffold = readSkill('scaffold');
                assertTrue(
                    scaffold.includes('Project Foundation Selection (MANDATORY assessment'),
                    'scaffold must keep the mandatory foundation-selection assessment',
                );
                assertTrue(
                    scaffold.includes('### 1. Code Quality Tooling') &&
                    scaffold.includes('### 5. Integration Points'),
                    'scaffold must enumerate foundations 1..5, ending at Integration Points',
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
                    { kind: 'skill-file', name: 'work-item/references/mode-refine.md', tag: 'scaffold-production-readiness', label: 'Scaffold Production Readiness' },
                    { kind: 'skill-file', name: 'work-item/references/mode-refine.md', tag: 'cross-cutting-quality', label: 'Cross-Cutting Quality' },
                ];
                for (const { kind, name, tag, label, labels } of removed) {
                    const body = kind === 'agent' ? read(name) : kind === 'skill-file' ? fs.readFileSync(path.join(SKILLS_DIR, name), 'utf8') : readSkill(name);
                    // A guide entry is a carrier too: a trimmed protocol must not come back as a guide line.
                    if (body.includes(`SYNC:${tag}`) || guideCarrier.hasGuideEntry(body, tag)) {
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
        {
            name: '[agent-universal-rules] TC-UAR-017 every canonical block with real skill reach is triaged for agents (no silent skill-only drift)',
            fn: () => {
                const source = fs.readFileSync(SYNC_INLINE_PATH, 'utf8');
                const canonTags = [
                    ...new Set(
                        [...source.matchAll(/^## SYNC:([a-z0-9-]+)\s*$/gm)].map(m => m[1]),
                    ),
                ];

                const skillBodies = skillNames.map(readSkill);
                const agentBodies = diskAgents.map(read);

                const unclassified = [];
                for (const tag of canonTags) {
                    // Skill reach counts guide carriers too; otherwise converting skills to guides
                    // would drop every tag below the threshold and silence this gate.
                    const skillCount = skillBodies.filter(b => hasBlock(b, tag) || skillGuides(b, tag)).length;
                    if (skillCount < AGENT_ADOPTION_MIN_SKILL_REACH) continue;
                    const agentCount = agentBodies.filter(b => hasBlock(b, tag)).length;
                    if (agentCount > 0) continue;
                    if (AGENT_ADOPTION_EXEMPT.has(tag)) continue;
                    unclassified.push(`SYNC:${tag} reaches ${skillCount} skill(s) but 0 agents`);
                }

                assertEqual(
                    unclassified.length,
                    0,
                    'skill-only protocol drift — a canonical block propagated to skills but no agent.\n  '
                        + unclassified.join('\n  ')
                        + '\n  Resolve by EITHER adding the tag to the relevant agent row(s) in'
                        + ' .claude/scripts/agent_protocol_matrix.py AGENT_QUALITY_BLOCKS (then run'
                        + ' inject_agent_protocol_blocks.py), OR — if it is orchestration a headless'
                        + ' leaf sub-agent structurally cannot act on — adding it to that file\'s'
                        + ' EXCLUDED_ORCHESTRATION and to AGENT_ADOPTION_EXEMPT here, with a reason.',
                );
            },
        },
        {
            name: '[agent-universal-rules] TC-UAR-018 every agent has valid connected skill contracts and test architecture carriers have owners',
            fn: () => {
                const problems = [];
                const ownersBySkill = new Map(TEST_ARCHITECTURE_SKILLS.map(skill => [skill, []]));
                const knownSkills = new Set(skillNames);

                for (const name of diskAgents) {
                    const body = read(name);
                    const connected = connectedSkills(body);
                    if (!connected || connected.length === 0) {
                        problems.push(`${name}: missing or empty AGENT-SKILL-CONNECTIONS block`);
                        continue;
                    }

                    const duplicates = connected.filter((skill, index) => connected.indexOf(skill) !== index);
                    if (duplicates.length > 0) problems.push(`${name}: duplicate connected skill(s) ${[...new Set(duplicates)].join(', ')}`);
                    for (const skill of connected) {
                        if (!knownSkills.has(skill)) problems.push(`${name}: unknown connected skill ${skill}`);
                        if (ownersBySkill.has(skill)) ownersBySkill.get(skill).push(name);
                    }

                    for (const skill of nativeFrontmatterSkills(body)) {
                        if (!knownSkills.has(skill)) problems.push(`${name}: unknown frontmatter skill ${skill}`);
                        if (!connected.includes(skill)) problems.push(`${name}: frontmatter skill ${skill} is not in its connection block`);
                    }
                }

                for (const [skill, owners] of ownersBySkill) {
                    if (owners.length === 0) problems.push(`${skill}: no connected agent owner`);
                }

                assertEqual(
                    problems.length,
                    0,
                    `agent-to-skill connection violations:\n  ${problems.join('\n  ')}`,
                );
            },
        },
    ],
};
