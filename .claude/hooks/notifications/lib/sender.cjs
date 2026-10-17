/**
 * HTTP sender with smart throttling
 * Uses native fetch (Node 18+) - zero dependencies
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const THROTTLE_FILE = path.join(os.tmpdir(), 'ck-noti-throttle.json');
const THROTTLE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
// Upper bound for one webhook request. A request that outlives it is abandoned for
// this alert only: a timeout is ambiguous (the channel may have accepted the alert),
// so it never starts the cooldown — only a real error (HTTP error status, refused
// connection, DNS or other network failure) pauses the channel.
const REQUEST_TIMEOUT_MS = 2000;
// SessionEnd runs under a 3-second host hook budget (Claude settings and the Codex
// mirror). That budget counts from process start — including any in-process host
// launcher — so a SessionEnd request gets only what is left of it, minus a reserve
// for logging and exit, and never more than REQUEST_TIMEOUT_MS.
const SESSION_END_BUDGET_MS = 3000;
const SESSION_END_RESERVE_MS = 400;

/**
 * Load throttle state from temp file
 * @returns {Object} Provider -> last error timestamp map
 */
function loadThrottleState() {
  try {
    if (fs.existsSync(THROTTLE_FILE)) {
      const content = fs.readFileSync(THROTTLE_FILE, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    // Corrupted file - start fresh
    console.error(`[sender] Throttle file corrupted, resetting: ${err.message}`);
  }
  return {};
}

/**
 * Save throttle state to temp file
 * @param {Object} state - Provider -> timestamp map
 */
function saveThrottleState(state) {
  try {
    fs.writeFileSync(THROTTLE_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.error(`[sender] Failed to save throttle state: ${err.message}`);
  }
}

/**
 * Check if provider is currently throttled
 * @param {string} provider - Provider name
 * @returns {boolean} True if throttled
 */
function isThrottled(provider) {
  const state = loadThrottleState();
  const lastError = state[provider];

  if (!lastError) return false;

  const elapsed = Date.now() - lastError;
  return elapsed < THROTTLE_DURATION_MS;
}

/**
 * Record an error for throttling
 * @param {string} provider - Provider name
 */
function recordError(provider) {
  const state = loadThrottleState();
  state[provider] = Date.now();
  saveThrottleState(state);
}

/**
 * Clear throttle for a provider (on success)
 * @param {string} provider - Provider name
 */
function clearThrottle(provider) {
  const state = loadThrottleState();
  if (state[provider]) {
    delete state[provider];
    saveThrottleState(state);
  }
}

/**
 * Time one request may take for this event.
 * SessionEnd gets the rest of its hook budget measured from process start; every
 * other event gets the fixed request limit.
 * @param {string} [event] - Hook event name of the alert being sent
 * @param {number} [uptimeMs] - Time since this process started
 * @returns {number} Milliseconds allowed, never negative; 0 = no time left to send
 */
function requestTimeoutFor(event, uptimeMs = process.uptime() * 1000) {
  if (event !== 'SessionEnd') return REQUEST_TIMEOUT_MS;
  const remaining = Math.floor(SESSION_END_BUDGET_MS - SESSION_END_RESERVE_MS - uptimeMs);
  return Math.max(0, Math.min(REQUEST_TIMEOUT_MS, remaining));
}

/**
 * Send HTTP POST request with throttling
 * @param {string} provider - Provider name for throttling
 * @param {string} url - Target URL
 * @param {Object} body - JSON body to send
 * @param {Object} [options]
 * @param {Object} [options.headers] - Additional headers
 * @param {string} [options.event] - Hook event name of the alert (sets the request limit)
 * @returns {Promise<{success: boolean, error?: string, throttled?: boolean, timedOut?: boolean, skipped?: boolean}>}
 */
async function send(provider, url, body, { headers = {}, event } = {}) {
  // Check throttle first
  if (isThrottled(provider)) {
    return { success: false, throttled: true };
  }

  const timeoutMs = requestTimeoutFor(event);
  if (timeoutMs <= 0) {
    // Nothing left of the host hook budget: skip rather than be killed mid-request.
    // Not a channel failure, so no cooldown.
    const errorMsg = `skipped: no time left in the ${event} hook budget`;
    console.error(`[sender] ${provider} ${errorMsg}`);
    return { success: false, skipped: true, error: errorMsg };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      const errorMsg = `HTTP ${response.status}: ${errorText.slice(0, 100)}`;

      // Record error for throttling
      recordError(provider);
      console.error(`[sender] ${provider} failed: ${errorMsg}`);

      return { success: false, error: errorMsg };
    }

    // Success - clear any previous throttle
    clearThrottle(provider);
    return { success: true };

  } catch (err) {
    if (err && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      // Slow channel: abandon this alert only; later alerts are still attempted.
      const errorMsg = `request timed out after ${timeoutMs}ms`;
      console.error(`[sender] ${provider} ${errorMsg} (no cooldown)`);
      return { success: false, timedOut: true, error: errorMsg };
    }

    // Network error (refused, DNS, reset) - pause the channel like an HTTP error
    const errorMsg = err && err.message ? err.message : String(err);
    recordError(provider);
    console.error(`[sender] ${provider} network error: ${errorMsg}`);

    return { success: false, error: errorMsg };
  }
}

module.exports = {
  send,
  isThrottled,
  requestTimeoutFor,
  REQUEST_TIMEOUT_MS,
  SESSION_END_BUDGET_MS,
  SESSION_END_RESERVE_MS,
};
