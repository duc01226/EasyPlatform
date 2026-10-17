'use strict';

/**
 * HTML report quality contract — generated HTML reports are readable, and their rules agree.
 *
 * Business intent: `/watzup` and `/release-doc` hand people an auto-opened HTML page that must
 * be beautiful, easy to read and easy to understand. The rules live only in prompt text and a
 * template, so an edit can silently bring back the defects this contract prevents: a status
 * placeholder that must carry raw markup (breaking the escape-every-value rule of an auto-opened
 * page), headers that mislabel rows for assistive technology, an outcome line competing with the
 * one emphasised element, and a visual gate that cannot pass where no browser exists.
 * Invariants guarded:
 *   - watzup template: a one-line outcome under the title, not emphasised like Start here;
 *     the Status column's markup lives in the template and both status placeholders are plain text;
 *     each Key-changes area sits in its own <tbody> so a rowgroup header labels only its rows;
 *   - watzup skill: a stated quality goal, and a readability check that runs before the report opens;
 *   - release-doc: four gates including the visual-clarity gate, recorded in the final report,
 *     with a source-only record when no renderer exists, never a plain PASS.
 *
 * Portability: reads only files that ship inside `.claude/`, resolved from this file's own
 * location. It spawns no process and reads no environment, home dir, project config or git state,
 * so it holds unchanged in any adopting project on Windows, macOS and Linux.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const CLAUDE_DIR = path.resolve(__dirname, '..', '..', '..');
const read = (...parts) => fs.readFileSync(path.join(CLAUDE_DIR, ...parts), 'utf8').replace(/\r\n/g, '\n');

const WATZUP_SKILL = () => read('skills', 'watzup', 'SKILL.md');
const WATZUP_TEMPLATE = () => read('skills', 'watzup', 'references', 'session-report-template.html');
const RELEASE_SKILL = () => read('skills', 'release-doc', 'SKILL.md');
const RELEASE_PROCEDURE = () => read('skills', 'release-doc', 'references', 'html-release-report.md');

/** Body of the `## {heading}` section, up to the next level-2 heading. */
function section(text, heading) {
    const start = text.indexOf(`\n## ${heading}`);
    assert.ok(start >= 0, `section "## ${heading}" must exist`);
    const next = text.indexOf('\n## ', start + 4);
    return text.slice(start, next < 0 ? text.length : next);
}

/** Every `{{PLACEHOLDER}}` that sits inside an element's text, with the markup around it. */
function placeholderContexts(html) {
    return [...html.matchAll(/<([a-z]+)[^>]*>([^<]*\{\{[A-Z_]+\}\}[^<]*)<\/\1>/g)].map(m => m[0]);
}

