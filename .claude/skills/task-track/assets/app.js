'use strict';

// A session credential arrives once and is removed from the URL. It is kept for this tab only, so a reload
// stays attached; it ends with the tab or with the workspace process, whichever comes first.
(() => {
  const fragment = new URLSearchParams(location.hash.slice(1));
  let sessionToken = fragment.get('session');
  // A launch link carries a single-use code instead; it is exchanged for the session once this page runs.
  const launchCode = fragment.get('attach');
  const SESSION_KEY = 'workspace-session';
  const kept = () => { try { return sessionStorage.getItem(SESSION_KEY); } catch { return null; } };
  const keep = value => {
    try { if (value) sessionStorage.setItem(SESSION_KEY, value); else sessionStorage.removeItem(SESSION_KEY); }
    catch { /* Storage is unavailable: the session then lasts until this page is reloaded. */ }
  };
  const directItem = fragment.get('item');
  const directOwner = fragment.get('owner');
  history.replaceState(null, '', location.pathname);
  // Opening a launch address in a tab that already shows this page only changes the fragment; load it afresh so it is read.
  addEventListener('hashchange', () => { if (/(?:^#|&)(?:session|attach)=/.test(location.hash)) location.reload(); });
  const main = document.getElementById('view');
  const feedback = document.getElementById('feedback');
  const notices = document.getElementById('notices');
  const navigation = document.getElementById('navigation');
  const sourcePanel = document.getElementById('source-panel');
  const checkpointDialog = document.getElementById('draft-checkpoint');
  const noFilters = () => ({ search: '', owner: '', status: '', kind: '', remaining: false, untagged: false });
  // The Work kind choice that stands for every kind on the delivery line.
  const DELIVERY_WORK = '__delivery';
  // How many rows one page of an Overview list holds: the first is the length a list opens with, and 0 is all of them.
  const LIST_PAGE_LENGTHS = [10, 20, 50, 0];
  // The lists read a page at a time: the initiatives, the areas at the top of the project, and the areas inside a scope.
  const firstPages = () => ({ initiatives: { page: 1, length: LIST_PAGE_LENGTHS[0] }, areas: { page: 1, length: LIST_PAGE_LENGTHS[0] }, inside: { page: 1, length: LIST_PAGE_LENGTHS[0] } });
  const state = {
    session: null, snapshot: null, scope: {}, view: 'Overview', layout: 'list', selectedKey: null,
    filters: noFilters(),
    form: null, busy: false, uncertain: null, result: null, message: '',
    compare: null, checkpoint: null, returnFocus: null, limit: 100, recovery: null, stopped: '',
    panel: false, report: null, entryPath: [], contexts: [], concerns: null,
    // Which areas of the Overview tree the reader opened or closed, the whole-project figure last read, and the initiative whose linked work is listed in full.
    treeOpen: new Map(), projectFigure: null, linkedAll: null,
    // The page of each paged list the reader is on and how many rows a page holds. Both outlive a redraw and a reread.
    listPages: firstPages(),
    // The status report last shown in this page, and whether it must be brought up to date before it is shown again.
    reportDoc: null, reportDue: false
  };
  // The tracker owns the words. Kinds, the lifecycle of each kind with its states and usual steps, levels, types,
  // priority levels and link relations, and the name shown for each, arrive with every read; this page keeps no list
  // of its own. What stays here is what a view decides: order, the names of actions, sentences.
  const vocabulary = () => state.snapshot?.vocabulary || {};
  // A read that carries no words comes from a workspace started with another framework version. Nothing in it can be
  // named, so it is refused whole: no view is drawn from it.
  const READ_VERSION = 3;
  const UNSUPPORTED = 'This workspace response is unsupported. Relaunch the project tool with the matching framework version.';
  const usable = snapshot => snapshot?.schemaVersion === READ_VERSION && !!snapshot.vocabulary?.labels?.states
    && [snapshot.vocabulary.kinds, snapshot.vocabulary.states].every(words => Array.isArray(words) && words.length > 0)
    && [snapshot.vocabulary.lifecycles, snapshot.vocabulary.kindLifecycles, snapshot.vocabulary.transitions].every(table => !!table && typeof table === 'object');
  const named = (table, word) => vocabulary().labels?.[table]?.[word] || word;
  const kinds = () => vocabulary().kinds || [];
  const kindName = kind => named('kinds', kind);
  const kindWords = kind => [kindName(kind), named('kindsPlural', kind)].map(name => name.toLocaleLowerCase());
  // The delivery kind in the project's words, one and many, and "a task" / "an initiative" for a sentence that names one record.
  const taskWords = () => kindWords(vocabulary().deliveryKind);
  const aKind = kind => `${/^[aeiou]/i.test(kindWords(kind)[0]) ? 'an' : 'a'} ${kindWords(kind)[0]}`;
  const capital = value => value.replace(/^./, letter => letter.toLocaleUpperCase());
  const listWords = words => words.length > 1 ? `${words.slice(0, -1).join(', ')} and ${words.at(-1)}` : words.join('');
  const labels = () => vocabulary().labels?.states || {};
  const areaKind = () => vocabulary().areaKind;
  const initiativeKind = () => vocabulary().initiativeKind;
  const isDelivery = item => item.kind === vocabulary().deliveryKind;
  const isArea = item => !!item && item.kind === areaKind();
  const isInitiative = item => !!item && item.kind === initiativeKind();
  // A lifecycle line, read from the tracker's block. Blocked work waits beside In progress; canceled work is off the
  // line. Every other state of a lifecycle is a stop on its line, in the tracker's order.
  const SIDING = 'blocked';
  const SIDING_HOST = 'in_progress';
  const OFF_LINE = 'canceled';
  const lifecycleName = item => item?.lifecycle || vocabulary().kindLifecycles?.[item?.kind];
  const lifecycleStates = name => vocabulary().lifecycles?.[name]?.states || [];
  const stationsOf = name => lifecycleStates(name).filter(key => key !== SIDING && key !== OFF_LINE);
  const deliveryLine = () => vocabulary().kindLifecycles?.[vocabulary().deliveryKind];
  const deliveryStations = () => stationsOf(deliveryLine());
  const inDelivery = item => lifecycleName(item) === deliveryLine();
  // The usual next states of a record, as the tracker lists them for its lifecycle and state.
  const stepsFrom = item => vocabulary().transitions?.[lifecycleName(item)]?.[item.state] || [];
  // A line that has somewhere to go ends at its last stop; work that reached it, or left the line, is closed.
  const lastStop = name => { const line = stationsOf(name); return line.length > 1 ? line.at(-1) : null; };
  const closed = item => item.state === OFF_LINE || item.state === lastStop(lifecycleName(item));
  // The kinds that move along the delivery line, and the kinds that have lines of their own, in the project's words.
  const deliveryKindWords = only => listWords(kinds().filter(kind => vocabulary().kindLifecycles?.[kind] === deliveryLine() && (!only || kind === vocabulary().deliveryKind)).map(kind => kindWords(kind)[1]));
  const otherKindWords = () => listWords(kinds().filter(kind => vocabulary().kindLifecycles?.[kind] !== deliveryLine()).map(kind => kindWords(kind)[1]));
  function kindHelp(kind) {
    const name = kindName(kind).toLocaleLowerCase();
    const one = `${/^[aeiou]/.test(name) ? 'An' : 'A'} ${name}`;
    const tasks = taskWords()[1];
    if (kind === vocabulary().deliveryKind) return `${one} counts toward delivery, one block each.`;
    if (kind === areaKind()) return `${one} is a part of what you build. ${capital(tasks)} tagged to it, or to any ${name} inside it, count for it.`;
    if (kind === initiativeKind()) return `${one} is something to follow as a whole. Its progress counts the ${tasks} linked to it.`;
    return `${one} is tracked outside the delivery count.`;
  }
  // The list reads each line from its last open stop back to its first, then finished work, in the tracker's order of lifecycles.
  function listOrder() {
    const lines = Object.keys(vocabulary().lifecycles || {}).map(stationsOf);
    const open = lines.flatMap(line => (line.length > 1 ? line.slice(0, -1) : [...line]).reverse());
    return [...new Set([...open, ...lines.filter(line => line.length > 1).map(line => line.at(-1))])];
  }
  // States whose mark is a ring. Every other state is drawn filled.
  const RING_STATES = ['draft', 'ready', 'approved', 'active', OFF_LINE];
  const proofNames = { current: 'Proved', stale: 'Proof stale', missing: 'No proof', unknown: 'Proof unknown' };
  // The name of each usual step, by the lifecycle it belongs to and the state it leads to. A step the tracker lists that
  // has no name here is still offered, under a plain one.
  const STEP_NAMES = {
    delivery: { planned: 'Move to planned', ready: 'Review readiness', in_progress: 'Start work', implemented: 'Mark implemented', verifying: 'Request verification', blocked: 'Record blocker', canceled: 'Cancel work' },
    tracker: { approved: 'Approve', committed: 'Commit', done: 'Close as done' },
    area: {}
  };
  function stepName(item, next) {
    const line = lifecycleName(item);
    const end = item.state === lastStop(line);
    // Delivery work keeps the names it has always had: it resumes from a blocker, and reopens from done by the state it returns to.
    if (line === deliveryLine()) {
      if (next === SIDING_HOST && item.state === SIDING) return 'Resume work';
      if (next === SIDING_HOST && end) return 'Reopen in progress';
      if (next === 'planned' && end) return 'Reopen to planned';
    } else if (end && next !== OFF_LINE) return 'Reopen';
    else if (next === OFF_LINE) return `Cancel ${kindWords(item.kind)[0]}`;
    return STEP_NAMES[line]?.[next] || `Change to ${(labels()[next] || next).toLocaleLowerCase()}`;
  }
  const forwardAction = { draft: 'Move to planned', planned: 'Review readiness', ready: 'Start work',
    in_progress: 'Request verification', blocked: 'Resume work', implemented: 'Request verification', verifying: 'Accept work' };
  // The step that leads on a record: for delivery work the forward move of its state, otherwise the first usual step ahead on its line.
  function leadName(item) {
    if (inDelivery(item)) return forwardAction[item.state];
    const line = stationsOf(lifecycleName(item));
    const ahead = stepsFrom(item).find(next => line.indexOf(next) > line.indexOf(item.state));
    return ahead ? stepName(item, ahead) : undefined;
  }
  const cautiousActions = ['Cancel work', 'Retire work', 'Review draft deletion', 'Review deletion', 'Delete entirely'];
  // An action that ends work is drawn with caution: canceling, of any kind, and the ones named above.
  const cautious = action => cautiousActions.includes(action.name) || (action.operation === 'transition' && action.extra?.nextState === OFF_LINE);
  // Work that has ended is outside every active scope; only that work, and an untouched record, can be deleted.
  const ended = item => !!item && (!!item.retired || item.state === OFF_LINE);
  const actionIcons = { Assign: 'person', 'Refine work': 'edit', 'Edit links': 'link', 'Attest record health': 'pulse', 'Record observed proof': 'check' };
  // One sentence per leading action: what the next recorded step is, and what it does not do.
  const nextStops = {
    'Move to planned': ['Next stop: planned work', 'A draft stays out of planning until someone moves it to planned.'],
    'Review readiness': ['Next stop: a readiness review', 'Ready records that you reviewed the scope and acceptance criteria, and that required decisions are resolved.'],
    'Start work': ['Next stop: start the work', 'Starting is its own recorded step. Assignment alone never starts work.'],
    'Request verification': ['Next stop: verification', 'Verifying says the work is ready to be observed against its acceptance criteria. It does not accept the work.'],
    'Resume work': ['Next stop: resume the work', 'Record how the blocker was resolved. The record returns to the state it was blocked in.'],
    'Accept work': ['Next stop: an acceptance decision', 'Every criterion has current passing proof. Accepting is still your own explicit decision; it is never inferred from proof or a state change.'],
    'Record observed proof': ['Next stop: observed proof', 'Acceptance needs current passing proof for every criterion. Record only what you actually observed.'],
    Assign: ['Next stop: someone responsible', 'Nobody is responsible for this record yet. Assigning does not start it.'],
    'Review tracking adoption': ['Next stop: tracking adoption', 'This legacy record keeps its content. Adoption adds tracking metadata after you review the exact change.'],
    'Restore work': ['Next stop: restore or leave retired', 'Restoring returns a retired record to tracked work. Its history and references are kept either way.'],
    Approve: ['Next stop: an approval decision', 'Approving is your own decision and needs the intended outcome stated above. Nothing is approved by itself.'],
    Commit: ['Next stop: a commitment decision', 'Committing says this will be delivered. It is your own decision; it starts no work and changes no figure.']
  };
  const historyPhrases = { create: 'captured this record', update: 'refined it', adopt: 'adopted tracking', assign: 'changed responsibility',
    link: 'changed links', tag: 'changed tags', proof: 'recorded proof', accept: 'accepted the work',
    retire: 'retired it', restore: 'restored it', attest: 'attested record health' };
  // The version of a save request this page writes. The tracker refuses any other and says which it expects.
  const REQUEST_VERSION = 3;
  const PIP_LIMIT = 8;
  const ROW_PIP_LIMIT = 5;
  const BLOCK_LIMIT = 120;
  const DENSE_BLOCKS = 40;
  const LABELLED_BLOCKS = 12;
  const FEW_BLOCKS = 4;
  const GHOST_BLOCKS = 8;
  const QUEUE_LIMIT = 8;
  const HISTORY_LIMIT = 6;
  const REASON_LIMIT = 20;
  const REASONS_SHOWN = 3;
  const PERSON_ROWS = 6;
  // How many records a person's card draws as one block each: more would take more than a few lines of the card.
  const PERSON_BLOCKS = 40;
  const AVATAR_TINTS = 4;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const ICONS = { check: 'M5 12.5l4.5 4.5L19 7.5', refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6', clock: 'M12 7.5V12l3 2M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z',
    alert: 'M12 4l9 16H3zM12 10v4.5M12 17.5v.4', seal: 'M12 3l7 3v5.5c0 4.5-3 7.8-7 9.5-4-1.7-7-5-7-9.5V6z',
    person: 'M12 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5 20a7 7 0 0 1 14 0', plus: 'M12 5v14M5 12h14', arrow: 'M5 12h14M13 6l6 6-6 6',
    chevron: 'M6 9l6 6 6-6', chevronRight: 'M9 6l6 6-6 6', chevronLeft: 'M15 6l-6 6 6 6',
    levelsOpen: 'M7 6l5 5 5-5M7 13l5 5 5-5', levelsClose: 'M7 11l5-5 5 5M7 18l5-5 5 5', close: 'M6 6l12 12M18 6L6 18',
    lock: 'M7 11h10a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2zM8 11V8a4 4 0 0 1 8 0v3',
    list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01', board: 'M4 4h4.5v16H4zM9.75 4h4.5v11h-4.5zM15.5 4h4.5v14h-4.5z',
    search: 'M4 11a7 7 0 1 0 14 0 7 7 0 1 0-14 0M20 20l-3.5-3.5', edit: 'M4 20l1-4L16.5 4.5l3 3L8 19z',
    link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
    pulse: 'M3 12h4l2.5-6 4 12 2.5-6H21', file: 'M7 3h7l5 5v13H7zM14 3v5h5' };
  const clone = value => JSON.parse(JSON.stringify(value));
  const reviewsReadiness = form => form.values.nextState === 'ready'
    || (form.base?.state === 'done' && form.values.nextState === 'in_progress')
    // Verification and further work start from implemented only with a reviewed readiness decision.
    || (form.base?.state === 'implemented' && ['in_progress', 'verifying'].includes(form.values.nextState))
    || (form.values.correction && ['in_progress', 'blocked', 'verifying'].includes(form.values.nextState));
  const itemKey = item => JSON.stringify([item.id, item.ownerPath]);
  const items = () => state.snapshot?.items || [];
  const members = () => state.snapshot?.members || [];
  const selected = () => items().find(item => itemKey(item) === state.selectedKey);
  const memberName = id => id ? (members().find(member => member.id === id)?.displayName || `Unknown member (${id})`) : 'Unassigned';
  const hasRedaction = value => /\[REDACTED(?:-INPUT)?:/i.test(JSON.stringify(value));
  const text = value => value === undefined || value === null ? 'Unknown' : String(value);
  const instant = value => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value || '') ? `${value.slice(0, 10)} ${value.slice(11, 16)} UTC` : text(value);
  const day = value => /^\d{4}-\d{2}-\d{2}/.test(value || '') ? value.slice(0, 10) : text(value);
  const clock = value => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value || '') ? `${value.slice(11, 16)} UTC` : '';
  const initials = name => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => Array.from(part)[0].toUpperCase()).join('') || '?';
  const stateName = item => labels()[item.state] ? item.state : 'other';
  const onLine = item => stationsOf(lifecycleName(item)).includes(item.state) || (item.state === SIDING && lifecycleStates(lifecycleName(item)).includes(SIDING));
  const acceptanceWord = item => item.retired ? 'Retired' : item.acceptance?.accepted ? 'Accepted' : 'Not accepted';
  const counted = (total, one, many) => `${total} ${total === 1 ? one : many}`;
  const sentence = value => `${value}${/[.!?]$/.test(value) ? '' : '.'}`;
  const idTail = id => id.includes('-') ? id.slice(id.lastIndexOf('-') + 1) : id;
  // One index of the read now shown: the record each unique identity names, each area's place in the hierarchy, and the
  // figure the read states for each area and initiative. It is built once per read, so no list rescans every record.
  let indexed = { snapshot: undefined };
  function index() {
    if (indexed.snapshot !== state.snapshot) {
      const totals = new Map();
      for (const item of items()) totals.set(item.id, (totals.get(item.id) || 0) + 1);
      const stated = state.snapshot?.figures?.status === 'complete' ? state.snapshot.figures : null;
      indexed = { snapshot: state.snapshot, unique: new Map(items().filter(item => totals.get(item.id) === 1).map(item => [item.id, item])),
        areas: new Map((state.snapshot?.hierarchy?.areas || []).map(area => [area.id, area])),
        figures: new Map([...(stated?.areas || []), ...(stated?.initiatives || [])].map(entry => [entry.id, entry])) };
    }
    return indexed;
  }
  const hasUniqueId = id => index().unique.has(id);
  const uniqueItem = id => index().unique.get(id);
  const areaInfo = id => index().areas.get(id);
  // Figures are never worked out here: a line prints the one the read states for that area or initiative, or none.
  const figuresStated = () => state.snapshot?.figures?.status === 'complete';
  const figureFor = id => index().figures.get(id);
  const withheldReason = () => String(state.snapshot?.figures?.reason || 'The project was not inspected completely').replace(/\.$/, '');
  const levelRank = level => { const at = (vocabulary().levels || []).indexOf(level); return at < 0 ? (vocabulary().levels || []).length : at; };
  const levelName = level => named('levels', level);
  const typeName = type => named('initiativeTypes', type);
  // What a chip says of a record: the level of an area, the type of an initiative, otherwise its kind.
  const chipText = item => isArea(item) && item.level ? levelName(item.level) : isInitiative(item) && item.type ? typeName(item.type) : kindName(item.kind);
  // A tag is a link the tagged record declares. Its areas and initiatives are read from its own links, each once.
  const tagRelation = kind => Object.keys(vocabulary().tagRoles || {}).find(relation => vocabulary().tagRoles[relation] === kind);
  // Tags have one editor of their own. A relation that tags a record is never offered, listed or sent as a link.
  const isTagRelation = relation => Object.hasOwn(vocabulary().tagRoles || {}, relation);
  const taggedIds = (item, kind) => [...new Set((item?.links || []).filter(link => link && link.relation === tagRelation(kind) && typeof link.itemId === 'string').map(link => link.itemId))];
  // Every area above an area, and every area inside it, whichever way it is reached. A loop in the records ends the walk.
  function reach(id, direction) {
    const found = new Set();
    const pending = [...(areaInfo(id)?.[direction] || [])];
    while (pending.length) {
      const next = pending.pop();
      if (found.has(next) || next === id) continue;
      found.add(next); pending.push(...(areaInfo(next)?.[direction] || []));
    }
    return found;
  }
  const areasAbove = id => reach(id, 'parentAreaIds');
  const areasInside = id => reach(id, 'childAreaIds');
  // The way down to an area when the reader did not choose one. It is taken only where there is exactly one: an area
  // that sits inside several areas is entered by itself, and no parent is guessed for it.
  function defaultPath(id) {
    const path = [id];
    while (areaInfo(path[0])?.parentAreaIds?.length === 1 && path.length < CONTEXT_LIMIT) {
      const above = areaInfo(path[0]).parentAreaIds[0];
      if (path.includes(above) || !areaInfo(above)) break;
      path.unshift(above);
    }
    return path;
  }
  // Where an area sits, from the areas it is tagged to: the way down to it when it sits inside one area, each of them
  // by name when it sits inside several, and the top of the project when it sits inside none.
  function areaPlace(id) {
    const parents = areaInfo(id)?.parentAreaIds || [];
    const title = other => uniqueItem(other)?.title || other;
    if (!parents.length) return 'Top of the project';
    const above = parents.length === 1 ? defaultPath(id).slice(0, -1) : [];
    return above.length ? above.map(title).join(' › ') : `In ${listWords(parents.map(title))}`;
  }
  const scopeRecord = () => state.scope.scopeId ? uniqueItem(state.scope.scopeId) : undefined;
  const scopeName = id => { const item = uniqueItem(id); return item ? `${chipText(item)} ${id}: ${item.title}` : `Unavailable scope ${id}`; };
  const scopeLabel = () => state.scope.scopeId ? scopeName(state.scope.scopeId) : 'Whole project';
  // A due date in the words of the page. The read says whether a record is overdue; the page only tells the day of the
  // read from another day. A closed record whose date passed keeps the date and carries no mark.
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const longDay = value => { const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || ''); return match && MONTHS[Number(match[2]) - 1] ? `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]}` : text(value); };
  const readDay = () => String(state.snapshot?.asOf || '').slice(0, 10);
  function dueText(item) {
    if (!item.deadline) return 'No due date';
    if (item.overdue) return `Overdue: was due ${longDay(item.deadline)}`;
    if (item.deadline === readDay()) return `Due today, ${longDay(item.deadline)}`;
    return `${item.deadline < readDay() ? 'Was due' : 'Due'} ${longDay(item.deadline)}`;
  }
  const daysPast = item => Math.round((Date.parse(`${readDay()}T00:00:00Z`) - Date.parse(`${item.deadline}T00:00:00Z`)) / 86400000);
  const sourcePhrase = () => state.snapshot.source?.kind === 'worktree' ? 'your working copy' : state.snapshot.source?.kind === 'shared' ? `pinned ref ${state.snapshot.source.ref}` : 'the selected source';
  const CONTEXT_LIMIT = 64;
  function currentContext() {
    return { scope: clone(state.scope), path: [...state.entryPath], selectedKey: state.selectedKey,
      filters: clone(state.filters), view: state.view === 'Editor' ? 'Work' : state.view, concerns: state.concerns };
  }
  function rememberContext() {
    if (state.contexts.length === CONTEXT_LIMIT) state.contexts.shift();
    state.contexts.push(currentContext());
  }
  // The way the reader came down to a scope: each step is an area that sits directly inside the one before it. An
  // initiative is reached in one step.
  function validPath(path, snapshot = state.snapshot) {
    const areas = snapshot?.hierarchy?.areas || [];
    if (path.length === 1 && !areas.some(area => area.id === path[0])) return (snapshot?.items || []).filter(item => item.id === path[0] && item.kind === snapshot.vocabulary?.initiativeKind).length === 1;
    return path.length > 0 && path.length <= CONTEXT_LIMIT && new Set(path).size === path.length && path.every((id, index) =>
      areas.some(area => area.id === id && (!index || areas.find(parent => parent.id === path[index - 1])?.childAreaIds?.includes(id))));
  }
  function selectWork(item) {
    if (state.selectedKey !== itemKey(item)) rememberContext();
    state.selectedKey = itemKey(item); state.view = 'Work';
  }
  // Scopes the page to one area or one initiative, or back out to the whole project when no identity is given. `path`
  // is the way the reader came in; without one the page takes the first way down.
  function enterScope(id, path, view = 'Overview') {
    checkpoint(async () => {
      if (id && path && (!validPath(path) || path.at(-1) !== id)) return announce('Path unavailable. Choose a current area or initiative; no parent was inferred.');
      const previous = currentContext();
      const rest = { ...state.scope };
      delete rest.scopeId;
      if (!await reread(id ? { ...rest, scopeId: id } : rest)) return;
      state.entryPath = !id ? [] : path && validPath(path) ? [...path] : defaultPath(id);
      if (state.contexts.length === CONTEXT_LIMIT) state.contexts.shift();
      state.contexts.push(previous); state.selectedKey = null; state.filters = noFilters(); state.concerns = null; state.view = view; landFeedback(); render(true);
    });
  }
  function backContext() {
    checkpoint(async () => {
      const previous = state.contexts.at(-1);
      if (!previous || !await reread(previous.scope)) return;
      state.contexts.pop(); state.entryPath = previous.path.length && validPath(previous.path) ? previous.path : previous.scope.scopeId ? defaultPath(previous.scope.scopeId) : [];
      if (previous.path.length && !validPath(previous.path)) state.message = 'Path unavailable after reread. No removed or guessed parent is used.';
      state.selectedKey = items().some(item => itemKey(item) === previous.selectedKey) ? previous.selectedKey : null;
      state.filters = previous.filters; state.view = previous.view; state.concerns = null;
      if (previous.concerns) {
        state.busy = true; render();
        try { state.concerns = await api('/api/concerns', { query: { schemaVersion: 1, itemIds: previous.concerns.scope.itemIds, paths: previous.concerns.scope.paths },
          ...(state.scope.ref !== undefined ? { ref: state.scope.ref } : {}) }); }
        catch (error) { state.message = `Linked concerns unavailable after reread: ${error.message}. The restored scope and draft are retained.`; }
        finally { state.busy = false; }
      }
      landFeedback(); render(true);
    });
  }
  function contextNavigation() {
    const scope = scopeRecord();
    return element('nav', { class: 'strip strip--plain', 'aria-label': 'Chosen scope path' }, [
      paragraph(`Delivery scope: ${scopeLabel()}`, 'note'),
      state.entryPath.length > 1 ? paragraph(`Scope path: ${state.entryPath.map(scopeName).join(' / ')}`, 'note') : null,
      selected() ? paragraph(`Inspecting: ${selected().id}`, 'note') : null,
      state.contexts.length ? button('Back to previous context', backContext, { class: 'quiet' }) : null,
      scope ? button(`Open ${scopeName(scope.id)}`, () => openItem(scope), { class: 'quiet' }) : null]);
  }
  const sourceToneOf = snapshot => snapshot.coverage === 'unavailable' ? 'stop' : snapshot.source?.kind === 'worktree' ? 'live' : 'pinned';
  const filtersActive = () => state.view === 'My work' || JSON.stringify(state.filters) !== JSON.stringify(noFilters());

  function element(tag, attributes = {}, children = []) {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(attributes)) {
      if (value === undefined || value === null || value === false) continue;
      if (name === 'class') node.className = value;
      else if (name === 'text') node.textContent = text(value);
      else if (name === 'onClick') node.addEventListener('click', value);
      else if (name === 'onChange') node.addEventListener('change', value);
      else if (name === 'onInput') node.addEventListener('input', value);
      else if (name === 'checked' || name === 'disabled' || name === 'required') node[name] = !!value;
      else node.setAttribute(name, String(value));
    }
    for (const child of Array.isArray(children) ? children : [children]) {
      if (child !== null && child !== undefined) node.append(child instanceof Node ? child : document.createTextNode(text(child)));
    }
    return node;
  }
  const paragraph = (value, className) => element('p', { text: value, class: className });
  const heading = value => element('h2', { text: value, tabindex: '-1' });
  const mono = value => element('span', { class: 'mono', text: value });
  const actions = (...children) => element('div', { class: 'actions' }, children);
  function icon(name) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    for (const [key, value] of [['class', 'icon'], ['viewBox', '0 0 24 24'], ['aria-hidden', 'true'], ['focusable', 'false']]) svg.setAttribute(key, value);
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', ICONS[name]);
    svg.append(path);
    return svg;
  }
  // An icon never becomes part of a button's name: the label keeps its own element beside it.
  function button(name, action, options = {}) {
    const { icon: before, iconAfter, ...attributes } = options;
    const node = element('button', { type: 'button', onClick: action, disabled: state.busy, ...attributes });
    if (before) node.append(icon(before));
    if (name !== '') node.append(before || iconAfter ? element('span', { text: name }) : name);
    if (iconAfter) node.append(icon(iconAfter));
    return node;
  }
  function sheet(id, title, aside, className = 'sheet') {
    return element('section', { class: className, 'aria-labelledby': id }, element('div', { class: 'sheet-head' },
      [element('h3', { id, text: title }), aside ? paragraph(aside, 'note') : null]));
  }
  // A card whose caption stands under its heading, so the end of the heading line is free for the card's own small
  // controls. The heading can take focus: a step through the card's list hands the reader to it.
  function captionedSheet(id, title, caption, className) {
    return element('section', { class: className, 'aria-labelledby': id }, element('div', { class: 'sheet-top' }, [
      element('div', { class: 'sheet-head sheet-head--tools' }, element('h3', { id, text: title, tabindex: '-1' })), caption ? paragraph(caption, 'note') : null]));
  }
  function pageHead(title, context, ...tools) {
    return element('div', { class: 'page-head' }, [element('div', { class: 'page-title' }, [heading(title), context instanceof Node ? context : context ? paragraph(context, 'page-context') : null]), ...tools]);
  }
  const pageLead = (...children) => element('div', { class: 'page-lead' }, children);
  function details(name, value, id) {
    return element('details', { id }, [element('summary', { text: name }), element('pre', { text: JSON.stringify(value, null, 2) })]);
  }
  // Each cell is one recorded fact: a small label, the value with its mark, then any supporting lines.
  function factCells(cells, className) {
    return element('dl', { class: className }, cells.map(([name, value, ...support]) => element('div', {}, [element('dt', { class: 'label', text: name }),
      element('dd', { class: 'fact-value' }, value), ...support.filter(Boolean).map(line => line instanceof Node ? element('dd', { class: 'fact-extra' }, line) : element('dd', { class: 'fact-sub', text: line }))])));
  }
  const dot = (name, variant) => element('span', { class: `dot dot--${name}${variant ? ` dot--${variant}` : ''}`, 'aria-hidden': 'true' });
  // Initials on a tint taken from the member's place in the configured list, so neighbours differ. The tint carries no meaning and never changes with their work.
  function avatar(id, size) {
    const sized = size ? ` avatar--${size}` : '';
    if (!id) return element('span', { class: `avatar avatar--none${sized}`, 'aria-hidden': 'true', title: 'Unassigned' }, icon('person'));
    const place = members().findIndex(member => member.id === id);
    const tint = place < 0 ? 'unknown' : `tint${place % AVATAR_TINTS}`;
    return element('span', { class: `avatar avatar--${tint}${sized}`, 'aria-hidden': 'true', title: memberName(id), text: initials(memberName(id)) });
  }
  // Four separately recorded facts get four separate marks: state, responsible person, proof and acceptance.
  const kindMark = item => element('span', { class: `kind ${isDelivery(item) ? 'kind--delivery' : 'kind--label'}`, text: chipText(item) });
  // The level of an area or the type of an initiative beside its name in a list. An area with no level carries no chip.
  const labelChip = value => value ? element('span', { class: 'kind kind--label', text: value }) : null;
  // One meter beside an area or initiative line, and on each step of a scope path, sized by the counts the read states:
  // accepted with current proof, accepted with proof not current, not accepted. Each part differs in shape as well as
  // colour, a part with no task is left out, and the counts are the meter's name.
  function meter(entry, small) {
    const parts = [['verified', entry.currentlyVerified, 'with current proof'], ['stale', entry.accepted - entry.currentlyVerified, 'with proof not current'], ['open', entry.remaining, 'not accepted yet']].filter(([, total]) => total > 0);
    const [task, tasks] = taskWords();
    const node = element('span', { class: `meter${small ? ' meter--s' : ''}`, role: 'img', 'aria-label': `${entry.accepted} of ${counted(entry.total, task, tasks)} accepted: ${parts.map(([, total, name]) => `${total} ${name}`).join(', ')}` });
    for (const [name, total] of parts) {
      const part = element('span', { class: `meter-part meter-part--${name}` });
      // Set through the style object: the page policy admits no inline style attribute.
      part.style.flexGrow = String(total);
      node.append(part);
    }
    return node;
  }
  const meterLegend = () => element('ul', { class: 'legend' }, [['verified', 'accepted with current proof'], ['accepted', 'accepted, proof not current'], ['open', 'not accepted yet']]
    .map(([name, words]) => element('li', {}, [element('span', { class: `block block--${name}`, 'aria-hidden': 'true' }), words])));
  const rate = entry => Number.isFinite(entry.percentage) ? `${entry.percentage.toFixed(1)}%` : '';
  // What an area or an initiative with no eligible task says in place of a figure.
  const noFigure = kind => kind === initiativeKind() ? `No linked ${taskWords()[1]} yet, so no percentage applies. That is not the same as zero percent.` : `No ${taskWords()[1]} yet, so no percentage applies`;
  function dueMark(item) {
    if (item.overdue) return element('span', { class: 'tag tag--blocked' }, [icon('alert'), element('span', { text: dueText(item) })]);
    return element('span', { class: `due${!item.deadline ? ' due--none' : item.deadline === readDay() ? ' due--today' : ''}`, text: dueText(item) });
  }
  const stateWord = item => element('span', { class: `state-word is-${stateName(item)}` }, [stationsOf(lifecycleName(item)).length > 1 || item.state === OFF_LINE ? dot(stateName(item), 's') : null, labels()[item.state] || item.state]);
  // One area or initiative a record is tagged to. It is a control: it scopes the Overview to that record.
  function tagPick(id) {
    const target = uniqueItem(id);
    if (!target) return element('span', { class: 'tag', text: `${id}: not uniquely available` });
    const word = isArea(target) ? target.level && levelName(target.level) : target.type && typeName(target.type);
    const node = button('', () => enterScope(id), { class: 'tag-pick', 'aria-label': `${word ? `${word} ` : ''}${target.title}: show its progress` });
    node.append(element('span', { class: `tag${isInitiative(target) ? ' tag--initiative' : ''}` }, [word ? element('span', { class: 'tag-word', text: word }) : null, target.title]));
    return node;
  }
  // A control that reads as the name it carries: an area or initiative title in a list.
  const nameLink = (name, action, spoken) => button(name, action, { class: 'name-link', 'aria-label': spoken });
  const proofStatus = item => proofNames[item.verification?.status] ? item.verification.status : 'unknown';
  const proofWord = item => item.criteria?.length ? proofNames[proofStatus(item)] : 'No criteria';
  function pips(item, limit = PIP_LIMIT) {
    const count = item.criteria?.length || 0;
    return [element('span', { class: 'pips', 'aria-hidden': 'true' }, Array.from({ length: Math.min(count, limit) }, () => element('span', { class: 'pip' }))),
      count > limit ? element('span', { text: `+${count - limit}` }) : null];
  }
  const proofMark = item => element('span', { class: `mark proof proof--${proofStatus(item)}` }, [...pips(item), element('span', { text: proofWord(item) })]);
  const sealMark = item => item.acceptance?.accepted ? element('span', { class: 'seal' }, [icon('check'), 'Accepted'])
    : element('span', { class: 'seal seal--none', text: 'Not accepted' });
  const acceptDot = (accepted, small) => element('span', { class: `accept accept--${accepted ? 'yes' : 'no'}${small ? ' accept--s' : ''}`, 'aria-hidden': 'true',
    title: accepted ? 'Accepted' : 'Not accepted' }, accepted ? icon('check') : []);
  const flag = (value, tone) => element('span', { class: `flag${tone ? ` flag--${tone}` : ''}`, text: value });

  // What the selected source says about the vocabulary it stores. A pinned ref is read-only whatever it stores, so only
  // the checkout is told to migrate.
  const stored = () => state.snapshot?.vocabulary?.project || null;
  // The migrate command and the two sentences that give it, each written once. A command word is set apart so a view can
  // mark it; the plain form is the same sentence for a line of text.
  const MIGRATE = 'migrate --root <checkout>';
  const MIGRATION_STEPS = ['Preview the migration with the task tool: ', [`${MIGRATE} --dry-run`], '. Then run it without ', ['--dry-run'], '.'];
  const MIGRATION_RERUN = [' The task tool command is ', [MIGRATE], '.'];
  const marked = parts => parts.map(part => Array.isArray(part) ? mono(part[0]) : part);
  const migrationSteps = MIGRATION_STEPS.flat().join('');
  const needsMigration = () => stored()?.code === 'MIGRATION_REQUIRED' && state.scope.ref === undefined;
  // Two vocabularies at once, or a migration that stopped part-way: nothing was read as work, so no view has a true thing to show.
  const unreadable = () => !!stored()?.code && stored().storedVersion === null;
  // The reason a source gives for holding no readable work, with the command when running it again is the way on.
  const unreadableReason = project => [`${project.reason}.`, ...(project.code === 'MIGRATION_IN_PROGRESS' ? marked(MIGRATION_RERUN) : [])];
  function writableReason(item) {
    if (needsMigration()) return `${stored().reason}. ${migrationSteps}`;
    if (unreadable() && state.scope.ref === undefined) return `${stored().reason}.`;
    if (!state.session?.writable || !state.session.actor) return 'This session is read-only. Launch a writable workspace with your configured stable member identity to make changes.';
    if (state.scope.ref !== undefined || state.snapshot?.source?.kind !== 'worktree') return 'The selected shared snapshot is read-only. Choose the current checkout to propose changes.';
    if (!state.snapshot?.profile?.available) return 'This project’s native tracking capability is unavailable. Original records are preserved; no replacement format is created.';
    if (state.snapshot.coverage !== 'complete') return 'Work cannot be changed while inspection is incomplete. Resolve the listed diagnostics, then reread the current checkout.';
    if (item && !hasUniqueId(item.id)) return 'This identity has multiple owners. Resolve the duplicate records before making changes.';
    if (state.uncertain) return 'An earlier save has an unknown outcome. Retry that original operation before starting another change.';
    if (state.recovery) return 'A confirmed removal still has pending completion recovery. Retry deletion recovery before starting another change.';
    return '';
  }
  // The actions this session may take on one record, in the order they are offered, and the one that leads.
  // The record sheet and the Overview both read this list, so a record offers the same steps wherever it is shown.
  function offeredActions(item) {
    const reason = writableReason(item);
    const available = operation => !reason && state.snapshot.profile.capabilities?.includes(operation);
    const offered = [];
    const add = (name, operation, extra) => { if (available(operation)) offered.push({ name, operation, extra }); };
    const line = lifecycleName(item);
    if (item.legacy) add('Review tracking adoption', 'adopt');
    else if (item.retired) { add('Restore work', 'restore'); add('Delete entirely', 'delete'); }
    else {
      add('Assign', 'assign'); add('Refine work', 'update'); add('Edit tags', 'tag'); add('Edit links', 'link');
      // The usual steps are the tracker's: the states it lists after this one in this record's lifecycle.
      const allowed = item.state === SIDING ? [item.blocker?.resumeState, OFF_LINE].filter(Boolean) : stepsFrom(item);
      for (const next of [...new Set(allowed)]) {
        if (next === SIDING_HOST && item.state === 'ready' && (!state.snapshot.ready?.includes(item.id) || !members().some(member => member.id === item.assigneeId && member.active))) continue;
        add(stepName(item, next), 'transition', { nextState: next });
      }
      // Proof and acceptance belong to delivery work only.
      if (inDelivery(item) && item.verification?.criteriaIdentity && item.verification?.sourceIdentity && item.criteria?.length && !hasRedaction(item.criteria)) add('Record observed proof', 'proof');
      if (inDelivery(item) && item.state === 'verifying' && item.verification?.status === 'current') add('Accept work', 'accept');
      if (members().some(member => member.id === state.session.actor && member.active)) add('Attest record health', 'attest');
      // Outside the usual steps: any other state of this record's own lifecycle, such as canceled work taken back to draft.
      if (lifecycleStates(line).includes(item.state) && lifecycleStates(line).length > 1) add('Change state', 'transition', { correction: true });
      add('Retire work', 'retire');
      if (item.state === vocabulary().lifecycles?.[line]?.initial) add(item.state === 'draft' ? 'Review draft deletion' : 'Review deletion', 'delete');
      else if (item.state === OFF_LINE) add('Delete entirely', 'delete');
    }
    // One next step leads: the forward move for this state, else the fact that is still missing.
    const names = offered.map(action => action.name);
    const lead = [item.legacy ? 'Review tracking adoption' : item.retired ? 'Restore work' : leadName(item),
      inDelivery(item) && !item.assigneeId ? 'Assign' : null, item.state === 'verifying' ? 'Record observed proof' : null].find(name => names.includes(name));
    const rank = action => action.name === lead ? 0 : cautious(action) ? 2 : 1;
    return { reason, lead, offered: [...offered].sort((a, b) => rank(a) - rank(b)) };
  }
  function actionButton(action, item, lead) {
    const leading = action.name === lead;
    return button(action.name, () => beginForm(action.operation, item, action.extra), { icon: leading ? undefined : actionIcons[action.name], iconAfter: leading ? 'arrow' : undefined,
      class: leading ? 'primary' : cautious(action) ? 'caution' : undefined });
  }

  // Requests a page may make before it has a session. They carry no credential.
  async function beforeSession(route, body) {
    const response = await fetch(route, { method: body === undefined ? 'GET' : 'POST', headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body), credentials: 'omit', cache: 'no-store' });
    const value = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(value.reason || 'The workspace refused this request.'), { status: response.status, code: value.code });
    return value;
  }

  // A read answers quickly. A status report has no size limit, so writing one for a large project takes far longer, and a
  // save brings the report up to date before it answers. Giving up on a save early would call a saved change unconfirmed,
  // so work that may write the report gets the long wait. A preview writes nothing and keeps the short one.
  const READ_WAIT_MS = 12000;
  const REPORT_WRITE_WAIT_MS = 120000;
  const mayWriteReport = (route, body) => route.startsWith('/api/report') || route === '/api/operation' && !body?.preview;
  async function api(route, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), mayWriteReport(route, body) ? REPORT_WRITE_WAIT_MS : READ_WAIT_MS);
    try {
      const response = await fetch(route, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { 'X-Workspace-Session': sessionToken, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        body: body === undefined ? undefined : JSON.stringify(body), credentials: 'omit', cache: 'no-store',
        signal: controller.signal
      });
      let value;
      try { value = await response.json(); }
      catch { throw Object.assign(new Error('The response could not be read. Reread the project or retry the original operation.'), { uncertain: true }); }
      if (!response.ok) throw Object.assign(new Error(value.primary?.reason || value.reason || 'The workspace refused this request. Reread the project and check this session.'), {
        status: response.status, code: value.primary?.code || value.code, value,
        uncertain: response.status >= 500 || !value.primary && value.code === 'IO_FAILURE'
      });
      return value;
    } catch (error) {
      if (error.status || error.uncertain) throw error;
      throw Object.assign(new Error('The workspace did not confirm a response. Check the local server, then retry.'), { uncertain: true });
    } finally { clearTimeout(timer); }
  }

  // A message or a saved card belongs to the action that produced it. It stays on the view that action lands on and
  // leaves when the person starts another request or goes to another view. A follow-up that is still pending stays.
  let feedbackShown = null;
  function dismissFeedback() {
    state.message = '';
    if (!(state.result?.secondary || []).some(item => item.status === 'pending')) state.result = null;
  }
  function settleFeedback() {
    const shown = feedbackShown;
    if (shown && shown.view !== state.view && shown.message === state.message && shown.result === state.result) dismissFeedback();
    feedbackShown = state.message || state.result ? { view: state.view, message: state.message, result: state.result } : null;
  }
  // An action that rereads and then moves to another view lands there: what the reread said is shown on that view.
  function landFeedback() { feedbackShown = null; }
  // Every request the person starts goes through here, so what the last action said gives way to this one.
  function begin() { dismissFeedback(); state.busy = true; render(); }
  function announce(message) { state.message = message; settleFeedback(); renderFeedback(); }
  function statusCard(tone, mark, title, body, follow = []) {
    return element('div', { class: `status status--${tone}` }, [element('div', { class: 'status-main' }, [
      mark ? element('span', { class: 'status-mark', 'aria-hidden': 'true' }, mark) : null,
      element('div', { class: 'status-text' }, [title ? paragraph(title, 'status-title') : null, body ? paragraph(body, 'status-body') : null])]), ...follow]);
  }
  function renderFeedback() {
    const next = [];
    // The pending note floats over the page, and the last message keeps its place unseen, so a request never moves the content under the pointer.
    if (state.busy) next.push(paragraph('Reading or saving this request… No other save can start until it finishes.', 'busy'));
    const cards = [];
    if (state.message) cards.push(state.busy ? element('div', { class: 'status status--held', 'aria-hidden': 'true' }, element('div', { class: 'status-main' }, paragraph(state.message, 'status-body')))
      : statusCard('info', null, null, state.message));
    if (state.result?.primary?.status === 'saved') {
      const result = state.result.primary;
      const follow = (state.result.secondary || []).map(secondary => element('div', { class: `status-follow${secondary.status === 'pending' ? ' status-follow--pending' : ''}` }, [
        paragraph(`${secondary.kind || 'Follow-up'}: ${secondary.status}. ${secondary.reason || ''}`),
        secondary.kind === 'report' && secondary.status === 'pending' ? button('Retry report refresh', refreshReport) : null]));
      cards.push(statusCard('saved', icon('check'), `${result.deleted ? result.ended ? 'Deleted ended work' : 'Deleted draft' : 'Saved'} ${result.itemId} in the local checkout${result.replayed ? ' (original receipt replayed)' : ''}.`,
        'Share it through your team’s Git process.', follow));
    }
    if (state.uncertain) cards.push(statusCard('warn', '?', 'Save outcome unknown.', 'The original request is retained in this page; retrying it checks the original operation receipt and does not start a new intent.',
      [actions(button('Retry original save', retryOriginal, { class: 'strong' }), button('Read current without resaving', () => readCurrentForConflict()))]));
    if (state.recovery) cards.push(statusCard('warn', icon('alert'), 'Draft removal is confirmed; its completion recovery is still pending.', 'Retry only the retained deletion request.',
      [actions(button('Retry deletion recovery', retryDeletionRecovery))]));
    if (cards.length) next.push(element('div', { class: 'status-stack' }, cards));
    // This area is read out as a whole, so it is rewritten only when what it says has changed.
    if (next.length === feedback.childNodes.length && next.every((node, index) => node.isEqualNode(feedback.childNodes[index]))) return;
    feedback.replaceChildren(...next);
  }
  // Conditions of the selected source that hold until the reader changes it. They sit outside the live status area so a rerender does not announce them again.
  function renderNotices() {
    notices.replaceChildren();
    const snapshot = state.snapshot;
    const banner = (tone, mark, title, body, ...tools) => element('div', { class: `banner banner--${tone}` }, [
      element('span', { class: 'banner-mark', 'aria-hidden': 'true' }, icon(mark)),
      element('div', { class: 'banner-text' }, [element('p', { class: 'banner-title' }, title), element('p', { class: 'banner-body' }, body)]), ...tools]);
    const reasons = () => button('See the reasons', showInspectionReasons);
    // On Changes the same action is already in the comparison card.
    const current = () => state.view === 'Changes' ? null : button('Inspect current checkout', inspectCurrent);
    const reported = snapshot.diagnostics?.length || 0;
    const reportedLine = `${counted(reported, 'reason is', 'reasons are')} reported.`;
    const pinned = state.scope.ref !== undefined;
    if (pinned && snapshot.coverage === 'unavailable') {
      notices.append(banner('alert', 'alert', [mono(state.scope.ref), ' could not be read'], [`Nothing from the current checkout is shown in its place. ${reportedLine}`, ...(unreadable() ? [' ', ...unreadableReason(stored())] : [])], reasons(), current()));
    } else {
      // A record still stored in the earlier words is named here, so the reader need not open the reasons to find it.
      const strays = (snapshot.diagnostics || []).filter(diagnostic => diagnostic.code === 'EARLIER_VOCABULARY_RECORD');
      const found = diagnostic => [diagnostic.itemId, diagnostic.path].filter(Boolean).join(' at ');
      const strayLine = strays.length ? ` ${strays[0].reason}: ${strays.slice(0, REASONS_SHOWN).map(found).join(', ')}${strays.length > REASONS_SHOWN ? ` and ${strays.length - REASONS_SHOWN} more` : ''}.` : '';
      if (unreadable()) notices.append(banner('alert', 'alert', 'No work can be read from this project',
        unreadableReason(stored())));
      else if (snapshot.coverage !== 'complete') notices.append(banner('alert', 'alert', snapshot.coverage === 'unavailable' ? 'Inspection is unavailable' : 'Inspection is incomplete',
        `${snapshot.coverage === 'unavailable' ? 'No work can be counted or changed in this scope.' : 'Counts cover inspected work only, no percentage is shown, and nothing can be changed until this is resolved.'} ${reportedLine}${strayLine}`, reasons()));
      if (needsMigration()) notices.append(banner('pinned', 'lock', 'Migration required: this project is read-only',
        ['It stores the earlier vocabulary. Work is shown in the current words and every count is unchanged. ', ...marked(MIGRATION_STEPS)]));
      if (pinned) notices.append(banner('pinned', 'lock', ['You are reading ', mono(state.scope.ref)], 'A pinned ref is read-only. Inspect the current checkout to propose changes.', current()));
    }
    notices.hidden = !notices.childElementCount;
  }
  function showInspectionReasons() {
    checkpoint(() => {
      state.view = 'Overview'; render();
      const reasons = document.getElementById('inspection-reasons');
      if (reasons) { reasons.open = true; reasons.querySelector('summary').focus(); }
    });
  }

  function checkpoint(next, allowKeep = true) {
    if (state.busy) return;
    if (!state.form?.dirty && !state.uncertain) return next();
    state.checkpoint = next;
    state.returnFocus = document.activeElement;
    document.getElementById('checkpoint-keep').disabled = !allowKeep;
    document.getElementById('checkpoint-discard').disabled = !!state.uncertain;
    document.getElementById('checkpoint-copy').textContent = state.uncertain
      ? 'A save outcome is unknown. Keep its draft and original request, then retry the receipt. Discarding this request is unavailable until its outcome is confirmed.'
      : 'This change has not been saved. Your draft stays in this open page only. Closing or reloading the page loses it.';
    checkpointDialog.showModal();
  }
  function closeCheckpoint(choice) {
    const next = state.checkpoint;
    state.checkpoint = null;
    checkpointDialog.close();
    state.returnFocus?.focus();
    if (choice === 'discard') state.form = null;
    if (choice !== 'return') next?.();
  }
  document.getElementById('checkpoint-return').addEventListener('click', () => closeCheckpoint('return'));
  document.getElementById('checkpoint-keep').addEventListener('click', () => closeCheckpoint('keep'));
  document.getElementById('checkpoint-discard').addEventListener('click', () => closeCheckpoint('discard'));
  checkpointDialog.addEventListener('cancel', event => { event.preventDefault(); closeCheckpoint('return'); });
  window.addEventListener('beforeunload', event => {
    if (state.form?.dirty || state.uncertain || state.recovery) { event.preventDefault(); event.returnValue = ''; }
  });
  // Paper carries what a screen shows a part of at a time: every disclosure open and every row of a list read in
  // pages, with its total. The screen returns to what it showed once the sheet is made, and a reader who stood on a
  // row of such a list is put back on it, or on the heading of its list when that row was drawn again.
  // The lists read in pages of the view now shown; the view empties this when it is drawn again.
  const pagedLists = new Set();
  window.addEventListener('beforeprint', () => {
    document.querySelectorAll('details').forEach(node => { node.dataset.printOpen = String(node.open); node.open = true; });
    const stood = document.activeElement;
    for (const list of pagedLists) if (list.above.isConnected) { list.stood = list.heading.closest('section')?.contains(stood) ? stood : null; list.whole(); }
  });
  window.addEventListener('afterprint', () => {
    document.querySelectorAll('details').forEach(node => { node.open = node.dataset.printOpen === 'true'; delete node.dataset.printOpen; });
    for (const list of pagedLists) if (list.above.isConnected) {
      list.paint();
      if (list.stood && document.activeElement !== list.stood) (list.stood.isConnected ? list.stood : list.heading).focus();
      list.stood = null;
    }
  });
  sourcePanel.addEventListener('keydown', event => { if (event.key === 'Escape') togglePanel('scope-ref'); });

  function navigate(view) { checkpoint(() => { state.view = view; if (view === 'Report') state.reportDue = true; render(true); }); }
  function showWork(filters) { checkpoint(() => { state.filters = { ...noFilters(), ...filters }; state.limit = 100; state.view = 'Work'; render(true); }); }
  function openItem(item) {
    checkpoint(() => {
      selectWork(item); render();
      main.querySelector('.record-sheet h3')?.focus();
    });
  }
  function renderNavigation() {
    navigation.parentElement.hidden = !state.session;
    if (!state.session) { navigation.replaceChildren(); return; }
    // A count sits beside the tab name as a badge. The tab keeps its plain name; the count is its description.
    const tab = (name, total, one, many, tone) => {
      const counts = total !== null && total !== undefined;
      const node = button(name, () => navigate(name), { class: 'tab', 'aria-current': state.view === name ? 'page' : undefined, title: counts ? counted(total, one, many) : undefined });
      if (counts) node.append(element('span', { class: `tab-count${tone ? ` tab-count--${tone}` : ''}`, 'aria-hidden': 'true', text: total }));
      return node;
    };
    // A source that could not be read has no count of zero; its tabs carry none.
    const readable = state.snapshot.coverage !== 'unavailable';
    const mine = state.session.actor && readable ? items().filter(item => item.assigneeId === state.session.actor).length : null;
    const differing = compared() ? differences().length : null;
    navigation.replaceChildren(tab('Overview'), tab('Work', readable ? items().length : null, 'record in the selected source', 'records in the selected source'),
      tab('My work', mine, 'record is assigned to you', 'records are assigned to you'), tab('People'),
      tab('Changes', differing, 'record differs from the current checkout', 'records differ from the current checkout', differing ? 'warn' : undefined), tab('Report'));
    if (state.form) navigation.append(button('Unsaved draft', () => { state.view = 'Editor'; render(true); }, { class: 'tab tab--draft', 'aria-current': state.view === 'Editor' ? 'page' : undefined }));
    const canCapture = !writableReason() && state.snapshot.profile?.capabilities?.includes('create');
    navigation.append(button('Capture work', () => beginForm('create'), { class: 'primary nav-action', icon: 'plus', disabled: !canCapture || state.busy }));
  }
  function setRoot(value, hint) {
    const root = document.getElementById('root-context');
    root.replaceChildren(element('bdi', { text: value }));
    if (hint) root.title = hint;
  }
  // The source and scope form opens under the app bar. On Changes the same form is part of the page, so the app-bar controls point at it instead.
  const formInPage = () => state.view === 'Changes' && !unreadable();
  function togglePanel(focusId) {
    if (formInPage()) { document.getElementById(focusId)?.focus(); return; }
    state.panel = !state.panel;
    renderContext();
    (state.panel ? document.getElementById(focusId) : document.querySelector(`[data-opens="${focusId}"]`))?.focus();
  }
  function inspectCurrent() { checkpoint(() => { state.panel = false; reread(state.scope.scopeId ? { scopeId: state.scope.scopeId } : {}); }); }
  function renderContext() {
    const snapshot = state.snapshot;
    const onChanges = formInPage();
    if (onChanges) state.panel = false;
    document.getElementById('project-name').textContent = snapshot.project?.name || 'Team work';
    setRoot(`Checkout: ${state.session.root}`, state.session.root);
    const opener = (focusId, children) => {
      const node = button('', () => togglePanel(focusId), { class: 'selector', 'data-opens': focusId, 'aria-controls': onChanges ? 'scope-form' : 'source-panel', 'aria-expanded': onChanges ? undefined : String(state.panel) });
      node.append(...children, icon('chevron'));
      return node;
    };
    const label = String(snapshot.source?.label || 'Selected source unavailable');
    const cut = label.includes(';') ? label.indexOf(';') : label.length;
    const sourceTone = sourceToneOf(snapshot);
    const coverageTone = { complete: 'good', partial: 'warn' }[snapshot.coverage] || 'stop';
    document.getElementById('source-context').replaceChildren(
      opener('scope-select', [element('span', { class: 'selector-text', title: scopeLabel() }, [element('span', { class: 'selector-label', text: 'Scope' }), ' ', scopeLabel()])]),
      opener('scope-ref', [element('span', { class: `state-dot state-dot--${sourceTone}`, 'aria-hidden': 'true' }), element('span', { class: 'selector-text', title: label }, [label.slice(0, cut),
        element('span', { class: 'selector-label', text: label.slice(cut) }), snapshot.source?.ref ? ' ' : null, snapshot.source?.ref ? mono(snapshot.source.ref) : null])]),
      element('span', { class: `pill pill--${coverageTone}` }, [icon(snapshot.coverage === 'complete' ? 'check' : 'alert'), element('span', { text: `Coverage: ${snapshot.coverage}` })]));
    // The read time sits beside the button, not inside it, so the button's name still contains everything its label shows.
    document.getElementById('session-tools').replaceChildren(element('span', { class: 'reread' }, [
      button('Reread', () => checkpoint(() => reread()), { icon: 'refresh', 'aria-label': 'Reread project', 'aria-describedby': snapshot.asOf ? 'read-at' : undefined }),
      snapshot.asOf ? element('span', { id: 'read-at', class: 'reread-time' }, [element('span', { class: 'visually-hidden', text: `Read at ${day(snapshot.asOf)} ` }), clock(snapshot.asOf)]) : null]));
    const readOnly = !!writableReason();
    const actor = state.session.actor;
    document.getElementById('actor-context').replaceChildren(avatar(actor, 'm'), element('span', { class: 'actor-text' }, [
      element('strong', { class: 'actor-name', text: actor ? members().find(member => member.id === actor)?.displayName || 'Unknown member' : 'No write actor' }), actor ? ' ' : null, actor ? element('span', { class: 'actor-id', text: `(${actor})` }) : null, ' ',
      element('span', { class: `actor-mode${readOnly ? ' actor-mode--warn' : ''}`, text: readOnly ? 'Read-only for this scope' : 'Can save locally' }), ' ',
      element('span', { class: 'actor-remote', text: `Remote freshness: ${snapshot.source?.remoteFreshness || 'unknown'}` })]));
    sourcePanel.hidden = !state.panel;
    sourcePanel.replaceChildren();
    if (state.panel) sourcePanel.append(element('div', { class: 'panel-head' }, [element('h2', { class: 'eyebrow', text: 'Source and scope' }), mono(state.session.root)]), scopeControls(),
      actions(button('Close', () => togglePanel('scope-ref'), { class: 'quiet' })));
  }
  // Redrawing replaces the control that has focus. It is found again by a key that survives the redraw: its id, or its
  // place among the same-named controls of its region. A caret keeps its position.
  const focusRegions = () => [main, navigation, feedback, notices, sourcePanel, document.getElementById('source-context'), document.getElementById('session-tools')];
  const focusName = node => node.getAttribute('aria-label') || node.closest('label')?.textContent || node.textContent || '';
  const sameNamed = (region, tag, name) => [...region.querySelectorAll(tag)].filter(peer => focusName(peer) === name);
  function focusKey(node) {
    const region = node && focusRegions().find(candidate => candidate !== node && candidate.contains(node));
    if (!region) return null;
    const key = node.id ? { id: node.id } : { region, tag: node.tagName, name: focusName(node) };
    if (!node.id) key.index = sameNamed(region, key.tag, key.name).indexOf(node);
    if (node.matches('input, textarea')) key.caret = [node.selectionStart, node.selectionEnd, node.selectionDirection];
    return key;
  }
  // The control a request disabled is held here until the request ends and it can take focus again.
  let heldFocus = null;
  function restoreFocus(key) {
    // A control that was not redrawn still has focus.
    if (focusKey(document.activeElement)) return null;
    const target = key.id ? document.getElementById(key.id) : sameNamed(key.region, key.tag, key.name)[key.index];
    // Returning focus to a control must not scroll the page away from where the person is reading.
    target?.focus({ preventScroll: true });
    if (target && document.activeElement === target) {
      if (key.caret) { try { target.setSelectionRange(...key.caret); } catch { /* This kind of input has no caret to place. */ } }
      return null;
    }
    if (state.busy) return key;
    // The control is gone: the reader is put at the top of the view that replaced it.
    main.querySelector('h2')?.focus();
    return null;
  }
  // The page stops showing a workspace it cannot name: the message, a way to try again, and nothing read before it.
  // A draft and an unconfirmed save stay in this page and return when the workspace opens again.
  function stop(message) {
    Object.assign(state, { stopped: message, session: null, snapshot: null, scope: {}, compare: null, report: null, reportDoc: null, concerns: null,
      panel: false, entryPath: [], contexts: [], selectedKey: null, projectFigure: null, linkedAll: null, listPages: firstPages() });
  }
  function renderStopped(message) {
    feedback.replaceChildren(); notices.replaceChildren(); notices.hidden = true; sourcePanel.replaceChildren(); sourcePanel.hidden = true;
    document.getElementById('session-tools').replaceChildren();
    main.replaceChildren(heading('Project could not be opened'), paragraph(message, 'notice'), actions(button('Retry opening project', initialize, { disabled: false })));
    document.getElementById('source-context').textContent = 'No project opened';
    document.getElementById('actor-context').textContent = 'No actor established';
  }
  function render(focus = false) {
    if (state.stopped) { renderNavigation(); main.setAttribute('aria-busy', 'false'); renderStopped(state.stopped); return; }
    const focusBefore = focus ? null : focusKey(document.activeElement) || heldFocus;
    settleFeedback(); renderFeedback(); renderNavigation();
    main.setAttribute('aria-busy', String(state.busy));
    if (!state.snapshot) return;
    // The figure of the whole project is kept from the last unscoped read, for the first step of a scope path.
    if (!state.scope.scopeId && state.snapshot.metrics) state.projectFigure = { fingerprint: state.snapshot.fingerprint, ref: state.scope.ref, metrics: state.snapshot.metrics };
    renderContext(); renderNotices();
    // The report frame stays in the page while its view is shown: a frame taken out of the page loads its document again.
    const keptFrame = state.view === 'Report' && !unreadable() && reportFrame?.parentNode === main ? reportFrame : null;
    for (const child of [...main.childNodes]) if (child !== keptFrame) child.remove();
    pagedLists.clear();
    if (state.view === 'Editor' && state.form) renderEditor();
    else if (unreadable()) renderUnreadable();
    else if (state.view === 'Overview') renderOverview();
    else if (state.view === 'People') renderPeople();
    else if (state.view === 'Changes') renderChanges();
    else if (state.view === 'Report') renderReport();
    else renderWork();
    if (focus) main.querySelector('h2')?.focus();
    heldFocus = focusBefore ? restoreFocus(focusBefore) : null;
    // Opening the report and rereading the project each make the shown report due; it is brought up to date once per cause.
    if (state.view === 'Report' && state.reportDue && !state.busy && !unreadable()) loadReport();
  }

  // One selector for the delivery scope: the whole project, an area listed under the areas it sits inside, or an initiative.
  function scopeControls() {
    const container = element('form', { id: 'scope-form', class: 'scope-form' });
    const ref = element('input', { id: 'scope-ref', value: state.scope.ref || '', maxlength: 200, autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false' });
    const title = id => uniqueItem(id)?.title || id;
    const areas = [];
    const listed = new Set();
    // Each area is listed once, under the first area that leads to it, with the way down to it as its name.
    const walk = (id, above) => {
      if (listed.has(id) || !uniqueItem(id)) return;
      listed.add(id); areas.push([id, `${[...above, id].map(title).join(' › ')} (${id})`]);
      for (const child of areaInfo(id)?.childAreaIds || []) walk(child, [...above, id]);
    };
    const known = state.snapshot.hierarchy?.areas || [];
    for (const area of known.filter(entry => !entry.parentAreaIds?.some(parent => areaInfo(parent)))) walk(area.id, []);
    for (const area of known) walk(area.id, []);
    const initiatives = items().filter(item => isInitiative(item) && hasUniqueId(item.id)).map(item => [item.id, `${chipText(item)}: ${item.title} (${item.id})`]);
    const group = (name, entries) => entries.length ? element('optgroup', { label: name }, entries.map(([value, label]) => element('option', { value, text: label }))) : null;
    const select = element('select', { id: 'scope-select' }, [element('option', { value: '', text: 'Whole project' }),
      group(named('kindsPlural', areaKind()), areas), group(named('kindsPlural', initiativeKind()), initiatives)]);
    select.value = state.scope.scopeId || '';
    const inspect = () => checkpoint(async () => {
      const previous = currentContext();
      const scope = { ...(ref.value.trim() ? { ref: ref.value.trim() } : {}), ...(select.value ? { scopeId: select.value } : {}) };
      const fromPanel = state.panel;
      if (!await reread(scope)) return;
      if (state.contexts.length === CONTEXT_LIMIT) state.contexts.shift();
      state.contexts.push(previous); state.panel = false; state.entryPath = scope.scopeId && uniqueItem(scope.scopeId) ? defaultPath(scope.scopeId) : [];
      state.concerns = null; state.selectedKey = null; render();
      // The panel closed behind the reader: they return to the control that opened it.
      if (fromPanel) document.querySelector('[data-opens="scope-select"]')?.focus();
    });
    // Inspecting is this form's submit action, so Enter in the ref field runs it.
    container.append(labelledField('Shared local Git ref (optional)', ref), labelledField('Delivery scope', select),
      actions(button('Inspect selected scope', undefined, { type: 'submit' }),
        button('Inspect current checkout', inspectCurrent, { class: 'quiet' })),
      paragraph(`${capital(kindWords(areaKind())[1])} are listed under the ${kindWords(areaKind())[1]} they sit inside, then ${kindWords(initiativeKind())[1]}. A selected Git ref is read-only and must already exist locally. This app does not fetch, commit or push.`, 'note'));
    container.addEventListener('submit', event => { event.preventDefault(); inspect(); });
    return container;
  }
  // One block per eligible task. The counted statement stays authoritative: nothing is drawn unless the blocks agree with it.
  function deliveryBlocks(metrics) {
    if (metrics.total > BLOCK_LIMIT) return [];
    const byId = new Map(items().map(item => [item.id, item]));
    const eligible = metrics.eligibleIds.map(id => byId.get(id)).filter(Boolean);
    const groups = { verified: [], accepted: [], awaiting: [], open: [] };
    for (const item of eligible) {
      const proved = item.verification?.status === 'current';
      groups[item.acceptance?.accepted ? (proved ? 'verified' : 'accepted') : item.state === 'verifying' && proved ? 'awaiting' : 'open'].push(item);
    }
    if (eligible.length !== metrics.total || groups.verified.length !== metrics.currentlyVerified
      || groups.verified.length + groups.accepted.length !== metrics.accepted) return [];
    const names = { verified: 'accepted with current proof', accepted: 'accepted, proof not current', awaiting: 'proved, waiting for acceptance', open: 'not accepted yet' };
    const marks = { verified: 'check', accepted: 'clock', awaiting: 'seal' };
    const present = Object.keys(names).filter(name => groups[name].length);
    const labelled = metrics.total <= LABELLED_BLOCKS;
    const density = metrics.total > DENSE_BLOCKS ? ' blocks--dense' : metrics.total <= FEW_BLOCKS ? ' blocks--few' : '';
    return [element('div', { class: `blocks${density}`, role: 'img',
      'aria-label': `${metrics.total} ${taskWords()[1]}, one block each: ${present.map(name => `${groups[name].length} ${names[name]}`).join('; ')}` },
    present.flatMap(name => groups[name].map(item => element('span', { class: 'block-cell', title: `${item.id}: ${item.title}` }, [
      element('span', { class: `block block--${name}` }, marks[name] ? icon(marks[name]) : []), labelled ? element('span', { class: 'block-id', text: idTail(item.id) }) : null])))),
    element('ul', { class: 'legend' }, present.map(name => element('li', {}, [element('span', { class: `block block--${name}`, 'aria-hidden': 'true' }),
      element('span', {}, [element('strong', { text: groups[name].length }), ` ${names[name]}`])])))];
  }
  function deliveryCard(metrics) {
    const card = element('section', { class: 'sheet wide', 'aria-labelledby': 'delivery-heading' }, element('h3', { id: 'delivery-heading', class: 'eyebrow', text: 'Delivery' }));
    if (!metrics) {
      card.append(paragraph('Delivery unknown', 'hero-title'),
        paragraph('Progress is unavailable for this project profile. Inspect the reasons below; no empty-project conclusion can be drawn.', 'hero-copy'));
      return card;
    }
    const complete = metrics.coverage === 'complete' && state.snapshot.coverage === 'complete';
    const percentage = complete && Number.isFinite(metrics.percentage) ? `${metrics.percentage.toFixed(1)}%` : 'Unknown; no complete nonempty denominator';
    const [task, tasks] = taskWords();
    const ledger = `${metrics.total} eligible unique ${tasks}; ${metrics.canceled} canceled and ${metrics.retired} retired excluded. ${metrics.accepted} historical scoped acceptance decisions; `
      + `${counted(metrics.currentlyVerified, `accepted ${task}`, `accepted ${tasks}`)} with proof that still applies; ${counted(metrics.remaining, `eligible ${task}`, `eligible ${tasks}`)} not accepted. Accepted percentage: ${percentage}.`;
    const tools = actions(button('Inspect all work', () => navigate('Work'), { class: 'quiet' }));
    const scopeKind = state.snapshot.scope?.kind;
    // A scoped figure says what it counts: an area takes everything tagged to it or inside it, an initiative what is linked to it.
    const scopedLevel = scopeRecord()?.level;
    const counts = scopeKind === areaKind() ? `Counts every ${task} tagged to this ${scopedLevel ? levelName(scopedLevel).toLocaleLowerCase() : kindWords(areaKind())[0]} or to ${aKind(areaKind())} inside it, each once. `
      : scopeKind === initiativeKind() ? `Counts the ${tasks} linked directly to this ${kindWords(initiativeKind())[0]}. ` : '';
    let caption = `${counts}${ledger} List filters do not change this denominator.`;
    if (complete && metrics.total) {
      card.append(element('div', { class: 'hero' }, [
        element('p', { class: 'hero-count' }, [element('span', { class: 'hero-figure', text: metrics.accepted }), element('span', { class: 'hero-unit', text: `of ${counted(metrics.total, task, tasks)} accepted` })]),
        element('p', { class: 'hero-rate' }, [element('strong', { text: percentage }), element('span', { text: 'accepted in this exact scope' })])]), ...deliveryBlocks(metrics));
    } else if (complete) {
      card.append(element('div', { class: 'hero-lead' }, [paragraph('No delivery scope yet', 'hero-title'),
        paragraph(`Delivery counts ${tasks}, one block each. This scope has none, so there is no percentage to show. That is not the same as zero percent.`, 'hero-copy')]),
      element('div', { class: 'blocks blocks--ghost', 'aria-hidden': 'true' }, Array.from({ length: GHOST_BLOCKS }, () => element('span', { class: 'block block--ghost' }))));
      const excluded = metrics.canceled || metrics.retired ? ` ${metrics.canceled} canceled and ${metrics.retired} retired ${tasks} are excluded.` : '';
      caption = `Your first ${task} becomes the first block. ${capital(listWords(kinds().filter(kind => kind !== vocabulary().deliveryKind).map(kind => kindWords(kind)[1])))} are tracked too, but they sit outside this count.${excluded} Accepted percentage: ${percentage}.`;
    } else {
      card.append(element('div', { class: 'hero-lead' }, [paragraph('Delivery unknown', 'hero-title'),
        paragraph('Inspection is incomplete, so no delivery blocks are drawn. The counts below cover inspected work only.', 'hero-copy')]));
    }
    const canCapture = !writableReason() && state.snapshot.profile.capabilities?.includes('create');
    if (metrics.total || !complete) tools.append(button('Inspect remaining work', () => showWork({ remaining: true }), { class: 'primary', iconAfter: 'arrow' }));
    else if (canCapture) tools.append(button(`Capture ${aKind(vocabulary().deliveryKind)}`, () => beginForm('create', undefined, { kind: vocabulary().deliveryKind }), { class: 'primary', icon: 'plus' }));
    card.append(element('div', { class: 'sheet-foot' }, [paragraph(caption, 'caption'), tools]));
    return card;
  }
  // Health is attested on the record that owns the selected scope: the area or initiative the page is scoped to, else
  // the project's configured owner. The card is named for that owner.
  function healthCard() {
    const health = state.snapshot.health;
    const scoped = scopeRecord();
    const owner = health?.itemId ? uniqueItem(health.itemId) : scoped;
    const name = scoped ? kindName(scoped.kind) : 'Project';
    if (health?.status === 'attested') {
      const attest = owner ? offeredActions(owner).offered.find(action => action.operation === 'attest') : null;
      const who = health.displayName || health.ownerId;
      return element('section', { class: 'health health--attested side', 'aria-labelledby': 'health-heading' }, [
        element('h3', { id: 'health-heading', class: 'eyebrow', text: `${name} health, owner-attested` }),
        paragraph(health.assessment, 'health-headline'), paragraph(health.reason, 'health-reason'),
        element('div', { class: 'health-owner' }, [element('span', { class: 'avatar avatar--m avatar--plain', 'aria-hidden': 'true', text: initials(who) }),
          element('div', { class: 'health-who' }, [element('strong', { text: `${who} (${health.ownerId}), health owner` }), element('span', { text: `Observed ${instant(health.observedAt)} for ${health.itemId}` })])]),
        element('div', { class: 'health-foot' }, [paragraph('A dated assessment for this exact scope owner. Delivery progress and proof never set it.', 'note'),
          attest ? button('Attest again', () => beginForm('attest', owner)) : null])]);
    }
    return element('section', { class: 'health health--unknown side', 'aria-labelledby': 'health-heading' }, [
      element('h3', { id: 'health-heading', class: 'eyebrow', text: `${name} health` }), paragraph('Unknown', 'hero-title'),
      paragraph(`${health?.reason || 'No dated owner attestation supplied'}. Health is a dated assessment by one named owner, so activity and progress can never stand in for it.`, 'health-reason'),
      owner ? element('div', { class: 'health-hint health-foot' }, [paragraph(`The health owner is ${owner.id}. Record a dated assessment on that record.`, 'note'), button('Open health owner', () => openItem(owner))])
        : state.scope.scopeId ? null : element('div', { class: 'health-hint' }, [paragraph('The project health owner is the record named by this project config key:', 'note'), element('span', { class: 'health-key', text: 'taskTracking.healthOwnerId' })])]);
  }
  function kindBreakdown(records) {
    const totals = new Map();
    for (const item of records) totals.set(item.kind, (totals.get(item.kind) || 0) + 1);
    return [...kinds().filter(kind => totals.has(kind)), ...[...totals.keys()].filter(kind => !kinds().includes(kind))]
      .map(kind => counted(totals.get(kind), ...kindWords(kind))).join(', ');
  }
  // The delivery lifecycle line. It counts the kinds that move along it; areas and initiatives have lines of their own
  // and are counted in their own lists.
  function lifecycleLine() {
    const records = items().filter(inDelivery);
    const open = records.filter(item => !item.retired);
    const inState = key => open.filter(item => item.state === key);
    const blocked = inState(SIDING).length;
    const stations = deliveryStations();
    const line = element('ol', { class: 'line' });
    line.style.setProperty('--stops', String(stations.length));
    // A stop opens Work on exactly the records it counts: that state, among the kinds on this line.
    const show = status => showWork({ status, kind: DELIVERY_WORK });
    for (const key of stations) {
      const held = inState(key);
      const station = button('', () => show(key), { class: `station${held.length ? '' : ' station--none'}`, 'aria-label': `${labels()[key]}: ${held.length} records. Show them in Work.` });
      station.append(element('span', { class: 'count', text: held.length }), element('span', { class: 'dot-zone' }, dot(key)), element('span', { class: 'station-name', text: labels()[key] }));
      const cell = element('li', {}, [station, held.length ? element('span', { class: 'station-kinds', text: kindBreakdown(held) }) : null]);
      if (key === SIDING_HOST && blocked) cell.append(element('span', { class: 'siding' }, [element('span', { class: 'siding-hook', 'aria-hidden': 'true' }),
        button(`${blocked} blocked`, () => show(SIDING))]));
      line.append(cell);
    }
    const own = lifecycleStates(deliveryLine());
    const off = [[inState(OFF_LINE).length, 'canceled'], [records.length - open.length, 'retired'], [open.filter(item => !own.includes(item.state)).length, 'in another recorded state']]
      .filter(([total]) => total).map(([total, name]) => `${total} ${name}`);
    const section = sheet('line-heading', 'Where work stands', `${counted(open.filter(onLine).length, 'open record', 'open records')} by recorded state, counting ${deliveryKindWords()} only. ${capital(otherKindWords())} are not counted here.${off.length ? ` Off the line: ${off.join(', ')}.` : ''}`);
    section.append(line);
    return section;
  }
  const openButton = item => button('Open', () => openItem(item), { 'aria-label': `Open ${item.id}: ${item.title}` });
  // A waiting row offers the one decision it is waiting for when this session may take it, and opens the record otherwise.
  const waitingDecisions = { accept: ['Decide', 'Decide on', 'primary'], assign: ['Assign', 'Assign'] };
  function waitingAction(item, operation) {
    const action = operation ? offeredActions(item).offered.find(candidate => candidate.operation === operation) : null;
    if (!action) return openButton(item);
    const [name, spoken, className] = waitingDecisions[operation];
    return button(name, () => beginForm(action.operation, item, action.extra), { class: className, 'aria-label': `${spoken} ${item.id}: ${item.title}` });
  }
  const responsible = id => [avatar(id), element('span', { class: 'visually-hidden', text: `Responsible: ${memberName(id)}` })];
  function waitingRecords() {
    const waiting = [];
    for (const item of items()) {
      if (item.retired || item.state === 'canceled') continue;
      const proved = item.verification?.status === 'current';
      if (item.state === 'verifying' && proved && !item.acceptance?.accepted) waiting.push([item, 'verifying', 'seal', 'Proved, not accepted', 'Every criterion has current passing proof. Acceptance is a separate decision.', 'accept']);
      else if (item.acceptance?.accepted && !proved) waiting.push([item, 'stale', 'clock', 'Accepted, proof not current', `${item.verification?.reason || 'Current proof is not established'}. The acceptance stands.`]);
      else if (item.state === 'blocked') waiting.push([item, 'blocked', 'alert', 'Blocked', `${item.blocker?.reason || 'No blocker reason is recorded'}.${item.blocker?.at ? ` Blocked since ${day(item.blocker.at)}.` : ''}`]);
      else if (item.state === 'ready' && !state.snapshot.ready?.includes(item.id)) waiting.push([item, 'plain', 'alert', 'Ready, cannot start', item.prerequisiteReasons?.[0] || 'Current prerequisites are unresolved.']);
      else if (item.state === 'ready' && !item.assigneeId) waiting.push([item, 'plain', 'person', 'Ready, unassigned', 'Nobody is responsible yet, so it cannot start.', 'assign']);
    }
    const section = sheet('waiting-heading', 'Waiting on a person', waiting.length ? `${counted(waiting.length, 'record', 'records')} the tool will not move by itself` : null, 'sheet wider');
    if (!waiting.length) { section.append(paragraph('Nothing in this scope is waiting on a decision, a blocker or an owner.', 'note')); return section; }
    section.append(element('ul', { class: 'queue' }, waiting.slice(0, QUEUE_LIMIT).map(([item, tone, mark, name, why, operation]) => element('li', {}, [
      element('span', { class: `tag${tone === 'plain' ? '' : ` tag--${tone}`}` }, [icon(mark), element('span', { text: name })]),
      element('span', { class: 'queue-text' }, [element('span', { class: 'queue-title', text: item.title }), element('span', { class: 'queue-why', text: why })]),
      ...responsible(item.assigneeId), waitingAction(item, operation)]))));
    if (waiting.length > QUEUE_LIMIT) section.append(paragraph(`${waiting.length - QUEUE_LIMIT} more records are waiting. Open Work to see them all.`, 'note'));
    return section;
  }
  function readyRecords() {
    const byId = new Map(items().map(item => [item.id, item]));
    const ready = (state.snapshot.ready || []).map(id => byId.get(id)).filter(Boolean);
    const section = sheet('ready-heading', 'Ready to start', `${counted(ready.length, 'record', 'records')} with every prerequisite met`, 'sheet narrow');
    const who = item => item.assigneeId ? `${memberName(item.assigneeId)} is responsible.` : 'Nobody is responsible yet.';
    if (ready.length) {
      const [next, ...rest] = ready.slice(0, QUEUE_LIMIT);
      section.append(element('div', { class: 'next-record' }, [
        element('div', { class: 'next-record-top' }, [element('span', {}, [element('span', { class: 'next-record-title', text: next.title }), element('span', { class: 'row-context' }, [kindMark(next), element('span', { class: 'id', text: next.id })])]), ...responsible(next.assigneeId)]),
        element('div', { class: 'next-record-foot' }, [element('span', { text: `Every prerequisite is met. ${who(next)}` }), openButton(next)])]));
      if (rest.length) section.append(element('ul', { class: 'queue queue--plain' }, rest.map(item => element('li', {}, [
        element('span', { class: 'queue-text' }, [element('span', { class: 'queue-title', text: item.title }), element('span', { class: 'row-context' }, [kindMark(item), element('span', { class: 'id', text: item.id })])]),
        ...responsible(item.assigneeId), openButton(item)]))));
    } else section.append(paragraph('No record is ready to start in this scope.', 'note'));
    // The snapshot lists every record that is not ready. Only delivery work that has not started yet belongs under this question.
    const notStarted = ['ready', 'planned', 'draft'];
    const held = (state.snapshot.excluded || []).filter(entry => notStarted.includes(byId.get(entry.itemId)?.state) && inDelivery(byId.get(entry.itemId)) && !byId.get(entry.itemId).retired)
      .sort((a, b) => notStarted.indexOf(byId.get(a.itemId).state) - notStarted.indexOf(byId.get(b.itemId).state));
    if (held.length) {
      const row = entry => element('li', {}, [element('span', { text: byId.get(entry.itemId).title }), element('span', { text: (entry.reasons || []).join('; ') })]);
      const more = held.slice(REASONS_SHOWN, REASON_LIMIT);
      section.append(element('div', { class: 'block-list' }, [element('h4', { class: 'eyebrow', text: 'Why the rest cannot start' }), element('ul', { class: 'reasons' }, held.slice(0, REASONS_SHOWN).map(row)),
        more.length ? element('details', {}, [element('summary', { text: `Show ${counted(more.length, 'more reason', 'more reasons')}` }), element('ul', { class: 'reasons' }, more.map(row)),
          held.length > REASON_LIMIT ? paragraph(`${held.length - REASON_LIMIT} more reasons are listed in the offline report.`, 'note') : null]) : null]));
    }
    return section;
  }
  // The delivery figure an area or an initiative states for its own scope, as a fact of its record.
  function deliveryFacts(item) {
    if (!state.snapshot.figures) return null;
    if (!figuresStated()) return ['Delivery', 'Figures withheld', withheldReason()];
    const entry = figureFor(item.id);
    if (!entry) return null;
    const [task, tasks] = taskWords();
    if (!entry.total) return ['Delivery', 'No percentage applies', isInitiative(item) ? `No linked ${tasks} yet. That is not the same as zero percent.` : `No ${tasks} yet. That is not the same as zero percent.`];
    return ['Delivery', `${entry.accepted} of ${counted(entry.total, task, tasks)} accepted`, meter(entry), `${rate(entry)}. ${entry.remaining} remaining, ${entry.currentlyVerified} with current proof`,
      button('Inspect this scope', () => enterScope(item.id), { class: 'quiet' })];
  }
  function recordFacts(item) {
    const history = item.history || [];
    const entered = [...history].reverse().find(entry => entry.afterState === item.state && entry.beforeState !== entry.afterState) || history.find(entry => entry.operation === 'create');
    const accepted = !!item.acceptance?.accepted;
    const decision = accepted ? (item.acceptanceHistory || []).at(-1) : null;
    const attested = item.health?.status === 'attested';
    const lone = stationsOf(lifecycleName(item)).length === 1 && item.state !== OFF_LINE;
    const recorded = ['Recorded state', [lone ? null : dot(stateName(item), 's'), labels()[item.state] || item.state], entered?.at ? `Since ${day(entered.at)}` : null,
      item.state === SIDING && item.blocker ? `Resumes to ${labels()[item.blocker.resumeState] || item.blocker.resumeState}` : null];
    const responsible = ['Responsible', [avatar(item.assigneeId, 's'), `${memberName(item.assigneeId)}${item.assigneeId ? ` (${item.assigneeId})` : ''}`],
      item.collaboratorIds?.length ? `Collaborating: ${item.collaboratorIds.map(memberName).join(', ')}` : null];
    const health = ['Record health', attested ? item.health.assessment : 'Not attested', attested ? `Observed ${instant(item.health.observedAt)}` : item.health?.reason || 'No dated owner attestation supplied'];
    const due = ['Due date', item.deadline ? longDay(item.deadline) : 'No due date', item.overdue ? `Overdue by ${counted(daysPast(item), 'day', 'days')}` : item.deadline === readDay() ? 'Due today' : item.deadline && item.deadline < readDay() ? 'The date has passed; the record is closed' : null];
    const unset = value => value || 'Not set';
    // Each kind states the facts it owns. Proof and acceptance belong to delivery work only.
    if (isArea(item)) return [recorded, ['Level', unset(item.level && levelName(item.level))], deliveryFacts(item), responsible, health].filter(Boolean);
    if (isInitiative(item)) return [recorded, ['Type', unset(item.type && typeName(item.type))], ['Priority level', unset(item.priorityLevel && named('priorityLevels', item.priorityLevel))], due, deliveryFacts(item), responsible, health].filter(Boolean);
    return [recorded, responsible,
      ['Current proof', [element('span', { class: `mark proof proof--${proofStatus(item)}` }, pips(item)), proofWord(item)], `${item.verification?.status || 'unknown'}: ${item.verification?.reason || 'Not established'}`],
      ['Acceptance', [acceptDot(accepted), accepted ? 'Accepted' : 'Not accepted'], accepted ? 'Accepted at a recorded decision' : 'No applicable acceptance recorded',
        decision?.acceptedAt ? `${decision.actor ? memberName(decision.actor) : 'An unrecorded actor'}, ${instant(decision.acceptedAt)}` : null],
      due, health];
  }
  function criteriaList(item) {
    return item.criteria?.length ? element('ul', { class: 'criteria' }, item.criteria.map(criterion => element('li', {}, [element('span', { class: 'id', text: criterion.id }), element('span', { text: criterion.text })])))
      : paragraph('No acceptance criteria are recorded.', 'note');
  }
  // With a single record there is no queue to triage, so Overview shows that record and the facts still missing around it.
  function onlyRecord(item) {
    const created = (item.history || []).find(entry => entry.operation === 'create');
    const section = sheet('record-heading', 'Your one record', created ? `Captured by ${created.actor ? memberName(created.actor) : 'an unrecorded actor'} at ${instant(created.at)}` : null, 'sheet wider');
    const { offered, lead } = offeredActions(item);
    section.append(element('div', { class: 'record-head' }, [kindMark(item), element('span', { class: 'id', text: item.id }), element('span', { class: 'rev', text: `rev ${item.revision}` }), item.retired ? flag('Retired') : null]),
      paragraph(item.title, 'record-title'), paragraph(item.intent || 'Intent not recorded.', 'intent'), factCells(recordFacts(item).slice(0, 4).map(cell => cell.slice(0, 2)), 'fact-tiles'), criteriaList(item),
      actions(...offered.slice(0, 3).map(action => actionButton(action, item, lead)), openButton(item)));
    return section;
  }
  function nextStopsCard(item) {
    const total = state.snapshot.metrics?.total || 0;
    const criteria = item.criteria?.length || 0;
    const [task, tasks] = taskWords();
    const scope = [!!total, `Capture ${aKind(vocabulary().deliveryKind)}`, total ? `${counted(total, `${task} is`, `${tasks} are`)} in this delivery scope.` : `Delivery counts ${tasks}, and this scope has none yet.`];
    // Criteria and responsibility are next stops for open work only; a retired or canceled record has none.
    const steps = item.retired || item.state === 'canceled' ? [
      [false, 'Capture new work', `${item.id} is ${item.retired ? 'retired' : 'canceled'}, so no record is open.`], scope
    ] : [
      [true, 'Capture something', `${item.id} is recorded.`],
      [!!criteria, 'Record acceptance criteria', criteria ? `${counted(criteria, 'criterion is', 'criteria are')} recorded. Proof is recorded against them.` : 'None are recorded yet. Proof is recorded against criteria.'],
      scope,
      [!!item.assigneeId, 'Make someone responsible', item.assigneeId ? `${memberName(item.assigneeId)} is responsible for this record.` : 'Nobody is responsible for this record yet. Assigning never starts work.']
    ];
    const current = steps.findIndex(([done]) => !done);
    const section = sheet('stops-heading', 'Next stops for this checkout', null, 'sheet narrow');
    section.append(element('ul', { class: 'stops' }, steps.map(([done, name, fact], index) => element('li', { class: done ? 'done' : index === current ? 'now' : undefined }, [
      element('span', { class: 'stop-mark', 'aria-hidden': 'true' }, done ? icon('check') : []),
      element('span', { class: 'stop-text' }, [element('strong', {}, [element('span', { class: 'visually-hidden', text: done ? 'Done: ' : 'Not yet: ' }), name]), element('span', { text: fact })])]))));
    return section;
  }
  function inspectionStrip() {
    const snapshot = state.snapshot;
    const profile = snapshot.profile || {};
    const reported = snapshot.diagnostics?.length || 0;
    return element('div', { class: 'strip' }, [element('span', { class: 'strip-title', text: 'Inspection' }),
      element('span', { text: snapshot.coverage === 'complete' ? 'Complete, with no inspection limits' : `${snapshot.coverage === 'partial' ? 'Partial' : 'Unavailable'}, ${counted(reported, 'reason', 'reasons')} reported` }),
      element('span', {}, ['Profile ', mono(profile.kind ? `${profile.kind} v${profile.version}` : 'unavailable')]),
      snapshot.mode ? element('span', {}, ['Tracking mode ', mono(snapshot.mode)]) : null,
      snapshot.fingerprint ? element('span', {}, ['Fingerprint ', mono(String(snapshot.fingerprint).slice(0, 8))]) : null,
      details('Inspection reasons and limitations', snapshot.diagnostics, 'inspection-reasons'),
      details('Scope and source identities', { source: snapshot.source, fingerprint: snapshot.fingerprint, scopeRevision: snapshot.metrics?.scopeRevision, profile: snapshot.profile })]);
  }
  // Every view of a source that cannot be read: its own title, so the tabs still say where the reader is, and no work,
  // count or earlier report. The reasons stay open to inspection.
  const VIEW_TITLES = { Overview: 'Project progress', People: 'People', Changes: 'Changes and sharing', Report: 'Status report' };
  function renderUnreadable() {
    main.append(pageLead(heading(VIEW_TITLES[state.view] || state.view), paragraph('No work, count or report is shown while this source cannot be read. Resolve the condition named for it, then reread the project.', 'page-intro')),
      inspectionStrip());
  }
  // A condition that keeps every area and initiative figure back, said once above the list it applies to.
  function withheldNotice(kind) {
    return element('div', { class: 'notice notice--warn' }, [element('p', {}, [icon('alert'), element('span', {}, [element('strong', { text: `${kindName(kind)} figures are withheld.` }),
      ` ${withheldReason()}. Figures are stated for every ${kindWords(areaKind())[0]} and ${kindWords(initiativeKind())[0]} or for none.`])]),
    button('Read the inspection limits', showInspectionReasons)]);
  }
  // What an empty list says, with the one action that fills it when this session may take it.
  function emptyList(lead, rest, kind) {
    const canCapture = !writableReason() && state.snapshot.profile.capabilities?.includes('create');
    return element('div', { class: 'empty-list' }, [element('p', {}, [element('strong', { text: lead }), ` ${rest}`]),
      canCapture ? button(`Add ${aKind(kind)}`, () => beginForm('create', undefined, { kind }), { class: 'primary', icon: 'plus' }) : null]);
  }
  // The pager of a list read a page at a time, in the words the status report uses. Above the list: how many rows are
  // shown of how many, the choice of how many a page holds, and the two steps; the total is always in it, so a page never
  // hides how many there are. Under the list: the steps around the page it is on. `key` names the list's page in the
  // page state; `draw` is given the rows to show and replaces them alone, so the view is never redrawn for a step. A step
  // taken under the list hands the reader to `heading`, where the new page begins. Both pagers are absent while the
  // list fits the shortest page.
  function listPager(key, name, total, heading, draw) {
    const lengths = LIST_PAGE_LENGTHS, at = state.listPages[key];
    const paged = total > lengths[0];
    // "1–10 of 149", "Page 1 of 15": the word between the two numbers is set lighter than they are.
    const said = (before, after) => [`${before} `, element('span', { class: 'pager-of', text: 'of' }), ` ${after}`];
    const step = (label, mark, by, under) => button('', event => {
      if (event.currentTarget.getAttribute('aria-disabled') === 'true') return;
      at.page += by; paint();
      if (under) heading.focus();
    }, { class: 'pager-step', icon: mark, 'aria-label': label, 'data-page-step': String(by) });
    const count = element('p', { class: 'pager-count', role: 'status' });
    const choice = element('select', { id: `${key}-page-length` }, lengths.map(length => element('option', { value: String(length), text: length ? `${length} per page` : 'All' })));
    choice.value = String(lengths.includes(at.length) ? at.length : lengths[0]);
    choice.addEventListener('change', () => { at.length = Number(choice.value); at.page = 1; paint(); });
    const rule = element('span', { class: 'pager-rule', 'aria-hidden': 'true' });
    const steps = element('span', { class: 'pager-steps' }, [step('Previous page', 'chevronLeft', -1, false), step('Next page', 'chevronRight', 1, false)]);
    const above = element('nav', { class: 'pager', 'aria-label': `${name} pages` }, [count, element('div', { class: 'pager-controls' }, [
      element('span', { class: 'pager-length' }, [element('label', { class: 'visually-hidden', for: choice.id, text: 'Rows per page' }), choice, icon('chevron')]), rule, steps])]);
    const status = element('p', { class: 'pager-status' });
    const below = element('nav', { class: 'pager pager--below', 'aria-label': `${name} pages, below the list` }, [step('Previous page', 'chevronLeft', -1, true), status, step('Next page', 'chevronRight', 1, true)]);
    // Shows the page asked for, or the nearest one that exists.
    function paint() {
      const length = paged && lengths.includes(at.length) ? at.length : paged ? lengths[0] : 0;
      const pages = length ? Math.max(1, Math.ceil(total / length)) : 1;
      at.page = Math.min(Math.max(1, at.page), pages);
      const first = length ? (at.page - 1) * length : 0, end = length ? Math.min(total, first + length) : total;
      draw(first, end);
      // With every row on one page by choice there is nowhere to step to: the steps and the lower pager are left out.
      const whole = length === 0;
      count.replaceChildren(...(whole ? [`All ${total}`] : said(`${first + 1}–${end}`, total)));
      status.replaceChildren(...said(`Page ${at.page}`, pages));
      rule.hidden = steps.hidden = below.hidden = whole;
      for (const control of [...above.querySelectorAll('[data-page-step]'), ...below.querySelectorAll('[data-page-step]')]) control.setAttribute('aria-disabled', String(Number(control.dataset.pageStep) < 0 ? at.page === 1 : at.page === pages));
    }
    paint();
    // Kept for paper with the other lists of this view, until the view is drawn again.
    if (paged) pagedLists.add({ above, heading, paint, whole: () => { draw(0, total); count.replaceChildren(`All ${total}`); } });
    return { above: paged ? above : null, below: paged ? below : null };
  }
  // One line of an area list: a disclosure for the areas inside it, its level, its title as the control that scopes into
  // it, then the meter, count and rate the read states for it. `path` is the way down to it; `still` adds what is left.
  function areaLine(area, path, { toggle, identity, still } = {}) {
    const item = uniqueItem(area.id);
    const entry = figureFor(area.id);
    const [task, tasks] = taskWords();
    const cells = !figuresStated() ? [] : !entry ? [element('span', { class: 'fig-none', text: 'Figure unavailable' })]
      : !entry.total ? [element('span', { class: 'fig-none', text: noFigure(areaKind()) })]
        : [meter(entry), element('span', { class: 'fig-count' }, [`${entry.accepted} of ${entry.total}`, element('span', { class: 'visually-hidden', text: ` ${entry.total === 1 ? task : tasks} accepted` })]), element('span', { class: 'fig-rate', text: rate(entry) }),
          still ? element('span', { class: 'fig-rest', text: `${entry.remaining} remaining, ${entry.currentlyVerified} with current proof` }) : null];
    // The title, the identity and the state stand together beside the toggle and the level: a part of them that does not
    // fit on the line wraps under the title, never back under the toggle.
    return element('div', { class: `area-line${still ? ' area-line--wide' : ''}` }, [element('span', { class: 'area-name' }, [toggle || (still ? null : element('span', { class: 'area-indent', 'aria-hidden': 'true' })),
      labelChip(area.level && levelName(area.level)), element('span', { class: 'area-title' }, [nameLink(item.title, () => enterScope(area.id, [...path, area.id]), `${item.title}: show this ${kindWords(areaKind())[0]}'s progress`),
        identity ? element('span', { class: 'id', text: area.id }) : null, item.state === OFF_LINE ? stateWord(item) : null])]), ...cells]);
  }
  const byLevelThenTitle = (a, b) => levelRank(a.level) - levelRank(b.level) || uniqueItem(a.id).title.localeCompare(uniqueItem(b.id).title, 'en', { sensitivity: 'base' }) || a.id.localeCompare(b.id);
  // A list, a table or a board that keeps its columns scrolls sideways inside its own box when the page is narrower than
  // it. The box says what it is and takes focus, so its last column can be scrolled to without a pointer.
  const scrollBox = (name, content, className = 'area-scroll', what = 'a list') => element('div', { class: className, role: 'group', tabindex: '0', 'aria-label': `${name}: ${what} that scrolls sideways when it is wider than the page` }, content);
  function areasCard() {
    const known = (state.snapshot.hierarchy?.areas || []).filter(area => uniqueItem(area.id));
    const [task, tasks] = taskWords();
    const [area, areasWord] = kindWords(areaKind());
    const section = captionedSheet('areas-heading', `How each ${area} stands`, known.length ? `Each line counts the ${area}'s own ${tasks} and those of the ${areasWord} inside it` : null, 'sheet wider');
    section.id = 'areas';
    if (!known.length) {
      const total = state.snapshot.metrics?.total;
      section.append(emptyList(`This project has no ${areasWord}.`, `${!Number.isSafeInteger(total) ? `Every ${task} counts` : total === 1 ? `The 1 ${task} counts` : `All ${total} ${tasks} count`} for the whole project. Add ${aKind(areaKind())} when you want to follow one part on its own.`, areaKind()));
      return section;
    }
    if (!figuresStated()) section.append(withheldNotice(areaKind()));
    // Each area is listed once, under the first area that leads to it; the other areas it sits inside are on its record.
    const listed = new Set();
    // Every level that can be opened, with what it takes to show or hide it in place: the view is never redrawn for it.
    const levels = [];
    const isOpen = level => level.toggle.getAttribute('aria-expanded') === 'true';
    const setOpen = (level, shown) => {
      state.treeOpen.set(level.id, shown); level.children.hidden = !shown;
      level.toggle.setAttribute('aria-expanded', String(shown)); level.toggle.setAttribute('aria-label', level.says(shown));
      level.toggle.replaceChildren(icon(shown ? 'chevron' : 'chevronRight'));
    };
    // Open all and Close all act on every level at once. They are drawn as small links at the end of the heading line.
    // The one that would change nothing is marked unavailable and stays where it is, so focus is never lost to it.
    const tool = (name, mark, shown) => button(name, event => {
      if (event.currentTarget.getAttribute('aria-disabled') === 'true') return;
      for (const level of levels) if (isOpen(level) !== shown) setOpen(level, shown);
      syncTools();
    }, { class: 'level-link', icon: mark, 'aria-label': `${name} ${areasWord}` });
    const openAll = tool('Open all', 'levelsOpen', true), closeAll = tool('Close all', 'levelsClose', false);
    const syncTools = () => { openAll.setAttribute('aria-disabled', String(levels.every(isOpen))); closeAll.setAttribute('aria-disabled', String(!levels.some(isOpen))); };
    const branch = (entry, path, depth) => {
      if (listed.has(entry.id)) return null;
      listed.add(entry.id);
      const title = uniqueItem(entry.id).title;
      // A child reached through an earlier sibling is listed there, so only the lines built here are shown under this area.
      const inside = (entry.childAreaIds || []).map(areaInfo).filter(child => child && uniqueItem(child.id)).sort(byLevelThenTitle)
        .map(child => branch(child, [...path, entry.id], depth + 1)).filter(Boolean);
      // Every level starts closed. One the reader opens, by itself or with the rest, stays as they left it while the page is open.
      const open = state.treeOpen.get(entry.id) === true;
      const children = element('ul', { class: 'area-children', hidden: !open }, inside);
      let toggle = null;
      if (inside.length) {
        const level = { id: entry.id, children, says: shown => `${shown ? 'Hide' : 'Show'} the ${areasWord} inside ${title}` };
        toggle = level.toggle = button('', () => { setOpen(level, !isOpen(level)); syncTools(); }, { class: 'area-toggle', 'aria-expanded': String(open), 'aria-label': level.says(open) });
        toggle.append(icon(open ? 'chevron' : 'chevronRight'));
        levels.push(level);
      }
      return element('li', {}, [areaLine(entry, path, { toggle, identity: depth === 0 }), inside.length ? children : null]);
    };
    const roots = known.filter(entry => !(entry.parentAreaIds || []).some(parent => uniqueItem(parent))).sort(byLevelThenTitle);
    // Every area at the top is built once with the levels inside it, whatever page shows it: a level keeps how the
    // reader left it across pages, and Open all and Close all reach the levels of every page.
    const tops = [...roots, ...[...known].sort(byLevelThenTitle)].map(entry => branch(entry, [], 0)).filter(Boolean);
    const list = element('ul', { class: 'area-list' });
    const pager = listPager('areas', `${capital(area)} list`, tops.length, section.querySelector('h3'), (first, end) => list.replaceChildren(...tops.slice(first, end)));
    // The two links stand only where there is a level to open.
    if (levels.length) {
      syncTools();
      section.querySelector('.sheet-head').append(element('div', { class: 'level-links', role: 'group', 'aria-label': `${capital(area)} list levels` }, [openAll, element('span', { class: 'level-rule', 'aria-hidden': 'true' }), closeAll]));
    }
    section.append(...[pager.above, scrollBox(capital(areasWord), element('div', { class: 'area-table' }, [
      element('div', { class: 'area-line area-head', 'aria-hidden': 'true' }, [element('span', { text: capital(area) }), element('span', { text: 'Delivery' }), element('span', { text: 'Accepted' }), element('span', { class: 'fig-rate', text: 'Rate' })]), list])), pager.below].filter(Boolean));
    // Work that belongs to no area belongs to the project as a whole.
    const outside = state.snapshot.hierarchy?.untaggedTaskIds?.length || 0;
    if (outside) section.append(element('div', { class: 'strip' }, [element('span', { class: 'strip-text' }, [element('strong', { text: `Not in any ${area}: ${counted(outside, task, tasks)}.` }), ` ${outside === 1 ? 'It counts' : 'They count'} for the whole project only.`]),
      button(outside === 1 ? `Inspect this ${task}` : `Inspect these ${tasks}`, () => showWork({ untagged: true }))]));
    section.append(element('div', { class: 'sheet-foot sheet-foot--stack' }, [figuresStated() ? meterLegend() : null,
      paragraph(`A ${task} in several ${areasWord} counts in each of them, so lines are never added together.`, 'caption')]));
    return section;
  }
  // Initiatives against their due dates: overdue first, then by due date, then undated, and closed ones under their own head.
  function initiativesCard() {
    const all = items().filter(item => isInitiative(item) && hasUniqueId(item.id));
    const [task, tasks] = taskWords();
    const [one, many] = kindWords(initiativeKind());
    const section = captionedSheet('initiatives-heading', `How each ${one} stands`, all.length ? `Counts the ${tasks} linked to it` : null, 'sheet narrow');
    if (!all.length) { section.append(emptyList(`This project has no ${many}.`, `Capture ${aKind(initiativeKind())}, then link the ${tasks} that deliver it.`, initiativeKind())); return section; }
    if (!figuresStated()) section.append(withheldNotice(initiativeKind()));
    const byDue = (a, b) => Number(!!b.overdue) - Number(!!a.overdue) || Number(!a.deadline) - Number(!b.deadline) || String(a.deadline || '').localeCompare(String(b.deadline || ''))
      || a.title.localeCompare(b.title, 'en', { sensitivity: 'base' }) || a.id.localeCompare(b.id);
    // A retired record is not open, whatever state it was retired in: it stands with the closed ones, as it does in the report.
    const over = item => closed(item) || !!item.retired;
    const row = item => {
      const entry = figureFor(item.id);
      const entered = [...(item.history || [])].reverse().find(change => change.afterState === item.state && change.beforeState !== change.afterState);
      // What ended it and when: its retirement, or the day it reached the state it stands in.
      const endedAt = item.retired ? item.retired.at : entered?.at;
      const ending = `${item.retired ? 'Retired' : item.state === OFF_LINE ? 'Canceled' : 'Closed'}${endedAt ? ` ${longDay(endedAt)}` : ''}${entry?.remaining ? ` with ${counted(entry.remaining, task, tasks)} still open` : ''}`;
      const facts = over(item) ? [stateWord(item), element('span', { text: ending })]
        : [stateWord(item), element('span', { text: item.priorityLevel ? `${named('priorityLevels', item.priorityLevel)} priority` : 'No priority level' }), dueMark(item)];
      const figure = !figuresStated() ? null : !entry ? element('p', { class: 'note', text: 'Figure unavailable' }) : !entry.total ? element('p', { class: 'note', text: noFigure(initiativeKind()) })
        : element('div', { class: 'init-figure' }, [meter(entry), element('span', { class: 'fig-count' }, [`${entry.accepted} of ${entry.total}`, element('span', { class: 'visually-hidden', text: ` ${entry.total === 1 ? task : tasks} accepted` })]), element('span', { class: 'fig-rate', text: rate(entry) })]);
      return element('li', { class: 'init-row' }, [element('div', { class: 'init-name' }, [labelChip(item.type && typeName(item.type)), nameLink(item.title, () => openItem(item), `${item.title}: open this ${one}`)]),
        element('div', { class: 'init-facts' }, facts), figure]);
    };
    // One sequence, read a page at a time: the open ones in due order, then the closed ones.
    const sequence = [...all.filter(item => !over(item)).sort(byDue), ...all.filter(over).sort(byDue)];
    const list = element('div', { class: 'init-pages' });
    // Only the rows are replaced for a page: the closed ones keep their head on every page that holds any of them.
    const pager = listPager('initiatives', `${capital(one)} list`, sequence.length, section.querySelector('h3'), (first, end) => {
      const shown = sequence.slice(first, end), open = shown.filter(item => !over(item)), ended = shown.filter(over);
      list.replaceChildren(...[open.length ? element('ul', { class: 'init-list' }, open.map(row)) : null,
        ended.length ? element('h4', { class: 'sub-head', text: 'Closed' }) : null, ended.length ? element('ul', { class: 'init-list' }, ended.map(row)) : null].filter(Boolean));
    });
    section.append(...[pager.above, list, pager.below, figuresStated() ? element('div', { class: 'sheet-foot sheet-foot--stack' }, meterLegend()) : null].filter(Boolean));
    return section;
  }
  // The whole-project figure is not part of a scoped read. The page keeps the one it last read for the same work and
  // shows it on the path only while it still describes that work.
  const projectFigure = () => state.projectFigure && state.projectFigure.fingerprint === state.snapshot.fingerprint && state.projectFigure.ref === state.scope.ref ? state.projectFigure.metrics : null;
  // Where the scoped Overview sits: the whole project, each area above, then the scope itself. Every earlier step is a
  // control that widens the scope, and each carries its own meter and rate when the read states one.
  function scopePath() {
    const path = state.entryPath.length && state.entryPath.at(-1) === state.scope.scopeId ? state.entryPath : [state.scope.scopeId];
    const figure = entry => entry && entry.total && Number.isFinite(entry.percentage) ? element('span', { class: 'path-figure' }, [meter(entry, true), element('span', { class: 'fig-rate', text: rate(entry) })]) : null;
    const step = (id, index) => {
      const item = id ? uniqueItem(id) : null;
      const name = element('span', { class: 'path-name' }, [item ? labelChip(isArea(item) ? item.level && levelName(item.level) : item.type && typeName(item.type)) : null, element('strong', { text: id ? item?.title || id : 'Whole project' })]);
      const entry = id ? figureFor(id) : projectFigure();
      if (index === path.length) return element('span', { class: 'path-step path-step--here', 'aria-current': 'page' }, [name, figure(entry)]);
      // `index` counts the whole-project step, so the way down to this step is the first `index` areas of the path.
      const node = button('', () => enterScope(id, id ? path.slice(0, index) : undefined), { class: 'path-step', 'aria-label': `${id ? item?.title || id : 'Whole project'}: widen the scope to here` });
      node.append(name, ...[figure(entry)].filter(Boolean));
      return node;
    };
    const steps = [step(null, 0), ...path.map((id, index) => step(id, index + 1))];
    return element('nav', { class: 'scope-path', 'aria-label': 'Scope path' }, element('ol', {}, steps.map((node, index) => element('li', {}, [node, index < steps.length - 1 ? icon('chevronRight') : null]))));
  }
  // The areas directly inside the area the page is scoped to, each with its own figures and what is still open in it.
  function insideCard(scoped) {
    const inside = (state.snapshot.scope?.childAreaIds || []).map(areaInfo).filter(area => area && uniqueItem(area.id)).sort(byLevelThenTitle);
    if (!inside.length) return null;
    const [area, areasWord] = kindWords(areaKind());
    const section = sheet('inside-heading', `${capital(areasWord)} inside this ${scoped.level ? levelName(scoped.level).toLocaleLowerCase() : area}`, counted(inside.length, area, areasWord), 'sheet');
    if (!figuresStated()) section.append(withheldNotice(areaKind()));
    const path = state.entryPath.length ? state.entryPath : [scoped.id];
    const heading = section.querySelector('h3');
    heading.tabIndex = -1;
    const list = element('ul', { class: 'area-list' });
    const pager = listPager('inside', `${capital(areasWord)} inside list`, inside.length, heading, (first, end) => list.replaceChildren(...inside.slice(first, end).map(entry => element('li', {}, areaLine(entry, path, { still: true })))));
    section.append(...[pager.above, scrollBox(`${capital(areasWord)} inside`, element('div', { class: 'area-table area-table--wide' }, [
      element('div', { class: 'area-line area-line--wide area-head', 'aria-hidden': 'true' }, [element('span', { text: capital(area) }), element('span', { text: 'Delivery' }), element('span', { text: 'Accepted' }), element('span', { class: 'fig-rate', text: 'Rate' }), element('span', { text: 'Still open' })]),
      list])), pager.below].filter(Boolean));
    return section;
  }
  // The tasks the scoped figure counts, each with the areas and initiatives it is tagged to.
  function countedCard() {
    const ids = state.snapshot.scope?.eligibleTaskIds || [];
    const [task, tasks] = taskWords();
    const section = element('section', { class: 'sheet', 'aria-labelledby': 'counted-heading' }, element('div', { class: 'sheet-head' }, [element('h3', { id: 'counted-heading', text: `${capital(tasks)} counted here` }),
      ids.length ? button(`Inspect all ${ids.length} in Work`, () => navigate('Work'), { class: 'quiet' }) : null]));
    if (!ids.length) { section.append(paragraph(`No eligible ${tasks} in this scope, so no percentage applies. That is not the same as zero percent.`, 'note')); return section; }
    const records = ids.map(uniqueItem).filter(Boolean);
    section.append(element('ul', { class: 'queue queue--plain' }, records.slice(0, QUEUE_LIMIT).map(item => element('li', {}, [
      element('span', { class: 'queue-text' }, [nameLink(item.title, () => openItem(item), `${item.title}: open this ${task}`), element('span', { class: 'row-context' }, [kindMark(item), element('span', { class: 'id', text: item.id }), item.overdue ? flag('Overdue', 'blocked') : null])]),
      element('span', { class: 'tag-row' }, [...taggedIds(item, areaKind()), ...taggedIds(item, initiativeKind())].map(tagPick)),
      stateWord(item), ...responsible(item.assigneeId)]))));
    if (records.length > QUEUE_LIMIT) section.append(paragraph(`${records.length - QUEUE_LIMIT} more are counted here. Open Work to see them all.`, 'note'));
    return section;
  }
  function renderOverview() {
    const snapshot = state.snapshot;
    const scoped = scopeRecord();
    if (state.scope.scopeId) main.append(scopePath());
    main.append(pageHead(scoped ? `${kindName(scoped.kind)} progress` : 'Project progress', `${scopeLabel()}, read from ${sourcePhrase()} at ${snapshot.asOf ? instant(snapshot.asOf) : 'an unknown time'}`,
      scoped ? button(`Open the ${kindWords(scoped.kind)[0]} record`, () => openItem(scoped), { class: 'quiet' }) : null,
      button('Refresh offline report', refreshReport, { icon: 'file' })));
    main.append(element('div', { class: 'split' }, [deliveryCard(snapshot.metrics), healthCard()]));
    if (snapshot.profile?.available && state.scope.scopeId) {
      // A scoped Overview states that scope only: what is inside it and what it counts.
      main.append(...[isArea(scoped) ? insideCard(scoped) : null, snapshot.scope?.kind ? countedCard() : null].filter(Boolean));
    } else if (snapshot.profile?.available) {
      main.append(element('div', { class: 'split split--start' }, [areasCard(), initiativesCard()]), lifecycleLine());
      const work = items().filter(inDelivery);
      if (items().length === 1 && work.length) main.append(element('div', { class: 'split split--start' }, [onlyRecord(items()[0]), nextStopsCard(items()[0])]));
      else if (work.length) main.append(element('div', { class: 'split split--start' }, [waitingRecords(), readyRecords()]));
    }
    main.append(inspectionStrip());
  }

  function renderPeople() {
    main.append(pageLead(heading('People'), paragraph('Who is responsible for what in the selected source. One block is one record. These are not performance scores.', 'page-intro')));
    if (!members().length) main.append(paragraph('No members are configured in this selected project. Configure stable member identities before assigning work.', 'notice'));
    const active = items().filter(item => !item.retired && item.state !== OFF_LINE);
    const order = listOrder();
    const place = item => order.indexOf(item.state === SIDING ? SIDING_HOST : item.state);
    const byLifecycle = records => [...records].sort((a, b) => place(a) - place(b));
    const load = (owned, summary) => {
      const rows = byLifecycle(owned);
      // One block per record while the blocks fit a few lines of the card. More records than that are one bar in which
      // each state takes its share, with the number in each state said in words: nothing is cut and no count is hidden.
      const blocks = rows.length <= PERSON_BLOCKS;
      const tally = [...new Set(rows.map(item => item.state))].map(key => [key, rows.filter(item => item.state === key).length]);
      const share = ([key, total]) => {
        const part = element('span', { class: `is-${labels()[key] ? key : 'other'}` });
        // Set through the style object: the page policy admits no inline style attribute.
        part.style.flexGrow = String(total);
        return part;
      };
      return [element('div', { class: 'person-load' }, [paragraph(summary),
        element('div', { class: `person-bar${blocks ? '' : ' person-bar--shares'}`, 'aria-hidden': 'true' }, blocks ? rows.map(item => element('span', { class: `is-${stateName(item)}` })) : tally.map(share)),
        blocks ? null : paragraph(`Shown as shares by state, not one block each: ${tally.map(([key, total]) => `${total} ${(labels()[key] || key).toLocaleLowerCase()}`).join(', ')}.`, 'note')]),
        element('ul', { class: 'person-rows' }, [...rows.slice(0, PERSON_ROWS).map(item => element('li', {}, [element('span', { class: `state-word is-${stateName(item)}`, text: labels()[item.state] || item.state }), element('span', { text: item.title })])),
          rows.length > PERSON_ROWS ? element('li', { class: 'note', text: `and ${rows.length - PERSON_ROWS} more` }) : null])];
    };
    const seeWork = (name, filters) => button('See this work', () => showWork(filters), { iconAfter: 'arrow', 'aria-label': `See this work: ${name}` });
    const list = element('ul', { class: 'people-grid' });
    for (const member of members()) {
      const owned = active.filter(item => item.assigneeId === member.id);
      list.append(element('li', {}, element('section', { class: `person${member.active ? '' : ' person--off'}` }, [
        element('div', { class: 'person-head' }, [avatar(member.id, 'l'),
          element('div', { class: 'person-name' }, [element('h3', {}, [member.displayName, member.id === state.session.actor ? element('span', { class: 'badge', text: 'You' }) : null]), element('span', { class: 'id', text: member.id })]),
          element('span', { class: `person-status${member.active ? '' : ' person-status--off'}`, text: member.active ? 'Active' : 'Inactive' })]),
        ...(owned.length ? load(owned, `Responsible for ${counted(owned.length, 'record', 'records')}`) : [element('div', { class: 'person-load' }, [paragraph('No open records'),
          member.active ? null : paragraph('Earlier work keeps this name in its history. An inactive member cannot be given new work, and nobody else is substituted.', 'note')])]),
        owned.length ? seeWork(`${member.displayName} (${member.id}) — ${member.active ? 'Active' : 'Inactive'}; ${owned.length} owned records`, { owner: member.id }) : null])));
    }
    const unassigned = active.filter(item => !item.assigneeId);
    if (unassigned.length) {
      list.append(element('li', {}, element('section', { class: 'person person--none' }, [
        element('div', { class: 'person-head' }, [avatar(null, 'l'), element('div', { class: 'person-name' }, [element('h3', { text: 'Unassigned' }), element('span', { class: 'note', text: 'Nobody is responsible yet' })])]),
        ...load(unassigned, counted(unassigned.length, 'record', 'records')),
        seeWork(`Unassigned — ${unassigned.length} records with nobody responsible`, { owner: '__unassigned' })])));
    }
    main.append(list);
    const unknown = [...new Set(items().map(item => item.assigneeId).filter(id => id && !members().some(member => member.id === id)))];
    main.append(element('div', { class: 'strip' }, [element('span', { class: 'strip-title', text: 'Who can take work' }),
      element('span', { text: 'Active configured members, plus the validated local Git author of a writable checkout.' }),
      element('span', { text: 'Canceled and retired records are left out of these counts.' }),
      unknown.length ? details('Unknown recorded owners', unknown) : null]));
  }

  function filteredItems() {
    const f = state.filters;
    const eligible = state.snapshot.scope?.eligibleTaskIds || state.snapshot.metrics?.eligibleIds || [];
    const untagged = state.snapshot.hierarchy?.untaggedTaskIds || [];
    return items().filter(item => {
      if (state.scope.scopeId && !eligible.includes(item.id)) return false;
      if (state.view === 'My work' && item.assigneeId !== state.session.actor) return false;
      if (f.owner === '__unassigned' ? item.assigneeId !== null : f.owner && item.assigneeId !== f.owner) return false;
      if (f.status && item.state !== f.status) return false;
      if (f.kind === DELIVERY_WORK ? !inDelivery(item) : f.kind && item.kind !== f.kind) return false;
      // Remaining work is what the delivery scope counts as not accepted: an eligible task without an acceptance.
      if (f.remaining && (!eligible.includes(item.id) || item.acceptance?.accepted)) return false;
      if (f.untagged && !untagged.includes(item.id)) return false;
      return `${item.id} ${item.title} ${item.intent} ${item.ownerPath}`.toLocaleLowerCase().includes(f.search.toLocaleLowerCase());
    }).sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id) || a.ownerPath.localeCompare(b.ownerPath));
  }
  function workEntry(item, variant, select) {
    const ambiguous = hasUniqueId(item.id) ? '' : `Ambiguous identity; owner: ${item.ownerPath}`;
    const delivery = inDelivery(item);
    // Proof and acceptance are said of delivery work only; an area or an initiative has neither.
    const said = [`${item.id}: ${item.title}. ${labels()[item.state] || item.state}`, memberName(item.assigneeId), ...(delivery ? [acceptanceWord(item), `Proof: ${item.verification?.status || 'unknown'}`] : []),
      item.overdue ? 'Overdue' : null, ambiguous || null].filter(Boolean).join('; ');
    const entry = button('', select, { class: variant, 'aria-pressed': String(itemKey(item) === state.selectedKey), 'aria-label': said });
    const figure = delivery || !figuresStated() ? null : figureFor(item.id);
    const identity = element('span', { class: 'row-context' }, [kindMark(item), element('span', { class: 'id', text: item.id }),
      variant === 'work-row' && item.state === SIDING ? flag('Blocked', 'blocked') : null, item.overdue ? flag('Overdue', 'blocked') : null,
      onLine(item) ? null : flag(labels()[item.state] || item.state), item.retired ? flag('Retired') : null,
      figure ? element('span', { class: 'row-figure', text: figure.total ? `${figure.accepted} of ${figure.total} accepted` : `No ${isInitiative(item) ? 'linked ' : ''}${taskWords()[1]}` }) : null]);
    const note = ambiguous ? element('span', { class: 'row-note', text: ambiguous }) : null;
    if (variant === 'card') {
      entry.append(item.state === SIDING ? element('span', { class: 'card-block' }, [icon('alert'), element('span', { text: `Blocked: ${item.blocker?.reason || 'no reason is recorded'}` })]) : '',
        element('span', { class: 'card-top' }, [identity, avatar(item.assigneeId)]), element('span', { class: 'row-title', text: item.title }),
        element('span', { class: 'card-foot' }, [proofMark(item), item.retired ? null : sealMark(item)]), note || '');
    } else {
      entry.append(element('span', { class: 'row-main' }, [element('span', { class: 'row-title', text: item.title }), identity, note]),
        delivery ? element('span', { class: `mark proof proof--${proofStatus(item)}`, title: proofWord(item) }, pips(item, ROW_PIP_LIMIT)) : '', item.retired || !delivery ? '' : acceptDot(!!item.acceptance?.accepted), avatar(item.assigneeId));
    }
    return entry;
  }
  const legendMarks = () => [[element('span', { class: 'mark proof proof--current' }, element('span', { class: 'pip' })), 'Proved'], [element('span', { class: 'mark proof proof--stale' }, element('span', { class: 'pip' })), 'Proof stale'],
    [element('span', { class: 'pip' }), 'Not proved'], [acceptDot(true, true), 'Accepted is a separate decision']];
  const legend = (className, lead) => element('ul', { class: className, 'aria-label': 'How to read the marks' }, [lead ? element('li', { text: lead }) : null,
    ...legendMarks().map(([mark, name]) => element('li', {}, [mark, name]))]);
  // The same filtered records under a heading per recorded state, each lifecycle read from its last open stop back to
  // its first. Blocked work stays with In progress; anything else sits off the line.
  function workList(shown, select) {
    const groups = listOrder().map(key => ({ key, name: labels()[key] || key, records: shown.filter(item => onLine(item) && (item.state === key || key === SIDING_HOST && item.state === SIDING)) }));
    groups.push({ key: 'off', name: 'Off the line', records: shown.filter(item => !onLine(item)) });
    // The one stop of a lifecycle that has no line carries its word and no dot.
    const lone = new Set(Object.keys(vocabulary().lifecycles || {}).map(stationsOf).filter(line => line.length === 1).flat());
    return element('div', { class: 'rows' }, [...groups.filter(group => group.records.length).flatMap(group => [
      element('h3', { class: 'group-head' }, [group.key === 'off' || lone.has(group.key) ? null : dot(group.key, 's'), element('span', { text: group.name }), ' ', element('span', { class: 'group-count', text: group.records.length })]),
      element('ul', {}, group.records.map(item => element('li', {}, workEntry(item, 'work-row', () => select(item)))))]), legend('list-legend')]);
  }
  // The board is the delivery line: it groups the filtered delivery work by recorded state. It is read-only: no drag, no saved order.
  function board(shown, select, canCapture) {
    const stations = deliveryStations();
    const lanes = stations.map(key => ({ key, name: labels()[key], records: shown.filter(item => item.state === key || key === SIDING_HOST && item.state === SIDING) }));
    const off = shown.filter(item => !onLine(item));
    if (off.length) lanes.push({ key: 'off', name: 'Off the line', records: off });
    const blockedIn = lane => lane.records.filter(item => item.state === SIDING).length;
    const boardNode = element('div', { class: `board${off.length ? ' board--7' : ''}` }, [
      element('div', { class: 'route', 'aria-hidden': 'true' }, lanes.map(lane => element('div', { class: `route-stop${lane.key === 'off' ? ' route-stop--off' : ''}` }, [
        lane.key === 'off' ? null : dot(lane.key), element('span', { class: 'route-name' }, [element('strong', { text: lane.name }), element('span', { class: 'id', text: lane.records.length }),
          blockedIn(lane) ? element('span', { class: 'route-note', text: `${blockedIn(lane)} blocked` }) : null])]))),
      element('div', { class: 'lanes' }, lanes.map(lane => element('div', { class: 'lane' }, [element('ul', { 'aria-label': `${lane.name}: ${lane.records.length} records` },
        lane.records.length ? lane.records.map(item => element('li', {}, workEntry(item, 'card', () => select(item)))) : element('li', { class: 'lane-empty', text: filtersActive() ? 'Nothing here with these filters' : 'No records' })),
      lane.key === stations[0] && canCapture ? button('Capture a draft', () => beginForm('create'), { class: 'lane-add', icon: 'plus' }) : null])))]);
    // The board holds one column per lane, whatever the lifecycle's number of stops.
    boardNode.style.setProperty('--lanes', String(lanes.length));
    return scrollBox('Work by recorded state', boardNode, 'board-scroll', 'a board');
  }
  function renderWork() {
    const reason = writableReason();
    const canCapture = !reason && state.snapshot.profile.capabilities?.includes('create');
    const hasActor = state.view !== 'My work' || state.session.actor;
    const layout = (name, glyph) => button(name, () => { state.layout = name.toLowerCase(); render(); main.querySelector('.segmented [aria-pressed="true"]')?.focus(); }, { icon: glyph, 'aria-pressed': String(state.layout === name.toLowerCase()) });
    // The count changes as filters change while the reader is in a filter control, so it is a status of its own.
    const summary = element('p', { class: 'page-context', role: 'status' });
    main.append(pageHead(state.view === 'My work' ? 'My work' : 'Work', hasActor ? summary : null,
      hasActor ? element('div', { class: 'segmented', role: 'group', 'aria-label': 'Work layout' }, [layout('Board', 'board'), layout('List', 'list')]) : null));
    if (!hasActor) {
      main.append(paragraph('This read-only session has no member identity. Choose a person in People, or launch a workspace with your stable member identity.', 'notice')); return;
    }
    main.append(paragraph(reason || (!canCapture
      ? 'Capture is unavailable in the selected project profile. Original records remain owned by that profile.' : 'New work starts as a draft. Assignment does not start it.'), 'note'));
    const workbench = element('div', { class: `workbench workbench--${state.layout}` });
    const listPane = element('section', { class: 'work-list', 'aria-label': state.scope.scopeId ? `Eligible delivery ${taskWords()[1]}` : 'Work list' });
    const detailPane = element('section', { class: 'record-sheet', 'aria-label': 'Selected work' });
    const filters = element('div', { class: 'filters' });
    const repaint = () => {
      listPane.replaceChildren();
      const matching = filteredItems();
      const count = `${matching.length} matching records; progress scope remains ${state.snapshot.metrics?.scope?.itemId || 'the project'}.`;
      if (summary.textContent !== count) summary.textContent = count;
      if (!matching.length) listPane.append(paragraph(state.snapshot.coverage !== 'complete' ? 'No inspected records match. Inspection is incomplete, so some work may be unavailable.' : items().length ? 'No work matches these filters. Clear filters to return to the list.' : `No work records were found in this complete inspection. Capture ${aKind(initiativeKind())} or ${taskWords()[0]} to begin.`, 'empty'));
      const select = item => checkpoint(() => {
        selectWork(item); render(); main.querySelector('.record-sheet h3')?.focus();
      });
      const shown = matching.slice(0, state.limit);
      // The board is the delivery line; an area or an initiative moves along a line of its own and is read in the list.
      const apart = shown.filter(item => !inDelivery(item)).length;
      if (state.layout === 'board' && matching.length) listPane.append(...[board(shown.filter(inDelivery), select, canCapture), legend('board-legend', 'Reading a card'),
        apart ? paragraph(`${counted(apart, 'record is', 'records are')} not on this board: ${otherKindWords()} have lines of their own. Use the list to see them.`, 'note') : null].filter(Boolean));
      else if (matching.length) listPane.append(workList(shown, select));
      if (matching.length > state.limit) listPane.append(button('Show 100 more records', () => {
        // The button is replaced with the records it asked for: the reader continues at the first of them.
        const entries = () => [...listPane.querySelectorAll('[aria-pressed]')];
        const seen = new Set(entries().map(entry => entry.getAttribute('aria-label')));
        state.limit += 100; repaint();
        entries().find(entry => !seen.has(entry.getAttribute('aria-label')))?.focus();
      }));
      // With nothing selected there is a sheet to fill only while the list beside it has records to choose from.
      detailPane.hidden = !selected() && (!matching.length || state.layout === 'board');
      workbench.classList.toggle('workbench--solo', detailPane.hidden);
    };
    const filterField = (name, title, choices) => {
      const id = `filter-${name}`;
      const control = choices ? element('select', { id }, choices.map(([value, label]) => element('option', { value, text: label }))) : element('input', { id, type: 'search', maxlength: 500 });
      control.value = state.filters[name];
      control.addEventListener(choices ? 'change' : 'input', () => { state.filters[name] = control.value; state.limit = 100; repaint(); });
      filters.append(element('label', { class: `pick${choices ? '' : ' pick--search'}`, for: id }, [choices ? null : icon('search'), element('span', { class: 'pick-label', text: title }), control]));
    };
    filterField('search', 'Find work');
    filterField('owner', 'Owner', [['', 'Anyone'], ['__unassigned', 'Unassigned'], ...members().map(member => [member.id, `${member.displayName} (${member.id})`])]);
    filterField('status', 'Recorded state', [['', 'Any state'], ...Object.entries(labels())]);
    filterField('kind', 'Work kind', [['', 'Any kind'], [DELIVERY_WORK, capital(deliveryKindWords())], ...kinds().map(kind => [kind, kindName(kind)])]);
    const remaining = element('input', { type: 'checkbox', checked: state.filters.remaining, onChange: event => { state.filters.remaining = event.target.checked; repaint(); } });
    // Work in no area can be narrowed to where a project has areas and some of its work sits outside them.
    const outside = state.snapshot.hierarchy?.areas?.length && state.snapshot.hierarchy.untaggedTaskIds?.length && !state.scope.scopeId;
    const untagged = outside || state.filters.untagged ? element('label', { class: 'check' }, [element('input', { type: 'checkbox', checked: state.filters.untagged,
      onChange: event => { state.filters.untagged = event.target.checked; state.limit = 100; repaint(); } }), `Not in any ${kindWords(areaKind())[0]}`]) : null;
    filters.append(...[element('label', { class: 'check' }, [remaining, `Remaining eligible ${taskWords()[1]} only`]), untagged,
      button('Clear filters', () => { state.filters = noFilters(); state.limit = 100; render(); }, { class: 'quiet' })].filter(Boolean));
    workbench.append(listPane, detailPane); main.append(...[contextNavigation(), filters, workbench, concernView(), scopeLists()].filter(Boolean));
    renderDetail(detailPane, selected()); repaint();
  }

  // Where a record stands on its own kind's line. The stops are the tracker's: the states of that kind's lifecycle.
  function positionLine(item) {
    const line = stationsOf(lifecycleName(item));
    const at = line.indexOf(item.state === SIDING ? SIDING_HOST : item.state);
    if (at < 0) return paragraph(item.state === OFF_LINE ? 'Canceled. This record is off the lifecycle line; its identity and history are kept.' : `Recorded state: ${labels()[item.state] || item.state}.`, 'notice');
    // A lifecycle with one stop has no line to draw: the record says where it stands in words.
    if (line.length < 2) return paragraph(`${labels()[item.state]}. ${capital(aKind(item.kind))} has no steps to move through, and its state changes no figure.`, 'note');
    const node = element('ol', { class: 'position', 'aria-label': `Lifecycle position: ${labels()[item.state]}` }, line.map((key, index) => {
      const here = index === at;
      return element('li', { class: `stop${here ? ` is-${item.state}` : ''}`, 'aria-current': here ? 'step' : undefined }, [
        element('span', { class: 'dot-zone' }, here ? dot(item.state, 'here') : dot(index < at ? 'passed' : 'ahead')),
        element('span', { text: here ? labels()[item.state] : labels()[key] })]);
    }));
    node.style.setProperty('--stops', String(line.length)); node.style.setProperty('--at', String(at));
    return node;
  }
  function historyLine(entry) {
    const moved = entry.beforeState !== entry.afterState ? `moved it from ${labels()[entry.beforeState] || entry.beforeState} to ${labels()[entry.afterState] || entry.afterState}` : '';
    const filled = !!labels()[entry.afterState] && !RING_STATES.includes(entry.afterState);
    const mark = entry.operation === 'proof' ? ' event-mark--proof' : entry.operation === 'accept' ? ' event-mark--accept' : filled ? ' event-mark--filled' : '';
    return element('li', { class: `is-${labels()[entry.afterState] ? entry.afterState : 'other'}` }, [element('span', { class: `event-mark${mark}`, 'aria-hidden': 'true' }),
      element('div', { class: 'event-text' }, [element('span', {}, [element('strong', { text: entry.actor ? memberName(entry.actor) : 'An unrecorded actor' }),
        ` ${entry.operation === 'transition' && moved ? moved : historyPhrases[entry.operation] || entry.operation}${entry.operation !== 'transition' && moved ? `, and ${moved}` : ''}`]),
      element('span', { class: 'id', text: instant(entry.at) }), entry.reason ? element('span', { class: 'note', text: entry.reason }) : null])]);
  }
  const titled = (name, aside, ...children) => element('div', { class: 'block-list' }, [element('div', { class: 'block-head' }, [element('h4', { class: 'eyebrow', text: name }), aside ? element('span', { class: 'note', text: aside }) : null]), ...children]);
  function recordChoices(name, records, action = openItem) {
    return element('details', {}, [element('summary', { text: `${name} (${records.length})` }),
      element('ul', { class: 'link-list', 'aria-label': name }, records.map(item => element('li', {},
        button(`${item.id}: ${item.title}`, () => action(item), { class: 'quiet' }))))]);
  }
  // Beside a scoped delivery list: the tasks it leaves out, the work that supports them, and what lies outside the scope.
  function scopeLists() {
    if (!state.scope.scopeId) return null;
    const scope = state.snapshot.scope || {};
    const pick = ids => (ids || []).map(uniqueItem).filter(Boolean);
    const container = element('div', { class: 'strip strip--plain' });
    container.append(recordChoices(`Excluded ${taskWords()[1]}`, pick(scope.excludedTaskIds)),
      recordChoices('Supporting work', pick(scope.memberIds).filter(item => !isDelivery(item) && inDelivery(item))),
      recordChoices('Outside delivery scope', items().filter(item => item.id !== state.scope.scopeId && !scope.memberIds?.includes(item.id))));
    container.append(paragraph('Outside records can be inspected and managed here. That does not add them to this delivery scope.', 'note'));
    return container;
  }
  async function inspectConcerns(query) {
    checkpoint(async () => {
      const previous = currentContext();
      begin();
      try {
        const result = await api('/api/concerns', { query: { schemaVersion: 1, ...query }, ...(state.scope.ref !== undefined ? { ref: state.scope.ref } : {}) });
        if (state.contexts.length === CONTEXT_LIMIT) state.contexts.shift();
        state.contexts.push(previous); state.concerns = result; state.view = 'Work';
      } catch (error) { state.message = `Linked concerns unavailable: ${error.message}. The selected source and draft remain displayed.`; }
      finally { state.busy = false; render(); main.querySelector('[aria-label="Exact linked concerns"]')?.focus(); }
    });
  }
  function concernView() {
    const result = state.concerns;
    if (!result) return null;
    const panel = element('section', { class: 'sheet', 'aria-label': 'Exact linked concerns', tabindex: '-1' }, [
      element('h3', { text: 'Linked concerns' }), paragraph(`Exact selection: ${(result.scope?.itemIds || []).concat(result.scope?.paths || []).join(', ')}. Coverage: ${result.coverage}. As of ${instant(result.asOf)}.`, 'note'),
      paragraph('Only declarations for this exact selection are shown. Selecting a shared path is a separate action; inspecting related work does not change delivery membership.', 'note')]);
    panel.append(element('ul', { class: 'link-list' }, (result.relationships || []).map(link => element('li', {}, [
      element('span', { text: `${link.direction}: ${link.owner.itemId} (${link.owner.ownerPath}) declares ${link.relation}; ${link.resolution}. ${link.rationale}` }),
      link.target.path ? button(`Inspect path ${link.target.path}`, () => inspectConcerns({ paths: [link.target.path] }), { class: 'quiet' }) : mono(link.target.itemId),
      ...[link.owner.itemId, link.target.itemId].filter((id, index, ids) => id && ids.indexOf(id) === index).map(id => {
        const record = items().find(item => item.id === id && hasUniqueId(id));
        return record ? button(`Inspect item ${id}`, () => openItem(record), { class: 'quiet' }) : paragraph(`Item ${id} unavailable or ambiguous`, 'note');
      })]))));
    if (result.diagnostics?.length) panel.append(details('Concern inspection limits', result.diagnostics));
    panel.append(paragraph(result.inspection?.pathAvailability || 'Path availability is not certified.', 'note'));
    return panel;
  }
  // The areas and initiatives a record is tagged to, on the record itself, with the one action that changes them. An
  // area shows the areas it sits inside and the areas inside it.
  function tagsBlock(item, offered) {
    const [area, areasWord] = kindWords(areaKind());
    const [initiative, initiatives] = kindWords(initiativeKind());
    const group = (name, ids, none) => element('div', { class: 'tag-group' }, [element('h4', { class: 'eyebrow', text: name }),
      ids.length ? element('div', { class: 'tag-row' }, ids.map(tagPick)) : paragraph(none, 'note')]);
    const block = element('div', { class: 'tags-block' });
    const areas = taggedIds(item, areaKind());
    if (isArea(item)) {
      block.append(group('Sits inside', areas, 'Top of the project'));
      const inside = (areaInfo(item.id)?.childAreaIds || []).filter(uniqueItem);
      if (inside.length) block.append(group(`${capital(areasWord)} inside`, inside, ''));
    } else {
      const linked = taggedIds(item, initiativeKind());
      // An initiative names another initiative only when it is linked to one; any other record says when it has none.
      block.append(...[group(capital(areasWord), areas, `Not in any ${area}`),
        isInitiative(item) && !linked.length ? null : group(capital(initiatives), linked, `Not linked to ${aKind(initiativeKind())}`)].filter(Boolean));
    }
    // Tagging is offered only where the project's profile lists it. A session that may not save sees why, and no working control.
    if (state.snapshot.profile?.capabilities?.includes('tag') && !item.legacy && !item.retired) {
      const action = offered.find(candidate => candidate.operation === 'tag');
      block.append(element('div', { class: 'tags-foot' }, action ? [button('Edit tags', () => beginForm('tag', item), { icon: 'edit' })]
        : [button('Edit tags', undefined, { icon: 'edit', disabled: true }), paragraph('Tags cannot be changed here. The reason is stated with this record’s actions below.', 'note')]));
    }
    return block;
  }
  // The delivery work linked to an initiative, each record with its kind and state. A task joins from its own record;
  // nothing is linked from here. The list is of linked work, not of counted tasks: a story, a subtask, and a canceled or
  // retired task are linked without being counted. How many tasks count is the read's own figure for the initiative,
  // said beside the list, and nothing is said of it when the read withholds its figures.
  function linkedWork(item) {
    const relation = tagRelation(initiativeKind());
    const linked = items().filter(other => other.id !== item.id && inDelivery(other) && other.links?.some(link => link.relation === relation && link.itemId === item.id));
    const [task, tasks] = taskWords();
    const one = kindWords(item.kind)[0];
    const shown = state.linkedAll === item.id ? linked : linked.slice(0, HISTORY_LIMIT);
    const rows = shown.map(other => {
      const areas = taggedIds(other, areaKind());
      // Title first, then what it is and where it stands, as a row of the Work list reads.
      return element('li', {}, [nameLink(other.title, () => openItem(other), `${other.title}: open this ${kindWords(other.kind)[0]}`),
        element('span', { class: 'row-context' }, [kindMark(other), stateWord(other), other.retired ? flag('Retired') : null]),
        areas.length ? element('span', { class: 'tag-row' }, areas.slice(0, 1).map(tagPick)) : element('span', { class: 'note', text: `Not in any ${kindWords(areaKind())[0]}` })]);
    });
    const entry = figuresStated() ? figureFor(item.id) : null;
    const stated = !entry ? null : entry.total ? `${counted(entry.total, `${task} counts`, `${tasks} count`)} toward this ${one}’s delivery.`
      : `No ${task} counts toward this ${one}’s delivery yet, so no percentage applies.`;
    // The other kinds on the delivery line, in the project's words: they can be linked and are never counted.
    const others = listWords(kinds().filter(kind => vocabulary().kindLifecycles?.[kind] === deliveryLine() && kind !== vocabulary().deliveryKind).map(kind => kindWords(kind)[1]));
    const apart = `Canceled or retired ${tasks}${others ? `, and ${others},` : ''} are listed without being counted.`;
    const block = titled('Linked work', `A ${task} joins from its own record, with Edit tags`,
      stated ? paragraph(linked.length ? `${stated} ${apart}` : stated, 'note') : null,
      linked.length ? element('ul', { class: 'linked-list' }, rows) : paragraph('No work is linked yet.', 'note'),
      linked.length > shown.length ? actions(button(`Show all ${linked.length} linked records`, () => {
        // The rest are added where the list stands: the sheet is not redrawn, so the page does not jump, and the reader
        // is put on the first record that was not shown before.
        state.linkedAll = item.id;
        const full = linkedWork(item);
        block.replaceWith(full);
        full.querySelectorAll('.linked-list > li')[shown.length]?.querySelector('button')?.focus();
      }, { class: 'quiet' })) : null);
    return block;
  }
  function renderDetail(pane, item) {
    pane.replaceChildren();
    pane.classList.toggle('record-sheet--empty', !item);
    if (!item) { pane.append(element('h3', { text: 'Choose work to inspect', tabindex: '-1' }), paragraph('Select a record to see its outcome, responsibility, proof and available actions.')); return; }
    const { reason, offered, lead } = offeredActions(item);
    pane.append(element('div', { class: 'record-head' }, [kindMark(item), element('span', { class: 'id', text: item.id }), element('span', { class: 'rev', text: `rev ${item.revision}` }), item.retired ? flag('Retired') : null]),
      element('h3', { text: item.title, tabindex: '-1', 'aria-label': `${item.id}: ${item.title}` }), paragraph(item.intent || 'Intent not recorded.', 'intent'), tagsBlock(item, offered));
    const lane = element('div', { class: 'sheet-main' }, positionLine(item));
    const figure = figureFor(item.id);
    const [task, tasks] = taskWords();
    // The read says a record is overdue; the page says by how long and, for an initiative, what is still open under it.
    if (item.overdue) lane.append(element('p', { class: 'notice notice--stop notice--mark' }, [icon('alert'), element('span', {}, [element('strong', { text: 'Overdue.' }),
      ` It was due on ${longDay(item.deadline)}, ${counted(daysPast(item), 'day', 'days')} ago${isInitiative(item) && figure?.remaining ? `, and ${counted(figure.remaining, `linked ${task} is`, `linked ${tasks} are`)} not accepted yet` : ''}.`])]));
    if (hasRedaction(item)) lane.append(paragraph('Some displayed content is redacted. Redacted source fields cannot be edited here; inspect their canonical owner through your project’s tools.', 'notice'));
    if (item.blocker) lane.append(paragraph(`Blocked: ${item.blocker.reason}; resume state: ${labels()[item.blocker.resumeState] || item.blocker.resumeState}`, 'notice notice--stop'));
    if (item.retired) lane.append(paragraph(`Retired: ${item.retired.reason}. History and references are retained.`, 'notice'));
    if (item.prerequisiteReasons?.length) lane.append(element('div', { class: 'notice' }, [element('strong', { text: 'Current prerequisite reasons' }), element('ul', {}, item.prerequisiteReasons.map(line => element('li', { text: line })))]));
    if (item.legacy) lane.append(paragraph('This is a legacy record. Review adoption before managing its tracking metadata. Existing content remains owned by this record.', 'notice'));
    if (reason) lane.append(paragraph(reason, 'notice'));
    const steps = offered.filter(action => action.operation !== 'tag');
    if (steps.length) {
      const leading = steps.filter(action => action.name === lead || lead === 'Accept work' && action.name === 'Record observed proof');
      if (leading.length) {
        // Closing an initiative is a person's decision, said with what stays open under it.
        const open = figure?.remaining ? ` The ${figure.remaining === 1 ? `1 ${task} that is not accepted stays` : `${figure.remaining} ${tasks} that are not accepted stay`} open and ${figure.remaining === 1 ? 'stays' : 'stay'} linked.` : '';
        const stop = lead === STEP_NAMES.tracker.done ? ['Next stop: a closing decision', `Closing is your own decision and needs your reason.${open} ${capital(aKind(item.kind))} never closes by itself, even at 100%.`]
          : nextStops[lead] || [`Next stop: ${lead.toLocaleLowerCase()}`, 'This is the next usual step for this record. It is recorded only when you save it.'];
        const update = item.overdue && isInitiative(item) ? offered.find(action => action.operation === 'update') : null;
        lane.append(element('div', { class: 'next-stop' }, [element('div', { class: 'next-stop-text' }, [element('h4', { text: stop[0] }), paragraph(stop[1])]),
          actions(...leading.map(action => actionButton(action, item, lead)), update ? button('Change the due date', () => beginForm('update', item, { focus: 'deadline' })) : null)]));
      }
      const others = steps.filter(action => !leading.includes(action));
      if (others.length) lane.append(element('div', { class: 'actions actions--record' }, others.map(action => actionButton(action, item, lead))));
      lane.append(paragraph('Cancel or retire work to preserve identity, incoming references and history. Deletion is restricted to an unreferenced, unassigned record that was never worked on: no activity, proof, acceptance, health or lifecycle history. Its preview refuses established work and never cascades.', 'note'));
    }
    if (isInitiative(item)) lane.append(linkedWork(item));
    if (inDelivery(item)) lane.append(titled('Acceptance criteria', item.criteria?.length ? 'Proof is recorded against these exact criteria' : null, criteriaList(item)));
    if (item.history?.length) lane.append(titled('Record history', null, element('ol', { class: 'timeline' }, [...item.history].reverse().slice(0, HISTORY_LIMIT).map(historyLine)),
      item.history.length > HISTORY_LIMIT ? paragraph(`${item.history.length - HISTORY_LIMIT} earlier changes are in the full history below.`, 'note') : null));
    // Tags have their own place on the sheet; the links listed here are the record's other relations and what refers to it.
    const tags = vocabulary().tagRoles || {};
    const incoming = items().filter(other => other.id !== item.id && other.links?.some(link => link.itemId === item.id && !Object.hasOwn(tags, link.relation))).map(other => ({ id: other.id, owner: other.ownerPath }));
    const linked = [...(item.links || []).filter(link => !Object.hasOwn(tags, link.relation)).map(link => [named('linkRoles', link.relation), link.itemId ?? null, link.path ?? null]),
      ...incoming.map(other => ['Referenced by', other.id, null])];
    const rail = element('div', { class: 'rail' }, factCells(recordFacts(item), 'fact-list'));
    if (linked.length) rail.append(titled('Links', null, element('ul', { class: 'link-list' }, linked.map(([relation, id, path]) => element('li', {}, [element('span', { class: 'link-relation', text: relation }),
      id === null ? button(`Inspect path ${path}`, () => inspectConcerns({ paths: [path] }), { class: 'quiet' })
        : uniqueItem(id) ? button(`Inspect item ${id}`, () => openItem(uniqueItem(id)), { class: 'quiet', title: uniqueItem(id).title })
        : element('span', { class: 'link-title', text: 'Not uniquely available in the selected source' }), id === null ? null : element('span', { class: 'id', text: id })])))));
    rail.append(element('div', { class: 'source-owner' }, [element('h4', { class: 'eyebrow', text: 'Source owner' }), element('span', { class: 'path', text: item.ownerPath }),
      element('span', { class: 'id', text: `content ${String(item.contentHash).slice(0, 8)}, priority ${item.priority} (lower comes first)` })]));
    // Concerns are read by identity, and an identity that two owners share selects nothing.
    if (hasUniqueId(item.id)) rail.append(actions(button(`Inspect concerns for ${item.id}`, () => inspectConcerns({ itemIds: [item.id] }), { class: 'quiet' })));
    pane.append(element('div', { class: 'sheet-body' }, [lane, rail]), element('div', { class: 'strip strip--plain' }, [
      details('Links and tags', { links: item.links }), details('Incoming references', incoming),
      details('Proof and acceptance history', { proof: item.proofs, acceptance: item.acceptanceHistory, applicability: item.verification }),
      details('Activity and change history', { activity: item.activity, history: item.history }),
      details('This record’s dated owner health', item.health)]));
  }

  // Display projections shared by the change preview and the source comparison. They format facts; they decide nothing.
  // A projection that names a fact only some kinds own says which records it applies to.
  const titles = ids => ids.map(id => uniqueItem(id)?.title || id).join('\n') || 'None';
  const projections = [
    ['Work', record => `${record.id}: ${record.title}`], ['Outcome', record => record.intent],
    ['Owner', record => `${memberName(record.assigneeId)}${record.assigneeId ? ` (${record.assigneeId})` : ''}`],
    ['State', record => labels()[record.state] || record.state], ['Priority', record => record.priority],
    ['Level', record => record.level ? levelName(record.level) : 'Not set', isArea],
    ['Type', record => record.type ? typeName(record.type) : 'Not set', isInitiative],
    ['Priority level', record => record.priorityLevel ? named('priorityLevels', record.priorityLevel) : 'Not set', isInitiative],
    ['Due date', record => record.deadline ? longDay(record.deadline) : 'No due date', record => !isArea(record)],
    ['Areas', record => titles(taggedIds(record, areaKind()))],
    ['Initiatives', record => titles(taggedIds(record, initiativeKind())), record => !isArea(record)],
    ['Acceptance', record => record.acceptance?.accepted ? 'Accepted' : 'Not accepted', inDelivery],
    ['Verification', record => `${record.verification?.status || 'unknown'}: ${record.verification?.reason || 'Not established'}`, inDelivery],
    ['Retired', record => record.retired ? record.retired.reason : 'No'],
    ['Criteria', record => (record.criteria || []).map(criterion => `${criterion.id}: ${criterion.text}`).join('\n') || 'None', inDelivery],
    ['Links', record => (record.links || []).filter(link => !Object.hasOwn(vocabulary().tagRoles || {}, link.relation)).map(link => `${link.relation}: ${link.itemId ?? link.path}`).join('\n') || 'None'],
    ['Collaborators', record => (record.collaboratorIds || []).map(memberName).join(', ') || 'None'],
    ['Record health', record => record.health?.status === 'attested' ? `${record.health.assessment} (${record.health.observedAt})` : 'Not attested']
  ];
  // A fact a record's kind does not own is left out of its projection, so a table never states "none" for it.
  const projected = record => projections.map(([name, read, applies]) => [name, !applies || applies(record) ? text(read(record)) : null]);
  const differingFields = (before, after) => projected(before).filter(([, value], index) => value !== projected(after)[index][1]).map(([name]) => name);
  function comparisonTable(before, after, beforeName, afterName) {
    const sides = [[beforeName, before], [afterName, after]].filter(([, record]) => record);
    const differing = before && after ? differingFields(before, after) : [];
    const rows = projected(sides[0][1]).map(([name], index) => ({ name, values: sides.map(([, record]) => projected(record)[index][1]), changed: differing.includes(name) }))
      .filter(row => row.values.some(value => value !== null) && (sides.length === 1 || row.changed || row.name === 'Work'));
    const unchanged = sides.length === 2 ? projections.map(([name]) => name).filter((name, index) => name !== 'Work' && !differing.includes(name) && projected(sides[0][1])[index][1] !== null) : [];
    const between = (index, changed) => index ? element('td', { class: 'arrow', 'aria-hidden': 'true' }, changed ? icon('arrow') : []) : null;
    return element('div', { class: 'diff' }, [scrollBox(sides.map(([name]) => name).join(' and '), element('table', {}, [
      element('thead', {}, element('tr', {}, [element('th', { scope: 'col', text: 'Field' }), ...sides.flatMap(([name], index) => [between(index, false), element('th', { scope: 'col', text: name })])])),
      element('tbody', {}, rows.map(row => element('tr', { class: row.changed ? 'changed' : undefined }, [element('th', { scope: 'row', text: row.changed ? `${row.name} (changes)` : row.name }),
        ...row.values.flatMap((value, index) => [between(index, row.changed), element('td', {}, row.changed && index ? element('span', { class: 'new-value', text: value }) : value)])])))]), 'table-scroll', 'a table'),
    unchanged.length ? paragraph(`Unchanged: ${unchanged.join(', ').toLocaleLowerCase()}.`, 'table-note') : null]);
  }

  // Records whose owner content differs between the selected source and the current checkout, once that checkout has been read for comparison.
  // A checkout that could not be read has no records to set beside the selected source: it has a reason, and no difference.
  const compared = () => state.compare && state.compare.coverage !== 'unavailable' ? state.compare : null;
  function comparisonRefusal() {
    const read = state.compare;
    if (!read || compared()) return null;
    const project = read.vocabulary?.project;
    if (project?.code && project.storedVersion === null) return unreadableReason(project);
    // Findings about single records are listed before the one that made the whole read unavailable: a selected scope the
    // checkout does not hold. That one is the reason; any other unavailable read gives its only or first finding.
    const cause = (read.diagnostics || []).find(finding => finding.code === 'UNAVAILABLE_SCOPE') || read.diagnostics?.[0];
    return [sentence(cause?.reason || 'The current checkout is unavailable')];
  }
  function differences() {
    if (!compared()) return [];
    const currentByKey = new Map((state.compare.items || []).map(item => [itemKey(item), item]));
    const selectedByKey = new Map(items().map(item => [itemKey(item), item]));
    const order = entry => entry.local && entry.baseline ? 0 : entry.local ? 1 : 2;
    return [...new Set([...currentByKey.keys(), ...selectedByKey.keys()])].filter(key => currentByKey.get(key)?.contentHash !== selectedByKey.get(key)?.contentHash)
      .map(key => ({ key, local: currentByKey.get(key), baseline: selectedByKey.get(key) })).sort((a, b) => order(a) - order(b));
  }
  function renderChanges() {
    const snapshot = state.snapshot;
    const shared = snapshot.source?.kind === 'shared';
    const differing = differences();
    const refusal = comparisonRefusal();
    main.append(pageLead(heading('Changes and sharing'), paragraph('Local work is a proposal until shared through your team’s Git process. This app reads existing local refs and does not stage, commit, push, or infer remote freshness.', 'page-intro')));
    const label = String(snapshot.source?.label || 'Selected source unavailable');
    main.append(element('section', { class: 'sheet', 'aria-label': 'What is being compared' }, [element('div', { class: 'compare' }, [
      element('div', { class: 'compare-end' }, [element('span', { class: `end-dot end-dot--${sourceToneOf(snapshot)}`, 'aria-hidden': 'true' }), element('div', {}, [
        element('span', { class: 'label', text: shared ? 'Selected source, read-only' : 'Selected source' }), element('span', { class: `compare-name${shared ? ' mono' : ''}`, text: shared ? snapshot.source.ref : label.split(';')[0] }),
        element('span', { class: 'note', text: `${label}. Remote freshness ${snapshot.source?.remoteFreshness || 'unknown'}` })])]),
      element('div', { class: 'compare-link' }, element('span', { class: `pill${refusal ? ' pill--stop' : state.compare ? differing.length ? ' pill--warn' : ' pill--good' : ''}`,
        text: refusal ? 'Not compared' : state.compare ? counted(differing.length, 'record differs', 'records differ') : 'Not compared yet' })),
      element('div', { class: 'compare-end compare-end--checkout' }, [element('div', {}, [element('span', { class: 'label', text: 'Current checkout' }), element('span', { class: 'compare-name', text: 'Working copy' }),
        element('span', { class: 'note', text: state.compare ? `Read at ${state.compare.asOf ? instant(state.compare.asOf) : 'an unknown time'}, coverage ${state.compare.coverage}` : 'Read when you compare' })]),
      element('span', { class: 'end-dot end-dot--live', 'aria-hidden': 'true' })])]),
    element('div', { class: 'compare-form' }, [scopeControls(), actions(button('Compare with current checkout', compareCurrent, { class: 'primary' }))])]));
    const side = element('div', { class: 'stack side' });
    let section;
    if (refusal) {
      section = sheet('difference-heading', 'What differs', null, 'sheet fill');
      section.append(element('p', { class: 'notice notice--stop' }, ['Nothing is compared: the current checkout could not be read. ', ...refusal, ' Resolve it, then compare again.']),
        details('Current inspection limitations', state.compare.diagnostics));
    } else if (state.compare) {
      const both = differing.filter(entry => entry.local && entry.baseline).length;
      const added = differing.filter(entry => entry.local && !entry.baseline).length;
      const identical = new Set([...(state.compare.items || []), ...items()].map(itemKey)).size - differing.length;
      section = sheet('difference-heading', 'What differs', `${both} changed, ${added} only in the current checkout, ${differing.length - both - added} only in the selected source, ${identical} identical`, 'sheet fill');
      if (!differing.length) section.append(paragraph(state.compare.coverage === 'complete' && snapshot.coverage === 'complete' ? 'No owner content differences were found in these inspected snapshots.' : 'No inspected owner differences were found. Incomplete coverage prevents a complete comparison.', 'notice'));
      else section.append(element('ul', { class: 'diff-list' }, differing.slice(0, 100).map(({ key, local, baseline }) => {
        const record = local || baseline;
        const where = local && baseline ? `Differs in: ${differingFields(baseline, local).join(', ').toLocaleLowerCase() || 'recorded metadata only'}.` : local ? 'Only in the current checkout.' : 'Only in the selected source.';
        const shown = items().find(item => itemKey(item) === key);
        return element('li', { class: 'diff-row' }, [
          element('span', { class: `diff-tag${local && baseline ? ' diff-tag--changed' : local ? ' diff-tag--new' : ''}`, text: local && baseline ? 'Changed' : local ? 'New here' : 'Not here' }),
          element('div', { class: 'diff-text' }, [element('strong', { text: record.title }), element('span', { class: 'note', text: where })]),
          shown ? button('Open', () => openItem(shown), { class: 'quiet', 'aria-label': `Open ${record.id}: ${record.title}` }) : null,
          element('details', {}, [element('summary', { text: `${record.id}: owner difference` }), local && baseline ? comparisonTable(baseline, local, 'Selected source', 'Current checkout') : null,
            element('p', { class: 'id', text: record.ownerPath }),
            element('pre', { text: JSON.stringify({ owner: record.ownerPath, selected: baseline || 'Not inspected in selected source', current: local || 'Not inspected in current checkout' }, null, 2) })])]);
      })));
      if (differing.length > 100) section.append(paragraph(`${differing.length - 100} additional differences are omitted from this bounded view. Inspect owners with your project tools.`, 'note'));
      section.append(details('Current inspection limitations', state.compare.diagnostics));
      if (differing.length) side.append(element('section', { class: 'sheet', 'aria-labelledby': 'files-heading' }, [element('h3', { id: 'files-heading', text: 'Record files that differ' }),
        element('ul', { class: 'file-list' }, differing.slice(0, 100).map(({ local, baseline }) => element('li', {}, [
          element('span', { class: `file-mark${local && baseline ? '' : local ? ' file-mark--new' : ' file-mark--gone'}`, title: local && baseline ? 'Changed' : local ? 'Only in the current checkout' : 'Only in the selected source', text: local && baseline ? 'M' : local ? 'A' : 'D' }),
          element('span', { text: (local || baseline).ownerPath })]))),
        paragraph('Share them with your usual Git flow. Nothing on this page does it for you.', 'note')]));
    } else {
      section = element('section', { class: 'sheet sheet--empty fill', 'aria-labelledby': 'difference-heading' }, [element('h3', { id: 'difference-heading', text: 'What differs' }),
        paragraph('Nothing is compared yet. Compare with the current checkout to list the records that differ from the selected source.')]);
    }
    const report = state.report;
    side.append(element('section', { class: 'sheet', 'aria-labelledby': 'report-heading' }, [element('div', { class: 'sheet-head' }, [element('h3', { id: 'report-heading', text: 'Offline report' }),
      report ? element('span', { class: 'report-state' }, [icon('check'), `${report.status[0].toUpperCase()}${report.status.slice(1)}`]) : null]),
    paragraph(report ? 'One self-contained file that opens without this app. Read it on the Report tab, or open the file with the project report tool.' : 'One self-contained file that opens without this app. Refresh it to match the selected source, or read it on the Report tab.', 'note'),
    report?.path ? element('span', { class: 'link-path', text: report.path }) : null, actions(button('Refresh offline report', refreshReport), button('Open status report', () => navigate('Report'), { class: 'quiet' }))]));
    main.append(element('div', { class: 'split split--start' }, [section, side]), element('div', { class: 'strip strip--plain' }, details('Selected inspection limitations', snapshot.diagnostics)));
    if (state.form?.conflict) main.append(conflictPane());
  }

  // The status report is the same generated file the report tool writes. It is shown in a frame that has no origin of its
  // own: the report cannot read this page or its session, and it reaches no network.
  const reportScope = () => `${scopeLabel()}, ${sourcePhrase()}`;
  // Refusals a reader can act on are said in their words; any other keeps the reason the workspace gave.
  const REPORT_ADVICE = { HUMAN_COLLISION: 'The file in the report’s place was not written by this tool, so it is left as it is. Move it away, then refresh the report.',
    CONFLICT: 'Work changed while the report was being written. Refresh the report to read it again.' };
  // One frame is kept for the life of the page. Its document is assigned only when the report shown changes, so a redraw
  // around it neither reads a large report in again nor loses the reader's place in it.
  let reportFrame = null;
  function frameFor(shown) {
    if (!reportFrame) reportFrame = element('iframe', { class: 'report-frame', sandbox: 'allow-scripts allow-modals' });
    const title = `Status report: ${shown.label}`;
    if (reportFrame.title !== title) reportFrame.title = title;
    if (reportFrame.shownKey !== shown.key) { reportFrame.srcdoc = shown.html; reportFrame.shownKey = shown.key; }
    return reportFrame;
  }
  function renderReport() {
    const doc = state.reportDoc;
    const shown = doc?.html ? doc : null;
    const lead = [pageHead('Status report', reportScope(), button('Refresh report', () => checkpoint(() => reread()), { icon: 'refresh' }))];
    if (doc?.problem) lead.push(element('div', { class: 'banner banner--alert', role: 'alert' }, [
      element('span', { class: 'banner-mark', 'aria-hidden': 'true' }, icon('alert')),
      element('div', { class: 'banner-text' }, [paragraph(shown ? 'The report could not be brought up to date' : 'There is no report to show', 'banner-title'),
        paragraph(`${doc.advice || sentence(doc.problem)}${shown ? ` The report below is the last one read: ${shown.label}, written ${instant(shown.generatedAt)}.` : ''}`, 'banner-body')]),
      button('Try again', () => { dismissFeedback(); loadReport(); })]));
    if (shown) {
      // The frame keeps the last report read while another is on its way, so the strip says which report that is:
      // current only once nothing is being read and it is the report for the scope now selected.
      const updating = state.busy || state.reportDue;
      const fresh = !doc.problem && !updating && shown.label === reportScope();
      lead.push(element('div', { class: 'strip' }, [element('span', { class: 'strip-title', text: 'Report' }),
        element('span', { class: `report-state${fresh ? '' : ' report-state--held'}` }, [icon(fresh ? 'check' : 'clock'), fresh ? 'Up to date' : updating ? 'Updating…' : 'Not updated']),
        fresh ? null : element('span', { text: `Showing the last report read: ${shown.label}` }),
        element('span', { text: `Written ${instant(shown.generatedAt)}` }),
        element('span', {}, ['Also saved as ', mono(shown.path), ', which opens without this app'])]));
      const frame = frameFor(shown);
      if (frame.parentNode === main) frame.before(...lead); else main.append(...lead, frame);
    } else {
      reportFrame?.remove();
      if (!doc?.problem) lead.push(element('div', { class: 'report-frame report-frame--empty' }, paragraph(state.busy || state.reportDue ? 'Bringing the report up to date…' : 'No report has been read yet. Refresh the report to read it.')));
      main.append(...lead);
    }
  }
  async function loadReport() {
    if (state.busy) return;
    const label = reportScope();
    // Opening the view put the reader on its heading; the redraws around the request keep them there.
    const onHeading = document.activeElement === main.querySelector('h2');
    state.reportDue = false; state.busy = true; render(onHeading);
    try {
      const { report, html } = await api('/api/report-view', state.scope);
      if (typeof html === 'string' && html) {
        // The same scope read from the same work at the same time is the same report.
        state.reportDoc = { html, label, path: report.path, generatedAt: report.generatedAt, problem: '', advice: '',
          key: JSON.stringify([label, report.path, report.fingerprint, report.generatedAt]) };
        state.report = { status: String(report.status), path: report.path };
      } else state.reportDoc = { ...state.reportDoc, problem: report?.reason || 'No report is available for this scope', advice: '' };
    } catch (error) { state.reportDoc = { ...state.reportDoc, problem: error.message, advice: REPORT_ADVICE[error.code] || '' }; }
    finally { state.busy = false; render(onHeading); }
  }

  function beginForm(operation, item, extra = {}) {
    if (writableReason(item)) return announce(writableReason(item));
    checkpoint(() => {
      const base = item ? clone(item) : null;
      state.form = { operation, base, values: {
        kind: item?.kind || extra.kind || kinds()[0], title: item?.title || '', intent: item?.intent || '', priority: item?.priority || 999,
        criteria: clone(item?.criteria || []), assigneeId: item?.assigneeId ?? '', collaboratorIds: clone(item?.collaboratorIds || []),
        // The links a record can have edited: every one that is not a tag. Its tags stay as stored unless Edit tags changes them.
        links: clone((item?.links || []).filter(link => !isTagRelation(link?.relation))), optOut: !!item?.optOut,
        // The values a kind owns, and the areas and initiatives a record is tagged to. `finding` holds what the reader typed in each picker.
        type: item?.type || '', level: item?.level || '', priorityLevel: item?.priorityLevel || '', deadline: item?.deadline || '',
        areaIds: taggedIds(item, areaKind()), initiativeIds: taggedIds(item, initiativeKind()), finding: { areaIds: '', initiativeIds: '' },
        nextState: extra.nextState || '', correction: !!extra.correction, reason: '', resolution: '', reviewed: false, decisionsResolved: false,
        observed: false, decision: false, result: '', criterionIds: [], summary: '', adoptionReviewed: false,
        assessment: '', observedAt: '', healthConfirmed: false, deletionConfirmed: false
      }, dirty: false, preview: null, request: null, conflict: null, error: '' };
      state.view = 'Editor'; render(true);
      // An action that names one field puts the reader on it.
      if (extra.focus) document.getElementById(`edit-${extra.focus}`)?.focus();
    }, false);
  }
  function changeSteps(previewed) {
    const step = (name, status) => element('li', { class: status === 'done' ? 'done' : undefined, 'aria-current': status === 'current' ? 'step' : undefined },
      [element('span', { class: 'step-mark', 'aria-hidden': 'true' }, status === 'done' ? icon('check') : []), name]);
    return element('ol', { id: 'change-steps', class: 'steps', 'aria-label': 'Steps for this change' }, [step('Describe the change', previewed ? 'done' : 'current'),
      step('Review the exact change', previewed ? 'current' : 'ahead'), step('Save to your checkout', 'ahead')]);
  }
  const PREVIEW_READY = 'Preview ready. Review the exact change; nothing is saved yet.';
  const refuse = (form, message) => { form.error = message; form.errorSaid = false; };
  function changed() {
    const form = state.form;
    form.dirty = true; form.preview = null; form.request = null; form.error = '';
    // What was said about the earlier attempt no longer describes this draft.
    main.querySelector('.editor-error')?.remove();
    if (state.message === PREVIEW_READY) announce('');
    document.getElementById('preview-pane')?.replaceChildren();
    document.getElementById('change-steps')?.replaceWith(changeSteps(false));
    document.getElementById('preview-change')?.classList.add('primary');
    document.getElementById('draft-note')?.removeAttribute('hidden');
  }
  // The label sits beside its control, never around it: a label that wraps a select takes the option text into its own
  // text, so the control can no longer be found by the label alone.
  function labelledField(label, control, ...notes) { return element('div', { class: 'field' }, [element('label', { for: control.id, text: label }), control, ...notes]); }
  function field(container, name, label, options = {}) {
    const form = state.form;
    const id = `edit-${name}`;
    const redacted = options.sourceValue !== undefined && (hasRedaction(options.sourceValue) || hasRedaction(form.values[name]));
    const disabled = state.busy || !!state.uncertain || redacted || options.disabled;
    const control = options.choices
      ? element('select', { id, disabled, required: options.required }, options.choices.map(([value, title, unavailable]) => element('option', { value, text: title, disabled: unavailable })))
      : element(options.multiline ? 'textarea' : 'input', { id, type: options.type || 'text', disabled, required: options.required,
        maxlength: options.max || 2000, min: options.min, max: options.maxNumber, autocomplete: 'off' });
    control.value = form.values[name] ?? '';
    control.addEventListener(options.choices ? 'change' : 'input', () => { form.values[name] = control.value; changed(); });
    container.append(labelledField(label, control, options.help ? paragraph(options.help, 'note') : null,
      redacted ? paragraph('Redacted original field: editing is unavailable here. It will be omitted from the change.', 'note') : null));
    return control;
  }
  function check(container, name, label, required = false) {
    const control = element('input', { type: 'checkbox', checked: state.form.values[name], required, disabled: state.busy || !!state.uncertain,
      onChange: event => { state.form.values[name] = event.target.checked; changed(); } });
    container.append(element('label', { class: 'check' }, [control, label]));
  }
  // After a row is removed the reader is put on the row that took its place, else the one before it, else the Add button.
  function focusRow(rows, index, addId) {
    const left = main.querySelectorAll(rows);
    (left[Math.min(index, left.length - 1)]?.querySelector('button') || document.getElementById(addId))?.focus();
  }
  function criteriaEditor(container) {
    const form = state.form;
    const unsafe = hasRedaction(form.base?.criteria || []) || hasRedaction(form.values.criteria);
    const group = element('fieldset', { disabled: state.busy || !!state.uncertain || unsafe }, [element('legend', { text: 'Acceptance criteria (optional for capture)' })]);
    if (unsafe) group.append(paragraph('Redacted criteria cannot be replaced here. Their original values will be preserved.', 'note'));
    for (const [index, criterion] of form.values.criteria.entries()) {
      const row = element('div', { class: 'criterion-row' });
      for (const [name, label, max] of [['id', 'Stable criterion ID', 120], ['text', 'Observable outcome', 8000]]) {
        const id = `criterion-${index}-${name}`;
        const control = element(name === 'text' ? 'textarea' : 'input', { id, required: true, maxlength: max, value: criterion[name] });
        control.value = criterion[name];
        control.addEventListener('input', () => { criterion[name] = control.value; changed(); });
        row.append(element('label', { class: 'field', for: id }, [element('span', { class: 'label', text: label }), control]));
      }
      const remove = button('', () => { form.values.criteria.splice(index, 1); changed(); render(); focusRow('.criterion-row', index, 'add-criterion'); }, { 'aria-label': `Remove criterion ${criterion.id || index + 1}` });
      remove.append(icon('close'));
      row.append(remove); group.append(row);
    }
    group.append(element('div', { class: 'add-row' }, [button('Add criterion', () => { form.values.criteria.push({ id: '', text: '' }); changed(); render(); document.getElementById(`criterion-${form.values.criteria.length - 1}-id`)?.focus(); }, { id: 'add-criterion', icon: 'plus' }),
      paragraph('Use literal stable IDs, for example AC-1. Keep an ID when refining the same outcome; do not renumber existing criteria.', 'note')]));
    container.append(group);
  }
  function linksEditor(container) {
    const form = state.form;
    const unsafe = hasRedaction(form.base.links) || hasRedaction(form.values.links);
    const group = element('fieldset', { disabled: state.busy || !!state.uncertain || unsafe }, [element('legend', { text: 'Exact links' })]);
    if (unsafe) group.append(paragraph('Some original links are redacted. Replacing links is unavailable here; inspect the canonical owner.', 'notice'));
    // A tag is not a choice here: the relations offered are every link relation that tags nothing.
    const relations = (vocabulary().linkRoles || []).filter(value => !isTagRelation(value));
    group.append(paragraph(`${capital(kindWords(areaKind())[1])} and ${kindWords(initiativeKind())[1]} are tags. They are not listed or changed here: change them with Edit tags.`, 'note'));
    for (const [index, link] of form.values.links.entries()) {
      const row = element('div', { class: 'link-row' });
      const relation = element('select', { id: `relation-${index}` }, relations.map(value => element('option', { value, text: value })));
      relation.value = link.relation;
      relation.addEventListener('change', () => {
        link.relation = relation.value; delete link.itemId; delete link.path;
        if (['spec', 'plan', 'source'].includes(link.relation)) link.path = ''; else link.itemId = '';
        changed(); render();
      });
      row.append(labelledField('Relationship', relation));
      const acceptsPath = ['spec', 'plan', 'source'].includes(link.relation);
      const pathLink = acceptsPath && !Object.hasOwn(link, 'itemId');
      if (acceptsPath) {
        const owner = element('select', { id: `link-owner-${index}` }, [
          element('option', { value: 'path', text: 'Public project file' }),
          element('option', { value: 'itemId', text: 'Tracked work identity' })
        ]);
        owner.value = pathLink ? 'path' : 'itemId';
        owner.addEventListener('change', () => {
          delete link.path; delete link.itemId; link[owner.value] = ''; changed(); render();
        });
        row.append(labelledField('Target owner', owner));
      }
      const target = pathLink ? element('input', { id: `link-${index}`, required: true, maxlength: 500 })
        : element('select', { id: `link-${index}`, required: true }, [element('option', { value: '', text: 'Choose exact work' }), ...items().filter(item => item.id !== form.base.id && hasUniqueId(item.id)).map(item => element('option', { value: item.id, text: `${item.id}: ${item.title}` }))]);
      target.value = pathLink ? link.path || '' : link.itemId || '';
      target.addEventListener(pathLink ? 'input' : 'change', () => { link[pathLink ? 'path' : 'itemId'] = target.value; changed(); });
      row.append(labelledField(pathLink ? 'Public project-relative path' : 'Work identity', target), button('Remove link', () => { form.values.links.splice(index, 1); changed(); render(); focusRow('.link-row', index, 'add-link'); }));
      group.append(row);
    }
    group.append(element('div', { class: 'add-row' }, [button('Add link', () => { form.values.links.push({ relation: 'dependency', itemId: '' }); changed(); render(); document.getElementById(`relation-${form.values.links.length - 1}`)?.focus(); }, { id: 'add-link', icon: 'plus' }),
      paragraph('Links are explicit. Public paths must be inside this project and outside sensitive files. The preview checks unresolved owners and cycles.', 'note')]));
    container.append(group);
  }
  // How many matches a picker lists at once. A reader narrows a long project by typing, never by scanning one control per record.
  const PICK_LIMIT = 8;
  // The areas a record may be tagged to. An area may sit inside any area that is not at a deeper level than its own: one
  // of its own level is allowed, and one with no level always is. An area with no level of its own is offered every
  // other area, and one at the shallowest level sits inside nothing. It is never offered itself or an area inside it;
  // the tracker still refuses a wrong choice when it is saved.
  function areaChoices(form) {
    const all = (state.snapshot.hierarchy?.areas || []).map(area => uniqueItem(area.id)).filter(Boolean);
    if (form.values.kind !== areaKind()) return all;
    const own = form.base?.id;
    const below = own ? areasInside(own) : new Set();
    // An unset level is no level: it is never deeper than another, and it places no limit on what is offered.
    const depth = level => (vocabulary().levels || []).indexOf(level);
    const at = depth(form.values.level);
    return all.filter(area => area.id !== own && !below.has(area.id) && (at < 0 || (at > 0 && depth(area.level) <= at)));
  }
  // Which areas an area of this level may sit inside, said in the project's own level names.
  function parentHint(level) {
    const levels = vocabulary().levels || [];
    const [area, areasWord] = kindWords(areaKind());
    const word = value => levelName(value).toLocaleLowerCase();
    const many = value => { const name = word(value); return /[^aeiou]y$/.test(name) ? `${name.slice(0, -1)}ies` : /(?:s|x|ch|sh)$/.test(name) ? `${name}es` : `${name}s`; };
    const a = value => `${/^[aeiou]/.test(word(value)) ? 'an' : 'a'} ${word(value)}`;
    const at = levels.indexOf(level);
    if (at < 0) return `This ${area} has no level, so any other ${area} is offered.`;
    if (!at) return `${capital(a(level))} sits at the top of the project, so there is nothing for it to sit inside.`;
    const deeper = levels.slice(at + 1).map(many);
    return `${capital(listWords([...levels.slice(0, at).map(many), `other ${many(level)}`]))} are offered, and ${areasWord} with no level.${deeper.length ? ` ${capital(listWords(deeper))} are not, because ${aKind(areaKind())} cannot sit inside a deeper one.` : ''}`;
  }
  // What a candidate is, under its name: where an area sits, or how an initiative stands.
  function choiceAbout(target, chosen) {
    if (isInitiative(target)) return `${labels()[target.state] || target.state}. ${dueText(target)}`;
    const under = chosen.find(id => id !== target.id && areasAbove(id).has(target.id));
    if (under) return `Already counted: it is above ${uniqueItem(under)?.title || under}`;
    return `${areaPlace(target.id)}${target.state === OFF_LINE ? '. Canceled' : ''}`;
  }
  // One searchable picker for the areas or the initiatives of a record. It lists what is chosen and, once the reader
  // types, the few best matches. `key` is the form value it edits.
  function tagPicker(container, key, { legend, listName, none, hint, choices }) {
    const form = state.form;
    const kind = key === 'areaIds' ? areaKind() : initiativeKind();
    const [one, many] = kindWords(kind);
    const chosen = form.values[key];
    const before = new Set(form.base && form.operation !== 'create' ? taggedIds(form.base, kind) : chosen);
    const group = element('fieldset', { class: 'picker' }, [element('legend', { text: legend })]);
    const chip = target => labelChip(isArea(target) ? target.level && levelName(target.level) : target.type && typeName(target.type));
    // A change redraws the editor. A ticked match keeps its place by its own id; a removed entry hands the reader to the search field.
    const set = (ids, focusId) => { form.values[key] = ids; changed(); render(); if (focusId) document.getElementById(focusId)?.focus(); };
    const searchId = `find-${key}`;
    if (chosen.length) group.append(element('ul', { class: 'picked', 'aria-label': listName }, chosen.map(id => {
      const target = uniqueItem(id);
      const title = target?.title || id;
      const remove = button('', () => set(chosen.filter(other => other !== id), searchId), { class: 'picked-remove', 'aria-label': `Remove the ${one} ${title}` });
      remove.append(icon('close'));
      return element('li', { class: before.has(id) ? undefined : 'picked--added' }, [element('span', { class: 'picked-text' }, [
        element('span', { class: 'picked-name' }, [target ? chip(target) : null, element('strong', { text: title }), before.has(id) ? null : element('span', { class: 'badge', text: 'Added' })]),
        element('span', { class: 'note', text: target ? choiceAbout(target, chosen) : 'Not uniquely available in the selected source' })]), remove]);
    })));
    else group.append(paragraph(none, 'note'));
    const input = element('input', { id: searchId, type: 'search', maxlength: 200, autocomplete: 'off', disabled: state.busy || !!state.uncertain });
    input.value = form.values.finding[key];
    const results = element('div', { class: 'pick-results', role: 'group', 'aria-label': `Matching ${many}` });
    const status = element('p', { class: 'note', role: 'status' });
    const paint = () => {
      const query = input.value.trim().toLocaleLowerCase();
      const matching = query ? choices.filter(target => `${target.title} ${target.id}`.toLocaleLowerCase().includes(query)) : [];
      results.replaceChildren(...matching.slice(0, PICK_LIMIT).map(target => {
        const box = element('input', { id: `pick-${key}-${target.id}`, type: 'checkbox', checked: chosen.includes(target.id), onChange: event => set(event.target.checked ? [...chosen, target.id] : chosen.filter(other => other !== target.id)) });
        return element('label', { class: 'check pick-row' }, [box, element('span', { class: 'picked-text' }, [element('span', { class: 'picked-name' }, [chip(target), element('span', { text: target.title }), element('span', { class: 'id', text: target.id })]),
          element('span', { class: 'note', text: choiceAbout(target, chosen) })])]);
      }));
      results.hidden = !matching.length;
      status.textContent = !query ? `Type a name. ${choices.length === 1 ? `One ${one} can` : `${choices.length} ${many} can`} be chosen here.`
        : !matching.length ? `No ${one} matches “${input.value.trim()}”.`
          : `${matching.length} of ${choices.length} ${many} ${matching.length === 1 ? 'matches' : 'match'}.${matching.length > PICK_LIMIT ? ' Type more to narrow the list.' : ''}`;
    };
    input.addEventListener('input', () => { form.values.finding[key] = input.value; paint(); });
    paint();
    group.append(...[labelledField(`Find ${aKind(kind)}`, input), results, status, hint ? paragraph(hint, 'note') : null].filter(Boolean));
    container.append(group);
  }
  // Every area a set of tags reaches: the tagged areas and each area above them.
  function reached(ids) {
    const all = new Set();
    for (const id of ids) { all.add(id); for (const above of areasAbove(id)) all.add(above); }
    return all;
  }
  // What a tag change does to where a record counts, from the hierarchy the page already read. It adds no figure.
  function countingNote(before, after) {
    const base = state.form.base;
    const names = ids => listWords([...ids].map(id => uniqueItem(id)?.title || id));
    const was = reached(taggedIds(before, areaKind())), will = reached(taggedIds(after, areaKind()));
    const added = [...will].filter(id => !was.has(id)), dropped = [...was].filter(id => !will.has(id)), kept = [...will].filter(id => was.has(id));
    const [task] = taskWords();
    const lines = [];
    if (base.kind === areaKind()) lines.push(element('p', {}, 'An area earns no delivery credit of its own. Changing where it sits can change which of its tagged work counts in its parent areas. The tagged records stay unchanged.'));
    else if (!isDelivery(base)) lines.push(element('p', {}, `${capital(aKind(base.kind))} earns no delivery credit, so these tags change no figure. They say where it belongs.`));
    else if (base.retired || base.state === OFF_LINE) lines.push(element('p', {}, `This ${base.retired ? 'retired' : 'canceled'} ${task} stays excluded from delivery counts in every area, initiative and the whole project. These tags change where it belongs, not its eligibility or acceptance.`));
    else {
      if (added.length) lines.push(element('p', {}, [element('strong', { text: 'Newly counted: ' }), `${names(added)}.`]));
      if (dropped.length) lines.push(element('p', {}, [element('strong', { text: 'No longer counted: ' }), `${names(dropped)}.`]));
      const links = taggedIds(after, initiativeKind());
      lines.push(element('p', { class: 'note' }, [element('strong', { text: 'Still counted: ' }), `${[kept.length ? names(kept) : null, links.length ? `the ${kindWords(initiativeKind())[links.length === 1 ? 0 : 1]} ${names(links)}` : null].filter(Boolean).join('; ') || 'nothing else'}. The whole project still counts this ${task} once.`]));
    }
    return element('div', { class: 'proof-panel' }, [element('span', { class: 'label', text: `Where this ${kindWords(base.kind)[0]} will count` }), ...lines]);
  }
  // A reason is part of the record of a decision: canceling, blocking, a correction, reopening finished work, and
  // closing work whose lifecycle ends by a person's decision. Delivery work reaches its end through acceptance instead.
  function needsReason(form) {
    const next = form.values.nextState, line = lifecycleName(form.base);
    return form.values.correction || form.base.state === lastStop(line) || [SIDING, OFF_LINE].includes(next) || (!inDelivery(form.base) && next === lastStop(line));
  }
  function renderEditor() {
    const form = state.form;
    const operation = form.operation;
    const titles = { create: 'Capture work', update: 'Refine work', adopt: 'Review tracking adoption', assign: 'Assign work', link: 'Edit exact links', tag: 'Edit tags',
      transition: form.values.correction ? 'Change state' : `Change work to ${labels()[form.values.nextState]}`, proof: 'Record observed proof', accept: 'Accept work', retire: 'Retire work', restore: 'Restore work', attest: 'Attest record health', delete: ended(form.base) ? 'Delete work entirely' : form.base?.state === 'draft' ? 'Review draft deletion' : 'Review deletion' };
    main.append(element('div', { class: 'page-head' }, [pageLead(
      element('p', { class: 'trail' }, ['Work', icon('chevronRight'), ...(form.base ? [mono(form.base.id), icon('chevronRight')] : []), titles[operation]]), heading(titles[operation]),
      paragraph(form.base ? `${form.base.id}: ${form.base.title} | Original revision ${form.base.revision} | ${form.base.ownerPath}` : 'Capture a small draft; refine it when ready. The form asks only for what the chosen kind uses.', 'note')),
    changeSteps(!!form.preview)]));
    const editor = element('form', { class: 'editor' });
    editor.addEventListener('submit', event => { event.preventDefault(); previewOperation(); });
    const inputs = element('fieldset', { disabled: state.busy || !!state.uncertain }, [element('legend', { text: 'Proposed local change' })]);
    const reason = writableReason(form.base);
    if (reason) inputs.append(paragraph(reason, 'notice'));
    const [area, areasWord] = kindWords(areaKind());
    const [task] = taskWords();
    const kind = form.values.kind;
    // Only the delivery kind is counted; the hints that speak of counting are said for it alone.
    const counts = kind === vocabulary().deliveryKind;
    const unset = 'Not set';
    const areasPicker = (legend, hint) => tagPicker(inputs, 'areaIds', { legend, hint, choices: areaChoices(form), listName: kind === areaKind() ? `${capital(areasWord)} this ${area} sits inside` : `${capital(areasWord)} on this ${kindWords(kind)[0]}`,
      none: kind === areaKind() ? `Top of the project: it sits inside no other ${area}.` : `Not in any ${area}.` });
    const initiativesPicker = legend => tagPicker(inputs, 'initiativeIds', { legend, choices: items().filter(item => isInitiative(item) && hasUniqueId(item.id) && item.id !== form.base?.id),
      listName: `${capital(kindWords(initiativeKind())[1])} on this ${kindWords(kind)[0]}`, none: `Not linked to ${aKind(initiativeKind())}.` });
    if (operation === 'create' || operation === 'update') {
      const delivery = vocabulary().kindLifecycles?.[kind] === deliveryLine();
      if (operation === 'create') {
        const choice = field(inputs, 'kind', 'Work kind', { choices: kinds().map(value => [value, kindName(value)]), required: true });
        const help = element('p', { id: 'kind-help', class: 'note', text: kindHelp(kind) });
        choice.setAttribute('aria-describedby', 'kind-help');
        // Each kind has its own fields, so choosing another kind redraws the form around what was already typed.
        choice.addEventListener('change', () => { render(); document.getElementById('edit-kind')?.focus(); });
        inputs.append(help);
      }
      if (kind === initiativeKind()) {
        const types = element('fieldset', { class: 'choice-set' }, [element('legend', { text: 'Type' })]);
        types.append(element('div', { class: 'choices' }, (vocabulary().initiativeTypes || []).map(value => element('label', { class: 'check' }, [
          element('input', { type: 'radio', name: 'edit-type', value, required: true, checked: form.values.type === value, onChange: () => { form.values.type = value; changed(); } }), typeName(value)]))),
        paragraph('What kind of thing this is to follow. You can change it later.', 'note'));
        inputs.append(types);
      }
      if (kind === areaKind()) field(inputs, 'level', 'Level (optional)', { choices: [['', unset], ...(vocabulary().levels || []).map(value => [value, levelName(value)])],
        help: 'A name for how deep it sits. Levels can be skipped.' }).addEventListener('change', () => { render(); document.getElementById('edit-level')?.focus(); });
      field(inputs, 'title', 'Title', { required: true, max: 500, sourceValue: form.base?.title });
      field(inputs, 'intent', kind === areaKind() ? `What this ${area} covers` : 'Intended outcome', { multiline: true, required: true, max: 8000, sourceValue: form.base?.intent, disabled: delivery && form.base?.state === 'done' });
      if (kind === initiativeKind()) field(inputs, 'priorityLevel', 'Priority level (optional)', { choices: [['', unset], ...(vocabulary().priorityLevels || []).map(value => [value, named('priorityLevels', value)])] });
      if (kind !== areaKind()) field(inputs, 'deadline', 'Due date (optional)', { type: 'date', help: operation === 'update' && form.base?.deadline ? 'Clear the date to remove it.' : undefined });
      if (operation === 'update') {
        field(inputs, 'priority', 'Priority (1–999, lower comes first)', { type: 'number', min: 1, maxNumber: 999 });
        check(inputs, 'optOut', 'Opt this item out of automatic upkeep');
      }
      // Acceptance criteria are what proof is recorded against, so only delivery work carries them.
      if (delivery && form.base?.state === 'done') inputs.append(paragraph('Reopen this work before changing delivered intent or criteria.', 'notice'));
      else if (delivery) criteriaEditor(inputs);
      if (operation === 'create' && kind === areaKind()) areasPicker('Sits inside (optional)', `${parentHint(form.values.level)} Leave it empty and the ${area} sits at the top of the project.`);
      else if (operation === 'create' && delivery) {
        areasPicker(`${capital(areasWord)} (optional)`, counts ? `Pick the most specific ${area}. The ${task} then counts for every ${area} above it as well.` : `Pick the most specific ${area}.`);
        initiativesPicker(`${capital(kindWords(initiativeKind())[1])} (optional)`);
        inputs.append(paragraph(counts ? `Leave both empty and the ${task} counts for the whole project only. You can tag it later.` : `Tags say where this work belongs; only ${taskWords()[1]} are counted for delivery. You can tag it later.`, 'note'));
      }
      if (operation === 'create' && kind === initiativeKind()) inputs.append(paragraph('It starts as a draft. Approving it and committing to it are separate decisions, made on its record.', 'notice'));
    } else if (operation === 'tag') {
      if (isArea(form.base)) areasPicker('Sits inside', parentHint(form.base.level));
      else {
        areasPicker(capital(areasWord), counts ? `Pick the most specific ${area}. The ${task} then counts for every ${area} above it as well.` : `Pick the most specific ${area}.`);
        initiativesPicker(capital(kindWords(initiativeKind())[1]));
      }
    } else if (operation === 'assign') {
      const currentInactive = form.base.assigneeId && !members().some(member => member.id === form.base.assigneeId && member.active);
      field(inputs, 'assigneeId', 'Responsible member', { choices: [['', 'Explicitly unassign'], ...(currentInactive ? [[form.base.assigneeId, `Current inactive/unknown owner (${form.base.assigneeId}); choose an active member`]] : []),
        ...members().filter(member => member.active).map(member => [member.id, `${member.displayName} (${member.id})`])], help: 'Saving assignment leaves recorded state unchanged. Start work is a separate action.' });
      const collaborators = element('fieldset', {}, [element('legend', { text: 'Collaborators (optional)' })]);
      for (const member of members().filter(member => member.active)) {
        const control = element('input', { type: 'checkbox', checked: form.values.collaboratorIds.includes(member.id), onChange: event => {
          form.values.collaboratorIds = event.target.checked ? [...new Set([...form.values.collaboratorIds, member.id])] : form.values.collaboratorIds.filter(id => id !== member.id); changed();
        } });
        collaborators.append(element('label', { class: 'check' }, [control, `${member.displayName} (${member.id})`]));
      }
      inputs.append(collaborators);
    } else if (operation === 'link') linksEditor(inputs);
    else if (operation === 'adopt') {
      inputs.append(paragraph('Preview adoption to compare the original and proposed record. Adoption adds tracking metadata without changing the record’s authored content or identity.'));
    } else if (operation === 'transition') {
      const line = lifecycleName(form.base);
      const delivery = inDelivery(form.base);
      const started = [SIDING_HOST, SIDING, 'verifying'];
      if (form.values.correction) {
        inputs.append(paragraph(`This work is recorded as ${labels()[form.base.state] || form.base.state}. Choose the state it should be in instead.${delivery ? ' Done is not offered: work becomes done only when it is accepted.' : ''}`));
        // Started work always has a responsible member, so those states wait until someone active is assigned.
        const unowned = !members().some(member => member.id === form.base.assigneeId && member.active);
        const needsOwner = key => delivery && unowned && started.includes(key);
        // The choices are the other states of this record's own lifecycle. Delivery work reaches its last stop only by acceptance.
        field(inputs, 'nextState', 'New state', { required: true, choices: [['', 'Choose a state'],
          ...lifecycleStates(line).filter(key => key !== form.base.state && !(delivery && key === lastStop(line))).map(key => [key, needsOwner(key) ? `${labels()[key]} (needs a responsible member)` : labels()[key], needsOwner(key)])] })
          .addEventListener('change', () => { render(); document.getElementById('edit-nextState')?.focus(); });
        if (delivery && started.includes(form.values.nextState)) inputs.append(paragraph('Started work needs a responsible member and a reviewed readiness decision.', 'note'));
      }
      if (reviewsReadiness(form)) {
        check(inputs, 'reviewed', 'I reviewed the current scope and acceptance criteria', true);
        check(inputs, 'decisionsResolved', 'I confirmed required decisions are resolved', true);
      }
      const closing = !delivery && !form.values.correction && form.values.nextState === lastStop(line);
      if (closing) {
        // Closing does not wait for the linked work, and the page says what stays open under it.
        const figure = figureFor(form.base.id);
        const [one, many] = taskWords();
        if (figure?.remaining) inputs.append(element('p', { class: 'notice' }, [element('strong', { text: `${figure.remaining} of ${figure.total} linked ${figure.total === 1 ? one : many} ${figure.remaining === 1 ? 'is' : 'are'} not accepted yet.` }),
          ` ${figure.remaining === 1 ? 'It stays' : 'They stay'} open and ${figure.remaining === 1 ? 'stays' : 'stay'} linked, and the ${kindWords(form.base.kind)[0]} keeps showing ${rate(figure)}. You can reopen it later.`]));
      }
      if (needsReason(form)) field(inputs, 'reason', closing ? 'Reason for closing now' : !delivery && form.base.state === lastStop(line) ? 'Reason for reopening' : 'Reason for this change',
        { multiline: true, required: true, help: delivery ? undefined : 'It is kept in the record’s history with your name.' });
      if (!form.values.correction && form.base.state === SIDING && form.values.nextState !== OFF_LINE) field(inputs, 'resolution', 'How the blocker was resolved', { multiline: true, required: true });
      inputs.append(paragraph(delivery ? 'This action records only the selected state. It does not accept work or infer passing proof.'
        : `This decision is recorded with your name and the time. It moves no ${taskWords()[0]} and changes no figure.`, 'note'));
    } else if (operation === 'proof') {
      inputs.append(paragraph('Record an observation you actually made against the current criteria and declared source. This is manual proof; it does not assert that a test or review ran.'));
      for (const criterion of form.base.criteria) {
        const control = element('input', { type: 'checkbox', checked: form.values.criterionIds.includes(criterion.id), onChange: event => {
          form.values.criterionIds = event.target.checked ? [...new Set([...form.values.criterionIds, criterion.id])] : form.values.criterionIds.filter(id => id !== criterion.id); changed();
        } });
        inputs.append(element('label', { class: 'check' }, [control, `${criterion.id}: ${criterion.text}`]));
      }
      field(inputs, 'result', 'Observed result', { required: true, choices: [['', 'Choose what you observed'], ['passed', 'Passed'], ['failed', 'Failed'], ['skipped', 'Skipped']] });
      field(inputs, 'summary', 'What you observed', { required: true, multiline: true, help: 'Describe the actual observation and its limits. Do not paste a predicted result.' });
      check(inputs, 'observed', 'I made this observation against the current displayed criteria and source', true);
      inputs.append(details('Current proof scope', { criteriaIdentity: form.base.verification.criteriaIdentity, sourceIdentity: form.base.verification.sourceIdentity, sourceCoverage: form.base.verification.sourceCoverage }));
    } else if (operation === 'attest') {
      inputs.append(paragraph(`Record a dated assessment as ${memberName(state.session.actor)} (${state.session.actor}) for ${form.base.id}. This does not change delivery status. A child record’s health does not become project health; the selected project, ${area} or ${kindWords(initiativeKind())[0]} has its own explicit health owner.`, 'note'));
      field(inputs, 'assessment', 'Your health assessment', { required: true, max: 160 });
      field(inputs, 'observedAt', 'Actual observation date (UTC)', { required: true, max: 24, help: 'Enter the observation you made, in YYYY-MM-DDTHH:mm:ss.sssZ form. A future date is not accepted. No date is filled automatically.' });
      field(inputs, 'reason', 'Reason and limits of this assessment', { required: true, multiline: true });
      check(inputs, 'healthConfirmed', 'I am this configured owner and made the dated assessment recorded above', true);
    } else if (operation === 'delete' && ended(form.base)) {
      inputs.append(paragraph(`Delete ${form.base.id} at ${form.base.ownerPath} entirely? It is ${form.base.retired ? 'retired' : 'canceled'}, so it is already outside every active scope and no delivery count changes. Deleting removes its record file together with its history, proof and acceptance decisions from this checkout. Leave it ${form.base.retired ? 'retired' : 'canceled'} when its identity or history should remain. The preview checks that no other record still links to it; nothing else is changed.`, 'notice'));
      field(inputs, 'reason', 'Reason for deleting this work', { required: true, multiline: true });
    } else if (operation === 'delete') {
      const what = form.base.state === 'draft' ? 'draft' : 'record';
      inputs.append(paragraph(`Delete ${what} ${form.base.id} at ${form.base.ownerPath}? This removes its canonical file. Cancel or retire work when its identity or history should remain. The preview checks that no record references this ${what} and that it has no established work history.`, 'notice'));
      field(inputs, 'reason', `Reason for deleting this ${what}`, { required: true, multiline: true });
    } else {
      field(inputs, 'reason', operation === 'accept' ? 'Acceptance decision and reason' : 'Reason', { required: true, multiline: true });
      if (operation === 'accept') {
        check(inputs, 'decision', 'I am making an explicit acceptance decision on this verifying work with current proof', true);
        const proof = form.base.verification || {};
        inputs.append(element('div', { class: 'proof-panel' }, [element('span', { class: 'label', text: 'Proof this decision rests on' }),
          element('span', { class: `fact-value mark proof proof--${proofStatus(form.base)}` }, [...pips(form.base), `${proofWord(form.base)}, ${counted(form.base.criteria?.length || 0, 'criterion', 'criteria')}`]),
          element('span', { class: 'fact-sub', text: proof.reason || 'Not established' }),
          element('span', { class: 'id', text: `criteria ${String(proof.criteriaIdentity).slice(0, 8)}, source ${String(proof.sourceIdentity).slice(0, 8)}` })]),
        details('Current applicable proof', form.base.verification));
      }
    }
    editor.append(inputs);
    // A refusal is an alert when it is made. A later redraw shows the same words without saying them a second time.
    if (form.error) { editor.append(element('p', { class: 'notice editor-error', role: form.errorSaid ? undefined : 'alert', text: form.error })); form.errorSaid = true; }
    // Once a preview exists, saving it is the one leading action; editing a field hands the lead back to Preview.
    editor.append(element('div', { class: 'editor-foot' }, [element('span', { id: 'draft-note', class: 'draft-note', hidden: !form.dirty, text: 'Unsaved draft, kept in this page only' }), button('Back to work', () => navigate('Work')),
      element('button', { id: 'preview-change', type: 'submit', class: form.preview ? undefined : 'primary', disabled: state.busy || !!reason || !!state.uncertain }, [element('span', { text: 'Preview change' }), icon('arrow')])]));
    const previewPane = element('section', { id: 'preview-pane', class: 'review', 'aria-label': 'Change preview' });
    main.append(element('div', { class: 'editor-layout' }, [editor, previewPane]));
    renderPreview(previewPane);
    if (form.conflict) main.append(conflictPane());
  }

  function buildRequest() {
    const form = state.form, values = form.values, base = form.base;
    // A tag list is a set: the same areas or initiatives in another order are the same tags, and no change.
    const sameTags = (a, b) => { const held = new Set(b); return new Set(a).size === held.size && a.every(id => held.has(id)); };
    let patch;
    if (form.operation === 'create') {
      const delivery = vocabulary().kindLifecycles?.[values.kind] === deliveryLine();
      if (values.kind === initiativeKind() && !values.type) throw new Error('Choose the type before previewing.');
      // Only what the chosen kind uses is sent: a value another kind owns is never part of the request.
      patch = { title: values.title, intent: values.intent, ...(delivery && values.criteria.length ? { criteria: clone(values.criteria) } : {}),
        ...(values.kind === initiativeKind() ? { type: values.type, ...(values.priorityLevel ? { priorityLevel: values.priorityLevel } : {}) } : {}),
        ...(values.kind === areaKind() && values.level ? { level: values.level } : {}),
        ...(values.kind !== areaKind() && values.deadline ? { deadline: values.deadline } : {}),
        ...((delivery || values.kind === areaKind()) && values.areaIds.length ? { areaIds: clone(values.areaIds) } : {}),
        ...(delivery && values.initiativeIds.length ? { initiativeIds: clone(values.initiativeIds) } : {}) };
    } else if (form.operation === 'update') {
      patch = {};
      for (const name of ['title', 'intent']) if (!hasRedaction(base[name]) && !hasRedaction(values[name]) && values[name] !== base[name]) patch[name] = values[name];
      if (Number(values.priority) !== base.priority) patch.priority = Number(values.priority);
      if (inDelivery(base) && !hasRedaction(base.criteria) && !hasRedaction(values.criteria) && JSON.stringify(values.criteria) !== JSON.stringify(base.criteria)) patch.criteria = clone(values.criteria);
      if (values.optOut !== base.optOut) patch.optOut = values.optOut;
      // A cleared value is sent as unset; the type of an initiative cannot be unset, so it has no empty choice.
      if (isInitiative(base) && values.type && values.type !== base.type) patch.type = values.type;
      if (isInitiative(base) && values.priorityLevel !== (base.priorityLevel || '')) patch.priorityLevel = values.priorityLevel || null;
      if (isArea(base) && values.level !== (base.level || '')) patch.level = values.level || null;
      if (!isArea(base) && values.deadline !== (base.deadline || '')) patch.deadline = values.deadline || null;
      if (!Object.keys(patch).length) throw new Error('Choose an explicit field change before previewing.');
    } else if (form.operation === 'assign') {
      if (values.assigneeId && !members().some(member => member.id === values.assigneeId && member.active)) throw new Error('Choose an active configured member or explicitly unassign.');
      patch = { assigneeId: values.assigneeId || null };
      if (JSON.stringify(values.collaboratorIds) !== JSON.stringify(base.collaboratorIds)) patch.collaboratorIds = clone(values.collaboratorIds);
    } else if (form.operation === 'link') {
      if (hasRedaction(base.links) || hasRedaction(values.links)) throw new Error('Redacted links cannot be replaced from this view. Inspect the canonical owner.');
      // The list holds no tag: the tracker keeps the record's tags as stored, and Edit tags is the one way to change them.
      patch = { links: clone(values.links) };
    } else if (form.operation === 'tag') {
      // Each relation is sent only when it changed, so the links of the other one are never rewritten.
      patch = {};
      if (!sameTags(values.areaIds, taggedIds(base, areaKind()))) patch.areaIds = clone(values.areaIds);
      if (!isArea(base) && !sameTags(values.initiativeIds, taggedIds(base, initiativeKind()))) patch.initiativeIds = clone(values.initiativeIds);
      if (!Object.keys(patch).length) throw new Error('Add or remove a tag before previewing.');
    }
    else if (form.operation === 'adopt') patch = {};
    else if (form.operation === 'transition') {
      if (values.correction && (!values.nextState || !values.reason.trim())) throw new Error('Choose the new state and give the reason for this change.');
      if (needsReason(form) && !values.reason.trim()) throw new Error('Give the reason for this decision.');
      patch = { state: values.nextState, ...(values.correction ? { correction: true } : {}) };
      if (values.reason.trim()) patch.reason = values.reason;
      if (values.resolution.trim()) patch.resolution = values.resolution;
      if (reviewsReadiness(form)) {
        if (!values.reviewed || !values.decisionsResolved) throw new Error('Both readiness decisions must be confirmed by you.');
        patch.readiness = { reviewed: true, decisionsResolved: true };
      }
    } else if (form.operation === 'proof') {
      if (!values.observed || !values.criterionIds.length || !values.result || !values.summary.trim()) throw new Error('Choose the observed criteria and result, describe the observation, and confirm that you made it.');
      patch = { proof: { id: crypto.randomUUID(), kind: 'manual', result: values.result, observedAt: new Date().toISOString(), criteriaIds: clone(values.criterionIds),
        criteriaIdentity: base.verification.criteriaIdentity, sourceIdentity: base.verification.sourceIdentity, summary: values.summary } };
    } else if (form.operation === 'attest') {
      if (!values.healthConfirmed || !values.assessment.trim() || !values.reason.trim()
        || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(values.observedAt)
        || !Number.isFinite(Date.parse(values.observedAt)) || new Date(values.observedAt).toISOString() !== values.observedAt
        || Date.parse(values.observedAt) > Date.now()) throw new Error('Supply your actual UTC observation date, assessment and reason, then confirm the owner decision. Future dates are unavailable.');
      patch = { health: { assessment: values.assessment, ownerId: state.session.actor, observedAt: values.observedAt, reason: values.reason } };
    } else {
      if (!values.reason.trim()) throw new Error('Record the reason for this decision.');
      if (form.operation === 'accept' && !values.decision) throw new Error('Confirm your explicit acceptance decision before previewing.');
      patch = { reason: values.reason };
    }
    const request = { schemaVersion: REQUEST_VERSION, operation: form.operation, operationId: crypto.randomUUID(), target: { kind: base?.kind || values.kind },
      actor: { memberId: state.session.actor }, patch };
    if (base) { request.target.itemId = base.id; request.expected = { revision: base.revision, contentHash: base.contentHash }; }
    return request;
  }
  async function previewOperation() {
    if (state.busy || state.uncertain || writableReason(state.form?.base)) return;
    const form = state.form;
    dismissFeedback();
    try { form.request = buildRequest(); }
    catch (error) { refuse(form, error.message); render(); return; }
    state.busy = true; form.error = ''; form.preview = null; form.dirty = true; render();
    try {
      const result = await api('/api/operation', { ...form.request, preview: true });
      if (result.primary?.status !== 'preview' || !result.previewToken) throw new Error(result.primary?.reason || 'This change was not previewed. Reread the record before continuing.');
      form.preview = result; form.values.adoptionReviewed = false; form.values.deletionConfirmed = false;
      state.message = PREVIEW_READY;
    } catch (error) {
      refuse(form, error.message);
      if (error.status === 409) form.conflict = { reason: error.message, original: clone(form.base), current: null };
    } finally {
      state.busy = false; render();
      // The control that asked for the preview gives way to what it produced.
      if (form.preview && state.form === form) document.getElementById('preview-heading')?.focus();
    }
  }
  function renderPreview(pane) {
    const form = state.form;
    if (!form.preview) return;
    const { current, proposed } = form.preview;
    const expected = form.request.expected;
    pane.append(element('div', { class: 'sheet-head' }, [element('h3', { id: 'preview-heading', text: form.operation === 'tag' ? 'Review the exact change' : 'Review this exact change', tabindex: '-1' }), element('span', { class: 'unsaved', text: 'Nothing is saved yet' })]));
    if (!current) pane.append(paragraph('New work; no existing record is replaced.'));
    if (current || proposed) pane.append(form.operation === 'tag' ? comparisonTable(current, proposed, 'Now', 'After saving') : comparisonTable(current, proposed, 'Current record', 'Proposed record'));
    pane.append(element('p', { class: 'meta' }, [element('span', {}, ['Operation ', mono(form.request.operationId)]),
      element('span', {}, ['Acting as ', element('strong', { text: memberName(state.session.actor) }), ` (${state.session.actor})`]),
      expected ? element('span', {}, [`Expects revision ${expected.revision}, content `, mono(String(expected.contentHash).slice(0, 8))]) : null]),
    element('div', { class: 'strip strip--plain' }, [details('Complete current and proposed records', { current: current || null, proposed: proposed || null }),
      details('Exact proposed fields and source identity', { change: form.request.patch, expected: form.request.expected })]));
    if (form.operation === 'delete') {
      const lost = form.preview.primary?.removes;
      // The preview states what leaves the checkout with ended work; the page repeats it and adds nothing.
      pane.append(paragraph(lost ? `This record will be removed entirely: ${form.base.ownerPath}. With it go ${counted(lost.historyEntries, 'history entry', 'history entries')}, ${counted(lost.proofs, 'proof', 'proofs')}, ${counted(lost.acceptanceDecisions, 'acceptance decision', 'acceptance decisions')} and ${counted(lost.links, 'link', 'links')} of its own. No related record will be changed or deleted.`
        : `The reviewed ${form.base.state === 'draft' ? 'draft' : 'record'} will be removed: ${form.base.ownerPath}. No related record will be deleted. Retirement remains the alternative for retaining its identity.`, 'notice'));
      const confirm = element('input', { type: 'checkbox', checked: form.values.deletionConfirmed, disabled: state.busy,
        onChange: event => { form.values.deletionConfirmed = event.target.checked; document.getElementById('save-preview').disabled = !event.target.checked || state.busy; } });
      pane.append(element('label', { class: 'check' }, [confirm, lost ? `I reviewed ${form.base.id} and explicitly confirm deleting it entirely, together with its history`
        : `I reviewed the exact ${form.base.state === 'draft' ? 'draft' : 'record'} ${form.base.id} and explicitly confirm removing its canonical file`]));
    }
    if (form.operation === 'adopt') {
      const confirm = element('input', { type: 'checkbox', checked: form.values.adoptionReviewed, disabled: state.busy,
        onChange: event => { form.values.adoptionReviewed = event.target.checked; document.getElementById('save-preview').disabled = !event.target.checked || state.busy; } });
      pane.append(element('label', { class: 'check' }, [confirm, 'I reviewed the original and proposed record and approve this tracking adoption']));
    }
    const removing = form.operation === 'delete';
    if (form.operation === 'tag' && proposed) pane.append(countingNote(current || form.base, proposed));
    const saving = removing ? form.preview.primary?.removes ? 'Delete work entirely' : form.base.state === 'draft' ? 'Delete reviewed draft' : 'Delete reviewed record' : form.operation === 'tag' ? 'Save tags to your checkout' : 'Save reviewed change';
    pane.append(element('div', { class: 'review-foot' }, [button(saving, savePreview, { id: 'save-preview', class: removing ? 'caution save' : 'primary save', icon: removing ? undefined : 'check', disabled: state.busy || !!writableReason(form.base)
      || form.operation === 'adopt' && !form.values.adoptionReviewed || removing && !form.values.deletionConfirmed }),
    paragraph('Saves into your local checkout only. Sharing goes through your team’s Git process; this app never stages, commits or pushes.', 'note')]));
  }
  const VOCABULARY_REFUSALS = ['MIGRATION_REQUIRED', 'MIGRATION_IN_PROGRESS', 'MIXED_VOCABULARY'];
  async function savePreview() {
    const form = state.form;
    if (state.busy || !form?.preview || writableReason(form.base) || form.operation === 'adopt' && !form.values.adoptionReviewed || form.operation === 'delete' && !form.values.deletionConfirmed) return;
    const request = { ...clone(form.request), previewToken: form.preview.previewToken };
    await sendSave(request, form);
  }
  async function sendSave(request, form) {
    dismissFeedback(); state.busy = true; form.error = ''; render();
    try {
      const result = await api('/api/operation', request);
      if (result.primary?.status !== 'saved') throw Object.assign(new Error(result.primary?.reason || 'This operation did not confirm a save.'), { uncertain: !result.primary });
      state.result = result; state.uncertain = null; state.form = null; state.view = 'Work';
      if ((result.secondary || []).some(item => item.kind === 'deletion-recovery' && item.status === 'pending')) state.recovery = { request: clone(request) };
      state.message = '';
      try {
        state.snapshot = await inspect(state.scope);
        const target = items().find(item => item.id === result.primary.itemId && item.ownerPath === result.primary.ownerPath);
        state.selectedKey = target ? itemKey(target) : null;
      } catch { state.message = 'The item was saved, but the current view could not be reread. Reread the project to update the list; do not repeat the item change.'; }
    } catch (error) {
      refuse(form, error.message);
      if (error.uncertain) state.uncertain = { request: clone(request), form };
      else {
        state.uncertain = null;
        if (error.status === 409) form.conflict = { reason: error.message, original: clone(form.base), current: null };
        // The refusal says the project stores another vocabulary than this page read. The page reads it again so its
        // read-only state is shown; the draft and the refusal beside it stay.
        if (VOCABULARY_REFUSALS.includes(error.code)) { try { show(await inspect(state.scope)); } catch { /* The refusal already says why nothing was saved. */ } }
      }
    } finally {
      state.busy = false; render();
      // The editor is gone after a save: the reader lands on the saved record, or on the view when it is no longer listed.
      if (!state.form) (state.selectedKey && main.querySelector('.record-sheet h3') || main.querySelector('h2'))?.focus();
    }
  }
  async function retryOriginal() {
    if (state.busy || !state.uncertain) return;
    const pending = state.uncertain;
    state.form = pending.form; state.view = 'Editor';
    await sendSave(pending.request, pending.form);
  }
  async function retryDeletionRecovery() {
    if (state.busy || !state.recovery) return;
    begin();
    try {
      const result = await api('/api/operation', state.recovery.request);
      if (result.primary?.status !== 'saved' || !result.primary.deleted) throw new Error('Deletion completion was not confirmed. Retain the original request and inspect the project’s recovery record.');
      state.result = result;
      if (!(result.secondary || []).some(item => item.kind === 'deletion-recovery' && item.status === 'pending')) state.recovery = null;
      state.message = 'Original deletion recovery retried; no new deletion intent was created.';
    } catch (error) { state.message = `Deletion recovery remains pending: ${error.message} The confirmed removal is retained.`; }
    finally { state.busy = false; render(); }
  }

  function conflictPane() {
    const form = state.form;
    const conflict = form.conflict;
    const pane = element('section', { class: 'sheet conflict', 'aria-label': 'Conflict recovery' });
    pane.append(element('h3', { text: 'Keep the draft; review the current owner' }), paragraph(conflict.reason || 'The save outcome is unknown. Read the current record separately.'),
      paragraph('Your entered fields and original expected revision are retained. Reading current work does not automatically merge or resubmit this draft.', 'note'),
      factCells([['Your draft', conflict.original ? `Opened at revision ${conflict.original.revision}` : 'New work'],
        [conflict.current ? `Current, revision ${conflict.current.revision}` : 'Current record', conflict.current ? `${labels()[conflict.current.state] || conflict.current.state}; ${memberName(conflict.current.assigneeId)}` : 'Not read yet']], 'fact-tiles'),
      actions(button('Read current owner', readCurrentForConflict)));
    if (conflict.current) {
      pane.append(element('div', { class: 'strip strip--plain' }, [details('Original record opened', conflict.original), details('Current record read separately', conflict.current), details('Retained draft fields', form.values)]));
      if (!state.uncertain) {
        const review = element('input', { type: 'checkbox', disabled: state.busy });
        const rebase = button('Use reviewed current revision', () => {
          if (!review.checked) return;
          form.base = clone(conflict.current); form.preview = null; form.request = null; form.conflict = null; form.dirty = true;
          refuse(form, 'Current revision selected. Review your retained fields and preview a new intent before saving.'); render();
        }, { disabled: true, class: 'primary' });
        review.addEventListener('change', () => { rebase.disabled = !review.checked || state.busy; });
        pane.append(element('label', { class: 'check' }, [review, 'I reviewed the current record against my retained draft']), actions(rebase));
      } else pane.append(paragraph('A current read alone cannot confirm the original save receipt. Retry the original save to establish its outcome.', 'notice'));
    }
    return pane;
  }
  async function readCurrentForConflict() {
    if (state.busy || !state.form) return;
    const form = state.form;
    if (!form.conflict) form.conflict = { original: clone(form.base), current: null, reason: 'Save outcome unknown; retained draft and original request remain separate.' };
    begin();
    try {
      const snapshot = await inspect({});
      const matching = (snapshot.items || []).filter(item => item.id === form.base?.id && item.ownerPath === form.base?.ownerPath);
      if (snapshot.coverage !== 'complete' || matching.length !== 1) throw new Error('The current owner cannot be resolved with complete coverage. Resolve diagnostics through project tools, then reread.');
      form.conflict.current = clone(matching[0]);
    } catch (error) { refuse(form, error.message); announce(error.message); }
    finally { state.busy = false; render(); }
  }

  // Every read of work after the first comes through here. A read without the words stops the page: see `stopped`.
  async function inspect(scope) {
    const snapshot = await api('/api/inspect', scope);
    if (!usable(snapshot)) { stop(UNSUPPORTED); throw new Error(UNSUPPORTED); }
    return snapshot;
  }
  // What was compared or reported belongs to the read it was made from; a new read of the selected source drops it.
  function show(snapshot) { state.snapshot = snapshot; state.compare = null; state.report = null; state.concerns = null; state.reportDue = true; }
  async function reread(scope = state.scope) {
    if (state.busy) return;
    begin();
    try {
      const snapshot = await inspect(scope);
      // Another source or another scope is another list: each paged list is read from its first page again.
      if (JSON.stringify(scope) !== JSON.stringify(state.scope)) for (const list of Object.values(state.listPages)) list.page = 1;
      state.scope = clone(scope); show(snapshot);
      // Work in no area is a filter of the whole project. A chosen scope holds none, so the filter does not follow into it.
      if (scope.scopeId) state.filters.untagged = false;
      // A path is lost only when the same scope is read again and one of its steps is gone. A newly chosen scope starts its own entry.
      const sameScope = state.entryPath.at(-1) === scope.scopeId;
      const lostPath = state.entryPath.length > 0 && sameScope && !validPath(state.entryPath, snapshot);
      if (state.entryPath.length && (lostPath || !sameScope)) state.entryPath = scope.scopeId && uniqueItem(scope.scopeId) ? defaultPath(scope.scopeId) : [];
      state.message = lostPath ? 'Path unavailable after reread. No removed or guessed parent is used.' : snapshot.coverage === 'unavailable' ? 'The selected source is unavailable. Inspect its reasons or explicitly choose the current checkout.' : 'Project reread. Retained drafts keep their original revision until you explicitly review a conflict.';
      return true;
    } catch (error) { state.message = `${error.message} The previously inspected source remains displayed.`; }
    finally { state.busy = false; render(); }
  }
  async function compareCurrent() {
    if (state.busy) return;
    begin();
    try { state.compare = await inspect(state.scope.scopeId ? { scopeId: state.scope.scopeId } : {}); }
    catch (error) { state.message = error.message; }
    finally { state.busy = false; render(); }
  }
  async function refreshReport() {
    if (state.busy) return;
    begin();
    try {
      const report = await api('/api/report', state.scope);
      state.report = report.status ? { status: String(report.status), path: report.path } : null;
      state.message = `Offline report: ${report.status}. ${report.path ? `Project path: ${report.path}. Read it on the Report tab, or open the file with the project report tool.` : report.reason || ''}`;
      if (state.result?.secondary && ['current', 'generated'].includes(report.status)) {
        state.result.secondary = state.result.secondary.map(item => item.kind === 'report' ? report : item);
      }
    } catch (error) { state.message = `Report refresh remains pending: ${error.message} Any confirmed item save is retained.`; }
    finally { state.busy = false; render(); }
  }
  // A page with no session. One address serves one workspace, chosen where it was launched, so the page cannot pick a
  // folder; it can ask that workspace's own tool to open an attached tab on this machine.
  async function detached(reason) {
    main.setAttribute('aria-busy', 'false');
    document.getElementById('source-context').textContent = 'No selected project session';
    setRoot('No checkout established');
    document.getElementById('actor-context').textContent = 'No actor established';
    let reopenable = false;
    try { reopenable = (await beforeSession('/api/launcher')).reopen === true; } catch { /* The page still says how to launch. */ }
    const outcome = element('p', { class: 'note', role: 'status' });
    const reopen = async event => {
      const control = event.currentTarget;
      control.disabled = true; outcome.textContent = 'Asking this workspace to open…';
      try {
        const { launch } = await beforeSession('/api/reopen', {});
        outcome.textContent = launch.status === 'requested'
          ? `Asked ${launch.browser === 'chrome' ? 'Google Chrome' : 'the default browser'} to open this workspace in a new, attached tab. You can close this one.`
          : `Nothing was opened: ${launch.reason || 'no browser could be started'}. Launch the workspace again from its project.`;
      } catch (error) {
        outcome.textContent = error.status === 429 ? 'A request to open this workspace is already under way. Try again in a few seconds.'
          : 'This workspace could not be opened from this page. Launch it again from its project.';
      } finally { control.disabled = false; }
    };
    const here = sheet('attach-heading', 'The workspace at this address', null, 'sheet wider');
    here.append(paragraph('One address serves one workspace: the checkout it was launched from. This page is not attached to it, so nothing is shown and nothing can be changed here.', 'hero-copy'),
      reopenable ? actions(button('Open this workspace', reopen, { class: 'primary', iconAfter: 'arrow', disabled: false }))
        : paragraph('This workspace was launched without asking for a browser, so it cannot be opened from this page. Open the address its launch printed, or launch it again with the open option.', 'notice'),
      outcome);
    const other = sheet('other-heading', 'A different project', null, 'sheet narrow');
    other.append(paragraph('Each project serves its own workspace at its own address. Launch it from that project’s checkout with the task tool:'),
      element('p', {}, mono('serve --root <checkout> --write --open')),
      paragraph('A workspace can only be chosen where it is launched. A page cannot attach itself to another folder.', 'note'));
    main.replaceChildren(pageLead(heading('Workspace session required'),
      paragraph(reason || 'This page has no session. A launch attaches one page; opening the address by itself starts without one.', 'page-intro')),
      element('div', { class: 'split split--start' }, [here, other]));
  }
  async function initialize() {
    let restored = false;
    if (!sessionToken && launchCode) {
      try { sessionToken = (await beforeSession('/api/attach', { code: launchCode })).token || null; }
      catch { return detached('This launch link has already been used or has expired. A launch link attaches one page, once.'); }
    }
    if (!sessionToken) { sessionToken = kept(); restored = !!sessionToken; }
    if (!sessionToken) return detached();
    // What a stopped page last said was about the read it refused.
    if (state.stopped) { state.stopped = ''; state.message = ''; }
    state.busy = true; renderFeedback();
    try {
      const session = await api('/api/session');
      if (session.schemaVersion !== 1 || !usable(session.snapshot)) throw new Error(UNSUPPORTED);
      keep(sessionToken);
      state.session = session; state.snapshot = session.snapshot;
      if (directItem !== null || directOwner !== null) {
        state.view = 'Work';
        const matches = items().filter(item => item.id === directItem && (!directOwner || item.ownerPath === directOwner));
        if (matches.length === 1 && hasUniqueId(matches[0].id)) state.selectedKey = itemKey(matches[0]);
        else state.message = 'Linked work is missing, ambiguous or unavailable in this selected project. Inspect the available work or return to Overview.';
      }
    } catch (error) {
      // A kept session that the workspace no longer accepts belongs to an earlier launch on this address.
      if (restored && error.status === 403) {
        sessionToken = null; keep(null); state.busy = false;
        return detached('The workspace this tab was attached to has been launched again since, so its earlier session no longer applies.');
      }
      renderStopped(error.message);
    } finally { state.busy = false; main.setAttribute('aria-busy', 'false'); render(); }
  }
  initialize();
})();
