#!/usr/bin/env node
/**
 * End-to-End Verification: workflow-router.cjs + workflow-step-tracker.cjs + workflow-state.cjs
 *
 * Tests the full workflow lifecycle through actual hook subprocesses and direct library calls.
 *
 * Coverage:
 *   1. State management (createState, markStepComplete, getCurrentStepInfo, etc.)
 *   2. Router hook (new detection, continuation, control commands, conflict, override)
 *   3. Step tracker hook (skill completion, step advancement, workflow completion)
 *   4. Cross-module integration (router creates state → tracker advances → state reflects)
 */
'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ─── Test Infrastructure ────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];
const TEST_SESSION = 'e2e-test-' + Date.now();

// Set isolated session ID for all tests
process.env.CLAUDE_SESSION_ID = TEST_SESSION;

// Import modules under test
const {
    loadState, saveState, clearState, createState,
    markStepComplete, getCurrentStepInfo,
    buildContinuationReminder, getRecoveryContext,
    detectWorkflowControl, getStatePath
} = require('../../lib/workflow-state.cjs');

const { loadWorkflowConfig } = require('../../lib/wr-config.cjs');
const { detectIntent, detectSkillInvocation } = require('../../lib/wr-detect.cjs');
const { buildWorkflowInstructions, buildConflictReminder } = require('../../lib/wr-output.cjs');
const { handleWorkflowControl } = require('../../lib/wr-control.cjs');

function assert(section, desc, condition, details) {
    if (condition) {
        passed++;
    } else {
        failed++;
        failures.push({ section, desc, details: details || 'assertion failed' });
    }
}

function assertEqual(section, desc, actual, expected) {
    if (actual === expected) {
        passed++;
    } else {
        failed++;
        failures.push({ section, desc, details: `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}` });
    }
}

function assertIncludes(section, desc, str, substr) {
    if (typeof str === 'string' && str.includes(substr)) {
        passed++;
    } else {
        failed++;
        failures.push({ section, desc, details: `expected string to include "${substr}", got: ${JSON.stringify(str?.substring?.(0, 100))}` });
    }
}

function cleanup() {
    try { clearState(); } catch (_) { }
}

/**
 * Run a hook as a subprocess with piped stdin
 * @param {string} hookFile - Hook filename
 * @param {Object} payload - JSON payload to send via stdin
 * @returns {string} stdout output
 */
function runHook(hookFile, payload) {
    const hookPath = path.resolve(__dirname, '..', '..', hookFile);
    try {
        const result = execSync(
            `node "${hookPath}"`,
            {
                input: JSON.stringify(payload),
                encoding: 'utf-8',
                env: { ...process.env, CLAUDE_SESSION_ID: TEST_SESSION },
                timeout: 5000,
                stdio: ['pipe', 'pipe', 'pipe']
            }
        );
        return result || '';
    } catch (err) {
        // Hook exited with code 0 but execSync may still capture output
        return err.stdout || '';
    }
}

console.log('══════════════════════════════════════════════════');
console.log('  Workflow E2E Verification');
console.log('  Router + Step Tracker + State Management');
console.log('══════════════════════════════════════════════════\n');

// ═══════════════════════════════════════════════════
// SECTION 1: State Management (workflow-state.cjs)
// ═══════════════════════════════════════════════════
console.log('  [1] State Management...');

// 1.1 Initial state is null
cleanup();
assertEqual('state', 'loadState returns null when no state', loadState(), null);

// 1.2 createState persists and returns state
const testState = createState({
    workflowId: 'feature',
    workflowName: 'Feature Implementation',
    sequence: ['plan', 'cook', 'test', 'watzup'],
    originalPrompt: 'implement dark mode',
    commandMapping: {
        plan: { claude: '/plan' },
        cook: { claude: '/cook' },
        test: { claude: '/test' },
        watzup: { claude: '/watzup' }
    }
});
assert('state', 'createState returns object', testState !== null);
assertEqual('state', 'createState workflowId', testState.workflowId, 'feature');
assertEqual('state', 'createState currentStep', testState.currentStep, 0);
assertEqual('state', 'createState completedSteps empty', testState.completedSteps.length, 0);

