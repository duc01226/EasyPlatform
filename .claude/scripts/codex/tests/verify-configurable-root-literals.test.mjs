// TC-DOCROOT-030..038 — the literal-residue verifier's contract.
//
// TC-DOCROOT-038 is also this phase's BUILD GATE. The runner's `tests` stage executes
// `node --test` over this directory and that stage is inside `npm run verify:all`, so asserting a
// green verifier run against the REAL repository here makes the residue check build-gating without
// adding a pipeline stage — the 19-stage roster and the mirrored sync-codex skill doc stay untouched.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { TRACKED_LITERALS, SCAN_ROOTS, findLiteralOccurrences } from '../verify-configurable-root-literals.mjs';
import { isFrameworkRepo } from './framework-repo.helper.mjs';

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, '..', '..', '..', '..');
const verifier = path.join(repoRoot, '.claude', 'scripts', 'codex', 'verify-configurable-root-literals.mjs');

// A literal assembled from parts so this test file's own prose cannot become residue in the
// surfaces the verifier scans; `.claude/scripts/codex/tests/**` IS in scope by design.
const SPEC_LITERAL = `docs/${'specs'}`;

const isolatedEnv = () => Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key !== 'CLAUDE_PROJECT_DIR' && !key.startsWith('GIT_'))
);

function writeFixture(root, relPath, text) {
    const target = path.join(root, relPath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text);
}

function makeRepo() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-root-literals-'));
    fs.mkdirSync(path.join(root, '.claude', 'skills'), { recursive: true });
    return root;
}

function writeAllowlist(root, files) {
    writeFixture(root, 'allowlist.json', JSON.stringify({ files }, null, 2));
    return path.join(root, 'allowlist.json');
}

function invoke(root, extraArgs = []) {
    const result = spawnSync(
        process.execPath,
        [verifier, `--root=${root}`, `--allowlist=${path.join(root, 'allowlist.json')}`, ...extraArgs],
        { cwd: root, env: isolatedEnv(), encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024 }
    );
    assert.equal(result.error, undefined);
    assert.doesNotMatch(result.stderr, /SyntaxError|ERR_MODULE_NOT_FOUND|MODULE_NOT_FOUND/);
    return { ...result, output: result.stdout + result.stderr };
}

function cleanup(root) {
    fs.rmSync(root, { recursive: true, force: true });
}

test('TC-DOCROOT-030: a bare root literal with no allowlist entry fails and names file and line', () => {
    const root = makeRepo();
    try {
        writeFixture(root, '.claude/skills/fixture/SKILL.md', `# Fixture\n\nRead the spec under ${SPEC_LITERAL}/ before planning.\n`);
        writeAllowlist(root, {});

        const result = invoke(root);

        assert.equal(result.status, 1, result.output);
        assert.match(result.output, /\.claude\/skills\/fixture\/SKILL\.md:3: hardcoded root literal/);
        assert.match(result.output, /FAIL/);
    } finally {
        cleanup(root);
    }
});

test('TC-DOCROOT-031: the form-(b) default-plus-override sentence and a config-example fence both pass', () => {
    const root = makeRepo();
    try {
        writeFixture(
            root,
            '.claude/skills/fixture/SKILL.md',
            '# Fixture\n\n'
                + `Feature Specs live under the default \`${SPEC_LITERAL}\`; a \`specRoots.business.path\` entry in `
                + '`docs/project-config.json` overrides the path; a path escaping that directory is malformed '
                + 'and is skipped unread.\n\n'
                + 'Declare it in the project config:\n\n'
                + '```json\n{\n    "specRoots": { "business": { "path": "' + SPEC_LITERAL + '" } }\n}\n```\n'
        );
        writeAllowlist(root, {});

        const result = invoke(root);

        assert.equal(result.status, 0, result.output);
        assert.match(result.output, /PASS/);
        assert.match(result.output, /residual occurrences: 0 across 0 files/);
    } finally {
        cleanup(root);
    }
});

test('TC-DOCROOT-032: a file listed in the allowlist with a reason passes and is reported as suppressed', () => {
    const root = makeRepo();
    try {
        writeFixture(root, '.claude/skills/fixture/SKILL.md', `# Fixture\n\nRead ${SPEC_LITERAL}/ first.\n`);
        writeAllowlist(root, { '.claude/skills/fixture/SKILL.md': { reason: 'pending conversion — phase 11' } });

        const result = invoke(root);

        assert.equal(result.status, 0, result.output);
        assert.match(result.output, /\.claude\/skills\/fixture\/SKILL\.md: 1 \(allowlisted: pending conversion — phase 11\)/);
        assert.match(result.output, /PASS/);
    } finally {
        cleanup(root);
    }
});

