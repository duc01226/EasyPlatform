'use strict';
// doc-stamp-guard — protect the invariant "a tracked doc's bytes change ONLY when
// its meaning changes".
//
// The churn this guards against is invisible to every other suite: a doc rewritten
// with today's date is byte-different, content-identical, and perfectly valid
// markdown. Nothing fails; the cost lands later, as a merge conflict between two
// branches that each merely RE-RAN a scan and disagreed about a date neither of
// them decided. Content-based assertions are the only ones that can see it.
//
// Asserts:
//   G1  a date-stamp-only rewrite is NOT a meaningful change (the core predicate)
//   G2  whitespace alone is NOT a meaningful change; real prose edits ARE
//   G3  content-derived tokens (COUNT markers, hashes) still count as real changes
//   G4  the predicate is non-vacuous — it does not answer "unchanged" to everything
//   G5  writeDocIfChanged does not touch the file (or its mtime) on a no-op
//   G6  the freshness ledger extends staleness only while its content hash matches
//   G7  the skills that write reference docs carry the no-op guard instruction
//   G8  the staged-diff scanner flags churn and ONLY churn, against a real git index
//   G9  the freshness ledger trusts an entry only when it is provable
//   G10 removing a retired stamp line still counts as a real change

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { assertEqual, assertTrue } = require('../lib/assertions.cjs');

const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const GUARD_PATH = path.join(REPO, '.claude', 'hooks', 'lib', 'doc-stamp-guard.cjs');
const {
    normalizeDocContent,
    hasMeaningfulChange,
    isStampOnlyDiff,
    contentHash,
    writeDocIfChanged,
    findStampOnlyStagedDocs
} = require(GUARD_PATH);

const STAMPED_DOC = [
    '# Backend Patterns Reference',
    '',
    '<!-- Last scanned: 2026-01-01 -->',
    '<!-- Last verified: 2026-01-01 (docs-manager, impact-scoped) -->',
    '',
    'Handlers live under `src/handlers`.',
    '',
    '289 unique authored/tracked markdown files across 11 indexed categories. Last scanned: 2026-01-01.',
    ''
].join('\n');

