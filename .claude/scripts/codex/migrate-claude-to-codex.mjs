#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { buildSkillReferenceMap, prependCodexCompatibilityNote, rewriteClaudeToolTermsForCodex, rewriteSkillMentionsForCodex } from './compat-rewrite.mjs';
import { CODEX_IMPLICIT_OFF_RE, parseFrontmatter, parseFrontmatterBoolean, stripQuotes } from '../lib/agent-frontmatter.mjs';
import { writeFileTransientSafe } from '../lib/write-file-transient-safe.mjs';
import { isOsMetadataFileName } from '../lib/os-metadata-files.mjs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { hasConciseInstructions } = require('../lib/skill-instruction-profile.cjs');
const { resolveMutationProjectRoot, isInvokedAsScript } = require('../lib/project-root.cjs');
const rootResolution = resolveMutationProjectRoot({
    cwd: process.cwd(),
    scriptPath: fileURLToPath(import.meta.url),
    env: process.env
});
const rootDir = rootResolution.rootDir;
const invokedAsScript = isInvokedAsScript(process.argv[1], fileURLToPath(import.meta.url));

const args = new Set(process.argv.slice(2));
const MIGRATION_FLAGS = new Set(['--no-skills', '--copy-skills', '--normalize-source-skills']);
const MIGRATION_USAGE = 'Usage: node .claude/scripts/codex/migrate-claude-to-codex.mjs [--no-skills] [--copy-skills] [--normalize-source-skills]';

function validateCliArgs(argv) {
    const seen = new Set();
    for (const arg of argv) {
        if (!MIGRATION_FLAGS.has(arg)) throw new Error(`unknown option: ${arg}`);
        if (seen.has(arg)) throw new Error(`duplicate option: ${arg}`);
        seen.add(arg);
    }
}

export const claudeAgentsDir = path.join(rootDir, '.claude', 'agents');
export const claudeSkillsDir = path.join(rootDir, '.claude', 'skills');
export const codexAgentsDir = path.join(rootDir, '.codex', 'agents');
export const agentsSkillsDir = path.join(rootDir, '.agents', 'skills');
const codexConfigPath = path.join(rootDir, '.codex', 'config.toml');
const codexScriptsDir = path.join(rootDir, '.codex', 'scripts', 'codex');
// Retired helper: earlier syncs installed it as Codex's legacy `notify` command. Codex runs that
// command after every turn of every thread, delegated subagent threads included, and it duplicated
// the main-thread Stop/SessionEnd hook alerts, so each sync now removes the copy and its config line.
const legacyNotificationScriptPath = path.join(codexScriptsDir, 'codex-notify.mjs');
const LEGACY_NOTIFY_ARGV = ['node', '.codex/scripts/codex/codex-notify.mjs'];
const LEGACY_NOTIFY_COMMENT = '# Shared completion notifications. Codex passes a JSON payload to this command.';
// Retired pin: earlier bundles set a top-level auto-compaction budget, which overrides the host's
// own default and any value a user sets elsewhere. The bundle pins none now, so each sync removes
// the key — together with the comment block the bundle's config carried above it — but only while
// both still read exactly as the bundle wrote them. Any other value belongs to the project and stays.
const RETIRED_COMPACTION_KEY = 'model_auto_compact_token_limit';
const RETIRED_COMPACTION_VALUE = '500000';
const RETIRED_COMPACTION_COMMENT = [
    '# Auto-compaction budget — 500K tokens, matching the Claude Code',
    '# CLAUDE_CODE_AUTO_COMPACT_WINDOW and the opencode model limit.context so all three',
    '# surfaces of the portable framework compact at the same point.',
    '# Scope defaults to "total" (full active context).',
];
const agentsSkillsMirrorSentinelPath = path.join(agentsSkillsDir, '.codex-mirror.json');

const useSkills = !args.has('--no-skills');
const copySkills = args.has('--copy-skills');
const normalizeSourceSkills = args.has('--normalize-source-skills');
const MIRROR_EXCLUDED_DIRS = new Set(['.git', '.hg', '.svn', '.venv', 'node_modules', '__pycache__']);
// Package-manager lockfiles are local install artifacts: `.claude/.gitignore` keeps them out of the
// source tree, so mirroring them from disk would track files a clean checkout never has and make
// the sync-divergence gate pass only on a developer machine.
const MIRROR_EXCLUDED_FILES = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']);
// Retire the allowance shipped for the old 80 KiB projection. Project-only instructions now
// fit the host default; sync must not raise a user's chosen instruction budget.
const RETIRED_DOC_BUDGET_KEY = 'project_doc_max_bytes';
const RETIRED_DOC_BUDGET_VALUE = '98304';
const RUNTIME_ONLY_SKILL_FILES = new Set([path.normalize(path.join('shared', 'workflow-first-gate.md'))]);
const agentsMirrorGitignorePath = path.join(path.dirname(agentsSkillsDir), '.gitignore');

/**
 * True for a local install/VCS artifact (lockfile, node_modules, venv, …) at any depth — never
 * mirrored, and ignored when a mirror is compared, because it exists only on a machine that
 * installed dependencies. Accepts native or `/` separators.
 */
export function isLocalInstallArtifact(relativePath) {
    const segments = path.normalize(relativePath).split(/[\\/]/);
    if (segments.some(segment => MIRROR_EXCLUDED_DIRS.has(segment))) return true;
    return MIRROR_EXCLUDED_FILES.has(segments[segments.length - 1]);
}

/** True when a path under `.claude/skills` belongs in the generated skill mirror. */
export function isMirroredSkillSource(relativePath) {
    if (isLocalInstallArtifact(relativePath)) return false;
    // Kept apart from the install-artifact lists above: those also generate `.agents/.gitignore`.
    if (isOsMetadataFileName(path.basename(relativePath))) return false;
    return !RUNTIME_ONLY_SKILL_FILES.has(path.normalize(relativePath));
}

// VCS metadata is excluded from the mirror but is not an install artifact a .gitignore should list.
const VCS_DIRS = new Set(['.git', '.hg', '.svn']);
const GITIGNORE_BLOCK_START = '# >>> codex-sync: local install artifacts (generated; the sync rewrites this block)';
const GITIGNORE_BLOCK_END = '# <<< codex-sync';

/**
 * `.agents/.gitignore` content, derived from the same exclusion lists as the mirror filter so a
 * project that copies `.agents/` whole never tracks a local install (lockfiles, node_modules,
 * venvs, bytecode caches) at any depth. Only the marked block is owned by the sync: any content an
 * adopter keeps outside it in `existing` is preserved, never clobbered.
 */
