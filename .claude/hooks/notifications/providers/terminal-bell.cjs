/**
 * Terminal Bell notification provider
 * Sends audible bell notifications via terminal escape sequences
 * Works as a fallback/backup to desktop notifications
 *
 * Platform support:
 * - Windows: PowerShell SystemSounds (cross-platform Git Bash/WSL compatible)
 * - macOS/Linux: Standard terminal bell (BEL character \a)
 *
 * Enable with: ENABLE_TERMINAL_BELL=true (default: true)
 */
'use strict';

const { exec } = require('child_process');
const os = require('os');

/**
 * Send terminal bell on Windows using PowerShell SystemSounds
 * More reliable than \a in Git Bash/WSL environments
 * @param {string} soundType - Sound type (Exclamation, Asterisk, Question, Beep)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
function bellWindows(soundType = 'Exclamation') {
  return new Promise((resolve) => {
    const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "[System.Media.SystemSounds]::${soundType}.Play()"`;

    exec(cmd, { windowsHide: true, timeout: 2000 }, (err) => {
      resolve({ success: !err, error: err?.message });
    });
  });
}

/**
 * Send terminal bell on Unix-like systems (macOS, Linux)
 * Uses ASCII BEL character
 * @returns {{success: boolean}}
 */
function bellUnix() {
  // Write BEL character to stderr (more reliable than stdout)
  process.stderr.write('\x07');
  return { success: true };
}

/**
 * Send bell notification based on platform and event type
 * @param {string} hookType - Hook event type
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendBell(hookType) {
  const platform = os.platform();

  if (platform === 'win32') {
    // Different sounds for different event types
    const soundMap = {
      'AskUserPrompt': 'Question',      // User input needed - question sound
      'Stop': 'Asterisk',               // Task complete - pleasant ding
      'SubagentStop': 'Asterisk',       // Subagent complete - pleasant ding
      'default': 'Exclamation'          // Other events - neutral sound
    };
    const soundType = soundMap[hookType] || soundMap.default;
    return await bellWindows(soundType);
  }

  // macOS/Linux - simple bell
  return bellUnix();
}

module.exports = {
  name: 'terminal-bell',

  /**
   * Check if terminal bell provider is enabled
   * Enabled by default for local audible notifications
   * @param {Object} env - Environment variables
   * @returns {boolean} True if enabled
   */
  isEnabled: (env) => {
    // Explicit disable check
    if (env.ENABLE_TERMINAL_BELL === 'false') {
      return false;
    }
    // Enabled by default OR when explicitly set to true
    return env.ENABLE_TERMINAL_BELL === 'true' ||
           env.ENABLE_TERMINAL_BELL === undefined ||
           env.ENABLE_TERMINAL_BELL === '';
  },

  /**
   * Send terminal bell notification
   * @param {Object} input - Hook input (snake_case fields)
   * @param {Object} env - Environment variables
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  send: async (input, env) => {
    const hookType = input.hook_event_name || 'default';
    return sendBell(hookType);
  },
};
