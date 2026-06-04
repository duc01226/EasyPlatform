#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { buildSkillReferenceMap, prependCodexCompatibilityNote, rewriteClaudeToolTermsForCodex, rewriteSkillMentionsForCodex } from './compat-rewrite.mjs';
import { fileURLToPath } from 'node:url';

const args = new Set(process.argv.slice(2));
const rootDir = process.cwd();
const require = createRequire(import.meta.url);

function loadHooklessPromptProtocol() {
    const scriptDir = path.dirname(fileURLToPath(import.meta.url));
    const candidates = [
        path.join(rootDir, '.claude', 'scripts', 'lib', 'hookless-prompt-protocol.cjs'),
        path.join(scriptDir, '..', 'lib', 'hookless-prompt-protocol.cjs')
    ];
    for (const candidate of candidates) {
        try {
            return require(candidate);
        } catch {}
    }
    throw new Error('hookless prompt protocol builder is missing');
}

const {
    buildCodexPromptProtocolBlock
} = loadHooklessPromptProtocol();

const claudeAgentsDir = path.join(rootDir, '.claude', 'agents');
export const claudeSkillsDir = path.join(rootDir, '.claude', 'skills');
const codexAgentsDir = path.join(rootDir, '.codex', 'agents');
export const agentsSkillsDir = path.join(rootDir, '.agents', 'skills');
const codexConfigPath = path.join(rootDir, '.codex', 'config.toml');
const codexScriptsDir = path.join(rootDir, '.codex', 'scripts', 'codex');
const codexNotificationScriptPath = path.join(codexScriptsDir, 'codex-notify.mjs');
const bundledNotificationScriptPath = path.join(rootDir, '.claude', 'scripts', 'codex', 'codex-notify.mjs');
const agentsSkillsMirrorSentinelPath = path.join(agentsSkillsDir, '.codex-mirror.json');

const useSkills = !args.has('--no-skills');
const copySkills = args.has('--copy-skills');
const normalizeSourceSkills = args.has('--normalize-source-skills');
const MIRROR_EXCLUDED_DIRS = new Set(['.git', '.hg', '.svn', '.venv', 'node_modules', '__pycache__']);
const TEXT_FILE_EXTENSIONS = new Set(['.cjs', '.css', '.html', '.js', '.json', '.lock', '.md', '.mjs', '.py', '.sh', '.toml', '.ts', '.tsx', '.yaml', '.yml']);
const CODEX_PROTOCOLS_START = '<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->';
const CODEX_PROTOCOLS_END = '<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->';
const CODEX_PROJECT_REFERENCE_START = '<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->';
const CODEX_PROJECT_REFERENCE_END = '<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->';

function stripQuotes(value) {
    if (!value) return value;
    const trimmed = value.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        return trimmed.slice(1, -1).trim();
    }
    if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
        // Decode YAML single-quoted escaping and collapse repeated double-escaping
        // introduced by legacy non-idempotent normalization.
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

