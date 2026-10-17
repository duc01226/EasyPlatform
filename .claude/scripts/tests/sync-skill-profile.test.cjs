'use strict';

/**
 * Skill profile → Claude `skillOverrides` (`.claude/scripts/sync-skill-profile.cjs`).
 *
 * Guards: presets resolve to the documented visibility (TC-ADS-016/017); no skill that a workflow
 * step, an agent `skills:` entry, the curated calledByOthers list or an entry skill starts is made unreachable
 * without the explicit opt-in (TC-ADS-018/042, SEC-06); the team settings file is never overwritten
 * from a bad read and nothing but its `skillOverrides` member ever changes (TC-ADS-040/041, SEC-03);
 * ownership keeps user keys (TC-ADS-019); runs are idempotent (TC-ADS-020).
 *
 * Every case builds its own temp project (fixture workflows, agents, skills, settings and project
 * config) and runs the real CLI with CLAUDE_PROJECT_DIR, HOME/USERPROFILE and TMPDIR/TEMP/TMP pointed
 * at it. The only bundle file read is the shipped preset data, which travels with the script.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

const SCRIPT = path.resolve(__dirname, '..', 'sync-skill-profile.cjs');
const PRESETS_FILE = path.resolve(__dirname, '..', '..', 'config', 'skill-profiles.json');
const SCHEMA = require(path.resolve(__dirname, '..', '..', 'hooks', 'lib', 'project-config-schema.cjs'));
const profileLib = require(SCRIPT);

const PRESETS = JSON.parse(fs.readFileSync(PRESETS_FILE, 'utf8'));
const CALLED_BY_OTHERS = PRESETS.calledByOthers.skills;
const ENTRY_SKILLS = PRESETS.entrySkills.skills;
const MANUAL_SKILL = 'manual-utility';
const PLAIN_SKILLS = ['plain-a', 'plain-b', 'security-audit', 'plan', 'variant-only', 'agent-skill'];
const ALL_SKILLS = [...new Set([...CALLED_BY_OTHERS, ...ENTRY_SKILLS, ...PLAIN_SKILLS, MANUAL_SKILL])];

/** Fixture workflows: `security-audit` is a default-mode step; `variant-only` runs only in mode b. */
const WORKFLOWS = {
    version: '1',
    workflows: {
        'wf-review': { sequence: ['plan', 'security-audit'] },
        'wf-variant': {
            defaultMode: 'a',
            variants: {
                a: { sequence: [{ id: 'plan-step', skill: 'plan' }] },
                b: { sequence: [{ id: 'only-b', skill: 'variant-only' }] }
            }
        }
    }
};

/** Team settings with one-line arrays, permission guards and hook registrations (SEC-03 surface). */
const SETTINGS_TEXT = [
    '{',
    '  "cleanupPeriodDays": 30,',
    '  "enabledMcpjsonServers": ["context7", "github"],',
    '  "hooks": {',
    '    "PreToolUse": [',
    '      {',
    '        "hooks": [{ "command": "node gate.cjs", "type": "command" }],',
    '        "matcher": "Bash"',
    '      }',
    '    ]',
    '  },',
    '  "permissions": {',
    '    "ask": ["Bash(git push --force:*)", "Bash(git reset --hard:*)"],',
    '    "deny": []',
    '  }',
    '}',
    ''
].join('\n');

/** The rendered member the writer appends: `,\n  "skillOverrides": {\n    ...\n  }`. */
const APPENDED_MEMBER = /,\n {2}"skillOverrides": \{\n(?: {4}.*\n)* {2}\}/;

function makeProject({ profile, settingsText = SETTINGS_TEXT, projectName = 'fixture-project' } = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-profile-'));
    const write = (relative, text) => {
        const file = path.join(root, relative);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, text, 'utf8');
    };
    for (const name of ALL_SKILLS) {
        const manual = name === MANUAL_SKILL ? 'disable-model-invocation: true\n' : '';
        write(path.join('.claude', 'skills', name, 'SKILL.md'), `---\nname: ${name}\ndescription: fixture skill\n${manual}---\n\nBody.\n`);
    }
    write(path.join('.claude', 'agents', 'reviewer.md'), '---\nname: reviewer\ndescription: fixture agent\nskills: agent-skill\n---\n\nBody.\n');
    write(path.join('.claude', 'workflows.json'), `${JSON.stringify(WORKFLOWS, null, 2)}\n`);
    write(path.join('.claude', 'config', 'skill-profiles.json'), fs.readFileSync(PRESETS_FILE, 'utf8'));
    if (settingsText !== null) write(path.join('.claude', 'settings.json'), settingsText);
    setProfile(root, profile, projectName);
    fs.mkdirSync(path.join(root, 'tmp-home'), { recursive: true });
    return root;
}

