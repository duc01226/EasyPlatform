import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { AGENTS_ROOT_LIMIT_BYTES } from '../sync-context-workflows.mjs';

const execFileAsync = promisify(execFile);
const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, '..', '..', '..', '..');
const syncContextScript = path.join(repoRoot, '.claude', 'scripts', 'codex', 'sync-context-workflows.mjs');
// DERIVED from the generator this suite exercises — never a literal. A hard-coded budget here
// silently stops tracking the real one the moment the budget moves: the `<=` case goes loose and,
// worse, the overflow case (TC-HARNESS-008b) keeps asserting "over budget" at a size that no longer
// overflows, so the assertion and the `ROOT_OVERFLOW` warning it is paired with decouple and the
// check goes vacuous. That is exactly the regression `verifier-root-contract.test.mjs:13` records.
const ROOT_LIMIT_BYTES = AGENTS_ROOT_LIMIT_BYTES;

async function makeFixture(claudeText) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-compact-root-'));
  await fs.mkdir(path.join(tempRoot, '.claude', 'skills', 'test'), { recursive: true });
  await fs.mkdir(path.join(tempRoot, '.claude', 'skills', 'shared'), { recursive: true });
  await fs.mkdir(path.join(tempRoot, '.codex'), { recursive: true });
  await fs.writeFile(
    path.join(tempRoot, '.claude', 'workflows.json'),
    JSON.stringify({
      workflows: {
        testing: {
          name: 'Testing',
          description: 'Run local tests',
          whenToUse: 'test or verify changes',
          sequence: ['test'],
          preActions: { injectContext: 'Use /test for local test execution.' }
        }
      }
    }, null, 2),
    'utf8'
  );
  await fs.writeFile(
    path.join(tempRoot, '.claude', 'skills', 'test', 'SKILL.md'),
    ['---', 'name: test', 'description: Test skill', '---', '', '## Quick Summary', '', 'Run tests.', ''].join('\n'),
    'utf8'
  );
  await fs.writeFile(
    path.join(tempRoot, '.claude', 'skills', 'shared', 'sync-inline-versions.md'),
    ['## SYNC:ai-sdd-artifact-contract', '', '> Any supported AI tool may execute with synced context.', '', '---', '', '## SYNC:ai-sdd-artifact-contract:reminder', '', '- Keep generated mirrors current.', ''].join('\n'),
    'utf8'
  );
  await fs.writeFile(path.join(tempRoot, 'CLAUDE.md'), claudeText, 'utf8');
  await fs.writeFile(path.join(tempRoot, '.codex', 'CODEX_CONTEXT.md'), '# Existing Context\n', 'utf8');
  await fs.writeFile(path.join(tempRoot, 'AGENTS.md'), '# Codex Project Instructions\n\n<!-- user-owned sentinel -->\n', 'utf8');
  return tempRoot;
}

