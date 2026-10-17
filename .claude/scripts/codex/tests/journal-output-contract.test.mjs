import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const read = relative => fs.readFileSync(path.join(repoRoot, relative), 'utf8');
const writer = read('.claude/agents/journal-writer.md');
const journalPath = /`(?:\.\/)?docs\/journals\/(?:\{date\}-\{slug\}\.md)?`/;

function requireDestination(source, anchor, label) {
    const line = source.split(/\r?\n/).find(value => anchor.test(value));
    assert.ok(line, `${label}: missing destination instruction`);
    assert.match(line, journalPath, `${label}: journal destination must be docs/journals`);
    assert.doesNotMatch(line, /tmp\/reports\//, `${label}: journal is not an assessment report`);
}

const WRITER_ANCHORS = [
    [/^- Write the journal file/, 'writer summary'],
    [/^6\. \*\*Write journal entry\*\*/, 'writer workflow'],
    [/^\*\*Journal location:\*\*/, 'writer location'],
    [/^\*\*Journal output:\*\*/, 'writer output owner'],
    [/^\*\*IMPORTANT MUST ATTENTION\*\* Write the journal file/, 'writer closing'],
];

function assertWriterDestination(source) {
    for (const [anchor, label] of WRITER_ANCHORS) requireDestination(source, anchor, label);
    assert.match(source, /\*\*Journal output:\*\* `\.\/docs\/journals\/\{date\}-\{slug\}\.md`/);
    assert.match(source, /date format from the active plan context/);
    assert.doesNotMatch(source, /(?:hook naming pattern|naming pattern from hooks)/);
    assert.match(source, /^name: journal-writer$/m);
    assert.match(source, /NEVER write journal entries for trivial issues/);
    assert.match(source, /200-500 words/);
    assert.match(source, /## Root Cause Analysis/);
}

function assertReportsDistinct(source) {
    const boundary = source.split(/\r?\n/).find(line => /intermediate assessments/.test(line));
    assert.ok(boundary, 'writer: missing intermediate assessment boundary');
    assert.match(boundary, /`tmp\/reports\/`/, 'writer: assessment reports retain their destination');
    assert.match(boundary, /journal entries.*`\.\/docs\/journals\/`/, 'writer: durable journal stays separate');
    // The report task-tracking contract now lives in the agent-bootstrap block (canonical: SYNC:agent-bootstrap).
    assert.match(source, /Producing a report\?\*\* Create the `tmp\/reports\/` file path BEFORE the first finding/, 'writer: report task-tracking contract retained');
}

// TC-HARNESS-015 / S15: prompt-contract checks, not measured agent execution.
// Intent: the journal-writer agent owns the durable output contract; every output
// anchor must agree with it, and changing even one destination must fail while
// formatting-only changes remain benign.
test('TC-HARNESS-015: writer journal destination and dated slug remain consistent', t => {
    assertWriterDestination(writer);
    for (const newline of ['\n', '\r\n']) {
        assertWriterDestination(writer.replace(/\r?\n/g, newline));
    }
    // Bounded domain: each anchor, five wrong directory spellings.
    const wrongDirectories = ['tmp/reports/', 'docs/journal/', 'docs/journals-extra/', 'docs/journals/../reports/', '../docs/journals/'];
    for (const [anchor] of WRITER_ANCHORS) {
        for (const directory of wrongDirectories) {
            const mutant = writer.split(/\r?\n/).map(line => anchor.test(line)
                ? line.replace(/(?:\.\/)?docs\/journals\//, directory) : line).join('\n');
            assert.notEqual(mutant, writer.replace(/\r?\n/g, '\n'), 'mutation must alter its target');
            assert.throws(() => assertWriterDestination(mutant), /journal destination must be docs\/journals/);
        }
    }
    t.diagnostic(`Killed ${WRITER_ANCHORS.length * wrongDirectories.length} single-anchor wrong-directory mutants; LF and CRLF controls accepted.`);
});

// Intent: fixing durable output must not redirect intermediate assessment reports.
test('TC-HARNESS-015: intermediate reports remain distinct from journal entries', t => {
    assertReportsDistinct(writer);
    assertReportsDistinct(writer.replace(/\r?\n/g, '\r\n'));
    const mutant = writer.split(/\r?\n/).map(line => /intermediate assessments/.test(line)
        ? line.replace('tmp/reports/', './docs/journals/') : line).join('\n');
    assert.throws(() => assertReportsDistinct(mutant), /assessment reports retain their destination/);
    t.diagnostic('Killed the assessment-redirection mutant; report task-tracking contract retained.');
});
