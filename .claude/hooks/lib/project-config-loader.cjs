#!/usr/bin/env node
/**
 * Project Config Loader
 *
 * Loads docs/project-config.json and provides helper functions
 * for hooks that need project-specific path patterns.
 *
 * Usage:
 *   const { loadProjectConfig, getModules, getContextGroup, isConfigPopulated } = require('./lib/project-config-loader.cjs');
 *   const config = loadProjectConfig();
 *   const modules = getModules('backend-service');     // v2 modules[] with v1 fallback
 *   const group = getContextGroup('src/Services/x.cs'); // context group matching
 */
'use strict';

const fs = require('fs');
const path = require('path');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const CONFIG_PATH = path.join(PROJECT_DIR, 'docs', 'project-config.json');

let _cache = null;

/**
 * Load project-config.json. Returns empty object on failure.
 * Result is cached for the process lifetime.
 */
function loadProjectConfig() {
    if (_cache) return _cache;
    try {
        _cache = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    } catch {
        _cache = {};
    }
    return _cache;
}

/**
 * Convert a string→string map (name → regexString) into a string→RegExp map.
 * @param {Record<string,string>} map - e.g. { "ServiceA": "Services[\\/]ServiceA" }
 * @returns {Record<string,RegExp>}
 */
function buildRegexMap(map) {
    if (!map) return {};
    const result = {};
    for (const [key, pattern] of Object.entries(map)) {
        try {
            result[key] = new RegExp(pattern, 'i');
        } catch {
            /* skip invalid regex */
        }
    }
    return result;
}

/**
 * Convert a pattern list (array of { name, pathRegex/pathRegexes, description, ... }) into
 * an array of { name, patterns: RegExp[], description, ...rest }.
 * Extra properties (quickTips, scssExamples, docFile, etc.) are forwarded as-is.
 * @param {Array} list
 * @returns {Array<{name:string, patterns:RegExp[], description:string, [key:string]:any}>}
 */
function buildPatternList(list) {
    if (!list || !Array.isArray(list)) return [];
    return list.map(item => {
        let patterns = [];
        if (item.pathRegexes) {
            for (const r of item.pathRegexes) {
                try {
                    patterns.push(new RegExp(r, 'i'));
                } catch {
                    /* skip invalid regex */
                }
            }
        } else if (item.pathRegex) {
            try {
                patterns.push(new RegExp(item.pathRegex, 'i'));
            } catch {
                /* skip invalid regex */
            }
        }
        // Forward all extra properties from config (quickTips, scssExamples, docFile, etc.)
        const { pathRegexes, pathRegex, ...rest } = item;
        return {
            ...rest,
            patterns,
            description: item.description || ''
        };
    });
}

/**
 * Get modules filtered by kind. Falls back to building from v1 sections.
 * @param {string} [kind] - e.g., 'backend-service', 'frontend-app', 'library'
 * @returns {Array<{name:string, kind:string, pathRegex:string, description?:string, tags?:string[], meta?:object}>}
 */
function getModules(kind) {
    const config = loadProjectConfig();
    let modules = config.modules || [];

    // v1 fallback: build modules from backendServices + frontendApps
    if (modules.length === 0) {
        modules = [];
        const svcMap = config.backendServices?.serviceMap || {};
        for (const [name, regex] of Object.entries(svcMap)) {
            modules.push({
                name,
                kind: 'backend-service',
                pathRegex: regex,
                description: config.backendServices?.serviceDomains?.[name] || '',
                meta: { repository: config.backendServices?.serviceRepositories?.[name] }
            });
        }
        const appMap = config.frontendApps?.appMap || {};
        const legacy = new Set(config.frontendApps?.legacyApps || []);
        for (const [name, regex] of Object.entries(appMap)) {
            modules.push({
                name,
                kind: 'frontend-app',
                pathRegex: regex,
                meta: { generation: legacy.has(name) ? 'legacy' : 'modern' }
            });
        }
    }

    return kind ? modules.filter(m => m.kind === kind) : modules;
}

/**
 * Find the context group matching a file path and extension.
 * @param {string} filePath - File path to match
 * @returns {object|null} Matching context group or null
 */
function getContextGroup(filePath) {
    const config = loadProjectConfig();
    const groups = config.contextGroups || [];
    const normalized = (filePath || '').replace(/\\/g, '/');
    const ext = '.' + normalized.split('.').pop();

    for (const group of groups) {
        const extMatch = !group.fileExtensions || group.fileExtensions.length === 0 || group.fileExtensions.includes(ext);
        if (!extMatch) continue;
        for (const regex of group.pathRegexes || []) {
            try {
                if (new RegExp(regex, 'i').test(normalized)) return group;
            } catch {
                /* skip invalid */
            }
        }
    }

    return null;
}

