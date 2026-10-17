'use strict';

const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { projectPathConcerns } = require('../../../hooks/lib/task-tracking-concerns.cjs');
const { vocabularyBlock } = require('../../../hooks/lib/task-tracking-vocabulary.cjs');
const { REPORT_DETAIL_FORMS: DETAIL_FORMS } = require('../../../hooks/lib/task-tracking-config.cjs');

// The tracker owns the words. This is the block every read carries: kinds, the lifecycle of each kind with its states,
// levels, types, priority levels and link relations, with the name shown for each. The report keeps no list of the
// words. What stays here is what a view decides: the order it reads them in, and the three words that shape a lifecycle
// line, written out below.
const VOCABULARY = vocabularyBlock();
const STATE_NAMES = Object.freeze(VOCABULARY.labels.states);
const DELIVERY_KIND = VOCABULARY.deliveryKind;
const AREA_KIND = VOCABULARY.areaKind;
const INITIATIVE_KIND = VOCABULARY.initiativeKind;
// The relation that tags a record to an area, and the one that links it to an initiative.
const tagRelation = kind => Object.keys(VOCABULARY.tagRoles).find(relation => VOCABULARY.tagRoles[relation] === kind);
const AREA_TAG = tagRelation(AREA_KIND);
const INITIATIVE_TAG = tagRelation(INITIATIVE_KIND);
// A lifecycle line. Blocked work waits beside In progress; canceled work is off the line. Every other state of a
// lifecycle is a stop on its line, in the tracker's order.
const SIDING = 'blocked';
const SIDING_HOST = 'in_progress';
const OFF_LINE = 'canceled';
const lifecycleOf = kind => VOCABULARY.kindLifecycles[kind];
// The lifecycles of the report being rendered: the snapshot's own, so a project is shown the states its vocabulary
// version has. Rendering is synchronous; renderReport sets this for one report and restores it.
let shownLifecycles = VOCABULARY.lifecycles;
const statesOf = lifecycle => shownLifecycles[lifecycle]?.states || [];
const stationsOf = lifecycle => statesOf(lifecycle).filter(state => state !== SIDING && state !== OFF_LINE);
const DELIVERY_LIFECYCLE = lifecycleOf(DELIVERY_KIND);
const inDelivery = item => lifecycleOf(item.kind) === DELIVERY_LIFECYCLE;
// The stops of the delivery line in the report being rendered.
const stations = () => stationsOf(DELIVERY_LIFECYCLE);
// Work that reached the last stop of a line that has somewhere to go, or that left its line, is closed.
function closed(item) {
    const line = stationsOf(lifecycleOf(item.kind));
    return item.state === OFF_LINE || (line.length > 1 && item.state === line.at(-1));
}
// A person's blocks read from what needs them next to what is finished: each line from its last open stop back to its
// first, blocked work beside the stop it waits at, and finished work last.
const PEOPLE_ORDER = Object.freeze((() => {
    const lines = Object.keys(VOCABULARY.lifecycles).map(stationsOf);
    const open = lines.flatMap(line => (line.length > 1 ? line.slice(0, -1) : [...line]).reverse());
    const ordered = [...new Set([...open, ...lines.filter(line => line.length > 1).map(line => line.at(-1))])];
    if (ordered.includes(SIDING_HOST)) ordered.splice(ordered.indexOf(SIDING_HOST) + 1, 0, SIDING);
    return ordered;
})());
// States whose mark is a ring, not a filled dot: a block for one of them is drawn hollow.
const RING_STATES = Object.freeze(['draft', 'ready', 'approved']);
const PROOF_NAMES = Object.freeze({ current: 'Proved', stale: 'Proof stale', missing: 'No proof', unknown: 'Proof unknown' });
const MIGRATE = 'migrate --root <checkout>';
// What each detail form says of itself. Every form lists every inspected record; only the depth differs.
const DETAIL_NAMES = Object.freeze({ full: 'Full version: every record\'s detail is in this file', packed: 'Compact version: every record\'s detail is packed in this file and opens with scripts on',
    none: 'Compact version without record detail: the overview and the list of records only' });
const READ_ONE = 'inspect --root <checkout> --item <id>';
const READ_FULL = 'report --root <checkout> --detail full';
// How many rows the list of records shows at once, shortest first: the first is the page length a report opens with.
const PAGE_LENGTHS = Object.freeze([20, 50, 100]);
// What the snapshot says about the vocabulary its source stores. Two vocabularies at once, or a migration that stopped
// part-way, means nothing was read as work.
function storedVocabulary(snapshot) { return snapshot.vocabulary?.project || null; }
function unreadableSource(snapshot) { const stored = storedVocabulary(snapshot); return !!stored?.code && stored.storedVersion === null; }
const UNASSIGNED = '__unassigned__';
const PIP_LIMIT = 8;
const BLOCK_LIMIT = 120;
const DENSE_BLOCKS = 40;
const LABELLED_BLOCKS = 12;
const FEW_BLOCKS = 4;
const GHOST_BLOCKS = 8;
const WAITING_LIMIT = 12;
const PERSON_BLOCKS = 24;
// Inline line icons, one path each, drawn in the current text colour. Nothing is loaded.
const ICONS = Object.freeze({ check: 'M5 12.5l4.5 4.5L19 7.5', clock: 'M12 7.5V12l3 2M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z',
    alert: 'M12 4l9 16H3zM12 10v4.5M12 17.5v.4', seal: 'M12 3l7 3v5.5c0 4.5-3 7.8-7 9.5-4-1.7-7-5-7-9.5V6z',
    person: 'M12 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5 20a7 7 0 0 1 14 0',
    lock: 'M7 11h10a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2zM8 11V8a4 4 0 0 1 8 0v3',
    print: 'M7 9V4h10v5M7 17H5.5A1.5 1.5 0 0 1 4 15.5v-5A1.5 1.5 0 0 1 5.5 9h13a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H17M7 14h10v6H7z',
    chevron: 'M6 9l6 6 6-6', chevronLeft: 'M15 6l-6 6 6 6', chevronRight: 'M9 6l6 6-6 6', levelsOpen: 'M7 6l5 5 5-5M7 13l5 5 5-5', levelsClose: 'M7 11l5-5 5 5M7 18l5-5 5 5' });

// All record content is data. Never interpret markdown, HTML or record paths here.
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

// Element content only, never an attribute value: quotes are data there and need no escape.
function escapeText(value) {
    return String(value ?? '').replace(/[&<>]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[character]));
}

function inlineJson(value) {
    return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

function array(value) { return Array.isArray(value) ? value : []; }
function count(value) { return Number.isSafeInteger(value) && value >= 0 ? value : null; }
function words(value) { return String(value || 'unknown').replace(/_/g, ' '); }
function capital(value) { return value.charAt(0).toUpperCase() + value.slice(1); }
function plural(total, one, many) { return `${total} ${total === 1 ? one : many}`; }
function recordKey(item) { return JSON.stringify([item.id, item.ownerPath]); }
// A record is addressed by its identity. Records that share one identity are told apart by their owning file as well.
function recordAnchor(item, byId) { return `record-${encodeURIComponent(byId.get(item.id) === item ? item.id : recordKey(item))}`; }
function stateName(state) { return STATE_NAMES[state] || words(state); }
function stateClass(state) { return STATE_NAMES[state] ? state : 'other'; }
// A record stands on its own kind's line, or beside it while blocked; any other state is off the line.
function onLine(item) { return stationsOf(lifecycleOf(item.kind)).includes(item.state) || (item.state === SIDING && statesOf(lifecycleOf(item.kind)).includes(SIDING)); }
function idTail(id) { return id.includes('-') ? id.slice(id.lastIndexOf('-') + 1) : id; }
function instant(value) {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value || '') ? `${value.slice(0, 10)} ${value.slice(11, 16)} UTC` : value || 'Date unknown';
}
function day(value) { return /^\d{4}-\d{2}-\d{2}/.test(value || '') ? value.slice(0, 10) : value || 'Date unknown'; }
function memberLabel(id, members) {
    if (!id) return 'Unassigned';
    const member = members.find(person => person.id === id);
    return member ? `${member.displayName}${member.active === false ? ' (inactive)' : ''}` : `Unknown member (${id})`;
}
function acceptanceLabel(item) {
    if (item.acceptance?.accepted === true) return 'Accepted delivery';
    return item.state === 'done' ? 'Recorded Done; acceptance unverified' : 'Not accepted';
}
function verificationLabel(item) {
    return ({ current: 'Current verification', stale: 'Stale verification', missing: 'No current proof', unknown: 'Verification unknown' })[item.verification?.status] || 'Verification unknown';
}
// The words shown for kinds: the project's own display labels where the snapshot carries them, the tracker's otherwise.
// A label is display text only; the kind a record stores never changes. A label is also data: every helper returns text
// already escaped for the page, as element content or an attribute value, so no caller can let one through as markup.
function kindWords(snapshot) {
    const shown = snapshot?.vocabulary?.labels || {};
    const one = { ...VOCABULARY.labels.kinds, ...shown.kinds }, many = { ...VOCABULARY.labels.kindsPlural, ...shown.kindsPlural };
    const word = (table, kind) => String(table[kind] || kind);
    const lower = (table, kind) => escapeHtml(word(table, kind).toLowerCase());
    return { one: kind => escapeHtml(word(one, kind)), many: kind => escapeHtml(word(many, kind)), lowerMany: kind => lower(many, kind),
        capitalMany: kind => escapeHtml(capital(word(many, kind).toLowerCase())),
        word: (total, kind) => lower(total === 1 ? one : many, kind), count: (total, kind) => `${total} ${lower(total === 1 ? one : many, kind)}`,
        // "a task", "an initiative": for a sentence that names one record of a kind.
        a: kind => `${/^[aeiou]/i.test(word(one, kind)) ? 'an' : 'a'} ${lower(one, kind)}`,
        // The same words as data, for a caller that escapes them itself.
        plain: kind => word(one, kind), plainMany: kind => word(many, kind) };
}
function kindBreakdown(records, kinds) {
    const totals = new Map();
    for (const item of records) totals.set(item.kind, (totals.get(item.kind) || 0) + 1);
    const known = VOCABULARY.kinds;
    return [...known.filter(kind => totals.has(kind)), ...[...totals.keys()].filter(kind => !known.includes(kind))]
        .map(kind => kinds.count(totals.get(kind), kind)).join(', ');
}
function listWords(words) { return words.length > 1 ? `${words.slice(0, -1).join(', ')} and ${words.at(-1)}` : words.join(''); }
// The area or initiative a snapshot was scoped to, when it was scoped to one.
function scopeOf(snapshot) {
    const scope = snapshot.scope;
    return scope?.itemId && [AREA_KIND, INITIATIVE_KIND].includes(scope.kind) ? scope : null;
}
// A scope is named by its kind, identity and title. Page text already: the kind word arrives escaped, the rest is escaped here.
function scopeName(snapshot, kinds) {
    const scope = scopeOf(snapshot);
    if (!scope) return null;
    const matching = array(snapshot.items).filter(item => item.id === scope.itemId);
    return matching.length === 1 ? `${kinds.one(scope.kind)} ${escapeHtml(`${scope.itemId}: ${matching[0].title}`)}` : `Unavailable scope ${escapeHtml(scope.itemId)}`;
}
function pathAnchor(path) { return `inspect-path-${encodeURIComponent(path)}`; }
function linkedPath(path) { return `<a href="#${escapeHtml(pathAnchor(path))}">Inspect path ${escapeHtml(path)}</a>`; }
// What a scoped snapshot's delivery list leaves out, named beside it: the tasks that earn no credit there and the work
// that supports them. A project's snapshot lists every record as a row, so it names nothing here.
function renderScopeLists(ctx) {
    const { snapshot, byId, kinds } = ctx;
    const scope = scopeOf(snapshot);
    const status = `<p id="inspected-context" class="note" role="status">Inspected: ${ctx.scopeLabel}</p>`;
    if (!scope) return status;
    const choose = ids => array(ids).map(id => byId.get(id)).filter(Boolean);
    // `name` is page text already: a fixed phrase, with kind words that arrive escaped.
    const list = (name, records) => `<details><summary>${name} (${records.length})</summary><ul class="reasons" aria-label="${name}">${records.map(item => `<li>${linkedRecord(item.id, ctx)}</li>`).join('')}</ul></details>`;
    const supporting = choose(scope.memberIds).filter(item => item.kind !== DELIVERY_KIND && inDelivery(item));
    // A scoped snapshot says how much it leaves to the project snapshot instead of listing it.
    const outside = array(snapshot.items).length - ctx.inScope.size;
    const beyond = outside > 0
        ? `<p class="note">${plural(outside, 'other record is', 'other records are')} outside this snapshot. Open the project snapshot, or read one record with the task tool: <span class="mono">${escapeHtml(READ_ONE)}</span>.</p>` : '';
    return `<div class="disclosures">${list(`Excluded ${kinds.lowerMany(DELIVERY_KIND)}`, choose(scope.excludedTaskIds))}${list('Supporting work', supporting)}</div>${beyond}${status}`;
}
function renderPathConcerns(ctx, scoped) {
    const { snapshot } = ctx;
    const paths = [...new Set(scoped.flatMap(item => array(item.links).map(link => link.path).filter(path => typeof path === 'string')))];
    // One walk of the snapshot answers every panel; each entry is the exact single-path concern query for its path.
    return projectPathConcerns(snapshot, paths).map(({ path, result, error }) => {
        if (error) {
            if (!['UNSAFE_PATH', 'INVALID_INPUT'].includes(error.code)) throw error;
            return `<section class="card" id="${escapeHtml(pathAnchor(path))}" aria-label="Exact linked concerns for ${escapeHtml(path)}"><h3 tabindex="-1">Linked concerns unavailable</h3><p>${escapeHtml(error.message)}. No replacement path was inferred.</p><a class="control" href="#work">Back to Work</a></section>`;
        }
        return `<section class="card" id="${escapeHtml(pathAnchor(path))}" aria-label="Exact linked concerns for ${escapeHtml(path)}"><h3 tabindex="-1">Linked concerns: ${escapeHtml(path)}</h3><p class="note">Exact path selection, as of ${escapeHtml(instant(result.asOf))}. Coverage: ${escapeHtml(result.coverage)}. Path availability is unverified in this offline snapshot. Delivery scope remains ${ctx.scopeLabel}.</p><ul class="reasons">${result.relationships.map(link => `<li>${escapeHtml(link.direction)}: ${linkedRecord(link.owner.itemId, ctx)} (${escapeHtml(link.owner.ownerPath)}) declares ${escapeHtml(link.relation)}; ${escapeHtml(link.resolution)}. ${escapeHtml(link.rationale)}</li>`).join('')}</ul><a class="control" href="#work">Back to Work</a></section>`;
    }).join('');
}
function jsonDetails(label, values) {
    return `<details><summary>${escapeHtml(label)} (${values.length})</summary><ol class="evidence">${values.map(value => `<li><pre>${escapeText(JSON.stringify(value, null, 2))}</pre></li>`).join('')}</ol></details>`;
}

