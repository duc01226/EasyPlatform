'use strict';

const path = require('node:path');
const { readUserPrompt } = require('./prompt-route-utils.cjs');
const { resolveProjectRoot } = require('./project-root.cjs');
const { trackingContext } = require('./task-tracking-config.cjs');
const files = require('./task-tracking-files.cjs');
const ledger = require('./convention-ledger.cjs');
const routing = require('../../scripts/lib/workflow-routing-config.cjs');
const { promptTerms, hierarchyTerms } = require('./task-tracking-vocabulary.cjs');

// Protective budgets, not measured capacity; none depend on the work inventory.
const MAX_PROMPT_CHARS = 32768;
const MAX_ID_CHARS = 512;
const MAX_CONTEXTS = 128;
const MAX_STATE_BYTES = 32768;
const MAX_NOTICE_CHARS = 900;
const MARKER = '<!-- CK:TASK-TRACKING-GUIDANCE -->';
const GROUP = 'task-tracking-advisory';

// The work words of the current vocabulary, and the earlier ones a person may still type.
const WORK = new RegExp(`\\b(work|${promptTerms().join('|')}|concerns?|tracking|publication|pull request)\\b`, 'i');
// The words that place work: area levels, areas and initiatives, and the earlier group purposes a person may still type.
const HIERARCHY = new RegExp(`\\b(?:${hierarchyTerms().join('|')})\\b`, 'i');

/** Quoted examples are data. Unclosed quotations conservatively hide the remaining text. */
function unquotedPrompt(prompt) {
    if (typeof prompt !== 'string' || prompt.length > MAX_PROMPT_CHARS) return '';
    const prose = readUserPrompt(prompt);
    if (!prose) return '';
    const text = prose.split(/\r\n|\r|\n/).filter(line => !/^\s*>/.test(line)).join('\n');
    const quotes = { '"': '"', '“': '”', '‘': '’', "'": "'" };
    let closing = null;
    let result = '';
    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        if (closing) {
            if (char === closing && text[i - 1] !== '\\') closing = null;
        } else if (quotes[char] && !(char === "'" && /[\p{L}\p{N}]/u.test(text[i - 1] || ''))) {
            closing = quotes[char];
            result += ' ';
        } else result += char;
    }
    return result.trim().replace(/\s+/g, ' ');
}

