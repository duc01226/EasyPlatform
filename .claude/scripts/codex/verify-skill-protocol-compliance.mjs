#!/usr/bin/env node

import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { resolveProjectRoot, isInvokedAsScript } = require('../lib/project-root.cjs');
const rootResolution = resolveProjectRoot({
    cwd: process.cwd(),
    scriptPath: fileURLToPath(import.meta.url),
    env: process.env,
});
const rootDir = rootResolution.rootDir;
const claudeSkillsRoot = path.join(rootDir, '.claude', 'skills');
const skillsRoot = path.join(rootDir, '.agents', 'skills');
const claudeAgentsRoot = path.join(rootDir, '.claude', 'agents');
const agentsRoot = path.join(rootDir, '.codex', 'agents');
// The retired Codex context file: the sync removes it, so its presence is a stale mirror.
const contextPath = path.join(rootDir, '.codex', 'CODEX_CONTEXT.md');
const projectAgentsPath = path.join(rootDir, 'AGENTS.md');
// Markers of the protocol blocks older syncs injected into mirrored skills and AGENTS.md. None may
// come back: the universal hook delivers the shared protocols, no mirror carries them.
const RETIRED_MIRROR_MARKERS = [
    'CODEX:SYNC-PROMPT-PROTOCOLS:START',
    'CODEX:PROJECT-REFERENCE-LOADING:START',
    'PROMPT-PROTOCOLS:START',
    'CODEX-CONTEXT-MIRROR:START'
];
const AGENTS_ROOT_PROJECTION_START = 'CK:CODEX-ROOT-PROJECTION';
const AGENTS_ROOT_PROJECTION_END = '/CK:CODEX-ROOT-PROJECTION';
// MUST equal AGENTS_ROOT_LIMIT_BYTES in `sync-context-workflows.mjs` — the generator that produces
// the projection this gate measures. The budget is the Codex host default for `project_doc_max_bytes`:
// the projection carries project information only, so it stays inside it. Deliberately a LOCAL copy,
// NOT an import: this file is loaded from a `data:` URL and copied into isolated roots without its
// siblings (`verifier-root-contract.test.mjs`), so a relative import breaks it.
// `verify-skill-protocol-compliance.test.mjs` asserts the two constants match.
export const AGENTS_ROOT_LIMIT_BYTES = 32768;
// The Codex manual-only policy line (`agents/openai.yaml`). A LOCAL copy for the same reason as the budget
// above; `verify-skill-protocol-compliance.test.mjs` asserts it equals the generator's shared constant.
export const CODEX_IMPLICIT_OFF_RE = /^\s*allow_implicit_invocation:\s*false\s*$/m;
// Guide carriers. A converted skill carries a shared protocol as one guide line inside its
// PROTOCOL-GUIDES block instead of the full `<!-- SYNC:tag -->` body; the full text lives in the
// projection file `<skills root>/shared/protocols/<tag>.md`. The recognizer is the shared P25 owner
// (`../lib/protocol-guide-carrier.cjs`) — this file never copies its line format. It is loaded
// LAZILY and only for text that holds a guide block, because this verifier is also copied into
// isolated roots with nothing but its root resolver beside it (`verifier-root-contract.test.mjs`),
// and text without the block marker cannot hold a guide entry by the recognizer's own rule.
// `verify-skill-protocol-compliance.test.mjs` pins GUIDE_BLOCK_HINT to the recognizer's marker.
export const GUIDE_BLOCK_HINT = 'PROTOCOL-GUIDES:START';
const PROTOCOL_TAG_RE = /^[a-z0-9][a-z0-9-]*$/;
let guideCarrier = null;
const loadGuideCarrier = () => (guideCarrier ??= require('../lib/protocol-guide-carrier.cjs'));

/** Tags `content` carries as guide entries (the shared recognizer), in first-seen order. */
export function guideTagsIn(content) {
    const text = String(content ?? '');
    return text.includes(GUIDE_BLOCK_HINT) ? loadGuideCarrier().guideTags(text) : [];
}

export const DEBUGGER_TRACE_TAG = 'end-to-start-debugger-trace';
const DEBUGGER_TRACE_MARKER = `<!-- SYNC:${DEBUGGER_TRACE_TAG} -->`;
const DEBUGGER_TRACE_REQUIRED_SNIPPETS = [
    'End-to-Start Debugger Trace',
    'observed final state',
    'Enumerate all feeder paths',
    'hypothesis matrix',
    'owning fix layer',
    'forward convergence proof'
];