const tests = [
    {
        name: '[html-report] TC-HRQ-001 watzup: a one-line outcome sits under the title and is not emphasised like Start here',
        fn: () => {
            const html = WATZUP_TEMPLATE();
            const header = html.slice(html.indexOf('<header>'), html.indexOf('</header>'));
            assert.match(header, /<h1>\{\{SESSION_GOAL\}\}<\/h1>\s*<p class="lede">\{\{ONE_LINE_OUTCOME\}\}<\/p>/, 'the outcome line follows the title');
            const lede = html.match(/\.lede \{([^}]*)\}/);
            assert.ok(lede, '.lede rule must exist');
            assert.doesNotMatch(lede[1], /--size-lg|--size-xl/, 'the outcome line must not share the emphasised size of Start here');
            assert.match(html, /START HERE is the only emphasised element/, 'the template keeps its single-emphasis contract');
        }
    },
    {
        name: '[html-report] TC-HRQ-002 watzup: the Status column markup lives in the template; status placeholders are plain text',
        fn: () => {
            const html = WATZUP_TEMPLATE();
            assert.match(html, /<td data-label="Status"><span class="st st-\{\{STATUS_KIND\}\}">\{\{STATUS\}\}<\/span><\/td>/,
                'the status span is template markup around plain-text placeholders');
            assert.match(html, /STATUS_KIND is done \| partial \| open/, 'the allowed STATUS_KIND values are stated');
            for (const kind of ['done', 'partial', 'open']) assert.match(html, new RegExp(`\\.st-${kind} \\{`), `a .st-${kind} style exists`);
            assert.doesNotMatch(html, /status is one of\s*<span/, 'no instruction to put markup inside a placeholder value');
            for (const context of placeholderContexts(html)) {
                assert.doesNotMatch(context, /\{\{[A-Z_]+\}\}[^<]*<(?!\/)/, `placeholder text must not be followed by markup inside one element: ${context}`);
            }
            assert.match(html, /Encode every value: HTML-escape each placeholder value/, 'the escape-every-value rule stays absolute');
        }
    },
    {
        name: '[html-report] TC-HRQ-003 watzup: each Key-changes area has its own <tbody>, so a rowgroup header labels only its rows',
        fn: () => {
            const html = WATZUP_TEMPLATE();
            const keyChanges = html.slice(html.indexOf('id="key-changes"'), html.indexOf('id="why"'));
            assert.match(keyChanges, /repeat this <tbody> per area/, 'the repeat instruction targets the whole <tbody>');
            assert.match(keyChanges, /<tbody>\s*<tr class="group"><th scope="rowgroup" colspan="2">\{\{AREA\}\}<\/th><\/tr>/,
                'the area header is the first row of its own <tbody>');
            assert.equal((keyChanges.match(/scope="rowgroup"/g) || []).length, 1, 'one rowgroup header per repeated <tbody>');
        }
    },
    {
        name: '[html-report] TC-HRQ-004 watzup: the report has a quality goal and a readability check that runs before it opens',
        fn: () => {
            const report = section(WATZUP_SKILL(), 'Session Report (HTML)');
            assert.match(report, /\*\*Quality goal — beautiful, easy to read, easy to understand\.\*\*/);
            const check = report.indexOf('**Check readability**');
            const open = report.indexOf('**Open** it:');
            const write = report.indexOf('**Write**');
            assert.ok(write >= 0 && check > write && open > check, 'order: Write → Check readability → Open');
            assert.match(report, /every Done row has a text status/, 'the check covers the text status');
            assert.match(report, /\{\{STATUS\}\}.*\{\{STATUS_KIND\}\}|\{\{STATUS_KIND\}\}.*\{\{STATUS\}\}/, 'the skill names both plain-text status placeholders');
        }
    },
    {
        name: '[html-report] TC-HRQ-005 release-doc: four gates, the visual-clarity gate among them, all reported',
        fn: () => {
            const procedure = RELEASE_PROCEDURE();
            assert.match(procedure, /## R8\. \[BLOCKING\] Gates — run ALL FOUR before reporting done/);
            assert.match(procedure, /### R8\.4 \[BLOCKING\] Visual clarity gate/);
            const report = section(procedure, 'R10. Report to the user');
            for (const gate of ['accuracy', 'fidelity', 'audience', 'visual']) {
                assert.match(report, new RegExp(`Release ${gate}: PASS`), `R10 reports the ${gate} gate`);
            }
            assert.match(RELEASE_SKILL(), /Release visual: PASS\\?\|PASS \(source-only\)\\?\|FAIL/, 'the skill table names the visual gate record');
        }
    },
    {
        name: '[html-report] TC-HRQ-006 release-doc: with no renderer the visual gate records source-only, never a plain PASS',
        fn: () => {
            const procedure = RELEASE_PROCEDURE();
            const r65 = procedure.slice(procedure.indexOf('### R6.5'), procedure.indexOf('## R7.'));
            assert.match(r65, /\*\*No renderer available\*\*[^\n]*source-only[^\n]*never a plain PASS/, 'R6.5.8 states the no-renderer path');
            const r84 = procedure.slice(procedure.indexOf('### R8.4'), procedure.indexOf('## R9.'));
            assert.match(r84, /Record: `Release visual: PASS \| PASS \(source-only — \{reason\}\) \| FAIL`\./);
            assert.match(r84, /source-only runs list this item as unverified/, 'the screenshot check is listed as unverified, not passed');
        }
    }
];

module.exports = { name: 'HTML Report Quality', tests };
