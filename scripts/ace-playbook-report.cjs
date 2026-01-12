#!/usr/bin/env node
'use strict';

/**
 * ACE Playbook Effectiveness Report
 *
 * Displays statistics about the ACE playbook including:
 * - Active delta count and capacity
 * - Top deltas by confidence
 * - Effectiveness statistics
 * - Archive status
 *
 * Usage: node scripts/ace-playbook-report.cjs [--json]
 *
 * @module ace-playbook-report
 */

const fs = require('fs');
const path = require('path');

// Paths
const MEMORY_DIR = path.join(__dirname, '..', '.claude', 'memory');
const DELTAS_FILE = path.join(MEMORY_DIR, 'deltas.json');
const CANDIDATES_FILE = path.join(MEMORY_DIR, 'delta-candidates.json');
const ARCHIVE_DIR = path.join(MEMORY_DIR, 'archive');
const EVENTS_FILE = path.join(MEMORY_DIR, 'events-stream.jsonl');

const MAX_DELTAS = 50;

/**
 * Load JSON file safely
 * @param {string} filePath - Path to JSON file
 * @param {*} defaultValue - Default value if file doesn't exist
 * @returns {*} Parsed JSON or default
 */
function loadJson(filePath, defaultValue = []) {
  if (!fs.existsSync(filePath)) {
    return defaultValue;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return defaultValue;
  }
}

/**
 * Count lines in JSONL file
 * @param {string} filePath - Path to JSONL file
 * @returns {number} Line count
 */
function countLines(filePath) {
  if (!fs.existsSync(filePath)) {
    return 0;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf8').trim();
    return content ? content.split('\n').length : 0;
  } catch (e) {
    return 0;
  }
}

/**
 * Count archived deltas
 * @returns {number} Total archived deltas
 */
function countArchived() {
  if (!fs.existsSync(ARCHIVE_DIR)) {
    return 0;
  }

  let count = 0;
  const files = fs.readdirSync(ARCHIVE_DIR).filter(f => f.endsWith('.json'));

  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(ARCHIVE_DIR, file), 'utf8'));
      count += Array.isArray(data) ? data.length : 0;
    } catch (e) {
      // Skip invalid files
    }
  }

  return count;
}

/**
 * Generate report data
 * @returns {Object} Report data
 */
function generateReport() {
  const deltas = loadJson(DELTAS_FILE, []);
  const candidates = loadJson(CANDIDATES_FILE, []);
  const eventCount = countLines(EVENTS_FILE);
  const archivedCount = countArchived();

  // Calculate statistics
  const avgConfidence = deltas.length > 0
    ? deltas.reduce((s, d) => s + (d.confidence || 0), 0) / deltas.length
    : 0;

  const totalHelpful = deltas.reduce((s, d) => s + (d.helpful_count || 0), 0);
  const totalNotHelpful = deltas.reduce((s, d) => s + (d.not_helpful_count || 0), 0);
  const humanFeedback = deltas.reduce((s, d) => s + (d.human_feedback_count || 0), 0);

  // Sort by confidence for top deltas
  const topDeltas = [...deltas]
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
    .slice(0, 10);

  // Get skills breakdown
  const skillBreakdown = {};
  for (const delta of deltas) {
    const skill = delta.condition?.match(/\/(\w+)/)?.[1] || 'unknown';
    skillBreakdown[skill] = (skillBreakdown[skill] || 0) + 1;
  }

  return {
    summary: {
      active_deltas: deltas.length,
      max_deltas: MAX_DELTAS,
      capacity_used: `${Math.round((deltas.length / MAX_DELTAS) * 100)}%`,
      pending_candidates: candidates.length,
      total_events: eventCount,
      archived_deltas: archivedCount
    },
    statistics: {
      avg_confidence: `${(avgConfidence * 100).toFixed(1)}%`,
      total_helpful: totalHelpful,
      total_not_helpful: totalNotHelpful,
      human_feedback: humanFeedback,
      human_weight_applied: `${humanFeedback * 3}x`
    },
    top_deltas: topDeltas.map(d => ({
      confidence: `${Math.round((d.confidence || 0) * 100)}%`,
      condition: d.condition,
      problem: d.problem?.substring(0, 50) + (d.problem?.length > 50 ? '...' : '')
    })),
    skill_breakdown: skillBreakdown
  };
}

/**
 * Print report to console
 * @param {Object} report - Report data
 */
function printReport(report) {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           ACE Playbook Effectiveness Report                  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  // Summary
  console.log('┌─ Summary ─────────────────────────────────────────────────────┐');
  console.log(`│ Active Deltas:     ${String(report.summary.active_deltas).padEnd(4)} / ${report.summary.max_deltas} (${report.summary.capacity_used})`);
  console.log(`│ Pending Candidates: ${report.summary.pending_candidates}`);
  console.log(`│ Total Events:       ${report.summary.total_events}`);
  console.log(`│ Archived Deltas:    ${report.summary.archived_deltas}`);
  console.log('└───────────────────────────────────────────────────────────────┘');
  console.log('');

  // Statistics
  console.log('┌─ Statistics ──────────────────────────────────────────────────┐');
  console.log(`│ Average Confidence:  ${report.statistics.avg_confidence}`);
  console.log(`│ Total Helpful:       ${report.statistics.total_helpful}`);
  console.log(`│ Total Not Helpful:   ${report.statistics.total_not_helpful}`);
  console.log(`│ Human Feedback:      ${report.statistics.human_feedback} (weighted ${report.statistics.human_weight_applied})`);
  console.log('└───────────────────────────────────────────────────────────────┘');
  console.log('');

  // Top Deltas
  if (report.top_deltas.length > 0) {
    console.log('┌─ Top 10 Deltas by Confidence ────────────────────────────────┐');
    report.top_deltas.forEach((d, i) => {
      console.log(`│ ${String(i + 1).padStart(2)}. [${d.confidence.padStart(4)}] ${d.condition}`);
      console.log(`│     └─ ${d.problem}`);
    });
    console.log('└───────────────────────────────────────────────────────────────┘');
    console.log('');
  }

  // Skill Breakdown
  const skills = Object.entries(report.skill_breakdown);
  if (skills.length > 0) {
    console.log('┌─ Skill Breakdown ─────────────────────────────────────────────┐');
    skills.sort((a, b) => b[1] - a[1]).forEach(([skill, count]) => {
      const bar = '█'.repeat(Math.min(count * 2, 20));
      console.log(`│ ${skill.padEnd(15)} ${String(count).padStart(3)} ${bar}`);
    });
    console.log('└───────────────────────────────────────────────────────────────┘');
  }

  console.log('');
  console.log('Report generated:', new Date().toISOString());
  console.log('');
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');

  const report = generateReport();

  if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printReport(report);
  }
}

main();
