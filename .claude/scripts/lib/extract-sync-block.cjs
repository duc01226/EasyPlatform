'use strict';

/**
 * Shared SYNC-block parser for the canonical protocol source
 * (`.claude/skills/shared/sync-inline-versions.md`).
 *
 * Single source of truth for both static-context generators:
 *   - `.claude/skills/ai-context-refresh/scripts/generate-claude-md.cjs` (CLAUDE.md bake)
 *   - `.claude/scripts/codex/sync-context-workflows.mjs`            (AGENTS.md bake)
 *
 * Lifted from the inline copy that used to live in `sync-context-workflows.mjs`.
 * Pure Node, zero deps (PORT-001 safe — no package.json / node_modules).
 *
 * CRLF NORMALIZATION (why it matters): the canonical markdown is committed as LF
 * (`git ls-files --eol` → `i/lf`) but a Windows working tree checks it out as CRLF
 * (`w/crlf`). The block-end boundary is an LF pattern (see `findBlockEnd`), which NEVER
 * matches a CRLF separator (`\r\n---\r\n`) — so an un-normalized parse silently
 * over-captures to EOF (observed: a 632-char block ballooning to 100KB+, swallowing
 * every later SYNC block). Normalizing `\r\n` → `\n` up front makes the parser correct
 * on any checkout, regardless of `core.autocrlf`.
 *
 * BLOCK-END RULE (shared with the Python writer): a block ends at the first `---` line
 * (optional trailing spaces/tabs, then a newline or EOF) OR the first line starting with
 * `## SYNC:`, whichever comes first — the rule `read_canonical_block` in
 * `.claude/scripts/sync-update-blocks.py` applies. A stricter `\n---\n\n## SYNC:` boundary
 * over-captured whenever anything (an HTML comment, a missing blank line) sat between the
 * separator and the next heading, and kept a trailing `---` on the last block. The
 * cross-reader corpus test `.claude/scripts/tests/sync-reader-parity.test.cjs` fails if
 * the JS and Python readers disagree on any canonical heading.
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
 * Index where the block that starts before `from` ends: the newline opening the first
 * `---` line (trailing spaces/tabs allowed, then a newline or EOF) or the first line that
 * starts with `## SYNC:`; `md.length` when neither follows. See BLOCK-END RULE above.
 *
 * @param {string} md   - LF-normalized markdown
 * @param {number} from - search start (the newline ending the block's heading line)
 * @returns {number}
 */
function findBlockEnd(md, from) {
    const re = /\n(?:---[ \t]*(?:\n|$)|## SYNC:)/g;
    re.lastIndex = from;
    const m = re.exec(md);
    return m ? m.index : md.length;
}

/**
 * Extract a SYNC block INCLUDING its `## SYNC:<tag>` heading line.
 * The block runs from the `## SYNC:<tag>` marker up to (but not including) its end
 * boundary (`findBlockEnd`), or EOF when nothing follows. Returns the `.trim()`-ed
 * slice, or `null` when the tag is absent.
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
    const end = findBlockEnd(md, start + marker.length);
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
