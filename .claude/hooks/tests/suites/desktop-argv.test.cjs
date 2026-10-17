/**
 * TC-HARNESS-003: notification data stays literal; appearance, modes and failures survive.
 * All child processes are replaced before loading the provider. No OS notification is sent.
 */
'use strict';

const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const PROVIDER = path.resolve(__dirname, '../../notifications/providers/desktop.cjs');
const EVENT_COPY_LIB = path.resolve(__dirname, '../../notifications/lib/event-copy.cjs');
const WINDOWS_SCRIPT = path.resolve(__dirname, '../../lib/notify-windows.ps1');
const SETTINGS = path.resolve(__dirname, '../../../settings.json');
const SOURCE = fs.readFileSync(PROVIDER, 'utf8');

// Turn-complete (Stop) copy: the conversation stays open, so the alert says a turn
// finished and never that the session completed or ended (BR-NT-04).
const TURN_COMPLETE_TITLE = 'AI Agent Turn Complete';
const TURN_COMPLETE_MESSAGE = 'AI agent finished its turn; the conversation is still open';

function assertTurnCompleteCopyNeverImpliesSessionEnd(title, message) {
    for (const text of [title, message]) {
        assert.doesNotMatch(text, /session\s+(complete|ended)|completed successfully/i,
            'Turn-complete alert must never read as the session completing or ending');
        assert.doesNotMatch(text, /\?|question/i, 'Turn-complete alert must never read as a question');
    }
}

// Router work that precedes the toast inside the same hook run: process start,
// stdin read and env load. A toast must leave this much of the budget unused.
const ROUTER_STARTUP_RESERVE_MS = 500;

// The SessionEnd notification hook budget as registered in host settings (seconds → ms).
function sessionEndBudgetMs() {
    const settings = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
    const hook = (settings.hooks?.SessionEnd || [])
        .flatMap(group => Array.isArray(group.hooks) ? group.hooks : [])
        .find(entry => String(entry.command || '').includes('notifications/notify.cjs'));
    assert.ok(hook && Number.isFinite(hook.timeout), 'SessionEnd notification hook must declare a timeout budget');
    return hook.timeout * 1000;
}

function assertToastWithinSessionEndBudget(timeout, platform) {
    const budget = sessionEndBudgetMs();
    assert.ok(Number.isFinite(timeout) && timeout > 0, `${platform} toast must have a bounded timeout`);
    assert.ok(timeout + ROUTER_STARTUP_RESERVE_MS <= budget,
        `${platform} toast timeout ${timeout}ms must leave ${ROUTER_STARTUP_RESERVE_MS}ms of the ${budget}ms SessionEnd budget`);
}

// The Windows toast outlasts the SessionEnd budget on a loaded host, so it must be
// launched detached: never awaited, never tied to this process, never killed by a timer.
function assertDetachedLaunch(call) {
    assert.equal(call.kind, 'spawn', 'Windows toast must be launched, not awaited through execFile');
    assert.equal(call.options.detached, true, 'Windows toast must run detached from the hook process');
    assert.equal(call.options.stdio, 'ignore', 'Windows toast must not hold the hook open through its stdio');
    assert.equal(call.options.shell, false);
    assert.equal(call.options.windowsHide, true);
    assert.equal(call.options.timeout, undefined, 'A detached toast has no kill timer; the script bounds itself');
    assert.equal(call.unrefCount, 1, 'Windows toast must be unreferenced so the hook exits without it');
}

