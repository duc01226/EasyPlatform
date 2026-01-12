/**
 * Notification System Tests
 * Tests for the notification hook router and providers
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { runHook, getHookPath } = require('../lib/hook-runner.cjs');
const {
  assertTrue,
  assertFalse,
  assertEqual,
  assertContains
} = require('../lib/assertions.cjs');

// ============================================================================
// Test Configuration
// ============================================================================

const HOOKS_DIR = path.resolve(__dirname, '..', '..');
const NOTIFY_SCRIPT = path.join(HOOKS_DIR, 'notifications', 'notify.cjs');
const DISCORD_PROVIDER = path.join(HOOKS_DIR, 'notifications', 'providers', 'discord.cjs');
const TELEGRAM_PROVIDER = path.join(HOOKS_DIR, 'notifications', 'providers', 'telegram.cjs');
const SLACK_PROVIDER = path.join(HOOKS_DIR, 'notifications', 'providers', 'slack.cjs');
const DESKTOP_PROVIDER = path.join(HOOKS_DIR, 'notifications', 'providers', 'desktop.cjs');
const SENDER_LIB = path.join(HOOKS_DIR, 'notifications', 'lib', 'sender.cjs');
const ENV_LOADER_LIB = path.join(HOOKS_DIR, 'notifications', 'lib', 'env-loader.cjs');

// ============================================================================
// File Existence Tests
// ============================================================================

const fileExistenceTests = [
  {
    name: '[notification] notify.cjs router exists',
    fn: () => {
      assertTrue(fs.existsSync(NOTIFY_SCRIPT), `Router not found: ${NOTIFY_SCRIPT}`);
    }
  },
  {
    name: '[notification] discord.cjs provider exists',
    fn: () => {
      assertTrue(fs.existsSync(DISCORD_PROVIDER), `Provider not found: ${DISCORD_PROVIDER}`);
    }
  },
  {
    name: '[notification] telegram.cjs provider exists',
    fn: () => {
      assertTrue(fs.existsSync(TELEGRAM_PROVIDER), `Provider not found: ${TELEGRAM_PROVIDER}`);
    }
  },
  {
    name: '[notification] slack.cjs provider exists',
    fn: () => {
      assertTrue(fs.existsSync(SLACK_PROVIDER), `Provider not found: ${SLACK_PROVIDER}`);
    }
  },
  {
    name: '[notification] sender.cjs lib exists',
    fn: () => {
      assertTrue(fs.existsSync(SENDER_LIB), `Lib not found: ${SENDER_LIB}`);
    }
  },
  {
    name: '[notification] env-loader.cjs lib exists',
    fn: () => {
      assertTrue(fs.existsSync(ENV_LOADER_LIB), `Lib not found: ${ENV_LOADER_LIB}`);
    }
  },
  {
    name: '[notification] desktop.cjs provider exists',
    fn: () => {
      assertTrue(fs.existsSync(DESKTOP_PROVIDER), `Provider not found: ${DESKTOP_PROVIDER}`);
    }
  }
];

// ============================================================================
// Provider Module Structure Tests
// ============================================================================

const providerModuleTests = [
  {
    name: '[notification] discord provider has required exports',
    fn: () => {
      const provider = require(DISCORD_PROVIDER);
      assertTrue(typeof provider.name === 'string', 'discord.name must be string');
      assertTrue(typeof provider.isEnabled === 'function', 'discord.isEnabled must be function');
      assertTrue(typeof provider.send === 'function', 'discord.send must be function');
    }
  },
  {
    name: '[notification] telegram provider has required exports',
    fn: () => {
      const provider = require(TELEGRAM_PROVIDER);
      assertTrue(typeof provider.name === 'string', 'telegram.name must be string');
      assertTrue(typeof provider.isEnabled === 'function', 'telegram.isEnabled must be function');
      assertTrue(typeof provider.send === 'function', 'telegram.send must be function');
    }
  },
  {
    name: '[notification] slack provider has required exports',
    fn: () => {
      const provider = require(SLACK_PROVIDER);
      assertTrue(typeof provider.name === 'string', 'slack.name must be string');
      assertTrue(typeof provider.isEnabled === 'function', 'slack.isEnabled must be function');
      assertTrue(typeof provider.send === 'function', 'slack.send must be function');
    }
  },
  {
    name: '[notification] desktop provider has required exports',
    fn: () => {
      const provider = require(DESKTOP_PROVIDER);
      assertTrue(typeof provider.name === 'string', 'desktop.name must be string');
      assertTrue(typeof provider.isEnabled === 'function', 'desktop.isEnabled must be function');
      assertTrue(typeof provider.send === 'function', 'desktop.send must be function');
    }
  }
];

// ============================================================================
// Provider Enablement Tests
// ============================================================================

const providerEnablementTests = [
  {
    name: '[notification] discord isEnabled false without DISCORD_WEBHOOK_URL',
    fn: () => {
      // Clear cache to get fresh module
      delete require.cache[require.resolve(DISCORD_PROVIDER)];
      const provider = require(DISCORD_PROVIDER);
      assertFalse(provider.isEnabled({}), 'Should be disabled without URL');
    }
  },
  {
    name: '[notification] discord isEnabled true with DISCORD_WEBHOOK_URL',
    fn: () => {
      delete require.cache[require.resolve(DISCORD_PROVIDER)];
      const provider = require(DISCORD_PROVIDER);
      assertTrue(
        provider.isEnabled({ DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/test' }),
        'Should be enabled with URL'
      );
    }
  },
  {
    name: '[notification] telegram isEnabled false without both tokens',
    fn: () => {
      delete require.cache[require.resolve(TELEGRAM_PROVIDER)];
      const provider = require(TELEGRAM_PROVIDER);
      assertFalse(provider.isEnabled({}), 'Should be disabled without tokens');
      assertFalse(provider.isEnabled({ TELEGRAM_BOT_TOKEN: 'token' }), 'Should be disabled with only token');
      assertFalse(provider.isEnabled({ TELEGRAM_CHAT_ID: 'chat' }), 'Should be disabled with only chat');
    }
  },
  {
    name: '[notification] telegram isEnabled true with both tokens',
    fn: () => {
      delete require.cache[require.resolve(TELEGRAM_PROVIDER)];
      const provider = require(TELEGRAM_PROVIDER);
      assertTrue(
        provider.isEnabled({ TELEGRAM_BOT_TOKEN: 'token', TELEGRAM_CHAT_ID: 'chat' }),
        'Should be enabled with both tokens'
      );
    }
  },
  {
    name: '[notification] slack isEnabled false without SLACK_WEBHOOK_URL',
    fn: () => {
      delete require.cache[require.resolve(SLACK_PROVIDER)];
      const provider = require(SLACK_PROVIDER);
      assertFalse(provider.isEnabled({}), 'Should be disabled without URL');
    }
  },
  {
    name: '[notification] slack isEnabled true with SLACK_WEBHOOK_URL',
    fn: () => {
      delete require.cache[require.resolve(SLACK_PROVIDER)];
      const provider = require(SLACK_PROVIDER);
      assertTrue(
        provider.isEnabled({ SLACK_WEBHOOK_URL: 'https://hooks.slack.com/test' }),
        'Should be enabled with URL'
      );
    }
  },
  {
    name: '[notification] desktop isEnabled true by default (no env)',
    fn: () => {
      delete require.cache[require.resolve(DESKTOP_PROVIDER)];
      const provider = require(DESKTOP_PROVIDER);
      assertTrue(provider.isEnabled({}), 'Should be enabled by default');
    }
  },
  {
    name: '[notification] desktop isEnabled true with explicit true',
    fn: () => {
      delete require.cache[require.resolve(DESKTOP_PROVIDER)];
      const provider = require(DESKTOP_PROVIDER);
      assertTrue(
        provider.isEnabled({ ENABLE_DESKTOP_NOTIFICATIONS: 'true' }),
        'Should be enabled with explicit true'
      );
    }
  },
  {
    name: '[notification] desktop isEnabled false with explicit false',
    fn: () => {
      delete require.cache[require.resolve(DESKTOP_PROVIDER)];
      const provider = require(DESKTOP_PROVIDER);
      assertFalse(
        provider.isEnabled({ ENABLE_DESKTOP_NOTIFICATIONS: 'false' }),
        'Should be disabled with explicit false'
      );
    }
  }
];

// ============================================================================
// Router Execution Tests
// ============================================================================

const routerExecutionTests = [
  {
    name: '[notification] router exits with code 0 on empty input',
    fn: async () => {
      const result = await runHook(NOTIFY_SCRIPT, undefined, { timeout: 5000 });
      assertEqual(result.code, 0, 'Should exit cleanly on empty input');
    }
  },
  {
    name: '[notification] router exits with code 0 on valid JSON without providers',
    fn: async () => {
      const input = { hook_event_name: 'Stop', cwd: '/test', session_id: 'test123' };
      const result = await runHook(NOTIFY_SCRIPT, input, { timeout: 5000 });
      assertEqual(result.code, 0, 'Should exit cleanly on valid JSON');
    }
  },
  {
    name: '[notification] router handles Stop event without error',
    fn: async () => {
      const input = { hook_event_name: 'Stop', cwd: '/test/project', session_id: 'abc123def456' };
      const result = await runHook(NOTIFY_SCRIPT, input, { timeout: 5000 });
      assertEqual(result.code, 0, 'Should handle Stop event');
    }
  },
  {
    name: '[notification] router handles SubagentStop event',
    fn: async () => {
      const input = { hook_event_name: 'SubagentStop', cwd: '/test', session_id: 'test', agent_type: 'scout' };
      const result = await runHook(NOTIFY_SCRIPT, input, { timeout: 5000 });
      assertEqual(result.code, 0, 'Should handle SubagentStop event');
    }
  },
  {
    name: '[notification] router handles AskUserPrompt event',
    fn: async () => {
      const input = { hook_event_name: 'AskUserPrompt', cwd: '/test', session_id: 'test123' };
      const result = await runHook(NOTIFY_SCRIPT, input, { timeout: 5000 });
      assertEqual(result.code, 0, 'Should handle AskUserPrompt event');
    }
  },
  {
    name: '[notification] router handles unknown event gracefully',
    fn: async () => {
      const input = { hook_event_name: 'UnknownEvent', cwd: '/test', session_id: 'test' };
      const result = await runHook(NOTIFY_SCRIPT, input, { timeout: 5000 });
      assertEqual(result.code, 0, 'Should handle unknown event');
    }
  }
];

// ============================================================================
// Sender & Lib Tests
// ============================================================================

const libTests = [
  {
    name: '[notification] sender module exports required functions',
    fn: () => {
      const sender = require(SENDER_LIB);
      assertTrue(typeof sender.send === 'function', 'sender.send must be function');
      assertTrue(typeof sender.isThrottled === 'function', 'sender.isThrottled must be function');
    }
  },
  {
    name: '[notification] isThrottled returns false for unknown provider',
    fn: () => {
      delete require.cache[require.resolve(SENDER_LIB)];
      const sender = require(SENDER_LIB);
      const result = sender.isThrottled('unknown-provider-' + Date.now());
      assertFalse(result, 'Unknown provider should not be throttled');
    }
  },
  {
    name: '[notification] env-loader exports loadEnv function',
    fn: () => {
      const envLoader = require(ENV_LOADER_LIB);
      assertTrue(typeof envLoader.loadEnv === 'function', 'loadEnv must be function');
    }
  },
  {
    name: '[notification] loadEnv returns object',
    fn: () => {
      delete require.cache[require.resolve(ENV_LOADER_LIB)];
      const envLoader = require(ENV_LOADER_LIB);
      const result = envLoader.loadEnv(process.cwd());
      assertTrue(typeof result === 'object' && result !== null, 'loadEnv must return object');
    }
  }
];

// ============================================================================
// Event Color Configuration Tests
// ============================================================================

const eventConfigTests = [
  {
    name: '[notification] discord Stop event has green color',
    fn: () => {
      const content = fs.readFileSync(DISCORD_PROVIDER, 'utf8');
      assertContains(content, '5763719', 'Stop should have green color (5763719)');
    }
  },
  {
    name: '[notification] discord SubagentStop event has blue color',
    fn: () => {
      const content = fs.readFileSync(DISCORD_PROVIDER, 'utf8');
      assertContains(content, '3447003', 'SubagentStop should have blue color (3447003)');
    }
  },
  {
    name: '[notification] discord AskUserPrompt event has yellow color',
    fn: () => {
      const content = fs.readFileSync(DISCORD_PROVIDER, 'utf8');
      assertContains(content, '15844367', 'AskUserPrompt should have yellow color (15844367)');
    }
  }
];

// ============================================================================
// Desktop Provider Behavior Tests
// ============================================================================

const desktopBehaviorTests = [
  {
    name: '[notification] desktop provider has showDialogWindows function',
    fn: () => {
      const content = fs.readFileSync(DESKTOP_PROVIDER, 'utf8');
      assertContains(content, 'function showDialogWindows', 'Should have showDialogWindows function');
    }
  },
  {
    name: '[notification] desktop provider has showDialogMacOS function',
    fn: () => {
      const content = fs.readFileSync(DESKTOP_PROVIDER, 'utf8');
      assertContains(content, 'function showDialogMacOS', 'Should have showDialogMacOS function');
    }
  },
  {
    name: '[notification] desktop provider has showDialogLinux function',
    fn: () => {
      const content = fs.readFileSync(DESKTOP_PROVIDER, 'utf8');
      assertContains(content, 'function showDialogLinux', 'Should have showDialogLinux function');
    }
  },
  {
    name: '[notification] desktop provider has showPlatformDialog function',
    fn: () => {
      const content = fs.readFileSync(DESKTOP_PROVIDER, 'utf8');
      assertContains(content, 'function showPlatformDialog', 'Should have showPlatformDialog function');
    }
  },
  {
    name: '[notification] desktop Stop event triggers dialog',
    fn: () => {
      const content = fs.readFileSync(DESKTOP_PROVIDER, 'utf8');
      // Check that Stop event uses showPlatformDialog
      assertContains(content, "hookType === 'Stop'", 'Should check for Stop event');
      assertContains(content, 'showPlatformDialog', 'Should use showPlatformDialog for dialog events');
    }
  },
  {
    name: '[notification] desktop AskUserPrompt event triggers dialog',
    fn: () => {
      const content = fs.readFileSync(DESKTOP_PROVIDER, 'utf8');
      // Check that AskUserPrompt event uses showPlatformDialog
      assertContains(content, "hookType === 'AskUserPrompt'", 'Should check for AskUserPrompt event');
    }
  },
  {
    name: '[notification] desktop SubagentStop event triggers toast (not dialog)',
    fn: () => {
      const content = fs.readFileSync(DESKTOP_PROVIDER, 'utf8');
      // The dialog condition should only include Stop and AskUserPrompt, not SubagentStop
      // Check that the dialog condition line doesn't contain SubagentStop
      const dialogConditionMatch = content.match(/if\s*\(hookType\s*===\s*'Stop'[^)]+\)/);
      assertTrue(dialogConditionMatch !== null, 'Should have dialog condition for Stop');
      assertFalse(
        dialogConditionMatch[0].includes('SubagentStop'),
        'SubagentStop should not be in dialog condition'
      );
    }
  },
  {
    name: '[notification] desktop Windows dialog uses PowerShell MessageBox',
    fn: () => {
      const content = fs.readFileSync(DESKTOP_PROVIDER, 'utf8');
      assertContains(content, 'System.Windows.Forms.MessageBox', 'Should use Windows.Forms MessageBox');
      assertContains(content, '-WindowStyle', 'Should hide PowerShell window');
    }
  },
  {
    name: '[notification] desktop macOS dialog uses osascript',
    fn: () => {
      const content = fs.readFileSync(DESKTOP_PROVIDER, 'utf8');
      assertContains(content, 'osascript', 'Should use osascript for macOS');
      assertContains(content, 'display dialog', 'Should use display dialog for macOS');
    }
  },
  {
    name: '[notification] desktop Linux dialog uses zenity',
    fn: () => {
      const content = fs.readFileSync(DESKTOP_PROVIDER, 'utf8');
      assertContains(content, 'zenity', 'Should use zenity for Linux');
    }
  }
];

// ============================================================================
// Settings Configuration Tests
// ============================================================================

const settingsTests = [
  {
    name: '[notification] settings.json has Notification hook configured',
    fn: () => {
      const settingsPath = path.join(HOOKS_DIR, '..', 'settings.json');
      assertTrue(fs.existsSync(settingsPath), 'settings.json must exist');

      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      assertTrue(settings.hooks && settings.hooks.Notification, 'Notification hook must be configured');
    }
  },
  {
    name: '[notification] Notification hook points to notify.cjs',
    fn: () => {
      const settingsPath = path.join(HOOKS_DIR, '..', 'settings.json');
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      const notifHook = settings.hooks?.Notification?.[0]?.hooks?.[0];
      const command = notifHook?.command || '';

      assertContains(command, 'notifications/notify.cjs', 'Hook should point to notify.cjs');
    }
  }
];

// ============================================================================
// Export All Tests
// ============================================================================

module.exports = {
  name: 'Notification System Tests',
  tests: [
    ...fileExistenceTests,
    ...providerModuleTests,
    ...providerEnablementTests,
    ...routerExecutionTests,
    ...libTests,
    ...eventConfigTests,
    ...desktopBehaviorTests,
    ...settingsTests
  ]
};
