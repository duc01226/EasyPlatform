'use strict';

/**
 * Review lanes — intent guards for the whole-diff correctness lane and lean leaf reviewers.
 *
 * Business intent guarded:
 *   lane       every behavior-changing flow receives complete connected coverage, so defects that span files
 *              (a flow crossing layers, a boundary such as time crossing a day) stay visible even when
 *              batches split the diff by module; only calibrated, reachable findings are kept.
 *   reach      the lane reaches every executor: both orchestrating review skills and the reviewer agent.
 *   flow owner adaptive grouping preserves connected coverage and cross-group interactions without
 *              prescribing file quotas, slice shapes or agent counts.
 *   check set  validation preserves rejected/re-tiered candidates and independent coordinator checks
 *              for material findings, uncertain claims and cross-group interactions.
 *   lean leaf  a dispatched reviewer agent carries no review-loop orchestration protocol — the
 *              orchestrating skill owns batching, the round loop, reviewer prompts and the round
 *              record; copying them into every leaf re-loads ~11k tokens per spawn for no work.
 * All tests read this repo's shipped carriers, so they run only in the framework repo.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { extractSyncBody, normalizeEol } = require('../../../scripts/lib/extract-sync-block.cjs');
const guideCarrier = require('../../../scripts/lib/protocol-guide-carrier.cjs');

const HOOKS_DIR = path.resolve(__dirname, '../..');
const REPO_ROOT = path.resolve(HOOKS_DIR, '..', '..');
const { isFrameworkRepo } = require(path.join(HOOKS_DIR, 'tests', 'lib', 'framework-repo-guard.cjs'));

const SKIP = isFrameworkRepo(REPO_ROOT) ? false : 'reads the framework repo\'s own shipped carriers (framework-repo signal)';
const LANE = 'whole-diff-correctness';
const ORCHESTRATION = ['review-protocol-injection', 'systematic-review-batching', 'review-policy'];
// The leaf rules the reviewer template embeds. Agents that held the template before it left agent files are
// dispatched directly too, so each keeps every one of these as its own block on every harness.
const TEMPLATE_LEAF_TAGS = ['spec-tests-code-triangulation', 'evidence-based-reasoning', 'bug-detection', 'design-patterns-quality', 'logic-and-intention-review', 'test-spec-verification', 'behavioral-delta-matrix', 'fix-layer-accountability', 'rationalization-prevention', 'graph-assisted-investigation', 'understand-code-first'];
const TEMPLATE_LEAF_AGENTS = ['code-reviewer', 'integration-tester', 'planner', 'spec-compliance-reviewer'];

function read(...segments) {
    return fs.readFileSync(path.join(REPO_ROOT, ...segments), 'utf8').replace(/\r\n?/g, '\n');
}

function canonicalBody(tag) {
    const canonical = read('.claude', 'skills', 'shared', 'sync-inline-versions.md');
    const start = canonical.indexOf(`## SYNC:${tag}\n`);
    assert.notEqual(start, -1, `canonical SYNC:${tag} exists`);
    return canonical.slice(start, canonical.indexOf('\n---\n', start));
}

/** Skills may guide to canonical published text; agents must keep the full body. */
function carriesCanonicalLane(text, projection, expected, acceptGuide = false) {
    if (!expected || projection == null || normalizeEol(projection).trim() !== normalizeEol(expected).trim()) return false;
    const inline = new RegExp(`<!-- SYNC:${LANE} -->\\s*([\\s\\S]*?)\\s*<!-- /SYNC:${LANE} -->`).exec(text);
    if (inline) return normalizeEol(inline[1]).trim() === normalizeEol(expected).trim();
    if (text.includes(`<!-- SYNC:${LANE} -->`)) return false;
    const guide = guideCarrier.guideEntries(text).get(LANE);
    return acceptGuide && !!guide && guide.endsWith(` → .claude/skills/shared/protocols/${LANE}.md`);
}

