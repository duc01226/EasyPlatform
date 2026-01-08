#!/usr/bin/env node
/**
 * Workflow Router - UserPromptSubmit Hook
 *
 * Automatically detects user intent from prompts and injects workflow instructions.
 * Works with workflows.json configuration for customizable workflow definitions.
 *
 * Features:
 * - Pattern-based intent detection
 * - Configurable workflow sequences
 * - Override support (prefix with "quick:" to skip)
 * - Confidence-based confirmation for high-impact workflows
 * - Persistent workflow state tracking for long-running tasks
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

const fs = require('fs');
const path = require('path');
const {
  loadState,
  createState,
  clearState,
  markStepComplete,
  getCurrentStepInfo,
  buildContinuationReminder,
  detectWorkflowControl
} = require('./lib/workflow-state.cjs');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION LOADING
// ═══════════════════════════════════════════════════════════════════════════

function loadWorkflowConfig() {
  const configPaths = [
    path.join(process.cwd(), '.claude', 'workflows.json'),
    path.join(require('os').homedir(), '.claude', 'workflows.json')
  ];

  for (const configPath of configPaths) {
    if (fs.existsSync(configPath)) {
      try {
        return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      } catch (e) {
        console.error(`[workflow-router] Failed to parse ${configPath}: ${e.message}`);
      }
    }
  }

  // Return default config if no file found
  return getDefaultConfig();
}

function getDefaultConfig() {
  return {
    settings: {
      enabled: true,
      confirmHighImpact: true,
      showDetection: true,
      allowOverride: true,
      overridePrefix: 'quick:'
    },
    workflows: {
      feature: {
        name: 'Feature Implementation',
        triggerPatterns: ['\\b(implement|add|create|build)\\b'],
        excludePatterns: ['\\b(fix|bug|error)\\b'],
        sequence: ['plan', 'cook', 'test', 'code-review'],
        confirmFirst: true,
        priority: 10
      },
      bugfix: {
        name: 'Bug Fix',
        triggerPatterns: ['\\b(bug|fix|error|broken|issue)\\b'],
        excludePatterns: [],
        sequence: ['debug', 'plan', 'fix', 'test'],
        confirmFirst: false,
        priority: 20
      },
      documentation: {
        name: 'Documentation',
        triggerPatterns: ['\\b(doc|document|readme)\\b'],
        excludePatterns: ['\\b(implement|fix)\\b'],
        sequence: ['scout', 'investigate', 'docs-update', 'watzup'],
        confirmFirst: false,
        priority: 30
      }
    },
    commandMapping: {
      plan: { claude: '/plan' },
      cook: { claude: '/cook' },
      test: { claude: '/test' },
      fix: { claude: '/fix' },
      debug: { claude: '/debug' },
      'code-review': { claude: '/review/codebase' },
      'docs-update': { claude: '/docs/update' },
      watzup: { claude: '/watzup' }
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// INTENT DETECTION
// ═══════════════════════════════════════════════════════════════════════════

function detectIntent(userPrompt, config) {
  const { workflows, settings } = config;

  // Check for override prefix
  if (settings.allowOverride && settings.overridePrefix) {
    const lowerPrompt = userPrompt.toLowerCase().trim();
    if (lowerPrompt.startsWith(settings.overridePrefix.toLowerCase())) {
      return { skipped: true, reason: 'override_prefix' };
    }
  }

  // Check for explicit command invocation (skip detection)
  if (/^\/\w+/.test(userPrompt.trim())) {
    return { skipped: true, reason: 'explicit_command' };
  }

  // Score each workflow
  const scores = [];

  for (const [workflowId, workflow] of Object.entries(workflows)) {
    let score = 0;
    let matchedPatterns = [];
    let excludeMatched = false;

    // Check exclude patterns first
    if (workflow.excludePatterns && workflow.excludePatterns.length > 0) {
      for (const pattern of workflow.excludePatterns) {
        try {
          if (new RegExp(pattern, 'i').test(userPrompt)) {
            excludeMatched = true;
            break;
          }
        } catch (e) {
          // Invalid regex, skip
        }
      }
    }

    if (excludeMatched) continue;

    // Check trigger patterns
    if (workflow.triggerPatterns && workflow.triggerPatterns.length > 0) {
      for (const pattern of workflow.triggerPatterns) {
        try {
          const regex = new RegExp(pattern, 'i');
          if (regex.test(userPrompt)) {
            score += 10;
            matchedPatterns.push(pattern);
          }
        } catch (e) {
          // Invalid regex, skip
        }
      }
    }

    if (score > 0) {
      scores.push({
        workflowId,
        workflow,
        score,
        matchedPatterns,
        adjustedScore: score - (workflow.priority || 50) // Lower priority number = higher preference
      });
    }
  }

  if (scores.length === 0) {
    return { detected: false };
  }

  // Sort by adjusted score (highest first)
  scores.sort((a, b) => b.adjustedScore - a.adjustedScore);

  const best = scores[0];
  const confidence = Math.min(100, best.score * 10);

  return {
    detected: true,
    workflowId: best.workflowId,
    workflow: best.workflow,
    confidence,
    matchedPatterns: best.matchedPatterns,
    alternatives: scores.slice(1, 3).map(s => s.workflowId)
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// OUTPUT GENERATION
// ═══════════════════════════════════════════════════════════════════════════

function buildWorkflowInstructions(detection, config) {
  const { workflow, workflowId, confidence, alternatives } = detection;
  const { settings, commandMapping } = config;

  const lines = [];

  // Header
  lines.push('');
  lines.push('## Workflow Detected');
  lines.push('');

  // Detection info
  lines.push(`**Intent:** ${workflow.name} (${confidence}% confidence)`);
  if (workflow.description) {
    lines.push(`**Description:** ${workflow.description}`);
  }

  // Workflow sequence
  const sequenceDisplay = workflow.sequence.map(step => {
    const cmd = commandMapping[step];
    return cmd?.claude || `/${step}`;
  }).join(' → ');

  lines.push(`**Workflow:** ${sequenceDisplay}`);
  lines.push('');

  // Instructions
  if (workflow.confirmFirst && settings.confirmHighImpact) {
    lines.push('### Instructions (MUST FOLLOW)');
    lines.push('');
    lines.push('1. **FIRST:** Announce the detected workflow to the user:');
    lines.push(`   > "Detected: **${workflow.name}** workflow. I will follow: ${sequenceDisplay}"`);
    lines.push('');
    lines.push('2. **ASK:** "Proceed with this workflow? (yes/no/quick)"');
    lines.push('   - "yes" → Execute full workflow');
    lines.push('   - "no" → Ask what they want instead');
    lines.push('   - "quick" → Skip workflow, handle directly');
    lines.push('');
    lines.push('3. **THEN:** Execute each step in sequence, using the appropriate slash command');
    lines.push('');
  } else {
    lines.push('### Instructions (MUST FOLLOW)');
    lines.push('');
    lines.push('1. **ANNOUNCE:** Tell the user:');
    lines.push(`   > "Detected: **${workflow.name}** workflow. Following: ${sequenceDisplay}"`);
    lines.push('');
    lines.push('2. **EXECUTE:** Follow the workflow sequence, using each slash command in order');
    lines.push('');
  }

  // Step details
  lines.push('### Workflow Steps');
  lines.push('');
  workflow.sequence.forEach((step, index) => {
    const cmd = commandMapping[step];
    const claudeCmd = cmd?.claude || `/${step}`;
    lines.push(`${index + 1}. \`${claudeCmd}\` - ${getStepDescription(step)}`);
  });
  lines.push('');

  // Alternatives
  if (alternatives && alternatives.length > 0) {
    lines.push(`*Alternative workflows detected: ${alternatives.join(', ')}*`);
    lines.push('');
  }

  // Override hint
  if (settings.allowOverride && settings.overridePrefix) {
    lines.push(`*To skip workflow detection, prefix your message with "${settings.overridePrefix}"*`);
    lines.push('');
  }

  return lines.join('\n');
}

function getStepDescription(step) {
  const descriptions = {
    plan: 'Create implementation plan',
    cook: 'Implement the feature',
    code: 'Execute existing plan',
    test: 'Run tests and verify',
    fix: 'Apply fixes',
    debug: 'Investigate and diagnose',
    'code-review': 'Review code quality',
    'docs-update': 'Update documentation',
    watzup: 'Summarize changes',
    scout: 'Explore codebase',
    investigate: 'Deep dive analysis'
  };
  return descriptions[step] || `Execute ${step}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW STATE HANDLING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Handle workflow control commands (abort, skip, complete)
 * @param {string} action - Control action
 * @param {Object} config - Workflow config
 * @returns {string|null} Response message or null
 */
