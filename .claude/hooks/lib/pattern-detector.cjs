#!/usr/bin/env node
'use strict';

/**
 * Pattern Detector - Detects user corrections and pattern teaching in prompts
 *
 * Part of Agentic Context Engineering (ACE) implementation.
 * Analyzes user prompts to detect correction patterns for learning.
 *
 * Validated decisions:
 * - Interactive confirmation after detection
 * - Reuses existing feedback-detector.cjs patterns
 *
 * @module pattern-detector
 */

const {
  MIN_PATTERN_SCORE,
  MIN_PATTERN_CONFIDENCE,
  CONTEXT_BOOST_EDIT,
  CODE_BLOCK_BOOST,
  KEYWORD_WEIGHTS,
  CORRECTION_KEYWORDS,
  IGNORE_PATTERNS,
  CATEGORY_PATH_PATTERNS,
  PATTERN_CATEGORIES
} = require('./pattern-constants.cjs');

/**
 * Generate unique pattern candidate ID
 * Format: pat-{YYMMDD}-{HHMM}-{random}
 * @returns {string} Unique pattern ID
 */
function generatePatternId() {
  const now = new Date();
  const date = now.toISOString().slice(2, 10).replace(/-/g, '');
  const time = now.toTimeString().slice(0, 5).replace(':', '');
  const rand = Math.random().toString(36).substring(2, 8);
  return `pat-${date}-${time}-${rand}`;
}

/**
 * Detect if prompt matches any ignore patterns
 * @param {string} prompt - Normalized prompt text
 * @returns {boolean} True if should be ignored
 */
function shouldIgnore(prompt) {
  return IGNORE_PATTERNS.some(pattern => pattern.test(prompt));
}

/**
 * Check for explicit teaching commands
 * @param {string} prompt - Raw prompt text
 * @returns {{ isExplicit: boolean, content: string | null }}
 */
function checkExplicitTeaching(prompt) {
  const normalized = prompt.toLowerCase().trim();

  // Check for /learn or /remember commands
  if (/^\/learn:?\s*/i.test(normalized)) {
    const content = prompt.replace(/^\/learn:?\s*/i, '').trim();
    return { isExplicit: true, content };
  }

  if (/^\/remember:?\s*/i.test(normalized)) {
    const content = prompt.replace(/^\/remember:?\s*/i, '').trim();
    return { isExplicit: true, content };
  }

  // Check for "remember this" or "always do" phrases
  if (/^(remember\s+this|always\s+do|always\s+use)/i.test(normalized)) {
    return { isExplicit: true, content: prompt.trim() };
  }

  return { isExplicit: false, content: null };
}

/**
 * Score keyword matches in prompt
 * @param {string} prompt - Normalized prompt text
 * @returns {{ score: number, triggers: Array<{ category: string, keyword: string }> }}
 */
function scoreKeywords(prompt) {
  let score = 0;
  const triggers = [];

  for (const [category, keywords] of Object.entries(CORRECTION_KEYWORDS)) {
    for (const keyword of keywords) {
      // Skip explicit commands in keyword scoring (handled separately)
      if (keyword.startsWith('/')) continue;

      if (prompt.includes(keyword.toLowerCase())) {
        score += KEYWORD_WEIGHTS[category] || 0.2;
        triggers.push({ category, keyword });
      }
    }
  }

  return { score, triggers };
}

/**
 * Infer category from file path
 * @param {string | null} filePath - File path to analyze
 * @returns {string} Category name
 */
function inferCategoryFromPath(filePath) {
  if (!filePath) return 'general';

  for (const [category, patterns] of Object.entries(CATEGORY_PATH_PATTERNS)) {
    if (patterns.some(pattern => pattern.test(filePath))) {
      return category;
    }
  }

  return 'general';
}

/**
 * Infer category from prompt content keywords
 * @param {string} prompt - Prompt text
 * @returns {string} Category name
 */
