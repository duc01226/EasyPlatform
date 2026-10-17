/**
 * Desktop notification provider
 * Sends native OS notifications (Windows, macOS, Linux)
 *
 * Windows: Uses notify-windows.ps1 script for proper focus handling
 * macOS: Uses osascript for native notifications
 * Linux: Uses notify-send with zenity/kdialog fallbacks
 *
 * Enable with: ENABLE_DESKTOP_NOTIFICATIONS=true
 * Optional: DESKTOP_NOTIFICATION_SOUND=true (default: false)
 */
'use strict';

const { execFile, spawn } = require('child_process');
const os = require('os');
const path = require('path');
const { EVENT_COPY } = require('../lib/event-copy.cjs');

// A toast (non-blocking alert) is the only desktop form on the SessionEnd path,
// and SessionEnd runs under a 3-second host hook budget (Claude settings and the
// Codex mirror). Dialogs wait for a click and never run on the SessionEnd path.
//
// Windows toast: fire-and-forget, so it has no entry here. PowerShell start-up
// plus notify-windows.ps1 took 1.9–6.3 s on a loaded host, so a toast awaited
// under any wait that fits the budget was killed before it displayed. It is
// launched detached and the hook returns as soon as the process has started.
// The script ends on its own: the BurntToast branch exits after posting, and the
// balloon fallback shows its tip, sleeps 500 ms, disposes the tray icon and
// ends. Neither branch waits on the developer, so its lifetime is PowerShell
// start-up plus module lookup plus ~0.5 s, and no orphan lingers.
//
// macOS/Linux toasts stay awaited: osascript `display notification` and
// notify-send hand the alert to the OS notification service and return at once,
// well inside these waits, and awaiting keeps their exit status as the delivery
// result. Each wait leaves room in the budget for router start-up.
const TOAST_TIMEOUT_MS = {
    darwin: 2000,
    linux: 2000
};

function runNotification(file, args, options) {
    return new Promise(resolve => {
        execFile(file, args, { shell: false, ...options }, err => {
            resolve({ success: !err, error: err?.message });
        });
    });
}

// Start a notifier that outlives this hook: no wait for its exit, no link to its
// stdio, and no handle keeping this process alive. Settles once the OS has
// started it, or reports why it could not.
function launchDetached(file, args, options) {
    return new Promise(resolve => {
        const child = spawn(file, args, { ...options, shell: false, detached: true, stdio: 'ignore' });
        child.once('error', err => resolve({ success: false, error: err.message }));
        child.once('spawn', () => resolve({ success: true, detached: true }));
        child.unref();
    });
}

// Notification titles by event type (host-agnostic: this framework runs under
// Claude Code, Codex and opencode, so notifications must not name one host).
const TITLES = {
    SessionEnd: EVENT_COPY.SessionEnd.title,
    Stop: EVENT_COPY.Stop.title,
    SubagentStop: 'Subagent Complete',
    AskUserPrompt: 'AI Agent Needs Input',
    AskUserQuestion: EVENT_COPY.AskUserQuestion.title,
    idle_prompt: 'AI Agent Waiting for Input',
    permission_prompt: 'AI Agent Needs Permission',
    default: 'AI Agent'
};

// Notification messages by event type
const MESSAGES = {
    SessionEnd: EVENT_COPY.SessionEnd.summary,
    Stop: EVENT_COPY.Stop.summary,
    SubagentStop: 'Specialized agent finished',
    AskUserPrompt: 'Waiting for your input',
    AskUserQuestion: EVENT_COPY.AskUserQuestion.summary,
    idle_prompt: 'AI agent is waiting for your input',
    permission_prompt: 'AI agent is asking for tool permission',
    default: 'Event triggered'
};

/**
 * Get project name from cwd path
 * @param {string} cwd - Working directory path
 * @returns {string} Project name
 */
function getProjectName(cwd) {
    if (!cwd) return '';
    // Handle both / and \ path separators
    const parts = cwd.replace(/\\/g, '/').split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
}

/**
 * Get notification content based on event
 * @param {Object} input - Hook input
 * @returns {{title: string, message: string}}
 */
function getNotificationContent(input) {
    // Check both hook_event_name and notification_type (idle_prompt uses notification_type)
    const eventType = input.notification_type || input.hook_event_name || 'default';
    const projectName = getProjectName(input.cwd);

    // Add project prefix to title
    const prefix = projectName ? `[${projectName}] ` : '';
    const title = prefix + (TITLES[eventType] || TITLES.default);

    let message = MESSAGES[eventType] || MESSAGES.default;

    // Add agent type for SubagentStop
    if (eventType === 'SubagentStop' && input.agent_type) {
        message = `${input.agent_type} agent finished its task`;
    }

    return { title, message };
}

