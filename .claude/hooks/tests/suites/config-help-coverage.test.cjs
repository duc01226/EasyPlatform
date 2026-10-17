/**
 * Config Help Coverage Test Suite
 *
 * Every configuration option must be reachable from help: `/project-config --help`
 * (project-config-help.cjs) lists every project-config schema field, and `/ck-help config`
 * (ck-config-help.cjs) lists every `.ck.json` schema field plus the adopter quick-settings and
 * environment-variable tables. Each field carries help text — its inline schema `describe`, or an
 * entry in .claude/scripts/lib/config-option-describes.cjs — so a new option cannot ship silent.
 *
 * Coverage:
 *   CFGHELP-001 — every project-config schema field (properties `a.b`, array items `a[].b`, map
 *                 values `a{}`, oneOf alternatives, at any depth) has non-empty help text.
 *   CFGHELP-002 — every `.ck.json` schema field has non-empty help text.
 *   CFGHELP-003 — every key in the describes file names a real schema field that has no inline
 *                 describe (no stale key, no second owner).
 *   CFGHELP-004 — `project-config-help.cjs --json` renders every walked field, each with its text.
 *   CFGHELP-005 — `ck-config-help.cjs --json` lists every `.ck.json` field and finds both doc tables.
 *   TC-TPT-299  — the work tracker's label settings: help lists exactly the keys its validation accepts (the current
 *                 kinds, the area levels, the initiative types; group labels for a declared earlier version only), and
 *                 a declared label changes displayed text alone.
 *
 * Portability: the assertions read only framework-owned files that ship inside `.claude/` (the two
 * schemas, the describes file, the help scripts and their source docs). The spawned project-config
 * help also reads whichever project config it finds and scans `.claude/` for consumer counts; no
 * assertion depends on either. Spawned runs use a temp cwd and `childEnv` with HOME/USERPROFILE/TMP
 * pointed at a temp dir and the framework's debug and feature switches removed.
 * The field walker here is deliberately independent of the one the help scripts share, so a walker
 * bug in the scripts cannot hide itself.
 * Paths use node:path; nothing is OS-specific.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { removeTempDir, childEnv } = require('../lib/hook-runner.cjs');

const CLAUDE_DIR = path.resolve(__dirname, '..', '..', '..');
const { SCHEMA } = require(path.join(CLAUDE_DIR, 'hooks', 'lib', 'project-config-schema.cjs'));
const { CK_SCHEMA } = require(path.join(CLAUDE_DIR, 'hooks', 'lib', 'ck-config-schema.cjs'));
const {
    PROJECT_CONFIG_DESCRIBES,
    CK_CONFIG_DESCRIBES,
    describeField
} = require(path.join(CLAUDE_DIR, 'scripts', 'lib', 'config-option-describes.cjs'));

const { validateTaskTracking } = require(path.join(CLAUDE_DIR, 'hooks', 'lib', 'task-tracking-config.cjs'));
const { vocabularyBlock } = require(path.join(CLAUDE_DIR, 'hooks', 'lib', 'task-tracking-vocabulary.cjs'));

const PROJECT_CONFIG_HELP = path.join(CLAUDE_DIR, 'skills', 'project-config', 'scripts', 'project-config-help.cjs');
const CK_CONFIG_HELP = path.join(CLAUDE_DIR, 'scripts', 'ck-config-help.cjs');

/** Every field under `root` as { path, schema }, using the help commands' path syntax. */
function walkFields(root) {
    const out = [];
    const visit = (prefix, fieldSchema) => {
        if (!fieldSchema || typeof fieldSchema !== 'object') return;
        const nested = new Map();
        const shapes = [fieldSchema, ...(Array.isArray(fieldSchema.oneOf) ? fieldSchema.oneOf : [])];
        for (const shape of shapes) {
            if (!shape || typeof shape !== 'object') continue;
            for (const [key, child] of Object.entries(shape.properties || {})) if (!nested.has(`${prefix}.${key}`)) nested.set(`${prefix}.${key}`, child);
            for (const [key, child] of Object.entries(shape.itemSchema || {})) if (!nested.has(`${prefix}[].${key}`)) nested.set(`${prefix}[].${key}`, child);
            if (shape.valueSchema && typeof shape.valueSchema === 'object' && !nested.has(`${prefix}{}`)) nested.set(`${prefix}{}`, shape.valueSchema);
        }
        for (const [full, child] of nested) {
            if (!child || typeof child !== 'object') continue;
            out.push({ path: full, schema: child });
            visit(full, child);
        }
    };
    for (const [key, fieldSchema] of Object.entries(root)) {
        if (key.startsWith('_') || !fieldSchema || typeof fieldSchema !== 'object') continue;
        out.push({ path: key, schema: fieldSchema });
        visit(key, fieldSchema);
    }
    return out.filter(field => !field.path.split(/[.[\]{}]+/).some(part => part.startsWith('_')));
}

