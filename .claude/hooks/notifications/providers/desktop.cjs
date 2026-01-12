/**
 * Desktop notification provider
 * Sends native OS notifications (Windows, macOS, Linux)
 *
 * Enable with: ENABLE_DESKTOP_NOTIFICATIONS=true
 * Optional: DESKTOP_NOTIFICATION_SOUND=true (default: false)
 */
'use strict';

const { execSync, exec, spawn } = require('child_process');
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
  return path.basename(cwd) || '';
}

/**
 * Get notification content based on event
 * @param {Object} input - Hook input
 * @returns {{title: string, message: string}}
 */
function getNotificationContent(input) {
  const hookType = input.hook_event_name || 'default';
  const projectName = getProjectName(input.cwd);

  const title = TITLES[hookType] || TITLES.default;
  let message = MESSAGES[hookType] || MESSAGES.default;

  // Add project context
  if (projectName) {
    message = `${message} [${projectName}]`;
  }

  // Add agent type for SubagentStop
  if (hookType === 'SubagentStop' && input.agent_type) {
    message = `${input.agent_type} agent finished [${projectName || 'project'}]`;
  }

  return { title, message };
}

/**
 * Escape string for shell command
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeShell(str) {
  return str.replace(/'/g, "''").replace(/"/g, '\\"');
}

/**
 * Send notification on Windows using PowerShell
 * Tries BurntToast first, falls back to NotifyIcon
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {boolean} playSound - Whether to play a sound
 * @returns {{success: boolean, error?: string}}
 */
function notifyWindows(title, message, playSound) {
  const escapedTitle = escapeShell(title);
  const escapedMessage = escapeShell(message);

  // Try BurntToast first (modern Windows 10/11 notifications)
  try {
    const soundParam = playSound ? '' : ' -SnoozeAndDismiss';
    execSync(
      `powershell -NoProfile -Command "if (Get-Module -ListAvailable -Name BurntToast) { Import-Module BurntToast; New-BurntToastNotification -Text '${escapedTitle}', '${escapedMessage}'${soundParam}; exit 0 } else { exit 1 }"`,
      { stdio: 'pipe', timeout: 3000, windowsHide: true }
    );
    return { success: true };
  } catch {
    // BurntToast not available, try fallback
  }

  // Fallback: System.Windows.Forms NotifyIcon (balloon tip)
  try {
    const soundCmd = playSound ? '[System.Media.SystemSounds]::Asterisk.Play();' : '';
    execSync(
      `powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $n = New-Object System.Windows.Forms.NotifyIcon; $n.Icon = [System.Drawing.SystemIcons]::Information; $n.BalloonTipIcon = 'Info'; $n.BalloonTipTitle = '${escapedTitle}'; $n.BalloonTipText = '${escapedMessage}'; $n.Visible = $true; ${soundCmd} $n.ShowBalloonTip(5000); Start-Sleep -Milliseconds 100; $n.Dispose()"`,
      { stdio: 'pipe', timeout: 3000, windowsHide: true }
    );
    return { success: true };
  } catch (err) {
    // Both methods failed
    return { success: false, error: `Windows notification failed: ${err.message}` };
  }
}

/**
 * Send notification on macOS using osascript
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {boolean} playSound - Whether to play a sound
 * @returns {{success: boolean, error?: string}}
 */
function notifyMacOS(title, message, playSound) {
  const escapedTitle = escapeShell(title);
  const escapedMessage = escapeShell(message);
  const soundOption = playSound ? ' sound name "Ping"' : '';

  try {
    // Use osascript for native macOS notifications (async for speed)
    exec(
      `osascript -e 'display notification "${escapedMessage}" with title "${escapedTitle}"${soundOption}'`,
      { timeout: 3000 }
    );
    return { success: true };
  } catch {
    // Try terminal-notifier as fallback
    try {
      const soundArg = playSound ? ' -sound default' : '';
      exec(
        `terminal-notifier -title "${escapedTitle}" -message "${escapedMessage}"${soundArg}`,
        { timeout: 3000 }
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: `macOS notification failed: ${err.message}` };
    }
  }
}

/**
 * Send notification on Linux using notify-send
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {boolean} playSound - Whether to play a sound
 * @returns {{success: boolean, error?: string}}
 */