function setProfile(root, profile, projectName = 'fixture-project') {
    const config = { project: { name: projectName } };
    if (profile !== undefined) config.skillProfile = profile;
    const file = path.join(root, 'docs', 'project-config.json');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

/** Child env: fixture root as the project, fixture dirs as home and temp; inherited switches removed. */
function childEnv(root) {
    const home = path.join(root, 'tmp-home');
    const env = {};
    const drop = /^(CLAUDE_|CK_|CODEX_|OPENCODE_|HOME$|USERPROFILE$|TMPDIR$|TEMP$|TMP$)/i;
    for (const [key, value] of Object.entries(process.env)) if (!drop.test(key)) env[key] = value;
    return { ...env, CLAUDE_PROJECT_DIR: root, HOME: home, USERPROFILE: home, TMPDIR: home, TEMP: home, TMP: home };
}

function run(root, ...args) {
    const result = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: root, env: childEnv(root), encoding: 'utf8', timeout: 60000 });
    return { status: result.status, stdout: result.stdout || '', stderr: result.stderr || '' };
}

const settingsPath = root => path.join(root, '.claude', 'settings.json');
const readSettings = root => JSON.parse(fs.readFileSync(settingsPath(root), 'utf8'));
const readBytes = file => fs.readFileSync(file);
const tempFiles = root => fs.readdirSync(path.join(root, '.claude')).filter(name => name.endsWith('.tmp'));

