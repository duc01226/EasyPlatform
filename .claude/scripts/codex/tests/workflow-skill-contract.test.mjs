import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { resolveAllWorkflowManifests } = require('../../lib/workflow-manifest.cjs');
const { renderWorkflowSkillContract, updateWorkflowSkillContract, checkWorkflowSkillContract, syncWorkflowSkillContracts } = require('../../lib/workflow-skill-contract.cjs');
const execFileAsync = promisify(execFile);
const helperPath = fileURLToPath(new URL('../../lib/workflow-skill-contract.cjs', import.meta.url));
const verifierPath = fileURLToPath(new URL('../verify-workflow-cycle-compliance.mjs', import.meta.url));
const workflowId = 'workflow-fixture';
const source = '---\nname: workflow-fixture\ndescription: fixture\n---\n\n## Quality\nPreserve the review loop and evidence bar.\n';

function fixtureDocument() {
  return { version: '1', workflows: { [workflowId]: {
    preActions: { injectContext: 'Fixture quality contract', readFiles: [`.claude/skills/${workflowId}/SKILL.md`] },
    defaultMode: 'build',
    variants: {
      build: { sequence: [
        { id: 'inspect-first', skill: 'inspect' },
        { id: 'review-code', skill: 'review', args: '--mode=code', role: 'gate' },
        { id: 'review-ui', skill: 'review', args: '--mode=ui', role: 'optional', applicability: { when: 'UI changed', skipReason: 'No UI change' } },
      ] },
      audit: { sequence: [
        { id: 'inspect-audit', skill: 'inspect', args: '--audit' },
        { id: 'review-audit', skill: 'review', args: '--mode=audit', role: 'gate' },
      ] },
    },
  } } };
}
function manifests(document) {
  return resolveAllWorkflowManifests(document, workflowId, { availableSkills: ['inspect', 'review'] });
}
function check(document, content, options = {}) {
  return checkWorkflowSkillContract(workflowId, document.workflows[workflowId], manifests(document), content, options);
}

// Invariant: every selected mode has executable linked calls, repeated skill occurrences keep their
// args and role, and conditional calls remain visibly conditional rather than becoming mandatory.
test('all mode calls preserve occurrence order, flags, roles and bootstrap before authored quality instructions', () => {
  const document = fixtureDocument();
  const content = updateWorkflowSkillContract(source, renderWorkflowSkillContract(workflowId, manifests(document)));
  assert.deepEqual(check(document, content), []);
  assert.ok(content.indexOf('Todo FIRST') < content.indexOf('## Quality'));
  assert.match(content, /before triage, analysis or step execution, create one todo per phase of the selected mode, in order, listing every occurrence of that phase as a line, including conditional\/optional ones \(a mode that declares no phases gets one todo per occurrence\)/);
  assert.match(content, /review --mode=code`\]\(\.\.\/review\/SKILL\.md\) \(gate\)/);
  assert.match(content, /review --mode=ui`\]\(\.\.\/review\/SKILL\.md\) \(optional; conditional\)/);
  assert.ok(content.indexOf('/review --mode=code') < content.indexOf('/review --mode=ui'));
  assert.match(content, /`audit`:.*inspect --audit.*review --mode=audit/);
  assert.ok(content.endsWith(source.slice(source.indexOf('\n## Quality'))));
});

// Invariant: a mode that declares phases tells the runner its phase todos in order, with each phase's size and exit gates,
// so one todo per phase never hides a step (P41 D6).
test('a mode with phases renders its phase todos in order with step counts', () => {
  const document = fixtureDocument();
  document.workflows[workflowId].variants.build.phases = [
    { id: 'discover', steps: ['inspect-first'] },
    { id: 'review', steps: ['review-code', 'review-ui'] },
  ];
  const block = renderWorkflowSkillContract(workflowId, manifests(document));
  assert.match(block, /^  Phase todos: Discover \(1\) → Review \(2\)$/m);
  assert.doesNotMatch(block.split('- Mode `audit`')[1], /Phase todos:/, 'a mode without phases renders no phase line');
});

// Invariant: removing execution rules or either direction of linkage must block parity, not pass
// because an old default IMPORTANT chain happens to be intact.
test('missing todo-first, invocation, conditions, variant calls or skill links fail the contract', () => {
  const document = fixtureDocument();
  const content = updateWorkflowSkillContract(source, renderWorkflowSkillContract(workflowId, manifests(document)));
  for (const mutant of [
    content.replace('**Todo FIRST:**', '**Todo later:**'),
    content.replace('execute its protocol through the active host', 'only read its instructions'),
    content.replace('skipReason` verbatim', 'skipReason` loosely'),
    content.replace(/^- Mode `audit`:.*\n/m, ''),
    content.replace('../review/SKILL.md', '../inspect/SKILL.md'),
    content.replace('(gate)', '(optional)'),
  ]) assert.ok(check(document, mutant).length > 0);
  const noReverse = fixtureDocument();
  noReverse.workflows[workflowId].preActions.readFiles = [];
  assert.match(check(noReverse, content).join('\n'), /reverse-link/);
});