test('TC-DOCROOT-033: a stale entry warns under --migrating and errors under --strict', () => {
    const root = makeRepo();
    try {
        writeFixture(root, '.claude/skills/fixture/SKILL.md', '# Fixture\n\nNothing relocatable here.\n');
        writeAllowlist(root, { '.claude/skills/fixture/SKILL.md': { reason: 'pending conversion — phase 11' } });

        const migrating = invoke(root);
        assert.equal(migrating.status, 0, migrating.output);
        assert.match(migrating.output, /stale allowlist entry \(warning\): \.claude\/skills\/fixture\/SKILL\.md/);
        assert.match(migrating.output, /PASS/);

        const strict = invoke(root, ['--strict']);
        assert.equal(strict.status, 1, strict.output);
        assert.match(strict.output, /stale allowlist entry: \.claude\/skills\/fixture\/SKILL\.md/);
        assert.match(strict.output, /FAIL/);

        // The default is --migrating: passing it explicitly must equal passing nothing.
        const explicitDefault = invoke(root, ['--migrating']);
        assert.equal(explicitDefault.status, 0, explicitDefault.output);
    } finally {
        cleanup(root);
    }
});

test('TC-DOCROOT-034: an allowlist entry missing a reason fails in BOTH modes', () => {
    const root = makeRepo();
    try {
        writeFixture(root, '.claude/skills/fixture/SKILL.md', `# Fixture\n\nRead ${SPEC_LITERAL}/ first.\n`);
        writeAllowlist(root, { '.claude/skills/fixture/SKILL.md': { note: 'no reason field' } });

        for (const args of [[], ['--strict']]) {
            const result = invoke(root, args);
            assert.equal(result.status, 1, result.output);
            assert.match(result.output, /is missing a non-empty "reason" naming its owning phase/);
        }
    } finally {
        cleanup(root);
    }
});

test('TC-DOCROOT-035: tmp/reports is NOT a tracked literal (the fixed framework invariant)', () => {
    assert.ok(!TRACKED_LITERALS.some(literal => literal.includes('tmp/')), TRACKED_LITERALS.join(', '));
    assert.equal(findLiteralOccurrences('Write the report to tmp/reports/foo.md when done.\n').length, 0);

    const root = makeRepo();
    try {
        writeFixture(root, '.claude/skills/fixture/SKILL.md', '# Fixture\n\nPersist findings to tmp/reports/foo.md.\n');
        writeAllowlist(root, {});

        const result = invoke(root);

        assert.equal(result.status, 0, result.output);
        assert.match(result.output, /PASS/);
    } finally {
        cleanup(root);
    }
});

test('TC-DOCROOT-036: residue is recomputed every run — converting a file clears it with NO allowlist edit', () => {
    const root = makeRepo();
    try {
        const fixture = '.claude/skills/fixture/SKILL.md';
        writeFixture(root, fixture, `# Fixture\n\nRead ${SPEC_LITERAL}/ first.\n`);
        const allowlist = { '.claude/skills/fixture/SKILL.md': { reason: 'pending conversion — phase 11' } };
        writeAllowlist(root, allowlist);

        const before = JSON.parse(invoke(root, ['--json']).stdout);
        assert.equal(before.perFile[fixture], 1);
        assert.equal(before.ok, true);

        // Convert the file. The allowlist is deliberately left BYTE-IDENTICAL.
        writeFixture(
            root,
            fixture,
            `# Fixture\n\nDefault \`${SPEC_LITERAL}\`; a \`specRoots.business.path\` entry in \`docs/project-config.json\` overrides the path.\n`
        );
        assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'allowlist.json'), 'utf8')).files, allowlist);

        const after = JSON.parse(invoke(root, ['--json']).stdout);
        assert.equal(after.ok, true);
        assert.equal(after.perFile[fixture], undefined, 'a converted file must disappear from the residue report');
        assert.equal(after.totalOccurrences, 0);
        // …and under the terminal gate the now-stale entry becomes the error that forces its deletion.
        assert.equal(invoke(root, ['--strict']).status, 1);
    } finally {
        cleanup(root);
    }
});

