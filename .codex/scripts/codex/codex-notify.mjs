#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import os from 'node:os';

const MAX_MESSAGE_LENGTH = 180;

async function readStdin() {
    if (process.stdin.isTTY) return '';

    const chunks = [];
    for await (const chunk of process.stdin) {
        chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf8').trim();
}

function parsePayload(raw) {
    if (!raw) return {};

    try {
        const payload = JSON.parse(raw);
        if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
            return payload;
        }
        return { raw };
    } catch {
        return { raw };
    }
}

function truncate(value, maxLength = MAX_MESSAGE_LENGTH) {
    const text = String(value || '')
        .replace(/\s+/g, ' ')
        .trim();
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 3)}...`;
}

function buildNotification(payload) {
    const eventType = payload.type || payload.event || payload.event_type || 'notification';
    const finalMessage = payload.last_agent_message || payload.message || payload.summary || payload.raw || 'Codex finished a task.';

    return {
        title: /complete|completed|finished|done/i.test(eventType) ? 'Codex task complete' : 'Codex notification',
        message: truncate(finalMessage)
    };
}

function runPowerShell(script) {
    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    const shell = process.env.SystemRoot ? `${process.env.SystemRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe` : 'powershell.exe';

    return spawnSync(shell, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded], {
        stdio: 'ignore',
        windowsHide: true
    });
}

function notifyWindows(title, message) {
    const title64 = Buffer.from(title, 'utf8').toString('base64');
    const message64 = Buffer.from(message, 'utf8').toString('base64');

    const script = `
$title = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${title64}'))
$message = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${message64}'))
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$icon = New-Object System.Windows.Forms.NotifyIcon
$icon.Icon = [System.Drawing.SystemIcons]::Information
$icon.Visible = $true
$icon.ShowBalloonTip(5000, $title, $message, [System.Windows.Forms.ToolTipIcon]::Info)
[Console]::Beep(880, 180)
Start-Sleep -Milliseconds 5200
$icon.Dispose()
`;

    return runPowerShell(script).status === 0;
}

function notifyMac(title, message) {
    const script = `display notification ${JSON.stringify(message)} with title ${JSON.stringify(title)}`;
    const result = spawnSync('osascript', ['-e', script], { stdio: 'ignore' });
    return result.status === 0;
}

function notifyLinux(title, message) {
    const result = spawnSync('notify-send', [title, message], { stdio: 'ignore' });
    return result.status === 0;
}

function ringBell() {
    process.stdout.write('\u0007');
}

const raw = process.argv[2] || (await readStdin());
const payload = parsePayload(raw);
const notification = buildNotification(payload);

if (process.env.CODEX_NOTIFY_DRY_RUN === '1') {
    console.log(JSON.stringify(notification));
    process.exit(0);
}

const platform = os.platform();
const delivered =
    (platform === 'win32' && notifyWindows(notification.title, notification.message)) ||
    (platform === 'darwin' && notifyMac(notification.title, notification.message)) ||
    (platform === 'linux' && notifyLinux(notification.title, notification.message));

if (!delivered) {
    ringBell();
}
