'use strict';

/**
 * Protocol delivery — pure planning logic (spec: the Protocol Delivery feature spec under the
 * business spec root, default `docs/specs`; `specRoots.business.path` in `docs/project-config.json`
 * overrides it — ContextDelivery/README.ProtocolDelivery.md, BR-PDL-01/03/04/05/06/08/10/11/15).
 *
 * For one hook event and one protocol group it:
 *   1. resolves the loaded skill(s) from the event (the only place untrusted event fields become
 *      file reads — names pass NAME_RULE and every file is contained in its framework folder);
 *   2. reads each skill's declared tags from its PROTOCOL-GUIDES block through the shared guide
 *      recognizer (never the path text of a guide line);
 *   3. looks each tag up in the published protocol index (unknown tags are dropped; text comes only
 *      from the projection files the index names);
 *   4. keeps this group's tags, drops explicit full-body skill exceptions, drops tags the ledger view reports
 *      as delivered, drops tags the starting agent already inlines as a full SYNC body, and drops trigger-gated tags
 *      (`trigger` in the group data) unless their trigger applies — the skill's guide line stays the
 *      path for those (see `triggerApplies`);
 *   5. packs the result into one message of at most `binChars` characters; what does not fit is
 *      named by its index path ("read these"), never dropped.
 *
 * Explicit inline-list exceptions receive nothing from role groups because they retain full bodies.
 * The live list is empty; review-family entrypoints declare guides with full-source fallback.
 * The universal bundle is not a skill-load group: `universal-delivery.cjs` delivers it on prompts and
 * sub-agent starts.
 *
 * Load cost (BR-PDL-09): the top level requires only Node built-ins. Project modules (the project
 * root resolver, the guide recognizer) are required inside the functions that need them.
 * The per-group entry files, the session ledger and stdin handling wrap this planner (`runHook`).
 */

const fs = require('node:fs');
const path = require('node:path');

// ── constants ───────────────────────────────────────────────────────────────

/** Skill names and agent types: lowercase letters, digits and hyphens, starting with a letter or digit. */
const NAME_RULE = /^[a-z0-9][a-z0-9-]*$/;
const NAME_MAX = 64;
/** Upper bound on distinct skill names taken from one event (a Codex prompt may hold many `$` tokens). */
const MAX_NAMES = 32;
/** The largest message the primary host shows in full is 10,000 characters; the bin never exceeds this. */
const MAX_BIN = 9500;

/** The hook-delivered bundle: never a skill-load group (`universal-delivery.cjs` owns it). */
const UNIVERSAL_GROUP = 'universal';

const SEG = Object.freeze({
    claudeSkills: ['.claude', 'skills'],
    claudeAgents: ['.claude', 'agents'],
    codexSkills: ['.agents', 'skills'],
    protocols: ['.claude', 'skills', 'shared', 'protocols']
});
const INDEX_REL = '.claude/skills/shared/protocols/index.json';
const GROUPS_REL = '.claude/skills/shared/protocol-groups.json';
const SKILL_FILE = 'SKILL.md';

// ── small helpers ───────────────────────────────────────────────────────────

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonBlank(value) {
    return typeof value === 'string' && value.trim() !== '';
}

/** BR-PDL-10: the one name check, applied before any name becomes part of a path. */
function isSafeName(value) {
    return typeof value === 'string' && value.length <= NAME_MAX && NAME_RULE.test(value);
}

function emptyPlan() {
    return { text: '', tags: [], full: [], named: [], summarized: [] };
}

/**
 * Absolute path of `segments` under `root`, or null when the result leaves `allowed` (a segment
 * list under root). Segment-aware, the `toRepoRelative` idiom of file-conventions.cjs.
 */
function containedPath(root, allowed, segments) {
    const base = path.resolve(root, ...allowed);
    const target = path.resolve(base, ...segments);
    const rel = path.relative(base, target);
    if (!rel || rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) return null;
    return target;
}

/**
 * Repo-relative segments of `filePath` (resolved against `base`), or null outside the root. Either
 * separator is accepted on every OS: a backslash is read as a separator, not a filename character.
 */
function repoSegments(filePath, root, base) {
    if (!nonBlank(filePath) || filePath.length > 4096) return null;
    const absolute = path.resolve(nonBlank(base) && path.isAbsolute(base) ? base : root, filePath.replace(/\\/g, '/'));
    const rel = path.relative(path.resolve(root), absolute);
    if (!rel || rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) return null;
    return rel.split(path.sep);
}

function sameSegment(a, b) {
    return a.toLowerCase() === b.toLowerCase();
}

/**
 * Skill name from a path of exactly `<skillsRoot>/<name>/SKILL.md` inside the project root, where
 * skillsRoot is one of `roots`. Anything else (another depth, another folder, an unsafe name) → null.
 */
function skillNameFromPath(filePath, root, base, roots) {
    const segments = repoSegments(filePath, root, base);
    if (!segments) return null;
    for (const prefix of roots) {
        if (segments.length !== prefix.length + 2) continue;
        if (!prefix.every((seg, i) => sameSegment(seg, segments[i]))) continue;
        if (!sameSegment(segments[segments.length - 1], SKILL_FILE)) continue;
        const name = segments[prefix.length];
        return isSafeName(name) ? name : null;
    }
    return null;
}

/** Path-like tokens of a shell command: quoted strings whole, otherwise split at shell delimiters. */
function commandTokens(command) {
    const tokens = [];
    const re = /"([^"]*)"|'([^']*)'|([^\s"'`;|&<>(),=]+)/g;
    let match;
    while ((match = re.exec(command)) !== null) {
        const token = match[1] ?? match[2] ?? match[3];
        if (token) tokens.push(token);
    }
    return tokens;
}

function pushName(names, name) {
    if (isSafeName(name) && !names.includes(name) && names.length < MAX_NAMES) names.push(name);
}

// ── host and event resolution ───────────────────────────────────────────────

/**
 * Host of an event. The prompt and shell-read load paths exist only on the second host (Codex);
 * Codex events also carry a `turn_id` that primary-host (Claude) events do not (confirmation-run probe logs).
 */
