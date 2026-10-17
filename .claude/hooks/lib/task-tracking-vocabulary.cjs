'use strict';

/**
 * The one owner of the tracker's words: kinds, record locations, lifecycles and their permitted steps, area levels,
 * initiative types, priority levels and link relations, in the current vocabulary, with the earlier vocabulary written
 * out beside it and how each earlier word is stated in the current terms. Nothing else in the tracker spells an earlier
 * word, with one deliberate exception: the migration's own recount of what each group held reads the stored member lists
 * by itself, so that a wrong word here shows there as a difference. A project stores exactly one vocabulary; a project
 * in the earlier one is read-only until its explicit migration. The first vocabulary is known by its declaration and its
 * record locations alone, so that a project still storing it is refused by name.
 *
 * The current structure has two versions. The base version introduced it; the current version added words to it and
 * moved nothing, so every base word is a current word and a base record is a current record as it stands. A project
 * stores the current version only when it declares it: until then it is offered, and may hold, the base words alone, so
 * a framework copy that knows only the base version reads everything the project stores. A copy that does not know a
 * declared version refuses the project by name instead of meeting a word it cannot read.
 *
 * Removing earlier-vocabulary support later means removing EARLIER, EARLIER_MAPPING and the non-current branches of
 * resolveVocabulary; version 2 then fails like any unsupported version.
 */

const CURRENT_VERSION = 4;
/** The version that introduced the current structure. A migration from the earlier vocabulary writes it, and a project that declares no version stores it. */
const BASE_VERSION = 3;
const EARLIER_VERSION = 2;
/** The first vocabulary. None of its words is read or migrated here; it is recognised only to be refused by name. */
const RETIRED_VERSION = 1;
const RETIRED_LOCATIONS = Object.freeze(['pbis', 'ideas', 'epics']);
/** Durable migration progress record, kept in the record root so it travels with the project. */
const JOURNAL_NAME = '.vocabulary-migration.json';

const freeze = value => {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
    return value;
};
const plain = value => (Array.isArray(value) ? value.map(plain)
    : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, plain(entry)])) : value);

// The delivery states. Their order is relied on outside the tracker, so the states keep their order relative to each other.
// Implemented is work that is built and published for review, before its verification starts.
const DELIVERY_STATES = Object.freeze(['draft', 'planned', 'ready', 'in_progress', 'blocked', 'implemented', 'verifying', 'done', 'canceled']);

const CURRENT = freeze({
    version: CURRENT_VERSION,
    kinds: ['initiative', 'task', 'story', 'subtask', 'area'],
    folders: { initiative: 'initiatives', task: 'tasks', story: 'tasks/stories', subtask: 'subtasks', area: 'areas' },
    states: DELIVERY_STATES,
    // Each kind moves through one lifecycle. A lifecycle names its states in reading order and the state a new record starts in.
    lifecycles: {
        delivery: { states: DELIVERY_STATES, initial: 'draft' },
        tracker: { states: ['draft', 'approved', 'committed', 'done', 'canceled'], initial: 'draft' },
        area: { states: ['active', 'canceled'], initial: 'active' }
    },
    kindLifecycles: { initiative: 'tracker', task: 'delivery', story: 'delivery', subtask: 'delivery', area: 'area' },
    // The usual steps of each lifecycle. Policy applies its guards to them and both views offer them.
    transitions: {
        delivery: { draft: ['planned', 'implemented', 'canceled'], planned: ['ready', 'implemented', 'canceled'], ready: ['in_progress', 'implemented', 'canceled'],
            in_progress: ['blocked', 'implemented', 'verifying', 'canceled'], blocked: ['in_progress', 'verifying', 'canceled'],
            implemented: ['in_progress', 'verifying', 'canceled'], verifying: ['done', 'canceled'],
            done: ['planned', 'ready', 'in_progress', 'canceled'], canceled: [] },
        tracker: { draft: ['approved', 'canceled'], approved: ['committed', 'canceled'], committed: ['done', 'canceled'], done: ['committed'], canceled: [] },
        area: { active: ['canceled'], canceled: [] }
    },
    // Area levels, shallowest first: a parent is never deeper than its child.
    levels: ['application', 'product', 'module', 'feature'],
    initiativeTypes: ['feedback', 'idea', 'initiative'],
    priorityLevels: ['high', 'medium', 'low'],
    linkRoles: ['dependency', 'parent', 'area', 'initiative', 'spec', 'plan', 'source'],
    // The relations that tag a record, each with the one kind its target must be.
    tagRoles: { area: 'area', initiative: 'initiative' }
});

