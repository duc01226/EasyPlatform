#!/usr/bin/env node
'use strict';
/**
 * SessionStart Hook - Auto-install missing npm packages from root package.json
 *
 * Fires: On session startup only
 * Purpose: Ensure MCP server packages and other devDependencies are installed locally
 *          so npx resolves from node_modules (no network call) for faster startup.
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const pkgPath = path.join(projectDir, 'package.json');
const nodeModulesPath = path.join(projectDir, 'node_modules');

function main() {
  // Skip if no root package.json
  if (!fs.existsSync(pkgPath)) return;

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  } catch {
    return;
  }

  const deps = {
    ...pkg.dependencies,
    ...pkg.devDependencies
  };

  if (!deps || Object.keys(deps).length === 0) return;

  // Check which packages are missing from node_modules
  const missing = Object.keys(deps).filter(name => {
    const pkgDir = path.join(nodeModulesPath, ...name.split('/'));
    return !fs.existsSync(pkgDir);
  });

  if (missing.length === 0) return;

  // Run npm install to resolve missing packages
  console.error(`[npm-auto-install] ${missing.length} missing package(s): ${missing.join(', ')}`);

  // Prefer `npm ci` when lockfile exists (deterministic), fallback to `npm install`
  const lockfilePath = path.join(projectDir, 'package-lock.json');
  const hasLockfile = fs.existsSync(lockfilePath);
  const cmd = hasLockfile ? 'npm ci --ignore-scripts' : 'npm install --ignore-scripts';
  console.error(`[npm-auto-install] Running ${cmd}...`);

  try {
    execSync(cmd, {
      cwd: projectDir,
      encoding: 'utf8',
      timeout: 120000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    console.error(`[npm-auto-install] Installed successfully.`);
  } catch (e) {
    console.error(`[npm-auto-install] npm ci failed: ${e.message?.split('\n')[0] || 'unknown error'}`);
  }
}

main();
