'use strict';

/**
 * Guide-carrier recognizer: "does this file carry protocol X as a guide entry?"
 *
 * A converted skill carries a shared protocol as ONE guide line inside its PROTOCOL-GUIDES block
 * instead of the full `<!-- SYNC:tag -->` body. Hooks deliver the full text; the line is the
 * fallback pointer. `sync-update-blocks.py --mode=guide` writes the lines through
 * `format_guide_line` in `.claude/scripts/sync_blocks.py`; this module is that recognizer's
 * JavaScript twin. The two are the ONLY owners of the format — sensors and injectors call them and
 * never copy the regex. The twin-parity case in
 * `.claude/scripts/tests/sync-update-blocks-guide.test.cjs` fails when the two disagree.
 *
 * Line format:  - `tag` — summary; when → path
 * `summary` holds no `;`, neither text holds `→` or a line break (enforced where the text is
 * authored, `.claude/skills/shared/protocol-groups.json`), and the path must end in `<tag>.md`,
 * so a line cannot name one protocol while pointing at another's file.
 *
 * Retired pointer line. The protocols of the `universal` group (`protocol-groups.json`) are delivered
 * by the universal hook; no skill or agent carries a body, a `:reminder`, a guide line or a
 * `> **Root-carried protocols** — …` pointer line for them. `hasRootPointer` and `rootPointerLines`
 * recognize that retired line so a guard can fail when one reappears; they are the twins of
 * `sync_blocks.has_root_pointer` / `root_pointer_lines`, and the twin-parity case in
 * `.claude/scripts/tests/sync-update-blocks-guide.test.cjs` fails when the two disagree.
 *
 * Pure text functions: nothing here reads a file or resolves a path taken from a guide line.
 */

const GUIDE_BLOCK_START = '<!-- PROTOCOL-GUIDES:START -->';
const GUIDE_BLOCK_END = '<!-- PROTOCOL-GUIDES:END -->';

const GUIDE_BLOCK_RE = /^[ \t]*<!-- PROTOCOL-GUIDES:START -->[ \t]*$([\s\S]*?)^[ \t]*<!-- PROTOCOL-GUIDES:END -->[ \t]*$/gm;
const ROOT_POINTER_RE = /^> \*\*Root-carried protocols\*\* — [^\n]*$/m;
const GUIDE_LINE_RE = /^- `([a-z0-9][a-z0-9-]*)` — ([^;\n→]+?); ([^\n→]+?) → (\S+)[ \t]*$/gm;

/** Well-formed guide lines in one block body, as `{tag, line, summary, when, path}` rows. */
function parseGuideLines(blockBody) {
    const out = [];
    for (const m of String(blockBody).matchAll(GUIDE_LINE_RE)) {
        const [line, tag, summary, when, guidePath] = m;
        // The path must name this tag's own file (`<tag>.md`, any directory spelling, so a host
        // mirror's path rewrite still counts).
        if (guidePath.replace(/\\/g, '/').split('/').pop() === `${tag}.md`) out.push({ tag, line, summary, when, path: guidePath });
    }
    return out;
}

/** Map of tag → guide line for every well-formed guide line inside a PROTOCOL-GUIDES block. */
function guideEntries(text) {
    const normalized = String(text ?? '').replace(/\r\n?/g, '\n');
    const entries = new Map();
    for (const block of normalized.matchAll(GUIDE_BLOCK_RE)) {
        for (const { tag, line } of parseGuideLines(block[1])) {
            if (!entries.has(tag)) entries.set(tag, line);
        }
    }
    return entries;
}

/** Tags the text carries as guide entries, in first-seen order. */
function guideTags(text) {
    return [...guideEntries(text).keys()];
}

/** True when the text carries `tag` as a guide entry. */
function hasGuideEntry(text, tag) {
    return guideEntries(text).has(tag);
}

/** True when the text carries the retired pointer line (the twin of `sync_blocks.has_root_pointer`). */
function hasRootPointer(text) {
    return ROOT_POINTER_RE.test(String(text ?? '').replace(/\r\n?/g, '\n'));
}

/** Every pointer-shaped line in the text (a duplicate counts), the twin of `sync_blocks.root_pointer_lines`. */
function rootPointerLines(text) {
    const re = new RegExp(ROOT_POINTER_RE.source, 'gm');
    return String(text ?? '').replace(/\r\n?/g, '\n').match(re) || [];
}

/**
 * The one guide line for a tag; throws unless the recognizer reads back exactly the fields given
 * (a `;` in the summary, for example, would silently shift text into the when field).
 */
function formatGuideLine({ tag, summary, when, path: guidePath }) {
    const line = `- \`${tag}\` — ${summary}; ${when} → ${guidePath}`;
    const parsed = parseGuideLines(line);
    const row = parsed.length === 1 ? parsed[0] : null;
    if (!row || row.tag !== tag || row.summary !== summary || row.when !== when || row.path !== guidePath) {
        throw new Error(`guide line for ${JSON.stringify(tag)} does not match the guide format: ${JSON.stringify(line)}`);
    }
    return line;
}

module.exports = {
    GUIDE_BLOCK_START,
    GUIDE_BLOCK_END,
    formatGuideLine,
    guideEntries,
    guideTags,
    hasGuideEntry,
    hasRootPointer,
    rootPointerLines
};
