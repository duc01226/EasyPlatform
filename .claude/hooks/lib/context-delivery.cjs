'use strict';

// Configuration remains owned by ck-config-loader; this module only adapts its
// effective profile and reads registered, confined policy projections.
const CORE_TAG = 'concise-agent-core';
const ROUTE_TAG = 'concise-workflow-route';

/**
 * The effective delivery profile. `options.config` supplies an already resolved `.ck` configuration
 * and `options.homeDir` the personal layer's home, so a caller (a test, a renderer) decides which
 * settings are read; omitted, the loader reads the project's layers and `os.homedir()`.
 */
function resolveProfile(root, options = {}) {
    try {
        const config = options.config || require('./ck-config-loader.cjs').loadConfig({ projectRoot: root, homeDir: options.homeDir });
        const value = config.contextDelivery;
        return { profile: value?.profile === 'concise' ? 'concise' : 'compatible', source: value?.source || 'default' };
    } catch {
        return { profile: 'compatible', source: 'unavailable' };
    }
}

/** The profile inputs of a hook's `deps` (test seams `homeDir` and `config`), for `resolveProfile`. */
function profileOptions(deps) {
    return { homeDir: deps?.homeDir, config: deps?.config };
}

function readConciseProtocol(root, tag, read = file => {
    try { return require('node:fs').readFileSync(file, 'utf8'); } catch { return null; }
}) {
    if (![CORE_TAG, ROUTE_TAG].includes(tag)) return null;
    const index = require('./protocol-delivery.cjs').loadIndex({ root, read });
    const row = index?.rows.get(tag);
    if (!row || row.group !== 'design' || row.parts.length !== 1) return null;
    let file;
    try {
        file = require('./project-reference-registry.cjs').resolveContainedPath(root, row.parts[0].file, { projectRoot: root });
    } catch { return null; }
    const raw = read(file);
    if (typeof raw !== 'string' || !raw.trim() || raw.length > 9000) return null;
    return raw.replace(/\r\n/g, '\n').trim();
}

function conciseCore(root, options = {}) {
    return resolveProfile(root, options).profile === 'concise'
        ? readConciseProtocol(root, CORE_TAG, options.read) : null;
}

module.exports = { CORE_TAG, ROUTE_TAG, resolveProfile, profileOptions, readConciseProtocol, conciseCore };
