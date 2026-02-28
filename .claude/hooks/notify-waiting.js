#!/usr/bin/env node
/**
 * Claude Code Notification Hook (Cross-Platform)
 *
 * Sends desktop notifications for Claude Code events.
 * Supports Windows, macOS, and Linux.
 *
 * Hook Type: Notification
 * Events: AskUserPrompt, Stop, SubagentStop, etc.
 * Exit code: Always 0 (notifications are fire-and-forget)
 */

const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Get project name from cwd path
 */
function getProjectName(cwd) {
    if (!cwd) return '';
    // Extract folder name from path (handles both / and \)
    const parts = cwd.replace(/\\/g, '/').split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
}

/**
 * Check if event is a permission prompt
 * Handles both notification_type field (future) and message content (current workaround)
 * @see https://github.com/anthropics/claude-code/issues/11964
 * @param {object} eventData - Event data from stdin
 * @returns {boolean} True if this is a permission prompt
 */
function isPermissionPrompt(eventData) {
    // Check notification_type (for future when Claude Code bug #11964 is fixed)
    if (eventData.notification_type === 'permission_prompt') {
        return true;
    }

    // Fallback: check message content (workaround for missing notification_type)
    // Permission messages follow pattern: "Claude needs your permission to use <Tool>"
    const message = eventData.message || '';
    return message.includes('permission') && message.includes('use');
}

/**
 * Get title and message based on event type
 * @returns {object|null} { title, message, showDialog } or null to skip notification
 */
function getNotificationContent(eventData) {
    // Skip permission prompts - user already sees them in terminal
    // This prevents notification spam when Claude asks for command approval
    if (isPermissionPrompt(eventData)) {
        return null;
    }

    const eventName = eventData.hook_event_name || eventData.type || '';
    const toolName = eventData.tool_name || '';
    const agentType = eventData.agent_type || '';
    const projectName = getProjectName(eventData.cwd);
    const prefix = projectName ? `[${projectName}] ` : '';

    // PostToolUse: AskUserQuestion tool triggers notification for user to check and answer
    if (toolName === 'AskUserQuestion') {
        return { title: `${prefix}Claude Has a Question`, message: 'Claude is asking a question — please check and answer', showDialog: true };
    }

    switch (eventName) {
        case 'AskUserPrompt':
            return { title: `${prefix}Claude Needs Input`, message: 'Claude is waiting for your response', showDialog: true };
        case 'Stop':
            return { title: `${prefix}Claude Code Complete`, message: 'Task finished - ready for next request', showDialog: true };
        case 'SubagentStop':
            return { title: `${prefix}Subagent Complete`, message: `${agentType || 'Agent'} finished its task`, showDialog: false };
        case 'Notification':
            // idle_prompt notifications should show dialog (user needs to return to Claude)
            if (eventData.notification_type === 'idle_prompt') {
                return { title: `${prefix}Claude Needs Input`, message: 'Claude is waiting for your response', showDialog: true };
            }
            // Other Notification types - no notification (filtered by matcher, but safety check)
            return null;
        case 'SessionEnd':
            // Session ending (clear/exit/compact) - user initiated, no notification needed
            return null;
        default:
            return { title: `${prefix}Claude Code`, message: 'Waiting for your input', showDialog: false };
    }
}

/**
 * Send notification on Windows using PowerShell script file
 */
function notifyWindows(title, message, showDialog = false) {
    const scriptPath = path.join(__dirname, 'lib', 'notify-windows.ps1');
    const dialogFlag = showDialog ? ' -ShowDialog' : '';

    // Use exec - process continues in background
    exec(`powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "${scriptPath}" -Title "${title}" -Message "${message}"${dialogFlag}`);
}

/**
 * Send notification on macOS
 */
function notifyMacOS(title, message) {
    exec(`osascript -e 'display notification "${message}" with title "${title}"'`);
}

/**
 * Send notification on Linux
 */
function notifyLinux(title, message) {
    exec(`notify-send "${title}" "${message}" --urgency=normal`);
}

/**
 * Main notification dispatcher
 */
function sendNotification(title, message, showDialog = false) {
    const platform = os.platform();

    switch (platform) {
        case 'win32':
            notifyWindows(title, message, showDialog);
            break;
        case 'darwin':
            notifyMacOS(title, message);
            break;
        case 'linux':
            notifyLinux(title, message);
            break;
    }
}

/**
 * Main entry point
 */
function main() {
    let eventData = {};

    // Parse stdin for event data
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (stdin) {
            eventData = JSON.parse(stdin);
        }
    } catch {
        // Parse failed - exit cleanly without notification
        // Prevents spam when stdin is malformed or empty
        process.exit(0);
    }

    const content = getNotificationContent(eventData);

    // Skip notification if content is null (e.g., permission prompts)
    if (!content) {
        process.exit(0);
        return;
    }

    const { title, message, showDialog } = content;

    // Skip actual notifications in test mode (for automated testing)
    if (process.env.CLAUDE_HOOK_TEST_MODE === '1') {
        // Exit immediately without sending notification
        process.exit(0);
        return;
    }

    sendNotification(title, message, showDialog);

    // Brief delay to allow exec to spawn child process before exit
    setTimeout(() => process.exit(0), 150);
}

main();
