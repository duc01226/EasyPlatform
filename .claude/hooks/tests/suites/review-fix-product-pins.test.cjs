'use strict';

/**
 * Product-skill pins (review fix FA) — business intent guarded:
 *
 *   reuse   a caller-passed `--reuse` report may satisfy ONLY criteria the shared coverage map lists;
 *           every check only the consumer owns (DoR GIVEN/WHEN/THEN + scenario minimums + auth,
 *           dependency Type/Status columns, the challenge vagueness-token check) is always evaluated;
 *           reuse needs a content hash (never size + mtime).
 *   initiative  the Validation Summary step always ends in ONE confirming question about the revised
 *           problem statement / scope (derived summary, not a second interview).
 *   scan    scan-all / docs-manager --mode=init read each target's own file head for its applies-when / skip-when gate.
 *   chain   the research chain restates no search/fetch cap numbers (each skill owns its own).
 *   end     workflow-end states the recap/baseline order once: the recap step is resolved (printed or
 *           skipped with a reason) before the owned baseline closes.
 *
 * These read the framework repo's own shipped skill text (framework repo only).
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const HOOKS_DIR = path.resolve(__dirname, '../..');
const REPO_ROOT = path.resolve(HOOKS_DIR, '..', '..');
const { isFrameworkRepo } = require(path.join(HOOKS_DIR, 'tests', 'lib', 'framework-repo-guard.cjs'));

const IS_FRAMEWORK_REPO = isFrameworkRepo(REPO_ROOT);
const SKIP_REASON = 'reads the framework repo\'s own shipped skills (framework-repo signal)';

const skillText = (...rel) => fs.readFileSync(path.join(REPO_ROOT, '.claude', 'skills', ...rel), 'utf8').replace(/\r\n?/g, '\n');

/** Text from `start` up to (not including) the next `end` after it; '' when `start` is absent. */
function between(text, start, end) {
    const from = text.indexOf(start);
    if (from === -1) return '';
    const to = text.indexOf(end, from + start.length);
    return text.slice(from, to === -1 ? undefined : to);
}

// Criteria only the consumer owns; none may appear in a "reusable" statement. The estimate is named by
// its current label (effort points) and by the earlier one that authored records may still carry.
const CONSUMER_OWNED_CRITERIA = /GIVEN\/WHEN\/THEN|scenario|auth|Type\b|Status\b|story template|(?:story|effort) points|UI design ready|vagueness|dependenc/i;

const guarded = fn => ({ skip: IS_FRAMEWORK_REPO ? false : SKIP_REASON, fn });

/**
 * Every (consumer | report row | criterion) triple of the `### Coverage map` table in m1-m7-gates.md,
 * sorted. Column 1 is the report row, each further column is one consumer's criterion (the header names it).
 */
function coverageMapPairs(text) {
    const map = between(text, '### Coverage map', '\n### Rules');
    const cells = line => line.split('|').slice(1, -1).map(cell => cell.replace(/\s+/g, ' ').trim());
    const lines = map.split('\n').filter(line => /^\|/.test(line));
    assert.ok(lines.length >= 3, 'the coverage map has a header, a separator and rows');
    const header = cells(lines[0]);
    const pairs = [];
    for (const line of lines.slice(2)) {
        const row = cells(line);
        for (let column = 1; column < header.length; column++) pairs.push(`${header[column]} | ${row[0]} | ${row[column]}`);
    }
    return pairs.sort();
}

// The only criteria a report may satisfy: the identical M1-M7 gate, and the releasable-outcome / full-flow row.
const EXPECTED_COVERAGE_PAIRS = [
    '`work-item --mode=challenge` criterion it may satisfy | M1, M2, M3, M4, M5, M7 verdicts (shared criteria above) | the M1-M7 compliance gate',
    '`work-item --mode=challenge` criterion it may satisfy | Row 1 — releasable outcome and full flow | Step 5 releasable outcome and UI full-flow surface checks',
    '`work-item --mode=dor` criterion it may satisfy | M1, M2, M3, M4, M5, M7 verdicts (shared criteria above) | the M1-M7 compliance gate',
    '`work-item --mode=dor` criterion it may satisfy | Row 1 — releasable outcome and full flow | Required row 3 (releasable outcome) and row 4 (full-flow surface)'
].sort();