// Four separately recorded facts get four separate marks: state, responsible person, proof and acceptance.
function icon(name) { return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${ICONS[name]}"/></svg>`; }
function dot(name, small) { return `<span class="dot is-${name}${small ? ' dot--s' : ''}" aria-hidden="true"></span>`; }
function kindMark(item, kinds) {
    return `<span class="kind${item.kind === DELIVERY_KIND && item.state !== OFF_LINE ? ' kind--delivery' : ''}">${kinds.one(item.kind)}</span>`;
}
// The level of an area or the type of an initiative, beside its name in a list. `text` is a display label: data.
function labelChip(text) { return text ? `<span class="kind kind--label">${escapeHtml(text)}</span>` : ''; }
// A lifecycle with one stop has no line to stand on, so work at that stop carries its word and no dot.
function stateMark(item) {
    const lone = stationsOf(lifecycleOf(item.kind)).length === 1 && item.state !== OFF_LINE;
    return `<span class="mark state is-${stateClass(item.state)}">${lone ? '' : dot(stateClass(item.state), true)}<span>${escapeHtml(stateName(item.state))}</span></span>`;
}
// Proof and acceptance belong to delivery work. An area or an initiative has neither, and says so instead of "none".
const NOT_APPLICABLE = '<span class="mark is-none"><span aria-hidden="true">–</span><span class="sr-only">Does not apply</span></span>';
function proofMark(item) {
    if (!inDelivery(item)) return NOT_APPLICABLE;
    const status = PROOF_NAMES[item.verification?.status] ? item.verification.status : 'unknown';
    const total = array(item.criteria).length;
    return `<span class="mark proof proof--${status}">${total ? `<span class="pips" aria-hidden="true">${'<span class="pip"></span>'.repeat(Math.min(total, PIP_LIMIT))}</span>` : ''}${total > PIP_LIMIT ? `<span>+${total - PIP_LIMIT}</span>` : ''}<span>${total ? PROOF_NAMES[status] : 'No criteria'}</span></span>`;
}
function sealMark(item) {
    if (!inDelivery(item)) return NOT_APPLICABLE;
    if (item.acceptance?.accepted === true) return `<span class="seal">${icon('check')}Accepted</span>`;
    return `<span class="seal seal--none">${item.state === 'done' ? 'Done, not accepted' : 'Not accepted'}</span>`;
}
function flags(item) { return `${item.retired ? '<span class="flag">Retired</span>' : ''}${item.overdue ? '<span class="flag flag--overdue">Overdue</span>' : ''}`; }

// A due date in the words of the page. The read says whether a record is overdue; the page only tells the day of the
// read from another day. A closed record whose date passed keeps the date and carries no mark.
const MONTHS = Object.freeze(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
function longDay(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || '');
    return match && MONTHS[Number(match[2]) - 1] ? `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]}` : value || 'Date unknown';
}
function dueMark(item, today) {
    if (!item.deadline) return '<span class="is-none">No due date</span>';
    if (item.overdue) return `<span class="tag tag--blocked due">${icon('alert')}<span>Overdue: was due ${escapeHtml(longDay(item.deadline))}</span></span>`;
    if (item.deadline === today) return `<strong>Due today, ${escapeHtml(longDay(item.deadline))}</strong>`;
    return `<span>${item.deadline < today ? 'Was due' : 'Due'} ${escapeHtml(longDay(item.deadline))}</span>`;
}

// One meter beside each area and initiative line: accepted with current proof, accepted with proof not current, and not
// accepted, sized by the counts the read states. A report admits no inline style, so the parts are drawn at one fixed
// size. Each part differs in shape as well as colour, and the counts are its name.
const METER = Object.freeze({ width: 120, wide: 246, height: 14, gap: 2, least: 4, radius: 3 });
const METER_PARTS = Object.freeze([['verified', 'with current proof'], ['stale', 'with proof not current'], ['open', 'not accepted yet']]);
function meter(entry, length = METER.width) {
    const counts = { verified: entry.currentlyVerified, stale: entry.accepted - entry.currentlyVerified, open: entry.remaining };
    const parts = METER_PARTS.filter(([name]) => counts[name] > 0);
    if (!parts.length) return '';
    const room = length - METER.gap * (parts.length - 1);
    const sum = parts.reduce((total, [name]) => total + counts[name], 0);
    let widths = parts.map(([name]) => Math.max(METER.least, counts[name] / sum * room));
    // A part held at its least width takes its room from the parts that have some to give.
    const over = widths.reduce((total, width) => total + width, 0) - room;
    const spare = widths.reduce((total, width) => total + (width - METER.least), 0);
    if (over > 0 && spare > 0) widths = widths.map(width => width - (width - METER.least) / spare * over);
    const at = value => Math.round(value * 100) / 100;
    let x = 0;
    const shapes = parts.map(([name], index) => {
        const width = at(widths[index]), left = at(x), r = Math.min(METER.radius, width / 2);
        x += width + METER.gap;
        if (name === 'open') return `<rect class="meter-open" x="${at(left + 0.75)}" y="0.75" width="${at(width - 1.5)}" height="${METER.height - 1.5}" rx="${at(Math.max(r - 0.75, 0))}"/>`;
        const body = `<rect class="meter-${name}" x="${left}" y="0" width="${width}" height="${METER.height}" rx="${at(r)}"/>`;
        // The foot marks proof that is no longer current, as the delivery blocks do.
        return name === 'stale' ? `${body}<path class="meter-foot" d="M${left} ${METER.height - 4}h${width}v${at(4 - r)}a${at(r)} ${at(r)} 0 0 1-${at(r)} ${at(r)}h-${at(width - 2 * r)}a${at(r)} ${at(r)} 0 0 1-${at(r)}-${at(r)}z"/>` : body;
    }).join('');
    return `<svg class="meter" viewBox="0 0 ${length} ${METER.height}" width="${length}" height="${METER.height}" role="img" focusable="false" aria-label="${parts.map(([name, words]) => `${counts[name]} ${words}`).join(', ')}">${shapes}</svg>`;
}
const METER_LEGEND = '<ul class="legend"><li><span class="block block--verified" aria-hidden="true"></span><span>accepted with current proof</span></li><li><span class="block block--accepted" aria-hidden="true"></span><span>accepted, proof not current</span></li><li><span class="block block--open" aria-hidden="true"></span><span>not accepted yet</span></li></ul>';

// Type comes from the reader's own platform: the report is one file and loads nothing, so it names no bundled face.
// Titles and figures ask for the heaviest weight the platform stack offers. An area or initiative name that leads to its
// record keeps a full-size target on screen, set by the stylesheet alone, and only its text height on paper.
const STYLES = `
:root{color-scheme:light dark;--work-paper:#F1F4F7;--record-sheet:#FFFFFF;--tray:#E7ECF1;--record-ink:#122230;--record-note:#3D5164;--record-faint:#586C7F;--record-edge:#6F8394;--hairline:#D5DDE5;--line-strong:#AEBBC8;--ownership-action:#1B5FC4;--action-wash:#E2ECFB;--on-action:#FFFFFF;--proof-current:#0A775F;--proof-stale:#855600;--stale-wash:#FAEDCB;--stale-fill:#E5A41B;--blocked:#B3470B;--blocked-wash:#FBE6D9;--verifying:#6341BF;--verifying-wash:#EBE5F9;
--font-display:system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans","Helvetica Neue",Arial,sans-serif;--font-text:system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans","Helvetica Neue",Arial,sans-serif;--font-mono:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;
--caption:.75rem;--small:.8125rem;--body:.9375rem;--lead:1rem;--section:1.375rem;--title:1.625rem;--headline:1.875rem;--display:2.375rem;--masthead:3.75rem;--hero:4.5rem;--radius-card:16px;--radius-panel:14px;--radius-control:10px}
@media (prefers-color-scheme:dark){:root{--work-paper:#0F1820;--record-sheet:#0B1218;--tray:#16212B;--record-ink:#E7EDF3;--record-note:#B4C1CE;--record-faint:#8B9DAE;--record-edge:#7C91A3;--hairline:#25333E;--line-strong:#3D4F5E;--ownership-action:#82B4FF;--action-wash:#162A45;--on-action:#07111D;--proof-current:#52D1AF;--proof-stale:#F0C050;--stale-wash:#31280F;--stale-fill:#F0C050;--blocked:#FF9C66;--blocked-wash:#382014;--verifying:#B9A4FF;--verifying-wash:#231C3F}}
*{box-sizing:border-box}
[hidden]{display:none!important}
html{scroll-padding-top:16px;-webkit-text-size-adjust:100%}
body{margin:0;background:var(--record-sheet);color:var(--record-ink);font:400 var(--body)/1.5 var(--font-text);-webkit-font-smoothing:antialiased}
h1,h2,h3,h4,p,ul,ol,dl,dd,pre{margin:0}
ul,ol{padding:0;list-style:none}
h1,h2,h3,h4,p,li,dt,dd,a,button,summary,pre{overflow-wrap:anywhere}
a{color:var(--ownership-action);text-underline-offset:3px}
button,input,select{font:inherit;color:inherit}
:focus-visible{outline:3px solid var(--ownership-action);outline-offset:2px}
.record-detail h3:focus{outline:none}
.sr-only{position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.icon{flex-shrink:0;width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.mono{font-family:var(--font-mono);font-size:var(--caption);font-weight:400}
.id{font:400 var(--caption)/1.5 var(--font-mono);color:var(--record-faint)}
.note{font-size:.84375rem;color:var(--record-faint)}
.eyebrow{font:700 var(--caption)/1.4 var(--font-text);letter-spacing:.06em;text-transform:uppercase;color:var(--record-faint)}
.is-none{color:var(--record-faint)}
.skip{position:absolute;top:-100px;left:16px;z-index:2;padding:12px 14px;border-radius:var(--radius-control);background:var(--record-sheet);font-weight:700}
.skip:focus{top:16px}
.page{max-width:1180px;margin:0 auto;padding:44px 40px 56px;display:flex;flex-direction:column;gap:40px}
.page>*{min-width:0}
button,.control{min-height:44px;max-width:100%;padding:0 16px;display:inline-flex;align-items:center;gap:8px;border:1px solid var(--line-strong);border-radius:var(--radius-control);background:transparent;color:var(--record-ink);font-weight:600;text-decoration:none;cursor:pointer}
button:hover,.control:hover{background:var(--tray)}
button.primary{border-color:var(--ownership-action);background:var(--ownership-action);color:var(--on-action);font-weight:700}
button.primary:hover{border-color:var(--record-ink);background:var(--record-ink);color:var(--record-sheet)}
.actions{display:flex;flex-wrap:wrap;gap:10px}
html:not(.enhanced) .enhancement-only,html.enhanced .static-only{display:none}
.masthead{display:flex;flex-direction:column;gap:22px}
.masthead-row{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:20px 32px}
.masthead-title{flex:1 1 420px;min-width:0;display:flex;flex-direction:column;gap:6px}
.kicker{display:flex;align-items:center;gap:10px;font-size:var(--small);font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--record-note)}
.kicker .icon{width:18px;height:18px}
h1{font:900 var(--masthead)/1.02 var(--font-display);letter-spacing:-.035em;-webkit-font-smoothing:auto}
.standfirst{font-size:1.0625rem;color:var(--record-note)}
.rule{height:6px;border-radius:3px;background:var(--record-ink)}
.source-strip{display:flex;flex-direction:column;gap:16px}
.source-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(210px,100%),1fr));gap:14px 28px}
.source-facts>div{min-width:0;display:flex;flex-direction:column;gap:2px}
.source-facts dt{font:700 var(--caption)/1.5 var(--font-text);letter-spacing:.06em;text-transform:uppercase;color:var(--record-faint)}
.source-facts dd{font-weight:600}
.source-facts .mono{font-size:var(--body);font-weight:600}
.fact-sub{display:block;font-weight:400;color:var(--record-note)}
.fact-line{display:flex;align-items:flex-start;gap:7px}
.fact-line .icon{width:15px;height:15px;margin-top:4px}
.fact--good{color:var(--proof-current)}
.fact--warn{color:var(--proof-stale)}
.fact--stop{color:var(--blocked)}
.notice{padding:12px 16px;border-radius:12px;display:flex;align-items:flex-start;gap:10px;background:var(--stale-wash)}
.notice .icon{margin-top:3px;color:var(--proof-stale)}
.notice--stop{background:var(--blocked-wash)}
.notice--stop .icon{color:var(--blocked)}
.card{min-width:0;padding:24px 26px;border:1px solid var(--line-strong);border-radius:var(--radius-card);display:flex;flex-direction:column;gap:18px}
.split{display:flex;flex-wrap:wrap;align-items:stretch;gap:20px}
.split>.summary{flex:2 1 520px}
.split>.health{flex:1 1 320px;gap:14px}
.hero{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:8px 24px}
.hero-lead{min-width:0;display:flex;flex-direction:column;gap:4px}
.eyebrow-line{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 10px}
.scope-id{font-size:var(--small);font-weight:700;color:var(--record-note)}
.hero-count{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 14px}
.hero-figure{font:900 var(--hero)/.95 var(--font-display);letter-spacing:-.04em;-webkit-font-smoothing:auto}
.hero-unit{font-size:1.25rem;font-weight:600;color:var(--record-note)}
.hero-rate{display:flex;flex-direction:column;align-items:flex-end}
.hero-rate strong{font:800 2rem/1.1 var(--font-display);letter-spacing:-.02em;-webkit-font-smoothing:auto}
.hero-rate span{font-size:var(--small);color:var(--record-faint)}
.hero-title{font:800 var(--headline)/1.15 var(--font-display);letter-spacing:-.02em;-webkit-font-smoothing:auto}
.hero-copy{max-width:62ch;color:var(--record-note);text-wrap:pretty}
.ledger{font-weight:600}
.blocks{display:grid;grid-template-columns:repeat(auto-fit,minmax(44px,1fr));gap:8px}
.blocks--few{grid-template-columns:repeat(auto-fill,minmax(96px,132px))}
.blocks--dense{grid-template-columns:repeat(auto-fill,minmax(14px,1fr));gap:4px}
.blocks--ghost{grid-template-columns:repeat(8,minmax(0,1fr))}
.block-cell{min-width:0;display:flex;flex-direction:column;align-items:center;gap:6px}
.block{width:100%;height:54px;border-radius:10px;display:grid;place-items:center}
.block .icon{width:22px;height:22px}
.blocks--dense .block{height:14px;border-radius:3px}
.blocks--dense .icon{display:none}
.block-id{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:400 var(--caption)/1.3 var(--font-mono);color:var(--record-faint)}
.block--verified{background:var(--proof-current);color:var(--record-sheet)}
.block--accepted{background:var(--record-ink);color:var(--record-sheet);box-shadow:inset 0 -8px 0 var(--stale-fill)}
.block--accepted .icon{margin-bottom:6px}
.block--awaiting{border:2px solid var(--verifying);background:var(--verifying-wash);color:var(--verifying)}
.block--open{border:2px dashed var(--record-edge)}
.block--ghost{border:2px dashed var(--line-strong)}
.block--ghost:nth-child(2){opacity:.8}
.block--ghost:nth-child(3){opacity:.65}
.block--ghost:nth-child(4){opacity:.5}
.block--ghost:nth-child(5){opacity:.38}
.block--ghost:nth-child(6){opacity:.28}
.block--ghost:nth-child(7){opacity:.18}
.block--ghost:nth-child(8){opacity:.1}
.legend{display:flex;flex-wrap:wrap;gap:8px 22px;font-size:.875rem;color:var(--record-note)}
.legend li{display:flex;align-items:center;gap:8px}
.legend strong{color:var(--record-ink)}
.legend .block{flex-shrink:0;width:14px;height:14px;border-radius:4px;box-shadow:none}
.legend .block--accepted{box-shadow:inset 0 -4px 0 var(--stale-fill)}
.card-foot{padding-top:16px;border-top:1px solid var(--hairline);display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px 20px}
.caption{flex:1 1 320px;font-size:.84375rem;line-height:1.5;color:var(--record-note)}
.health--unknown{border:2px dashed var(--line-strong)}
.health-headline{font:800 var(--headline)/1.15 var(--font-display);letter-spacing:-.02em;text-wrap:balance;-webkit-font-smoothing:auto}
.health-reason{font-size:.96875rem;line-height:1.55;color:var(--record-note);text-wrap:pretty}
.health-facts{margin-top:auto;padding-top:16px;border-top:1px solid var(--hairline);display:grid;grid-template-columns:96px minmax(0,1fr);gap:6px 12px;font-size:.875rem}
.health-facts dt{color:var(--record-faint)}
.health-facts dd{font-weight:600}
.health-note{font-size:var(--small);line-height:1.45;color:var(--record-faint)}
.health--unknown .health-note{margin-top:auto;padding-top:14px;border-top:1px solid var(--hairline)}
.standing{padding-bottom:22px;gap:10px}
.card-head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:4px 16px}
.card-head h2{font:800 var(--section)/1.25 var(--font-display);letter-spacing:-.015em;-webkit-font-smoothing:auto}
.aside{font-size:.875rem;color:var(--record-faint)}
.line{--line-y:67px;position:relative;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));align-items:start}
.line::before{content:"";position:absolute;left:calc(100%/12);right:calc(100%/12);top:var(--line-y);height:6px;border-radius:3px;background:var(--line-strong)}
/* The line holds one column per stop of the lifecycle; a strict policy allows no inline style, so each count has its rule. */
.line--s5{grid-template-columns:repeat(5,minmax(0,1fr))}.line--s5::before{left:calc(100%/10);right:calc(100%/10)}
.line--s7{grid-template-columns:repeat(7,minmax(0,1fr))}.line--s7::before{left:calc(100%/14);right:calc(100%/14)}
.line--s8{grid-template-columns:repeat(8,minmax(0,1fr))}.line--s8::before{left:calc(100%/16);right:calc(100%/16)}
.line--s9{grid-template-columns:repeat(9,minmax(0,1fr))}.line--s9::before{left:calc(100%/18);right:calc(100%/18)}
.line>li{position:relative;min-width:0;display:flex;flex-direction:column;align-items:center;text-align:center}
.count{font:900 var(--display)/48px var(--font-display);letter-spacing:-.03em;-webkit-font-smoothing:auto}
.dot-zone{height:44px;display:flex;align-items:center}
.station-name{font-weight:700}
.station-kinds{padding:0 6px;font:400 var(--caption)/1.5 var(--font-mono);color:var(--record-faint)}
.station--none .count,.station--none .station-name{color:var(--record-faint)}
.station--none .station-name{font-weight:600}
.line .station--none .dot{width:18px;height:18px;border:3px solid var(--line-strong);background:var(--record-sheet)}
.siding{margin-top:10px;display:flex;align-items:center;gap:6px}
.siding-hook{width:12px;height:14px;margin-top:-10px;border-left:3px solid var(--blocked);border-bottom:3px solid var(--blocked);border-bottom-left-radius:8px}
.siding-tag{padding:2px 10px;border-radius:999px;background:var(--blocked-wash);color:var(--blocked);font-size:var(--small);font-weight:700}
.is-draft,.is-planned,.is-canceled,.is-other,.is-active{--state:var(--record-faint)}
.is-ready,.is-in_progress,.is-implemented,.is-approved,.is-committed{--state:var(--ownership-action)}
.is-blocked{--state:var(--blocked)}
.is-verifying{--state:var(--verifying)}
.is-done{--state:var(--proof-current)}
.dot{flex-shrink:0;width:24px;height:24px;border:5px solid var(--state);border-radius:50%;background:var(--record-sheet)}
.dot.is-planned,.dot.is-in_progress,.dot.is-implemented,.dot.is-verifying,.dot.is-done,.dot.is-blocked,.dot.is-committed{background:var(--state)}
.dot.is-blocked{border-radius:5px}
.dot.is-canceled,.dot.is-other{border-width:2px;border-style:dashed}
.dot--s{width:14px;height:14px;border-width:3px}
.dot--s.is-blocked{border-radius:3px}
.section{display:flex;flex-direction:column;gap:6px}
.section-head{padding-bottom:10px;border-bottom:3px solid var(--record-ink);display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:4px 16px}
.section-head h2{font:800 var(--title)/1.2 var(--font-display);letter-spacing:-.02em;-webkit-font-smoothing:auto}
.section-head .aside{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:0 .4em}
#work-count::after{content:"."}
.queue>li{padding:14px 0;border-bottom:1px solid var(--hairline);display:flex;flex-wrap:wrap;align-items:center;gap:8px 18px}
.tag{padding:6px 10px;border-radius:8px;display:flex;align-items:center;gap:8px;background:var(--tray);color:var(--record-note);font-size:var(--small);font-weight:700;line-height:1.3}
.tag .icon{width:15px;height:15px}
.tag--verifying{background:var(--verifying-wash);color:var(--verifying)}
.tag--stale{background:var(--stale-wash);color:var(--proof-stale)}
.tag--blocked{background:var(--blocked-wash);color:var(--blocked)}
.queue .tag{flex:0 0 232px}
.queue-text{flex:1 1 300px;min-width:0;display:flex;flex-direction:column;gap:1px}
.queue-title{font-size:var(--lead);font-weight:700;color:var(--record-ink);text-decoration-color:var(--line-strong);text-decoration-thickness:1.5px}
.queue-title:hover{text-decoration-color:currentColor}
.queue-why{font-size:.875rem;color:var(--record-note)}
.queue-who{flex:0 0 120px;font-weight:600}
.work-region{gap:14px}
.filters{display:flex;flex-wrap:wrap;align-items:flex-end;gap:10px 12px}
.filters label{min-width:0;display:flex;flex-direction:column;gap:5px;font-size:var(--small);font-weight:600}
.filters .field{flex:1 1 160px}
.filters .field--search{flex:2 1 220px}
.filters input:not([type=checkbox]),.filters select{width:100%;min-width:0;min-height:44px;padding:0 12px;border:1px solid var(--record-edge);border-radius:var(--radius-control);background:var(--record-sheet);font-size:var(--body);font-weight:400}
.filters input::placeholder{color:var(--record-faint);opacity:1}
.filters select{appearance:none;padding-right:34px;background-image:linear-gradient(45deg,transparent 50%,currentColor 50%),linear-gradient(135deg,currentColor 50%,transparent 50%);background-position:calc(100% - 17px) 50%,calc(100% - 12px) 50%;background-size:5px 5px;background-repeat:no-repeat}
.filters .check{min-height:44px;flex-direction:row;align-items:center;gap:8px;font-size:var(--body);cursor:pointer}
.level-links{margin-right:-8px;display:flex;align-items:center}
.level-rule,.pager-rule{flex-shrink:0;width:1px;height:14px;background:var(--hairline)}
.level-link,.pager-step{position:relative;isolation:isolate;border:0;border-radius:8px;background:transparent;color:var(--ownership-action)}
.level-link{padding:0 8px;gap:5px;font-size:var(--small)}
.level-link .icon{width:15px;height:15px}
.pager-step{width:44px;padding:0;justify-content:center}
.pager-step .icon{width:18px;height:18px}
.level-link::before,.pager-step::before{content:"";position:absolute;z-index:-1;border-radius:8px}
.level-link::before{inset:7px 0}
.pager-step::before{inset:6px}
.level-link:hover,.pager-step:hover{background:transparent}
.level-link:not([aria-disabled=true]):hover,.pager-step:not([aria-disabled=true]):hover{color:color-mix(in srgb,var(--ownership-action) 72%,var(--record-ink))}
.level-link:not([aria-disabled=true]):hover::before,.pager-step:not([aria-disabled=true]):hover::before{background:var(--action-wash)}
.level-link[aria-disabled=true]{color:var(--record-edge);cursor:default}
.pager-step[aria-disabled=true]{color:var(--line-strong);cursor:default}
.level-link:focus-visible,.pager-step:focus-visible,.pager-length select:focus-visible{outline-offset:-5px}
html.enhanced .card-head--levels{align-items:center;gap:0 16px}
html.enhanced .card-head--levels .aside{flex-basis:100%}
.pager{container-type:inline-size;margin:12px 0 0;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:0 12px;border-bottom:1px solid var(--hairline)}
.pager[data-pager=bottom]{margin:0 0 12px;justify-content:flex-end;gap:2px;border-bottom:0;border-top:1px solid var(--tray)}
.card>.pager{margin:0}
.pager-count,.pager-status{font-size:var(--small);font-weight:600;color:var(--record-note);font-variant-numeric:tabular-nums}
.pager[data-pager=bottom] .pager-status{margin:0 4px}
.pager-of{font-weight:400}
.pager-controls{display:flex;align-items:center;gap:2px}
.card .pager-controls{margin-right:-6px}
.pager-steps{display:flex;align-items:center}
.pager-length{position:relative;display:inline-flex;align-items:center}
.pager-length select{appearance:none;min-height:44px;padding:0 26px 0 10px;border:0;border-radius:8px;background:transparent;font-size:var(--small);font-weight:600;color:var(--record-note);cursor:pointer}
.pager-length select:hover{background:linear-gradient(var(--action-wash),var(--action-wash)) center/100% 32px no-repeat}
.pager-length .icon{position:absolute;right:8px;top:50%;width:12px;height:12px;margin-top:-6px;stroke-width:2.4;color:var(--record-note);pointer-events:none}
@container (max-width:359px){.pager-count,.pager[data-pager=top] .pager-status{flex:1 0 100%;margin-top:6px}
.pager-controls{flex:1;justify-content:space-between}
.card .pager-controls{margin-left:-10px}
.pager-rule{display:none}}
.check input{width:20px;height:20px;margin:0;flex-shrink:0;accent-color:var(--ownership-action)}
.table{border:1px solid var(--line-strong);border-radius:var(--radius-panel);overflow:hidden}
.table-head,.row-line{display:grid;grid-template-columns:minmax(0,1fr) 128px 168px 124px 128px;gap:14px;padding:12px 18px}
.table-head{padding-block:11px;background:var(--tray);color:var(--record-note);font-size:var(--caption);font-weight:700;letter-spacing:.05em;text-transform:uppercase}
.work-row{border-top:1px solid var(--hairline)}
.row-line{align-items:center;color:var(--record-ink);text-decoration:none}
.row-line:hover{background:var(--work-paper)}
.row-line:focus-visible{outline-offset:-3px}
.work-row.is-open>.row-line{background:var(--action-wash)}
.cell{min-width:0}
.cell--work{display:flex;align-items:flex-start;gap:10px}
.cell--work .kind{order:-1;min-width:50px;margin-top:3px;text-align:center}
.work-text{min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:1px}
.work-title{font-size:.96875rem;font-weight:600;line-height:1.3}
.work-row--off .work-title{color:var(--record-faint);text-decoration:line-through}
.cell--owner{font-weight:500}
.kind{flex-shrink:0;padding:2px 6px;border:1px solid var(--line-strong);border-radius:4px;color:var(--record-note);font:600 .65625rem/1.4 var(--font-mono);letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}
.kind--label{flex-shrink:1;min-width:0;max-width:100%;white-space:normal;overflow-wrap:anywhere}
.kind--delivery{border-color:var(--record-ink);background:var(--record-ink);color:var(--record-sheet)}
.mark{display:inline-flex;flex-wrap:wrap;align-items:center;gap:4px 8px}
.state{font-weight:600}
.state.is-draft,.state.is-planned,.state.is-active{color:var(--record-note)}
.state.is-blocked{color:var(--blocked)}
.state.is-canceled,.state.is-other{color:var(--record-faint)}
.pips{display:inline-flex;align-items:center;gap:3px}
.pip{width:10px;height:10px;border:1.5px solid var(--record-edge);border-radius:2px}
.proof{font-size:.84375rem;font-weight:600;color:var(--record-faint)}
.proof--current{color:var(--proof-current)}
.proof--current .pip{border-color:var(--proof-current);background:var(--proof-current)}
.proof--stale{color:var(--proof-stale)}
.proof--stale .pip{border-color:var(--proof-stale);background:var(--stale-fill);transform:rotate(45deg) scale(.86)}
.seal{padding:2px 10px 2px 7px;border-radius:999px;display:inline-flex;align-items:center;gap:4px;background:var(--record-ink);color:var(--record-sheet);font-size:var(--small);font-weight:700;white-space:nowrap}
.seal .icon{width:11px;height:11px;stroke-width:3}
.seal--none{padding:1px 10px;border:1.5px dashed var(--record-edge);background:transparent;color:var(--record-faint);font-weight:600}
.flag{padding:0 8px;border-radius:999px;background:var(--tray);color:var(--record-note);font-size:var(--caption);font-weight:700;white-space:nowrap}
.flag--overdue{background:var(--blocked-wash);color:var(--blocked)}
.tag.due{display:inline-flex}
.hint{padding:14px 16px;border-radius:12px;background:var(--work-paper);color:var(--record-note)}
.empty{padding:20px 22px;border:2px dashed var(--line-strong);border-radius:var(--radius-panel);color:var(--record-note)}
.empty-heading{margin-bottom:4px;color:var(--record-ink);font:800 1.25rem/1.25 var(--font-display);letter-spacing:-.01em}
.record-details{min-width:0;display:flex;flex-direction:column;gap:14px}
.record-detail{min-width:0;display:flex;flex-direction:column;gap:14px}
.record-details>.record-detail{padding:20px 22px;border:1px solid var(--line-strong);border-radius:var(--radius-panel)}
.work-row>.record-detail{padding:6px 18px 22px 78px;background:var(--action-wash)}
.work-row>.hint{margin:0 18px 16px 78px}
.work-row>.record-detail .detail-head{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.work-row>.record-detail dt,.work-row>.record-detail .id{color:var(--record-note)}
.detail-head{display:flex;flex-direction:column;gap:6px}
.badge,.marks{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px}
.record-detail h3{font:800 var(--section)/1.25 var(--font-display);letter-spacing:-.015em;-webkit-font-smoothing:auto}
.detail-body{display:flex;flex-wrap:wrap;gap:20px 32px}
.detail-main{flex:2 1 380px;min-width:0;display:flex;flex-direction:column;gap:12px}
.intent{max-width:66ch;color:var(--record-note);white-space:pre-wrap;text-wrap:pretty}
.facts{flex:1 1 260px;min-width:0;display:grid;grid-template-columns:104px minmax(0,1fr);gap:7px 12px;align-content:start;font-size:.875rem}
.facts dt{color:var(--record-faint)}
.facts dd{font-weight:600}
.facts a{color:inherit;text-decoration-color:var(--record-edge)}
.facts .id{display:block}
.record-section{display:flex;flex-direction:column;gap:6px}
h4{font:700 var(--small)/1.4 var(--font-text);color:var(--record-note)}
.criteria{border:1px solid var(--line-strong);border-radius:12px;background:var(--record-sheet)}
.criteria li{padding:10px 14px;display:flex;align-items:flex-start;gap:12px}
.criteria li+li{border-top:1px solid var(--hairline)}
.criteria .id{flex-shrink:0;margin-top:2px;font-weight:600;color:var(--record-note)}
.reasons{padding-left:20px;list-style:disc}
.disclosures{display:flex;flex-direction:column}
.callout{padding:10px 14px;border-radius:10px;display:flex;align-items:flex-start;gap:10px;background:var(--blocked-wash)}
.callout .icon{margin-top:3px;color:var(--blocked)}
summary{min-height:44px;padding:10px 0;cursor:pointer;font-weight:600;color:var(--ownership-action)}
.evidence{padding-left:20px;list-style:decimal;display:grid;grid-template-columns:minmax(0,1fr);gap:10px}
pre{max-width:100%;white-space:pre-wrap;font:400 var(--caption)/1.5 var(--font-mono)}
.people-content{display:grid;grid-template-columns:minmax(0,1fr);gap:6px}
.people-list{display:flex;flex-wrap:wrap}
.people-list>li{flex:1 1 100%;min-width:0;padding:2px 0;border-bottom:1px solid var(--hairline);display:flex;flex-wrap:wrap;align-items:center;gap:0 18px}
.person-name{flex:0 0 240px;min-width:0;min-height:44px;display:flex;align-items:center;font-size:var(--lead);font-weight:700}
.person-name.is-quiet{color:var(--record-note)}
.person-pick{padding:0;border:0;border-radius:6px;justify-content:flex-start;text-align:start;text-decoration:underline;text-decoration-color:var(--line-strong);text-decoration-thickness:1.5px;text-underline-offset:4px}
.person-pick:hover{background:transparent;text-decoration-color:currentColor}
.person-blocks{flex:0 0 200px;display:flex;flex-wrap:wrap;align-items:center;gap:4px}
.pb{width:30px;height:14px;border-radius:4px;background:var(--state)}
.pb--hollow{border:3px solid var(--state);background:transparent}
.person-sum{flex:1 1 280px;min-width:0;padding:6px 0;color:var(--record-note)}
.limits{padding:22px 26px;border-radius:var(--radius-card);background:var(--work-paper);display:flex;flex-direction:column;gap:14px}
.limits h2{font:800 1.25rem/1.25 var(--font-display);letter-spacing:-.01em;-webkit-font-smoothing:auto}
.limits>p,.limits li{color:var(--record-note)}
.identity{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:12px 28px;font-size:.875rem}
.identity>div{min-width:0;display:flex;flex-direction:column;gap:1px}
.identity dt{color:var(--record-faint)}
.identity dd{font:400 .78125rem/1.5 var(--font-mono)}
.footer{padding-top:20px;border-top:1px solid var(--line-strong);font-size:.84375rem;line-height:1.55;color:var(--record-faint)}
.footer p{max-width:90ch}
.kind-lines{display:grid;grid-template-columns:minmax(0,1fr)}
.kind-lines>div{padding:8px 0;border-bottom:1px solid var(--hairline);display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 18px}
.kind-lines>div:last-child{border-bottom:0}
.kind-lines dt{flex:0 0 220px;font-weight:700}
.kind-lines dd{flex:1 1 320px;min-width:0;color:var(--record-note)}
.fig-list{display:flex;flex-direction:column}
.fig-list .fig-list{margin-left:11px;padding-left:10px;border-left:2px solid var(--hairline)}
.fig-row{min-height:52px;padding:4px 0;border-bottom:1px solid var(--hairline);display:grid;grid-template-columns:minmax(0,1fr) 120px 190px 60px 240px;align-items:center;gap:4px 16px}
.fig-name{min-width:0;display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;font-weight:600}
.fig-name>a{min-width:44px;min-height:44px;display:inline-flex;align-items:center;color:inherit;text-decoration-color:var(--line-strong);text-decoration-thickness:1.5px;text-underline-offset:4px}
.fig-name>a:hover{text-decoration-color:currentColor}
.fig-count{font-weight:600}
.fig-none{grid-column:2/-1;font-weight:400}
.fig-rate{font-weight:700;text-align:end}
.fig-rest{font-size:.875rem;color:var(--record-note)}
.fig-more>summary{font-size:var(--small)}
.hint>p+details{margin-top:4px}
.meter{flex-shrink:0;display:block;max-width:100%;height:auto}
.meter-verified{fill:var(--proof-current)}
.meter-stale{fill:var(--record-ink)}
.meter-foot{fill:var(--stale-fill)}
.meter-open{fill:none;stroke:var(--record-edge);stroke-width:1.5;stroke-dasharray:4 3}
.table-scroll{border:1px solid var(--line-strong);border-radius:var(--radius-panel);overflow-x:auto}
.fig-table{width:100%;min-width:960px;border-collapse:collapse}
.fig-table th,.fig-table td{padding:12px;border-top:1px solid var(--hairline);text-align:start;vertical-align:middle;font-weight:400}
.fig-table thead th{border-top:0;background:var(--tray);color:var(--record-note);font-size:var(--caption);font-weight:700;letter-spacing:.05em;text-transform:uppercase}
.fig-table tbody th{font-weight:600}
.fig-table .num{text-align:end;font-weight:700}
.fig-table .fig-sub{background:var(--work-paper);color:var(--record-note);font:800 var(--body)/1.4 var(--font-display)}
.fig-table thead th:nth-child(2){width:125px}
.fig-table thead th:nth-child(4){width:177px}
.fig-table .mark{flex-wrap:nowrap;white-space:nowrap}
.fig-table td>span.is-none{white-space:nowrap}
.fig-delivery{min-width:246px;display:grid;gap:4px}
@media (max-width:999px){.table-head,.row-line{grid-template-columns:minmax(0,1fr) 104px 128px 112px 116px;gap:12px}}
@media (max-width:860px){:root{--masthead:2.75rem}
.page{padding:28px 20px 40px;gap:32px}
.table-head{display:none}
.row-line{display:flex;flex-wrap:wrap;gap:8px 16px;padding:12px 14px}
.cell--work{flex:1 0 100%}
.work-row>.record-detail{padding:4px 14px 18px}
.work-row>.hint{margin:0 14px 14px}
.queue .tag{flex:0 1 auto}
.queue-who{flex:1 1 auto;order:1;text-align:end}
.queue-text{flex:1 1 100%;order:2}
.fig-row{grid-template-columns:120px minmax(0,1fr) auto}
.fig-name,.fig-rest,.fig-none{grid-column:1/-1}
.kind-lines dt{flex:1 1 100%}}
@media (max-width:560px){:root{--masthead:2.125rem;--hero:3.5rem;--title:1.375rem;--headline:1.5rem;--display:1.625rem}
.page{padding:20px 16px 32px;gap:28px}
.card,.limits{padding:18px 16px}
.record-details>.record-detail{padding:16px}
.hero-rate{align-items:flex-start}
.filters{display:grid;grid-template-columns:minmax(0,1fr)}
.section-head .aside{justify-content:flex-start}
.line{grid-template-columns:minmax(0,1fr);gap:2px}
.line::before{content:none}
.line>li{padding:0 4px;display:grid;grid-template-columns:40px 44px minmax(0,1fr);align-items:center;column-gap:4px;text-align:start}
.line>li:not(:last-child)::before{content:"";position:absolute;left:67px;top:22px;width:6px;height:calc(100% + 2px);border-radius:3px;background:var(--line-strong)}
.dot-zone{position:relative}
.count{justify-self:end;line-height:44px}
.dot-zone{justify-content:center}
.station-kinds,.siding{grid-column:3;padding:0}
.siding{margin:0 0 6px}
.blocks--ghost{grid-template-columns:repeat(4,minmax(0,1fr))}
.blocks--ghost .block:nth-child(n+5){display:none}
.person-name{flex:1 1 100%}
.person-blocks{flex:0 1 auto}
.person-sum{flex:1 1 100%;padding-top:0}
.fig-list .fig-list{margin-left:2px;padding-left:8px}
.fig-row{grid-template-columns:minmax(0,1fr) auto}
.fig-row>.meter{grid-column:1/-1}
.facts{grid-template-columns:minmax(0,1fr);gap:1px}
.facts dd{padding-bottom:8px}}
@media (prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
@page{margin:14mm}
@media print{:root{color-scheme:light;--work-paper:#FFFFFF;--record-sheet:#FFFFFF;--tray:#EEF1F4;--record-ink:#122230;--record-note:#3D5164;--record-faint:#586C7F;--record-edge:#6F8394;--hairline:#B9C4CE;--line-strong:#8FA0AF;--ownership-action:#1B5FC4;--action-wash:#FFFFFF;--on-action:#FFFFFF;--proof-current:#0A775F;--proof-stale:#855600;--stale-wash:#FFFFFF;--stale-fill:#E5A41B;--blocked:#B3470B;--blocked-wash:#FFFFFF;--verifying:#6341BF;--verifying-wash:#FFFFFF;--masthead:2.5rem;--hero:3.25rem;--display:2rem;--title:1.375rem;--headline:1.5rem}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{max-width:none;padding:0;gap:20px}
.skip,.filters,.actions,.enhancement-only,.detail-foot{display:none!important}
html.enhanced .static-only{display:flex!important}
a{color:inherit;text-decoration:none}
.masthead{gap:14px}
.blocks{grid-template-columns:repeat(auto-fit,minmax(30px,1fr));gap:6px}
.card{padding:16px 18px;gap:12px}
.block{height:40px}
.card,.queue>li,.work-row,.record-detail,.people-list>li,.limits,.notice,.fig-row,.fig-table tr{break-inside:avoid}
.table-scroll{overflow:visible}
.fig-table{min-width:0}
.fig-row{min-height:0;padding:8px 0}
.fig-name>a{min-width:0;min-height:0}
.section-head,.card-head,.table-head{break-after:avoid}
.work-row[hidden]{display:block!important}
.fig-table tr[hidden]{display:table-row!important}
#areas>.fig-list>li[hidden]{display:list-item!important}
.record-detail[hidden]{display:flex!important}
.work-row>.record-detail{padding:4px 12px 14px;border-top:1px dashed var(--hairline)}
#filter-empty,#selected-outside,#interaction-error{display:none!important}
.limits{border:1px solid var(--line-strong)}
.notice,.callout{border:1px solid var(--line-strong)}
summary{min-height:0;padding:0;color:inherit;list-style:none}
details>*{display:block!important}
details>.evidence{display:grid!important}
pre{font-size:.625rem}
details::details-content{content-visibility:visible;display:block}}
@media print and (min-width:600px){.source-facts{grid-template-columns:repeat(4,minmax(0,1fr));gap:10px 18px}
.split{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);gap:14px}
.hero{flex-wrap:nowrap}
.queue .tag{flex:0 0 200px;order:0}
.queue-text{flex:1 1 240px;order:0}
.queue-who{flex:0 0 110px;order:0;text-align:start}
.table-head{display:grid}
.table-head,.row-line{grid-template-columns:minmax(0,1fr) 96px 112px 104px 108px;gap:10px;padding:8px 12px}
.row-line{display:grid}
.evidence{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;

// Static executable text: its CSP hash never changes with snapshot or manifest data.
function enhanceReport() {
    'use strict';
    const documentRoot = document.documentElement;
    const snapshot = JSON.parse(document.getElementById('task-track-data').textContent);
    const home = document.querySelector('.record-details');
    let unopened = false;
    // Packed detail is the markup the full form carries, held compactly. It is opened once, before anything binds to it.
    function unpack() {
        const bytes = Uint8Array.from(atob(snapshot.packed), character => character.charCodeAt(0));
        return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text().then(JSON.parse);
    }
    function place(parts) {
        home.insertAdjacentHTML('beforeend', parts.cards);
        document.querySelector('.path-panels').insertAdjacentHTML('beforeend', parts.paths);
    }
    function start() {
        const search = document.getElementById('work-search');
        const owner = document.getElementById('work-owner');
        const state = document.getElementById('work-state');
        const remaining = document.getElementById('work-remaining');
        const countLabel = document.getElementById('work-count');
        const empty = document.getElementById('filter-empty');
        const heading = document.getElementById('work-heading');
        const rows = Array.from(document.querySelectorAll('.work-row'));
        const details = Array.from(document.querySelectorAll('.record-detail'));
        const selectedOutside = document.getElementById('selected-outside');
        const emptyNote = document.getElementById('detail-empty');
        // The list shows one page of the matching rows at a time. Every row stays in the page: paging hides rows, it never removes one.
        const pagers = Array.from(document.querySelectorAll('#work [data-pager]'));
        const lengthChoice = document.querySelector('#work [data-page-length]');
        const lengths = lengthChoice ? Array.from(lengthChoice.options, option => Number(option.value)) : [0];
        // A length of 0 is every matching row on one page.
        let length = lengths[0], page = 1, matching = rows;
        // A record is named by the anchor of its detail, which its row links to.
        const keyOf = row => row.firstElementChild.getAttribute('href').slice(1);
        const searched = new Map();
        let selected = null;
        let restoring = false;
        const pathPanels = Array.from(document.querySelectorAll('[aria-label^="Exact linked concerns for "]'));
        const inspected = document.getElementById('inspected-context');
        // The page names the scope it was written for; what the reader has open is said after it.
        const scopeWords = inspected.textContent;
        let inspection = null;
        const contexts = [];
        function currentContext() {
            return { selected, inspection, search: search.value, owner: owner.value, state: state.value, remaining: remaining.checked, page, length };
        }
        // `origin` is the link a record was opened from, so that going back lands on it again.
        function rememberContext(origin) { if (contexts.length === 64) contexts.shift(); contexts.push({ ...currentContext(), origin }); }
        function showInspection(focus) {
            const panel = inspection ? document.getElementById(inspection) : null;
            pathPanels.forEach(node => { node.hidden = node !== panel; });
            inspected.textContent = scopeWords
                + (selected ? ' / ' + (details.find(node => node.id === selected)?.dataset.itemId || rows.find(row => keyOf(row) === selected)?.dataset.itemId || 'Record') : '')
                + (panel ? ' / Exact path selection' : '');
            if (focus && panel) { panel.scrollIntoView({ block: 'start' }); panel.querySelector('h3')?.focus({ preventScroll: true }); }
            return !!(focus && panel);
        }
        function backContext(event) {
            if (!contexts.length) return false;
            event?.preventDefault();
            const previous = contexts.pop();
            inspection = previous.inspection; selected = previous.selected;
            search.value = previous.search; owner.value = previous.owner; state.value = previous.state; remaining.checked = previous.remaining;
            page = previous.page; setLength(previous.length);
            filter(true);
            // Going back always lands somewhere: the restored record, the restored inspection, the link a record was opened
            // from, or the Work heading when none of them applies.
            const inspecting = showInspection(true);
            if (selected) reveal(true); else if (!inspecting) (previous.origin?.isConnected ? previous.origin : heading).focus();
            return true;
        }
        function remember() {
            if (restoring) return;
            const parameters = new URLSearchParams();
            if (selected) parameters.set('item', selected);
            if (inspection) parameters.set('inspection', inspection);
            if (search.value) parameters.set('search', search.value);
            if (owner.value) parameters.set('owner', owner.value);
            if (state.value) parameters.set('state', state.value);
            if (remaining.checked) parameters.set('remaining', '1');
            if (page > 1) parameters.set('page', String(page));
            if (length !== lengths[0]) parameters.set('length', String(length));
            try { history.replaceState(null, '', '#' + parameters.toString()); } catch (_) { /* File origins may restrict history; in-page state remains usable. */ }
        }
        // Every record card lives in the list under the table, in snapshot order. Only the selected one leaves it, to open under its own row.
        function sendHome(detail) {
            if (detail.parentNode === home) return;
            home.insertBefore(detail, details.slice(details.indexOf(detail) + 1).find(later => later.parentNode === home) || null);
        }
        function reveal(scroll) {
            locate();
            const detail = details.find(candidate => candidate.id === selected);
            if (!detail) {
                // No card in this copy: land on the record's own row, where the note about it sits.
                const row = scroll && rows.find(candidate => keyOf(candidate) === selected && !candidate.hidden);
                if (row) { row.scrollIntoView({ block: 'start' }); row.firstElementChild.focus({ preventScroll: true }); }
                return;
            }
            if (scroll) (detail.closest('.work-row') || detail).scrollIntoView({ block: 'start' });
            detail.querySelector('h3').focus({ preventScroll: true });
        }
        // The note about a chosen record stands under that record's row when this copy has no card to open there.
        function placeNote(row) {
            if (row) { if (selectedOutside.parentNode !== row) row.appendChild(selectedOutside); }
            else if (selectedOutside.parentNode !== home) home.insertBefore(selectedOutside, emptyNote.nextSibling);
        }
        function select(id, focus) {
            const detail = details.find(candidate => candidate.id === id);
            const selectedRow = rows.find(row => keyOf(row) === id);
            // A listed record can be chosen even when this copy does not carry its detail; the page then says where to read it.
            selected = detail || selectedRow ? id : null;
            // The row is in the list under the current filters, on the page shown or on another one.
            const shownRow = selectedRow && matching.includes(selectedRow) ? selectedRow : null;
            details.forEach(candidate => {
                const open = candidate === detail;
                candidate.hidden = !open;
                if (open && shownRow) { if (candidate.parentNode !== shownRow) shownRow.appendChild(candidate); } else sendHome(candidate);
            });
            rows.forEach(row => {
                const open = selected !== null && keyOf(row) === selected;
                row.classList.toggle('is-open', open);
                row.firstElementChild.setAttribute('aria-expanded', String(open));
            });
            emptyNote.hidden = unopened || selected !== null || rows.length === 0;
            selectedOutside.hidden = !selected || (!!detail && shownRow !== null);
            const named = selectedRow?.dataset.itemId || 'this record';
            placeNote(!detail && shownRow ? shownRow : null);
            selectedOutside.textContent = !detail ? 'Detail for ' + named + (unopened ? ' could not be opened here.' : ' is not in this copy.')
                + ' Read it in the full version of this report, in the workspace, or with the task tool: ' + selectedOutside.dataset.read.replace('<id>', selectedRow?.dataset.itemId || '<id>')
                : selectedRow ? 'Selected item is outside the current filters. Clear filters to see its work row.'
                    : 'Selected item is outside the fixed delivery list. Its record remains available for inspection; delivery scope is unchanged.';
            if (focus) { locate(); if (detail) reveal(false); else if (selected) selectedOutside.scrollIntoView({ block: 'nearest' }); }
            showInspection(false); remember();
        }
        // Search reads what the row and its record say; the text is gathered once per row, on the first search.
        function searchable(row) {
            if (!searched.has(row)) searched.set(row, (row.dataset.itemId + ' ' + row.querySelector('.work-title').textContent + ' '
                + (document.getElementById(keyOf(row))?.querySelector('.intent')?.textContent || '')).toLocaleLowerCase());
            return searched.get(row);
        }
        // The rows the search and filters leave in the list. `keep` stays on the page shown; a changed filter starts at the first page.
        // Remaining work is what the delivery scope counts as not accepted: an eligible task without an acceptance.
        function filter(keep) {
            const term = search.value.toLocaleLowerCase();
            matching = rows.filter(row => !((term && !searchable(row).includes(term))
                || (owner.value && row.dataset.owner !== owner.value)
                || (state.value && row.dataset.state !== state.value)
                || (remaining.checked && (row.dataset.eligible !== 'true' || row.dataset.accepted === 'true'))));
            if (keep !== true) page = 1;
            paginate();
            empty.hidden = matching.length !== 0 || rows.length === 0;
            select(selected, false);
        }
        const unknownTotal = () => countLabel.dataset.coverage === 'complete' ? '' : '; project total unknown';
        // Shows the page asked for, or the nearest one that exists, and says which records it holds.
        function paginate() {
            const pages = length ? Math.max(1, Math.ceil(matching.length / length)) : 1;
            page = Math.min(Math.max(1, page), pages);
            const first = length ? (page - 1) * length : 0;
            const shown = new Set(length ? matching.slice(first, first + length) : matching);
            rows.forEach(row => { row.hidden = !shown.has(row); });
            countLabel.textContent = (shown.size < matching.length
                ? (first + 1) + '–' + (first + shown.size) + ' of ' + matching.length + (matching.length < rows.length ? ' matching records shown; ' + rows.length + ' inspected' : ' inspected records shown')
                : matching.length + ' of ' + rows.length + ' inspected records shown') + unknownTotal();
            showPagers(pagers, matching.length, lengths[0], page, pages, length === 0);
        }
        // What a pager says and offers. It appears once its rows outgrow the shortest page, names the page shown, and
        // marks a step that leads nowhere unavailable.
        // `whole` is every row on one page by the reader's choice: there is then nowhere to step to, so the steps and the
        // pager under the list are left out. `range` is the rows shown, for a pager that states them.
        function showPagers(navs, total, least, at, pages, whole, range) {
            navs.forEach(pager => {
                pager.hidden = total <= least || (whole && pager.dataset.pager === 'bottom');
                pager.querySelectorAll('[data-page-status]').forEach(status => say(status, 'Page ' + at, pages));
                pager.querySelectorAll('[data-page-count]').forEach(status => { if (whole) status.textContent = 'All ' + total; else say(status, range, total); });
                pager.querySelectorAll('.pager-steps, .pager-rule').forEach(part => { part.hidden = whole; });
                pager.querySelectorAll('[data-page-step]').forEach(button => button.setAttribute('aria-disabled', String(Number(button.dataset.pageStep) < 0 ? at === 1 : at === pages)));
            });
        }
        // "1–20 of 149", "Page 1 of 8": the word between the two numbers is set lighter than they are.
        function say(node, before, after) {
            const of = document.createElement('span'); of.className = 'pager-of'; of.textContent = 'of';
            node.replaceChildren(before + ' ', of, ' ' + after);
        }
        // A list of the page read a page at a time, with a page and a length of its own: the initiative table, and the
        // areas at the top of the area tree, each with the levels inside it. Every row stays in the page: paging hides
        // rows, it never removes one, and paper gets them all. `rows` finds the list's rows; a row that holds `.fig-sub`
        // is a head, shown on every page that holds one of the rows under it.
        function pagedList(section, rows, title) {
            const navs = section ? Array.from(section.querySelectorAll('[data-pager]')) : [];
            if (!navs.length) return { show() {}, all() {} };
            const choice = section.querySelector('[data-page-length]');
            const sizes = Array.from(choice.options, option => Number(option.value));
            const every = Array.from(section.querySelectorAll(rows));
            const heads = every.filter(row => row.querySelector(':scope > .fig-sub')), lines = every.filter(row => !heads.includes(row));
            title.setAttribute('tabindex', '-1');
            let size = sizes[0], at = 1;
            function show() {
                const pages = size ? Math.max(1, Math.ceil(lines.length / size)) : 1;
                at = Math.min(Math.max(1, at), pages);
                const first = size ? (at - 1) * size : 0;
                const shown = new Set(size ? lines.slice(first, first + size) : lines);
                lines.forEach(row => { row.hidden = !shown.has(row); });
                heads.forEach(head => { head.hidden = !Array.from(head.parentNode.children).some(row => shown.has(row)); });
                showPagers(navs, lines.length, sizes[0], at, pages, size === 0, (first + 1) + '–' + (first + shown.size));
            }
            navs.forEach(pager => pager.querySelectorAll('[data-page-step]').forEach(button => button.addEventListener('click', () => {
                if (button.getAttribute('aria-disabled') === 'true') return;
                at += Number(button.dataset.pageStep); show();
                // From under the list the reader is taken to its heading, where the new page begins.
                if (pager.dataset.pager === 'bottom') title.focus();
            })));
            choice.addEventListener('change', () => { size = Number(choice.value); at = 1; show(); });
            return { show, all() { every.forEach(row => { row.hidden = false; }); } };
        }
        // Open all and Close all for the area tree act on every level at once. The one that would change nothing is
        // marked unavailable; a level opened or closed by itself keeps both in step.
        function treeTools() {
            const levels = Array.from(document.querySelectorAll('#areas .fig-list details'));
            const tools = Array.from(document.querySelectorAll('[data-tree-open]'));
            const sync = () => tools.forEach(button => button.setAttribute('aria-disabled',
                String(button.dataset.treeOpen === 'true' ? levels.every(level => level.open) : !levels.some(level => level.open))));
            tools.forEach(button => button.addEventListener('click', () => {
                if (button.getAttribute('aria-disabled') === 'true') return;
                levels.forEach(level => { level.open = button.dataset.treeOpen === 'true'; });
                sync();
            }));
            levels.forEach(level => level.addEventListener('toggle', sync));
            sync();
        }
        function setLength(value) {
            length = lengths.includes(value) ? value : lengths[0];
            if (lengthChoice) lengthChoice.value = String(length);
        }
        // The page that holds the chosen record becomes the page shown.
        function locate() {
            const at = length ? matching.findIndex(row => keyOf(row) === selected) : -1;
            if (at >= 0 && Math.floor(at / length) + 1 !== page) { page = Math.floor(at / length) + 1; paginate(); }
        }
        function restore() {
            restoring = true;
            const fragment = location.hash.slice(1);
            const parameters = new URLSearchParams(fragment);
            const nativeTarget = document.getElementById(fragment);
            if (nativeTarget && pathPanels.includes(nativeTarget)) {
                inspection = nativeTarget.id; restoring = false; showInspection(true); return;
            }
            if (parameters.has('inspection')) inspection = pathPanels.find(node => node.id === parameters.get('inspection'))?.id || null;
            search.value = parameters.get('search') || '';
            owner.value = parameters.get('owner') || '';
            state.value = parameters.get('state') || '';
            remaining.checked = parameters.get('remaining') === '1';
            page = Math.floor(Number(parameters.get('page'))) || 1; setLength(parameters.has('length') ? Number(parameters.get('length')) : lengths[0]);
            // A record link elsewhere on the page lands on that record, not on wherever the page happened to be.
            const linked = fragment.startsWith('record-');
            selected = (linked ? fragment : parameters.get('item')) || null;
            filter(true);
            restoring = false;
            if (linked) reveal(true);
        }
        try {
            // The levels inside an area at the top stay with it on its page, and Open all and Close all reach every page.
            const paged = [pagedList(document.querySelector('.initiatives'), 'tbody tr', document.getElementById('initiatives-heading')),
                pagedList(document.getElementById('areas'), ':scope > .fig-list > li', document.getElementById('areas-heading'))];
            const initiativePages = { show() { paged.forEach(list => list.show()); }, all() { paged.forEach(list => list.all()); } };
            treeTools();
            [search, owner, state, remaining].forEach(control => control.addEventListener('input', () => filter()));
            pagers.forEach(pager => pager.querySelectorAll('[data-page-step]').forEach(button => button.addEventListener('click', () => {
                if (button.getAttribute('aria-disabled') === 'true') return;
                page += Number(button.dataset.pageStep); paginate(); remember();
                // From under the list the reader is taken to its top, where the new page begins.
                if (pager.dataset.pager === 'bottom') heading.focus();
            })));
            lengthChoice?.addEventListener('change', () => { setLength(Number(lengthChoice.value)); page = 1; paginate(); remember(); });
            document.getElementById('clear-filters').addEventListener('click', () => {
                search.value = ''; owner.value = ''; state.value = ''; remaining.checked = false; filter(); search.focus();
            });
            document.getElementById('inspect-remaining')?.addEventListener('click', () => {
                remaining.checked = true; filter(); heading.focus();
            });
            document.getElementById('print-report')?.addEventListener('click', () => window.print());
            rows.forEach(row => row.firstElementChild.addEventListener('click', event => {
                event.preventDefault();
                rememberContext();
                if (keyOf(row) === selected) select(null, false); else select(keyOf(row), true);
            }));
            document.querySelectorAll('[data-owner-filter]').forEach(button => button.addEventListener('click', () => {
                owner.value = button.dataset.ownerFilter; filter(); heading.focus();
            }));
            document.querySelectorAll('.return-link').forEach(link => link.addEventListener('click', event => {
                if (!backContext(event)) { event.preventDefault(); heading.focus(); }
            }));
            // A record opened from a line elsewhere on the page, an area or initiative line included, is left by going back to that line.
            document.querySelectorAll('a[href^="#record-"]').forEach(link => {
                if (link.closest('.work-row')) return;
                link.addEventListener('click', event => {
                    event.preventDefault(); rememberContext(link);
                    select(link.getAttribute('href').slice(1), true); reveal(true);
                });
            });
            document.querySelectorAll('a[href^="#inspect-path-"]').forEach(link => link.addEventListener('click', event => {
                const panel = document.getElementById(link.getAttribute('href').slice(1));
                if (!panel || !pathPanels.includes(panel)) return;
                event.preventDefault(); rememberContext(); inspection = panel.id; showInspection(true); remember();
            }));
            window.addEventListener('hashchange', restore);
            // Paper gets every row whatever the filters say, then every record card in order, with every disclosure open.
            window.addEventListener('beforeprint', () => {
                details.forEach(sendHome); placeNote(null); initiativePages.all();
                pathPanels.forEach(panel => { panel.hidden = false; });
                countLabel.textContent = rows.length + ' of ' + rows.length + ' inspected records shown' + unknownTotal();
                document.querySelectorAll('details').forEach(element => { element.dataset.printOpen = element.open ? 'true' : 'false'; element.open = true; });
            });
            window.addEventListener('afterprint', () => {
                document.querySelectorAll('details').forEach(element => { element.open = element.dataset.printOpen === 'true'; delete element.dataset.printOpen; });
                filter(true); initiativePages.show();
            });
            documentRoot.classList.add('enhanced');
            restore(); initiativePages.show();
        } catch (_) {
            documentRoot.classList.remove('enhanced');
            rows.forEach(row => { row.hidden = false; row.classList.remove('is-open'); });
            document.querySelectorAll('.initiatives tbody tr, #areas > .fig-list > li').forEach(row => { row.hidden = false; });
            details.forEach(detail => { detail.hidden = false; sendHome(detail); });
            pathPanels.forEach(panel => { panel.hidden = false; });
            document.getElementById('interaction-error').hidden = false;
        }
    }
    if (!snapshot.packed) { start(); return; }
    let opening;
    try { opening = unpack(); } catch (_) { opening = Promise.reject(new Error('Packed detail cannot be opened here')); }
    // Whether or not the detail opens, the list, the counts and the filters start.
    opening.then(place).catch(() => { unopened = true; document.getElementById('packed-unavailable').hidden = false; }).then(start);
}
const SCRIPT = `(${enhanceReport.toString()})();`;
function cspHash(content) { return `'sha256-${crypto.createHash('sha256').update(content).digest('base64')}'`; }
// The only inline script and stylesheet a report carries. A page that shows a report inside itself names these two and nothing else inline.
const REPORT_INLINE_SOURCES = Object.freeze({ script: cspHash(SCRIPT), style: cspHash(STYLES) });

function factRow(label, value, sub) {
    return `<dt>${escapeHtml(label)}</dt><dd>${value}${sub ? `<span class="fact-sub">${sub}</span>` : ''}</dd>`;
}

// A linked record is named by its title when this snapshot holds exactly one record with that identity. The link leads to
// its detail only when this copy carries it.
function linkedRecord(id, ctx) {
    const target = ctx.byId.get(id);
    if (!target) return `<span class="mono">${escapeHtml(id)}</span><span class="fact-sub">Not a unique record in this snapshot</span>`;
    return ctx.detailed.has(target) ? `<a href="#${escapeHtml(recordAnchor(target, ctx.byId))}">${escapeHtml(target.title)}</a> <span class="id">${escapeHtml(id)}</span>`
        : `${escapeHtml(target.title)} <span class="id">${escapeHtml(id)}</span>${ctx.inScope.has(target) ? '' : '<span class="fact-sub">Outside this snapshot</span>'}`;
}

// Why no figure is stated, in the read's own words.
function withheldReason(figures) { return String(figures?.reason || 'The project was not inspected completely').replace(/\.$/, ''); }
// What an area or an initiative with no eligible task says in place of a figure. Page text: kind words arrive escaped.
function noFigure(kind, kinds) {
    return kind === INITIATIVE_KIND ? `No linked ${kinds.lowerMany(DELIVERY_KIND)} yet, so no percentage applies. That is not the same as zero percent.`
        : `No eligible ${kinds.lowerMany(DELIVERY_KIND)}, so no percentage applies`;
}
// The delivery figures an area's or an initiative's own scope states, printed as read.
function deliveryFact(item, ctx) {
    const figures = ctx.snapshot.figures;
    if (!figures || ![AREA_KIND, INITIATIVE_KIND].includes(item.kind)) return '';
    if (figures.status !== 'complete') return factRow('Delivery', '<span class="is-none">Figures withheld</span>', escapeHtml(withheldReason(figures)));
    const entry = ctx.numbers.get(item.id);
    if (!entry) return '';
    if (!entry.total) return factRow('Delivery', `<span class="is-none">${noFigure(item.kind, ctx.kinds)}</span>`);
    return factRow('Delivery', `${entry.accepted} of ${ctx.kinds.count(entry.total, DELIVERY_KIND)} accepted${typeof entry.percentage === 'number' ? `, ${entry.percentage.toFixed(1)}%` : ''}`,
        `${entry.remaining} remaining, ${entry.currentlyVerified} with current proof`);
}
// One area a record is tagged to, or one initiative it is linked to: the record, then what it is.
function tagLine(id, ctx) {
    const target = ctx.byId.get(id);
    let about = '';
    if (target?.kind === AREA_KIND) {
        const inside = array(ctx.areas.get(id)?.parentAreaIds).map(parent => ctx.byId.get(parent)?.title || parent);
        about = `${target.level ? ctx.names.level(target.level) : ctx.kinds.plain(AREA_KIND)}${inside.length ? ` in ${inside.join(', ')}` : ''}`;
    } else if (target) about = capital([target.type && ctx.names.type(target.type), stateName(target.state).toLowerCase()].filter(Boolean).join(', '));
    return `${linkedRecord(id, ctx)}${about ? `<span class="fact-sub">${escapeHtml(about)}</span>` : ''}`;
}

function renderFacts(item, ctx) {
    const { members, kinds } = ctx;
    const history = array(item.history);
    const entered = [...history].reverse().find(entry => entry.afterState === item.state && entry.beforeState !== entry.afterState) || history.find(entry => entry.operation === 'create' && entry.afterState === item.state);
    const proofs = array(item.proofs).filter(proof => proof && typeof proof === 'object');
    const latest = proofs.reduce((newest, proof) => !newest || String(proof.observedAt || '') > String(newest.observedAt || '') ? proof : newest, null);
    const decision = item.acceptance?.accepted === true ? array(item.acceptanceHistory).at(-1) : null;
    const attested = item.health?.status === 'attested';
    const isArea = item.kind === AREA_KIND, isInitiative = item.kind === INITIATIVE_KIND;
    // A tag is a link the record itself declares. Its areas and initiatives are read from its own links, each once.
    const tagged = relation => [...new Set(array(item.links).filter(link => link && typeof link === 'object' && link.relation === relation && typeof link.itemId === 'string').map(link => link.itemId))];
    const areas = tagged(AREA_TAG), initiatives = tagged(INITIATIVE_TAG);
    const relations = new Map();
    for (const link of array(item.links)) {
        if (!link || typeof link !== 'object' || Object.hasOwn(VOCABULARY.tagRoles, link.relation)) continue;
        const name = ctx.linkNames[link.relation] || capital(words(link.relation));
        relations.set(name, [...(relations.get(name) || []), link.itemId ? linkedRecord(link.itemId, ctx) : (link.path ? linkedPath(link.path) : '<span class="mono">Unknown</span>')]);
    }
    const lines = ids => ids.map(id => tagLine(id, ctx)).join('<br>');
    const none = text => `<span class="is-none">${text}</span>`;
    const label = (table, value) => (value ? escapeHtml(ctx.names[table](value)) : none('Not set'));
    const inside = array(ctx.areas.get(item.id)?.childAreaIds);
    return `<dl class="facts">${[
        entered?.at ? factRow('Since', escapeHtml(`${stateName(item.state)} since ${day(entered.at)}`)) : '',
        isArea ? factRow('Level', label('level', item.level)) : '',
        isInitiative ? factRow('Type', label('type', item.type)) : '',
        isInitiative ? factRow('Priority level', label('priority', item.priorityLevel)) : '',
        isArea ? '' : factRow('Due date', dueMark(item, ctx.today)),
        // An area is tagged to the areas it sits inside; any other record to the areas it belongs to.
        isArea ? factRow('Sits inside', areas.length ? lines(areas) : none('Top of the project'))
            : factRow(kinds.plainMany(AREA_KIND), areas.length ? lines(areas) : none(`Not in any ${kinds.word(1, AREA_KIND)}`)),
        isArea && inside.length ? factRow(`${kinds.plainMany(AREA_KIND)} inside`, inside.map(id => linkedRecord(id, ctx)).join('<br>')) : '',
        // An area declares no initiative link, and an initiative names another one only when it is linked to it.
        isArea || (isInitiative && !initiatives.length) ? '' : factRow(kinds.plainMany(INITIATIVE_KIND), initiatives.length ? lines(initiatives) : none(`Not linked to ${kinds.a(INITIATIVE_KIND)}`)),
        deliveryFact(item, ctx),
        factRow('Responsible', escapeHtml(`${memberLabel(item.assigneeId, members)}${item.assigneeId ? ` (${item.assigneeId})` : ''}`)),
        factRow('Collaborators', escapeHtml(array(item.collaboratorIds).map(id => memberLabel(id, members)).join(', ') || 'None recorded')),
        ...(inDelivery(item) ? [
            factRow('Proof', escapeHtml(verificationLabel(item)), [item.verification?.reason, latest ? `Latest proof: ${words(latest.kind)}, ${words(latest.result)}, ${instant(latest.observedAt)}` : null].filter(Boolean).map(escapeHtml).join('. ')),
            factRow('Acceptance', escapeHtml(acceptanceLabel(item)), [item.acceptance?.reason, decision?.acceptedAt ? `${decision.actor ? memberLabel(decision.actor, members) : 'An unrecorded actor'}, ${instant(decision.acceptedAt)}` : null].filter(Boolean).map(escapeHtml).join('. '))
        ] : []),
        ...[...relations].map(([name, targets]) => factRow(name, targets.join('<br>'))),
        factRow('Owning file', `<span class="mono">${escapeHtml(item.ownerPath || 'Unknown')}</span>`),
        factRow('Revision', `<span class="mono">${escapeHtml(item.revision ?? 'Unknown')}</span>`),
        factRow('Record health', escapeHtml(attested ? item.health.assessment : 'Not attested'), escapeHtml(attested
            ? `${item.health.displayName || item.health.ownerId} (${item.health.ownerId}), observed ${instant(item.health.observedAt)}. ${item.health.reason}`
            : item.health?.reason || 'No dated owner attestation available'))
    ].join('')}</dl>`;
}

// One card per record. With scripts it opens under its row in the table; without them, on paper, or when filters
// hide the row, it stands in the list under the table with its own heading.
function renderDetail(item, ctx) {
    const { members } = ctx;
    const anchor = escapeHtml(recordAnchor(item, ctx.byId));
    const reasons = array(item.prerequisiteReasons);
    const blocker = typeof item.blocker === 'string' ? { reason: item.blocker } : item.blocker;
    const retained = [['Proof', item.proofs], ['Acceptance history', item.acceptanceHistory], ['Recorded activity', item.activity], ['Change history', item.history]];
    const absent = [['links', item.links], ...retained.map(([label, values]) => [label.toLowerCase(), values])]
        .filter(([, values]) => !array(values).length).map(([label]) => label);
    const disclosures = retained.filter(([, values]) => array(values).length).map(([label, values]) => jsonDetails(label, values)).join('');
    return `<article class="record-detail" id="${anchor}" data-item-id="${escapeHtml(item.id)}" aria-labelledby="heading-${anchor}">
<header class="detail-head"><p class="badge">${kindMark(item, ctx.kinds)}<span class="id">${escapeHtml(item.id)}</span>${flags(item)}</p><h3 id="heading-${anchor}" tabindex="-1">${escapeHtml(item.title)}</h3><p class="marks">${stateMark(item)}<span class="mark${item.assigneeId ? '' : ' is-none'}">${escapeHtml(memberLabel(item.assigneeId, members))}</span>${proofMark(item)}${sealMark(item)}</p></header>
<div class="detail-body"><div class="detail-main">${item.intent ? `<p class="intent">${escapeText(item.intent)}</p>` : '<p class="note">No outcome recorded. Inspect the owning artifact before starting work.</p>'}
${blocker ? `<p class="callout">${icon('alert')}<span><strong>${item.state === 'blocked' ? 'Blocked.' : 'Recorded blocker.'}</strong> ${escapeHtml(blocker.reason || 'No blocker reason is recorded.')}${blocker.at ? ` <span class="fact-sub">Blocked since ${escapeHtml(day(blocker.at))}${blocker.resumeState ? `; resumes to ${escapeHtml(stateName(blocker.resumeState))}` : ''}.</span>` : ''}</span></p>` : ''}
<section class="record-section"><h4>Acceptance criteria</h4>${array(item.criteria).length ? `<ul class="criteria">${item.criteria.map(criterion => `<li><span class="id">${escapeHtml(criterion.id)}</span><span>${escapeHtml(criterion.text)}</span></li>`).join('')}</ul>` : '<p class="note">No acceptance criteria recorded.</p>'}</section>
${reasons.length ? `<section class="record-section"><h4>Readiness limits</h4><ul class="reasons">${reasons.map(reason => `<li>${escapeHtml(reason)}</li>`).join('')}</ul></section>` : ''}
${disclosures ? `<div class="disclosures">${disclosures}</div>` : ''}
${absent.length ? `<p class="note">Not retained in this snapshot: ${escapeHtml(absent.join(', '))}.</p>` : ''}
${item.legacy || item.optOut ? `<p class="note">${item.legacy ? 'Legacy record; tracked metadata has not been adopted. ' : ''}${item.optOut ? 'Automatic tracking is opted out.' : ''}</p>` : ''}</div>
${renderFacts(item, ctx)}</div>
<p class="detail-foot"><a class="control return-link" href="#work">Back to Work</a></p></article>`;
}

// One block per eligible task. The counted sentence stays authoritative: nothing is drawn unless the blocks agree with it.
function deliveryBlocks(snapshot, metrics, kinds) {
    if (!metrics.total || metrics.total > BLOCK_LIMIT) return '';
    const byId = new Map();
    for (const item of array(snapshot.items)) byId.set(item.id, byId.has(item.id) ? null : item);
    const eligible = array(metrics.eligibleIds).map(id => byId.get(id)).filter(Boolean);
    const groups = { verified: [], accepted: [], awaiting: [], open: [] };
    for (const item of eligible) {
        const proved = item.verification?.status === 'current';
        groups[item.acceptance?.accepted === true ? (proved ? 'verified' : 'accepted') : item.state === 'verifying' && proved ? 'awaiting' : 'open'].push(item);
    }
    if (eligible.length !== metrics.total || groups.verified.length !== metrics.currentlyVerified
        || groups.verified.length + groups.accepted.length !== metrics.accepted) return '';
    const names = { verified: 'accepted with current proof', accepted: 'accepted, proof not current', awaiting: 'proved, waiting for acceptance', open: 'not accepted yet' };
    const marks = { verified: 'check', accepted: 'clock', awaiting: 'seal' };
    const present = Object.keys(names).filter(name => groups[name].length);
    const labelled = metrics.total <= LABELLED_BLOCKS;
    const density = metrics.total > DENSE_BLOCKS ? ' blocks--dense' : metrics.total <= FEW_BLOCKS ? ' blocks--few' : '';
    return `<div class="blocks${density}" role="img" aria-label="${kinds.count(metrics.total, DELIVERY_KIND)}, one block each: ${escapeHtml(present.map(name => `${groups[name].length} ${names[name]}`).join('; '))}">${present.map(name => groups[name].map(item => `<span class="block-cell" title="${escapeHtml(`${item.id}: ${item.title}`)}"><span class="block block--${name}">${marks[name] ? icon(marks[name]) : ''}</span>${labelled ? `<span class="block-id">${escapeHtml(idTail(item.id))}</span>` : ''}</span>`).join('')).join('')}</div><ul class="legend">${present.map(name => `<li><span class="block block--${name}" aria-hidden="true"></span><span><strong>${groups[name].length}</strong> ${names[name]}</span></li>`).join('')}</ul>`;
}

function renderSummary(snapshot, kinds) {
    const tasks = kinds.lowerMany(DELIVERY_KIND);
    const metrics = snapshot.metrics;
    const complete = snapshot.coverage === 'complete' && metrics?.coverage === 'complete';
    const total = count(metrics?.total), accepted = count(metrics?.accepted), remaining = count(metrics?.remaining), verified = count(metrics?.currentlyVerified);
    const valid = total !== null && accepted !== null && remaining !== null && verified !== null && accepted <= total && verified <= accepted && remaining === total - accepted;
    // The heading names the fact; the scope it was counted for stands beside it and never changes with the filters.
    const heading = `<div class="eyebrow-line"><h2 id="progress-heading" class="eyebrow">Delivery scope</h2><span class="scope-id">${scopeName(snapshot, kinds) || 'Whole project'}</span></div>`;
    if (!metrics || !valid) return `<section class="summary card" aria-labelledby="progress-heading"><div class="hero-lead">${heading}<p class="hero-title">Progress unavailable</p></div><p class="hero-copy">No trustworthy delivery denominator is available. Read the inspection limits below; this does not mean the project has no work.</p></section>`;
    const percentage = complete && total > 0 && typeof metrics.percentage === 'number' && Number.isFinite(metrics.percentage) && Math.abs(metrics.percentage - accepted / total * 100) < 0.000001;
    const ledger = `<p class="ledger">${accepted} of ${total} eligible ${kinds.word(total, DELIVERY_KIND)} accepted, ${verified} with current proof; ${remaining} not accepted.</p>`;
    let body;
    if (percentage) {
        const blocks = deliveryBlocks(snapshot, metrics, kinds);
        body = `<div class="hero"><div class="hero-lead">${heading}<p class="hero-count"><span class="hero-figure">${accepted}</span> <span class="hero-unit">of ${kinds.count(total, DELIVERY_KIND)} accepted</span></p></div><p class="hero-rate"><strong>${metrics.percentage.toFixed(1)}%</strong> <span>accepted in this exact scope</span></p></div>${blocks || ledger}`;
    } else if (total === 0 && complete) {
        body = `<div class="hero-lead">${heading}<p class="hero-title">No delivery scope yet</p></div><p class="hero-copy">Delivery counts ${tasks}, one block each. No eligible ${tasks} in this delivery scope; no percentage applies. That is not the same as zero percent.</p><div class="blocks blocks--ghost" aria-hidden="true">${'<span class="block block--ghost"></span>'.repeat(GHOST_BLOCKS)}</div>`;
    } else {
        body = `<div class="hero-lead">${heading}<p class="hero-title">Delivery unknown</p></div><p class="hero-copy">No delivery blocks are drawn. Percentage withheld because scope or coverage is incomplete. The counts cover inspected work only.</p>${ledger}`;
    }
    const caption = `Each ${kinds.word(1, DELIVERY_KIND)} counts once. Excluded: ${count(metrics.canceled) ?? 'unknown'} canceled, ${count(metrics.retired) ?? 'unknown'} retired. ${listWords(VOCABULARY.kinds.filter(kind => kind !== DELIVERY_KIND).map((kind, index) => (index ? kinds.lowerMany(kind) : kinds.capitalMany(kind))))} sit outside this count. An acceptance made in the past does not show that proof still applies today.`;
    return `<section class="summary card" aria-labelledby="progress-heading">${body}<div class="card-foot"><p class="caption">${caption}</p><div class="actions enhancement-only"${array(snapshot.items).length ? '' : ' hidden'}><button type="button" id="inspect-remaining" class="primary">Inspect remaining work</button></div></div></section>`;
}

// Health is attested on the record that owns the selected scope: the area or initiative of a scoped snapshot, else the
// project's configured owner. `owner` is the kind word of a scope, already escaped, or nothing for the project.
function renderHealth(health, owner) {
    const name = owner || 'Project';
    const note = 'A dated assessment by the owner of this exact scope; a child record cannot stand in for it. Activity and percentages never set it.';
    if (health?.status === 'attested') {
        return `<section class="health card" aria-labelledby="health-heading"><h2 id="health-heading" class="eyebrow">${name} health, owner-attested</h2><p class="health-headline">${escapeHtml(health.assessment)}</p><p class="health-reason">${escapeHtml(health.reason)}</p><dl class="health-facts"><dt>Attested by</dt><dd>${escapeHtml(health.displayName || health.ownerId)} (${escapeHtml(health.ownerId)})</dd><dt>Observed</dt><dd>${escapeHtml(instant(health.observedAt))}</dd><dt>Health owner</dt><dd><span class="mono">${escapeHtml(health.itemId)}</span></dd></dl><p class="health-note">${note}</p></section>`;
    }
    return `<section class="health health--unknown card" aria-labelledby="health-heading"><h2 id="health-heading" class="eyebrow">${name} health</h2><p class="health-headline">Unknown</p><p class="health-reason">${escapeHtml(health?.reason || 'No dated owner attestation available')}</p><p class="health-note">${note}</p></section>`;
}

// The delivery lifecycle line. It counts the kinds that move along it; areas and initiatives have lines of their own.
// `whole` is a project snapshot, which counts every such kind; a scoped one counts its eligible tasks.
function renderStanding(items, kinds, whole) {
    const open = items.filter(item => !item.retired);
    const inState = state => open.filter(item => item.state === state);
    const blocked = inState(SIDING).length;
    const own = statesOf(DELIVERY_LIFECYCLE);
    const off = [[inState(OFF_LINE).length, 'canceled'], [items.length - open.length, 'retired'], [open.filter(item => !own.includes(item.state)).length, 'in another recorded state']]
        .filter(([total]) => total).map(([total, name]) => `${total} ${name}`);
    const counted = listWords(VOCABULARY.kinds.filter(kind => lifecycleOf(kind) === DELIVERY_LIFECYCLE && (whole || kind === DELIVERY_KIND)).map(kinds.lowerMany));
    const apart = whole ? ` ${listWords(VOCABULARY.kinds.filter(kind => lifecycleOf(kind) !== DELIVERY_LIFECYCLE).map((kind, index) => (index ? kinds.lowerMany(kind) : kinds.capitalMany(kind))))} are not counted here.` : '';
    return `<section class="standing card" aria-labelledby="standing-heading"><div class="card-head"><h2 id="standing-heading">Where work stands</h2><p class="aside">${plural(open.filter(onLine).length, 'open record', 'open records')} by recorded state, counting ${counted} only.${apart}${off.length ? ` Off the line: ${off.join(', ')}.` : ''}</p></div><ol class="line line--s${stations().length}">${stations().map(state => {
        const records = inState(state);
        return `<li${records.length ? '' : ' class="station--none"'}><span class="count">${records.length}</span><span class="dot-zone">${dot(state)}</span><span class="station-name">${STATE_NAMES[state]}</span>${records.length ? `<span class="station-kinds">${kindBreakdown(records, kinds)}</span>` : ''}${state === SIDING_HOST && blocked ? `<span class="siding"><span class="siding-hook" aria-hidden="true"></span><span class="siding-tag">${blocked} blocked</span></span>` : ''}</li>`;
    }).join('')}</ol></section>`;
}

// Records the tracker will not move by itself: a decision, a blocker or an owner is missing.
function renderWaiting(ctx, records) {
    const { members, byId } = ctx;
    const ready = new Set(array(ctx.snapshot.ready));
    const waiting = [];
    for (const item of records) {
        if (item.retired || item.state === 'canceled') continue;
        const proved = item.verification?.status === 'current';
        const accepted = item.acceptance?.accepted === true;
        const blocker = typeof item.blocker === 'string' ? { reason: item.blocker } : item.blocker;
        if (item.state === 'verifying' && proved && !accepted) waiting.push([item, 'verifying', 'seal', 'Proved, not accepted', 'Every criterion has current passing proof. Acceptance is a separate decision.']);
        else if (accepted && !proved) waiting.push([item, 'stale', 'clock', 'Accepted, proof not current', `${item.verification?.reason || 'Current proof is not established'}. The acceptance stands.`]);
        else if (item.state === 'blocked') waiting.push([item, 'blocked', 'alert', 'Blocked', `${blocker?.reason || 'No blocker reason is recorded'}.${blocker?.at ? ` Blocked since ${day(blocker.at)}.` : ''}`]);
        else if (item.state === 'ready' && !ready.has(item.id)) waiting.push([item, 'plain', 'alert', 'Ready, cannot start', array(item.prerequisiteReasons)[0] || 'Current prerequisites are unresolved.']);
        else if (item.state === 'ready' && !item.assigneeId) waiting.push([item, 'plain', 'person', 'Ready, unassigned', 'Nobody is responsible yet, so it cannot start.']);
    }
    if (!waiting.length) return '';
    return `<section class="waiting section" aria-labelledby="waiting-heading"><div class="section-head"><h2 id="waiting-heading">Waiting on a person</h2><p class="aside">${plural(waiting.length, 'record', 'records')} the tool will not move by itself</p></div><ul class="queue">${waiting.slice(0, WAITING_LIMIT).map(([item, tone, mark, name, why]) => `<li><span class="tag${tone === 'plain' ? '' : ` tag--${tone}`}">${icon(mark)}<span>${name}</span></span><span class="queue-text"><a class="queue-title" href="#${escapeHtml(recordAnchor(item, byId))}">${escapeHtml(item.title)}</a><span class="queue-why">${escapeHtml(why)}</span></span><span class="queue-who${item.assigneeId ? '' : ' is-none'}">${escapeHtml(memberLabel(item.assigneeId, members))}</span></li>`).join('')}</ul>${waiting.length > WAITING_LIMIT ? `<p class="note">${waiting.length - WAITING_LIMIT} more waiting records are listed under Work.</p>` : ''}</section>`;
}

// One line per record. The line's link names the record's detail; what it says about the record is searched from the
// line and from that detail, so nothing is written twice.
function renderRow(item, ctx) {
    const { members } = ctx;
    return `<li class="work-row${item.state === 'canceled' ? ' work-row--off' : ''}" data-item-id="${escapeHtml(item.id)}" data-owner="${escapeHtml(item.assigneeId || UNASSIGNED)}" data-state="${escapeHtml(item.state || 'unknown')}" data-eligible="${ctx.eligible.has(item.id)}" data-accepted="${item.acceptance?.accepted === true}"><a class="row-line" href="#${escapeHtml(recordAnchor(item, ctx.byId))}"><span class="cell cell--work"><span class="work-text"><span class="work-title"><span class="sr-only">${escapeHtml(item.id)}: </span>${escapeHtml(item.title)}</span><span class="id" aria-hidden="true">${escapeHtml(item.id)}</span>${flags(item)}</span>${kindMark(item, ctx.kinds)}</span><span class="cell">${stateMark(item)}</span><span class="cell cell--owner${item.assigneeId && item.state !== 'canceled' ? '' : ' is-none'}"><span class="sr-only">Responsible: </span>${escapeHtml(memberLabel(item.assigneeId, members))}</span><span class="cell">${proofMark(item)}</span><span class="cell">${sealMark(item)}</span></a></li>`;
}

// Who holds what, one block per open record. Sorted by name: it is a directory, not a ranking.
function renderPeople(items, owners) {
    const rows = owners.map(owner => {
        const held = items.filter(item => (item.assigneeId || UNASSIGNED) === owner.id);
        if (owner.id === UNASSIGNED && !held.length) return '';
        const open = held.filter(item => !item.retired && onLine(item));
        const ordered = PEOPLE_ORDER.flatMap(state => open.filter(item => item.state === state));
        const off = [[held.filter(item => !item.retired && item.state === 'canceled').length, 'canceled'], [held.filter(item => item.retired).length, 'retired'],
            [held.filter(item => !item.retired && !statesOf(lifecycleOf(item.kind)).includes(item.state)).length, 'in another recorded state']].filter(([total]) => total).map(([total, name]) => `${total} ${name}`);
        const summary = `${open.length ? `${plural(open.length, 'record', 'records')}: ${PEOPLE_ORDER.map(state => [open.filter(item => item.state === state).length, state]).filter(([total]) => total).map(([total, state]) => `${total} ${STATE_NAMES[state].toLowerCase()}`).join(', ')}` : 'No open records'}.${off.length ? ` Off the line: ${off.join(', ')}.` : ''}`;
        const quiet = owner.active === false || owner.id === UNASSIGNED || owner.unknown ? ' is-quiet' : '';
        const name = escapeHtml(owner.label);
        return `<li><span class="person-name static-only${quiet}">${name}</span><button type="button" class="person-name person-pick enhancement-only${quiet}" data-owner-filter="${escapeHtml(owner.id)}" aria-label="${name}: show records in Work">${name}</button><span class="person-blocks" aria-hidden="true">${ordered.slice(0, PERSON_BLOCKS).map(item => `<span class="pb is-${item.state}${RING_STATES.includes(item.state) ? ' pb--hollow' : ''}"></span>`).join('')}${ordered.length > PERSON_BLOCKS ? `<span class="id">+${ordered.length - PERSON_BLOCKS}</span>` : ''}</span><span class="person-sum">${escapeHtml(summary)}</span></li>`;
    }).join('');
    return `<section class="people" aria-labelledby="people-heading"${items.length ? '' : ' hidden'}><div class="people-content"><div class="section-head"><h2 id="people-heading">Responsibility</h2><p class="aside">One block is one open record. Alphabetical, not a ranking</p></div><ul class="people-list">${rows}</ul><p class="note enhancement-only">Select a name to show that person's records in Work.</p></div></section>`;
}

