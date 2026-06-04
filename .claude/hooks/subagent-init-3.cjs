#!/usr/bin/env node
'use strict';
/**
 * SubagentStart Dispatcher 3/3 — context-guard + parent todos (builders 7–8 of 8)
 *
 * Emits the context-overflow guard reminder followed by the parent task state,
 * as one block — byte-identical to the former subagent-init-context-guard.cjs +
 * subagent-init-todos.cjs blocks concatenated with '\n'.
 *
 * Placement (last) preserves the recency effect both legacy hooks relied on.
 * todos keeps the MAX_TODOS=30 trim from the former subagent-init-todos.cjs.
 *
 * Empty-stdin parity: context-guard needs stdin (session_id) — absent stdin meant
 * no guard block in the legacy hook; todos never read stdin and still emitted. This
 * dispatcher reproduces that: skip the guard when stdin is empty/invalid, always
 * attempt todos.
 *
 * Exit Codes: 0 — Success (non-blocking, fail-open)
 */

const fs = require('fs');
const { buildContextGuardContext, buildParentTodoSection, emitSubagentContext } = require('./lib/subagent-context-builders.cjs');

const MAX_TODOS = 30; // cap at 30 active todos — beyond this, subagent only needs summary

/** Run a builder, returning [] on any failure so one fault can't abort the other. */
function safe(fn) {
    try {
        const out = fn();
        return Array.isArray(out) ? out : [];
    } catch {
        return [];
    }
}

async function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();

        // context-guard (builder 7) — only when stdin is present & parseable (legacy parity)
        let guardLines = [];
        if (stdin) {
            try {
                const payload = JSON.parse(stdin);
                guardLines = safe(() => buildContextGuardContext(payload.session_id || null));
            } catch {
                guardLines = []; // legacy hook console.error + exit 0 (no block)
            }
        }

        // todos (builder 8) — never read stdin; apply the MAX_TODOS=30 trim verbatim
        const sections = safe(() => buildParentTodoSection());
        const todoLines = sections.filter(l => /^\s{2}\[/.test(l));
        let finalTodos;
        if (todoLines.length > MAX_TODOS) {
            const nonTodoLines = sections.filter(l => !/^\s{2}\[/.test(l));
            const overflow = todoLines.length - MAX_TODOS;
            finalTodos = [
                ...nonTodoLines,
                ...todoLines.slice(0, MAX_TODOS),
                `  ...and ${overflow} more todos (truncated — ${todoLines.length} total active)`
            ];
        } else {
            finalTodos = sections;
        }

        emitSubagentContext([...guardLines, ...finalTodos]);
    } catch (error) {
        console.error(`SubagentStart init (3/3) context-guard+todos error: ${error.message}`);
        process.exit(0); // fail-open
    }
}

main();
