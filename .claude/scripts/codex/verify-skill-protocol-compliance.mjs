#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = process.cwd();
const claudeSkillsRoot = path.join(rootDir, '.claude', 'skills');
const skillsRoot = path.join(rootDir, '.agents', 'skills');
const claudeAgentsRoot = path.join(rootDir, '.claude', 'agents');
const agentsRoot = path.join(rootDir, '.codex', 'agents');
const contextPath = path.join(rootDir, '.codex', 'CODEX_CONTEXT.md');
const projectAgentsPath = path.join(rootDir, 'AGENTS.md');
const canonicalSyncPath = path.join(rootDir, '.claude', 'skills', 'shared', 'sync-inline-versions.md');
const SKILL_PROTOCOL_MARKER = 'CODEX:SYNC-PROMPT-PROTOCOLS:START';
const SKILL_PROTOCOL_END_MARKER = 'CODEX:SYNC-PROMPT-PROTOCOLS:END';
const CONTEXT_PROTOCOL_TOP_MARKER = 'PROMPT-PROTOCOLS:START';
const CONTEXT_PROTOCOL_BOTTOM_MARKER = 'PROMPT-PROTOCOLS-BOTTOM:START';
const WORKFLOWS_START_MARKER = 'WORKFLOWS:START';
const WORKFLOWS_END_MARKER = 'WORKFLOWS:END';
const AGENTS_CONTEXT_MIRROR_START = 'CODEX-CONTEXT-MIRROR:START';
const AGENTS_CONTEXT_MIRROR_END = 'CODEX-CONTEXT-MIRROR:END';
const DEBUGGER_TRACE_MARKER = '<!-- SYNC:end-to-start-debugger-trace -->';
const DEBUGGER_TRACE_REQUIRED_SNIPPETS = [
    'End-to-Start Debugger Trace',
    'observed final state',
    'Enumerate all feeder paths',
    'hypothesis matrix',
    'owning fix layer',
    'forward convergence proof'
];

const DEBUGGER_TRACE_REQUIRED_SOURCE_PATHS = [
    '.claude/skills/graph-trace/SKILL.md',
    '.claude/skills/graph-query/SKILL.md',
    '.claude/skills/investigate/SKILL.md',
    '.claude/skills/debug-investigate/SKILL.md',
    '.claude/skills/fix/SKILL.md',
    '.claude/skills/prove-fix/SKILL.md',
    '.claude/skills/plan-execute/SKILL.md',
    '.claude/skills/feature-implement/SKILL.md',
    '.claude/skills/review-changes/SKILL.md',
    '.claude/skills/workflow-review-changes/SKILL.md',
    '.claude/skills/code-review/SKILL.md',
    '.claude/skills/why-review/skill.md',
    '.claude/agents/code-reviewer.md',
    '.claude/skills/workflow-bugfix/SKILL.md',
    '.claude/skills/workflow-feature/SKILL.md'
];

const DEBUGGER_TRACE_REQUIRED_GENERATED_SKILLS = DEBUGGER_TRACE_REQUIRED_SOURCE_PATHS
    .filter(relPath => relPath.startsWith('.claude/skills/'))
    .map(relPath => relPath.replace('.claude/skills/', '.agents/skills/').replace(/\/skill\.md$/i, '/SKILL.md'));

const REQUIRED_CONTRACT_SNIPPETS = [
    'Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.',
    'Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.',
    'Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.',
    'Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.',
    'For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.',
    'If a required step/tool cannot run in this environment, stop and ask the user before adapting.'
];

