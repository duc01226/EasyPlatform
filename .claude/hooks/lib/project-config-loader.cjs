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
 * Useful for hooks that need to know ALL code file extensions (e.g., search-before-code).
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
    isKnowledgePath
};
