#!/usr/bin/env node
/**
 * Code Patterns Injector - Edit/Write Hook
 *
 * Guides AI to read the right reference docs per domain when editing code files.
 * Replaces full-content injection with lightweight read-guidance pointers.
 *
 * Domains handled: backend (.cs), frontend (.ts/.html), integration tests,
 *                  E2E tests, feature docs.
 *
 * Exit Codes: 0 - Success (non-blocking)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { loadProjectConfig, isKnowledgePath } = require('./lib/project-config-loader.cjs');

const {
    CODE_PATTERNS: DEDUP_MARKER,
    E2E_CONTEXT: E2E_DEDUP_MARKER,
    INTEGRATION_TEST_CONTEXT: INTEG_TEST_DEDUP_MARKER,
    FEATURE_DOCS_CONTEXT: FEATURE_DOCS_DEDUP_MARKER,
    DEDUP_LINES
} = require('./lib/dedup-constants.cjs');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const config = loadProjectConfig();
const e2eConfig = config.e2eTesting || {};

// ── Extension sets ──────────────────────────────────────────────────────────

const groups = config.contextGroups || [];
const BACKEND_EXTS = new Set(groups.find(g => g.fileExtensions?.includes('.cs'))?.fileExtensions || ['.cs']);
const FRONTEND_EXTS = new Set(groups.find(g => g.fileExtensions?.includes('.ts'))?.fileExtensions || ['.ts', '.tsx', '.html']);
const E2E_CODE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.cs', '.feature']);
const E2E_FILE_RE = /\.(spec|test|cy|e2e)\./i;
const E2E_FALLBACK_RE = /[\\/](automation|e2e|spec|playwright|cypress)[\\/]/i;
const INTEG_TEST_PATH_RE = /IntegrationTests?[\\/]/i;
const FEATURE_DOCS_PATH_RE = /docs[\\/]business-features[\\/]/i;

// ── Path regexes ────────────────────────────────────────────────────────────

const BACKEND_REGEX = (() => {
    const bg = groups.find(g => g.fileExtensions?.includes('.cs'));
    if (bg?.pathRegexes?.length) return new RegExp(`(${bg.pathRegexes.join('|')})`, 'i');
    return /src[\\/]/i;
})();

const FRONTEND_REGEX = (() => {
    const fg = groups.find(g => g.fileExtensions?.includes('.ts'));
    if (fg?.pathRegexes?.length) return new RegExp(`(${fg.pathRegexes.join('|')})`, 'i');
    return /(?:src|libs)[\\/]/i;
})();

const E2E_PATH_PATTERNS = (() => {
    const parts = [];
    ['testsPath', 'pageObjectsPath', 'fixturesPath', 'platformProject', 'sharedProject', 'bddProject', 'nonBddProject'].forEach(k => {
        if (e2eConfig[k]) parts.push(e2eConfig[k].replace(/\\/g, '/'));
    });
    (e2eConfig.entryPoints || []).forEach(ep => {
        const d = path.dirname(ep).replace(/\\/g, '/');
        if (!parts.includes(d)) parts.push(d);
    });
    return parts;
})();

// ── Domain detection ────────────────────────────────────────────────────────

function classify(filePath) {
    if (!filePath) return {};
    const ext = path.extname(filePath).toLowerCase();
    const norm = filePath.replace(/\\/g, '/');
    const isE2E = isE2EFile(norm, ext);
    return {
        backend: !isE2E && BACKEND_EXTS.has(ext) && BACKEND_REGEX.test(norm),
        frontend: !isE2E && FRONTEND_EXTS.has(ext) && FRONTEND_REGEX.test(norm),
        integrationTest: BACKEND_EXTS.has(ext) && INTEG_TEST_PATH_RE.test(norm),
        e2e: isE2E,
        featureDocs: ext === '.md' && FEATURE_DOCS_PATH_RE.test(norm),
    };
}

function isE2EFile(norm, ext) {
    if (!E2E_CODE_EXTS.has(ext) && !E2E_FILE_RE.test(norm)) return false;
    if (E2E_PATH_PATTERNS.length > 0 && E2E_PATH_PATTERNS.some(p => norm.toLowerCase().includes(p.toLowerCase()))) return true;
    return E2E_FALLBACK_RE.test(norm) || (E2E_FILE_RE.test(norm) && /[\\/]test/i.test(norm));
}

// ── Dedup ───────────────────────────────────────────────────────────────────

function recentlyInjected(transcriptPath, marker, lines) {
    try {
        if (!transcriptPath || !fs.existsSync(transcriptPath)) return false;
        return fs.readFileSync(transcriptPath, 'utf-8').split('\n').slice(-lines).join('\n').includes(marker);
    } catch { return false; }
}

// ── Guidance builders ───────────────────────────────────────────────────────

function backendFrontendGuidance(backend, frontend) {
    const lines = ['', DEDUP_MARKER, '', 'Before editing, read:'];
    if (backend) {
        const bp = config.framework?.backendPatternsDoc || 'docs/project-reference/backend-patterns-reference.md';
        lines.push(`- \`${bp}\` — CQRS, commands, validation, repositories, entity events`);
    }
    if (frontend) {
        const fp = config.framework?.frontendPatternsDoc || 'docs/project-reference/frontend-patterns-reference.md';
        lines.push(`- \`${fp}\` — base classes, PlatformVmStore, effectSimple(), BEM`);
    }
    lines.push('', '> **[ROOT-CAUSE-FIX]** Fix at correct layer (Entity > Service > Handler) — never patch symptoms.', '');
    return lines.join('\n');
}

function integrationTestGuidance() {
    return [
        '',
        INTEG_TEST_DEDUP_MARKER,
        '',
        'Read: `docs/project-reference/integration-test-reference.md` — subcutaneous CQRS patterns, real DI, no mocks, `WaitUntilAsync` for all assertions.',
        ''
    ].join('\n');
}

function e2eGuidance() {
    const tcFormat = e2eConfig.tcCodeFormat || 'TC-{MODULE}-E2E-{NNN}';
    const framework = e2eConfig.framework || 'auto-detect';
    return [
        '',
        E2E_DEDUP_MARKER,
        '',
        `Read: \`docs/project-reference/e2e-test-reference.md\` — Page Object patterns, SpecFlow BDD conventions.`,
        `**Framework:** ${framework} | **TC format:** \`${tcFormat}\` (required in every test name)`,
        ''
    ].join('\n');
}

function featureDocsGuidance() {
    return [
        '',
        FEATURE_DOCS_DEDUP_MARKER,
        '',
        'Read: `docs/project-reference/feature-docs-reference.md` — 17-section template, TC-{FEAT}-{NNN} IDs, Section 15 as canonical TC source.',
        ''
    ].join('\n');
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);
        const payload = JSON.parse(stdin);

        if (!['Edit', 'Write', 'MultiEdit'].includes(payload.tool_name)) process.exit(0);

        let ckEnabled = true;
        try { ckEnabled = (require('./lib/ck-config-utils.cjs').loadConfig() || {}).codePatterns?.enabled !== false; } catch { /**/ }
        if (!ckEnabled) process.exit(0);

        const filePath = payload.tool_input?.file_path || payload.tool_input?.filePath || payload.tool_input?.edits?.[0]?.file_path || '';
        if (isKnowledgePath(filePath)) process.exit(0);

        const { backend, frontend, integrationTest, e2e, featureDocs } = classify(filePath);
        const tp = payload.transcript_path || '';

        if (integrationTest) {
            if (!recentlyInjected(tp, INTEG_TEST_DEDUP_MARKER, DEDUP_LINES.INTEGRATION_TEST_CONTEXT)) console.log(integrationTestGuidance());
            process.exit(0);
        }
        if (featureDocs) {
            if (!recentlyInjected(tp, FEATURE_DOCS_DEDUP_MARKER, DEDUP_LINES.FEATURE_DOCS_CONTEXT)) console.log(featureDocsGuidance());
            process.exit(0);
        }
        if (e2e) {
            if (!recentlyInjected(tp, E2E_DEDUP_MARKER, DEDUP_LINES.E2E_CONTEXT)) console.log(e2eGuidance());
            process.exit(0);
        }
        if (!backend && !frontend) process.exit(0);
        if (!recentlyInjected(tp, DEDUP_MARKER, DEDUP_LINES.CODE_PATTERNS)) console.log(backendFrontendGuidance(backend, frontend));

        process.exit(0);
    } catch {
        process.exit(0);
    }
}

main();