function renderSource(snapshot, items, unavailable) {
    const complete = snapshot.coverage === 'complete';
    const tone = unavailable ? 'stop' : { complete: 'good', partial: 'warn' }[snapshot.coverage] || 'stop';
    const inspected = `${plural(items.length, 'record', 'records')} inspected`;
    const stored = storedVocabulary(snapshot);
    // The report is read-only either way; a checkout that stores the earlier words is told how to move on. A pinned ref is not.
    const migration = stored?.code === 'MIGRATION_REQUIRED' && snapshot.source?.kind !== 'shared'
        ? `<p class="notice">${icon('lock')}<span><strong>Migration required: this project is read-only.</strong> It stores the earlier vocabulary. Work is shown in the current words and every count is unchanged. Preview the migration with the task tool: <span class="mono">${escapeHtml(`${MIGRATE} --dry-run`)}</span>. Then run it without <span class="mono">--dry-run</span>.</span></p>` : '';
    const coverage = unavailable ? 'Unavailable; no trustworthy work count' : `${capital(words(snapshot.coverage))}, ${inspected}${complete ? '' : '; project total unknown'}`;
    const source = snapshot.source || {};
    return `<section class="source source-strip" aria-labelledby="source-heading"><h2 id="source-heading" class="sr-only">Snapshot source</h2><dl class="source-facts"><div><dt>As of</dt><dd><span class="mono">${escapeHtml(instant(snapshot.asOf))}</span></dd></div><div><dt>Source</dt><dd>${escapeHtml(source.label || 'Source unavailable')}${source.ref ? `<span class="fact-sub">${escapeHtml(source.ref)}${source.oid ? ` at ${escapeHtml(String(source.oid).slice(0, 12))}` : ''}</span>` : ''}</dd></div><div><dt>Coverage</dt><dd class="fact-line fact--${tone}">${icon(tone === 'good' ? 'check' : 'alert')}<span>${escapeHtml(coverage)}</span></dd></div><div><dt>Shared freshness</dt><dd>${escapeHtml(capital(words(source.remoteFreshness)))}. Regenerate to see later edits</dd></div></dl>${unreadableSource(snapshot)
        ? `<p class="notice notice--stop">${icon('alert')}<span><strong>No work can be read from this project.</strong> ${escapeHtml(stored.reason)}. No work is counted or listed.</span></p>`
        : unavailable
            ? `<p class="notice notice--stop">${icon('alert')}<span><strong>Inspection unavailable.</strong> Native sources are not converted into portable records. No trustworthy work count can be supplied for this profile.</span></p>`
            : complete ? '' : `<p class="notice">${icon('alert')}<span><strong>Inspection is incomplete.</strong> Read the limits below before treating this list as the whole project.</span></p>`}${migration}</section>`;
}

