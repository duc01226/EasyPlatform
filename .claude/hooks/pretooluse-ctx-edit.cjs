#!/usr/bin/env node
'use strict';
/**
 * PreToolUse context dispatcher — edit head (reg10a).
 * Matcher: Edit|Write|MultiEdit
 * Builders (legacy order): knowledge-context, design-system-context,
 *                          design-system-canonical-guide (edit kind)
 *
 * First contiguous slice of the reg10 Edit|Write|MultiEdit injectors. Carries the
 * lighter context builders; the remaining reg10 tail + reg11/reg13/reg17 live in
 * pretooluse-ctx-edit-tail.cjs and pretooluse-ctx-edit-spec.cjs so the cross-hook
 * concat order stays byte-equivalent to legacy (reg10 → reg11 → reg12 ba-refinement
 * → reg13 → reg17).
 */
const { runDispatcher } = require('./lib/pretooluse-dispatch.cjs');
const {
    buildKnowledgeContext,
    buildDesignSystemContext,
    buildDesignSystemCanonicalGuide
} = require('./lib/pretooluse-context-builders.cjs');

runDispatcher(
    [
        buildKnowledgeContext,
        buildDesignSystemContext,
        (payload, lines) => buildDesignSystemCanonicalGuide(payload, lines, 'edit')
    ],
    { name: 'pretooluse-ctx-edit' }
);
