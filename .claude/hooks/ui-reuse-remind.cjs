#!/usr/bin/env node
'use strict';

if ((require.main === module || !require.main) && require('./lib/framework-runtime.cjs').skipHook(module)) return;

/**
 * Default-on concise UI reuse reminder: every prompt, every sub-agent start, right after a compaction
 * (a run may continue with no prompt) and before matching frontend reads/changes or plan loads.
 * SessionStart compact/clear also re-arms blind contexts of every scope; after a clear the next prompt delivers.
 * One private reminder record per scope: a digest must never suppress full protocol delivery. Config: docs/project-config.json hooks.uiReuseReminder. Reuses the convention matcher,
 * canonical protocol reader and delivery ledger; never scans the repository or opens target files.
 * Windows/macOS/Linux accept either path separator; shell tokens are hints, never executed.
 */
const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');
const HOOK_NAME = 'ui-reuse-remind';
const DEFAULT_REINJECT_TOKENS = 100000;
const FILE_TOOLS = new Set(['Read', 'Edit', 'Write', 'MultiEdit', 'NotebookEdit', 'apply_patch']);
const SHELL_TOOLS = new Set(['Bash', 'exec_command']);
const EXTRA_NAMES = '\\.(?:erb|haml|slim|heex|leex|eex|blade\\.php|fxml|qml|ui|uxml|uss|wxml|wxss)$';
// Shared language extensions need UI ownership evidence from the path, not the extension alone.
const UI_PATH = '/(?:components?|pages?|views?|screens?|widgets?|layouts?|composables|frontend|front-end|client|web|ui)/(?:[^/]+/)*[^/]+\\.(?:[cm]?[jt]sx?|dart|swift|kt|kts|java|cs|php|rb|py)$';

function loadConfig(deps) {
    if (deps.config !== undefined) return deps.config;
    const status = require('./lib/project-config-loader.cjs').getProjectConfigStatus();
    return status.state === 'missing' ? {} : status.valid ? status.config : null;
}

function matcher(settings) {
    const { UI_UX_GATE } = require('./lib/file-conventions.cjs');
    const defaults = settings.useDefaultMatchers !== false;
    return {
        pathRegexes: defaults ? [...UI_UX_GATE.pathRegexes, UI_PATH] : [],
        fileNameRegexes: defaults ? [...UI_UX_GATE.fileNameRegexes, EXTRA_NAMES] : [],
        pathGlobs: settings.pathGlobs || [],
        excludePathGlobs: [...UI_UX_GATE.excludePathGlobs, '.agents/**', '.codex/**', '.opencode/**', ...(settings.excludePathGlobs || [])]
    };
}

function relevant(input, root, settings) {
    if (['UserPromptSubmit', 'SubagentStart', 'SessionStart'].includes(input.hook_event_name)) return true;
    if (input.hook_event_name !== 'PreToolUse') return false;
    const ti = input.tool_input || {};
    if (input.tool_name === 'Skill') return (ti.skill || ti.name) === 'plan';
    const conventions = require('./lib/file-conventions.cjs');
    let targets = [];
    if (FILE_TOOLS.has(input.tool_name)) targets = conventions.extractTargets(input, root);
    else if (SHELL_TOOLS.has(input.tool_name)) {
        const command = ti.command || ti.cmd;
        if (typeof command !== 'string') return false;
        // Literal quoted/unquoted tokens only, capped: no shell expansion, execution or target reads.
        const tokens = command.slice(0, 32768).match(/"[^"\n]*"|'[^'\n]*'|[^\s"'`;|&<>(),=]+/g) || [];
        targets = tokens.slice(0, 256).map(token => conventions.toRepoRelative(token.replace(/^(['"])(.*)\1$/, '$2').replace(/\\/g, '/'), root, input.cwd || root)).filter(Boolean);
    }
    // The generic extractor preserves native path spelling. Normalize hints and re-check containment
    // here, so POSIX backslashes match UI ownership without admitting `..\\outside`.
    targets = targets.map(rel => conventions.toRepoRelative(rel.replace(/\\/g, '/'), root, root)).filter(Boolean);
    const group = matcher(settings);
    return targets.some(rel => /^(?:\.claude|\.agents)\/skills\/plan\/SKILL\.md$/i.test(rel) || conventions.groupMatches(group, rel));
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
        if (!input || !['UserPromptSubmit', 'PreToolUse', 'SessionStart', 'SubagentStart'].includes(input.hook_event_name)) return '';
        const delivery = require('./lib/protocol-delivery.cjs');
        const root = delivery.resolveRoot(input, deps);
        const config = loadConfig(deps);
        if (!root || !config) return '';
        const settings = config.hooks?.uiReuseReminder || {};
        if (settings.enabled === false) return '';
        const ledger = require('./lib/convention-ledger.cjs');
        const store = path.join(root, ...delivery.STORE_SEGMENTS);
        if (input.hook_event_name === 'SessionStart') {
            // Same-event sibling hooks may already have delivered. Reset only this reminder's
            // private generation, never the shared compaction timestamp or another group's credit.
            if (['compact', 'clear'].includes(input.source) && typeof input.session_id === 'string' && input.session_id.trim()
                && fs.existsSync(ledger.sessionDir(store, input.session_id))) {
                ledger.writeSessionState(store, input.session_id, HOOK_NAME, { generation: crypto.randomBytes(8).toString('hex') });
            }
            // A compaction delivers at once: a run may continue with no prompt. A clear waits for the next prompt.
            if (!ledger.isCompactionStart(input)) return '';
        }
        if (!relevant(input, root, settings)) return '';
        const { readCanonicalProtocol } = require('../scripts/lib/canonical-protocol.cjs');
        const body = readCanonicalProtocol(root, 'ui-system-context:reminder');
        // An incomplete installation names the source without earning delivery credit.
        const content = body || 'Before frontend UI work, read .claude/skills/shared/protocols/ui-system-context.md; UI reuse reminder source unavailable.';
        const text = `<!-- CK:UI-REUSE-REMINDER -->\n${content}\n`;
        const payload = input.hook_event_name === 'UserPromptSubmit' ? text : JSON.stringify({
            hookSpecificOutput: { hookEventName: input.hook_event_name, additionalContext: text }
        });
        const write = deps.write || defaultWrite;
        if (!body || typeof input.session_id !== 'string' || !input.session_id.trim()) {
            return await new Promise(resolve => {
                try { write(payload, ok => resolve(ok === false ? '' : payload)); } catch { resolve(''); }
            });
        }
        const generation = ledger.readSessionState(store, input.session_id, HOOK_NAME)?.generation || '';
        const { BYTES_PER_TOKEN, CLASS_REINJECT_TOKENS_RANGE: [min, max] } = require('./lib/file-conventions.cjs');
        const value = settings.reinjectAfterTokens;
        const tokens = Number.isInteger(value) && value >= min && value <= max ? value : DEFAULT_REINJECT_TOKENS;
        return await ledger.deliverWithCompaction({
            root: store,
            input: ledger.agentStartInput(input),
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
            write
        });
    } catch {
        return ''; // advisory: malformed events/config or output failures never block work
    }
}

module.exports = { run, relevant, matcher, DEFAULT_REINJECT_TOKENS };
if (require('./lib/hook-runner.cjs').isHookEntryPoint(module)) {
    // One lifecycle adapter handles prompt, tool and reset events. run owns stream callbacks
    // so delivery credit follows the actual write; the runner must not serialize it again.
    require('./lib/hook-runner.cjs').runHook(HOOK_NAME, async input => {
        // PreToolUse callers also support the legacy event field; adapt once for policy/logging.
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
