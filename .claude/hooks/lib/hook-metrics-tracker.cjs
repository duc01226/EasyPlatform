#!/usr/bin/env node
'use strict';

/**
 * Hook Metrics Tracker - Track hook execution effectiveness
 *
 * Tracks:
 * - Hook execution counts (per hook type)
 * - Success/failure rates
 * - Execution duration (p50, p99)
 * - Session-level aggregates
 *
 * Usage:
 *   const { trackHook, getMetrics, resetMetrics } = require('./hook-metrics-tracker.cjs');
 *   trackHook('ace-event-emitter', { success: true, durationMs: 45 });
 *
 * @module hook-metrics-tracker
 */

const fs = require('fs');
const { METRICS_PATH, CK_TMP_DIR, ensureDir } = require('./ck-paths.cjs');

/**
 * Default metrics structure
 */
function defaultMetrics() {
  return {
    version: 1,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    hooks: {},
    sessions: {}
  };
}

/**
 * Default hook stats structure
 */
function defaultHookStats() {
  return {
    total: 0,
    success: 0,
    failure: 0,
    durations: [],  // Keep last 100 for percentile calculation
    lastExecution: null
  };
}

/**
 * Load metrics from file
 * @returns {Object} Metrics data
 */
function loadMetrics() {
  try {
    if (fs.existsSync(METRICS_PATH)) {
      const data = fs.readFileSync(METRICS_PATH, 'utf8');
      if (data.trim()) {
        return JSON.parse(data);
      }
    }
  } catch (err) {
    // Silent fail - return defaults
  }
  return defaultMetrics();
}

/**
 * Save metrics to file
 * @param {Object} metrics - Metrics data
 */
function saveMetrics(metrics) {
  try {
    ensureDir(CK_TMP_DIR);
    metrics.updated = new Date().toISOString();
    fs.writeFileSync(METRICS_PATH, JSON.stringify(metrics, null, 2));
  } catch (err) {
    // Silent fail
  }
}

/**
 * Calculate percentile from sorted array
 * @param {number[]} arr - Sorted array
 * @param {number} p - Percentile (0-100)
 * @returns {number} Percentile value
 */
function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * p / 100) - 1;
  return sorted[Math.max(0, idx)];
}

/**
 * Track a hook execution
 * @param {string} hookName - Name of the hook (e.g., 'ace-event-emitter')
 * @param {Object} options - Tracking options
 * @param {boolean} options.success - Whether execution succeeded
 * @param {number} [options.durationMs] - Execution duration in ms
 * @param {string} [options.sessionId] - Optional session ID for session-level tracking
 */
function trackHook(hookName, { success = true, durationMs = 0, sessionId = null } = {}) {
  const metrics = loadMetrics();

  // Initialize hook stats if needed
  if (!metrics.hooks[hookName]) {
    metrics.hooks[hookName] = defaultHookStats();
  }

  const hook = metrics.hooks[hookName];
  hook.total++;
  if (success) {
    hook.success++;
  } else {
    hook.failure++;
  }

  // Track duration (keep last 100)
  if (durationMs > 0) {
    hook.durations.push(durationMs);
    if (hook.durations.length > 100) {
      hook.durations = hook.durations.slice(-100);
    }
  }

  hook.lastExecution = new Date().toISOString();

  // Track session-level stats
  if (sessionId) {
    if (!metrics.sessions[sessionId]) {
      metrics.sessions[sessionId] = {
        started: new Date().toISOString(),
        hookCounts: {}
      };
    }
    const session = metrics.sessions[sessionId];
    session.hookCounts[hookName] = (session.hookCounts[hookName] || 0) + 1;
  }

  saveMetrics(metrics);
}

/**
 * Get metrics summary
 * @returns {Object} Metrics summary with percentiles
 */
function getMetrics() {
  const metrics = loadMetrics();
  const summary = {
    updated: metrics.updated,
    hooks: {}
  };

  for (const [name, stats] of Object.entries(metrics.hooks)) {
    summary.hooks[name] = {
      total: stats.total,
      successRate: stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) + '%' : 'N/A',
      failureCount: stats.failure,
      p50Ms: percentile(stats.durations, 50),
      p99Ms: percentile(stats.durations, 99),
      lastExecution: stats.lastExecution
    };
  }

  return summary;
}

/**
 * Get metrics for a specific hook
 * @param {string} hookName - Hook name
 * @returns {Object|null} Hook metrics or null
 */
function getHookMetrics(hookName) {
  const metrics = loadMetrics();
  const stats = metrics.hooks[hookName];
  if (!stats) return null;

  return {
    total: stats.total,
    success: stats.success,
    failure: stats.failure,
    successRate: stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) + '%' : 'N/A',
    p50Ms: percentile(stats.durations, 50),
    p99Ms: percentile(stats.durations, 99),
    avgMs: stats.durations.length > 0
      ? (stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length).toFixed(1)
      : 0,
    lastExecution: stats.lastExecution
  };
}

/**
 * Reset all metrics
 */
function resetMetrics() {
  saveMetrics(defaultMetrics());
}

/**
 * Prune old sessions (keep last 50)
 */
function pruneSessions() {
  const metrics = loadMetrics();
  const sessionIds = Object.keys(metrics.sessions);

  if (sessionIds.length > 50) {
    // Sort by started date, keep newest 50
    const sorted = sessionIds.sort((a, b) => {
      const aDate = metrics.sessions[a].started;
      const bDate = metrics.sessions[b].started;
      return new Date(bDate) - new Date(aDate);
    });

    const toKeep = new Set(sorted.slice(0, 50));
    for (const id of sessionIds) {
      if (!toKeep.has(id)) {
        delete metrics.sessions[id];
      }
    }

    saveMetrics(metrics);
  }
}

// CLI interface for viewing metrics
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--reset')) {
    resetMetrics();
    console.log('Metrics reset.');
  } else if (args.includes('--prune')) {
    pruneSessions();
    console.log('Sessions pruned.');
  } else {
    const metrics = getMetrics();
    console.log(JSON.stringify(metrics, null, 2));
  }
}

module.exports = {
  trackHook,
  getMetrics,
  getHookMetrics,
  resetMetrics,
  pruneSessions
};
