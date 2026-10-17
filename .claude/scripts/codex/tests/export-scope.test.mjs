import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

test('export keeps tracked scope by default and requires explicit untracked inclusion', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'export-scope-'));
    try {
        const source = path.join(tmp, 'source');
        const scripts = path.join(source, '.claude/scripts');
        await fs.mkdir(scripts, { recursive: true });
        const exporter = path.join(scripts, 'export-claude.mjs');
        await fs.copyFile(path.join(repoRoot, '.claude/scripts/export-claude.mjs'), exporter);
        const git = (...args) => {
            const result = spawnSync('git', args, { cwd: source, encoding: 'utf8' });
            assert.equal(result.status, 0, result.stderr);
        };
        git('init', '--quiet');
        await fs.writeFile(path.join(source, '.gitignore'), '.claude/ignored.txt\n');
        await fs.writeFile(path.join(source, '.claude/tracked.txt'), 'tracked');
        git('add', '--', '.claude/tracked.txt'); // Isolated fixture index, never the project index.
        await fs.writeFile(path.join(source, '.claude/untracked.txt'), 'untracked');
        await fs.writeFile(path.join(source, '.claude/ignored.txt'), 'ignored');
        for (const include of [false, true]) {
            const target = path.join(tmp, include ? 'opt-in' : 'default');
            const result = spawnSync(process.execPath, [exporter, target, ...(include ? ['--include-untracked'] : [])], { encoding: 'utf8' });
            assert.equal(result.status, 0, result.stderr);
            assert.equal(await fs.readFile(path.join(target, '.claude/tracked.txt'), 'utf8'), 'tracked');
            assert.equal(await fs.access(path.join(target, '.claude/untracked.txt')).then(() => true, () => false), include);
            await assert.rejects(fs.access(path.join(target, '.claude/ignored.txt')));
        }
        // A non-Git bundle cannot silently widen the default tracked-only promise.
        const standalone = path.join(tmp, 'standalone/.claude/scripts');
        await fs.mkdir(standalone, { recursive: true });
        const standaloneExporter = path.join(standalone, 'export-claude.mjs');
        await fs.copyFile(exporter, standaloneExporter);
        const target = path.join(tmp, 'no-git');
        const rejected = spawnSync(process.execPath, [standaloneExporter, target], { encoding: 'utf8' });
        assert.equal(rejected.status, 1);
        await assert.rejects(fs.access(target));
        const accepted = spawnSync(process.execPath, [standaloneExporter, target, '--include-untracked'], { encoding: 'utf8' });
        assert.equal(accepted.status, 0, accepted.stderr);
        assert.match(accepted.stderr, /cannot evaluate Git ignore rules/);
    } finally {
        await fs.rm(tmp, { recursive: true, force: true });
    }
});

test('export rejects unknown flags, duplicate flags, and extra operands before copying', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'export-args-'));
    try {
        const source = path.join(tmp, 'source', '.claude', 'scripts');
        await fs.mkdir(source, { recursive: true });
        const exporter = path.join(source, 'export-claude.mjs');
        await fs.copyFile(path.join(repoRoot, '.claude/scripts/export-claude.mjs'), exporter);

        const cases = [
            { name: 'unknown option', args: ['typo-target', '--include-untrackd'], message: /unknown option/ },
            { name: 'extra operand', args: ['extra-target', 'another-target'], message: /multiple target directories/ },
            { name: 'duplicate flag', args: ['duplicate-target', '--force', '--force'], message: /duplicate --force/ },
        ];

        for (const { name, args, message } of cases) {
            const target = path.join(tmp, name);
            const result = spawnSync(process.execPath, [exporter, ...args.map(arg => arg.replace(/^(?:typo|extra|duplicate)-target$/, target))], {
                encoding: 'utf8',
            });
            assert.equal(result.status, 1, `${name} must fail`);
            assert.match(result.stderr, message, `${name} must explain the invalid argument`);
            await assert.rejects(fs.access(target), `${name} must not create a target`);
        }
    } finally {
        await fs.rm(tmp, { recursive: true, force: true });
    }
});

test('export rejects a symlink or junction alias of the source before copying', async (t) => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'export-self-alias-'));
    try {
        const source = path.join(tmp, 'source');
        const scripts = path.join(source, '.claude', 'scripts');
        await fs.mkdir(scripts, { recursive: true });
        const exporter = path.join(scripts, 'export-claude.mjs');
        await fs.copyFile(path.join(repoRoot, '.claude/scripts/export-claude.mjs'), exporter);
        await fs.writeFile(path.join(source, '.claude/tracked.txt'), 'fixture');

        const git = spawnSync('git', ['init', '--quiet'], { cwd: source, encoding: 'utf8' });
        assert.equal(git.status, 0, git.stderr);
        const add = spawnSync('git', ['add', '--', '.claude/tracked.txt', '.claude/scripts/export-claude.mjs'], {
            cwd: source,
            encoding: 'utf8'
        });
        assert.equal(add.status, 0, add.stderr);

        const alias = path.join(tmp, 'source-alias');
        try {
            await fs.symlink(source, alias, process.platform === 'win32' ? 'junction' : 'dir');
        } catch (error) {
            if (['EACCES', 'EPERM', 'ENOSYS'].includes(error?.code)) {
                t.skip(`symlink capability unavailable: ${error.code}`);
                return;
            }
            throw error;
        }

        const result = spawnSync(process.execPath, [exporter, alias, '--force'], { encoding: 'utf8' });
        assert.equal(result.status, 1, result.stderr);
        assert.match(result.stderr, /resolves to the source repo itself/);
        assert.equal(await fs.readFile(path.join(source, '.claude/tracked.txt'), 'utf8'), 'fixture');
    } finally {
        await fs.rm(tmp, { recursive: true, force: true });
    }
});
