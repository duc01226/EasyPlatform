import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, '..', '..', '..', '..');
const syncContextScript = path.join(repoRoot, '.claude', 'scripts', 'codex', 'sync-context-workflows.mjs');

// Fixture project: the smallest tree the context sync needs. Nothing is read from the authoring repo
// except the script under test, so the test runs in any project layout on every OS.
async function makeFixture(claudeText) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-project-rules-'));
  await fs.mkdir(path.join(tempRoot, '.claude', 'skills', 'test'), { recursive: true });
  await fs.mkdir(path.join(tempRoot, '.claude', 'skills', 'shared'), { recursive: true });
  await fs.mkdir(path.join(tempRoot, '.codex'), { recursive: true });
  await fs.writeFile(
    path.join(tempRoot, '.claude', 'workflows.json'),
    JSON.stringify({ workflows: { testing: { name: 'Testing', description: 'Run local tests', whenToUse: 'test', sequence: ['test'] } } }, null, 2),
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
  await fs.writeFile(path.join(tempRoot, 'AGENTS.md'), '# Codex Project Instructions\n', 'utf8');
  return tempRoot;
}

test('TC-LCM-101: a hand-owned "Project Rules & Context" section written by /learn reaches the AGENTS.md projection', async () => {
  const claude = [
    '# Project Instructions',
    '',
    '## Naming Conventions',
    '',
    'Files use kebab-case.',
    '',
    '## Project Rules & Context',
    '',
    '- LEARNED_RULE_SENTINEL: every new module is registered before any other change.',
    '',
    '## Doc Lookup — What to Read When',
    '',
    'DOC_LOOKUP_SENTINEL',
    ''
  ].join('\n');
  const tempRoot = await makeFixture(claude);
  try {
    await execFileAsync(process.execPath, [syncContextScript], { cwd: tempRoot });
    const agents = await fs.readFile(path.join(tempRoot, 'AGENTS.md'), 'utf8');
    assert.match(agents, /## Project Rules & Context/, 'the heading is carried into AGENTS.md');
    assert.match(agents, /LEARNED_RULE_SENTINEL/, 'the learned rule is carried into AGENTS.md');
    assert.ok(
      agents.indexOf('DOC_LOOKUP_SENTINEL') < agents.indexOf('## Project Rules & Context'),
      'the project rules follow doc discovery'
    );
    assert.ok(
      agents.indexOf('## Project Rules & Context') < agents.indexOf('## Naming Conventions'),
      'the project rules are emitted early, inside the 32 KiB host default window'
    );
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test('TC-LCM-102: the projection is a heading whitelist — a note under an unlisted heading or a universal section never reaches AGENTS.md', async () => {
  const claude = [
    '# Project Instructions',
    '',
    '## Evidence-Based Reasoning & Investigation',
    '',
    'UNIVERSAL_SECTION_SENTINEL',
    '',
    '## Git & Version-Control Discipline',
    '',
    'UNIVERSAL_GIT_SENTINEL',
    '',
    '## Random Team Notes',
    '',
    '- UNLISTED_NOTE_SENTINEL',
    ''
  ].join('\n');
  const tempRoot = await makeFixture(claude);
  try {
    await execFileAsync(process.execPath, [syncContextScript], { cwd: tempRoot });
    const agents = await fs.readFile(path.join(tempRoot, 'AGENTS.md'), 'utf8');
    assert.doesNotMatch(agents, /UNLISTED_NOTE_SENTINEL/, 'only whitelisted headings are projected — this is why /learn writes the named section');
    assert.doesNotMatch(agents, /UNIVERSAL_SECTION_SENTINEL|UNIVERSAL_GIT_SENTINEL/, 'universal protocols are delivered by the universal hook, never projected');
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
