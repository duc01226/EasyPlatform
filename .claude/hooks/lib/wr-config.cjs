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
const { resolvePortabilityTokens } = require('./project-config-loader.cjs');

/**
 * Get default workflow configuration
 * @returns {Object} Default workflow config
 */
function getDefaultConfig() {
  return {
    settings: {
      enabled: true,
      showDetection: true
    },
    workflows: {
      feature: {
        name: 'Feature Implementation',
        whenToUse: 'User wants to implement new functionality, add a feature, create a component, build a capability',
        whenNotToUse: 'Bug fixes, documentation, test-only tasks, feature requests/ideas',
        sequence: ['plan', 'cook', 'test', 'code-review']
      },
      bugfix: {
        name: 'Bug Fix',
        whenToUse: 'User reports a bug, error, crash, stale/incorrect final output, regression, or something not working; wants to fix/debug with end-to-start trace',
        whenNotToUse: 'New feature implementation, code improvement, investigation-only',
        sequence: ['scout', 'investigate', 'debug', 'plan', 'fix', 'code-review', 'test'],
        requiredGate: 'End-to-start debugger trace: observed final output -> reader -> storage/projection -> writer -> consumer/job -> producer/origin; include feeder paths, hypothesis matrix, owning fix layer, and forward convergence proof before fix'
      },
      documentation: {
        name: 'Documentation',
        whenToUse: 'User wants to create, update, or improve documentation, READMEs, or code comments',
        whenNotToUse: 'Feature implementation, bug fixes, test writing',
        sequence: ['scout', 'investigate', 'docs-update', 'watzup']
      }
    },
    commandMapping: {
      plan: { claude: '/plan' },
      cook: { claude: '/cook' },
      test: { claude: '/test' },
      'test-initial': { claude: '/test' },
      fix: { claude: '/fix' },
      debug: { claude: '/debug-investigate' },
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
 * Resolve portability path tokens in every workflow's description + injectContext
 * at the single load boundary, so all downstream consumers (catalog, injected
 * protocol, p2/p3 step builders) receive concrete project paths — never a raw
 * `{configured-...}` token. Fail-open: any error leaves config unmodified.
 * @param {Object} config - parsed workflows.json
 * @returns {Object} same config, tokens resolved in place
 */
function resolveWorkflowTokens(config) {
  try {
    const workflows = config && config.workflows;
    if (!workflows || typeof workflows !== 'object') return config;
    for (const wf of Object.values(workflows)) {
      if (!wf || typeof wf !== 'object') continue;
      if (typeof wf.description === 'string') {
        wf.description = resolvePortabilityTokens(wf.description);
      }
      if (wf.preActions && typeof wf.preActions.injectContext === 'string') {
        wf.preActions.injectContext = resolvePortabilityTokens(wf.preActions.injectContext);
      }
    }
  } catch (e) {
    console.error(`[workflow-router] token resolve failed: ${e.message}`);
  }
  return config;
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
        return resolveWorkflowTokens(JSON.parse(fs.readFileSync(configPath, 'utf-8')));
      } catch (e) {
        console.error(`[workflow-router] Failed to parse ${configPath}: ${e.message}`);
      }
    }
  }

  // Return default config if no file found (defaults carry no portability tokens)
  return getDefaultConfig();
}

module.exports = {
  getDefaultConfig,
  loadWorkflowConfig
};
