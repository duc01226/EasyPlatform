'use strict';
// skill-gc — the reference sweep that gates an irreversible deletion.
//
// `skill-gc --apply` DELETES a deprecated skill and its mirrors once the removal
// date has passed and nothing still references it. The whole safety of that rests
// on one question: did the sweep actually look? A sweep that returns nothing is
// indistinguishable, to every later step, from a skill nobody references — so the
// failure mode is silent, plausible, and destructive.
//
// It has already happened once. The sweep used `git grep -E '\b<name>\b'`, and
// `\b` is a GNU extension: glibc's regcomp honours it, Apple git's POSIX ERE does
// not. On macOS the pattern matched NOTHING repo-wide, git grep exited 1, the
// function returned [], and every deprecated skill read as unreferenced. Nothing
// was red — no lane runs this script, and macOS is a nightly measurement row
// rather than part of nightly-verdict.
//
// These tests therefore drive the REAL CLI against a temporary git repository, not
// an exported function with a stubbed grep. That is deliberate: a verifier that
// substitutes its own matcher for the script's cannot observe a dialect bug at all,
// because the dialect belongs to the git binary on the host running the suite. Only
// a real `git grep` can fail this way, so only a real one is used.
//
//   G1  a referenced skill is BLOCKED, not deleted — the regression proper
//   G2  the word boundary still holds: a substring-only mention is not a reference
//   G3  a reference inside a file git reads as binary still blocks the deletion
//   G4  an unreferenced, past-due skill is genuinely collected (the sweep can say yes)
//   G5  a colourised git (color.grep=always) does not hide a reference
//   G6  a reference in a path git would quote (non-ASCII) still blocks
//   G7  a reference in a path containing a colon still blocks
//   G8  a reference in a tracked-but-gitignored file still blocks
//   G9  an archived plan naming the skill does NOT block, but the same text in a
//       live doc does — the exclusion is scoped, not a hole
//   G10 a reference root git still TRACKS while the worktree lacks it refuses --apply
//       — an incomplete sweep is not an empty one
//   G11 a carrier git could not READ refuses too, rather than reading as unreferenced
//       — git reports "no match" and "could not read" with the same exit status
//   G12 a spelling that only resolves to the skill ("name/", "name/.", other letter case) is refused as
//       an unknown skill — the sweep greps the typed NAME, the delete removes the resolved FOLDER
//   G13 a FAILED sweep (no repository: git grep exits 128) refuses too — portable twin of G11
//
// G4 and G9's second half are the positive controls. Without them the blocking
// rows would pass equally against a script that blocks everything unconditionally
// — a different bug with the same green.
//
// Every row here guards one defect and was checked by reverting it (G7 and G11 need a
// host condition Windows/root cannot create, so they are reported as SKIPPED there; G13 is
// their portable twin for the git-failure guard). Reverting the defect makes that row fail. Two facts about this suite are worth knowing before adding to it.
// First, a block and a crash BOTH exit 1, and the script's diagnostics quote the
// offending line — which contains the path — so `status === 1` plus "the output
// names the file" is satisfied by a crash. That silently cost G3 its teeth until
// `assertBlockedNaming` began requiring the report shape as well. Second, removing
// `-z` fails every row rather than one, because the parse then throws; the
// throw is unreachable while `-z` is passed, so swapping it for a fail-open leaves
// the suite green, and the `-z` mutation is the only thing that covers it.
//
// All tests here are TECHNICAL-ONLY: they guard a repository maintenance tool and
// implement no user-facing Feature Spec. The bracket prefix plus this roster is the
// local technical annotation (docs/project-reference/integration-test-reference.md
// -> New Test Quickstart, 3).

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { assertEqual, assertTrue, assertFalse } = require('../lib/assertions.cjs');

const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const SCRIPT = path.join(REPO, '.claude', 'scripts', 'skill-gc.cjs');

const SKILL = 'zz-retired-probe';
// A name that CONTAINS the skill name, for the boundary case. `-` is a word
// boundary in JavaScript's \b, so the suffix must extend the final word character.
const SUPERSTRING = `${SKILL}x-sibling`;

