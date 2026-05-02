#!/usr/bin/env node
/**
 * Prompt Context Assembler - Closing Gates (UserPromptSubmit Hook)
 *
 * Injects the "closing gates" that must appear AFTER main context:
 *   1. Graph protocol tier 1 — full reference with dedup (deduped per session)
 *   2. Graph compact mandatory reminder — always injected, no dedup (~30 tokens)
 *   3. Workflow gate compact reminder — always injected, no dedup (~40 tokens)
 *   4. Lesson-learned reminder — always injected, no dedup
 *   5. Workflow-detect closer — ABSOLUTE LAST: workflow selection reminder
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
const { isMarkerInContext, loadTranscriptLines } = require('./lib/transcript-utils.cjs');

async function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);

        const payload = JSON.parse(stdin);
        if (payload.hook_event_name === 'SessionStart') process.exit(0);

        const userPrompt = payload.prompt || '';
        if (!userPrompt.trim()) process.exit(0);

        // Load transcript lines once for all dedup checks
        const transcriptLines = loadTranscriptLines(payload.transcript_path);

        // Read confirmation mode for workflow gate
        const wfConfig = loadConfig({ includeProject: false, includeAssertions: false });
        const confirmationMode = wfConfig.workflow?.confirmationMode || 'always';

        // Resolve graph.db once -- shared by Tier 1 (deduped reference) and Tier 2 (compact reminder).
        let graphDbExists = false;
        try {
            const graphDbPath = path.join(process.env.CLAUDE_PROJECT_DIR || '.', '.code-graph', 'graph.db');
            graphDbExists = fs.existsSync(graphDbPath);
        } catch { /* silent */ }

        // ═══════════════════════════════════════════════════════════════════════
        // GRAPH PROTOCOL — TIER 1: Full reference (deduped)
        // ═══════════════════════════════════════════════════════════════════════
        if (graphDbExists) {
            const graphMarker = '[graph] Knowledge graph active';

            if (!isMarkerInContext(transcriptLines, graphMarker, 50)) {
                console.log(
                    [
                        `${graphMarker}. **ACTION REQUIRED for investigation/scout/review/fix/debug tasks:**`,
                        `- **Grep/Glob/Search-first:** When query semantic (not file-specific), grep/glob/search key terms FIRST to find entry point files`,
                        `- **Graph expand:** Run \`python .claude/scripts/code_graph connections <file> --json\` on discovered files`,
                        `- **Full system trace:** Run \`python .claude/scripts/code_graph trace <file> --direction both --json\` to see full upstream (callers, frontend) + downstream (events, bus messages, consumers) flow. Use \`--direction downstream\` for impact-only analysis.`,
                        `- For frontend\u2194backend API tracing \u2192 run \`/graph-connect-api\` skill to match HTTP calls with backend routes`,
                        `- **After Grep/Search finds key files:** Run \`python .claude/scripts/code_graph trace <found-file> --direction both --json\` on most important 2-3 files from search results to discover full system flow instantly.`,
                        `- **Required for sub-agents:** Include in sub-agent prompts involving code investigation:\n> "**Graph DB active.** After grep finds key files, run graph trace to discover callers, bus consumers, event chains. Commands: python .claude/scripts/code_graph trace <file> --direction both --json | connections <file> --json. Pattern: grep \u2192 trace \u2192 grep."`,
                        `- Graph finds structural + implicit relationships (MESSAGE_BUS, events, API endpoints) instantly vs grepping 15K files.`,
                        `- Run at least ONE graph command on key files before concluding any investigation, fix, review, or plan.`
                    ].join('\n')
                );
            }
        }

        // ═══════════════════════════════════════════════════════════════════════
        // GRAPH PROTOCOL — TIER 2: Compact mandatory reminder (always, no dedup)
        // Only 1 line — minimal token cost (~30 tokens per injection).
        // ═══════════════════════════════════════════════════════════════════════
        if (graphDbExists) {
            console.log(
                `**[GRAPH-GATE]** Run at least ONE \`python .claude/scripts/code_graph trace <file> --direction both --json\` on key files before concluding any investigation, fix, review, or plan.`
            );
        }

        // ═══════════════════════════════════════════════════════════════════════
        // WORKFLOW GATE: Compact mandatory reminder (always, no dedup)
        // ═══════════════════════════════════════════════════════════════════════
        if (confirmationMode === 'always') {
            console.log(
                `**[BLOCKING] [WORKFLOW-GATE] MANDATORY IMPORTANT MUST ATTENTION CRITICAL \u2014 Do not skip for any reason. First tool call: \`AskUserQuestion\` for workflow detection. Find best-match OR compose custom workflow \u2192 present all options with recommendation \u2192 ask user \u2192 then proceed.**`
            );
        } else if (confirmationMode === 'never') {
            console.log(
                `**[BLOCKING] [WORKFLOW-GATE] MANDATORY IMPORTANT MUST ATTENTION CRITICAL \u2014 Do not skip for any reason. First action: workflow detection. Find best-match or compose custom workflow \u2192 \`/workflow-start\` or custom steps \u2192 then proceed.**`
            );
        }

        // ═══════════════════════════════════════════════════════════════════════
        // LESSON REMINDER — injected before workflow-detect closer.
        // ═══════════════════════════════════════════════════════════════════════
        const reminder = injectLessonReminder(payload.transcript_path);
        if (reminder) console.log(reminder);

        // ═══════════════════════════════════════════════════════════════════════
        // TASK-PLANNING REMINDER — always injected, no dedup (~15 tokens)
        // ═══════════════════════════════════════════════════════════════════════
        console.log(
            `**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.`
        );

        // ═══════════════════════════════════════════════════════════════════════
        // ENGINEERING SPEC HINT — generic lookup guidance for any project
        // ═══════════════════════════════════════════════════════════════════════
        console.log(
            `**[SPEC-LOOKUP]** When investigating domain logic, API contracts, or system architecture: check \`docs/specs/\` for engineering reimplementation specs (ERD + rules + API + events + journeys). Run \`ls docs/specs/\` to discover available app buckets, then \`ls docs/specs/{app-bucket}/\` to find the specific system spec. Some projects may keep a flat \`docs/specs/{system-name}/\` layout.`
        );

        // ═══════════════════════════════════════════════════════════════════════
        // WORKFLOW DETECT — ABSOLUTE LAST: Ensures workflow selection is always
        // the most recent instruction before Claude acts on the prompt.
        // Only fires when confirmationMode === 'always'.
        // ═══════════════════════════════════════════════════════════════════════
        if (!isMarkerInContext(transcriptLines, '[WORKFLOW-DETECT]', 10)) {
            if (confirmationMode === 'always') {
                console.log(
                    `**[WORKFLOW-DETECT] Before acting: find best-fit workflow or compose custom step pipeline. Present all options with your recommendation via \`AskUserQuestion\` and await user confirmation.**`
                );
            } else if (confirmationMode === 'never') {
                console.log(
                    `**[WORKFLOW-DETECT] Auto-detect best-fit workflow or compose custom step pipeline for prompt and activate immediately via \`/workflow-start\` — no confirmation needed.**`
                );
            }
        }

        process.exit(0);
    } catch (error) {
        console.error(`<!-- Assembler closers error: ${error.message} -->`);
        process.exit(0);
    }
}

if (require.main === module) {
    main();
}
