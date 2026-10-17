#!/usr/bin/env node
'use strict';

if ((require.main === module || !require.main) && require('./lib/framework-runtime.cjs').skipHook(module)) return;

/**
 * Runtime skill-selection policy for Claude, Codex and the OpenCode hook bridge. Advisory: host
 * permissions stay intact so a named user request or required hook call can load the real skill.
 * Every restricted prompt, delegated start and recovery receives the full policy. Delivery never
 * depends on a cached presence claim; failed writes leave the next full replay eligible.
 * A transition back to auto emits a reset, including when the config key is removed mid-session.
 * @hook UserPromptSubmit, SubagentStart, SessionStart
 */
const { isHookEntryPoint } = require('./lib/hook-runner.cjs');
const { debugError } = require('./lib/debug-log.cjs');
const crypto = require('node:crypto');
const HOOK_NAME = 'skill-activation-inject';
const MARKER = '<!-- CK:SKILL-ACTIVATION-POLICY -->';

function isPolicyEvent(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
    if (['UserPromptSubmit', 'SubagentStart'].includes(input.hook_event_name)) return true;
    return input.hook_event_name === 'SessionStart' && ['startup', 'resume', 'compact', 'clear'].includes(input.source);
}

function buildPolicy(resolved) {
    if (resolved.enabled) return `${MARKER}\nFramework skill auto-trigger is enabled (${resolved.source}). This replaces the earlier restricted selection policy; normal descriptions and workflow routing apply. Existing user-only skills, permissions and Git authorization still apply.\n`;
    return [
        MARKER,
        `**Framework skill auto-trigger is DISABLED (${resolved.source}).** This policy takes precedence over automatic skill activation tables, task-description matches and suggestions to self-start a workflow.`,
        'Treat all skills in this framework (.claude/skills and its .agents/skills mirror), including workflow wrappers, as heavy. Exceptions: commit and pull-request keep their normal triggers and still require user authorization for Git operations. The lightweight framework-config entry is also eligible for automatic selection on framework questions or configuration requests, so users can discover, change or reset this mode; questions are read-only.',
        'Load a restricted skill ONLY when (1) the human explicitly asks to use that skill/workflow by name or command; (2) an operation-specific framework hook/protocol explicitly requires that named skill for an operation already active; or (3) it is a required dependency/step of a skill or workflow already authorized by (1), (2) or (4), or of an exempt commit/pull-request operation requested by the user; or (4) the human confirms the matched candidate in the skill-choice question below. Generic always-on guidance, prompt classifiers and automatic activation/matching reminders do not create an operation-specific call.',
        'For an ordinary task with a suitable restricted skill match, ask ONE skill-choice question before loading or executing it: name the best-fit skill and briefly explain why it fits, then offer (a) Run the matched skill (recommended); (b) Skip the skill and execute directly. Use ask user tool to ask user when available, otherwise ask in plain text. Stop and wait for the human answer; never infer confirmation from silence. If no suitable restricted skill matches, execute directly without a skill-choice question.',
        'Confirmation authorizes only the selected skill and its required dependencies or selected applicable workflow steps within the requested task. If the human chooses Skip, execute the task directly without that skill or an unrelated replacement; keep required quality and safety checks. Do not re-ask the skill-choice question for the same task on follow-up, delegation or resume; preserve the answer and authorized scope in task state and delegated briefs. Explicit named requests, already authorized required calls/steps and the exempt entry skills above need no skill-choice question.',
        'A generic request to fix, implement, explain or review is NOT permission to load or execute matching heavy skills without confirmation. Optional suggestions, merely reading a skill, or self-selecting an agent that preloads it are NOT authorization. Do not broaden a required call into unrelated skills or extra workflows. Pass this restriction and the authorized scope to delegated agents.',
        'An explicitly requested workflow authorizes its required skill steps and selected applicable steps within its declared scope, including steps recorded in its todo/task plan and executed later or after resume. Each authorized step may call its required nested skills without a new request to name each one. Workflow-declared optional steps scheduled by the authorized workflow are eligible; unrelated optional suggestions are not. Preserve the workflow authorization and scope in the plan and delegated briefs; creating a plan from an ordinary prompt does not itself authorize a heavy workflow.',
        'Commit follows its concise skill; pull-request follows .claude/skills/pull-request/references/check-policy.md, whether auto-trigger is enabled or disabled: never ask the human whether to run tests or review; classify the candidate, decide, act and record. Tests: skip only when the affected tests already passed this session for unchanged content or the change is really small; otherwise run scoped tests and fix failures until all pass. Review: resolve commit.reviewMode through .claude/scripts/lib/commit-review-policy.cjs; default lightweight selects commit-review at every commit risk tier. Configured risk-based mode and PR whole-branch scope use Low skip / Medium why-review / High changes-review. Each review has at most two rounds; the setting never waives required project checks or exact-candidate receipts. Findings still open at that cap, a check that cannot go green or ambiguous intent stop the operation before the commit with a report. An explicit human instruction about tests or review overrides the automatic choice. Selected test/review skills and their required nested calls remain eligible. Never describe skipped work as passed; changed content needs current evidence/receipts, not a transferred Skip.',
        'For an allowed call, load and execute the real SKILL.md using the host-native mechanism; do not bypass skill or commit checks. Selection eligibility is not a skip approval or Git authority. A review selected by the user or the commit decision policy authorizes its workflow and required nested reviewers, validation and tests within that operation. Explicit user constraints, pending questions and existing host permissions still apply.',
        '<!-- /CK:SKILL-ACTIVATION-POLICY -->',
        ''
    ].join('\n');
}


