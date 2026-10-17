#!/usr/bin/env node
'use strict';
if ((require.main === module || !require.main) && require('./lib/framework-runtime.cjs').skipHook(module)) return;
/**
 * Quality-skill reminder after tool results — keeps the review, test and failure routes in attention
 * during a long run.
 *
 * Re-delivers the canonical `SYNC:quality-skill-routing:reminder` digest from
 * `.claude/skills/shared/sync-inline-versions.md` (pick `why-review` for a rationale, `changes-review` for a
 * focused diff or simple pull request, `workflow-review-changes` for complex changes, the project's test
 * skills for tests, `investigate --mode=debug` for a failure or error). The universal bundle carries the full `quality-skill-routing` protocol; this
 * hook only refreshes the digest, because a long autonomous run sends no prompt that would re-deliver it.
 *
 * Trigger: PostToolUse for every tool (JSON `additionalContext`). Sub-agent tool calls fire it too, so a
 * running sub-agent is covered after its own compaction, which no other event reports.
 *
 * De-duplication: `deliverOnce` of the session-scoped convention ledger (`lib/convention-ledger.cjs`),
 * one record per scope (main conversation or one sub-agent) in the protocol-delivery store. The first
 * tool result of a scope delivers; afterwards only about 150,000 tokens of transcript growth
 * (`DEFAULT_REINJECT_TOKENS` × `BYTES_PER_TOKEN`), a compaction (the primary host's boundary or a Codex
 * `compacted` record) or a changed digest re-delivers. Elapsed time alone never does. A host that
 * exposes no transcript gets one delivery until a compaction. A call without a session id is never
 * delivered: a reminder that cannot be de-duplicated would repeat on every tool result.
 *
 * Cost: one process per tool result; it ends after one record read and one transcript size check when
 * the digest is still present. Advisory; never blocks; every failure stays silent (exit 0).
 *
 * On by default; off with `.claude/.ck.json` qualitySkillReminder.enabled:false (a developer override in
 * `.claude/.ck.local.json` wins) or CK_QUALITY_SKILL_REMINDER=0. CK_DEBUG=1 prints failures to stderr.
 *
 * @hook PostToolUse (*)
 */
const path = require('node:path');

const HOOK_NAME = 'quality-skill-remind';
const SYNC_TAG = 'quality-skill-routing:reminder';
const MARKER_START = '<!-- CK:QUALITY-SKILL-REMINDER -->';
const MARKER_END = '<!-- /CK:QUALITY-SKILL-REMINDER -->';
const SETTINGS_SECTION = 'qualitySkillReminder';
const ENV_SWITCH = 'CK_QUALITY_SKILL_REMINDER';
// Long runs need the routes back in attention before they fade; compaction re-arms independently.
const DEFAULT_REINJECT_TOKENS = 150000;
// Used only when the canonical file cannot be read, so the reminder is never empty. Must equal the
// canonical `SYNC:quality-skill-routing:reminder` body (parity asserted by the hook suite).
const FALLBACK_BODY =
    '**Quality skills first:** review → `why-review` (rationale, decision, claim or statement), `changes-review` (focused diff or simple pull request), `workflow-review-changes` (complex, risky or cross-module pull request or changes); tests → `test`, `integration-test`, `e2e-test`; a failure or error → `investigate --mode=debug` before any fix. Use a generic host or plugin equivalent only when none fits.';

function nonBlank(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function debug(error) {
    try {
        require('./lib/debug-log.cjs').debugError(HOOK_NAME, error);
    } catch {
        /* diagnostics are best-effort */
    }
}

function defaultProjectDir(input, env) {
    const { resolveProjectRoot } = require('./lib/project-root.cjs');
    return resolveProjectRoot({ cwd: nonBlank(input.cwd) ? input.cwd : process.cwd(), scriptPath: __filename, env }).rootDir;
}

function buildContent(projectDir) {
    let body = null;
    try {
        body = require('../scripts/lib/canonical-protocol.cjs').readCanonicalProtocol(projectDir, SYNC_TAG);
    } catch (error) {
        debug(error); // the reminder falls back to its built-in body
    }
    return [MARKER_START, nonBlank(body) ? body.trim() : FALLBACK_BODY, MARKER_END].join('\n');
}

function defaultWrite(text, done) {
    let settled = false;
    const finish = ok => {
        if (settled) return;
        settled = true;
        done(ok);
    };
    // A failed pipe reports through both the callback and the stream's error event.
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
 * deps (tests): env, now, projectDir, rawSettings, content, storeRoot, write.
 */
function run(input, deps = {}) {
    return new Promise(resolve => {
        try {
            if (!input || typeof input !== 'object' || Array.isArray(input)) return resolve('');
            if (input.hook_event_name !== 'PostToolUse' || !nonBlank(input.session_id)) return resolve('');
            const env = deps.env || process.env;
            const projectDir = deps.projectDir || defaultProjectDir(input, env);
            const routeUtils = require('./lib/prompt-route-utils.cjs');
            if (!routeUtils.isRouterEnabled(SETTINGS_SECTION, ENV_SWITCH, { env, projectDir, rawSettings: deps.rawSettings })) return resolve('');
            const content = deps.content || buildContent(projectDir);
            const ledger = require('./lib/convention-ledger.cjs');
            const { BYTES_PER_TOKEN } = require('./lib/file-conventions.cjs');
            ledger.deliverOnce({
                root: deps.storeRoot || path.join(projectDir, 'tmp', 'protocol-delivery'),
                input,
                group: HOOK_NAME,
                hash: require('node:crypto').createHash('sha256').update(content, 'utf8').digest('hex'),
                payload: JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: content } }),
                settings: {
                    reinjectAfterBytes: DEFAULT_REINJECT_TOKENS * BYTES_PER_TOKEN,
                    reinjectAfterMinutes: null,
                    blindReinjectAfterMinutes: null,
                    compactionMarkers: [ledger.CODEX_COMPACTION_MARKER]
                },
                now: typeof deps.now === 'number' ? deps.now : Date.now(),
                write: deps.write || defaultWrite
            }).then(resolve, () => resolve(''));
        } catch (error) {
            debug(error); // fail open: an advisory hook never blocks a tool result
            resolve('');
        }
    });
}

module.exports = {
    HOOK_NAME,
    SYNC_TAG,
    MARKER_START,
    MARKER_END,
    SETTINGS_SECTION,
    ENV_SWITCH,
    DEFAULT_REINJECT_TOKENS,
    FALLBACK_BODY,
    buildContent,
    run
};

// Entry-point check covers the Codex `node -e … require(hook)` launcher too (require.main is undefined there).
// run owns the stream write so delivery credit follows the actual write; the runner must not serialize it again.
if (require('./lib/hook-runner.cjs').isHookEntryPoint(module)) {
    require('./lib/hook-runner.cjs').runHook(HOOK_NAME, input => run(input), { parseEvent: false, outputResult: false });
}