// The work tracker's label settings and the words that key them, spelled out as test data: a list taken from the
// vocabulary owner would still agree with it after that owner was broken.
const TRACKER_LABELS = Object.freeze({
    kindLabels: ['initiative', 'task', 'story', 'subtask', 'area'],
    levelLabels: ['application', 'product', 'module', 'feature'],
    typeLabels: ['feedback', 'idea', 'initiative']
});
const EARLIER_GROUP_PURPOSES = Object.freeze(['area', 'domain', 'capability', 'program']);

const PROJECT_FIELDS = walkFields(SCHEMA);
const CK_FIELDS = walkFields(CK_SCHEMA);

function undescribed(fields, map) {
    return fields.filter(field => !describeField(map, field.path, field.schema)).map(field => field.path);
}

function misplacedKeys(fields, map) {
    const byPath = new Map(fields.map(field => [field.path, field.schema]));
    const problems = [];
    for (const key of Object.keys(map)) {
        const fieldSchema = byPath.get(key);
        if (!fieldSchema) problems.push(`${key}: not a schema field (stale key)`);
        else if (typeof fieldSchema.describe === 'string' && fieldSchema.describe.trim()) problems.push(`${key}: schema already carries an inline describe`);
    }
    return problems;
}

/** Runs a help script from a temp cwd with a scrubbed home/temp env; returns parsed --json output. */
function runHelpJson(script) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cfg-help-'));
    try {
        const env = childEnv({
            HOME: tmp, USERPROFILE: tmp, TMPDIR: tmp, TEMP: tmp, TMP: tmp,
            CK_DEBUG: undefined, CLAUDE_HOOK_DEBUG: undefined, CLAUDE_HOOK_DEBUG_LOG: undefined,
            CK_PROMPT_LEDGER: undefined, CK_COMMIT_SKILL_ROUTE: undefined, CK_JUDGEMENT_INTEGRITY_ROUTE: undefined
        });
        const result = spawnSync(process.execPath, [script, '--json'], { cwd: tmp, env, encoding: 'utf8', timeout: 60000 });
        assert.equal(result.status, 0, `${path.basename(script)} --json exited ${result.status}: ${result.stderr}`);
        return JSON.parse(result.stdout);
    } finally {
        removeTempDir(tmp);
    }
}