function handleWorkflowControl(action, config) {
  const state = loadState();
  if (!state) return null;

  const info = getCurrentStepInfo();

  switch (action) {
    case 'abort':
      clearState();
      return `\n## Workflow Aborted\n\nThe **${state.workflowName}** workflow has been cancelled.\n`;

    case 'skip':
      const skipped = markStepComplete(state.sequence[state.currentStep]);
      if (!skipped) {
        return `\n## Workflow Complete\n\nAll steps in **${state.workflowName}** have been completed.\n`;
      }
      const nextInfo = getCurrentStepInfo();
      return `\n## Step Skipped\n\nSkipped step: \`${info.claudeCommand}\`\n\n**Next step:** \`${nextInfo.claudeCommand}\` (${nextInfo.stepNumber}/${nextInfo.totalSteps})\n\nPlease execute the next step to continue the workflow.\n`;

    case 'complete':
      const updated = markStepComplete(state.sequence[state.currentStep]);
      if (!updated) {
        return `\n## Workflow Complete\n\nAll steps in **${state.workflowName}** have been completed successfully!\n`;
      }
      const next = getCurrentStepInfo();
      return `\n## Step Completed\n\nCompleted step: \`${info.claudeCommand}\`\n\n**Next step:** \`${next.claudeCommand}\` (${next.stepNumber}/${next.totalSteps})\n\nPlease execute the next step to continue the workflow.\n`;

    default:
      return null;
  }
}