function renderLimits(snapshot, unavailable, view) {
    const inView = id => !view.own || view.own.has(id);
    const diagnostics = array(snapshot.diagnostics), excluded = array(snapshot.excluded).filter(entry => inView(entry?.itemId)), ready = array(snapshot.ready).filter(inView);
    const profile = `${snapshot.profile?.identity || snapshot.profile?.kind || 'Unknown'}${snapshot.profile?.version === undefined ? '' : ` v${snapshot.profile.version}`}${unavailable ? ' / Unsupported inspection capability' : ''}`;
    const fact = (label, value) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`;
    return `<section class="limits" aria-labelledby="limits-heading"><h2 id="limits-heading">Inspection limits and snapshot identity</h2>${diagnostics.length
        ? `<ul class="reasons">${diagnostics.map(diagnostic => `<li>${escapeHtml(diagnostic.itemId || '')}${diagnostic.itemId ? ': ' : ''}${diagnostic.path ? `<span class="mono">${escapeHtml(diagnostic.path)}</span>: ` : ''}${escapeHtml(diagnostic.code || 'Unknown')}: ${escapeHtml(diagnostic.reason || 'No explanation supplied')}</li>`).join('')}</ul>`
        : `<p>No inspection diagnostics were recorded for this snapshot${snapshot.coverage === 'complete' ? ', so the counts above cover the whole selected scope' : ''}.</p>`}<dl class="source identity">${fact('Fingerprint', snapshot.fingerprint || 'Unknown')}${fact('Profile', profile)}${fact('Checkout', snapshot.project?.root || 'Unknown')}${fact('Scope revision', snapshot.metrics?.scopeRevision || 'Unknown')}${fact('Detail form', DETAIL_NAMES[view.mode])}${fact('Size budget', view.budget?.maxBytes ? `${view.budget.maxBytes} bytes, ${view.budget.met === false ? 'not met by this smallest form' : 'met'}` : 'None stated for this copy')}${fact('Proved ready to start', ready.join(', ') || 'None in this snapshot')}</dl>${excluded.length
        ? `<details><summary>Why other records are not ready to start (${excluded.length})</summary><ul class="reasons">${excluded.map(entry => `<li><span class="mono">${escapeHtml(entry?.itemId || 'Unknown')}</span>: ${escapeHtml(array(entry?.reasons).join('; ') || 'No reason supplied')}</li>`).join('')}</ul></details>`
        : '<p class="note">No selection exclusions recorded.</p>'}</section>`;
}

// What one render shares: the snapshot, who is who, which record an identity names, which records this copy lists and which
// of them carry detail in it, and the words and figures the read supplies for them.
function renderContext(snapshot, items, scoped, mode) {
    const byId = new Map();
    for (const item of items) byId.set(item.id, byId.has(item.id) ? null : item);
    const kinds = kindWords(snapshot);
    const shown = snapshot.vocabulary?.labels || {};
    const named = (own, declared) => value => String({ ...own, ...declared }[value] || value);
    const figures = snapshot.figures?.status === 'complete' ? snapshot.figures : null;
    const name = scopeName(snapshot, kinds);
    return { snapshot, members: array(snapshot.members), byId, mode, kinds, linkNames: { ...VOCABULARY.labels.linkRoles, ...shown.linkRoles },
        // Display labels for levels, types and priority levels: data, escaped where they are written.
        names: { level: named(VOCABULARY.labels.levels, shown.levels), type: named(VOCABULARY.labels.initiativeTypes, shown.initiativeTypes), priority: named(VOCABULARY.labels.priorityLevels, shown.priorityLevels) },
        inScope: new Set(scoped), detailed: new Set(mode === 'none' ? [] : scoped), scopeName: name, scopeLabel: name || 'Whole project',
        // The day of the read, against which a due date is "today".
        today: String(snapshot.asOf || '').slice(0, 10),
        areas: new Map(array(snapshot.hierarchy?.areas).map(area => [area.id, area])),
        numbers: new Map([...array(figures?.areas), ...array(figures?.initiatives)].map(entry => [entry.id, entry])),
        eligible: new Set(array(snapshot.metrics?.eligibleIds)) };
}

// Where every kind of work stands, each kind along its own lifecycle. A count of records, never a delivery figure: only
// tasks earn delivery credit.
function renderKinds(records, kinds, complete) {
    const stated = counts => counts.filter(([total]) => total).map(([total, name]) => `${total} ${name}`).join(', ');
    const lines = VOCABULARY.kinds.map(kind => {
        const own = statesOf(lifecycleOf(kind));
        const held = records.filter(item => item.kind === kind);
        const open = held.filter(item => !item.retired);
        const inState = state => open.filter(item => item.state === state).length;
        const onLine = stated(own.filter(state => state !== OFF_LINE).map(state => [inState(state), STATE_NAMES[state].toLowerCase()]));
        // Canceled, retired and unrecognised records stand apart from the lifecycle, as they do in "Where work stands".
        const off = stated([[inState(OFF_LINE), STATE_NAMES[OFF_LINE].toLowerCase()], [held.length - open.length, 'retired'], [open.filter(item => !own.includes(item.state)).length, 'in another recorded state']]);
        const stands = held.length ? [onLine, off && `Off the line: ${off}`].filter(Boolean).join('. ') : 'None';
        return `<div><dt>${kinds.many(kind)} <span class="id">${held.length}</span></dt><dd>${escapeHtml(stands)}</dd></div>`;
    }).join('');
    return `<section class="kinds card" aria-labelledby="kinds-heading"><div class="card-head"><h2 id="kinds-heading">Status by kind</h2><p class="aside">Every inspected record, counted once${complete ? '' : '; project total unknown'}. Only ${kinds.lowerMany(DELIVERY_KIND)} earn delivery credit</p></div><dl class="kind-lines">${lines}</dl></section>`;
}

// What a figure line says after the name: the meter, the counts and the rate the read states for that scope, or that no
// percentage applies. With figures withheld a line states no number at all.
function figureCells(entry, kind, ctx, stated) {
    if (!stated) return '';
    if (!entry) return '<span class="fig-count fig-none is-none">Figures unavailable</span>';
    if (!entry.total) return `<span class="fig-count fig-none is-none">${noFigure(kind, ctx.kinds)}</span>`;
    return `${meter(entry)}<span class="fig-count">${entry.accepted} of ${ctx.kinds.count(entry.total, DELIVERY_KIND)} accepted</span><span class="fig-rate">${typeof entry.percentage === 'number' ? `${entry.percentage.toFixed(1)}%` : ''}</span><span class="fig-rest">${entry.remaining} remaining, ${entry.currentlyVerified} with current proof</span>`;
}
function withheldNotice(what, figures, kinds) {
    return `<p class="notice">${icon('alert')}<span><strong>${what} figures are withheld.</strong> ${escapeHtml(withheldReason(figures))}. Figures are stated for every ${kinds.word(1, AREA_KIND)} and ${kinds.word(1, INITIATIVE_KIND)} or for none. Read the inspection limits below.</span></p>`;
}

// Each area's own delivery figures, as that area's own snapshot would state them, in a tree that opens level by level
// without scripts. Lines are never added together: a task in several areas counts in each of them.
function renderAreaFigures(ctx) {
    const { snapshot, byId, kinds } = ctx;
    const figures = snapshot.figures;
    if (!figures || !snapshot.hierarchy) return '';
    const scope = scopeOf(snapshot);
    const tasks = kinds.lowerMany(DELIVERY_KIND), area = kinds.word(1, AREA_KIND), areasWord = kinds.lowerMany(AREA_KIND);
    const title = `<h2 id="areas-heading">How each ${area} stands</h2>`;
    // A scoped snapshot shows the areas of its own scope: the area and those inside it, never the areas above or beside.
    const shown = array(snapshot.hierarchy.areas).filter(entry => byId.get(entry.id) && ctx.inScope.has(byId.get(entry.id)));
    if (!shown.length) {
        if (scope) return '';
        const total = count(snapshot.metrics?.total);
        return `<section class="figures card" id="areas" aria-labelledby="areas-heading"><div class="card-head">${title}</div><p class="empty"><strong>This project has no ${areasWord}.</strong> ${total === null ? `Every ${kinds.word(1, DELIVERY_KIND)} counts` : total === 1 ? `The ${kinds.count(1, DELIVERY_KIND)} counts` : `All ${kinds.count(total, DELIVERY_KIND)} count`} for the whole project. Add ${kinds.a(AREA_KIND)} when you want to follow one part on its own.</p></section>`;
    }
    const complete = figures.status === 'complete';
    const known = new Map(shown.map(entry => [entry.id, entry]));
    const rank = entry => (VOCABULARY.levels.includes(entry.level) ? VOCABULARY.levels.indexOf(entry.level) : VOCABULARY.levels.length);
    // Shallowest level first, then by title.
    const ordered = entries => [...entries].sort((a, b) => rank(a) - rank(b) || byId.get(a.id).title.localeCompare(byId.get(b.id).title, 'en', { sensitivity: 'base' }) || (a.id < b.id ? -1 : 1));
    // The identity is printed beside an area at the top of the list. Further in, the line keeps it for a reader who
    // asks for it and for assistive technology, and the rows keep one height.
    const line = (entry, top) => {
        const item = byId.get(entry.id);
        const name = ctx.detailed.has(item) ? `<a href="#${escapeHtml(recordAnchor(item, byId))}">${escapeHtml(item.title)}</a>` : escapeHtml(item.title);
        return `<div class="fig-row"><span class="fig-name"${top ? '' : ` title="${escapeHtml(entry.id)}"`}>${labelChip(entry.level && ctx.names.level(entry.level))}${name}<span class="id${top ? '' : ' sr-only'}">${escapeHtml(entry.id)}</span>${item.state === OFF_LINE ? stateMark(item) : ''}</span>${figureCells(ctx.numbers.get(entry.id), AREA_KIND, ctx, complete)}</div>`;
    };
    // Each area is listed once, under the first area that leads to it; the other areas it sits inside are named on its record.
    const visited = new Set();
    // Every level is written closed, as the workspace opens: the reader opens a level by its own native control, or all
    // of them at once when scripts run. Paper shows every level.
    const branch = (entry, top) => {
        if (visited.has(entry.id)) return '';
        visited.add(entry.id);
        // A child reached through an earlier sibling is listed there, so only the lines written here are counted.
        const children = ordered(array(entry.childAreaIds).map(id => known.get(id)).filter(Boolean)).map(child => branch(child, false)).filter(Boolean);
        return `<li>${line(entry, top)}${children.length ? `<details class="fig-more"><summary>${kinds.count(children.length, AREA_KIND)} inside ${escapeHtml(byId.get(entry.id).title)}</summary><ul class="fig-list">${children.join('')}</ul></details>` : ''}</li>`;
    };
    const roots = shown.filter(entry => !array(entry.parentAreaIds).some(parent => known.has(parent)));
    const list = [...ordered(roots), ...ordered(shown)].map(entry => branch(entry, true)).join('');
    // Work that belongs to no area belongs to the project as a whole, and is listed so that it can be found.
    const untagged = scope ? [] : array(snapshot.hierarchy.untaggedTaskIds);
    const outside = untagged.length ? `<div class="hint"><p><strong>Not in any ${area}: ${kinds.count(untagged.length, DELIVERY_KIND)}.</strong> ${untagged.length === 1 ? 'It counts' : 'They count'} for the whole project only.</p><details class="fig-more"><summary>List ${untagged.length === 1 ? 'it' : 'them'}</summary><ul class="reasons" aria-label="Not in any ${area}">${untagged.map(id => `<li>${linkedRecord(id, ctx)}</li>`).join('')}</ul></details></div>` : '';
    // Open all and Close all are two small links at the end of the heading line. They exist only once scripts run, and
    // only where there is a level to open; without scripts the heading line is the title and its caption, as written.
    const links = list.includes('<details') ? `<div class="level-links enhancement-only" role="group" aria-label="${kinds.one(AREA_KIND)} list levels"><button type="button" class="level-link" data-tree-open="true" aria-label="Open all ${areasWord}">${icon('levelsOpen')}<span>Open all</span></button><span class="level-rule" aria-hidden="true"></span><button type="button" class="level-link" data-tree-open="false" aria-label="Close all ${areasWord}">${icon('levelsClose')}<span>Close all</span></button></div>` : '';
    // The areas at the top are read a page at a time once scripts run; every one of them is in the file.
    const pager = place => renderPager(place, { list: `${kinds.one(AREA_KIND)} list`, previous: 'Previous page', next: 'Next page', counted: true });
    const head = `<div class="card-head${links ? ' card-head--levels' : ''}">${title}${links}<p class="aside">Each line counts the ${area}'s own ${tasks} and those of the ${areasWord} inside it</p></div>`;
    return `<section class="figures card" id="areas" aria-labelledby="areas-heading">${head}${complete ? '' : withheldNotice(kinds.one(AREA_KIND), figures, kinds)}${pager('top')}<ul class="fig-list">${list}</ul>${pager('bottom')}${outside}${complete ? METER_LEGEND : ''}<p class="note">A ${kinds.word(1, DELIVERY_KIND)} in several ${areasWord} counts in each of them, so lines are never added together.</p></section>`;
}