test('TC-HARNESS-008a: normal sync emits a bounded UTF-8 project-only projection and removes the retired context file', async () => {
  const claude = [
    '<!-- CK:UNIVERSAL-GUIDES v7 -->',
    '# Claude Source Instructions',
    '',
    'Project identity. Unicode sentinel: 🚦.',
    '',
    '## Doc Lookup — What to Read When',
    '',
    'DOC_LOOKUP_SENTINEL',
    '',
    '## Workflow Step Advancement & Parallel Phases',
    '',
    'Advance by the model-driven task list; hooks are optional accelerators.',
    '',
    '## Task Planning Rules',
    '',
    'Create one task per step and keep one in progress.',
    '',
    '## Evidence-Based Reasoning & Investigation',
    '',
    'Cite file and line evidence with confidence.',
    ''
  ].join('\n');
  const tempRoot = await makeFixture(claude);
  try {
    await execFileAsync(process.execPath, [syncContextScript], { cwd: tempRoot });
    const agents = await fs.readFile(path.join(tempRoot, 'AGENTS.md'), 'utf8');
    assert.ok(Buffer.byteLength(agents, 'utf8') <= ROOT_LIMIT_BYTES);
    assert.match(agents, /<!-- CK:CODEX-ROOT-PROJECTION -->/);
    assert.match(agents, /<!-- \/CK:CODEX-ROOT-PROJECTION -->/);
    assert.match(agents, /user-owned sentinel/);
    assert.match(agents, /Unicode sentinel: 🚦/);
    assert.match(agents, /DOC_LOOKUP_SENTINEL/);
    // Only project information is projected: universal sections are delivered by the universal hook.
    assert.doesNotMatch(agents, /Workflow Step Advancement|Task Planning Rules|Evidence-Based Reasoning/);
    assert.doesNotMatch(agents, /CODEX-CONTEXT-MIRROR|CODEX_CONTEXT\.md|Context fingerprint|CK:UNIVERSAL-GUIDES/);
    assert.equal(await fs.access(path.join(tempRoot, '.codex', 'CODEX_CONTEXT.md')).then(() => true, () => false), false);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test('TC-HARNESS-008b: oversized projection is reported and preserved without truncation', async () => {
  const terminalSentinel = 'PROJECTION_TERMINAL_SENTINEL';
  const claude = [
    '# Claude Source Instructions',
    '',
    '## Doc Lookup — What to Read When',
    '',
    // Sized from the budget (3 UTF-8 bytes per char, plus margin) so the case always overflows it.
    '界'.repeat(Math.ceil(ROOT_LIMIT_BYTES / 3) + 1024),
    '',
    terminalSentinel,
    ''
  ].join('\n');
  const tempRoot = await makeFixture(claude);
  try {
    const result = await execFileAsync(process.execPath, [syncContextScript], { cwd: tempRoot });
    const agents = await fs.readFile(path.join(tempRoot, 'AGENTS.md'), 'utf8');
    assert.ok(Buffer.byteLength(agents, 'utf8') > ROOT_LIMIT_BYTES);
    assert.match(result.stderr, /ROOT_OVERFLOW/);
    assert.match(agents, new RegExp(terminalSentinel));
    assert.match(agents, /<!-- \/CK:CODEX-ROOT-PROJECTION -->/);
    assert.doesNotMatch(agents, /TRUNCAT(?:ED|ION)/i);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test('TC-HARNESS-008c: the projection emits Doc Lookup, then the hand-owned project rules, ahead of every other project section', async () => {
  // Source order is deliberately reversed: projection order must come from priority, not position,
  // so discovery and the hand-owned project rules stay inside Codex's 32 KiB default window.
  // Given a CLAUDE.md whose sections appear in reverse priority order, plus a universal section.
  const claude = [
    '# Claude Source Instructions',
    '',
    '## Naming Conventions',
    '',
    'NAMING_SENTINEL',
    '',
    '## Git & Version-Control Discipline',
    '',
    'GIT_SENTINEL',
    '',
    '## Project Rules & Context',
    '',
    'RULES_SENTINEL',
    '',
    '## Doc Lookup — What to Read When',
    '',
    'DOC_LOOKUP_SENTINEL',
    '',
  ].join('\n');
  const tempRoot = await makeFixture(claude);
  try {
    // When the context sync projects it into AGENTS.md.
    await execFileAsync(process.execPath, [syncContextScript], { cwd: tempRoot });
    const agents = await fs.readFile(path.join(tempRoot, 'AGENTS.md'), 'utf8');
    const at = (marker) => agents.indexOf(marker);
    // Then Doc Lookup comes first, the project rules second, the remaining project sections after them,
    // and the universal Git section (delivered by the universal hook) never appears.
    assert.ok(at('DOC_LOOKUP_SENTINEL') > -1, 'Doc Lookup is projected into AGENTS.md');
    assert.ok(at('DOC_LOOKUP_SENTINEL') < at('RULES_SENTINEL'), 'Doc Lookup precedes the project rules');
    assert.ok(at('RULES_SENTINEL') < at('NAMING_SENTINEL'), 'the project rules precede the remaining sections');
    assert.equal(at('GIT_SENTINEL'), -1, 'universal protocol sections are not projected');
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
