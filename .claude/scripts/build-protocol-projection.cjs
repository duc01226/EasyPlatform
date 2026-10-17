#!/usr/bin/env node
'use strict';

/**
 * Protocol projection: one generated file per shared-protocol tag, plus a group index.
 *
 *   node .claude/scripts/build-protocol-projection.cjs           # write
 *   node .claude/scripts/build-protocol-projection.cjs --check   # read-only; exit 1 when stale or invalid
 *
 * Inputs (both under the project root):
 *   - `.claude/skills/shared/sync-inline-versions.md`: the canonical protocol text. A tag is a base
 *     `## SYNC:<tag>` block; its `:reminder` and `:full` variants are not projected.
 *   - `.claude/skills/shared/protocol-groups.json`: the group, one-line summary and `when` line of
 *     every tag, the bin size and the `inlineSkills` list. Authored once; this tool never writes it.
 *
 * Output (`.claude/skills/shared/protocols/`, fully generated, LF line endings, no timestamps):
 *   - `<tag>.md`: the tag's full condensed body. Guide lines point here, and a reader whose context lacks the text reads it.
 *   - `<tag>.part-<n>.md`: only for a tag over the bin. The body is cut at section starts (a
 *     markdown heading, or a line that opens with a bold lead such as `> **Rule:**` or
 *     `> 3. **Assign**`), and the sections are packed greedily so every part stays within the bin.
 *     A cut inside a fenced code block closes the fence at the end of one part and reopens it at
 *     the start of the next, so each part renders on its own.
 *   - `index.json`: `{binChars, groups, tags: [{tag, group, summary, when, chars, file, parts}]}`,
 *     rows sorted by tag. `parts` is always the list to deliver: `[{file, chars}]`, one entry
 *     (`file` itself) for a tag within the bin. Paths are project-root-relative POSIX paths.
 *
 * Failures (non-zero exit, nothing written): a tag with no group, a group entry naming an unknown
 * tag, a tag in two groups, an unknown group name, a `universal` group whose `bins` layout omits a
 * tag, repeats one, names a tag outside the group or renders over the bin, a bad summary or
 * `when` line, an `inlineSkills` entry that is not a skill name or has no `SKILL.md`, and a section
 * that alone exceeds the bin.
 *
 * `--check` builds in memory and compares with the files on disk; stale, missing or extra files
 * fail it. `.claude/scripts/tests/build-protocol-projection.test.cjs` runs `--check` over the real
 * tree inside the framework repo, so a canonical edit without a rebuild fails
 * `run-codex-sync.mjs --verify-only` (its `scripts-tests` stage).
 *
 * PORTABILITY CONTRACT: `node:` built-ins + `.cjs` modules inside `.claude/scripts/lib`, plus the
 * delivery libs `.claude/hooks/lib/protocol-delivery.cjs` (the continuation-label format) and
 * `.claude/hooks/lib/universal-delivery.cjs` (the universal bin format), both built-ins only at load. The project root comes from CLAUDE_PROJECT_DIR or the working
 * directory (`lib/project-root.cjs`).
 */

const fs = require('node:fs');
const path = require('node:path');
const { isInvokedAsScript, resolveMutationProjectRoot, resolveProjectRoot } = require('./lib/project-root.cjs');
const { extractSyncBody, normalizeEol } = require('./lib/extract-sync-block.cjs');
// The delivery lib owns the continuation-label format a split part is delivered with; it requires
// only Node built-ins at load (BR-PDL-09), so this costs no project module.
const { continuationLabel } = require('../hooks/lib/protocol-delivery.cjs');
const { UNIVERSAL_GROUP, renderBin } = require('../hooks/lib/universal-delivery.cjs');

const SHARED_RELATIVE = '.claude/skills/shared';
const CANONICAL_RELATIVE = `${SHARED_RELATIVE}/sync-inline-versions.md`;
const GROUPS_RELATIVE = `${SHARED_RELATIVE}/protocol-groups.json`;
const OUTPUT_RELATIVE = `${SHARED_RELATIVE}/protocols`;
const INDEX_NAME = 'index.json';
const SKILLS_RELATIVE = '.claude/skills';

/** The six delivery groups, in index order (P20 confirmed the count). */
const GROUP_NAMES = Object.freeze(['review', 'evidence-trace', 'workflow-task', 'spec-test', 'design', 'universal']);
/** Default bin when the groups file names none: the largest hook string every host delivers whole (P20). */
const DEFAULT_BIN_CHARS = 9500;
const NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
/** The guide line is `- \`tag\` — summary; when → path`, so these characters would break its parse. */
const GUIDE_ARROW = '→';
const PREFIX = 'protocol-projection:';

