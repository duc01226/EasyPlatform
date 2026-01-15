# Claude Code Notifications - Windows Setup Guide

> **Status:** ✅ Fully Configured & Tested
> **Platform:** Windows (Git Bash/WSL/PowerShell compatible)
> **Last Updated:** 2026-01-15

## Executive Summary

EasyPlatform has a **layered notification system** configured to alert you when Claude Code needs input or completes tasks. The system uses **dual-channel notifications** (visual + audible) for maximum reliability.

**What's Already Configured:**
- ✅ Desktop notifications (Windows toast/dialog)
- ✅ Terminal bell (PowerShell SystemSounds)
- ✅ Event-specific notification types
- ✅ Remote providers (Telegram, Discord, Slack - optional)

**Trigger Events:**
- User input needed (`AskUserPrompt`) - **Blocking dialog**
- Task completion (`Stop`) - **Blocking dialog**
- Subagent completion (`SubagentStop`) - Toast notification
- Other events - Toast notification

---

## How It Works

### Architecture

```
Claude Code Event
    ↓
Notification Hook (.claude/settings.json)
    ↓
Router (notify.cjs)
    ↓ (parallel)
    ├─→ Desktop Provider → Windows Toast/Dialog
    └─→ Terminal Bell Provider → PowerShell SystemSound
```

### Notification Channels

| Channel | Type | Events | User Action Required |
|---------|------|--------|---------------------|
| **Desktop Dialog** | Visual (blocking) | AskUserPrompt, Stop | ✅ Click OK to dismiss |
| **Desktop Toast** | Visual (non-blocking) | SubagentStop, others | ❌ Auto-dismiss (5s) |
| **Terminal Bell** | Audible | All | ❌ None |

### Notification Mapping

| Hook Event | Desktop Behavior | Sound (Windows) | Description |
|------------|------------------|-----------------|-------------|
| `AskUserPrompt` | ⚠️ Blocking dialog | Question | Claude needs your input NOW |
| `Stop` | ⚠️ Blocking dialog | Asterisk (ding) | Session completed successfully |
| `SubagentStop` | 🔔 Toast notification | Asterisk (ding) | Specialized agent finished |
| Others | 🔔 Toast notification | Exclamation | Generic event |

---

## Configuration

### Current Setup (.claude/settings.json)

```json
{
  "hooks": {
    "Notification": [
      {
        "hooks": [
          {
            "command": "node \"%CLAUDE_PROJECT_DIR%\"/.claude/hooks/notifications/notify.cjs",
            "type": "command"
          }
        ]
      }
    ]
  }
}
```

### Environment Variables (Optional)

Create `.claude/hooks/notifications/.env` to customize behavior:

```bash
# Desktop notifications (enabled by default)
ENABLE_DESKTOP_NOTIFICATIONS=true  # or false to disable

# Terminal bell (enabled by default)
ENABLE_TERMINAL_BELL=true          # or false to disable

# Remote providers (disabled by default - require credentials)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

DISCORD_WEBHOOK_URL=your_webhook_url

SLACK_WEBHOOK_URL=your_webhook_url
```

**Default behavior (no .env file):**
- Desktop notifications: ✅ Enabled
- Terminal bell: ✅ Enabled
- Remote providers: ❌ Disabled

---

## Testing Notifications

### Manual Test Commands

```bash
# Test "Task Complete" notification (desktop dialog + sound)
echo '{"hook_event_name":"Stop","cwd":"D:/GitSources/EasyPlatform"}' | node .claude/hooks/notifications/notify.cjs

# Test "Input Needed" notification (desktop dialog + sound)
echo '{"hook_event_name":"AskUserPrompt","cwd":"D:/GitSources/EasyPlatform"}' | node .claude/hooks/notifications/notify.cjs

# Test "Subagent Complete" notification (toast + sound)
echo '{"hook_event_name":"SubagentStop","cwd":"D:/GitSources/EasyPlatform","agent_type":"debugger"}' | node .claude/hooks/notifications/notify.cjs
```

**Expected Output:**
```
[notify] desktop: sent
[notify] terminal-bell: sent
[notify] Summary: 2/2 succeeded
```

### PowerShell Sound Test (Direct)

```powershell
# Test different system sounds
[System.Media.SystemSounds]::Exclamation.Play()  # Generic
[System.Media.SystemSounds]::Asterisk.Play()     # Task complete
[System.Media.SystemSounds]::Question.Play()     # Input needed
[System.Media.SystemSounds]::Beep.Play()         # Simple beep
```

---

## Notification Providers

### 1. Desktop Provider (default)

**File:** `.claude/hooks/notifications/providers/desktop.cjs`

**Features:**
- Windows 10/11 toast notifications via BurntToast (if installed)
- Fallback to WinForms balloon notifications
- Blocking dialogs for critical events (AskUserPrompt, Stop)
- Focus restoration (returns focus to terminal after dialog)