/**
 * Find the module matching a file path.
 * @param {string} filePath - File path to match
 * @returns {object|null} Matching module or null
 */
function getModuleForPath(filePath) {
    const modules = getModules();
    const normalized = (filePath || '').replace(/\\/g, '/');
    for (const mod of modules) {
        try {
            if (new RegExp(mod.pathRegex, 'i').test(normalized)) return mod;
        } catch {
            /* skip */
        }
    }
    return null;
}

/**
 * Resolve a section by v2 name, falling back to v1 alias.
 * E.g., resolveSection('styling', 'scss') returns config.styling || config.scss
 * @param {string} v2Name - v2 section name
 * @param {string} v1Name - v1 section name (deprecated alias)
 * @returns {object|null}
 */
function resolveSection(v2Name, v1Name) {
    const config = loadProjectConfig();
    return config[v2Name] || config[v1Name] || null;
}

/**
 * Aggregate all file extensions from contextGroups + styling into a single array.
 * Useful for hooks that need to know ALL code file extensions.
 * @returns {string[]} e.g., ['.cs', '.ts', '.tsx', '.html', '.scss', '.css', '.sass', '.less']
 */
function getAllFileExtensions() {
    const config = loadProjectConfig();
    const exts = new Set();
    for (const group of config.contextGroups || []) {
        for (const ext of group.fileExtensions || []) exts.add(ext);
    }
    for (const ext of config.styling?.fileExtensions || []) exts.add(ext);
    return [...exts];
}

/**
 * Check if a parsed project config has been populated with real values.
 * "Populated" = has a non-empty project.name AND at least one substantive section
 * (modules, services, contextGroups, framework with real name, testing, e2eTesting, styling, etc.)
 * This is generic — works for any project type (backend, frontend, full-stack, static site).
 * @param {object} [config] - Parsed project-config.json. If omitted, loads from disk.
 * @returns {boolean}
 */
function isConfigPopulated(config) {
    if (config === undefined) config = loadProjectConfig();
    if (!config || typeof config !== 'object') return false;
    const hasName = config.project?.name?.trim().length > 0;
    if (!hasName) return false;

    // Check any substantive section is populated (not just modules/services)
    const hasModules = Array.isArray(config.modules) && config.modules.length > 0;
    const hasServices = !!(config.backendServices?.serviceMap && Object.keys(config.backendServices.serviceMap).some(k => k !== 'ExampleService'));
    const hasContextGroups = Array.isArray(config.contextGroups) && config.contextGroups.length > 0;
    const hasFramework = !!(config.framework?.name?.trim().length > 0 && config.framework.name !== 'ExampleFramework');
    const hasTesting = !!(config.testing?.frameworks?.length > 0 || config.e2eTesting?.framework?.trim().length > 0);
    const hasStyling = !!(config.styling?.technology?.trim().length > 0 || (config.scss?.appMap && Object.keys(config.scss.appMap).length > 0));
    const hasFrontendApps = !!(config.frontendApps?.appMap && Object.keys(config.frontendApps.appMap).length > 0);

    return hasModules || hasServices || hasContextGroups || hasFramework || hasTesting || hasStyling || hasFrontendApps;
}

/**
 * Check if a file path is in the knowledge workspace (docs/knowledge/).
 * Used by coding-specific hooks to skip injection on knowledge files.
 */
const KNOWLEDGE_PATH_RE = /docs[\\/]knowledge[\\/]/i;
function isKnowledgePath(filePath) {
    if (!filePath) return false;
    return KNOWLEDGE_PATH_RE.test(filePath.replace(/\\/g, '/'));
}

/**
 * Generate a compact project structure summary from project-config.json.
 * 100% data-driven — no hardcoded project knowledge. Returns empty string
 * if config is not populated.
 * @param {object} [config] - Parsed config. If omitted, loads from disk.
 * @returns {string} Multi-line summary (~30-60 lines depending on config richness)
 */
