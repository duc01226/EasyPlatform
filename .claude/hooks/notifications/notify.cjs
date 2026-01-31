#!/usr/bin/env node
/**
 * Notification Router - Main entry point for hook notifications
 * Reads stdin JSON, routes to enabled providers
 *
 * Usage: echo '{"hook_event_name":"Stop"}' | node notify.cjs
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { loadEnv } = require('./lib/env-loader.cjs');
const { checkThrottle } = require('./lib/notification-throttle.cjs');

// Provider prefixes to check for enablement (remote providers)
const PROVIDER_PREFIXES = ['TELEGRAM', 'DISCORD', 'SLACK'];

// Providers that are enabled by default (local providers)
const DEFAULT_ENABLED_PROVIDERS = ['desktop', 'terminal-bell'];

/**
 * Read JSON from stdin
 * @returns {Promise<Object>} Parsed JSON input
 */
async function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';

    // Handle no stdin (empty pipe)
    if (process.stdin.isTTY) {
      resolve({});
      return;
    }

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => {
      if (!data.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        console.error(`[notify] Invalid JSON input: ${err.message}`);
        resolve({});
      }
    });
    process.stdin.on('error', err => {
      console.error(`[notify] Stdin error: ${err.message}`);
      resolve({});
    });

    // Timeout after 1 second (Claude Code sends input immediately)
    setTimeout(() => {
      console.error('[notify] Stdin timeout');
      resolve({});
    }, 1000);
  });
}

/**
 * Check if a provider has any env vars set
 * @param {string} prefix - Provider prefix (e.g., 'TELEGRAM')
 * @param {Object} env - Environment variables
 * @returns {boolean}
 */
function hasProviderEnv(prefix, env) {
  return Object.keys(env).some(key => key.startsWith(prefix + '_'));
}

/**
 * Load provider module if it exists
 * @param {string} providerName - Provider name (lowercase)
 * @returns {Object|null} Provider module or null
 */
function loadProvider(providerName) {
  const providerPath = path.join(__dirname, 'providers', `${providerName}.cjs`);

  try {
    if (fs.existsSync(providerPath)) {
      return require(providerPath);
    }
  } catch (err) {
    console.error(`[notify] Failed to load provider ${providerName}: ${err.message}`);
  }
  return null;
}

// WHITELIST: Only these events trigger notifications
// - Stop: Claude completed task (dialog)
// - idle_prompt: Claude waiting for user input (dialog)
// Everything else is blocked to prevent notification spam
const ALLOWED_EVENTS = ['Stop', 'idle_prompt', 'AskUserQuestion'];

// Events that bypass subagent filter (always notify even from subagent)
const ALWAYS_NOTIFY_EVENTS = ['Stop'];

/**
 * Check if this event is allowed to trigger notifications
 * WHITELIST approach: only Stop and idle_prompt are allowed
 * @param {Object} input - Hook input
 * @returns {boolean} True if allowed
 */
function isAllowedEvent(input) {
  const hookType = input.hook_event_name;
  const notificationType = input.notification_type;
  const toolName = input.tool_name;

  // Check if hook_event_name, notification_type, or tool_name is in whitelist
  return ALLOWED_EVENTS.includes(hookType) || ALLOWED_EVENTS.includes(notificationType) || ALLOWED_EVENTS.includes(toolName);
}

/**
 * Check if running in subagent context
 * Subagents should not trigger user-facing notifications (except Stop)
 * @param {Object} input - Hook input
 * @returns {boolean} True if subagent context
 */
function isSubagentContext(input) {
  // Check agent_type in input payload (only reliable method - no env vars set by subagent-init.cjs)
  return !!input.agent_type;
}

/**
 * Main notification router
 */
async function main() {
  try {
    // Read input from stdin
    const input = await readStdin();
    const hookType = input.hook_event_name;
    const notificationType = input.notification_type;

    // 1. WHITELIST CHECK: Only allow Stop and idle_prompt events
    // Everything else is blocked to prevent notification spam
    if (!isAllowedEvent(input)) {
      console.error(`[notify] Skipped: not in whitelist (${hookType || notificationType || 'unknown'})`);
      process.exit(0);
    }

    // 2. Subagent context filtering (skip non-critical notifications)
    if (isSubagentContext(input)) {
      if (!ALWAYS_NOTIFY_EVENTS.includes(hookType)) {
        console.error(`[notify] Skipped: subagent context (${hookType || notificationType})`);
        process.exit(0);
      }
    }

    // 3. Event-type throttling (prevent spam even in parent session)
    const eventKey = notificationType || hookType;
    if (checkThrottle(eventKey, input.session_id)) {
      console.error(`[notify] Throttled: ${eventKey} (cooldown active)`);
      process.exit(0);
    }

    // Load environment with cascade
    const cwd = input.cwd || process.cwd();
    const env = loadEnv(cwd);

    // Collect all providers to call
    const providersToCall = new Set();

    // Add env-configured providers (remote)
    for (const prefix of PROVIDER_PREFIXES) {
      if (hasProviderEnv(prefix, env)) {
        providersToCall.add(prefix.toLowerCase());
      }
    }

    // Add default-enabled providers (local)
    for (const providerName of DEFAULT_ENABLED_PROVIDERS) {
      providersToCall.add(providerName);
    }

    // Find and call enabled providers
    const results = [];

    for (const providerName of providersToCall) {
      const provider = loadProvider(providerName);

      if (!provider) {
        console.error(`[notify] Provider ${providerName} not found`);
        continue;
      }

      // Check if provider considers itself enabled
      if (typeof provider.isEnabled === 'function' && !provider.isEnabled(env)) {
        continue;
      }

      // Call provider
      try {
        const result = await provider.send(input, env);
        results.push({
          provider: provider.name || providerName,
          ...result,
        });

        if (result.success) {
          console.error(`[notify] ${providerName}: sent`);
        } else if (result.throttled) {
          console.error(`[notify] ${providerName}: throttled`);
        } else {
          console.error(`[notify] ${providerName}: failed - ${result.error}`);
        }
      } catch (err) {
        console.error(`[notify] ${providerName} error: ${err.message}`);
        results.push({
          provider: provider.name || providerName,
          success: false,
          error: err.message,
        });
      }
    }

    // Log summary if any providers ran
    if (results.length > 0) {
      const successful = results.filter(r => r.success).length;
      console.error(`[notify] Summary: ${successful}/${results.length} succeeded`);
    }

  } catch (err) {
    console.error(`[notify] Fatal error: ${err.message}`);
  }

  // Always exit 0 - never block Claude
  process.exit(0);
}

main();
