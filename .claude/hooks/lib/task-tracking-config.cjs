'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Protective budgets, not measured capacity. Oversize input must be disclosed. There is no budget on the total bytes a
// project's records and linked evidence add up to: a project is read whole, however large its specs and sources are.
const LIMITS = Object.freeze({ records: 2000, recordBytes: 2 * 1024 * 1024,
    membershipEdges: 20000, queue: 64, receipts: 128, lockWaitMs: 3000, lockPollMs: 100, readRetries: 1, processTimeoutMs: 10000 });
// Every tracker word comes from the vocabulary owner; this module re-exports the current ones for its consumers.
const vocabulary = require('./task-tracking-vocabulary.cjs');
const { KINDS, LEVELS, INITIATIVE_TYPES, FOLDERS, CURRENT_VERSION, BASE_VERSION, EARLIER_VERSION, RETIRED_VERSION } = vocabulary;
// How much record detail a status report carries, richest first. A size budget steps down this list and never below its end.
const REPORT_DETAIL_FORMS = Object.freeze(['full', 'packed', 'none']);
// What a status report is when neither the request nor the project names a form: the compact version, which packs every
// record's detail. A compact version is held to a size a shared page can carry unless a budget is stated; the full
// version is written when it is asked for by name and has no size limit of its own.
const REPORT_DEFAULTS = Object.freeze({ detail: 'packed', compactBytes: 15 * 1024 * 1024 });
const CUSTOM_MEMBER_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/;
// An author address is a bounded local identifier, not mailbox verification.
const EMAIL_ID = /^[\x21-\x3f\x41-\x7e]+@[\x21-\x3f\x41-\x7e]+$/;
const isEmailId = value => typeof value === 'string' && value.length <= 254 && EMAIL_ID.test(value);
const MEMBER_ID = Object.freeze({ test: value => typeof value === 'string' && (CUSTOM_MEMBER_ID.test(value) || isEmailId(value)) });
const ITEM_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;
// A calendar date is YYYY-MM-DD that round-trips as a real date, so the thirtieth of February is not one.
const calendarDate = value => typeof value === 'string' && /^\d{4}-\d\d-\d\d$/.test(value)
    && Number.isFinite(Date.parse(`${value}T00:00:00.000Z`)) && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

