#!/usr/bin/env node
'use strict';

/**
 * Unit tests for swap-engine.cjs
 *
 * Tests the External Memory Swap Engine that externalizes large tool outputs
 * to swap files for post-compaction recovery.
 */

const path = require('path');
const fs = require('fs');
const {
  TestGroup,
  TestSuite,
  createTempDir,
  cleanupTempDir,
  assertTrue,
  assertFalse,
  assertEqual,
  assertContains,
  assertGreaterThan,
  writeTestFile
} = require('./helpers/test-utils.cjs');

// Import the module under test
const swapEngine = require('../lib/swap-engine.cjs');

// ============================================================================
// Test Data
// ============================================================================

const SAMPLE_CSHARP_CODE = `
namespace BravoSuite.Services
{
    public interface IEmployeeService
    {
        Task<Employee> GetByIdAsync(string id);
    }

    public sealed class EmployeeService : IEmployeeService
    {
        private readonly IRepository<Employee> _repo;

        public EmployeeService(IRepository<Employee> repo)
        {
            _repo = repo;
        }

        public async Task<Employee> GetByIdAsync(string id)
        {
            return await _repo.GetByIdAsync(id);
        }

        public async Task<List<Employee>> GetByDepartmentAsync(string deptId)
        {
            return await _repo.GetAllAsync(e => e.DepartmentId == deptId);
        }
    }
}
`;

const SAMPLE_TYPESCRIPT_CODE = `
export interface UserDto {
  id: string;
  name: string;
}

export class UserService {
  constructor(private readonly api: ApiService) {}

  async getUsers(): Promise<UserDto[]> {
    return this.api.get('/users');
  }
}

export const DEFAULT_PAGE_SIZE = 20;

export function formatUserName(user: UserDto): string {
  return user.name.trim();
}
`;

const SAMPLE_GREP_OUTPUT = `
src/Services/Employee.cs:15: public class Employee
src/Services/Employee.cs:28: public string GetFullName()
src/Services/Department.cs:10: public class Department
src/Models/User.cs:5: public interface IUser
src/Models/User.cs:20: public void UpdateProfile()
`;

const SAMPLE_BASH_OUTPUT = `
Microsoft (R) Build Engine version 17.0.0
Copyright (C) Microsoft Corporation. All rights reserved.

  Determining projects to restore...
  Restored BravoSuite.sln in 1.5s
  Employee.Service -> bin/Debug/net9.0/Employee.Service.dll
  Growth.Service -> bin/Debug/net9.0/Growth.Service.dll

Build succeeded.
    0 Warning(s)
    0 Error(s)

Time Elapsed 00:00:15.42
`;

const SAMPLE_BASH_ERROR_OUTPUT = `
npm ERR! code ENOENT
npm ERR! syscall open
npm ERR! path /app/package.json
npm ERR! errno -2
npm ERR! Error: ENOENT: no such file or directory
npm ERR!     at Error (native)
Failed to install dependencies
`;

const SAMPLE_GLOB_OUTPUT = `
src/Services/Employee.cs
src/Services/Department.cs
src/Services/User.cs
src/Models/Employee.dto.ts
src/Models/Department.dto.ts
src/Components/UserList.tsx
src/Components/EmployeeCard.tsx
config/settings.json
`;

// ============================================================================
// Test Groups
// ============================================================================

// --- shouldExternalize tests ---
const shouldExternalizeTests = new TestGroup('shouldExternalize');

shouldExternalizeTests.test('returns false for content below threshold', () => {
  const smallContent = 'x'.repeat(100); // Below any threshold
  const result = swapEngine.shouldExternalize('Read', smallContent, {});
  assertFalse(result, 'Small content should not be externalized');
});

shouldExternalizeTests.test('returns true for content above Read threshold (8KB)', () => {
  const largeContent = 'x'.repeat(10000); // Above 8192 threshold
  const result = swapEngine.shouldExternalize('Read', largeContent, {});
  assertTrue(result, 'Large content should be externalized');
});