const tests = [
    {
        name: '[review-fix-product] TC-RFP-001 work-item --mode=dor reuses only the coverage-mapped criteria; DoR-owned checks are always evaluated',
        ...guarded(() => {
            const section = between(skillText('work-item', 'references', 'mode-dor.md'), '**Optional input — `--reuse=', '**Failure fixes');
            assert.ok(section, 'the dor mode keeps its --reuse section');
            const split = section.indexOf('ALWAYS evaluated in full');
            assert.ok(split > 0, 'the section names the always-evaluated DoR-owned checks');
            const reusable = section.slice(section.indexOf('ONLY for what'), split);
            assert.ok(reusable.length > 0, 'the reusable statement is bounded by "ONLY for what" the map lists');
            const owned = section.slice(split);
            // Then the reusable statement lists the mapped rows and none of the consumer-owned ones
            assert.match(reusable, /coverage map/, 'reuse is bounded by the shared coverage map');
            assert.match(reusable, /rows? 3/, 'releasable outcome is reusable');
            assert.match(reusable, /4/, 'full-flow surface is reusable');
            assert.doesNotMatch(reusable, CONSUMER_OWNED_CRITERIA, 'no DoR-owned check is listed as reusable');
            // And the owned list names each DoR-only check
            for (const needle of [/user-story template/i, /GIVEN\/WHEN\/THEN/, /3 scenarios/, /auth scenario/, /Type and Status/, /UI design ready/i, /AI pre-review/i, /effort points/i]) {
                assert.match(owned, needle, `owned checks name ${needle}`);
            }
            assert.match(section, /SHA-256/, 'identity needs a content hash');
        })
    },
    {
        name: '[review-fix-product] TC-RFP-002 shared gate file: coverage map bounds reuse; identity needs a SHA-256 hash and never size + mtime',
        ...guarded(() => {
            const text = skillText('shared', 'm1-m7-gates.md');
            const reuse = text.slice(text.indexOf('## Reusing an earlier verdict'));
            assert.ok(reuse.length > 0, 'the reuse section exists');
            // Identity: algorithm named, mtime only ever forbidden, path + hash recorded, per-task and newest-report rules
            assert.match(reuse, /SHA-256/, 'the hash algorithm is stated');
            const mtimeLines = reuse.split('\n').filter(line => /mtime/i.test(line));
            assert.ok(mtimeLines.length > 0, 'the section addresses mtime');
            for (const line of mtimeLines) assert.match(line, /NOT|never/, `mtime may only appear as forbidden: ${line.slice(0, 120)}`);
            assert.match(reuse, /task path/, 'the header records the task path');
            assert.match(reuse, /section\/path for this task/i, 'several tasks: only this task\'s section/path counts');
            assert.match(reuse, /newest one for that path/, 'several matching reports: newest for the path');
            assert.match(reuse, /EVERY criterion and mandate/, 'any mismatch turns reuse off entirely');
            // Coverage map: exactly the identical criteria; nothing consumer-owned is a reusable row
            const map = between(reuse, '### Coverage map', '\n### Rules');
            const rows = map.split('\n').filter(line => /^\| /.test(line) && !/^\| ---/.test(line) && !/report row/.test(line));
            assert.ok(rows.length >= 2, 'the map lists the mapped rows');
            for (const row of rows) assert.doesNotMatch(row, /GIVEN|scenario|Type\b|Status\b|story template|vagueness/i, `map row must not cover a consumer-owned check: ${row}`);
            assert.match(map, /NEVER reusable/, 'everything outside the map is never reusable');
            assert.match(map, /Type\/Status columns/, 'the dependency Type/Status columns are named as consumer-owned');
            assert.match(map, /vagueness-token check/, 'the challenge vagueness-token check is named as consumer-owned');
        })
    },
    {
        name: '[review-fix-product] TC-RFP-003 work-item --mode=challenge reuses only the coverage-mapped criteria and always runs its own vagueness/AC-coverage checks',
        ...guarded(() => {
            const section = between(skillText('work-item', 'references', 'mode-challenge.md'), '### Optional input — `--reuse=', '\n## Output');
            assert.ok(section, 'the challenge mode keeps its --reuse section');
            const split = section.indexOf('Never skipped');
            assert.ok(split > 0, 'the section names the never-skipped checks');
            const reusable = section.slice(0, split);
            assert.match(reusable, /coverage map/, 'reuse is bounded by the shared coverage map');
            assert.doesNotMatch(reusable, /AC testability|AC-set completeness|dependencies/i, 'AC testability, AC completeness and dependencies are not reusable here');
            assert.match(section.slice(split), /vagueness-token check/, 'the vagueness-token check is always evaluated');
            assert.match(section, /SHA-256/, 'identity needs a content hash');
        })
    },
    {
        name: '[review-fix-product] TC-RFP-004 every work-item --mode=review report header requires a content hash, never size + mtime',
        ...guarded(() => {
            const files = [['references', 'mode-review.md'], ['references', 'review-type-task.md'], ['references', 'review-type-story.md'], ['references', 'review-type-design.md'], ['references', 'review-type-spec-tests.md']];
            for (const rel of files) {
                const lines = skillText('work-item', ...rel).split('\n').filter(line => /Artifact identity/.test(line));
                assert.ok(lines.length > 0, `${rel.join('/')} records an identity line`);
                for (const line of lines) {
                    assert.match(line, /sha256/i, `${rel.join('/')} requires a hash: ${line.slice(0, 120)}`);
                    assert.doesNotMatch(line.replace(/size \+ mtime is not an identity/, ''), /mtime/, `${rel.join('/')} must not accept mtime: ${line.slice(0, 120)}`);
                }
            }
            assert.match(skillText('work-item', 'references', 'review-type-task.md'), /Artifact identity:\*\* \{task path\}/, 'the task review template records the task path beside the hash');
        })
    },
    {
        name: '[review-fix-product] TC-RFP-005 initiative Step 7 always asks the one confirm question (no "only when materially changed" gate)',
        ...guarded(() => {
            const text = skillText('initiative', 'SKILL.md');
            const step7 = between(text, '### Step 7:', '**Validation Output Format');
            assert.ok(step7, 'Step 7 exists');
            assert.match(step7, /ALWAYS ask ONE short `ask user question tool`/, 'Step 7 asks unconditionally');
            assert.doesNotMatch(step7, /only when|materially|otherwise ask nothing/i, 'no conditional gate in Step 7');
            // Every other mention agrees: no line anywhere makes the confirm conditional
            assert.doesNotMatch(text, /confirm question only when|only when the answers materially/i, 'no carrier keeps the conditional confirm');
            // And the summary / step list / closing carriers state the confirm question
            const confirmMentions = text.split('\n').filter(line => /confirm/i.test(line) && /(?:Step 7|Validation Summary|7\. \*\*Validation)/.test(line));
            assert.ok(confirmMentions.length >= 3, 'summary, step list and closing rule state the Step 7 confirm question');
            assert.match(text, /\| "Validation is redundant after interview" \| ALWAYS run both/, 'the anti-rationalization row still requires both');
        })
    },
    {
        name: '[review-fix-product] TC-RFP-006 scan-all and docs-manager --mode=init read each target\'s own file head for applies-when / skip-when',
        ...guarded(() => {
            for (const [skill, parts] of [['scan-all', ['scan-all', 'SKILL.md']], ['docs-manager --mode=init', ['docs-manager', 'references', 'mode-init.md']]]) {
                const lines = skillText(...parts).split('\n').filter(line => /scan\/references\/targets\/<key>\.md/.test(line));
                assert.ok(lines.length > 0, `${skill} points at the per-target file`);
                assert.ok(lines.some(line => /BLOCKING/.test(line) && /applies when/.test(line) && /skip when/.test(line)), `${skill} carries a mandatory read line naming the gate`);
            }
            // The per-target file head really carries the gate the read line points at
            const head = fs.readFileSync(path.join(REPO_ROOT, '.claude', 'skills', 'scan', 'references', 'targets', 'backend-patterns.md'), 'utf8');
            assert.match(head, /\*\*applies when:\*\*/);
            assert.match(head, /\*\*skip when:\*\*/);
        })
    },
    {
        name: '[review-fix-product] TC-RFP-007 the research chain restates no copied search/fetch cap numbers',
        ...guarded(() => {
            const chain = skillText('web-research', 'references', 'research-chain.md');
            assert.doesNotMatch(chain, /\b(?:10|8)\b/, 'no copied cap number');
            assert.match(chain, /source-deep-dive/, 'the chain still delegates to source-deep-dive');
            assert.match(chain, /BLOCKING\] Read `\.claude\/skills\/source-deep-dive\/SKILL\.md`/, 'the mandatory read line stays');
            // The owners still state their own caps
            assert.match(skillText('source-deep-dive', 'SKILL.md'), /maximum 8 `WebFetch`/i, 'source-deep-dive owns the fetch cap');
        })
    },
    {
        name: '[review-fix-product] TC-RFP-008 workflow-end states one recap/baseline order: recap step resolved (printed or skipped with reason) before the baseline closes',
        ...guarded(() => {
            const text = skillText('workflow-end', 'SKILL.md');
            assert.doesNotMatch(text, /recap printed|print the recap before/i, 'no statement demands a printed recap before the baseline closes');
            const carriers = text.split('\n').filter(line => /workflow-baseline\.cjs close|Close only the workflow-owned baseline/.test(line));
            assert.ok(carriers.length >= 2, 'the baseline-close statements are present');
            for (const line of carriers.filter(l => /recap/.test(l))) {
                assert.match(line, /covered by watzup/, `baseline-close line keeps the watzup skip: ${line.slice(0, 140)}`);
            }
            assert.match(text, /A `watzup` occurrence follows/, 'the recap step still skips when watzup follows');
            // The skip is conditional on watzup actually running: a later-skipped watzup leaves the recap duty with workflow-end
            assert.match(text, /If that `watzup` is later skipped as a logged deviation, the recap duty stays with `workflow-end`: print the recap at that point/, 'the Explain step hands the recap back when watzup is skipped');
            assert.match(text, /`covered by watzup` — if that `\/watzup` is later skipped, the recap duty stays with `workflow-end`/, 'the rule line carries the same hand-back');
        })
    },
    {
        name: '[review-fix-product] TC-RFP-008b recap ownership is one rule: workflow-end, the nested workflow-e2e registry skip reason, its SKILL.md line and watzup agree that the parent tail owns a nested run\'s recap',
        ...guarded(() => {
            const end = skillText('workflow-end', 'SKILL.md');
            assert.match(end, /\*\*Nested in a parent workflow\*\*[^\n]*skip with reason `"covered by the parent workflow's watzup"`/, 'workflow-end skips the nested recap with the parent-owned reason');
            assert.match(end, /`workflow-end` prints the recap exactly when no `watzup` will run after it, in this run or in its parent workflow's tail/, 'the one rule is stated once in workflow-end');
            assert.match(end, /`no changes to explain` \/ `covered by watzup` \/ `covered by the parent workflow's watzup`/, 'the baseline-close step accepts the parent-owned skip as a resolved recap');
            // The registry skip reason names the same disposition (and no longer says control is returned to the parent in place of a recap)
            const registry = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.claude', 'workflows.json'), 'utf8'));
            const watzup = registry.workflows['workflow-e2e'].sequence.find(entry => entry.id === 'e2e-watzup');
            assert.ok(watzup, 'the nested-skippable watzup occurrence exists');
            assert.match(watzup.applicability.skipReason, /the parent's tail \(workflow-end then watzup\) owns the whole run's recap[^"]*`covered by the parent workflow's watzup`/);
            assert.doesNotMatch(watzup.applicability.skipReason, /return control to the parent after workflow-end/);
            // The e2e SKILL.md restates the registry reason verbatim, and watzup carries the matching ownership line
            assert.ok(skillText('workflow-e2e', 'SKILL.md').includes(watzup.applicability.skipReason), 'workflow-e2e SKILL.md carries the registry skip reason verbatim');
            assert.match(skillText('watzup', 'SKILL.md'), /Recap ownership: this Session summary is the run's recap whenever `watzup` runs; `workflow-end` prints the recap itself exactly when no `watzup` will run after it, and a nested workflow skips its own `watzup` because its parent's tail owns the recap\./);
        })
    },
    {
        name: '[review-fix-product] TC-RFP-009 the --reuse coverage map is a CLOSED allow-list: exactly the pinned (report row -> consumer criterion) pairs, nothing added or changed',
        ...guarded(() => {
            const text = skillText('shared', 'm1-m7-gates.md');
            const pairs = coverageMapPairs(text);
            assert.deepEqual(pairs, EXPECTED_COVERAGE_PAIRS, 'the coverage map must list exactly the pinned pairs; a new reusable criterion needs this allow-list changed deliberately, with the consumer criterion proven identical to the report row');
        })
    },
    {
        name: '[review-fix-product] TC-RFP-010 the allow-list pin fails when a pair is added or changed (mutation check on the parser, in memory)',
        ...guarded(() => {
            const original = skillText('shared', 'm1-m7-gates.md');
            assert.deepEqual(coverageMapPairs(original), EXPECTED_COVERAGE_PAIRS, 'baseline: the shipped map equals the allow-list');
            const rowAnchor = '| Row 1 — releasable outcome and full flow |';
            assert.ok(original.includes(rowAnchor), 'the mutation anchor row exists');
            // Mutation 1: a new report row whose criterion is neither consumer-owned-vague nor GIVEN-flavoured — the old word filter would accept it
            const added = original.replace(rowAnchor, '| Row 2 — AC testable | Required row 2 (AC testable) | Step 3 AC set |\n' + rowAnchor);
            assert.notDeepEqual(coverageMapPairs(added), EXPECTED_COVERAGE_PAIRS, 'an added pair is detected');
            // Mutation 2: an existing pair re-pointed at a different consumer criterion
            const changed = original.replace('Required row 3 (releasable outcome) and row 4 (full-flow surface)', 'Required row 2 (AC testable) and row 4 (full-flow surface)');
            assert.notDeepEqual(coverageMapPairs(changed), EXPECTED_COVERAGE_PAIRS, 'a changed pair is detected');
            // Mutation 3: a dropped pair
            const dropped = original.replace(/\| Row 1 — releasable outcome and full flow \|[^\n]*\n/, '');
            assert.notDeepEqual(coverageMapPairs(dropped), EXPECTED_COVERAGE_PAIRS, 'a dropped pair is detected');
        })
    }
];

module.exports = { name: 'review-fix-product-pins', tests };
