#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Section builders — convert project-config.json data to markdown sections.
 * Each function returns a string (markdown content) or null (skip section).
 */

// A runtime backing-service (any datastore/cache/broker, e.g. a DB or message
// queue) is modeled as a kind:"infrastructure" module carrying a meta.port —
// exactly the set buildInfraPorts renders in its own ports table. These are
// runtime dependencies, NOT source-code modules, so they must NOT pollute the
// "Apps/Services" list (buildTldr) or the "Key File Locations" tree
// (buildKeyLocations). Infrastructure CODE modules (an orchestrator/IaC project)
// carry no meta.port and are kept — they ARE real source locations.
function isInfraBackingService(mod) {
    return mod?.kind === 'infrastructure' && mod?.meta?.port != null;
}

function buildTldr(config) {
    const name = config.project?.name || 'Project';
    const desc = config.project?.description || '';
    const langs = config.project?.languages?.join(', ') || '';
    const framework = config.framework?.name || '';
    const modules = config.modules || [];
    const apps = modules.filter(m => !isInfraBackingService(m)).map(m => m.name).join(', ');

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
    const modules = (config.modules || []).filter(m => !isInfraBackingService(m));
    if (modules.length === 0) return null;

    const lines = modules.map(m => {
        const displayPath = (m.pathRegex || '').replace(/\[\\\\\/\]/g, '/').replace(/\\\\/g, '');
        return `${displayPath.padEnd(40)} # ${m.description || m.name}`;
    });

    return '```\n' + lines.join('\n') + '\n```';
}

function buildDevCommands(config) {
    const commands = config.testing?.commands;
    const lines = [];
    if (commands && typeof commands === 'object') {
        for (const [key, cmd] of Object.entries(commands)) {
            if (typeof cmd === 'string') {
                lines.push(`${cmd.padEnd(45)} # ${key}`);
            } else if (typeof cmd === 'object') {
                for (const [subkey, subcmd] of Object.entries(cmd)) {
                    lines.push(`${subcmd.padEnd(45)} # ${key}: ${subkey}`);
                }
            }
        }
    }

    // Optional freetext caveat rendered below the command block (e.g. platform-specific
    // invocation rules). Config-sourced so it survives every regeneration instead of
    // being a hand-edit the next `--mode update` silently wipes. Rendered independently of
    // the command block so a note configured WITHOUT commands is not silently dropped.
    const note = config.testing?.commandsNote;
    const hasNote = typeof note === 'string' && note.trim().length > 0;

    if (lines.length === 0 && !hasNote) return null;

    const parts = [];
    if (lines.length > 0) parts.push('```bash\n' + lines.join('\n') + '\n```');
    if (hasNote) parts.push(note.trim());
    return parts.join('\n\n');
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
    const e2e = config.e2eTesting || {};
    const doc = config.framework?.e2eTestDoc || e2e.guideDoc;
    const frameworks = config.testing?.frameworks || [];
    const hasE2e = frameworks.some(f => /selenium|playwright|cypress|specflow/i.test(f)) || !!e2e.framework;

    if (!doc && !hasE2e) return null;

    // Compose a stack descriptor from structured e2eTesting.architecture so the
    // generated line is at least as rich as a hand-authored one (avoids the
    // info-loss that otherwise forces a section to stay hand-authored).
    const PRETTY = {
        selenium: 'Selenium WebDriver',
        playwright: 'Playwright',
        cypress: 'Cypress',
        specflow: 'SpecFlow BDD',
        'page-object-model': 'Page Object Model'
    };
    const arch = e2e.architecture || {};
    const stack = [arch.webDriverType, arch.bddFramework, arch.pattern]
        .map(k => PRETTY[k]).filter(Boolean).join(' + ');
    const docLink = doc
        ? `Full guide: [${path.basename(doc)}](${doc}) for E2E test patterns, page objects, and configuration.`
        : '';

    if (stack && docLink) return `${stack}. ${docLink}`;
    if (stack) return `E2E stack: ${stack}.`;
    if (docLink) return docLink;
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
    return `When editing files matching these path patterns, pre-read the listed context first:\n\n| Path Pattern | Skill / Auto-Context | Pre-Read Files |\n|---|---|---|\n${rows.join('\n')}`;
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
    const featureRoot = 'docs/specs';

    const rows = modules
        .filter(m => m.meta?.domain)
        .map(m => {
            const docPath = `${featureRoot}/${m.name}/`;
            return `| ${m.meta.domain} | \`${docPath}\` |`;
        });

    rows.push(`| Feature specs, capability behavior, business rules, test cases | \`${featureRoot}/\` + \`docs/project-reference/feature-spec-reference.md\` |`);
    rows.push('| Spec paths, TC format, canonical vs derived spec artifacts | `docs/project-reference/spec-system-reference.md` |');
    rows.push('| Spec quality, AI-implementability, tech-agnostic prose | `docs/project-reference/spec-principles.md` |');
    rows.push('| Behavior or public contract changes, spec-test-code sync | `docs/project-reference/workflow-spec-test-code-cycle-reference.md` |');

    // Add framework docs
    if (config.framework?.backendPatternsDoc) {
        rows.push(`| Backend patterns, CQRS, validation | \`${config.framework.backendPatternsDoc}\` |`);
    }
    if (config.framework?.frontendPatternsDoc) {
        rows.push(`| Frontend patterns, components, stores | \`${config.framework.frontendPatternsDoc}\` |`);
    }

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