// Neither subprocess form ever reports an exit here, so a send that waited for the
// notifier to finish would never settle; this bound turns that hang into a failure.
function withinLaunchWindow(promise, label) {
    let timer;
    const hang = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} waited for the notifier to exit`)), 1000);
    });
    return Promise.race([promise, hang]).finally(() => clearTimeout(timer));
}

function loadProvider(platform, { errors = [], durations = [], env = {}, source = SOURCE } = {}) {
    const calls = [];
    let elapsed = 0;
    const childProcess = {
        exec() { throw new Error('Shell interpolation is forbidden'); },
        execFile(file, args, options, callback) {
            const index = calls.length;
            calls.push({ kind: 'execFile', file, args: Array.from(args), options: { ...options } });
            queueMicrotask(() => {
                elapsed += durations[index] || 0;
                callback(errors[index] || null);
            });
        },
        // Reports only process start or launch failure — never an exit — like a real detached child.
        spawn(file, args, options) {
            const index = calls.length;
            const call = { kind: 'spawn', file, args: Array.from(args), options: { ...options }, unrefCount: 0 };
            calls.push(call);
            const child = new EventEmitter();
            child.unref = () => { call.unrefCount += 1; };
            queueMicrotask(() => {
                if (errors[index]) child.emit('error', errors[index]);
                else child.emit('spawn');
            });
            return child;
        }
    };
    const context = { module: { exports: {} }, __dirname: path.dirname(PROVIDER), process: { env }, Date: { now: () => elapsed } };
    context.require = name => {
        if (name === 'child_process') return childProcess;
        if (name === 'os') return { platform: () => platform };
        if (name === 'path') return path;
        if (name === '../lib/event-copy.cjs') return require(EVENT_COPY_LIB);
        throw new Error(`Unmocked dependency: ${name}`);
    };
    vm.runInNewContext(source, context, { filename: PROVIDER });
    return { provider: context.module.exports, calls };
}

function assertCall(call, platform, title, message, dialog) {
    assert.ok(call, 'Notification must reach the literal subprocess boundary');
    assert.equal(call.options.shell, false);
    if (dialog) {
        // Dialogs wait for the developer's click and never run on the SessionEnd path.
        assert.equal(call.kind, 'execFile', `${platform} dialog must be awaited`);
        assert.equal(call.options.timeout, platform === 'win32' ? 60000 : 30000);
    } else if (platform === 'win32') {
        // Toasts are the SessionEnd form; the Windows one cannot fit the budget, so it is detached.
        assertDetachedLaunch(call);
    } else {
        // Toasts are the SessionEnd form, so each awaited one must fit the host's SessionEnd budget.
        assert.equal(call.kind, 'execFile', `${platform} toast must be awaited for its delivery status`);
        assertToastWithinSessionEndBudget(call.options.timeout, platform);
    }
    if (platform === 'win32') {
        assert.equal(call.file, 'powershell');
        assert.equal(call.options.windowsHide, true);
        assert.deepEqual(call.args, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', WINDOWS_SCRIPT,
            '-Title', title, '-Message', message, ...(dialog ? ['-ShowDialog'] : [])]);
    } else if (platform === 'linux') {
        assert.equal(call.file, dialog ? 'zenity' : 'notify-send');
        assert.deepEqual(call.args, dialog ? ['--info', `--title=${title}`, `--text=${message}`] :
            ['--urgency=normal', '--expire-time=5000', '--', title, message]);
    } else {
        assert.equal(call.file, 'osascript');
        assert.equal(call.args[0], '-e');
        assert.deepEqual(call.args.slice(2), ['--', title, message]);
        assert.match(call.args[1], /on run argv/);
        assert.match(call.args[1], /item 2 of argv/);
        assert.match(call.args[1], /with title \(item 1 of argv\)/);
        assert.match(call.args[1], dialog ? /display dialog.*buttons \{"OK"\} default button "OK"/ : /display notification/);
    }
}

// Bounded property domain: all strings of length 0..2 over this alphabet, plus
// explicit composite command-looking, long, newline, Unicode and option countercases.
// This finite corpus proves literal delivery for these values, not every OS parser.
function payloads() {
    const alphabet = ['a', ' ', '"', "'", '$', '`', ';', '&', '|', '%', '!', '\n', 'é', '界', '😀', '-'];
    return ['', ...alphabet, ...alphabet.flatMap(a => alphabet.map(b => a + b)),
        '$(echo INERT); `echo INERT` & echo INERT | echo INERT',
        '"; display dialog "INERT" --', '%COMSPEC% !INERT! ^ & < >',
        '--help', '-ShowDialog', 'line1\r\nline2\tend', 'x'.repeat(8192), 'back\\slash'];
}

const tests = ['linux', 'win32', 'darwin'].map(platform => ({
    name: `[TC-HARNESS-003] ${platform}: bounded literal argv property and benign controls`,
    fn: async () => {
        let toastScript;
        for (const payload of payloads()) {
            const { provider, calls } = loadProvider(platform);
            const input = { hook_event_name: 'SubagentStop', cwd: `/work/${payload || 'sample'}`, agent_type: payload || 'worker' };
            const result = await provider.send(input, {});
            assert.equal(result.success, true);
            assert.equal(calls.length, 1);
            const project = input.cwd.replace(/\\/g, '/').split('/').filter(Boolean).pop();
            assertCall(calls[0], platform, `[${project}] Subagent Complete`, `${input.agent_type} agent finished its task`, false);
            if (platform === 'darwin') {
                toastScript ??= calls[0].args[1];
                assert.equal(calls[0].args[1], toastScript, 'Data must never change executable AppleScript');
            }
        }
    }
}));

