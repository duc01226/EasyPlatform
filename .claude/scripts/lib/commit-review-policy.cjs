'use strict';

// Review selection only: no Git authority, test waiver, receipt or review execution.
const fs = require('node:fs');
const routing = require('./workflow-routing-config.cjs');

const MODES = Object.freeze(['lightweight', 'risk-based']);
const RISKS = Object.freeze(['low', 'medium', 'high']);

function readMode(file) {
    if (!file) return undefined;
    let config;
    try {
        config = JSON.parse(routing.decodeConfigText(fs.readFileSync(file)));
    } catch (error) {
        if (error.code === 'ENOENT') return undefined;
        throw new Error(`Cannot read commit review settings: ${file}`);
    }
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
        throw new Error(`Expected a config object: ${file}`);
    }
    if (config.commit === undefined) return undefined;
    if (!config.commit || typeof config.commit !== 'object' || Array.isArray(config.commit)) {
        throw new Error(`Expected commit settings object: ${file}`);
    }
    const mode = config.commit.reviewMode;
    if (mode !== undefined && !MODES.includes(mode)) {
        throw new Error(`Invalid commit.reviewMode in ${file}; expected ${MODES.join(' or ')}`);
    }
    return mode;
}

function resolveCommitReviewMode(options = {}) {
    const rootDir = options.rootDir || process.cwd();
    const env = options.env || process.env;
    const layers = [{ source: 'default', mode: 'lightweight' }];
    for (const [source, file] of [
        ['project-config', routing.resolveProjectConfigPath(rootDir)],
        ['user-config', routing.resolveUserConfigPath(options.homeDir)],
        ['local-override', routing.resolveLocalOverridePath(rootDir)]
    ]) {
        layers.push({ source, file, mode: readMode(file) });
    }
    const value = env.CK_COMMIT_REVIEW_MODE;
    if (value !== undefined && value.trim() !== '') {
        const mode = value.trim().replace(/^(["'])(.*)\1$/, '$2').toLowerCase();
        if (!MODES.includes(mode)) throw new Error(`Invalid CK_COMMIT_REVIEW_MODE; expected ${MODES.join(' or ')}`);
        layers.push({ source: 'environment', mode });
    }
    const winner = layers.filter(layer => layer.mode !== undefined).at(-1);
    return { mode: winner.mode, source: winner.source, layers };
}

function selectReview(risk, mode) {
    if (!RISKS.includes(risk)) throw new Error(`Expected risk: ${RISKS.join(', ')}`);
    if (!MODES.includes(mode)) throw new Error(`Expected review mode: ${MODES.join(', ')}`);
    const skill = mode === 'lightweight' ? 'commit-review' : risk === 'medium' ? 'why-review'
        : risk === 'high' ? 'changes-review' : null;
    return { action: skill ? 'review' : 'skip', skill, maxRounds: skill ? 2 : 0 };
}

function decideReview(options = {}) {
    const operation = options.operation || 'commit';
    if (!['commit', 'pull-request'].includes(operation)) throw new Error('Expected operation: commit or pull-request');
    // A local commit preference never downgrades the PR's whole-branch review.
    const settings = operation === 'pull-request'
        ? { mode: 'risk-based', source: 'pull-request', layers: [] }
        : resolveCommitReviewMode(options);
    return { operation, risk: options.risk, ...settings, ...selectReview(options.risk, settings.mode) };
}

function main(argv = process.argv.slice(2)) {
    try {
        const options = {};
        for (const arg of argv) {
            const match = /^--(risk|operation)=(.+)$/.exec(arg);
            if (!match || options[match[1]] !== undefined) throw new Error(`Unsupported or repeated argument: ${arg}`);
            options[match[1]] = match[2];
        }
        if (options.operation && !options.risk) throw new Error('--operation requires --risk');
        // Run from the requested checkout root, as the commit and PR skills require.
        console.log(JSON.stringify(options.risk ? decideReview(options) : resolveCommitReviewMode(options), null, 2));
        return 0;
    } catch (error) {
        console.error(error.message);
        return 1;
    }
}

module.exports = { MODES, RISKS, resolveCommitReviewMode, selectReview, decideReview, main };
if (require.main === module) process.exitCode = main();
