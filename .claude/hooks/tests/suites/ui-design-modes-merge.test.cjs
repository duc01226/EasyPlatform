/**
 * UI Design Modes Merge Test Suite
 *
 * The ui-design skill owns two roles: the design modes (`fast` default, `good`, `explore`, `describe`,
 * `screenshot`, `video`, each combined with a `--lane`) and `--mode=review` (UI review of content fit,
 * supported-size layout, styling conventions, layering, accessibility and async states, with the
 * `--report-only` leaf contract and the validated fix loop). The review body lives in
 * `ui-design/references/mode-review.md`; `ui-design/SKILL.md` detects the mode first and carries a
 * BLOCKING "read the mode file in full FIRST" line, so the design modes never load the review body.
 * The review mode has no skill folder of its own.
 *
 * Coverage:
 *   TC-UDM-001 — mode routing sits at the top, an explicit mode wins, the review mode has its BLOCKING
 *                read line, a reference file, a dispatch-table row and the "formerly" mapping.
 *   TC-UDM-002 — the design modes keep their contract (six modes, `fast` default, two lanes, journey
 *                spine) and the SKILL.md text does not carry the review body.
 *   TC-UDM-003 — the review mode keeps its phases, the six categories, the nine-dimension and DD passes,
 *                the report-only leaf contract, the severity mapping, the report paths and the
 *                specialist-override blocks.
 *   TC-UDM-004 — mode-only protocols are canonical inline bodies in the mode reference, never in
 *                SKILL.md; the design protocols stay guides in SKILL.md; fences balance; protocol
 *                delivery names ui-design only.
 *   TC-UDM-005 — the removed skill folder stays deleted; the review workflow's specialist step and the
 *                spec-to-mockup gate run `ui-design --mode=review` and every registry reference to the
 *                step ids stays consistent.
 *   TC-UDM-006 — every workflow occurrence of ui-design passes arguments the skill supports.
 *   TC-UDM-007 — the description keeps the step-skill form and routes both intents.
 *   TC-UDM-008 — the workflow skills list the merged invocation in their mandatory step lines.
 *   TC-UDM-009 — no live source names the removed skill (allow-list: the "formerly" lines, the report
 *                filename prefix and an unrelated project-doc filename).
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

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SKIP = isFrameworkRepo(REPO_ROOT) ? false : 'asserts the framework repo\'s own ui-design skill and workflow registry (framework-repo signal)';

const SKILLS = path.join(REPO_ROOT, '.claude', 'skills');
const read = (...parts) => fs.readFileSync(path.join(...parts), 'utf8').replace(/\r\n/g, '\n');
const skillText = () => read(SKILLS, 'ui-design', 'SKILL.md');
const modeReview = () => read(SKILLS, 'ui-design', 'references', 'mode-review.md');
const canonical = () => read(SKILLS, 'shared', 'sync-inline-versions.md');

// The removed skill name, assembled so this file never contains the literal token it guards against.
const REMOVED = 'ui-' + 'review';

/** Body between the paired HTML-comment fences of `tag` in a carrier file, or null. */
function htmlBody(text, tag) {
    const match = new RegExp(`<!-- SYNC:${tag} -->\\s*([\\s\\S]*?)\\s*<!-- /SYNC:${tag} -->`).exec(text);
    return match ? match[1] : null;
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
    '.claude/hooks/tests/suites/ui-design-modes-merge.test.cjs'
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
    if (rel === '.claude/skills/ui-design/SKILL.md' && /former/i.test(line)) return true;
    if (rel === '.claude/skills/ui-design/SKILL.md' && /^\| `\/ui-review` \| `\/ui-design --mode=review \[scope\] \[--report-only\]`/.test(line)) return true;
    if (rel === '.claude/skills/ui-design/references/mode-review.md') {
        if (/Formerly `\/ui-review`/.test(line)) return true;
        if (/^>[^\n]*Reports use the `ui-review-` prefix\./.test(line)) return true;
        if (line.includes('tmp/reports/' + REMOVED + '-')) return true;
    }
    // A project-doc filename the scaffold skill writes into adopter projects; it names no skill.
    if (rel === '.claude/skills/scaffold/SKILL.md' && line.includes(REMOVED + '-principles.md')) return true;
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

// Protocols only the review mode needs: carried as full canonical bodies inside the mode reference.
const MODE_ONLY_TAGS = [
    'category-review-thinking', 'core-engineering-principles', 'design-patterns-quality', 'evidence-based-reasoning', 'goal-contract-satisfaction-loop', 'graph-assisted-investigation', 'review-principle-awareness', 'sequential-thinking-protocol', 'severity-rubric', 'source-test-drift-check',
    'subagent-return-contract', 'systematic-review-batching', 'task-tracking-external-report', 'trade-off-interrogation-gate',
    'understand-code-first'
];
// Protocols the design modes already carry in SKILL.md (guide line + reminder); the reference does not repeat them.
const SHARED_TAGS = ['design-distinctiveness-gate', 'design-review-checklist', 'ui-copywriting', 'ui-ux-design-principles', 'ux-journey-gate'];

const tests = [
    {
        name: 'TC-UDM-001 ui-design keeps the review mode with a BLOCKING read-first line, its reference file, an explicit-mode-wins rule and the formerly mapping',
        skip: SKIP,
        fn: () => {
            // Given the ui-design skill
            const text = skillText();
            // Then mode detection comes before the first content section and lists the review mode
            const routing = text.indexOf('Mode routing');
            assert.ok(routing > 0 && routing < text.indexOf('## Quick Summary'), 'mode detection sits at the top, before the Quick Summary');
            assert.match(text, /--mode=review/);
            // And an explicit mode wins while no mode stays the default fast design
            assert.match(text, /An explicit `--mode` always wins/);
            assert.match(text, /omitted `--mode` defaults to `fast`/);
            // And the mode has a mandatory full-read line naming an existing reference
            assert.match(text, /\*\*\[BLOCKING\] When `--mode=review`, read `references\/mode-review\.md` in full FIRST\*\*/);
            assert.ok(fs.existsSync(path.join(SKILLS, 'ui-design', 'references', 'mode-review.md')), 'references/mode-review.md exists');
            // And the dispatch table carries the row and the removed slash command resolves through a "formerly" mapping
            assert.match(text, /\| `review` +\| changed UI files \/ surfaces \|/);
            assert.match(text, /the old commands do not resolve/);
            assert.match(text, /\| `\/ui-review` \| `\/ui-design --mode=review \[scope\] \[--report-only\]`/);
            // And the review mode is never the default and never inferred
            assert.match(text, /`--mode=review` is never inferred from the brief and is never the default/);
        }
    },
    {
        name: 'TC-UDM-002 the design modes keep their contract and SKILL.md does not carry the review body',
        skip: SKIP,
        fn: () => {
            const text = skillText();
            const reviewOnly = [
                '## Phase 2B: Surface Composition',
                '## Phase 2C: Surface UX Pass',
                '### Category 6: Async UI States & Feedback',
                '## Phase 5: Why-Review Findings Validation Gate',
                '## Report-Only Mode (`--report-only`)',
                '## Phase 3B: UI/UX Design Principles Pass'
            ];
            for (const marker of reviewOnly) assert.ok(!text.includes(marker), `ui-design/SKILL.md must not inline review text: ${marker}`);
            for (const marker of reviewOnly) assert.ok(modeReview().includes(marker), `mode-review.md holds ${marker}`);
            // And the six design modes, the default and both lanes keep their table rows and branches
            for (const mode of ['fast', 'good', 'explore', 'describe', 'screenshot', 'video']) {
                assert.match(text, new RegExp(`\\| \`${mode}\`[^|]*\\|`), `mode table row ${mode}`);
                assert.match(text, new RegExp(`\\n### \`--mode=${mode}\``), `mode branch ${mode}`);
            }
            assert.match(text, /\| `fast` \(default\)/);
            assert.match(text, /When `--mode` is omitted, default to `--mode=fast`\./);
            assert.match(text, /When `--lane` is omitted, default to `--lane=product`/);
            assert.match(text, /Do NOT inline the lane bodies here/);
            // And the journey-first spine stays BLOCKING for every design mode
            assert.match(text, /\*\*\[BLOCKING\] Step 0 — Journey Report \(`UX-1`\)\./);
            assert.match(text, /BLOCKING in EVERY design mode/);
            // And the design skill no longer advertises the removed review skill as its sibling owner
            assert.ok(!text.includes('`/' + REMOVED + '` owns'), 'ownership line names the review mode');
        }
    },
    {
        name: 'TC-UDM-003 --mode=review keeps phases 0-6, six categories, the principles and DD passes, the report-only leaf contract, the severity mapping, the report paths and the specialist overrides',
        skip: SKIP,
        fn: () => {
            const text = modeReview();
            // Phases and categories
            for (const phase of ['0: Load UI Rules', '1: Determine Scope', '2: Blast Radius', '2B: Surface Composition', '2C: Surface UX Pass', '3: UI Category Review', '3B: UI/UX Design Principles Pass', '3C: Design Distinctiveness Pass', '4: Finalize', '5: Why-Review Findings Validation Gate', '6: Validated Fix + Full UI Re-Review Loop']) {
                assert.ok(text.includes(`\n## Phase ${phase}`), `Phase ${phase} exists`);
            }
            for (const category of [1, 2, 3, 4, 5, 6]) assert.match(text, new RegExp(`\\n### Category ${category}: `), `Category ${category}`);
            // The journey walkthrough, traceability and gate report obligations
            assert.match(text, /\*\*Journey walkthrough \(`UX-8`\)\*\*/);
            assert.match(text, /\*\*Traceability check \(`UX-8`\)\*\*/);
            assert.match(text, /### UI\/UX Gate Report \(`UX-11`\)/);
            // The validation-first loop and the round bars
            assert.match(text, /\/why-review --validate-findings/);
            assert.match(text, /Round 1 blocks on every open validated severity; Round 2 blocks only CRITICAL\/HIGH\/MEDIUM/);
            // --report-only is a read-only leaf: caller-mode read, no fix/restart/fan-out/questions, severity mapping
            assert.match(text, /read `\.claude\/skills\/workflow-review-changes\/references\/caller-mode\.md` § `--report-only` in full FIRST/);
            assert.match(text, /\*\*Run Phases 0–5 only\.\*\*/);
            assert.match(text, /\*\*No nested fan-out\.\*\*/);
            assert.match(text, /\| BLOCKED \| \*\*Critical\*\* for a `P0` finding, \*\*High\*\* for a `P1` finding/);
            assert.match(text, /\| WARN \| \*\*Medium\*\* for `P2`, \*\*Low\*\* for `P3`/);
            // Report paths keep their historical prefix so a caller or reader finds the same artifact
            assert.ok(text.includes('tmp/reports/' + REMOVED + '-{date}-{slug}.md'), 'index report path prefix kept');
            assert.ok(text.includes('tmp/reports/' + REMOVED + '-{date}-{slug}/surfaces/{surface}.md'), 'per-surface report path kept');
            assert.ok(text.includes('tmp/reports/' + REMOVED + '-round{N}-{date}.md'), 'fresh-reviewer round report path kept');
            // The severity translation stays the single checklist map; the AI-surface pointer stays
            assert.match(text, /design-review-checklist\.md` §0\.3/);
            assert.match(text, /\*\*AI surface\?\*\*/);
            // The specialist override blocks keep the UI/UX-specialized reviewer and the durable round budget
            assert.doesNotMatch(text, /<!-- OVERRIDE:fresh-context-review -->/);
            assert.match(text, /<!-- OVERRIDE:review-protocol-injection -->/);
            assert.match(text, /subagent_type: "ui-ux-designer"/);
            assert.match(text, /current round's exit bar/);
            assert.match(text, /persisted `minRounds`/);
            // The mode ends with the standalone Next Steps prompt and closing reminders
            assert.match(text, /\n## Next Steps\n/);
            assert.match(text, /\n## Closing Reminders\n/);
            assert.match(text, /`--report-only` runs Phases 0–5 only/);
            // The configuration keys the review reads are unchanged
            assert.ok(text.includes('`uiReview.representativeSurfaces`') && text.includes('`uiReview.complexityBudget`'), 'uiReview config keys kept');
        }
    },
    {
        name: 'TC-UDM-004 mode-only protocols are canonical inline bodies in the mode reference, never in ui-design/SKILL.md; design protocols stay guides; delivery names ui-design only',
        skip: SKIP,
        fn: () => {
            const skill = skillText();
            const review = modeReview();
            const canon = canonical();
            for (const tag of MODE_ONLY_TAGS) {
                const body = extractSyncBody(canon, tag);
                assert.ok(body, `canonical body for ${tag}`);
                const carried = htmlBody(review, tag);
                assert.ok(carried, `mode-review.md carries the full ${tag} body`);
                assert.equal(normalizeEol(carried).trim(), normalizeEol(body).trim(), `${tag} equals canonical`);
                assert.ok(!skill.includes(`<!-- SYNC:${tag} -->`), `ui-design/SKILL.md must not carry the ${tag} body`);
                assert.ok(!guideTags(skill).includes(tag), `ui-design/SKILL.md must not gain a ${tag} guide`);
            }
            // The design protocols stay guide lines in SKILL.md and are not repeated in the reference
            for (const tag of SHARED_TAGS) {
                assert.ok(guideTags(skill).includes(tag), `ui-design/SKILL.md keeps the ${tag} guide`);
                assert.equal(htmlBody(review, tag), null, `mode-review.md does not repeat the ${tag} body`);
            }
            // A references file keeps full bodies: no guide entry, no retired pointer line, balanced fences
            assert.deepEqual(guideTags(review), [], 'mode-review.md carries no guide entry');
            assert.ok(!review.includes('Root-carried protocols'), 'mode-review.md carries no retired pointer line');
            const opens = review.match(/<!-- SYNC:[a-z-]+(?::reminder)? -->/g) || [];
            const closes = review.match(/<!-- \/SYNC:[a-z-]+(?::reminder)? -->/g) || [];
            assert.equal(opens.length, closes.length, 'fences balanced');
            assert.ok((review.match(/<!-- SYNC:[a-z-]+:reminder -->/g) || []).length >= MODE_ONLY_TAGS.length, 'the :reminder digests moved with the bodies');
            // Protocol delivery for the ui group names the surviving skill only
            const groups = JSON.parse(read(SKILLS, 'shared', 'protocol-groups.json'));
            const listed = groups.deliveryTriggers.ui.skills;
            assert.ok(listed.includes('ui-design'), 'ui group delivers to ui-design');
            assert.ok(!listed.includes(REMOVED), 'ui group no longer names the removed skill');
            assert.ok(!(groups.inlineSkills || []).includes(REMOVED), 'inlineSkills never named the removed skill');
        }
    },
    {
        name: 'TC-UDM-005 the removed skill folder stays deleted; the review workflow step and the mockup gate run ui-design --mode=review with consistent ids',
        skip: SKIP,
        fn: () => {
            assert.ok(!fs.existsSync(path.join(SKILLS, REMOVED)), `${REMOVED} must not exist as a skill folder`);
            const raw = fs.readFileSync(path.join(REPO_ROOT, '.claude', 'workflows.json'), 'utf8');
            assert.ok(!raw.includes(REMOVED), `workflows.json must not mention ${REMOVED}`);
            const document = JSON.parse(raw);
            // The review workflow's specialist step runs the merged mode as a read-only leaf
            const review = document.workflows['workflow-review-changes'];
            const step = review.sequence.find(entry => entry && entry.skill === 'ui-design');
            assert.ok(step, 'workflow-review-changes keeps the UI specialist step');
            assert.equal(review.defaultMode, 'fix-loop');
            assert.equal(step.args, '--mode=review --fix-loop --loop-owner=caller');
            assert.equal(step.role, 'optional');
            assert.ok(step.applicability && step.applicability.when && step.applicability.skipReason, 'the conditional applicability contract survives');
            // Every resolved variant keeps the same conditional owner and passes the mode's exact flags.
            for (const manifest of resolveAllWorkflowManifests(document, 'workflow-review-changes', { rootDir: REPO_ROOT })) {
                const leaf = manifest.occurrences.find(entry => entry.skill === 'ui-design');
                assert.ok(leaf && leaf.id === step.id, 'conditional reviewer identity survives every variant');
                assert.equal(leaf.args, manifest.mode === 'fix-loop'
                    ? '--mode=review --fix-loop --loop-owner=caller' : '--mode=review --review-only');
                assert.ok(leaf.applicability && leaf.applicability.when && leaf.applicability.skipReason);
            }
            // The mockup workflow keeps its always-run review gate on the merged mode
            const mockup = document.workflows['workflow-spec-to-mockup'];
            const gate = mockup.sequence.find(entry => entry && entry.skill === 'ui-design');
            assert.ok(gate, 'workflow-spec-to-mockup keeps the UI review step');
            assert.equal(gate.args, '--mode=review');
            assert.equal(gate.role, 'gate');
            // And no resolved workflow step runs the removed name
            for (const id of Object.keys(document.workflows)) {
                for (const manifest of resolveAllWorkflowManifests(document, id, { rootDir: REPO_ROOT })) {
                    for (const occurrence of manifest.occurrences) assert.notEqual(occurrence.skill, REMOVED, `${id}/${manifest.mode} runs ${REMOVED}`);
                }
            }
        }
    },
    {
        name: 'TC-UDM-006 every workflow occurrence of ui-design passes arguments the skill supports',
        skip: SKIP,
        fn: () => {
            const dispatch = skillText();
            const found = occurrencesOf('ui-design');
            assert.ok(found.length >= 2, `tripwire: the registry runs ui-design as a step (${found.length})`);
            for (const { workflow, mode, occurrence } of found) {
                const args = occurrence.args.trim();
                const match = /^--mode=([a-z]+)((?: (?:--report-only|--review-only|--fix-loop|--loop-owner=caller))*)$/.exec(args);
                assert.ok(match, `${workflow}/${mode}/${occurrence.id}: unsupported ui-design arguments "${args}"`);
                assert.ok(dispatch.includes(`\`--mode=${match[1]}`) || dispatch.includes(`| \`${match[1]}\``), `${workflow}/${occurrence.id}: ui-design has no --mode=${match[1]}`);
                // --report-only belongs to the review mode only
                if (match[2]) assert.equal(match[1], 'review', `${workflow}/${occurrence.id}: --report-only is a review-mode flag`);
            }
        }
    },
    {
        name: 'TC-UDM-007 ui-design description keeps the step-skill form and routes both the design and the review intent',
        skip: SKIP,
        fn: () => {
            const match = /^description: '([^']*)'$/m.exec(skillText());
            assert.ok(match, 'single-quoted frontmatter description');
            const description = match[1];
            assert.match(description, /^\[Design\] Use when a workflow step or the user asks for \S/);
            assert.ok(description.length <= 250, `description is ${description.length} chars, over 250`);
            for (const mode of ['fast', 'good', 'explore', 'describe', 'screenshot', 'video', 'review']) {
                assert.ok(skillText().includes(`\`${mode}\``) || skillText().includes(`--mode=${mode}`), `dispatch retains the ${mode} mode`);
            }
            for (const intent of [/UI (?:design|creation)/, /explor(?:ation|e)/, /descrip(?:tion|be)/, /screenshots?/, /videos?/, /--mode=review/, /layout/, /styling/, /accessibility/, /async states/]) {
                assert.match(description, intent, `description retains routing intent ${intent}`);
            }
            // Content-fit requirements belong to the mandatory review reference.
            assert.match(modeReview(), /content.fit|Container fits the task|container.fit/i);
        }
    },
    {
        name: 'TC-UDM-008 the review and mockup workflow skills list the merged invocation in their mandatory step lines',
        skip: SKIP,
        fn: () => {
            const document = loadRegistry();
            for (const id of ['workflow-review-changes', 'workflow-spec-to-mockup']) {
                const line = read(SKILLS, id, 'SKILL.md').split('\n').find(candidate => candidate.startsWith('**IMPORTANT MANDATORY Steps:**'));
                assert.ok(line, `${id} has its mandatory steps line`);
                const manifests = resolveAllWorkflowManifests(document, id, { rootDir: REPO_ROOT });
                const manifest = manifests.find(item => item.mode === document.workflows[id].defaultMode) || manifests[0];
                const expected = manifest.occurrences.map(occurrence => `/${occurrence.skill}${occurrence.args ? ` ${occurrence.args}` : ''}`).join(' -> ');
                assert.equal(line, `**IMPORTANT MANDATORY Steps:** ${expected}`, `${id} step line equals the resolved manifest`);
                assert.ok(line.includes('/ui-design --mode=review'), `${id} step line runs the merged review mode`);
            }
        }
    },
    {
        name: 'TC-UDM-009 no live source names the removed skill',
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
            assert.deepEqual(offenders, [], 'replace each with `ui-design --mode=review`');
            // The allow-list is live: SKILL.md names the removed command only as "formerly"
            const named = skillText().split('\n').filter(line => line.includes(REMOVED));
            assert.ok(named.length >= 1 && named.every(line => allowedMention('.claude/skills/ui-design/SKILL.md', line)), 'ui-design/SKILL.md names the removed command only as "formerly"');
        }
    }
];

module.exports = { name: 'ui-design-modes-merge', tests };