**Windows Implementation:**
- Uses PowerShell script: `.claude/hooks/lib/notify-windows.ps1`
- Tries BurntToast module first (best UX, no focus stealing)
- Falls back to System.Windows.Forms.MessageBox (blocking)
- Falls back to NotifyIcon balloon (non-blocking)

**Optional Enhancement - Install BurntToast:**
```powershell
# Run as Administrator
Install-Module -Name BurntToast -Scope CurrentUser
```

### 2. Terminal Bell Provider (default)

**File:** `.claude/hooks/notifications/providers/terminal-bell.cjs`

**Features:**
- PowerShell SystemSounds for Windows (cross-platform Git Bash/WSL)
- Standard terminal bell (\a) for macOS/Linux
- Event-specific sounds (Question, Asterisk, Exclamation)
- Lightweight, no dependencies

**Sound Mapping:**
- `AskUserPrompt` → Question sound
- `Stop` → Asterisk sound (pleasant ding)
- `SubagentStop` → Asterisk sound
- Others → Exclamation sound

### 3. Remote Providers (optional)

**Telegram:** `.claude/hooks/notifications/providers/telegram.cjs`
**Discord:** `.claude/hooks/notifications/providers/discord.cjs`
**Slack:** `.claude/hooks/notifications/providers/slack.cjs`

**Setup:** See `.claude/hooks/notifications/.env.example` for configuration

---

## Troubleshooting

### Desktop Notifications Not Showing

| Issue | Cause | Solution |
|-------|-------|----------|
| No toast appears | Focus Assist enabled | Disable Windows Focus Assist (Settings > Focus Assist) |
| Dialog doesn't appear | PowerShell execution policy | Run: `Set-ExecutionPolicy RemoteSigned` (as admin) |
| No notification at all | Disabled in env | Check `ENABLE_DESKTOP_NOTIFICATIONS` is not `false` |
| BurntToast not working | Module not installed | Optional: `Install-Module BurntToast` |

### Terminal Bell Not Working

| Issue | Cause | Solution |
|-------|-------|----------|
| No sound in Git Bash | SystemSounds not available | Verify PowerShell is accessible: `powershell -Command "echo test"` |
| Permission denied | Execution policy | Run: `Set-ExecutionPolicy RemoteSigned` (as admin) |
| Disabled explicitly | Env variable set | Check `ENABLE_TERMINAL_BELL` is not `false` |

### General Hook Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Hook not firing | Settings not loaded | Restart Claude Code |
| JSON parse error | Invalid stdin format | Check hook command syntax in settings.json |
| Provider not found | File missing | Verify provider files exist in `providers/` directory |
| All notifications fail | Node.js error | Check Node.js version: `node --version` (requires v14+) |

### Verification Checklist

```bash
# 1. Check Node.js is available
node --version  # Should show v14+

# 2. Check PowerShell is available
powershell -Command "echo test"  # Should print "test"

# 3. Check notification router exists
ls -la .claude/hooks/notifications/notify.cjs

# 4. Check providers exist
ls -la .claude/hooks/notifications/providers/

# 5. Check PowerShell script exists
ls -la .claude/hooks/lib/notify-windows.ps1

# 6. Run manual test (see Testing section above)
echo '{"hook_event_name":"Stop","cwd":"'$(pwd)'"}' | node .claude/hooks/notifications/notify.cjs
```

---

## Security Considerations

⚠️ **Hook Security Notice**

Hooks run automatically with your current environment credentials. Malicious hook code can:
- Exfiltrate data
- Access file system
- Make network requests

**Best Practices:**
1. ✅ Review all hook code before use (especially third-party)
2. ✅ Verify GitHub repository authenticity (check commit history, stars)
3. ✅ Use official/verified hooks only
4. ✅ Test in isolated environment first
5. ❌ Never add untrusted hook code

**EasyPlatform Hooks:** All notification hooks in this project are:
- ✅ Developed in-house
- ✅ Version controlled
- ✅ Reviewed and tested
- ✅ No external network calls (except remote providers with explicit credentials)

---

## Remote Notifications Setup (Advanced)

For mobile/Slack notifications when away from computer:

### Option 1: Telegram Bot

