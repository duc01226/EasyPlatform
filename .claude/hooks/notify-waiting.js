#!/usr/bin/env node
/**
 * Claude Code Notification Hook (Cross-Platform)
 *
 * Sends a non-blocking notification when Claude is waiting for user input.
 * Supports Windows, macOS, and Linux.
 *
 * Hook Type: Notification
 * Trigger: When Claude is waiting for user input
 * Exit code: Always 0 (notifications are fire-and-forget)
 */

const { execSync, exec } = require('child_process');
const os = require('os');

const TITLE = 'Claude Code';
const MESSAGE = 'Waiting for your input';

/**
 * Send notification on Windows using inline PowerShell
 * Uses Windows 10/11 notifications that work without focus
 */
function notifyWindows() {
    // Try BurntToast first (if installed)
    try {
        execSync(
            `powershell -NoProfile -Command "if (Get-Module -ListAvailable -Name BurntToast) { Import-Module BurntToast; New-BurntToastNotification -Text '${TITLE}', '${MESSAGE}'; exit 0 } else { exit 1 }"`,
            { stdio: 'inherit', timeout: 3000 }
        );
        return;
    } catch {
        // BurntToast not available
    }

    // Try System.Windows.Forms notification
    try {
        execSync(
            `powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $n = New-Object System.Windows.Forms.NotifyIcon; $n.Icon = [System.Drawing.SystemIcons]::Information; $n.BalloonTipIcon = 'Info'; $n.BalloonTipTitle = '${TITLE}'; $n.BalloonTipText = '${MESSAGE}'; $n.Visible = $true; $n.ShowBalloonTip(30000); Start-Sleep -Seconds 3; $n.Dispose()"`,
            { stdio: 'inherit', timeout: 5000 }
        );
        return;
    } catch {
        // Notification failed
    }

    // Final fallback: Beep
    try {
        execSync('powershell -NoProfile -Command "[console]::beep(800,300)"', {
            stdio: 'ignore',
            timeout: 1000
        });
    } catch {
        // All methods failed
    }
}

/**
 * Send notification on macOS
 */
function notifyMacOS() {
    try {
        // Use osascript for native macOS notifications
        exec(`osascript -e 'display notification "${MESSAGE}" with title "${TITLE}"'`, { timeout: 5000 });
    } catch {
        // Try terminal-notifier if available
        try {
            exec(`terminal-notifier -title "${TITLE}" -message "${MESSAGE}" -sound default`, { timeout: 5000 });
        } catch {
            // Silently ignore
        }
    }
}

/**
 * Send notification on Linux
 */
function notifyLinux() {
    try {
        // Try notify-send (common on most Linux distros)
        exec(`notify-send "${TITLE}" "${MESSAGE}" --urgency=normal`, { timeout: 5000 });
    } catch {
        // Try zenity as fallback
        try {
            exec(`zenity --notification --text="${TITLE}: ${MESSAGE}"`, { timeout: 5000 });
        } catch {
            // Silently ignore
        }
    }
}

/**
 * Main notification dispatcher
 */
function sendNotification() {
    const platform = os.platform();

    switch (platform) {
        case 'win32':
            notifyWindows();
            break;
        case 'darwin':
            notifyMacOS();
            break;
        case 'linux':
            notifyLinux();
            break;
        default:
            // Unknown platform - silently ignore
            break;
    }
}

// Execute notification
sendNotification();

// Always exit successfully
process.exit(0);
