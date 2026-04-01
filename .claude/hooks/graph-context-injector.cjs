#!/usr/bin/env node
'use strict';
/**
 * PreToolUse hook — auto-inject graph context when review skills or
 * graph-relevant agents are invoked.
 *
 * Trigger: PreToolUse → Skill | Agent
 * Behavior: When user invokes graph-relevant skills or spawns graph-relevant
 *           agents, automatically run graph-blast-radius analysis and inject results
 *           plus graph CLI hints into Claude's context via stdout.
 *
 * Exit: Always 0 (non-blocking, informational).
 */

const fs = require('fs');
const { runHook } = require('./lib/hook-runner.cjs');
const { isGraphAvailable, invokeGraph, getGraphDbPath } = require('./lib/graph-utils.cjs');

// Skills that benefit from automatic graph context injection
const GRAPH_SKILLS = new Set([
    'code-review',
    'review-changes',
    'review-architecture',
    'sre-review',
    'graph-blast-radius',
    'scout',
    'debug',
    'fix',
    'fix-fast',
    'fix-hard',
    'code-simplifier',
    'refactoring',
    'prove-fix',
    'security',
    'performance'
]);

// Agent types that benefit from graph context injection
// NOTE: 'Explore' is a built-in agent type commonly used for investigation — must be included
const GRAPH_AGENT_TYPES = new Set([
    'explore',
    'scout',
    'code-reviewer',
    'debugger',
    'backend-developer',
    'frontend-developer',
    'fullstack-developer',
    'security-auditor',
    'performance-optimizer',
    'integration-tester',
    'general-purpose'
]);

runHook(
    'graph-context-injector',
    async event => {
        const toolName = event.tool_name || event.toolName || '';
        const toolInput = event.tool_input || event.toolInput || {};

        // Determine if this is a graph-relevant invocation
        let contextLabel = '';

        if (toolName === 'Skill') {
            const skillName = (toolInput.skill || '').toLowerCase();
            if (!skillName || !GRAPH_SKILLS.has(skillName)) return;
            contextLabel = `/${skillName}`;
        } else if (toolName === 'Agent') {
            const agentType = (toolInput.subagent_type || '').toLowerCase();
            if (!agentType || !GRAPH_AGENT_TYPES.has(agentType)) return;
            contextLabel = `agent:${agentType}`;
        } else {
            return;
        }

        // Check graph availability (fast: cached Python + fs.existsSync)
        if (!fs.existsSync(getGraphDbPath())) return;

        const status = isGraphAvailable();
        if (!status.available) return;

        // Run graph-blast-radius with 8s timeout
        const result = invokeGraph('graph-blast-radius', [], 8000);
        if (!result || result.status !== 'ok') return;

        // Build concise context injection
        const changedFiles = result.changed_files || [];
        const changedNodes = result.changed_nodes || [];
        const impactedNodes = result.impacted_nodes || [];
        const impactedFiles = result.impacted_files || [];

        if (changedFiles.length === 0) {
            // For Agent tool: still inject graph CLI hints even without changes
            if (toolName === 'Agent') {
                console.log(
                    [
                        `[code-graph] Graph available. Use graph CLI for structural + implicit relationship queries:`,
                        `  python .claude/scripts/code_graph trace <file> --direction both --json  # RECOMMENDED: full upstream + downstream system flow`,
                        `  python .claude/scripts/code_graph trace <file> --direction downstream --json  # impact analysis only`,
                        `  python .claude/scripts/code_graph connections <file> --json  # structural relationships`,
                        `  python .claude/scripts/code_graph query callers_of <function> --json`,
                        `  python .claude/scripts/code_graph query importers_of <module> --json`,
                        `  python .claude/scripts/code_graph search <keyword> --kind Function --json`,
                        `  python .claude/scripts/code_graph find-path <source> <target> --json`,
                        `  python .claude/scripts/code_graph batch-query <f1> <f2> --json`,
                        `  TIP: grep/glob/search first to find entry files, then trace for full system flow including MESSAGE_BUS cross-service edges`
                    ].join('\n')
                );
            } else {
                console.log(`[code-graph] No changed files detected. Graph is up to date.`);
            }
            return;
        }

        // Risk level
        const impactCount = impactedNodes.length;
        const risk = impactCount > 20 ? 'HIGH' : impactCount > 5 ? 'MEDIUM' : 'LOW';

        // Build summary
        const lines = [
            `[code-graph] Blast Radius Analysis (auto-injected for ${contextLabel})`,
            `Risk: ${risk} | Changed: ${changedFiles.length} files, ${changedNodes.length} nodes | Impacted: ${impactCount} nodes in ${impactedFiles.length} files`
        ];

        // List changed files
        if (changedFiles.length > 0) {
            lines.push(`Changed files: ${changedFiles.slice(0, 10).join(', ')}${changedFiles.length > 10 ? ` (+${changedFiles.length - 10} more)` : ''}`);
        }

        // List impacted files (additional files affected)
        if (impactedFiles.length > 0) {
            lines.push(`Impacted files: ${impactedFiles.slice(0, 8).join(', ')}${impactedFiles.length > 8 ? ` (+${impactedFiles.length - 8} more)` : ''}`);
        }

        // Changed production functions (non-test functions that were modified)
        const prodFuncs = changedNodes.filter(n => n.kind === 'Function' && !n.is_test);
        if (prodFuncs.length > 0) {
            lines.push(
                `Changed production functions: ${prodFuncs
                    .slice(0, 5)
                    .map(n => n.name)
                    .join(', ')}${prodFuncs.length > 5 ? ` (+${prodFuncs.length - 5} more)` : ''}`
            );
        }

        lines.push(
            `Use: python .claude/scripts/code_graph trace <changed-file> --direction downstream --json for full downstream impact (events, bus messages, cross-service consumers)`
        );

        console.log(lines.join('\n'));
    },
    { timeout: 12000 }
);