// 1.3 loadState reads persisted state
const loaded = loadState();
assert('state', 'loadState returns persisted state', loaded !== null);
assertEqual('state', 'loadState workflowId matches', loaded.workflowId, 'feature');
assertEqual('state', 'loadState sequence length', loaded.sequence.length, 4);

// 1.4 getCurrentStepInfo returns correct first step
const info1 = getCurrentStepInfo();
assert('state', 'getCurrentStepInfo not null', info1 !== null);
assertEqual('state', 'getCurrentStepInfo stepId', info1.stepId, 'plan');
assertEqual('state', 'getCurrentStepInfo stepNumber', info1.stepNumber, 1);
assertEqual('state', 'getCurrentStepInfo totalSteps', info1.totalSteps, 4);
assertEqual('state', 'getCurrentStepInfo claudeCommand', info1.claudeCommand, '/plan');
assertEqual('state', 'getCurrentStepInfo remainingSteps count', info1.remainingSteps.length, 4);
assert('state', 'getCurrentStepInfo has commandMapping', info1.commandMapping !== undefined);

// 1.5 markStepComplete advances to next step
const afterPlan = markStepComplete('plan');
assert('state', 'markStepComplete returns updated state', afterPlan !== null);
assertEqual('state', 'after plan: currentStep', afterPlan.currentStep, 1);
assert('state', 'after plan: completedSteps includes plan', afterPlan.completedSteps.includes('plan'));

const info2 = getCurrentStepInfo();
assertEqual('state', 'after plan: current stepId is cook', info2.stepId, 'cook');
assertEqual('state', 'after plan: stepNumber', info2.stepNumber, 2);

// 1.6 markStepComplete on last step clears state (returns null)
markStepComplete('cook');
markStepComplete('test');
const afterLast = markStepComplete('watzup');
assertEqual('state', 'markStepComplete on last step returns null', afterLast, null);
assertEqual('state', 'state cleared after last step', loadState(), null);

// 1.7 buildContinuationReminder
createState({
    workflowId: 'bugfix',
    workflowName: 'Bug Fix',
    sequence: ['scout', 'investigate', 'fix'],
    originalPrompt: 'fix login bug',
    commandMapping: {
        scout: { claude: '/scout' },
        investigate: { claude: '/investigate' },
        fix: { claude: '/fix' }
    }
});
const reminder = buildContinuationReminder();
assert('state', 'buildContinuationReminder not null', reminder !== null);
assertIncludes('state', 'reminder contains workflow name', reminder, 'Bug Fix');
assertIncludes('state', 'reminder contains current step', reminder, '/scout');
assertIncludes('state', 'reminder contains progress', reminder, 'Step 1/3');

// 1.8 getRecoveryContext
markStepComplete('scout');
const recovery = getRecoveryContext();
assert('state', 'getRecoveryContext not null', recovery !== null);
assertIncludes('state', 'recovery contains workflow name', recovery, 'Bug Fix');
assertIncludes('state', 'recovery contains completed step', recovery, '[x]');
assertIncludes('state', 'recovery contains remaining step', recovery, '[ ]');
assertIncludes('state', 'recovery contains original prompt', recovery, 'fix login bug');

// 1.9 clearState removes state file
clearState();
assertEqual('state', 'clearState clears state', loadState(), null);

// 1.10 detectWorkflowControl
assertEqual('state', 'control: abort', detectWorkflowControl('abort workflow'), 'abort');
assertEqual('state', 'control: stop', detectWorkflowControl('stop'), 'abort');
assertEqual('state', 'control: cancel', detectWorkflowControl('cancel workflow'), 'abort');
assertEqual('state', 'control: skip', detectWorkflowControl('skip'), 'skip');
assertEqual('state', 'control: skip this step', detectWorkflowControl('skip this step'), 'skip');
assertEqual('state', 'control: done', detectWorkflowControl('done'), 'complete');
assertEqual('state', 'control: next', detectWorkflowControl('next'), 'complete');
assertEqual('state', 'control: complete step', detectWorkflowControl('complete step'), 'complete');
assertEqual('state', 'control: random text null', detectWorkflowControl('implement feature'), null);

console.log('  [1] State Management: done\n');