1. Create bot: Talk to [@BotFather](https://t.me/botfather)
2. Get chat ID: Talk to [@userinfobot](https://t.me/userinfobot)
3. Configure `.claude/hooks/notifications/.env`:
   ```bash
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   TELEGRAM_CHAT_ID=your_chat_id_here
   ```

### Option 2: Discord Webhook

1. Server Settings → Integrations → Webhooks → New Webhook
2. Copy webhook URL
3. Configure `.env`:
   ```bash
   DISCORD_WEBHOOK_URL=your_webhook_url_here
   ```

### Option 3: Slack Webhook

1. Create Slack app: [api.slack.com/apps](https://api.slack.com/apps)
2. Enable Incoming Webhooks
3. Configure `.env`:
   ```bash
   SLACK_WEBHOOK_URL=your_webhook_url_here
   ```

### Option 4: ntfy.sh (Universal Push)

For cross-platform push to mobile/desktop/Slack:

```bash
# Install ntfy CLI
curl -sSL https://ntfy.sh/install | sh

# Add to .claude/settings.json
{
  "hooks": {
    "Notification": [
      {
        "hooks": [
          {
            "command": "node \"%CLAUDE_PROJECT_DIR%\"/.claude/hooks/notifications/notify.cjs",
            "type": "command"
          },
          {
            "command": "curl -d 'Claude needs input' ntfy.sh/your-unique-topic",
            "type": "command"
          }
        ]
      }
    ]
  }
}
```

Then subscribe to `your-unique-topic` in ntfy mobile app.

**Reference:** [andrewford.co.nz/articles/claude-code-instant-notifications-ntfy](https://andrewford.co.nz/articles/claude-code-instant-notifications-ntfy/)

---

## Customization Examples

### Disable All Notifications

Create `.claude/hooks/notifications/.env`:
```bash
ENABLE_DESKTOP_NOTIFICATIONS=false
ENABLE_TERMINAL_BELL=false
```

### Desktop Only (No Sound)

```bash
ENABLE_DESKTOP_NOTIFICATIONS=true
ENABLE_TERMINAL_BELL=false
```

### Sound Only (No Visual)

```bash
ENABLE_DESKTOP_NOTIFICATIONS=false
ENABLE_TERMINAL_BELL=true
```

### Add Custom SessionEnd Sound

Edit `.claude/settings.json`:
```json
{
  "hooks": {
    "SessionEnd": [
      {
        "hooks": [
          {
            "command": "powershell -Command \"[System.Media.SystemSounds]::Asterisk.Play()\"",
            "type": "command"
          },
          {
            "command": "node \"%CLAUDE_PROJECT_DIR%\"/.claude/hooks/session-end.cjs",
            "type": "command"
          }
        ],
        "matcher": "clear|exit|compact"
      }
    ]
  }
}
```

---

## Related Documentation

- [Official Hooks Guide](https://code.claude.com/docs/en/hooks-guide)
- [Claude Code Notification Hooks - kane.mx](https://kane.mx/posts/2025/claude-code-notification-hooks/)
- [Terminal Notifications - BigBear Community](https://community.bigbeartechworld.com/t/supercharge-your-workflow-with-terminal-bell-notifications-in-claude-code/5023)
- [Claude Code FAQ - ClaudeLog](https://claudelog.com/faqs/how-to-enable-claude-code-notifications/)

---

## FAQ

**Q: Do notifications work when Claude Code is minimized?**
A: Yes. Blocking dialogs will force the window to foreground. Toast notifications appear in Windows Action Center.

**Q: Can I customize notification sounds?**
A: Yes. Edit `.claude/hooks/notifications/providers/terminal-bell.cjs` and change the `soundMap` object (line 49-54).

**Q: Do I need BurntToast module?**
A: No. It's optional. The system falls back to WinForms notifications if BurntToast isn't installed.

**Q: Will notifications block Claude's execution?**
A: No. The notification hook always exits with code 0 and never blocks Claude Code. Dialogs block **you** (user must click OK), but not the agent.

**Q: Can I get notifications on my phone?**
A: Yes. Use remote providers (Telegram, Discord, Slack) or ntfy.sh for push notifications.

**Q: How do I disable notifications temporarily?**
A: Create `.claude/hooks/notifications/.env` with `ENABLE_DESKTOP_NOTIFICATIONS=false` and `ENABLE_TERMINAL_BELL=false`.

**Q: Are notifications secure?**
A: Yes, local notifications (desktop, bell) don't send data externally. Remote providers only send when you configure credentials explicitly.

---

## Next Steps

### Recommended Actions

1. ✅ **Test notifications now** - Run the manual test commands above
2. ⚠️ **Install BurntToast** (optional) - Better toast UX:
   ```powershell
   Install-Module -Name BurntToast -Scope CurrentUser
   ```
3. 📱 **Setup remote notifications** (optional) - Configure Telegram/Discord/Slack for mobile alerts
4. 🔧 **Customize sounds** (optional) - Edit `terminal-bell.cjs` to change system sounds

### Monitoring Effectiveness

Over the next few days, observe:
- Are you noticing when Claude needs input?
- Do blocking dialogs interrupt your workflow appropriately?
- Is the dual-channel (visual + audible) approach working?

If notifications are too intrusive, consider:
- Disabling blocking dialogs (edit `desktop.cjs` line 206)
- Sound-only mode (`ENABLE_DESKTOP_NOTIFICATIONS=false`)
- Adjusting sound types in `terminal-bell.cjs`

---

**Status:** System is ready to use. No further action required unless customization desired.
