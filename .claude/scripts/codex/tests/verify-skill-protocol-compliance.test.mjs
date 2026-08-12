import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const verifierPath = path.resolve(thisDir, '..', 'verify-skill-protocol-compliance.mjs');
const { checkDebuggerTraceCoverage, checkOrphanHeadings, formatMirrorRemediation, countOccurrences } = await import(pathToFileURL(verifierPath).href);

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
// blocks (e.g. domain-entities-review, planning). Fenced headings must be skipped.
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
// (e.g. architecture-review/ui-review `## Verdict: {PASS | WARN | BLOCKED}`). These are
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

// TC-REMEDIATE-001 — a FAILing run always points the operator at the sync (never hand-format).
// When the prettier-drift class struck this session, the FAIL output gave NO remediation; this
// locks the actionable guidance in so it can't silently regress to a bare failure list again.
test('TC-REMEDIATE-001: remediation names the sync entrypoints and forbids hand-formatting mirrors', () => {
    const msg = formatMirrorRemediation(['some non-mirror failure']);
    assert.match(msg, /npm run codex:sync/);
    assert.match(msg, /npm run sync:all/);
    assert.match(msg, /prettier --write/);
    assert.match(msg, /AGENTS\.md/);
    assert.match(msg, /\.prettierignore/);
    // Portability: the remediation MUST also give the no-npm / no-package.json path so a project that
    // only copied `.claude` can still regenerate the mirrors. Locks the standalone runner reference in.
    assert.match(msg, /run-codex-sync\.mjs/);
});

// TC-REMEDIATE-002 — a mirror-drift failure adds the drift-specific explainer (the exact failure
// string verify-skill-protocol emits: "context mirror content drifted from ...").
test('TC-REMEDIATE-002: mirror-drift failures add the drift-specific explainer', () => {
    const drift = formatMirrorRemediation(['AGENTS.md context mirror content drifted from .codex/CODEX_CONTEXT.md']);
    assert.match(drift, /reformatted/);
    assert.match(drift, /byte-for-byte/);
    // Non-drift failures must NOT carry the drift-specific lines (keeps the message scoped).
    const nonDrift = formatMirrorRemediation(['SKILL.md missing required debugger trace target']);
    assert.doesNotMatch(nonDrift, /byte-for-byte/);
});

// TC-CTXP-034 — P6/P7 protocol-body-signature parity primitive. The mirrors term-rewrite tool nouns,
// so the gate counts a rewrite-invariant signature instead of byte-comparing. These lock the count
// primitive: a single deduped copy reads as 1; a stray duplicate (2) and a missing copy (0) both fail.
test('TC-CTXP-034a: countOccurrences counts non-overlapping matches, CRLF-normalized', () => {
    const sig = '## Common AI Mistake Prevention (System Lessons)';
    // One copy (the deduped, baked-once case the gate expects to PASS).
    assert.equal(countOccurrences(`prefix\r\n${sig}\r\n- a bullet\r\nmore`, sig), 1);
    // Two copies (an un-deduped mirror — top + bottom CK copies leaked through: gate FAILs).
    assert.equal(countOccurrences(`${sig}\nbody one\n\n${sig}\nbody two`, sig), 2);
    // Zero copies (protocol absent from the mirror entirely: gate FAILs).
    assert.equal(countOccurrences('no protocol here at all', sig), 0);
});

test('TC-CTXP-034b: countOccurrences is non-overlapping and empty-needle safe', () => {
    // Non-overlapping: 'aa' in 'aaaa' is 2, not 3 — advance by needle length, never re-scan a match.
    assert.equal(countOccurrences('aaaa', 'aa'), 2);
    // Empty / nullish needle must be 0, never throw (defensive: a stale-signature config slips through).
    assert.equal(countOccurrences('anything', ''), 0);
    assert.equal(countOccurrences('anything', undefined), 0);
});