// ═══════════════════════════════════════════════════
// SECTION 2: Intent Detection (wr-detect.cjs)
// ═══════════════════════════════════════════════════
console.log('  [2] Intent Detection...');
cleanup();

const config = loadWorkflowConfig();

// 2.1 Detects feature intent
const featureResult = detectIntent('implement a new auth feature', config);
assert('detect', 'feature detected', featureResult.detected);
assertEqual('detect', 'feature workflowId', featureResult.workflowId, 'feature');
assert('detect', 'feature has confidence', featureResult.confidence > 0);

// 2.2 Detects bugfix intent
const bugfixResult = detectIntent('fix the login bug', config);
assert('detect', 'bugfix detected', bugfixResult.detected);
assertEqual('detect', 'bugfix workflowId', bugfixResult.workflowId, 'bugfix');

// 2.3 Override prefix skips detection
const overrideResult = detectIntent('quick: fix this bug', config);
assert('detect', 'override skipped', overrideResult.skipped);
assertEqual('detect', 'override reason', overrideResult.reason, 'override_prefix');

// 2.4 Explicit command skips detection
const cmdResult = detectIntent('/plan the feature', config);
assert('detect', 'explicit command skipped', cmdResult.skipped);
assertEqual('detect', 'command skip reason', cmdResult.reason, 'explicit_command');

// 2.5 No match for random text
const noMatch = detectIntent('hello world weather today', config);
assert('detect', 'random text no detection', !noMatch.detected && !noMatch.skipped);

// 2.6 detectSkillInvocation with colon commands
const colonSkill = detectSkillInvocation('/review:codebase', config);
assertEqual('detect', 'colon skill: review:codebase → code-review', colonSkill, 'code-review');

const docsSkill = detectSkillInvocation('/docs:update', config);
assertEqual('detect', 'colon skill: docs:update → docs-update', docsSkill, 'docs-update');

const planSkill = detectSkillInvocation('/plan', config);
assertEqual('detect', 'simple skill: /plan → plan', planSkill, 'plan');

const planReviewSkill = detectSkillInvocation('/plan:review', config);
assertEqual('detect', 'colon skill: plan:review → plan-review', planReviewSkill, 'plan-review');

console.log('  [2] Intent Detection: done\n');

// ═══════════════════════════════════════════════════
// SECTION 3: Output Generation (wr-output.cjs)
// ═══════════════════════════════════════════════════
console.log('  [3] Output Generation...');
cleanup();

// 3.1 buildWorkflowInstructions
const detection = detectIntent('implement search feature', config);
const instructions = buildWorkflowInstructions(detection, config);
assert('output', 'instructions not empty', instructions.length > 0);
assertIncludes('output', 'instructions contains workflow name', instructions, detection.workflow.name);
assertIncludes('output', 'instructions contains MUST FOLLOW', instructions, 'MUST FOLLOW');
assertIncludes('output', 'instructions contains step list', instructions, '/plan');
assertIncludes('output', 'instructions contains todo tracking', instructions, '[Workflow]');

// 3.2 buildConflictReminder
createState({
    workflowId: 'bugfix',
    workflowName: 'Bug Fix',
    sequence: ['scout', 'investigate', 'fix'],
    originalPrompt: 'fix login',
    commandMapping: config.commandMapping
});
const newDetection = detectIntent('implement search feature', config);
const conflict = buildConflictReminder(loadState(), newDetection, config);
assertIncludes('output', 'conflict has intent change header', conflict, 'Intent Change');
assertIncludes('output', 'conflict shows active workflow', conflict, 'Bug Fix');
assertIncludes('output', 'conflict shows new intent', conflict, detection.workflow.name);
assertIncludes('output', 'conflict has switch option', conflict, 'switch');
cleanup();

console.log('  [3] Output Generation: done\n');

// ═══════════════════════════════════════════════════
// SECTION 4: Control Handler (wr-control.cjs)
// ═══════════════════════════════════════════════════
console.log('  [4] Control Handler...');