// Each initiative's own figures against its due date: overdue first, then by due date, then undated, and closed ones last.
function renderInitiativeFigures(ctx) {
    const { snapshot, byId, kinds } = ctx;
    const figures = snapshot.figures;
    if (!figures || !snapshot.hierarchy) return '';
    const scope = scopeOf(snapshot);
    const one = kinds.word(1, INITIATIVE_KIND), tasks = kinds.lowerMany(DELIVERY_KIND);
    const title = `<h2 id="initiatives-heading">How each ${one} stands</h2>`;
    const shown = [...ctx.inScope].filter(item => item.kind === INITIATIVE_KIND && byId.get(item.id) === item);
    if (!shown.length) {
        return scope ? '' : `<section class="initiatives card" aria-labelledby="initiatives-heading"><div class="card-head">${title}</div><p class="empty"><strong>This project has no ${kinds.lowerMany(INITIATIVE_KIND)}.</strong> Capture ${kinds.a(INITIATIVE_KIND)}, then link the ${tasks} that deliver it.</p></section>`;
    }
    const complete = figures.status === 'complete';
    const byDue = (a, b) => Number(!!b.overdue) - Number(!!a.overdue) || Number(!a.deadline) - Number(!b.deadline) || String(a.deadline || '').localeCompare(String(b.deadline || ''))
        || a.title.localeCompare(b.title, 'en', { sensitivity: 'base' }) || (a.id < b.id ? -1 : 1);
    const row = item => {
        const entry = ctx.numbers.get(item.id);
        const name = ctx.detailed.has(item) ? `<a href="#${escapeHtml(recordAnchor(item, byId))}">${escapeHtml(item.title)}</a>` : escapeHtml(item.title);
        const delivery = !complete ? '<td colspan="2" class="is-none">Figures withheld</td>'
            : !entry ? '<td colspan="2" class="is-none">Figures unavailable</td>'
            : !entry.total ? `<td colspan="2" class="is-none">${noFigure(INITIATIVE_KIND, kinds)}</td>`
            : `<td><span class="fig-delivery">${meter(entry, METER.wide)}<span>${entry.accepted} of ${kinds.count(entry.total, DELIVERY_KIND)} accepted</span><span class="fig-rest">${entry.remaining} remaining, ${entry.currentlyVerified} with current proof</span></span></td><td class="num">${typeof entry.percentage === 'number' ? `${entry.percentage.toFixed(1)}%` : ''}</td>`;
        return `<tr><th scope="row"><span class="fig-name" title="${escapeHtml(item.id)}">${labelChip(item.type && ctx.names.type(item.type))}${name}<span class="id sr-only">${escapeHtml(item.id)}</span>${item.retired ? '<span class="flag">Retired</span>' : ''}</span></th><td>${stateMark(item)}</td><td>${item.priorityLevel ? escapeHtml(ctx.names.priority(item.priorityLevel)) : '<span class="is-none">Not set</span>'}</td><td>${dueMark(item, ctx.today)}</td>${delivery}</tr>`;
    };
    // A retired record is not open, whatever state it was retired in: it stands with the closed ones, as it does in the workspace.
    const over = item => closed(item) || !!item.retired;
    const open = shown.filter(item => !over(item)).sort(byDue), ended = shown.filter(over).sort(byDue);
    const body = `${open.length ? `<tbody>${open.map(row).join('')}</tbody>` : ''}${ended.length ? `<tbody><tr><th colspan="6" scope="rowgroup" class="fig-sub">Closed</th></tr>${ended.map(row).join('')}</tbody>` : ''}`;
    const head = `<div class="card-head">${title}<p class="aside">Each line counts the ${tasks} linked to that ${one}. Closing is a person's decision; no line closes by itself</p></div>`;
    // The table is read a page at a time once scripts run. Every row is in the file, so without scripts and on paper they are all there.
    const pager = place => renderPager(place, { list: `${kinds.one(INITIATIVE_KIND)} list`, previous: 'Previous page', next: 'Next page', counted: true });
    return `<section class="initiatives card" aria-labelledby="initiatives-heading">${head}${complete ? '' : withheldNotice(kinds.one(INITIATIVE_KIND), figures, kinds)}${pager('top')}<div class="table-scroll" tabindex="0" role="group" aria-label="${kinds.many(INITIATIVE_KIND)}: a table that scrolls sideways when it is wider than the page"><table class="fig-table"><thead><tr><th scope="col">${kinds.one(INITIATIVE_KIND)}</th><th scope="col">Status</th><th scope="col">Priority level</th><th scope="col">Due date</th><th scope="col">Delivery</th><th scope="col" class="num">Rate</th></tr></thead>${body}</table></div>${pager('bottom')}${complete ? METER_LEGEND : ''}</section>`;
}