function withTempDir(fn) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-stamp-guard-'));
    try {
        return fn(dir);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

const tests = [
    {
        // Invariant: newer user guidance must survive stale compression candidates.
        name: '[doc-stamp-guard] stale candidates preserve edits, creation and deletion',
        fn: () => withTempDir(dir => {
            // Given an exact snapshot and a candidate based on it.
            const doc = path.join(dir, 'guide.md');
            const candidate = STAMPED_DOC + '\nCandidate guidance.\n';
            for (const live of [STAMPED_DOC + '\nNew exception.\n',
                STAMPED_DOC.replace('2026-01-01', '2026-02-01'),
                STAMPED_DOC.replace(/\n/g, '\r\n'), null]) {
                if (live === null) { if (fs.existsSync(doc)) fs.unlinkSync(doc); }
                else fs.writeFileSync(doc, live);
                // When a stale writer attempts application.
                const result = writeDocIfChanged(doc, candidate, { baselineContent: STAMPED_DOC });
                // Then even stamp/format edits and deletion are preserved.
                assertEqual(result.written, false);
                assertTrue(result.reason.includes('conflict'));
                assertEqual(fs.existsSync(doc) ? fs.readFileSync(doc, 'utf8') : null, live);
            }
            fs.writeFileSync(doc, 'Newly created user guide.');
            assertEqual(writeDocIfChanged(doc, candidate, { baselineContent: null }).written, false);
            assertEqual(fs.readFileSync(doc, 'utf8'), 'Newly created user guide.');
            // A reconciled snapshot permits real updates, and retains no-op semantics.
            assertEqual(writeDocIfChanged(doc, candidate, { baselineContent: 'Newly created user guide.' }).written, true);
            assertEqual(writeDocIfChanged(doc, candidate, { baselineContent: candidate }).written, false);
            fs.unlinkSync(doc);
            assertEqual(writeDocIfChanged(doc, candidate, { baselineContent: null }).written, true);
        })
    },
    {
        // Invariant: the portable CLI detects conflicts before reporting a no-op.
        name: '[doc-stamp-guard] baseline CLI rejects concurrent edits before no-op comparison',
        fn: () => withTempDir(dir => {
            // Given separate baseline/candidate/live documents in an isolated directory.
            const doc = path.join(dir, 'guide.md');
            const baseline = path.join(dir, 'baseline.md');
            const candidate = path.join(dir, 'candidate.md');
            fs.writeFileSync(baseline, STAMPED_DOC);
            fs.writeFileSync(candidate, STAMPED_DOC);
            const live = STAMPED_DOC.replace(/\n/g, '\r\n');
            fs.writeFileSync(doc, live);
            const run = baselineArg => spawnSync(process.execPath,
                [GUARD_PATH, '--check', doc, '--candidate', candidate, '--baseline', baselineArg],
                { cwd: dir, encoding: 'utf8', windowsHide: true });
            // When live formatting changes after the snapshot, normalization cannot authorize it.
            const conflict = run(baseline);
            // Then return a distinguishable conflict and leave every document untouched.
            assertEqual(conflict.status, 4, conflict.stderr);
            assertTrue(conflict.stdout.includes('CONFLICT'));
            assertEqual(fs.readFileSync(doc, 'utf8'), live);
            fs.writeFileSync(doc, STAMPED_DOC);
            assertEqual(run(baseline).status, 3);
            fs.writeFileSync(candidate, STAMPED_DOC + '\nA necessary condition.\n');
            assertEqual(run(baseline).status, 0);
            assertEqual(run(path.join(dir, 'absent-baseline.md')).status, 4);
            fs.unlinkSync(doc);
            assertEqual(run(baseline).status, 4);
            assertEqual(run(path.join(dir, 'absent-baseline.md')).status, 0);
            assertEqual(run('--not-a-baseline').status, 1);
        })
    },
    {
        name: '[doc-stamp-guard] G1 a date-stamp-only rewrite is not a meaningful change',
        fn: () => {
            const restamped = STAMPED_DOC
                .replace(/Last scanned: 2026-01-01 -->/, 'Last scanned: 2026-09-17 -->')
                .replace(/Last verified: 2026-01-01/, 'Last verified: 2026-09-17')
                .replace(/Last scanned: 2026-01-01\./, 'Last scanned: 2026-09-17.');

            assertTrue(
                restamped !== STAMPED_DOC,
                'Test setup is vacuous: the restamped doc must differ byte-wise, or G1 proves nothing.'
            );
            assertEqual(
                hasMeaningfulChange(STAMPED_DOC, restamped),
                false,
                'A rewrite that moves only date stamps was treated as a real change. That is exactly ' +
                    'the churn that makes two branches conflict over a value neither of them decided.'
            );
            assertEqual(
                isStampOnlyDiff(STAMPED_DOC, restamped),
                true,
                'The commit-side predicate must flag a date-only staged diff as churn.'
            );
        }
    },
    {
        name: '[doc-stamp-guard] G2 whitespace is not meaning, but prose edits are',
        fn: () => {
            // ONE trailing space — invisible noise. Two or more would be a markdown hard
            // line break, which the next assertion pins as real meaning.
            const reformatted = `${STAMPED_DOC.replace(/\n/g, '\r\n').replace('src/handlers`.', 'src/handlers`. ')}\r\n\r\n\r\n`;
            assertEqual(
                hasMeaningfulChange(STAMPED_DOC, reformatted),
                false,
                'Line endings, trailing spaces, and extra blank lines are formatting, not meaning — ' +
                    'a formatter pass alone must never justify rewriting a tracked doc.'
            );

            const edited = STAMPED_DOC.replace('src/handlers', 'src/application/handlers');
            assertEqual(
                hasMeaningfulChange(STAMPED_DOC, edited),
                true,
                'A changed code path is real content. Masking it would suppress a write that MUST happen.'
            );

            // Indentation inside a line is semantic (code fences, nested lists) and must survive.
            const reindented = STAMPED_DOC.replace('Handlers live', '    Handlers live');
            assertEqual(
                hasMeaningfulChange(STAMPED_DOC, reindented),
                true,
                'Leading indentation changes meaning in code fences and nested lists — it must not be masked.'
            );

            // Two trailing spaces are a markdown hard line break — rendered output changes.
            const hardBreak = STAMPED_DOC.replace('src/handlers`.', 'src/handlers`.  ');
            assertEqual(
                hasMeaningfulChange(STAMPED_DOC, hardBreak),
                true,
                'A markdown hard line break is meaning, not stray whitespace — stripping it from the ' +
                    'comparison would suppress a write that visibly changes the rendered doc.'
            );
        }
    },
    {
        name: '[doc-stamp-guard] G3 content-derived tokens still count as real changes',
        fn: () => {
            const cases = [
                ['<!-- COUNT:skills -->123<!-- /COUNT -->', '<!-- COUNT:skills -->124<!-- /COUNT -->', 'COUNT marker'],
                ['Context fingerprint (SHA-256): aaa111', 'Context fingerprint (SHA-256): bbb222', 'SHA fingerprint'],
                ['[[convention:general-code@487c3358]]', '[[convention:general-code@99999999]]', 'convention hash'],
                ['289 unique authored files.', '301 unique authored files.', 'derived count in prose'],
                // `last_updated:` LOOKS like a sibling clock stamp and must NOT be masked:
                // in docs/specs/** front matter it is the spec-sync signal doc-sync-gate.cjs
                // reads, so masking it would let the commit guard unstage the very bump a
                // /spec [mode=sync] run exists to make.
                ["last_updated: '2026-01-01'", "last_updated: '2026-09-17'", 'spec front-matter last_updated'],
                // ...and both keys are ordinary identifiers in source code.
                ['    last_updated: Optional[str]', '    last_updated: Optional[int]', 'python field declaration'],
                ['  generated_at: new Date().toISOString(),', '  generated_at: null,', 'js property']
            ];
            for (const [before, after, label] of cases) {
                assertEqual(
                    hasMeaningfulChange(before, after),
                    true,
                    `${label} changed but was masked as volatile. These tokens are derived from CONTENT, ` +
                        'not from the clock — masking them would hide real drift.'
                );
            }
        }
    },
    {
        name: '[doc-stamp-guard] G4 the predicate is non-vacuous',
        fn: () => {
            assertEqual(
                hasMeaningfulChange(null, STAMPED_DOC),
                true,
                'A file that does not exist yet must always be written.'
            );
            assertEqual(
                hasMeaningfulChange(STAMPED_DOC, `${STAMPED_DOC}\nA new documented rule.\n`),
                true,
                'Appended content is a real change.'
            );
            assertEqual(
                isStampOnlyDiff(STAMPED_DOC, STAMPED_DOC),
                false,
                'Identical versions are not "churn to unstage" — there is no diff to report.'
            );
            assertTrue(
                normalizeDocContent(STAMPED_DOC).includes('Handlers live under'),
                'Normalization must preserve prose; a normalizer that empties the doc would make every ' +
                    'comparison equal and silently disable every write.'
            );
        }
    },
    {
        name: '[doc-stamp-guard] G5 a no-op write leaves the file untouched',
        fn: () =>
            withTempDir(dir => {
                const docPath = path.join(dir, 'reference.md');
                fs.writeFileSync(docPath, STAMPED_DOC, 'utf-8');
                const before = fs.statSync(docPath);

                const restamped = STAMPED_DOC.replace('Last scanned: 2026-01-01 -->', 'Last scanned: 2026-09-17 -->');
                const result = writeDocIfChanged(docPath, restamped);

                assertEqual(result.written, false, 'A stamp-only candidate must not be written.');
                assertEqual(
                    fs.readFileSync(docPath, 'utf-8'),
                    STAMPED_DOC,
                    'The on-disk doc must be byte-identical after a suppressed write.'
                );
                assertEqual(
                    fs.statSync(docPath).mtimeMs,
                    before.mtimeMs,
                    'mtime must not move either — a touched file is a dirty file to downstream tooling.'
                );

                const real = writeDocIfChanged(docPath, STAMPED_DOC.replace('src/handlers', 'src/app/handlers'));
                assertEqual(real.written, true, 'A real content change must still be written.');
            })
    },
    {
        name: '[doc-stamp-guard] G6 the freshness ledger trusts matching hashes and records CLI verification',
        fn: () =>
            withTempDir(dir => {
                // The ledger is what keeps the 60-day gate honest once no-op scans stop
                // restamping docs. An entry that no longer describes the file on disk
                // proves nothing about the current content and must be ignored.
                const docPath = path.join(dir, 'reference.md');
                fs.writeFileSync(docPath, STAMPED_DOC, 'utf-8');
                const recordedHash = contentHash(fs.readFileSync(docPath, 'utf-8'));

                fs.writeFileSync(docPath, STAMPED_DOC.replace(/\n/g, '\r\n'), 'utf-8');
                assertEqual(
                    contentHash(fs.readFileSync(docPath, 'utf-8')),
                    recordedHash,
                    'A whitespace-only touch must NOT invalidate a recorded verification.'
                );

                fs.writeFileSync(docPath, STAMPED_DOC.replace('src/handlers', 'src/app/handlers'), 'utf-8');
                assertTrue(
                    contentHash(fs.readFileSync(docPath, 'utf-8')) !== recordedHash,
                    'A real content change MUST invalidate the ledger entry, or a stale doc would be ' +
                        'reported fresh forever and the 60-day rescan net would be disabled.'
                );

                // Exercise the actual direct-CLI path in an isolated project. The CLI loads
                // session-init-helpers, which imports this module's contentHash; a partial
                // CommonJS export would turn the valid file into a misleading "unreadable" result.
                const fixtureDocName = 'docs-index-reference.md';
                const fixtureDocContent = '# Disposable docs index fixture\n';
                fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
                const fixtureDocPath = path.join(dir, 'docs', 'project-reference', fixtureDocName);
                fs.mkdirSync(path.dirname(fixtureDocPath), { recursive: true });
                fs.writeFileSync(fixtureDocPath, fixtureDocContent, 'utf-8');

                const cliResult = spawnSync(
                    process.execPath,
                    [GUARD_PATH, '--record-verified', fixtureDocName],
                    {
                        cwd: dir,
                        env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
                        encoding: 'utf8',
                        windowsHide: true
                    }
                );
                assertEqual(
                    cliResult.error?.message ?? null,
                    null,
                    `The isolated verification CLI could not start: ${cliResult.error?.message || ''}`
                );
                assertEqual(
                    cliResult.status,
                    0,
                    `The isolated verification CLI must succeed for a readable doc. ` +
                        `stdout=${cliResult.stdout || ''} stderr=${cliResult.stderr || ''}`
                );
                assertTrue(
                    cliResult.stdout.includes(`Recorded no-change verification for ${fixtureDocName}`),
                    'The CLI must report that it recorded the no-change verification.'
                );

                const ledgerPath = path.join(dir, 'tmp', 'claude-temp', '.scan-verified');
                const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf-8'));
                assertEqual(
                    ledger.docs?.[fixtureDocName]?.contentHash,
                    contentHash(fixtureDocContent),
                    'The fixture ledger must contain the readable doc’s actual normalized content hash.'
                );
                assertEqual(
                    fs.readFileSync(fixtureDocPath, 'utf-8'),
                    fixtureDocContent,
                    'Recording a no-change verification must leave the reference document untouched.'
                );
            })
    },
    {
        name: '[doc-stamp-guard] G9 resolveVerifiedDate trusts an entry only when it is provable',
        fn: () =>
            withTempDir(dir => {
                // The ledger is the ONLY thing keeping the 60-day gate honest once no-op
                // scans stop restamping docs, so every way it can lie must be closed.
                const { resolveVerifiedDate } = require(path.join(
                    REPO, '.claude', 'hooks', 'lib', 'session-init-helpers.cjs'
                ));
                const docPath = path.join(dir, 'reference.md');
                fs.writeFileSync(docPath, STAMPED_DOC, 'utf-8');
                const hash = contentHash(STAMPED_DOC);
                const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

                assertTrue(
                    resolveVerifiedDate({ verifiedAt: '2026-01-02', contentHash: hash }, docPath) !== null,
                    'A well-formed entry whose hash matches the file MUST be trusted, or the ledger is inert.'
                );
                const rejected = [
                    [{ verifiedAt: '2026-01-02', contentHash: 'deadbeef' }, 'hash no longer matches the file'],
                    [{ verifiedAt: tomorrow, contentHash: hash }, 'dated in the future — a scan cannot have run tomorrow'],
                    [{ verifiedAt: 'not-a-date', contentHash: hash }, 'unparseable date'],
                    [{ contentHash: hash }, 'no date at all'],
                    [{ verifiedAt: '2026-01-02' }, 'no hash at all'],
                    [null, 'absent entry']
                ];
                for (const [entry, why] of rejected) {
                    assertEqual(
                        resolveVerifiedDate(entry, docPath),
                        null,
                        `An entry that is ${why} must NOT extend freshness — it would suppress the ` +
                            'rescan net with no proof the doc was ever verified.'
                    );
                }
                assertEqual(
                    resolveVerifiedDate({ verifiedAt: '2026-01-02', contentHash: hash }, path.join(dir, 'gone.md')),
                    null,
                    'An entry for a file that no longer exists proves nothing.'
                );
            })
    },
    {
        name: '[doc-stamp-guard] G10 removing a retired stamp line is a real change',
        fn: () => {
            // Masking the VALUE while keeping the surrounding text is what makes this work.
            // If the whole line were masked, deleting a retired `Last verified` stamp would
            // read as a no-op and the cleanup could never be written.
            const withStamp = STAMPED_DOC;
            const withoutStamp = STAMPED_DOC.replace(
                '<!-- Last verified: 2026-01-01 (docs-manager, impact-scoped) -->\n',
                ''
            );
            assertTrue(withStamp !== withoutStamp, 'Test setup is vacuous — the stamp line was not removed.');
            assertEqual(
                hasMeaningfulChange(withStamp, withoutStamp),
                true,
                'Deleting a retired stamp line must count as a real change, or the six docs still ' +
                    'carrying a frozen `Last verified` line could never be cleaned up.'
            );
        }
    },
    {
        name: '[doc-stamp-guard] G7 doc-writing skills carry the no-op guard instruction',
        fn: () => {
            // The guard only works if the skills that write these docs are told to call it.
            // Without this, the helper ships correct and unused.
            const carriers = [
                ['.claude/skills/scan/SKILL.md', 'scan writes every reference doc'],
                ['.claude/skills/docs-manager/references/mode-update.md', 'docs-manager --mode=update patches reference docs'],
                ['.claude/agents/git-manager.md', 'git-manager is the second commit path'],
                ['.claude/agents/docs-manager.md', 'docs-manager performs the doc writes'],
                ['.claude/skills/spec/references/mode-index.md', 'spec [mode=index] regenerates derived spec aids']
            ];
            const missing = [];
            for (const [relPath, why] of carriers) {
                const full = path.join(REPO, relPath);
                if (!fs.existsSync(full)) {
                    missing.push(`${relPath} (missing file) — ${why}`);
                    continue;
                }
                if (!fs.readFileSync(full, 'utf-8').includes('doc-stamp-guard.cjs')) {
                    missing.push(`${relPath} — ${why}`);
                }
            }
            assertTrue(
                missing.length === 0,
                'These doc/commit carriers no longer reference doc-stamp-guard.cjs, so nothing stops them ' +
                    'rewriting a doc that did not change:\n' +
                    missing.map(m => `  x ${m}`).join('\n')
            );
        }
    },
    {
        name: '[doc-stamp-guard] G8 the staged-diff scanner flags churn and only churn',
        fn: () =>
            withTempDir(dir => {
                // Exercised against a REAL git index, not a simulated one: the commit-time
                // half of this guard is git plumbing, and a predicate that is correct on
                // strings but wrong on `git show :<path>` protects nothing.
                const git = (...args) =>
                    execFileSync('git', args, { cwd: dir, encoding: 'utf-8', windowsHide: true });

                git('init', '--quiet');
                git('config', 'user.email', 'test@example.invalid');
                git('config', 'user.name', 'Guard Test');
                git('config', 'commit.gpgsign', 'false');

                const churn = path.join(dir, 'churn.md');
                const real = path.join(dir, 'real.md');
                const added = path.join(dir, 'added.md');
                // A source file carrying a stamp-shaped line. Judging it as a doc is how a
                // real code edit gets silently dropped from a commit, so it must be skipped
                // outright — this case is the reason the scanner is extension-scoped.
                const code = path.join(dir, 'graph.py');
                fs.writeFileSync(churn, STAMPED_DOC, 'utf-8');
                fs.writeFileSync(real, STAMPED_DOC, 'utf-8');
                fs.writeFileSync(code, 'class Stats:\n    last_updated: Optional[str]\n', 'utf-8');
                git('add', '-A');
                git('commit', '--quiet', '-m', 'baseline');

                fs.writeFileSync(churn, STAMPED_DOC.replace('Last scanned: 2026-01-01 -->', 'Last scanned: 2026-09-17 -->'), 'utf-8');
                fs.writeFileSync(real, STAMPED_DOC.replace('src/handlers', 'src/app/handlers'), 'utf-8');
                fs.writeFileSync(code, 'class Stats:\n    last_updated: Optional[int]\n', 'utf-8');
                fs.writeFileSync(added, '# Brand new doc\n', 'utf-8');
                git('add', '-A');

                const result = findStampOnlyStagedDocs({ cwd: dir });
                assertTrue(result.ok, `Scanner failed against a real repo: ${result.error}`);
                assertEqual(
                    result.stampOnly.join(','),
                    'churn.md',
                    'The scanner must flag the date-only diff and NOTHING else. A real edit reported as ' +
                        'churn would get a genuine change unstaged; an added file has no before-version ' +
                        'whose difference could be pure churn; and a source file is never judged by ' +
                        'markdown stamp rules.'
                );
            })
    }
];

module.exports = {
    name: 'doc-stamp-guard',
    tests
};