function withProject(options, fn) {
    const root = makeProject(options);
    try {
        return fn(root);
    } finally {
        fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
}

test('[skill-profile] TC-ADS-016 preset standard makes the curated skills other skills or hooks start name-only', () => withProject({ profile: { preset: 'standard' } }, root => {
    // Given a project on the standard preset / When synced
    const result = run(root);
    // Then exactly the curated called skills are name-only in skillOverrides
    assert.equal(result.status, 0, result.stderr);
    assert.ok(CALLED_BY_OTHERS.length > 0, 'the curated list names at least one called skill');
    assert.equal(new Set(CALLED_BY_OTHERS).size, CALLED_BY_OTHERS.length, 'the curated list has no duplicates');
    for (const name of CALLED_BY_OTHERS) assert.ok(fs.existsSync(path.resolve(__dirname, '..', '..', 'skills', name, 'SKILL.md')), `curated skill ${name} ships as a skill`);
    const overrides = readSettings(root).skillOverrides;
    assert.deepEqual(Object.keys(overrides).sort(), [...CALLED_BY_OTHERS].sort());
    for (const name of CALLED_BY_OTHERS) assert.equal(overrides[name], 'name-only', name);
}));

test('[skill-profile] TC-ADS-017 preset minimal keeps only the entry skills listed', () => withProject({ profile: { preset: 'minimal' } }, root => {
    // Given the minimal preset / When synced
    const result = run(root);
    assert.equal(result.status, 0, result.stderr);
    const overrides = readSettings(root).skillOverrides;
    // Then entry skills stay on (no entry), a frontmatter-manual skill is left alone, every other skill is name-only
    for (const name of ENTRY_SKILLS) assert.equal(Object.hasOwn(overrides, name), false, `${name} stays on`);
    assert.equal(Object.hasOwn(overrides, MANUAL_SKILL), false, 'already manual by frontmatter');
    const expected = ALL_SKILLS.filter(name => !ENTRY_SKILLS.includes(name) && name !== MANUAL_SKILL);
    assert.deepEqual(Object.keys(overrides).sort(), expected.sort());
    for (const name of expected) assert.equal(overrides[name], 'name-only', name);
}));

test('[skill-profile] TC-ADS-018 no preset or list makes a called skill off or user-invocable-only', () => withProject({}, root => {
    // Given the fixture's callers, collected independently of the resolver: workflow steps in every mode, agent skills:, the curated calledByOthers and entrySkills lists
    const called = new Set([...CALLED_BY_OTHERS, ...ENTRY_SKILLS, 'plan', 'security-audit', 'variant-only', 'agent-skill']);
    for (const preset of ['full', 'standard', 'minimal']) {
        for (const list of [undefined, 'commandOnly', 'off']) {
            const profile = { preset };
            if (list) profile[list] = [...called];
            // When resolved
            const resolved = profileLib.resolveProfile(root, { skillProfile: profile });
            // Then every called skill is protected, including a step that runs only in a non-default mode and an agent skill
            for (const name of ['variant-only', 'agent-skill', 'security-audit', ...CALLED_BY_OTHERS, ...ENTRY_SKILLS]) assert.ok(resolved.called.has(name), `${name} is in the called set`);
            for (const name of called) {
                assert.ok(!['commandOnly', 'off'].includes(resolved.overrides[name]), `${preset}/${list}: ${name} -> ${resolved.overrides[name]}`);
            }
            if (list) assert.equal(resolved.refusals.length, called.size, `${preset}/${list}: every called skill in ${list} is refused`);
        }
    }
}));

test('[skill-profile] TC-ADS-019 user keys and user-changed owned keys are kept with a conflict line', () => {
    const userSettings = SETTINGS_TEXT.replace('  "cleanupPeriodDays": 30,', '  "cleanupPeriodDays": 30,\n  "skillOverrides": { "code-quality-review": "on", "my-own": "off" },');
    withProject({ profile: { preset: 'standard' }, settingsText: userSettings }, root => {
        // Given user-authored keys, one of which the profile also wants / When synced
        const first = run(root);
        assert.equal(first.status, 0, first.stderr);
        let overrides = readSettings(root).skillOverrides;
        // Then the user's keys are untouched and the clash is reported
        assert.equal(overrides['code-quality-review'], 'on');
        assert.equal(overrides['my-own'], 'off');
        assert.match(first.stdout, /conflict: skillOverrides\.code-quality-review is "on", generator wants "name-only"; kept the user value/);
        assert.equal(overrides.commit, 'name-only');

        // Given the user later changes an owned key
        const edited = fs.readFileSync(settingsPath(root), 'utf8').replace('"commit": "name-only"', '"commit": "on"');
        fs.writeFileSync(settingsPath(root), edited, 'utf8');
        // When synced again
        const second = run(root);
        // Then the user's value stays, the file is unchanged and one conflict line names the key
        assert.equal(second.status, 0, second.stderr);
        assert.equal(fs.readFileSync(settingsPath(root), 'utf8'), edited);
        assert.match(second.stdout, /conflict: skillOverrides\.commit is "on", generator wants "name-only"; kept the user value/);
    });
});

test('[skill-profile] TC-ADS-020 repeated runs and a missing profile leave the file byte-identical', () => {
    withProject({ profile: { preset: 'standard', nameOnly: ['plain-a'] } }, root => {
        // Given one sync / When run again
        assert.equal(run(root).status, 0);
        const settingsAfterFirst = readBytes(settingsPath(root));
        const ledgerPath = path.join(root, '.claude', 'skill-profile.generated.json');
        const ledgerAfterFirst = readBytes(ledgerPath);
        const second = run(root);
        // Then both files are byte-identical and --check passes
        assert.equal(second.status, 0, second.stderr);
        assert.ok(readBytes(settingsPath(root)).equals(settingsAfterFirst), 'settings unchanged');
        assert.ok(readBytes(ledgerPath).equals(ledgerAfterFirst), 'ledger unchanged');
        assert.equal(run(root, '--check').status, 0);

        // Given the profile is removed / When synced / Then the owned keys go and the original bytes return
        setProfile(root, undefined);
        assert.equal(run(root, '--check').status, 1, '--check reports the stale member first');
        assert.equal(run(root).status, 0);
        assert.equal(fs.readFileSync(settingsPath(root), 'utf8'), SETTINGS_TEXT);
    });
    withProject({}, root => {
        // Given no skillProfile at all / When synced and checked
        const result = run(root);
        const check = run(root, '--check');
        // Then nothing is written: no member inserted, no ledger
        assert.equal(result.status, 0, result.stderr);
        assert.equal(check.status, 0, check.stderr);
        assert.equal(fs.readFileSync(settingsPath(root), 'utf8'), SETTINGS_TEXT);
        assert.equal(fs.existsSync(path.join(root, '.claude', 'skill-profile.generated.json')), false);
    });
});

test('[skill-profile] TC-ADS-040 a missing or invalid settings file stops the run and is never overwritten', () => {
    withProject({ profile: { preset: 'standard' }, settingsText: null }, root => {
        // Given no settings file / When synced / Then non-zero naming the missing file, and none created
        const result = run(root);
        assert.equal(result.status, 1);
        assert.match(result.stderr, /settings file is missing/);
        assert.equal(fs.existsSync(settingsPath(root)), false);
    });
    const broken = '{\n  "permissions": { "ask": ["Bash(git reset --hard:*)"] },\n  "hooks": {\n';
    withProject({ profile: { preset: 'standard' }, settingsText: broken }, root => {
        // Given invalid JSON / When synced and checked
        const result = run(root);
        const check = run(root, '--check');
        // Then both fail naming the parse error and the file is byte-identical
        assert.equal(result.status, 1);
        assert.match(result.stderr, /settings is not valid JSON/);
        assert.equal(check.status, 1);
        assert.equal(fs.readFileSync(settingsPath(root), 'utf8'), broken);
        assert.deepEqual(tempFiles(root), []);
    });
});

test('[skill-profile] TC-ADS-041 only the skillOverrides member changes; guards, hooks and one-line arrays keep every byte', () => withProject({ profile: { preset: 'standard' } }, root => {
    // Given a synced project whose profile then changes
    assert.equal(run(root).status, 0);
    const beforeText = fs.readFileSync(settingsPath(root), 'utf8');
    setProfile(root, { preset: 'standard', nameOnly: ['plain-a'], off: ['plain-b'] });
    // When synced
    const result = run(root);
    assert.equal(result.status, 0, result.stderr);
    const afterText = fs.readFileSync(settingsPath(root), 'utf8');
    // Then the text outside the member equals the original input, byte for byte
    assert.notEqual(afterText, beforeText);
    assert.equal(afterText.replace(APPENDED_MEMBER, ''), SETTINGS_TEXT);
    assert.equal(beforeText.replace(APPENDED_MEMBER, ''), SETTINGS_TEXT);
    // And every other top-level key is deep-equal, the new values landed, and no temp file remains
    const original = JSON.parse(SETTINGS_TEXT);
    const after = JSON.parse(afterText);
    for (const key of Object.keys(original)) assert.deepEqual(after[key], original[key], key);
    assert.deepEqual(Object.keys(after).sort(), [...Object.keys(original), 'skillOverrides'].sort());
    assert.equal(after.skillOverrides['plain-a'], 'name-only');
    assert.equal(after.skillOverrides['plain-b'], 'off');
    assert.deepEqual(tempFiles(root), []);
}));

test('[skill-profile] TC-ADS-042 hiding a called skill is refused without the opt-in and warned with it', () => withProject({ profile: { preset: 'full', commandOnly: ['security-audit'] } }, root => {
    // Given commandOnly on a workflow step skill and no opt-in / When synced and checked
    const result = run(root);
    const check = run(root, '--check');
    // Then both exit non-zero naming the skill and its caller, and nothing is written
    for (const outcome of [result, check]) {
        assert.equal(outcome.status, 1);
        assert.match(outcome.stderr, /skill-profile: refusing to hide security-audit \(commandOnly\): started by workflow wf-review; set skillProfile\.allowHidingCalledSkills: true to allow/);
    }
    assert.equal(fs.readFileSync(settingsPath(root), 'utf8'), SETTINGS_TEXT);
    assert.equal(fs.existsSync(path.join(root, '.claude', 'skill-profile.generated.json')), false);

    // Given the explicit opt-in / When synced / Then the value is written and a warning line names the skill
    setProfile(root, { preset: 'full', commandOnly: ['security-audit'], allowHidingCalledSkills: true });
    const allowed = run(root);
    assert.equal(allowed.status, 0, allowed.stderr);
    assert.equal(readSettings(root).skillOverrides['security-audit'], 'user-invocable-only');
    assert.match(allowed.stdout, /skill-profile: hiding called skill security-audit \(commandOnly\): started by workflow wf-review/);
}));

test('[skill-profile] TC-ADS-042 an entry skill (the workflow runner) is protected like any called skill', () => withProject({ profile: { preset: 'full', commandOnly: ['start-workflow'] } }, root => {
    // Given the workflow runner is only in entrySkills (no workflow step, agent or calledByOthers entry names it)
    assert.ok(ENTRY_SKILLS.includes('start-workflow'), 'start-workflow is a shipped entry skill');
    assert.ok(!CALLED_BY_OTHERS.includes('start-workflow'), 'start-workflow is not in calledByOthers, so only entrySkills protects it');
    // When commandOnly names it without the opt-in and the project is synced and checked
    const result = run(root);
    const check = run(root, '--check');
    // Then both refuse, name the entry list as the caller, and nothing is written
    for (const outcome of [result, check]) {
        assert.equal(outcome.status, 1, outcome.stdout);
        assert.match(outcome.stderr, /skill-profile: refusing to hide start-workflow \(commandOnly\): started by the entrySkills list; set skillProfile\.allowHidingCalledSkills: true to allow/);
    }
    assert.equal(fs.readFileSync(settingsPath(root), 'utf8'), SETTINGS_TEXT);
    assert.equal(fs.existsSync(path.join(root, '.claude', 'skill-profile.generated.json')), false);
    // And the setup skills a hook starts are refused the same way in the off list
    const offSetup = profileLib.resolveProfile(root, { skillProfile: { off: ['project-init', 'project-config'] } });
    assert.deepEqual(offSetup.refusals.map(refusal => refusal.skill), ['project-config', 'project-init']);
    assert.deepEqual(offSetup.overrides, {});

    // Given the explicit opt-in / When synced / Then the value is written and a warning names the entry list
    setProfile(root, { preset: 'full', commandOnly: ['start-workflow'], allowHidingCalledSkills: true });
    const allowed = run(root);
    assert.equal(allowed.status, 0, allowed.stderr);
    assert.equal(readSettings(root).skillOverrides['start-workflow'], 'user-invocable-only');
    assert.match(allowed.stdout, /skill-profile: hiding called skill start-workflow \(commandOnly\): started by the entrySkills list/);
}));

test('[skill-profile] TC-ADS-016 the standard preset does not make entry skills name-only', () => withProject({ profile: { preset: 'standard' } }, root => {
    // Given the standard preset / When resolved
    const resolved = profileLib.resolveProfile(root, { skillProfile: { preset: 'standard' } });
    // Then entry skills that are not also in calledByOthers get no entry (protection does not widen the preset)
    for (const name of ENTRY_SKILLS.filter(skill => !CALLED_BY_OTHERS.includes(skill))) {
        assert.equal(Object.hasOwn(resolved.overrides, name), false, `${name} keeps its default visibility`);
    }
    assert.deepEqual(Object.keys(resolved.overrides).sort(), [...CALLED_BY_OTHERS].sort());
}));

test('[skill-profile] TC-ADS-019 edge: an interrupted settings / ledger write self-heals with no conflict line', () => {
    for (const crashAt of ['settings', 'final ledger']) {
        withProject({ profile: { preset: 'full', nameOnly: ['plain-a'] } }, root => {
            // Given a synced project that owns plain-a, whose next sync drops plain-a and adds plain-b
            assert.equal(run(root).status, 0);
            setProfile(root, { preset: 'full', nameOnly: ['plain-b'] });
            const plan = profileLib.planSkillProfile({ rootDir: root });
            // When the write is interrupted (the settings write, or the final ledger write, fails)
            let ledgerWrites = 0;
            assert.throws(() => profileLib.writePairCrashConsistent(plan, {
                targetChanged: plan.settingsChanged,
                writeTarget: () => {
                    if (crashAt === 'settings') throw new Error('interrupted');
                    profileLib.writeTextAtomic(plan.settingsPath, plan.settingsText);
                },
                writeLedger: text => {
                    ledgerWrites += 1;
                    if (crashAt === 'final ledger' && ledgerWrites === 2) throw new Error('interrupted');
                    profileLib.writeTextAtomic(plan.ledgerPath, text);
                }
            }), /interrupted/, crashAt);
            // Then the ledger already records both keys (the union), so neither can become the user's
            const ledgerPath = path.join(root, '.claude', 'skill-profile.generated.json');
            assert.deepEqual(JSON.parse(fs.readFileSync(ledgerPath, 'utf8')).skillOverrides, { 'plain-a': 'name-only', 'plain-b': 'name-only' }, `${crashAt}: interim ledger`);
            // And the next sync converges with no conflict line, and --check passes
            const rerun = run(root);
            assert.equal(rerun.status, 0, rerun.stderr);
            assert.doesNotMatch(rerun.stdout, /conflict:/, `${crashAt}: no conflict`);
            assert.deepEqual(readSettings(root).skillOverrides, { 'plain-b': 'name-only' }, `${crashAt}: settings`);
            assert.deepEqual(JSON.parse(fs.readFileSync(ledgerPath, 'utf8')).skillOverrides, { 'plain-b': 'name-only' }, `${crashAt}: final ledger`);
            assert.equal(run(root, '--check').status, 0);
        });
    }
});

test('[skill-profile] a ledger copied from another project owns nothing', () => withProject({ profile: { preset: 'full', nameOnly: ['plain-a'] } }, root => {
    // Given a ledger bound to another project that claims a key the user wrote
    const userSettings = SETTINGS_TEXT.replace('  "cleanupPeriodDays": 30,', '  "cleanupPeriodDays": 30,\n  "skillOverrides": { "plain-b": "off" },');
    fs.writeFileSync(settingsPath(root), userSettings, 'utf8');
    const ledger = { description: 'x', project: 'another-project', skillOverrides: { 'plain-b': 'off' } };
    fs.writeFileSync(path.join(root, '.claude', 'skill-profile.generated.json'), JSON.stringify(ledger), 'utf8');
    // When synced
    const result = run(root);
    // Then the user's key survives and the ledger is reported as ignored
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /ignored .*skill-profile\.generated\.json: it belongs to another project/);
    const overrides = readSettings(root).skillOverrides;
    assert.equal(overrides['plain-b'], 'off');
    assert.equal(overrides['plain-a'], 'name-only');
}));

