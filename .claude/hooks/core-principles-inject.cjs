#!/usr/bin/env node
'use strict';

if ((require.main === module || !require.main) && require('./lib/framework-runtime.cjs').skipHook(module)) return;

/**
 * Core engineering principles reminder — Easy to Change · Easy to Scale · Easy to Maintain.
 *
 * Re-delivers the canonical `SYNC:core-engineering-principles` body from
 * `.claude/skills/shared/sync-inline-versions.md` so the gate stays near the model's attention
 * while it plans, implements and reviews. The universal `critical-thinking-mindset` protocol carries
 * its one-paragraph digest for every task. Triggers:
 *   - UserPromptSubmit (plain stdout),
 *   - PostToolUse on the task/plan step boundaries `TodoWrite|TaskCreate|TaskUpdate|update_plan`
 *     (JSON `additionalContext`), so a long autonomous turn with no new prompt is covered too,
 *   - SubagentStart (JSON), once per spawn: a sub-agent receives no prompt event, and
 *   - SessionStart `compact` (JSON): delivered at once, because the compaction dropped the earlier copy
 *     and a run may continue with no prompt; the record absorbs the host's boundary line
 *     (`deliverWithCompaction`), so the prompt that follows stays silent.
 *
 * De-duplication: `deliverOnce` of the session-scoped convention ledger (`lib/convention-ledger.cjs`,
 * the same owner `workflow-route-inject.cjs` delivers through) keeps one record per scope (main
 * conversation or one sub-agent). That record IS the protocol-delivery record of the tag
 * `core-engineering-principles` (`sharedRecordFor` in `lib/protocol-delivery.cjs`): a skill load served
 * by the design-group protocol hook, or this hook, marks the principles delivered for both, so a scope
 * receives the body once per window. The body is delivered again only when the content changes, the context is
 * compacted, or the transcript has grown by about `reinjectAfterTokens` tokens since the last
 * delivery (default 150,000; bytes = tokens × `BYTES_PER_TOKEN`, the measured transcript ratio in
 * `lib/file-conventions.cjs`). A host that exposes no transcript gets one delivery until the next
 * compaction or content change: elapsed time is not evidence that the context moved on.
 *
 * Skills declaring the tag also get the body from the design-group protocol hook. Advisory; never
 * blocks; every failure stays silent (exit 0).
 *
 * On by default. Off with `.claude/.ck.json` `corePrinciplesInject.enabled: false` (a developer
 * override in `.claude/.ck.local.json` wins) or env CK_CORE_PRINCIPLES_INJECT=0. The interval is
 * `corePrinciplesInject.reinjectAfterTokens` (integer within `CLASS_REINJECT_TOKENS_RANGE` of
 * `lib/file-conventions.cjs`, the framework's one token-window range); an out-of-range value falls
 * back to the default rather than guessing.
 *
 * @hook UserPromptSubmit
 * @hook PostToolUse (TodoWrite|TaskCreate|TaskUpdate|update_plan)
 * @hook SubagentStart
 * @hook SessionStart (compact)
 */

const crypto = require('crypto');
const path = require('path');