// Paging for the list of records, above and below it. It appears once scripts are on and the matching records outgrow the
// shortest page; the page always carries every record, so reading without scripts and print list them all.
function renderPager(place, { list = 'Work list', previous = 'Previous', next = 'Next', counted = false } = {}) {
    const below = place === 'bottom';
    const step = (by, name, mark) => `<button type="button" class="pager-step" data-page-step="${by}" aria-label="${name}">${icon(mark)}</button>`;
    // Above the list: what is shown at the start, then the choice of rows, a rule and the two steps. Under it: the steps
    // around the page they are on. A pager that counts states the rows shown and their total above its list.
    const status = '<p class="pager-status" data-page-status></p>';
    const choice = `<label class="pager-length"><span class="sr-only">Rows per page</span><select data-page-length>${PAGE_LENGTHS.map(length => `<option value="${length}">${length} per page</option>`).join('')}<option value="0">All</option></select>${icon('chevron')}</label>`;
    const steps = `${step(-1, previous, 'chevronLeft')}${below ? status : ''}${step(1, next, 'chevronRight')}`;
    return `<nav class="pager enhancement-only" data-pager="${place}" aria-label="${list} pages${below ? ', below the list' : ''}" hidden>${below ? steps
        : `${counted ? '<p class="pager-count" data-page-count role="status" aria-live="polite"></p>' : status}<div class="pager-controls">${choice}<span class="pager-rule" aria-hidden="true"></span><span class="pager-steps">${steps}</span></div>`}</nav>`;
}