export function buildAgentsMirrorGitignore(existing = '') {
    const block = [
        GITIGNORE_BLOCK_START,
        ...[...MIRROR_EXCLUDED_FILES].sort(),
        ...[...MIRROR_EXCLUDED_DIRS].filter(dir => !VCS_DIRS.has(dir)).sort().map(dir => `${dir}/`),
        GITIGNORE_BLOCK_END
    ].join('\n');
    const text = existing.replace(/\r\n/g, '\n');
    // Pair each end marker with the NEAREST start before it: an orphan start line (its end deleted by
    // hand) must never pair with a later block's end and swallow the adopter rules between them.
    const end = text.lastIndexOf(GITIGNORE_BLOCK_END);
    const start = end === -1 ? -1 : text.lastIndexOf(GITIGNORE_BLOCK_START, end);
    if (start !== -1) return text.slice(0, start) + block + text.slice(end + GITIGNORE_BLOCK_END.length);
    return text.trim() ? `${text.replace(/\n*$/, '\n\n')}${block}\n` : `${block}\n`;
}

async function writeAgentsMirrorGitignore() {
    let existing = '';
    try {
        existing = await fs.readFile(agentsMirrorGitignorePath, 'utf8');
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }
    await fs.writeFile(agentsMirrorGitignorePath, buildAgentsMirrorGitignore(existing), 'utf8');
}
const TEXT_FILE_EXTENSIONS = new Set(['.cjs', '.css', '.html', '.js', '.json', '.lock', '.md', '.mjs', '.py', '.sh', '.toml', '.ts', '.tsx', '.yaml', '.yml']);

