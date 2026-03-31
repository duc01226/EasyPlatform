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

// Provider prefixes to check for enablement
const PROVIDER_PREFIXES = ['TELEGRAM', 'DISCORD', 'SLACK'];

// Whitelist: only these events trigger notifications (everything else is skipped)
// Stop = task complete, idle_prompt = Claude waiting for input
const EVENT_WHITELIST = ['Stop', 'idle_prompt'];

/**
 * Get the effective event type from input
 * @param {Object} input - Event data
 * @returns {string} Event type
 */
function getEventType(input) {
  return input.notification_type || input.hook_event_name || 'default';
}

/**
 * Check if event is allowed by whitelist
 * @param {Object} input - Event data
 * @returns {boolean} True if event is allowed
 */
function isWhitelisted(input) {
  const eventType = getEventType(input);
  return EVENT_WHITELIST.includes(eventType);
}

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

    // Timeout after 5 seconds (safety)
    setTimeout(() => {
      console.error('[notify] Stdin timeout');
      resolve({});
    }, 5000);
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

/**
 * Main notification router
 */
async function main() {
  try {
    // Read input from stdin
    const input = await readStdin();

    // Load environment with cascade
    const cwd = input.cwd || process.cwd();
    const env = loadEnv(cwd);

    // Whitelist check: only allow specific event types through
    if (!isWhitelisted(input)) {
      const eventType = getEventType(input);
      console.error(`[notify] Skipped: ${eventType} not in whitelist`);
      process.exit(0);
    }

    // Find and call enabled providers
    const results = [];

    // Always try desktop provider (enabled by default, no env prefix needed)
    const desktopProvider = loadProvider('desktop');
    if (desktopProvider && typeof desktopProvider.isEnabled === 'function' && desktopProvider.isEnabled(env)) {
      try {
        const result = await desktopProvider.send(input, env);
        results.push({ provider: 'desktop', ...result });
        if (result.success) {
          console.error('[notify] desktop: sent');
        }
      } catch (err) {
        console.error(`[notify] desktop error: ${err.message}`);
        results.push({ provider: 'desktop', success: false, error: err.message });
      }
    }

    // External providers (Telegram, Discord, Slack) - require env vars
    for (const prefix of PROVIDER_PREFIXES) {
      if (!hasProviderEnv(prefix, env)) continue;

      const providerName = prefix.toLowerCase();
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