function generateProjectSummary(config) {
    if (config === undefined) config = loadProjectConfig();
    if (!config || !isConfigPopulated(config)) return '';

    const lines = [];
    const p = config.project || {};

    // --- Project header ---
    lines.push(`**${p.name || 'Project'}**${p.description ? ` — ${p.description}` : ''}`);
    const meta = [];
    if (p.languages?.length) meta.push(`Languages: ${p.languages.join(', ')}`);
    if (p.packageManagers?.length) meta.push(`PM: ${p.packageManagers.join(', ')}`);
    if (p.monorepoTool) meta.push(`Monorepo: ${p.monorepoTool}`);
    if (meta.length) lines.push(meta.join(' | '));

    // --- Modules by kind ---
    const modules = config.modules || [];
    if (modules.length > 0) {
        const byKind = {};
        for (const m of modules) {
            const k = m.kind || 'other';
            if (!byKind[k]) byKind[k] = [];
            byKind[k].push(m.name);
        }
        lines.push('');
        lines.push(`**Modules (${modules.length}):**`);
        for (const [kind, names] of Object.entries(byKind)) {
            if (names.length <= 5) {
                lines.push(`  ${kind}: ${names.join(', ')}`);
            } else {
                lines.push(`  ${kind} (${names.length}): ${names.slice(0, 4).join(', ')}, ... +${names.length - 4} more`);
            }
        }
    }

    // --- Framework ---
    const fw = config.framework;
    if (fw?.name) {
        lines.push('');
        lines.push(`**Framework:** ${fw.name}`);
        if (fw.searchPatternKeywords?.length) {
            lines.push(
                `  Key patterns: ${fw.searchPatternKeywords.slice(0, 8).join(', ')}${fw.searchPatternKeywords.length > 8 ? ` (+${fw.searchPatternKeywords.length - 8})` : ''}`
            );
        }
    }

    // --- Context groups ---
    const groups = config.contextGroups || [];
    if (groups.length > 0) {
        lines.push('');
        lines.push('**Context Groups:**');
        for (const g of groups) {
            const parts = [g.name];
            if (g.fileExtensions?.length) parts.push(`[${g.fileExtensions.join(', ')}]`);
            if (g.patternsDoc) parts.push(`→ ${g.patternsDoc}`);
            lines.push(`  ${parts.join(' ')}`);
            if (g.rules?.length) {
                for (const r of g.rules.slice(0, 3)) {
                    lines.push(`    - ${r}`);
                }
                if (g.rules.length > 3) lines.push(`    - ... +${g.rules.length - 3} more rules`);
            }
        }
    }

    // --- Databases + Messaging + API (one-liner each) ---
    const infoParts = [];
    const db = config.databases;
    if (db) {
        if (db.primary) {
            const alts = db.alternatives?.length ? ` (+ ${db.alternatives.join(', ')})` : '';
            infoParts.push(`DB: ${db.primary}${alts}`);
        } else {
            const keys = Object.keys(db).filter(k => k !== 'note');
            if (keys.length) infoParts.push(`DB: ${keys.join(', ')}`);
        }
    }
    const msg = config.messaging;
    if (msg?.broker) infoParts.push(`Bus: ${msg.broker}`);
    const api = config.api;
    if (api?.style) infoParts.push(`API: ${api.style}${api.authPattern ? ` + ${api.authPattern}` : ''}`);
    if (infoParts.length) {
        lines.push('');
        lines.push(`**Stack:** ${infoParts.join(' | ')}`);
    }

    // --- Testing ---
    const test = config.testing;
    if (test?.frameworks?.length) {
        lines.push(`**Testing:** ${test.frameworks.join(', ')}${test.guideDoc ? ` → ${test.guideDoc}` : ''}`);
    }

    // --- Infrastructure ---
    const infra = config.infrastructure;
    if (infra) {
        const parts = [];
        if (infra.containerization) parts.push(infra.containerization);
        if (infra.orchestration) parts.push(infra.orchestration);
        if (parts.length) lines.push(`**Infra:** ${parts.join(' + ')}`);
    }

    // --- Workflow Patterns ---
    const wp = config.workflowPatterns;
    if (wp) {
        const wpParts = [];
        if (wp.architectureStyle) wpParts.push(`**Architecture:** ${wp.architectureStyle}`);
        if (wp.codeHierarchy) wpParts.push(`**Code Hierarchy:** ${wp.codeHierarchy}`);
        if (wp.cssMethodology) wpParts.push(`**CSS:** ${wp.cssMethodology}`);
        if (wp.stateManagement) wpParts.push(`**State:** ${wp.stateManagement}`);
        if (wp.crossModuleValidation) wpParts.push(`**Cross-Module Validation:** ${wp.crossModuleValidation}`);
        if (wpParts.length) {
            lines.push('');
            lines.push('**Workflow Patterns:**');
            for (const p of wpParts) lines.push(`  ${p}`);
        }
        if (wp.featureDocPath) lines.push(`**Feature Docs:** ${wp.featureDocPath}${wp.featureDocTemplate ? ` (template: ${wp.featureDocTemplate})` : ''}`);
        if (wp.reviewRulesDoc) lines.push(`**Review Rules:** ${wp.reviewRulesDoc}`);
    }

    return lines.join('\n');
}

module.exports = {
    loadProjectConfig,
    buildRegexMap,
    buildPatternList,
    getModules,
    getContextGroup,
    getModuleForPath,
    resolveSection,
    getAllFileExtensions,
    isConfigPopulated,
    isKnowledgePath,
    generateProjectSummary
};
