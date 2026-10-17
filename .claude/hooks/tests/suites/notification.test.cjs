/**
 * Notification System Tests
 * Tests for the notification hook router and providers
 */
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const vm = require('vm');
const { spawn } = require('child_process');
const { runHook } = require('../lib/hook-runner.cjs');
const { createTempDir, cleanupTempDir } = require('../lib/test-utils.cjs');
const { assertTrue, assertFalse, assertEqual, assertContains } = require('../lib/assertions.cjs');

// ============================================================================
// Test Configuration
// ============================================================================

const HOOKS_DIR = path.resolve(__dirname, '..', '..');
const NOTIFY_SCRIPT = path.join(HOOKS_DIR, 'notifications', 'notify.cjs');
const DISCORD_PROVIDER = path.join(HOOKS_DIR, 'notifications', 'providers', 'discord.cjs');
const TELEGRAM_PROVIDER = path.join(HOOKS_DIR, 'notifications', 'providers', 'telegram.cjs');
const SLACK_PROVIDER = path.join(HOOKS_DIR, 'notifications', 'providers', 'slack.cjs');
const DESKTOP_PROVIDER = path.join(HOOKS_DIR, 'notifications', 'providers', 'desktop.cjs');
const SENDER_LIB = path.join(HOOKS_DIR, 'notifications', 'lib', 'sender.cjs');
const EVENT_COPY_LIB = path.join(HOOKS_DIR, 'notifications', 'lib', 'event-copy.cjs');
const ENV_LOADER_LIB = path.join(HOOKS_DIR, 'notifications', 'lib', 'env-loader.cjs');

// ============================================================================
// File Existence Tests
// ============================================================================

const fileExistenceTests = [
    {
        name: '[notification] notify.cjs router exists',
        fn: () => {
            assertTrue(fs.existsSync(NOTIFY_SCRIPT), `Router not found: ${NOTIFY_SCRIPT}`);
        }
    },
    {
        name: '[notification] discord.cjs provider exists',
        fn: () => {
            assertTrue(fs.existsSync(DISCORD_PROVIDER), `Provider not found: ${DISCORD_PROVIDER}`);
        }
    },
    {
        name: '[notification] telegram.cjs provider exists',
        fn: () => {
            assertTrue(fs.existsSync(TELEGRAM_PROVIDER), `Provider not found: ${TELEGRAM_PROVIDER}`);
        }
    },
    {
        name: '[notification] slack.cjs provider exists',
        fn: () => {
            assertTrue(fs.existsSync(SLACK_PROVIDER), `Provider not found: ${SLACK_PROVIDER}`);
        }
    },
    {
        name: '[notification] sender.cjs lib exists',
        fn: () => {
            assertTrue(fs.existsSync(SENDER_LIB), `Lib not found: ${SENDER_LIB}`);
        }
    },
    {
        name: '[notification] env-loader.cjs lib exists',
        fn: () => {
            assertTrue(fs.existsSync(ENV_LOADER_LIB), `Lib not found: ${ENV_LOADER_LIB}`);
        }
    },
    {
        name: '[notification] desktop.cjs provider exists',
        fn: () => {
            assertTrue(fs.existsSync(DESKTOP_PROVIDER), `Provider not found: ${DESKTOP_PROVIDER}`);
        }
    }
];

// ============================================================================
// Provider Module Structure Tests
// ============================================================================

const providerModuleTests = [
    {
        name: '[notification] discord provider has required exports',
        fn: () => {
            const provider = require(DISCORD_PROVIDER);
            assertTrue(typeof provider.name === 'string', 'discord.name must be string');
            assertTrue(typeof provider.isEnabled === 'function', 'discord.isEnabled must be function');
            assertTrue(typeof provider.send === 'function', 'discord.send must be function');
        }
    },
    {
        name: '[notification] telegram provider has required exports',
        fn: () => {
            const provider = require(TELEGRAM_PROVIDER);
            assertTrue(typeof provider.name === 'string', 'telegram.name must be string');
            assertTrue(typeof provider.isEnabled === 'function', 'telegram.isEnabled must be function');
            assertTrue(typeof provider.send === 'function', 'telegram.send must be function');
        }
    },
    {
        name: '[notification] slack provider has required exports',
        fn: () => {
            const provider = require(SLACK_PROVIDER);
            assertTrue(typeof provider.name === 'string', 'slack.name must be string');
            assertTrue(typeof provider.isEnabled === 'function', 'slack.isEnabled must be function');
            assertTrue(typeof provider.send === 'function', 'slack.send must be function');
        }
    },
    {
        name: '[notification] desktop provider has required exports',
        fn: () => {
            const provider = require(DESKTOP_PROVIDER);
            assertTrue(typeof provider.name === 'string', 'desktop.name must be string');
            assertTrue(typeof provider.isEnabled === 'function', 'desktop.isEnabled must be function');
            assertTrue(typeof provider.send === 'function', 'desktop.send must be function');
        }
    }
];

// ============================================================================
// Provider Enablement Tests
// ============================================================================

