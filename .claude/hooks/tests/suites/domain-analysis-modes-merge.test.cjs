/**
 * Domain Analysis Modes Merge Test Suite
 *
 * The domain-analysis skill owns two roles: the default business domain analysis (bounded contexts,
 * aggregates, entities, ERD, domain events) and `--mode=review` (DDD design-quality review of domain
 * entities and value objects, checklist A–P, `--report-only` leaf for the review workflow). The review
 * body lives in `domain-analysis/references/mode-review.md`; `domain-analysis/SKILL.md` detects the
 * mode first and carries a BLOCKING "read the mode file in full FIRST" line, so the default analysis
 * never loads the review body. The review mode has no skill folder of its own and reuses the DDD
 * primer in `references/ddd-reference.md` instead of copying it.
 *
 * Coverage:
 *   TC-DMM-001 — mode routing sits at the top, the review mode has its BLOCKING read line, a reference
 *                file and the "formerly" mapping.
 *   TC-DMM-002 — the default analysis text stays free of the review body (and keeps its own steps).
 *   TC-DMM-003 — the review mode keeps checklist A–P, the validation-first loop, the `--report-only`
 *                leaf contract, the severity mapping and the report paths.
 *   TC-DMM-004 — mode-only protocols are inline canonical bodies in the mode reference, never in
 *                SKILL.md; fences balance; protocol delivery names domain-analysis only.
 *   TC-DMM-005 — the removed skill folder stays deleted; the workflow step runs `domain-analysis
 *                --mode=review --report-only` and every registry reference to its id stays consistent.
 *   TC-DMM-006 — every workflow occurrence of domain-analysis passes arguments the skill supports.
 *   TC-DMM-007 — the DDD primer is reused, not copied.
 *   TC-DMM-008 — the description keeps the step-skill form and advertises the review mode.
 *   TC-DMM-009 — the shared Domain Entity Change Gate routes to the new invocation in every copy.
 *   TC-DMM-010 — no live source names the removed skill (allow-list: the "formerly" lines and the
 *                review report filename prefix).
 *
 * Portability: every row asserts this framework repository's own skills and registry and is skipped in
 * any other project (framework-repo signal). Paths use node:path; nothing is OS-specific.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { isFrameworkRepo } = require('../lib/framework-repo-guard.cjs');
const { resolveAllWorkflowManifests } = require('../../../scripts/lib/workflow-manifest.cjs');
const { extractSyncBody, normalizeEol } = require('../../../scripts/lib/extract-sync-block.cjs');
const guideCarrier = require('../../../scripts/lib/protocol-guide-carrier.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SKIP = isFrameworkRepo(REPO_ROOT) ? false : 'asserts the framework repo\'s own domain-analysis skill and workflow registry (framework-repo signal)';

const SKILLS = path.join(REPO_ROOT, '.claude', 'skills');
const read = (...parts) => fs.readFileSync(path.join(...parts), 'utf8').replace(/\r\n/g, '\n');
const skillText = () => read(SKILLS, 'domain-analysis', 'SKILL.md');
const modeReview = () => read(SKILLS, 'domain-analysis', 'references', 'mode-review.md');
const canonical = () => read(SKILLS, 'shared', 'sync-inline-versions.md');

// The removed skill name, assembled so this file never contains the literal token it guards against.
const REMOVED = 'domain-entities' + '-review';

/** Body between the paired HTML-comment fences of `tag` in a carrier file, or null. */
function htmlBody(text, tag) {
    const match = new RegExp(`<!-- SYNC:${tag} -->\\s*([\\s\\S]*?)\\s*<!-- /SYNC:${tag} -->`).exec(text);
    return match ? match[1] : null;
}

/** A guide is a carrier only when it points to the exact, canonical published body. */
function carriesCanonicalProtocol(text, tag, projection, expected, acceptGuide = false) {
    if (!expected || projection == null || normalizeEol(projection).trim() !== normalizeEol(expected).trim()) return false;
    const inline = htmlBody(text, tag);
    if (inline !== null) return normalizeEol(inline).trim() === normalizeEol(expected).trim();
    if (text.includes(`<!-- SYNC:${tag} -->`)) return false;
    const guide = guideCarrier.guideEntries(text).get(tag);
    return acceptGuide && !!guide && guide.endsWith(` → .claude/skills/shared/protocols/${tag}.md`);
}