export const DEBUGGER_TRACE_REQUIRED_SOURCE_PATHS = [
    '.claude/skills/graph-code/SKILL.md',
    '.claude/skills/investigate/SKILL.md',
    '.claude/skills/investigate/references/mode-debug.md',
    '.claude/skills/fix/SKILL.md',
    '.claude/skills/plan/references/mode-execute.md',
    '.claude/skills/feature-implement/SKILL.md',
    '.claude/skills/changes-review/SKILL.md',
    '.claude/skills/workflow-review-changes/SKILL.md',
    '.claude/skills/code-quality-review/SKILL.md',
    '.claude/skills/why-review/SKILL.md',
    '.claude/agents/code-reviewer.md',
    '.claude/skills/workflow-bugfix/SKILL.md',
    '.claude/skills/workflow-feature/SKILL.md'
];

const DEBUGGER_TRACE_REQUIRED_GENERATED_SKILLS = DEBUGGER_TRACE_REQUIRED_SOURCE_PATHS
    .filter(relPath => relPath.startsWith('.claude/skills/'))
    .map(relPath => relPath.replace('.claude/skills/', '.agents/skills/').replace(/\/skill\.md$/i, '/SKILL.md'));

const REQUIRED_CONTRACT_SNIPPETS = [
    'load the registered `.agents/skills/<name>/SKILL.md` and execute it with Codex tools',
    'Author `.claude/**`; mirrors are generated.',
    'Track steps before execution and keep progress/evidence current.',
    'Explicit skill requests execute their protocol.',
    'Use the native question tool for required questions.',
    'an actually unavailable required capability stops with its step/evidence and a user question before adaptation.',
    'Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.',
    'Preserve protocol order unless the user approves a deviation.',
    'Workflows use `$start-workflow`: gates stay fixed; other steps may flex with logged reasons and evidence.'
];

// P6 — the universal protocol text is carried by no root file or mirror. The universal hook delivers it
// (`protocol-groups.json` group `universal`), so the bounded AGENTS.md projection must hold none of it. Each
// signature is the rewrite-invariant lead line of one universal protocol; a count above zero means a
// static carrier of shared protocol text came back.
const UNIVERSAL_TEXT_SIGNATURES = [
    '[CRITICAL-THINKING-MINDSET]',
    '## Common AI Mistake Prevention (System Lessons)',
    'Create a small task per change before edits',
    'Add `Analyze AI mistakes & lessons learned` to non-trivial tasks'
];

async function exists(targetPath) {
    try {
        await fs.access(targetPath);
        return true;
    } catch {
        return false;
    }
}

// Local install and VCS directories are never framework skills, so neither the manifest walker nor the
// guide walker scans them: a skill-local `npm install` ships packages with their own SKILL.md and .md files.
// Keep this set a superset of MIRROR_EXCLUDED_DIRS in migrate-claude-to-codex.mjs; it is a local copy so
// this read-only verifier never loads the mirror generator. The one extra entry, `venv`, is the
// conventional Python virtualenv name; skipping it only makes the verifier less strict than the mirror
// copy, never stricter.
const SCAN_SKIPPED_DIRS = new Set(['.git', '.hg', '.svn', '.venv', 'venv', 'node_modules', '__pycache__']);

async function collectFilesByName(dirPath, fileName, { caseInsensitive = false } = {}) {
    const collected = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            if (!SCAN_SKIPPED_DIRS.has(entry.name)) collected.push(...(await collectFilesByName(fullPath, fileName, { caseInsensitive })));
            continue;
        }
        const namesMatch = caseInsensitive ? entry.name.toLowerCase() === fileName.toLowerCase() : entry.name === fileName;
        if (entry.isFile() && namesMatch) {
            collected.push(fullPath);
        }
    }
    return collected;
}

function toRelativeNormalized(targetPath, baseDir) {
    return path.relative(baseDir, targetPath).replaceAll('\\', '/');
}

function toRelativeSkillManifest(targetPath, baseDir) {
    const rel = toRelativeNormalized(targetPath, baseDir);
    const segments = rel.split('/');
    const leaf = segments.at(-1);
    if (leaf && leaf.toUpperCase() === 'SKILL.MD') {
        segments[segments.length - 1] = 'SKILL.md';
        return segments.join('/');
    }
    return rel;
}

