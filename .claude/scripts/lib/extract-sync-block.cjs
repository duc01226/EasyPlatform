'use strict';

/**
 * Shared SYNC-block parser for the canonical protocol source
 * (`.claude/skills/shared/sync-inline-versions.md`).
 *
 * Single source of truth for both static-context generators:
 *   - `.claude/skills/claude-md-init/scripts/generate-claude-md.cjs` (CLAUDE.md bake)
 *   - `.claude/scripts/codex/sync-context-workflows.mjs`            (AGENTS.md bake)
 *
 * Lifted from the inline copy that used to live in `sync-context-workflows.mjs`.
 * Pure Node, zero deps (PORT-001 safe — no package.json / node_modules).
 *
 * CRLF NORMALIZATION (why it matters): the canonical markdown is committed as LF
 * (`git ls-files --eol` → `i/lf`) but a Windows working tree checks it out as CRLF
 * (`w/crlf`). The block-boundary delimiter is the literal `\n---\n\n## SYNC:`, which
 * NEVER matches a CRLF separator (`\r\n---\r\n\r\n## SYNC:`) — so an un-normalized
 * parse silently over-captures to EOF (observed: a 632-char block ballooning to
 * 100KB+, swallowing every later SYNC block). Normalizing `\r\n` → `\n` up front
 * makes the parser correct on any checkout, regardless of `core.autocrlf`.
 */

/** Normalize CRLF (and lone CR) line endings to LF so boundary detection is checkout-agnostic. */
function normalizeEol(markdown) {
    return String(markdown).replace(/\r\n?/g, '\n');
}

/**
 * Find the start index of a `## SYNC:<tag>` marker that occupies a WHOLE line.
 *
 * A bare `indexOf(marker)` is prefix-fragile: querying base tag `foo` could match the
 * line `## SYNC:foo:full` (or `## SYNC:foo-bar`) when that suffixed sibling appears first
 * — today this only works by the fortunate ordering of base-before-suffixed in the
 * canonical source. Anchoring the match to a full line (line start AND terminated by a
 * newline or EOF) makes extraction correct regardless of tag order or suffix delimiter
 * (`:`, `-`, anything that is not a newline). Returns -1 when no whole-line match exists.
 *
 * @param {string} md     - LF-normalized markdown
 * @param {string} marker - literal `## SYNC:<tag>` marker
 * @returns {number}
 */
function findMarkerStart(md, marker) {
    for (let from = 0; ; ) {
        const idx = md.indexOf(marker, from);
        if (idx === -1) return -1;
        const atLineStart = idx === 0 || md[idx - 1] === '\n';
        const after = md[idx + marker.length];
        const atLineEnd = after === undefined || after === '\n';
        if (atLineStart && atLineEnd) return idx;
        from = idx + marker.length;
    }
}

/**
 * Extract a SYNC block INCLUDING its `## SYNC:<tag>` heading line.
 * The block runs from the `## SYNC:<tag>` marker up to (but not including) the next
 * `\n---\n\n## SYNC:` separator, or EOF when this is the last block. Returns the
 * `.trim()`-ed slice, or `null` when the tag is absent.
 *
 * @param {string} markdown - full canonical markdown (any line endings)
 * @param {string} tag      - SYNC tag, e.g. `critical-thinking-mindset:full`
 * @returns {string|null}
 */
function extractSyncBlock(markdown, tag) {
    const md = normalizeEol(markdown);
    const marker = `## SYNC:${tag}`;
    const start = findMarkerStart(md, marker);
    if (start === -1) return null;
    const next = md.indexOf('\n---\n\n## SYNC:', start + marker.length);
    const end = next === -1 ? md.length : next;
    return md.slice(start, end).trim();
}

/**
 * Extract the BODY of a SYNC block — the block with its leading `## SYNC:<tag>`
 * heading line stripped, `.trim()`-ed. This is the protocol text the generators bake
 * (the heading itself is generator-specific scaffolding). Returns `null` when the tag
 * is absent, `''` when the block is heading-only.
 *
 * @param {string} markdown
 * @param {string} tag
 * @returns {string|null}
 */
function extractSyncBody(markdown, tag) {
    const block = extractSyncBlock(markdown, tag);
    if (block == null) return null;
    const nl = block.indexOf('\n');
    return (nl === -1 ? '' : block.slice(nl + 1)).trim();
}

module.exports = { extractSyncBlock, extractSyncBody, normalizeEol };