const TASK_TRACKING_SCHEMA = {
    type: 'object', required: false, describe: 'Optional local work tracking policy; absence leaves automation off.',
    properties: {
        schemaVersion: { type: 'number', required: true, describe: `Vocabulary the stored records use: ${CURRENT_VERSION} is current and adds the implemented state; ${BASE_VERSION} is the same vocabulary without that state, and stays readable by a framework copy that predates it; ${EARLIER_VERSION} is the earlier vocabulary, read-only until migrated; ${RETIRED_VERSION}, the first vocabulary, is refused by name.` },
        mode: { type: 'string', required: false, describe: 'Automatic upkeep: off, observe, or linked. Default off.' },
        healthOwnerId: { type: 'string', required: false, describe: 'Exact existing item owning explicit project health attestations; never inferred from delivery.' },
        groupLabels: { type: 'object', required: false, describe: `Earlier vocabulary only (schemaVersion ${EARLIER_VERSION}): inert group display labels keyed by group purpose. The migration turns them into level and type labels.`, properties:
            Object.fromEntries(vocabulary.EARLIER.groupRoles.map(role => [role, { type: 'string', required: false, describe: 'Nonblank display text, at most 160 characters, without control characters.' }])) },
        // One note states the rule for every key of a label map: an identical note per key would only lengthen the description an assistant reads.
        kindLabels: { type: 'object', required: false, describe: 'Optional inert display words keyed by the current kinds: nonblank text of at most 160 characters without control characters, never another vocabulary word or label. Stored words, identities and counts never change.', properties:
            Object.fromEntries(KINDS.map(kind => [kind, { type: 'string', required: false }])) },
        levelLabels: { type: 'object', required: false, describe: 'Optional inert display names keyed by area level: nonblank text of at most 160 characters without control characters. Stored levels, their order and counts never change.', properties:
            Object.fromEntries(LEVELS.map(level => [level, { type: 'string', required: false }])) },
        typeLabels: { type: 'object', required: false, describe: 'Optional inert display names keyed by initiative type: nonblank text of at most 160 characters without control characters. Stored types never change.', properties:
            Object.fromEntries(INITIATIVE_TYPES.map(type => [type, { type: 'string', required: false }])) },
        profile: { type: 'object', required: false, describe: 'One canonical record authority; default portable Markdown.', properties: {
            kind: { type: 'string', required: true, describe: 'portable-markdown or native.' },
            version: { type: 'number', required: true, describe: 'Positive capability contract version; portable supports 1.' },
            registration: { type: 'string', required: false, describe: 'Native trusted registration identity; never an executable path.' },
            sources: { type: 'array', required: false, describe: 'Explicit native source inventory; no permission or executable authority.' }
        } },
        members: { type: 'arrayOf', required: false, describe: 'Stable team identities; no account or permission grants.', itemSchema: {
            id: { type: 'string', required: true, describe: 'Stable identity retained across display-name changes.' },
            displayName: { type: 'string', required: true, describe: 'Human-readable member name.' },
            active: { type: 'boolean', required: true, describe: 'Inactive members retain attribution but cannot receive new assignments.' },
            aliases: { type: 'array', required: false, describe: 'Unambiguous previous names or alternative identifiers.' }
        } },
        report: { type: 'object', required: false, describe: 'Disposable report policy, independent of automatic work upkeep.', properties: {
            enabled: { type: 'boolean', required: false, describe: 'Allow explicit report generation; default true.' },
            autoRefresh: { type: 'boolean', required: false, describe: 'Refresh an already initialized report after successful supported saves; default true.' },
            detail: { type: 'string', required: false, describe: 'Record detail the report carries: full, packed (the compact version) or none. Every form lists every inspected record; default packed.' },
            maxBytes: { type: 'number', required: false, describe: 'Optional size budget in bytes: the richest form that fits is written and none is ever refused; default 15 MiB for a compact version, none for the full version.' }
        } }
    }
};

function exactKeys(value, keys, label, errors) {
    if (!object(value)) { errors.push(`${label}: expected an object`); return false; }
    for (const key of Object.keys(value)) if (!keys.includes(key)) errors.push(`${label}.${key}: unknown field`);
    return true;
}

function relativePath(value) {
    return typeof value === 'string' && value.length > 0 && value.length <= 1024
        && !/[\u0000-\u001f]/.test(value) && !path.posix.isAbsolute(value) && !path.win32.isAbsolute(value)
        && !value.replace(/\\/g, '/').split('/').some(part => part === '..' || part === '.' || part === '')
        && !value.includes(':');
}

/** A declared label map: its keys are among the listed words and each label is display text. `what` names the label in a finding. */
function validateLabels(declared, words, label, what, errors) {
    if (!exactKeys(declared, words, label, errors)) return;
    for (const word of words) if (Object.hasOwn(declared, word) && !vocabulary.displayLabel(declared[word])) errors.push(`${label}.${word}: ${what} label invalid`);
}