function escapeTomlString(value) {
    return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

function escapeTomlMultiline(value) {
    return value.replace(/\r\n/g, '\n').replaceAll('\\', '\\\\').replace(/"""/g, '\\"\\"\\"');
}

function escapeYamlSingleQuoted(value) {
    return value.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim().replaceAll("'", "''");
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripTomlComment(line) {
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let isEscaped = false;

    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];

        if (inDoubleQuote) {
            if (isEscaped) {
                isEscaped = false;
            } else if (char === '\\') {
                isEscaped = true;
            } else if (char === '"') {
                inDoubleQuote = false;
            }
            continue;
        }

        if (inSingleQuote) {
            if (char === "'") {
                inSingleQuote = false;
            }
            continue;
        }

        if (char === '"') {
            inDoubleQuote = true;
        } else if (char === "'") {
            inSingleQuote = true;
        } else if (char === '#') {
            return line.slice(0, index);
        }
    }

    return line;
}

function isTomlTableHeader(line) {
    return /^\s*\[(?:[^\[\]]+|\[[^\[\]]+\])\]\s*$/.test(stripTomlComment(line));
}

function findTomlTableRange(lines, tableName) {
    const header = `[${tableName}]`;
    const start = lines.findIndex(line => stripTomlComment(line).trim() === header);
    if (start === -1) return null;

    const nextTableOffset = lines.slice(start + 1).findIndex(isTomlTableHeader);
    return {
        start,
        end: nextTableOffset === -1 ? lines.length : start + 1 + nextTableOffset
    };
}

function stripTomlStringContent(line) {
    return stripTomlComment(line)
        .replace(/"(?:\\.|[^"\\])*"/g, '""')
        .replace(/'(?:''|[^'])*'/g, "''");
}

function findTomlAssignmentEnd(lines, assignmentStart, scopeEnd) {
    let bracketDepth = 0;
    let sawBracket = false;

    for (let index = assignmentStart; index < scopeEnd; index += 1) {
        const rawLine = index === assignmentStart
            ? lines[index].slice(lines[index].indexOf('=') + 1)
            : lines[index];
        const line = stripTomlStringContent(rawLine);

        for (const char of line) {
            if (char === '[') {
                sawBracket = true;
                bracketDepth += 1;
            } else if (char === ']') {
                bracketDepth -= 1;
            }
        }

        if (!sawBracket || bracketDepth <= 0) {
            return index + 1;
        }
    }

    return assignmentStart + 1;
}

function upsertTomlKey(lines, key, value, start, end) {
    const keyPattern = new RegExp(`^\\s*${escapeRegExp(key)}\\s*=`);
    const existingIndex = lines.findIndex((line, index) => index >= start && index < end && keyPattern.test(line));
    const nextLine = `${key} = ${value}`;

    if (existingIndex !== -1) {
        const assignmentEnd = findTomlAssignmentEnd(lines, existingIndex, end);
        const removedLineCount = assignmentEnd - existingIndex;
        lines.splice(existingIndex, removedLineCount, nextLine);
        return { inserted: false, lineDelta: 1 - removedLineCount };
    }

    let insertionIndex = end;
    while (insertionIndex > start && lines[insertionIndex - 1]?.trim() === '') {
        insertionIndex -= 1;
    }

    lines.splice(insertionIndex, 0, nextLine);
    return { inserted: true, lineDelta: 1 };
}

/**
 * Remove a key this bundle once wrote, only while its value is still exactly the bundled value.
 * The comment block directly above it goes too, but only when every line matches the bundled text;
 * a project's own comment stays. Any other value is the project's choice: it is left untouched and
 * returned as `keptValue` so the caller can report it. Mutates `lines`.
 */
function retireBundledTomlKey(lines, key, bundledValue, start, end, bundledComment = []) {
    const keyPattern = new RegExp(`^\\s*${escapeRegExp(key)}\\s*=`);
    const index = lines.findIndex((line, lineIndex) => lineIndex >= start && lineIndex < end && keyPattern.test(line));
    if (index === -1) return { removed: false, keptValue: null };

    const assignmentEnd = findTomlAssignmentEnd(lines, index, end);
    const assignment = lines.slice(index, assignmentEnd).join('\n');
    const value = (assignmentEnd === index + 1 ? stripTomlComment(assignment) : assignment).replace(keyPattern, '').trim();
    if (value !== bundledValue) return { removed: false, keptValue: value };

    let removeStart = index;
    const commentStart = index - bundledComment.length;
    if (bundledComment.length > 0 && commentStart >= start &&
        bundledComment.every((comment, offset) => lines[commentStart + offset].trim() === comment)) {
        removeStart = commentStart;
    }
    lines.splice(removeStart, assignmentEnd - removeStart);
    // The block sat between two blank lines; keep one.
    if (removeStart > 0 && lines[removeStart - 1]?.trim() === '' && lines[removeStart]?.trim() === '') lines.splice(removeStart, 1);
    return { removed: true, keptValue: null };
}

/**
 * Remove the top-level `notify` assignment only when it is exactly the retired framework helper.
 * A project's own notify command is a user choice and stays untouched.
 */
function removeLegacyNotifyKey(lines) {
    let topLevelEnd = lines.findIndex(isTomlTableHeader);
    if (topLevelEnd === -1) topLevelEnd = lines.length;
    const index = lines.findIndex((line, lineIndex) => lineIndex < topLevelEnd && /^\s*notify\s*=/.test(line));
    if (index === -1) return;
    const end = findTomlAssignmentEnd(lines, index, topLevelEnd);
    const assignment = lines.slice(index, end).join('\n').replace(/^\s*notify\s*=/, '').replace(/#.*$/gm, '').trim();
    let argv;
    try {
        argv = JSON.parse(assignment.replace(/,\s*\]$/, ']'));
    } catch {
        return;
    }
    const isLegacyHelper = Array.isArray(argv) && argv.length === LEGACY_NOTIFY_ARGV.length &&
        argv.every((part, partIndex) => part === LEGACY_NOTIFY_ARGV[partIndex]);
    if (!isLegacyHelper) return;
    // Drop the line and the one comment the bundle's own config placed above it; any other
    // comment belongs to the project and stays.
    let start = index;
    if (start > 0 && lines[start - 1].trim() === LEGACY_NOTIFY_COMMENT) start -= 1;
    lines.splice(start, end - start);
    if (start > 0 && lines[start - 1]?.trim() === '' && lines[start]?.trim() === '') lines.splice(start, 1);
}

/**
 * @param {string} configText current `.codex/config.toml` text
 * @param {{ onNotice?: (message: string) => void }} [options] receives one line per value kept for the user
 */
export function upsertCodexNotificationConfig(configText, options = {}) {
    const notice = typeof options.onNotice === 'function' ? options.onNotice : () => {};
    const lines = configText.replace(/\r\n/g, '\n').split('\n');
    if (lines.length === 1 && lines[0] === '') {
        lines.pop();
    }

    removeLegacyNotifyKey(lines);

    // No compaction pin: Codex applies its own default, and a user-set value is kept and reported.
    let topLevelEnd = lines.findIndex(isTomlTableHeader);
    if (topLevelEnd === -1) topLevelEnd = lines.length;
    const compaction = retireBundledTomlKey(lines, RETIRED_COMPACTION_KEY, RETIRED_COMPACTION_VALUE, 0, topLevelEnd, RETIRED_COMPACTION_COMMENT);
    if (compaction.keptValue !== null) notice(`kept user-set ${RETIRED_COMPACTION_KEY}=${compaction.keptValue}`);

    // No instruction-budget floor: quiet mode should inherit native context limits. Remove only
    // the exact former bundled allowance; every other spelling/value is a project choice.
    // Restrict retirement to a simple top-level prefix. This line-based migration must not
    // mistake multiline string content or a quoted table's values for top-level settings.
    const complexConfigStart = lines.findIndex(line => {
        const code = stripTomlComment(line);
        if (/^\s*\[/.test(code) || code.includes('"""') || code.includes("'''")) return true;
        const structure = stripTomlStringContent(line);
        const opens = (structure.match(/[\[{]/g) || []).length;
        const closes = (structure.match(/[\]}]/g) || []).length;
        return opens !== closes;
    });
    const docBudgetEnd = complexConfigStart === -1 ? lines.length : complexConfigStart;
    const docBudget = retireBundledTomlKey(lines, RETIRED_DOC_BUDGET_KEY, RETIRED_DOC_BUDGET_VALUE, 0, docBudgetEnd);
    if (docBudget.keptValue !== null) notice(`kept user-set ${RETIRED_DOC_BUDGET_KEY}=${docBudget.keptValue}`);

    let tuiRange = findTomlTableRange(lines, 'tui');
    if (!tuiRange) {
        if (lines.length > 0 && lines.at(-1)?.trim()) {
            lines.push('');
        }
        lines.push('[tui]');
        tuiRange = { start: lines.length - 1, end: lines.length };
    }

    for (const [key, value] of [
        ['status_line', '["model-with-reasoning", "current-dir", "project-root", "context-used", "five-hour-limit", "weekly-limit"]'],
        ['notifications', 'true'],
        ['notification_condition', '"always"'],
        ['notification_method', '"auto"']
    ]) {
        const result = upsertTomlKey(lines, key, value, tuiRange.start + 1, tuiRange.end);
        if (result.inserted) {
            tuiRange.end += result.lineDelta;
        } else if (result.lineDelta) {
            tuiRange.end += result.lineDelta;
        }
    }

    tuiRange = findTomlTableRange(lines, 'tui');
    if (tuiRange && tuiRange.end < lines.length && lines[tuiRange.end - 1]?.trim()) {
        lines.splice(tuiRange.end, 0, '');
    }

    return `${lines.join('\n').trimEnd()}\n`;
}

