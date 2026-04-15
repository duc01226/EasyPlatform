#!/usr/bin/env node
'use strict';
/**
 * SubagentStart Hook — Parent Task State (fires 13th of 13)
 * Outputs parent todo list so subagents know active task context.
 * Split to keep subagent-init-identity.cjs within 9,000-char harness limit.
 */
const { buildParentTodoSection, emitSubagentContext } = require('./lib/subagent-context-builders.cjs');

const MAX_TODOS = 30; // cap at 30 active todos — beyond this, subagent only needs summary

async function main() {
    try {
        const sections = buildParentTodoSection();
        // Todo lines use "  [ ]" / "  [>>]" prefix (two-space indent + bracket)
        const todoLines = sections.filter(l => /^\s{2}\[/.test(l));
        if (todoLines.length > MAX_TODOS) {
            const nonTodoLines = sections.filter(l => !/^\s{2}\[/.test(l));
            const overflow = todoLines.length - MAX_TODOS;
            const trimmed = [
                ...nonTodoLines,
                ...todoLines.slice(0, MAX_TODOS),
                `  ...and ${overflow} more todos (truncated — ${todoLines.length} total active)`
            ];
            emitSubagentContext(trimmed);
        } else {
            emitSubagentContext(sections);
        }
    } catch (err) {
        process.exit(0); // fail-open
    }
}

main();
