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

const { exec } = require('child_process');
const os = require('os');
const path = require('path');

// Notification titles by event type
const TITLES = {
  Stop: 'Claude Code Complete',
  SubagentStop: 'Subagent Complete',
  AskUserPrompt: 'Claude Needs Input',
  default: 'Claude Code',
};

// Notification messages by event type
const MESSAGES = {
  Stop: 'Session completed successfully',
  SubagentStop: 'Specialized agent finished',
  AskUserPrompt: 'Waiting for your input',
  default: 'Event triggered',
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
  const hookType = input.hook_event_name || 'default';
  const projectName = getProjectName(input.cwd);

  // Add project prefix to title
  const prefix = projectName ? `[${projectName}] ` : '';
  const title = prefix + (TITLES[hookType] || TITLES.default);

  let message = MESSAGES[hookType] || MESSAGES.default;

  // Add agent type for SubagentStop
  if (hookType === 'SubagentStop' && input.agent_type) {
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
 * @returns {Promise<{success: boolean, error?: string}>}
 */
function notifyWindows(title, message, showDialog) {
  return new Promise((resolve) => {
    // Path to PowerShell script (relative to this file's parent directory)
    const scriptPath = path.resolve(__dirname, '..', '..', 'lib', 'notify-windows.ps1');
    const dialogFlag = showDialog ? ' -ShowDialog' : '';

    const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "${scriptPath}" -Title "${title}" -Message "${message}"${dialogFlag}`;

    // Wait for completion - dialogs block until user clicks, toasts complete quickly
    exec(cmd, { windowsHide: true, timeout: showDialog ? 60000 : 5000 }, (err) => {
      resolve({ success: !err, error: err?.message });
    });
  });
}

/**
 * Send notification on macOS using osascript
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {boolean} showDialog - Whether to show blocking dialog
 * @returns {{success: boolean, error?: string}}
 */
function notifyMacOS(title, message, showDialog) {
  // Escape for osascript
  const escapedTitle = title.replace(/"/g, '\\"');
  const escapedMessage = message.replace(/"/g, '\\"');

  if (showDialog) {
    // Use display dialog for blocking modal
    exec(
      `osascript -e 'display dialog "${escapedMessage}" with title "${escapedTitle}" buttons {"OK"} default button "OK"'`,
      { timeout: 30000 }
    );
  } else {
    // Use display notification for non-blocking toast
    exec(
      `osascript -e 'display notification "${escapedMessage}" with title "${escapedTitle}"'`,
      { timeout: 3000 }
    );
  }

  return { success: true };
}

/**
 * Send notification on Linux using notify-send or zenity
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {boolean} showDialog - Whether to show blocking dialog
 * @returns {{success: boolean, error?: string}}
 */
function notifyLinux(title, message, showDialog) {
  // Escape for shell
  const escapedTitle = title.replace(/"/g, '\\"');
  const escapedMessage = message.replace(/"/g, '\\"');

  if (showDialog) {
    // Try zenity first (GTK), then kdialog (KDE)
    exec(
      `zenity --info --title="${escapedTitle}" --text="${escapedMessage}" 2>/dev/null || kdialog --msgbox "${escapedMessage}" --title "${escapedTitle}" 2>/dev/null`,
      { timeout: 30000 }
    );
  } else {
    // Use notify-send for non-blocking toast
    exec(
      `notify-send "${escapedTitle}" "${escapedMessage}" --urgency=normal --expire-time=5000`,
      { timeout: 3000 }
    );
  }

  return { success: true };
}

/**
 * Send notification based on current platform
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {boolean} showDialog - Whether to show blocking dialog
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendNotification(title, message, showDialog) {
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
  isEnabled: (env) => {
    // Explicit disable check
    if (env.ENABLE_DESKTOP_NOTIFICATIONS === 'false') {
      return false;
    }
    // Enabled by default OR when explicitly set to true
    return env.ENABLE_DESKTOP_NOTIFICATIONS === 'true' ||
           env.ENABLE_DESKTOP_NOTIFICATIONS === undefined ||
           env.ENABLE_DESKTOP_NOTIFICATIONS === '';
  },

  /**
   * Send notification to desktop
   * For Stop/AskUserPrompt events: shows blocking dialog (user must click OK)
   * For other events: shows toast notification
   * @param {Object} input - Hook input (snake_case fields)
   * @param {Object} env - Environment variables
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  send: async (input, env) => {
    const { title, message } = getNotificationContent(input);
    const hookType = input.hook_event_name || 'default';

    // Stop/AskUserPrompt: show blocking dialog so user won't miss it
    const showDialog = hookType === 'Stop' || hookType === 'AskUserPrompt';

    return sendNotification(title, message, showDialog);
  },
};
