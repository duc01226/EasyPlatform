#!/usr/bin/env node
/**
 * Lesson Learned Reminder - UserPromptSubmit Hook
 *
 * Injects a reminder into every prompt telling AI to:
 * 1. Break work into todo tasks
 * 2. Always add a final todo task for AI mistake/lesson-learned analysis
 * 3. If lessons exist, ask user to confirm using /learn to persist them
 *
 * Uses transcript dedup to avoid re-injecting on consecutive prompts.
 *
 * Exit Codes:
 *   0 - Success (non-blocking, allows continuation)
 */

'use strict';

const fs = require('fs');

// Dedup marker — checked in recent transcript to avoid repeating
const { LESSON_LEARNED: DEDUP_MARKER } = require('./lib/dedup-constants.cjs');

function wasRecentlyInjected(transcriptPath) {
  try {
    if (!transcriptPath || !fs.existsSync(transcriptPath)) return false;
    const transcript = fs.readFileSync(transcriptPath, 'utf-8');
    // Check last 200 lines (~6 user prompts worth of hook output)
    return transcript.split('\n').slice(-200).some(line => line.includes(DEDUP_MARKER));
  } catch {
    return false;
  }
}

function main() {
  try {
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    const payload = JSON.parse(stdin);

    // Skip if recently injected
    if (wasRecentlyInjected(payload.transcript_path)) process.exit(0);

    const output = [
      `## ${DEDUP_MARKER} Task Planning & Continuous Improvement`,
      ``,
      `**MUST** break work into small todo tasks using \`TaskCreate\` BEFORE starting.`,
      `**MUST** add a **final todo task** at the end of every task list:`,
      ``,
      `> **"Analyze AI mistakes & lessons learned"** — Review the session for AI errors ` +
        `(wrong assumptions, missed patterns, hallucinated APIs, over-engineering, ` +
        `missed reuse opportunities). If any lesson is found, ask the user:`,
      `> *"Found [N] lesson(s) learned. Use \`/learn\` to remember for future sessions?"*`,
      `> Wait for user confirmation before invoking \`/learn\`.`,
    ];

    console.log(output.join('\n'));
    process.exit(0);
  } catch (error) {
    // Fail-open: don't block the user
    process.exit(0);
  }
}

main();
