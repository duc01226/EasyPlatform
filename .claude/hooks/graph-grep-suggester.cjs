#!/usr/bin/env node
'use strict';
/**
 * PostToolUse hook -- suggest graph queries when grep finds important files.
 *
 * Trigger: PostToolUse -> Grep | Glob
 * Behavior: Analyze grep results for entry-point files (entities, commands,
 *           handlers, consumers). If found, suggest graph CLI commands to
 *           discover ALL related files via structural relationships.
 *
 * Strategy: Orchestrate grep <-> graph <-> glob. This hook nudges AI toward
 *           graph queries when grep finds important entry points.
 *
 * Exit: Always 0 (non-blocking, suggestion only).
 */

const fs = require('fs');
const { runHook } = require('./lib/hook-runner.cjs');
const { getGraphDbPath } = require('./lib/graph-utils.cjs');
const { GRAPH_GREP_SUGGESTER: DEDUP_MARKER, DEDUP_LINES } = require('./lib/dedup-constants.cjs');

// File path patterns indicating important entry points worth graph-expanding
const IMPORTANT_PATTERNS = [
    { regex: /Domain[/\\]Entities[/\\]/i, type: 'entity', query: 'connections' },
    { regex: /UseCaseCommands[/\\]/i, type: 'command', query: 'callers_of' },
    { regex: /UseCaseEvents[/\\]/i, type: 'event-handler', query: 'callers_of' },
    { regex: /UseCaseQueries[/\\]/i, type: 'query', query: 'callers_of' },
    { regex: /Controllers[/\\]/i, type: 'controller', query: 'connections' },
    { regex: /Consumer[^/\\]*\.cs$/i, type: 'consumer', query: 'importers_of' },
    { regex: /BusMessage[^/\\]*\.cs$/i, type: 'bus-message', query: 'importers_of' },
    { regex: /EventHandler[^/\\]*\.cs$/i, type: 'event-handler', query: 'callers_of' },
    { regex: /\.component\.ts$/i, type: 'component', query: 'connections' },
    { regex: /\.store\.ts$/i, type: 'store', query: 'connections' },
    { regex: /api[.-]service\.ts$/i, type: 'api-service', query: 'connections' }
];

// Minimum important files before suggesting (1 = any important file triggers)
const MIN_IMPORTANT_FILES = 1;

// Maximum suggestions per invocation to avoid noise
const MAX_SUGGESTIONS = 3;

/**
 * Count how many times DEDUP_MARKER has appeared in full transcript.
 * Used for escalation: 0=first, 1=second(WARNING), 2+=STRONG WARNING.
 * Also checks recent dedup to avoid injecting on every single Grep call.
 *
 * @returns {{ recentlyInjected: boolean, escalationLevel: number }}
 */
function getEscalationState(transcriptPath) {
    try {
        if (!transcriptPath || !fs.existsSync(transcriptPath)) return { recentlyInjected: false, escalationLevel: 0 };
        const transcript = fs.readFileSync(transcriptPath, 'utf-8');
        const allLines = transcript.split('\n');

        // Count total appearances of our marker in FULL transcript → escalation level
        const totalAppearances = allLines.filter(line => line.includes(DEDUP_MARKER)).length;

        // Check recent window for dedup — use SMALLER window at higher escalation
        // Level 0: standard dedup (80 lines). Level 1+: reduced dedup (30 lines) to re-inject sooner.
        const dedupWindow = totalAppearances >= 1 ? 30 : DEDUP_LINES.GRAPH_GREP_SUGGESTER;
        const recentlyInjected = allLines.slice(-dedupWindow).some(line => line.includes(DEDUP_MARKER));

        return { recentlyInjected, escalationLevel: totalAppearances };
    } catch {
        return { recentlyInjected: false, escalationLevel: 0 };
    }
}

runHook(
    'graph-grep-suggester',
    async event => {
        // Only fire for Grep or Glob tool
        const toolName = event.toolName || event.tool_name || '';
        if (toolName !== 'Grep' && toolName !== 'Glob') return;

        // Fast check: graph.db must exist (no Python, just fs)
        if (!fs.existsSync(getGraphDbPath())) return;

        // Get grep output from toolResult
        const output = event.toolResult || '';
        if (!output || typeof output !== 'string') return;

        // Extract file paths from grep output lines
        const lines = output.split('\n').filter(Boolean);
        if (lines.length === 0) return;

        // Find important files in grep results
        const suggestions = [];
        const seenTypes = new Set();

        for (const line of lines) {
            if (suggestions.length >= MAX_SUGGESTIONS) break;
            for (const pattern of IMPORTANT_PATTERNS) {
                if (pattern.regex.test(line) && !seenTypes.has(pattern.type)) {
                    seenTypes.add(pattern.type);
                    // Extract file path (first segment before colon, or full line)
                    const filePath = (line.split(':')[0] || line).trim();
                    suggestions.push({
                        file: filePath,
                        type: pattern.type,
                        query: pattern.query
                    });
                    break;
                }
            }
        }

        if (suggestions.length < MIN_IMPORTANT_FILES) return;

        // Escalation-aware dedup: allows more frequent re-injection at higher levels
        const { recentlyInjected, escalationLevel } = getEscalationState(event.transcript_path || '');
        if (recentlyInjected) return;

        // Build escalation-aware decision-prompt directive
        const graphCmd = 'python .claude/scripts/code_graph';
        const firstFile = (suggestions[0]?.file || '').replace(/\\/g, '/');
        const typeList = suggestions.map(s => s.type).join(', ');

        let msg = '\n';

        if (escalationLevel === 0) {
            // Level 0: Standard suggestion
            msg += `[graph] **STOP AND DECIDE — MANDATORY BEFORE YOUR NEXT ACTION:**\n`;
            msg += `Your search found key files (${typeList}). Graph trace discovers callers, consumers, bus messages, event chains, and tests that grep CANNOT find.\n`;
        } else if (escalationLevel === 1) {
            // Level 1: WARNING — AI ignored previous suggestion
            msg += `[graph] **WARNING (2nd reminder) — You have NOT run graph trace yet despite finding key files.**\n`;
            msg += `Graph trace is MANDATORY for investigation tasks. Found: ${typeList}. Your analysis is INCOMPLETE without structural relationships.\n`;
        } else {
            // Level 2+: STRONG WARNING — AI has repeatedly ignored
            msg += `[graph] **STRONG WARNING (${escalationLevel + 1}x reminded) — Graph trace still not executed. This is a PROTOCOL VIOLATION.**\n`;
            msg += `You MUST ATTENTION run graph trace before concluding. Without it, callers, bus consumers, and event chains are INVISIBLE to grep.\n`;
        }

        msg += `\n`;
        msg += `**DECISION REQUIRED — choose ONE before proceeding:**\n`;
        msg += `  (A) RUN GRAPH TRACE NOW (recommended if you found entry-point files):\n`;
        msg += `      ${graphCmd} trace "${firstFile}" --direction both --json\n`;

        // Add additional trace targets
        for (let i = 1; i < suggestions.length; i++) {
            const target = suggestions[i].file.replace(/\\/g, '/');
            msg += `      ${graphCmd} trace "${target}" --direction both --json\n`;
        }

        msg += `  (B) CONTINUE SEARCHING — only if you have NOT yet found the key entry-point files and need more context first.\n`;
        msg += `\n`;
        msg += `**Pattern: grep finds files → graph trace reveals full system flow → grep verifies specific details.**\n`;

        process.stdout.write(msg);
    },
    { timeout: 5000 }
);
