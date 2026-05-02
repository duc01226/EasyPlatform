#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Section builders — convert project-config.json data to markdown sections.
 * Each function returns a string (markdown content) or null (skip section).
 */

function buildTldr(config) {
    const name = config.project?.name || 'Project';
    const desc = config.project?.description || '';
    const langs = config.project?.languages?.join(', ') || '';
    const framework = config.framework?.name || '';
    const modules = config.modules || [];
    const apps = modules.map(m => m.name).join(', ');

    const techParts = [langs, framework].filter(Boolean).join(' + ');
    const lines = [
        `> **Project:** ${name}${desc ? ` — ${desc}` : ''}`,
        `>`,
        techParts ? `> **Tech Stack:** ${techParts}` : null,
        `>`,
        apps ? `> **Apps/Services:** ${apps}` : null
    ].filter(Boolean);

    return lines.join('\n');
}

function buildGoldenRules(config) {
    const groups = config.contextGroups || [];
    const allRules = groups.flatMap(g => g.rules || []);
    if (allRules.length === 0) return null;

    // Deduplicate and number
    const unique = [...new Set(allRules)];
    const lines = unique.map((r, i) => `${i + 1}. ${r}`);
    return `**Golden Rules (memorize these):**\n\n${lines.join('\n')}`;
}

function buildDecisionQuickRef(config) {
    const modules = config.modules || [];
    if (modules.length === 0) return null;

    const rows = [];
    // Add framework-level patterns
    if (config.framework?.name) {
        rows.push(`| New API endpoint | Controller + CQRS Command |`, `| Business logic | Command Handler (Application layer) |`);
    }
    if (config.databases?.primary) {
        rows.push(`| Data access | Service-specific repository |`);
    }
    if (config.messaging?.broker) {
        rows.push(`| Cross-service sync | Entity Event Consumer (${config.messaging.broker}) |`);
    }

    // Add module-specific patterns
    for (const mod of modules) {
        if (mod.meta?.repository) {
            rows.push(`| ${mod.name} repository | \`${mod.meta.repository}\` |`);
        }
    }

    if (rows.length === 0) return null;
    return `**Decision Quick-Ref:**\n\n| Task | Pattern |\n|---|---|\n${rows.join('\n')}`;
}

function buildKeyLocations(config) {
    const modules = config.modules || [];
    if (modules.length === 0) return null;

    const lines = modules.map(m => {
        const displayPath = (m.pathRegex || '').replace(/\[\\\\\/\]/g, '/').replace(/\\\\/g, '');
        return `${displayPath.padEnd(40)} # ${m.description || m.name}`;
    });

    return '```\n' + lines.join('\n') + '\n```';
}

function buildDevCommands(config) {
    const commands = config.testing?.commands;
    if (!commands || Object.keys(commands).length === 0) return null;

    const lines = [];
    for (const [key, cmd] of Object.entries(commands)) {
        if (typeof cmd === 'string') {
            lines.push(`${cmd.padEnd(45)} # ${key}`);
        } else if (typeof cmd === 'object') {
            for (const [subkey, subcmd] of Object.entries(cmd)) {
                lines.push(`${subcmd.padEnd(45)} # ${key}: ${subkey}`);
            }
        }
    }

    if (lines.length === 0) return null;
    return '```bash\n' + lines.join('\n') + '\n```';
}

function buildInfraPorts(config) {
    // Look for infrastructure modules or well-known infra services
    const infra = [];
    const modules = config.modules || [];

    for (const mod of modules) {
        if (mod.kind === 'infrastructure' && mod.meta?.port) {
            infra.push({
                service: mod.name,
                port: String(mod.meta.port),
                credentials: mod.meta.credentials || '—'
            });
        }
    }

    if (infra.length === 0) return null;

    const rows = infra.map(i => `| ${i.service} | ${i.port} | ${i.credentials} |`);
    return `| Service | Port | Credentials |\n|---|---|---|\n${rows.join('\n')}`;
}

