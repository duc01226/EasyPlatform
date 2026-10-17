#!/usr/bin/env node
/**
 * Notification Router - Main entry point for hook notifications
 * Reads stdin JSON, routes to enabled providers
 *
 * Usage: echo '{"hook_event_name":"Stop"}' | node notify.cjs
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { loadEnv } = require('./lib/env-loader.cjs');

// Provider prefixes to check for enablement
const PROVIDER_PREFIXES = ['TELEGRAM', 'DISCORD', 'SLACK'];

// Whitelist: only these events trigger notifications (everything else is skipped)
// SessionEnd = main session ended, Stop = turn complete, AskUserQuestion = user input needed
const EVENT_WHITELIST = ['SessionEnd', 'Stop', 'idle_prompt', 'AskUserPrompt', 'AskUserQuestion', 'permission_prompt'];

/**
 * Normalize hook input so every provider resolves one canonical event identity.
 * A PreToolUse for the AskUserQuestion tool arrives as hook_event_name='PreToolUse'
 * with tool_name='AskUserQuestion'. Rewrite it to a first-class 'AskUserQuestion'
 * event so the whitelist and all providers (which key off hook_event_name /
 * notification_type) treat it uniformly. Codex Stop messages ending in '?'
 * are tagged as inferred questions so desktop delivery stays nonblocking.
 * Mutates and returns input.
 * @param {Object} input - Event data
 * @returns {Object} Normalized input
 */
function normalizeEvent(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return input;
    }

    if (input.tool_name === 'AskUserQuestion' && !input.notification_type) {
        input.hook_event_name = 'AskUserQuestion';
    }

    // Codex has no dedicated question hook. Its Stop payload includes the
    // completed assistant message, so use a narrow final-question-mark
    // heuristic and leave ordinary turn completions on the Stop path.
    if (
        input.hook_event_name === 'Stop' &&
        !input.notification_type &&
        typeof input.turn_id === 'string' &&
        typeof input.last_assistant_message === 'string' &&
        input.last_assistant_message.trim().endsWith('?')
    ) {
        input.hook_event_name = 'AskUserQuestion';
        input.notification_source = 'codex-stop-question';
    }

    return input;
}

/**
 * Get the effective event type from input
 * @param {Object} input - Event data
 * @returns {string} Event type
 */
function getEventType(input) {
    return input.notification_type || input.hook_event_name || 'default';
}

// Background-task statuses that mean the task has already settled and will not
// wake the main session again.
const SETTLED_TASK_STATUSES = ['completed', 'failed', 'killed', 'stopped', 'cancelled', 'canceled'];

// Background-task types the main session waits on: delegated work that reports
// back into the conversation and then ends. Shell commands and monitors are left
// out on purpose — a dev server or log tail may never end, and holding the alert
// for one would silence a finished job for good.
const AWAITED_TASK_TYPES = ['subagent', 'workflow', 'mcp task'];

/**
 * Whether the payload came from a delegated (subagent / child) conversation.
 * Claude adds agent_id only for subagent hook events; host bridges reuse the marker.
 * @param {Object} input - Event data
 * @returns {boolean}
 */
function isDelegatedConversation(input) {
    return Object.prototype.hasOwnProperty.call(input, 'agent_id');
}

/**
 * Count the delegated tasks the main session is still waiting on at a turn end.
 * Claude lists in-flight work in Stop's background_tasks; each delegated task
 * wakes the main session again when it finishes, so the job is not done yet.
 * Hosts that do not send the array report zero, which keeps their alert.
 * @param {Object} input - Event data
 * @returns {number}
 */
function countAwaitedTasks(input) {
    if (!Array.isArray(input.background_tasks)) return 0;
    const lower = value => (typeof value === 'string' ? value.toLowerCase() : '');
    return input.background_tasks.filter(task => task &&
        AWAITED_TASK_TYPES.includes(lower(task.type)) &&
        !SETTLED_TASK_STATUSES.includes(lower(task.status))).length;
}

