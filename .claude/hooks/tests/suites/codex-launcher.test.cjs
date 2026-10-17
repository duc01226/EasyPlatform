'use strict';

/**
 * Codex launcher entry-point contract.
 *
 * The generated Codex mirror runs every hook as `node -e "…require(path.join(root, hookPath))" --
 * <hookPath>` (`.codex/hooks.json`), where `require.main` is undefined. A hook that guards its main on
 * `require.main === module` is a silent no-op there, so every hook guards on the shared
 * `isHookEntryPoint(module)` (`.claude/hooks/lib/hook-runner.cjs`).
 *
 * Intent protected here:
 * - isHookEntryPoint recognises the running hook on both launch shapes, through a symlink/junction
 *   install, and case-insensitively on Windows — and never mistakes a required module for the entry.
 * - Each hook migrated to the shared check (review-commit-gate, doc-sync-gate, init-prompt-gate,
 *   session-init-docs, file-convention-inject, prompt-ledger, core-principles-inject) produces ITS OWN
 *   observable outcome when Codex launches it. Reverting any of them to `require.main === module` fails its test.
 * - workflow-route-inject and workflow-catalog-inject are thin entries with no guard: each calls
 *   `runHook(<part>)` of `lib/workflow-route-delivery.cjs`, which owns both outputs. Launched by Codex,
 *   each writes its own output alone and records its own delivery.
 *
 * Fixture projects hold a COPY of the hook tree (the launcher runs the tree under the nearest `.claude`
 * ancestor of its cwd), so fixture config never touches the repository.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');
const { assertTrue, assertContains, assertEqual } = require('../lib/assertions.cjs');
const { runCodexLauncher, makeHookTreeProject, removeTempDir } = require('../lib/hook-runner.cjs');

const HOOKS_DIR = path.resolve(__dirname, '..', '..');
const CLAUDE_DIR = path.resolve(HOOKS_DIR, '..');
const { isHookEntryPoint } = require(path.join(HOOKS_DIR, 'lib', 'hook-runner.cjs'));
const conventionLedger = require(path.join(HOOKS_DIR, 'lib', 'convention-ledger.cjs'));
const promptStore = require(path.join(HOOKS_DIR, 'lib', 'prompt-ledger-store.cjs'));
// A developer's own switches and debug flags never reach a launched hook (undefined deletes the key).
const HOOK_ENV_RESET = Object.freeze({ CK_DEBUG: undefined, CLAUDE_HOOK_DEBUG: undefined });

const GIT = (() => {
    try {
        return spawnSync('git', ['--version'], { encoding: 'utf8', windowsHide: true }).status === 0;
    } catch {
        return false;
    }
})();

const removeTemp = removeTempDir;

// Directory links need no privilege on Windows (junction) or POSIX (symlink). If the host still refuses
// one, the link-dependent cases are skipped with this reason instead of failing.
const LINK_SKIP = (() => {
    const probe = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-launcher-link-probe-'));
    try {
        fs.mkdirSync(path.join(probe, 'target'));
        fs.symlinkSync(path.join(probe, 'target'), path.join(probe, 'link'), process.platform === 'win32' ? 'junction' : 'dir');
        return false;
    } catch (error) {
        if (['EACCES', 'EPERM', 'ENOSYS', 'ENOTSUP', 'EOPNOTSUPP'].includes(error && error.code)) {
            const reason = `directory symlink/junction creation is unavailable on ${process.platform}: ${error.code}`;
            console.log(`  [codex-launcher] skipping link cases — ${reason}`);
            return reason;
        }
        throw error;
    } finally {
        removeTemp(probe);
    }
})();

function linkDirectory(target, link) {
    fs.symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir');
}

/** A temp project root holding a copy of the hook tree (no suites, no notifications) at `.claude/hooks`. */
const makeHookProject = makeHookTreeProject;

function writeFile(root, rel, content) {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, typeof content === 'string' ? content : JSON.stringify(content));
    return abs;
}

function git(cwd, args) {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
}

function initRepo(dir) {
    git(dir, ['init', '-q']);
    git(dir, ['config', 'user.email', 'test@example.com']);
    git(dir, ['config', 'user.name', 'Test']);
    git(dir, ['config', 'commit.gpgsign', 'false']);
}

