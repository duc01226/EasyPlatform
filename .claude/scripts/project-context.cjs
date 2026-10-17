#!/usr/bin/env node
'use strict';

/** Validate the complete config before exposing task-selected sections. No config is supported. */
function projectContext(status, sections = [], docsIndexPath = null) {
    if (status.state === 'invalid') throw new Error(`Invalid project config: ${status.errors.join('; ')}`);
    const config = status.config || {};
    for (const key of sections) {
        if (!Object.hasOwn(config, key)) throw new Error(`Undeclared config section: ${key}`);
    }
    return {
        state: status.state,
        configPath: status.filePath,
        docsIndexPath,
        project: config.project || null,
        portability: config.portability || {},
        docsRoots: config.docsRoots || {},
        specRoots: config.specRoots || {},
        // Preserve absent versus explicit []: these have different discovery semantics.
        ...(Object.hasOwn(config, 'referenceDocs') ? { referenceDocs: config.referenceDocs } : {}),
        availableSections: Object.keys(config),
        ...Object.fromEntries(sections.map(key => [key, config[key]]))
    };
}

function main(argv) {
    const sections = [];
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--context') continue;
        if (argv[i] === '--section' && argv[i + 1] && !argv[i + 1].startsWith('--')) sections.push(argv[++i]);
        else throw new Error('Usage: node .claude/scripts/project-context.cjs --context [--section <top-level-key>]');
    }
    const loader = require('../hooks/lib/project-config-loader.cjs');
    const status = loader.getProjectConfigStatus({ refresh: true });
    const result = projectContext({ ...status, filePath: loader.CONFIG_PATH }, sections, loader.getConfiguredDocsIndexPath());
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

module.exports = { projectContext, main };
if (require.main === module) {
    try { main(process.argv.slice(2)); }
    catch (error) { process.stderr.write(error.message + '\n'); process.exitCode = 1; }
}