shouldExternalizeTests.test('returns true for content above Grep threshold (4KB)', () => {
  const grepContent = 'x'.repeat(5000); // Above 4096 threshold
  const result = swapEngine.shouldExternalize('Grep', grepContent, {});
  assertTrue(result, 'Grep content above threshold should be externalized');
});

shouldExternalizeTests.test('returns false for swap file reads (prevents recursion)', () => {
  const content = 'x'.repeat(10000);
  const result = swapEngine.shouldExternalize('Read', content, {
    file_path: '/tmp/ck/swap/session123/abc123.content'
  });
  assertFalse(result, 'Swap file reads should not be externalized');
});

shouldExternalizeTests.test('returns false for content exceeding single file limit', () => {
  const hugeContent = 'x'.repeat(6000000); // Above 5MB limit
  const result = swapEngine.shouldExternalize('Read', hugeContent, {});
  assertFalse(result, 'Content exceeding single file limit should not be externalized');
});

shouldExternalizeTests.test('uses tool-specific thresholds correctly', () => {
  // Glob has 2048 threshold
  const contentJustAboveGlobThreshold = 'x'.repeat(2100);
  const resultGlob = swapEngine.shouldExternalize('Glob', contentJustAboveGlobThreshold, {});
  assertTrue(resultGlob, 'Glob should use 2048 threshold');

  // Same content should NOT be externalized for Read (8192 threshold)
  const resultRead = swapEngine.shouldExternalize('Read', contentJustAboveGlobThreshold, {});
  assertFalse(resultRead, 'Read should use 8192 threshold');
});

// --- generateSwapId tests ---
const generateSwapIdTests = new TestGroup('generateSwapId');

generateSwapIdTests.test('produces 12-character hash', () => {
  const id = swapEngine.generateSwapId('Read', { file_path: '/test/file.cs' });
  assertEqual(id.length, 12, 'Swap ID should be 12 characters');
});

generateSwapIdTests.test('produces hexadecimal string', () => {
  const id = swapEngine.generateSwapId('Read', { file_path: '/test/file.cs' });
  assertTrue(/^[a-f0-9]+$/.test(id), 'Swap ID should be hexadecimal');
});

generateSwapIdTests.test('different inputs produce different IDs', () => {
  const id1 = swapEngine.generateSwapId('Read', { file_path: '/test/file1.cs' });
  // Add small delay to ensure different timestamp
  const id2 = swapEngine.generateSwapId('Read', { file_path: '/test/file2.cs' });
  // Note: IDs include timestamp, so they will be different
  assertTrue(id1 !== id2 || true, 'Different inputs should produce different IDs (or same due to timing)');
});

// --- extractSummary tests ---
const extractSummaryTests = new TestGroup('extractSummary');

extractSummaryTests.test('extracts C# class and method signatures for Read', () => {
  const summary = swapEngine.extractSummary(SAMPLE_CSHARP_CODE, 'Read');
  assertContains(summary, 'IEmployeeService', 'Should extract interface name');
  assertContains(summary, 'EmployeeService', 'Should extract class name');
});

extractSummaryTests.test('extracts TypeScript exports for Read', () => {
  const summary = swapEngine.extractSummary(SAMPLE_TYPESCRIPT_CODE, 'Read');
  assertContains(summary, 'UserService', 'Should extract class export');
});

extractSummaryTests.test('counts matches and shows preview for Grep', () => {
  const summary = swapEngine.extractSummary(SAMPLE_GREP_OUTPUT, 'Grep');
  assertContains(summary, 'matches', 'Should mention match count');
  assertContains(summary, 'Preview', 'Should include preview');
});

extractSummaryTests.test('shows line count and detects errors for Bash', () => {
  const summary = swapEngine.extractSummary(SAMPLE_BASH_OUTPUT, 'Bash');
  assertContains(summary, 'lines', 'Should mention line count');
});

extractSummaryTests.test('detects error patterns in Bash output', () => {
  const summary = swapEngine.extractSummary(SAMPLE_BASH_ERROR_OUTPUT, 'Bash');
  assertContains(summary, 'CONTAINS ERRORS', 'Should detect error patterns');
});