/**
 * A throwaway repository shaped like an adopting project.
 *
 * skill-gc resolves its own REPO_ROOT from __dirname (`../..`), so the script is
 * COPIED to the same relative depth inside the fixture rather than required from
 * this repo — otherwise it would sweep this repo and delete from it. The copy is
 * the real file, so these tests exercise shipped code, not a transcription.
 */
function withFixture(refFiles, fn) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-gc-'));
    try {
        const scriptsDir = path.join(root, '.claude', 'scripts');
        fs.mkdirSync(scriptsDir, { recursive: true });
        fs.copyFileSync(SCRIPT, path.join(scriptsDir, 'skill-gc.cjs'));

        const skillDir = path.join(root, '.claude', 'skills', SKILL);
        fs.mkdirSync(skillDir, { recursive: true });
        // Deprecated and long past its removal date, so the reference sweep is the
        // ONLY thing that can still block the deletion.
        fs.writeFileSync(
            path.join(skillDir, 'SKILL.md'),
            `---\nname: ${SKILL}\ndescription: fixture\nstatus: deprecated\nremoval_after: 2020-01-01\n---\n\nFixture skill.\n`
        );

        fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
        for (const [rel, body] of Object.entries(refFiles)) {
            const full = path.join(root, rel);
            fs.mkdirSync(path.dirname(full), { recursive: true });
            fs.writeFileSync(full, body);
        }

        // git grep needs a repository; --untracked means no commit is required.
        const git = (...args) =>
            spawnSync('git', args, { cwd: root, encoding: 'utf-8', windowsHide: true, env: fixtureEnv() });
        git('init', '--quiet');
        git('config', 'user.email', 'fixture@example.invalid');
        git('config', 'user.name', 'fixture');

        return fn({ root, skillDir, git });
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
}

// Portable Test Contract (integration-test-reference.md, "Clean machine"): the fixture must not inherit the developer's
// git config, GIT_* redirection (a git hook sets GIT_DIR/GIT_INDEX_FILE), feature switches or provider keys, and
// HOME/TMP point at an empty directory. That directory sits OUTSIDE the fixture repo so `git grep --untracked` never
// scans it. Built once, removed on exit.
let cleanHome = null;
function fixtureEnv() {
    if (!cleanHome) {
        cleanHome = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-gc-home-'));
        process.on('exit', () => {
            try {
                fs.rmSync(cleanHome, { recursive: true, force: true });
            } catch {
                /* best effort: an OS temp directory is reaped anyway */
            }
        });
    }
    const env = { ...process.env };
    for (const key of Object.keys(env)) {
        if (/^(GIT_|CK_|ANTHROPIC_|CLAUDE|OPENAI_|CODEX_)/i.test(key)) delete env[key];
    }
    return {
        ...env,
        HOME: cleanHome,
        USERPROFILE: cleanHome,
        TMPDIR: cleanHome,
        TEMP: cleanHome,
        TMP: cleanHome,
        GIT_CONFIG_NOSYSTEM: '1',
        // Repository discovery stops at the OS temp dir, so a row that needs "no repository" (G13) cannot find one
        // in an ancestor of a developer machine's temp path.
        GIT_CEILING_DIRECTORIES: os.tmpdir(),
        // A file that does not exist reads as an empty config on every OS; `os.devNull` (`\\.\nul` on Windows) is not
        // a path git can open there.
        GIT_CONFIG_GLOBAL: path.join(cleanHome, 'no-global-gitconfig')
    };
}

function runGc(root, extraArgs = [], name = SKILL) {
    return spawnSync(
        process.execPath,
        [path.join(root, '.claude', 'scripts', 'skill-gc.cjs'), name, ...extraArgs],
        { cwd: root, encoding: 'utf-8', windowsHide: true, env: fixtureEnv() }
    );
}

// Mode 000 is not a read barrier for root, and Windows does not enforce the read bit this way.
const IS_ROOT = typeof process.getuid === 'function' && process.getuid() === 0;