module.exports = {
    name: 'Config Help Coverage',
    tests: [
        {
            name: '[config-help] CFGHELP-001 every project-config schema field has help text',
            fn: () => {
                assert.ok(PROJECT_FIELDS.length > 0, 'the project-config schema must expose fields');
                assert.deepEqual(undescribed(PROJECT_FIELDS, PROJECT_CONFIG_DESCRIBES), [],
                    'add a `describe` to the schema entry or a key to .claude/scripts/lib/config-option-describes.cjs');
            }
        },
        {
            name: '[config-help] CFGHELP-002 every .ck.json schema field has help text',
            fn: () => {
                assert.ok(CK_FIELDS.length > 0, 'the .ck.json schema must expose fields');
                assert.deepEqual(undescribed(CK_FIELDS, CK_CONFIG_DESCRIBES), [],
                    'add a `describe` to the CK_SCHEMA entry or a key to CK_CONFIG_DESCRIBES');
            }
        },
        {
            name: '[config-help] CFGHELP-003 every describes key names a real field with no inline describe',
            fn: () => {
                assert.deepEqual(misplacedKeys(PROJECT_FIELDS, PROJECT_CONFIG_DESCRIBES), []);
                assert.deepEqual(misplacedKeys(CK_FIELDS, CK_CONFIG_DESCRIBES), []);
            }
        },
        {
            name: '[config-help] CFGHELP-004 project-config help renders every field with its text',
            fn: () => {
                const payload = runHelpJson(PROJECT_CONFIG_HELP);
                const rendered = new Map();
                for (const option of payload.options) {
                    rendered.set(option.key, option.describe);
                    for (const child of option.children) rendered.set(child.key, child.describe);
                }
                const missing = PROJECT_FIELDS.map(field => field.path).filter(key => !rendered.has(key));
                assert.deepEqual(missing, [], 'project-config-help.cjs must list every schema field');
                const blank = [...rendered].filter(([, text]) => !text).map(([key]) => key);
                assert.deepEqual(blank, [], 'every rendered field must show its help text');
            }
        },
        {
            name: '[config-help] CFGHELP-005 ck-config help lists every .ck.json field and both doc tables',
            fn: () => {
                const payload = runHelpJson(CK_CONFIG_HELP);
                const keys = new Set(payload.options.map(option => option.key));
                const missing = CK_FIELDS.map(field => field.path).filter(key => !keys.has(key));
                assert.deepEqual(missing, [], 'ck-config-help.cjs must list every .ck.json field');
                assert.ok(payload.options.every(option => option.describe), 'every .ck.json option must show its help text');
                for (const id of ['quickSettings', 'environment']) {
                    const body = payload.sections[id] && payload.sections[id].body;
                    assert.ok(body && body.includes('|'), `the ${id} table must be found in its source doc`);
                }
            }
        },
        {
            name: "[config-help] TECH-tracker-label-help help lists exactly the tracker label settings that validation accepts: the five current kinds, the levels and the types, group labels for a declared earlier version only, and a label changes displayed text alone",
            TechnicalSpec: 'work-tracking/config-label-help',
            fn: () => {
                const listed = prefix => PROJECT_FIELDS.filter(field => field.path.startsWith(prefix)).map(field => field.path.slice(prefix.length)).sort();
                const helpText = fieldPath => { const field = PROJECT_FIELDS.find(entry => entry.path === fieldPath); return field && describeField(PROJECT_CONFIG_DESCRIBES, field.path, field.schema); };
                const findings = tracking => validateTaskTracking({ taskTracking: tracking });
                const shownAs = word => `Shown ${word}`;
                for (const [setting, words] of Object.entries(TRACKER_LABELS)) {
                    // Help lists one field per current word and no other.
                    assert.deepEqual(listed(`taskTracking.${setting}.`), [...words].sort(), setting);
                    for (const word of words) {
                        assert.ok(helpText(`taskTracking.${setting}.${word}`), `taskTracking.${setting}.${word} has help text`);
                        // What help lists, validation accepts.
                        assert.deepEqual(findings({ schemaVersion: 3, [setting]: { [word]: shownAs(word) } }), [], `${setting}.${word}`);
                    }
                    // What help does not list, validation refuses by name.
                    assert.deepEqual(findings({ schemaVersion: 3, [setting]: { unlisted: 'Shown' } }), [`taskTracking.${setting}.unlisted: unknown field`], setting);
                }
                // A kind of the earlier vocabulary is no label key of a current project.
                for (const kind of ['project', 'vision']) {
                    assert.deepEqual(findings({ schemaVersion: 3, kindLabels: { [kind]: 'Shown' } }), [`taskTracking.kindLabels.${kind}: unknown field`], kind);
                }
                // Group labels are listed with the earlier vocabulary's purposes, help says they belong to it, and only a
                // project that declares that version may carry them.
                assert.deepEqual(listed('taskTracking.groupLabels.'), [...EARLIER_GROUP_PURPOSES].sort());
                assert.match(helpText('taskTracking.groupLabels'), /earlier/i, 'help must not present group labels as a current setting');
                const groupLabels = Object.fromEntries(EARLIER_GROUP_PURPOSES.map(purpose => [purpose, shownAs(purpose)]));
                assert.deepEqual(findings({ schemaVersion: 2, groupLabels }), []);
                assert.deepEqual(findings({ schemaVersion: 3, groupLabels }), ['taskTracking.groupLabels: unknown field']);
                // These four are every label map the tracker has.
                assert.deepEqual(PROJECT_FIELDS.map(field => field.path).filter(fieldPath => /^taskTracking\.[A-Za-z]+Labels$/.test(fieldPath)).sort(),
                    ['taskTracking.groupLabels', ...Object.keys(TRACKER_LABELS).map(setting => `taskTracking.${setting}`)].sort());
                // A label is display text only: with every label declared, the stored words are what they were.
                const declared = { schemaVersion: 3, ...Object.fromEntries(Object.entries(TRACKER_LABELS).map(([setting, words]) => [setting, Object.fromEntries(words.map(word => [word, shownAs(word)]))])) };
                assert.deepEqual(findings(declared), []);
                const { labels: shown, ...words } = vocabularyBlock({ taskTracking: declared });
                const { labels: defaults, ...defaultWords } = vocabularyBlock({ taskTracking: { schemaVersion: 3 } });
                assert.deepEqual(words, defaultWords);
                assert.deepEqual([[...words.kinds].sort(), [...words.levels].sort(), [...words.initiativeTypes].sort()], Object.values(TRACKER_LABELS).map(list => [...list].sort()));
                for (const [table, setting] of [['kinds', 'kindLabels'], ['levels', 'levelLabels'], ['initiativeTypes', 'typeLabels']]) {
                    for (const word of TRACKER_LABELS[setting]) {
                        assert.equal(shown[table][word], shownAs(word), `${table}.${word}`);
                        assert.notEqual(defaults[table][word], shownAs(word), `${table}.${word}`);
                    }
                }
            }
        }
    ]
};