// What a copy that is not the full form says about itself, and what a size budget did to it.
function renderFormNotice(mode, budget, kinds) {
    const fitted = !budget?.maxBytes ? '' : budget.met === false ? ` The size budget of ${budget.maxBytes} bytes was not met; this is the smallest form.`
        : budget.requested && budget.requested !== mode ? ` Written in this form to fit the size budget of ${budget.maxBytes} bytes.` : '';
    const read = `in the workspace, or with the task tool: <span class="mono">${escapeHtml(READ_ONE)}</span>`;
    const full = `For the full version, which reads without scripts: <span class="mono">${escapeHtml(READ_FULL)}</span>`;
    if (mode === 'packed') return `<p class="notice">${icon('alert')}<span><strong>Compact version.</strong> The list below has one row for each record. A record's outcome, criteria, links, proof and history are packed in this file and open from its row when scripts are on. ${full}.${escapeHtml(fitted)}</span></p><p id="packed-unavailable" class="hint" role="status" hidden><strong>Record detail could not be opened in this browser.</strong> The counts and every listed record below are complete. Open this file in a current browser, or read a record in the full version, ${read}.</p>`;
    if (mode === 'none') return `<p class="notice">${icon('alert')}<span><strong>Compact version without record detail.</strong> Detail not in this copy. Every inspected record is still listed, without its outcome, criteria, links, proof and history. Read a record in the full version (<span class="mono">${escapeHtml(READ_FULL)}</span>), in the report of its ${kinds.word(1, AREA_KIND)} or ${kinds.word(1, INITIATIVE_KIND)}, ${read}.${escapeHtml(fitted)}</span></p>`;
    return '';
}