// What the current version added to the base: one delivery state, with the steps into and out of it.
const ADDED_STATES = Object.freeze(['implemented']);
const baseStates = states => states.filter(state => !ADDED_STATES.includes(state));
/** The base version: the current vocabulary without the words the current version added. */
const BASE = freeze({ ...plain(CURRENT), version: BASE_VERSION, states: baseStates(DELIVERY_STATES),
    lifecycles: { ...plain(CURRENT.lifecycles), delivery: { ...plain(CURRENT.lifecycles.delivery), states: baseStates(DELIVERY_STATES) } },
    transitions: { ...plain(CURRENT.transitions), delivery: Object.fromEntries(Object.entries(CURRENT.transitions.delivery)
        .filter(([from]) => !ADDED_STATES.includes(from)).map(([from, to]) => [from, baseStates(to)])) } });

/** The earlier vocabulary, written out: it differs from the current one in structure, so no word map derives it. */
const EARLIER = freeze({
    version: EARLIER_VERSION,
    kinds: ['initiative', 'task', 'story', 'subtask', 'project', 'vision'],
    folders: { initiative: 'initiatives', task: 'tasks', story: 'tasks/stories', subtask: 'subtasks', project: 'projects', vision: 'visions' },
    states: ['draft', 'planned', 'ready', 'in_progress', 'blocked', 'verifying', 'done', 'canceled'],
    groupRoles: ['area', 'domain', 'capability', 'program'],
    linkRoles: ['dependency', 'parent', 'initiative', 'spec', 'plan', 'source']
});
const VOCABULARIES = Object.freeze({ [EARLIER_VERSION]: EARLIER, [BASE_VERSION]: BASE, [CURRENT_VERSION]: CURRENT });

/**
 * How the earlier vocabulary is stated in the current terms. These are facts about single earlier words. Putting a
 * project into current terms needs every record at once, because a group listed its members where each record now names
 * its own areas and initiatives; that whole-project mapping applies these facts and is owned by
 * task-tracking-earlier-project.cjs.
 */
const EARLIER_MAPPING = freeze({
    // The kinds that listed members, and the tracking values that held a group's list and its purpose.
    groupKinds: ['project', 'vision'],
    memberField: 'memberItemIds',
    purposeField: 'groupRole',
    // A group with this purpose is a finite outcome and becomes an initiative; every other group becomes an area.
    initiativePurpose: 'program',
    // The level a purpose gives its area. A group of the nesting purpose listed by another such group sits one level below.
    purposeLevels: { area: 'product', domain: 'module', capability: 'feature' },
    nesting: { purpose: 'area', level: 'module' },
    // The type of an initiative, by what it was: a finite-outcome group or a proposal.
    types: { group: 'initiative', proposal: 'idea' },
    // The state an earlier delivery state gives an initiative. An area is canceled when it was canceled, active otherwise.
    initiativeStates: { draft: 'draft', planned: 'approved', ready: 'committed', in_progress: 'committed', blocked: 'committed', verifying: 'committed', done: 'done', canceled: 'canceled' },
    areaStates: { canceled: 'canceled' },
    areaState: 'active',
    // The display label a group-purpose label becomes: the configuration key that holds it and the word it is for.
    labels: { area: ['levelLabels', 'product'], domain: ['levelLabels', 'module'], capability: ['levelLabels', 'feature'], program: ['typeLabels', 'initiative'] }
});