test('TC-DOCROOT-037: scan scope covers CLAUDE.md and project-reference, and excludes generated mirrors and test fixtures', () => {
    assert.deepEqual(SCAN_ROOTS, ['.claude', 'CLAUDE.md', 'docs/project-reference']);

    const root = makeRepo();
    try {
        const bare = `Read ${SPEC_LITERAL}/ first.\n`;
        // Generated mirrors — regenerated by the user-invoked sync, never authored.
        writeFixture(root, 'AGENTS.md', bare);
        writeFixture(root, '.codex/CODEX_CONTEXT.md', bare);
        writeFixture(root, '.agents/skills/fixture/SKILL.md', bare);
        // Fixture trees that legitimately hardcode the DEFAULT to prove the default still works.
        writeFixture(root, '.claude/hooks/tests/docs/project-config.json', bare);
        writeFixture(root, '.claude/skills/fixture/tests/case.md', bare);
        writeAllowlist(root, {});

        const clean = invoke(root);
        assert.equal(clean.status, 0, clean.output);
        assert.match(clean.output, /residual occurrences: 0 across 0 files/);

        // Both non-`.claude` scan roots must be reachable.
        writeFixture(root, 'CLAUDE.md', bare);
        writeFixture(root, 'docs/project-reference/spec-system-reference.md', bare);

        const dirty = invoke(root, ['--json']);
        assert.equal(dirty.status, 1, dirty.output);
        const report = JSON.parse(dirty.stdout);
        assert.equal(report.perFile['CLAUDE.md'], 1);
        assert.equal(report.perFile['docs/project-reference/spec-system-reference.md'], 1);
        assert.equal(Object.keys(report.perFile).length, 2, JSON.stringify(report.perFile));
    } finally {
        cleanup(root);
    }
});

// Framework-repo-only: the residue gate gets its authority from THIS repo's authored surfaces. An
// adopting project's `CLAUDE.md` and `docs/project-reference/**` are its own prose, and hardcoding
// its own spec root there is legitimate — so running this against a copy reports failures the
// adopter cannot act on and did not cause. The scoped fixture cases (TC-DOCROOT-030..037) stay
// unguarded and keep the verifier's logic covered everywhere. PORT-011 names this test in the
// tripwire that proves the guard resolves ACTIVE at home, so a vacuous guard fails loudly there
// instead of silently turning this build gate off.
test('TC-DOCROOT-038: the real repository passes the residue gate (build gate via the tests stage)', (t) => {
    if (!isFrameworkRepo(repoRoot)) {
        t.skip('live framework-repository residue gate is not part of an adopting project copy');
        return;
    }

    const result = spawnSync(process.execPath, [verifier, `--root=${repoRoot}`], {
        cwd: repoRoot,
        env: isolatedEnv(),
        encoding: 'utf8',
        timeout: 120000,
        maxBuffer: 16 * 1024 * 1024,
    });
    assert.equal(result.error, undefined);
    const output = result.stdout + result.stderr;
    assert.equal(
        result.status,
        0,
        `root-literal residue gate failed. Convert the file; or, for a FRAMEWORK surface, add it to `
            + `.claude/scripts/codex/config/root-literal-allowlist.json with a reason naming its owning phase; `
            + `or, for this project's own reference-doc prose, add it to `
            + `<docsRoots.projectReference.path>/root-literal-allowlist.json — never put a project path in the `
            + `portable framework file.\n${output}`
    );
    assert.match(output, /\[codex-verify-root-literals\] PASS/);
});

// ── Portability: the PROJECT plane is config-resolved and project-owned ──────────────────────────
//
// Two defects made this gate unusable in any repository that was not the upstream framework repo,
// and both were in the verifier rather than in the repositories it judged:
//
//   1. the project-reference scan root was the LITERAL `docs/project-reference`, although that root
//      is relocatable via `docsRoots.projectReference.path`. A project that moved it was scanned
//      NOWHERE and passed vacuously — the exact defect class this verifier exists to catch;
//   2. the only allowlist shipped INSIDE `.claude`, so the sole way to account for an adopter's own
//      reference-doc prose was to write that project's paths into a portable file, carrying one
//      project's suppressions into the next repository that copied the bundle.
//
// The project plane now resolves from config and carries its own optional allowlist beside the docs
// it suppresses. The framework file stays project-free and portable.