/**
 * Detect if a skill command was invoked (e.g., "/plan", "/cook")
 * @param {string} prompt - User prompt
 * @param {Object} config - Workflow config
 * @returns {string|null} Step ID if skill invoked, null otherwise
 */
function detectSkillInvocation(prompt, config) {
  const trimmed = prompt.trim();

  // Check if prompt starts with a slash command
  const match = trimmed.match(/^\/(\w+[-\w]*)/);
  if (!match) return null;

  const command = match[1].toLowerCase();

  // Map command to step ID
  for (const [stepId, mapping] of Object.entries(config.commandMapping || {})) {
    const claudeCmd = mapping.claude || `/${stepId}`;
    if (claudeCmd.toLowerCase() === `/${command}` || claudeCmd.toLowerCase().endsWith(`/${command}`)) {
      return stepId;
    }
  }

  return command; // Return raw command as fallback
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  try {
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    const payload = JSON.parse(stdin);
    const userPrompt = payload.prompt || '';

    if (!userPrompt.trim()) process.exit(0);

    const config = loadWorkflowConfig();

    // Check if workflow detection is enabled
    if (!config.settings?.enabled) process.exit(0);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Check for workflow control commands
    // ─────────────────────────────────────────────────────────────────────────
    const controlAction = detectWorkflowControl(userPrompt);
    if (controlAction) {
      const response = handleWorkflowControl(controlAction, config);
      if (response) {
        console.log(response);
        process.exit(0);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: Check for active workflow and inject continuation reminder
    // ─────────────────────────────────────────────────────────────────────────
    const existingState = loadState();
    if (existingState) {
      // Check if user is invoking a skill command that matches current step
      const invokedSkill = detectSkillInvocation(userPrompt, config);
      const currentStep = existingState.sequence[existingState.currentStep];

      if (invokedSkill && invokedSkill === currentStep) {
        // User is executing expected step - don't interrupt, just track
        // The step completion will be handled when skill finishes
        process.exit(0);
      }

      // Check for override prefix to abort active workflow
      if (config.settings.allowOverride && config.settings.overridePrefix) {
        const lowerPrompt = userPrompt.toLowerCase().trim();
        if (lowerPrompt.startsWith(config.settings.overridePrefix.toLowerCase())) {
          clearState();
          process.exit(0);
        }
      }

      // Inject continuation reminder for active workflow
      const reminder = buildContinuationReminder();
      if (reminder) {
        console.log(reminder);
        process.exit(0);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3: Detect new workflow from prompt
    // ─────────────────────────────────────────────────────────────────────────
    const detection = detectIntent(userPrompt, config);

    // Skip if no workflow detected or explicitly skipped
    if (detection.skipped) {
      if (config.settings.showDetection) {
        console.log(`<!-- Workflow detection skipped: ${detection.reason} -->`);
      }
      process.exit(0);
    }

    if (!detection.detected) {
      process.exit(0);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 4: Create workflow state and generate instructions
    // ─────────────────────────────────────────────────────────────────────────
    createState({
      workflowId: detection.workflowId,
      workflowName: detection.workflow.name,
      sequence: detection.workflow.sequence,
      originalPrompt: userPrompt,
      commandMapping: config.commandMapping
    });

    // Generate and output instructions
    const instructions = buildWorkflowInstructions(detection, config);
    console.log(instructions);

    process.exit(0);
  } catch (error) {
    // Non-blocking - just log and exit
    console.error(`<!-- Workflow router error: ${error.message} -->`);
    process.exit(0);
  }
}

main();