const KINDS = CURRENT.kinds;
const FOLDERS = CURRENT.folders;
const STATES = CURRENT.states;
const LIFECYCLES = CURRENT.lifecycles;
const TRANSITIONS = CURRENT.transitions;
const LEVELS = CURRENT.levels;
const INITIATIVE_TYPES = CURRENT.initiativeTypes;
const PRIORITY_LEVELS = CURRENT.priorityLevels;
const LINK_ROLES = CURRENT.linkRoles;
const TAG_ROLES = CURRENT.tagRoles;
/** The one kind that earns delivery credit, the kind that says where work belongs and the kind that says why it is done. */
const DELIVERY_KIND = 'task';
const AREA_KIND = 'area';
const INITIATIVE_KIND = 'initiative';
/** The state a delivery draft enters when it is planned. */
const PLANNED_STATE = 'planned';
// Built and published for review; reached with captured intent alone, and verification starts from it.
const IMPLEMENTED_STATE = 'implemented';
const recordedStates = words => Object.freeze([...new Set(Object.values(words.lifecycles).flatMap(lifecycle => lifecycle.states))]);
/** Every state a record or a history entry may hold, whatever its lifecycle. */
const RECORDED_STATES = recordedStates(CURRENT);
/** Item-to-item relations whose chains must stay free of cycles. */
const ACYCLIC_LINK_ROLES = Object.freeze(['dependency', 'parent', 'area', 'initiative']);

const kindLifecycles = words => Object.fromEntries(KINDS.map(kind => {
    const name = CURRENT.kindLifecycles[kind];
    return [kind, { name, ...words.lifecycles[name], transitions: words.transitions[name] }];
}));
const KIND_LIFECYCLE = freeze({ [BASE_VERSION]: kindLifecycles(BASE), [CURRENT_VERSION]: kindLifecycles(CURRENT) });
/**
 * The lifecycle a kind moves through: its name, states, first state and usual steps. A word that is no kind has none.
 * `version` selects the version of the current structure whose lifecycle is meant; without one it is the current version.
 */
const lifecycleOf = (kind, version = CURRENT_VERSION) => (Object.hasOwn(KIND_LIFECYCLE[version] || {}, kind) ? KIND_LIFECYCLE[version][kind] : undefined);
/** The relation that tags a record to a target of the given kind. */
const tagRole = kind => Object.keys(TAG_ROLES).find(role => TAG_ROLES[role] === kind);

/**
 * The values a record carries beside its state: the kinds that own each one, the list it is chosen from (a deadline is a
 * calendar date, so it has none), whether it may be unset, and what a new record starts with.
 */
const OWNED_VALUES = freeze({
    level: { kinds: [AREA_KIND], values: LEVELS, optional: true, initial: null },
    type: { kinds: [INITIATIVE_KIND], values: INITIATIVE_TYPES, optional: false, initial: 'idea' },
    priorityLevel: { kinds: [INITIATIVE_KIND], values: PRIORITY_LEVELS, optional: true, initial: null },
    deadline: { kinds: KINDS.filter(kind => kind !== AREA_KIND), values: null, optional: true, initial: null }
});
/** The owned values a new record of the given kind starts with. */
const ownedDefaults = kind => Object.fromEntries(Object.entries(OWNED_VALUES).filter(([, owned]) => owned.kinds.includes(kind)).map(([field, owned]) => [field, owned.initial]));

const LABELS = freeze({
    kinds: { initiative: 'Initiative', task: 'Task', story: 'Story', subtask: 'Subtask', area: 'Area' },
    kindsPlural: { initiative: 'Initiatives', task: 'Tasks', story: 'Stories', subtask: 'Subtasks', area: 'Areas' },
    states: { draft: 'Draft', planned: 'Planned', ready: 'Ready', in_progress: 'In progress', blocked: 'Blocked', implemented: 'Implemented', verifying: 'Verifying', done: 'Done', canceled: 'Canceled',
        approved: 'Approved', committed: 'Committed', active: 'Active' },
    levels: { application: 'Application', product: 'Product', module: 'Module', feature: 'Feature' },
    initiativeTypes: { feedback: 'Feedback', idea: 'Idea', initiative: 'Initiative' },
    priorityLevels: { high: 'High', medium: 'Medium', low: 'Low' },
    linkRoles: { dependency: 'Depends on', parent: 'Parent', area: 'Area', initiative: 'Initiative', spec: 'Spec', plan: 'Plan', source: 'Source' }
});

