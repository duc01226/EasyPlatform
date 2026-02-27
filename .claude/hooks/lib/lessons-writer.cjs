#!/usr/bin/env node
'use strict';

/**
 * Lessons Writer - Append-only lesson log for docs/lessons.md
 *
 * Provides:
 * - appendLesson(category, description) -- best-effort dedup append
 * - ensureLessonsFile() -- create file with header if missing
 *
 * All operations are synchronous. Fail-open: errors are silently ignored.
 *
 * @module lessons-writer
 */

const fs = require('fs');
const path = require('path');

const LESSONS_FILE = path.resolve(process.cwd(), 'docs', 'lessons.md');
const FREQ_FILE = path.resolve(process.cwd(), 'docs', 'lessons-freq.json');

const LESSONS_HEADER = `# Lessons Learned

Append-only log of behavioral lessons from AI agent sessions.
Format: \`- [YYYY-MM-DD] Category: Description\`

## Behavioral Lessons

`;

/**
 * Ensure lessons file exists with header
 */
function ensureLessonsFile() {
  try {
    if (!fs.existsSync(LESSONS_FILE)) {
      const dir = path.dirname(LESSONS_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(LESSONS_FILE, LESSONS_HEADER);
    }
  } catch (e) {
    // Fail-open
  }
}

/**
 * Append a single lesson line to docs/lessons.md
 * @param {string} category - Category (e.g., 'Learned', 'Process')
 * @param {string} description - Lesson description
 */
function appendLesson(category, description) {
  try {
    ensureLessonsFile();

    // Sanitize: collapse multiline to single line (lessons are one-line entries)
    description = description.replace(/\n/g, ' ').trim();
    if (!description) return;

    // Deduplication: skip if a lesson line with this exact description already exists
    const existing = fs.readFileSync(LESSONS_FILE, 'utf-8');
    const existingLines = existing.split('\n').filter(l => l.startsWith('- ['));
    const alreadyLogged = existingLines.some(line => {
      // Line format: "- [YYYY-MM-DD] Category: Description"
      const descStart = line.indexOf(': ', line.indexOf('] ') + 2);
      if (descStart === -1) return false;
      return line.slice(descStart + 2).trim() === description.trim();
    });
    if (alreadyLogged) return;

    const date = new Date().toISOString().slice(0, 10);
    const line = `- [${date}] ${category}: ${description}\n`;
    fs.appendFileSync(LESSONS_FILE, line);
  } catch (e) {
    // Fail-open: don't block on lesson write errors
  }
}

/**
 * Load frequency data from sidecar JSON
 */
function loadFrequencyData() {
  try {
    if (!fs.existsSync(FREQ_FILE)) return {};
    return JSON.parse(fs.readFileSync(FREQ_FILE, 'utf-8'));
  } catch { return {}; }
}

/**
 * Save frequency data to sidecar JSON
 */
function saveFrequencyData(data) {
  try {
    const dir = path.dirname(FREQ_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(FREQ_FILE, JSON.stringify(data, null, 2));
  } catch {} // Fail-open
}

/**
 * Record a frequency hit for a rule ID
 * @param {string} ruleId - Rule identifier
 * @param {string} [description] - Human-readable description
 */
function recordLessonFrequency(ruleId, description) {
  try {
    const data = loadFrequencyData();
    if (!data[ruleId]) {
      data[ruleId] = { count: 0, lastSeen: null, description: description || ruleId };
    }
    data[ruleId].count++;
    data[ruleId].lastSeen = new Date().toISOString();
    if (description) data[ruleId].description = description;
    saveFrequencyData(data);
  } catch {} // Fail-open
}

/**
 * Get top N lessons sorted by frequency
 * @param {number} [n=10] - Number of top lessons to return
 * @returns {Array<{id: string, count: number, lastSeen: string, description: string}>}
 */
function getTopLessons(n = 10) {
  try {
    const data = loadFrequencyData();
    return Object.entries(data)
      .map(([id, info]) => ({ id, ...info }))
      .sort((a, b) => b.count - a.count)
      .slice(0, n);
  } catch { return []; }
}

module.exports = {
  LESSONS_FILE,
  FREQ_FILE,
  appendLesson,
  ensureLessonsFile,
  loadFrequencyData,
  saveFrequencyData,
  recordLessonFrequency,
  getTopLessons
};