const providerEnablementTests = [
    {
        name: '[notification] discord isEnabled false without DISCORD_WEBHOOK_URL',
        fn: () => {
            // Clear cache to get fresh module
            delete require.cache[require.resolve(DISCORD_PROVIDER)];
            const provider = require(DISCORD_PROVIDER);
            assertFalse(provider.isEnabled({}), 'Should be disabled without URL');
        }
    },
    {
        name: '[notification] discord isEnabled true with DISCORD_WEBHOOK_URL',
        fn: () => {
            delete require.cache[require.resolve(DISCORD_PROVIDER)];
            const provider = require(DISCORD_PROVIDER);
            assertTrue(provider.isEnabled({ DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/test' }), 'Should be enabled with URL');
        }
    },
    {
        name: '[notification] telegram isEnabled false without both tokens',
        fn: () => {
            delete require.cache[require.resolve(TELEGRAM_PROVIDER)];
            const provider = require(TELEGRAM_PROVIDER);
            assertFalse(provider.isEnabled({}), 'Should be disabled without tokens');
            assertFalse(provider.isEnabled({ TELEGRAM_BOT_TOKEN: 'token' }), 'Should be disabled with only token');
            assertFalse(provider.isEnabled({ TELEGRAM_CHAT_ID: 'chat' }), 'Should be disabled with only chat');
        }
    },
    {
        name: '[notification] telegram isEnabled true with both tokens',
        fn: () => {
            delete require.cache[require.resolve(TELEGRAM_PROVIDER)];
            const provider = require(TELEGRAM_PROVIDER);
            assertTrue(provider.isEnabled({ TELEGRAM_BOT_TOKEN: 'token', TELEGRAM_CHAT_ID: 'chat' }), 'Should be enabled with both tokens');
        }
    },
    {
        name: '[notification] slack isEnabled false without SLACK_WEBHOOK_URL',
        fn: () => {
            delete require.cache[require.resolve(SLACK_PROVIDER)];
            const provider = require(SLACK_PROVIDER);
            assertFalse(provider.isEnabled({}), 'Should be disabled without URL');
        }
    },
    {
        name: '[notification] slack isEnabled true with SLACK_WEBHOOK_URL',
        fn: () => {
            delete require.cache[require.resolve(SLACK_PROVIDER)];
            const provider = require(SLACK_PROVIDER);
            assertTrue(provider.isEnabled({ SLACK_WEBHOOK_URL: 'https://hooks.slack.com/test' }), 'Should be enabled with URL');
        }
    },
    {
        name: '[notification] desktop isEnabled true by default (no env)',
        fn: () => {
            delete require.cache[require.resolve(DESKTOP_PROVIDER)];
            const provider = require(DESKTOP_PROVIDER);
            assertTrue(provider.isEnabled({}), 'Should be enabled by default');
        }
    },
    {
        name: '[notification] desktop isEnabled true with explicit true',
        fn: () => {
            delete require.cache[require.resolve(DESKTOP_PROVIDER)];
            const provider = require(DESKTOP_PROVIDER);
            assertTrue(provider.isEnabled({ ENABLE_DESKTOP_NOTIFICATIONS: 'true' }), 'Should be enabled with explicit true');
        }
    },
    {
        name: '[notification] desktop isEnabled false with explicit false',
        fn: () => {
            delete require.cache[require.resolve(DESKTOP_PROVIDER)];
            const provider = require(DESKTOP_PROVIDER);
            assertFalse(provider.isEnabled({ ENABLE_DESKTOP_NOTIFICATIONS: 'false' }), 'Should be disabled with explicit false');
        }
    }
];

// ============================================================================
// Router Execution Tests
// ============================================================================

// Every remote channel is enabled by an env key with one of these prefixes, read from the
// process env, the user-level env file under the home directory, or the workspace env file.
const PROVIDER_ENV_PREFIX = /^(TELEGRAM|DISCORD|SLACK)_/;
const PROVIDER_ENV_KEYS = ['DISCORD_WEBHOOK_URL', 'SLACK_WEBHOOK_URL', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'];

/**
 * Child env for a router run that can reach no real channel: every provider key the
 * child could inherit is blanked (an empty value outranks any env-file value and
 * disables the provider), desktop alerts are off, and home plus temp point at a
 * throwaway directory so no user-level env file or shared throttle file is read.
 */
function isolatedRouterEnv(isolatedDir) {
    const env = {
        ENABLE_DESKTOP_NOTIFICATIONS: 'false',
        HOME: isolatedDir,
        USERPROFILE: isolatedDir,
        TMPDIR: isolatedDir,
        TEMP: isolatedDir,
        TMP: isolatedDir
    };
    for (const key of [...Object.keys(process.env), ...PROVIDER_ENV_KEYS]) {
        if (PROVIDER_ENV_PREFIX.test(key)) env[key] = '';
    }
    return env;
}

// Run the real router process against one payload inside its own isolated directory.
async function runRouter(input, { env = {} } = {}) {
    const isolatedDir = createTempDir('notify-router-');
    try {
        return await runHook(NOTIFY_SCRIPT, input, {
            timeout: 5000,
            cwd: isolatedDir,
            env: { ...isolatedRouterEnv(isolatedDir), ...env }
        });
    } finally {
        cleanupTempDir(isolatedDir);
    }
}

// Local webhook endpoint that counts every request it receives. `respond` is true (answer 200),
// false (never answer), or a function of the request path returning a status code or false.
async function startCountingServer({ respond = true } = {}) {
    const requests = [];
    const server = http.createServer((req, res) => {
        requests.push(req.url);
        req.resume();
        const status = typeof respond === 'function' ? respond(req.url) : (respond ? 200 : false);
        if (status) req.on('end', () => { res.writeHead(status); res.end(status === 200 ? 'ok' : 'failed'); });
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}`;
    const close = () => new Promise(resolve => {
        if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
        server.close(() => resolve());
    });
    return { url, requests, close };
}

function loadRouterContracts({ providers = {} } = {}) {
    // Evaluate the real private helpers without entering the CLI or needing a production export seam.
    // `providers` replaces provider modules by name (desktop, discord, ...) so dispatch runs without I/O.
    let source = fs.readFileSync(NOTIFY_SCRIPT, 'utf8');
    source = source.replace(/^#![^\r\n]*(?:\r?\n|$)/, '');

    const mainEntrypoint = /\r?\nmain\(\);\s*$/;
    assertTrue(mainEntrypoint.test(source), 'Router must retain the expected CLI entrypoint for isolated contract tests');

    const isolatedSource = source.replace(mainEntrypoint,
        '\nmodule.exports = { normalizeEvent, getSkipReason, getEventType, dispatchToProviders };\n');
    const isolatedModule = { exports: {} };
    const fakeProviderFor = file => /[\\/]providers[\\/]/.test(file) ? providers[path.basename(file, '.cjs')] : undefined;

    vm.runInNewContext(isolatedSource, {
        module: isolatedModule,
        __dirname: path.dirname(NOTIFY_SCRIPT),
        console: { error: () => {}, log: () => {} },
        require: dependency => {
            if (dependency === 'fs') return { existsSync: file => Boolean(fakeProviderFor(file)) };
            if (dependency === 'path') return path;
            if (dependency === './lib/env-loader.cjs') return { loadEnv: () => ({}) };
            const fakeProvider = fakeProviderFor(dependency);
            if (fakeProvider) return fakeProvider;
            throw new Error(`Unexpected router dependency in contract test: ${dependency}`);
        }
    }, { filename: NOTIFY_SCRIPT });

    const contracts = isolatedModule.exports;
    // Eligibility is exactly the router's own skip rule: an event alerts only when no skip reason applies.
    return { ...contracts, isEligible: input => contracts.getSkipReason(input) === null };
}

// Load a remote provider with its HTTP sender replaced, capturing each outgoing payload (no network).
function loadRemoteProvider(file, { eventCopy } = {}) {
    const sent = [];
    const context = { module: { exports: {} }, __dirname: path.dirname(file) };
    context.require = dependency => {
        if (dependency === 'path') return path;
        if (dependency === '../lib/event-copy.cjs') return eventCopy ? { EVENT_COPY: eventCopy } : require(EVENT_COPY_LIB);
        if (dependency === '../lib/sender.cjs') {
            return { send: async (provider, url, body, options) => { sent.push({ provider, url, body, options }); return { success: true }; } };
        }
        throw new Error(`Unmocked provider dependency: ${dependency}`);
    };
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
    return { provider: context.module.exports, sent };
}

// Session-ended, question and turn-complete alerts must read the same on every remote channel and name the project.
const REMOTE_ENV = {
    DISCORD_WEBHOOK_URL: 'https://example.invalid/discord',
    SLACK_WEBHOOK_URL: 'https://example.invalid/slack',
    TELEGRAM_BOT_TOKEN: 'token',
    TELEGRAM_CHAT_ID: 'chat'
};
// A distinctive marker at both ends of each private reply, so a head or tail preview of the
// reply leaks it as surely as the whole reply would.
const REPLY_MARKER = 'ABC123';
const PRIVATE_REPLY = `${REPLY_MARKER} private assistant reply that must stay local ${REPLY_MARKER}?`;
const PRIVATE_TURN_REPLY = `${REPLY_MARKER} private turn reply that must stay local ${REPLY_MARKER}.`;
const REMOTE_CASES = [
    {
        input: { hook_event_name: 'SessionEnd' },
        title: 'AI Agent Session Ended',
        summary: 'Main agent session ended'
    },
    {
        input: { hook_event_name: 'AskUserQuestion', notification_source: 'codex-stop-question', last_assistant_message: PRIVATE_REPLY },
        title: 'AI Agent Has a Question',
        summary: 'AI agent is asking a question — please check and answer'
    },
    {
        // The second supported assistant carries its reply on every ordinary completed turn
        input: { hook_event_name: 'Stop', turn_id: 'turn-complete-1', last_assistant_message: PRIVATE_TURN_REPLY },
        title: 'AI Agent Turn Complete',
        summary: 'AI agent finished its turn; the conversation is still open'
    }
];
const REMOTE_BASE_INPUT = { cwd: '/work/alpha-project', session_id: 'session-1234567890' };

async function sendRemoteCase(file, testCase) {
    const { provider, sent } = loadRemoteProvider(file);
    const result = await provider.send({ ...REMOTE_BASE_INPUT, ...testCase.input }, REMOTE_ENV);
    assertTrue(result.success, `${provider.name} send should succeed through the captured sender`);
    assertEqual(sent.length, 1, `${provider.name} should post exactly one message`);
    const rendered = JSON.stringify(sent[0].body);
    for (const reply of [PRIVATE_REPLY, PRIVATE_TURN_REPLY, REPLY_MARKER]) {
        assertFalse(rendered.includes(reply), `${provider.name} must never forward the assistant reply text`);
    }
    // The alert kind reaches the sender, so a session-ended request is held to its hook budget
    assertEqual(sent[0].options && sent[0].options.event, testCase.input.hook_event_name,
        `${provider.name} must tell the sender which alert kind it is sending`);
    return sent[0].body;
}

const routerExecutionTests = [
    {
        name: '[notification] router exits with code 0 on empty input',
        fn: async () => {
            const result = await runRouter(undefined);
            assertEqual(result.code, 0, 'Should exit cleanly on empty input');
        }
    },
    {
        name: '[notification] router exits with code 0 on valid JSON without providers',
        fn: async () => {
            const input = { hook_event_name: 'Stop', cwd: '/test', session_id: 'test123' };
            const result = await runRouter(input);
            assertEqual(result.code, 0, 'Should exit cleanly on valid JSON');
        }
    },
    {
        name: '[TC-NT-013] ordinary Codex Stop remains on the completion route',
        fn: async () => {
            // Given an ordinary Codex turn-completion payload with no final question mark
            const input = {
                hook_event_name: 'Stop',
                turn_id: 'turn-complete-1',
                last_assistant_message: 'The change is complete.',
                cwd: '/test/project',
                session_id: 'abc123def456'
            };
            // When the notification router processes the completion
            const result = await runRouter(input);
            // Then it remains an allowed ordinary Stop event
            assertEqual(result.code, 0, 'Should handle Stop event');
            assertFalse(result.stderr.includes('Skipped'), 'Ordinary completion must remain on the existing Stop route');
            // And it keeps its turn-complete identity: a question would also be delivered, so
            // delivery alone cannot prove the completion was not misclassified
            const { normalizeEvent, getSkipReason } = loadRouterContracts();
            const normalized = normalizeEvent({ ...input });
            assertEqual(normalized.hook_event_name, 'Stop', 'Ordinary completion must not become a question alert');
            assertFalse(Object.prototype.hasOwnProperty.call(normalized, 'notification_source'),
                'Ordinary completion must carry no question-fallback provenance');
            assertEqual(getSkipReason(normalized), null, 'Ordinary completion must stay eligible for its alert');
        }
    },
    {
        name: '[TC-NT-013] turn-complete alert copy never implies a session end or a question on any channel',
        fn: async () => {
            // Given the shared turn-complete copy
            const { EVENT_COPY } = require(EVENT_COPY_LIB);
            const copy = EVENT_COPY.Stop;
            // Then it says a turn finished and never that the session completed or ended, nor asks anything
            for (const text of [copy.title, copy.summary]) {
                assertFalse(/session\s+(complete|ended)|completed successfully/i.test(text),
                    `Turn-complete copy must not imply the session ended: ${text}`);
                assertFalse(/\?|question/i.test(text), `Turn-complete copy must not read as a question: ${text}`);
            }
            assertTrue(copy.title !== EVENT_COPY.SessionEnd.title && copy.summary !== EVENT_COPY.SessionEnd.summary,
                'Turn-complete and session-ended alerts must read differently');
            // When each remote channel formats an ordinary completed turn
            for (const file of [DISCORD_PROVIDER, SLACK_PROVIDER, TELEGRAM_PROVIDER]) {
                const body = await sendRemoteCase(file, { input: { hook_event_name: 'Stop' } });
                const rendered = JSON.stringify(body);
                // Then it carries the shared turn-complete copy and none of the old session-complete wording
                assertContains(rendered, copy.title, `${path.basename(file)} must use the shared turn-complete title`);
                assertContains(rendered, copy.summary, `${path.basename(file)} must use the shared turn-complete summary`);
                for (const stale of ['Session Complete', 'completed successfully', 'Task Completed', EVENT_COPY.SessionEnd.title]) {
                    assertFalse(rendered.includes(stale), `${path.basename(file)} turn-complete alert must not say "${stale}"`);
                }
            }
        }
    },
    {
        name: '[TC-NT-004] conversation reset raises no session-ended alert',
        fn: async () => {
            // Given a main-session end caused by the developer resetting the conversation
            const input = { hook_event_name: 'SessionEnd', reason: 'clear', cwd: '/test/project', session_id: 'reset-session-1' };
            // When the router processes the end event
            const result = await runRouter(input);
            // Then it stops before any provider is called
            assertEqual(result.code, 0, 'A reset SessionEnd should exit cleanly');
            assertContains(result.stderr, 'Skipped: SessionEnd after conversation reset (clear)',
                'A conversation reset must be skipped before provider delivery');
        }
    },
    {
        name: '[TC-NT-001] main SessionEnd reaches notification routing',
        fn: async () => {
            // Given a Claude main-session end payload without a delegated-agent identity
            const input = { hook_event_name: 'SessionEnd', cwd: '/test/project', session_id: 'main-session-1' };
            // When the router processes the end event
            const result = await runRouter(input);
            // Then it remains eligible for provider delivery
            assertEqual(result.code, 0, 'Main SessionEnd should exit cleanly');
            assertFalse(result.stderr.includes('Skipped'), 'Main SessionEnd must reach the notification providers');
        }
    },
    {
        name: '[TC-NT-003] SessionEnd carrying agent_id is suppressed',
        fn: async () => {
            // Given Claude's subagent SessionEnd payload carries agent_id
            const input = { hook_event_name: 'SessionEnd', agent_id: 'agent-1', cwd: '/test/project' };
            // When the router processes the delegated-session end
            const result = await runRouter(input);
            // Then it does not produce a main-session alert
            assertEqual(result.code, 0, 'Suppressed SessionEnd should exit cleanly');
            assertContains(result.stderr, 'subagent SessionEnd', 'Delegated SessionEnd should be explicitly skipped');
        }
    },
    {
        name: '[TC-NT-014] Stop while background agents still run is skipped by the router',
        fn: async () => {
            // Given Claude's main-session Stop fired while two delegated agents are still running
            const input = {
                hook_event_name: 'Stop',
                cwd: '/test/project',
                session_id: 'bg-wait-' + Date.now(),
                last_assistant_message: 'Waiting for the review agents.',
                background_tasks: [
                    { id: 'a1', type: 'subagent', status: 'running', agent_type: 'code-reviewer' },
                    { id: 'a2', type: 'subagent', status: 'running', agent_type: 'tester' }
                ],
                session_crons: []
            };
            // When the router processes the turn end
            const result = await runRouter(input);
            // Then it skips the turn-complete alert and names why
            assertEqual(result.code, 0, 'Suppressed Stop should exit cleanly');
            assertContains(result.stderr, 'Skipped: Stop while 2 delegated task(s) still run',
                'A turn that still waits on background work must not alert');
        }
    },
    {
        name: '[notification] router skips SubagentStop event (not in whitelist)',
        fn: async () => {
            // WHITELIST: Only Stop and idle_prompt are allowed - SubagentStop is blocked
            const input = { hook_event_name: 'SubagentStop', cwd: '/test', session_id: 'test', agent_type: 'researcher' };
            const result = await runRouter(input);
            assertEqual(result.code, 0, 'Should exit cleanly');
            assertContains(result.stderr, 'Skipped', 'Should log that notification was skipped');
            assertContains(result.stderr, 'not in whitelist', 'Should mention not in whitelist');
        }
    },
    {
        name: '[notification] router allows AskUserPrompt event (in whitelist)',
        fn: async () => {
            // WHITELIST: Stop, idle_prompt, AskUserPrompt, permission_prompt are allowed
            const input = { hook_event_name: 'AskUserPrompt', cwd: '/test', session_id: 'ask-test-' + Date.now() };
            const result = await runRouter(input);
            assertEqual(result.code, 0, 'Should exit cleanly');
            assertFalse(result.stderr.includes('Skipped') && result.stderr.includes('not in whitelist'), 'AskUserPrompt should pass whitelist');
        }
    },
    {
        name: '[TC-NT-011] router preserves the direct PreToolUse AskUserQuestion path',
        fn: async () => {
            // Given Claude's direct question tool event
            // PreToolUse for the AskUserQuestion tool must be rewritten to a first-class
            // AskUserQuestion event and pass the whitelist (replaces retired notify-waiting.js).
            const input = { hook_event_name: 'PreToolUse', tool_name: 'AskUserQuestion', cwd: '/test', session_id: 'askq-test-' + Date.now() };
            // When the router normalizes and processes it
            const result = await runRouter(input);
            // Then it is not mistaken for an unsupported event
            assertEqual(result.code, 0, 'Should exit cleanly');
            assertFalse(result.stderr.includes('not in whitelist'), 'AskUserQuestion should pass whitelist');
        }
    },
    {
        name: '[notification] router skips unknown event (not in whitelist)',
        fn: async () => {
            // Given an event that is outside the supported notification set
            const input = { hook_event_name: 'UnknownEvent', cwd: '/test', session_id: 'test' };
            // When the router processes it
            const result = await runRouter(input);
            // Then it skips delivery without blocking the host
            assertEqual(result.code, 0, 'Should exit cleanly');
            assertContains(result.stderr, 'Skipped', 'Should log that notification was skipped');
            assertContains(result.stderr, 'not in whitelist', 'Should mention not in whitelist');
        }
    },
    {
        name: '[notification] router allows permission_prompt notifications',
        fn: async () => {
            const input = {
                hook_event_name: 'Notification',
                notification_type: 'permission_prompt',
                cwd: '/test',
                session_id: 'perm-test-' + Date.now(),
                message: 'Claude needs permission to use Bash'
            };
            const result = await runRouter(input);
            assertEqual(result.code, 0, 'Should exit cleanly');
            // permission_prompt should NOT be skipped - should pass whitelist
            assertFalse(result.stderr.includes('not in whitelist'), 'permission_prompt should pass whitelist');
        }
    },
    {
        name: '[notification] router allows idle_prompt notifications',
        fn: async () => {
            const input = {
                hook_event_name: 'Notification',
                notification_type: 'idle_prompt',
                cwd: '/test',
                session_id: 'idle-test-' + Date.now(), // Unique session to avoid throttle
                message: 'AI agent is waiting for input'
            };
            const result = await runRouter(input);
            assertEqual(result.code, 0, 'Should exit cleanly');
            // idle_prompt should NOT be skipped - notifications should be sent (but throttled after first)
            // Check that it didn't get blocked by subagent or command approval filters
            assertFalse(result.stderr.includes('subagent context'), 'idle_prompt should not be blocked as subagent');
            assertFalse(result.stderr.includes('command approval'), 'idle_prompt should not be blocked as command approval');
        }
    }
];

const routerContractTests = [
    {
        name: '[TC-NT-071] SessionEnd eligibility is restricted to the main conversation',
        fn: () => {
            // Given the router's event classifier
            const { isEligible } = loadRouterContracts();
            // When a main SessionEnd has no agent_id
            const mainSessionEnd = { hook_event_name: 'SessionEnd', session_id: 'main-session' };
            // Then it remains eligible, while any payload carrying agent_id is suppressed
            assertTrue(isEligible(mainSessionEnd), 'Main SessionEnd should be eligible for its alert');
            for (const agentId of ['agent-1', '', null]) {
                assertFalse(isEligible({ hook_event_name: 'SessionEnd', agent_id: agentId }),
                    'The presence of agent_id must suppress a delegated SessionEnd');
            }
            // And an end whose conversation kind the host could not establish never alerts as a main end
            assertFalse(isEligible({ hook_event_name: 'SessionEnd', conversation_kind: 'unknown' }),
                'An unproven main-session end must not raise a session-ended alert');
        }
    },
    {
        name: '[TC-NT-004] only a conversation reset suppresses a main SessionEnd',
        fn: () => {
            // Given the router's event classifier
            const { isEligible } = loadRouterContracts();
            // When the main session ends because the developer reset the conversation
            // Then no session-ended alert is eligible
            assertFalse(isEligible({ hook_event_name: 'SessionEnd', reason: 'clear' }),
                'A user-initiated conversation reset must not raise a session-ended alert');
            // When it ends for any other reason, or the host does not report one
            for (const reason of ['exit', 'logout', 'prompt_input_exit', 'other', '', undefined]) {
                const input = { hook_event_name: 'SessionEnd' };
                if (reason !== undefined) input.reason = reason;
                // Then the session-ended alert stays eligible
                assertTrue(isEligible(input), `SessionEnd with reason ${JSON.stringify(reason)} must still alert`);
            }
        }
    },
    {
        name: '[TC-NT-014] a turn-complete alert waits until the main session has no delegated work left',
        fn: () => {
            // Given the router's event classifier and Claude's Stop payload shape
            const { isEligible, normalizeEvent } = loadRouterContracts();
            const agentTask = { id: 'a1', type: 'subagent', status: 'running', agent_type: 'researcher' };
            const serverTask = { id: 'b1', type: 'shell', status: 'running', command: 'npm run dev' };
            // When the main turn ends while delegated agents, a workflow or an MCP task still run
            // Then no turn-complete alert is eligible: each of them wakes the session again
            for (const tasks of [
                [agentTask],
                [agentTask, serverTask],
                [{ id: 'c1', type: 'workflow', status: 'running' }],
                [{ id: 'd1', type: 'MCP task', status: 'Running' }]
            ]) {
                assertFalse(isEligible({ hook_event_name: 'Stop', background_tasks: tasks }),
                    `Stop with delegated work in flight ${JSON.stringify(tasks)} must not alert`);
            }
            // And a one-shot wakeup that will resume the session holds the alert back too
            assertFalse(isEligible({ hook_event_name: 'Stop', background_tasks: [],
                session_crons: [{ id: 'w1', schedule: '5 14 24 9 *', recurring: false }] }),
            'Stop with a pending one-shot wakeup must not alert');
            // And a delegated conversation going idle is never the main session finishing
            assertFalse(isEligible({ hook_event_name: 'Stop', agent_id: 'child-1' }),
                'A delegated conversation Stop must not raise a turn-complete alert');
            // When the turn ends with no delegated work left — the last agent already settled (in any
            // casing), only a server, log tail or monitor that may never end still runs, only a
            // recurring or unreadable schedule remains, or the host sends no task list at all
            for (const input of [
                { hook_event_name: 'Stop', background_tasks: [], session_crons: [] },
                { hook_event_name: 'Stop', background_tasks: [{ id: 'a1', type: 'subagent', status: 'Completed' }] },
                { hook_event_name: 'Stop', background_tasks: [serverTask, { id: 'm1', type: 'monitor', status: 'running' }] },
                { hook_event_name: 'Stop', background_tasks: [null, 'x'], session_crons: [null, { id: 'q1' }] },
                { hook_event_name: 'Stop', background_tasks: [], session_crons: [{ id: 'r1', schedule: '0 9 * * 1-5', recurring: true }] },
                { hook_event_name: 'Stop', turn_id: 'codex-turn', last_assistant_message: 'Done.' },
                { hook_event_name: 'Stop' }
            ]) {
                // Then the main session's finished job stays eligible for its alert
                assertTrue(isEligible(input), `Stop with no delegated work left must alert: ${JSON.stringify(input)}`);
            }
            // And a question is never held back by background work: the developer is needed now
            assertTrue(isEligible(normalizeEvent({ hook_event_name: 'PreToolUse', tool_name: 'AskUserQuestion', background_tasks: [agentTask] })),
                'A direct question must alert even while background work runs');
        }
    },
    {
        name: '[TC-NT-073] remote providers are dispatched without waiting for the desktop alert',
        fn: async () => {
            // Given a desktop alert that is still running and one configured remote channel
            let releaseDesktop;
            const desktopPending = new Promise(resolve => { releaseDesktop = resolve; });
            const remoteEvents = [];
            const providers = {
                desktop: { name: 'desktop', isEnabled: () => true, send: () => desktopPending },
                discord: {
                    name: 'discord',
                    isEnabled: env => Boolean(env.DISCORD_WEBHOOK_URL),
                    send: async input => { remoteEvents.push(input.hook_event_name); return { success: true }; }
                }
            };
            const { dispatchToProviders } = loadRouterContracts({ providers });
            // When the router dispatches a session-ended alert
            const dispatch = dispatchToProviders({ hook_event_name: 'SessionEnd' },
                { DISCORD_WEBHOOK_URL: 'https://example.invalid/discord' });
            await new Promise(resolve => setImmediate(resolve));
            // Then the remote channel is sent while the desktop alert is still pending,
            // so a slow desktop alert cannot use up the SessionEnd hook budget first
            assertEqual(remoteEvents.join(','), 'SessionEnd', 'Remote delivery must not wait for the desktop alert');
            releaseDesktop({ success: true });
            const results = await dispatch;
            assertEqual(results.map(result => result.provider).join(','), 'desktop,discord', 'Every enabled provider reports a result');
            assertTrue(results.every(result => result.success), 'Both deliveries should succeed');
        }
    },
    {
        name: '[TC-NT-073] remote channels still receive every alert kind when the desktop channel is off or failing',
        fn: async () => {
            const env = { DISCORD_WEBHOOK_URL: 'https://example.invalid/discord' };
            const desktopStates = {
                off: { name: 'desktop', isEnabled: () => false, send: async () => { throw new Error('a disabled desktop must never be called'); } },
                rejecting: { name: 'desktop', isEnabled: () => true, send: async () => { throw new Error('notifier crashed'); } },
                failing: { name: 'desktop', isEnabled: () => true, send: async () => ({ success: false, error: 'notifier missing' }) }
            };
            for (const [state, desktop] of Object.entries(desktopStates)) {
                for (const eventName of ['SessionEnd', 'AskUserQuestion', 'Stop']) {
                    // Given one configured remote channel and a desktop channel that is off, rejects, or fails
                    const remoteEvents = [];
                    const discord = {
                        name: 'discord',
                        isEnabled: config => Boolean(config.DISCORD_WEBHOOK_URL),
                        send: async input => { remoteEvents.push(input.hook_event_name); return { success: true }; }
                    };
                    const { dispatchToProviders } = loadRouterContracts({ providers: { desktop, discord } });
                    // When the router dispatches one alert of that kind
                    const results = await dispatchToProviders({ hook_event_name: eventName }, env);
                    // Then the remote channel receives exactly one alert of that kind
                    assertEqual(remoteEvents.join(','), eventName, `desktop ${state}: the remote channel must receive exactly one ${eventName} alert`);
                    const remote = results.find(result => result.provider === 'discord');
                    assertTrue(Boolean(remote && remote.success), `desktop ${state}: the remote delivery must succeed`);
                    // And the desktop reports its own outcome without hiding the remote one
                    const desktopResult = results.find(result => result.provider === 'desktop');
                    if (state === 'off') assertEqual(desktopResult, undefined, 'A desktop channel that is off must not be dispatched');
                    else assertFalse(desktopResult.success, `desktop ${state}: its failure must be reported as its own result`);
                }
            }
        }
    },
    {
        name: '[TC-NT-073] one failing remote channel does not stop another remote channel',
        fn: async () => {
            const env = { DISCORD_WEBHOOK_URL: 'https://example.invalid/discord', SLACK_WEBHOOK_URL: 'https://example.invalid/slack' };
            const failures = {
                rejecting: async () => { throw new Error('endpoint crashed'); },
                failing: async () => ({ success: false, error: 'HTTP 500: failed' })
            };
            for (const [mode, failingSend] of Object.entries(failures)) {
                // Given two configured remote channels, desktop off, and the first remote channel failing
                const slackEvents = [];
                const providers = {
                    desktop: { name: 'desktop', isEnabled: () => false, send: async () => ({ success: true }) },
                    discord: { name: 'discord', isEnabled: config => Boolean(config.DISCORD_WEBHOOK_URL), send: failingSend },
                    slack: {
                        name: 'slack',
                        isEnabled: config => Boolean(config.SLACK_WEBHOOK_URL),
                        send: async input => { slackEvents.push(input.hook_event_name); return { success: true }; }
                    }
                };
                const { dispatchToProviders } = loadRouterContracts({ providers });
                // When the router dispatches a question alert
                const results = await dispatchToProviders({ hook_event_name: 'AskUserQuestion' }, env);
                // Then the other remote channel still receives exactly one alert
                assertEqual(slackEvents.join(','), 'AskUserQuestion', `discord ${mode}: slack must still receive exactly one alert`);
                assertEqual(results.map(result => `${result.provider}:${result.success}`).join(','), 'discord:false,slack:true',
                    `discord ${mode}: each remote channel reports its own outcome`);
            }
        }
    },
    {
        name: '[TC-NT-011] deferred question precursor is suppressed while direct question remains eligible',
        fn: () => {
            // Given the same question event with and without the OpenCode precursor marker
            const { isEligible } = loadRouterContracts();
            const directQuestion = { hook_event_name: 'AskUserQuestion' };
            const deferredPrecursor = { ...directQuestion, notification_deferred: true };
            // When the notification router checks each event
            const deferredEligible = isEligible(deferredPrecursor);
            const directEligible = isEligible(directQuestion);
            // Then it suppresses the earlier precursor but preserves the actual question
            assertFalse(deferredEligible, 'A deferred question precursor must not emit a duplicate alert.');
            assertTrue(directEligible, 'The authoritative direct question must remain eligible for its alert.');
        }
    },
    {
        name: '[TC-NT-072] Codex Stop becomes a question only for a string question ending in ?',
        fn: () => {
            // Given the router normalizer and a complete Codex Stop payload
            const { normalizeEvent, isEligible } = loadRouterContracts();
            const question = {
                hook_event_name: 'Stop',
                turn_id: 'turn-question-1',
                last_assistant_message: 'Should I continue?  \n'
            };
            // When the final non-whitespace character is a question mark
            const normalizedQuestion = normalizeEvent(question);
            // Then it uses the question route and keeps an explicit provenance marker
            assertEqual(normalizedQuestion.hook_event_name, 'AskUserQuestion', 'Final question mark should promote Stop to question');
            assertEqual(normalizedQuestion.notification_source, 'codex-stop-question', 'Fallback question should remain identifiable');
            assertTrue(isEligible(normalizedQuestion), 'Promoted question should be eligible for notification');

            // Given an ordinary completion and malformed or non-qualifying Stop payloads
            const staysStop = [
                { hook_event_name: 'Stop', turn_id: 'turn-complete', last_assistant_message: 'Finished.' },
                { hook_event_name: 'Stop', last_assistant_message: 'Would you continue?' },
                { hook_event_name: 'Stop', turn_id: 7, last_assistant_message: 'Would you continue?' },
                { hook_event_name: 'Stop', turn_id: 'turn-non-string-message', last_assistant_message: 7 },
                { hook_event_name: 'Stop', turn_id: 'turn-final-period', last_assistant_message: 'Do you agree? Here is the answer.' }
            ];
            // When each candidate is normalized
            for (const candidate of staysStop) {
                // Then ordinary completion remains Stop and is still eligible for its existing alert
                const normalized = normalizeEvent(candidate);
                assertEqual(normalized.hook_event_name, 'Stop', 'Non-qualifying completion must keep its Stop identity');
                assertTrue(isEligible(normalized), 'Ordinary Stop completion must remain eligible');
            }

            // Given Claude's existing direct AskUserQuestion tool signal
            const directQuestion = normalizeEvent({ hook_event_name: 'PreToolUse', tool_name: 'AskUserQuestion' });
            // Then it retains the established question route without Codex fallback provenance
            assertEqual(directQuestion.hook_event_name, 'AskUserQuestion', 'Claude direct question route must remain supported');
            assertFalse(Object.prototype.hasOwnProperty.call(directQuestion, 'notification_source'),
                'Only the Codex Stop heuristic should carry fallback provenance');
        }
    }
];

// ============================================================================
// Sender & Lib Tests
// ============================================================================

const isolationTests = [
    {
        name: '[TC-NT-073] with the desktop channel off a configured remote channel gets exactly one alert, and isolated router runs reach none',
        fn: async () => {
            // Given a local webhook endpoint configured the two ways a developer machine can leak one:
            // an inherited process env key and a user-level env file under the home directory
            const server = await startCountingServer();
            const isolatedDir = createTempDir('notify-guard-');
            const savedDiscord = process.env.DISCORD_WEBHOOK_URL;
            try {
                fs.mkdirSync(path.join(isolatedDir, '.claude'), { recursive: true });
                fs.writeFileSync(path.join(isolatedDir, '.claude', '.env'), `SLACK_WEBHOOK_URL=${server.url}/slack\n`);
                process.env.DISCORD_WEBHOOK_URL = `${server.url}/discord`;
                const input = { hook_event_name: 'SessionEnd', cwd: isolatedDir, session_id: 'guard-session' };
                const isolatedEnv = isolatedRouterEnv(isolatedDir);

                // When the isolation env is built, then every provider key the child could inherit is blank
                for (const key of [...Object.keys(process.env), ...PROVIDER_ENV_KEYS].filter(k => PROVIDER_ENV_PREFIX.test(k))) {
                    assertEqual(isolatedEnv[key], '', `${key} must be blanked for spawned router runs`);
                }
                assertEqual(isolatedEnv.HOME, isolatedDir, 'HOME must point at the throwaway directory');
                assertEqual(isolatedEnv.USERPROFILE, isolatedDir, 'USERPROFILE must point at the throwaway directory');

                // When the real router handles an eligible alert under that env
                const isolated = await runHook(NOTIFY_SCRIPT, input, { timeout: 5000, cwd: isolatedDir, env: isolatedEnv });
                // Then no channel request is made
                assertEqual(isolated.code, 0, 'Isolated router run should exit cleanly');
                assertEqual(server.requests.length, 0, 'An isolated router run must never reach a configured channel');

                // Given the desktop channel stays off (isolated env) and one remote channel is configured
                assertEqual(isolatedEnv.ENABLE_DESKTOP_NOTIFICATIONS, 'false', 'The desktop channel must be off for this case');
                const leakyEnv = { ...isolatedEnv, DISCORD_WEBHOOK_URL: `${server.url}/discord` };
                // When the real router handles the session-ended alert
                const leaky = await runHook(NOTIFY_SCRIPT, input, { timeout: 5000, cwd: isolatedDir, env: leakyEnv });
                // Then the remote channel receives exactly one alert despite the desktop being off; this
                // is also the tripwire proving the zero above is isolation, not a router that never sends
                assertEqual(leaky.code, 0, 'Leaky router run should still exit cleanly');
                assertEqual(server.requests.join(','), '/discord',
                    'With the desktop off, the configured remote channel must receive exactly one alert');
            } finally {
                if (savedDiscord === undefined) delete process.env.DISCORD_WEBHOOK_URL;
                else process.env.DISCORD_WEBHOOK_URL = savedDiscord;
                await server.close();
                cleanupTempDir(isolatedDir);
            }
        }
    }
];

// Run a sequence of sender.send calls in one child whose temp directory (and so throttle file)
// is the isolated one. `uptimeSeconds` replaces the child's process-start clock before loading.
function runSenderInChild(steps, isolatedDir, { uptimeSeconds } = {}) {
    const script = [
        uptimeSeconds === undefined ? '' : `process.uptime = () => ${Number(uptimeSeconds)};`,
        `const sender = require(${JSON.stringify(SENDER_LIB)});`,
        `const steps = ${JSON.stringify(steps)};`,
        '(async () => {',
        '  const outcomes = [];',
        '  for (const step of steps) {',
        '    const started = Date.now();',
        "    const result = await sender.send(step.provider, step.url, { text: 'probe' }, { event: step.event });",
        '    outcomes.push({ result, elapsed: Date.now() - started, throttled: sender.isThrottled(step.provider) });',
        '  }',
        '  process.stdout.write(JSON.stringify({ outcomes, timeoutMs: sender.REQUEST_TIMEOUT_MS }));',
        '})();'
    ].join('\n');
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, ['-e', script], {
            env: { ...process.env, TMPDIR: isolatedDir, TEMP: isolatedDir, TMP: isolatedDir },
            stdio: ['ignore', 'pipe', 'pipe']
        });
        let stdout = '';
        let stderr = '';
        const killTimer = setTimeout(() => child.kill('SIGKILL'), 15000);
        child.stdout.on('data', chunk => { stdout += chunk; });
        child.stderr.on('data', chunk => { stderr += chunk; });
        child.on('error', reject);
        child.on('close', () => {
            clearTimeout(killTimer);
            try { resolve({ ...JSON.parse(stdout), stderr }); } catch (err) { reject(new Error(`sender child produced no result: ${stderr}`)); }
        });
    });
}

// Cooldown entries written to the isolated throttle file ({} when none was ever written).
function readIsolatedCooldowns(isolatedDir) {
    const file = path.join(isolatedDir, 'ck-noti-throttle.json');
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
}

// A local port with nothing listening on it, so a request to it is refused.
async function refusedUrl() {
    const server = http.createServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    await new Promise(resolve => server.close(resolve));
    return `http://127.0.0.1:${port}`;
}

const libTests = [
    {
        name: '[TC-NT-075] a slow channel is abandoned for that alert without pausing the next alert',
        fn: async () => {
            // Given a channel endpoint that hangs on its first request and answers the next
            const server = await startCountingServer({ respond: url => (url === '/hang' ? false : 200) });
            const isolatedDir = createTempDir('notify-sender-');
            try {
                // When one alert is sent to the hanging endpoint and the next alert follows on the same channel
                const { outcomes, timeoutMs } = await runSenderInChild([
                    { provider: 'slow-probe', url: `${server.url}/hang`, event: 'AskUserQuestion' },
                    { provider: 'slow-probe', url: `${server.url}/ok`, event: 'AskUserQuestion' }
                ], isolatedDir);
                const [slow, next] = outcomes;
                // Then the slow request is abandoned at the request limit and reported as a timeout
                assertFalse(slow.result.success, 'A timed-out delivery must report failure');
                assertTrue(slow.result.timedOut, 'A timed-out delivery must be reported as a timeout');
                assertEqual(slow.result.error, `request timed out after ${timeoutMs}ms`, 'Timeout must be reported with its limit');
                assertTrue(timeoutMs <= 2000, 'The request limit must stay inside the 3-second session-end budget');
                assertTrue(slow.elapsed >= timeoutMs - 100 && slow.elapsed < timeoutMs + 1500,
                    `Send must end at the timeout, took ${slow.elapsed}ms`);
                // And no cooldown starts, so the next alert is attempted and delivered
                assertFalse(slow.throttled, 'A timeout must not pause the channel');
                assertEqual(readIsolatedCooldowns(isolatedDir)['slow-probe'], undefined, 'A timeout must record no cooldown');
                assertTrue(next.result.success, 'The next alert on the same channel must be attempted and delivered');
                assertEqual(server.requests.join(','), '/hang,/ok', 'Both alerts must reach the channel endpoint');
            } finally {
                await server.close();
                cleanupTempDir(isolatedDir);
            }
        }
    },
    {
        name: '[TC-NT-075] a failing channel pauses for a bounded period after a real error',
        fn: async () => {
            // Given one channel endpoint that answers with an error status and one address that refuses connections
            const server = await startCountingServer({ respond: () => 500 });
            const refused = await refusedUrl();
            const isolatedDir = createTempDir('notify-sender-');
            try {
                // When an alert fails on each, and a further alert follows on the erroring channel
                const { outcomes } = await runSenderInChild([
                    { provider: 'status-probe', url: `${server.url}/fail`, event: 'Stop' },
                    { provider: 'status-probe', url: `${server.url}/fail`, event: 'Stop' },
                    { provider: 'refused-probe', url: `${refused}/refused`, event: 'Stop' }
                ], isolatedDir);
                const [statusError, afterError, refusedError] = outcomes;
                // Then the error status is a failure that pauses the channel
                assertFalse(statusError.result.success, 'An error status must report failure');
                assertContains(statusError.result.error, 'HTTP 500', 'The error status must be reported');
                assertTrue(statusError.throttled, 'An error status must pause the channel');
                // And the paused channel sends nothing further within the cooldown
                assertTrue(afterError.result.throttled, 'The next alert on a paused channel must be held back');
                assertEqual(server.requests.length, 1, 'A paused channel must not be contacted again within the cooldown');
                // And a refused connection pauses its channel the same way
                assertFalse(refusedError.result.success, 'A refused connection must report failure');
                assertFalse(Boolean(refusedError.result.timedOut), 'A refused connection is an error, not a timeout');
                assertTrue(refusedError.throttled, 'A refused connection must pause the channel');
                // And both pauses are recorded with the time they started, bounding the cooldown
                const cooldowns = readIsolatedCooldowns(isolatedDir);
                for (const provider of ['status-probe', 'refused-probe']) {
                    assertTrue(Number.isFinite(cooldowns[provider]), `${provider} cooldown must be recorded in the isolated throttle file`);
                }
            } finally {
                await server.close();
                cleanupTempDir(isolatedDir);
            }
        }
    },
    {
        name: '[TC-NT-075] a session-ended request gets only the rest of the session-end hook budget',
        fn: () => {
            // Given the sender's session-end budget, which must match the host hook limit it models
            const sender = require(SENDER_LIB);
            const settings = JSON.parse(fs.readFileSync(path.join(HOOKS_DIR, '..', 'settings.json'), 'utf8'));
            const hook = (settings.hooks?.SessionEnd || []).flatMap(group => group.hooks || [])
                .find(entry => String(entry.command || '').includes('notifications/notify.cjs'));
            assertTrue(Boolean(hook) && Number.isFinite(hook.timeout), 'The session-end notification hook must declare its limit');
            assertEqual(sender.SESSION_END_BUDGET_MS, hook.timeout * 1000, 'The sender budget must equal the host session-end hook limit');
            // When the request limit is computed at every point of the process lifetime
            for (let uptimeMs = 0; uptimeMs <= 6000; uptimeMs += 50) {
                const limit = sender.requestTimeoutFor('SessionEnd', uptimeMs);
                // Then it is never negative, never above the request limit, and always ends inside the budget with the reserve left
                assertTrue(limit >= 0 && limit <= sender.REQUEST_TIMEOUT_MS, `limit ${limit}ms at ${uptimeMs}ms must be within 0..request limit`);
                if (limit > 0) {
                    assertTrue(uptimeMs + limit + sender.SESSION_END_RESERVE_MS <= sender.SESSION_END_BUDGET_MS,
                        `a ${limit}ms request started at ${uptimeMs}ms must end inside the session-end budget`);
                }
            }
            // And the boundaries are exact: full limit early, remaining time late, nothing once used up
            assertEqual(sender.requestTimeoutFor('SessionEnd', 0), sender.REQUEST_TIMEOUT_MS, 'An early send gets the full request limit');
            assertEqual(sender.requestTimeoutFor('SessionEnd', 1000), 1600, 'A later send gets only what is left before the reserve');
            assertEqual(sender.requestTimeoutFor('SessionEnd', 2600), 0, 'No time is left once the reserve is reached');
            // And other alert kinds keep the fixed request limit regardless of process age
            for (const event of ['Stop', 'AskUserQuestion', undefined]) {
                assertEqual(sender.requestTimeoutFor(event, 5000), sender.REQUEST_TIMEOUT_MS, `${event} keeps the fixed request limit`);
            }
        }
    },
    {
        name: '[TC-NT-075] a late session-ended request is cut short or skipped, never outlasting the hook budget',
        fn: async () => {
            // Given a channel endpoint that never answers
            const server = await startCountingServer({ respond: false });
            const nearlyUsedDir = createTempDir('notify-sender-');
            const usedUpDir = createTempDir('notify-sender-');
            try {
                // When a session-ended alert is sent 2.3 s after the process started
                const nearlyUsed = await runSenderInChild(
                    [{ provider: 'late-probe', url: `${server.url}/hang`, event: 'SessionEnd' }], nearlyUsedDir, { uptimeSeconds: 2.3 });
                const [cutShort] = nearlyUsed.outcomes;
                // Then the request is abandoned when the remaining 300 ms run out, with no cooldown
                assertEqual(cutShort.result.error, 'request timed out after 300ms', 'The request must get only the remaining budget');
                assertTrue(cutShort.elapsed < 300 + 1000, `The request must end at the remaining budget, took ${cutShort.elapsed}ms`);
                assertFalse(cutShort.throttled, 'A budget timeout must not pause the channel');
                assertEqual(server.requests.length, 1, 'The request with budget left must be attempted');
                // When a session-ended alert is sent once the budget before the reserve is used up
                const usedUp = await runSenderInChild(
                    [{ provider: 'late-probe', url: `${server.url}/hang`, event: 'SessionEnd' }], usedUpDir, { uptimeSeconds: 2.8 });
                const [skipped] = usedUp.outcomes;
                // Then no request is made, the skip is logged, and the channel is not paused
                assertTrue(skipped.result.skipped && !skipped.result.success, 'A send with no budget left must be skipped');
                assertEqual(server.requests.length, 1, 'A skipped send must not contact the channel');
                assertContains(usedUp.stderr, 'no time left in the SessionEnd hook budget', 'The skip must be logged');
                assertFalse(skipped.throttled, 'A skipped send must not pause the channel');
                assertEqual(readIsolatedCooldowns(usedUpDir)['late-probe'], undefined, 'A skipped send must record no cooldown');
            } finally {
                await server.close();
                cleanupTempDir(nearlyUsedDir);
                cleanupTempDir(usedUpDir);
            }
        }
    },
    {
        name: '[notification] sender module exports required functions',
        fn: () => {
            const sender = require(SENDER_LIB);
            assertTrue(typeof sender.send === 'function', 'sender.send must be function');
            assertTrue(typeof sender.isThrottled === 'function', 'sender.isThrottled must be function');
        }
    },
    {
        name: '[notification] isThrottled returns false for unknown provider',
        fn: () => {
            delete require.cache[require.resolve(SENDER_LIB)];
            const sender = require(SENDER_LIB);
            const result = sender.isThrottled('unknown-provider-' + Date.now());
            assertFalse(result, 'Unknown provider should not be throttled');
        }
    },
    {
        name: '[notification] env-loader exports loadEnv function',
        fn: () => {
            const envLoader = require(ENV_LOADER_LIB);
            assertTrue(typeof envLoader.loadEnv === 'function', 'loadEnv must be function');
        }
    },
    {
        name: '[notification] loadEnv returns object',
        fn: () => {
            delete require.cache[require.resolve(ENV_LOADER_LIB)];
            const envLoader = require(ENV_LOADER_LIB);
            const result = envLoader.loadEnv(process.cwd());
            assertTrue(typeof result === 'object' && result !== null, 'loadEnv must return object');
        }
    }
];

// ============================================================================
// Event Color Configuration Tests
// ============================================================================

const eventConfigTests = [
    {
        name: '[notification] discord Stop event has green color',
        fn: () => {
            const content = fs.readFileSync(DISCORD_PROVIDER, 'utf8');
            assertContains(content, '5763719', 'Stop should have green color (5763719)');
        }
    },
    {
        name: '[notification] discord SubagentStop event has blue color',
        fn: () => {
            const content = fs.readFileSync(DISCORD_PROVIDER, 'utf8');
            assertContains(content, '3447003', 'SubagentStop should have blue color (3447003)');
        }
    },
    {
        name: '[notification] discord AskUserPrompt event has yellow color',
        fn: () => {
            const content = fs.readFileSync(DISCORD_PROVIDER, 'utf8');
            assertContains(content, '15844367', 'AskUserPrompt should have yellow color (15844367)');
        }
    }
];

// ============================================================================
// Remote Channel Payload Tests (captured sender, no network)
// ============================================================================

const remotePayloadTests = [
    {
        name: '[TC-NT-073] every shared-copy alert renders its own title on every remote channel',
        fn: async () => {
            const { EVENT_COPY } = require(EVENT_COPY_LIB);
            // Given every event that has shared alert copy
            for (const [eventName, copy] of Object.entries(EVENT_COPY)) {
                for (const file of [DISCORD_PROVIDER, SLACK_PROVIDER, TELEGRAM_PROVIDER]) {
                    // When the channel formats it
                    const rendered = JSON.stringify(await sendRemoteCase(file, { input: { hook_event_name: eventName } }));
                    // Then the shared title and summary appear and nothing renders as a missing value
                    assertContains(rendered, copy.title, `${path.basename(file)} must render the ${eventName} title`);
                    assertContains(rendered, copy.summary, `${path.basename(file)} must render the ${eventName} summary`);
                    assertFalse(rendered.includes('undefined'), `${path.basename(file)} ${eventName} alert must not render "undefined"`);
                }
            }
        }
    },
    {
        name: '[notification] telegram falls back to a generic icon for shared copy it has no icon for',
        fn: async () => {
            // Given shared copy that gains an event the Telegram icon table does not list
            const { EVENT_COPY } = require(EVENT_COPY_LIB);
            const eventCopy = { ...EVENT_COPY, FutureAlert: { title: 'Future Alert Title', summary: 'Future alert summary' } };
            const { provider, sent } = loadRemoteProvider(TELEGRAM_PROVIDER, { eventCopy });
            // When Telegram formats that event
            await provider.send({ ...REMOTE_BASE_INPUT, hook_event_name: 'FutureAlert' }, REMOTE_ENV);
            const text = sent[0].body.text;
            // Then it leads with the fallback icon and the event's own copy, never a literal "undefined"
            assertTrue(text.startsWith('🔔 *Future Alert Title*'), `Telegram must use the fallback icon, got: ${text.split('\n')[0]}`);
            assertContains(text, 'Future alert summary.', 'Telegram must still render the event summary');
            assertFalse(text.includes('undefined'), 'Telegram must never render a missing icon as "undefined"');
        }
    },
    {
        name: '[TC-NT-073][TC-NT-074] discord session-ended, question and turn-complete embeds carry their own copy and the project',
        fn: async () => {
            for (const testCase of REMOTE_CASES) {
                // Given a session-ended, question or turn-complete event (each carrying no, or private, reply text) from the alpha-project workspace
                // When Discord formats it
                const embed = (await sendRemoteCase(DISCORD_PROVIDER, testCase)).embeds[0];
                // Then the embed states that event, not the generic fallback, and names the project
                assertEqual(embed.title, testCase.title, 'Discord title must name the event');
                assertEqual(embed.description, testCase.summary, 'Discord description must explain the event');
                assertContains(embed.footer.text, 'alpha-project', 'Discord footer must name the project');
            }
        }
    },
    {
        name: '[TC-NT-073][TC-NT-074] slack session-ended, question and turn-complete messages carry their own copy and the project',
        fn: async () => {
            for (const testCase of REMOTE_CASES) {
                // Given a session-ended, question or turn-complete event (each carrying no, or private, reply text) from the alpha-project workspace
                // When Slack formats it
                const body = await sendRemoteCase(SLACK_PROVIDER, testCase);
                // Then the header, summary and preview text state the event and the preview names the project
                assertEqual(body.blocks[0].text.text, testCase.title, 'Slack header must name the event');
                assertTrue(body.blocks.some(block => block.text && block.text.text === `${testCase.summary}.`),
                    'Slack message must include the event summary');
                assertEqual(body.text, `[alpha-project] ${testCase.summary}.`,
                    'Slack preview text must state the event and name the project');
            }
        }
    },
    {
        name: '[TC-NT-073][TC-NT-074] telegram session-ended, question and turn-complete messages carry their own copy and the project',
        fn: async () => {
            for (const testCase of REMOTE_CASES) {
                // Given a session-ended, question or turn-complete event (each carrying no, or private, reply text) from the alpha-project workspace
                // When Telegram formats it
                const body = await sendRemoteCase(TELEGRAM_PROVIDER, testCase);
                // Then the message states the event, not the generic fallback, and names the project
                assertContains(body.text, `*${testCase.title}*`, 'Telegram heading must name the event');
                assertContains(body.text, `${testCase.summary}.`, 'Telegram message must explain the event');
                assertContains(body.text, '*Project:* alpha-project', 'Telegram message must name the project');
                assertFalse(body.text.includes('Project Code Event'), 'Telegram must not fall back to the generic event');
                assertEqual(body.chat_id, 'chat', 'Telegram message must go to the configured chat');
            }
        }
    }
];

// ============================================================================
// Desktop Provider Behavior Tests
// ============================================================================

const desktopBehaviorTests = [
    {
        name: '[notification] desktop provider has notifyWindows function',
        fn: () => {
            const content = fs.readFileSync(DESKTOP_PROVIDER, 'utf8');
            assertContains(content, 'function notifyWindows', 'Should have notifyWindows function');
        }
    },
    {
        name: '[notification] desktop provider has notifyMacOS function',
        fn: () => {
            const content = fs.readFileSync(DESKTOP_PROVIDER, 'utf8');
            assertContains(content, 'function notifyMacOS', 'Should have notifyMacOS function');
        }
    },
    {
        name: '[notification] desktop provider has notifyLinux function',
        fn: () => {
            const content = fs.readFileSync(DESKTOP_PROVIDER, 'utf8');
            assertContains(content, 'function notifyLinux', 'Should have notifyLinux function');
        }
    },
    {
        name: '[notification] desktop provider has sendNotification function',
        fn: () => {
            const content = fs.readFileSync(DESKTOP_PROVIDER, 'utf8');
            assertContains(content, 'function sendNotification', 'Should have sendNotification function');
        }
    },
    {
        name: '[notification] desktop Stop event triggers dialog',
        fn: () => {
            const content = fs.readFileSync(DESKTOP_PROVIDER, 'utf8');
            // Check that Stop event triggers showDialog=true
            assertContains(content, "hookType === 'Stop'", 'Should check for Stop event');
            assertContains(content, 'showDialog', 'Should have showDialog flag for dialog events');
        }
    },
    {
        name: '[notification] desktop idle_prompt event triggers dialog',
        fn: () => {
            const content = fs.readFileSync(DESKTOP_PROVIDER, 'utf8');
            // Check that idle_prompt event triggers dialog (AskUserPrompt is blocked at router level)
            assertContains(content, "notificationType === 'idle_prompt'", 'Should check for idle_prompt notification type');
        }
    },
    {
        name: '[notification] desktop SubagentStop stays non-modal at the Darwin process boundary',
        fn: async () => {
            // Given the existing OS-process oracle that invokes the real provider with SubagentStop
            const oracle = require('./desktop-argv.test.cjs').tests.find(test =>
                test.name === '[TC-HARNESS-003] darwin: bounded literal argv property and benign controls');
            assertTrue(Boolean(oracle), 'Darwin desktop argv behavior oracle must exist');
            // When the oracle exercises the provider across its input corpus
            // Then SubagentStop remains a toast, checked through the mocked osascript call
            await oracle.fn();
        }
    },
    {
        name: '[notification] desktop Windows uses PowerShell script',
        fn: async () => {
            // Exercise the captured process boundary, not the old command-string spelling.
            // This oracle mocks subprocesses and verifies script path, literal flags and windowsHide.
            const windowsOracle = require('./desktop-argv.test.cjs').tests.find(test =>
                test.name === '[TC-HARNESS-003] win32: bounded literal argv property and benign controls');
            assertTrue(Boolean(windowsOracle), 'Windows executable-argv oracle must exist');
            await windowsOracle.fn();
        }
    },
    {
        name: '[notification] desktop macOS dialog uses osascript',
        fn: () => {
            const content = fs.readFileSync(DESKTOP_PROVIDER, 'utf8');
            assertContains(content, 'osascript', 'Should use osascript for macOS');
            assertContains(content, 'display dialog', 'Should use display dialog for macOS');
        }
    },
    {
        name: '[notification] desktop Linux dialog uses zenity',
        fn: () => {
            const content = fs.readFileSync(DESKTOP_PROVIDER, 'utf8');
            assertContains(content, 'zenity', 'Should use zenity for Linux');
        }
    },
    {
        name: '[notification] desktop permission_prompt event triggers dialog',
        fn: () => {
            const content = fs.readFileSync(DESKTOP_PROVIDER, 'utf8');
            assertContains(content, 'permission_prompt', 'Should have permission_prompt in TITLES');
            assertContains(content, "notificationType === 'permission_prompt'", 'Should include permission_prompt in showDialog condition');
        }
    }
];

// ============================================================================
// Settings Configuration Tests
// ============================================================================

const settingsTests = [
    {
        name: '[notification] settings.json has Notification hook configured',
        fn: () => {
            const settingsPath = path.join(HOOKS_DIR, '..', 'settings.json');
            assertTrue(fs.existsSync(settingsPath), 'settings.json must exist');

            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            assertTrue(settings.hooks && settings.hooks.Notification, 'Notification hook must be configured');
        }
    },
    {
        name: '[notification] Notification hook points to notify.cjs',
        fn: () => {
            const settingsPath = path.join(HOOKS_DIR, '..', 'settings.json');
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            const notifHook = settings.hooks?.Notification?.[0]?.hooks?.[0];
            const command = notifHook?.command || '';

            assertContains(command, 'notifications/notify.cjs', 'Hook should point to notify.cjs');
        }
    },
    {
        name: '[notification] Notification hook matcher includes permission_prompt',
        fn: () => {
            const settingsPath = path.join(HOOKS_DIR, '..', 'settings.json');
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            const matcher = settings.hooks?.Notification?.[0]?.matcher || '';

            assertContains(matcher, 'permission_prompt', 'Matcher should include permission_prompt');
        }
    }
];

// ============================================================================
// Router Wiring Tests (notify.cjs owns all notification events; notify-waiting.js retired)
// ============================================================================

const routerWiringTests = [
    {
        name: '[notification] settings.json Stop hook points to notify.cjs',
        fn: () => {
            const settingsPath = path.join(HOOKS_DIR, '..', 'settings.json');
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            const cmds = (settings.hooks?.Stop || []).flatMap(h => h.hooks || []).map(h => h.command || []);
            assertTrue(cmds.some(cmd => String(cmd).includes('notifications/notify.cjs')), 'Stop should route to notify.cjs');
        }
    },
    {
        name: '[notification] settings.json PreToolUse/AskUserQuestion points to notify.cjs',
        fn: () => {
            const settingsPath = path.join(HOOKS_DIR, '..', 'settings.json');
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            const entry = (settings.hooks?.PreToolUse || []).find(h => h.matcher === 'AskUserQuestion');
            assertTrue(!!entry, 'PreToolUse AskUserQuestion matcher must exist');
            assertTrue((entry.hooks || []).some(h => (h.command || '').includes('notifications/notify.cjs')), 'AskUserQuestion should route to notify.cjs');
        }
    },
    {
        name: '[notification] notify-waiting.js has been retired (file removed)',
        fn: () => {
            assertFalse(fs.existsSync(path.join(HOOKS_DIR, 'notify-waiting.js')), 'notify-waiting.js should no longer exist');
        }
    },
    {
        name: '[notification] settings.json no longer references notify-waiting.js',
        fn: () => {
            const settingsPath = path.join(HOOKS_DIR, '..', 'settings.json');
            const raw = fs.readFileSync(settingsPath, 'utf8');
            assertFalse(raw.includes('notify-waiting'), 'settings.json must not reference notify-waiting.js');
        }
    }
];

// ============================================================================
// Export All Tests
// ============================================================================

module.exports = {
    name: 'Notification System Tests',
    tests: [
        ...fileExistenceTests,
        ...providerModuleTests,
        ...providerEnablementTests,
        ...routerExecutionTests,
        ...routerContractTests,
        ...isolationTests,
        ...libTests,
        ...eventConfigTests,
        ...remotePayloadTests,
        ...desktopBehaviorTests,
        ...settingsTests,
        ...routerWiringTests
    ]
};