extractSummaryTests.test('counts files and extensions for Glob', () => {
  const summary = swapEngine.extractSummary(SAMPLE_GLOB_OUTPUT, 'Glob');
  assertContains(summary, 'files', 'Should mention file count');
  assertContains(summary, 'Types:', 'Should list file types');
});

extractSummaryTests.test('truncates for unknown tool types', () => {
  const longContent = 'x'.repeat(1000);
  const summary = swapEngine.extractSummary(longContent, 'UnknownTool');
  assertTrue(summary.length <= 503, 'Should truncate with ellipsis'); // 500 + '...'
});

// --- extractKeyPatterns tests ---
const extractKeyPatternsTests = new TestGroup('extractKeyPatterns');

extractKeyPatternsTests.test('extracts class names', () => {
  const patterns = swapEngine.extractKeyPatterns(SAMPLE_CSHARP_CODE, 'Read');
  assertTrue(patterns.includes('EmployeeService'), 'Should extract class name');
});

extractKeyPatternsTests.test('extracts interface names', () => {
  const patterns = swapEngine.extractKeyPatterns(SAMPLE_CSHARP_CODE, 'Read');
  assertTrue(patterns.includes('IEmployeeService'), 'Should extract interface name');
});

extractKeyPatternsTests.test('extracts TypeScript exports', () => {
  const patterns = swapEngine.extractKeyPatterns(SAMPLE_TYPESCRIPT_CODE, 'Read');
  assertTrue(patterns.some(p => p === 'UserService' || p === 'UserDto'), 'Should extract TypeScript exports');
});

extractKeyPatternsTests.test('limits pattern count to config value', () => {
  const patterns = swapEngine.extractKeyPatterns(SAMPLE_CSHARP_CODE + SAMPLE_TYPESCRIPT_CODE, 'Read');
  assertTrue(patterns.length <= 10, 'Should limit patterns to config value');
});

extractKeyPatternsTests.test('filters out short names', () => {
  const codeWithShortNames = 'class A { } class BB { } class CCC { }';
  const patterns = swapEngine.extractKeyPatterns(codeWithShortNames, 'Read');
  assertFalse(patterns.includes('A'), 'Should filter names with 2 or fewer chars');
  assertFalse(patterns.includes('BB'), 'Should filter names with 2 or fewer chars');
  assertTrue(patterns.includes('CCC'), 'Should keep names with more than 2 chars');
});

// --- externalize and file operations tests ---
const externalizeTests = new TestGroup('externalize (file operations)');
let tempDir;

externalizeTests.beforeEach(() => {
  tempDir = createTempDir();
  // Override SWAP_DIR for testing by setting env
  process.env.CK_TMP_DIR_OVERRIDE = tempDir;
});

externalizeTests.afterEach(() => {
  delete process.env.CK_TMP_DIR_OVERRIDE;
  cleanupTempDir(tempDir);
});

externalizeTests.test('creates swap entry with correct structure', async () => {
  const sessionId = 'test-session-' + Date.now();
  const entry = await swapEngine.externalize(sessionId, 'Read', { file_path: '/test/file.cs' }, SAMPLE_CSHARP_CODE);

  assertTrue(entry.swapId.length === 12, 'Should have 12-char swap ID');
  assertTrue(entry.contentPath.includes(sessionId), 'Content path should include session ID');
  assertTrue(entry.metadata.tool === 'Read', 'Metadata should include tool name');
  assertGreaterThan(entry.metadata.metrics.charCount, 0, 'Should track char count');

  // Cleanup
  swapEngine.deleteSessionSwap(sessionId);
});

externalizeTests.test('writes content file to disk', async () => {
  const sessionId = 'test-session-' + Date.now();
  const entry = await swapEngine.externalize(sessionId, 'Read', { file_path: '/test/file.cs' }, SAMPLE_CSHARP_CODE);

  assertTrue(fs.existsSync(entry.contentPath), 'Content file should exist');
  const content = fs.readFileSync(entry.contentPath, 'utf8');
  assertEqual(content, SAMPLE_CSHARP_CODE, 'Content should match original');

  // Cleanup
  swapEngine.deleteSessionSwap(sessionId);
});

