#!/usr/bin/env node
/**
 * Prompt Context Assembler - Part 2 (Closers) - UserPromptSubmit Hook
 *
 * Injects the "closing gates" that must appear AFTER main context (part 1):
 *   1. Graph protocol tier 1 — full reference with dedup (deduped per session)
 *   2. Graph compact mandatory reminder — always injected, no dedup (~30 tokens)
 *   3. Workflow gate compact reminder — always injected, no dedup (~40 tokens)
 *   4. Lesson-learned reminder — always injected, no dedup (absolute last)
 *
 * Split from prompt-context-assembler.cjs to keep each hook's output under the
 * harness per-hook size limit. Register this AFTER prompt-context-assembler.cjs
 * in settings.json — content is dynamic (graph.db size, config) so splitting
 * ensures no single hook can exceed the 10,000 character limit.
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { loadConfig } = require('./lib/ck-config-loader.cjs');
const { injectLessonReminder } = require('./lib/prompt-injections.cjs');

const TOP_DEDUP_LINES = 50;

function isMarkerInContext(lines, marker, bottomWindow, topWindow = TOP_DEDUP_LINES) {
    if (!lines || lines.length === 0) return false;
    if (lines.slice(-bottomWindow).some(l => l.includes(marker))) return true;
    if (lines.slice(0, topWindow).some(l => l.includes(marker))) return true;
    return false;
}

async function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);

        const payload = JSON.parse(stdin);
        if (payload.hook_event_name === 'SessionStart') process.exit(0);

        const userPrompt = payload.prompt || '';
        if (!userPrompt.trim()) process.exit(0);

        // Load transcript lines once for all dedup checks
        let transcriptLines = null;
        try {
            if (payload.transcript_path && fs.existsSync(payload.transcript_path)) {
                transcriptLines = fs.readFileSync(payload.transcript_path, 'utf-8').split('\n');
            }
        } catch { /* non-blocking */ }

        // Read confirmation mode for workflow gate
        const wfConfig = loadConfig({ includeProject: false, includeAssertions: false });
        const confirmationMode = wfConfig.workflow?.confirmationMode || 'always';

        // ═══════════════════════════════════════════════════════════════════════
        // GRAPH PROTOCOL — TIER 1: Full reference (deduped)
        // ═══════════════════════════════════════════════════════════════════════
        try {
            const graphDbPath = path.join(process.env.CLAUDE_PROJECT_DIR || '.', '.code-graph', 'graph.db');
            if (fs.existsSync(graphDbPath)) {
                const graphMarker = '[graph] Knowledge graph active';

                if (!isMarkerInContext(transcriptLines, graphMarker, 50)) {
                    console.log(
                        [
                            `${graphMarker}. **ACTION REQUIRED for investigation/scout/review/fix/debug tasks:**`,
                            `- **Grep/Glob/Search-first:** When query is semantic (not file-specific), grep/glob/search for key terms FIRST to find entry point files`,
                            `- **Graph expand:** Run \`python .claude/scripts/code_graph connections <file> --json\` on discovered files`,
                            `- **Full system trace:** Run \`python .claude/scripts/code_graph trace <file> --direction both --json\` to see full upstream (callers, frontend) + downstream (events, bus messages, consumers) flow. Use \`--direction downstream\` for impact-only analysis.`,
                            `- For frontend\u2194backend API tracing \u2192 run \`/graph-connect-api\` skill to match HTTP calls with backend routes`,
                            `- **After Grep/Search finds key files:** Run \`python .claude/scripts/code_graph trace <found-file> --direction both --json\` on the most important 2-3 files from search results to discover full system flow instantly.`,
                            `- **Required for sub-agents:** Include this in sub-agent prompts involving code investigation:\n> "**Graph DB active.** After grep finds key files, run graph trace to discover callers, bus consumers, event chains. Commands: python .claude/scripts/code_graph trace <file> --direction both --json | connections <file> --json. Pattern: grep \u2192 trace \u2192 grep."`,
                            `- Graph finds structural + implicit relationships (MESSAGE_BUS, events, API endpoints) instantly vs grepping 15K files.`,
                            `- Run at least ONE graph command on key files before concluding any investigation, fix, review, or plan.`
                        ].join('\n')
                    );
                }
            }
        } catch { /* silent */ }

        // ═══════════════════════════════════════════════════════════════════════
        // GRAPH PROTOCOL — TIER 2: Compact mandatory reminder (always, no dedup)
        // Only 1 line — minimal token cost (~30 tokens per injection).
        // ═══════════════════════════════════════════════════════════════════════
        try {
            const graphDbForCompact = path.join(process.env.CLAUDE_PROJECT_DIR || '.', '.code-graph', 'graph.db');
            if (fs.existsSync(graphDbForCompact)) {
                console.log(
                    `**[GRAPH-GATE]** Run at least ONE \`python .claude/scripts/code_graph trace <file> --direction both --json\` on key files before concluding any investigation, fix, review, or plan.`
                );
            }
        } catch { /* silent */ }

        // ═══════════════════════════════════════════════════════════════════════
        // WORKFLOW GATE: Compact mandatory reminder (always, no dedup)
        // ═══════════════════════════════════════════════════════════════════════
        if (confirmationMode === 'always') {
            console.log(
                `**[BLOCKING] [WORKFLOW-GATE] MANDATORY IMPORTANT MUST ATTENTION CRITICAL \u2014 Do not skip for any reason. First tool call: \`AskUserQuestion\` for workflow detection. Match prompt against catalog \u2192 ask user \u2192 then proceed.**`
            );
        } else if (confirmationMode === 'never') {
            console.log(
                `**[BLOCKING] [WORKFLOW-GATE] MANDATORY IMPORTANT MUST ATTENTION CRITICAL \u2014 Do not skip for any reason. First action: workflow detection. Match prompt against catalog \u2192 \`/workflow-start\` \u2192 then proceed.**`
            );
        }

        // ═══════════════════════════════════════════════════════════════════════
        // LESSON REMINDER — ABSOLUTE LAST output in this hook.
        // "Check lessons learned" prompt at recency position ensures AI always
        // evaluates session mistakes before finishing.
        // ═══════════════════════════════════════════════════════════════════════
        const reminder = injectLessonReminder(payload.transcript_path);
        if (reminder) console.log(reminder);

        process.exit(0);
    } catch (error) {
        console.error(`<!-- Assembler p2 error: ${error.message} -->`);
        process.exit(0);
    }
}

if (require.main === module) {
    main();
}
