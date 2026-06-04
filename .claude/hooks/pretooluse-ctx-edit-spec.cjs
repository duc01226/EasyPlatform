#!/usr/bin/env node
'use strict';
/**
 * PreToolUse context dispatcher — edit spec/artifact tail (reg13 + reg17).
 * Matcher: Write|Edit|MultiEdit
 * Builders (legacy order): spec-context (reg13), artifact-path-resolver (reg17, Write-only)
 *
 * Registered AFTER ba-refinement-context (reg12) so the legacy interleave is kept:
 * for a Write to a BA artifact path the order is role (edit-tail, reg11) →
 * ba-refinement (reg12) → artifact (here, reg17). Splitting spec+artifact out of
 * edit-tail is what preserves that ordering — see pretooluse-ctx-edit-tail.cjs.
 * spec-context fires on docs/specs paths (Write|Edit|MultiEdit); artifact self-gates
 * to Write.
 */
const { runDispatcher } = require('./lib/pretooluse-dispatch.cjs');
const { buildSpecContext, buildArtifactPath } = require('./lib/pretooluse-context-builders.cjs');

runDispatcher([buildSpecContext, buildArtifactPath], { name: 'pretooluse-ctx-edit-spec' });
