'use strict';

const { readBytes, hash } = require('./task-tracking-files.cjs');
const { LIMITS } = require('./task-tracking-config.cjs');

/** Configuration names a capability; it cannot register or execute project code. */
function resolveTrackingProfile(context) {
    if (context.profile.kind === 'portable-markdown' && context.profile.version === 1) {
        return { available: true, kind: 'portable-markdown', version: 1, capabilities: ['inspect', 'create', 'update', 'adopt', 'assign', 'link', 'tag', 'transition', 'proof', 'accept', 'retire', 'restore', 'activity', 'attest', 'delete', 'report'] };
    }
    return { available: false, kind: 'native', registration: context.profile.registration, version: context.profile.version,
        capabilities: [], code: 'UNPROVED_NATIVE_CAPABILITY', reason: 'Native whole-footprint preservation, conflict, retry, and read-only render proof is unavailable; original records preserved' };
}

function nativeInventory(context) {
    const inventory = [];
    const diagnostics = [];
    for (const ownerPath of context.profile.sources || []) {
        try {
            const bytes = context.readSource ? context.readSource(ownerPath) : readBytes(context.root, ownerPath);
            inventory.push({ ownerPath, contentHash: hash(bytes), bytes: bytes.length });
        } catch (error) {
            // One unreadable or oversize source is named; the remaining sources are still inventoried.
            diagnostics.push({ path: ownerPath, code: error.code || 'IO_FAILURE', reason: error.message });
        }
    }
    return { inventory, diagnostics, coverage: 'unavailable', metrics: null, verification: 'unknown',
        reason: 'Source inventory is not a validated native work projection or metric calculation' };
}

module.exports = { resolveTrackingProfile, nativeInventory };
