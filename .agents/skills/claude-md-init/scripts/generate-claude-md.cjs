#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const builders = require('./section-builders.cjs');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const CONFIG_PATH = path.join(PROJECT_DIR, 'docs', 'project-config.json');
const CLAUDE_MD_PATH = path.join(PROJECT_DIR, 'CLAUDE.md');
const BACKUP_PATH = path.join(PROJECT_DIR, '.claude-md.backup');
const TEMPLATE_PATH = path.join(__dirname, '..', 'references', 'claude-md-template.md');

const SECTION_OPEN = /^<!-- SECTION:(\S+) -->$/;
const SECTION_CLOSE = /^<!-- \/SECTION:(\S+) -->$/;

// Heading patterns for smart-merge (no markers)
const HEADING_MAP = [
    { pattern: /tl;dr|what you must know/i, key: 'tldr' },
    { pattern: /golden rule/i, key: 'golden-rules' },
    { pattern: /decision quick/i, key: 'decision-quick-ref' },
    { pattern: /key file location|file location/i, key: 'key-locations' },
    { pattern: /development command|dev command/i, key: 'dev-commands' },
    { pattern: /infrastructure port/i, key: 'infra-ports' },
    { pattern: /api.*port|service port/i, key: 'api-ports' },
    { pattern: /integration test/i, key: 'integration-testing' },
    { pattern: /e2e test|end.to.end/i, key: 'e2e-testing' },
    { pattern: /skill activation/i, key: 'skill-activation' },
    { pattern: /documentation (index|system)/i, key: 'doc-index' },
    { pattern: /doc lookup/i, key: 'doc-lookup' }
];

// Builder function map
const BUILDER_MAP = {
    tldr: c => builders.buildTldr(c),
    'golden-rules': c => builders.buildGoldenRules(c),
    'decision-quick-ref': c => builders.buildDecisionQuickRef(c),
    'key-locations': c => builders.buildKeyLocations(c),
    'dev-commands': c => builders.buildDevCommands(c),
    'infra-ports': c => builders.buildInfraPorts(c),
    'api-ports': c => builders.buildApiPorts(c),
    'integration-testing': c => builders.buildIntegrationTesting(c),
    'e2e-testing': c => builders.buildE2eTesting(c),
    'skill-activation': c => builders.buildSkillActivation(c),
    'doc-index': (c, d) => builders.buildDocIndex(c, d),
    'doc-lookup': c => builders.buildDocLookup(c)
};

function loadConfig() {
    if (!fs.existsSync(CONFIG_PATH)) return {};
    try {
        return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    } catch {
        console.error('[WARN] Failed to parse project-config.json, using empty config');
        return {};
    }
}

function hasMarkers(content) {
    return SECTION_OPEN.test(content.split('\n').find(l => SECTION_OPEN.test(l.trim())) || '');
}

function detectMode() {
    if (!fs.existsSync(CLAUDE_MD_PATH)) return 'init';
    const content = fs.readFileSync(CLAUDE_MD_PATH, 'utf-8');
    return hasMarkers(content) ? 'update' : 'smart-merge';
}

function buildSections(config) {
    const sections = {};
    for (const [key, builder] of Object.entries(BUILDER_MAP)) {
        const content = builder(config, PROJECT_DIR);
        if (content) sections[key] = content;
    }
    return sections;
}

function populateTemplate(template, sections) {
    const lines = template.split('\n');
    const output = [];
    let inSection = false;
    let currentKey = null;

    for (const line of lines) {
        const trimmed = line.trim();
        const openMatch = trimmed.match(SECTION_OPEN);
        const closeMatch = trimmed.match(SECTION_CLOSE);

        if (openMatch) {
            currentKey = openMatch[1];
            const content = sections[currentKey];
            if (content) {
                output.push(line); // keep open marker
                output.push('');
                output.push(content);
                output.push('');
                inSection = true;
            } else {
                // No data — skip entire section including markers
                inSection = true;
            }
            continue;
        }

        if (closeMatch) {
            if (sections[currentKey]) {
                output.push(line); // keep close marker
            }
            inSection = false;
            currentKey = null;
            continue;
        }

        if (!inSection) {
            output.push(line);
        }
        // Skip template placeholder lines inside sections
    }

    return output.join('\n');
}

