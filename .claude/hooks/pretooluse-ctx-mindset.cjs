#!/usr/bin/env node
'use strict';
/**
 * PreToolUse context dispatcher — mindset (reg8c).
 * Matcher: Skill|Agent|Edit|Write|MultiEdit|TaskCreate|TaskUpdate
 * Builders (legacy order): mindset-injector
 *
 * GRANDFATHERED single-builder dispatcher: on review-class skills the mindset
 * block reaches ~11.5k chars (critical + ai-mistakes + lessons + graph protocol),
 * a single indivisible legacy block over the 8500 soft cap. Isolated into its own
 * dispatcher (grandfather exception) so it cannot be split and every other block
 * stays within cap.
 *
 * Registered at the reg8 slot after crr (reg8a) and dev (reg8b).
 */
const { runDispatcher } = require('./lib/pretooluse-dispatch.cjs');
const { buildMindset } = require('./lib/pretooluse-context-builders.cjs');

runDispatcher([buildMindset], { name: 'pretooluse-ctx-mindset' });
