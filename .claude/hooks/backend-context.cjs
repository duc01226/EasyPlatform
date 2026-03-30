#!/usr/bin/env node
/**
 * Backend Context Injector - PreToolUse Hook
 *
 * Automatically injects backend development guide when editing
 * backend files. File extensions and context group names are
 * configured via docs/project-config.json contextGroups[].
 *
 * Pattern Matching:
 *   Configured via docs/project-config.json contextGroups + modules
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

const path = require('path');
const { loadProjectConfig, buildRegexMap, buildPatternList, getContextGroup, getModuleForPath } = require('./lib/project-config-loader.cjs');
const { parsePreToolUseInput, wasRecentlyInjected, werePatternRecentlyInjected } = require('./lib/context-injector-base.cjs');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION (loaded from docs/project-config.json)
// ═══════════════════════════════════════════════════════════════════════════

const { BACKEND_CONTEXT: DEDUP_MARKER, DEDUP_LINES } = require('./lib/dedup-constants.cjs');

const config = loadProjectConfig();
const BACKEND_PATTERNS = buildPatternList(config.backendServices?.patterns);
const SERVICE_PATTERNS = buildRegexMap(config.backendServices?.serviceMap);

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

// Backend file extensions from contextGroups config
const backendGroup = (config.contextGroups || []).find(g => g.name === 'Backend Services');
const BACKEND_EXTENSIONS = new Set(backendGroup?.fileExtensions || ['.cs']);
// Explicit exclusion — never inject for frontend file types (safety net)
const EXCLUDED_EXTENSIONS = new Set(['.html', '.js', '.ts', '.css', '.sass', '.scss']);

function isBackendFile(filePath) {
    if (!filePath) return false;
    const ext = path.extname(filePath).toLowerCase();
    if (EXCLUDED_EXTENSIONS.has(ext)) return false;
    return BACKEND_EXTENSIONS.has(ext);
}

function detectBackendContext(filePath) {
    if (!filePath) return null;

    // v2: try contextGroups first
    const group = getContextGroup(filePath);
    if (group) return { name: group.name, patterns: [] };

    // v1 fallback: try pattern-based detection
    const normalizedPath = filePath.replace(/\\/g, '/');
    for (const context of BACKEND_PATTERNS) {
        for (const pattern of context.patterns) {
            if (pattern.test(normalizedPath)) {
                return context;
            }
        }
    }

    return null;
}

function detectService(filePath) {
    if (!filePath) return null;

    // v2: try modules[] first
    const mod = getModuleForPath(filePath);
    if (mod && mod.kind === 'backend-service') return mod.name;

    // v1 fallback: try serviceMap
    const normalizedPath = filePath.replace(/\\/g, '/');
    for (const [serviceName, pattern] of Object.entries(SERVICE_PATTERNS)) {
        if (pattern.test(normalizedPath)) {
            return serviceName;
        }
    }

    return null;
}

function shouldInject(filePath, transcriptPath) {
    // Skip non-backend files
    if (!isBackendFile(filePath)) return false;

    // Skip if no backend context detected
    const context = detectBackendContext(filePath);
    if (!context) return false;

    // Skip if already injected recently
    if (wasRecentlyInjected(transcriptPath, DEDUP_MARKER, DEDUP_LINES.BACKEND_CONTEXT)) return false;

    return true;
}

function buildInjection(context, filePath, service, patternsAlreadyInjected) {
    const fileName = path.basename(filePath);
    const ctxGroup = getContextGroup(filePath);
    const guideDoc = ctxGroup?.guideDoc || null;
    const patternsDoc = ctxGroup?.patternsDoc || 'docs/project-reference/backend-patterns-reference.md';

    const lines = ['', DEDUP_MARKER, '', `**Context:** ${context.name}`, `**File:** ${fileName}`, service ? `**Service:** ${service}` : '', ''];

    if (!patternsAlreadyInjected && guideDoc) {
        lines.push(
            '### IMPORTANT — MUST READ',
            '',
            `Before implementing backend changes, you **MUST READ** the following file:`,
            '',
            `**\`${guideDoc}\`**`,
            '',
            `Also MUST READ **\`${patternsDoc}\`** for project-specific patterns.`
        );
    }
    const rules = ctxGroup?.rules || [];

    if (rules.length > 0) {
        lines.push('### Critical Rules', '', `Refer to \`${patternsDoc}\` for class names and detailed examples.`, '');
        rules.forEach((rule, i) => {
            lines.push(`${i + 1}. ${rule}`);
        });
        lines.push('');
    }

    lines.push(
        `**Domain Entities:** Read \`docs/project-reference/domain-entities-reference.md\` for entity catalog, relationships, and cross-service sync map.`,
        ''
    );

    // Service-specific guidance: v2 modules first, v1 fallback
    const mod = getModuleForPath(filePath);
    const serviceName = mod?.name || service;
    if (serviceName) {
        lines.push('### Service-Specific Notes', '', `Working in **${serviceName}** service:`, '');

        // v2: read from module.meta
        const repoType = mod?.meta?.repository || (config.backendServices?.serviceRepositories || {})[serviceName];
        const domain = mod?.description || (config.backendServices?.serviceDomains || {})[serviceName];
        if (repoType || domain) {
            if (repoType) lines.push(`- Use \`${repoType}\` for entities`);
            if (domain) lines.push(`- ${domain}`);
            lines.push('');
        }
    }

    // API metadata from project-config
    const apiConfig = config.api;
    if (apiConfig) {
        const parts = [];
        if (apiConfig.style) parts.push(`Style: ${apiConfig.style}`);
        if (apiConfig.authPattern) parts.push(`Auth: ${apiConfig.authPattern}`);
        if (apiConfig.docsFormat) parts.push(`Docs: ${apiConfig.docsFormat}`);
        if (parts.length > 0) {
            lines.push(`**API:** ${parts.join(' | ')}`, '');
        }
    }

    // Filter out empty lines from middle
    return lines
        .filter((line, i, arr) => {
            if (line === '' && arr[i - 1] === '') return false;
            return true;
        })
        .join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
    try {
        const input = parsePreToolUseInput();
        if (!input) process.exit(0);
        const { filePath, transcriptPath } = input;

        if (!shouldInject(filePath, transcriptPath)) process.exit(0);

        const context = detectBackendContext(filePath);
        if (!context) process.exit(0);

        const service = detectService(filePath);
        const patternsAlreadyInjected = werePatternRecentlyInjected(transcriptPath);
        console.log(buildInjection(context, filePath, service, patternsAlreadyInjected));
        process.exit(0);
    } catch (error) {
        process.exit(0);
    }
}

main();