const tests = [
    {
        name: '[review-lanes] TC-RL-001 the lane covers connected behavior, adapts grouping and keeps calibrated findings',
        skip: SKIP,
        fn: () => {
            const lane = canonicalBody(LANE);
            assert.match(lane, /verify each affected flow from trigger through callers, boundaries and outputs/, 'covers connected behavior');
            assert.match(lane, /File-by-file and specialist checks add depth[^\n]*account for their interactions/, 'specialists never replace whole-target correctness');
            assert.match(lane, /success, failure, empty\/boundary states/, 'hunts success, failure and boundary states');
            assert.match(lane, /alternate roles\/clients, retries and concurrency/, 'hunts alternate actors and async behavior');
            assert.match(lane, /governing rules and relevant history/, 'uses history as recorded intent');
            assert.match(lane, /confidence ≥85/, 'keeps only confirmed findings');
            assert.match(lane, /Confidence measures whether the issue is real; severity measures its impact/, 'confidence and consequence are separate');
            // An unsettled MEDIUM-or-higher candidate takes the severity-rubric route, never a silent drop.
            assert.match(lane, /possible MEDIUM\+ impact stays `NOT VERIFIABLE`, with the missing proof/,
                'an unsettled MEDIUM+ candidate is reported NOT VERIFIABLE');
            assert.match(canonicalBody(`${LANE}:reminder`), /preserve complete coverage and evidence/,
                'the lane reminder preserves the full evidence obligation');
            assert.match(canonicalBody('severity-rubric'), /Unsettled reachability is NOT VERIFIABLE for potential MEDIUM\+ impact/,
                'the lane route agrees with the severity rubric it defers to');
            assert.match(lane, /review together or group connected flows from actual risk and context headroom/, 'grouping follows actual risk and context');
            assert.match(lane, /record cross-group obligations and inspect them before concluding/, 'grouping preserves interactions');
            assert.match(lane, /No complete verdict while an affected flow, required rule or interaction remains unreviewed/, 'no incomplete flow verdict');
            // The shared "never a finding" rule has one owner, and the lane points at it.
            const rubric = canonicalBody('severity-rubric');
            for (const excluded of [/issues already reported by this change’s compiler\/type checker\/linter\/tests/, /intended behavior changes/, /reasoned suppressions predating the change/, /neither touched nor made reachable/]) {
                assert.match(rubric, excluded, `severity-rubric excludes ${excluded}`);
            }
            // A change can never exempt itself: a suppression it adds is reviewed like any other line.
            assert.match(rubric, /Review newly added suppressions/);
        }
    },
    {
        name: '[review-lanes] TC-RL-002 the lane reaches both orchestrating review skills and the reviewer agent, and runs for every behavior-changing diff',
        skip: SKIP,
        fn: () => {
            const expected = extractSyncBody(read('.claude', 'skills', 'shared', 'sync-inline-versions.md'), LANE);
            assert.ok(expected, 'canonical lane body');
            const projection = read('.claude', 'skills', 'shared', 'protocols', `${LANE}.md`);
            assert.equal(normalizeEol(projection).trim(), normalizeEol(expected).trim(), 'published lane equals canonical');
            for (const carrier of [['.claude', 'skills', 'changes-review', 'SKILL.md'], ['.claude', 'skills', 'workflow-review-changes', 'SKILL.md'], ['.claude', 'skills', 'code-quality-review', 'SKILL.md'], ['.claude', 'agents', 'code-reviewer.md']]) {
                const text = read(...carrier);
                assert.ok(carriesCanonicalLane(text, projection, expected, carrier[1] === 'skills'), `${carrier.join('/')} carries the canonical lane (agents retain full bodies)`);
            }
            const guide = `<!-- PROTOCOL-GUIDES:START -->\n${guideCarrier.guideEntries(read('.claude', 'skills', 'changes-review', 'SKILL.md')).get(LANE)}\n<!-- PROTOCOL-GUIDES:END -->`;
            for (const [label, text, published, acceptGuide] of [
                ['missing published body', guide, null, true],
                ['drifted published body', guide, `${projection}\ndrift`, true],
                ['missing carrier', '', projection, true],
                ['wrong published path', guide.replace('→ .claude/skills/shared/protocols/', '→ wrong/protocols/'), projection, true],
                ['drifted inline body behind a guide', `${guide}\n<!-- SYNC:${LANE} -->drift<!-- /SYNC:${LANE} -->`, projection, true],
                ['unclosed inline body behind a guide', `${guide}\n<!-- SYNC:${LANE} -->`, projection, true],
                ['guide-only agent', guide, projection, false]
            ]) {
                assert.equal(carriesCanonicalLane(text, published, expected, acceptGuide), false, `${label} must fail`);
            }
            const changesReview = read('.claude', 'skills', 'changes-review', 'SKILL.md');
            assert.match(changesReview, /For every applicable changed behavior, inspect correctness against intent, supported success\/error paths/);
            assert.match(changesReview, /Trace callers and contracts across affected boundaries/);
            const planning = canonicalBody('systematic-review-batching');
            assert.match(planning, /Group connected behavior with its callers, tests and rules/);
            assert.match(planning, /every file is reviewed or accounted for by relevant evidence/, 'complete file coverage');
            const workflow = read('.claude', 'skills', 'workflow-review-changes', 'SKILL.md');
            assert.match(workflow, /General changes review and independent rationale review cover the complete target/);
            assert.match(workflow, /Wait for every report before fixing/, 'complete reader barrier');
            assert.match(workflow, /reconcile cross-file interactions and coverage/);
            const qualityReview = read('.claude', 'skills', 'code-quality-review', 'SKILL.md');
            assert.match(qualityReview, /holistically trace the main affected area's full pipeline across BOTH boundaries/, 'named-code executor traces complete flows');
            assert.match(qualityReview, /Re-read accumulated report, assess overall approach, architecture, duplication, and cross-boundary behavior/, 'named-code executor checks interactions');
        }
    },
    {
        name: '[review-lanes] TC-RL-003 dispatched reviewer agents carry no review-loop orchestration protocol',
        skip: SKIP,
        fn: () => {
            const agentsDir = path.join(REPO_ROOT, '.claude', 'agents');
            const agents = fs.readdirSync(agentsDir).filter(name => name.endsWith('.md'));
            assert.ok(agents.includes('code-reviewer.md') && agents.length > 10, 'the agent scan is non-vacuous');
            const leaks = [];
            for (const name of agents) {
                const text = fs.readFileSync(path.join(agentsDir, name), 'utf8');
                for (const tag of ORCHESTRATION) {
                    if (text.includes(`<!-- SYNC:${tag} -->`) || text.includes(`<!-- SYNC:${tag}:reminder -->`)) leaks.push(`${name}: ${tag}`);
                }
            }
            assert.deepEqual(leaks, [], `leaf agents must not carry review-loop orchestration:\n  ${leaks.join('\n  ')}`);
            // Digest lines outside the fences must not keep pointing at protocols a leaf no longer carries.
            const staleDigest = /^- \*\*(?:Systematic Batching|Fresh Context Review|Double Round-Trip Review|Review Protocol Injection):\*\*/m;
            const stale = agents.filter(name => staleDigest.test(fs.readFileSync(path.join(agentsDir, name), 'utf8')));
            assert.deepEqual(stale, [], `agent digests still name removed review-loop protocols: ${stale.join(', ')}`);
            // The template no longer reaches a directly dispatched reviewer (e.g. a bugfix review from `fix`), and
            // hosts without a skill preload render it as a pointer — so each former template holder keeps its leaf rules.
            const missing = [];
            for (const agent of TEMPLATE_LEAF_AGENTS) {
                const text = fs.readFileSync(path.join(agentsDir, `${agent}.md`), 'utf8');
                for (const tag of TEMPLATE_LEAF_TAGS) if (!text.includes(`<!-- SYNC:${tag} -->`)) missing.push(`${agent}: ${tag}`);
            }
            assert.deepEqual(missing, [], `reviewer agents lost template leaf rules:\n  ${missing.join('\n  ')}`);
            // The effective context counts: a skill an agent preloads (Claude `skills:` frontmatter) that carries
            // review-loop orchestration must tell a leaf that the loop belongs to its caller.
            let preloadsChecked = 0;
            let preloadingAgents = 0;
            for (const name of agents) {
                const front = fs.readFileSync(path.join(agentsDir, name), 'utf8').replace(/\r\n?/g, '\n').split('\n---\n')[0];
                const line = front.match(/^skills:\s*(.+)$/m);
                if (line) preloadingAgents += 1;
                for (const skill of line ? line[1].split(',').map(s => s.trim()).filter(Boolean) : []) {
                    const skillText = read('.claude', 'skills', skill, 'SKILL.md');
                    if (!ORCHESTRATION.some(tag => skillText.includes(`<!-- SYNC:${tag} -->`))) continue;
                    preloadsChecked += 1;
                    assert.match(skillText, /Dispatched as a leaf reviewer[^\n]*belong to your caller/, `${name} preloads ${skill}, which must bound a leaf reviewer`);
                }
            }
            // No reviewer agent preloads an orchestration-carrying skill by design (preloads were removed so a leaf never inherits a loop);
            // the boundary above still binds any future preload. Non-vacuous means the scan really parses agent frontmatter.
            assert.ok(preloadingAgents > 0, 'the effective-context check is non-vacuous: the scan reads agent skills: frontmatter');
        }
    },
    {
        name: '[review-lanes] TC-RL-004 validation preserves rejected candidates and independent material, uncertain and cross-group checks',
        skip: SKIP,
        fn: () => {
            const batching = canonicalBody('systematic-review-batching');
            assert.match(batching, /Validate findings before acting, preserve rejected\/re-tiered candidates and reconcile conflicts by evidence/);
            assert.match(batching, /coordinator independently checks material findings, uncertain claims and cross-group interactions/);
            assert.match(batching, /choosing additional validation where risk warrants it/);
            assert.match(batching, /Reconcile all coverage and required checks before the final verdict/);
            // One owner: the workflow references the canonical check set instead of restating it.
            const workflow = read('.claude', 'skills', 'workflow-review-changes', 'SKILL.md');
            assert.doesNotMatch(workflow, /one in four findings sends|Above 40 findings/, 'workflow-review-changes restates the check set');
            assert.match(batching, /clear scope, governing rules, report path and the required full review protocol template/);
            const changes = read('.claude', 'skills', 'changes-review', 'SKILL.md');
            assert.match(changes, /retaining every report and conflicting claim/);
            assert.match(changes, /Any surviving finding requires `\/why-review --validate-findings <report>` before fixes or handoff/);
        }
    },
    {
        name: '[review-lanes] TC-RL-005 topology is adaptive; a moving target invalidates review and refuses stale receipt acceptance',
        skip: SKIP,
        fn: () => {
            const workflow = read('.claude', 'skills', 'workflow-review-changes', 'SKILL.md');
            const planning = canonicalBody('systematic-review-batching');
            assert.match(planning, /Decide grouping, read sizes and concurrency from the actual working set, context headroom and delegation cost/);
            assert.match(planning, /no universal file, line, byte or group-size caps, and no mandated split or hierarchy/);
            assert.match(workflow, /preserve domain gates and reconcile cross-file interactions and coverage/);
            const receipts = read('.claude', 'skills', 'workflow-review-changes', 'references', 'fix-loop.md');
            assert.match(receipts, /Any edit after a review invalidates its verdict/);
            assert.match(receipts, /original pre-review snapshot/);
            assert.match(receipts, /Never reconstruct or capture a new snapshot at issuance; drift refuses acceptance/);
        }
    }
];

module.exports = { name: 'review-lanes', tests };
