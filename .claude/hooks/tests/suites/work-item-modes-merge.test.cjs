/**
 * Work-Item Modes Merge Test Suite
 *
 * The `work-item` skill owns six modes, each the unchanged contract of one former skill: `--mode=refine`
 * (initiative to task), `--mode=story` (slicing), `--mode=mockup` (interactive HTML mockup, `--explore`,
 * `--source`), `--mode=challenge` (Dev BA PIC challenge), `--mode=review` (`--type={task|story|spec-tests|
 * design}` artifact review) and `--mode=dor` (Definition of Ready gate). Each body lives in
 * `work-item/references/mode-<x>.md`; `work-item/SKILL.md` detects the mode first, shows the dispatch table when no
 * mode is given (asking nothing, guessing nothing) and carries a BLOCKING "read the mode file in full
 * FIRST" line per mode. `--reuse` links three modes: `review --type=task` produces the report and
 * `challenge` and `dor` consume it.
 *
 * Coverage:
 *   TC-PBM-001 — mode routing sits at the top, the no-mode rule shows the table and stops, every mode has
 *                a BLOCKING read line, an existing reference file and a dispatch row; the six former
 *                commands resolve through one "formerly" mapping.
 *   TC-PBM-002 — each mode keeps its hallmark contract (flags, gates, report paths, round caps, outputs).
 *   TC-PBM-003 — the `--reuse` contract: producer and consumers are modes of one skill, the symbolic id
 *                resolves to the `review --type=task` report, SHA-256 identity, coverage map, consumer-owned
 *                checks never reusable, and every workflow passes `--reuse` only to a consumer mode that
 *                follows a `review --type=task` step.
 *   TC-PBM-004 — mode-only protocols are canonical inline bodies in the mode references; SKILL.md carries
 *                no body and no guide line; fences balance.
 *   TC-PBM-005 — the six former skill folders stay deleted; every workflow occurrence of `work-item` names a mode
 *                and only flags that mode owns; outcome gates name the `work-item --mode=review` satisfier.
 *   TC-PBM-006 — the description keeps the step-skill form and names every mode.
 *   TC-PBM-007 — every `references/…` link inside the work-item skill resolves; type and mockup references keep
 *                unique names.
 *   TC-PBM-008 — each workflow skill's step line equals its resolved manifest for the workflows that run work-item.
 *   TC-PBM-009 — no live source names a removed skill (allow-list: the "formerly" lines and the report
 *                filename prefixes).
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
const SKIP = isFrameworkRepo(REPO_ROOT) ? false : 'asserts the framework repo\'s own work-item skill and workflow registry (framework-repo signal)';

const SKILLS = path.join(REPO_ROOT, '.claude', 'skills');
const read = (...parts) => fs.readFileSync(path.join(...parts), 'utf8').replace(/\r\n/g, '\n');
const skillText = () => read(SKILLS, 'work-item', 'SKILL.md');
const ref = name => read(SKILLS, 'work-item', 'references', name);
const canonical = () => read(SKILLS, 'shared', 'sync-inline-versions.md');

const MODES = ['refine', 'story', 'mockup', 'challenge', 'review', 'dor'];

// The removed skill names, assembled so this file never contains the literal tokens it guards against.
const REMOVED = ['re' + 'fine', 'st' + 'ory', 'pbi-' + 'mockup', 'pbi-' + 'challenge', 'artifact-' + 'review', 'dor-' + 'gate'];
const REMOVED_DIR_ONLY = REMOVED;

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

const loadRegistry = () => JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.claude', 'workflows.json'), 'utf8'));

/** Every resolved occurrence across all workflows and modes: { workflow, mode, occurrence, sequence }. */
function allOccurrences() {
    const document = loadRegistry();
    const found = [];
    for (const id of Object.keys(document.workflows)) {
        for (const manifest of resolveAllWorkflowManifests(document, id, { rootDir: REPO_ROOT })) {
            for (const occurrence of manifest.occurrences) found.push({ workflow: id, mode: manifest.mode, occurrence, manifest });
        }
    }
    return found;
}