const bashCommit = (command, cwd) => JSON.stringify({
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: { command, ...(cwd ? { cwd } : {}) },
    session_id: 'codex-launcher-test',
    cwd
});

const unitTests = [
    {
        name: '[codex-launcher] TC-HEP-001 require.main decides whenever it is set: own module true, foreign module false',
        fn: () => {
            // Given a module object and a different module standing as require.main
            const mod = { filename: path.join(os.tmpdir(), 'hook.cjs') };
            const foreign = { filename: path.join(os.tmpdir(), 'runner.cjs') };
            // When / Then: the entry is only ever the module require.main names — argv is not consulted
            assertEqual(isHookEntryPoint(mod, { main: mod }), true, 'node <hook>: require.main is the hook');
            assertEqual(isHookEntryPoint(mod, { main: foreign, argv: ['node', mod.filename] }), false,
                'a hook required by a test runner is never the entry, even when argv names it');
            assertEqual(isHookEntryPoint(null), false, 'no module → false');
            assertEqual(isHookEntryPoint({}), false, 'module without filename → false');
        }
    },
    {
        name: '[codex-launcher] TC-HEP-002 Codex shape (require.main undefined) matches argv[1] against the module file',
        fn: () => {
            // Given a real hook file and the Codex launcher's argv (relative path resolved against the root cwd)
            const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hep-shape-'));
            try {
                const file = writeFile(dir, 'hook.cjs', '');
                const other = writeFile(dir, 'other.cjs', '');
                const mod = { filename: fs.realpathSync.native(file) };
                // When require.main is undefined / Then argv[1] decides
                assertEqual(isHookEntryPoint(mod, { main: undefined, argv: ['node', file] }), true, 'launcher argv names this hook');
                assertEqual(isHookEntryPoint(mod, { main: undefined, argv: ['node', other] }), false, 'launcher argv names another hook');
                assertEqual(isHookEntryPoint(mod, { main: undefined, argv: ['node'] }), false, 'no argv[1] → false');
                assertEqual(isHookEntryPoint(mod, { main: undefined, argv: ['node', ''] }), false, 'empty argv[1] → false');
            } finally {
                removeTemp(dir);
            }
        }
    },
    {
        name: '[codex-launcher] TC-HEP-003 Windows paths compare case-insensitively; POSIX paths stay case-sensitive',
        fn: () => {
            // Given the same path spelled in two cases and an identity realpath (paths need not exist)
            const lower = path.resolve(os.tmpdir(), 'hep-case', 'hook.cjs');
            const upper = lower.toUpperCase();
            const options = platform => ({ main: undefined, argv: ['node', upper], platform, realpath: p => p });
            // When compared as win32 / Then they match; as linux / Then they do not
            assertEqual(isHookEntryPoint({ filename: lower }, options('win32')), true, 'win32 is case-insensitive');
            assertEqual(isHookEntryPoint({ filename: lower }, options('linux')), false, 'POSIX is case-sensitive');
        }
    },
    {
        name: '[codex-launcher] TC-HEP-004 argv reached through a symlink/junction still matches the real module path',
        skip: LINK_SKIP,
        fn: () => {
            // Given a hook reached through a linked directory: Node records mod.filename as the REAL path
            const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hep-link-'));
            try {
                const realFile = writeFile(dir, path.join('real', 'hook.cjs'), '');
                linkDirectory(path.join(dir, 'real'), path.join(dir, 'link'));
                const linkedArgv = path.join(dir, 'link', 'hook.cjs');
                const mod = { filename: fs.realpathSync.native(realFile) };
                // When argv[1] names the linked path / Then both sides are canonicalized and match
                assertEqual(isHookEntryPoint(mod, { main: undefined, argv: ['node', linkedArgv] }), true, 'linked argv must match');
                // And the defect it prevents: comparing uncanonicalized paths misses the entry point
                assertEqual(isHookEntryPoint(mod, { main: undefined, argv: ['node', linkedArgv], realpath: p => p }), false,
                    'without canonicalization the linked argv does not match (the silent Codex no-op)');
            } finally {
                removeTemp(dir);
            }
        }
    }
];

