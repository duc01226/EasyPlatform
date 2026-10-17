'use strict';

// Technical contract: tsconfig scope selects importers; baseUrl selects targets.
// Python argv vectors and pathlib cover native Windows and POSIX separators.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { resolvePythonCommand } = require('../../hooks/tests/lib/python-command.cjs');

test('tsconfig aliases resolve outside baseUrl, keep workspace scope and survive worker snapshots', () => {
    const repo = path.resolve(__dirname, '../../..');
    const tempRoot = path.join(repo, 'tmp');
    fs.mkdirSync(tempRoot, { recursive: true });
    const root = fs.realpathSync.native(fs.mkdtempSync(path.join(tempRoot, 'module-resolver-')));
    try {
        const write = (name, content) => {
            const target = path.join(root, name);
            fs.mkdirSync(path.dirname(target), { recursive: true });
            fs.writeFileSync(target, content);
        };
        write('package.json', JSON.stringify({ workspaces: ['packages/*'] }));
        write('tsconfig.json', JSON.stringify({ compilerOptions: { baseUrl: 'src', paths: { '@app/*': ['*'] } } }));
        write('src/x.ts', 'export const x = 1;\n');
        write('tests/root.ts', "import { x } from '@app/x';\n");
        write('packages/member/package.json', JSON.stringify({ name: 'member' }));
        write('packages/member/tsconfig.json', JSON.stringify({ compilerOptions: { baseUrl: 'src', paths: { '@member/*': ['*'] } } }));
        write('packages/member/src/x.ts', 'export const x = 2;\n');
        write('packages/member/tests/test.ts', "import { x } from '@member/x';\n");
        const python = resolvePythonCommand({ cwd: repo, minMinor: 10 });
        const script = `
import json, sys
from pathlib import Path
sys.path.insert(0, sys.argv[1])
from code_graph.resolver import ModuleResolver
root = Path(sys.argv[2])
resolver = ModuleResolver.from_config(root, {})
worker = ModuleResolver.from_snapshot(resolver.to_config())
for current in (resolver, worker):
    assert current.resolve('@app/x', str(root / 'tests/root.ts'), 'typescript') == str((root / 'src/x.ts').resolve())
    assert current.resolve('@member/x', str(root / 'packages/member/tests/test.ts'), 'typescript') == str((root / 'packages/member/src/x.ts').resolve())
    assert current.resolve('@member/x', str(root / 'tests/root.ts'), 'typescript') is None
explicit = ModuleResolver.from_config(root, {'graphSettings': {'pathAliases': {'src': {'@explicit/*': ['*']}}}})
assert explicit.resolve('@explicit/x', str(root / 'src/caller.ts'), 'typescript') == str((root / 'src/x.ts').resolve())
assert explicit.resolve('@explicit/x', str(root / 'tests/root.ts'), 'typescript') is None
assert resolver.resolve('../src/x', str(root / 'tests/root.ts'), 'typescript') == str((root / 'src/x.ts').resolve())
print('root, member, nonmember, explicit, relative and worker contracts passed')
`;
        const result = spawnSync(python.command, [...python.baseArgs, '-c', script, path.join(repo, '.claude/scripts'), root], {
            cwd: repo, encoding: 'utf8', timeout: 30000, windowsHide: true,
            env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }
        });
        assert.ifError(result.error);
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.match(result.stdout, /worker contracts passed/);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});