function deriveSkillDescription(body, skillName) {
    const headingMatch = body.match(/^#\s+(.+)$/m);
    if (headingMatch?.[1]) {
        return headingMatch[1].trim();
    }
    return `Claude skill mirrored for Codex compatibility: ${skillName}`;
}

function rewriteCodexBody(text, skillReferenceMap, concise = false) {
    const rewritten = rewriteClaudeToolTermsForCodex(rewriteSkillMentionsForCodex(text, skillReferenceMap));
    return concise ? rewritten : prependCodexCompatibilityNote(rewritten);
}

function stripTrailingWhitespace(text) {
    return text.replace(/[ \t]+$/gm, '');
}

// Codex inline list: shared protocols the Codex skill mirror carries as full text instead of a guide
// entry. Decided EMPTY: every Codex load path delivered the full protocol text by hook in the
// confirmation run, so with this default the mirror's guide blocks match the source. It is the
// escape hatch for a protocol that new confirmation evidence shows Codex cannot receive by hook.
// A listed protocol leaves the mirror's guide block, so hook delivery (which reads that block on
// Codex) never sends it a second time.
export const CODEX_INLINE_TAGS = Object.freeze([]);

let guideCarrier = null;
function loadGuideCarrier() {
    if (!guideCarrier) guideCarrier = require('../lib/protocol-guide-carrier.cjs');
    return guideCarrier;
}

/** The tag a line carries as a well-formed guide entry, read by the one owner of the format; else null. */
function guideLineTag(line) {
    const { GUIDE_BLOCK_START, GUIDE_BLOCK_END, guideTags } = loadGuideCarrier();
    const [tag] = guideTags(`${GUIDE_BLOCK_START}\n${line}\n${GUIDE_BLOCK_END}`);
    return tag ?? null;
}

/**
 * Turn the guide entries of listed protocols back into full `<!-- SYNC:<tag> -->` bodies. Each
 * listed entry leaves its PROTOCOL-GUIDES block, and the bodies follow the block in the order the
 * entries were declared; a block left with no entry is removed. Text with no listed entry — every
 * skill under the empty default list — is returned unchanged.
 *
 * @param {string} markdown skill text
 * @param {Iterable<string>} inlineTags protocols to carry in full
 * @param {(tag: string) => string|null} bodyFor canonical body of a protocol, or null when it has none
 */
export function inlineListedProtocols(markdown, inlineTags, bodyFor) {
    const listed = new Set(inlineTags || []);
    if (listed.size === 0 || typeof markdown !== 'string') return markdown;
    const { GUIDE_BLOCK_START, GUIDE_BLOCK_END } = loadGuideCarrier();
    const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let block = null;
    let changed = false;
    for (const line of lines) {
        const marker = line.trim();
        if (block === null) {
            if (marker === GUIDE_BLOCK_START) block = { start: line, kept: [], inlined: [] };
            else out.push(line);
            continue;
        }
        if (marker === GUIDE_BLOCK_END) {
            if (block.inlined.length > 0) {
                changed = true;
                if (block.kept.some(kept => kept.trim())) out.push(block.start, ...block.kept, line, '');
                out.push(block.inlined.map(({ tag, body }) => `<!-- SYNC:${tag} -->\n\n${body}\n\n<!-- /SYNC:${tag} -->`).join('\n\n'));
            } else {
                out.push(block.start, ...block.kept, line);
            }
            block = null;
            continue;
        }
        const tag = guideLineTag(line);
        if (tag === null || !listed.has(tag)) {
            block.kept.push(line);
            continue;
        }
        const body = bodyFor(tag);
        if (typeof body !== 'string' || !body.trim()) {
            throw new Error(`Codex inline list names "${tag}", but the canonical protocol source has no body for it`);
        }
        if (!block.inlined.some(entry => entry.tag === tag)) block.inlined.push({ tag, body });
    }
    // An unclosed block is not a guide block: keep its lines exactly as they were.
    if (block !== null) out.push(block.start, ...block.kept);
    return changed ? out.join('\n') : markdown;
}

/** `bodyFor` over the canonical protocol source, read only when the inline list is not empty. */
async function canonicalProtocolBodies(inlineTags) {
    if ([...(inlineTags || [])].length === 0) return null;
    const { extractSyncBody } = require('../lib/extract-sync-block.cjs');
    const canonical = await fs.readFile(path.join(claudeSkillsDir, 'shared', 'sync-inline-versions.md'), 'utf8');
    return tag => extractSyncBody(canonical, tag);
}

export function buildCodexSkillManifest(markdown, fallbackName, skillReferenceMap, options = {}) {
    const { frontmatter, body: sourceBody } = parseFrontmatter(markdown);
    const name = stripQuotes(options.overrideName || frontmatter.name || fallbackName || 'unnamed-skill') || 'unnamed-skill';
    const description = stripQuotes(frontmatter.description) || deriveSkillDescription(sourceBody, name);
    const disableModelInvocation = parseFrontmatterBoolean(frontmatter['disable-model-invocation']);
    const body = options.inline ? inlineListedProtocols(sourceBody, options.inline.tags, options.inline.bodyFor) : sourceBody;
    const concise = hasConciseInstructions(markdown);
    const rewrittenBody = rewriteCodexBody(body, skillReferenceMap, concise);

    const sanitizedFrontmatterLines = ['---', `name: ${name}`, `description: '${escapeYamlSingleQuoted(description)}'`];

    if (disableModelInvocation !== null) {
        sanitizedFrontmatterLines.push(`disable-model-invocation: ${disableModelInvocation ? 'true' : 'false'}`);
    }

    if (concise) sanitizedFrontmatterLines.push('metadata:', '  instruction-profile: concise');

    sanitizedFrontmatterLines.push('---');
    const sanitizedFrontmatter = sanitizedFrontmatterLines.join('\n');

    return `${sanitizedFrontmatter}\n\n${rewrittenBody.trim()}\n`;
}

// Codex ignores `disable-model-invocation`; its per-skill `agents/openai.yaml` invocation policy is
// the equivalent control. Generating it from the Claude flag keeps a manual-only skill manual-only in
// the Codex mirror, while an explicit `$skill` mention still runs it.
export const CODEX_SKILL_POLICY_REL = path.join('agents', 'openai.yaml');

/**
 * The generated policy file. `profileList` names the skill-profile list that asked for it
 * (nameOnly | commandOnly | off); without it the source is the SKILL.md flag.
 */
export function buildCodexSkillPolicy(profileList = null) {
    const source = profileList
        ? `# Generated by codex-sync from skillProfile.${profileList} in the project config. Change the profile, not this file.`
        : '# Generated by codex-sync from `disable-model-invocation: true` in the source SKILL.md. Edit that flag, not this file.';
    return [source, 'policy:', '  allow_implicit_invocation: false', ''].join('\n');
}

/**
 * Write a skill's generated policy. A skill that ships its own openai.yaml (interface/dependencies)
 * owns that file and it is never clobbered. When that file leaves implicit invocation on, a flag-driven
 * policy fails the sync; a profile-driven one (`profileList` set) is skipped and returned as a conflict
 * line, because the profile is a project choice layered on a skill the skill author owns.
 * @returns {Promise<string|null>} the conflict line, or null
 */
async function writeCodexSkillPolicy(skillDir, relativeLabel, profileList = null) {
    const policyPath = path.join(skillDir, CODEX_SKILL_POLICY_REL);
    let existing = null;
    try {
        existing = await fs.readFile(policyPath, 'utf8');
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }
    if (existing !== null) {
        if (CODEX_IMPLICIT_OFF_RE.test(existing)) return null;
        if (profileList) {
            return (
                `conflict: ${relativeLabel} ships its own ${CODEX_SKILL_POLICY_REL.split(path.sep).join('/')} without ` +
                `policy.allow_implicit_invocation: false; kept that file, skillProfile.${profileList} is not applied on Codex`
            );
        }
        // Backstop only: main() and materializeSkillMirror() refuse this case before any write
        // (findCodexSkillPolicyRefusals), so reaching it means the source changed mid-sync.
        throw new Error(flagPolicyRefusalMessage(relativeLabel));
    }
    await fs.mkdir(path.dirname(policyPath), { recursive: true });
    await writeFileTransientSafe(policyPath, buildCodexSkillPolicy(profileList), 'utf8');
    return null;
}

function flagPolicyRefusalMessage(relativeLabel) {
    return (
        `${relativeLabel} sets disable-model-invocation: true but its own ${CODEX_SKILL_POLICY_REL} does not set ` +
        'policy.allow_implicit_invocation: false. Add that policy to the source file so Codex keeps the skill manual-only.'
    );
}

/**
 * The flag-policy refusals `writeCodexSkillPolicy` would raise, found over the SOURCE skills before
 * anything is written: a skill that sets `disable-model-invocation: true` and ships its own
 * `agents/openai.yaml` without `policy.allow_implicit_invocation: false`. Checking up front keeps a
 * refused sync from leaving `.agents/skills` wiped or half sanitized and `.codex/agents` rewritten.
 * Reads only the files the mirror copies, with line endings normalized as the mirror does.
 * @param {string} [skillsDir] source skills dir
 * @returns {Promise<string[]>} one message per refused skill, sorted by path
 */
export async function findCodexSkillPolicyRefusals(skillsDir = claudeSkillsDir) {
    if (!(await pathExists(skillsDir))) return [];
    const refusals = [];
    for (const skillPath of (await collectSkillFiles(skillsDir)).sort()) {
        const relativeSkill = path.relative(skillsDir, skillPath);
        if (!isMirroredSkillSource(relativeSkill)) continue;
        const skillText = await fs.readFile(skillPath, 'utf8');
        if (parseFrontmatterBoolean(parseFrontmatter(skillText).frontmatter['disable-model-invocation']) !== true) continue;
        const policyRel = path.join(path.dirname(relativeSkill), CODEX_SKILL_POLICY_REL);
        if (!isMirroredSkillSource(policyRel)) continue;
        let existing;
        try {
            existing = await fs.readFile(path.join(skillsDir, policyRel), 'utf8');
        } catch (error) {
            if (error.code === 'ENOENT') continue;
            throw error;
        }
        if (CODEX_IMPLICIT_OFF_RE.test(existing.replace(/\r\n?/g, '\n'))) continue;
        // The mirror canonicalizes the manifest name, so the label always ends in SKILL.md.
        refusals.push(flagPolicyRefusalMessage(path.join(path.dirname(relativeSkill), 'SKILL.md')));
    }
    return refusals;
}

// ─── Skill profile (the project config's `skillProfile`) → Codex policies ───
//
// The host-independent rules (presets, lists, the called set, refusals) belong to
// `.claude/scripts/sync-skill-profile.cjs` `resolveProfile()`; this mirror only maps its result:
//   commandOnly / off                 → allow_implicit_invocation: false ($name still runs it)
//   nameOnly, a skill nothing starts  → allow_implicit_invocation: false (Codex has no name-only listing)
//   nameOnly, a called skill          → follows CODEX_STEP_REACHES_HIDDEN_SKILL
// A refused profile (a called skill in commandOnly/off without allowHidingCalledSkills) stops the sync
// before any mirror file is written.

/**
 * Q-E probe result for Codex: does a workflow step's `$skill` still load a skill whose policy turns
 * implicit invocation off? Recorded FAIL: the step's sub-agent reviewed without loading the hidden
 * skill, and the host never injects a `$skill` that comes from skill text. So a called nameOnly skill
 * keeps implicit invocation, with one note line per skill. Flip only on new PASS evidence.
 */
export const CODEX_STEP_REACHES_HIDDEN_SKILL = false;

const SKILL_PROFILE_PREFIX = 'skill-profile:';
const HIDING_PROFILE_LISTS = new Set(['commandOnly', 'off']);
const EMPTY_SKILL_PROFILE = Object.freeze({ declared: false, policies: new Map(), notes: [], warnings: [], refusals: [] });

/**
 * Map a resolved profile (`resolveProfile()` result) to Codex policies. Pure.
 * @returns {{policies: Map<string, string>, notes: string[]}} skill folder → profile list, plus note lines
 */
export function planCodexSkillPolicies(resolved, { stepReachesHiddenSkill = CODEX_STEP_REACHES_HIDDEN_SKILL } = {}) {
    const policies = new Map();
    const notes = [];
    for (const name of Object.keys(resolved?.overrides || {}).sort()) {
        const list = resolved.overrides[name];
        const callers = resolved.called?.get(name);
        if (!HIDING_PROFILE_LISTS.has(list) && callers && !stepReachesHiddenSkill) {
            notes.push(
                `kept implicit invocation for ${name} (nameOnly) on Codex: started by ${callers.join(', ')}, ` +
                    'and a workflow step does not reach a Codex skill with implicit invocation off'
            );
            continue;
        }
        policies.set(name, list);
    }
    return { policies, notes };
}

/**
 * Resolve the project's skill profile for the Codex mirror. The resolver is loaded only when the
 * project config declares `skillProfile`, so a project without one keeps today's mirror exactly.
 * A project config that exists but is not valid JSON throws: whether it hides skills is unknown.
 */
export async function resolveCodexSkillProfile(projectRoot = rootDir) {
    const { resolveProjectConfigPath } = require('../lib/workflow-routing-config.cjs');
    const configPath = resolveProjectConfigPath(projectRoot);
    let text;
    try {
        text = await fs.readFile(configPath, 'utf8');
    } catch (error) {
        if (error.code === 'ENOENT') return EMPTY_SKILL_PROFILE;
        throw error;
    }
    let config;
    try {
        config = JSON.parse(text);
    } catch (error) {
        throw new Error(`project config is not valid JSON (${configPath}): ${error.message}`);
    }
    if (config?.skillProfile === undefined || config?.skillProfile === null) return EMPTY_SKILL_PROFILE;
    const { resolveProfile } = require('../sync-skill-profile.cjs');
    const resolved = resolveProfile(projectRoot, config);
    return { declared: true, ...planCodexSkillPolicies(resolved), warnings: resolved.warnings, refusals: resolved.refusals };
}

/** An Error carrying the resolver's refusals; its message is the refusal lines. */
function skillProfileRefusedError(refusals) {
    const error = new Error(refusals.map(refusal => refusal.message).join('\n'));
    error.refusals = refusals;
    return error;
}

function reserveUniqueName(baseName, usedNames) {
    const root = (baseName || 'unnamed-skill').trim() || 'unnamed-skill';
    if (!usedNames.has(root)) {
        usedNames.add(root);
        return root;
    }

    let suffix = 2;
    while (usedNames.has(`${root}-${suffix}`)) {
        suffix += 1;
    }
    const next = `${root}-${suffix}`;
    usedNames.add(next);
    return next;
}

async function loadCkConfig() {
    const ckConfigPath = path.join(rootDir, '.claude', '.ck.json');
    let ckConfigRaw;
    try {
        ckConfigRaw = await fs.readFile(ckConfigPath, 'utf8');
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.warn(`[codex-migrate] could not read ${ckConfigPath}: ${err.message}`);
        }
        return {};
    }
    try {
        return JSON.parse(ckConfigRaw);
    } catch (err) {
        console.warn(`[codex-migrate] malformed JSON in ${ckConfigPath}: ${err.message}`);
        return {};
    }
}