function renderReport(snapshot, manifest, options = {}) {
    const stated = snapshot?.vocabulary?.lifecycles;
    shownLifecycles = stated && typeof stated === 'object' && !Array.isArray(stated) ? stated : VOCABULARY.lifecycles;
    try { return renderSnapshot(snapshot, manifest, options); } finally { shownLifecycles = VOCABULARY.lifecycles; }
}

function renderSnapshot(snapshot, manifest, options = {}) {
    if (!snapshot || typeof snapshot !== 'object' || !manifest || typeof manifest !== 'object') throw new TypeError('Report needs a snapshot and ownership manifest');
    const mode = DETAIL_FORMS.includes(options.detail) ? options.detail : 'full';
    const items = array(snapshot.items), members = array(snapshot.members);
    const name = snapshot.project?.name || 'Selected project';
    const scope = scopeOf(snapshot);
    // A scoped snapshot carries that scope's own records: the area or initiative and what it holds. A project's carries
    // every inspected record.
    const own = scope ? new Set([scope.itemId, ...array(scope.memberIds)]) : null;
    const scoped = own ? items.filter(item => own.has(item.id)) : items;
    const ctx = renderContext(snapshot, items, scoped, mode);
    const { byId, kinds } = ctx;
    const tasks = kinds.lowerMany(DELIVERY_KIND);
    // The list of records: a scope's eligible tasks, or every inspected record of a project.
    const listed = scope ? items.filter(item => ctx.eligible.has(item.id) && byId.get(item.id) === item) : items;
    // "Where work stands" counts the kinds that move along the delivery lifecycle.
    const standing = scope ? listed : items.filter(inDelivery);
    const states = [...new Set(scoped.map(item => String(item.state || 'unknown')))].sort();
    const unknownOwners = [...new Set(scoped.map(item => item.assigneeId).filter(id => id && !members.some(member => member.id === id)))];
    const owners = [{ id: UNASSIGNED, displayName: 'Unassigned' }, ...members, ...unknownOwners.map(id => ({ id, displayName: `Unknown member (${id})` }))];
    const byName = (a, b) => a.displayName.localeCompare(b.displayName, 'en', { sensitivity: 'base' }) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    const directory = [...[...members].sort(byName).map(member => ({ ...member, label: memberLabel(member.id, members) })),
        ...unknownOwners.sort().map(id => ({ id, label: `Unknown member (${id})`, unknown: true })), { id: UNASSIGNED, label: 'Unassigned' }];
    const unavailable = snapshot.coverage === 'unavailable' || snapshot.profile?.available === false;
    const limited = unavailable || snapshot.coverage !== 'complete';
    const unreadable = unreadableSource(snapshot);
    // Page text already: fixed sentences, a scope name that arrives escaped and kind words that arrive escaped.
    const standfirst = unreadable ? 'This project cannot be read. No work is counted or listed.'
        : unavailable ? 'Inspection unavailable. No work could be read for this profile.'
        : limited ? 'Partly inspected. Only the records that could be read are shown.'
            // A scoped snapshot counts delivery for that area or initiative only and carries its own records.
            : scope ? `Delivery counted for ${ctx.scopeName}. The primary list contains exactly its eligible ${tasks}; this snapshot carries this ${kinds.word(1, scope.kind)}'s own records, and other work is outside it.`
                : 'Whole project. What was accepted, what is proved, and what waits on a person.';
    const policy = `default-src 'none'; script-src ${REPORT_INLINE_SOURCES.script}; style-src ${REPORT_INLINE_SOURCES.style}; base-uri 'none'; form-action 'none'; object-src 'none'; connect-src 'none'`;
    const cards = mode === 'none' ? '' : scoped.map(item => renderDetail(item, ctx)).join('');
    const paths = mode === 'none' ? '' : renderPathConcerns(ctx, scoped);
    const inline = mode === 'full';
    // The page script reads the form from here; the packed form also carries its record detail here.
    const data = { detail: mode, ...(mode === 'packed' ? { packed: zlib.gzipSync(JSON.stringify({ cards, paths }), { level: 9 }).toString('base64') } : {}) };
    const emptyDetail = mode === 'none' ? 'This copy lists records without their detail.' : 'Select a row to open its outcome, criteria and proof.';
    const scriptless = mode === 'full' ? 'Every inspected record and its detail is listed above; filtering and person selection require scripts. Use the browser Find command and native record links to inspect work.'
        : mode === 'packed' ? 'Every inspected record is listed above. Record detail in this copy is packed and needs scripts; the full version reads without them.'
            : 'Every inspected record is listed above. Record detail is not in this copy.';
    const closing = mode === 'full' ? 'It is one self-contained file: it loads nothing from the network and stays readable with scripts turned off.'
        : mode === 'packed' ? 'It is one self-contained file and loads nothing from the network. Its record detail is packed and opens with scripts turned on.'
            : 'It is one self-contained file and loads nothing from the network. It carries the overview and the list of records, without record detail.';
    return `<!doctype html>
<!-- task-track-generated:v1 -->
<html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${escapeHtml(policy)}"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><title>${escapeHtml(name)}: work snapshot</title><style>${STYLES}</style></head>
<body><a class="skip" href="#work">Skip to Work</a><main class="page"><header class="masthead"><div class="masthead-row"><div class="masthead-title"><p class="kicker">${icon('lock')}<span>Work snapshot, read-only</span></p><h1>${escapeHtml(name)}</h1><p class="standfirst">${standfirst}</p></div><div class="actions enhancement-only"><button type="button" id="print-report">${icon('print')}Print snapshot</button></div></div><div class="rule" aria-hidden="true"></div>
${renderSource(snapshot, items, unavailable)}${renderFormNotice(mode, options.budget, kinds)}</header>
<div class="split">${renderSummary(snapshot, kinds)}${renderHealth(snapshot.health, scope ? kinds.one(scope.kind) : '')}</div>
${standing.length ? renderStanding(standing, kinds, !scope) : ''}${renderAreaFigures(ctx)}${renderInitiativeFigures(ctx)}${scoped.length ? renderKinds(scoped, kinds, !limited) : ''}${renderWaiting(ctx, listed)}
${renderPeople(scoped, directory)}
<section id="work" class="work-region section" aria-labelledby="work-heading"><div class="section-head"><h2 id="work-heading" tabindex="-1">Work</h2><div class="aside"><p id="work-count" role="status" aria-live="polite" data-coverage="${escapeHtml(snapshot.coverage || 'unknown')}">${listed.length} ${scope ? `eligible delivery ${tasks}` : 'inspected records'}${limited ? '; project total unknown' : ''}</p>${items.length ? '<p class="enhancement-only">Filters never change the delivery count above</p>' : ''}${mode === 'full' || !items.length ? '' : `<p><strong>Compact version of this list.</strong> ${mode === 'packed' ? 'A row opens its record\'s detail when scripts are on' : 'Record detail is not in this copy'}</p>`}</div></div>
<div class="filters enhancement-only"${items.length ? '' : ' hidden'}><label class="field field--search">Search work<input id="work-search" type="search" maxlength="2000" autocomplete="off" placeholder="${mode === 'none' ? 'Title or identity' : 'Title, identity or outcome'}"></label><label class="field">Responsible person<select id="work-owner"><option value="">All people</option>${owners.map(member => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.displayName)}${member.active === false ? ' (inactive)' : ''}</option>`).join('')}</select></label><label class="field">Recorded state<select id="work-state"><option value="">All states</option>${states.map(state => `<option value="${escapeHtml(state)}">${escapeHtml(capital(stateName(state)))}</option>`).join('')}</select></label><label class="check"><input id="work-remaining" type="checkbox"><span>Remaining work</span></label><button type="button" id="clear-filters">Clear filters</button></div>
<p id="interaction-error" class="hint" hidden>Filtering could not start. All inspected records remain available below. Reopen this report to retry.</p>
${listed.length ? `${renderPager('top')}<div class="table"><div class="table-head" aria-hidden="true"><span>Work</span><span>State</span><span>Responsible</span><span>Proof</span><span>Acceptance</span></div><ul class="work-list" aria-label="${scope ? `Eligible delivery ${tasks}` : 'Work list'}">${listed.map(item => renderRow(item, ctx)).join('')}</ul></div>${renderPager('bottom')}`
        : `<div class="empty"><p class="empty-heading">${limited ? 'Work inspection is limited' : scope ? `No eligible delivery ${tasks}` : 'No tracked work yet'}</p><p>${limited ? 'Work could not be fully inspected. Check the limits below and regenerate; zero inspected records is not proof of an empty project.' : scope ? `This fixed scope has no eligible delivery ${tasks}. Inspect excluded, supporting or outside records separately; no percentage applies.` : `No work records were found in the selected snapshot. Capture ${kinds.a(INITIATIVE_KIND)} or ${kinds.word(1, DELIVERY_KIND)} through the project tool or assistant, then regenerate this report.`}</p></div>`}<p id="filter-empty" class="hint" hidden>No records match these filters. Clear filters to inspect all records in this snapshot.</p>
<div class="record-details" aria-label="Inspected records, separate from fixed delivery scope"${items.length ? '' : ' hidden'}><p id="detail-empty" class="note enhancement-only">${emptyDetail}</p><p id="selected-outside" class="hint" role="status" data-read="${escapeHtml(READ_ONE)}" hidden>Selected item is outside the current filters. Clear filters to see its work row.</p>${inline ? cards : ''}</div>
${renderScopeLists(ctx)}<div class="path-panels">${inline ? paths : ''}</div>
${items.length ? `<p class="note"><span class="enhancement-only">Remaining work means unaccepted eligible ${tasks}: the ${tasks} the delivery scope above counts as not accepted. </span>This snapshot cannot save changes; use the project tool or the managed workspace.</p>` : ''}</section>
${renderLimits(snapshot, unavailable && !unreadable, { mode, own, budget: options.budget })}
<noscript><p class="hint">Scripts are disabled. ${scriptless}</p></noscript><footer class="footer"><p>Changes are made in each member's own checkout and shared through the team's Git process. This report neither writes records nor shares local proposals. ${closing}</p></footer></main>
<script id="task-track-manifest" type="application/json">${inlineJson(manifest)}</script>
<script id="task-track-data" type="application/json">${inlineJson(data)}</script>
<script>${SCRIPT}</script></body></html>`;
}

module.exports = { renderReport, REPORT_INLINE_SOURCES };
