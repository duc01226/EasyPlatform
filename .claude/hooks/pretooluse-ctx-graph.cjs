#!/usr/bin/env node
'use strict';
/**
 * PreToolUse context dispatcher — graph (reg7).
 * Matcher: Skill|Agent
 * Builders (legacy order): graph-context-injector
 *
 * Carries the blast-radius graph context. SIDE EFFECT: buildGraphContext spawns
 * graph-blast-radius — isolated under the dispatcher's per-builder try/catch so a
 * graph failure or timeout never blocks the tool call (fail-open, exit 0).
 *
 * Byte-equivalence: emits exactly what graph-context-injector.cjs emitted; this
 * dispatcher is registered at the reg7 slot so on Skill/Agent its block precedes
 * the reg8 (crr/dev/mindset) and reg16 (canon) blocks — matching legacy order.
 */
const { runDispatcher } = require('./lib/pretooluse-dispatch.cjs');
const { buildGraphContext } = require('./lib/pretooluse-context-builders.cjs');

runDispatcher([buildGraphContext], { name: 'pretooluse-ctx-graph' });