// P6 — canonical protocol-body parity in the auto-loaded mirror (AGENTS.md = Codex project
// context). The mirror term-rewrites tool nouns (Agent->spawn_agent, "Skill tool"->lowercased,
// etc.), so byte-equality vs the raw canonical :full block is INVALID and would false-fail.
// Instead anchor on each block's
// rewrite-invariant signature (a line that contains no tool term) and assert it appears EXACTLY
// ONCE — proving the protocol is both PRESENT (reachability) and DEDUPED (the CK-marked CLAUDE.md
// copies were stripped during mirroring; the body is baked once via the prompt-protocol section).
const PROTOCOL_BODY_SIGNATURES = [
    { tag: 'critical-thinking-mindset:full', signature: '[CRITICAL-THINKING-MINDSET]' },
    { tag: 'ai-mistake-prevention:full', signature: '## Common AI Mistake Prevention (System Lessons)' }
];

const FORBIDDEN_SKILL_PROTOCOL_PATTERNS = [
    {
        pattern: /^## Learned Lessons\b/m,
        reason: 'inline learned-lessons section'
    },
    {
        pattern: /^# Lessons Learned\b/m,
        reason: 'raw lessons.md heading'
    },
    {
        pattern: /\[\d{4}-\d{2}-\d{2}\].*Holistic-first:/,
        reason: 'dated lessons.md entry'
    }
];

async function exists(targetPath) {
    try {
        await fs.access(targetPath);
        return true;
    } catch {
        return false;
    }
}

async function collectFilesByName(dirPath, fileName, { caseInsensitive = false } = {}) {
    const collected = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            collected.push(...(await collectFilesByName(fullPath, fileName, { caseInsensitive })));
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
    return { keys, values };
}

function parseBooleanFrontmatterValue(value) {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    return null;
}

function missingSnippets(content) {
    return REQUIRED_CONTRACT_SNIPPETS.filter(snippet => !content.includes(snippet));
}