// 4.1 Abort clears state
createState({
    workflowId: 'feature',
    workflowName: 'Feature Implementation',
    sequence: ['plan', 'cook', 'test'],
    originalPrompt: 'add dark mode',
    commandMapping: config.commandMapping
});
const abortResponse = handleWorkflowControl('abort', config);
assertIncludes('control', 'abort response confirms cancellation', abortResponse, 'Aborted');
assertIncludes('control', 'abort response has workflow name', abortResponse, 'Feature Implementation');
assertEqual('control', 'state cleared after abort', loadState(), null);

// 4.2 Skip advances to next step
createState({
    workflowId: 'bugfix',
    workflowName: 'Bug Fix',
    sequence: ['scout', 'investigate', 'fix'],
    originalPrompt: 'fix login',
    commandMapping: config.commandMapping
});
const skipResponse = handleWorkflowControl('skip', config);
assertIncludes('control', 'skip response confirms skip', skipResponse, 'Skipped');
const afterSkip = loadState();
assert('control', 'state still exists after skip', afterSkip !== null);
assertEqual('control', 'currentStep advanced after skip', afterSkip.currentStep, 1);

// 4.3 Complete advances to next step
const completeResponse = handleWorkflowControl('complete', config);
assertIncludes('control', 'complete response confirms completion', completeResponse, 'Completed');
const afterComplete = loadState();
assert('control', 'state still exists after complete', afterComplete !== null);
assertEqual('control', 'currentStep advanced after complete', afterComplete.currentStep, 2);

// 4.4 Complete on last step finishes workflow
const finalResponse = handleWorkflowControl('complete', config);
assertIncludes('control', 'final complete confirms workflow done', finalResponse, 'Workflow Complete');
assertEqual('control', 'state cleared after final complete', loadState(), null);

// 4.5 No state returns null
const noStateResponse = handleWorkflowControl('abort', config);
assertEqual('control', 'no state returns null', noStateResponse, null);

console.log('  [4] Control Handler: done\n');

// ═══════════════════════════════════════════════════
// SECTION 5: Router Hook (workflow-router.cjs via subprocess)
// ═══════════════════════════════════════════════════
console.log('  [5] Router Hook (subprocess)...');
cleanup();

// 5.1 New workflow detection
const routerOutput1 = runHook('workflow-router.cjs', { prompt: 'implement a new search feature' });
assertIncludes('router', 'detects feature workflow', routerOutput1, 'Workflow Detected');
assert('router', 'creates workflow state', loadState() !== null);
assertEqual('router', 'state workflowId is feature', loadState()?.workflowId, 'feature');
cleanup();

// 5.2 No detection for random text
const routerOutput2 = runHook('workflow-router.cjs', { prompt: 'hello world weather' });
assertEqual('router', 'no detection for random text', routerOutput2.trim(), '');
assertEqual('router', 'no state created', loadState(), null);

// 5.3 Override prefix skips
const routerOutput3 = runHook('workflow-router.cjs', { prompt: 'quick: implement something' });
assert('router', 'override prefix handled', !routerOutput3.includes('Workflow Detected'));

// 5.4 Explicit command skips detection
const routerOutput4 = runHook('workflow-router.cjs', { prompt: '/plan the feature' });
assert('router', 'explicit command not detected as workflow', !routerOutput4.includes('Workflow Detected'));

// 5.5 Active workflow continuation reminder
createState({
    workflowId: 'feature',
    workflowName: 'Feature Implementation',
    sequence: ['plan', 'cook', 'test'],
    originalPrompt: 'add feature',
    commandMapping: config.commandMapping
});
const routerOutput5 = runHook('workflow-router.cjs', { prompt: 'some random question' });
assertIncludes('router', 'continuation reminder shown', routerOutput5, 'Active Workflow');
cleanup();

// 5.6 Active workflow — user invokes expected step (no interruption)
createState({
    workflowId: 'feature',
    workflowName: 'Feature Implementation',
    sequence: ['plan', 'cook', 'test'],
    originalPrompt: 'add feature',
    commandMapping: config.commandMapping
});
const routerOutput6 = runHook('workflow-router.cjs', { prompt: '/plan implement the feature' });
assert('router', 'expected step invocation not interrupted', !routerOutput6.includes('Active Workflow'));
cleanup();