const topLevel = folders => [...new Set(Object.values(folders).map(folder => folder.split('/')[0]))];
/** Top-level record locations that exist in one vocabulary only; a location both share cannot tell them apart. */
const EARLIER_ONLY_LOCATIONS = Object.freeze(topLevel(EARLIER.folders).filter(name => !topLevel(CURRENT.folders).includes(name)));
const CURRENT_ONLY_LOCATIONS = Object.freeze(topLevel(CURRENT.folders).filter(name => !topLevel(EARLIER.folders).includes(name)));
/** Locations no current project reads: a record found in one was written in another vocabulary and is named, never counted. */
const STRAY_LOCATIONS = Object.freeze([...EARLIER_ONLY_LOCATIONS, ...RETIRED_LOCATIONS]);
/** The locations a project storing the given vocabulary does not read: an earlier project reads its own, so only the first vocabulary's are strays there. */
const strayLocations = version => (version === EARLIER_VERSION ? RETIRED_LOCATIONS : STRAY_LOCATIONS);

const REFUSALS = freeze({
    MIGRATION_REQUIRED: 'Migration required: this project stores the earlier vocabulary and is read-only; preview and run the tracker migration, then retry',
    MIGRATION_IN_PROGRESS: 'Migration in progress: a vocabulary migration is unfinished; run the tracker migration again to complete it before reading or saving',
    MIXED_VOCABULARY: 'Mixed vocabularies: record locations from both vocabularies are present; nothing is counted or saved until one vocabulary remains',
    UNSUPPORTED_VOCABULARY: 'Unsupported vocabulary: this project stores the first vocabulary, which this copy of the tracker neither reads nor migrates; upgrade it with a framework copy that supports the first vocabulary, then run the tracker migration',
    EARLIER_VOCABULARY_RECORD: 'Earlier-vocabulary record: not counted',
    EARLIER_VOCABULARY_REQUEST: `Request uses the earlier vocabulary (version ${EARLIER_VERSION}); update the procedure that produced it and send a version ${BASE_VERSION} request in the current words`
});

// A version is a number; a string that merely looks like one is not a declaration.
const supportedVersion = version => typeof version === 'number' && Object.hasOwn(VOCABULARIES, version);
const wordsFor = version => (supportedVersion(version) ? VOCABULARIES[version] : null);
/** Whether a version stores the current structure: the kinds, locations and links of the base version. */
const inCurrentStructure = version => version === BASE_VERSION || version === CURRENT_VERSION;
/** The stamps a project storing the given version reads: its own, and every earlier version of the same structure. */
const readableStamps = version => (inCurrentStructure(version) ? [BASE_VERSION, CURRENT_VERSION].filter(stamp => stamp <= version) : [version]);
/** The version a project's configuration says it stores: the current one only when declared, the base one otherwise. */
const declaredWords = config => (config?.taskTracking?.schemaVersion === CURRENT_VERSION ? CURRENT : BASE);
/**
 * The states a tracked record holds, now or in its history, that the given version does not have because a later
 * version added them. A project never stores one: an older framework copy that reads the project would refuse the record.
 * A file without tracking metadata is authored content, whose status is any text, so it holds none.
 */