function defaultWrite(text, done) {
    let settled = false;
    const finish = ok => { if (!settled) { settled = true; done(ok); } };
    const onError = () => finish(false);
    process.stdout.once('error', onError);
    process.stdout.write(text, error => {
        if (!error) process.stdout.removeListener('error', onError);
        finish(!error);
    });
}

/** Only a confirmed full delivery updates the reset state; missing storage keeps full replay eligible. */
async function run(input, deps = {}) {
    if (!isPolicyEvent(input)) return '';
    try {
        const { resolveProjectRoot } = require('./lib/project-root.cjs');
        const routing = require('../scripts/lib/workflow-routing-config.cjs');
        const ledger = require('./lib/convention-ledger.cjs');
        const env = deps.env || process.env;
        const rootDir = deps.projectDir || resolveProjectRoot({ cwd: input.cwd || process.cwd(), scriptPath: __filename, env }).rootDir;
        const resolved = require('./lib/prompt-route-utils.cjs').resolveHookSkillAutoTrigger({ projectDir: rootDir, env, homeDir: deps.homeDir });
        const store = routing.resolveSessionStoreRoot(rootDir);
        // A host without agent IDs still starts an isolated context; never mark the main scope present.
        const scoped = input.hook_event_name === 'SubagentStart' && !input.agent_id
            ? { ...input, agent_id: `start-${crypto.randomBytes(6).toString('hex')}` } : input;
        const stateName = `${HOOK_NAME}-${ledger.scopeFor(scoped)}`;
        const hasSession = typeof input.session_id === 'string' && input.session_id.trim() !== '';
        const previous = hasSession ? ledger.readSessionState(store, input.session_id, stateName) : null;
        if (resolved.enabled && previous?.enabled !== false) return '';
        const envelope = text => JSON.stringify({ hookSpecificOutput: { hookEventName: input.hook_event_name, additionalContext: text } });
        const write = deps.write || defaultWrite;
        const fullText = buildPolicy(resolved);
        const payload = envelope(fullText);
        const send = text => new Promise(resolve => {
            try { write(text, ok => resolve(ok === false ? '' : text)); } catch { resolve(''); }
        });
        const delivered = await send(payload);
        if (delivered && hasSession) ledger.writeSessionState(store, input.session_id, stateName, { enabled: resolved.enabled });
        return delivered;
    } catch (error) {
        debugError(HOOK_NAME, error);
        return ''; // advisory policy never blocks a prompt or overrides native access controls
    }
}

module.exports = { HOOK_NAME, MARKER, isPolicyEvent, buildPolicy, run };
if (isHookEntryPoint(module)) {
    process.exitCode = 0;
    const { parseStdinSync } = require('./lib/stdin-parser.cjs');
    run(parseStdinSync({ defaultValue: null, throwOnError: false, context: HOOK_NAME }));
}