// Invariant: registry-only edits to nondefault steps or applicability cannot silently leave the
// old call contract accepted; fingerprint binds exact IDs/args/when/skipReason and mode metadata.
test('nondefault flags, occurrence IDs, condition wording and skip evidence changes invalidate stale guidance', () => {
  const document = fixtureDocument();
  const content = updateWorkflowSkillContract(source, renderWorkflowSkillContract(workflowId, manifests(document)));
  const mutations = [
    entry => { entry.variants.audit.sequence[1].args = '--mode=other'; },
    entry => { entry.variants.build.sequence[2].id = 'review-renamed'; },
    entry => { entry.variants.build.sequence[2].applicability.when = 'API changed'; },
    entry => { entry.variants.build.sequence[2].applicability.skipReason = 'No API change'; },
  ];
  for (const mutate of mutations) {
    const changed = fixtureDocument();
    mutate(changed.workflows[workflowId]);
    assert.ok(check(changed, content).length > 0);
  }
});

// Invariant: Codex follows the same calls/conditions using its native command dialect.
test('Codex dialect and CRLF files retain parity without rewriting authored quality text', () => {
  const document = fixtureDocument();
  const block = renderWorkflowSkillContract(workflowId, manifests(document), { dialect: '$' });
  const original = source.replaceAll('\n', '\r\n');
  const updated = updateWorkflowSkillContract(original, block);
  assert.match(updated, /\$start-workflow workflow-fixture/);
  assert.deepEqual(check(document, updated, { dialect: '$' }), []);
  assert.equal(updated.replaceAll('\r\n', '').includes('\n'), false);
  assert.equal(updateWorkflowSkillContract(updated, block), updated);
  const link = block.match(/\[the registry\]\(([^)]+)\)/)[1];
  const base = path.join(os.tmpdir(), 'workflow-link-fixture');
  for (const host of ['.claude', '.agents']) {
    assert.equal(path.resolve(base, host, 'skills', workflowId, link), path.join(base, '.claude', 'workflows.json'));
  }
});

// Invariant: malformed block boundaries cannot overwrite arbitrary user prose.
test('partial duplicate or reversed fences refuse regeneration', () => {
  const block = renderWorkflowSkillContract(workflowId, manifests(fixtureDocument()));
  for (const malformed of [
    `${source}<!-- WORKFLOW-CALLS:START -->`,
    `${source}<!-- WORKFLOW-CALLS:END -->\n<!-- WORKFLOW-CALLS:START -->`,
    `${source}${block}\n${block}`,
  ]) assert.throws(() => updateWorkflowSkillContract(malformed, block), /Malformed or duplicate/);
});

// Invariant: correct content placed after execution guidance cannot satisfy todo-first.
test('moving the intact bootstrap below the quick summary is rejected', () => {
  const document = fixtureDocument();
  const block = renderWorkflowSkillContract(workflowId, manifests(document));
  const misplaced = `${source}\n## Quick Summary\nRun the workflow.\n${block}`;
  assert.match(check(document, misplaced).join('\n'), /placement violation/);
});

async function fixtureProject() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'workflow-call-contract-'));
  const document = fixtureDocument();
  await fs.mkdir(path.join(root, '.claude', 'scripts', 'lib'), { recursive: true });
  for (const file of ['workflow-skill-contract.cjs', 'workflow-manifest.cjs', 'project-root.cjs']) {
    await fs.copyFile(fileURLToPath(new URL(`../../lib/${file}`, import.meta.url)), path.join(root, '.claude', 'scripts', 'lib', file));
  }
  for (const skill of [workflowId, 'inspect', 'review']) {
    const dir = path.join(root, '.claude', 'skills', skill);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'SKILL.md'), skill === workflowId ? source : `---\nname: ${skill}\ndescription: fixture\n---\n`);
  }
  await fs.writeFile(path.join(root, '.claude', 'workflows.json'), JSON.stringify(document));
  return { root, document };
}
function isolatedEnv(root) {
  return { ...process.env, CLAUDE_PROJECT_DIR: root, HOME: root, USERPROFILE: root, TMPDIR: root, TEMP: root, TMP: root,
    CK_REVIEW_TOOL_EXECUTE: '0', CK_REVIEW_TOOL_INSTALL: '0', CK_REVIEW_TOOL_NETWORK: '0', CK_SKILL_AUTO_TRIGGER: '0', CK_AI_FEATURE_ROUTE: '0' };
}