function laterStates(record, version) {
    const words = wordsFor(version);
    if (!words || !inCurrentStructure(version) || !record?.tracking) return [];
    const known = recordedStates(words);
    const held = [record?.data?.status, ...(Array.isArray(record?.tracking?.history) ? record.tracking.history.flatMap(entry => [entry?.beforeState, entry?.afterState]) : [])];
    return [...new Set(held.filter(state => RECORDED_STATES.includes(state) && !known.includes(state)))];
}
/** Why a project storing the given version does not take a state a later version added, and what makes it available. */
const laterStateRefusal = (state, version) => `The ${state} state belongs to vocabulary version ${CURRENT_VERSION} and this project stores version ${version}; declare taskTracking.schemaVersion ${CURRENT_VERSION} in the project configuration to record it`;
/** A version a project may declare: one that is read, or the first one, which is then refused by name. */
const declarableVersion = version => supportedVersion(version) || version === RETIRED_VERSION;

/**
 * Decides a project's vocabulary from facts alone, so a working copy and a pinned commit share one rule.
 * `folderNames` are the record locations present directly under the record root, spelled as the tracker reads them.
 * A location is present exactly when the tracker would read it, so recognition and reading can never disagree.
 */
function resolveVocabulary({ declaredVersion, folderNames = [], journalPresent = false } = {}) {
    const names = new Set(folderNames);
    const earlierLocations = EARLIER_ONLY_LOCATIONS.filter(name => names.has(name));
    const currentLocations = CURRENT_ONLY_LOCATIONS.filter(name => names.has(name));
    const retiredLocations = RETIRED_LOCATIONS.filter(name => names.has(name));
    const declared = declaredVersion !== undefined;
    const found = { declared, earlierLocations, currentLocations, retiredLocations };
    const blocked = (state, code, reason) => freeze({ state, storedVersion: null, readOnly: true, code, reason, ...found });
    // A declaration wins over what the locations suggest. The first vocabulary is settled before anything else: even an
    // unfinished migration of such a project belongs to the copy that can finish it.
    if (declared ? declaredVersion === RETIRED_VERSION : retiredLocations.length > 0) return blocked('unsupported', 'UNSUPPORTED_VOCABULARY',
        `${REFUSALS.UNSUPPORTED_VOCABULARY} (${declared ? `declared version ${RETIRED_VERSION}` : `locations: ${retiredLocations.join(', ')}`})`);
    if (journalPresent) return blocked('migrating', 'MIGRATION_IN_PROGRESS', REFUSALS.MIGRATION_IN_PROGRESS);
    // Undeclared, an earlier-only location means earlier.
    const earlier = declared ? declaredVersion === EARLIER_VERSION : earlierLocations.length > 0;
    if (earlier && currentLocations.length) return blocked('mixed', 'MIXED_VOCABULARY',
        `${REFUSALS.MIXED_VOCABULARY} (earlier: ${earlierLocations.join(', ') || 'declared by the project'}; current: ${currentLocations.join(', ')})`);
    if (earlier) return freeze({ state: 'earlier', storedVersion: EARLIER_VERSION, readOnly: true, code: 'MIGRATION_REQUIRED', reason: REFUSALS.MIGRATION_REQUIRED, ...found });
    // The current structure. Only a declaration makes a project store the current version: the base version is what an
    // undeclared project, and every project written before the current version existed, already stores.
    return freeze({ state: 'current', storedVersion: declaredVersion === CURRENT_VERSION ? CURRENT_VERSION : BASE_VERSION, readOnly: false, code: null, reason: null, ...found });
}

const journalPath = artifactsRoot => `${artifactsRoot}/${JOURNAL_NAME}`;

/**
 * Resolves a working copy. Each location is asked of the file system by the exact path the record walk reads, never
 * matched against a directory listing: on a disk that ignores letter case `Tasks` and `tasks` are one location and
 * are found as one, and on a disk that does not, a differently spelled folder is not a tracker location at all.
 */
function projectVocabulary(root, artifactsRoot, declaredVersion) {
    const fs = require('node:fs');
    const path = require('node:path');
    // Required here, not at load: the configuration owner depends on this module.
    const { relativePath } = require('./task-tracking-config.cjs');
    if (!relativePath(artifactsRoot)) return resolveVocabulary({ declaredVersion });
    const base = path.join(root, ...artifactsRoot.replace(/\\/g, '/').split('/'));
    const entry = name => { try { return fs.lstatSync(path.join(base, name)); } catch { return null; } };
    // A linked location is still a location: the record walk refuses to follow it and says so.
    const present = name => { const found = entry(name); return !!found && (found.isDirectory() || found.isSymbolicLink()); };
    return resolveVocabulary({ declaredVersion, folderNames: [...EARLIER_ONLY_LOCATIONS, ...CURRENT_ONLY_LOCATIONS, ...RETIRED_LOCATIONS].filter(present),
        journalPresent: entry(JOURNAL_NAME) !== null });
}

