#!/usr/bin/env node
/**
 * Backend Context - PreToolUse Hook
 *
 * Guides AI to read the right backend reference docs when editing .cs files.
 * Replaces full-content injection with a lightweight read-guidance pointer.
 *
 * Exit Codes: 0 - Success (non-blocking)
 */

const path = require('path');
const {
    loadProjectConfig,
    getContextGroup,
    getModuleForPath,
} = require('./lib/project-config-loader.cjs');
const { parsePreToolUseInput, wasRecentlyInjected } = require('./lib/context-injector-base.cjs');
const { BACKEND_CONTEXT: DEDUP_MARKER, DEDUP_LINES } = require('./lib/dedup-constants.cjs');

const config = loadProjectConfig();
const BACKEND_EXTENSIONS = new Set(
    (config.contextGroups || []).find(g => g.name === 'Backend Services')?.fileExtensions || ['.cs']
);
const EXCLUDED_EXTENSIONS = new Set(['.html', '.js', '.ts', '.css', '.sass', '.scss']);

function isBackendFile(filePath) {
    if (!filePath) return false;
    const ext = path.extname(filePath).toLowerCase();
    return !EXCLUDED_EXTENSIONS.has(ext) && BACKEND_EXTENSIONS.has(ext);
}

function getServiceName(filePath) {
    const mod = getModuleForPath(filePath);
    if (mod?.kind === 'backend-service') return mod.name;
    const serviceMap = config.backendServices?.serviceRepositories || {};
    const norm = filePath.replace(/\\/g, '/');
    for (const [svc] of Object.entries(serviceMap)) {
        if (norm.includes(svc)) return svc;
    }
    return null;
}

function buildGuidance(filePath) {
    const ctxGroup = getContextGroup(filePath) || {};
    const patternsDoc = ctxGroup.patternsDoc || 'docs/project-reference/backend-patterns-reference.md';
    const rules = ctxGroup.rules || [];
    const service = getServiceName(filePath);
    const mod = getModuleForPath(filePath);
    const repoType = mod?.meta?.repository || (config.backendServices?.serviceRepositories || {})[service];

    const lines = [
        '',
        DEDUP_MARKER,
        `**File:** ${path.basename(filePath)}${service ? ` | **Service:** ${service}` : ''}`,
        '',
        'Before implementing, read:',
        `- \`${patternsDoc}\` — CQRS commands/queries, validation, repositories, entity events`,
        '- `docs/project-reference/domain-entities-reference.md` — entity catalog, relationships, cross-service sync',
    ];

    if (repoType) lines.push(`\n**Repository:** Use \`${repoType}\` — NEVER generic IPlatformRootRepository`);

    if (rules.length > 0) {
        lines.push('', '**Critical Rules:**');
        rules.forEach((r, i) => lines.push(`${i + 1}. ${r}`));
    }

    lines.push('');
    return lines.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n');
}

async function main() {
    try {
        const input = parsePreToolUseInput();
        if (!input) process.exit(0);
        const { filePath, transcriptPath } = input;

        if (!isBackendFile(filePath)) process.exit(0);
        if (!getContextGroup(filePath) && !config.backendServices) process.exit(0);
        if (wasRecentlyInjected(transcriptPath, DEDUP_MARKER, DEDUP_LINES.BACKEND_CONTEXT)) process.exit(0);

        console.log(buildGuidance(filePath));
        process.exit(0);
    } catch {
        process.exit(0);
    }
}

main();
