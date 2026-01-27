#!/usr/bin/env node
/**
 * Workflow Router - Configuration Loading
 *
 * Workflow configuration loading and defaults.
 * Part of workflow-router.cjs modularization.
 *
 * @module wr-config
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Get default workflow configuration
 * @returns {Object} Default workflow config
 */
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
        sequence: ['scout', 'investigate', 'debug', 'plan', 'fix', 'code-review', 'test'],
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
      'code-review': { claude: '/review:codebase' },
      'docs-update': { claude: '/docs:update' },
      watzup: { claude: '/watzup' }
    }
  };
}

/**
 * Load workflow configuration from file or defaults
 * @returns {Object} Workflow configuration
 */
function loadWorkflowConfig() {
  const configPaths = [
    path.join(process.cwd(), '.claude', 'workflows.json'),
    path.join(os.homedir(), '.claude', 'workflows.json')
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

module.exports = {
  getDefaultConfig,
  loadWorkflowConfig
};