function validateTaskTracking(config, errors = []) {
    const value = config?.taskTracking;
    if (value === undefined) return errors;
    const declared = value?.schemaVersion;
    // The first vocabulary may still be declared, so that its project is refused by name instead of as a broken configuration.
    const retired = declared === RETIRED_VERSION;
    // Group labels belong to a vocabulary that has groups; the current one has none.
    if (!exactKeys(value, ['schemaVersion', 'mode', 'healthOwnerId', ...(declared === EARLIER_VERSION || retired ? ['groupLabels'] : []),
        'kindLabels', 'levelLabels', 'typeLabels', 'profile', 'members', 'report'], 'taskTracking', errors)) return errors;
    if (!vocabulary.declarableVersion(declared)) errors.push(`taskTracking.schemaVersion: supported versions are ${EARLIER_VERSION} (earlier vocabulary, read-only until migrated), ${BASE_VERSION} and ${CURRENT_VERSION}`);
    if (value.mode !== undefined && !['off', 'observe', 'linked'].includes(value.mode)) errors.push('taskTracking.mode: expected off, observe, or linked');
    if (value.healthOwnerId !== undefined && (typeof value.healthOwnerId !== 'string' || !ITEM_ID.test(value.healthOwnerId))) errors.push('taskTracking.healthOwnerId: expected exact item identity');
    // Labels keyed by the first vocabulary's words are not judged here: nothing of that project is read.
    if (declared === EARLIER_VERSION && value.groupLabels !== undefined) validateLabels(value.groupLabels, vocabulary.EARLIER.groupRoles, 'taskTracking.groupLabels', 'group', errors);
    if (!retired && value.kindLabels !== undefined) errors.push(...vocabulary.kindLabelErrors(value.kindLabels, declared));
    if (value.levelLabels !== undefined) validateLabels(value.levelLabels, LEVELS, 'taskTracking.levelLabels', 'level', errors);
    if (value.typeLabels !== undefined) validateLabels(value.typeLabels, INITIATIVE_TYPES, 'taskTracking.typeLabels', 'type', errors);
    if (value.profile !== undefined && exactKeys(value.profile, ['kind', 'version', 'registration', 'sources'], 'taskTracking.profile', errors)) {
        const p = value.profile;
        if (!['portable-markdown', 'native'].includes(p.kind) || !Number.isSafeInteger(p.version) || p.version < 1
            || (p.kind === 'portable-markdown' && p.version !== 1)) errors.push('taskTracking.profile: unsupported kind/version');
        if (p.kind === 'native' && (typeof p.registration !== 'string' || !CUSTOM_MEMBER_ID.test(p.registration))) errors.push('taskTracking.profile.registration: native identity required');
        if (p.kind === 'portable-markdown' && (p.registration !== undefined || p.sources !== undefined)) errors.push('taskTracking.profile: native fields do not belong to portable records');
        if (p.sources !== undefined && (!Array.isArray(p.sources) || p.sources.length > LIMITS.records || p.sources.some(v => !relativePath(v)))) errors.push('taskTracking.profile.sources: expected bounded project-relative paths');
    }
    const identities = new Map();
    if (value.members !== undefined) {
        if (!Array.isArray(value.members) || value.members.length > LIMITS.records) errors.push('taskTracking.members: expected bounded member list');
        else for (const m of value.members) {
            if (!exactKeys(m, ['id', 'displayName', 'active', 'aliases'], 'taskTracking.members[]', errors)) continue;
            if (typeof m.id !== 'string' || !MEMBER_ID.test(m.id) || typeof m.displayName !== 'string' || !m.displayName.trim()
                || m.displayName.length > 160 || typeof m.active !== 'boolean') errors.push('taskTracking.members[]: invalid identity, name, or availability');
            if (m.aliases !== undefined && (!Array.isArray(m.aliases) || m.aliases.length > 32 || m.aliases.some(a => typeof a !== 'string' || !a.trim()
                || (a.length > 160 && !isEmailId(a))))) errors.push('taskTracking.members[].aliases: invalid aliases');
            for (const identity of [m.id, m.displayName, ...(Array.isArray(m.aliases) ? m.aliases : [])]) {
                if (typeof identity !== 'string') continue;
                const key = identity.trim().toLocaleLowerCase('en-US');
                if (identities.has(key) && identities.get(key) !== m) errors.push('taskTracking.members: ambiguous member identity or alias');
                identities.set(key, m);
            }
        }
    }
    if (value.report !== undefined && exactKeys(value.report, ['enabled', 'autoRefresh', 'detail', 'maxBytes'], 'taskTracking.report', errors)) {
        for (const key of ['enabled', 'autoRefresh']) if (value.report[key] !== undefined && typeof value.report[key] !== 'boolean') errors.push(`taskTracking.report.${key}: expected boolean`);
        if (value.report.detail !== undefined && !REPORT_DETAIL_FORMS.includes(value.report.detail)) errors.push('taskTracking.report.detail: expected full, packed or none');
        if (value.report.maxBytes !== undefined && !(Number.isSafeInteger(value.report.maxBytes) && value.report.maxBytes > 0)) errors.push('taskTracking.report.maxBytes: expected a positive whole number of bytes');
    }
    return errors;
}

