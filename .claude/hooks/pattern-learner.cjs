#!/usr/bin/env node
'use strict';

/**
 * Pattern Learner Hook - Detects /learn commands and saves to lessons.md
 *
 * Triggers on: UserPromptSubmit
 * Detects: /learn <text>, "remember this/that"
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

const fs = require('fs');
const { appendLesson } = require('./lib/lessons-writer.cjs');

const MAX_STDIN_SIZE = 1024 * 1024; // 1MB

// Patterns that indicate explicit teaching (validation: /learn + remember only)
const LEARN_PATTERNS = [
  /^\/learn\s+(.+)/i,
  /^remember\s*(?:this|that)?\s*[:.]?\s*(.+)/i
];

function extractLesson(prompt) {
  if (!prompt || typeof prompt !== 'string') return null;
  const trimmed = prompt.trim();

  for (const pattern of LEARN_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match && match[1] && match[1].trim().length > 3) {
      return match[1].trim();
    }
  }
  return null;
}

async function main() {
  try {
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin || stdin.length > MAX_STDIN_SIZE) process.exit(0);

    const payload = JSON.parse(stdin);
    const prompt = payload.prompt || payload.message || '';
    if (!prompt) process.exit(0);

    const lesson = extractLesson(prompt);
    if (!lesson) process.exit(0);

    appendLesson('Learned', lesson);
    console.log(`\n[Learn] Saved: ${lesson}`);

    process.exit(0);
  } catch (error) {
    if (process.env.CK_DEBUG) {
      console.error(`[Learn] Error: ${error.message}`);
    }
    process.exit(0);
  }
}

main();