// 5.7 Workflow control: abort
createState({
    workflowId: 'feature',
    workflowName: 'Feature Implementation',
    sequence: ['plan', 'cook', 'test'],
    originalPrompt: 'add feature',
    commandMapping: config.commandMapping
});
const routerOutput7 = runHook('workflow-router.cjs', { prompt: 'abort workflow' });
assertIncludes('router', 'abort control handled', routerOutput7, 'Aborted');
assertEqual('router', 'state cleared by abort', loadState(), null);

// 5.8 Override prefix clears active workflow
createState({
    workflowId: 'feature',
    workflowName: 'Feature Implementation',
    sequence: ['plan', 'cook', 'test'],
    originalPrompt: 'add feature',
    commandMapping: config.commandMapping
});
runHook('workflow-router.cjs', { prompt: 'quick: do something else' });
assertEqual('router', 'override prefix clears state', loadState(), null);

console.log('  [5] Router Hook: done\n');

// ═══════════════════════════════════════════════════
// SECTION 6: Step Tracker Hook (workflow-step-tracker.cjs via subprocess)
// ═══════════════════════════════════════════════════
console.log('  [6] Step Tracker Hook (subprocess)...');
cleanup();

// 6.1 Skill completion advances workflow
createState({
    workflowId: 'feature',
    workflowName: 'Feature Implementation',
    sequence: ['plan', 'cook', 'test', 'watzup'],
    originalPrompt: 'add feature',
    commandMapping: config.commandMapping
});

const trackerOutput1 = runHook('workflow-step-tracker.cjs', {
    tool_name: 'Skill',
    tool_input: { skill: 'plan' },
    tool_response: 'Plan completed'
});
assertIncludes('tracker', 'step completed message', trackerOutput1, 'Step Completed');
assertIncludes('tracker', 'shows next step', trackerOutput1, '/cook');

const stateAfterPlan = loadState();
assert('tracker', 'state exists after first step', stateAfterPlan !== null);
assertEqual('tracker', 'currentStep advanced to 1', stateAfterPlan?.currentStep, 1);
assert('tracker', 'completedSteps includes plan', stateAfterPlan?.completedSteps?.includes('plan'));

// 6.2 Non-Skill tool ignored
const trackerOutput2 = runHook('workflow-step-tracker.cjs', {
    tool_name: 'Read',
    tool_input: { file_path: '/some/file' },
    tool_response: 'file content'
});
assertEqual('tracker', 'non-Skill tool produces no output', trackerOutput2.trim(), '');
assertEqual('tracker', 'state unchanged after non-Skill', loadState()?.currentStep, 1);

// 6.3 Unrelated skill ignored
const trackerOutput3 = runHook('workflow-step-tracker.cjs', {
    tool_name: 'Skill',
    tool_input: { skill: 'commit' },
    tool_response: 'committed'
});
assertEqual('tracker', 'unrelated skill produces no output', trackerOutput3.trim(), '');
assertEqual('tracker', 'state unchanged after unrelated skill', loadState()?.currentStep, 1);

// 6.4 Complete remaining steps to verify workflow completion
runHook('workflow-step-tracker.cjs', {
    tool_name: 'Skill',
    tool_input: { skill: 'cook' },
    tool_response: 'Cooked'
});
assertEqual('tracker', 'after cook: currentStep is 2', loadState()?.currentStep, 2);

runHook('workflow-step-tracker.cjs', {
    tool_name: 'Skill',
    tool_input: { skill: 'test' },
    tool_response: 'Tested'
});
assertEqual('tracker', 'after test: currentStep is 3', loadState()?.currentStep, 3);

const trackerOutputFinal = runHook('workflow-step-tracker.cjs', {
    tool_name: 'Skill',
    tool_input: { skill: 'watzup' },
    tool_response: 'Summarized'
});
assertIncludes('tracker', 'final step shows workflow complete', trackerOutputFinal, 'Workflow Complete');
assertEqual('tracker', 'state cleared after final step', loadState(), null);

// 6.5 Colon-notation skill maps correctly (review:codebase → code-review)
createState({
    workflowId: 'review',
    workflowName: 'Code Review',
    sequence: ['code-review', 'watzup'],
    originalPrompt: 'review the code',
    commandMapping: config.commandMapping
});