/** Refuses anything but a project in the current vocabulary, with the outcome the project state names. */
function requireCurrentVocabulary(vocabulary) {
    if (vocabulary?.code) throw Object.assign(new Error(vocabulary.reason), { code: vocabulary.code });
}

const foldLabel = text => text.trim().toLocaleLowerCase('en-US');
/** A display label is nonblank text of at most 160 characters without control characters. */
const displayLabel = label => typeof label === 'string' && !!label.trim() && label.length <= 160 && !/[\u0000-\u001f\u007f-\u009f]/.test(label);
/** The default display labels of the earlier vocabulary, written out as they were shown: a kind label of an earlier project could not borrow them. */
const EARLIER_LABELS = freeze({
    kinds: { initiative: 'Initiative', task: 'Task', story: 'Story', subtask: 'Subtask', project: 'Project group', vision: 'Vision' },
    kindsPlural: { initiative: 'Initiatives', task: 'Tasks', story: 'Stories', subtask: 'Subtasks', project: 'Project groups', vision: 'Visions' },
    states: { draft: 'Draft', planned: 'Planned', ready: 'Ready', in_progress: 'In progress', blocked: 'Blocked', verifying: 'Verifying', done: 'Done', canceled: 'Canceled' },
    groupRoles: { area: 'Area', domain: 'Domain', capability: 'Feature', program: 'Program' },
    linkRoles: { dependency: 'Depends on', parent: 'Parent', initiative: 'Initiative', spec: 'Spec', plan: 'Plan', source: 'Source' }
});
const reserved = (words, labels) => Object.freeze([...words, ...Object.values(labels).flatMap(table => Object.values(table))].map(foldLabel));
// The text a kind label may not borrow, by the vocabulary the project declares. A current project is held to every word
// and default label of either vocabulary. An earlier project is held to the words and default labels it
// was written against, so that a label which was valid when it was declared keeps the project readable until its
// migration, which names any label the current vocabulary uses for something else.
const withoutAdded = table => Object.fromEntries(Object.entries(table).filter(([word]) => !ADDED_STATES.includes(word)));
const currentReserved = (words, labels) => reserved([...KINDS, ...recordedStates(words), ...LEVELS, ...INITIATIVE_TYPES, ...PRIORITY_LEVELS, ...LINK_ROLES,
    ...EARLIER.kinds, ...EARLIER.states, ...EARLIER.groupRoles, ...EARLIER.linkRoles,
    ...Object.values(EARLIER_LABELS).flatMap(table => Object.values(table))], labels);
const TAKEN_WORDS = Object.freeze({
    [CURRENT_VERSION]: currentReserved(CURRENT, LABELS),
    // A base project is held to the base words: a label that names what the current version added stays valid until the project declares it.
    [BASE_VERSION]: currentReserved(BASE, { ...LABELS, states: withoutAdded(LABELS.states) }),
    [EARLIER_VERSION]: reserved([...EARLIER.kinds, ...EARLIER.states, ...EARLIER.groupRoles, ...EARLIER.linkRoles], EARLIER_LABELS)
});

/**
 * What is wrong with each declared display label for a kind, as `{ kind, problem }`. `version` is the vocabulary the
 * labels are judged against: its kinds are the keys a label may have, and its reserved text is what a label may not
 * borrow — another kind, a state, a level, a type, a group purpose, a link relation or a default label — nor may a label
 * repeat another kind's. A kind may keep its own word and label.
 */