function inferCategoryFromContent(prompt) {
  const normalized = prompt.toLowerCase();

  // Backend indicators
  if (/\b(c#|csharp|\.cs|repository|entity|command|handler|dto|migration|dotnet)\b/i.test(normalized)) {
    return 'backend';
  }

  // Frontend indicators
  if (/\b(angular|typescript|component|service|store|scss|css|html|template|signal)\b/i.test(normalized)) {
    return 'frontend';
  }

  // Workflow indicators
  if (/\b(hook|script|yaml|pipeline|ci|cd|git|commit|workflow)\b/i.test(normalized)) {
    return 'workflow';
  }

  return 'general';
}

/**
 * Extract keywords from prompt for pattern matching
 * @param {string} prompt - Prompt text
 * @returns {string[]} Extracted keywords
 */
function extractKeywords(prompt) {
  const keywords = [];
  const normalized = prompt.toLowerCase();

  // Extract meaningful words (4+ chars, skip common words)
  const stopWords = new Set([
    'this', 'that', 'with', 'from', 'have', 'been', 'would', 'could', 'should',
    'will', 'just', 'like', 'what', 'when', 'where', 'which', 'there', 'their',
    'they', 'them', 'then', 'than', 'also', 'into', 'some', 'such', 'only',
    'other', 'more', 'most', 'make', 'made', 'being', 'because', 'does', 'doing'
  ]);

  const words = normalized.match(/\b[a-z]{4,}\b/g) || [];
  for (const word of words) {
    if (!stopWords.has(word) && !keywords.includes(word)) {
      keywords.push(word);
    }
  }

  // Limit to top 10 keywords
  return keywords.slice(0, 10);
}

/**
 * Detect pattern candidate from user prompt
 *
 * @param {string} prompt - User's prompt text
 * @param {{ tool?: string, path?: string } | null} lastAiResponse - Last AI action context
 * @returns {{ type: string, confidence: number, triggers: Array, content: string, context: object } | null}
 */
function detectPatternCandidate(prompt, lastAiResponse = null) {
  if (!prompt || typeof prompt !== 'string') {
    return null;
  }

  const normalizedPrompt = prompt.toLowerCase().trim();

  // 1. Skip if matches ignore patterns
  if (shouldIgnore(normalizedPrompt)) {
    return null;
  }

  // 2. Check for explicit teaching (/learn, /remember)
  const explicit = checkExplicitTeaching(prompt);
  if (explicit.isExplicit && explicit.content) {
    const category = inferCategoryFromContent(explicit.content) ||
                     inferCategoryFromPath(lastAiResponse?.path);
    return {
      id: generatePatternId(),
      type: 'explicit',
      confidence: 1.0,
      triggers: [{ category: 'explicit', keyword: '/learn' }],
      content: explicit.content,
      keywords: extractKeywords(explicit.content),
      context: {
        last_tool: lastAiResponse?.tool || null,
        last_file: lastAiResponse?.path || null,
        category
      },
      status: 'candidate',
      timestamp: new Date().toISOString()
    };
  }

  // 3. Score keyword matches
  const { score, triggers } = scoreKeywords(normalizedPrompt);

  // 4. Context boost (AI just edited a file)
  let contextScore = 0;
  if (lastAiResponse?.tool === 'Edit' || lastAiResponse?.tool === 'Write') {
    contextScore += CONTEXT_BOOST_EDIT;
  }

  // 5. Code block boost
  let codeBlockScore = 0;
  if (/```[\s\S]*```/.test(prompt)) {
    codeBlockScore += CODE_BLOCK_BOOST;
  }

  // 6. Calculate total score
  const totalScore = score + contextScore + codeBlockScore;

  // 7. Threshold check
  if (totalScore < MIN_PATTERN_SCORE) {
    return null;
  }

  // 8. Determine category
  const category = inferCategoryFromPath(lastAiResponse?.path) ||
                   inferCategoryFromContent(prompt);

  return {
    id: generatePatternId(),
    type: 'implicit',
    confidence: Math.min(totalScore, 1.0),
    triggers,
    content: prompt.trim(),
    keywords: extractKeywords(prompt),
    context: {
      last_tool: lastAiResponse?.tool || null,
      last_file: lastAiResponse?.path || null,
      category
    },
    status: 'candidate',
    timestamp: new Date().toISOString()
  };
}

/**
 * Check if a candidate meets minimum confidence threshold
 * @param {object} candidate - Pattern candidate
 * @returns {boolean}
 */
function meetsConfidenceThreshold(candidate) {
  return candidate && candidate.confidence >= MIN_PATTERN_CONFIDENCE;
}

/**
 * Format confirmation prompt for interactive approval
 * Validated decision: Inline question after detecting correction
 *
 * @param {object} candidate - Pattern candidate
 * @returns {string} Formatted confirmation message
 */
function formatConfirmationPrompt(candidate) {
  const lines = [
    '',
    '---',
    '**Pattern Detected** - Save this as a learned pattern?',
    ''
  ];

  // Show what was detected
  if (candidate.type === 'explicit') {
    lines.push(`**Type:** Explicit teaching`);
  } else {
    lines.push(`**Type:** Correction detected`);
    lines.push(`**Triggers:** ${candidate.triggers.map(t => t.keyword).join(', ')}`);
  }

  lines.push(`**Category:** ${candidate.context?.category || 'general'}`);
  lines.push(`**Content:** "${candidate.content.slice(0, 100)}${candidate.content.length > 100 ? '...' : ''}"`);
  lines.push('');
  lines.push('Reply with **yes** to save, or **no** to skip.');
  lines.push('---');
  lines.push('');

  return lines.join('\n');
}

/**
 * Check if user response confirms pattern saving
 * @param {string} response - User's response text
 * @returns {boolean}
 */
function isConfirmationResponse(response) {
  // M6: Type check before string operations
  if (!response || typeof response !== 'string') return false;
  const normalized = response.trim().toLowerCase();
  return /^(yes|y|confirm|save|ok|sure|yep|yeah)$/.test(normalized);
}

/**
 * Check if user response rejects pattern saving
 * @param {string} response - User's response text
 * @returns {boolean}
 */
function isRejectionResponse(response) {
  // M6: Type check before string operations
  if (!response || typeof response !== 'string') return false;
  const normalized = response.trim().toLowerCase();
  return /^(no|n|skip|cancel|nope|nah|reject)$/.test(normalized);
}

module.exports = {
  // Main detection
  detectPatternCandidate,
  meetsConfidenceThreshold,

  // Helpers
  generatePatternId,
  shouldIgnore,
  checkExplicitTeaching,
  scoreKeywords,
  inferCategoryFromPath,
  inferCategoryFromContent,
  extractKeywords,

  // Confirmation flow (interactive)
  formatConfirmationPrompt,
  isConfirmationResponse,
  isRejectionResponse,

  // Re-export constants for convenience
  MIN_PATTERN_SCORE,
  MIN_PATTERN_CONFIDENCE,
  CORRECTION_KEYWORDS,
  IGNORE_PATTERNS
};