function relevantPrompt(prompt) {
    const text = unquotedPrompt(prompt);
    if (/\b(?:do not|don't|never|avoid|skip)\s+(?:\w+\s+){0,2}(?:track|inspect|review|check|publish|commit)\b/i.test(text)) return '';
    const action = /\b(help|inspect|check|review|show|list|update|create|assign|refine|retire|track|link|implement|fix|commit|publish|prepare|open)\b/i;
    const work = WORK;
    const publication = /\b(commit|publish|pull request)\b/i;
    if (text && action.test(text) && (work.test(text) || publication.test(text))) return text;
    // Read-oriented hierarchy guidance uses the same trusted prose and bounded input owner.
    const readAction = /\b(?:show|inspect|check|open|list|report)\b/i;
    const hierarchy = HIERARCHY;
    const intent = /\b(?:status|progress|report|delivery)\b/i;
    const negatedRead = /\b(?:do not|don't|never|avoid|skip)\s+(?:\w+\s+){0,2}(?:show|inspect|check|open|list|report)\b/i;
    return text && text.split(/[.!?;]/).some(clause => readAction.test(clause) && hierarchy.test(clause)
        && intent.test(clause) && !negatedRead.test(clause)) ? text : '';
}

function notice(context, automatic) {
    const selection = automatic
        ? 'Use task-track only when eligible under the actual request and permissions.'
        : 'Automatic skill selection is restricted: keep the single actual Run/Skip choice and wait for its answer; Skip keeps direct work.';
    const upkeep = context.mode === 'observe'
        ? 'Observe permits guidance without optional item saves.'
        : 'Linked upkeep requires exact separately authorized checkpoints; item opt-out still applies.';
    return `${MARKER}\nTask tracking guidance (${context.mode}): inspect selected work and exact related concerns before publication using the available task-track instructions. ${selection} Pending choices and same-task Skip remain authoritative through follow-up and recovery; native permissions still apply. ${upkeep} This notice saves no work, starts no procedure and supplies no verification proof or acceptance.\n`;
}

/** No work scan or store writer: this checks only genuine prompt intent and selected controls. */
function eligibleNotice(input, options = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input)
        || input.hook_event_name !== 'UserPromptSubmit'
        || typeof input.session_id !== 'string' || !input.session_id.trim() || input.session_id.length > MAX_ID_CHARS
        || (input.agent_id !== undefined && (typeof input.agent_id !== 'string' || input.agent_id.length > MAX_ID_CHARS))) return null;
    const prompt = relevantPrompt(input.prompt);
    if (!prompt) return null;
    const env = options.env || process.env;
    const root = resolveProjectRoot({ cwd: options.cwd || input.cwd || process.cwd(), env });
    if (root.error) return null;
    const context = trackingContext(root.rootDir);
    if (context.mode === 'off' || context.profile.kind !== 'portable-markdown' || context.profile.version !== 1) return null;
    // A missing, linked, unreadable or oversized instruction asset is unavailable guidance.
    const instruction = files.readBytes(context.root, '.claude/skills/task-track/SKILL.md', 65536).toString('utf8');
    if (!/^name:\s*task-track\s*$/m.test(instruction)) return null;
    const control = routing.resolveSkillAutoTrigger({ rootDir: context.root, configPath: context.configPath, env,
        homeDir: env.HOME || env.USERPROFILE });
    const payload = notice(context, control.enabled);
    if (payload.length > MAX_NOTICE_CHARS) return null;
    return { context, payload, contextHash: files.hash(Buffer.from(prompt.toLocaleLowerCase('en-US'))) };
}

function deliveryPaths(context, input) {
    const root = routing.resolveSessionStoreRoot(context.root);
    const scope = ledger.scopeFor(input);
    const stateName = `${GROUP}-${scope}`;
    const file = path.join(ledger.sessionDir(root, input.session_id), `_${ledger.sanitizeId(stateName)}.json`);
    const lock = ledger.lockFile(root, input.session_id, scope, GROUP);
    // Reuse the contained byte owner before the ledger can mkdir or follow a path.
    const relative = target => path.relative(context.root, target).split(path.sep).join('/');
    files.scopedPath(context.root, relative(file));
    files.ensureDirectory(context.root, relative(path.dirname(lock)));
    files.scopedPath(context.root, relative(lock));
    return { root, scope, stateName, file, lock, relative: relative(file) };
}

function readDeliveryState(context, paths) {
    let bytes;
    try { bytes = files.readBytes(context.root, paths.relative, MAX_STATE_BYTES); }
    catch (error) {
        if (error.code === 'ENOENT') return { version: 1, contexts: [] };
        throw error;
    }
    const state = JSON.parse(bytes.toString('utf8'));
    if (!state || state.version !== 1 || !Array.isArray(state.contexts) || state.contexts.length > MAX_CONTEXTS
        || Object.keys(state).some(key => !['version', 'contexts'].includes(key))
        || state.contexts.some(entry => !entry || Object.keys(entry).some(key => !['hash', 'status'].includes(key))
            || typeof entry.hash !== 'string' || !/^[a-f0-9]{64}$/.test(entry.hash) || !['pending', 'delivered'].includes(entry.status))
        || new Set(state.contexts.map(entry => entry.hash)).size !== state.contexts.length) throw new Error('Unavailable advisory receipt state');
    return state;
}

function writeDeliveryState(context, input, paths, state) {
    files.scopedPath(context.root, paths.relative);
    if (Buffer.byteLength(JSON.stringify(state)) > MAX_STATE_BYTES
        || !ledger.writeSessionState(paths.root, input.session_id, paths.stateName, state)) throw new Error('Unavailable advisory receipt store');
}

function defaultWrite(text, done) {
    try { process.stdout.write(text, error => done(!error)); }
    catch { done(false); }
}

/** Optional context only. A pending receipt after a crash is unavailable, never authority or delivery proof. */
async function deliverAdvisory(input, options = {}) {
    let paths;
    let token;
    try {
        const selected = eligibleNotice(input, options);
        if (!selected) return '';
        const { context, payload, contextHash } = selected;
        paths = deliveryPaths(context, input);
        // No age-only reclaim: an interrupted session may miss a notice rather than duplicate one.
        token = ledger.acquireLock(paths.lock, Date.now(), Infinity);
        if (!token) return '';
        const state = readDeliveryState(context, paths);
        if (state.contexts.some(entry => entry.hash === contextHash) || state.contexts.length >= MAX_CONTEXTS) return '';
        const entry = { hash: contextHash, status: 'pending' };
        state.contexts.push(entry);
        writeDeliveryState(context, input, paths, state);
        const written = await new Promise(resolve => {
            let settled = false;
            const done = ok => { if (!settled) { settled = true; resolve(ok !== false); } };
            try { (options.write || defaultWrite)(payload, done); }
            catch { done(false); }
        });
        if (written) entry.status = 'delivered';
        else state.contexts.pop();
        // Failed publication leaves the pending reservation: it never claims a second fresh delivery.
        writeDeliveryState(context, input, paths, state);
        return written ? payload : '';
    } catch {
        return ''; // Optional guidance never blocks or leaks prompt/path/error details.
    } finally {
        if (token) ledger.releaseLock(paths.lock, token);
    }
}

module.exports = { MAX_PROMPT_CHARS, MAX_CONTEXTS, MAX_STATE_BYTES, MAX_NOTICE_CHARS, MARKER,
    unquotedPrompt, relevantPrompt, eligibleNotice, deliveryPaths, deliverAdvisory };