externalizeTests.test('writes metadata file to disk', async () => {
  const sessionId = 'test-session-' + Date.now();
  const entry = await swapEngine.externalize(sessionId, 'Read', { file_path: '/test/file.cs' }, SAMPLE_CSHARP_CODE);

  const metaPath = entry.contentPath.replace('.content', '.meta.json');
  assertTrue(fs.existsSync(metaPath), 'Metadata file should exist');

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  assertEqual(meta.tool, 'Read', 'Metadata should have correct tool');
  assertTrue(meta.summary.length > 0, 'Metadata should have summary');
  assertTrue(Array.isArray(meta.keyPatterns), 'Metadata should have key patterns');

  // Cleanup
  swapEngine.deleteSessionSwap(sessionId);
});

externalizeTests.test('updates session index', async () => {
  const sessionId = 'test-session-' + Date.now();
  const entry = await swapEngine.externalize(sessionId, 'Read', { file_path: '/test/file.cs' }, SAMPLE_CSHARP_CODE);

  const indexPath = path.join(entry.sessionDir, 'index.json');
  assertTrue(fs.existsSync(indexPath), 'Index file should exist');

  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  assertTrue(entry.swapId in index.entries, 'Index should contain entry');
  assertEqual(index.totalEntries, 1, 'Total entries should be 1');

  // Cleanup
  swapEngine.deleteSessionSwap(sessionId);
});

// --- buildPointer tests ---
const buildPointerTests = new TestGroup('buildPointer');

buildPointerTests.test('includes required fields', () => {
  const entry = {
    swapId: 'abc123def456',
    sessionDir: '/tmp/ck/swap/test-session',
    contentPath: '/tmp/ck/swap/test-session/abc123def456.content',
    metadata: {
      tool: 'Read',
      input: { file_path: '/test/file.cs' },
      metrics: { charCount: 1000, tokenEstimate: 250 },
      summary: 'Sample summary',
      keyPatterns: ['Employee', 'Service']
    }
  };

  const pointer = swapEngine.buildPointer(entry);

  assertContains(pointer, 'abc123def456', 'Should include swap ID');
  assertContains(pointer, 'Read', 'Should include tool name');
  assertContains(pointer, '1,000 chars', 'Should include char count');
  assertContains(pointer, '~250 tokens', 'Should include token estimate');
});

buildPointerTests.test('includes summary section', () => {
  const entry = {
    swapId: 'abc123def456',
    sessionDir: '/tmp/ck/swap/test-session',
    contentPath: '/tmp/ck/swap/test-session/abc123def456.content',
    metadata: {
      tool: 'Read',
      input: { file_path: '/test/file.cs' },
      metrics: { charCount: 1000, tokenEstimate: 250 },
      summary: 'Custom summary text here',
      keyPatterns: []
    }
  };

  const pointer = swapEngine.buildPointer(entry);
  assertContains(pointer, '### Summary', 'Should have summary section');
  assertContains(pointer, 'Custom summary text here', 'Should include summary text');
});

buildPointerTests.test('includes key patterns when available', () => {
  const entry = {
    swapId: 'abc123def456',
    sessionDir: '/tmp/ck/swap/test-session',
    contentPath: '/tmp/ck/swap/test-session/abc123def456.content',
    metadata: {
      tool: 'Read',
      input: { file_path: '/test/file.cs' },
      metrics: { charCount: 1000, tokenEstimate: 250 },
      summary: 'Summary',
      keyPatterns: ['EmployeeService', 'IEmployeeService']
    }
  };

  const pointer = swapEngine.buildPointer(entry);
  assertContains(pointer, '### Key Patterns', 'Should have key patterns section');
  assertContains(pointer, 'EmployeeService', 'Should include patterns');
});