function notifyLinux(title, message, playSound) {
  const escapedTitle = escapeShell(title);
  const escapedMessage = escapeShell(message);

  try {
    // notify-send is standard on most Linux distros with desktop environments
    exec(
      `notify-send "${escapedTitle}" "${escapedMessage}" --urgency=normal --expire-time=5000`,
      { timeout: 3000 }
    );

    // Play sound if requested (paplay for PulseAudio, aplay for ALSA)
    if (playSound) {
      exec('paplay /usr/share/sounds/freedesktop/stereo/message.oga 2>/dev/null || aplay /usr/share/sounds/freedesktop/stereo/message.oga 2>/dev/null || true', { timeout: 2000 });
    }

    return { success: true };
  } catch {
    // Try zenity as fallback (GTK)
    try {
      exec(
        `zenity --notification --text="${escapedTitle}: ${escapedMessage}"`,
        { timeout: 3000 }
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: `Linux notification failed: ${err.message}` };
    }
  }
}

/**
 * Send notification based on current platform
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {boolean} playSound - Whether to play a sound
 * @returns {{success: boolean, error?: string}}
 */
function sendPlatformNotification(title, message, playSound) {
  const platform = os.platform();

  switch (platform) {
    case 'win32':
      return notifyWindows(title, message, playSound);
    case 'darwin':
      return notifyMacOS(title, message, playSound);
    case 'linux':
      return notifyLinux(title, message, playSound);
    default:
      return { success: false, error: `Unsupported platform: ${platform}` };
  }
}

/**
 * Show blocking dialog on Windows (requires user to click OK)
 * Uses start command to launch PowerShell MessageBox in independent process
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @returns {{success: boolean, error?: string}}
 */
function showDialogWindows(title, message) {
  // Escape for PowerShell string (single quotes)
  const escapedTitle = title.replace(/'/g, "''");
  const escapedMessage = message.replace(/'/g, "''");

  try {
    // Use 'start' to launch PowerShell in a completely independent process
    // -WindowStyle Hidden hides the PowerShell console window
    // The script shows MessageBox then exits
    const child = spawn('cmd', [
      '/c',
      'start',
      '""',  // Empty title for start command
      '/b',  // Don't create new window for cmd
      'powershell',
      '-NoProfile',
      '-WindowStyle', 'Hidden',
      '-Command',
      `Add-Type -AssemblyName System.Windows.Forms; [void][System.Windows.Forms.MessageBox]::Show('${escapedMessage}', '${escapedTitle}', 'OK', 'Information'); exit`
    ], {
      detached: true,
      stdio: 'ignore',
      shell: false
    });
    child.unref();
    return { success: true };
  } catch (err) {
    return { success: false, error: `Windows dialog failed: ${err.message}` };
  }
}

/**
 * Show blocking dialog on macOS (requires user to click OK)
 * Uses detached spawn so dialog survives after hook exits
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @returns {{success: boolean, error?: string}}
 */
function showDialogMacOS(title, message) {
  const escapedTitle = escapeShell(title);
  const escapedMessage = escapeShell(message);

  try {
    const child = spawn('osascript', [
      '-e',
      `display dialog "${escapedMessage}" with title "${escapedTitle}" buttons {"OK"} default button "OK"`
    ], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
    return { success: true };
  } catch (err) {
    return { success: false, error: `macOS dialog failed: ${err.message}` };
  }
}

/**
 * Show blocking dialog on Linux (requires user to click OK)
 * Uses detached spawn so dialog survives after hook exits
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @returns {{success: boolean, error?: string}}
 */
function showDialogLinux(title, message) {
  const escapedTitle = escapeShell(title);
  const escapedMessage = escapeShell(message);

  try {
    // Try zenity (GTK)
    const child = spawn('zenity', [
      '--info',
      `--title=${escapedTitle}`,
      `--text=${escapedMessage}`
    ], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
    return { success: true };
  } catch (err) {
    // Fallback: try kdialog (KDE)
    try {
      const child = spawn('kdialog', [
        '--msgbox',
        escapedMessage,
        '--title',
        escapedTitle
      ], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
      return { success: true };
    } catch (err2) {
      return { success: false, error: `Linux dialog failed: ${err2.message}` };
    }
  }
}

/**
 * Show blocking dialog based on current platform
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @returns {{success: boolean, error?: string}}
 */
function showPlatformDialog(title, message) {
  const platform = os.platform();

  switch (platform) {
    case 'win32':
      return showDialogWindows(title, message);
    case 'darwin':
      return showDialogMacOS(title, message);
    case 'linux':
      return showDialogLinux(title, message);
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
    const playSound = env.DESKTOP_NOTIFICATION_SOUND === 'true';
    const hookType = input.hook_event_name || 'default';

    // Stop/AskUserPrompt: show blocking dialog so user won't miss it
    if (hookType === 'Stop' || hookType === 'AskUserPrompt') {
      return showPlatformDialog(title, message);
    }

    // Other events: show toast notification
    return sendPlatformNotification(title, message, playSound);
  },
};