async function collectSkillFiles(dirPath) {
    const skillFiles = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        if (MIRROR_EXCLUDED_DIRS.has(entry.name)) continue;

        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            skillFiles.push(...(await collectSkillFiles(fullPath)));
            continue;
        }

        if (entry.isFile() && entry.name.toUpperCase() === 'SKILL.MD') {
            skillFiles.push(fullPath);
        }
    }

    return skillFiles;
}

function normalizeDescriptionFrontmatter(markdown) {
    const frontmatterMatch = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!frontmatterMatch) return { content: markdown, changed: false };

    const frontmatterText = frontmatterMatch[1];
    const lineEnding = markdown.includes('\r\n') ? '\r\n' : '\n';
    const lines = frontmatterText.split(/\r?\n/);
    const normalizedLines = [];
    let changed = false;

    for (const line of lines) {
        const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (!keyMatch) {
            normalizedLines.push(line);
            continue;
        }

        const key = keyMatch[1];
        const rawValue = keyMatch[2];
        if (key !== 'description') {
            normalizedLines.push(line);
            continue;
        }

        const marker = rawValue.trim();
        if (marker === '>' || marker === '>-' || marker === '|' || marker === '|-') {
            normalizedLines.push(line);
            continue;
        }

        const normalizedValue = stripQuotes(rawValue);
        const rewritten = `description: '${escapeYamlSingleQuoted(normalizedValue || '')}'`;
        normalizedLines.push(rewritten);
        if (rewritten !== line) changed = true;
    }

    if (!changed) return { content: markdown, changed: false };

    const updatedFrontmatter = `---${lineEnding}${normalizedLines.join(lineEnding)}${lineEnding}---`;
    // Function replacer: descriptions are free text, and a `$` sequence in a replacement STRING
    // would be expanded as a special pattern instead of written literally.
    const updatedContent = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---/, () => updatedFrontmatter);
    return { content: updatedContent, changed: true };
}

