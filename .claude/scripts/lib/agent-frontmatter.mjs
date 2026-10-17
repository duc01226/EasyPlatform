/**
 * Agent frontmatter primitives — the ONE owner shared by every host mirror.
 *
 * `.claude/agents/*.md` is the canonical source for all host sub-agent mirrors
 * (`.codex/agents/*.toml` today, `.opencode/agent/*.md` alongside it). Both hosts must read the
 * SAME name/description out of the SAME YAML-ish header, so the parser lives here rather than
 * being reimplemented per host: two copies would drift exactly the way the double-quoted branch
 * below once drifted from the single-quoted one, rendering one description differently per
 * surface.
 *
 * Scope is deliberately narrow: this is a header reader for the framework's own agent files, not
 * a general YAML implementation. It supports `key: value` scalars, `>-`/`|`/`|-`/`>` block
 * headers with indented continuations, and quoted scalars; it does not parse nested maps, arrays,
 * or multi-line literals that preserve newlines.
 */

export function stripQuotes(value) {
    if (!value) return value;
    const trimmed = value.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        // Double-quoted YAML escapes with a backslash. De-wrapping alone leaked `\"` and `\/`
        // into the Codex mirror while the CLAUDE.md/AGENTS.md path decoded them, so the SAME
        // description rendered differently per surface — the exact defect class the single-quoted
        // branch below was fixed for, on the other branch.
        return trimmed
            .slice(1, -1)
            .replace(/\\(["\\/])/g, '$1')
            .trim();
    }
    if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
        // Decode YAML single-quoted escaping and collapse repeated double-escaping
        // introduced by legacy non-idempotent normalization. Cost of the repeat-until-stable
        // collapse: a description carrying two GENUINE consecutive apostrophes (`don''''t` in
        // YAML) over-collapses to one. Accepted — legacy double-escaping is real and observed,
        // consecutive literal apostrophes in a one-line description are not.
        let unescaped = trimmed.slice(1, -1).trim();
        let previous = '';
        while (unescaped !== previous) {
            previous = unescaped;
            unescaped = unescaped.replace(/''/g, "'");
        }
        return unescaped;
    }
    return trimmed;
}

export function parseFrontmatterBoolean(value) {
    if (typeof value !== 'string') return null;
    const normalized = stripQuotes(value).toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    return null;
}

export function parseFrontmatter(markdown) {
    const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!match) {
        return { frontmatter: {}, body: markdown.trim() };
    }

    const frontmatterText = match[1];
    const body = match[2].trim();
    const frontmatter = {};
    let currentKey = null;

    for (const line of frontmatterText.split(/\r?\n/)) {
        const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (keyMatch) {
            currentKey = keyMatch[1];
            const rawValue = keyMatch[2].trim();

            if (rawValue === '>-' || rawValue === '|' || rawValue === '|-' || rawValue === '>') {
                frontmatter[currentKey] = '';
            } else {
                frontmatter[currentKey] = stripQuotes(rawValue);
            }
            continue;
        }

        const continuation = line.match(/^\s+(.*)$/);
        if (continuation && currentKey) {
            const nextPart = stripQuotes(continuation[1]);
            if (!nextPart) continue;
            frontmatter[currentKey] = `${frontmatter[currentKey] ?? ''} ${nextPart}`.trim();
        }
    }

    return { frontmatter, body };
}

// Codex reads a skill's `agents/openai.yaml` instead of `disable-model-invocation`; this line in that
// file is the manual-only equivalent. Shared by the Codex mirror generator and its parity verifier.
export const CODEX_IMPLICIT_OFF_RE = /^\s*allow_implicit_invocation:\s*false\s*$/m;
