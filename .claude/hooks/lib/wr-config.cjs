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
        whenToUse: 'User wants to implement new functionality, add a feature, create a component, build a capability',
        whenNotToUse: 'Bug fixes, documentation, test-only tasks, feature requests/ideas',
        sequence: ['plan', 'cook', 'test', 'code-review'],
        confirmFirst: true
      },
      bugfix: {
        name: 'Bug Fix',
        whenToUse: 'User reports a bug, error, crash, or something not working; wants to fix/debug',
        whenNotToUse: 'New feature implementation, code improvement, investigation-only',
        sequence: ['scout', 'investigate', 'debug', 'plan', 'fix', 'code-review', 'test'],
        confirmFirst: false
      },
      documentation: {
        name: 'Documentation',
        whenToUse: 'User wants to create, update, or improve documentation, READMEs, or code comments',
        whenNotToUse: 'Feature implementation, bug fixes, test writing',
        sequence: ['scout', 'investigate', 'docs-update', 'watzup'],
        confirmFirst: false
      }
    },
    commandMapping: {
      plan: { claude: '/plan' },
      cook: { claude: '/cook' },
      test: { claude: '/test' },
      'test-initial': { claude: '/test' },
      fix: { claude: '/fix' },
      debug: { claude: '/debug' },
      scout: { claude: '/scout' },
      investigate: { claude: '/feature-investigation' },
      'code-review': { claude: '/code-review' },
      'code-simplifier': { claude: '/code-simplifier' },
      'docs-update': { claude: '/docs-update' },
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