async function sanitizeClaudeSkillSourceManifests() {
    if (!(await pathExists(claudeSkillsDir))) return 0;

    const skillFiles = await collectSkillFiles(claudeSkillsDir);
    let updated = 0;
    for (const skillPath of skillFiles) {
        const content = await fs.readFile(skillPath, 'utf8');
        const normalized = normalizeDescriptionFrontmatter(content);
        if (!normalized.changed) continue;
        await fs.writeFile(skillPath, normalized.content, 'utf8');
        updated += 1;
    }
    return updated;
}

async function canonicalizeSkillManifestNames(dirPath) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const skillManifestEntries = entries.filter(entry => entry.isFile() && entry.name.toUpperCase() === 'SKILL.MD');

    if (skillManifestEntries.length > 1) {
        throw new Error(`Ambiguous skill manifest casing in ${path.relative(rootDir, dirPath)}: ${skillManifestEntries.map(entry => entry.name).join(', ')}`);
    }

    if (skillManifestEntries.length === 1 && skillManifestEntries[0].name !== 'SKILL.md') {
        const sourcePath = path.join(dirPath, skillManifestEntries[0].name);
        const canonicalPath = path.join(dirPath, 'SKILL.md');
        const tempPath = path.join(dirPath, `.__codex-skill-rename-${Date.now()}-${Math.random().toString(16).slice(2)}.tmp`);
        await fs.rename(sourcePath, tempPath);
        await fs.rename(tempPath, canonicalPath);
    }

    for (const entry of entries) {
        if (!entry.isDirectory() || MIRROR_EXCLUDED_DIRS.has(entry.name)) continue;
        await canonicalizeSkillManifestNames(path.join(dirPath, entry.name));
    }
}

async function collectMarkdownFiles(dirPath) {
    const markdownFiles = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        if (MIRROR_EXCLUDED_DIRS.has(entry.name)) continue;

        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            markdownFiles.push(...(await collectMarkdownFiles(fullPath)));
            continue;
        }

        if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
            markdownFiles.push(fullPath);
        }
    }

    return markdownFiles;
}

async function sanitizeSkillMirror(skillsRootDir, skillReferenceMap, inline = null, profile = EMPTY_SKILL_PROFILE, onNotice = () => {}) {
    const skillFiles = await collectSkillFiles(skillsRootDir);
    const skillSources = [];

    for (const skillPath of skillFiles) {
        const skillText = await fs.readFile(skillPath, 'utf8');
        const folderName = path.basename(path.dirname(skillPath));
        const { frontmatter } = parseFrontmatter(skillText);
        const declaredName = stripQuotes(frontmatter.name || folderName || 'unnamed-skill') || 'unnamed-skill';
        skillSources.push({ skillPath, skillText, folderName, declaredName });
    }

    const declaredNameCounts = new Map();
    for (const source of skillSources) {
        declaredNameCounts.set(source.declaredName, (declaredNameCounts.get(source.declaredName) || 0) + 1);
    }

    const usedExportNames = new Set();
    for (const source of skillSources.sort((a, b) => a.skillPath.localeCompare(b.skillPath))) {
        const hasDeclaredCollision = (declaredNameCounts.get(source.declaredName) || 0) > 1;
        const preferredName = hasDeclaredCollision ? source.folderName : source.declaredName;
        const exportedName = reserveUniqueName(preferredName, usedExportNames);
        const sanitizedSkill = buildCodexSkillManifest(source.skillText, exportedName, skillReferenceMap, { overrideName: exportedName, inline });
        await writeFileTransientSafe(source.skillPath, sanitizedSkill, 'utf8');
        const relativeLabel = path.relative(skillsRootDir, source.skillPath);
        if (parseFrontmatterBoolean(parseFrontmatter(source.skillText).frontmatter['disable-model-invocation']) === true) {
            await writeCodexSkillPolicy(path.dirname(source.skillPath), relativeLabel);
            continue;
        }
        // Profile keys are top-level skill folder names; a nested SKILL.md is never a profile target.
        const topLevel = path.dirname(relativeLabel) === source.folderName;
        if (topLevel && profile.policies.has(source.folderName)) {
            const conflict = await writeCodexSkillPolicy(path.dirname(source.skillPath), relativeLabel, profile.policies.get(source.folderName));
            if (conflict) onNotice(`${SKILL_PROFILE_PREFIX} ${conflict}`);
        }
    }

    const markdownFiles = await collectMarkdownFiles(skillsRootDir);
    for (const markdownPath of markdownFiles) {
        const normalizedName = path.basename(markdownPath).toUpperCase();
        if (normalizedName === 'SKILL.MD') continue;

        const markdownText = await fs.readFile(markdownPath, 'utf8');
        const rewrittenText = stripTrailingWhitespace(
            rewriteClaudeToolTermsForCodex(rewriteSkillMentionsForCodex(markdownText, skillReferenceMap))
        );
        if (rewrittenText !== markdownText) {
            await writeFileTransientSafe(markdownPath, rewrittenText, 'utf8');
        }
    }

    return skillFiles.length;
}

