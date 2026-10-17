'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const sha256 = text => crypto.createHash('sha256').update(text).digest('hex');
const BUNDLE_ROOTS = ['.claude/hooks/lib', '.claude/skills', '.claude/scripts/lib', '.claude/docs'];
const BUNDLE_FILES = ['.claude/workflows.json', '.claude/scripts/project-context.cjs', '.claude/scripts/workflow-catalog.cjs', '.claude/scripts/codex/read-workflow-entry.mjs'];

/** Public framework sources only; no adopter config, home files, binaries or symlinks. */
function discoveryBundle(root) {
    const files = {}; let bytes = 0; let count = 0;
    function visit(relative) {
        const absolute = path.join(root, relative);
        const stat = fs.lstatSync(absolute);
        if (stat.isSymbolicLink()) throw new Error('bundle-symlink');
        if (stat.isDirectory()) {
            for (const name of fs.readdirSync(absolute).sort()) {
                if (name.startsWith('.') || ['node_modules', '__pycache__', 'tmp', 'temp'].includes(name)) continue;
                visit(`${relative}/${name}`);
            }
        } else if (/\.(?:cjs|mjs|js|ts|md|json|py|ya?ml)$/.test(relative)) {
            if (stat.size > 1024 * 1024 || ++count > 5000) throw new Error('bundle-limit');
            const text = fs.readFileSync(absolute, 'utf8').replace(/\r\n/g, '\n');
            bytes += Buffer.byteLength(text);
            if (bytes > 32 * 1024 * 1024) throw new Error('bundle-limit');
            files[relative] = text;
        }
    }
    for (const relative of [...BUNDLE_ROOTS, ...BUNDLE_FILES].sort()) visit(relative);
    return { files, bytes, hash: sha256(JSON.stringify(files)) };
}

