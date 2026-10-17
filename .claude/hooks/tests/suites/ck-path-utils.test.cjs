'use strict';

/**
 * ck-path-utils — the canonical path-containment owners.
 *
 * Technical contract (no business Feature Spec governs this library):
 *   - `isAbsolutePathWithin(root, candidate)` is the ONE containment predicate for resolved
 *     filesystem paths behind traversal and symlink-escape guards. A candidate is inside only on
 *     a segment boundary; a different drive, a UNC share, a prefix-sharing sibling and a `..`
 *     result are outside; win32 folds case, POSIX does not. Semantics are pinned per platform
 *     through the injectable `pathApi`, so both hosts' rules are proven on every host.
 *   - Its adopters bind the shared export instead of carrying a private copy, so the security
 *     rule cannot drift between guards.
 *   - `escapesRepoRoot` treats a Windows drive-relative value (`C:foo`) as leaving the repo.
 */

const fs = require('fs');
const path = require('path');
const { assertEqual, assertTrue } = require('../lib/assertions.cjs');

const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const pathUtils = require(path.join(REPO, '.claude', 'hooks', 'lib', 'ck-path-utils.cjs'));
const { isAbsolutePathWithin, escapesRepoRoot } = pathUtils;

function expectCases(label, pathApi, cases) {
    for (const [root, candidate, expected] of cases) {
        assertEqual(
            isAbsolutePathWithin(root, candidate, pathApi),
            expected,
            `${label}: isAbsolutePathWithin(${JSON.stringify(root)}, ${JSON.stringify(candidate)})`
        );
    }
}

const tests = [
    {
        name: '[ck-path-utils] TC-CKPU-001 win32 containment is segment-bounded, case-folded and drive-aware',
        fn: () => {
            // Given: win32 path semantics and a repository root on drive C.
            // When: candidates inside, beside, above and on other volumes are tested.
            // Then: only the root and its descendants are inside, whatever their letter case.
            expectCases('win32', path.win32, [
                ['C:\\repo', 'C:\\repo', true],
                ['C:\\repo', 'C:\\repo\\docs\\x.md', true],
                ['C:\\repo\\', 'C:\\repo\\docs', true],
                ['C:\\repo', 'c:\\REPO\\Docs\\x.md', true],
                ['C:\\repo', 'C:\\repo\\..x\\file.md', true],
                ['C:\\repo', 'C:\\repo\\docs\\..\\..\\outside', false],
                ['C:\\repo', 'C:\\repo-sibling\\x.md', false],
                ['C:\\repo', 'C:\\', false],
                ['C:\\repo', 'D:\\repo\\x.md', false],
                ['C:\\repo', '\\\\server\\share\\repo\\x.md', false]
            ]);
        }
    },
    {
        name: '[ck-path-utils] TC-CKPU-002 POSIX containment is segment-bounded and case-sensitive',
        fn: () => {
            // Given: POSIX path semantics and a repository root.
            // When: candidates inside, beside, above and differing only in case are tested.
            // Then: only the root and its descendants are inside; a case variant is a different directory.
            expectCases('posix', path.posix, [
                ['/srv/repo', '/srv/repo', true],
                ['/srv/repo/', '/srv/repo/docs/x.md', true],
                ['/srv/repo', '/srv/repo/..x/file.md', true],
                ['/srv/repo', '/srv/repo/a/../../etc/passwd', false],
                ['/srv/repo', '/srv/repository/x.md', false],
                ['/srv/repo', '/srv', false],
                ['/srv/repo', '/SRV/REPO/x.md', false]
            ]);
        }
    },
    {
        name: '[ck-path-utils] TC-CKPU-003 invalid input is never inside',
        fn: () => {
            // Given: missing, non-string and NUL-bearing inputs. When: containment is asked.
            // Then: the guard fails closed instead of resolving an empty side against the cwd.
            const root = path.resolve(REPO);
            for (const [r, c] of [['', root], [root, ''], [undefined, root], [root, null], [root, 42], [root, `${root}${path.sep}a\0b`]]) {
                assertEqual(isAbsolutePathWithin(r, c), false, `invalid input must not be contained: ${JSON.stringify([r, c])}`);
            }
        }
    },
    {
        name: '[ck-path-utils] TC-CKPU-004 containment adopters bind the shared predicate instead of a private copy',
        fn: () => {
            // Given: the guards that check resolved-path containment for traversal or symlink escape.
            const adopters = [
                ['.claude/hooks/lib/project-reference-registry.cjs', /require\('\.\/ck-path-utils\.cjs'\)/],
                ['.claude/scripts/lib/workflow-baseline.cjs', /require\("\.\.\/\.\.\/hooks\/lib\/ck-path-utils\.cjs"\)/],
                ['.claude/scripts/doc-impact-map.cjs', /pathUtils && pathUtils\.isAbsolutePathWithin/]
            ];
            for (const [relativePath, bindingPattern] of adopters) {
                // When: each guard's source is read.
                const source = fs.readFileSync(path.join(REPO, ...relativePath.split('/')), 'utf8');
                // Then: it binds the canonical export and declares no standalone containment function.
                assertTrue(bindingPattern.test(source), `${relativePath} must bind ck-path-utils' isAbsolutePathWithin`);
                assertTrue(source.includes('isAbsolutePathWithin'), `${relativePath} must reference isAbsolutePathWithin`);
                assertTrue(
                    !/^function (isPathWithin|isWithin|isAbsolutePathWithin)\s*\(/m.test(source),
                    `${relativePath} must not declare a private containment function`
                );
            }
        }
    },
    {
        name: '[ck-path-utils] TC-CKPU-005 escapesRepoRoot treats a drive-relative value as leaving the repo',
        fn: () => {
            // Given: configured root values in drive-relative, drive-absolute and repo-relative forms.
            // When: the repo-root escape guard classifies them.
            // Then: any leading drive letter + colon escapes; a later colon inside a segment does not.
            for (const [value, expected] of [
                ['C:foo', true],
                ['c:foo/bar', true],
                ['C:', true],
                ['C:\\abs', true],
                ['C:/abs', true],
                ['docs/c:notes', false],
                ['docs/specs', false]
            ]) {
                assertEqual(escapesRepoRoot(value), expected, `escapesRepoRoot(${JSON.stringify(value)})`);
            }
        }
    }
];

module.exports = { name: 'ck-path-utils', tests };