/**
 * Whether a one-shot scheduled wakeup (ScheduleWakeup, a one-time cron) will
 * resume the main session. A recurring cron never ends on its own, so it does
 * not hold back the alert — otherwise a standing schedule would silence it forever.
 * @param {Object} input - Event data
 * @returns {boolean}
 */
function hasPendingWakeup(input) {
    return Array.isArray(input.session_crons) &&
        input.session_crons.some(cron => cron && cron.recurring === false);
}

/**
 * Explain why an event must not raise an alert.
 * Single owner of every suppression rule, so the router's skip log and its
 * eligibility check can never disagree.
 * @param {Object} input - Event data
 * @returns {string|null} Skip reason, or null when the event may alert
 */
function getSkipReason(input) {
    // OpenCode's question tool also passes through tool.execute.before. Its
    // question.asked event is the authoritative point where the prompt is
    // waiting for the user, so suppress that earlier precursor to avoid a
    // duplicate alert.
    if (input && input.notification_deferred === true) {
        return 'deferred question precursor';
    }

    const eventType = getEventType(input);

    if (eventType === 'SessionEnd') {
        // SessionEnd alerts belong to the main session; Codex SessionEnd is
        // main-session-only too.
        if (isDelegatedConversation(input)) {
            return 'subagent SessionEnd';
        }
        // A host bridge that cannot tell whether the ended conversation was the
        // main one still forwards SessionEnd so per-session cleanup runs, but
        // marks it unknown: an unproven main-session end must not alert.
        if (input.conversation_kind === 'unknown') {
            return 'SessionEnd for a conversation of unknown kind';
        }
        // A user-initiated conversation reset is not a finished session: the
        // developer is at the keyboard and starts over. Hosts that omit the
        // reason (e.g. Codex) still alert, because the end cannot be told apart.
        if (input.reason === 'clear') {
            return 'SessionEnd after conversation reset (clear)';
        }
    }

    if (eventType === 'Stop') {
        // A turn-complete alert means the main session finished its job. A
        // delegated conversation going idle is not that.
        if (isDelegatedConversation(input)) {
            return 'subagent Stop';
        }
        // Each finished delegated task wakes the main session for another turn,
        // so alerting on every such turn spams one alert per task. Hold the alert
        // until the turn that ends with no delegated work left in flight.
        const awaitedTasks = countAwaitedTasks(input);
        if (awaitedTasks > 0) {
            return `Stop while ${awaitedTasks} delegated task(s) still run`;
        }
        if (hasPendingWakeup(input)) {
            return 'Stop while a scheduled wakeup will resume the session';
        }
    }

    return EVENT_WHITELIST.includes(eventType) ? null : `${eventType} not in whitelist`;
}

/**
 * Read JSON from stdin
 * @returns {Promise<Object>} Parsed JSON input
 */
async function readStdin() {
    return new Promise((resolve, reject) => {
        let data = '';

        // Handle no stdin (empty pipe)
        if (process.stdin.isTTY) {
            resolve({});
            return;
        }

        process.stdin.setEncoding('utf8');
        process.stdin.on('data', chunk => {
            data += chunk;
        });
        process.stdin.on('end', () => {
            if (!data.trim()) {
                resolve({});
                return;
            }
            try {
                resolve(JSON.parse(data));
            } catch (err) {
                console.error(`[notify] Invalid JSON input: ${err.message}`);
                resolve({});
            }
        });
        process.stdin.on('error', err => {
            console.error(`[notify] Stdin error: ${err.message}`);
            resolve({});
        });

        // Timeout after 5 seconds (safety)
        setTimeout(() => {
            console.error('[notify] Stdin timeout');
            resolve({});
        }, 5000);
    });
}

/**
 * Check if a provider has any env vars set
 * @param {string} prefix - Provider prefix (e.g., 'TELEGRAM')
 * @param {Object} env - Environment variables
 * @returns {boolean}
 */
function hasProviderEnv(prefix, env) {
    return Object.keys(env).some(key => key.startsWith(prefix + '_'));
}