/** Conservative candidate identity includes all shipped discovery text and evidence/delivery owners. */
async function currentIdentity(root, rendered = null, bundle = null) {
    bundle ||= discoveryBundle(root);
    const extra = {};
    const paths = ['.claude/hooks/core-principles-inject.cjs', '.claude/hooks/tests/lib/context-delivery-cases.cjs',
        '.claude/scripts/context-delivery-audit.cjs', '.claude/scripts/context-delivery-evaluate.cjs', '.claude/scripts/context-delivery-tokens.py', '.claude/scripts/codex/compat-rewrite.mjs'];
    for (const name of fs.readdirSync(path.join(root, '.claude/hooks/tests/fixtures/context-delivery')).sort()) paths.push(`.claude/hooks/tests/fixtures/context-delivery/${name}`);
    for (const relative of paths.sort()) extra[relative] = sha256(fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n'));
    rendered ||= await renderProfiles(root);
    const policies = Object.fromEntries(Object.entries(rendered.profiles).map(([name, value]) => [name, value.payloads.map(row => row.text).filter(Boolean).join('\n\n')]));
    return { sourceHash: sha256(JSON.stringify({ bundleHash: bundle.hash, extra })), bundleHash: bundle.hash,
        policyHashes: Object.fromEntries(Object.entries(policies).map(([name, value]) => [name, sha256(value)])), policies };
}
const median = values => {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/** Same event/renderers and boundary for each profile; all state is disposable. */
async function renderProfiles(root) {
    const work = path.join(root, 'tmp', 'context-delivery-audit');
    fs.mkdirSync(work, { recursive: true });
    const dir = fs.realpathSync(fs.mkdtempSync(path.join(work, 'render-')));
    const read = file => { try { return fs.readFileSync(file, 'utf8'); } catch { return null; } };
    const universal = require('../../hooks/lib/universal-delivery.cjs');
    const route = require('../../hooks/lib/workflow-route-delivery.cjs');
    const core = require('../../hooks/core-principles-inject.cjs');
    try {
        fs.mkdirSync(path.join(dir, '.claude', 'skills'), { recursive: true });
        fs.cpSync(path.join(root, '.claude', 'skills', 'shared'), path.join(dir, '.claude', 'skills', 'shared'), { recursive: true, filter: file => !file.includes('node_modules') });
        fs.copyFileSync(path.join(root, '.claude', 'workflows.json'), path.join(dir, '.claude', 'workflows.json'));
        const profiles = {};
        for (const profile of ['compatible', 'concise']) {
            fs.writeFileSync(path.join(dir, '.claude', '.ck.local.json'), JSON.stringify({ contextDelivery: { profile } }));
            const input = { cwd: dir, hook_event_name: 'UserPromptSubmit', session_id: profile, prompt: 'Correct a local typo.' };
            const options = { projectDir: dir, projectRoot: dir, homeDir: path.join(dir, 'home'), env: {}, now: 100000, write: (_, done) => done(true) };
            const payloads = [];
            for (let bin = 1; bin <= 4; bin++) {
                const value = await universal.runHook(bin, { ...options, input });
                payloads.push({ id: `universal-${bin}`, text: value ? JSON.parse(value).hookSpecificOutput.additionalContext : '' });
            }
            payloads.push({ id: 'route', text: (await route.run(input, options)).trimEnd() });
            payloads.push({ id: 'catalog', text: (await route.run(input, { ...options, part: 'catalog' })).trimEnd() });
            const principles = await core.run(input, options);
            payloads.push({ id: 'core', text: principles.trimEnd() });
            profiles[profile] = {
                payloads: payloads.map(row => ({ ...row, chars: row.text.length, sha256: sha256(row.text) })),
                // Conditional retrieval is incremental cost, reported separately, never hidden in savings.
                laterCatalog: route.buildCatalogInjection(dir, 'ask'),
                laterDiagnosis: read(path.join(dir, '.claude/skills/shared/protocols/ai-mistake-prevention.md')),
                chars: payloads.reduce((sum, row) => sum + row.text.length, 0),
            };
        }
        return { version: 1, scope: 'Seven framework carriers; first prompt, ask/default, no project protocol; JSON transport excluded equally.', profiles };
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

/** Strict completeness and paired comparison; observations are graded outside the model. */
function assessEvidence(manifest, records, options = {}) {
    const gaps = [];
    if (manifest.cases.length !== 20 || manifest.pairsPerTask !== 3 || manifest.cases.filter(row => row.heldOut).length !== 10 || new Set(manifest.cases.map(row => row.id)).size !== 20) gaps.push('Frozen fixture contract invalid');
    if (JSON.stringify([...manifest.requiredPlatforms].sort()) !== JSON.stringify(['darwin', 'linux', 'win32']) || JSON.stringify([...manifest.requiredHosts].sort()) !== JSON.stringify(['claude', 'codex', 'opencode'])) gaps.push('Required native matrix changed');
    const expected = manifest.cases.length * manifest.pairsPerTask * 2;
    const keys = new Set(); const classes = new Map(); const paired = new Map();
    if (!Array.isArray(records) || records.length !== expected) gaps.push(`Expected ${expected} runtime records`);
    let lane = null;
    for (const row of Array.isArray(records) ? records : []) {
        const task = manifest.cases.find(item => item.id === row.caseId);
        const key = `${row.caseId}/${row.trial}/${row.profile}`;
        const valid = task && Number.isInteger(row.trial) && row.trial >= 1 && row.trial <= manifest.pairsPerTask
            && ['compatible', 'concise'].includes(row.profile) && !keys.has(key)
            && row.manifestHash === sha256(JSON.stringify(manifest))
            && row.worldHash === manifest.worldHashes?.[row.caseId]
            && /^[a-f0-9]{64}$/.test(row.sourceHash || '') && row.sourceHash === options.sourceHash
            && /^[a-f0-9]{64}$/.test(row.bundleHash || '') && row.bundleHash === options.bundleHash
            && /^[a-f0-9]{64}$/.test(row.policyHash || '') && row.policyHash === options.policyHashes?.[row.profile]
            && /^[a-f0-9]{64}$/.test(row.trajectoryHash || '') && row.grader === 'fixture-oracle-v4' && row.observationComplete === true
            && typeof row.success === 'boolean' && Array.isArray(row.violations)
            && row.violations.every(value => manifest.consequentialViolations.includes(value))
            && ['inputTokens', 'outputTokens', 'latencyMs', 'discoveryCalls'].every(name => Number.isFinite(row[name]) && row[name] >= 0)
            && typeof row.model === 'string' && row.model.length > 0 && typeof row.settingsHash === 'string' && /^[a-f0-9]{64}$/.test(row.settingsHash);
        const supportedLane = manifest.requiredHosts.includes(row.host) && manifest.requiredPlatforms.includes(row.platform);
        if (!valid || !supportedLane) { gaps.push(`Invalid/duplicate record ${key}`); continue; }
        keys.add(key);
        const identity = `${row.model}/${row.settingsHash}/${row.host}/${row.platform}`;
        if (lane && lane !== identity) gaps.push('Runtime/settings/host/platform mismatch');
        lane = identity;
        if (row.violations.length) gaps.push(`Consequential violation ${key}`);
        if (task.mandatory && !row.success) gaps.push(`Mandatory failure ${key}`);
        const group = classes.get(task.class) || { compatible: 0, concise: 0 };
        group[row.profile] += Number(row.success); classes.set(task.class, group);
        const pair = paired.get(`${row.caseId}/${row.trial}`) || {};
        pair[row.profile] = row; paired.set(`${row.caseId}/${row.trial}`, pair);
    }
    for (const [name, scores] of classes) if (scores.concise < scores.compatible) gaps.push(`Task success regressed: ${name}`);
    const pairs = [...paired.values()].filter(pair => pair.compatible && pair.concise);
    const deltas = pairs.map(pair => ({
        tokens: pair.concise.inputTokens + pair.concise.outputTokens - pair.compatible.inputTokens - pair.compatible.outputTokens,
        latencyMs: pair.concise.latencyMs - pair.compatible.latencyMs,
    }));
    const medianTokens = deltas.length ? median(deltas.map(row => row.tokens)) : null;
    const medianLatencyMs = deltas.length ? median(deltas.map(row => row.latencyMs)) : null;
    if (medianTokens > 0 || medianLatencyMs > 0) gaps.push('Whole-session median cost/latency regression');
    const outliers = pairs.filter(pair => {
        const a = pair.compatible, b = pair.concise;
        return b.inputTokens + b.outputTokens > (a.inputTokens + a.outputTokens) * 1.2 || b.latencyMs > a.latencyMs * 1.2;
    }).map(pair => `${pair.concise.caseId}/${pair.concise.trial}`);
    if (outliers.some(key => {
        const diagnosis = options.outlierReviews?.[key];
        return typeof diagnosis !== 'string' || !diagnosis.trim() || diagnosis.length > 4096;
    })) gaps.push('Material outliers need a recorded diagnosis (1–4096 characters)');
    if (options.deterministicPassed !== true) gaps.push('Deterministic proof missing');
    for (const platform of manifest.requiredPlatforms) for (const host of manifest.requiredHosts) {
        if (!options.nativeEvidence?.some(row => row.platform === platform && row.host === host && row.passed === true && /^[a-f0-9]{64}$/.test(row.sourceHash || '') && row.sourceHash === options.sourceHash)) gaps.push(`Native evidence missing: ${platform}/${host}`);
    }
    return { eligible: gaps.length === 0, records: keys.size, expected, classes: Object.fromEntries(classes), medianTokens, medianLatencyMs, outliers, gaps };
}

module.exports = { sha256, renderProfiles, assessEvidence, discoveryBundle, currentIdentity };
