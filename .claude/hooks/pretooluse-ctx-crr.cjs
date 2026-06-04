#!/usr/bin/env node
'use strict';
/**
 * PreToolUse context dispatcher — code-review-rules (reg8a).
 * Matcher: Skill|Agent|Edit|Write|MultiEdit|TaskCreate|TaskUpdate
 * Builders (legacy order): code-review-rules-injector
 *
 * Isolated single-builder dispatcher. code-review-rules emits 0 on Agent/Task ops
 * (gates on coding/review SKILL names + Edit|Write|MultiEdit), so those tools fall
 * through to the next dispatcher (dev/mindset) with no block — matching legacy.
 *
 * Registered at the reg8 slot, before dev (reg8b) and mindset (reg8c), preserving
 * the legacy crr → dev → mindset emit order.
 */
const { runDispatcher } = require('./lib/pretooluse-dispatch.cjs');
const { buildCodeReviewRules } = require('./lib/pretooluse-context-builders.cjs');

runDispatcher([buildCodeReviewRules], { name: 'pretooluse-ctx-crr' });
