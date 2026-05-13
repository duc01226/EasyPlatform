#!/usr/bin/env node
/**
 * Frontend Context - PreToolUse Hook
 *
 * Guides AI to read the right frontend reference docs when editing frontend files.
 * Replaces full-content injection with a lightweight read-guidance pointer.
 *
 * Exit Codes: 0 - Success (non-blocking)
 */

const path = require('path');
const {
    loadProjectConfig,
    getContextGroup,
    getModuleForPath,
    getLocalizationConfig,
    isMultilingualProject,
} = require('./lib/project-config-loader.cjs');
const { parsePreToolUseInput, wasRecentlyInjected } = require('./lib/context-injector-base.cjs');
const { FRONTEND_CONTEXT: DEDUP_MARKER, DEDUP_LINES } = require('./lib/dedup-constants.cjs');

const config = loadProjectConfig();
const FRONTEND_EXTENSIONS = new Set(['.html', '.js', '.ts', '.tsx', '.css', '.scss', '.json']);
const LOCALIZATION_CONFIG = getLocalizationConfig(config);
const MODERN_APPS = new Set(config.frontendApps?.modernApps || []);
const LEGACY_APPS = new Set(config.frontendApps?.legacyApps || []);

function isFrontendFile(filePath) {
    return !!filePath && FRONTEND_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function getAppName(filePath) {
    const mod = getModuleForPath(filePath);
    if (mod && (mod.kind === 'frontend-app' || mod.kind === 'library')) return mod.name;
    return null;
}

function buildGuidance(filePath) {
    const ctxGroup = getContextGroup(filePath) || {};
    const patternsDoc = ctxGroup.patternsDoc || 'docs/project-reference/frontend-patterns-reference.md';
    const rules = ctxGroup.rules || [];
    const app = getAppName(filePath);
    const mod = getModuleForPath(filePath);
    const generation = mod?.meta?.generation ||
        (MODERN_APPS.has(app) ? 'modern' : LEGACY_APPS.has(app) ? 'legacy' : null);

    const lines = [
        '',
        DEDUP_MARKER,
        `**File:** ${path.basename(filePath)}${app ? ` | **App:** ${app}` : ''}`,
        '',
        'Before implementing, read:',
        `- \`${patternsDoc}\` — base classes, PlatformVmStore, effectSimple(), BEM, API service pattern`,
        '- `docs/project-reference/domain-entities-reference.md` — domain models, API services',
    ];

    if (generation === 'modern') {
        lines.push('', '**App:** Standalone components with signals. Use `@use \'shared-mixin\'` for SCSS.');
    } else if (generation === 'legacy') {
        lines.push('', '**App:** Legacy NgModules (not standalone). Use `@import \'~assets/scss/variables\'` for SCSS.');
    }

    if (rules.length > 0) {
        lines.push('', '**Critical Rules:**');
        rules.forEach((r, i) => lines.push(`${i + 1}. ${r}`));
    }

    const norm = (filePath || '').replace(/\\/g, '/');
    const uiPatterns = LOCALIZATION_CONFIG.uiPathPatterns || [];
    const isI18nFile = isMultilingualProject(config) && (uiPatterns.length === 0 || uiPatterns.some(p => p.test(norm)));
    if (isI18nFile) {
        lines.push('', '**I18N:** Multilingual project — if user-visible text changed, update translation resources for all locales.');
    }

    lines.push('');
    return lines.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n');
}

async function main() {
    try {
        const input = parsePreToolUseInput();
        if (!input) process.exit(0);
        const { filePath, transcriptPath } = input;

        if (!isFrontendFile(filePath)) process.exit(0);
        if (!getContextGroup(filePath)) process.exit(0);
        if (wasRecentlyInjected(transcriptPath, DEDUP_MARKER, DEDUP_LINES.FRONTEND_CONTEXT)) process.exit(0);

        console.log(buildGuidance(filePath));
        process.exit(0);
    } catch {
        process.exit(0);
    }
}

main();