function parseSkillFrontmatter(content) {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!match) return null;
    const keys = [];
    const values = {};
    for (const line of match[1].split(/\r?\n/)) {
        const keyMatch = line.match(/^([A-Za-z0-9_-]+):/);
        if (!keyMatch) continue;
        const key = keyMatch[1];
        keys.push(key);
        const valueMatch = line.match(/^[A-Za-z0-9_-]+:\s*(.*)$/);
        if (!valueMatch) continue;
        const rawValue = valueMatch[1].trim();
        values[key] = rawValue.replace(/^['"]|['"]$/g, '').trim();
    }
    // Optional parser stays lazy for the standalone verifier's minimal fixtures.
    const concise = keys.includes('metadata')
        && require('../lib/skill-instruction-profile.cjs').hasConciseInstructions(content);
    return { keys, values, concise };
}

function parseBooleanFrontmatterValue(value) {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    return null;
}

export function missingSnippets(content) {
    return REQUIRED_CONTRACT_SNIPPETS.filter(snippet => !content.includes(snippet));
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasStandaloneMarker(content, marker) {
    return new RegExp(`^\\s*<!-- ${escapeRegExp(marker)} -->\\s*$`, 'm').test(content);
}

// Layout rule (mirrors .claude/scripts/refactor_skill_layout.py contract).
//
// Canonical layout zones, top to bottom:
//   1. <frontmatter> + CODEX:* managed blocks + STEP-TASK-ANCHOR        (HEAD)
//   2. ## Quick Summary, ## Task, ..., ## <last main H2>                (MAIN)
//   3. <!-- SYNC:foo --> ... <!-- /SYNC:foo --> (TOP, all)              (SYNC-TOP)
//   4. <!-- SYNC:foo:reminder --> ... <!-- /SYNC:foo:reminder --> (all) (SYNC-REMINDER)
//   5. PROMPT-ENHANCE:STEP-TASK-CLOSING                                 (CLOSE-ANCHOR)
//   6. ## Closing Reminders                                             (CLOSING)
//
// Rule: within the body zone (HEAD end -> CLOSING zone start), no `## H2`
// heading may appear AFTER the first non-CODEX <!-- SYNC: --> opener,
// excluding H2 headings inside SYNC block bodies (SYNC bodies often embed
// markdown templates with `## Task`/`## Output` etc. -- those don't count).
export function checkMainContentBeforeSyncBlocks(content, relativePath) {
    const lines = content.split('\n');

    // Locate HEAD end (line index, exclusive lower bound for body scan).
    let headEnd = 0;
    const anchorEndIdx = lines.findIndex(l => /^<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->\s*$/.test(l));
    if (anchorEndIdx >= 0) {
        headEnd = anchorEndIdx + 1;
    } else {
        // Fall back to end of frontmatter (second `---` line).
        let dashCount = 0;
        for (let i = 0; i < lines.length; i++) {
            if (/^---\s*$/.test(lines[i])) {
                dashCount++;
                if (dashCount === 2) {
                    headEnd = i + 1;
                    break;
                }
            }
        }
    }

    // Locate CLOSING zone start (first of STEP-TASK-CLOSING:START or `## Closing Reminders`).
    let closingZoneStart = lines.length;
    for (let i = headEnd; i < lines.length; i++) {
        const l = lines[i];
        if (/^<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->\s*$/.test(l) || /^## Closing Reminders\b/.test(l)) {
            closingZoneStart = i;
            break;
        }
    }

    // Scan body zone, tracking inside-SYNC state.
    let firstSyncOpenerLine = -1;
    let firstSyncOpenerTag = '';
    let insideSync = false;
    let openTag = '';
    const offendingH2s = [];

    for (let i = headEnd; i < closingZoneStart; i++) {
        const line = lines[i];
        if (insideSync) {
            const closeMatch = line.match(/^<!-- \/SYNC:([^\s>]+) -->\s*$/);
            if (closeMatch && closeMatch[1] === openTag) {
                insideSync = false;
                openTag = '';
            }
            continue;
        }
        const openMatch = line.match(/^<!-- SYNC:([^/][^\s>]*) -->\s*$/);
        if (openMatch) {
            insideSync = true;
            openTag = openMatch[1];
            if (firstSyncOpenerLine === -1) {
                firstSyncOpenerLine = i + 1;
                firstSyncOpenerTag = openTag;
            }
            continue;
        }
        if (firstSyncOpenerLine !== -1 && /^## /.test(line)) {
            offendingH2s.push({ line: i + 1, text: line.trim() });
        }
    }

    if (offendingH2s.length === 0) return null;

    const firstFew = offendingH2s
        .slice(0, 3)
        .map(h => `line ${h.line}: ${h.text.slice(0, 60)}`)
        .join('; ');
    return `${relativePath} layout invalid: ${offendingH2s.length} "## H2" heading(s) appear AFTER first <!-- SYNC:${firstSyncOpenerTag} --> opener at line ${firstSyncOpenerLine}; main content must consolidate ABOVE all SYNC blocks. Examples: ${firstFew}. Re-run \`python .claude/scripts/refactor_skill_layout.py\` then /sync-codex.`;
}

// Orphan-heading hygiene (authoring quality on SOURCE skills; the mirror inherits it).
// An "orphan" is a heading whose next non-blank line is ANOTHER heading of the SAME or
// SHALLOWER level with zero intervening body — an empty section, usually a SYNC/template
// leftover. `##`->`###` (section->subsection) is legitimate and must pass. Two classes of
// legitimate consecutive headings are excluded:
//   1. headings inside fenced code blocks (skills document their output format as fenced
//      markdown templates with stacked `## ...` section headers), and
//   2. `{placeholder}` output-template headings (e.g. `## Verdict: {PASS | WARN | BLOCKED}`)
//      that review skills stack on purpose.
export function checkOrphanHeadings(content, relativePath) {
    const lines = content.split('\n');
    const orphans = [];
    let inFence = false;
    let fenceChar = '';
    const headingLevel = idx => {
        const match = lines[idx].match(/^(#{1,6}) +\S/);
        return match ? match[1].length : 0;
    };
    for (let i = 0; i < lines.length; i++) {
        const fenceMatch = lines[i].match(/^\s*(```+|~~~+)/);
        if (fenceMatch) {
            const marker = fenceMatch[1][0];
            if (!inFence) {
                inFence = true;
                fenceChar = marker;
            } else if (marker === fenceChar) {
                inFence = false;
                fenceChar = '';
            }
            continue;
        }
        if (inFence) continue;

        const level = headingLevel(i);
        if (level === 0) continue;
        if (lines[i].includes('{')) continue;

        let next = i + 1;
        while (next < lines.length && lines[next].trim() === '') next++;
        if (next >= lines.length) continue;
        if (/^\s*(```+|~~~+)/.test(lines[next])) continue;

        const nextLevel = headingLevel(next);
        if (nextLevel === 0) continue;
        if (nextLevel <= level) {
            orphans.push({ line: i + 1, text: lines[i].trim() });
        }
    }

    if (orphans.length === 0) return null;
    const firstFew = orphans
        .slice(0, 5)
        .map(o => `line ${o.line}: ${o.text.slice(0, 60)}`)
        .join('; ');
    return `${relativePath} has ${orphans.length} orphan heading(s) — a heading immediately followed by a same-or-shallower-level heading with no body (empty section). Add content or remove the heading. Examples: ${firstFew}.`;
}

// `projectionText` opts a SKILL into the guide carrier: the caller passes the projection file's text
// (null when that file is missing) for a skill path and leaves it undefined for an agent, because
// agents keep the full protocol text (owner decision) and so only ever pass through the body branch.
export function checkDebuggerTraceCoverage(content, relativePath, { projectionText } = {}) {
    const missing = [];
    if (!content.includes(DEBUGGER_TRACE_MARKER)) {
        missing.push(DEBUGGER_TRACE_MARKER);
    }
    for (const snippet of DEBUGGER_TRACE_REQUIRED_SNIPPETS) {
        if (!content.includes(snippet)) {
            missing.push(snippet);
        }
    }
    if (missing.length === 0) return null;
    if (projectionText !== undefined && guideTagsIn(content).includes(DEBUGGER_TRACE_TAG)) {
        if (projectionText === null) {
            return `${relativePath} carries a ${DEBUGGER_TRACE_TAG} guide entry but its projection file shared/protocols/${DEBUGGER_TRACE_TAG}.md is missing`;
        }
        const projectionMissing = DEBUGGER_TRACE_REQUIRED_SNIPPETS.filter(snippet => !projectionText.includes(snippet));
        if (projectionMissing.length === 0) return null;
        return `${relativePath} carries a ${DEBUGGER_TRACE_TAG} guide entry but its projection file lacks snippet(s): ${projectionMissing.join(' | ')}`;
    }
    return `${relativePath} missing end-to-start debugger trace gate snippet(s): ${missing.join(' | ')}`;
}

// Guide-carrier rules for ONE source file under the skills root. Per file on purpose: a
// `references/*.md` that keeps a protocol's full text beside a SKILL.md that carries its guide is a
// valid split (BR-PDL-12); the same file carrying both forms is not. Returns failure lines.
//   - a guide naming a tag with no projection file: the pointer leads nowhere;
//   - one file carrying the full `<!-- SYNC:tag -->` body AND a guide for that tag;
//   - a skill named in `inlineSkills` (protocol-groups.json) carrying any guide entry (BR-PDL-11).
export function checkGuideCarrierRules({ relativePath, skillName, content, inlineSkills = [], projectionExists }) {
    const failures = [];
    const tags = guideTagsIn(content);
    if (tags.length === 0) return failures;
    if (inlineSkills.includes(skillName)) {
        failures.push(`${relativePath}: skill "${skillName}" is listed in inlineSkills (shared/protocol-groups.json) and must keep full SYNC bodies, but it carries guide entries: ${tags.join(', ')}`);
    }
    for (const tag of tags) {
        if (!PROTOCOL_TAG_RE.test(tag) || !projectionExists(tag)) {
            failures.push(`${relativePath}: guide entry names protocol "${tag}" but its projection file shared/protocols/${tag}.md does not exist`);
        }
        if (hasStandaloneMarker(content, `SYNC:${tag}`)) {
            failures.push(`${relativePath}: carries both the full <!-- SYNC:${tag} --> body and a guide entry for "${tag}" — keep exactly one form per file`);
        }
    }
    return failures;
}

async function collectMarkdownFiles(dirPath) {
    let entries;
    try {
        entries = await fs.readdir(dirPath, { withFileTypes: true });
    } catch (error) {
        if (error.code === 'ENOENT') return [];
        throw error;
    }
    const collected = [];
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            if (!SCAN_SKIPPED_DIRS.has(entry.name)) collected.push(...(await collectMarkdownFiles(fullPath)));
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
            collected.push(fullPath);
        }
    }
    return collected;
}

// `inlineSkills` from `shared/protocol-groups.json`. An absent file means no list (the rule has
// nothing to enforce); a present but malformed one fails closed rather than silently allowing guides.
async function readInlineSkills(failures) {
    const groupsPath = path.join(claudeSkillsRoot, 'shared', 'protocol-groups.json');
    if (!(await exists(groupsPath))) return [];
    let parsed;
    try {
        parsed = JSON.parse(await fs.readFile(groupsPath, 'utf8'));
    } catch (error) {
        failures.push(`${toRelativeNormalized(groupsPath, rootDir)} is not valid JSON (${error.message}); cannot check inlineSkills`);
        return [];
    }
    const list = parsed?.inlineSkills;
    if (!Array.isArray(list) || !list.every(name => typeof name === 'string' && name)) {
        failures.push(`${toRelativeNormalized(groupsPath, rootDir)} has no valid inlineSkills array of skill names; cannot check inline skills`);
        return [];
    }
    return list;
}

async function checkSourceGuideCarriers(failures) {
    const inlineSkills = await readInlineSkills(failures);
    const protocolsDir = path.join(claudeSkillsRoot, 'shared', 'protocols');
    const projectionCache = new Map();
    const projectionExists = tag => {
        if (!projectionCache.has(tag)) projectionCache.set(tag, fsSync.existsSync(path.join(protocolsDir, `${tag}.md`)));
        return projectionCache.get(tag);
    };
    for (const filePath of await collectMarkdownFiles(claudeSkillsRoot)) {
        const [skillName] = toRelativeNormalized(filePath, claudeSkillsRoot).split('/');
        if (skillName === 'shared') continue; // canonical text and its projection, not a skill
        const content = await fs.readFile(filePath, 'utf8');
        failures.push(...checkGuideCarrierRules({
            relativePath: toRelativeNormalized(filePath, rootDir),
            skillName,
            content,
            inlineSkills,
            projectionExists
        }));
    }
}

// Codex ignores `disable-model-invocation`, so a manual-only skill stays manual on Codex only through
// its `agents/openai.yaml` policy. `policyText` is that file's text ('' when it is absent). Returns the
// failure line, or null when the skill is not manual-only or its policy turns implicit invocation off.
export function checkManualOnlyPolicy(sourceDisable, policyText, relativePath) {
    if (sourceDisable !== true) return null;
    if (CODEX_IMPLICIT_OFF_RE.test(String(policyText ?? ''))) return null;
    return `${relativePath} is manual-only (disable-model-invocation: true) but agents/openai.yaml does not set policy.allow_implicit_invocation: false`;
}

// Actionable remediation for a FAILing run. Every failure this gate raises is a generated-mirror
// integrity problem, and the recurring cause is a stray writer (a standalone `prettier --write` on
// AGENTS.md / .codex, or a hand-edit) drifting a mirror off its canonical source. The sync is the
// SOLE writer of these bytes, so the fix is always "regenerate, never hand-format". Pure + exported
// so it is unit-testable without spawning the verifier or inducing a real drift.
export function formatMirrorRemediation(failures) {
    const lines = [
        'Remediation: regenerate the Codex mirrors with the standalone orchestrator, then re-run this',
        'gate. The framework is self-running: this command needs no npm, no package.json and no',
        'node_modules, so it is identical in this repo and in any project that only copied `.claude`.',
        '  node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --copy-skills   # all three surfaces',
        '  node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --verify-only   # re-run every gate',
        'NEVER hand-edit or `prettier --write` the generated mirrors (AGENTS.md, .codex/**, .agents/**)',
        '— they are .prettierignore-d so the sync stays their only writer.'
    ];
    if (Array.isArray(failures) && failures.some(f => /mirror|drift/i.test(String(f)))) {
        lines.push('A "context mirror content drifted" failure almost always means a mirror file was reformatted');
        lines.push('or edited after the last sync; the runner above rewrites it byte-for-byte from the source.');
    }
    // Size overflow is the ONE failure the sync cannot fix, so it must not inherit the generic
    // "regenerate" advice above — that advice is a non-terminating loop here. The generator
    // preserves content without truncating and only WARNS on overflow (reportAgentsRootSize), so
    // re-running it reproduces the identical oversized file and this gate fails identically.
    if (Array.isArray(failures) && failures.some(f => /bounded projection limit/i.test(String(f)))) {
        lines.push('EXCEPTION — a "bytes, above the …-byte bounded projection limit" failure is NOT fixed by');
        lines.push('re-running the sync. The generator preserves content without truncating and only warns on');
        lines.push('overflow (`sync-context-workflows.mjs` reportAgentsRootSize), so regenerating reproduces the');
        lines.push('identical oversized file. Change the budget or the input instead:');
        lines.push('  - raise AGENTS_ROOT_LIMIT_BYTES in BOTH .claude/scripts/codex/verify-skill-protocol-compliance.mjs');
        lines.push('    and .claude/scripts/codex/sync-context-workflows.mjs (TC-CTXP-035e pins them equal), or');
        lines.push('  - shrink the projection whitelist (AGENTS_PROJECTION_HEADINGS in sync-context-workflows.mjs).');
    }
    return lines.join('\n');
}

// Count non-overlapping occurrences of `needle` in `haystack` (CRLF-normalized). Pure + exported so
// the parity logic is unit-testable without inducing a real mirror drift or spawning the verifier.
export function countOccurrences(haystack, needle) {
    if (!needle) return 0;
    const text = String(haystack).replace(/\r\n/g, '\n');
    let count = 0;
    let idx = text.indexOf(needle);
    while (idx !== -1) {
        count++;
        idx = text.indexOf(needle, idx + needle.length);
    }
    return count;
}

// Compact-root contract. `AGENTS.md` is a small, static projection of the project root file
// (CLAUDE.md): project information only. Keep this predicate pure so both the verifier and focused tests
// can prove the size, marker and absence invariants without invoking a host runtime.
export function checkCompactAgentsProjection(agentsText, {
    limitBytes = AGENTS_ROOT_LIMIT_BYTES
} = {}) {
    const failures = [];
    const agents = String(agentsText ?? '');
    const bytes = Buffer.byteLength(agents, 'utf8');
    if (bytes > limitBytes) {
        failures.push(`AGENTS.md is ${bytes} bytes, above the ${limitBytes}-byte bounded projection limit`);
    }
    if (!hasStandaloneMarker(agents, AGENTS_ROOT_PROJECTION_START) ||
        !hasStandaloneMarker(agents, AGENTS_ROOT_PROJECTION_END)) {
        failures.push(`AGENTS.md missing bounded root projection markers (${AGENTS_ROOT_PROJECTION_START}/${AGENTS_ROOT_PROJECTION_END})`);
    }
    for (const marker of RETIRED_MIRROR_MARKERS) {
        if (agents.includes(marker)) failures.push(`AGENTS.md still carries the retired block ${marker}; the sync no longer writes protocol or context mirrors`);
    }
    failures.push(...checkNoUniversalProtocolText(agents, 'AGENTS.md'));
    return failures;
}

// A root file or mirror must carry none of the universal protocol text. Pure + exported so a focused
// test can drive every signature — and prove the guard is not silently deletable — without a host runtime.
export function checkNoUniversalProtocolText(text, label, {
    signatures = UNIVERSAL_TEXT_SIGNATURES
} = {}) {
    const failures = [];
    for (const signature of signatures) {
        const n = countOccurrences(text, signature);
        if (n > 0) {
            failures.push(`${label}: universal protocol text "${signature}" found ${n}× (expected 0 — the universal hook delivers the shared protocols; no root file or mirror carries them)`);
        }
    }
    return failures;
}

async function checkRequiredDebuggerTraceFiles(relativePaths, failures) {
    for (const relPath of relativePaths) {
        const fullPath = path.join(rootDir, ...relPath.split('/'));
        if (!(await exists(fullPath))) {
            failures.push(`${relPath} missing required debugger trace target`);
            continue;
        }
        const content = await fs.readFile(fullPath, 'utf8');
        // A skill (source or mirror) may carry the gate as a guide entry; its projection lives in
        // that same skills root. Agents are not offered the guide branch (they keep full text).
        const skillsRootMatch = relPath.match(/^(.*\/skills)\//);
        const options = {};
        if (skillsRootMatch) {
            const projectionPath = path.join(rootDir, ...skillsRootMatch[1].split('/'), 'shared', 'protocols', `${DEBUGGER_TRACE_TAG}.md`);
            options.projectionText = (await exists(projectionPath)) ? await fs.readFile(projectionPath, 'utf8') : null;
        }
        const failure = checkDebuggerTraceCoverage(content, relPath, options);
        if (failure) failures.push(failure);
    }
}

async function main() {
    const failures = [];

    if (!(await exists(claudeSkillsRoot))) {
        failures.push(`Missing source skills directory: ${path.relative(rootDir, claudeSkillsRoot)}`);
    } else {
        const orphanScanFiles = await collectFilesByName(claudeSkillsRoot, 'SKILL.md', { caseInsensitive: true });
        for (const sourcePath of orphanScanFiles) {
            const sourceContent = await fs.readFile(sourcePath, 'utf8');
            const orphanFailure = checkOrphanHeadings(sourceContent, toRelativeNormalized(sourcePath, rootDir));
            if (orphanFailure) failures.push(orphanFailure);
        }
        await checkSourceGuideCarriers(failures);
    }

    if (!(await exists(skillsRoot))) {
        failures.push(`Missing generated skills directory: ${path.relative(rootDir, skillsRoot)}`);
    } else {
        const skillFiles = await collectFilesByName(skillsRoot, 'SKILL.md', { caseInsensitive: true });
        const sourceSkillFiles = (await exists(claudeSkillsRoot)) ? await collectFilesByName(claudeSkillsRoot, 'SKILL.md', { caseInsensitive: true }) : [];
        const sourceFrontmatterByRel = new Map();
        for (const sourcePath of sourceSkillFiles) {
            const sourceContent = await fs.readFile(sourcePath, 'utf8');
            sourceFrontmatterByRel.set(toRelativeSkillManifest(sourcePath, claudeSkillsRoot), parseSkillFrontmatter(sourceContent));
        }

        const generatedSet = new Set(skillFiles.map(filePath => toRelativeSkillManifest(filePath, skillsRoot)));
        const sourceSet = new Set(sourceSkillFiles.map(filePath => toRelativeSkillManifest(filePath, claudeSkillsRoot)));

        for (const sourceRel of sourceSet) {
            if (!generatedSet.has(sourceRel)) {
                failures.push(`Missing mirrored skill: .agents/skills/${sourceRel}`);
            }
        }
        for (const generatedRel of generatedSet) {
            if (!sourceSet.has(generatedRel)) {
                failures.push(`Unexpected mirrored skill not present in source: .agents/skills/${generatedRel}`);
            }
        }

        const generatedSkillMetadata = new Map();

        for (const skillPath of skillFiles) {
            const content = await fs.readFile(skillPath, 'utf8');
            const generatedRel = toRelativeSkillManifest(skillPath, skillsRoot);
            const relativePath = path.relative(rootDir, skillPath);
            if (path.basename(skillPath) !== 'SKILL.md') {
                failures.push(`${relativePath} must use canonical manifest filename SKILL.md`);
            }

            const frontmatter = parseSkillFrontmatter(content);
            generatedSkillMetadata.set(skillPath, {
                frontmatter,
                generatedRel,
                relativePath
            });

            if (!frontmatter) {
                failures.push(`${relativePath} missing frontmatter block`);
            } else {
                const uniqueKeys = new Set(frontmatter.keys);
                if (!(uniqueKeys.has('name') && uniqueKeys.has('description'))) {
                    failures.push(`${relativePath} frontmatter missing required keys (name, description)`);
                }

                const sourceFrontmatter = sourceFrontmatterByRel.get(generatedRel);
                if (Boolean(sourceFrontmatter?.concise) !== Boolean(frontmatter.concise)) {
                    failures.push(`${relativePath} instruction-profile mismatch with source (.claude/skills/${generatedRel})`);
                }
                const sourceDisableModelInvocation = parseBooleanFrontmatterValue(sourceFrontmatter?.values?.['disable-model-invocation']);
                const generatedDisableModelInvocation = parseBooleanFrontmatterValue(frontmatter.values?.['disable-model-invocation']);
                if (sourceDisableModelInvocation !== generatedDisableModelInvocation) {
                    failures.push(`${relativePath} disable-model-invocation mismatch with source (.claude/skills/${generatedRel})`);
                }
                // Codex ignores the frontmatter flag, so a manual-only skill needs its invocation policy file.
                if (sourceDisableModelInvocation === true) {
                    const policyText = await fs.readFile(path.join(path.dirname(skillPath), 'agents', 'openai.yaml'), 'utf8').catch(() => '');
                    const policyFailure = checkManualOnlyPolicy(sourceDisableModelInvocation, policyText, relativePath);
                    if (policyFailure) failures.push(policyFailure);
                }
            }

            const missing = frontmatter?.concise ? [] : missingSnippets(content);
            if (missing.length > 0) {
                failures.push(`${relativePath} missing contract snippet(s): ${missing.join(' | ')}`);
            }

            for (const marker of RETIRED_MIRROR_MARKERS) {
                if (content.includes(marker)) failures.push(`${relativePath} carries the retired injected block ${marker}; mirrored skills carry exactly their source text, the universal hook delivers the shared protocols`);
            }
            failures.push(...checkNoUniversalProtocolText(content, relativePath));

            if (/\bAgent\(/.test(content) || /\bsubagent_type[=:]/.test(content)) {
                failures.push(`${relativePath} contains Claude Agent invocation syntax; Codex mirrors must use spawn_agent/agent_type examples`);
            }

            const layoutFailure = checkMainContentBeforeSyncBlocks(content, relativePath);
            if (layoutFailure) {
                failures.push(layoutFailure);
            }
        }

        const nameToPaths = new Map();
        for (const { frontmatter, relativePath } of generatedSkillMetadata.values()) {
            const name = frontmatter?.values?.name || '';
            if (!name) continue;
            if (!nameToPaths.has(name)) nameToPaths.set(name, []);
            nameToPaths.get(name).push(relativePath);
        }
        for (const [name, paths] of nameToPaths.entries()) {
            if (paths.length > 1) {
                failures.push(`Duplicate skill frontmatter name "${name}" in: ${paths.join(', ')}`);
            }
        }
    }

    if (!(await exists(claudeAgentsRoot))) {
        failures.push(`Missing source agents directory: ${path.relative(rootDir, claudeAgentsRoot)}`);
    }

    if (!(await exists(agentsRoot))) {
        failures.push(`Missing generated agents directory: ${path.relative(rootDir, agentsRoot)}`);
    } else {
        const sourceAgentEntries = (await exists(claudeAgentsRoot))
            ? (await fs.readdir(claudeAgentsRoot, { withFileTypes: true }))
                  .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
                  .map(entry => path.basename(entry.name, '.md'))
            : [];

        const agentEntries = await fs.readdir(agentsRoot, { withFileTypes: true });
        const generatedAgentNames = agentEntries
            .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.toml'))
            .map(entry => path.basename(entry.name, '.toml'));

        const generatedSet = new Set(generatedAgentNames);
        const sourceSet = new Set(sourceAgentEntries);

        for (const sourceName of sourceSet) {
            if (!generatedSet.has(sourceName)) {
                failures.push(`Missing mirrored agent: .codex/agents/${sourceName}.toml`);
            }
        }
        for (const generatedName of generatedSet) {
            if (!sourceSet.has(generatedName)) {
                failures.push(`Unexpected mirrored agent not present in source: .codex/agents/${generatedName}.toml`);
            }
        }

        for (const entry of agentEntries) {
            if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.toml')) continue;
            const agentPath = path.join(agentsRoot, entry.name);
            const content = await fs.readFile(agentPath, 'utf8');
            const missing = missingSnippets(content);
            if (missing.length > 0) {
                failures.push(`${path.relative(rootDir, agentPath)} missing contract snippet(s): ${missing.join(' | ')}`);
            }
        }
    }

    if (await exists(contextPath)) {
        failures.push(`${path.relative(rootDir, contextPath)} is a retired mirror; the sync removes it (run node .claude/skills/sync-codex/scripts/run-codex-sync.mjs)`);
    }
    if (!(await exists(projectAgentsPath))) {
        failures.push(`Missing AGENTS.md file: ${path.relative(rootDir, projectAgentsPath)}`);
    } else {
        failures.push(...checkCompactAgentsProjection(await fs.readFile(projectAgentsPath, 'utf8')));
    }

    await checkRequiredDebuggerTraceFiles(DEBUGGER_TRACE_REQUIRED_SOURCE_PATHS, failures);
    await checkRequiredDebuggerTraceFiles(DEBUGGER_TRACE_REQUIRED_GENERATED_SKILLS, failures);

    if (failures.length > 0) {
        console.error('[codex-skill-compliance] FAIL');
        for (const failure of failures) {
            console.error(` - ${failure}`);
        }
        console.error('');
        console.error(formatMirrorRemediation(failures));
        process.exit(1);
    }

    console.log('[codex-skill-compliance] PASS - strict execution contract present across generated Codex artifacts');
}

if (isInvokedAsScript(process.argv[1], fileURLToPath(import.meta.url))) {
    await main();
}