// Invariant: the copied bundle works with no package.json and --check is read-only; --write is
// idempotent, preserves authored bytes and never touches generated mirrors or the registry.
test('copied CLI checks without mutation and regenerates only the source block idempotently', async () => {
  const { root } = await fixtureProject();
  const cli = path.join(root, '.claude', 'scripts', 'lib', 'workflow-skill-contract.cjs');
  const skillFile = path.join(root, '.claude', 'skills', workflowId, 'SKILL.md');
  const registryFile = path.join(root, '.claude', 'workflows.json');
  const registry = await fs.readFile(registryFile, 'utf8');
  const env = isolatedEnv(root);
  try {
    await assert.rejects(execFileAsync(process.execPath, [cli, '--check'], { cwd: root, env }), error => error.code === 1);
    assert.equal(await fs.readFile(skillFile, 'utf8'), source);
    await execFileAsync(process.execPath, [cli, '--write'], { cwd: root, env });
    const written = await fs.readFile(skillFile, 'utf8');
    assert.ok(written.includes('Todo FIRST'));
    await execFileAsync(process.execPath, [cli, '--check'], { cwd: root, env });
    await execFileAsync(process.execPath, [cli, '--write'], { cwd: root, env });
    assert.equal(await fs.readFile(skillFile, 'utf8'), written);
    assert.equal(await fs.readFile(registryFile, 'utf8'), registry);
    await assert.rejects(fs.access(path.join(root, '.agents')));
    await assert.rejects(execFileAsync(process.execPath, [cli, '--typo'], { cwd: root, env }), /Usage:/);
    await assert.rejects(execFileAsync(process.execPath, [helperPath, '--write'], { cwd: root, env: { ...env, CLAUDE_PROJECT_DIR: 'relative-path' } }), /must be an absolute path/);
    assert.equal(await fs.readFile(skillFile, 'utf8'), written);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

// Invariant: one broken workflow prevents the source publication of earlier valid candidates.
test('a malformed later workflow leaves all earlier candidate source files untouched', async () => {
  const { root, document } = await fixtureProject();
  const skillFile = path.join(root, '.claude', 'skills', workflowId, 'SKILL.md');
  try {
    document.workflows['workflow-broken'] = { sequence: ['missing-skill'] };
    await fs.writeFile(path.join(root, '.claude', 'workflows.json'), JSON.stringify(document));
    assert.throws(() => syncWorkflowSkillContracts(root), /Missing skill/);
    assert.equal(await fs.readFile(skillFile, 'utf8'), source);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

// A supported skills-only export needs no registry. Workflow wrappers without a
// registry are incomplete, and must still fail instead of reporting a no-op.
test('missing registry permits skills-only bundles but rejects unbound workflow wrappers', async () => {
  const { root } = await fixtureProject();
  try {
    await fs.unlink(path.join(root, '.claude', 'workflows.json'));
    assert.throws(() => syncWorkflowSkillContracts(root), { code: 'ENOENT' });
    await fs.rm(path.join(root, '.claude', 'skills', workflowId), { recursive: true });
    assert.deepEqual(syncWorkflowSkillContracts(root), []);
    assert.deepEqual(syncWorkflowSkillContracts(root, { check: true }), []);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

// Invariant: the real verification entrypoint rejects mirror/alternate-mode drift, even with the
// default IMPORTANT chain intact. A helper passing alone does not prove its caller enforces it.
test('real cycle verifier detects mirror-only nondefault call drift', async () => {
  const { root, document } = await fixtureProject();
  const env = isolatedEnv(root);
  try {
    const modes = manifests(document);
    for (const [host, dialect] of [['.claude', '/'], ['.agents', '$']]) {
      const dir = path.join(root, host, 'skills', workflowId);
      await fs.mkdir(dir, { recursive: true });
      const chain = modes[0].sequence.map(step => `${dialect}${step}`).join(' -> ');
      const body = `${source}\n**IMPORTANT MANDATORY Steps:** ${chain}\n`;
      await fs.writeFile(path.join(dir, 'SKILL.md'), updateWorkflowSkillContract(body, renderWorkflowSkillContract(workflowId, modes, { dialect })));
    }
    await execFileAsync(process.execPath, [verifierPath], { cwd: root, env });
    const mirror = path.join(root, '.agents', 'skills', workflowId, 'SKILL.md');
    const original = await fs.readFile(mirror, 'utf8');
    await fs.writeFile(mirror, original.replace('$review --mode=audit', '$review --mode=wrong'));
    await assert.rejects(execFileAsync(process.execPath, [verifierPath], { cwd: root, env }), error => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /Workflow call-contract drift \(workflow-fixture\)/);
      return true;
    });
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