/** Tags of the guide lines inside the PROTOCOL-GUIDES block(s) of `text`. */
function guideTags(text) {
    const tags = [];
    for (const block of text.matchAll(/<!-- PROTOCOL-GUIDES:START -->([\s\S]*?)<!-- PROTOCOL-GUIDES:END -->/g)) {
        for (const line of block[1].split('\n')) {
            const match = /^- `([a-z0-9-]+)` — /.exec(line);
            if (match) tags.push(match[1]);
        }
    }
    return tags;
}

const LIVE_SOURCE_ROOTS = ['.claude', 'docs/specs', 'docs/project-reference', 'README.md'];
// Generated catalogs are rebuilt from the skill folders; history stays in ADRs and release notes.
const SCAN_EXCLUDED = new Set([
    '.claude/SKILLS.yaml',
    '.claude/scripts/skills_data.yaml',
    '.claude/hooks/tests/suites/domain-analysis-modes-merge.test.cjs'
]);
const SCAN_EXCLUDED_DIRS = new Set(['node_modules', '.git', '.code-graph', 'tmp', 'temp', 'plans', '__pycache__']);
const SCAN_EXTENSIONS = new Set(['.md', '.cjs', '.mjs', '.js', '.py', '.json', '.yaml', '.yml', '.html', '.toml']);

function* walk(rel) {
    const abs = path.join(REPO_ROOT, ...rel.split('/'));
    if (!fs.existsSync(abs)) return;
    const stat = fs.statSync(abs);
    if (stat.isFile()) {
        if (SCAN_EXTENSIONS.has(path.extname(abs))) yield rel;
        return;
    }
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
        if (entry.isDirectory() && SCAN_EXCLUDED_DIRS.has(entry.name)) continue;
        yield* walk(`${rel}/${entry.name}`);
    }
}

/** A line that names the removed skill but is an allowed mention. */
function allowedMention(rel, line) {
    if (rel === '.claude/skills/domain-analysis/SKILL.md' && /former/i.test(line)) return true;
    if (rel === '.claude/skills/domain-analysis/references/mode-review.md') {
        if (/It is the former `\/domain-entities-review`/.test(line)) return true;
        if (line.includes('tmp/reports/' + REMOVED + '-{date}-{slug}.md')) return true;
    }
    return false;
}

const loadRegistry = () => JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.claude', 'workflows.json'), 'utf8'));

/** Every occurrence of `skill` across all workflows and modes: { workflow, mode, occurrence }. */
function occurrencesOf(skill) {
    const document = loadRegistry();
    const found = [];
    for (const id of Object.keys(document.workflows)) {
        for (const manifest of resolveAllWorkflowManifests(document, id, { rootDir: REPO_ROOT })) {
            for (const occurrence of manifest.occurrences) if (occurrence.skill === skill) found.push({ workflow: id, mode: manifest.mode, occurrence });
        }
    }
    return found;
}

