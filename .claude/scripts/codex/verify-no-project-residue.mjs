#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = process.cwd();
const scanRoots = ['.codex', '.agents', '.claude/scripts/codex'];
// Forbidden-TERM scan roots (project name leakage). Hook tests are deliberately ABSENT because
// fixtures may reference this project's service names. Hook config is included because portable
// .claude config must stay generic; project-specific rollout data belongs in docs/project-config.json.
export const genericSourceRoots = ['.claude/skills', '.claude/hooks/config'];
const genericSourceFiles = [
    '.claude/.ck.json',
    '.claude/hooks/lib/prompt-injections.cjs',
    '.claude/hooks/prompt-context-assembler-project-config.cjs',
    '.claude/hooks/session-init-docs.cjs'
];
// Project-SYMBOL scan roots (base-class leakage). Covers skills AND hook source — generic hooks
// must not bake this project's base-class names into injected guidance (would mislead an agent on
// a non-.NET/Angular copy). This is a NARROWER, separate scan from forbiddenTerms above: it matches
// only the unambiguous denylist symbols, so hook config/test fixtures (which carry service NAMES,
// not base-CLASS symbols) do not trip it.
export const projectSymbolScanRoots = ['.claude/skills', '.claude/hooks'];
const forbiddenTerms = ['br' + 'avo', 'Br' + 'avoSuite'];

// Project-specific framework symbols (this codebase's .NET/Angular base classes) that must NOT
// leak into portable generic skills/hooks as load-bearing rules. Case-SENSITIVE, word-boundary
// matched, scanned within projectSymbolScanRoots (.claude/skills + .claude/hooks).
//
// CALIBRATION (deliberate — do NOT broaden casually). Only NARROW, unambiguous base-class /
// infrastructure symbols belong here. Two classes are intentionally EXCLUDED:
//   1. Generic language idioms (bare `Store`, `Service`, `Component`) — too broad → false positives.
//   2. Symbols that legitimately recur as cross-stack ILLUSTRATIVE examples / doc-pointers across
//      many generic skills (`effectSimple`, `UseCaseEvents`, `MapToEntity`, `MapToObject`,
//      `PlatformValidationResult`, `untilDestroyed`) — used as "e.g. on a .NET/Angular project…"
//      examples in scan/investigate/refactoring/feature/affirmative-rewrite-rubric. A blanket
//      denylist would force ~10 allowlist entries and fight the framework's example-driven design.
//      The load-bearing leak (review-architecture asserting them as MUST-rules) is fixed at the
//      source — rules reframed as project-examples routed through reference docs — not by this gate.
export const projectSymbolDenylist = [
    'AppBaseComponent',
    'AppBaseVmStoreComponent',
    'AppBaseFormComponent',
    'PlatformVmStore',
    'PlatformApiService',
    'IPlatformRootRepository',
    'ExecuteInjectScopedAsync',
    'ExecuteUowTask',
    // CQRS entity-event / bus-producer base classes — appear ONLY as review-architecture's marked
// examples today; denylisted as future-proofing so a NEW skill/hook can't introduce them as an
// unmarked assertion. review-architecture is allowlisted below for its documented examples.
    'PlatformCqrsEntityEventApplicationHandler',
    'PlatformCqrsEventBusMessageProducer'
];

// Per-file exemptions: skills that legitimately document THIS project's architecture as marked
// examples (review-architecture frames these base classes as "e.g. this project" anchors;
// the seed-test-data scan target greps for them in .NET source). Keyed by repo-relative forward-slash path →
// symbols allowed for that file only.
export const projectSymbolAllowlist = {
    '.claude/skills/review-architecture/SKILL.md': [
        'AppBaseComponent',
        'AppBaseVmStoreComponent',
        'AppBaseFormComponent',
        'PlatformVmStore',
        'PlatformApiService',
        'IPlatformRootRepository',
        'PlatformCqrsEntityEventApplicationHandler',
        'PlatformCqrsEventBusMessageProducer'
    ],
    '.claude/skills/project-config/SKILL.md': ['IPlatformRootRepository'],
    '.claude/skills/scan/references/targets.md': ['ExecuteInjectScopedAsync', 'ExecuteUowTask'],
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
    { start: '<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->', end: '<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->' },
    // .codex/CODEX_CONTEXT.md + AGENTS.md wrap the auto-synced prompt-protocol mirror (lessons.md,
    // hook injections) in this marker pair — legitimately carries project-specifics from synced
    // sources, so exempt it like the two CODEX:-prefixed managed blocks above. Canonical per
    // sync-context-workflows.test.mjs (asserts CODEX_CONTEXT.md opens with PROMPT-PROTOCOLS:START).
    { start: '<!-- PROMPT-PROTOCOLS:START -->', end: '<!-- PROMPT-PROTOCOLS:END -->' }
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
        }
    }

    for (const sourceFile of genericSourceFiles) {
        const filePath = path.join(rootDir, sourceFile);
        if (!(await exists(filePath))) continue;
        await scanFileForForbiddenTerms(filePath, failures, false);
    }

    for (const symbolRoot of projectSymbolScanRoots) {
        const absoluteRoot = path.join(rootDir, symbolRoot);
        for await (const filePath of walk(absoluteRoot)) {
            await scanFileForProjectSymbols(filePath, failures);
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

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    await main();
}
