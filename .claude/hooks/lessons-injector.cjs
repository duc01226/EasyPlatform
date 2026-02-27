#!/usr/bin/env node
'use strict';

/**
 * Lessons Injector Hook - Injects docs/lessons.md into context
 *
 * Triggers: UserPromptSubmit, PreToolUse (Edit|Write|MultiEdit)
 * Reads docs/lessons.md and outputs as system-reminder.
 * Dedup: skips PreToolUse if already injected within 30 seconds.
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const LESSONS_FILE = path.resolve(process.cwd(), 'docs', 'lessons.md');
const DEDUP_WINDOW_MS = 30_000; // 30 seconds
const MAX_SIZE = 4096; // 4KB safety limit

function getTrackingPath() {
  const sessionId = process.env.CLAUDE_SESSION_ID || process.env.CK_SESSION_ID || 'unknown';
  return path.join(os.tmpdir(), 'ck', sessionId, 'lessons-injected-at');
}

function wasRecentlyInjected() {
  try {
    const trackPath = getTrackingPath();
    if (!fs.existsSync(trackPath)) return false;
    const ts = parseInt(fs.readFileSync(trackPath, 'utf-8').trim(), 10);
    return (Date.now() - ts) < DEDUP_WINDOW_MS;
  } catch {
    return false;
  }
}

function markInjected() {
  try {
    const trackPath = getTrackingPath();
    const dir = path.dirname(trackPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(trackPath, String(Date.now()));
  } catch {
    // Fail-open
  }
}

/**
 * Sort lesson lines by frequency (highest first).
 * Preserves document structure: only sorts `- [` prefixed lines
 * within their original positions, leaving headers and other
 * content lines in place.
 */
function sortLessonsByFrequency(content) {
  try {
    const freqPath = path.resolve(process.cwd(), 'docs', 'lessons-freq.json');
    if (!fs.existsSync(freqPath)) return content;
    const freq = JSON.parse(fs.readFileSync(freqPath, 'utf-8'));
    if (!freq || Object.keys(freq).length === 0) return content;

    const lines = content.split('\n');

    // Extract lesson lines and their indices
    const lessonEntries = [];
    const lessonIndices = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('- [')) {
        lessonEntries.push(lines[i]);
        lessonIndices.push(i);
      }
    }

    if (lessonEntries.length === 0) return content;

    // Build description->count map from freq values
    const descCountMap = {};
    for (const [id, info] of Object.entries(freq)) {
      if (info.description) descCountMap[info.description.toLowerCase()] = info.count;
    }

    // Sort lesson lines by frequency (higher first)
    lessonEntries.sort((a, b) => {
      const descA = (a.match(/: (.+)$/) || [])[1] || '';
      const descB = (b.match(/: (.+)$/) || [])[1] || '';
      const countA = descCountMap[descA.toLowerCase()] || 0;
      const countB = descCountMap[descB.toLowerCase()] || 0;
      return countB - countA;
    });

    // Place sorted lessons back at their original indices
    for (let i = 0; i < lessonIndices.length; i++) {
      lines[lessonIndices[i]] = lessonEntries[i];
    }

    return lines.join('\n');
  } catch { return content; }
}

function readLessons() {
  try {
    if (!fs.existsSync(LESSONS_FILE)) return null;
    const content = fs.readFileSync(LESSONS_FILE, 'utf-8').trim();
    if (!content || content.length < 20) return null; // Skip near-empty files
    // Sort by frequency first, then truncate to avoid corrupting sorted output
    const sorted = sortLessonsByFrequency(content);
    if (sorted.length > MAX_SIZE) {
      return sorted.slice(0, MAX_SIZE) + '\n\n[Truncated — lessons.md exceeds 4KB]';
    }
    return sorted;
  } catch {
    return null;
  }
}

function main() {
  try {
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    const payload = JSON.parse(stdin);

    // Determine hook type: PreToolUse has tool_name/tool_input
    const isToolHook = !!(payload.tool_name || payload.tool_input);

    // For PreToolUse: skip if recently injected by UserPromptSubmit
    if (isToolHook && wasRecentlyInjected()) {
      process.exit(0);
    }

    const lessons = readLessons();
    if (!lessons) process.exit(0);

    console.log(`\n<system-reminder>\n## Lessons Learned (from docs/lessons.md)\n\n${lessons}\n</system-reminder>\n`);

    markInjected();
    process.exit(0);
  } catch (error) {
    if (process.env.CK_DEBUG) {
      console.error(`[Lessons] Injector error: ${error.message}`);
    }
    process.exit(0);
  }
}

main();
