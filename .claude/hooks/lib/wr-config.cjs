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
        whenToUse: 'User wants to implement, add, create, or build a new feature or functionality.',
        whenNotToUse: 'User is fixing a bug, refactoring, or investigating.',
        sequence: ['plan', 'cook', 'test', 'code-review'],
        confirmFirst: true
      },
      bugfix: {
        name: 'Bug Fix',
        whenToUse: 'User reports a bug, error, crash, or broken functionality.',
        whenNotToUse: 'User wants new features or refactoring.',
        sequence: ['scout', 'investigate', 'debug', 'plan', 'fix', 'code-review', 'test'],
        confirmFirst: false
      },
      documentation: {
        name: 'Documentation',
        whenToUse: 'User wants to write, update, or improve documentation.',
        whenNotToUse: 'User wants code changes or bug fixes.',
        sequence: ['scout', 'investigate', 'docs-update', 'watzup'],
        confirmFirst: false
      }
    },
    commandMapping: {
      scout: { claude: '/scout' },
      investigate: { claude: '/investigate' },
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
