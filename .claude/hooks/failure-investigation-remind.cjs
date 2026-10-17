#!/usr/bin/env node
'use strict';

if ((require.main === module || !require.main) && require('./lib/framework-runtime.cjs').skipHook(module)) return;

// A conditional pre-shell hint covers hosts whose hook result omits exit status.
// Claude's native failure event also covers other started tools. Never parse tool
// output or run commands. One private reminder record cannot credit full protocols.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const HOOK_NAME = 'failure-investigation-remind';
const DEFAULT_REINJECT_TOKENS = 150000;
const SHELL_TOOLS = new Set(['Bash', 'exec_command']);
const REMINDER = 'Before fixing an unexpected error or failed test, use the registered `investigate --mode=debug` skill to establish the root cause, distinguishing source, test and environment faults. Reuse a current validated investigation. Keep read-only roles read-only and preserve the user\'s action authority.';

function relevant(input) {
    if (input?.hook_event_name === 'PreToolUse') return SHELL_TOOLS.has(input.tool_name);
    return input?.hook_event_name === 'PostToolUseFailure'
        && typeof input.tool_name === 'string' && input.tool_name.trim() !== ''
        && input.is_interrupt !== true;
}

function loadConfig(deps) {
    if (deps.config !== undefined) return deps.config;
    const status = require('./lib/project-config-loader.cjs').getProjectConfigStatus();
    return status.state === 'missing' ? {} : status.valid ? status.config : null;
}

function defaultWrite(text, done) {
    let settled = false;
    const finish = ok => { if (!settled) { settled = true; done(ok); } };
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

async function run(input, deps = {}) {
    try {
        const reset = input?.hook_event_name === 'SessionStart' && ['compact', 'clear'].includes(input.source);
        if ((!reset && !relevant(input)) || typeof input.session_id !== 'string' || !input.session_id.trim()) return '';
        const delivery = require('./lib/protocol-delivery.cjs');
        const root = delivery.resolveRoot(input, deps);
        const config = loadConfig(deps);
        if (!root || !config) return '';
        const settings = config.hooks?.failureInvestigationReminder || {};
        if (settings.enabled === false) return '';
        const ledger = require('./lib/convention-ledger.cjs');
        const store = path.join(root, ...delivery.STORE_SEGMENTS);
        if (reset) {
            // A silent private generation also re-arms hosts without transcripts;
            // it neither changes sibling delivery credit nor writes a shared reset mark.
            if (fs.existsSync(ledger.sessionDir(store, input.session_id))) {
                ledger.writeSessionState(store, input.session_id, HOOK_NAME, { generation: crypto.randomBytes(8).toString('hex') });
            }
            return '';
        }
        const text = `<!-- CK:FAILURE-INVESTIGATION-REMINDER -->\n${REMINDER}\n`;
        const payload = JSON.stringify({ hookSpecificOutput: { hookEventName: input.hook_event_name, additionalContext: text } });
        const generation = ledger.readSessionState(store, input.session_id, HOOK_NAME)?.generation || '';
        const { BYTES_PER_TOKEN, CLASS_REINJECT_TOKENS_RANGE: [min, max] } = require('./lib/file-conventions.cjs');
        const value = settings.reinjectAfterTokens;
        const tokens = Number.isInteger(value) && value >= min && value <= max ? value : DEFAULT_REINJECT_TOKENS;
        return await ledger.deliverOnce({
            root: store,
            input,
            group: HOOK_NAME,
            hash: crypto.createHash('sha256').update(JSON.stringify([text, settings, generation])).digest('hex'),
            payload,
            settings: {
                reinjectAfterBytes: tokens * BYTES_PER_TOKEN,
                reinjectAfterMinutes: null,
                blindReinjectAfterMinutes: null,
                compactionMarkers: [ledger.CODEX_COMPACTION_MARKER]
            },
            now: deps.now ?? Date.now(),
            failOpen: true,
            write: deps.write || defaultWrite
        });
    } catch {
        return ''; // advisory: malformed config/events and output failures never block a tool
    }
}

module.exports = { run, relevant, REMINDER, DEFAULT_REINJECT_TOKENS };
if (require('./lib/hook-runner.cjs').isHookEntryPoint(module)) {
    require('./lib/hook-runner.cjs').runHook(HOOK_NAME, async input => {
        if (!input?.hook_event_name && typeof input?.event === 'string') input = { ...input, hook_event_name: input.event };
        const startedAt = process.hrtime.bigint();
        try {
            await run(input);
        } finally {
            if (input?.hook_event_name === 'PreToolUse') {
                require('./lib/debug-log.cjs').recordHookDecision(HOOK_NAME, {
                    code: 0, decision: 'allow', eventName: 'PreToolUse',
                    toolName: input.tool_name || 'unknown',
                    durationMs: Number(process.hrtime.bigint() - startedAt) / 1e6
                });
            }
        }
    }, { parseEvent: false, outputResult: false });
}
