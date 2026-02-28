#!/usr/bin/env node
'use strict';

/**
 * Lessons Injector Hook
 * Injects docs/lessons.md content into conversation context.
 * Registered on: UserPromptSubmit, PreToolUse(Edit|Write|MultiEdit)
 *
 * Dedup: Only on UserPromptSubmit (checks transcript).
 * PreToolUse always injects — avoids transcript I/O per edit call.
 */

const fs = require('fs');
const path = require('path');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const LESSONS_PATH = path.join(PROJECT_DIR, 'docs', 'lessons.md');
const TRANSCRIPT_DEDUP_LINES = 50;

function main() {
  try {
    // Read stdin (required by hook contract)
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    // Skip if lessons file doesn't exist or is empty
    if (!fs.existsSync(LESSONS_PATH)) process.exit(0);
    const content = fs.readFileSync(LESSONS_PATH, 'utf-8').trim();
    // Skip if no lesson entries (lines starting with "- [")
    const hasLessons = content.split('\n').some(l => l.trim().startsWith('- ['));
    if (!hasLessons) process.exit(0);

    // Dedup: only on UserPromptSubmit (detect via absence of tool_name)
    try {
      const payload = JSON.parse(stdin);
      const isUserPrompt = !payload.tool_name; // PreToolUse has tool_name, UserPromptSubmit does not
      if (isUserPrompt && payload.transcript_path && fs.existsSync(payload.transcript_path)) {
        const transcript = fs.readFileSync(payload.transcript_path, 'utf-8');
        const lastLines = transcript.split('\n').slice(-TRANSCRIPT_DEDUP_LINES).join('\n');
        if (lastLines.includes('## Learned Lessons')) process.exit(0);
      }
    } catch (e) { /* proceed without dedup */ }

    console.log(`## Learned Lessons\n\n${content}`);
  } catch (e) { /* silent fail */ }
  process.exit(0);
}

main();