function normalizeForCompare(content) {
    return content.replace(/\r\n/g, '\n').trim();
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasStandaloneMarker(content, marker) {
    return new RegExp(`^\\s*<!-- ${escapeRegExp(marker)} -->\\s*$`, 'm').test(content);
}

function extractManagedBlock(content, startMarker, endMarker) {
    const pattern = new RegExp(`^\\s*<!-- ${escapeRegExp(startMarker)} -->\\s*$[\\s\\S]*?^\\s*<!-- ${escapeRegExp(endMarker)} -->\\s*$`, 'm');
    const match = content.match(pattern);
    return match?.[0] ?? null;
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

export function checkDebuggerTraceCoverage(content, relativePath) {
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
    return `${relativePath} missing end-to-start debugger trace gate snippet(s): ${missing.join(' | ')}`;
}

// Actionable remediation for a FAILing run. Every failure this gate raises is a generated-mirror
// integrity problem, and the recurring cause is a stray writer (a standalone `prettier --write` on
// AGENTS.md / .codex, or a hand-edit) drifting a mirror off its canonical source. The sync is the
// SOLE writer of these bytes, so the fix is always "regenerate, never hand-format". Pure + exported
// so it is unit-testable without spawning the verifier or inducing a real drift.
export function formatMirrorRemediation(failures) {
    const lines = [
        'Remediation: regenerate the Codex mirrors with `npm run codex:sync` (or `npm run sync:all`',
        'for all three surfaces), then re-run this gate. Without npm / a root package.json (e.g. a',
        'project that only copied `.claude`), run the standalone orchestrator directly — it is the',
        'single source of truth the npm scripts delegate to, no package.json required:',
        '  node .claude/skills/sync-codex/scripts/run-codex-sync.mjs',
        'NEVER hand-edit or `prettier --write` the generated mirrors (AGENTS.md, .codex/**, .agents/**)',
        '— they are .prettierignore-d so the sync stays their only writer.'
    ];
    if (Array.isArray(failures) && failures.some(f => /mirror|drift/i.test(String(f)))) {
        lines.push('A "context mirror content drifted" failure almost always means a mirror file was reformatted');
        lines.push('or edited after the last sync; `npm run codex:sync` rewrites it byte-for-byte from the source.');
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

// P6 (AGENTS.md): each canonical :full block's rewrite-invariant signature must appear EXACTLY ONCE
// in the auto-loaded mirror. Fail-closed at every gap — a missing canonical source, missing mirror,
// stale signature, or wrong occurrence count is a FAILURE, never a skip.
async function checkCanonicalProtocolBodySignatures(failures) {
    if (!(await exists(canonicalSyncPath))) {
        failures.push(`Missing canonical protocol source: ${path.relative(rootDir, canonicalSyncPath)} (cannot verify mirror protocol-body parity)`);
        return;
    }
    const canonicalText = (await fs.readFile(canonicalSyncPath, 'utf8')).replace(/\r\n/g, '\n');

    // Anchor: each signature MUST still live in the canonical :full block, else it is stale and the
    // count check below would silently drift. This ties the check to canonical, not to a hardcoded string.
    for (const { tag, signature } of PROTOCOL_BODY_SIGNATURES) {
        if (!canonicalText.includes(signature)) {
            failures.push(`Canonical SYNC:${tag} no longer contains body signature "${signature}" — update PROTOCOL_BODY_SIGNATURES in .claude/scripts/codex/verify-skill-protocol-compliance.mjs`);
        }
    }

    const targets = [
        { label: 'AGENTS.md', filePath: projectAgentsPath } // P6 — Codex project context
    ];
    for (const { label, filePath } of targets) {
        if (!(await exists(filePath))) {
            failures.push(`Missing protocol mirror ${label}: ${path.relative(rootDir, filePath)} (fail-closed — protocol reachability unverifiable)`);
            continue;
        }
        const content = await fs.readFile(filePath, 'utf8');
        for (const { tag, signature } of PROTOCOL_BODY_SIGNATURES) {
            const n = countOccurrences(content, signature);
            if (n !== 1) {
                failures.push(`${label}: canonical SYNC:${tag} body signature "${signature}" found ${n}× (expected exactly 1 — a single deduped copy of the :full block)`);
            }
        }
    }
}

async function checkRequiredDebuggerTraceFiles(relativePaths, failures) {
    for (const relPath of relativePaths) {
        const fullPath = path.join(rootDir, ...relPath.split('/'));
        if (!(await exists(fullPath))) {
            failures.push(`${relPath} missing required debugger trace target`);
            continue;
        }
        const content = await fs.readFile(fullPath, 'utf8');
        const failure = checkDebuggerTraceCoverage(content, relPath);
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
                const sourceDisableModelInvocation = parseBooleanFrontmatterValue(sourceFrontmatter?.values?.['disable-model-invocation']);
                const generatedDisableModelInvocation = parseBooleanFrontmatterValue(frontmatter.values?.['disable-model-invocation']);
                if (sourceDisableModelInvocation !== generatedDisableModelInvocation) {
                    failures.push(`${relativePath} disable-model-invocation mismatch with source (.claude/skills/${generatedRel})`);
                }
            }

            const missing = missingSnippets(content);
            if (missing.length > 0) {
                failures.push(`${relativePath} missing contract snippet(s): ${missing.join(' | ')}`);
            }

            if (!content.includes(SKILL_PROTOCOL_MARKER)) {
                failures.push(`${relativePath} missing synced prompt-protocol marker (${SKILL_PROTOCOL_MARKER})`);
            }

            const protocolBlock = extractManagedBlock(content, SKILL_PROTOCOL_MARKER, SKILL_PROTOCOL_END_MARKER);
            if (protocolBlock) {
                for (const forbidden of FORBIDDEN_SKILL_PROTOCOL_PATTERNS) {
                    if (forbidden.pattern.test(protocolBlock)) {
                        failures.push(`${relativePath} synced prompt-protocol block contains ${forbidden.reason}; generated .agents skills must reference docs/project-reference/lessons.md instead of inlining learned lessons`);
                    }
                }
            }

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

    if (!(await exists(contextPath))) {
        failures.push(`Missing Codex context file: ${path.relative(rootDir, contextPath)}`);
    } else {
        const contextText = await fs.readFile(contextPath, 'utf8');
        const missing = missingSnippets(contextText);
        if (missing.length > 0) {
            failures.push(`${path.relative(rootDir, contextPath)} missing contract snippet(s): ${missing.join(' | ')}`);
        }
        if (!contextText.includes(CONTEXT_PROTOCOL_TOP_MARKER)) {
            failures.push(`${path.relative(rootDir, contextPath)} missing top prompt protocol mirror marker (${CONTEXT_PROTOCOL_TOP_MARKER})`);
        }
        const topIndex = contextText.indexOf(CONTEXT_PROTOCOL_TOP_MARKER);
        const bottomIndex = contextText.indexOf(CONTEXT_PROTOCOL_BOTTOM_MARKER);
        const workflowsStartIndex = contextText.indexOf(WORKFLOWS_START_MARKER);
        const workflowsEndIndex = contextText.indexOf(WORKFLOWS_END_MARKER);

        if (workflowsStartIndex >= 0 && topIndex > workflowsStartIndex) {
            failures.push(`${path.relative(rootDir, contextPath)} top prompt protocol marker must appear before workflows (${WORKFLOWS_START_MARKER})`);
        }
        // Bottom protocol mirror is optional; when present it must remain after workflows.
        if (workflowsEndIndex >= 0 && bottomIndex >= 0 && bottomIndex < workflowsEndIndex) {
            failures.push(`${path.relative(rootDir, contextPath)} bottom prompt protocol marker must appear after workflows (${WORKFLOWS_END_MARKER})`);
        }

        if (!(await exists(projectAgentsPath))) {
            failures.push(`Missing AGENTS.md file: ${path.relative(rootDir, projectAgentsPath)}`);
        } else {
            const agentsText = await fs.readFile(projectAgentsPath, 'utf8');
            if (!hasStandaloneMarker(agentsText, AGENTS_CONTEXT_MIRROR_START)) {
                failures.push(`${path.relative(rootDir, projectAgentsPath)} missing managed context mirror start marker (${AGENTS_CONTEXT_MIRROR_START})`);
            }
            if (!hasStandaloneMarker(agentsText, AGENTS_CONTEXT_MIRROR_END)) {
                failures.push(`${path.relative(rootDir, projectAgentsPath)} missing managed context mirror end marker (${AGENTS_CONTEXT_MIRROR_END})`);
            }
            const mirroredBlock = extractManagedBlock(agentsText, AGENTS_CONTEXT_MIRROR_START, AGENTS_CONTEXT_MIRROR_END);
            if (mirroredBlock) {
                // Compare the mirrored payload, stripping wrapper text from AGENTS managed block.
                const normalizedMirrorBlock = mirroredBlock.replace(/\r\n/g, '\n');
                const mirroredPayload = normalizedMirrorBlock
                    .replace(`<!-- ${AGENTS_CONTEXT_MIRROR_START} -->`, '')
                    .replace(`<!-- ${AGENTS_CONTEXT_MIRROR_END} -->`, '')
                    .replace(/^## Codex Context Mirror \(Auto-Synced\)\n\nThis block is auto-generated[\s\S]*?\n\n/m, '')
                    .trim();
                if (normalizeForCompare(mirroredPayload) !== normalizeForCompare(contextText)) {
                    failures.push(`${path.relative(rootDir, projectAgentsPath)} context mirror content drifted from ${path.relative(rootDir, contextPath)}`);
                }
            }
        }
    }

    await checkRequiredDebuggerTraceFiles(DEBUGGER_TRACE_REQUIRED_SOURCE_PATHS, failures);
    await checkRequiredDebuggerTraceFiles(DEBUGGER_TRACE_REQUIRED_GENERATED_SKILLS, failures);

    await checkCanonicalProtocolBodySignatures(failures);

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

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    await main();
}