const trackerOutput5 = runHook('workflow-step-tracker.cjs', {
    tool_name: 'Skill',
    tool_input: { skill: 'review:codebase' },
    tool_response: 'Review complete'
});
assertIncludes('tracker', 'colon skill advances step', trackerOutput5, 'Step Completed');
assertEqual('tracker', 'colon skill: currentStep advanced', loadState()?.currentStep, 1);
cleanup();

// 6.6 docs:update skill maps correctly (docs:update → docs-update)
createState({
    workflowId: 'documentation',
    workflowName: 'Documentation',
    sequence: ['scout', 'investigate', 'docs-update', 'watzup'],
    originalPrompt: 'update docs',
    commandMapping: config.commandMapping
});
// Advance past scout and investigate first
markStepComplete('scout');
markStepComplete('investigate');

const trackerOutput6 = runHook('workflow-step-tracker.cjs', {
    tool_name: 'Skill',
    tool_input: { skill: 'docs:update' },
    tool_response: 'Docs updated'
});
assertIncludes('tracker', 'docs:update skill advances step', trackerOutput6, 'Step Completed');
const docsState = loadState();
assertEqual('tracker', 'docs:update currentStep at 3 (watzup)', docsState?.currentStep, 3);
cleanup();

console.log('  [6] Step Tracker Hook: done\n');

// ═══════════════════════════════════════════════════
// SECTION 7: Full Lifecycle Integration
// ═══════════════════════════════════════════════════
console.log('  [7] Full Lifecycle Integration...');
cleanup();

// 7.1 Complete end-to-end: detect → create → advance → complete
// Step 1: Router detects workflow
const e2eOutput1 = runHook('workflow-router.cjs', { prompt: 'fix the login bug' });
assertIncludes('e2e', 'router detects bugfix', e2eOutput1, 'Workflow Detected');
const e2eState1 = loadState();
assert('e2e', 'state created', e2eState1 !== null);
assertEqual('e2e', 'bugfix workflow detected', e2eState1?.workflowId, 'bugfix');

// Step 2: User sends another prompt → gets continuation reminder
const e2eOutput2 = runHook('workflow-router.cjs', { prompt: 'what about the sidebar' });
assertIncludes('e2e', 'continuation reminder shown', e2eOutput2, 'Active Workflow');