const byCodeUnit = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const isPlainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

// ─── Inputs ────────────────────────────────────────────────────────────────

/** Base tags of the canonical file, in file order: `## SYNC:<tag>` headings with no `:variant`. */
function canonicalTags(markdown) {
    const tags = [];
    const problems = [];
    for (const match of normalizeEol(markdown).matchAll(/^## SYNC:(\S+)[ \t]*$/gm)) {
        const heading = match[1];
        if (heading.includes(':')) continue;
        if (!NAME_PATTERN.test(heading)) problems.push(`canonical tag "${heading}" is not a valid tag name (${NAME_PATTERN})`);
        else if (tags.includes(heading)) problems.push(`canonical tag "${heading}" is defined twice`);
        else tags.push(heading);
    }
    return { tags, problems };
}

function checkLine(tag, field, value, problems) {
    if (typeof value !== 'string' || value.trim() === '') {
        problems.push(`tag "${tag}": ${field} must be a non-empty string`);
        return;
    }
    if (/[\r\n]/.test(value) || value.includes(GUIDE_ARROW)) problems.push(`tag "${tag}": ${field} must be one line without "${GUIDE_ARROW}"`);
    if (field === 'summary' && value.includes(';')) problems.push(`tag "${tag}": summary must not contain ";" (it ends the summary in a guide line)`);
}

/** The authored `bins` layout of the universal group: ordered tag lists, one message each. */
function checkUniversalBins(group, universal, problems) {
    const bins = isPlainObject(group) ? group.bins : undefined;
    if (!universal.length) problems.push('group "universal" holds no tags');
    if (!Array.isArray(bins) || !bins.length || bins.some(bin => !Array.isArray(bin) || !bin.length || bin.some(tag => typeof tag !== 'string'))) {
        problems.push('group "universal" needs a non-empty "bins" array of non-empty tag lists');
        return null;
    }
    const listed = bins.flat();
    for (const tag of listed) {
        if (!universal.includes(tag)) problems.push(`universal bins name tag "${tag}", which is not in the universal group`);
        if (listed.indexOf(tag) !== listed.lastIndexOf(tag)) problems.push(`universal bins list tag "${tag}" more than once`);
    }
    for (const tag of universal) {
        if (!listed.includes(tag)) problems.push(`universal tag "${tag}" is in no bin`);
    }
    return bins;
}

/**
 * Validate the groups data against the canonical tags and the skill tree.
 * @returns {{assignments: Map<string, {group: string, summary: string, when: string}>, binChars: number, bins: string[][]|null, problems: string[]}}
 */
function resolveGroups(data, tags, skillExists) {
    const problems = [];
    const assignments = new Map();
    if (!isPlainObject(data)) return { assignments, binChars: DEFAULT_BIN_CHARS, bins: null, problems: ['the groups file must be a JSON object'] };

    const binChars = data.binChars === undefined ? DEFAULT_BIN_CHARS : data.binChars;
    if (!Number.isInteger(binChars) || binChars < 1 || binChars > DEFAULT_BIN_CHARS) {
        problems.push(`binChars must be a positive integer no greater than ${DEFAULT_BIN_CHARS}`);
    }

    const groups = isPlainObject(data.groups) ? data.groups : {};
    if (!isPlainObject(data.groups)) problems.push('groups must be an object keyed by group name');
    for (const name of Object.keys(groups)) {
        if (!GROUP_NAMES.includes(name)) problems.push(`unknown group "${name}" (groups: ${GROUP_NAMES.join(', ')})`);
    }
    for (const name of GROUP_NAMES) {
        const group = groups[name];
        if (!isPlainObject(group) || !isPlainObject(group.tags)) {
            problems.push(`group "${name}" is missing or has no tags object`);
            continue;
        }
        for (const [tag, entry] of Object.entries(group.tags)) {
            if (!tags.includes(tag)) {
                problems.push(`group "${name}" lists tag "${tag}", which ${CANONICAL_RELATIVE} does not define`);
                continue;
            }
            if (assignments.has(tag)) {
                problems.push(`tag "${tag}" is in two groups: "${assignments.get(tag).group}" and "${name}"`);
                continue;
            }
            const summary = isPlainObject(entry) ? entry.summary : undefined;
            const when = isPlainObject(entry) ? entry.when : undefined;
            checkLine(tag, 'summary', summary, problems);
            checkLine(tag, 'when', when, problems);
            assignments.set(tag, { group: name, summary, when });
        }
    }
    for (const tag of tags) {
        if (!assignments.has(tag)) problems.push(`tag "${tag}" has no group; add it to ${GROUPS_RELATIVE}`);
    }

    const universal = [...assignments].filter(([, a]) => a.group === UNIVERSAL_GROUP).map(([tag]) => tag);
    const bins = checkUniversalBins(groups[UNIVERSAL_GROUP], universal, problems);

    if (!Array.isArray(data.inlineSkills)) problems.push('inlineSkills must be an array of skill names');
    else {
        for (const name of data.inlineSkills) {
            if (typeof name !== 'string' || !NAME_PATTERN.test(name)) problems.push(`inlineSkills entry ${JSON.stringify(name)} is not a skill name (${NAME_PATTERN})`);
            else if (!skillExists(name)) problems.push(`inlineSkills entry "${name}" has no ${SKILLS_RELATIVE}/${name}/SKILL.md`);
        }
    }
    return { assignments, binChars, bins, problems };
}

// ─── Section split ─────────────────────────────────────────────────────────

/** Leading blockquote markers of a line (`> `, `>> `, `> > `). */
function quotePrefix(line) {
    return /^(?:[ \t]*>[ \t]?)*/.exec(line)[0];
}

/** A fence line (``` or ~~~, up to three spaces of indent) inside its blockquote prefix, or null. */
function fenceOf(line) {
    const prefix = quotePrefix(line);
    const match = /^( {0,3})(`{3,}|~{3,})(.*)$/.exec(line.slice(prefix.length));
    if (!match) return null;
    return { prefix: prefix + match[1], char: match[2][0], length: match[2].length, rest: match[3] };
}

/** A line that opens a section: a markdown heading, or a bold lead after an optional list marker. */
function isSectionStart(line) {
    const content = line.slice(quotePrefix(line).length).trimStart();
    return /^#{1,6}\s/.test(content) || /^(?:(?:\d+[.)]|[-*+])\s+)?\*\*\S/.test(content);
}

/**
 * For each line, the fence open at its start (`null` outside a fence), plus the section-start
 * line indexes. Fence lines are never section starts.
 */
function scanLines(lines) {
    const openAt = new Array(lines.length + 1).fill(null);
    const starts = [];
    let open = null;
    lines.forEach((line, index) => {
        openAt[index] = open;
        const fence = fenceOf(line);
        if (open && fence && fence.char === open.char && fence.length >= open.length && fence.rest.trim() === '') {
            open = null;
            return;
        }
        if (!open && fence) {
            open = { opener: line, closer: fence.prefix + fence.char.repeat(fence.length), char: fence.char, length: fence.length };
            return;
        }
        // A heading inside a fence still starts a section: the part framing closes and reopens the fence.
        if (index > 0 && isSectionStart(line)) starts.push(index);
    });
    openAt[lines.length] = open;
    return { openAt, starts };
}

/** Text of lines [from, to), trailing blank lines dropped, with fence framing where the cut is inside a fence. */
function partText(lines, openAt, from, to) {
    const slice = lines.slice(from, to);
    while (slice.length && slice[slice.length - 1].trim() === '') slice.pop();
    if (openAt[from]) slice.unshift(openAt[from].opener);
    if (openAt[to]) slice.push(openAt[to].closer);
    return slice.join('\n');
}

/**
 * Characters a continued part (part 2 and later) must leave free in the bin: delivery opens such a
 * part with a continuation label (`continuationLabel`, owned by the delivery lib), and the labelled
 * part is what has to fit one message (BR-PDL-03). The part count is bounded by the section count,
 * so the label is measured at that bound — never shorter than the label actually used.
 */
function continuationReserve(tag, maxParts) {
    const bound = Math.max(2, maxParts);
    return continuationLabel(tag, bound, bound).length;
}

/**
 * Split a body into parts cut only at section starts: the first part is at most `binChars`, and
 * every later part at most `binChars` minus its continuation-label reserve, so each part fits the
 * bin as delivered.
 * @returns {string[]} one element (the body) when it fits
 * @throws when one section alone does not fit (a continued part counting its label)
 */
function splitIntoParts(body, binChars, tag = 'tag') {
    if (body.length <= binChars) return [body];
    const lines = body.split('\n');
    const { openAt, starts } = scanLines(lines);
    const bounds = [0, ...starts, lines.length];
    const reserve = continuationReserve(tag, bounds.length - 1);
    const parts = [];
    let from = 0;
    let boundIndex = 1;
    while (from < lines.length) {
        const room = parts.length ? binChars - reserve : binChars;
        let to = null;
        while (boundIndex < bounds.length && partText(lines, openAt, from, bounds[boundIndex]).length <= room) {
            to = bounds[boundIndex];
            boundIndex += 1;
        }
        if (to === null) {
            const first = lines[from].trim();
            const labelNote = parts.length ? ` (a continued part keeps ${reserve} chars for its delivery label)` : '';
            throw new Error(
                `tag "${tag}": the section at line ${from + 1} (${JSON.stringify(first.length > 60 ? `${first.slice(0, 60)}…` : first)}) ` +
                    `is over the ${binChars}-char bin on its own${labelNote}; add a heading or a bold-lead line inside it in ${CANONICAL_RELATIVE}`
            );
        }
        parts.push(partText(lines, openAt, from, to));
        from = to;
    }
    return parts;
}

// ─── Projection ────────────────────────────────────────────────────────────

/**
 * Build the projection in memory.
 * @param {{canonicalText: string, groupsData: object, skillExists: (name: string) => boolean}} input
 * @returns {{files: Map<string, string>, problems: string[], stats: {tags: number, split: number}}}
 *   `files` maps a file name inside the output directory to its LF content.
 */
function buildProjection({ canonicalText, groupsData, skillExists }) {
    const files = new Map();
    const { tags, problems } = canonicalTags(canonicalText);
    const resolved = resolveGroups(groupsData, tags, skillExists);
    problems.push(...resolved.problems);
    if (problems.length) return { files, problems, stats: { tags: tags.length, split: 0 } };

    const { assignments, binChars, bins } = resolved;
    const rows = [];
    const bodies = new Map();
    let split = 0;
    for (const tag of [...tags].sort(byCodeUnit)) {
        const body = extractSyncBody(canonicalText, tag);
        if (body) bodies.set(tag, body);
        if (!body) {
            problems.push(`tag "${tag}" has an empty body in ${CANONICAL_RELATIVE}`);
            continue;
        }
        const fileName = `${tag}.md`;
        files.set(fileName, `${body}\n`);
        let partTexts;
        try {
            partTexts = splitIntoParts(body, binChars, tag);
        } catch (error) {
            problems.push(error.message);
            continue;
        }
        const parts =
            partTexts.length === 1
                ? [{ file: `${OUTPUT_RELATIVE}/${fileName}`, chars: body.length }]
                : partTexts.map((text, index) => {
                      const partName = `${tag}.part-${index + 1}.md`;
                      files.set(partName, `${text}\n`);
                      return { file: `${OUTPUT_RELATIVE}/${partName}`, chars: text.length };
                  });
        if (partTexts.length > 1) split += 1;
        const { group, summary, when } = assignments.get(tag);
        rows.push({ tag, group, summary, when, chars: body.length, file: `${OUTPUT_RELATIVE}/${fileName}`, parts });
    }
    bins.forEach((bin, i) => {
        if (!bin.every(tag => bodies.has(tag))) return;
        const length = renderBin(i + 1, bins.length, bin.map(tag => bodies.get(tag))).length;
        if (length > binChars) {
            problems.push(`universal bin ${i + 1} (${bin.join(', ')}) renders ${length} chars, over the ${binChars}-char bin; move a tag to another bin in ${GROUPS_RELATIVE}`);
        }
    });
    if (problems.length) return { files: new Map(), problems, stats: { tags: tags.length, split } };

    const index = {
        _description: `Generated by node .claude/scripts/build-protocol-projection.cjs from ${CANONICAL_RELATIVE} and ${GROUPS_RELATIVE}; do not edit. Deliver each row's parts in order; each part is at most binChars characters.`,
        binChars,
        groups: GROUP_NAMES,
        tags: rows
    };
    files.set(INDEX_NAME, `${JSON.stringify(index, null, 2)}\n`);
    return { files, problems, stats: { tags: rows.length, split } };
}

/** Read the inputs under `rootDir` and build. Missing or malformed inputs become problems. */
function buildFromRoot(rootDir) {
    const read = rel => fs.readFileSync(path.join(rootDir, ...rel.split('/')), 'utf8');
    let canonicalText;
    let groupsData;
    try {
        canonicalText = read(CANONICAL_RELATIVE);
    } catch (error) {
        return { files: new Map(), problems: [`cannot read ${CANONICAL_RELATIVE}: ${error.message}`], stats: { tags: 0, split: 0 } };
    }
    try {
        groupsData = JSON.parse(read(GROUPS_RELATIVE));
    } catch (error) {
        return { files: new Map(), problems: [`cannot read ${GROUPS_RELATIVE}: ${error.message}`], stats: { tags: 0, split: 0 } };
    }
    const skillExists = name => {
        try {
            return fs.statSync(path.join(rootDir, ...SKILLS_RELATIVE.split('/'), name, 'SKILL.md')).isFile();
        } catch {
            return false;
        }
    };
    return buildProjection({ canonicalText, groupsData, skillExists });
}

/** Generated files currently in the output directory (`.md` and `.json` at its top level). */
function existingOutputFiles(outputDir) {
    try {
        return fs
            .readdirSync(outputDir, { withFileTypes: true })
            .filter(entry => entry.isFile() && /\.(md|json)$/.test(entry.name))
            .map(entry => entry.name)
            .sort(byCodeUnit);
    } catch (error) {
        if (error.code === 'ENOENT') return [];
        throw error;
    }
}

/** Compare the built files with disk. Line endings are normalized, so a CRLF checkout is not drift. */
function diffAgainstDisk(outputDir, files) {
    const drift = [];
    for (const [name, content] of [...files].sort(([a], [b]) => byCodeUnit(a, b))) {
        let current;
        try {
            current = fs.readFileSync(path.join(outputDir, name), 'utf8');
        } catch {
            drift.push(`missing: ${OUTPUT_RELATIVE}/${name}`);
            continue;
        }
        if (normalizeEol(current) !== content) drift.push(`stale: ${OUTPUT_RELATIVE}/${name}`);
    }
    for (const name of existingOutputFiles(outputDir)) {
        if (!files.has(name)) drift.push(`extra: ${OUTPUT_RELATIVE}/${name}`);
    }
    return drift;
}

function writeProjection(outputDir, files) {
    fs.mkdirSync(outputDir, { recursive: true });
    let written = 0;
    for (const [name, content] of files) {
        const target = path.join(outputDir, name);
        let current = null;
        try {
            current = fs.readFileSync(target, 'utf8');
        } catch {}
        if (current === content) continue;
        fs.writeFileSync(target, content, 'utf8');
        written += 1;
    }
    let removed = 0;
    for (const name of existingOutputFiles(outputDir)) {
        if (files.has(name)) continue;
        fs.rmSync(path.join(outputDir, name));
        removed += 1;
    }
    return { written, removed };
}

function main(argv = process.argv.slice(2)) {
    const unknown = argv.filter(arg => arg !== '--check');
    if (unknown.length) {
        process.stderr.write(`${PREFIX} unknown argument(s): ${unknown.join(' ')}\nusage: node .claude/scripts/build-protocol-projection.cjs [--check]\n`);
        return 2;
    }
    const check = argv.includes('--check');
    let rootDir;
    try {
        rootDir = check ? resolveProjectRoot({ scriptPath: __filename }) : resolveMutationProjectRoot({ scriptPath: __filename });
        if (rootDir.error) throw new Error(rootDir.error);
        rootDir = rootDir.rootDir;
    } catch (error) {
        process.stderr.write(`${PREFIX} ${error.message}\n`);
        return 1;
    }

    const { files, problems, stats } = buildFromRoot(rootDir);
    if (problems.length) {
        process.stderr.write(`${PREFIX} ${problems.length} problem(s); nothing ${check ? 'checked' : 'written'}:\n${problems.map(p => `  - ${p}`).join('\n')}\n`);
        return 1;
    }
    const outputDir = path.join(rootDir, ...OUTPUT_RELATIVE.split('/'));
    if (check) {
        const drift = diffAgainstDisk(outputDir, files);
        if (drift.length) {
            process.stderr.write(
                `${PREFIX} the projection is stale (${drift.length} file(s)); run node .claude/scripts/build-protocol-projection.cjs\n` +
                    drift.map(line => `  - ${line}`).join('\n') +
                    '\n'
            );
            return 1;
        }
        process.stdout.write(`${PREFIX} up to date (${stats.tags} tags, ${stats.split} split, ${files.size} files)\n`);
        return 0;
    }
    const { written, removed } = writeProjection(outputDir, files);
    process.stdout.write(`${PREFIX} ${stats.tags} tags, ${stats.split} split, ${files.size} files; ${written} written, ${removed} removed\n`);
    return 0;
}

module.exports = {
    DEFAULT_BIN_CHARS,
    GROUP_NAMES,
    OUTPUT_RELATIVE,
    buildFromRoot,
    buildProjection,
    canonicalTags,
    diffAgainstDisk,
    isSectionStart,
    splitIntoParts
};

if (isInvokedAsScript(process.argv[1], __filename)) process.exitCode = main();
