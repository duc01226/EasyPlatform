import fs from 'node:fs';
import { isInvokedAsScript } from '../../../scripts/lib/project-root.cjs';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const text = value => typeof value === 'string' && value.trim().length > 0;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const fail = message => { throw new Error(message); };

export function validateCorpus(corpus) {
    if (!object(corpus) || corpus.schemaVersion !== 1 || !text(corpus.corpusVersion)) fail('Unsupported corpus version');
    if (!Array.isArray(corpus.cases) || corpus.cases.length === 0) fail('Corpus requires cases');
    const ids = new Set();
    for (const item of corpus.cases) {
        if (!object(item) || !text(item.id) || ids.has(item.id)) fail('Case IDs must be nonempty and unique');
        ids.add(item.id);
        if (!['activation', 'repair'].includes(item.kind)) fail(`${item.id}: unsupported case kind`);
        if (!text(item.prompt) || !text(item.fixture) || !Array.isArray(item.skills) || item.skills.length === 0) fail(`${item.id}: prompt, fixture and skills required`);
        if (new Set(item.skills).size !== item.skills.length || item.skills.some(skill => !text(skill) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skill))) fail(`${item.id}: invalid skill names`);
        if (item.expectedActivation !== null && !item.skills.includes(item.expectedActivation)) fail(`${item.id}: expected activation must be available or null`);
        if (!Array.isArray(item.pressures) || item.pressures.some(pressure => !text(pressure))) fail(`${item.id}: pressures must be strings`);
        if (!Array.isArray(item.assertions) || item.assertions.length === 0 || item.assertions.some(assertion => !text(assertion)) || new Set(item.assertions).size !== item.assertions.length) fail(`${item.id}: unique assertions required`);
    }
    return corpus;
}

export function validateResults(corpus, results) {
    validateCorpus(corpus);
    if (!object(results) || results.schemaVersion !== 1 || results.corpusVersion !== corpus.corpusVersion) fail('Result corpus version mismatch');
    if (!Array.isArray(results.pairs) || results.pairs.length === 0) fail('Results require at least one measured pair');
    const seen = new Set();
    for (const pair of results.pairs) {
        const item = corpus.cases.find(item => item.id === pair?.caseId);
        if (!item || seen.has(pair.caseId)) fail('Unknown or duplicate result case');
        seen.add(pair.caseId);
        if (!text(pair.reviewer) || !hash(pair.taskHash) || !hash(pair.fixtureHash)) fail(`${item.id}: reviewer and input hashes required`);
        for (const armName of ['withoutSkill', 'withSkill']) {
            const arm = pair[armName];
            if (!object(arm) || !text(arm.outputArtifact) || !text(arm.observedAt) || !Number.isFinite(Date.parse(arm.observedAt))) fail(`${item.id}: observed output and time required`);
            if (!object(arm.runtime) || ['model', 'modelVersion', 'host', 'hostVersion', 'settingsHash', 'toolsetHash', 'contextHash'].some(key => !text(arm.runtime[key]))) fail(`${item.id}: runtime metadata incomplete`);
            if (['settingsHash', 'toolsetHash', 'contextHash'].some(key => !hash(arm.runtime[key]))) fail(`${item.id}: runtime hashes invalid`);
            if (!object(arm.skillHashes) || !Array.isArray(arm.loadedSkills) || new Set(arm.loadedSkills).size !== arm.loadedSkills.length || arm.loadedSkills.some(skill => !item.skills.includes(skill))) fail(`${item.id}: skill provenance invalid`);
            const names = Object.keys(arm.skillHashes).sort();
            const expected = armName === 'withSkill' ? [...item.skills].sort() : [];
            if (JSON.stringify(names) !== JSON.stringify(expected) || names.some(name => !hash(arm.skillHashes[name]))) fail(`${item.id}: available skill hashes do not match arm`);
            if (armName === 'withoutSkill' && arm.loadedSkills.length !== 0) fail(`${item.id}: baseline loaded a skill`);
            if (!Array.isArray(arm.checks) || arm.checks.length !== item.assertions.length) fail(`${item.id}: complete rubric required`);
            const checks = new Set();
            for (const check of arm.checks) {
                if (!object(check) || !item.assertions.includes(check.assertion) || checks.has(check.assertion) || typeof check.passed !== 'boolean' || !text(check.evidence)) fail(`${item.id}: invalid rubric decision/evidence`);
                checks.add(check.assertion);
            }
            if (arm.measurements !== undefined && (!object(arm.measurements) || Object.values(arm.measurements).some(value => !Number.isFinite(value) || value < 0))) fail(`${item.id}: measurements must be nonnegative finite numbers`);
        }
        if (!isDeepStrictEqual(pair.withoutSkill.runtime, pair.withSkill.runtime)) fail(`${item.id}: paired runtime differs`);
    }
    return results;
}

if (isInvokedAsScript(process.argv[1], fileURLToPath(import.meta.url))) {
    try {
        const args = process.argv.slice(2);
        if (args.length > 2) fail('Usage: node validate.mjs [corpus.json] [results.json]');
        const corpusPath = args[0] || fileURLToPath(new URL('./corpus.v1.json', import.meta.url));
        const corpus = validateCorpus(JSON.parse(fs.readFileSync(corpusPath, 'utf8')));
        const results = args[1] ? validateResults(corpus, JSON.parse(fs.readFileSync(args[1], 'utf8'))) : null;
        process.stdout.write(JSON.stringify({ corpusVersion: corpus.corpusVersion, cases: corpus.cases.length, validatedPairs: results?.pairs.length ?? 0, modelEvaluation: results ? 'records validated; semantic scores require reviewer evidence' : 'not run' }) + '\n');
    } catch (error) {
        process.stderr.write(`${error.message}\n`);
        process.exitCode = 1;
    }
}