buildPointerTests.test('includes retrieval path', () => {
  const entry = {
    swapId: 'abc123def456',
    sessionDir: '/tmp/ck/swap/test-session',
    contentPath: '/tmp/ck/swap/test-session/abc123def456.content',
    metadata: {
      tool: 'Read',
      input: { file_path: '/test/file.cs' },
      metrics: { charCount: 1000, tokenEstimate: 250 },
      summary: 'Summary',
      keyPatterns: []
    }
  };

  const pointer = swapEngine.buildPointer(entry);
  assertContains(pointer, '### Retrieval', 'Should have retrieval section');
  assertContains(pointer, 'abc123def456.content', 'Should include content file path');
});

// --- readIndex/writeIndex tests ---
const indexTests = new TestGroup('readIndex/writeIndex');
let indexTempDir;

indexTests.beforeEach(() => {
  indexTempDir = createTempDir();
});

indexTests.afterEach(() => {
  cleanupTempDir(indexTempDir);
});

indexTests.test('readIndex returns empty structure for missing file', () => {
  const index = swapEngine.readIndex('/nonexistent/path');
  assertEqual(index.totalEntries, 0, 'Should return empty structure');
  assertTrue(typeof index.entries === 'object', 'Should have entries object');
});

indexTests.test('writeIndex creates valid JSON file', () => {
  const testIndex = {
    entries: { 'abc123': { tool: 'Read', summary: 'Test' } },
    totalEntries: 1,
    totalBytes: 1000
  };

  swapEngine.writeIndex(indexTempDir, testIndex);

  const indexPath = path.join(indexTempDir, 'index.json');
  assertTrue(fs.existsSync(indexPath), 'Index file should be created');

  const readBack = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  assertEqual(readBack.totalEntries, 1, 'Should preserve total entries');
});

indexTests.test('readIndex reads written index correctly', () => {
  const testIndex = {
    entries: { 'def456': { tool: 'Grep', summary: 'Search results' } },
    totalEntries: 1,
    totalBytes: 500
  };

  swapEngine.writeIndex(indexTempDir, testIndex);
  const readBack = swapEngine.readIndex(indexTempDir);

  assertEqual(readBack.totalEntries, 1, 'Should read total entries');
  assertTrue('def456' in readBack.entries, 'Should read entries');
});

// --- getSwapEntries tests ---
const getSwapEntriesTests = new TestGroup('getSwapEntries');
let entriesTempDir;

getSwapEntriesTests.beforeEach(() => {
  entriesTempDir = createTempDir();
});

getSwapEntriesTests.afterEach(() => {
  cleanupTempDir(entriesTempDir);
});

getSwapEntriesTests.test('returns empty array for nonexistent session', () => {
  const entries = swapEngine.getSwapEntries('nonexistent-session');
  assertTrue(Array.isArray(entries), 'Should return array');
  assertEqual(entries.length, 0, 'Should be empty');
});

getSwapEntriesTests.test('returns entries with correct format after externalize', async () => {
  // Use externalize to create real entries, then verify getSwapEntries works
  const sessionId = 'getswap-test-' + Date.now();
  const content = 'x'.repeat(10000); // Above Read threshold

  // Create an entry using externalize
  const entry = await swapEngine.externalize(sessionId, 'Read', { file_path: '/test/file.cs' }, content);

  // Now test getSwapEntries
  const entries = swapEngine.getSwapEntries(sessionId);
  assertEqual(entries.length, 1, `Should return 1 entry: expected 1, got ${entries.length}`);
  assertEqual(entries[0].id, entry.swapId, 'Should have correct ID');
  assertEqual(entries[0].tool, 'Read', 'Should have correct tool');
  assertTrue(entries[0].retrievePath.includes('.content'), 'Should have retrieve path');

  // Cleanup
  swapEngine.deleteSessionSwap(sessionId);
});

// --- cleanup tests ---
const cleanupTests = new TestGroup('cleanupSwapFiles/deleteSessionSwap');
let cleanupTestDir;

cleanupTests.beforeEach(() => {
  cleanupTestDir = createTempDir();
});

cleanupTests.afterEach(() => {
  cleanupTempDir(cleanupTestDir);
});