function upsertCodexNotificationConfig(configText) {
    const lines = configText.replace(/\r\n/g, '\n').split('\n');
    if (lines.length === 1 && lines[0] === '') {
        lines.pop();
    }

    let firstTableIndex = lines.findIndex(isTomlTableHeader);
    if (firstTableIndex === -1) firstTableIndex = lines.length;

    const notifyResult = upsertTomlKey(lines, 'notify', '["node", ".codex/scripts/codex/codex-notify.mjs"]', 0, firstTableIndex);
    if (notifyResult.inserted && firstTableIndex < lines.length) {
        lines.splice(firstTableIndex + 1, 0, '');
    }

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

function parseFrontmatterBoolean(value) {
    if (typeof value !== 'string') return null;
    const normalized = stripQuotes(value).toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    return null;
}

function parseFrontmatter(markdown) {
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

function deriveSkillDescription(body, skillName) {
    const headingMatch = body.match(/^#\s+(.+)$/m);
    if (headingMatch?.[1]) {
        return headingMatch[1].trim();
    }
    return `Claude skill mirrored for Codex compatibility: ${skillName}`;
}

function buildCodexProjectReferenceBlock() {
    return [
        CODEX_PROJECT_REFERENCE_START,
        '## Codex Project-Reference Loading (No Hooks)',
        '',
        'Codex uses static project-reference loading instead of runtime-injected project docs.',
        'When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.',
        '',
        '**Always read:**',
        '- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)',
        '- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)',
        '- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)',
        '',
        '**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.',
        '',
        '**Situation-based docs:**',
        '- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`',
        '- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`',
        '- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`',
        '- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above',
        '- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`',
        '- Integration test implementation/review: `integration-test-reference.md`',
        '- E2E test implementation/review: `e2e-test-reference.md`',
        '- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files',
        '',
        'Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.',
        CODEX_PROJECT_REFERENCE_END
    ].join('\n');
}

function stripManagedBlock(text, startMarker, endMarker) {
    const pattern = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}\\s*`, 'gm');
    return text.replace(pattern, '').trimEnd();
}

function prependManagedBlock(text, block, startMarker, endMarker) {
    const stripped = stripManagedBlock(text, startMarker, endMarker).trimStart();
    if (!block) return stripped;
    return `${block.trim()}\n\n${stripped}`;
}

function rewriteCodexBody(text, skillReferenceMap) {
    const withProjectReferenceBlock = prependManagedBlock(text, buildCodexProjectReferenceBlock(), CODEX_PROJECT_REFERENCE_START, CODEX_PROJECT_REFERENCE_END);
    return prependCodexCompatibilityNote(rewriteClaudeToolTermsForCodex(rewriteSkillMentionsForCodex(withProjectReferenceBlock, skillReferenceMap)));
}

function stripManagedProtocolBlock(text) {
    return stripManagedBlock(text, CODEX_PROTOCOLS_START, CODEX_PROTOCOLS_END);
}

function appendManagedProtocolBlock(text, protocolBlock) {
    const stripped = stripManagedProtocolBlock(text).trimEnd();
    if (!protocolBlock) return stripped;
    return `${stripped}\n\n${protocolBlock.trim()}\n`;
}

function stripTrailingWhitespace(text) {
    return text.replace(/[ \t]+$/gm, '');
}

function buildCodexSkillManifest(markdown, fallbackName, skillReferenceMap, protocolBlock, options = {}) {
    const { frontmatter, body } = parseFrontmatter(markdown);
    const name = stripQuotes(options.overrideName || frontmatter.name || fallbackName || 'unnamed-skill') || 'unnamed-skill';
    const description = stripQuotes(frontmatter.description) || deriveSkillDescription(body, name);
    const disableModelInvocation = parseFrontmatterBoolean(frontmatter['disable-model-invocation']);
    const bodyWithProtocols = appendManagedProtocolBlock(body, protocolBlock);
    const rewrittenBody = rewriteCodexBody(bodyWithProtocols, skillReferenceMap);

    const sanitizedFrontmatterLines = ['---', `name: ${name}`, `description: '${escapeYamlSingleQuoted(description)}'`];

    if (disableModelInvocation !== null) {
        sanitizedFrontmatterLines.push(`disable-model-invocation: ${disableModelInvocation ? 'true' : 'false'}`);
    }

    sanitizedFrontmatterLines.push('---');
    const sanitizedFrontmatter = sanitizedFrontmatterLines.join('\n');

    return `${sanitizedFrontmatter}\n\n${rewrittenBody.trim()}\n`;
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

function normalizePromptProtocolText(text) {
    if (!text || typeof text !== 'string') return null;
    const normalized = text.trim();
    return normalized.length > 0 ? normalized : null;
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

async function buildAlwaysInjectedPromptProtocolBlock() {
    return buildCodexPromptProtocolBlock(rootDir, {
        startMarker: CODEX_PROTOCOLS_START,
        endMarker: CODEX_PROTOCOLS_END
    });
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
    const updatedContent = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---/, updatedFrontmatter);
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

async function sanitizeSkillMirror(skillsRootDir, skillReferenceMap, protocolBlock) {
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
        const sanitizedSkill = buildCodexSkillManifest(source.skillText, exportedName, skillReferenceMap, protocolBlock, { overrideName: exportedName });
        await fs.writeFile(source.skillPath, sanitizedSkill, 'utf8');
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
            await fs.writeFile(markdownPath, rewrittenText, 'utf8');
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

    await fs.writeFile(filePath, content.replace(/\r\n/g, '\n').replace(/\r/g, '\n'), 'utf8');
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

async function migrateAgents() {
    const exists = await pathExists(claudeAgentsDir);
    if (!exists) {
        console.warn('[codex-migrate] .claude/agents not found, skipping sub-agent migration.');
        return 0;
    }

    await ensureDir(codexAgentsDir);

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

        const outputPath = path.join(codexAgentsDir, `${stemName}.toml`);
        await fs.writeFile(outputPath, toml, 'utf8');
        migrated += 1;
    }

    return migrated;
}

// Single source of truth for materializing the skill mirror into `targetDir`.
// Called by the real writer (setupSkills → agentsSkillsDir) AND by the sync-divergence
// oracle gate (→ throwaway staging dir). Sharing this path means the gate's "expected"
// output can never drift from real sync behavior. Returns the sanitized manifest count.
export async function materializeSkillMirror(targetDir, skillReferenceMap) {
    await fs.cp(claudeSkillsDir, targetDir, {
        recursive: true,
        force: true,
        filter: sourcePath => !sourcePath.split(path.sep).some(segment => MIRROR_EXCLUDED_DIRS.has(segment))
    });
    await normalizeTextLineEndingsUnderDir(targetDir);
    await canonicalizeSkillManifestNames(targetDir);
    const alwaysInjectedProtocolBlock = await buildAlwaysInjectedPromptProtocolBlock();
    return sanitizeSkillMirror(targetDir, skillReferenceMap, alwaysInjectedProtocolBlock);
}

async function setupSkills() {
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

    const sanitizedCount = await materializeSkillMirror(agentsSkillsDir, skillReferenceMap);
    await writeAgentsSkillsMirrorSentinel();
    const modeLabel = copySkills ? 'copied' : 'mirrored';
    return `${modeLabel} + sanitized + rewritten ${sanitizedCount} skill manifest(s)`;
}

async function setupCodexNotifications() {
    if (!(await pathExists(bundledNotificationScriptPath))) {
        return 'skipped (.claude/scripts/codex/codex-notify.mjs not found)';
    }

    await ensureDir(path.dirname(codexConfigPath));
    await ensureDir(codexScriptsDir);
    await fs.copyFile(bundledNotificationScriptPath, codexNotificationScriptPath);
    await normalizeTextFileLineEndings(codexNotificationScriptPath);

    let existingConfig = '';
    try {
        existingConfig = await fs.readFile(codexConfigPath, 'utf8');
    } catch (err) {
        if (err.code !== 'ENOENT') throw err;
        existingConfig = ['# Team-wide Codex defaults for this repository.', '# Applied when the project is trusted by Codex.', ''].join('\n');
    }

    const updatedConfig = upsertCodexNotificationConfig(existingConfig);
    if (updatedConfig !== existingConfig) {
        await fs.writeFile(codexConfigPath, updatedConfig, 'utf8');
    }

    return `configured ${path.relative(rootDir, codexConfigPath)} + ${path.relative(rootDir, codexNotificationScriptPath)}`;
}

async function main() {
    const normalizedClaudeSkills = normalizeSourceSkills ? await sanitizeClaudeSkillSourceManifests() : 0;
    const migratedAgentsCount = await migrateAgents();
    const skillsResult = await setupSkills();
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
const invokedAsScript = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
    await main();
}
