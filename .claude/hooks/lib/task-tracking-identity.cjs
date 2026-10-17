'use strict';

const fs = require('node:fs');
const childProcess = require('node:child_process');
const { LIMITS, CUSTOM_MEMBER_ID, isEmailId } = require('./task-tracking-config.cjs');
const { fail } = require('./task-tracking-files.cjs');

const fold = value => value.toLowerCase();
const validName = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 254
    && !/[\u0000-\u001f\u007f]/.test(value);
const transportValue = value => String(value || '').replace(/\r?\n$/, '');

/** Effective author configuration in exactly the selected checkout. No auth/remote reads. */
function readGitAuthor(context, { spawnSync = childProcess.spawnSync, now = Date.now } = {}) {
    const deadline = now() + LIMITS.processTimeoutMs;
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_/i.test(key)));
    Object.assign(env, { GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0', GIT_NO_LAZY_FETCH: '1' });
    const read = (args, optional = false) => {
        const timeout = deadline - now();
        if (timeout <= 0) fail('IDENTITY_UNAVAILABLE', 'Local author lookup exceeded its time limit; select a custom member or configure Git user.email and user.name');
        const result = spawnSync('git', ['--no-pager', '-C', context.root, '-c', 'core.fsmonitor=false', ...args],
            { cwd: context.root, env, shell: false, windowsHide: true, encoding: 'utf8', timeout, maxBuffer: 65536 });
        if (result.error || (result.status !== 0 && !(optional && result.status === 1))) fail('IDENTITY_UNAVAILABLE',
            'Local author identity unavailable; select a custom member or configure Git user.email and user.name in the selected checkout');
        if (Buffer.byteLength(result.stdout || '') > 65536 || now() > deadline) fail('IDENTITY_UNAVAILABLE', 'Local author lookup exceeded its limits');
        return result.status === 1 ? '' : transportValue(result.stdout);
    };
    const top = read(['rev-parse', '--show-toplevel']);
    let selected;
    try { selected = fs.realpathSync(top); } catch { fail('IDENTITY_UNAVAILABLE', 'Selected checkout author identity unavailable'); }
    if (selected !== context.root) fail('WRONG_ROOT', 'Select the exact Git checkout root; another checkout cannot supply the actor');
    const address = read(['config', '--get', 'user.email'], true);
    if (!isEmailId(address)) fail('INVALID_MEMBER', 'Local author email is missing or invalid; use one printable address of at most 254 characters, or select a custom member');
    const name = read(['config', '--get', 'user.name'], true);
    const displayName = name === '' ? fold(address) : name;
    if (!validName(displayName)) fail('INVALID_MEMBER', 'Local author name is invalid or exceeds 254 characters; correct Git user.name or select a custom member');
    return { id: fold(address), displayName };
}

/** Custom selection never falls back; implicit matching uses ID/email aliases, never names. */
function resolveActor(context, explicitActor, options = {}) {
    if (explicitActor !== undefined) {
        const member = context.members.find(person => person.id === explicitActor);
        if (member) return { member, selection: { source: 'configured', actor: member.id }, unregistered: false };
        if (options.allowUnregisteredCustom && !context.members.length && typeof explicitActor === 'string' && CUSTOM_MEMBER_ID.test(explicitActor))
            return { member: { id: explicitActor, displayName: explicitActor, active: true }, selection: { source: 'explicit', actor: explicitActor }, unregistered: false };
        fail('INVALID_MEMBER', 'Select an exact configured member ID; an invalid explicit actor cannot fall back to Git');
    }
    const author = readGitAuthor(context, options);
    const matches = context.members.filter(person => [person.id, ...(person.aliases || []).filter(isEmailId)]
        .some(value => isEmailId(value) && fold(value) === author.id));
    const collisions = context.members.filter(person => [person.id, person.displayName, ...(person.aliases || [])]
        .some(value => value.trim().toLowerCase() === author.id));
    if (matches.length > 1 || collisions.some(person => !matches.includes(person))) fail('INVALID_MEMBER', 'Local author identity is ambiguous; select an exact configured member ID');
    const member = matches[0] || { ...author, active: true };
    return { member, selection: { source: 'git', actor: member.id, email: author.id }, unregistered: !matches.length };
}

function validateSelection(selection) {
    return selection && typeof selection === 'object' && !Array.isArray(selection)
        && Object.keys(selection).every(key => ['source', 'actor', 'email'].includes(key))
        && ['git', 'configured', 'explicit'].includes(selection.source)
        && typeof selection.actor === 'string'
        && (selection.source === 'git' ? isEmailId(selection.email) : selection.email === undefined);
}

function revalidateActor(context, selection) {
    if (!validateSelection(selection)) fail('INVALID_MEMBER', 'Actor selection is malformed; select the actor again');
    const resolved = resolveActor(context, selection.source === 'git' ? undefined : selection.actor,
        { allowUnregisteredCustom: selection.source === 'explicit' });
    if (resolved.member.id !== selection.actor || (selection.source === 'git' && resolved.selection.email !== selection.email))
        fail('STALE_ACTOR', 'Selected actor changed; keep the draft and explicitly relaunch or relink before saving');
    return resolved;
}

/** Called only at admitted writable boundaries; profiles never enter operational members. */
function actorContext(context, authority) {
    let resolved;
    if (authority.identity) resolved = revalidateActor(context, authority.identity);
    else if (!context.members.some(person => person.id === authority.actor) && isEmailId(authority.actor)) {
        resolved = resolveActor(context);
        if (resolved.member.id !== authority.actor) fail('STALE_ACTOR', 'Selected actor changed; retain the original request and select the actor again');
    }
    if (!resolved) return context;
    if (resolved.member.id !== authority.actor) fail('NOT_PERMITTED', 'Operation does not match the selected actor');
    return { ...context, members: resolved.unregistered ? [...context.members, resolved.member] : context.members,
        localActor: resolved.unregistered ? resolved.member : undefined };
}

module.exports = { readGitAuthor, resolveActor, revalidateActor, validateSelection, actorContext, validName };