function kindLabelFindings(declared, version) {
    const words = wordsFor(version) || CURRENT;
    const earlier = words.version === EARLIER_VERSION;
    const defaults = earlier ? EARLIER_LABELS : LABELS;
    const findings = [];
    const taken = new Set();
    for (const [kind, label] of Object.entries(declared)) {
        if (!words.kinds.includes(kind)) { findings.push({ kind, problem: 'unknown field' }); continue; }
        const own = [kind, defaults.kinds[kind], defaults.kindsPlural[kind]].filter(Boolean).map(foldLabel);
        if (!displayLabel(label)) findings.push({ kind, problem: 'kind label invalid (a label is nonblank text of at most 160 characters without control characters)' });
        else if (TAKEN_WORDS[words.version].includes(foldLabel(label)) && !own.includes(foldLabel(label))) findings.push({ kind,
            problem: `kind label invalid (${JSON.stringify(label.trim())} is a word or a default label of the ${earlier ? 'earlier' : 'current'} vocabulary)` });
        else if (taken.has(foldLabel(label))) findings.push({ kind, problem: `kind label invalid (${JSON.stringify(label.trim())} repeats the label of another kind)` });
        else taken.add(foldLabel(label));
    }
    return findings;
}

/** Those findings as configuration errors, each naming its field, the label and what the label collides with. */
function kindLabelErrors(declared, version) {
    if (declared === null || typeof declared !== 'object' || Array.isArray(declared)) return ['taskTracking.kindLabels: expected an object'];
    return kindLabelFindings(declared, version).map(finding => `taskTracking.kindLabels.${finding.kind}: ${finding.problem}`);
}

/**
 * The level and type labels a project declares, in the current terms. A project that declares the earlier vocabulary
 * may label a group purpose instead: each such label stands for the level or type that purpose became. `moved` lists
 * those labels as [purpose, configuration key, word]. A purpose label and a different label declared for the same level
 * or type cannot both be meant: the declared level or type label is the one shown, and the pair is named in `conflicts`.
 */
function currentLabels(declared) {
    const table = value => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
    const result = { levelLabels: { ...table(declared?.levelLabels) }, typeLabels: { ...table(declared?.typeLabels) }, moved: [], conflicts: [] };
    const purposes = declared?.schemaVersion === EARLIER_VERSION ? table(declared.groupLabels) : {};
    for (const [purpose, [key, word]] of Object.entries(EARLIER_MAPPING.labels)) if (Object.hasOwn(purposes, purpose)) {
        if (Object.hasOwn(result[key], word) && result[key][word] !== purposes[purpose]) { result.conflicts.push([purpose, key, word]); continue; }
        result[key][word] = purposes[purpose];
        result.moved.push([purpose, key, word]);
    }
    return result;
}

/**
 * Words and display labels for every view; the same block is offered by discovery and carried by each read. Given the
 * selected project's configuration, a declared kind label replaces that kind's displayed word, one and many alike, and
 * the displayed name of the link relation that carries the kind's word; a declared level or type label replaces that
 * level's or type's displayed name, and so does the label an earlier-vocabulary project declared for the group purpose
 * that became it. Labels are display text only: the kinds, states, levels, types and relations listed here stay the
 * stored and requested words. The states and steps are those of the version the selected project stores; with no project
 * selected the block states the tracker's whole vocabulary. The labels name every state either version has.
 */