/**
 * Assert the run BLOCKED and attributed the block to `expectedPath`.
 *
 * `status === 1` alone does not say that: an uncaught throw exits 1 too, and the
 * script's own diagnostics quote the offending line — which contains the path the
 * test is looking for. So "exit 1 and the output mentions the path" is satisfied by
 * a CRASH, and that is not a theoretical worry: it silently cost G3 its teeth, and
 * removing `--text` stopped failing anything at all until this helper existed.
 *
 * The decision line and the summary are printed only when the run reached its end,
 * so requiring both is what separates a real block from a crash that happens to
 * mention the right file.
 */
function assertBlockedNaming(result, expectedPath, context) {
    const out = `${result.stdout}${result.stderr}`;
    assertEqual(result.status, 1, `${context} — expected exit 1 (BLOCKED). Output: ${out}`);
    assertTrue(
        out.includes('[BLOCKED'),
        `${context} — expected a BLOCKED decision, not a crash or a collection. Output: ${out}`
    );
    assertTrue(
        /^Summary: READY=/m.test(out),
        `${context} — the run must reach its summary; a thrown diagnostic never does. Output: ${out}`
    );
    assertTrue(
        out.includes(expectedPath),
        `${context} — the block must name ${expectedPath}, proving the reference parsed. Output: ${out}`
    );
}