const workItemOccurrences = () => allOccurrences().filter(({ occurrence }) => occurrence.skill === 'work-item');

const LIVE_SOURCE_ROOTS = ['.claude', 'docs/specs', 'docs/project-reference', 'README.md'];
// Generated catalogs are rebuilt from the skill folders; history stays in ADRs and release notes.
const SCAN_EXCLUDED = new Set([
    '.claude/SKILLS.yaml',
    '.claude/scripts/skills_data.yaml',
    '.claude/hooks/tests/suites/work-item-modes-merge.test.cjs'
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

// A removed skill name used as a skill reference: a slash command, a path segment under skills/, a
// `skill`/`name` field value, or a backticked / quoted bare token. Report filename prefixes such as
// `tmp/reports/<name>-{date}` and ordinary words never match.
const NAMES = REMOVED.join('|');
const MENTION = new RegExp([
    `(?<![\\w/.:\\\\-])/(?:${NAMES})(?![\\w/-])(?!\\s+points)`,
    `skills/(?:${NAMES})(?![\\w-])`,
    `"(?:skill|name)":\\s*"(?:${NAMES})"`,
    `\`(?:${REMOVED.filter(name => name !== 're' + 'fine' && name !== 'st' + 'ory').join('|')})\``,
    `(?<![\\w/.\\\\-])(?:${REMOVED.filter(name => name !== 're' + 'fine' && name !== 'st' + 'ory').join('|')})(?![\\w/-])`
].join('|'));

/** A line that names a removed skill but is an allowed mention. */
function allowedMention(rel, line) {
    if (rel === '.claude/skills/work-item/SKILL.md' && /[Ff]ormerly/.test(line)) return true;
    return false;
}

const tests = [
    {
        name: 'TC-PBM-001 work-item routes by mode first: no mode shows the table and stops, every mode has a BLOCKING read line and an existing reference, the six former commands resolve through one formerly mapping',
        skip: SKIP,
        fn: () => {
            const text = skillText();
            // Mode detection comes before the first content section
            const routing = text.indexOf('Mode routing');
            assert.ok(routing > 0 && routing < text.indexOf('## Quick Summary'), 'mode detection sits at the top, before the Quick Summary');
            // No mode: the table, no question, no guess
            assert.match(text, /With no mode, show the \[Mode Dispatch\]\(#mode-dispatch\) table and stop: ask nothing, guess nothing, run nothing/);
            assert.match(text, /no mode, or an unknown mode value, prints the table below and stops\. Never infer a mode/i);
            for (const mode of MODES) {
                assert.match(text, /\*\*\[BLOCKING\]\*\* Read the selected mode's reference in full FIRST/);
                assert.ok(text.split('\n').some(line => line.startsWith('| `--mode=' + mode + ' ') && line.includes('`references/mode-' + mode + '.md`')), `full-read dispatch for ${mode}`);
                assert.ok(fs.existsSync(path.join(SKILLS, 'work-item', 'references', `mode-${mode}.md`)), `references/mode-${mode}.md exists`);
                assert.match(text, new RegExp(`\\| \`--mode=${mode}[ \\]\`]`), `dispatch row for ${mode}`);
            }
            // One mapping line names all six former commands
            const formerly = text.split('\n').find(line => /Formerly `\/re\w+`, `\/st\w+`/.test(line));
            assert.ok(formerly, 'one line maps the former commands');
            for (const name of REMOVED) assert.ok(formerly.includes(`\`/${name}\``), `formerly mapping names /${name}`);
        }
    },
    {
        name: 'TC-PBM-002 every mode keeps the hallmark contract of its former skill (flags, gates, report paths, round caps, outputs)',
        skip: SKIP,
        fn: () => {
            // refine: the interview, estimate re-derivation and the task artifact path
            const refine = ref('mode-refine.md');
            for (const marker of ['## Phase 3: Problem Hypothesis Validation', '## Phase 7: Validation Interview (MANDATORY)', '## Phase 7.5: Re-evaluate Estimation (MANDATORY', '## Phase 7.6: Releasable Outcome Gate (BLOCKING)', '## Phase 8: Task Artifact Generation']) {
                assert.ok(refine.includes(marker), `refine keeps ${marker}`);
            }
            assert.match(refine, /Command `\/work-item --mode=refine` → base path `tasks\/`/);
            // story: slicing gates and the story artifact path
            const story = ref('mode-story.md');
            for (const marker of ['## INVEST Criteria', '## SPIDR Splitting Checklist', '## AI-SDD Mandate Gate (M1-M5 and M7) — BLOCKING', '## Story Artifact Template']) assert.ok(story.includes(marker), `story keeps ${marker}`);
            assert.match(story, /Command `\/work-item --mode=story` → base path `tasks\/stories\/`/);
            // mockup: scope gate, journey report, design authority, flags and the explore/demo references
            const mockup = ref('mode-mockup.md');
            assert.ok(mockup.includes('### Step 0: Mockup Scope Gate (`--explore` only; FIRST, before ANY reading or analysis)'), 'Step 0 scope gate');
            assert.match(mockup, /\| `--source=<path>` \|/);
            assert.match(mockup, /\| `--explore`\s+\|/);
            assert.match(mockup, /No wireframe, design plan, token table, direction draft or HTML before this report exists/);
            assert.match(mockup, /Design authority read:/);
            assert.ok(mockup.includes('`Mockup: SKIPPED by user (Step 0)`'), 'skip record kept');
            assert.ok(mockup.includes('`{same-dir-as-task}/{task-filename}-mockup.html`'), 'mockup output path kept');
            // challenge: cross-person review, report path, verdict set
            const challenge = ref('mode-challenge.md');
            assert.match(challenge, /CROSS-PERSON review/);
            assert.ok(challenge.includes('tmp/reports/task-challenge-{YYMMDD}-{task-id}.md'), 'challenge report path kept');
            for (const verdict of ['APPROVE', 'REQUEST_REVISION', 'ESCALATE_TO_LEAD']) assert.ok(challenge.includes(verdict), `challenge verdict ${verdict}`);
            // review: type dispatch, type references, round caps, re-review report path
            const review = ref('mode-review.md');
            assert.match(review, /Pass `--type=\{task\|story\|spec-tests\|design\}` to force a type; if omitted, infer it/);
            for (const type of ['task', 'story', 'spec-tests', 'design']) {
                assert.ok(review.includes(`references/review-type-${type}.md`), `review dispatches to review-type-${type}.md`);
                assert.ok(fs.existsSync(path.join(SKILLS, 'work-item', 'references', `review-type-${type}.md`)), `review-type-${type}.md exists`);
            }
            assert.match(review, /Round 1: zero open findings/);
            assert.match(review, /Round 2: zero CRITICAL\/HIGH\/MEDIUM, LOW deferred/);
            assert.match(review, /\/why-review --validate-findings/);
            assert.ok(review.includes('tmp/reports/artifact-' + 'review-rerun{N}-{date}.md'), 're-review report path kept');
            // dor: 8 criteria, result template and verdict
            const dor = ref('mode-dor.md');
            assert.match(dor, /## DoR Gate Result/);
            assert.match(dor, /\*\*\{READY_TO_PLAN \| FIX_REQUIRED\}\*\*/);
            assert.match(dor, /A DoR `PASS` over an M1-M5 or M7 violation is defective/);
            assert.match(dor, /`>13` EP is a SHOULD-SPLIT `WARN`, not a `FAIL`/);
            // every mode ends with Closing Reminders
            for (const mode of MODES) assert.match(ref(`mode-${mode}.md`), /\n## Closing Reminders\n/, `${mode} keeps Closing Reminders`);
        }
    },
    {
        name: 'TC-PBM-003 --reuse: producer and consumers are modes of one skill; symbolic id, SHA-256 identity, coverage map, consumer-owned checks never reusable, workflows pass --reuse only to consumers after a review --type=task step',
        skip: SKIP,
        fn: () => {
            const shared = read(SKILLS, 'shared', 'm1-m7-gates.md');
            const reuse = shared.slice(shared.indexOf('## Reusing an earlier verdict'));
            assert.ok(reuse.length > 0, 'the reuse section exists');
            // The symbolic id resolves to the report written by that run's review --type=task step
            assert.ok(reuse.includes('symbolic `--reuse=task-review`, which resolves to the report written by that run\'s `work-item --mode=review --type=task` step'), 'symbolic id resolution');
            assert.match(reuse, /SHA-256/);
            assert.match(reuse, /section\/path for this task/i);
            assert.match(reuse, /EVERY criterion and mandate/);
            for (const line of reuse.split('\n').filter(entry => /mtime/i.test(entry))) assert.match(line, /NOT|never/, 'mtime only ever forbidden');
            assert.match(reuse, /### Coverage map/);
            assert.match(reuse, /NEVER reusable/);
            assert.match(reuse, /A reused FAIL stays a FAIL/);
            // The skill entry restates the contract once and names all three modes
            const skill = skillText();
            assert.match(skill, /`--mode=review --type=task` is the producer; `--mode=challenge` and `--mode=dor` are the consumers/);
            assert.match(skill, /Consumer-owned checks are NEVER reusable/);
            assert.match(skill, /A reused FAIL stays FAIL\. A standalone run \(no `--reuse`\) evaluates every criterion/);
            // The consumers keep their own never-reusable checks and the hash requirement
            const dor = ref('mode-dor.md');
            const challenge = ref('mode-challenge.md');
            assert.match(dor, /\*\*Optional input — `--reuse=<task review report>` \(or the workflow form `--reuse=task-review`\):\*\*/);
            assert.match(dor, /DoR-owned checks are ALWAYS evaluated in full, reuse or not/);
            assert.match(dor, /SHA-256 content hash required/);
            assert.match(challenge, /### Optional input — `--reuse=<task review report>` \(or the workflow form `--reuse=task-review`\)/);
            assert.match(challenge, /Never skipped, reuse or not/);
            assert.match(challenge, /vagueness-token check/);
            // Every report header records a content hash
            for (const name of ['mode-review.md', 'review-type-task.md', 'review-type-story.md', 'review-type-design.md', 'review-type-spec-tests.md']) {
                const lines = ref(name).split('\n').filter(line => /Artifact identity/.test(line));
                assert.ok(lines.length > 0, `${name} records an identity line`);
                for (const line of lines) assert.match(line, /sha256/i, `${name} requires a hash`);
            }
            // Workflows: --reuse only on consumer modes, each after a review --type=task occurrence of the same run
            let consumers = 0;
            const document = loadRegistry();
            for (const id of Object.keys(document.workflows)) {
                for (const manifest of resolveAllWorkflowManifests(document, id, { rootDir: REPO_ROOT })) {
                    manifest.occurrences.forEach((occurrence, index) => {
                        if (occurrence.skill !== 'work-item') return;
                        const args = occurrence.args.split(/\s+/);
                        if (!args.some(token => token.startsWith('--reuse='))) return;
                        consumers += 1;
                        assert.ok(args.includes('--mode=challenge') || args.includes('--mode=dor'), `${id}/${occurrence.id}: --reuse belongs to a consumer mode`);
                        assert.ok(args.includes('--reuse=task-review'), `${id}/${occurrence.id}: the workflow form is the symbolic id`);
                        const producer = manifest.occurrences.slice(0, index).some(prior => prior.skill === 'work-item' && prior.args.split(/\s+/).includes('--mode=review') && prior.args.split(/\s+/).includes('--type=task'));
                        assert.ok(producer, `${id}/${occurrence.id}: a work-item --mode=review --type=task step runs before the consumer`);
                    });
                }
            }
            assert.ok(consumers >= 6, `tripwire: the registry runs consumer steps (${consumers})`);
        }
    },
    {
        name: 'TC-PBM-004 mode-only bodies stay in references; the router carries only review decision guidance; fences balance',
        skip: SKIP,
        fn: () => {
            const skill = skillText();
            const canon = canonical();
            const expected = {
                'mode-refine.md': ['estimation-framework', 'sequential-thinking-protocol', 'ui-system-context', 'ui-wireframe'],
                'mode-story.md': ['estimation-framework', 'sequential-thinking-protocol', 'ui-system-context', 'ui-wireframe'],
                'mode-mockup.md': ['design-distinctiveness-gate', 'design-review-checklist', 'existing-ui-research', 'ui-copywriting', 'ui-ux-design-principles', 'ux-journey-gate'],
                'mode-challenge.md': ['ba-team-decision-model', 'estimation-framework', 'refinement-dor-checklist', 'sequential-thinking-protocol', 'ui-system-context'],
                'mode-review.md': ['core-engineering-principles', 'design-distinctiveness-gate', 'design-review-checklist', 'evidence-based-reasoning', 'goal-contract-satisfaction-loop', 'review-principle-awareness', 'review-protocol-injection', 'severity-rubric', 'task-tracking-external-report', 'trade-off-interrogation-gate', 'ui-intent-layer', 'ui-ux-design-principles', 'understand-code-first', 'ux-journey-gate'],
                'mode-dor.md': ['estimation-framework']
            };
            const MIN_REMINDERS = { 'mode-refine.md': 3, 'mode-story.md': 3, 'mode-mockup.md': 5, 'mode-challenge.md': 3, 'mode-review.md': 12, 'mode-dor.md': 1 };
            for (const [file, tags] of Object.entries(expected)) {
                const text = ref(file);
                for (const tag of tags) {
                    const body = extractSyncBody(canon, tag);
                    assert.ok(body, `canonical body for ${tag}`);
                    const carried = htmlBody(text, tag);
                    assert.ok(carried, `${file} carries the full ${tag} body`);
                    assert.equal(normalizeEol(carried).trim(), normalizeEol(body).trim(), `${file}: ${tag} equals canonical`);
                    assert.ok(!skill.includes(`SYNC:${tag}`), `work-item/SKILL.md must not carry ${tag}`);
                }
                assert.deepEqual(guideTags(text), [], `${file} carries no guide entry`);
                assert.ok(!text.includes('Root-carried protocols'), `${file} carries no retired pointer line`);
                const opens = text.match(/<!-- SYNC:[a-z-]+(?::reminder)? -->/g) || [];
                const closes = text.match(/<!-- \/SYNC:[a-z-]+(?::reminder)? -->/g) || [];
                assert.equal(opens.length, closes.length, `${file}: fences balanced`);
                assert.ok((text.match(/<!-- SYNC:[a-z-]+:reminder -->/g) || []).length >= MIN_REMINDERS[file], `${file}: the :reminder digests moved with the bodies`);
            }
            assert.deepEqual(guideTags(skill), ['review-decision-autonomy', 'review-policy'], 'shared decision and mode policies are routed at entry; domain-specific protocols stay isolated');
            assert.ok(skill.includes('<!-- SYNC:review-decision-autonomy:reminder -->'), 'the review policy reminder remains discoverable');
            assert.ok(skill.includes('<!-- SYNC:review-policy:reminder -->'), 'the shared modes/rounds reminder remains discoverable');
            const autonomy = fs.readFileSync(path.join(SKILLS, 'shared', 'protocols', 'review-decision-autonomy.md'), 'utf8');
            assert.match(autonomy, /Non-review creation, interviews and implementation retain their own contracts/, 'loading the guide cannot alter non-review mode authority');
            assert.equal((skill.match(/Root-carried protocols/g) || []).length, 0, 'work-item/SKILL.md holds no retired pointer line');
            // Protocol delivery no longer names a removed skill
            const groups = read(SKILLS, 'shared', 'protocol-groups.json');
            for (const name of REMOVED) assert.ok(!groups.includes(`"${name}"`), `protocol-groups.json must not name ${name}`);
        }
    },
    {
        name: 'TC-PBM-005 the six former skill folders stay deleted; every work-item workflow occurrence names a mode and only flags that mode owns; gates name the work-item --mode=review satisfier',
        skip: SKIP,
        fn: () => {
            for (const name of REMOVED_DIR_ONLY) assert.ok(!fs.existsSync(path.join(SKILLS, name)), `${name} must not exist as a skill folder`);
            const occurrences = allOccurrences();
            for (const { workflow, occurrence } of occurrences) assert.ok(!REMOVED.includes(occurrence.skill), `${workflow}/${occurrence.id}: a workflow step still runs the removed skill ${occurrence.skill}`);
            const flagsOf = { refine: [], story: [], mockup: ['--explore', '--source='], challenge: ['--reuse='], review: ['--type=', '--fix-loop'], dor: ['--reuse='] };
            const seen = new Set();
            for (const { workflow, mode, occurrence } of workItemOccurrences()) {
                const tokens = occurrence.args.trim().split(/\s+/).filter(Boolean);
                const modeToken = tokens.find(token => token.startsWith('--mode='));
                assert.ok(modeToken, `${workflow}/${mode}/${occurrence.id}: work-item needs an explicit --mode (no default mode)`);
                const name = modeToken.slice('--mode='.length);
                assert.ok(MODES.includes(name), `${workflow}/${occurrence.id}: unsupported work-item mode ${name}`);
                seen.add(name);
                for (const token of tokens.filter(entry => entry !== modeToken)) {
                    assert.ok(flagsOf[name].some(flag => token.startsWith(flag)), `${workflow}/${occurrence.id}: flag ${token} is not owned by work-item --mode=${name}`);
                }
            }
            for (const mode of MODES) assert.ok(seen.has(mode), `tripwire: the registry runs work-item --mode=${mode}`);
            // Outcome gates that used the review skill name the merged satisfier
            const document = loadRegistry();
            let gates = 0;
            for (const entry of Object.values(document.workflows)) {
                for (const gate of entry.outcomeGates || []) {
                    for (const satisfier of gate.satisfiedBy) {
                        assert.ok(!REMOVED.includes(satisfier.split(/\s+/)[0]), `outcome gate ${gate.id} names a removed skill: ${satisfier}`);
                        if (satisfier.startsWith('work-item')) { gates += 1; assert.equal(satisfier, 'work-item --mode=review'); }
                    }
                }
            }
            assert.ok(gates >= 4, `tripwire: gates satisfied by work-item --mode=review (${gates})`);
            // Step ids stay unique per resolved manifest and do not embed a removed skill name
            for (const { workflow, occurrence } of occurrences) {
                for (const name of ['dor-' + 'gate', 'artifact-' + 'review']) assert.ok(!occurrence.id.includes(name), `${workflow}: step id ${occurrence.id} embeds ${name}`);
            }
        }
    },
    {
        name: 'TC-PBM-006 work-item description keeps the step-skill form within 250 characters and names every mode',
        skip: SKIP,
        fn: () => {
            const match = /^description: '([^']*)'$/m.exec(skillText());
            assert.ok(match, 'single-quoted frontmatter description');
            const description = match[1];
            assert.match(description, /^\[Project Management\] Use when a workflow step or the user asks for \S/);
            assert.ok(description.length <= 250, `description is ${description.length} chars, over 250`);
            for (const mode of MODES) assert.ok(description.includes(mode), `description names the ${mode} mode`);
            for (const intent of ['task refinement', 'story slicing', 'HTML mockups', 'draft challenges', 'artifact review', 'readiness check']) assert.ok(description.includes(intent), `description retains routing intent ${intent}`);
            // Operational flags and role/acceptance details remain in the dispatch contract.
            for (const keyword of ['--mode=', '--explore', '--type=', 'Dev BA PIC', 'acceptance criteria']) assert.ok(skillText().includes(keyword), `dispatch retains ${keyword}`);
        }
    },
    {
        name: 'TC-PBM-007 every references/ link inside the work-item skill resolves to a file with a unique name',
        skip: SKIP,
        fn: () => {
            const dir = path.join(SKILLS, 'work-item', 'references');
            const files = fs.readdirSync(dir).filter(name => name.endsWith('.md'));
            assert.equal(new Set(files.map(name => name.toLowerCase())).size, files.length, 'reference names are unique');
            for (const name of files) assert.ok(/^(mode|review-type|mockup)-/.test(name), `${name} follows the mode-/review-type-/mockup- naming`);
            const carriers = ['SKILL.md', ...files.map(name => path.join('references', name))];
            const missing = [];
            for (const rel of carriers) {
                const text = fs.readFileSync(path.join(SKILLS, 'work-item', rel), 'utf8');
                for (const match of text.matchAll(/`references\/([a-z0-9-]+\.md)`/g)) {
                    if (!fs.existsSync(path.join(dir, match[1]))) missing.push(`${rel} → references/${match[1]}`);
                }
            }
            assert.deepEqual(missing, [], 'every named reference file exists');
            // The design review type points at where the ui-intent-layer body lives (inline in mode-review.md), never at a SKILL.md guide line that does not exist
            assert.ok(!ref('review-type-design.md').includes('guide line in `SKILL.md`'), 'review-type-design.md must not point at a SKILL.md guide line');
            assert.ok(ref('review-type-design.md').includes('`SYNC:ui-intent-layer` (full body inline in `mode-review.md`)'), 'review-type-design.md names mode-review.md as the body owner');
            assert.ok(ref('mode-review.md').includes('<!-- SYNC:ui-intent-layer -->'), 'mode-review.md carries the ui-intent-layer body');
            // The old type names are not used as bare reference links any more
            for (const stale of ['task', 'story', 'design', 'spec-tests']) {
                assert.ok(!ref('mode-review.md').includes(`\`references/${stale}.md\``), `mode-review.md must link review-type-${stale}.md, not ${stale}.md`);
            }
        }
    },
    {
        name: 'TC-PBM-008 each workflow skill that runs work-item lists exactly its resolved manifest as its mandatory step line',
        skip: SKIP,
        fn: () => {
            const document = loadRegistry();
            let checked = 0;
            for (const id of Object.keys(document.workflows)) {
                const file = path.join(SKILLS, id, 'SKILL.md');
                if (!fs.existsSync(file)) continue;
                const manifests = resolveAllWorkflowManifests(document, id, { rootDir: REPO_ROOT });
                const skillMd = read(file);
                const defaults = manifests.find(manifest => manifest.mode === 'default');
                if (defaults) {
                    if (!defaults.occurrences.some(occurrence => occurrence.skill === 'work-item')) continue;
                    const lines = skillMd.split('\n').filter(line => /IMPORTANT MANDATORY Steps/.test(line));
                    const expected = defaults.sequence.map(step => `/${step}`).join(' -> ');
                    assert.ok(lines.some(line => line.includes(expected)), `${id}: the step line equals the resolved manifest (${expected})`);
                    checked += 1;
                    continue;
                }
                // Variant workflows describe each variant's steps in their own tables: every work-item step must be named there
                for (const manifest of manifests) {
                    for (const step of manifest.sequence.filter(entry => entry.startsWith('work-item '))) {
                        assert.ok(skillMd.includes(step), `${id}/${manifest.mode}: SKILL.md names the step "${step}"`);
                        checked += 1;
                    }
                }
            }
            assert.ok(checked >= 6, `tripwire: workflow skills with work-item steps were checked (${checked})`);
        }
    },
    {
        name: 'TC-PBM-009 no live source names a removed skill',
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
                        if (MENTION.test(line) && !allowedMention(rel, line)) offenders.push(`${rel}:${index + 1}`);
                    });
                }
            }
            assert.ok(scanned > 500, `tripwire: the scan covers the framework sources (${scanned} files)`);
            assert.deepEqual(offenders, [], 'replace each with `work-item --mode=<x>`');
            // The allow-list is live: SKILL.md names the removed commands only on the formerly lines
            const named = skillText().split('\n').filter(line => MENTION.test(line));
            assert.ok(named.length >= 1 && named.every(line => /[Ff]ormerly/.test(line)), 'work-item/SKILL.md names the removed commands only as "formerly"');
        }
    }
];

module.exports = { name: 'work-item-modes-merge', tests };