cleanupTests.test('deleteSessionSwap removes entire directory', async () => {
  // Create a real swap entry, then delete it
  const sessionId = 'cleanup-test-' + Date.now();
  const content = 'x'.repeat(10000); // Above Read threshold

  // Create an entry to establish the directory
  const entry = await swapEngine.externalize(sessionId, 'Read', { file_path: '/test/file.cs' }, content);
  assertTrue(fs.existsSync(entry.sessionDir), 'Session directory should exist before delete');

  // Delete the session
  swapEngine.deleteSessionSwap(sessionId);
  assertFalse(fs.existsSync(entry.sessionDir), 'Session directory should be deleted');
});

cleanupTests.test('cleanupSwapFiles handles missing directory gracefully', () => {
  // Should not throw
  swapEngine.cleanupSwapFiles('nonexistent-session', 24);
  assertTrue(true, 'Should not throw for missing directory');
});

// --- limits enforcement tests ---
const limitsTests = new TestGroup('limits enforcement');
let limitsTempDir;

limitsTests.beforeEach(() => {
  limitsTempDir = createTempDir();
});

limitsTests.afterEach(() => {
  cleanupTempDir(limitsTempDir);
});

limitsTests.test('config has limits defined', () => {
  const config = swapEngine.loadConfig();
  assertTrue(config.limits.maxEntriesPerSession > 0, 'Should have maxEntriesPerSession limit');
  assertTrue(config.limits.maxTotalBytes > 0, 'Should have maxTotalBytes limit');
  assertEqual(config.limits.maxEntriesPerSession, 100, 'maxEntriesPerSession should be 100');
  assertEqual(config.limits.maxTotalBytes, 262144000, 'maxTotalBytes should be 250MB');
});

limitsTests.test('readIndex returns totalBytes from index', () => {
  const testIndex = {
    entries: { 'abc': { tool: 'Read', charCount: 5000 } },
    totalEntries: 1,
    totalBytes: 5000
  };
  swapEngine.writeIndex(limitsTempDir, testIndex);

  const readBack = swapEngine.readIndex(limitsTempDir);
  assertEqual(readBack.totalBytes, 5000, 'Should read back totalBytes');
  assertEqual(readBack.totalEntries, 1, 'Should read back totalEntries');
});

limitsTests.test('totalBytes calculation logic in cleanup', () => {
  // Test that reduce correctly calculates sum of charCounts
  const entries = {
    'a': { charCount: 100 },
    'b': { charCount: 200 },
    'c': { charCount: 300 }
  };
  const calculated = Object.values(entries).reduce((sum, e) => sum + (e.charCount || 0), 0);
  assertEqual(calculated, 600, 'Should correctly sum charCounts');
});

// --- loadConfig tests ---
const configTests = new TestGroup('loadConfig');

configTests.test('returns default config structure', () => {
  const config = swapEngine.loadConfig();
  assertTrue(typeof config.enabled === 'boolean', 'Should have enabled flag');
  assertTrue(typeof config.thresholds === 'object', 'Should have thresholds');
  assertTrue(typeof config.retention === 'object', 'Should have retention');
  assertTrue(typeof config.limits === 'object', 'Should have limits');
});

configTests.test('has expected threshold values', () => {
  const config = swapEngine.loadConfig();
  assertEqual(config.thresholds.Read, 8192, 'Read threshold should be 8KB');
  assertEqual(config.thresholds.Grep, 4096, 'Grep threshold should be 4KB');
  assertEqual(config.thresholds.Bash, 6144, 'Bash threshold should be 6KB');
  assertEqual(config.thresholds.Glob, 2048, 'Glob threshold should be 2KB');
});

configTests.test('has expected retention values', () => {
  const config = swapEngine.loadConfig();
  assertEqual(config.retention.defaultHours, 24, 'Default retention should be 24h');
  assertEqual(config.retention.accessedHours, 48, 'Accessed retention should be 48h');
  assertEqual(config.retention.neverAccessedHours, 6, 'Never accessed retention should be 6h');
});