const tests = [
    {
        name: '[skill-gc] G1 a referenced skill is blocked, not deleted',
        fn: () => {
            withFixture(
                { 'docs/guide.md': `Read the ${SKILL} skill before editing.\n` },
                ({ root, skillDir }) => {
                    const dry = runGc(root);
                    assertBlockedNaming(
                        dry,
                        'docs/guide.md',
                        'A live reference must block. A collection here is the fail-open this ' +
                            'suite exists for: the sweep found nothing and the skill read as ' +
                            'unreferenced, which on Apple git was the behaviour of the whole script'
                    );

                    // The gate must also hold under --apply, which is the destructive path.
                    const applied = runGc(root, ['--apply']);
                    assertBlockedNaming(applied, 'docs/guide.md', '--apply must respect the same block');
                    assertTrue(
                        fs.existsSync(path.join(skillDir, 'SKILL.md')),
                        'A referenced skill must survive --apply.'
                    );
                }
            );
        }
    },
    {
        name: '[skill-gc] G2 a substring-only mention is not a reference',
        fn: () => {
            withFixture(
                { 'docs/guide.md': `See ${SUPERSTRING}, which is a different skill.\n` },
                ({ root, skillDir }) => {
                    const applied = runGc(root, ['--apply']);
                    assertEqual(
                        applied.status,
                        0,
                        'A longer identifier that merely CONTAINS the name is not a reference. ' +
                            'The fix moved the word boundary from the git pattern into ' +
                            'JavaScript; if it were dropped instead of moved, --fixed-strings ' +
                            `would match here and block forever. stdout: ${applied.stdout}${applied.stderr}`
                    );
                    assertFalse(
                        fs.existsSync(skillDir),
                        'An unreferenced, past-due skill is collected.'
                    );
                }
            );
        }
    },
    {
        name: '[skill-gc] G3 a reference inside a git-binary file still blocks',
        fn: () => {
            // One NUL byte is enough for git to classify a file as binary, and this
            // repository has had exactly that happen to a source file. Without --text
            // git reports `Binary file docs/blob.bin matches` — a line whose first
            // field is not a path, which the scope filter drops. The reference would
            // be invisible and the deletion would proceed.
            const blob = Buffer.concat([
                Buffer.from(`ref: ${SKILL}\n`, 'utf8'),
                Buffer.from([0x00]),
                Buffer.from('trailing\n', 'utf8')
            ]);
            withFixture({}, ({ root, skillDir }) => {
                fs.writeFileSync(path.join(root, 'docs', 'blob.bin'), blob);
                const applied = runGc(root, ['--apply']);
                assertBlockedNaming(
                    applied,
                    'docs/blob.bin',
                    'A name inside a binary-classified file is still a reference; a collection ' +
                        'here means the sweep silently skipped a file that mentions the skill'
                );
                assertTrue(
                    fs.existsSync(path.join(skillDir, 'SKILL.md')),
                    'The skill must survive a reference it could not display.'
                );
                // Exit 1 alone would also be satisfied by a crash, which is survival
                // for the wrong reason. The report must NAME the blocking file.
                assertTrue(
                    `${applied.stdout}${applied.stderr}`.includes('docs/blob.bin'),
                    'The block must be attributed to the binary file, not an error.'
                );
            });
        }
    },
    {
        name: '[skill-gc] G4 an unreferenced past-due skill is genuinely collected',
        fn: () => {
            // Positive control. G1-G3 assert that the sweep BLOCKS; without this they
            // would pass equally against a script that blocks unconditionally, so the
            // suite would be green while the tool did nothing useful.
            withFixture(
                { 'docs/guide.md': 'Nothing here names the fixture skill.\n' },
                ({ root, skillDir }) => {
                    const applied = runGc(root, ['--apply']);
                    assertEqual(
                        applied.status,
                        0,
                        `An unreferenced, past-due skill must be collected. stdout: ${applied.stdout}${applied.stderr}`
                    );
                    assertFalse(fs.existsSync(skillDir), 'The canonical skill directory is removed.');
                }
            );
        }
    },
    {
        name: '[skill-gc] G5 a colourised git does not hide a reference',
        fn: () => {
            // color.grep=always makes git wrap the path in SGR escapes, so it stops
            // starting with an include dir and every line fails the scope gate: refs
            // come back empty and --apply deletes a referenced skill. Reproduced
            // end-to-end before --no-color was added.
            withFixture(
                { 'docs/guide.md': `Read the ${SKILL} skill.\n` },
                ({ root, skillDir, git }) => {
                    git('config', 'color.grep', 'always');
                    git('config', 'color.ui', 'always');
                    const applied = runGc(root, ['--apply']);
                    assertBlockedNaming(
                        applied,
                        'docs/guide.md',
                        'A colourised git must not turn a reference into a deletion'
                    );
                    assertTrue(
                        fs.existsSync(path.join(skillDir, 'SKILL.md')),
                        'The referenced skill survives under color.grep=always.'
                    );
                }
            );
        }
    },
    {
        name: '[skill-gc] G6 a reference in a path git would quote still blocks',
        fn: () => {
            // Under the default core.quotePath git renders a non-ASCII path as
            // `"docs/r\303\246f.md"` — quoted, so it no longer starts with `docs/`.
            // -z emits raw bytes instead. Reproduced deleting a referenced skill.
            withFixture({ 'docs/ræf.md': `Read the ${SKILL} skill.\n` }, ({ root, skillDir }) => {
                const applied = runGc(root, ['--apply']);
                assertBlockedNaming(applied, 'docs/ræf.md', 'A non-ASCII path is still a reference');
                assertTrue(
                    fs.existsSync(path.join(skillDir, 'SKILL.md')),
                    'The referenced skill survives a path git would quote.'
                );
            });
        }
    },
    {
        name: '[skill-gc] G7 a reference in a path containing a colon still blocks',
        // NTFS cannot hold ":" in a file name: `adr:foo.md` is written as an alternate data stream of a
        // file named `adr`, which git never enumerates, so the colon path this row needs cannot exist.
        skip: process.platform === 'win32' ? 'a colon cannot appear in a Windows file name (NTFS stream syntax)' : false,
        fn: () => {
            // `path:lineno:content` parsing split this path at its own colon, so the
            // gate saw a truncated prefix. -z removes the ambiguity entirely.
            withFixture({ 'docs/adr:foo.md': `Read the ${SKILL} skill.\n` }, ({ root, skillDir }) => {
                const applied = runGc(root, ['--apply']);
                assertBlockedNaming(
                    applied,
                    'docs/adr:foo.md',
                    'A colon in the path is not a field separator'
                );
                assertTrue(
                    fs.existsSync(path.join(skillDir, 'SKILL.md')),
                    'The referenced skill survives a colon in the path.'
                );
            });
        }
    },
    {
        name: '[skill-gc] G8 a reference in a tracked-but-gitignored file still blocks',
        fn: () => {
            // `--untracked` makes git walk the working tree under standard excludes
            // instead of reading the index, so a file that is BOTH tracked and matched
            // by .gitignore is enumerated by neither path and vanishes from the sweep.
            // That is not exotic here: `CLAUDE.md` is a reference root AND is listed at
            // .gitignore:109, one of 33 tracked-and-ignored files, so a skill referenced
            // only from CLAUDE.md read as unreferenced and was eligible for deletion.
            // The earlier tests could not catch it — the fixture never committed
            // anything, so every reference file was untracked and the working-tree walk
            // found them all. This one commits the ignored carrier, which is the state
            // the real repository is in.
            withFixture(
                { '.gitignore': 'CLAUDE.md\n', 'CLAUDE.md': `Read the ${SKILL} skill.\n` },
                ({ root, skillDir, git }) => {
                    git('add', '-f', '.gitignore', 'CLAUDE.md');
                    // gpgsign and a global core.hooksPath would otherwise reach into the
                    // developer's own configuration from inside a throwaway repository.
                    git('-c', 'commit.gpgsign=false', 'commit', '--quiet', '--no-verify', '-m', 'fixture');
                    const tracked = git('ls-files', '--', 'CLAUDE.md').stdout.trim();
                    assertEqual(tracked, 'CLAUDE.md', 'Precondition: the carrier is tracked.');
                    const ignored = git('check-ignore', '--no-index', '--', 'CLAUDE.md').stdout.trim();
                    assertEqual(ignored, 'CLAUDE.md', 'Precondition: the carrier is also ignored.');

                    const applied = runGc(root, ['--apply']);
                    assertBlockedNaming(
                        applied,
                        'CLAUDE.md',
                        'A tracked-but-ignored file is still a reference; a collection here is ' +
                            'the fail-open, with the index arm missing and the working-tree walk ' +
                            'excluding the only carrier'
                    );
                    assertTrue(
                        fs.existsSync(path.join(skillDir, 'SKILL.md')),
                        'The referenced skill survives when its only carrier is gitignored.'
                    );
                }
            );
        }
    },
    {
        name: '[skill-gc] G9 an archived plan does not block, but a live doc does',
        fn: () => {
            // REF_EXCLUDE_PATHS excludes the archived plan tree as "historical work
            // artifacts" and docs/adr because "ADRs intentionally name historical
            // skills". A retired skill named in an archive is exactly what those
            // entries are for. The archive later moved under docs/, and because the
            // exclusion match is prefix-anchored it stopped reaching it — invisible
            // while the sweep also skipped ignored files, and reachable once the index
            // arm began seeing tracked-but-ignored paths.
            //
            // Both halves matter. Excluding an archive is a deliberate fail-OPEN, so
            // the second assertion pins it to the archive path: identical text in a
            // live doc must still block. Without that, widening this exclusion to
            // swallow all of docs/ would keep the test green.
            const body = `Read the ${SKILL} skill.\n`;
            withFixture({ 'docs/superpowers/plans/2026-01-01-old.md': body }, ({ root, skillDir }) => {
                const applied = runGc(root, ['--apply']);
                assertEqual(
                    applied.status,
                    0,
                    'An archived plan naming a retired skill is not a live reference. ' +
                        `stdout: ${applied.stdout}${applied.stderr}`
                );
                assertFalse(fs.existsSync(skillDir), 'The archived mention does not save the skill.');
            });
            withFixture({ 'docs/superpowers/live-guide.md': body }, ({ root }) => {
                assertBlockedNaming(
                    runGc(root, ['--apply']),
                    'docs/superpowers/live-guide.md',
                    'The exclusion is scoped to the archive: the same text in a live doc blocks'
                );
            });
            // The exclusion is the EXACT prefix `docs/superpowers/plans/`, deliberately narrow (see the note at
            // REF_EXCLUDE_PATHS in skill-gc.cjs). Two widenings would keep every row above green while silently
            // dropping live references from a delete gate, so each is pinned here:
            //  - a `plans` PATH SEGMENT anywhere else (`.gitignore`'s bare `plans/` matches that way);
            //  - a prefix match without the trailing `/` (`plans-live.md` shares the `plans` prefix).
            withFixture({ 'docs/other/plans/live.md': body }, ({ root }) => {
                assertBlockedNaming(
                    runGc(root, ['--apply']),
                    'docs/other/plans/live.md',
                    'A `plans` directory elsewhere is not the archive: it must block'
                );
            });
            withFixture({ 'docs/superpowers/plans-live.md': body }, ({ root }) => {
                assertBlockedNaming(
                    runGc(root, ['--apply']),
                    'docs/superpowers/plans-live.md',
                    'A sibling that merely starts with `plans` is not the archive: it must block'
                );
            });
        }
    },
    {
        name: '[skill-gc] G10 a reference root tracked but absent from the worktree refuses --apply',
        fn: () => {
            // A sweep can be incomplete rather than empty, and the two are opposite
            // answers to "is this skill referenced?". `git grep` reads WORKING-TREE
            // content for the paths it enumerates, so a reference root that git still
            // tracks while the worktree lacks it — a sparse checkout, or a
            // `skip-worktree` bit — hides every committed carrier under it. Nothing in
            // the output said so: the run simply reported READY and `--apply` deleted.
            //
            // The discriminator is TRACKED-and-absent, not merely absent. An adopting
            // project legitimately has no CLAUDE.md at all, and refusing there would
            // block every honest collection — G2, G4 and G9 are that converse control,
            // since their fixtures carry no CLAUDE.md and must still collect. This row
            // covers the other direction, which nothing else does.
            withFixture({ 'CLAUDE.md': 'A reference root with no mention of the skill.\n' }, ({ root, skillDir, git }) => {
                git('add', '-f', 'CLAUDE.md');
                git('-c', 'commit.gpgsign=false', 'commit', '--quiet', '--no-verify', '-m', 'fixture');
                // Remove it from the worktree ONLY — the index entry survives, which is
                // the state a sparse checkout leaves behind.
                fs.rmSync(path.join(root, 'CLAUDE.md'));
                assertEqual(
                    git('ls-files', '--', 'CLAUDE.md').stdout.trim(),
                    'CLAUDE.md',
                    'Precondition: the reference root is still tracked.'
                );
                assertFalse(
                    fs.existsSync(path.join(root, 'CLAUDE.md')),
                    'Precondition: the reference root is absent from the working tree.'
                );

                const dry = runGc(root);
                assertTrue(
                    dry.stdout.includes('INCOMPLETE SWEEP'),
                    `The dry run must disclose that the sweep could not cover a declared root. stdout: ${dry.stdout}`
                );

                const applied = runGc(root, ['--apply']);
                assertEqual(
                    applied.status,
                    1,
                    'An incomplete sweep must refuse --apply. Exit 0 here is the fail-open: ' +
                        'no carrier was readable, so the skill read as unreferenced and was ' +
                        `deleted on the strength of a sweep that never looked. stdout: ${applied.stdout}${applied.stderr}`
                );
                assertTrue(
                    applied.stderr.includes('Refusing --apply'),
                    `The refusal must be explicit, not an incidental crash. stderr: ${applied.stderr}`
                );
                assertTrue(
                    fs.existsSync(path.join(skillDir, 'SKILL.md')),
                    'No skill may be deleted while a declared reference root went unswept.'
                );
            });
        }
    },
    {
        name: '[skill-gc] G12 a spelling that only resolves to the skill never bypasses its reference sweep',
        fn: () => {
            // The sweep greps the NAME typed on the command line and the delete removes the DIRECTORY that name
            // resolves to. "name/", "name//", "name/." and another letter case (on a case-insensitive disk) resolve to
            // the same folder yet match no document, so a REFERENCED skill read as unreferenced and was deleted.
            // G4 is the positive control: the folder's own spelling is still collected.
            const spellings = [`${SKILL}/`, `${SKILL}//`, `${SKILL}/.`, SKILL.toUpperCase()];
            for (const spelling of spellings) {
                withFixture({ 'docs/guide.md': `Read the ${SKILL} skill before editing.\n` }, ({ root, skillDir }) => {
                    const applied = runGc(root, ['--apply'], spelling);
                    // Exit 2 + "skill not found" is the refusal under test. A crash (exit 1) would also leave the
                    // folder in place, so it must not be able to satisfy this row.
                    assertEqual(
                        applied.status,
                        2,
                        `Spelling "${spelling}" must be refused as an unknown skill. stdout: ${applied.stdout}${applied.stderr}`
                    );
                    assertTrue(
                        /skill not found/.test(applied.stderr),
                        `The refusal must name the unknown skill. stderr: ${applied.stderr}`
                    );
                    assertTrue(
                        fs.existsSync(path.join(skillDir, 'SKILL.md')),
                        `Spelling "${spelling}" deleted a skill that a document still references.`
                    );
                });
            }
        }
    },
    {
        name: '[skill-gc] G13 a failed sweep refuses rather than reading as unreferenced',
        fn: () => {
            // G11 needs a file mode that Windows and root cannot create, so it cannot prove on every host that a
            // FAILED git grep is not read as "no references". Removing the repository is portable: git grep then
            // exits 128, which is not a verdict about the skill. If the exit-status guard were dropped, 128 would
            // read as an empty sweep and --apply would delete a skill the sweep never actually checked.
            withFixture({ 'docs/guide.md': `Read the ${SKILL} skill before editing.\n` }, ({ root, skillDir }) => {
                fs.rmSync(path.join(root, '.git'), { recursive: true, force: true });
                const applied = runGc(root, ['--apply']);
                const out = `${applied.stdout}${applied.stderr}`;
                assertEqual(applied.status, 1, `A failed sweep must fail closed (exit 1). Output: ${out}`);
                assertTrue(out.includes('git grep exited 128'), `The failure must be reported, not swallowed. Output: ${out}`);
                assertTrue(fs.existsSync(skillDir), 'A failed sweep must not delete the skill.');
            });
        }
    },
    {
        name: '[skill-gc] G11 an unreadable carrier refuses, rather than reading as unreferenced',
        skip: process.platform === 'win32' || IS_ROOT ? 'mode 000 is not a read barrier on Windows or for root' : false,
        fn: () => {
            // `git grep`'s exit status reports only the MATCH outcome. A file it could
            // not read is announced on stderr and then ignored, so the SAME unreadable
            // carrier gives status 1 when nothing else matched and status 0 when
            // something did — and something always does here, because the skill's own
            // SKILL.md sits under the swept roots and names it. That makes 0 the normal
            // case, so a guard keyed on "exit 1 plus stderr" never fires: measured on
            // this fixture it exited 0 and deleted, with git's `failed to stat ...:
            // Permission denied` sitting unread on stderr. Completeness is carried by
            // stderr alone, on every status. Reading a partial sweep as an empty one is
            // the same silent, destructive shape as the dialect bug this suite was built
            // for, reached without any dialect involved.
            //
            // The condition is a file mode, so two hosts cannot create it: Windows does
            // not enforce the read bit this way, and root bypasses it. The guard is
            // narrow, and where it says the condition IS creatable the test verifies the
            // read actually fails — so an unexpectedly permissive host fails this row
            // instead of quietly turning it into a no-op.
            withFixture({ 'docs/guide.md': `Read the ${SKILL} skill before editing.\n` }, ({ root, skillDir }) => {
                const carrier = path.join(root, 'docs', 'guide.md');
                fs.chmodSync(carrier, 0o000);
                try {
                    let readable = true;
                    try {
                        fs.readFileSync(carrier);
                    } catch {
                        readable = false;
                    }
                    assertFalse(
                        readable,
                        'Precondition: the carrier must be unreadable. This host enforces mode ' +
                            '000 differently than the guard above assumes — fix the guard rather ' +
                            'than letting the row pass without observing anything.'
                    );

                    const applied = runGc(root, ['--apply']);
                    assertFalse(
                        applied.status === 0,
                        'An unreadable carrier is not an absent one. Exit 0 means the sweep read ' +
                            'a read failure as "no references" and deleted on it. ' +
                            `stdout: ${applied.stdout}${applied.stderr}`
                    );
                    assertTrue(
                        /could not be read|Refusing to decide/.test(applied.stderr),
                        `The refusal must name the read failure. stderr: ${applied.stderr}`
                    );
                    assertTrue(
                        fs.existsSync(path.join(skillDir, 'SKILL.md')),
                        'The skill survives a sweep that could not read part of the tree.'
                    );
                } finally {
                    fs.chmodSync(carrier, 0o600);
                }
            });
        }
    },
];

module.exports = {
    name: 'skill-gc',
    tests
};