async function ensureDir(dirPath) {
    await fs.mkdir(dirPath, { recursive: true });
}

async function pathExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function normalizeTextFileLineEndings(filePath) {
    if (!TEXT_FILE_EXTENSIONS.has(path.extname(filePath).toLowerCase())) return false;

    const content = await fs.readFile(filePath, 'utf8');
    if (!content.includes('\r')) return false;

    await writeFileTransientSafe(filePath, content.replace(/\r\n/g, '\n').replace(/\r/g, '\n'), 'utf8');
    return true;
}

async function normalizeTextLineEndingsUnderDir(dirPath) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    let normalized = 0;

    for (const entry of entries) {
        const childPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            if (MIRROR_EXCLUDED_DIRS.has(entry.name)) continue;
            normalized += await normalizeTextLineEndingsUnderDir(childPath);
        } else if (entry.isFile() && await normalizeTextFileLineEndings(childPath)) {
            normalized += 1;
        }
    }

    return normalized;
}

async function isManagedAgentsSkillsMirror(dirPath) {
    return pathExists(path.join(dirPath, '.codex-mirror.json'));
}

async function writeAgentsSkillsMirrorSentinel() {
    await fs.writeFile(
        agentsSkillsMirrorSentinelPath,
        `${JSON.stringify({ managedBy: 'codex-sync', source: '.claude/skills' }, null, 2)}\n`,
        'utf8'
    );
}

// Single source of truth for materializing the Codex sub-agent mirror into `targetDir`.
// Called by the real writer (migrateAgents → codexAgentsDir) AND by the sync-divergence
// oracle gate (→ throwaway staging dir), for the same reason materializeSkillMirror is
// shared: an oracle that re-implements the transform can drift from it, and the 23 agent
// TOMLs are the ENTIRE Codex sub-agent surface — previously the only committed mirror with
// no divergence gate at all. Returns the number of agents written.
export async function materializeAgentMirror(targetDir = codexAgentsDir) {
    const exists = await pathExists(claudeAgentsDir);
    if (!exists) {
        console.warn('[codex-migrate] .claude/agents not found, skipping sub-agent migration.');
        return 0;
    }

    await ensureDir(targetDir);

    const entries = await fs.readdir(claudeAgentsDir, { withFileTypes: true });
    const markdownFiles = entries
        .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
        .map(entry => entry.name)
        .sort((a, b) => a.localeCompare(b));

    const skillReferenceMap = buildSkillReferenceMap(
        await fs.readdir(claudeSkillsDir, { withFileTypes: true }).then(entries => entries.filter(entry => entry.isDirectory()).map(entry => entry.name))
    );

    let migrated = 0;
    for (const fileName of markdownFiles) {
        const sourcePath = path.join(claudeAgentsDir, fileName);
        const sourceText = await fs.readFile(sourcePath, 'utf8');
        const { frontmatter, body } = parseFrontmatter(sourceText);

        const stemName = path.basename(fileName, '.md');
        const name = (frontmatter.name || stemName).trim();
        const description =
            rewriteClaudeToolTermsForCodex(
                rewriteSkillMentionsForCodex(frontmatter.description || `Migrated from .claude/agents/${fileName}`, skillReferenceMap)
            )
                .replace(/\s+/g, ' ')
                .trim() || `Migrated from .claude/agents/${fileName}`;

        const sourceRelPath = path.relative(rootDir, sourcePath).replaceAll('\\', '/');
        const instructions = [`Source: ${sourceRelPath}`, '', rewriteCodexBody(body || sourceText.trim(), skillReferenceMap)].join('\n');

        const toml = [
            `name = "${escapeTomlString(name)}"`,
            `description = "${escapeTomlString(description)}"`,
            `developer_instructions = """`,
            `${escapeTomlMultiline(instructions)}`,
            `"""`,
            ''
        ].join('\n');

        const outputPath = path.join(targetDir, `${stemName}.toml`);
        await fs.writeFile(outputPath, toml, 'utf8');
        migrated += 1;
    }

    return migrated;
}

async function migrateAgents() {
    return materializeAgentMirror(codexAgentsDir);
}

// Single source of truth for materializing the skill mirror into `targetDir`.
// Called by the real writer (setupSkills → agentsSkillsDir) AND by the sync-divergence
// oracle gate (→ throwaway staging dir). Sharing this path means the gate's "expected"
// output can never drift from real sync behavior. Returns the sanitized manifest count.
// `options.inlineTags` replaces the Codex inline list (default CODEX_INLINE_TAGS, empty).
// `options.skillProfile` is a resolveCodexSkillProfile() result; when omitted (the oracle gate) it is
// resolved here, so a refused profile fails the gate the same way it fails the sync — before any write.
// `options.onNotice` receives the profile conflict lines.
export async function materializeSkillMirror(targetDir, skillReferenceMap, options = {}) {
    const skillProfile = options.skillProfile ?? (await resolveCodexSkillProfile(rootDir));
    if (skillProfile.refusals.length > 0) throw skillProfileRefusedError(skillProfile.refusals);
    const policyRefusals = await findCodexSkillPolicyRefusals(claudeSkillsDir);
    if (policyRefusals.length > 0) throw new Error(policyRefusals.join('\n'));
    const inlineTags = options.inlineTags ?? CODEX_INLINE_TAGS;
    const bodyFor = await canonicalProtocolBodies(inlineTags);
    await fs.cp(claudeSkillsDir, targetDir, {
        recursive: true,
        force: true,
        filter: sourcePath => isMirroredSkillSource(path.relative(claudeSkillsDir, sourcePath))
    });
    await normalizeTextLineEndingsUnderDir(targetDir);
    await canonicalizeSkillManifestNames(targetDir);
    return sanitizeSkillMirror(
        targetDir,
        skillReferenceMap,
        bodyFor ? { tags: inlineTags, bodyFor } : null,
        skillProfile,
        options.onNotice
    );
}

