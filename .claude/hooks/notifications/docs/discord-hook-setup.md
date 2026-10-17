# Discord Notification Hook Setup

## Quick Start (Unified System - Recommended)

The unified notification system routes to all configured providers.

### 1. Set Environment Variables

Add to `~/.claude/.env` (global) or `.claude/.env` (project):

```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxx/yyy
```

### 2. Enable in settings.json

Hooks are already configured in `.claude/settings.json`.

### 3. Test

```bash
echo '{"hook_event_name":"Stop","cwd":"'"$(pwd)"'","session_id":"test123"}' | \
  node .claude/hooks/notifications/notify.cjs
```

---

## Create Discord Webhook

1. Open your Discord server
2. Navigate to **Server Settings** → **Integrations** → **Webhooks**
3. Click **"New Webhook"**
4. Configure webhook:
    - **Name:** `Claude Code Bot` (or your preference)
    - **Channel:** Select your target notification channel
5. Click **"Copy Webhook URL"**
    - Format: `https://discord.com/api/webhooks/WEBHOOK_ID/WEBHOOK_TOKEN`

## Multiple Providers

The unified `notify.cjs` routes to all configured providers simultaneously. Set env vars for each provider you want to enable.

## Environment Variable Priority

1. `process.env` (highest)
2. `~/.claude/.env` (global)
3. `.claude/.env` (project, lowest)

## Security Best Practices

1. **Never commit secrets:** keep `.env`, `.env.*` and `.env.local` in `.gitignore`.
2. **Use environment variables:** never hardcode Discord credentials in scripts.
3. **Rotate credentials regularly** and revoke any that may have leaked.

## Reference

**Script Location:** `.claude/hooks/notifications/notify.cjs` (provider: `.claude/hooks/notifications/providers/discord.cjs`)

**Configuration File:** `~/.claude/.env` or `.claude/.env`

**Required Environment Variables:** `DISCORD_WEBHOOK_URL`

**Discord API Documentation:** https://discord.com/developers/docs/resources/webhook

**Claude Code Hooks:** https://docs.claude.com/claude-code/hooks
