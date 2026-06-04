#!/usr/bin/env node
'use strict';
/**
 * PreToolUse context dispatcher — edit tail (reg10b + reg11).
 * Matcher: Edit|Write|MultiEdit
 * Builders (legacy order): code-patterns, backend-context, frontend-context,
 *                          scss-styling-context, lessons, role-context (reg11, Write-only)
 *
 * Ends at reg11 (role-context) — deliberately BEFORE reg12 (ba-refinement-context,
 * an independent inject hook left untouched). spec-context (reg13) and
 * artifact-path-resolver (reg17) live in pretooluse-ctx-edit-spec.cjs, registered
 * AFTER ba-refinement, so that for a Write to a BA artifact path the legacy emit
 * order role → ba-refinement → artifact is preserved exactly. role-context
 * self-gates to Write; on Edit|MultiEdit it returns '' (matching reg11 = Write).
 */
const { runDispatcher } = require('./lib/pretooluse-dispatch.cjs');
const {
    buildCodePatterns,
    buildBackendContext,
    buildFrontendContext,
    buildScssStylingContext,
    buildLessons,
    buildRoleContext
} = require('./lib/pretooluse-context-builders.cjs');

runDispatcher(
    [
        buildCodePatterns,
        buildBackendContext,
        buildFrontendContext,
        buildScssStylingContext,
        buildLessons,
        buildRoleContext
    ],
    { name: 'pretooluse-ctx-edit-tail' }
);
