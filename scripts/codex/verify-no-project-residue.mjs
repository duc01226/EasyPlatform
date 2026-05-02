#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const scanRoots = ['.claude', '.agents', '.codex', 'docs', 'scripts', 'AGENTS.md', 'README.md', 'package.json'];
const forbiddenTerms = ['br' + 'avo', 'Br' + 'avoSuite'];
const ignoredParts = new Set(['node_modules', 'plans', '.git', '.venv', '__pycache__', 'tmp']);
const ignoredExtensions = new Set(['.pyc', '.pyo', '.exe', '.dll', '.png', '.jpg', '.jpeg', '.gif', '.webp']);
const ignoredFilenamePatterns = [/\.local\.json$/i];

async function exists(targetPath) {
    try {
        await fs.access(targetPath);
        return true;
    } catch {
        return false;
    }
}

function isIgnored(targetPath) {
    return path
        .relative(rootDir, targetPath)
        .split(path.sep)
        .some(part => ignoredParts.has(part));
}

async function* walk(targetPath) {
    if (isIgnored(targetPath) || !(await exists(targetPath))) return;

    const stat = await fs.lstat(targetPath);
    if (stat.isSymbolicLink()) return;
    if (stat.isFile()) {
        if (ignoredExtensions.has(path.extname(targetPath).toLowerCase())) return;
        const basename = path.basename(targetPath);
        if (ignoredFilenamePatterns.some(pattern => pattern.test(basename))) return;
        yield targetPath;
        return;
    }
    if (!stat.isDirectory()) return;

    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    for (const entry of entries) {
        yield* walk(path.join(targetPath, entry.name));
    }
}

function normalize(targetPath) {
    return path.relative(rootDir, targetPath).replaceAll('\\', '/');
}

async function main() {
    const failures = [];

    for (const scanRoot of scanRoots) {
        const absoluteRoot = path.join(rootDir, scanRoot);
        for await (const filePath of walk(absoluteRoot)) {
            const content = await fs.readFile(filePath, 'utf8').catch(() => null);
            if (content === null) continue;

            const lines = content.split(/\r?\n/);
            lines.forEach((line, index) => {
                if (forbiddenTerms.some(term => line.toLowerCase().includes(term.toLowerCase()))) {
                    failures.push(`${normalize(filePath)}:${index + 1}: ${line.trim()}`);
                }
            });
        }
    }

    if (failures.length > 0) {
        console.error('[codex-verify-no-project-residue] FAIL');
        for (const failure of failures) {
            console.error(`- ${failure}`);
        }
        process.exitCode = 1;
        return;
    }

    console.log('[codex-verify-no-project-residue] PASS');
}

await main();
