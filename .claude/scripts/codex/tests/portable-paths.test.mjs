import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, '..', '..', '..', '..');
const rootSegment = ['scripts', 'codex'].join('/');
const allowedSourcePrefix = ['.claude', 'scripts', 'codex'].join('/');
const allowedRuntimePrefix = ['.codex', 'scripts', 'codex'].join('/');
const scanTargets = ['.claude', '.codex', '.agents', 'AGENTS.md', 'package.json'];
const ignoredDirs = new Set(['.git', 'node_modules', 'plans', 'tmp']);

async function pathExists(targetPath) {
    try {
        await fs.access(targetPath);
        return true;
    } catch {
        return false;
    }
}

async function* walk(targetPath) {
    const stat = await fs.lstat(targetPath).catch(err => {
        if (err.code === 'ENOENT') return null;
        throw err;
    });
    if (!stat) return;
    if (stat.isSymbolicLink()) return;
    if (stat.isFile()) {
        yield targetPath;
        return;
    }
    if (!stat.isDirectory()) return;

    for (const entry of await fs.readdir(targetPath, { withFileTypes: true })) {
        if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue;
        yield* walk(path.join(targetPath, entry.name));
    }
}

function isAllowedReference(line, index) {
    const before = line.slice(0, index);
    return before.endsWith(`${allowedSourcePrefix.slice(0, -rootSegment.length)}`)
        || before.endsWith(`${allowedRuntimePrefix.slice(0, -rootSegment.length)}`);
}

function collectForbiddenReferences(relativePath, text) {
    const failures = [];
    const lines = text.split(/\r?\n/);

    lines.forEach((rawLine, lineIndex) => {
        const line = rawLine.replaceAll('\\', '/');
        let searchIndex = 0;
        while (true) {
            const matchIndex = line.indexOf(rootSegment, searchIndex);
            if (matchIndex === -1) break;
            if (!isAllowedReference(line, matchIndex)) {
                failures.push(`${relativePath}:${lineIndex + 1}: ${rawLine.trim()}`);
            }
            searchIndex = matchIndex + rootSegment.length;
        }
    });

    return failures;
}

test('Codex portable files do not reference root scripts folder', async () => {
    const failures = [];

    for (const scanTarget of scanTargets) {
        const absoluteTarget = path.join(repoRoot, scanTarget);
        if (!(await pathExists(absoluteTarget))) continue;

        for await (const filePath of walk(absoluteTarget)) {
            const relativePath = path.relative(repoRoot, filePath).replaceAll('\\', '/');
            const text = await fs.readFile(filePath, 'utf8').catch(() => null);
            if (text === null) continue;
            failures.push(...collectForbiddenReferences(relativePath, text));
        }
    }

    assert.deepEqual(failures, []);
});