function vocabularyBlock(config) {
    const words = config ? declaredWords(config) : CURRENT;
    const labels = plain(LABELS);
    const stated = config?.taskTracking;
    const declared = stated ? { ...stated, ...currentLabels(stated) } : stated;
    // A project that declares the earlier vocabulary may label a kind the current one does not have; nothing here shows
    // it. It may also hold a label the current vocabulary uses for something else: that kind keeps its current word.
    if (declared?.kindLabels && !kindLabelErrors(declared.kindLabels, declared.schemaVersion).length) {
        const shown = Object.fromEntries(Object.entries(declared.kindLabels).filter(([kind]) => KINDS.includes(kind)));
        const withheld = new Set(kindLabelFindings(shown, words.version).map(finding => finding.kind));
        for (const [kind, label] of Object.entries(shown)) if (!withheld.has(kind)) {
            labels.kinds[kind] = labels.kindsPlural[kind] = label.trim();
            if (LINK_ROLES.includes(kind)) labels.linkRoles[kind] = label.trim();
        }
    }
    for (const [table, key] of [['levels', 'levelLabels'], ['initiativeTypes', 'typeLabels']]) for (const word of Object.keys(labels[table])) {
        const label = declared?.[key]?.[word];
        if (displayLabel(label)) labels[table][word] = label.trim();
    }
    return { version: words.version, ...plain({ kinds: KINDS, states: words.states, lifecycles: words.lifecycles, kindLifecycles: CURRENT.kindLifecycles, transitions: words.transitions,
        levels: LEVELS, initiativeTypes: INITIATIVE_TYPES, priorityLevels: PRIORITY_LEVELS, linkRoles: LINK_ROLES, tagRoles: TAG_ROLES }),
        deliveryKind: DELIVERY_KIND, areaKind: AREA_KIND, initiativeKind: INITIATIVE_KIND, labels };
}

/** What a read states about the selected project's stored vocabulary. */
function projectVocabularyView(vocabulary) {
    return vocabulary ? { state: vocabulary.state, storedVersion: vocabulary.storedVersion, declared: vocabulary.declared, readOnly: vocabulary.readOnly,
        code: vocabulary.code, reason: vocabulary.reason, earlierLocations: [...vocabulary.earlierLocations], currentLocations: [...vocabulary.currentLocations],
        retiredLocations: [...vocabulary.retiredLocations] } : null;
}

// How a person may name a word in a prompt. Recognising a typed earlier word is compatibility, not vocabulary use.
const PROMPT_FORMS = Object.freeze({ story: 'stor(?:y|ies)', project: 'project groups?', capability: 'capabilit(?:y|ies)' });
const promptForm = word => PROMPT_FORMS[word] || `${word}s?`;
/**
 * Regular-expression sources for the work words of both vocabularies. An area is a place for work and too common a word
 * to be one by itself; the hierarchy terms carry it, under their narrower rule.
 */
function promptTerms() {
    return [...[...new Set([...KINDS, ...EARLIER.kinds])].filter(kind => kind !== AREA_KIND).map(promptForm), `${PLANNED_STATE} work`];
}
/** Regular-expression sources for the words that place work: the area levels, areas, initiatives and the earlier group purposes. */
function hierarchyTerms() {
    return [...new Set([...LEVELS, AREA_KIND, INITIATIVE_KIND, ...EARLIER.groupRoles])].map(promptForm);
}

module.exports = { CURRENT_VERSION, BASE_VERSION, EARLIER_VERSION, RETIRED_VERSION, JOURNAL_NAME, CURRENT, BASE, EARLIER, EARLIER_MAPPING, VOCABULARIES,
    KINDS, FOLDERS, STATES, LIFECYCLES, TRANSITIONS, RECORDED_STATES, LEVELS, INITIATIVE_TYPES, PRIORITY_LEVELS, LINK_ROLES, TAG_ROLES,
    DELIVERY_KIND, AREA_KIND, INITIATIVE_KIND, PLANNED_STATE, IMPLEMENTED_STATE, ACYCLIC_LINK_ROLES, OWNED_VALUES, LABELS,
    EARLIER_ONLY_LOCATIONS, CURRENT_ONLY_LOCATIONS, RETIRED_LOCATIONS, STRAY_LOCATIONS, REFUSALS,
    wordsFor, supportedVersion, declarableVersion, inCurrentStructure, readableStamps, declaredWords, laterStates, laterStateRefusal, strayLocations, lifecycleOf, tagRole, ownedDefaults, resolveVocabulary, projectVocabulary, journalPath, requireCurrentVocabulary,
    displayLabel, currentLabels, vocabularyBlock, kindLabelFindings, kindLabelErrors, projectVocabularyView, promptTerms, hierarchyTerms };