const HOOK_NAME = 'core-principles-inject';
const SYNC_TAG = 'core-engineering-principles';
// The delivery record is the protocol-delivery record of the tag (see the header), so its group is the tag.
const RECORD_GROUP = SYNC_TAG;
const MARKER_START = '<!-- CK:CORE-ENGINEERING-PRINCIPLES -->';
const MARKER_END = '<!-- /CK:CORE-ENGINEERING-PRINCIPLES -->';
const SETTINGS_SECTION = 'corePrinciplesInject';
const ENV_SWITCH = 'CK_CORE_PRINCIPLES_INJECT';
const STEP_TOOLS = new Set(['TodoWrite', 'TaskCreate', 'TaskUpdate', 'update_plan']);
// Refresh intent during long work before it fades from attention. The 150k default
// reduces repetition without dropping the reminder; compaction still re-arms it.
const DEFAULT_REINJECT_TOKENS = 150000;
// Used only when the canonical file cannot be read, so the reminder is never empty. Must equal the
// canonical `SYNC:core-engineering-principles:reminder` body (parity asserted by the hook suite).
const FALLBACK_BODY =
    '**MUST ATTENTION** Core Engineering Principles — every plan, implementation and review must be **Easy to change** (reuse first, one owner per rule, interfaces/adapters at volatile boundaries, no speculative abstraction) · **Easy to scale** (extend by addition, bounded growth, explicit boundaries, sized to the project\'s real profile) · **Easy to maintain** (intent-named tests that fail when the rule breaks across happy/error/edge paths; harness green locally and in CI). Before done: next change → how many edit sites? 10× → what breaks? which test goes red?';

function nonBlank(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function defaultProjectDir(input, env) {
    const { resolveProjectRoot } = require('./lib/project-root.cjs');
    const cwd = nonBlank(input?.cwd) ? input.cwd : process.cwd();
    return resolveProjectRoot({ cwd, scriptPath: __filename, env }).rootDir;
}

/** Event kind this hook serves, or null to stay silent. */
function eventKind(input) {
    const event = input.hook_event_name;
    if (event === 'PostToolUse') return STEP_TOOLS.has(input.tool_name) ? 'step' : null;
    if (event === undefined || event === 'UserPromptSubmit') return 'prompt';
    if (event === 'SubagentStart') return 'agent';
    if (event === 'SessionStart' && input.source === 'compact') return 'compaction';
    return null;
}

/** Re-injection interval in tokens from the merged settings; out of range → default. */
function resolveReinjectTokens(settings) {
    const value = isPlainObject(settings) ? settings.reinjectAfterTokens : undefined;
    const [min, max] = require('./lib/file-conventions.cjs').CLASS_REINJECT_TOKENS_RANGE;
    return Number.isInteger(value) && value >= min && value <= max ? value : DEFAULT_REINJECT_TOKENS;
}

/** Ledger settings: byte window only; no age-based re-arming (see the header). */
function ledgerSettings(reinjectTokens) {
    const { BYTES_PER_TOKEN } = require('./lib/file-conventions.cjs');
    return {
        reinjectAfterBytes: reinjectTokens * BYTES_PER_TOKEN,
        reinjectAfterMinutes: null,
        blindReinjectAfterMinutes: null,
        compactionMarkers: [require('./lib/convention-ledger.cjs').CODEX_COMPACTION_MARKER]
    };
}

function buildContent(projectDir) {
    let body = null;
    try {
        const { readCanonicalProtocol } = require('../scripts/lib/canonical-protocol.cjs');
        body = readCanonicalProtocol(projectDir, SYNC_TAG);
    } catch {
        body = null;
    }
    return [MARKER_START, nonBlank(body) ? body.trim() : FALLBACK_BODY, MARKER_END].join('\n');
}

/**
 * Where and under which content key the delivery is recorded: the protocol-delivery record of the tag
 * (store directory and hash of the published projection), so a delivery by the design-group protocol
 * hook counts here and this delivery counts there. With no published projection the record is private
 * to this hook (hash of the delivered content).
 */
function recordTarget(projectDir, contentHash) {
    try {
        const shared = require('./lib/protocol-delivery.cjs').sharedRecordFor(projectDir, SYNC_TAG);
        return { root: shared.root, hash: shared.hash || contentHash };
    } catch {
        return { root: path.join(projectDir, 'tmp', 'protocol-delivery'), hash: contentHash };
    }
}

/** Plain stdout on a prompt; the JSON context envelope on every other event. */
function formatPayload(input, content) {
    const event = input.hook_event_name;
    if (event === undefined || event === 'UserPromptSubmit') return `${content}\n`;
    return JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: content } });
}