const tests = [
    {
        name: 'TC-DMM-001 domain-analysis keeps the review mode with a BLOCKING read-first line, its reference file and the formerly mapping',
        skip: SKIP,
        fn: () => {
            // Given the domain-analysis skill
            const text = skillText();
            // Then mode detection comes before the first content section and lists the review mode
            const routing = text.indexOf('Mode routing');
            assert.ok(routing > 0 && routing < text.indexOf('## Quick Summary'), 'mode detection sits at the top, before the Quick Summary');
            assert.match(text, /--mode=review/);
            // And the mode has a mandatory full-read line naming an existing reference
            assert.match(text, /\*\*\[BLOCKING\]\*\* Read `references\/mode-review\.md` in full FIRST when `--mode=review` is selected/);
            assert.ok(fs.existsSync(path.join(SKILLS, 'domain-analysis', 'references', 'mode-review.md')), 'references/mode-review.md exists');
            // And the dispatch table carries the row and the removed slash command resolves through a "formerly" mapping
            assert.match(text, /\| `--mode=review \[changes \\\| scan \[<module>\]\] \[--report-only\]` \|/);
            assert.match(text, /is the former `\/[a-z-]+`: that slash command no longer exists/);
            assert.match(text, /Formerly `\/[a-z-]+`/);
        }
    },
    {
        name: 'TC-DMM-002 default domain analysis text does not carry the review mode body, and still runs its own ordered steps',
        skip: SKIP,
        fn: () => {
            const text = skillText();
            const reviewOnly = ['## Phase 5: Why-Review Self-Validation Gate', '#### M. Invariant vs Validation Ownership', '### 0.4 Modelling Paradigm Detection', '## Report-Only Mode (`--report-only`)', '## Systematic Review Strategy', '### 3.1 Model-Level Dimensions', 'Health Score'];
            for (const marker of reviewOnly) assert.ok(!text.includes(marker), `domain-analysis/SKILL.md must not inline review text: ${marker}`);
            for (const marker of reviewOnly) assert.ok(modeReview().includes(marker), `mode-review.md holds ${marker}`);
            // And the default analysis keeps its contract
            for (let step = 0; step <= 9; step += 1) assert.match(text, new RegExp(`\\n### Step ${step}: `), `Step ${step} exists`);
            assert.match(text, /MANDATORY IMPORTANT MUST ATTENTION\*\* run user validation interview at end \(NEVER skip\)/);
            // And its terminal route recommends the review mode by its new invocation
            assert.match(text, /"\/domain-analysis --mode=review \(Recommended\)"/);
        }
    },
    {
        name: 'TC-DMM-003 --mode=review keeps checklist A–P, the validation-first loop, the report-only leaf contract, the severity mapping and the report paths',
        skip: SKIP,
        fn: () => {
            const text = modeReview();
            // Checklist A–P and the two model-level phases
            for (const letter of 'ABCDEFGHIJKLMNOP') assert.match(text, new RegExp(`\\n#### ${letter}\\. `), `checklist section ${letter}`);
            assert.match(text, /#### E2\. Spec-Loop Discipline/);
            for (const phase of [0, 1, 2, 3, 4, 5]) assert.match(text, new RegExp(`\\n## Phase ${phase}: `), `Phase ${phase} exists`);
            // Health score and the validation-first loop
            assert.match(text, /100 - \(CRITICAL×25 \+ HIGH×10 \+ MEDIUM×3 \+ LOW×1\), min 0/);
            assert.match(text, /\/why-review --validate-findings/);
            assert.match(text, /Round 1: zero open findings; Round 2: zero CRITICAL\/HIGH\/MEDIUM, LOW deferred/);
            // Assignment strategy follows the canonical risk/fit contract, with report-only isolation.
            assert.match(text, /Follow `SYNC:systematic-review-batching` to choose from risk, related flows, working-set fit and delegation cost; file counts are planning cues/);
            assert.match(text, /Not run under `--report-only` — that mode reviews sequentially in this context/);
            assert.doesNotMatch(text, /10\+ entity files[^\n]*automatically/);
            // --report-only is a read-only leaf: caller-mode read, no fix/restart/fan-out/questions, severity mapping 1:1
            assert.match(text, /read `\.claude\/skills\/workflow-review-changes\/references\/caller-mode\.md` § `--report-only` in full FIRST/);
            assert.match(text, /Run Phases 0–4, then the Phase 5 Why-Review Self-Validation Gate only/);
            assert.match(text, /\*\*No nested fan-out\.\*\*/);
            assert.match(text, /CRITICAL→Critical · HIGH→High · MEDIUM→Medium · LOW→Low/);
            assert.match(text, /\*\*Exempt\*\* under `--report-only`, when a parent skill or workflow invoked this review, or when running as a sub-agent/);
            // Scope detection: changes by default, scan [<module>] optional
            assert.match(text, /\| `\/domain-analysis --mode=review` \(default\)\s+\| \*\*changes\*\*/);
            assert.match(text, /\| `\/domain-analysis --mode=review scan <module>`\s+\| \*\*scan-service\*\*/);
            // Report paths keep their historical prefix so a caller or reader finds the same artifact
            assert.ok(text.includes('tmp/reports/' + REMOVED + '-{date}-{slug}.md'), 'report path prefix kept');
            // The canonical-owner linkage to the shared Domain Entity Change Gate
            assert.match(text, /`\/domain-analysis --mode=review` is the \*\*canonical owner\*\* of `SYNC:domain-entity-change-gate`/);
            assert.ok(text.includes('`Gate is this skill\'s own body — A–P checklist owns it.`'), 'deferral line kept verbatim');
            // The mode ends with the standalone Next Steps prompt and closing reminders
            assert.match(text, /\n## Next Steps\n/);
            assert.match(text, /\n## Closing Reminders\n/);
        }
    },
    {
        name: 'TC-DMM-004 mode-only bodies stay in the reference; the router carries shared review and conditional document guidance; delivery names domain-analysis only',
        skip: SKIP,
        fn: () => {
            const skill = skillText();
            const review = modeReview();
            const canon = canonical();
            const tags = ['category-review-thinking', 'core-engineering-principles', 'goal-contract-satisfaction-loop', 'graph-assisted-investigation', 'review-principle-awareness', 'severity-rubric', 'source-test-drift-check', 'systematic-review-batching', 'task-tracking-external-report', 'trade-off-interrogation-gate', 'understand-code-first'];
            for (const tag of tags) {
                const body = extractSyncBody(canon, tag);
                assert.ok(body, `canonical body for ${tag}`);
                const carried = htmlBody(review, tag);
                assert.ok(carried, `mode-review.md carries the full ${tag} body`);
                assert.equal(normalizeEol(carried).trim(), normalizeEol(body).trim(), `${tag} equals canonical`);
                assert.ok(!skill.includes(`SYNC:${tag}`), `domain-analysis/SKILL.md must not carry ${tag}`);
            }
            // A references file keeps full bodies: no guide entry, no retired pointer line, balanced fences
            assert.deepEqual(guideTags(review), [], 'mode-review.md carries no guide entry');
            assert.deepEqual(guideTags(skill), ['output-quality-principles', 'review-decision-autonomy', 'review-policy'], 'shared document, decision and mode policies are routed at entry; domain-specific protocols stay isolated');
            assert.ok(skill.includes('<!-- SYNC:review-decision-autonomy:reminder -->'), 'the review policy reminder remains discoverable');
            assert.ok(skill.includes('<!-- SYNC:review-policy:reminder -->'), 'the shared modes/rounds reminder remains discoverable');
            const autonomy = fs.readFileSync(path.join(SKILLS, 'shared', 'protocols', 'review-decision-autonomy.md'), 'utf8');
            assert.match(autonomy, /Non-review creation, interviews and implementation retain their own contracts/, 'loading the guide cannot alter non-review mode authority');
            assert.ok(!review.includes('Root-carried protocols'), 'mode-review.md carries no retired pointer line');
            const opens = review.match(/<!-- SYNC:[a-z-]+(?::reminder)? -->/g) || [];
            const closes = review.match(/<!-- \/SYNC:[a-z-]+(?::reminder)? -->/g) || [];
            assert.equal(opens.length, closes.length, 'fences balanced');
            assert.ok((review.match(/<!-- SYNC:[a-z-]+:reminder -->/g) || []).length >= 11, 'the :reminder digests moved with the bodies');
            // Protocol delivery for the domain model group names the surviving skill only
            const groups = JSON.parse(read(SKILLS, 'shared', 'protocol-groups.json'));
            assert.equal(groups.groups['workflow-task'].tags['output-quality-principles'].trigger, 'documentation', 'document depth stays conditional');
            const listed = groups.deliveryTriggers['domain-model'].skills;
            assert.ok(listed.includes('domain-analysis'), 'domain-model group delivers to domain-analysis');
            assert.ok(!listed.includes(REMOVED), 'domain-model group no longer names the removed skill');
        }
    },
    {
        name: 'TC-DMM-005 the removed skill folder stays deleted and the workflow step runs domain-analysis --mode=review --report-only with consistent ids',
        skip: SKIP,
        fn: () => {
            assert.ok(!fs.existsSync(path.join(SKILLS, REMOVED)), `${REMOVED} must not exist as a skill folder`);
            const raw = fs.readFileSync(path.join(REPO_ROOT, '.claude', 'workflows.json'), 'utf8');
            assert.ok(!raw.includes(REMOVED), `workflows.json must not mention ${REMOVED}`);
            const document = JSON.parse(raw);
            // The review workflow's specialist step runs the merged mode as a read-only leaf
            const review = document.workflows['workflow-review-changes'];
            const step = review.sequence.find(entry => entry && entry.skill === 'domain-analysis');
            assert.ok(step, 'workflow-review-changes keeps the domain specialist step');
            assert.equal(review.defaultMode, 'fix-loop');
            assert.equal(step.args, '--mode=review --fix-loop --loop-owner=caller');
            assert.equal(step.role, 'optional');
            assert.ok(step.applicability && step.applicability.when && step.applicability.skipReason, 'the conditional applicability contract survives');
            // Every resolved variant keeps the same conditional owner and passes the mode's exact flags.
            for (const manifest of resolveAllWorkflowManifests(document, 'workflow-review-changes', { rootDir: REPO_ROOT })) {
                const leaf = manifest.occurrences.find(entry => entry.skill === 'domain-analysis');
                assert.ok(leaf && leaf.id === step.id, 'conditional reviewer identity survives every variant');
                assert.equal(leaf.args, manifest.mode === 'fix-loop'
                    ? '--mode=review --fix-loop --loop-owner=caller' : '--mode=review --review-only');
                assert.ok(leaf.applicability && leaf.applicability.when && leaf.applicability.skipReason);
            }
            // The scan target of the same name family is a different skill and stays
            assert.ok(review.sequence.some(entry => (typeof entry === 'string' ? entry : `${entry.skill} ${entry.args || ''}`).includes('scan --target=domain-entities')), 'the domain-entities scan step is untouched');
            // And no resolved workflow step runs the removed name
            for (const { skill } of (() => {
                const all = [];
                for (const id of Object.keys(document.workflows)) for (const m of resolveAllWorkflowManifests(document, id, { rootDir: REPO_ROOT })) all.push(...m.occurrences);
                return all;
            })()) assert.notEqual(skill, REMOVED);
        }
    },
    {
        name: 'TC-DMM-006 every workflow occurrence of domain-analysis passes arguments the skill supports',
        skip: SKIP,
        fn: () => {
            const dispatch = skillText();
            const found = occurrencesOf('domain-analysis');
            let reviewSteps = 0;
            for (const { workflow, mode, occurrence } of found) {
                const args = occurrence.args.trim();
                if (!args) continue;
                const match = /^--mode=([a-z]+)((?: (?:--report-only|--review-only|--fix-loop|--loop-owner=caller))*)$/.exec(args);
                assert.ok(match, `${workflow}/${mode}/${occurrence.id}: unsupported domain-analysis arguments "${args}"`);
                assert.ok(dispatch.includes(`\`--mode=${match[1]}`), `${workflow}/${occurrence.id}: domain-analysis has no --mode=${match[1]}`);
                reviewSteps += 1;
            }
            assert.ok(reviewSteps >= 1, `tripwire: the registry runs the review mode as a domain-analysis step (${reviewSteps})`);
            assert.ok(found.some(({ occurrence }) => !occurrence.args.trim()), 'tripwire: the default analysis still runs as a workflow step');
        }
    },
    {
        name: 'TC-DMM-007 the review mode reuses the DDD primer of domain analysis instead of copying it',
        skip: SKIP,
        fn: () => {
            const review = modeReview();
            const primer = read(SKILLS, 'domain-analysis', 'references', 'ddd-reference.md');
            // The primer stays the single owner of the matrices and is told about its second reader
            assert.match(primer, /### Decision Matrix/);
            assert.match(primer, /`--mode=review`/);
            // The review mode points at it and does not carry a copy of the shared matrices or pattern tables
            assert.match(review, /live once in `references\/ddd-reference\.md`/);
            for (const copied of ['### Decision Matrix', '### Canonical Value Objects', '### Aggregate Size Heuristics', '### Identity Strategies', '### Cross-Aggregate References']) {
                assert.ok(!review.includes(copied), `mode-review.md must not copy the primer section ${copied}`);
            }
            // The review-only tables stay with the review mode
            for (const own of ['### Invariant Enforcement Decision Table', '### Invariant vs Validation Decision Table', '### Paradigm Adaptation Table', '### Code Smell Signals']) {
                assert.ok(review.includes(own), `mode-review.md keeps ${own}`);
            }
        }
    },
    {
        name: 'TC-DMM-008 domain-analysis description keeps the step-skill form and advertises the review mode and both intents',
        skip: SKIP,
        fn: () => {
            const match = /^description: '([^']*)'$/m.exec(skillText());
            assert.ok(match, 'single-quoted frontmatter description');
            const description = match[1];
            assert.match(description, /^\[Architecture\] Use when a workflow step or the user asks for \S/);
            assert.ok(description.length <= 250, `description is ${description.length} chars, over 250`);
            assert.match(description, /--mode=review/);
            for (const intent of [/(?:bounded )?contexts/, /aggregates/, /entities/, /ERD/, /(?:domain )?events/, /value[- ]objects?/, /DDD/]) {
                assert.match(description, intent, `description retains routing intent ${intent}`);
            }
        }
    },
    {
        name: 'TC-DMM-009 the Domain Entity Change Gate routes to domain-analysis --mode=review in the canonical text, the projection and every copy',
        skip: SKIP,
        fn: () => {
            const canonicalGate = extractSyncBody(canonical(), 'domain-entity-change-gate');
            assert.ok(canonicalGate, 'canonical gate body');
            assert.ok(canonicalGate.includes('`/domain-analysis --mode=review` is the canonical owner of the full A–P checklist'), 'owner named');
            assert.ok(canonicalGate.includes('The running skill IS `/domain-analysis --mode=review`'), 'duplication guard row');
            const projection = read(SKILLS, 'shared', 'protocols', 'domain-entity-change-gate.md');
            assert.equal(normalizeEol(projection).trim(), normalizeEol(canonicalGate).trim(), 'projection equals canonical');
            for (const rel of ['.claude/agents/backend-developer.md', '.claude/agents/code-reviewer.md', '.claude/agents/planner.md', '.claude/skills/changes-review/SKILL.md']) {
                assert.ok(carriesCanonicalProtocol(read(REPO_ROOT, ...rel.split('/')), 'domain-entity-change-gate', projection, canonicalGate, rel.startsWith('.claude/skills/')),
                    `${rel} carries the canonical gate (agents retain full bodies)`);
            }
            const tag = 'domain-entity-change-gate';
            const guide = `<!-- PROTOCOL-GUIDES:START -->\n${guideCarrier.guideEntries(read(SKILLS, 'changes-review', 'SKILL.md')).get(tag)}\n<!-- PROTOCOL-GUIDES:END -->`;
            for (const [label, text, published, acceptGuide] of [
                ['missing published body', guide, null, true],
                ['drifted published body', guide, `${projection}\ndrift`, true],
                ['missing carrier', '', projection, true],
                ['wrong published path', guide.replace('→ .claude/skills/shared/protocols/', '→ wrong/protocols/'), projection, true],
                ['drifted inline body behind a guide', `${guide}\n<!-- SYNC:${tag} -->drift<!-- /SYNC:${tag} -->`, projection, true],
                ['unclosed inline body behind a guide', `${guide}\n<!-- SYNC:${tag} -->`, projection, true],
                ['guide-only agent', guide, projection, false]
            ]) {
                assert.equal(carriesCanonicalProtocol(text, tag, published, canonicalGate, acceptGuide), false, `${label} must fail`);
            }
        }
    },
    {
        name: 'TC-DMM-010 no live source names the removed skill',
        skip: SKIP,
        fn: () => {
            const offenders = [];
            let scanned = 0;
            for (const root of LIVE_SOURCE_ROOTS) {
                for (const rel of walk(root)) {
                    if (SCAN_EXCLUDED.has(rel)) continue;
                    scanned += 1;
                    const lines = fs.readFileSync(path.join(REPO_ROOT, ...rel.split('/')), 'utf8').split(/\r?\n/);
                    lines.forEach((line, index) => {
                        if (line.includes(REMOVED) && !allowedMention(rel, line)) offenders.push(`${rel}:${index + 1}`);
                    });
                }
            }
            assert.ok(scanned > 500, `tripwire: the scan covers the framework sources (${scanned} files)`);
            assert.deepEqual(offenders, [], 'replace each with `domain-analysis --mode=review`');
            // The allow-list is live: SKILL.md names the removed command only as "formerly"
            const named = skillText().split('\n').filter(line => line.includes(REMOVED));
            assert.ok(named.length >= 1 && named.every(line => /former/i.test(line)), 'domain-analysis/SKILL.md names the removed command only as "formerly"');
        }
    }
];

module.exports = { name: 'domain-analysis-modes-merge', tests };
