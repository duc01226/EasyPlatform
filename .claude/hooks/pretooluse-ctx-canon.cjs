#!/usr/bin/env node
'use strict';
/**
 * PreToolUse context dispatcher — canonical design-system guide (reg16).
 * Matcher: Read|Skill
 * Builders (legacy order): design-system-canonical-guide (read|skill kind)
 *
 * Mirrors the reg16 registration of design-system-canonical-guide.cjs. The
 * canonical-guide FILE is kept (its UserPromptSubmit registration still points at
 * it); this dispatcher only replaces its two PreToolUse registrations — the reg10
 * (edit) one folded into pretooluse-ctx-edit.cjs, and this reg16 (read|skill) one.
 * On Skill the guide always fires (when the canonical doc exists); on Read it fires
 * only for UI files. Registered at the reg16 slot so on Read it follows the reg9
 * mindset-compact block, and on Skill it follows the reg7/reg8 blocks.
 */
const { runDispatcher } = require('./lib/pretooluse-dispatch.cjs');
const { buildDesignSystemCanonicalGuide } = require('./lib/pretooluse-context-builders.cjs');

runDispatcher(
    [(payload, lines) => {
        const t = payload.tool_name;
        const kind = t === 'Read' ? 'read' : t === 'Skill' ? 'skill' : null;
        if (!kind) return '';
        return buildDesignSystemCanonicalGuide(payload, lines, kind);
    }],
    { name: 'pretooluse-ctx-canon' }
);
