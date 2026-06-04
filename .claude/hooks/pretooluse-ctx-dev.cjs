#!/usr/bin/env node
'use strict';
/**
 * PreToolUse context dispatcher — dev-rules (reg8b).
 * Matcher: Skill|Agent|Edit|Write|MultiEdit|TaskCreate|TaskUpdate
 * Builders (legacy order): dev-rules-injector
 *
 * GRANDFATHERED single-builder dispatcher: dev-rules emits the full
 * development-rules.md (~19.8k chars), a single indivisible legacy block already
 * far over the 8500 soft cap. It cannot be split, so it is isolated into its own
 * dispatcher — the documented grandfather exception to the per-block cap. Splitting
 * the doc would break byte-equivalence; isolating it keeps every OTHER emitted
 * block within cap.
 *
 * Registered at the reg8 slot between crr (reg8a) and mindset (reg8c).
 */
const { runDispatcher } = require('./lib/pretooluse-dispatch.cjs');
const { buildDevRules } = require('./lib/pretooluse-context-builders.cjs');

runDispatcher([buildDevRules], { name: 'pretooluse-ctx-dev' });