// Step 3: Skills complete steps sequentially
const steps = e2eState1.sequence;
for (let i = 0; i < steps.length; i++) {
    const stepId = steps[i];
    // Map step ID to skill name (some use colon notation)
    let skillName = stepId;
    const cmd = config.commandMapping?.[stepId];
    if (cmd?.claude) {
        skillName = cmd.claude.replace(/^\//, '');
    }

    const output = runHook('workflow-step-tracker.cjs', {
        tool_name: 'Skill',
        tool_input: { skill: skillName },
        tool_response: `${stepId} done`
    });

    if (i < steps.length - 1) {
        assertIncludes('e2e', `step ${i + 1} (${stepId}) completed`, output, 'Step Completed');
        assert('e2e', `state exists after step ${i + 1}`, loadState() !== null);
    } else {
        assertIncludes('e2e', `final step (${stepId}) completes workflow`, output, 'Workflow Complete');
        assertEqual('e2e', 'state cleared after workflow', loadState(), null);
    }
}

// 7.2 Abort mid-workflow
runHook('workflow-router.cjs', { prompt: 'refactor the auth module' });
assert('e2e', 'new workflow created', loadState() !== null);
runHook('workflow-router.cjs', { prompt: 'abort workflow' });
assertEqual('e2e', 'abort clears mid-workflow state', loadState(), null);

// 7.3 Skip steps
runHook('workflow-router.cjs', { prompt: 'update the docs' });
const skipState1 = loadState();
assert('e2e', 'docs workflow created', skipState1 !== null);
runHook('workflow-router.cjs', { prompt: 'skip' });
const skipState2 = loadState();
assert('e2e', 'state exists after skip', skipState2 !== null);
assertEqual('e2e', 'step advanced after skip', skipState2?.currentStep, 1);
cleanup();

console.log('  [7] Full Lifecycle: done\n');

// ═══════════════════════════════════════════════════
// SECTION 8: Session Isolation
// ═══════════════════════════════════════════════════
console.log('  [8] Session Isolation...');
cleanup();

// 8.1 Different session IDs have separate state
const origSession = process.env.CLAUDE_SESSION_ID;
process.env.CLAUDE_SESSION_ID = 'session-A-' + Date.now();
createState({
    workflowId: 'feature',
    workflowName: 'Session A Workflow',
    sequence: ['plan', 'cook'],
    originalPrompt: 'session A task',
    commandMapping: {}
});
const sessionAState = loadState();
assertEqual('isolation', 'session A state exists', sessionAState?.workflowId, 'feature');

process.env.CLAUDE_SESSION_ID = 'session-B-' + Date.now();
assertEqual('isolation', 'session B state is null', loadState(), null);

createState({
    workflowId: 'bugfix',
    workflowName: 'Session B Workflow',
    sequence: ['scout', 'fix'],
    originalPrompt: 'session B task',
    commandMapping: {}
});
assertEqual('isolation', 'session B has own state', loadState()?.workflowId, 'bugfix');

// Clean up both sessions
clearState();
process.env.CLAUDE_SESSION_ID = 'session-A-' + Date.now().toString().slice(0, -1) + '0';
// Note: original session A has different timestamp, just verify isolation principle worked
process.env.CLAUDE_SESSION_ID = origSession;
cleanup();

console.log('  [8] Session Isolation: done\n');

// ═══════════════════════════════════════════════════
// SECTION 9: Edge Cases
// ═══════════════════════════════════════════════════
console.log('  [9] Edge Cases...');
cleanup();

// 9.1 markStepComplete on non-existent step
createState({
    workflowId: 'test',
    workflowName: 'Test',
    sequence: ['plan', 'cook'],
    originalPrompt: 'test',
    commandMapping: {}
});
const nonExistent = markStepComplete('nonexistent');
assertEqual('edge', 'non-existent step: state unchanged', nonExistent?.currentStep, 0);
cleanup();

// 9.2 markStepComplete on already completed step
createState({
    workflowId: 'test',
    workflowName: 'Test',
    sequence: ['plan', 'cook', 'test'],
    originalPrompt: 'test',
    commandMapping: {}
});
markStepComplete('plan');
const dupComplete = markStepComplete('plan');
assertEqual('edge', 'duplicate complete: currentStep stays at 1', dupComplete?.currentStep, 1);
assertEqual('edge', 'duplicate complete: plan in completedSteps once', dupComplete?.completedSteps?.filter(s => s === 'plan').length, 1);
cleanup();

// 9.3 Empty prompt produces no output
const emptyOutput = runHook('workflow-router.cjs', { prompt: '' });
assertEqual('edge', 'empty prompt: no output', emptyOutput.trim(), '');

// 9.4 detectWorkflowControl case insensitivity
assertEqual('edge', 'control: ABORT WORKFLOW', detectWorkflowControl('ABORT WORKFLOW'), 'abort');
assertEqual('edge', 'control: Skip This Step', detectWorkflowControl('Skip This Step'), 'skip');
assertEqual('edge', 'control: DONE', detectWorkflowControl('DONE'), 'complete');

// 9.5 State file path sanitization (no path injection)
const maliciousPath = getStatePath('../../etc/passwd');
assert('edge', 'path injection sanitized', !maliciousPath.includes('..'));
assertIncludes('edge', 'sanitized path in workflow dir', maliciousPath, 'workflow');

console.log('  [9] Edge Cases: done\n');

// ═══════════════════════════════════════════════════
// FINAL CLEANUP & RESULTS
// ═══════════════════════════════════════════════════
cleanup();

console.log('══════════════════════════════════════════════════');
if (failures.length > 0) {
    console.log(`\n  FAILURES (${failures.length}):\n`);
    for (const f of failures) {
        console.log(`  [${f.section}] ${f.desc}`);
        console.log(`    ${f.details}\n`);
    }
}
console.log(`  RESULT: ${passed} passed, ${failed} failed (${passed + failed} total)`);
console.log('══════════════════════════════════════════════════');

process.exit(failed > 0 ? 1 : 0);
