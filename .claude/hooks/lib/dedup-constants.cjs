'use strict';
/**
 * Centralized dedup markers for context injection hooks.
 *
 * All hooks that check the transcript for recent injection MUST import from here.
 * Never define marker strings inline in hook files.
 *
 * IMPORTANT: Changing a marker string affects dedup behavior across all hooks.
 * Run tests after any change: node .claude/hooks/tests/test-all-hooks.cjs
 *
 * Consumers:
 *   CODE_PATTERNS       → backend-csharp-context, frontend-typescript-context, code-patterns-injector, subagent-init
 *   LESSON_LEARNED      → lesson-learned-reminder
 *   CODE_REVIEW_RULES   → code-review-rules-injector
 */
module.exports = {
  /** Marker for code pattern injection (checked in transcript last 300 lines) */
  CODE_PATTERNS: '## Code Patterns',

  /** Marker for lesson-learned reminders (checked in transcript last 200 lines) */
  LESSON_LEARNED: '[LESSON-LEARNED-REMINDER]',

  /** Marker for code review rules injection (checked in transcript last 300 lines) */
  CODE_REVIEW_RULES: '[Code Review Rules - Auto-Injected]',
};