function buildApiPorts(config) {
    const modules = config.modules || [];
    const services = modules.filter(m => m.kind === 'backend-service' && m.meta?.port);
    if (services.length === 0) return null;

    const rows = services.map(s => {
        const ports = Array.isArray(s.meta.ports) ? s.meta.ports.join(', ') : String(s.meta.port);
        return `| ${s.name} | ${ports} |`;
    });

    return `| API Service | Port |\n|---|---|\n${rows.join('\n')}`;
}

function buildIntegrationTesting(config) {
    const doc = config.framework?.integrationTestDoc;
    if (!doc) return null;
    return `See [${path.basename(doc)}](${doc}) for integration test patterns and setup.`;
}

function buildE2eTesting(config) {
    const doc = config.framework?.e2eTestDoc;
    // Also check testing config
    const frameworks = config.testing?.frameworks || [];
    const hasE2e = frameworks.some(f => f.toLowerCase().includes('selenium') || f.toLowerCase().includes('playwright') || f.toLowerCase().includes('cypress'));

    if (!doc && !hasE2e) return null;
    if (doc) {
        return `See [${path.basename(doc)}](${doc}) for E2E test patterns, page objects, and configuration.`;
    }
    return `E2E testing framework(s): ${frameworks.join(', ')}`;
}

function buildSkillActivation(config) {
    const groups = config.contextGroups || [];
    if (groups.length === 0) return null;

    const rows = groups
        .filter(g => g.patternsDoc || g.guideDoc)
        .map(g => {
            const patterns = g.pathRegexes?.map(r => r.replace(/\[\\\\\/\]/g, '/').replace(/\\\\/g, '') + '**') || [];
            const doc = g.patternsDoc || g.guideDoc || '';
            return `| \`${patterns[0] || g.name}\` | _(auto-context)_ | \`${doc}\` |`;
        });

    if (rows.length === 0) return null;
    return `When working in specific areas, these skills MUST ATTENTION be automatically activated BEFORE any file creation or modification:\n\n| Path Pattern | Skill / Auto-Context | Pre-Read Files |\n|---|---|---|\n${rows.join('\n')}`;
}

function buildDocIndex(config, projectDir) {
    const docsDir = path.join(projectDir, 'docs');
    if (!fs.existsSync(docsDir)) return null;

    const tree = [];
    const entries = fs.readdirSync(docsDir, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
        if (entry.name.startsWith('.')) continue;
        if (entry.isDirectory()) {
            const subfiles = fs.readdirSync(path.join(docsDir, entry.name)).filter(f => f.endsWith('.md')).length;
            tree.push(`docs/${entry.name}/  (${subfiles} files)`);
        } else if (entry.name.endsWith('.md')) {
            tree.push(`docs/${entry.name}`);
        }
    }

    if (tree.length === 0) return null;
    return '```\n' + tree.join('\n') + '\n```';
}

function buildDocLookup(config) {
    const modules = config.modules || [];
    if (modules.length === 0) return null;

    const rows = modules
        .filter(m => m.meta?.domain)
        .map(m => {
            const docPath = `docs/business-features/${m.name}/`;
            return `| ${m.meta.domain} | \`${docPath}\` |`;
        });

    // Add framework docs
    if (config.framework?.backendPatternsDoc) {
        rows.push(`| Backend patterns, CQRS, validation | \`${config.framework.backendPatternsDoc}\` |`);
    }
    if (config.framework?.frontendPatternsDoc) {
        rows.push(`| Frontend patterns, components, stores | \`${config.framework.frontendPatternsDoc}\` |`);
    }

    if (rows.length === 0) return null;
    return `| If user prompt mentions... | Read first |\n|---|---|\n${rows.join('\n')}`;
}

module.exports = {
    buildTldr,
    buildGoldenRules,
    buildDecisionQuickRef,
    buildKeyLocations,
    buildDevCommands,
    buildInfraPorts,
    buildApiPorts,
    buildIntegrationTesting,
    buildE2eTesting,
    buildSkillActivation,
    buildDocIndex,
    buildDocLookup
};
