'use strict';

// TC-HARNESS-GATE: no agent commit without a review receipt over the exact changeset.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const Module = require('node:module');
const path = require('node:path');
const { spawnSync, execFileSync } = require('node:child_process');

const LIB = path.resolve(__dirname, '../../lib/review-receipt.cjs');
const HOOK = path.resolve(__dirname, '../../review-commit-gate.cjs');
const receipt = () => require(LIB);
const gate = () => require(HOOK);
const NOW = 1800000000000;
const FP_B = 'b'.repeat(64);

function gitAvailable() {
    try {
        const result = spawnSync('git', ['--version'], { encoding: 'utf8', windowsHide: true });
        return result.status === 0;
    } catch (_) {
        return false;
    }
}
const GIT = gitAvailable();

function fixture(fn) {
    // Resolve the temp root (macOS /var -> /private/var) so loadMutantGate's parent.filename match
    // and require.cache keys use the spelling Node's loader records. JS realpathSync, not .native:
    // the loader keeps Windows 8.3 short names, which .native would expand.
    const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'review-gate-test-')));
    try {
        for (const dir of ['repo-a', 'repo-b', 'store']) fs.mkdirSync(path.join(root, dir));
        return fn({ root, repoA: path.join(root, 'repo-a'), repoB: path.join(root, 'repo-b'), store: path.join(root, 'store') });
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
}

function git(cwd, args) {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
}

function makeRepo(dir) {
    git(dir, ['init', '-q']);
    git(dir, ['config', 'user.email', 'test@example.com']);
    git(dir, ['config', 'user.name', 'Test']);
    fs.writeFileSync(path.join(dir, '.gitignore'), '/tmp/\n/temp/\n');
    fs.writeFileSync(path.join(dir, 'file.txt'), 'base\n');
    git(dir, ['add', '.gitignore', 'file.txt']);
    git(dir, ['commit', '-q', '-m', 'base']);
}

function withStore(store, fn) {
    const before = process.env.CK_REVIEW_RECEIPT_STORE;
    process.env.CK_REVIEW_RECEIPT_STORE = store;
    try {
        return fn();
    } finally {
        if (before === undefined) delete process.env.CK_REVIEW_RECEIPT_STORE;
        else process.env.CK_REVIEW_RECEIPT_STORE = before;
    }
}

function snapshot(api, repository, target = 'worktree', descriptor) {
    return api.captureReviewTarget({ repository, cwd: descriptor?.cwd || repository, target,
        ...(descriptor ? { descriptor } : {}) });
}

function issueCandidate(api, store, candidate, kind = 'changes-review', extra = {}) {
    return withStore(store, () => api.issueReceipt({
        repository: candidate.repository,
        snapshot: candidate,
        scope: 'full-changeset',
        kind,
        ...extra
    }));
}

function loadMutantGate(file, repo, statements) {
    const originalLoad = Module._load;
    const classifyStatement = statement => ({
        kind: 'allow',
        operation: 'commit',
        resolved: { known: true, repository: repo, cwd: repo, operationArgv: ['git', 'commit'] },
        statement
    });
    Module._load = function (request, parent, isMain) {
        if (parent?.filename === file) {
            if (request === './lib/command-inspection.cjs') return { inspectCommand: () => ({ status: 'KNOWN', statements }) };
            if (request === './lib/git-statement.cjs') return { classifyStatement, findRepository: () => repo, canonical: value => value,
                AMEND_ABBREVIATIONS: new Set() };
            // The entry-point check is stubbed false so requiring the mutant never runs the hook's main.
            if (request === './lib/hook-runner.cjs') return { runPreToolHookSync: () => undefined, isHookEntryPoint: () => false };
            if (request === './lib/debug-log.cjs') return { reportHookInternalError: () => undefined };
            if (request === './lib/review-receipt.cjs') return {
                captureReviewTarget: () => ({ status: 'CLEAN' }),
                matchReviewReceipt: () => null,
                matchSkipReceipt: () => null
            };
        }
        return originalLoad.call(this, request, parent, isMain);
    };
    try {
        delete require.cache[file];
        return require(file);
    } finally {
        Module._load = originalLoad;
    }
}