function updateMarkedSections(existing, sections) {
    const lines = existing.split('\n');
    const output = [];
    let inSection = false;
    let currentKey = null;

    for (const line of lines) {
        const trimmed = line.trim();
        const openMatch = trimmed.match(SECTION_OPEN);
        const closeMatch = trimmed.match(SECTION_CLOSE);

        if (openMatch) {
            currentKey = openMatch[1];
            output.push(line); // keep open marker
            if (sections[currentKey]) {
                output.push('');
                output.push(sections[currentKey]);
                output.push('');
            }
            inSection = true;
            continue;
        }

        if (closeMatch) {
            output.push(line); // keep close marker
            inSection = false;
            currentKey = null;
            continue;
        }

        if (!inSection) {
            output.push(line);
        }
        // Skip old content inside sections — replaced above
    }

    return output.join('\n');
}

function createBackup() {
    if (fs.existsSync(CLAUDE_MD_PATH)) {
        fs.copyFileSync(CLAUDE_MD_PATH, BACKUP_PATH);
        console.log(`[OK] Backup created: ${path.basename(BACKUP_PATH)}`);
    }
}

function main() {
    const args = process.argv.slice(2);
    const modeFlag = args.find(a => a.startsWith('--mode='))?.split('=')[1] || args[args.indexOf('--mode') + 1];
    const isDetect = args.includes('--detect');

    if (isDetect) {
        const detected = detectMode();
        console.log(`[DETECT] Mode: ${detected}`);
        console.log(`[DETECT] CLAUDE.md: ${fs.existsSync(CLAUDE_MD_PATH) ? 'EXISTS' : 'MISSING'}`);
        console.log(`[DETECT] project-config.json: ${fs.existsSync(CONFIG_PATH) ? 'EXISTS' : 'MISSING'}`);
        process.exit(0);
    }

    const mode = modeFlag || detectMode();
    console.log(`[MODE] ${mode}`);

    const config = loadConfig();
    const sections = buildSections(config);

    const generated = Object.keys(sections);
    const skipped = Object.keys(BUILDER_MAP).filter(k => !sections[k]);
    console.log(`[SECTIONS] Generated: ${generated.join(', ') || 'none'}`);
    console.log(`[SECTIONS] Skipped (no data): ${skipped.join(', ') || 'none'}`);

    if (mode === 'init') {
        if (!fs.existsSync(TEMPLATE_PATH)) {
            console.error('[ERROR] Template not found:', TEMPLATE_PATH);
            process.exit(1);
        }
        createBackup();
        const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
        const output = populateTemplate(template, sections);

        // Replace top-level placeholders
        const projectName = config.project?.name || 'Project';
        const finalOutput = output.replace(/\{project-name\}/g, projectName).replace(/\{project-description\}/g, config.project?.description || '');

        fs.writeFileSync(CLAUDE_MD_PATH, finalOutput, 'utf-8');
        console.log(`[OK] CLAUDE.md created (init mode)`);
    } else if (mode === 'update') {
        if (!fs.existsSync(CLAUDE_MD_PATH)) {
            console.error('[ERROR] CLAUDE.md not found. Use --mode init first.');
            process.exit(1);
        }
        createBackup();
        const existing = fs.readFileSync(CLAUDE_MD_PATH, 'utf-8');
        const output = updateMarkedSections(existing, sections);
        fs.writeFileSync(CLAUDE_MD_PATH, output, 'utf-8');
        console.log(`[OK] CLAUDE.md updated (${generated.length} sections synced)`);
    } else if (mode === 'smart-merge') {
        console.log('[INFO] Smart-merge: CLAUDE.md has no markers. AI should handle migration.');
        console.log('[INFO] Run /claude-md-init in update mode after AI adds markers.');
        process.exit(0);
    } else if (mode === 'refactor') {
        console.log('[INFO] Refactor mode is AI-only. No script action needed.');
        process.exit(0);
    } else {
        console.error(`[ERROR] Unknown mode: ${mode}. Use init, update, or refactor.`);
        process.exit(1);
    }

    // Summary
    const stats = fs.statSync(CLAUDE_MD_PATH);
    const lines = fs.readFileSync(CLAUDE_MD_PATH, 'utf-8').split('\n').length;
    console.log(`[STATS] ${lines} lines, ${(stats.size / 1024).toFixed(1)}KB`);
}

main();
