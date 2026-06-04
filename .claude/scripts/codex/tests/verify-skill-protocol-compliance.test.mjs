import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const verifierPath = path.resolve(thisDir, '..', 'verify-skill-protocol-compliance.mjs');
const { checkDebuggerTraceCoverage, checkOrphanHeadings } = await import(pathToFileURL(verifierPath).href);

const joinLines = (...lines) => lines.join('\n');

// TC-SKILLFIX-001 — orphan: heading immediately followed by a SAME-level heading, no body.
// This is the exact class removed from plan-review/why-review (`## X` -> `## Your mission`).
test('TC-SKILLFIX-001: flags `##` immediately followed by `##` with no body', () => {
    const content = joinLines(
        '## Behavioral Delta Matrix (MANDATORY for bugfixes)',
        '',
        '## Your mission',
        '',
        'Real body here.'
    );
    const result = checkOrphanHeadings(content, '.claude/skills/example/SKILL.md');
    assert.ok(result, 'expected an orphan-heading failure');
    assert.match(result, /orphan heading\(s\)/);
    assert.match(result, /line 1:/);
});

// TC-SKILLFIX-001b — shallower transition (`##` -> `#`) is also an orphan.
test('TC-SKILLFIX-001b: flags `##` immediately followed by shallower `#`', () => {
    const content = joinLines('## Orphan Section', '', '# Top Level', '', 'body');
    assert.ok(checkOrphanHeadings(content, 'SKILL.md'));
});

// TC-SKILLFIX-002 — a heading with prose body must pass.
test('TC-SKILLFIX-002: passes a heading that has a body', () => {
    const content = joinLines(
        '## Real Section',
        '',
        'This section has prose body.',
        '',
        '## Next Section',
        '',
        'More body.'
    );
    assert.equal(checkOrphanHeadings(content, 'SKILL.md'), null);
});

// TC-SKILLFIX-003 — section -> subsection nesting (`##` -> `###`) is legitimate. Load-bearing
// guard: the rule must NOT fire here or it would red-line most well-structured skills.
test('TC-SKILLFIX-003: passes legitimate `##` -> `###` nesting', () => {
    const content = joinLines('## Parent Section', '', '### Child Subsection', '', 'Body.');
    assert.equal(checkOrphanHeadings(content, 'SKILL.md'), null);
});

// TC-SKILLFIX-004 — output-format templates document stacked `##` headers inside fenced code
// blocks (e.g. review-domain-entities, planning). Fenced headings must be skipped.
test('TC-SKILLFIX-004: skips stacked headings inside a fenced code block', () => {
    const content = joinLines(
        '## Output Format',
        '',
        '```',
        '## Critical Issues',
        '',
        '## High Priority Issues',
        '',
        '## Positive Observations',
        '```',
        '',
        'Trailing body.'
    );
    assert.equal(checkOrphanHeadings(content, 'SKILL.md'), null);
});

// TC-SKILLFIX-005 — unfenced output templates use `{placeholder}` heading syntax
// (e.g. review-architecture/review-ui `## Verdict: {PASS | WARN | BLOCKED}`). These are
// intentional and must be skipped.
test('TC-SKILLFIX-005: skips `{placeholder}` output-template headings', () => {
    const content = joinLines(
        '## Verdict: {PASS | WARN | BLOCKED}',
        '',
        '## BLOCKED Findings (Must Fix)',
        '',
        '### {Category}: {description}',
        '',
        '- **File:** {path}:{line}'
    );
    assert.equal(checkOrphanHeadings(content, 'SKILL.md'), null);
});

// Multiple orphans are all reported (cap of 5 shown in the message).
test('TC-SKILLFIX-001c: reports count when several orphans exist', () => {
    const content = joinLines('## A', '', '## B', '', '## C', '', 'body');
    const result = checkOrphanHeadings(content, 'SKILL.md');
    assert.ok(result);
    assert.match(result, /2 orphan heading\(s\)/);
});

test('TC-DEBUGTRACE-001: passes required end-to-start debugger trace coverage', () => {
    const content = joinLines(
        '<!-- SYNC:end-to-start-debugger-trace -->',
        '',
        '> **End-to-Start Debugger Trace**',
        '> observed final state',
        '> Enumerate all feeder paths',
        '> hypothesis matrix',
        '> owning fix layer',
        '> forward convergence proof',
        '',
        '<!-- /SYNC:end-to-start-debugger-trace -->'
    );
    assert.equal(checkDebuggerTraceCoverage(content, '.claude/skills/fix/SKILL.md'), null);
});

test('TC-DEBUGTRACE-002: fails when end-to-start debugger trace gate is missing', () => {
    const content = joinLines('## Debug', '', 'Trace one path from input to error.');
    const result = checkDebuggerTraceCoverage(content, '.claude/skills/fix/SKILL.md');
    assert.ok(result);
    assert.match(result, /missing end-to-start debugger trace gate/);
    assert.match(result, /SYNC:end-to-start-debugger-trace/);
});