const launcherTests = [
    {
        name: '[codex-launcher] TC-CXL-001 review-commit-gate under the Codex launcher blocks an unreviewed raw commit and allows read-only git',
        skip: !GIT,
        fn: () => {
            // Given a repository with a staged change and an empty review-receipt store
            const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-launcher-gate-'));
            try {
                const repo = path.join(root, 'repo');
                const store = path.join(root, 'store');
                fs.mkdirSync(repo);
                fs.mkdirSync(store);
                initRepo(repo);
                writeFile(repo, 'file.txt', 'base\n');
                git(repo, ['add', 'file.txt']);
                git(repo, ['commit', '-q', '-m', 'base']);
                writeFile(repo, 'file.txt', 'changed\n');
                git(repo, ['add', 'file.txt']);
                const env = { CK_REVIEW_RECEIPT_STORE: store };
                // When Codex launches the gate on a raw `git commit` (Codex PreToolUse matcher: Bash)
                const blocked = runCodexLauncher('review-commit-gate.cjs', bashCommit('git commit -m x', repo), { env });
                // Then the gate's own policy block fires — not a crash exit
                assertEqual(blocked.code, 2, `raw commit must block, stderr: ${blocked.stderr}`);
                assertContains(blocked.stderr, '[BLOCKED] Commit refused — the exact commit candidate has no matching review fix-loop receipt.');
                assertContains(blocked.stderr, 'Candidate fingerprint:');
                // When the same launcher sees read-only git / Then it allows silently
                const allowed = runCodexLauncher('review-commit-gate.cjs', bashCommit('git status', repo), { env });
                assertEqual(allowed.code, 0, `read-only git must pass, stderr: ${allowed.stderr}`);
                assertTrue(!allowed.stderr.includes('[BLOCKED]'), 'no block message on an allowed statement');
            } finally {
                removeTemp(root);
            }
        }
    },
    {
        name: '[codex-launcher] TC-CXL-002 doc-sync-gate under the Codex launcher warns on a commit of stale enforced-area code',
        skip: !GIT,
        fn: () => {
            // Given a fixture project whose enforced area has a staged behavioral change and no spec update
            const root = makeHookProject('docsync');
            try {
                initRepo(root);
                writeFile(root, '.claude/hooks/config/doc-sync-gate.json', {
                    enabled: true,
                    behavioralCodeExtensions: ['.cs', '.ts'],
                    fastExit: { pathPrefixes: ['docs/', '.claude/', 'tmp/'], pathContains: ['/tests/'], extensions: ['.md', '.json'] },
                    enforcedAreas: []
                });
                writeFile(root, 'docs/project-config.json', {
                    project: { name: 'Fixture' },
                    workflowPatterns: { docSyncGate: { enforcedAreas: [{ name: 'ExampleArea', codePathPrefixes: ['src/ExampleArea/'], graceDays: 0 }] } }
                });
                writeFile(root, '.gitignore', '.claude/\n');
                writeFile(root, 'src/ExampleArea/Foo.cs', 'public class Foo { int X() => 1; }\n');
                git(root, ['add', '-A']);
                git(root, ['commit', '-q', '-m', 'baseline']);
                writeFile(root, 'src/ExampleArea/Foo.cs', 'public class Foo { int X() => 42; }\n');
                git(root, ['add', '-A']);
                // When Codex launches the gate from the fixture root on `git commit`
                const result = runCodexLauncher('doc-sync-gate.cjs', bashCommit('git commit -m "x"'), { cwd: root });
                // Then it allows (advisory) and prints its own doc-sync warning
                assertEqual(result.code, 0, `doc-sync-gate never blocks, stderr: ${result.stderr}`);
                assertContains(result.stderr, '[doc-sync]');
                assertContains(result.stderr, 'Feature Spec');
            } finally {
                removeTemp(root);
            }
        }
    },
    {
        name: '[codex-launcher] TC-CXL-003 init-prompt-gate under the Codex launcher warns without blocking on a present-but-invalid project config',
        fn: () => {
            // Given a fixture project whose project config exists but has no project.name
            const root = makeHookProject('initgate');
            try {
                writeFile(root, 'docs/project-config.json', { project: {} });
                // When Codex launches the gate on an ordinary prompt
                const result = runCodexLauncher('init-prompt-gate.cjs',
                    JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: 'codex-launcher-test', prompt: 'hello' }), { cwd: root });
                // Then it adds a warning for the model and lets the prompt through
                assertEqual(result.code, 0, `stderr: ${result.stderr}`);
                assertTrue(!/"decision"\s*:\s*"block"/.test(result.stdout), 'invalid declared config must not block the prompt');
                assertContains(result.stdout, 'is invalid');
                assertContains(result.stdout, '/project-init');
            } finally {
                removeTemp(root);
            }
        }
    },
    {
        name: '[codex-launcher] TC-CXL-004 session-init-docs under the Codex launcher materializes the configured reference doc',
        fn: () => {
            // Given a fixture project with a valid config selecting one reference doc and project content
            const root = makeHookProject('sessiondocs');
            try {
                writeFile(root, 'docs/project-config.json', {
                    project: { name: 'Fixture' },
                    referenceDocs: [{ filename: 'my-guide.md', purpose: 'My guide', sections: ['Intro'] }]
                });
                fs.mkdirSync(path.join(root, 'src'));
                const guide = path.join(root, 'docs', 'project-reference', 'my-guide.md');
                assertTrue(!fs.existsSync(guide), 'precondition: the reference doc is absent');
                // When Codex launches the SessionStart hook
                const result = runCodexLauncher('session-init-docs.cjs',
                    JSON.stringify({ hook_event_name: 'SessionStart', source: 'startup', session_id: 'codex-launcher-test' }), { cwd: root });
                // Then it creates the configured placeholder doc with its declared section
                assertEqual(result.code, 0, `stderr: ${result.stderr}`);
                assertTrue(fs.existsSync(guide), 'session-init-docs must create docs/project-reference/my-guide.md');
                assertContains(fs.readFileSync(guide, 'utf8'), '## Intro');
            } finally {
                removeTemp(root);
            }
        }
    },
    {
        name: '[codex-launcher] TC-CXL-005 a project whose .claude is a symlink/junction still runs its hooks under the Codex launcher',
        skip: LINK_SKIP,
        fn: () => {
            // Given a hook tree installed in one place and a project that reaches it through a linked `.claude`
            const install = makeHookProject('install');
            const project = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-launcher-linked-'));
            const link = path.join(project, '.claude');
            try {
                linkDirectory(path.join(install, '.claude'), link);
                // When Codex launches an advisory router from the linked project root
                const result = runCodexLauncher('commit-skill-route.cjs',
                    JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: 'codex-launcher-test', prompt: 'stage and commit' }),
                    { cwd: project, env: { ...HOOK_ENV_RESET, CK_COMMIT_SKILL_ROUTE: undefined } });
                // Then the hook recognises itself as the entry point and emits its directive
                assertEqual(result.code, 0, `stderr: ${result.stderr}`);
                assertContains(result.stdout, '<!-- CK:COMMIT-SKILL-ROUTE -->');
            } finally {
                // Remove the link itself first so cleanup can never recurse into the linked tree.
                try {
                    fs.unlinkSync(link);
                } catch {
                    /* already gone */
                }
                removeTemp(project);
                removeTemp(install);
            }
        }
    },
    {
        name: '[codex-launcher] TC-CXL-006 file-convention-inject under the Codex launcher delivers the touched file\'s convention digest and records it',
        fn: () => {
            // Given a fixture project that opts in to convention injection with one class for its hook files
            const root = makeHookProject('conventions');
            const store = path.join(root, 'convention-store');
            try {
                writeFile(root, 'docs/project-config.json', {
                    project: { name: 'Fixture' },
                    conventionInjection: { enabled: true },
                    contextGroups: [{
                        name: 'fixture-hooks',
                        pathRegexes: ['[\\\\/]\\.claude[\\\\/]hooks[\\\\/].*\\.cjs$'],
                        fileExtensions: ['.cjs'],
                        referenceDocs: ['docs/fixture-hooks-guide.md'],
                        rules: ['Fixture hooks rule: CommonJS only']
                    }]
                });
                const edit = {
                    hook_event_name: 'PostToolUse',
                    tool_name: 'apply_patch',
                    session_id: 'codex-launcher-conventions',
                    cwd: root,
                    tool_input: { command: ['*** Begin Patch', '*** Update File: .claude/hooks/commit-skill-route.cjs', '*** End Patch'].join('\n') }
                };
                // When Codex launches the PostToolUse hook for an apply_patch on a hook file
                const result = runCodexLauncher('file-convention-inject.cjs', JSON.stringify(edit),
                    { cwd: root, env: { ...HOOK_ENV_RESET, CK_CONVENTIONS_DIR: store } });
                // Then it emits its own additionalContext digest naming the class, its reference doc and rule
                assertEqual(result.code, 0, `stderr: ${result.stderr}`);
                assertTrue(result.stdout.trim() !== '', 'the launched hook must emit its digest (empty = silent no-op)');
                const context = JSON.parse(result.stdout).hookSpecificOutput.additionalContext;
                assertContains(context, '.claude/hooks/commit-skill-route.cjs — MUST read first: docs/fixture-hooks-guide.md');
                assertContains(context, 'fixture-hooks');
                assertContains(context, 'Fixture hooks rule: CommonJS only');
                // And its delivery store now counts the class as reminded for this session
                const record = conventionLedger.readRecord(store, 'codex-launcher-conventions', 'main', 'fixture-hooks');
                assertTrue(Boolean(record && record.hash), 'delivery must be recorded in the fixture convention store');
            } finally {
                removeTemp(root);
            }
        }
    },
    {
        name: '[codex-launcher] TC-CXL-007 prompt-ledger under the Codex launcher pins the first prompt and records it in the project ledger',
        fn: () => {
            // Given a fixture project with no ledger and the developer's ledger switch and store override removed
            const root = makeHookProject('ledger');
            const sessionId = 'codex-launcher-ledger';
            const prompt = 'Add export to the fixture report page';
            try {
                // When Codex launches the UserPromptSubmit hook on the session's first prompt
                const result = runCodexLauncher('prompt-ledger.cjs',
                    JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: sessionId, cwd: root, prompt }),
                    { cwd: root, env: { ...HOOK_ENV_RESET, CK_PROMPT_LEDGER: undefined, CK_PROMPT_LEDGER_DIR: undefined } });
                // Then it prints its own pin notice for P1
                assertEqual(result.code, 0, `stderr: ${result.stderr}`);
                assertContains(result.stdout, 'Session prompt ledger: P1 pinned as the original goal');
                // And the prompt is stored verbatim in the fixture project's own ledger (the launcher's project root)
                const ledger = promptStore.readLedger(promptStore.sessionDir(path.join(root, 'tmp', 'prompt-ledger'), sessionId));
                assertTrue(Boolean(ledger), 'ledger must be written under <fixture>/tmp/prompt-ledger');
                assertEqual(ledger.entries.length, 1, 'one prompt recorded');
                assertEqual(ledger.entries[0].text, prompt, 'prompt stored verbatim');
            } finally {
                removeTemp(root);
            }
        }
    },
    {
        name: '[codex-launcher] TC-CXL-008 workflow-route-inject under the Codex launcher emits the project\'s route gate and records the delivery',
        fn: () => {
            // Given a fixture project carrying its own workflow gate text, the workflow catalog and its script libraries
            const root = makeHookProject('route');
            const sessionId = 'codex-launcher-route';
            try {
                fs.cpSync(path.join(CLAUDE_DIR, 'scripts', 'lib'), path.join(root, '.claude', 'scripts', 'lib'), { recursive: true });
                fs.copyFileSync(path.join(CLAUDE_DIR, 'workflows.json'), path.join(root, '.claude', 'workflows.json'));
                writeFile(root, '.claude/skills/shared/workflow-first-gate.md', 'FIXTURE-WORKFLOW-GATE: route before acting.\n');
                // A clean machine: the test asserts the default-mode (ask) route, so every inherited CK_* switch
                // (a personal route mode included) is removed and home and temp point into the fixture
                const env = { ...HOOK_ENV_RESET, HOME: root, USERPROFILE: root, TMPDIR: root, TEMP: root, TMP: root };
                for (const key of Object.keys(process.env)) {
                    if (/^CK_/i.test(key)) env[key] = undefined;
                }
                // When Codex launches the UserPromptSubmit hook on a prompt
                const result = runCodexLauncher('workflow-route-inject.cjs',
                    JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: sessionId, cwd: root, prompt: 'add a retry to the fetcher' }),
                    { cwd: root, env });
                // Then it emits its own route block built from the FIXTURE project's gate text, in the default mode
                assertEqual(result.code, 0, `stderr: ${result.stderr}`);
                assertContains(result.stdout, 'Route mode: ask (default)');
                assertContains(result.stdout, '<!-- CK:RUNTIME-WORKFLOW-ROUTE -->');
                assertContains(result.stdout, 'FIXTURE-WORKFLOW-GATE: route before acting.');
                assertContains(result.stdout, '<!-- /CK:RUNTIME-WORKFLOW-ROUTE -->');
                // And only that block: the catalog is the catalog hook's output, one process writes one output
                assertTrue(!result.stdout.includes('<!-- CK:RUNTIME-WORKFLOW-CATALOG -->'), 'the route hook must not also write the catalog output');
                assertTrue(!result.stdout.includes('## Workflow & Skills Catalog'), 'the route output carries no catalog');
                // And records the delivery in the fixture project's route ledger
                const record = conventionLedger.readRecord(path.join(root, 'tmp', 'workflow-routing'), sessionId, 'main', 'workflow-route');
                assertTrue(Boolean(record && record.hash), 'delivery must be recorded under <fixture>/tmp/workflow-routing');
                assertTrue(!conventionLedger.readRecord(path.join(root, 'tmp', 'workflow-routing'), sessionId, 'main', 'workflow-catalog'),
                    'the route hook must not record a catalog delivery');
            } finally {
                removeTemp(root);
            }
        }
    },
    {
        // Intent: the workflow catalog is the second output of the route. On Codex it must arrive too, and as
        // the catalog ALONE: both entry files call one delivery module, which would write a second route
        // block (or nothing at all) if the catalog entry named the wrong part.
        name: '[codex-launcher] TC-CXL-010 workflow-catalog-inject under the Codex launcher emits the project\'s workflow catalog alone and records its own delivery',
        fn: () => {
            // Given a fixture project carrying its own workflow registry and a gate file (the fixture tree holds the script libraries)
            const root = makeHookProject('catalog');
            const sessionId = 'codex-launcher-catalog';
            try {
                writeFile(root, '.claude/workflows.json', {
                    version: '1.0.0',
                    workflows: {
                        'workflow-fixture-launcher': {
                            name: 'Fixture launcher', activation: 'confirm', whenToUse: 'run the fixture launcher route',
                            preActions: { injectContext: 'Use the selected workflow context.' },
                            sequence: ['investigate', 'review-a', 'review-b', 'finish'],
                            parallelGroups: [{ id: 'reviews', members: ['review-a', 'review-b'], barrier: true }]
                        }
                    }
                });
                writeFile(root, '.claude/skills/shared/workflow-first-gate.md', 'FIXTURE-WORKFLOW-GATE: route before acting.\n');
                // A clean machine: every inherited CK_* switch (a personal route mode or a disabled skill
                // auto-trigger included) is removed and home and temp point into the fixture. This is the RAW
                // override map: the launcher helper resolves the child environment itself.
                const env = { ...HOOK_ENV_RESET, HOME: root, USERPROFILE: root, TMPDIR: root, TEMP: root, TMP: root };
                for (const key of Object.keys(process.env)) {
                    if (/^CK_/i.test(key)) env[key] = undefined;
                }
                // When Codex launches the catalog hook on a prompt
                const result = runCodexLauncher('workflow-catalog-inject.cjs',
                    JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: sessionId, cwd: root, prompt: 'add a retry to the fetcher' }),
                    { cwd: root, env });
                // Then it emits its own catalog block built from the FIXTURE project's registry, in the default mode
                assertEqual(result.code, 0, `stderr: ${result.stderr}`);
                assertTrue(result.stdout.startsWith('<!-- CK:RUNTIME-WORKFLOW-CATALOG -->\n'), `the launched hook must emit its catalog block (empty = silent no-op), got: ${result.stdout.slice(0, 120)}`);
                assertTrue(result.stdout.endsWith('\n<!-- /CK:RUNTIME-WORKFLOW-CATALOG -->\n'), 'the catalog block must be closed');
                assertContains(result.stdout, '## Workflow & Skills Catalog');
                assertContains(result.stdout, '| `workflow-fixture-launcher` | confirm · 4 steps |');
                assertContains(result.stdout, '[review-a ∥ review-b]');
                assertContains(result.stdout, 'before you start a catalog workflow, in every tier');
                // And the catalog alone: no route block, no state line, no gate text
                assertTrue(!result.stdout.includes('<!-- CK:RUNTIME-WORKFLOW-ROUTE -->'), 'the catalog hook must not also write the route output');
                assertTrue(!result.stdout.includes('Route mode:'), 'the state line belongs to the route output');
                assertTrue(!result.stdout.includes('FIXTURE-WORKFLOW-GATE'), 'the gate belongs to the route output');
                // And records the delivery on its own record in the fixture project's route ledger
                const store = path.join(root, 'tmp', 'workflow-routing');
                const record = conventionLedger.readRecord(store, sessionId, 'main', 'workflow-catalog');
                assertTrue(Boolean(record && record.hash), 'delivery must be recorded under <fixture>/tmp/workflow-routing as workflow-catalog');
                assertTrue(!conventionLedger.readRecord(store, sessionId, 'main', 'workflow-route'), 'the catalog hook must not record a route delivery');
            } finally {
                removeTemp(root);
            }
        }
    },
    {
        name: '[codex-launcher] TC-CXL-009 core-principles-inject under the Codex launcher delivers the project\'s canonical principles and records the delivery',
        fn: () => {
            // Given a fixture project carrying its own canonical principles body and the script library that reads it
            const root = makeHookProject('coreprinciples');
            const sessionId = 'codex-launcher-core-principles';
            try {
                fs.cpSync(path.join(CLAUDE_DIR, 'scripts', 'lib'), path.join(root, '.claude', 'scripts', 'lib'), { recursive: true });
                writeFile(root, '.claude/skills/shared/sync-inline-versions.md',
                    '# Shared\n\n## SYNC:core-engineering-principles\n\nFIXTURE-CORE-PRINCIPLES: Easy to change · Easy to scale · Easy to maintain.\n\n---\n');
                // A clean machine: every inherited CK_* switch removed, home and temp pointed into the fixture
                const env = { ...HOOK_ENV_RESET, HOME: root, USERPROFILE: root, TMPDIR: root, TEMP: root, TMP: root };
                for (const key of Object.keys(process.env)) {
                    if (/^CK_/i.test(key)) env[key] = undefined;
                }
                // When Codex launches the UserPromptSubmit hook on a prompt
                const result = runCodexLauncher('core-principles-inject.cjs',
                    JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: sessionId, cwd: root, prompt: 'implement the exporter' }),
                    { cwd: root, env });
                // Then it emits its own marker-wrapped block built from the FIXTURE project's canonical file
                assertEqual(result.code, 0, `stderr: ${result.stderr}`);
                assertContains(result.stdout, '<!-- CK:CORE-ENGINEERING-PRINCIPLES -->');
                assertContains(result.stdout, 'FIXTURE-CORE-PRINCIPLES: Easy to change');
                assertContains(result.stdout, '<!-- /CK:CORE-ENGINEERING-PRINCIPLES -->');
                // And records the delivery in the fixture project's ledger
                const record = conventionLedger.readRecord(path.join(root, 'tmp', 'protocol-delivery'), sessionId, 'main', 'core-engineering-principles');
                assertTrue(Boolean(record && record.hash), 'delivery must be recorded under <fixture>/tmp/protocol-delivery (the protocol-delivery record of the tag)');
            } finally {
                removeTemp(root);
            }
        }
    }
];

module.exports = {
    name: 'codex-launcher',
    tests: [...unitTests, ...launcherTests]
};