test('[skill-profile] schema: skillProfile keys validate, carry descriptions, and reject ambiguous lists', () => {
    const base = extra => ({ project: { name: 'p' }, ...extra });
    // Given each key with a valid value / When validated / Then no errors
    const valid = SCHEMA.validateConfig(base({ skillProfile: { preset: 'minimal', nameOnly: ['a'], commandOnly: ['b'], off: ['c'], allowHidingCalledSkills: false } }));
    assert.deepEqual(valid.errors, []);
    for (const key of ['preset', 'nameOnly', 'commandOnly', 'off', 'allowHidingCalledSkills']) {
        assert.ok(SCHEMA.SCHEMA.skillProfile.properties[key].describe.length > 20, `${key} has a describe text`);
    }
    // Given invalid values / Then each names its path
    const errors = SCHEMA.validateConfig(base({ skillProfile: { preset: 'tiny', nameOnly: ['x'], off: ['x', 'Bad_Name'], allowHidingCalledSkills: 'yes' } })).errors.join('\n');
    assert.match(errors, /skillProfile\.preset: expected one of full\|standard\|minimal/);
    assert.match(errors, /skillProfile\.off: "x" is also listed in skillProfile\.nameOnly/);
    assert.match(errors, /skillProfile\.off\[1\]: "Bad_Name" is not a skill folder name/);
    assert.match(errors, /skillProfile\.allowHidingCalledSkills: expected boolean/);
    // Given an unknown skill name / When resolved / Then a warning, not a failure
    withProject({}, root => {
        const resolved = profileLib.resolveProfile(root, { skillProfile: { nameOnly: ['not-a-skill'] } });
        assert.deepEqual(resolved.overrides, {});
        assert.match(resolved.warnings.join('\n'), /unknown skill not-a-skill/);
    });
});