function detectHost(input) {
    if (!isPlainObject(input)) return 'claude';
    if (input.hook_event_name === 'UserPromptSubmit') return 'codex';
    if (input.hook_event_name === 'PostToolUse' && input.tool_name === 'Bash') return 'codex';
    return nonBlank(input.turn_id) ? 'codex' : 'claude';
}

function skillRootsFor(host) {
    return host === 'codex' ? [SEG.claudeSkills, SEG.codexSkills] : [SEG.claudeSkills];
}

/**
 * Parse an agent definition's YAML frontmatter for `name` and `skills` (inline `a, b`, `[a, b]` or
 * a block list). Returns null when there is no frontmatter.
 */
function parseAgentFrontmatter(text) {
    const lines = String(text).replace(/^﻿/, '').split(/\r?\n/);
    if (lines[0].trim() !== '---') return null;
    const end = lines.findIndex((line, i) => i > 0 && line.trim() === '---');
    if (end < 0) return null;
    const unquote = value => value.trim().replace(/^(['"])(.*)\1$/, '$2').trim();
    let name = null;
    let skills = [];
    for (let i = 1; i < end; i++) {
        const match = /^([A-Za-z_][\w-]*)[ \t]*:(.*)$/.exec(lines[i]);
        if (!match) continue;
        const key = match[1];
        const value = match[2].trim();
        if (key === 'name') name = unquote(value);
        if (key !== 'skills') continue;
        if (value) {
            skills = value.replace(/^\[/, '').replace(/\]$/, '').split(',').map(unquote).filter(Boolean);
        } else {
            skills = [];
            for (let j = i + 1; j < end; j++) {
                const item = /^[ \t]+-[ \t]*(.+)$/.exec(lines[j]);
                if (!item) break;
                skills.push(unquote(item[1]));
            }
        }
    }
    return { name, skills };
}

/** Upper bound on the event text scanned by a delivery trigger. */
const TRIGGER_TEXT_MAX = 20000;

/** Free text the event itself carries (skill arguments, typed-command arguments, a second-host prompt). */
function eventText(input) {
    const toolInput = isPlainObject(input.tool_input) ? input.tool_input : {};
    const parts = [toolInput.args, toolInput.arguments, input.command_args, input.prompt].filter(nonBlank);
    return parts.join('\n').slice(0, TRIGGER_TEXT_MAX);
}

/**
 * True when the agent definition carries the full SYNC body of `tag` between its paired fences
 * (the `:reminder` variant has another tag name, so it never counts as the body).
 */
function agentInlines(agentText, tag) {
    return typeof agentText === 'string'
        && agentText.includes(`<!-- SYNC:${tag} -->`)
        && agentText.includes(`<!-- /SYNC:${tag} -->`);
}

/**
 * Resolve the event to skill names. Opens at most the agent definition file, and only for a
 * SubagentStart whose agent type passes the name rule. `agentText` is the agent definition, set only
 * when its declared name equals the agent type.
 * @returns {{names: string[], agentText: string|null, text: string}}
 */
function resolveEvent(input, ctx) {
    const result = { names: [], agentText: null, text: '' };
    if (!isPlainObject(input)) return result;
    const event = input.hook_event_name;
    const toolInput = isPlainObject(input.tool_input) ? input.tool_input : {};
    const base = nonBlank(input.cwd) && path.isAbsolute(input.cwd) ? input.cwd : ctx.root;
    result.text = eventText(input);

    if (event === 'PostToolUse') {
        if (input.tool_name === 'Skill') {
            // Claude names the skill in `skill`; the OpenCode bridge in `name` (BR-PDL-10).
            pushName(result.names, typeof toolInput.skill === 'string' ? toolInput.skill : toolInput.name);
        } else if (input.tool_name === 'Read') {
            pushName(result.names, skillNameFromPath(toolInput.file_path, ctx.root, base, skillRootsFor(ctx.host)));
        } else if (input.tool_name === 'Bash' && typeof toolInput.command === 'string') {
            if (!/skill\.md/i.test(toolInput.command)) return result;
            for (const token of commandTokens(toolInput.command)) {
                pushName(result.names, skillNameFromPath(token, ctx.root, base, skillRootsFor(ctx.host)));
            }
        }
        return result;
    }
    if (event === 'UserPromptExpansion') {
        const command = typeof input.command_name === 'string' ? input.command_name.replace(/^\//, '') : '';
        pushName(result.names, command);
        return result;
    }
    if (event === 'UserPromptSubmit') {
        if (typeof input.prompt !== 'string' || !input.prompt.includes('$')) return result;
        const re = /\$([A-Za-z0-9][A-Za-z0-9_:.\\/-]*)/g;
        let match;
        while ((match = re.exec(input.prompt)) !== null) pushName(result.names, match[1].replace(/[.:]+$/, ''));
        return result;
    }
    if (event === 'SubagentStart') {
        const agentType = input.agent_type;
        if (!isSafeName(agentType)) return result;
        const file = containedPath(ctx.root, SEG.claudeAgents, [`${agentType}.md`]);
        const text = file && ctx.read(file);
        if (text === null || text === undefined) return result;
        const frontmatter = parseAgentFrontmatter(text);
        // Trust the file only when its declared name equals the agent type (the host's key).
        if (!frontmatter || frontmatter.name !== agentType) return result;
        result.agentText = text;
        for (const skill of frontmatter.skills) pushName(result.names, skill);
        return result;
    }
    return result;
}

// ── guide block ─────────────────────────────────────────────────────────────

let guideCarrier = null;

/**
 * The shared guide-carrier recognizer (`scripts/lib/protocol-guide-carrier.cjs`), the one owner of
 * the guide format, so delivery and the conversion tooling and verifiers can never disagree on
 * which skills are converted. Required on first use, never at the top level: the early-exit path
 * loads no project module (BR-PDL-09).
 */
function loadGuideCarrier() {
    if (!guideCarrier) guideCarrier = require('../../scripts/lib/protocol-guide-carrier.cjs');
    return guideCarrier;
}

/**
 * Tags a skill file declares as guide entries: the recognizer's well-formed guide lines inside
 * closed PROTOCOL-GUIDES blocks. The tag alone is used; the summary, when and path text are never
 * read as a file or repeated (BR-PDL-10), and a tag only ever selects a row of the protocol index.
 * @returns {string[]|null} tags in declared order (deduplicated), or null when the file declares no
 *   guide entry — no block, an empty or unclosed one, or only malformed lines. Such a skill is
 *   undeclared and receives nothing (BR-PDL-01), exactly as the conversion tooling counts it.
 */
function declaredTags(text) {
    const tags = loadGuideCarrier().guideTags(text);
    return tags.length ? tags : null;
}

// ── projection data ─────────────────────────────────────────────────────────

function readJson(ctx, rel) {
    const file = path.resolve(ctx.root, ...rel.split('/'));
    const text = ctx.read(file);
    if (text === null || text === undefined) return null;
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

/** Index rows keyed by tag; a row whose files leave the projection folder is dropped. */
function loadIndex(ctx) {
    const index = readJson(ctx, INDEX_REL);
    if (!isPlainObject(index) || !Array.isArray(index.tags) || !Array.isArray(index.groups)) return null;
    const rows = new Map();
    for (const row of index.tags) {
        if (!isPlainObject(row) || !isSafeName(row.tag) || typeof row.group !== 'string' || !Array.isArray(row.parts) || !row.parts.length) continue;
        const parts = [];
        let valid = true;
        for (const part of row.parts) {
            const rel = isPlainObject(part) && typeof part.file === 'string' ? part.file : null;
            const segments = rel ? rel.split('/') : null;
            const ok = segments
                && segments.length === SEG.protocols.length + 1
                && SEG.protocols.every((seg, i) => seg === segments[i])
                && /^[a-z0-9][a-z0-9.-]*\.md$/.test(segments[segments.length - 1]);
            const abs = ok ? containedPath(ctx.root, SEG.protocols, [segments[segments.length - 1]]) : null;
            if (!abs) {
                valid = false;
                break;
            }
            parts.push({ file: rel, abs });
        }
        if (valid) rows.set(row.tag, { tag: row.tag, group: row.group, parts });
    }
    const declaredBin = Number.isInteger(index.binChars) && index.binChars > 0 ? index.binChars : MAX_BIN;
    return { rows, groups: index.groups.filter(g => typeof g === 'string'), bin: Math.min(declaredBin, MAX_BIN) };
}

function loadInlineSkills(ctx) {
    const groups = readJson(ctx, GROUPS_REL);
    if (!isPlainObject(groups) || !Array.isArray(groups.inlineSkills)) return null;
    return new Set(groups.inlineSkills.filter(name => typeof name === 'string'));
}

// ── delivery triggers ───────────────────────────────────────────────────────

function compilePattern(source) {
    if (!nonBlank(source) || source.length > 4000) return null;
    try {
        return new RegExp(source, 'i');
    } catch {
        return null;
    }
}

/**
 * Trigger-gated tags from the group data: a tag entry naming `"trigger": "<name>"` is delivered in
 * full only when trigger `<name>` (top-level `deliveryTriggers`) applies. A trigger holds `pattern`
 * (matched against the event text and the session's recorded prompts), `pathPattern` (matched against
 * the recent transcript, i.e. files the session touched) and `skills` (loaded skills whose scope IS the
 * trigger's domain, which always receive the full text). A tag naming an unknown trigger, or a trigger
 * with no usable pattern, is delivered unconditionally: an unreadable rule never withholds a protocol.
 * @returns {Map<string, {patterns: RegExp[], pathPattern: RegExp|null, skills: Set<string>}>}
 */
function loadTriggers(ctx) {
    const triggers = new Map();
    const data = readJson(ctx, GROUPS_REL);
    if (!isPlainObject(data) || !isPlainObject(data.groups) || !isPlainObject(data.deliveryTriggers)) return triggers;
    for (const group of Object.values(data.groups)) {
        if (!isPlainObject(group) || !isPlainObject(group.tags)) continue;
        for (const [tag, entry] of Object.entries(group.tags)) {
            const def = isPlainObject(entry) && typeof entry.trigger === 'string' ? data.deliveryTriggers[entry.trigger] : null;
            if (!isPlainObject(def)) continue;
            const pattern = compilePattern(def.pattern);
            const pathPattern = compilePattern(def.pathPattern);
            if (!pattern && !pathPattern) continue;
            triggers.set(tag, {
                pattern,
                pathPattern,
                skills: new Set(Array.isArray(def.skills) ? def.skills.filter(name => typeof name === 'string') : [])
            });
        }
    }
    return triggers;
}

/**
 * Whether the trigger of a gated tag applies to this load: a loaded skill whose scope is the domain,
 * a keyword or file-name match in the event text or the session's recorded prompts, or a path match in
 * the recent transcript. `context` is lazy (`deps.triggerContext`), evaluated at most once per plan.
 * A context that cannot be read (`unreadable`) delivers unconditionally (BR-PDL-16): a failing rule
 * never withholds a protocol. A readable context with no match withholds: the skill's own guide line
 * stays the path to the protocol.
 */
function triggerApplies(def, resolved, context) {
    if (resolved.names.some(name => def.skills.has(name))) return true;
    if (def.pattern && def.pattern.test(resolved.text)) return true;
    const { prompts, transcript, unreadable } = context();
    if (unreadable) return true;
    if (def.pattern && def.pattern.test(prompts)) return true;
    return Boolean(def.pathPattern && (def.pathPattern.test(transcript) || def.pathPattern.test(prompts) || def.pathPattern.test(resolved.text)));
}

// ── pack ────────────────────────────────────────────────────────────────────

function partLabel(item) {
    return item.parts > 1 ? ` part ${item.part} of ${item.parts}` : '';
}

/**
 * The line that opens part 2 and later of a split protocol in a delivered message. The one owner of
 * that format: the projection build reserves its length when it sizes parts (BR-PDL-03), so a
 * labelled part still fits the bin.
 */
function continuationLabel(tag, part, parts) {
    return part > 1 ? `(\`${tag}\` continued,${partLabel({ part, parts })})\n` : '';
}

function fullBlock(item) {
    return continuationLabel(item.tag, item.part, item.parts) + item.text;
}

function nameLine(item) {
    return `- \`${item.tag}\`${partLabel(item)} → ${item.file}`;
}

/**
 * Render one message: the included full texts, then the rest named by path. When even the named
 * lines do not fit, the tail is summarised as "N more … → <index path>".
 * @returns {{text: string, summarized: number}|null} the message and how many named parts only the
 *   summary line counts; null when nothing fits within `bin`
 */
function render(items, include, opts) {
    const full = [];
    const named = [];
    items.forEach((item, i) => (include[i] ? full : named).push(item));
    const body = full.map(fullBlock).join('\n\n');
    if (!named.length) return body.length <= opts.bin ? { text: body, summarized: 0 } : null;
    const prefix = body ? `${body}\n\n` : '';
    const head = `Not included above, to stay within the ${opts.bin}-character delivery limit. Read each file now, before you continue:`;
    const lines = named.map(nameLine);
    const summary = rest => `- ${rest} more \`${opts.group}\` protocol entries → ${opts.indexPath}`;
    // Length of prefix + head + the first `keep` lines, each line after a '\n'.
    let length = prefix.length + head.length;
    const upTo = [length];
    for (const line of lines) upTo.push((length += 1 + line.length));
    for (let keep = lines.length; keep >= 0; keep--) {
        const rest = lines.length - keep;
        const total = upTo[keep] + (rest ? 1 + summary(rest).length : 0);
        if (total > opts.bin) continue;
        return { text: prefix + [head, ...lines.slice(0, keep), ...(rest ? [summary(rest)] : [])].join('\n'), summarized: rest };
    }
    return null;
}

/**
 * Pack protocol parts into one message of at most `opts.bin` characters (BR-PDL-03, BR-PDL-05).
 * Greedy in declared order: a part is included only when the whole message — with every part not
 * yet included named by path — still fits AND no more named parts fall into the anonymous summary
 * line than before. A full text never buys its place by un-naming another protocol: the summary
 * line appears only when the named lines alone (nothing in full) already exceed the bin. Once a part
 * of a tag is named, its later parts are named too. Every part therefore appears exactly once: as
 * full text, as a named path, or counted in the index-path summary line.
 * @param {Array<{tag:string, part:number, parts:number, file:string, text:string|null}>} items
 * @param {{bin:number, group:string, indexPath?:string}} opts
 * @returns {{text:string, tags:string[], full:string[], named:string[], summarized:string[]}}
 *   `named` = tags with at least one part listed by its own path; `summarized` = tags with at least
 *   one part counted only in the summary line (a split tag can be in both).
 */
function pack(items, opts) {
    const options = { indexPath: INDEX_REL, ...opts };
    options.bin = Math.min(Number.isInteger(options.bin) && options.bin > 0 ? options.bin : MAX_BIN, MAX_BIN);
    if (!Array.isArray(items) || !items.length) return emptyPlan();
    const include = new Array(items.length).fill(false);
    let current = render(items, include, options);
    if (current === null) return emptyPlan();
    const blocked = new Set();
    items.forEach((item, i) => {
        if (blocked.has(item.tag)) return;
        if (typeof item.text === 'string') {
            include[i] = true;
            const next = render(items, include, options);
            if (next !== null && next.summarized <= current.summarized) {
                current = next;
                return;
            }
            include[i] = false;
        }
        blocked.add(item.tag);
    });
    // The summary line counts the LAST `current.summarized` named parts (render keeps the head of the list).
    const namedItems = items.filter((_, i) => !include[i]);
    const listed = new Set(namedItems.slice(0, namedItems.length - current.summarized));
    const tags = [];
    const namedTags = [];
    const summarizedTags = [];
    items.forEach((item, i) => {
        if (!tags.includes(item.tag)) tags.push(item.tag);
        if (include[i]) return;
        const bucket = listed.has(item) ? namedTags : summarizedTags;
        if (!bucket.includes(item.tag)) bucket.push(item.tag);
    });
    const covered = tag => namedTags.includes(tag) || summarizedTags.includes(tag);
    return { text: current.text, tags, full: tags.filter(tag => !covered(tag)), named: namedTags, summarized: summarizedTags };
}

// ── plan ────────────────────────────────────────────────────────────────────

function defaultRead(file) {
    try {
        return fs.readFileSync(file, 'utf8');
    } catch {
        return null;
    }
}

function resolveRoot(input, deps) {
    if (nonBlank(deps.projectRoot)) return path.resolve(deps.projectRoot);
    try {
        const { resolveProjectRoot } = require('./project-root.cjs');
        const cwd = isPlainObject(input) && nonBlank(input.cwd) && path.isAbsolute(input.cwd) ? input.cwd : process.cwd();
        return resolveProjectRoot({ cwd }).rootDir;
    } catch {
        return null;
    }
}

/**
 * The lazy trigger context (`deps.triggerContext`) as `{prompts, transcript, unreadable}`. No provider
 * is an empty, readable context. A provider that throws, returns a non-object, or reports
 * `unreadable: true` yields an unreadable context, which `triggerApplies` treats as applying.
 */
function readTriggerContext(provider) {
    const empty = { prompts: '', transcript: '', unreadable: false };
    if (typeof provider !== 'function') return empty;
    try {
        const value = provider();
        if (!isPlainObject(value)) return { ...empty, unreadable: true };
        return {
            prompts: typeof value.prompts === 'string' ? value.prompts : '',
            transcript: typeof value.transcript === 'string' ? value.transcript : '',
            unreadable: value.unreadable === true
        };
    } catch {
        return { ...empty, unreadable: true };
    }
}

/**
 * Plan one group's delivery for one hook event. Pure apart from file reads through `deps.readFile`.
 *
 * @param {object} input  hook stdin JSON (untrusted)
 * @param {string} group  protocol group name (one of the index `groups`)
 * @param {object} [deps]
 * @param {string}   [deps.projectRoot]  absolute project root (default: resolved from `input.cwd`)
 * @param {Function} [deps.readFile]     (absPath) => string|null; every file open goes through it
 * @param {Function} [deps.isDelivered]  (tag) => boolean; ledger view — delivered tags are not packed
 * @param {string}   [deps.host]         'claude' | 'codex' | 'opencode' (default: detected from the event)
 * @param {Function} [deps.triggerContext]  () => {prompts, transcript}; lazy source for trigger-gated tags (default: none)
 * @returns {{text:string, tags:string[], full:string[], named:string[], summarized:string[]}} `tags` =
 *   every tag the message covers (full text, named path, or the summary line); `full` / `named` /
 *   `summarized` split it (a split tag can be in both `named` and `summarized`).
 */
function planDelivery(input, group, deps = {}) {
    try {
        return planDeliveryUnsafe(input, group, isPlainObject(deps) ? deps : {});
    } catch {
        return emptyPlan(); // BR-PDL-05: any error after the relevance check → nothing; guides remain
    }
}

function planDeliveryUnsafe(input, group, deps) {
    if (typeof group !== 'string' || !group || group === UNIVERSAL_GROUP) return emptyPlan();
    const root = resolveRoot(input, deps);
    if (!root) return emptyPlan();
    const reader = typeof deps.readFile === 'function' ? deps.readFile : defaultRead;
    const read = file => {
        const text = reader(file);
        return typeof text === 'string' ? text.replace(/\r\n/g, '\n') : null;
    };
    const ctx = {
        root,
        read,
        host: typeof deps.host === 'string' ? deps.host : detectHost(input)
    };
    const isDelivered = typeof deps.isDelivered === 'function' ? deps.isDelivered : () => false;

    const resolved = resolveEvent(input, ctx);
    if (!resolved.names.length) return emptyPlan();

    const index = loadIndex(ctx);
    if (!index || !index.groups.includes(group)) return emptyPlan();

    const inline = loadInlineSkills(ctx);
    if (!inline) return emptyPlan();
    const declared = [];
    let converted = 0;
    for (const name of resolved.names) {
        // BR-PDL-11: an inline skill keeps its role protocols as full bodies, so no group delivers to it.
        if (inline.has(name)) continue;
        const skillRoot = ctx.host === 'codex' ? SEG.codexSkills : SEG.claudeSkills;
        const file = containedPath(root, skillRoot, [name, SKILL_FILE]);
        const text = file && read(file);
        if (text === null || text === undefined) continue; // unresolved → its guides remain
        const skillTags = declaredTags(text);
        if (!skillTags) continue; // undeclared (pre-conversion) skill → inert (BR-PDL-01)
        converted += 1;
        for (const tag of skillTags) if (!declared.includes(tag)) declared.push(tag);
    }
    if (!converted) return emptyPlan();
    // Unknown tags are dropped; a universal tag is never a guide tag, so it never matches a skill group.
    let tags = declared.filter(tag => index.rows.get(tag)?.group === group);
    const triggers = loadTriggers(ctx);
    if (triggers.size) {
        let context = null;
        const lazy = () => context || (context = readTriggerContext(deps.triggerContext));
        tags = tags.filter(tag => !triggers.has(tag) || triggerApplies(triggers.get(tag), resolved, lazy));
    }
    // A tag the starting agent already carries as a full body is not delivered a second time.
    if (resolved.agentText) tags = tags.filter(tag => !agentInlines(resolved.agentText, tag));

    const items = [];
    for (const tag of tags) {
        let delivered = false;
        try {
            delivered = isDelivered(tag) === true;
        } catch {
            delivered = false; // an unusable ledger view delivers (BR-PDL-05)
        }
        if (delivered) continue;
        const row = index.rows.get(tag);
        row.parts.forEach((part, i) => {
            const raw = read(part.abs);
            items.push({
                tag,
                part: i + 1,
                parts: row.parts.length,
                file: part.file,
                text: typeof raw === 'string' ? raw.replace(/\n+$/, '') : null
            });
        });
    }
    return pack(items, { bin: index.bin, group, indexPath: INDEX_REL });
}

// ── hook entry: stdin, early exit, session ledger (runHook) ─────────────────
//
// Each `protocol-inject-<group>.cjs` entry file is three lines that call `runHook('<group>')`; the
// group is a literal there, never an argument, so every host's generated start command resolves to
// an existing file (BR-PDL-15). `runHook`:
//   1. reads stdin with node:fs, bounded to MAX_INPUT_BYTES;
//   2. ends with no output on an event that cannot load a skill, before any project module is
//      required (BR-PDL-09) — only Node built-ins and this file are loaded on that path;
//   3. plans the group's delivery with `planDelivery`, passing the session ledger as `isDelivered`
//      (BR-PDL-02: once per session per scope, re-armed by compaction and transcript distance);
//   4. claims each tag, prints one `additionalContext` message, and records each tag delivered in
//      full only after the write succeeded.
// A storage failure of the ledger delivers without de-duplication; only a live peer claim on the
// same tag skips it (BR-PDL-05). Any other error after the relevance check prints nothing.

/** The largest hook event read from stdin; a larger one is not a skill load and is ignored. */
const MAX_INPUT_BYTES = 1024 * 1024;
const INPUT_DEADLINE_MS = 2000;
const EAGAIN_WAIT_MS = 5;
/** Ledger store under the project root (`<project>/tmp/protocol-delivery`), not the shared OS temp dir. */
const STORE_SEGMENTS = Object.freeze(['tmp', 'protocol-delivery']);
/**
 * Re-arm settings (BR-PDL-02): the distance and compaction rules of the routing guidance. No age
 * re-arm: a host that cannot expose the transcript size keeps a delivery until compaction evidence —
 * a compaction mark in its conversation record (the ledger's built-in primary-host mark, or the
 * second-host (Codex) mark the ledger owns as `CODEX_COMPACTION_MARKER`), or a host report through
 * `recordCompaction` (the third host's bridge). Built on first use: requiring this lib loads no
 * project module (BR-PDL-09), and the ledger is loaded only when a delivery is planned anyway.
 */
let ledgerSettings = null;
function getLedgerSettings() {
    if (!ledgerSettings) {
        ledgerSettings = Object.freeze({
            reinjectAfterBytes: 4500000,
            reinjectAfterMinutes: null,
            blindReinjectAfterMinutes: null,
            compactionMarkers: Object.freeze([require('./convention-ledger.cjs').CODEX_COMPACTION_MARKER])
        });
    }
    return ledgerSettings;
}
/** A `skills/<name>/SKILL.md` path, either separator. */
const SKILL_FILE_PATH = /(?:^|[\\/])skills[\\/][^\\/]+[\\/]SKILL\.md$/i;
const SKILL_FILE_NAME = /skill\.md/i;

function sleepSync(ms) {
    try {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
    } catch {
        /* no blocking wait available: the deadline still bounds the loop */
    }
}

/**
 * The hook event from stdin, or null when it is empty, oversized, not a JSON object, or not ready
 * before the deadline. Reads with node:fs directly, so the early exit loads no helper module.
 */
function readHookInput(fd = 0) {
    try {
        const chunks = [];
        let total = 0;
        const buffer = Buffer.allocUnsafe(64 * 1024);
        const deadline = Date.now() + INPUT_DEADLINE_MS;
        while (true) {
            let bytesRead;
            try {
                bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null);
            } catch (err) {
                if (err && err.code === 'EAGAIN' && Date.now() < deadline) {
                    sleepSync(EAGAIN_WAIT_MS);
                    continue;
                }
                if (err && err.code === 'EOF') break;
                return null;
            }
            if (bytesRead === 0) break;
            total += bytesRead;
            if (total > MAX_INPUT_BYTES) return null;
            chunks.push(Buffer.from(buffer.subarray(0, bytesRead)));
        }
        const raw = Buffer.concat(chunks, total).toString('utf8').replace(/^﻿/, '');
        if (!raw.trim()) return null;
        const parsed = JSON.parse(raw);
        return isPlainObject(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

/**
 * BR-PDL-09 relevance check: true only for an event that can load a skill. Pure; opens no file.
 * The Skill tool names the skill in `skill` (primary host) or `name` (third host); a Read must name
 * a `skills/<name>/SKILL.md` path; a shell command must mention the skill file name anywhere
 * (whatever the shell or separator); a second-host prompt must contain `$`.
 */
function isRelevantEvent(input) {
    if (!isPlainObject(input)) return false;
    const toolInput = isPlainObject(input.tool_input) ? input.tool_input : {};
    switch (input.hook_event_name) {
        case 'PostToolUse':
            if (input.tool_name === 'Skill') return nonBlank(toolInput.skill) || nonBlank(toolInput.name);
            if (input.tool_name === 'Read') return nonBlank(toolInput.file_path) && SKILL_FILE_PATH.test(toolInput.file_path.trim());
            if (input.tool_name === 'Bash') return typeof toolInput.command === 'string' && SKILL_FILE_NAME.test(toolInput.command);
            return false;
        case 'UserPromptExpansion':
            return nonBlank(input.command_name);
        case 'UserPromptSubmit':
            return typeof input.prompt === 'string' && input.prompt.includes('$');
        case 'SubagentStart':
            return nonBlank(input.agent_type);
        default:
            return false;
    }
}

/** Every file read in one run goes through one cache, so the index is parsed from one read. */
function cachedReader(reader) {
    const cache = new Map();
    return file => {
        if (!cache.has(file)) cache.set(file, reader(file));
        return cache.get(file);
    };
}

/** True when `group` is a delivery group of the group data (`protocol-groups.json`). */
function isKnownGroup(root, read, group) {
    const text = read(path.resolve(root, ...GROUPS_REL.split('/')));
    if (typeof text !== 'string') return false;
    try {
        const data = JSON.parse(text);
        return isPlainObject(data) && isPlainObject(data.groups) && Object.prototype.hasOwnProperty.call(data.groups, group);
    } catch {
        return false;
    }
}

/** sha256 of a tag's published parts (LF, no trailing newlines): the content key of its delivery record. */
function tagHash(index, tag, readNormalized) {
    const crypto = require('node:crypto');
    const row = index && index.rows.get(tag);
    const hash = crypto.createHash('sha256');
    for (const part of row ? row.parts : []) {
        const text = readNormalized(part.abs);
        hash.update(typeof text === 'string' ? `${text.replace(/\n+$/, '')}\n\u0000` : '\u0001missing\u0000');
    }
    return hash.digest('hex');
}

/**
 * The delivery record of one tag, for a hook outside this planner that delivers the same protocol
 * (core-principles-inject delivers `core-engineering-principles`): the ledger store directory and the
 * content hash under which this planner records the tag, so both deliveries share ONE record and the
 * protocol reaches a session scope once per window whichever path ran first. `hash` is null when the
 * tag has no published projection (the caller then keeps a private record).
 * @returns {{root: string, group: string, hash: string|null}}
 */
function sharedRecordFor(projectRoot, tag, readFile = defaultRead) {
    const root = path.resolve(projectRoot);
    const read = file => {
        const text = readFile(file);
        return typeof text === 'string' ? text.replace(/\r\n/g, '\n') : null;
    };
    const index = loadIndex({ root, read });
    const hash = index && index.rows.has(tag) ? tagHash(index, tag, read) : null;
    return { root: path.join(root, ...STORE_SEGMENTS), group: tag, hash };
}

/** The protocol the concise universal core carries for every task (context-delivery `CORE_TAG`). */
const CORE_OWNED_TAG = 'core-engineering-principles';

/**
 * The session ledger view for one run (BR-PDL-02, BR-PDL-05). One record per tag, keyed by the
 * sha256 of the tag's published text, in `<store>/<session>/<scope>/<tag>.json`. Each tag belongs
 * to one group, so parallel group entries never share a record. Without a session id there is no
 * scope to remember in: every tag is delivered and nothing is recorded.
 *
 * `CORE_OWNED_TAG` also counts as delivered while the concise universal core is present in this
 * scope: that core carries the principles, and its own successful, current delivery record is the
 * only evidence accepted (a failed write, a compaction or another scope leaves the tag deliverable).
 * `profile` holds the delivery-profile inputs (`homeDir`, `config`) that decision reads.
 */
function openLedger(root, input, read, now, profile = {}) {
    const ledger = require('./convention-ledger.cjs');
    const store = path.join(root, ...STORE_SEGMENTS);
    const sessionId = nonBlank(input.session_id) ? input.session_id : null;
    const scope = ledger.scopeFor(input);
    const history = ledger.transcriptPathFor(input);
    const normalized = file => {
        const text = read(file);
        return typeof text === 'string' ? text.replace(/\r\n/g, '\n') : null;
    };
    const index = loadIndex({ root, read: normalized });
    let context = null;
    const ctx = () => context || (context = {
        lastCompactionAt: ledger.lastCompactionAt(store, sessionId, scope, input, getLedgerSettings(), now),
        transcriptSize: ledger.transcriptSize(history),
        now
    });
    const hashes = new Map();
    const hashFor = tag => {
        if (!hashes.has(tag)) hashes.set(tag, tagHash(index, tag, normalized));
        return hashes.get(tag);
    };
    const isRecorded = tag => sessionId !== null
        && ledger.isPresent(ledger.readRecord(store, sessionId, scope, tag), hashFor(tag), ctx(), getLedgerSettings());
    const coreCarries = tag => tag === CORE_OWNED_TAG
        && require('./universal-delivery.cjs').conciseCoreIsPresent(root, input, normalized, now, profile);
    const delivered = new Map();

    if (sessionId !== null) ledger.maybePrune(store, now);

    return {
        /** Ledger view for planDelivery; the answer per tag is fixed for the run. */
        isDelivered(tag) {
            if (!delivered.has(tag)) delivered.set(tag, isRecorded(tag) || coreCarries(tag));
            return delivered.get(tag);
        },
        /**
         * Claim each tag. A fresh lock file held by a peer drops the tag; any other failure to lock
         * (the store cannot be created or written) keeps it, delivered without a record.
         * @returns {{dropped: Set<string>, commit: Function, release: Function}}
         */
        claim(tags) {
            const claimed = [];
            const dropped = new Set();
            for (const tag of sessionId === null ? [] : tags) {
                const lock = ledger.lockFile(store, sessionId, scope, tag);
                const token = ledger.acquireLock(lock, now);
                if (token) {
                    // Post-lock re-check: a peer may have delivered between the check and the claim.
                    if (isRecorded(tag)) {
                        ledger.releaseLock(lock, token);
                        dropped.add(tag);
                    } else {
                        claimed.push({ tag, lock, token });
                    }
                    continue;
                }
                if (peerHoldsLock(lock, now, ledger.LOCK_STALE_MS) || isRecorded(tag)) dropped.add(tag);
            }
            return {
                dropped,
                commit(fullTags) {
                    for (const { tag } of claimed) {
                        if (!fullTags.includes(tag)) continue;
                        ledger.writeRecordAtomic(store, sessionId, scope, tag, {
                            hash: hashFor(tag),
                            deliveredAt: now,
                            transcriptBytes: ctx().transcriptSize,
                            form: 'full'
                        });
                    }
                },
                release() {
                    for (const { lock, token } of claimed) ledger.releaseLock(lock, token);
                }
            };
        }
    };
}

/** A lock file that exists and is younger than the stale limit: a live peer is delivering the tag. */
function peerHoldsLock(lock, now, staleMs) {
    try {
        const stat = fs.statSync(lock);
        return stat.isFile() && now - stat.mtimeMs < staleMs;
    } catch {
        return false;
    }
}

/** Most recent prompt records read from the session's prompt ledger for trigger matching. */
const TRIGGER_PROMPT_ENTRIES = 40;
/** Tail of the conversation record scanned for touched file paths. */
const TRIGGER_TRANSCRIPT_TAIL_BYTES = 128 * 1024;

/**
 * The lazy context of `triggerApplies`: the session's recorded prompts (prompt ledger, when the
 * project keeps one) and the tail of the conversation record. An ABSENT source (no session id, no
 * ledger, no record file) contributes nothing, which leaves a gated protocol to its guide line; a
 * source that EXISTS but fails to read marks the context `unreadable`, which delivers (BR-PDL-16).
 * @returns {{prompts: string, transcript: string, unreadable: boolean}}
 */
function buildTriggerContext(root, input, env) {
    const context = { prompts: '', transcript: '', unreadable: false };
    try {
        if (nonBlank(input.session_id)) {
            const store = require('./prompt-ledger-store.cjs');
            const { status, ledger } = store.readLedgerStatus(store.sessionDir(store.storeRoot(env, root), input.session_id));
            if (status === 'unreadable') context.unreadable = true;
            if (ledger) {
                context.prompts = ledger.entries.slice(-TRIGGER_PROMPT_ENTRIES)
                    .map(entry => (entry && typeof entry.text === 'string' ? entry.text : ''))
                    .join('\n')
                    .slice(0, TRIGGER_TEXT_MAX * 4);
            }
        }
    } catch {
        context.unreadable = true; // the prompt record store could not be read
    }
    try {
        const file = require('./convention-ledger.cjs').transcriptPathFor(input);
        if (file) {
            const fd = fs.openSync(file, 'r');
            try {
                const size = fs.fstatSync(fd).size;
                const length = Math.min(size, TRIGGER_TRANSCRIPT_TAIL_BYTES);
                const buffer = Buffer.alloc(length);
                fs.readSync(fd, buffer, 0, length, size - length);
                context.transcript = buffer.toString('utf8');
            } finally {
                fs.closeSync(fd);
            }
        }
    } catch (error) {
        if (!error || error.code !== 'ENOENT') context.unreadable = true; // a missing record is absent, not unreadable
    }
    return context;
}

function defaultHookWrite(text, done) {
    let settled = false;
    const finish = ok => {
        if (settled) return;
        settled = true;
        done(ok);
    };
    const onError = () => finish(false);
    process.stdout.once('error', onError);
    try {
        process.stdout.write(text, err => {
            // A failed write emits its stream error after the callback. Keep the
            // one-shot listener until that event; successful writes leave none.
            if (!err) process.stdout.removeListener('error', onError);
            finish(!err);
        });
    } catch {
        process.stdout.removeListener('error', onError);
        finish(false);
    }
}

function deliver(group, input, deps, finish) {
    const root = resolveRoot(input, deps);
    if (!root) return finish('');
    const read = cachedReader(typeof deps.readFile === 'function' ? deps.readFile : defaultRead);
    if (!isKnownGroup(root, read, group)) {
        const onError = () => {}; // a best-effort diagnostic never blocks the hook
        process.stderr.once('error', onError);
        try {
            process.stderr.write(`[protocol-delivery] unknown protocol group "${String(group).slice(0, 64)}": nothing delivered\n`, error => {
                if (!error) process.stderr.removeListener('error', onError);
            });
        } catch {
            process.stderr.removeListener('error', onError);
        }
        return finish('');
    }
    const now = typeof deps.now === 'number' ? deps.now : Date.now();
    const ledger = openLedger(root, input, read, now, require('./context-delivery.cjs').profileOptions(deps));
    const env = isPlainObject(deps.env) ? deps.env : process.env;
    let triggerContext = null;
    const provider = typeof deps.triggerContext === 'function' ? deps.triggerContext : () => buildTriggerContext(root, input, env);
    const planDeps = { ...deps, projectRoot: root, readFile: read, triggerContext: () => triggerContext || (triggerContext = provider()) };
    let plan = planDelivery(input, group, { ...planDeps, isDelivered: tag => ledger.isDelivered(tag) });
    if (!plan.text) return finish('');
    const claim = ledger.claim(plan.tags);
    try {
        if (claim.dropped.size) {
            plan = planDelivery(input, group, { ...planDeps, isDelivered: tag => claim.dropped.has(tag) || ledger.isDelivered(tag) });
        }
    } catch {
        plan = emptyPlan();
    }
    if (!plan.text) {
        claim.release();
        return finish('');
    }
    const payload = JSON.stringify({
        hookSpecificOutput: { hookEventName: input.hook_event_name, additionalContext: plan.text }
    });
    const write = typeof deps.write === 'function' ? deps.write : defaultHookWrite;
    write(payload, ok => {
        try {
            if (ok !== false) claim.commit(plan.full); // records only after the message was handed over
        } catch {
            /* an unrecorded delivery costs a duplicate, never a miss */
        } finally {
            claim.release();
        }
        finish(ok === false ? '' : payload);
    });
}

/**
 * Host-reported compaction of a session, for a host whose hook events carry no conversation record
 * to scan (the third host's bridge calls this on its session-compacted event). Stamps the session in
 * the delivery store, so every delivery made before it stops counting and the next load of a skill
 * delivers its protocols again (BR-PDL-02). A session with no delivery record has nothing to re-arm,
 * so nothing is written for it (no store is created in a project that never delivered).
 * Prints nothing and never throws.
 * @param {{session_id: string, cwd?: string}} input
 * @param {{projectRoot?: string, now?: number}} [deps]
 * @returns {boolean} true when the compaction was recorded
 */
function recordCompaction(input, deps = {}) {
    try {
        if (!isPlainObject(input) || !nonBlank(input.session_id)) return false;
        const options = isPlainObject(deps) ? deps : {};
        const root = resolveRoot(input, options);
        if (!root) return false;
        const ledger = require('./convention-ledger.cjs');
        const store = path.join(root, ...STORE_SEGMENTS);
        if (!fs.existsSync(ledger.sessionDir(store, input.session_id))) return false;
        const now = typeof options.now === 'number' ? options.now : Date.now();
        return ledger.recordSessionCompaction(store, input.session_id, now) === true;
    } catch {
        return false;
    }
}

/**
 * Hook entry for one protocol group. Always leaves exit code 0 (delivery never blocks).
 * @param {string} group  protocol group name (a key of protocol-groups.json `groups`)
 * @param {object} [deps] test seams: `input` (skips stdin), `write(text, done)`, `now`, the
 *   delivery-profile inputs `homeDir` and `config`, plus the planDelivery deps (`projectRoot`,
 *   `readFile`, `host`)
 * @returns {Promise<string>} the text written, or '' when nothing was delivered
 */
function runHook(group, deps = {}) {
    process.exitCode = 0;
    const options = isPlainObject(deps) ? deps : {};
    return new Promise(resolve => {
        let settled = false;
        const finish = value => {
            if (settled) return;
            settled = true;
            process.exitCode = 0;
            resolve(value);
        };
        try {
            const input = options.input !== undefined ? options.input : readHookInput();
            if (!isRelevantEvent(input)) return finish(''); // BR-PDL-09: no project module loaded
            const rootDir = resolveRoot(input, options);
            if (!rootDir || !require('./framework-runtime.cjs').isHookEnabled(`protocol-inject-${group}.cjs`, { rootDir })) return finish('');
            deliver(group, input, options, finish);
        } catch {
            finish(''); // BR-PDL-05: the skill's guide entries remain the path
        }
    });
}

module.exports = {
    runHook,
    recordCompaction,
    isRelevantEvent,
    getLedgerSettings,
    planDelivery,
    buildTriggerContext,
    sharedRecordFor,
    agentInlines,
    pack,
    continuationLabel,
    declaredTags,
    detectHost,
    isSafeName,
    parseAgentFrontmatter,
    resolveEvent,
    resolveRoot,
    readHookInput,
    loadIndex,
    defaultRead,
    STORE_SEGMENTS,
    MAX_BIN,
    INDEX_REL,
    GROUPS_REL
};