const tests = [
    {
        // The gate's detection used to ask only whether the words `git` and `commit` BOTH appeared
        // anywhere in the command, so ordinary read-only work that merely MENTIONED both was routed
        // into the fail-closed branch and denied. Detection now requires an actual
        // `git [global-option...] commit` operand sequence. Both halves are asserted here: the
        // mentions must stay allowed, and every real invocation must stay gated — a regression in
        // the second half would be a silent commit bypass, which is worse than the false positive
        // this narrowing removes.
        name: 'REQ-GUARD-03 detection needs a real `git … commit` operand, not the words git and commit',
        fn: async () => {
            const { resolveCommitDescriptors } = gate();
            const HERE = process.cwd();
            // Built at runtime so this test file's own source cannot trip the gate that reads it.
            const C = `c${'ommit'}`;

            for (const command of [
                `grep -rln "git-${C}-block" .claude/hooks/tests/`,
                `grep -iE "git|${C}|authority" /dev/null`,
                `cat > f.md <<'EOF'\n- \`git log -S\` on stampFooter\n- same ${C} bd4ee4b057\nEOF`,
                `cat > f.md <<'EOF'\nDocument git ${C} literally, including $(git ${C} -m data).\nEOF`,
                `cat <<-"EOF"\n\tgit ${C}\n\tEOF`,
                `cat <<\\EOF\r\ngit ${C}\r\nEOF\r\n`,
                `echo "see git-${C}-block.cjs for the ${C} policy"`,
                `git ${C}-tree abc123`,
                `git ${C}-tree HEAD^{tree}`,
                `git -C /repo ${C}-tree HEAD^{tree}`
            ]) {
                const resolved = resolveCommitDescriptors(command, HERE);
                assert.equal(resolved.known, true, `must not fail closed on a mere mention: ${command}`);
                assert.deepEqual(resolved.descriptors, [], `must find no commit candidate in: ${command}`);
            }

            // Real invocations and unresolved executable forms must remain gated.
            for (const command of [
                `git ${C} -m x`,
                `sh -c "git ${C} -m x"`,
                `sh <<'EOF'\ngit ${C} -m x\nEOF`,
                `custom-runner <<'EOF'\ngit ${C} -m x\nEOF`,
                `cat <<'EOF' | sh\ngit ${C} -m x\nEOF`,
                `cat <<EOF\n$(git ${C} -m x)\nEOF`,
                `cat <<'EOF'\ndata\nEOF\ngit ${C} -m x`,
                `cat <<'EOF'\ngit ${C} -m x`,
                `PATH=/other cat <<'EOF'\ngit ${C}\nEOF`,
                `cat <<'EOF';\ngit ${C}\nEOF`,
                `cat <<'EOF' > "$OUTPUT"\ngit ${C}\nEOF`,
                `cat <<'EOF' <<OTHER\ndata\nEOF\n$(git ${C} -m x)\nOTHER`,
                `git -c user.name=x ${C} -m y`,
                `git -C /repo ${C} -m y`,
                `git --no-pager ${C} -m y`,
                `echo "$(git ${C} -m x)"`,
                `git ${C}; git status`
            ]) {
                const resolved = resolveCommitDescriptors(command, HERE);
                const gated = resolved.known === false || (resolved.descriptors || []).length > 0;
                assert.equal(gated, true, `a real commit invocation must stay gated: ${command}`);
            }
            // Empty dynamic suffixes can execute the literal commit operation on POSIX and Windows.
            // Unknown shell syntax must retain the pre-existing fail-closed review boundary.
            for (const command of [
                'git ' + C + '${EMPTY} -m x',
                'git ' + C + "$(printf '') -m x",
                'git ' + C + "`printf ''` -m x",
                'git ' + C + '%EMPTY% -m x',
                'git ' + C + '$env:EMPTY -m x'
            ]) {
                assert.equal(resolveCommitDescriptors(command, HERE).known, false, command);
                assert.equal(gate().evaluate({ tool_name: 'Bash', tool_input: { command }, cwd: HERE })?.code, 2,
                    `a potentially real commit with unknown syntax must require review: ${command}`);
            }
        }
    },
    {
        name: 'TC-FIT-012 hook recovery guidance binds an explicit skip to the commit descriptor',
        fn: async () => {
            const descriptor = {
                repository: 'C:\\fixture\\repo',
                cwd: 'C:\\fixture\\repo',
                mode: 'literal-paths',
                literalPaths: ['src/file.ts']
            };
            const message = gate().blockMessage(descriptor.repository,
                { status: 'CHANGED', fingerprint: 'a'.repeat(64) }, descriptor, 'no matching receipt');
            const descriptorJson = JSON.stringify(descriptor);

            assert.match(message, /snapshot --target=commit-descriptor/);
            assert.ok(message.includes(descriptorJson), 'snapshot command carries the exact blocked commit descriptor');
            assert.match(message, /issue --kind=skip --scope=full-changeset --snapshot-json=/);
            assert.match(message, /exact descriptor for the snapshot and commit/i);
            assert.doesNotMatch(message, /review-receipt\.cjs skip --reason=/,
                'do not recommend the worktree-only skip wrapper');

            const unsupported = gate().blockMessage(descriptor.repository,
                { status: 'ERROR', errorCode: 'UNSUPPORTED' }, null, 'unsupported commit context');
            assert.match(unsupported, /no supported exact commit descriptor/i);
            assert.doesNotMatch(unsupported, /issue --kind=skip/,
                'unsupported contexts cannot be given a candidate-free skip path');
        }
    },
    {
        // The hook explains the configured default and risk-based alternative without a question;
        // the selector owns the choice, while the hook still requires exact-candidate evidence.
        name: 'REQ-GUARD-03 review selection explains lightweight default and risk-based opt-in without a question',
        fn: async () => {
            // Given: a blocked, unreviewed commit candidate
            const descriptor = { repository: 'C:\\fixture\\repo', cwd: 'C:\\fixture\\repo', mode: 'staged', literalPaths: [] };
            // When: the hook renders its block message
            const message = gate().blockMessage(descriptor.repository,
                { status: 'CHANGED', fingerprint: 'a'.repeat(64) }, descriptor, 'no matching receipt');
            // Then: no choice question; default and fallback remain explicit and configurable.
            assert.doesNotMatch(message, /\(Recommended\)/i, 'a fixed (Recommended) marker must not return to any hook option');
            assert.doesNotMatch(message, /option 1 is recommended|below in order/i, 'the hook must not rank the options');
            assert.doesNotMatch(message, /Ask the user to choose|ASK them first/i, 'the hook must not restore the test/review question');
            assert.match(message, /\/commit-review --fix-loop\s+# default lightweight: every commit tier/);
            assert.match(message, /\/why-review --fix-loop\s+# risk-based mode or PR scope: medium risk/);
            assert.match(message, /\/changes-review --fix-loop\s+# risk-based mode or PR scope: high risk/);
            assert.match(message, /resolve commit.reviewMode with .claude\/scripts\/lib\/commit-review-policy.cjs/);
            assert.match(message, /Lightweight mode never selects an automatic skip/);
            assert.match(message, /Do not ask the user: classify the actual candidate risk[\s\S]{0,40}higher on a tie/,
                'hook must point to the skill rule and the tie-break');
            assert.match(message, /at most 2 review rounds\. MEDIUM\+ findings still open at the cap: stop and report, no commit, no skip/);
            assert.match(message, /\/workflow-review-changes --fix-loop also issues a valid receipt when the user asks for the full workflow/);

            // The coordinator delegates selection; executable policy tests own tier behavior.
            const commitSkill = fs.readFileSync(path.resolve(__dirname, '../../../skills/commit/SKILL.md'), 'utf8');
            assert.match(commitSkill, /commit-review-policy\.cjs --operation=commit/);
            assert.match(commitSkill, /at most two rounds/);
            // Then: the skill decides without a test/review question
            assert.doesNotMatch(commitSkill, /\(Recommended\)|Skip stays user-only|Ask initially/i,
                'the commit skill must not restore the test/review question');
            // Then: no other place in the skill restates a fixed recommendation order
            assert.doesNotMatch(commitSkill, /`\/workflow-review-changes --fix-loop` \(recommended\)|> 1\. `Run \/workflow-review-changes --fix-loop` \(Recommended\)|in that order;/i,
                'the fixed workflow-first recommendation must not return');
        }
    },
    {
        name: 'REQ-GUARD-03 an unreviewed candidate is blocked until its tier review or a recorded skip covers it',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'changed\n');
            git(fx.repoA, ['add', 'file.txt']);

            withStore(fx.store, () => {
                const input = {
                    tool_name: 'Bash',
                    tool_input: { command: 'git commit -m "x"', cwd: fx.repoA }
                };
                const blocked = gate().evaluate(input);
                assert.equal(blocked.code, 2, 'no receipt and no skip must block');
                assert.match(blocked.stderr, /review fix-loop/i);
                assert.match(blocked.stderr, /Do not ask the user: classify the actual candidate risk/i);
                assert.match(blocked.stderr, /Never skip a Medium or High candidate, or a failed review/);

                const hookOptions = [
                    '1. /commit-review --fix-loop',
                    '2. /why-review --fix-loop',
                    '3. /changes-review --fix-loop',
                    '4. Skip — only in risk-based mode for a Low-risk candidate'
                ].map(option => blocked.stderr.indexOf(option));
                assert.ok(hookOptions.every(index => index >= 0), 'hook must show both tier reviews and the Low-risk skip');
                assert.ok(hookOptions[3] > Math.max(...hookOptions.slice(0, 3)), 'Skip must follow every review option');

                issueCandidate(receipt(), fx.store, snapshot(receipt(), fx.repoA), 'skip', {
                    reason: 'auto: low risk — docs only'
                });
                assert.equal(gate().evaluate(input), undefined,
                    'the exact candidate is allowed after a descriptor-bound recorded skip');
            });
        })
    },
    {
        name: 'lightweight commit review clears only the exact staged candidate and refuses stale issuance',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            const file = path.join(fx.repoA, 'file.txt');
            fs.writeFileSync(file, 'review candidate\n');
            git(fx.repoA, ['add', 'file.txt']);
            fs.writeFileSync(path.join(fx.repoA, 'unrelated.txt'), 'not in this commit\n');
            const api = receipt();
            const reviewed = snapshot(api, fx.repoA, 'staged');
            const indexBefore = fs.readFileSync(path.join(fx.repoA, '.git', 'index'));
            withStore(fx.store, () => {
                const input = { tool_name: 'Bash', tool_input: { command: 'git commit -m "candidate"', cwd: fx.repoA } };
                assert.equal(gate().evaluate(input).code, 2);
                issueCandidate(api, fx.store, reviewed, 'commit-review');
                assert.equal(api.matchReviewReceipt({ repository: fx.repoA, storeDir: fx.store, snapshot: reviewed }), 'commit-review');
                assert.equal(gate().evaluate(input), undefined, 'fresh full-candidate review clears the gate');
                assert.deepEqual(fs.readFileSync(path.join(fx.repoA, '.git', 'index')), indexBefore, 'review evidence never stages files');
                fs.writeFileSync(file, 'later unstaged content\n');
                assert.equal(gate().evaluate(input), undefined, 'unstaged edits do not change a staged commit');
                git(fx.repoA, ['add', 'file.txt']);
                assert.equal(gate().evaluate(input).code, 2, 'changed commit content needs a fresh review');
                assert.throws(() => issueCandidate(api, fx.store, reviewed, 'commit-review'), /reviewed target changed/);
                assert.throws(() => issueCandidate(api, fx.store, snapshot(api, fx.repoA, 'staged'), 'commit-review', { scope: 'subset' }), /full-changeset/);
            });
        })
    },
    {
        name: 'TC-FIT-011 worktree review binds repository, storage, base and exact candidate; identical staging preserves it',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            const api = receipt();
            const indexPath = path.join(fx.repoA, '.git', 'index');
            const indexBefore = fs.readFileSync(indexPath);
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'candidate-c\n');

            const snapshot = api.captureReviewTarget({ repository: fx.repoA, cwd: fx.repoA, target: 'worktree' });
            assert.equal(snapshot.status, 'CHANGED');
            assert.equal(snapshot.repository, api.canonicalDirectory(fx.repoA));
            assert.ok(snapshot.storageIdentity, 'candidate includes Git storage identity');
            assert.ok(snapshot.baseTree, 'candidate pins the base tree');
            assert.ok(snapshot.candidateTree, 'candidate pins the exact content tree');
            assert.match(snapshot.fingerprint, /^[a-f0-9]{64}$/);
            assert.deepEqual(fs.readFileSync(indexPath), indexBefore, 'capture preserves real index bytes');

            withStore(fx.store, () => api.issueReceipt({
                repository: fx.repoA,
                snapshot,
                scope: 'full-changeset',
                kind: 'changes-review'
            }));
            git(fx.repoA, ['add', 'file.txt']);
            const staged = api.captureReviewTarget({ repository: fx.repoA, cwd: fx.repoA, target: 'staged' });
            assert.equal(staged.status, 'CHANGED');
            assert.equal(staged.candidateTree, snapshot.candidateTree, 'same staged content has the same tree');
            assert.equal(staged.fingerprint, snapshot.fingerprint, 'capture target does not change candidate identity');

            withStore(fx.store, () => {
                const result = gate().evaluate({ tool_name: 'Bash', tool_input: { command: 'git commit -m x', cwd: fx.repoA } });
                assert.equal(result, undefined, 'the matching staged tree uses the worktree receipt');
            });

            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'candidate-b\n');
            git(fx.repoA, ['add', 'file.txt']);
            const other = api.captureReviewTarget({ repository: fx.repoA, cwd: fx.repoA, target: 'staged' });
            assert.notEqual(other.candidateTree, snapshot.candidateTree);
            assert.notEqual(other.fingerprint, snapshot.fingerprint);
            withStore(fx.store, () => {
                const result = gate().evaluate({ tool_name: 'Bash', tool_input: { command: 'git commit -m x', cwd: fx.repoA } });
                assert.equal(result.code, 2, 'a receipt for candidate C cannot authorize staged candidate B');
            });
        })
    },
    {
        name: 'TC-FIT-011 staged, -a and literal-path candidates preserve index bytes and honor deletions',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            const api = receipt();
            const indexPath = path.join(fx.repoA, '.git', 'index');
            const indexBefore = fs.readFileSync(indexPath);
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'tracked-change\n');
            fs.writeFileSync(path.join(fx.repoA, 'untracked.txt'), 'untracked\n');

            const staged = snapshot(api, fx.repoA, 'staged');
            const all = snapshot(api, fx.repoA, 'commit-descriptor', { mode: 'all', literalPaths: [] });
            const literal = snapshot(api, fx.repoA, 'commit-descriptor', { mode: 'literal-paths', literalPaths: ['file.txt'] });
            const worktree = snapshot(api, fx.repoA, 'worktree');
            assert.equal(staged.status, 'CLEAN', 'default-index mode excludes unstaged files');
            assert.equal(all.status, 'CHANGED', '-a includes tracked modifications');
            assert.equal(literal.candidateTree, all.candidateTree, 'literal file candidate excludes unrelated untracked content');
            assert.notEqual(worktree.candidateTree, all.candidateTree, 'worktree target also includes untracked files');
            assert.equal(all.descriptor.mode, 'all');
            assert.equal(literal.descriptor.literalPaths[0], 'file.txt');
            assert.deepEqual(fs.readFileSync(indexPath), indexBefore, 'all candidate captures leave the real index byte-identical');

            fs.unlinkSync(path.join(fx.repoA, 'file.txt'));
            const deletion = snapshot(api, fx.repoA, 'commit-descriptor', { mode: 'all', literalPaths: [] });
            const literalDeletion = snapshot(api, fx.repoA, 'commit-descriptor', { mode: 'literal-paths', literalPaths: ['file.txt'] });
            assert.equal(deletion.status, 'CHANGED', '-a includes tracked deletions');
            assert.equal(literalDeletion.candidateTree, deletion.candidateTree, 'literal path mode includes the exact tracked deletion');
            assert.deepEqual(fs.readFileSync(indexPath), indexBefore, 'deletion evaluation also preserves the real index');
        })
    },
    {
        name: 'TC-FIT-011 a matching candidate tree with a changed base tree does not reuse the old receipt',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            const api = receipt();
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'reviewed-tree\n');
            const reviewed = snapshot(api, fx.repoA);
            issueCandidate(api, fx.store, reviewed);

            fs.writeFileSync(path.join(fx.repoA, 'extra.txt'), 'committed-base-change\n');
            git(fx.repoA, ['add', 'extra.txt']);
            git(fx.repoA, ['commit', '-q', '-m', 'advance base']);
            fs.unlinkSync(path.join(fx.repoA, 'extra.txt'));
            git(fx.repoA, ['add', '-A']);

            const current = snapshot(api, fx.repoA, 'staged');
            assert.equal(current.candidateTree, reviewed.candidateTree, 'the resulting content tree is byte-for-byte the reviewed tree');
            assert.notEqual(current.baseTree, reviewed.baseTree, 'HEAD advanced after review');
            assert.notEqual(current.fingerprint, reviewed.fingerprint, 'base tree is part of candidate identity');
            withStore(fx.store, () => {
                const blocked = gate().evaluate({ tool_name: 'Bash', tool_input: { command: 'git commit -m x', cwd: fx.repoA } });
                assert.equal(blocked.code, 2, 'same tree contents on another base are not the reviewed commit candidate');
            });
        })
    },
    {
        name: 'TC-FIT-011 issuance rechecks its original target and candidate errors fail closed',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            const api = receipt();
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'reviewed-candidate\n');
            const reviewed = snapshot(api, fx.repoA, 'worktree');
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'changed-before-issuance\n');
            assert.throws(() => issueCandidate(api, fx.store, reviewed), /target changed/,
                'issuance must not silently switch to the post-review content');

            const indexPath = path.join(fx.repoA, '.git', 'index');
            const indexBefore = fs.readFileSync(indexPath);
            const failingExec = (file, args, options) => {
                if (args[0] === 'write-tree') throw Object.assign(new Error('injected tree failure'), { code: 'INJECTED_GIT_FAILURE' });
                return execFileSync(file, args, options);
            };
            const failed = api.captureReviewTarget({ repository: fx.repoA, cwd: fx.repoA, target: 'worktree', exec: failingExec });
            assert.equal(failed.status, 'ERROR');
            assert.equal(failed.errorCode, 'INJECTED_GIT_FAILURE');
            assert.throws(() => api.computeChangeFingerprint(fx.repoA, failingExec), /injected tree failure/,
                'legacy helper does not collapse Git errors to clean');
            assert.deepEqual(fs.readFileSync(indexPath), indexBefore, 'success and error paths preserve the real index');
            assert.deepEqual(fs.readdirSync(path.join(fx.repoA, 'tmp')), [], 'throwaway state is cleaned from repository tmp');

            const blocked = gate().evaluate(
                { tool_name: 'Bash', tool_input: { command: 'git commit -m x', cwd: fx.repoA } },
                { captureReviewTarget: () => failed }
            );
            assert.equal(blocked.code, 2, 'a candidate computation error is a block, never clean or skip');
            assert.match(blocked.stderr, /ERROR \(INJECTED_GIT_FAILURE\)/);
        })
    },
    {
        name: 'TC-FIT-011 only a confirmed unborn HEAD is clean-compatible',
        skip: !GIT,
        fn: async () => fixture(fx => {
            git(fx.repoA, ['init', '-q']);
            git(fx.repoA, ['config', 'user.email', 'test@example.com']);
            git(fx.repoA, ['config', 'user.name', 'Test']);
            fs.writeFileSync(path.join(fx.repoA, '.gitignore'), '/tmp/\n/temp/\n');
            const api = receipt();
            assert.equal(snapshot(api, fx.repoA, 'staged').status, 'CLEAN', 'empty unborn branch has a valid empty-tree base');
            fs.writeFileSync(path.join(fx.repoA, 'initial.txt'), 'first content\n');
            const initial = snapshot(api, fx.repoA, 'worktree');
            assert.equal(initial.status, 'CHANGED');
            assert.ok([40, 64].includes(initial.baseTree.length), 'empty tree ID follows the repository object format');

            fs.writeFileSync(path.join(fx.repoA, '.git', 'HEAD'), 'unresolvable head state\n');
            const invalid = snapshot(api, fx.repoA, 'worktree');
            assert.equal(invalid.status, 'ERROR', 'an unresolvable HEAD is not treated as unborn or clean');
        })
    },
    {
        name: 'TC-FIT-011 gate matches -a and literal-path descriptors and rejects unsupported contexts',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            const api = receipt();
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'all-candidate\n');
            const all = snapshot(api, fx.repoA, 'commit-descriptor', { mode: 'all', literalPaths: [] });
            issueCandidate(api, fx.store, all);
            withStore(fx.store, () => {
                for (const command of ['git commit -a -m x', 'git commit -am x', 'git commit --all -m x']) {
                    const allCommit = gate().evaluate({ tool_name: 'Bash', tool_input: { command, cwd: fx.repoA } });
                    assert.equal(allCommit, undefined, `${command} matches the exact all-tracked candidate`);
                }
            });

            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'literal-candidate\n');
            fs.writeFileSync(path.join(fx.repoA, 'other.txt'), 'not in literal candidate\n');
            const literal = snapshot(api, fx.repoA, 'commit-descriptor', { mode: 'literal-paths', literalPaths: ['file.txt'] });
            issueCandidate(api, fx.store, literal);
            withStore(fx.store, () => {
                const literalCommit = gate().evaluate({ tool_name: 'Bash', tool_input: { command: 'git commit -- file.txt', cwd: fx.repoA } });
                assert.equal(literalCommit, undefined, 'literal receipt matches only its exact path candidate');
                for (const command of [
                    "git commit -- '*.txt'",
                    'git commit -- :/file.txt',
                    'git commit --only -m x',
                    'git commit --pathspec-from-file=paths.txt',
                    'git commit --pathspec-file-nul --pathspec-from-file=paths.txt',
                    'git -c core.filemode=false commit -m x',
                    'git --git-dir=.git commit -m x',
                    'git --work-tree=. commit -m x',
                    'git --config-env=core.filemode=ORIENT_TEST_GIT_CONFIG commit -m x',
                    'git --literal-pathspecs commit -- file.txt',
                    'GIT_INDEX_FILE=alternate.index git commit -m x',
                    'cd subdir && git commit -m x',
                    'git commit -a -- file.txt',
                    'bash -c "git commit $MESSAGE"'
                ]) {
                    const result = gate().evaluate({ tool_name: 'Bash', tool_input: { command, cwd: fx.repoA } });
                    assert.equal(result.code, 2, `${command} must fail closed`);
                }

                for (const [name, value] of [
                    ['GIT_CONFIG_GLOBAL', path.join(fx.repoA, 'alternate-git-config')],
                    ['GIT_LITERAL_PATHSPECS', '1']
                ]) {
                    const previous = process.env[name];
                    try {
                        process.env[name] = value;
                        const result = gate().evaluate({ tool_name: 'Bash', tool_input: { command: 'git commit -m x', cwd: fx.repoA } });
                        assert.equal(result.code, 2, `${name} ambient context must fail closed`);
                    } finally {
                        if (previous === undefined) delete process.env[name];
                        else process.env[name] = previous;
                    }
                }
            });
        })
    },
    {
        name: 'TC-FIT-011 host-injected content-neutral GIT_CONFIG pairs are accepted; any other injected key fails closed',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            const api = receipt();
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'changed\n');
            const withEnv = (vars, fn) => {
                const prev = {};
                for (const k of Object.keys(vars)) { prev[k] = process.env[k]; process.env[k] = vars[k]; }
                try { return fn(); } finally {
                    for (const k of Object.keys(vars)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; }
                }
            };
            const container = {
                GIT_CONFIG_COUNT: '3',
                GIT_CONFIG_KEY_0: 'credential.interactive', GIT_CONFIG_VALUE_0: 'false',
                GIT_CONFIG_KEY_1: 'url.https://github.com/.insteadOf', GIT_CONFIG_VALUE_1: 'git@github.com:',
                GIT_CONFIG_KEY_2: 'url.https://github.com/.insteadOf', GIT_CONFIG_VALUE_2: 'ssh://git@github.com/'
            };
            assert.equal(withEnv(container, () => snapshot(api, fx.repoA)).status, 'CHANGED',
                'the cloud container proxy config must not block candidate capture');
            for (const [label, bad] of [
                ['core.worktree key', { ...container, GIT_CONFIG_KEY_1: 'core.worktree' }],
                ['count/pair mismatch', { ...container, GIT_CONFIG_COUNT: '2' }],
                ['core.hooksPath only', { GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'core.hooksPath', GIT_CONFIG_VALUE_0: '/tmp/x' }],
                ['GIT_CONFIG_PARAMETERS alongside', { ...container, GIT_CONFIG_PARAMETERS: "'core.worktree=/x'" }]
            ]) {
                const s = withEnv(bad, () => snapshot(api, fx.repoA));
                assert.equal(s.status, 'ERROR', `${label} must fail closed`);
                assert.equal(s.errorCode, 'UNSUPPORTED_GIT_ENVIRONMENT', `${label} error code`);
            }
        })
    },
    {
        name: 'TC-FIT-011 isolated source mutants are killed for candidate loss, ERROR collapse and descriptor deduplication',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            const tempHooks = path.join(fx.repoA, 'tmp');
            fs.mkdirSync(tempHooks, { recursive: true });
            const receiptSource = fs.readFileSync(LIB, 'utf8');
            const contentMutant = receiptSource
                .replace('return sha256(JSON.stringify({ repository, storageIdentity, baseTree, candidateTree }));',
                    'return sha256(JSON.stringify({ repository, storageIdentity, baseTree }));')
                .replace('record.candidateTree === ctx.candidateTree &&', '');
            assert.notEqual(contentMutant, receiptSource, 'candidate-loss mutant applies to an isolated source copy');
            const contentMutantPath = path.join(tempHooks, 'mutant-receipt-candidate.cjs');
            fs.writeFileSync(contentMutantPath, contentMutant);
            delete require.cache[require.resolve(contentMutantPath)];
            const weakenedReceipt = require(contentMutantPath);
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'reviewed-content\n');
            const reviewed = snapshot(weakenedReceipt, fx.repoA);
            weakenedReceipt.issueReceipt({ repository: fx.repoA, storeDir: fx.store, snapshot: reviewed,
                scope: 'full-changeset', kind: 'changes-review' });
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'different-content\n');
            const changed = snapshot(weakenedReceipt, fx.repoA);
            const candidateMutantAccepted = weakenedReceipt.checkReceipt({ repository: fx.repoA, storeDir: fx.store,
                snapshot: changed, kind: 'changes-review' });
            assert.equal(candidateMutantAccepted, true, 'mutant demonstrates the old candidate-loss defect');
            assert.throws(() => assert.equal(candidateMutantAccepted, false), assert.AssertionError,
                'the candidate mismatch regression fails against the isolated mutant');

            const errorMutantSource = receiptSource.replace(
                'result = errorSnapshot(target, error, repository, cwd);',
                "result = { status: 'CLEAN', repository, storageIdentity: null, cwd, indexPath: null, baseTree: null, candidateTree: null, fingerprint: null, target, descriptor: null };"
            );
            assert.notEqual(errorMutantSource, receiptSource, 'ERROR-collapse mutant applies to an isolated source copy');
            const errorMutantPath = path.join(tempHooks, 'mutant-receipt-error.cjs');
            fs.writeFileSync(errorMutantPath, errorMutantSource);
            delete require.cache[require.resolve(errorMutantPath)];
            const weakenedError = require(errorMutantPath);
            const failingExec = (file, args, options) => {
                if (args[0] === 'write-tree') throw Object.assign(new Error('injected tree failure'), { code: 'INJECTED_GIT_FAILURE' });
                return execFileSync(file, args, options);
            };
            const collapsed = weakenedError.captureReviewTarget({ repository: fx.repoA, cwd: fx.repoA, target: 'worktree', exec: failingExec });
            assert.equal(collapsed.status, 'CLEAN', 'mutant demonstrates ERROR collapsing to CLEAN');
            assert.throws(() => assert.equal(collapsed.status, 'ERROR'), assert.AssertionError,
                'the candidate-error regression fails against the isolated mutant');
            const gateAfterErrorMutant = gate().evaluate(
                { tool_name: 'Bash', tool_input: { command: 'git commit -m x', cwd: fx.repoA } },
                { captureReviewTarget: () => collapsed }
            );
            assert.equal(gateAfterErrorMutant, undefined, 'an ERROR-to-CLEAN mutant would pass the gate');
            assert.throws(() => assert.equal(gateAfterErrorMutant?.code, 2), assert.AssertionError,
                'the gate error-block regression fails against the isolated mutant');

            const gateSource = fs.readFileSync(HOOK, 'utf8');
            const duplicateBranch = /if \(statementRepos\.has\(descriptor\.repository\)\) \{\s*return \{ known: false, reason: 'Multiple sequential commits to one repository require separate reviewed invocations' \};\s*\}\s*statementRepos\.add\(descriptor\.repository\);\s*descriptors\.push\(descriptor\);/;
            const dedupeMutantSource = gateSource.replace(duplicateBranch,
                'if (!statementRepos.has(descriptor.repository)) { statementRepos.add(descriptor.repository); descriptors.push(descriptor); }');
            assert.notEqual(dedupeMutantSource, gateSource, 'repository-deduplication mutant applies to an isolated source copy');
            const mutantGatePath = path.join(tempHooks, 'mutant-review-commit-gate.cjs');
            fs.writeFileSync(mutantGatePath, dedupeMutantSource);
            const statements = [
                { command: { value: 'git' }, argv: [{ value: 'git', static: true }, { value: 'commit', static: true }], assignments: [] },
                { command: { value: 'git' }, argv: [{ value: 'git', static: true }, { value: 'commit', static: true }], assignments: [] }
            ];
            const weakenedGate = loadMutantGate(mutantGatePath, fx.repoA, statements);
            const deduped = weakenedGate.resolveCommitDescriptors('git commit && git commit', fx.repoA);
            assert.equal(deduped.known, true);
            assert.equal(deduped.descriptors.length, 1, 'mutant demonstrates repository-only descriptor deduplication');
            assert.throws(() => assert.equal(deduped.known, false), assert.AssertionError,
                'the sequential-commit regression fails against the isolated mutant');
        })
    },
    {
        name: 'TC-HARNESS-GATE receipt binds exact fingerprint, repository and kind; skip is separate',
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'reviewed\n');
            const api = receipt();
            const candidate = snapshot(api, fx.repoA);
            issueCandidate(api, fx.store, candidate, 'changes-review', { now: NOW });
            const check = extra => api.checkReceipt({ repository: fx.repoA, storeDir: fx.store, snapshot: candidate, now: NOW, ...extra });
            assert.equal(check({ kind: 'changes-review' }), true);
            assert.equal(check({ kind: 'why-review' }), false, 'kind must be exact');
            assert.equal(check({ kind: 'workflow-review-changes' }), false);
            assert.equal(check({ kind: 'skip' }), false);
            assert.equal(api.matchReviewReceipt({ repository: fx.repoA, storeDir: fx.store, snapshot: candidate, now: NOW }), 'changes-review');
            assert.equal(api.matchSkipReceipt({ repository: fx.repoA, storeDir: fx.store, snapshot: candidate, now: NOW }), null);
            assert.equal(api.checkReceipt({ repository: fx.repoA, storeDir: fx.store, snapshot: { ...candidate, fingerprint: FP_B }, kind: 'changes-review', now: NOW }), false, 'fingerprint must match tree identity');
            assert.equal(api.checkReceipt({ repository: fx.repoB, storeDir: fx.store, snapshot: { ...candidate, repository: fx.repoB }, kind: 'changes-review', now: NOW }), false, 'repository must match');

            issueCandidate(api, fx.store, candidate, 'skip', { now: NOW });
            assert.equal(api.matchSkipReceipt({ repository: fx.repoA, storeDir: fx.store, snapshot: candidate, now: NOW }), 'skip');
        })
    },
    {
        name: 'TC-HARNESS-GATE receipt rejects expiry, future issue time, malformed input and over-long lifetime',
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'reviewed\n');
            const api = receipt();
            const candidate = snapshot(api, fx.repoA);
            const issued = issueCandidate(api, fx.store, candidate, 'changes-review', { now: NOW, ttlMs: 1 });
            const at = now => api.checkReceipt({ repository: fx.repoA, storeDir: fx.store, snapshot: candidate, kind: 'changes-review', now });
            assert.equal(at(NOW), true);
            assert.equal(at(NOW + 1), false, 'exact expiry boundary');
            assert.equal(at(NOW - 1), false, 'future issue time is not active');
            const repositoryStore = path.join(fx.store, fs.readdirSync(fx.store)[0]);
            const recordPath = path.join(repositoryStore, `changes-review.${issued.fingerprint}.json`);
            const oldRecord = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
            oldRecord.schemaVersion = 1;
            fs.writeFileSync(recordPath, JSON.stringify(oldRecord));
            assert.equal(at(NOW), false, 'schema-1 receipts are versioned out');

            for (const bad of [
                { kind: 'nope' },
                { fingerprint: 'zz' },
                { ttlMs: 0 },
                { ttlMs: api.MAX_LIFETIME_MS + 1 },
                { repository: 'relative/path' }
            ]) {
                assert.throws(() => api.issueReceipt({ repository: fx.repoA, storeDir: fx.store, snapshot: candidate,
                    scope: 'full-changeset', kind: 'changes-review', now: NOW, ...bad }), JSON.stringify(bad));
            }
        })
    },
    {
        name: 'TC-HARNESS-GATE fingerprint tracks content and is stable across staging',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            const api = receipt();
            assert.equal(api.computeChangeFingerprint(fx.repoA), null, 'clean tree has nothing to review');
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'changed\n');
            const first = api.computeChangeFingerprint(fx.repoA);
            assert.ok(first && /^[a-f0-9]{64}$/.test(first));
            git(fx.repoA, ['add', 'file.txt']);
            assert.equal(api.computeChangeFingerprint(fx.repoA), first, 'staging must not invalidate a receipt');
            fs.writeFileSync(path.join(fx.repoA, 'new.txt'), 'new\n');
            const withNew = api.computeChangeFingerprint(fx.repoA);
            assert.notEqual(withNew, first, 'a new untracked file must be part of the fingerprint');
            git(fx.repoA, ['add', 'new.txt']);
            assert.equal(api.computeChangeFingerprint(fx.repoA), withNew, 'staging a new file must not invalidate a receipt');
            fs.writeFileSync(path.join(fx.repoA, 'new.txt'), 'newer\n');
            assert.notEqual(api.computeChangeFingerprint(fx.repoA), withNew, 'editing the new file must invalidate it');
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'changed again\n');
            assert.notEqual(api.computeChangeFingerprint(fx.repoA), first, 'a post-review edit must invalidate it');
        })
    },
    {
        name: 'TC-HARNESS-GATE hook blocks an unreviewed commit and allows reviewed, skip, non-commit and no-change',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'changed\n');
            git(fx.repoA, ['add', 'file.txt']);
            withStore(fx.store, () => {
                const commit = () => gate().evaluate({ tool_name: 'Bash', tool_input: { command: 'git commit -m "x"', cwd: fx.repoA } });
                assert.equal(commit().code, 2, 'unreviewed commit must block');
                assert.equal(gate().evaluate({ tool_name: 'Bash', tool_input: { command: 'bash -c "git commit -m x"', cwd: fx.repoA } }).code, 2, 'a wrapped commit must block');
                assert.equal(gate().evaluate({ tool_name: 'Bash', tool_input: { command: 'git commit -F -', cwd: fx.repoA } }).code, 2, 'stdin-message commit must block');
                assert.equal(gate().evaluate({ tool_name: 'Bash', tool_input: { command: 'git status', cwd: fx.repoA } }), undefined, 'non-commit passes');
                assert.equal(gate().evaluate({ tool_name: 'Read', tool_input: { command: 'git commit -m x' } }), undefined, 'non-Bash passes');

                issueCandidate(receipt(), fx.store, snapshot(receipt(), fx.repoA), 'changes-review');
                assert.equal(commit(), undefined, 'reviewed commit passes');

                fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'changed after review\n');
                git(fx.repoA, ['add', 'file.txt']);
                assert.equal(commit().code, 2, 'edit after review re-arms the gate');
                issueCandidate(receipt(), fx.store, snapshot(receipt(), fx.repoA), 'skip', { reason: 'user approved skip' });
                assert.equal(commit(), undefined, 'user-approved skip passes');
            });
        })
    },
    {
        // Amend and `reset --soft HEAD~1` + commit produce the same commit, so they must be gated
        // identically: one receipt over the candidate against HEAD's PARENT authorizes either path,
        // and a receipt over the candidate against HEAD (a plain commit) authorizes neither.
        name: 'REQ-GUARD-03 amend is gated like the equivalent reset --soft + commit, against HEAD\'s parent',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'second\n');
            git(fx.repoA, ['commit', '-q', '-am', 'second']);
            fs.writeFileSync(path.join(fx.repoA, 'extra.txt'), 'staged for amend\n');
            git(fx.repoA, ['add', 'extra.txt']);
            const api = receipt();
            const parentTree = git(fx.repoA, ['rev-parse', 'HEAD~1^{tree}']).trim();

            const amendCandidate = snapshot(api, fx.repoA, 'commit-descriptor', { mode: 'staged', literalPaths: [], amend: true });
            assert.equal(amendCandidate.status, 'CHANGED');
            assert.equal(amendCandidate.baseTree, parentTree, 'amend candidate is measured against HEAD\'s parent');
            assert.equal(amendCandidate.descriptor.amend, true);
            const plainCandidate = snapshot(api, fx.repoA, 'staged');
            assert.equal(plainCandidate.candidateTree, amendCandidate.candidateTree, 'same staged content');
            assert.notEqual(plainCandidate.fingerprint, amendCandidate.fingerprint, 'a different base is a different candidate');

            withStore(fx.store, () => {
                const amend = command => gate().evaluate({ tool_name: 'Bash', tool_input: { command, cwd: fx.repoA } });
                const unreviewed = amend('git commit --amend --no-edit');
                assert.equal(unreviewed.code, 2, 'an unreviewed amend must block');
                // The recovery path must lead to a receipt that CAN match: the amend descriptor.
                assert.match(unreviewed.stderr, /HEAD's parent/);
                assert.match(unreviewed.stderr, /--descriptor-json='\{[^']*"amend":true\}'/);
                assert.doesNotMatch(amend('git commit -m plain').stderr, /HEAD's parent/, 'a plain commit gets no amend guidance');
                issueCandidate(api, fx.store, plainCandidate);
                assert.equal(amend('git commit --amend --no-edit').code, 2, 'a plain-commit receipt cannot authorize an amend');
                issueCandidate(api, fx.store, amendCandidate);
                for (const command of ['git commit --amend --no-edit', 'git commit --amen --no-edit', 'git commit --am -m x']) {
                    assert.equal(amend(command), undefined, `${command} matches the reviewed amend candidate`);
                }
                assert.equal(amend('git commit --amend=x').code, 2, 'a malformed amend flag fails closed');
            });

            // The receipt must describe the commit git actually produces, and the reset path must
            // produce the identical candidate.
            git(fx.repoA, ['commit', '-q', '--amend', '--no-edit']);
            assert.equal(git(fx.repoA, ['rev-parse', 'HEAD^{tree}']).trim(), amendCandidate.candidateTree);
            assert.equal(git(fx.repoA, ['rev-parse', 'HEAD~1^{tree}']).trim(), amendCandidate.baseTree);
            git(fx.repoA, ['reset', '-q', '--soft', 'HEAD~1']);
            const resetCandidate = snapshot(api, fx.repoA, 'staged');
            assert.equal(resetCandidate.fingerprint, amendCandidate.fingerprint, 'reset --soft + commit is the same candidate');
        })
    },
    {
        name: 'REQ-GUARD-03 amend literal paths build on HEAD, root commits use the empty tree, merges fail closed',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            const api = receipt();
            const root = snapshot(api, fx.repoA, 'commit-descriptor', { mode: 'staged', literalPaths: [], amend: true });
            assert.equal(root.status, 'CHANGED', 'amending the root commit reviews its whole content');
            assert.equal(root.baseTree, git(fx.repoA, ['mktree']).trim(), 'root amend base is the empty tree');

            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'literal amend\n');
            fs.writeFileSync(path.join(fx.repoA, 'other.txt'), 'not part of the amend\n');
            const literal = snapshot(api, fx.repoA, 'commit-descriptor', { mode: 'literal-paths', literalPaths: ['file.txt'], amend: true });
            git(fx.repoA, ['commit', '-q', '--amend', '--no-edit', '--', 'file.txt']);
            assert.equal(git(fx.repoA, ['rev-parse', 'HEAD^{tree}']).trim(), literal.candidateTree,
                'literal-path amend candidate equals the tree git commits');

            git(fx.repoA, ['checkout', '-q', '-b', 'side']);
            fs.writeFileSync(path.join(fx.repoA, 'side.txt'), 'side\n');
            git(fx.repoA, ['add', 'side.txt']);
            git(fx.repoA, ['commit', '-q', '-m', 'side']);
            git(fx.repoA, ['checkout', '-q', '-']);
            git(fx.repoA, ['merge', '-q', '--no-ff', '--no-edit', 'side']);
            const merge = snapshot(api, fx.repoA, 'commit-descriptor', { mode: 'staged', literalPaths: [], amend: true });
            assert.equal(merge.status, 'ERROR');
            assert.equal(merge.errorCode, 'UNSUPPORTED_AMEND_MERGE');
        })
    },
    {
        // Invariant: amend is read from the SAME parse that assigns option values. The dangerous
        // candidate is a staged revert of HEAD: measured as an amend (against HEAD's parent) it is
        // CLEAN and needs no receipt, so a plain commit misread as an amend would skip review.
        name: 'REQ-GUARD-03 amend is detected only in option position, never inside an option value',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'second\n');
            git(fx.repoA, ['commit', '-q', '-am', 'second']);
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'base\n');
            git(fx.repoA, ['add', 'file.txt']);
            assert.equal(git(fx.repoA, ['write-tree']).trim(), git(fx.repoA, ['rev-parse', 'HEAD~1^{tree}']).trim(),
                'fixture: the staged tree reverts HEAD');
            withStore(fx.store, () => {
                const run = command => gate().evaluate({ tool_name: 'Bash', tool_input: { command, cwd: fx.repoA } });
                for (const command of ['git commit -am --amend', 'git commit -sm --amend', 'git commit -m --amend',
                    'git commit --message --amend', 'git commit --author --amend -m x']) {
                    assert.equal(run(command)?.code, 2, `${command} is a plain unreviewed commit and must block`);
                }
                for (const command of ['git commit --amend --no-edit', 'git commit --amen --no-edit', 'git commit --ame --no-edit',
                    'git commit --am --no-edit', 'git commit --no-edit --am', 'git commit -m x --amend']) {
                    assert.equal(run(command), undefined, `${command} is an amend whose candidate equals HEAD's parent`);
                }
            });
        })
    },
    {
        name: 'REQ-GUARD-03 amend descriptor edges: unborn HEAD and non-boolean amend fail closed, -a amend matches git',
        skip: !GIT,
        fn: async () => fixture(fx => {
            const api = receipt();
            git(fx.repoA, ['init', '-q']);
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'unborn\n');
            git(fx.repoA, ['add', 'file.txt']);
            const unborn = snapshot(api, fx.repoA, 'commit-descriptor', { mode: 'staged', literalPaths: [], amend: true });
            assert.equal(unborn.status, 'ERROR');
            assert.equal(unborn.errorCode, 'AMEND_WITHOUT_HEAD');

            makeRepo(fx.repoB);
            const invalid = snapshot(api, fx.repoB, 'commit-descriptor', { mode: 'staged', literalPaths: [], amend: 'yes' });
            assert.equal(invalid.status, 'ERROR');
            assert.equal(invalid.errorCode, 'INVALID_DESCRIPTOR');

            fs.writeFileSync(path.join(fx.repoB, 'file.txt'), 'second\n');
            git(fx.repoB, ['commit', '-q', '-am', 'second']);
            fs.writeFileSync(path.join(fx.repoB, 'file.txt'), 'unstaged tracked edit\n');
            const all = snapshot(api, fx.repoB, 'commit-descriptor', { mode: 'all', literalPaths: [], amend: true });
            assert.equal(all.baseTree, git(fx.repoB, ['rev-parse', 'HEAD~1^{tree}']).trim());
            git(fx.repoB, ['commit', '-q', '-a', '--amend', '--no-edit']);
            assert.equal(git(fx.repoB, ['rev-parse', 'HEAD^{tree}']).trim(), all.candidateTree,
                '-a amend candidate equals the tree git commits');
        })
    },
    {
        name: 'TC-HARNESS-GATE hook lets a no-change commit through',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            withStore(fx.store, () => {
                assert.equal(gate().evaluate({ tool_name: 'Bash', tool_input: { command: 'git commit --allow-empty -m "x"', cwd: fx.repoA } }), undefined);
            });
        })
    },
    {
        name: 'TC-HARNESS-GATE a compound commit requires a receipt for EVERY target repository',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            makeRepo(fx.repoB);
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'a-change\n');
            fs.writeFileSync(path.join(fx.repoB, 'file.txt'), 'b-change\n');
            git(fx.repoA, ['add', 'file.txt']);
            git(fx.repoB, ['add', 'file.txt']);
            withStore(fx.store, () => {
                const compound = `git -C "${fx.repoA}" commit -m a && git -C "${fx.repoB}" commit -m b`;
                const run = () => gate().evaluate({ tool_name: 'Bash', tool_input: { command: compound, cwd: fx.repoA } });
                assert.equal(run().code, 2, 'no receipts must block');
                issueCandidate(receipt(), fx.store, snapshot(receipt(), fx.repoA), 'changes-review');
                assert.equal(run().code, 2, 'a receipt for only the first repository must still block');
                issueCandidate(receipt(), fx.store, snapshot(receipt(), fx.repoB), 'changes-review');
                assert.equal(run(), undefined, 'receipts for both repositories pass');
                const repeated = gate().evaluate({ tool_name: 'Bash', tool_input: {
                    command: 'git commit -m first && git commit -m second', cwd: fx.repoA
                } });
                assert.equal(repeated.code, 2, 'same-repository sequential commits need separate invocations');
                assert.match(repeated.stderr, /separate reviewed invocations/);
            });
        })
    },
    {
        name: 'TC-HARNESS-GATE CLI issues, checks, skips and clears against an isolated store',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'changed\n');
            const call = (args) => spawnSync(process.execPath, [LIB, ...args], {
                cwd: fx.repoA,
                encoding: 'utf8',
                windowsHide: true,
                env: { ...process.env, CK_REVIEW_RECEIPT_STORE: fx.store }
            });
            const captured = call(['snapshot', '--target=worktree']);
            assert.equal(captured.status, 0, captured.stderr);
            const snapshotJson = captured.stdout.trim();
            const issued = call(['issue', '--kind=changes-review', '--scope=full-changeset', `--snapshot-json=${snapshotJson}`]);
            assert.equal(issued.status, 0, issued.stderr);
            assert.match(JSON.parse(issued.stdout).fingerprint, /^[a-f0-9]{64}$/);

            const checked = call(['check']);
            assert.equal(checked.status, 0, checked.stderr);
            const state = JSON.parse(checked.stdout);
            assert.equal(state.status, 'CHANGED');
            assert.equal(state.review, 'changes-review');
            assert.equal(state.skip, null);

            assert.equal(call(['skip', '--reason=user approved skip']).status, 0);
            assert.equal(JSON.parse(call(['check']).stdout).skip, 'skip');

            assert.equal(call(['clear']).status, 0);
            const cleared = JSON.parse(call(['check']).stdout);
            assert.equal(cleared.review, null);
            assert.equal(cleared.skip, null);
        })
    }
];

module.exports = { name: 'review-commit-gate', tests };
