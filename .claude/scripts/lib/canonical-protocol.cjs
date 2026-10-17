'use strict';

const fs = require('fs');
const path = require('path');
const { extractSyncBody } = require('./extract-sync-block.cjs');

/**
 * Body of one canonical shared protocol (`## SYNC:<tag>` in
 * `.claude/skills/shared/sync-inline-versions.md`), or null when the file or the tag is missing.
 * The one reader hooks use for a canonical text they re-deliver; it composes nothing.
 */
function readCanonicalProtocol(rootDir, tag) {
    try {
        const file = path.join(rootDir, '.claude', 'skills', 'shared', 'sync-inline-versions.md');
        return extractSyncBody(fs.readFileSync(file, 'utf8'), tag);
    } catch {
        return null;
    }
}

module.exports = { readCanonicalProtocol };