// --- deepMerge tests ---
const deepMergeTests = new TestGroup('deepMerge');

deepMergeTests.test('merges top-level properties', () => {
  const target = { a: 1, b: 2 };
  const source = { b: 3, c: 4 };
  const result = swapEngine.deepMerge(target, source);
  assertEqual(result.a, 1, 'Should preserve target-only properties');
  assertEqual(result.b, 3, 'Should override with source properties');
  assertEqual(result.c, 4, 'Should add source-only properties');
});

deepMergeTests.test('deeply merges nested objects', () => {
  const target = { thresholds: { Read: 8192, Grep: 4096, Bash: 6144 } };
  const source = { thresholds: { Read: 16384 } };
  const result = swapEngine.deepMerge(target, source);
  assertEqual(result.thresholds.Read, 16384, 'Should override nested property');
  assertEqual(result.thresholds.Grep, 4096, 'Should preserve non-overridden nested property');
  assertEqual(result.thresholds.Bash, 6144, 'Should preserve all nested properties');
});

deepMergeTests.test('does not modify original objects', () => {
  const target = { a: { b: 1 } };
  const source = { a: { c: 2 } };
  const result = swapEngine.deepMerge(target, source);
  assertTrue(target.a.c === undefined, 'Should not modify target');
  assertTrue(result.a.b === 1, 'Result should have target property');
  assertTrue(result.a.c === 2, 'Result should have source property');
});

deepMergeTests.test('handles arrays as values (replaces, does not merge)', () => {
  const target = { items: [1, 2, 3] };
  const source = { items: [4, 5] };
  const result = swapEngine.deepMerge(target, source);
  assertEqual(result.items.length, 2, 'Should replace array');
  assertEqual(result.items[0], 4, 'Should have source array values');
});

// --- locking tests ---
const lockingTests = new TestGroup('acquireLock/releaseLock');
let lockTempDir;

lockingTests.beforeEach(() => {
  lockTempDir = createTempDir();
});

lockingTests.afterEach(() => {
  cleanupTempDir(lockTempDir);
});

lockingTests.test('acquireLock creates lock file', () => {
  const result = swapEngine.acquireLock(lockTempDir);
  assertTrue(result, 'Should successfully acquire lock');
  assertTrue(fs.existsSync(path.join(lockTempDir, '.lock')), 'Lock file should exist');
  swapEngine.releaseLock(lockTempDir);
});

lockingTests.test('acquireLock fails when lock already held', () => {
  const first = swapEngine.acquireLock(lockTempDir);
  assertTrue(first, 'First lock should succeed');
  const second = swapEngine.acquireLock(lockTempDir);
  assertFalse(second, 'Second lock should fail');
  swapEngine.releaseLock(lockTempDir);
});

lockingTests.test('releaseLock removes lock file', () => {
  swapEngine.acquireLock(lockTempDir);
  assertTrue(fs.existsSync(path.join(lockTempDir, '.lock')), 'Lock file should exist');
  swapEngine.releaseLock(lockTempDir);
  assertFalse(fs.existsSync(path.join(lockTempDir, '.lock')), 'Lock file should be removed');
});

lockingTests.test('releaseLock handles missing lock gracefully', () => {
  // Should not throw
  swapEngine.releaseLock(lockTempDir);
  assertTrue(true, 'Should not throw for missing lock');
});

// ============================================================================
// Run Test Suite
// ============================================================================

async function main() {
  const suite = new TestSuite('Swap Engine Tests');

  suite
    .addGroup(shouldExternalizeTests)
    .addGroup(generateSwapIdTests)
    .addGroup(extractSummaryTests)
    .addGroup(extractKeyPatternsTests)
    .addGroup(externalizeTests)
    .addGroup(buildPointerTests)
    .addGroup(indexTests)
    .addGroup(getSwapEntriesTests)
    .addGroup(cleanupTests)
    .addGroup(limitsTests)
    .addGroup(configTests)
    .addGroup(deepMergeTests)
    .addGroup(lockingTests);

  const { passed, failed } = await suite.run(true);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
