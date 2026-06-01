#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = process.cwd();
const scanRoots = ['.codex', '.agents', '.claude/scripts/codex'];
const genericSourceRoots = ['.claude/skills'];
const genericSourceFiles = [
    '.claude/.ck.json',
    '.claude/hooks/lib/prompt-injections.cjs',
    '.claude/hooks/prompt-context-assembler-project-config.cjs',
    '.claude/hooks/session-init-docs.cjs'
];
const forbiddenTerms = ['br' + 'avo', 'Br' + 'avoSuite'];

// Project-specific framework symbols (this codebase's .NET/Angular base classes) that must NOT
// leak into portable generic skills. Case-SENSITIVE, word-boundary matched, scanned ONLY within
// genericSourceRoots (.claude/skills). Generic language idioms are deliberately excluded
// (e.g. bare `Store`, `Service`, `Component`) — too broad → false positives on framework examples.
export const projectSymbolDenylist = [
    'AppBaseComponent',
    'AppBaseVmStoreComponent',
    'AppBaseFormComponent',
    'PlatformVmStore',
    'PlatformApiService',
    'IPlatformRootRepository',
    'ExecuteInjectScopedAsync',
    'ExecuteUowTask'
];

// Per-file exemptions: skills that legitimately document THIS project's architecture
// (review-architecture asserts these exact base classes; scan-seed-test-data greps for them in
// .NET source). Keyed by repo-relative forward-slash path → symbols allowed for that file only.
export const projectSymbolAllowlist = {
    '.claude/skills/review-architecture/SKILL.md': [
        'AppBaseComponent',
        'AppBaseVmStoreComponent',
        'AppBaseFormComponent',
        'PlatformVmStore',
        'PlatformApiService',
        'IPlatformRootRepository'
    ],
    '.claude/skills/project-config/SKILL.md': ['IPlatformRootRepository'],
    '.claude/skills/scan-seed-test-data/SKILL.md': ['ExecuteInjectScopedAsync', 'ExecuteUowTask'],
    '.claude/skills/shared/affirmative-rewrite-rubric.md': ['PlatformVmStore']
};

// No `g` flag → safe to reuse each compiled matcher across lines/files (`.test()` is stateless
// without `g`). Symbols are pure `[A-Za-z]`, so `\b` word boundaries behave as intended.
const projectSymbolMatchers = projectSymbolDenylist.map(symbol => ({
    symbol,
    matcher: new RegExp(`\\b${symbol}\\b`)
}));
const ignoredParts = new Set(['node_modules', 'plans', '.git', '.venv', '__pycache__', 'tmp']);
const ignoredExtensions = new Set(['.pyc', '.pyo', '.exe', '.dll', '.png', '.jpg', '.jpeg', '.gif', '.webp']);
const ignoredFilenamePatterns = [/\.local\.json$/i];
const managedBlockRanges = [
    { start: '<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->', end: '<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->' },
    { start: '<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->', end: '<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->' }
];

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

function computeManagedBlockMask(lines) {
    const mask = new Array(lines.length).fill(false);
    let activeEnd = null;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (activeEnd === null) {
            const opener = managedBlockRanges.find(range => line.includes(range.start));
            if (opener) {
                mask[i] = true;
                activeEnd = opener.end;
            }
            continue;
        }
        mask[i] = true;
        if (line.includes(activeEnd)) {
            activeEnd = null;
        }
    }
    return mask;
}

async function scanFileForForbiddenTerms(filePath, failures, skipManagedBlocks) {
    const content = await fs.readFile(filePath, 'utf8').catch(() => null);
    if (content === null) return;

    const lines = content.split(/\r?\n/);
    const skipLine = skipManagedBlocks ? computeManagedBlockMask(lines) : new Array(lines.length).fill(false);
    lines.forEach((line, index) => {
        if (skipLine[index]) return;
        if (forbiddenTerms.some(term => line.toLowerCase().includes(term.toLowerCase()))) {
            failures.push(`${normalize(filePath)}:${index + 1}: ${line.trim()}`);
        }
    });
}

// Pure core (exported for unit tests): returns {line, symbol, text} for each denylisted project
// symbol present in `content`, minus any symbol allowlisted for `relPath`. Case-sensitive,
// word-boundary. `relPath` MUST be repo-relative forward-slash (use normalize()).
export function findProjectSymbolViolations(content, relPath, { skipManagedBlocks = false } = {}) {
    const allowed = new Set(projectSymbolAllowlist[relPath] ?? []);
    const lines = content.split(/\r?\n/);
    const skipLine = skipManagedBlocks ? computeManagedBlockMask(lines) : new Array(lines.length).fill(false);
    const violations = [];
    lines.forEach((line, index) => {
        if (skipLine[index]) return;
        for (const { symbol, matcher } of projectSymbolMatchers) {
            if (allowed.has(symbol)) continue;
            if (matcher.test(line)) {
                violations.push({ line: index + 1, symbol, text: line.trim() });
            }
        }
    });
    return violations;
}

async function scanFileForProjectSymbols(filePath, failures) {
    const content = await fs.readFile(filePath, 'utf8').catch(() => null);
    if (content === null) return;
    const relPath = normalize(filePath);
    for (const violation of findProjectSymbolViolations(content, relPath, { skipManagedBlocks: false })) {
        failures.push(
            `${relPath}:${violation.line}: project symbol "${violation.symbol}" (genericize, or add to projectSymbolAllowlist if intentional) — ${violation.text}`
        );
    }
}

async function main() {
    const failures = [];

    for (const scanRoot of scanRoots) {
        const absoluteRoot = path.join(rootDir, scanRoot);
        for await (const filePath of walk(absoluteRoot)) {
            await scanFileForForbiddenTerms(filePath, failures, true);
        }
    }

    for (const sourceRoot of genericSourceRoots) {
        const absoluteRoot = path.join(rootDir, sourceRoot);
        for await (const filePath of walk(absoluteRoot)) {
            await scanFileForForbiddenTerms(filePath, failures, false);
            await scanFileForProjectSymbols(filePath, failures);
        }
    }

    for (const sourceFile of genericSourceFiles) {
        const filePath = path.join(rootDir, sourceFile);
        if (!(await exists(filePath))) continue;
        await scanFileForForbiddenTerms(filePath, failures, false);
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

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    await main();
}