function defaultWrite(text, done) {
    let settled = false;
    const finish = ok => {
        if (settled) return;
        settled = true;
        done(ok);
    };
    // A failed pipe reports through both the callback and the stream's error event.
    // Keep the listener on callback failure until that event arrives; removing it early throws.
    const onError = () => finish(false);
    process.stdout.once('error', onError);
    try {
        process.stdout.write(text, error => {
            if (!error) process.stdout.removeListener('error', onError);
            finish(!error);
        });
    } catch {
        process.stdout.removeListener('error', onError);
        finish(false);
    }
}

/**
 * Resolve to the text written, or '' when the hook stays silent.
 * deps (tests): env, now, projectDir, rawSettings, content, ledger, storeRoot, write, homeDir, config.
 */
function run(input, deps = {}) {
    return new Promise(resolve => {
        const finish = value => resolve(value);
        try {
            if (!isPlainObject(input) || !nonBlank(input.session_id)) return finish('');
            const kind = eventKind(input);
            if (!kind) return finish('');

            const env = deps.env || process.env;
            const now = typeof deps.now === 'number' ? deps.now : Date.now();
            const projectDir = deps.projectDir || defaultProjectDir(input, env);
            // The concise universal core owns these principles once for every task.
            // Missing core projection retains this independent compatible fallback.
            const contextDelivery = require('./lib/context-delivery.cjs');
            if (contextDelivery.conciseCore(projectDir, contextDelivery.profileOptions(deps))) {
                // Bin 1 is registered on agent start and compaction itself; a second carrier would race it.
                if (kind === 'agent' || kind === 'compaction') return finish('');
                return require('./lib/universal-delivery.cjs').ensureConciseCore(input, { ...deps, projectRoot: projectDir }).then(finish, () => finish(''));
            }
            const routeUtils = require('./lib/prompt-route-utils.cjs');
            // One settings read serves both the switch and the interval.
            const rawSettings = deps.rawSettings !== undefined ? deps.rawSettings : routeUtils.loadRouterSettings(projectDir, SETTINGS_SECTION);
            if (!routeUtils.isRouterEnabled(SETTINGS_SECTION, ENV_SWITCH, { env, projectDir, rawSettings })) return finish('');
            const settings = ledgerSettings(resolveReinjectTokens(rawSettings));

            const content = deps.content || buildContent(projectDir);
            const target = recordTarget(projectDir, crypto.createHash('sha256').update(content, 'utf8').digest('hex'));
            const ledger = deps.ledger || require('./lib/convention-ledger.cjs');
            ledger.deliverWithCompaction({
                root: deps.storeRoot || target.root,
                input: ledger.agentStartInput(input),
                group: RECORD_GROUP,
                hash: target.hash,
                payload: formatPayload(input, content),
                settings,
                now,
                write: deps.write || defaultWrite
            }).then(finish, () => finish(''));
        } catch {
            finish('');
        }
    });
}

module.exports = {
    HOOK_NAME,
    RECORD_GROUP,
    SYNC_TAG,
    MARKER_START,
    MARKER_END,
    SETTINGS_SECTION,
    ENV_SWITCH,
    DEFAULT_REINJECT_TOKENS,
    FALLBACK_BODY,
    resolveReinjectTokens,
    buildContent,
    recordTarget,
    run
};

// Entry-point check covers the Codex `node -e … require(hook)` launcher too (require.main is undefined there).
if (require('./lib/hook-runner.cjs').isHookEntryPoint(module)) {
    process.exitCode = 0;
    let input = null;
    try {
        const { parseStdinSync } = require('./lib/stdin-parser.cjs');
        input = parseStdinSync({ defaultValue: null, throwOnError: true, context: HOOK_NAME });
    } catch {
        input = null;
    }
    if (input) run(input).then(() => { process.exitCode = 0; }, () => { process.exitCode = 0; });
}