/**
 * Load provider module if it exists
 * @param {string} providerName - Provider name (lowercase)
 * @returns {Object|null} Provider module or null
 */
function loadProvider(providerName) {
    const providerPath = path.join(__dirname, 'providers', `${providerName}.cjs`);

    try {
        if (fs.existsSync(providerPath)) {
            return require(providerPath);
        }
    } catch (err) {
        console.error(`[notify] Failed to load provider ${providerName}: ${err.message}`);
    }
    return null;
}

/**
 * Collect the providers enabled for this environment.
 * Desktop is enabled by default (no env prefix needed); Telegram, Discord and
 * Slack require their env vars.
 * @param {Object} env - Environment variables
 * @returns {Array<[string, Object]>} [providerName, provider] pairs
 */
function getEnabledProviders(env) {
    const enabled = [];

    const desktopProvider = loadProvider('desktop');
    if (desktopProvider && typeof desktopProvider.isEnabled === 'function' && desktopProvider.isEnabled(env)) {
        enabled.push(['desktop', desktopProvider]);
    }

    for (const prefix of PROVIDER_PREFIXES) {
        if (!hasProviderEnv(prefix, env)) continue;

        const providerName = prefix.toLowerCase();
        const provider = loadProvider(providerName);

        if (!provider) {
            console.error(`[notify] Provider ${providerName} not found`);
            continue;
        }

        // Check if provider considers itself enabled
        if (typeof provider.isEnabled === 'function' && !provider.isEnabled(env)) {
            continue;
        }

        enabled.push([providerName, provider]);
    }

    return enabled;
}

/**
 * Send through one provider. Never rejects: a provider failure is a result.
 * @param {string} providerName - Provider name (lowercase)
 * @param {Object} provider - Provider module
 * @param {Object} input - Event data
 * @param {Object} env - Environment variables
 * @returns {Promise<Object>} Provider result tagged with its name
 */
async function sendWithProvider(providerName, provider, input, env) {
    const name = provider.name || providerName;
    try {
        const result = await provider.send(input, env);

        if (result.success) {
            console.error(`[notify] ${providerName}: sent`);
        } else if (result.throttled) {
            console.error(`[notify] ${providerName}: throttled`);
        } else {
            console.error(`[notify] ${providerName}: failed - ${result.error}`);
        }
        return { provider: name, ...result };
    } catch (err) {
        console.error(`[notify] ${providerName} error: ${err.message}`);
        return { provider: name, success: false, error: err.message };
    }
}

/**
 * Deliver one event to every enabled provider at once.
 * Concurrent on purpose: SessionEnd runs under a 3-second host hook budget, so
 * a slow desktop alert must not hold back the remote channels until the host
 * kills the hook.
 * @param {Object} input - Event data
 * @param {Object} env - Environment variables
 * @returns {Promise<Object[]>} One result per enabled provider
 */
function dispatchToProviders(input, env) {
    return Promise.all(getEnabledProviders(env).map(([providerName, provider]) =>
        sendWithProvider(providerName, provider, input, env)));
}

/**
 * Main notification router
 */
async function main() {
    if ((require.main === module || !require.main) && require('../lib/framework-runtime.cjs').skipHook(module)) return;
    try {
        // Read input from stdin, then normalize event identity for all providers
        const input = normalizeEvent(await readStdin());

        // Load environment with cascade
        const cwd = input.cwd || process.cwd();
        const env = loadEnv(cwd);

        // Eligibility check: whitelist plus the event-specific suppression rules
        const skipReason = getSkipReason(input);
        if (skipReason) {
            console.error(`[notify] Skipped: ${skipReason}`);
            process.exit(0);
        }

        const results = await dispatchToProviders(input, env);

        // Log summary if any providers ran
        if (results.length > 0) {
            const successful = results.filter(r => r.success).length;
            console.error(`[notify] Summary: ${successful}/${results.length} succeeded`);
        }
    } catch (err) {
        console.error(`[notify] Fatal error: ${err.message}`);
    }

    // Always exit 0 - never block Claude
    process.exit(0);
}

main();
