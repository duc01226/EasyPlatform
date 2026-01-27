#!/usr/bin/env node
/**
 * SessionStart Hook - Ensures root node_modules packages match package.json
 *
 * Fires: On session startup only
 * Purpose: Auto-install root devDependencies (MCP server packages) if missing
 *
 * Checks each package in root package.json devDependencies.
 * If any are missing from node_modules, runs `npm install` once.
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const PKG_PATH = path.join(ROOT, 'package.json');
const NODE_MODULES = path.join(ROOT, 'node_modules');

function main() {
  try {
    // Skip if no root package.json
    if (!fs.existsSync(PKG_PATH)) {
      process.exit(0);
    }

    const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf-8'));
    const deps = Object.keys(pkg.devDependencies || {});

    if (deps.length === 0) {
      process.exit(0);
    }

    // Check if any package is missing from node_modules
    const missing = deps.filter(dep => {
      const depPath = path.join(NODE_MODULES, ...dep.split('/'));
      return !fs.existsSync(depPath);
    });

    if (missing.length === 0) {
      process.exit(0);
    }

    // Run npm install from root
    console.log(`Installing ${missing.length} missing root package(s): ${missing.join(', ')}`);
    execSync('npm install', {
      cwd: ROOT,
      stdio: 'pipe',
      timeout: 60000
    });
    console.log('Root packages installed successfully.');
  } catch (error) {
    // Non-blocking: log warning but don't fail session startup
    console.error(`Root deps check warning: ${error.message}`);
  }

  process.exit(0);
}

main();
