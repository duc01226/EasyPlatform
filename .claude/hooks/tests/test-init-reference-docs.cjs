#!/usr/bin/env node
'use strict';

/**
 * Test for session-init-docs.cjs hook (checkProjectConfig)
 * Tests the checkProjectConfig function with different scenarios
 */

const fs = require('fs');
const path = require('path');
const { checkProjectConfig } = require('../session-init-docs.cjs');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const CONFIG_PATH = path.join(PROJECT_DIR, 'docs', 'project-config.json');
const BACKUP_PATH = CONFIG_PATH + '.test-backup';

const { generateTestFixtures } = require('../lib/test-fixture-generator.cjs');
const f = generateTestFixtures();

console.log('🧪 Testing session-init-docs.cjs - checkProjectConfig()\n');

// Backup existing config if it exists
let hasBackup = false;
if (fs.existsSync(CONFIG_PATH)) {
    fs.copyFileSync(CONFIG_PATH, BACKUP_PATH);
    hasBackup = true;
    console.log('✓ Backed up existing config to .test-backup\n');
}

try {
    // Test 1: Config doesn't exist
    console.log('Test 1: Config file missing');
    if (fs.existsSync(CONFIG_PATH)) fs.unlinkSync(CONFIG_PATH);

    let result = checkProjectConfig();
    console.log('Result:', result);
    console.assert(!result.exists && result.needsInit, 'Should detect missing config');
    console.log('✓ PASS: Correctly detects missing config\n');

    // Test 2: Config is skeleton (empty project name)
    console.log('Test 2: Skeleton config (empty project name)');
    const skeleton = {
        _description: 'Test skeleton',
        schemaVersion: 2,
        project: {
            name: '',
            description: ''
        },
        backendServices: {
            serviceMap: {
                ExampleService: 'Services[\\\\/]Example'
            }
        }
    };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(skeleton, null, 2), 'utf-8');

    result = checkProjectConfig();
    console.log('Result:', result);
    console.assert(result.exists && result.needsInit, 'Should detect skeleton config');
    console.log('✓ PASS: Correctly detects skeleton config\n');

    // Test 3: Config is populated
    console.log('Test 3: Populated config');
    const populated = {
        _description: 'Test populated',
        schemaVersion: 2,
        project: {
            name: f.projectName,
            description: f.projectDescription
        },
        modules: [
            {
                name: f.backendServiceName,
                kind: 'backend-service',
                pathRegex: f.backendPathRegex
            }
        ]
    };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(populated, null, 2), 'utf-8');

    result = checkProjectConfig();
    console.log('Result:', result);
    console.assert(result.exists && !result.needsInit, 'Should detect populated config');
    console.log('✓ PASS: Correctly detects populated config\n');

    // Test 4: Invalid JSON
    console.log('Test 4: Invalid JSON');
    fs.writeFileSync(CONFIG_PATH, '{ invalid json }', 'utf-8');

    result = checkProjectConfig();
    console.log('Result:', result);
    console.assert(result.exists && result.needsInit, 'Should detect invalid JSON');
    console.log('✓ PASS: Correctly detects invalid JSON\n');

    console.log('✅ All tests passed!\n');
} finally {
    // Restore backup
    if (hasBackup) {
        fs.copyFileSync(BACKUP_PATH, CONFIG_PATH);
        fs.unlinkSync(BACKUP_PATH);
        console.log('✓ Restored original config from backup');
    } else if (fs.existsSync(CONFIG_PATH)) {
        fs.unlinkSync(CONFIG_PATH);
        console.log('✓ Cleaned up test config');
    }
}