/**
 * Send notification on Windows using PowerShell script
 * Script handles: BurntToast, TopMost dialogs, NotifyIcon fallback
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {boolean} showDialog - Whether to show blocking dialog
 * @returns {Promise<{success: boolean, detached?: boolean, error?: string}>}
 */
function notifyWindows(title, message, showDialog) {
    const scriptPath = path.resolve(__dirname, '..', '..', 'lib', 'notify-windows.ps1');
    const args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', scriptPath,
        '-Title', title, '-Message', message];
    if (showDialog) args.push('-ShowDialog');

    // A dialog is awaited until the developer clicks it; a toast is detached (see TOAST_TIMEOUT_MS).
    if (showDialog) {
        return runNotification('powershell', args, { windowsHide: true, timeout: 60000 });
    }
    return launchDetached('powershell', args, { windowsHide: true });
}

/**
 * Send notification on macOS using osascript
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {boolean} showDialog - Whether to show blocking dialog
 * @returns {Promise<{success: boolean, error?: string}>}
 */
function notifyMacOS(title, message, showDialog) {
    // Fixed program source receives notification content only through argv.
    const script = showDialog
        ? 'on run argv\ndisplay dialog (item 2 of argv) with title (item 1 of argv) buttons {"OK"} default button "OK"\nend run'
        : 'on run argv\ndisplay notification (item 2 of argv) with title (item 1 of argv)\nend run';

    return runNotification('osascript', ['-e', script, '--', title, message], { timeout: showDialog ? 30000 : TOAST_TIMEOUT_MS.darwin });
}

/**
 * Send notification on Linux using notify-send or zenity
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {boolean} showDialog - Whether to show blocking dialog
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function notifyLinux(title, message, showDialog) {
    if (showDialog) {
        // Try zenity first (GTK), then kdialog (KDE)
        const deadline = Date.now() + 30000;
        const result = await runNotification('zenity', ['--info', `--title=${title}`, `--text=${message}`], { timeout: 30000 });
        if (result.success) return result;
        const remaining = deadline - Date.now();
        if (remaining <= 0) return result;
        return runNotification('kdialog', ['--msgbox', message, '--title', title], { timeout: remaining });
    }

    return runNotification('notify-send', ['--urgency=normal', '--expire-time=5000', '--', title, message], { timeout: TOAST_TIMEOUT_MS.linux });
}

/**
 * Send notification based on current platform
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {boolean} showDialog - Whether to show blocking dialog
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendNotification(title, message, showDialog) {
    // Test mode: skip the real OS call. The router (notify.cjs) still exercises event
    // normalization, whitelist routing, and provider selection; only the blocking dialog /
    // toast exec is suppressed so the test runner cannot hang on a modal dialog.
    if (process.env.CLAUDE_HOOK_TEST_MODE === '1') {
        return { success: true, skipped: true };
    }

    const platform = os.platform();

    switch (platform) {
        case 'win32':
            return await notifyWindows(title, message, showDialog);
        case 'darwin':
            return notifyMacOS(title, message, showDialog);
        case 'linux':
            return notifyLinux(title, message, showDialog);
        default:
            return { success: false, error: `Unsupported platform: ${platform}` };
    }
}

module.exports = {
    name: 'desktop',

    /**
     * Check if desktop provider is enabled
     * Enabled by default for local notifications (no env vars required),
     * or can be explicitly enabled/disabled via ENABLE_DESKTOP_NOTIFICATIONS
     * @param {Object} env - Environment variables
     * @returns {boolean} True if enabled
     */
    isEnabled: env => {
        // Explicit disable check
        if (env.ENABLE_DESKTOP_NOTIFICATIONS === 'false') {
            return false;
        }
        // Enabled by default OR when explicitly set to true
        return env.ENABLE_DESKTOP_NOTIFICATIONS === 'true' || env.ENABLE_DESKTOP_NOTIFICATIONS === undefined || env.ENABLE_DESKTOP_NOTIFICATIONS === '';
    },

    /**
     * Send notification to desktop
     * Stop completion and direct question/input/permission requests use a dialog.
     * Session end and inferred Codex Stop questions use a toast notification.
     * @param {Object} input - Hook input (snake_case fields)
     * @param {Object} env - Environment variables
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    send: async (input, env) => {
        const { title, message } = getNotificationContent(input);
        const hookType = input.hook_event_name || 'default';
        const notificationType = input.notification_type;
        const isCodexStopQuestion = input.notification_source === 'codex-stop-question';

        // Stop completion and direct input requests use dialogs; SessionEnd and the Codex Stop fallback use toasts.
        const showDialog =
            !isCodexStopQuestion && (
                hookType === 'Stop' ||
                hookType === 'AskUserQuestion' ||
                notificationType === 'idle_prompt' ||
                notificationType === 'AskUserPrompt' ||
                notificationType === 'permission_prompt'
            );

        return sendNotification(title, message, showDialog);
    }
};