tests.push({
    name: '[TC-HARNESS-003][TC-NT-011][TC-NT-013] direct questions and ordinary Stop keep their existing dialogs',
    fn: async () => {
        // Given the turn-complete copy never implies a session end or a question
        assertTurnCompleteCopyNeverImpliesSessionEnd(TURN_COMPLETE_TITLE, TURN_COMPLETE_MESSAGE);
        const events = [
            [{ hook_event_name: 'Stop' }, TURN_COMPLETE_TITLE, TURN_COMPLETE_MESSAGE],
            [{ hook_event_name: 'AskUserQuestion' }, 'AI Agent Has a Question', 'AI agent is asking a question — please check and answer'],
            [{ notification_type: 'idle_prompt' }, 'AI Agent Waiting for Input', 'AI agent is waiting for your input'],
            [{ notification_type: 'AskUserPrompt' }, 'AI Agent Needs Input', 'Waiting for your input'],
            [{ notification_type: 'permission_prompt' }, 'AI Agent Needs Permission', 'AI agent is asking for tool permission']
        ];
        for (const platform of ['linux', 'win32', 'darwin']) {
            let dialogScript;
            for (const [input, title, message] of events) {
                const { provider, calls } = loadProvider(platform);
                assert.equal((await provider.send({ ...input, cwd: '/work/$(echo INERT)' }, {})).success, true);
                assert.equal(calls.length, 1);
                assertCall(calls[0], platform, `[$(echo INERT)] ${title}`, message, true);
                if (platform === 'darwin') {
                    dialogScript ??= calls[0].args[1];
                    assert.equal(calls[0].args[1], dialogScript);
                }
            }
        }
    }
}, {
    name: '[TC-NT-001][TC-NT-002] main SessionEnd uses a literal, nonblocking alert on mocked hosts',
    fn: async () => {
        // Given a main-session end that both Claude and Codex emit on the main conversation
        const input = { hook_event_name: 'SessionEnd', cwd: '/work/easy-claude' };
        const title = '[easy-claude] AI Agent Session Ended';
        const message = 'Main agent session ended';

        // When each supported platform is selected behind the mocked child_process boundary
        for (const platform of ['darwin', 'linux', 'win32']) {
            const { provider, calls } = loadProvider(platform);
            const result = await withinLaunchWindow(provider.send(input, {}), `${platform} session-ended alert`);

            // Then it sends one nonblocking session-ended alert without invoking native UI
            assert.equal(result.success, true);
            assert.equal(calls.length, 1);
            assertCall(calls[0], platform, title, message, false);
            // And on Windows the hook returns once the toast has started, never waiting for it to finish
            assert.equal(result.detached, platform === 'win32' ? true : undefined,
                'Only the Windows toast is handed off without awaiting its outcome');
            if (platform === 'darwin') {
                assert.equal(calls[0].file, 'osascript');
                assert.deepEqual(calls[0].args.slice(2), ['--', title, message],
                    'macOS notification title and message must be passed as literal argv values');
                assert.equal(calls[0].options.shell, false, 'macOS notification must never use a shell');
            }
        }
    }
}, {
    name: '[TC-NT-012] Codex Stop question fallback uses a nonblocking macOS alert',
    fn: async () => {
        // Given the router's marked Codex final-question fallback, still carrying the assistant reply it was classified from
        const privateReply = 'Private assistant reply that must stay local?';
        const input = {
            hook_event_name: 'AskUserQuestion',
            notification_source: 'codex-stop-question',
            last_assistant_message: privateReply,
            cwd: '/work/easy-claude'
        };
        const { provider, calls } = loadProvider('darwin');

        // When the macOS desktop provider sends the question notification
        const result = await provider.send(input, {});

        // Then it uses Notification Center toast delivery instead of a blocking dialog
        assert.equal(result.success, true);
        assert.equal(calls.length, 1);
        assertCall(calls[0], 'darwin', '[easy-claude] AI Agent Has a Question',
            'AI agent is asking a question — please check and answer', false);
        assert.match(calls[0].args[1], /display notification/);
        assert.doesNotMatch(calls[0].args[1], /display dialog/);
        assert.deepEqual(calls[0].args.slice(2), ['--', '[easy-claude] AI Agent Has a Question',
            'AI agent is asking a question — please check and answer']);
        assert.equal(calls[0].options.shell, false);
        // And the alert never carries the assistant's reply text
        assert.ok(calls[0].args.every(arg => !String(arg).includes(privateReply)), 'Desktop alert must never forward the assistant reply text');
    }
}, {
    name: '[TC-NT-074] desktop alerts of every kind never carry the assistant reply text',
    fn: async () => {
        // A marker at both ends of the reply, so a head or tail preview leaks it as surely as the whole reply
        const marker = 'ABC123';
        const cases = [
            // The second supported assistant carries its reply on every ordinary completed turn
            [{ hook_event_name: 'Stop', turn_id: 'turn-complete-1', last_assistant_message: `${marker} private turn reply ${marker}.` },
                TURN_COMPLETE_TITLE, TURN_COMPLETE_MESSAGE, true],
            [{ hook_event_name: 'AskUserQuestion', notification_source: 'codex-stop-question', last_assistant_message: `${marker} private question ${marker}?` },
                'AI Agent Has a Question', 'AI agent is asking a question — please check and answer', null],
            [{ hook_event_name: 'SessionEnd', last_assistant_message: `${marker} private closing reply ${marker}.` },
                'AI Agent Session Ended', 'Main agent session ended', false]
        ];
        for (const platform of ['linux', 'win32', 'darwin']) {
            for (const [event, title, message, dialog] of cases) {
                // Given an alert whose event still carries the assistant's reply text
                const { provider, calls } = loadProvider(platform);
                // When the desktop provider shows it
                const result = await withinLaunchWindow(provider.send({ ...event, cwd: '/work/alpha-project' }, {}),
                    `${platform} ${event.hook_event_name} alert`);
                // Then it shows the kind's own title and message
                assert.equal(result.success, true);
                assert.equal(calls.length, 1);
                const shownTitle = `[alpha-project] ${title}`;
                if (dialog !== null) assertCall(calls[0], platform, shownTitle, message, dialog);
                else assert.ok(calls[0].args.includes(message) || calls[0].args.some(arg => String(arg).includes(message)),
                    `${platform} question alert must show its own message`);
                // And no part of the reply reaches the notifier
                assert.ok(calls[0].args.every(arg => !String(arg).includes(marker)),
                    `${platform} ${event.hook_event_name} desktop alert must never forward the assistant reply text`);
            }
        }
    }
}, {
    name: '[TC-HARNESS-003] Linux fallback only follows zenity failure and preserves literal data',
    fn: async () => {
        const input = { hook_event_name: 'Stop', cwd: '/work/$(echo INERT)' };
        for (const failure of [new Error('zenity missing'), Object.assign(new Error('timed out'), { killed: true })]) {
            for (const fallbackError of [null, new Error('kdialog missing')]) {
                const { provider, calls } = loadProvider('linux', { errors: [failure, fallbackError] });
                const result = await provider.send(input, {});
                assert.equal(result.success, !fallbackError);
                assert.equal(result.error, fallbackError?.message);
                assert.equal(calls.length, 2);
                assert.equal(calls[1].file, 'kdialog');
                assert.deepEqual(calls[1].args, ['--msgbox', TURN_COMPLETE_MESSAGE, '--title', `[$(echo INERT)] ${TURN_COMPLETE_TITLE}`]);
                assert.equal(calls[1].options.shell, false);
                assert.equal(calls[1].options.timeout, 30000);
            }
        }
        for (const elapsed of [1, 125, 29999, 30000, 30001]) {
            const { provider, calls } = loadProvider('linux', { errors: [new Error('zenity failed')], durations: [elapsed] });
            const result = await provider.send(input, {});
            assert.equal(result.success, elapsed < 30000);
            assert.equal(calls.length, elapsed < 30000 ? 2 : 1, 'Expired shared deadline must not launch fallback');
            if (elapsed < 30000) assert.equal(calls[1].options.timeout, 30000 - elapsed);
            else assert.equal(result.error, 'zenity failed');
        }
    }
}, {
    name: '[TC-HARNESS-003] callback errors and timeouts propagate; unsupported platform makes no call',
    fn: async () => {
        // Awaited forms (every macOS/Linux toast, the Windows dialog) report exit errors and timeouts.
        const awaited = [['linux', 'SubagentStop'], ['darwin', 'SubagentStop'], ['win32', 'Stop']];
        for (const [platform, event] of awaited) {
            for (const error of [new Error('executable missing'), Object.assign(new Error('timed out'), { killed: true })]) {
                const { provider, calls } = loadProvider(platform, { errors: [error] });
                const result = await provider.send({ hook_event_name: event }, {});
                assert.equal(result.success, false);
                assert.equal(result.error, error.message);
                assert.equal(calls.length, 1);
                assert.equal(calls[0].kind, 'execFile');
            }
        }
        // The detached Windows toast still reports a notifier that could not be started.
        const launchFailure = new Error('spawn powershell ENOENT');
        const detached = loadProvider('win32', { errors: [launchFailure] });
        const launch = await withinLaunchWindow(detached.provider.send({ hook_event_name: 'SubagentStop' }, {}), 'failed Windows toast');
        assert.equal(launch.success, false);
        assert.equal(launch.error, launchFailure.message);
        assert.equal(detached.calls.length, 1);
        assert.equal(detached.calls[0].kind, 'spawn');
        const { provider, calls } = loadProvider('unsupported');
        assert.equal((await provider.send({}, {})).error, 'Unsupported platform: unsupported');
        assert.equal(calls.length, 0);
    }
}, {
    name: '[TC-HARNESS-003] enablement retains default, explicit disable and invalid-value controls',
    fn: () => {
        const { provider, calls } = loadProvider('linux');
        for (const [value, enabled] of [[undefined, true], ['', true], ['true', true], ['false', false], ['invalid', false]]) {
            assert.equal(provider.isEnabled({ ENABLE_DESKTOP_NOTIFICATIONS: value }), enabled);
        }
        assert.equal(calls.length, 0);
    }
}, {
    name: '[TC-HARNESS-003] test mode suppresses every platform subprocess',
    fn: async () => {
        for (const platform of ['linux', 'win32', 'darwin']) {
            const { provider, calls } = loadProvider(platform, { env: { CLAUDE_HOOK_TEST_MODE: '1' } });
            const result = await provider.send({ hook_event_name: 'Stop' }, {});
            assert.equal(result.success, true);
            assert.equal(result.skipped, true);
            assert.equal(calls.length, 0);
        }
    }
}, {
    name: '[TC-HARNESS-003] existing Windows script retains sound, toast, focus and balloon branches',
    fn: () => {
        const script = fs.readFileSync(WINDOWS_SCRIPT, 'utf8');
        for (const token of ['[string]$Title', '[string]$Message', '[switch]$ShowDialog', 'SystemSounds]::Exclamation.Play()',
            'SystemSounds]::Asterisk.Play()', 'SystemSounds]::Question.Play()', 'New-BurntToastNotification -Text $Title, $Message',
            '$form.TopMost = $true', 'GetForegroundWindow()', 'SetForegroundWindow($previousWindow)',
            'MessageBoxButtons]::OK', '$notify.BalloonTipTitle = $Title', '$notify.BalloonTipText = $Message', '$notify.ShowBalloonTip(5000)',
            // The detached toast relies on the script ending by itself: bounded wait, then release the tray icon.
            'Start-Sleep -Milliseconds 500', '$notify.Dispose()']) {
            assert.ok(script.includes(token), `Protected script behavior missing: ${token}`);
        }
    }
}, {
    name: '[TC-HARNESS-003] semantic interpolation mutant is killed by the literal-boundary oracle',
    fn: async () => {
        const needle = 'execFile(file, args, { shell: false, ...options },';
        assert.ok(SOURCE.includes(needle), 'Mutant must target the live subprocess boundary');
        const mutant = SOURCE.replace(needle, "require('child_process').exec([file, ...args].join(' '), options,");
        assert.notEqual(mutant, SOURCE);
        const { provider } = loadProvider('linux', { source: mutant });
        await assert.rejects(provider.send({ hook_event_name: 'SubagentStop', cwd: '/work/$(echo INERT)' }, {}), /Shell interpolation is forbidden/);
    }
});

module.exports = { name: 'Desktop literal argv', tests };
