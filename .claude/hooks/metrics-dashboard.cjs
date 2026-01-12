#!/usr/bin/env node
'use strict';

/**
 * Hook Metrics Dashboard - Visual display of hook execution metrics
 *
 * Usage:
 *   node metrics-dashboard.cjs           # Show all metrics
 *   node metrics-dashboard.cjs --reset   # Reset all metrics
 *   node metrics-dashboard.cjs --watch   # Live refresh every 5s
 *   node metrics-dashboard.cjs --json    # Output as JSON
 *
 * @module metrics-dashboard
 */

const { getMetrics, resetMetrics, getHookMetrics } = require('./lib/hook-metrics-tracker.cjs');
const { METRICS_PATH, CK_TMP_DIR } = require('./lib/ck-paths.cjs');
const fs = require('fs');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m'
};

/**
 * Format a number with commas
 */
function formatNumber(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format duration in ms to human readable
 */
function formatDuration(ms) {
  if (ms === 0) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Get success rate color based on percentage
 */
function getSuccessColor(rate) {
  if (rate === 'N/A') return colors.dim;
  const pct = parseFloat(rate);
  if (pct >= 95) return colors.green;
  if (pct >= 80) return colors.yellow;
  return colors.red;
}

/**
 * Format relative time
 */
function formatRelativeTime(isoString) {
  if (!isoString) return 'Never';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

/**
 * Print header banner
 */
function printHeader() {
  console.log('');
  console.log(`${colors.bgBlue}${colors.white}${colors.bold}  HOOK METRICS DASHBOARD  ${colors.reset}`);
  console.log(`${colors.dim}  ClaudeKit Performance Tracker  ${colors.reset}`);
  console.log('');
}

/**
 * Print metrics table
 */
function printMetricsTable(metrics) {
  const hooks = Object.entries(metrics.hooks);

  if (hooks.length === 0) {
    console.log(`${colors.dim}  No metrics recorded yet.${colors.reset}`);
    console.log(`${colors.dim}  Run some hooks to start collecting data.${colors.reset}`);
    console.log('');
    return;
  }

  // Table header
  console.log(`${colors.bold}  ┌${'─'.repeat(30)}┬${'─'.repeat(8)}┬${'─'.repeat(10)}┬${'─'.repeat(8)}┬${'─'.repeat(8)}┬${'─'.repeat(12)}┐${colors.reset}`);
  console.log(`${colors.bold}  │ ${'Hook Name'.padEnd(28)} │ ${'Total'.padEnd(6)} │ ${'Success'.padEnd(8)} │ ${'p50'.padEnd(6)} │ ${'p99'.padEnd(6)} │ ${'Last Run'.padEnd(10)} │${colors.reset}`);
  console.log(`${colors.bold}  ├${'─'.repeat(30)}┼${'─'.repeat(8)}┼${'─'.repeat(10)}┼${'─'.repeat(8)}┼${'─'.repeat(8)}┼${'─'.repeat(12)}┤${colors.reset}`);

  // Sort by total executions (descending)
  hooks.sort((a, b) => b[1].total - a[1].total);

  for (const [name, stats] of hooks) {
    const successColor = getSuccessColor(stats.successRate);
    const shortName = name.length > 28 ? name.substring(0, 25) + '...' : name;

    console.log(
      `  │ ${colors.cyan}${shortName.padEnd(28)}${colors.reset} │ ` +
      `${formatNumber(stats.total).padStart(6)} │ ` +
      `${successColor}${stats.successRate.padStart(8)}${colors.reset} │ ` +
      `${formatDuration(stats.p50Ms).padStart(6)} │ ` +
      `${formatDuration(stats.p99Ms).padStart(6)} │ ` +
      `${colors.dim}${formatRelativeTime(stats.lastExecution).padStart(10)}${colors.reset} │`
    );
  }

  console.log(`${colors.bold}  └${'─'.repeat(30)}┴${'─'.repeat(8)}┴${'─'.repeat(10)}┴${'─'.repeat(8)}┴${'─'.repeat(8)}┴${'─'.repeat(12)}┘${colors.reset}`);
  console.log('');
}

/**
 * Print summary stats
 */
function printSummary(metrics) {
  const hooks = Object.values(metrics.hooks);
  if (hooks.length === 0) return;

  const totalExecutions = hooks.reduce((sum, h) => sum + h.total, 0);
  const totalFailures = hooks.reduce((sum, h) => sum + h.failureCount, 0);
  const avgSuccessRate = totalExecutions > 0
    ? (((totalExecutions - totalFailures) / totalExecutions) * 100).toFixed(1)
    : 'N/A';

  console.log(`${colors.bold}  Summary${colors.reset}`);
  console.log(`  ├─ Total Hooks: ${colors.cyan}${hooks.length}${colors.reset}`);
  console.log(`  ├─ Total Executions: ${colors.cyan}${formatNumber(totalExecutions)}${colors.reset}`);
  console.log(`  ├─ Overall Success Rate: ${getSuccessColor(avgSuccessRate + '%')}${avgSuccessRate}%${colors.reset}`);
  console.log(`  └─ Data Updated: ${colors.dim}${metrics.updated ? formatRelativeTime(metrics.updated) : 'Never'}${colors.reset}`);
  console.log('');
}

/**
 * Print storage info
 */
function printStorageInfo() {
  console.log(`${colors.dim}  Metrics stored at: ${METRICS_PATH}${colors.reset}`);
  try {
    if (fs.existsSync(METRICS_PATH)) {
      const stats = fs.statSync(METRICS_PATH);
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(`${colors.dim}  File size: ${sizeKB} KB${colors.reset}`);
    }
  } catch (err) {
    // Ignore
  }
  console.log('');
}

/**
 * Main dashboard display
 */
function displayDashboard() {
  console.clear();
  printHeader();

  const metrics = getMetrics();
  printMetricsTable(metrics);
  printSummary(metrics);
  printStorageInfo();
}

/**
 * Watch mode - refresh every 5 seconds
 */
function watchMode() {
  displayDashboard();
  console.log(`${colors.dim}  Press Ctrl+C to exit. Refreshing every 5s...${colors.reset}`);

  setInterval(() => {
    displayDashboard();
    console.log(`${colors.dim}  Press Ctrl+C to exit. Refreshing every 5s...${colors.reset}`);
  }, 5000);
}

// CLI interface
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
${colors.bold}Hook Metrics Dashboard${colors.reset}

Usage:
  node metrics-dashboard.cjs           Show all metrics
  node metrics-dashboard.cjs --reset   Reset all metrics
  node metrics-dashboard.cjs --watch   Live refresh every 5s
  node metrics-dashboard.cjs --json    Output as JSON
  node metrics-dashboard.cjs --help    Show this help

${colors.dim}Metrics are collected automatically by hooks that call trackHook().${colors.reset}
`);
} else if (args.includes('--reset')) {
  resetMetrics();
  console.log(`${colors.green}✓ Metrics reset successfully.${colors.reset}`);
} else if (args.includes('--json')) {
  console.log(JSON.stringify(getMetrics(), null, 2));
} else if (args.includes('--watch')) {
  watchMode();
} else {
  displayDashboard();
}
