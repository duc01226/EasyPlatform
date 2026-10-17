#!/usr/bin/env node
/**
 * Settings help for `/framework-config --mode=help config`.
 *
 * Prints, from their owning sources only, every setting a developer can change
 * outside the project config (default `docs/project-config.json`;
 * `portability.projectConfigPath` in `.ck.json` relocates it):
 *
 *   - every `.ck.json` / `.ck.local.json` option  (CK_SCHEMA + config-option-describes)
 *   - the adopter quick-settings table           (.claude/config/README.md)
 *   - the environment variables                  (.claude/docs/configuration/README.md)
 *   - where to find every project-config option  (project-config help script)
 *
 * Nothing is transcribed: a new option appears here once its schema entry or
 * owning doc row exists.
 *
 * PORTABILITY CONTRACT (PORT-001): plain `node` >= 18, `node:` built-ins only.
 *
 * Usage:
 *   node .claude/scripts/ck-config-help.cjs          Markdown for /framework-config --mode=help
 *   node .claude/scripts/ck-config-help.cjs --json   { options: [...], sections: {...} }
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CLAUDE_DIR = path.resolve(__dirname, '..');
const { CK_SCHEMA } = require(path.join(CLAUDE_DIR, 'hooks', 'lib', 'ck-config-schema.cjs'));
const { CK_CONFIG_DESCRIBES, describeField, walkSchemaFields } = require(path.join(__dirname, 'lib', 'config-option-describes.cjs'));

const DOC_SECTIONS = [
    { id: 'quickSettings', file: path.join(CLAUDE_DIR, 'config', 'README.md'), heading: '## Adopter quick settings' },
    { id: 'environment', file: path.join(CLAUDE_DIR, 'docs', 'configuration', 'README.md'), heading: '## Environment Variables' }
];

function allowedValues(schema) {
    if (Array.isArray(schema.enum)) return schema.enum.join(' | ');
    if (Array.isArray(schema.valuesEnum)) return `{ <key>: ${schema.valuesEnum.join(' | ')} }`;
    if (typeof schema.min === 'number' || typeof schema.max === 'number') return `${schema.min ?? ''}..${schema.max ?? ''}`;
    if (schema.itemType) return `${schema.itemType}[]`;
    return '';
}

/** Help text on one line, so it fits a table cell. */
function oneLine(text) {
    return String(text || '')
        .split(/\r?\n/)
        .map(part => part.trim())
        .filter(Boolean)
        .join(' ');
}

/** Every CK_SCHEMA field at any depth (the same walker the project-config help uses). */
function ckOptions(schema = CK_SCHEMA) {
    return walkSchemaFields(schema).map(({ key, schema: field }) => ({
        key,
        type: field.type || 'any',
        allowed: allowedValues(field),
        describe: oneLine(describeField(CK_CONFIG_DESCRIBES, key, field))
    }));
}

/**
 * The body of one markdown section: from its heading to the next heading of the same or higher
 * level. A heading-like line inside a fenced code block (``` or ~~~) never ends the section.
 */
function docSection(file, heading) {
    let text;
    try {
        text = fs.readFileSync(file, 'utf8');
    } catch {
        return null;
    }
    const lines = text.split(/\r?\n/);
    const start = lines.findIndex(line => line.trim() === heading);
    if (start < 0) return null;
    const level = heading.match(/^#+/)[0].length;
    let end = lines.length;
    let fence = null;
    for (let i = start + 1; i < lines.length; i++) {
        const marker = lines[i].match(/^\s*(`{3,}|~{3,})/);
        if (marker) {
            if (!fence) fence = marker[1][0];
            else if (marker[1][0] === fence) fence = null;
            continue;
        }
        if (fence) continue;
        const heading2 = lines[i].match(/^(#+)\s/);
        if (heading2 && heading2[1].length <= level) {
            end = i;
            break;
        }
    }
    return lines.slice(start + 1, end).join('\n').replace(/\n-{3,}\s*$/, '').trim();
}

function relative(file) {
    return path.relative(path.dirname(CLAUDE_DIR), file).split(path.sep).join('/');
}

function payload() {
    const sections = {};
    for (const section of DOC_SECTIONS) {
        sections[section.id] = { source: `${relative(section.file)} → ${section.heading.replace(/^#+\s*/, '')}`, body: docSection(section.file, section.heading) };
    }
    return { options: ckOptions(), sections };
}

function cell(value) {
    return String(value || '').replace(/\|/g, '\\|');
}

function renderMarkdown(data) {
    const out = [];
    out.push('## Every `.ck.json` option');
    out.push('');
    out.push('Set in `~/.claude/.ck.json` (you, every project), `./.claude/.ck.json` (team, committed) or `./.claude/.ck.local.json` (you, this project; wins). Generated from the settings schema.');
    out.push('');
    out.push('| Option | Type | Allowed | What it does |');
    out.push('| --- | --- | --- | --- |');
    for (const option of data.options) {
        out.push(`| \`${option.key}\` | ${option.type} | ${cell(option.allowed)} | ${cell(option.describe || '(no description in schema)')} |`);
    }
    const titles = { quickSettings: 'Adopter quick settings', environment: 'Environment variables' };
    for (const [id, section] of Object.entries(data.sections)) {
        out.push('');
        out.push(`## ${titles[id]}`);
        out.push('');
        out.push(`_Source: ${section.source}_`);
        out.push('');
        out.push(section.body || '(section not found — read the source file)');
    }
    out.push('');
    out.push('## Every project-config option');
    out.push('');
    out.push('Team options live in the project config (default `docs/project-config.json`; `portability.projectConfigPath` in `.ck.json` relocates it): routing tiers, code graph, token checkpoint, skill profile, commit trailer, conventions, testing and more. List them from their schema with:');
    out.push('');
    out.push('```bash');
    out.push('node .claude/skills/project-config/scripts/project-config-help.cjs --sections        # every top-level option, one line each');
    out.push('node .claude/skills/project-config/scripts/project-config-help.cjs --section=<name>  # one option with every nested field');
    out.push('node .claude/skills/project-config/scripts/project-config-help.cjs --search=<term>   # any field at any depth, by name or text');
    out.push('```');
    out.push('');
    out.push('Or run `/project-config --help`.');
    return out.join('\n');
}

function main() {
    const data = payload();
    if (process.argv.includes('--json')) {
        process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
        return;
    }
    process.stdout.write(`${renderMarkdown(data)}\n`);
}

if (require.main === module) main();

module.exports = { ckOptions, docSection, payload, renderMarkdown };