/**
 * A section declared in a vocabulary newer than this framework knows cannot be judged here, and it is one optional section:
 * its findings become warnings so the rest of the configuration still loads. Task tracking itself still refuses it
 * (`trackingContext` validates on its own) until the framework is updated; every other finding stays an error.
 */
function deferNewerTracking(config, validation) {
    const declared = config?.taskTracking?.schemaVersion;
    if (!Number.isSafeInteger(declared) || declared <= CURRENT_VERSION) return validation;
    const own = finding => finding.startsWith('taskTracking.');
    const errors = validation.errors.filter(finding => !own(finding));
    const deferred = validation.errors.filter(own).map(finding => `${finding} (task-tracking vocabulary ${declared} is newer than this framework supports; task tracking is unavailable until it is updated)`);
    return { ...validation, valid: errors.length === 0, errors, warnings: [...validation.warnings, ...deferred] };
}

// How many invalid fields the refusal of a configuration names in its reason before it says there are more.
const INVALID_NAMED = 3;
// The reason names the fields at fault, so that every surface that shows it says what to correct; `details` holds them all.
const invalidConfiguration = (subject, errors) => Object.assign(new Error(`${subject} configuration is invalid${errors.length
    ? `: ${errors.slice(0, INVALID_NAMED).join('; ')}${errors.length > INVALID_NAMED ? `; and ${errors.length - INVALID_NAMED} more` : ''}` : ''}`), { code: 'INVALID_CONFIG', details: errors });

function declaredContext(rootDir) {
    const root = fs.realpathSync(rootDir);
    const { readProjectConfigAt, getDocsRoot } = require('./project-config-loader.cjs');
    const loaded = readProjectConfigAt(root);
    if (loaded.state === 'invalid') throw invalidConfiguration('Project', loaded.errors);
    const errors = validateTaskTracking(loaded.config);
    if (errors.length) throw invalidConfiguration('Tracking', errors);
    const declared = loaded.config.taskTracking || {};
    return { root, config: loaded.config, configPath: loaded.filePath, enrolled: loaded.config.taskTracking !== undefined,
        mode: declared.mode || 'off', profile: declared.profile || { kind: 'portable-markdown', version: 1 },
        members: declared.members || [], report: { enabled: true, autoRefresh: true, ...declared.report },
        artifactsRoot: getDocsRoot('teamArtifacts', loaded.config), limits: LIMITS };
}

/** The selected checkout's policy, with its stored vocabulary resolved once for every consumer of this context. */
function trackingContext(rootDir) {
    const context = declaredContext(rootDir);
    return { ...context, vocabulary: vocabulary.projectVocabulary(context.root, context.artifactsRoot, context.config.taskTracking?.schemaVersion) };
}

module.exports = { LIMITS, REPORT_DETAIL_FORMS, REPORT_DEFAULTS, KINDS, FOLDERS, MEMBER_ID, CUSTOM_MEMBER_ID, isEmailId, ITEM_ID, calendarDate, TASK_TRACKING_SCHEMA, validateTaskTracking, deferNewerTracking, trackingContext, relativePath, vocabulary };