async function setupSkills(skillProfile) {
    if (!useSkills) return 'skipped (--no-skills)';

    const sourceExists = await pathExists(claudeSkillsDir);
    if (!sourceExists) return 'skipped (.claude/skills not found)';

    const skillReferenceMap = buildSkillReferenceMap(
        await fs.readdir(claudeSkillsDir, { withFileTypes: true }).then(entries => entries.filter(entry => entry.isDirectory()).map(entry => entry.name))
    );

    await ensureDir(path.dirname(agentsSkillsDir));
    const targetExists = await pathExists(agentsSkillsDir);
    if (targetExists) {
        // Sentinel guard: only wipe .agents/skills/ for a full Claude Code project
        // or for a generated mirror from a previous portable skills-only sync.
        const canReplaceExistingMirror = (await pathExists(claudeAgentsDir)) || (await isManagedAgentsSkillsMirror(agentsSkillsDir));
        if (!canReplaceExistingMirror) {
            throw new Error(
                `Refusing to remove ${agentsSkillsDir}: ${claudeAgentsDir} not found in cwd ${rootDir}. ` +
                    `Run codex-migrate from a Claude Code project containing both .claude/skills/ and .claude/agents/, ` +
                    `or remove the unmanaged .agents/skills directory explicitly before running portable skills sync.`
            );
        }
        await fs.rm(agentsSkillsDir, { recursive: true, force: true });
    }

    const sanitizedCount = await materializeSkillMirror(agentsSkillsDir, skillReferenceMap, {
        skillProfile,
        onNotice: message => console.log(`[codex-migrate] ${message}`)
    });
    await writeAgentsSkillsMirrorSentinel();
    await writeAgentsMirrorGitignore();
    const modeLabel = copySkills ? 'copied' : 'mirrored';
    return `${modeLabel} + sanitized + rewritten ${sanitizedCount} skill manifest(s)`;
}

async function setupCodexNotifications() {
    await ensureDir(path.dirname(codexConfigPath));

    let existingConfig = '';
    try {
        existingConfig = await fs.readFile(codexConfigPath, 'utf8');
    } catch (err) {
        if (err.code !== 'ENOENT') throw err;
        existingConfig = ['# Team-wide Codex defaults for this repository.', '# Applied when the project is trusted by Codex.', ''].join('\n');
    }

    const updatedConfig = upsertCodexNotificationConfig(existingConfig, {
        onNotice: message => console.log(`[codex-migrate] ${message}`)
    });
    if (updatedConfig !== existingConfig) {
        await fs.writeFile(codexConfigPath, updatedConfig, 'utf8');
    }

    // Delete the retired helper only once no kept notify command still runs it.
    const removedLegacyScript = !updatedConfig.includes('codex-notify.mjs') && await pathExists(legacyNotificationScriptPath);
    if (removedLegacyScript) {
        await fs.rm(legacyNotificationScriptPath, { force: true });
        // rmdir fails on a non-empty directory, so anything else kept there stays as it is.
        await fs.rmdir(codexScriptsDir).catch(() => {});
        await fs.rmdir(path.dirname(codexScriptsDir)).catch(() => {});
    }

    const cleanup = removedLegacyScript ? ` (removed retired ${path.relative(rootDir, legacyNotificationScriptPath)})` : '';
    return `configured ${path.relative(rootDir, codexConfigPath)}${cleanup}`;
}

async function main() {
    // The profile is resolved first: a refused profile must stop the sync before any mirror file is written.
    const skillProfile = await resolveCodexSkillProfile(rootDir);
    if (skillProfile.refusals.length > 0) {
        for (const refusal of skillProfile.refusals) console.error(`[codex-migrate] ${refusal.message}`);
        console.error(`[codex-migrate] ${SKILL_PROFILE_PREFIX} nothing was written`);
        process.exitCode = 1;
        return;
    }
    // The flag-policy refusal is checked over the source skills for the same reason: it must stop the
    // sync before .agents/skills is wiped and before .codex/agents is rewritten.
    const policyRefusals = useSkills ? await findCodexSkillPolicyRefusals(claudeSkillsDir) : [];
    if (policyRefusals.length > 0) {
        for (const message of policyRefusals) console.error(`[codex-migrate] ${message}`);
        console.error('[codex-migrate] nothing was written');
        process.exitCode = 1;
        return;
    }
    for (const line of [...skillProfile.warnings, ...skillProfile.notes]) console.log(`[codex-migrate] ${SKILL_PROFILE_PREFIX} ${line}`);

    const normalizedClaudeSkills = normalizeSourceSkills ? await sanitizeClaudeSkillSourceManifests() : 0;
    const migratedAgentsCount = await migrateAgents();
    const skillsResult = await setupSkills(skillProfile);
    const notificationsResult = await setupCodexNotifications();

    if (normalizeSourceSkills) {
        console.log(`[codex-migrate] normalized ${normalizedClaudeSkills} Claude skill frontmatter file(s)`);
    } else {
        console.log('[codex-migrate] source skill manifests unchanged (pass --normalize-source-skills to normalize)');
    }
    console.log(`[codex-migrate] migrated ${migratedAgentsCount} Claude sub-agent(s) into .codex/agents`);
    console.log(`[codex-migrate] skills setup: ${skillsResult}`);
    console.log(`[codex-migrate] notifications setup: ${notificationsResult}`);
}

// CLI guard: only run the (destructive) migration when invoked directly as a script.
// Importing this module (e.g. the verify-sync-divergence oracle gate, or unit tests)
// must NOT trigger a real sync that would wipe and regenerate .agents/skills.
if (invokedAsScript) {
    try {
        validateCliArgs(process.argv.slice(2));
    } catch (error) {
        console.error(`[codex-migrate] ERROR: ${error.message}. ${MIGRATION_USAGE}`);
        process.exitCode = 1;
    }
    if (!process.exitCode) await main();
}
