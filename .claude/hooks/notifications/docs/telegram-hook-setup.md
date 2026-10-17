# Telegram Notification Hook Setup

## Quick Start (Unified System - Recommended)

The new unified notification system routes to all configured providers automatically.

### 1. Set Environment Variables

Add to `~/.claude/.env` (global) or `.claude/.env` (project):

```env
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### 2. Enable in settings.json

Hooks are already configured in `.claude/settings.json`. The unified system sends SessionEnd, Stop, AskUserQuestion, AskUserPrompt, idle_prompt and permission_prompt events (`EVENT_WHITELIST` in `notify.cjs`); every other event, including SubagentStop, is skipped. No session-ended alert is sent for a subagent's end, a conversation reset (`/clear`), or a session of unknown kind (the OpenCode bridge without session metadata). A failed request (HTTP error status, refused connection, DNS or network error) pauses the channel for 5 minutes; a request slower than 2 s (less when the session is ending and its hook time is nearly used) is abandoned for that alert only and pauses nothing.

### 3. Test

```bash
echo '{"hook_event_name":"Stop","cwd":"'"$(pwd)"'","session_id":"test123"}' | \
  node .claude/hooks/notifications/notify.cjs
```

---

## Create Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot` command
3. Follow the prompts:

    ```
    BotFather: Alright, a new bot. How are we going to call it?
    You: Claude Code Notifier

    BotFather: Good. Now let's choose a username for your bot.
    You: claudecode_notifier_bot
    ```

4. BotFather will respond with your bot token:
    ```
    Done! Congratulations on your new bot...
    Use this token to access the HTTP API:
    123456789:ABCdefGHIjklMNOpqrsTUVwxyz
    ```
5. **Copy and save the bot token** (format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

## Get Chat ID

You need a chat ID to specify where notifications should be sent.

### Option A: Direct Message (Personal Notifications)

1. Search for your bot in Telegram (use the username you created)
2. Click **"Start"** or send any message to your bot
3. Open this URL in your browser (replace `<YOUR_BOT_TOKEN>`):
    ```
    https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
    ```
4. Look for the `"chat"` object in the JSON response:
    ```json
    {
        "ok": true,
        "result": [
            {
                "update_id": 123456789,
                "message": {
                    "chat": {
                        "id": 987654321,
                        "first_name": "Your Name",
                        "type": "private"
                    }
                }
            }
        ]
    }
    ```
5. Copy the chat ID (e.g., `987654321`)

### Option B: Group Chat (Team Notifications)

1. Create a new Telegram group or use existing one
2. Add your bot to the group:
    - Click group name → "Add Members"
    - Search for your bot username
    - Add the bot
3. Send a message in the group mentioning the bot:
    ```
    @your_bot_username Hello!
    ```
4. Open this URL in your browser:
    ```
    https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
    ```
5. Look for the `"chat"` object with `"type": "group"` or `"type": "supergroup"`:
    ```json
    {
        "ok": true,
        "result": [
            {
                "message": {
                    "chat": {
                        "id": -100123456789,
                        "title": "Dev Team",
                        "type": "supergroup"
                    }
                }
            }
        ]
    }
    ```
6. Copy the chat ID (negative number for groups, e.g., `-100123456789`)

**Quick Command to Get Chat ID:**

```bash
curl -s "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates" | jq '.result[-1].message.chat.id'
```

## Multiple Providers

The unified `notify.cjs` routes to all configured providers simultaneously. Set env vars for each provider you want to enable.

## Environment Variable Priority

1. `process.env` (highest)
2. `~/.claude/.env` (global)
3. `.claude/.env` (project, lowest)

## Security Best Practices

1. **Never commit secrets:** keep `.env`, `.env.*` and `.env.local` in `.gitignore`.
2. **Use environment variables:** never hardcode Telegram credentials in scripts.
3. **Rotate credentials regularly** and revoke any that may have leaked.

## Reference

**Script Location:** `.claude/hooks/notifications/notify.cjs` (provider: `.claude/hooks/notifications/providers/telegram.cjs`)

**Configuration File:** `~/.claude/.env` or `.claude/.env`

**Required Environment Variables:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`

**Telegram API Documentation:** https://core.telegram.org/bots/api

**Claude Code Hooks:** https://docs.claude.com/claude-code/hooks