test('TC-DOCROOT-039: the project-reference scan root resolves from docsRoots.projectReference.path', () => {
    const root = makeRepo();
    try {
        const bare = `Read ${SPEC_LITERAL}/ first.\n`;
        writeFixture(root, 'docs/project-config.json', JSON.stringify({
            docsRoots: { projectReference: { path: 'handbook/reference' } },
        }));
        // The DEFAULT location must no longer be scanned once the root is relocated…
        writeFixture(root, 'docs/project-reference/stale.md', bare);
        writeAllowlist(root, {});
        const relocated = invoke(root, ['--json']);
        assert.equal(relocated.status, 0, relocated.output);
        assert.equal(JSON.parse(relocated.stdout).perFile['docs/project-reference/stale.md'], undefined);

        // …and the CONFIGURED location must be.
        writeFixture(root, 'handbook/reference/guide.md', bare);
        const dirty = invoke(root, ['--json']);
        assert.equal(dirty.status, 1, dirty.output);
        assert.equal(JSON.parse(dirty.stdout).perFile['handbook/reference/guide.md'], 1);
    } finally {
        cleanup(root);
    }
});

test('TC-DOCROOT-040: an optional project-plane allowlist suppresses project prose; absence is not an error', () => {
    const root = makeRepo();
    try {
        writeFixture(root, 'docs/project-reference/spec-system-reference.md', `This project does not use ${SPEC_LITERAL}/.\n`);
        writeAllowlist(root, {});

        // Absent project allowlist: the occurrence is unaccounted for, and the run fails LOUDLY
        // rather than treating a missing optional file as a pass.
        const before = invoke(root);
        assert.equal(before.status, 1, before.output);

        // Present project allowlist at <REF_DOCS_ROOT>/root-literal-allowlist.json — discovered
        // with no flag, because an adopter must not have to re-wire the pipeline invocation.
        writeFixture(root, 'docs/project-reference/root-literal-allowlist.json', JSON.stringify({
            files: {
                'docs/project-reference/spec-system-reference.md': {
                    reason: 'permanent — prose stating the default root is unused in this project',
                },
            },
        }));
        const after = invoke(root);
        assert.equal(after.status, 0, after.output);
        assert.match(after.output, /PASS/);
    } finally {
        cleanup(root);
    }
});

test('TC-DOCROOT-041: an allowlist file is excluded from the scan and cannot flag itself', () => {
    const root = makeRepo();
    try {
        // Every key in an allowlist is by definition a path containing a tracked literal, so a
        // scanned allowlist reports itself and can never be cleared except by allowlisting itself.
        writeFixture(root, 'docs/project-reference/root-literal-allowlist.json', JSON.stringify({
            files: { [`${SPEC_LITERAL}/anything.md`]: { reason: 'permanent — fixture' } },
        }));
        writeAllowlist(root, {});
        const result = invoke(root, ['--json']);
        assert.equal(result.status, 0, result.output);
        assert.equal(JSON.parse(result.stdout).perFile['docs/project-reference/root-literal-allowlist.json'], undefined);
    } finally {
        cleanup(root);
    }
});

// TC-DOCROOT-042 — other checkouts the agent host keeps under `.claude/worktrees/` are separate
// working trees, each with its own `.claude/`, reference docs and mirrors. Walking into one reports
// another branch's files as THIS checkout's residue, under paths no allowlist entry can name, and
// multiplies the scan by the number of worktrees. Live files beside them still count.
test('TC-DOCROOT-042: nested worktree checkouts are not this checkout\'s residue; live files beside them still are', () => {
    const root = makeRepo();
    try {
        const bare = `Read ${SPEC_LITERAL}/ first.\n`;
        writeFixture(root, '.claude/worktrees/other-branch/CLAUDE.md', bare);
        writeFixture(root, '.claude/worktrees/other-branch/.claude/skills/fixture/SKILL.md', bare);
        writeFixture(root, '.claude/worktrees/other-branch/docs/project-reference/spec-system-reference.md', bare);
        writeAllowlist(root, {});

        const clean = invoke(root);
        assert.equal(clean.status, 0, clean.output);
        assert.match(clean.output, /residual occurrences: 0 across 0 files/);

        // A skill that merely has the word in its own path is live source, not a nested checkout.
        writeFixture(root, '.claude/skills/worktrees/SKILL.md', bare);
        const dirty = invoke(root, ['--json']);
        assert.equal(dirty.status, 1, dirty.output);
        assert.deepEqual(Object.keys(JSON.parse(dirty.stdout).perFile), ['.claude/skills/worktrees/SKILL.md']);
    } finally {
        cleanup(root);
    }
});
