import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { buildCodexSkillManifest } from '../migrate-claude-to-codex.mjs';
import { buildSkillReferenceMap } from '../compat-rewrite.mjs';

const require = createRequire(import.meta.url);
const { hasConciseInstructions } = require('../../lib/skill-instruction-profile.cjs');
const root = fileURLToPath(new URL('../../../../', import.meta.url));
const manifest = (metadata = '', body = 'Run /why-review.') => `---\nname: sample\ndescription: Review a candidate.\n${metadata}---\n\n${body}\n`;
const concise = 'metadata:\n  instruction-profile: concise\n';
const references = buildSkillReferenceMap(['why-review', 'commit-review', 'pull-request']);
const bodyOf = text => text.split(/^---\r?$/m).slice(2).join('---').trim();

test('concise metadata removes only the Codex preamble, retaining native translation and invocation policy', () => {
  for (const metadata of [concise, 'metadata: {"instruction-profile":"concise"}\n']) {
    const source = manifest(`${metadata}disable-model-invocation: true\n`);
    const mirror = buildCodexSkillManifest(source, 'sample', references);
    assert.equal(bodyOf(mirror), 'Run $why-review.');
    assert.equal(hasConciseInstructions(mirror), true);
    assert.match(mirror, /^disable-model-invocation: true$/m);
    assert.equal(buildCodexSkillManifest(mirror, 'sample', references), mirror);
  }
  assert.match(buildCodexSkillManifest(manifest(), 'sample', references), /Codex compatibility note:/);
});

test('examples, nested metadata and unknown profiles cannot silently opt a skill out', () => {
  assert.equal(hasConciseInstructions(manifest('', concise)), false);
  assert.equal(hasConciseInstructions(manifest('metadata:\n  example:\n    instruction-profile: concise\n')), false);
  assert.equal(hasConciseInstructions(manifest('metadata:\n  instruction-profile: unknown\n')), false);
  assert.equal(hasConciseInstructions(manifest(concise).replaceAll('\n', '\r\n')), true);
});

test('commit stays within its five-line instruction budget through mirror generation', () => {
  const source = fs.readFileSync(path.join(root, '.claude/skills/commit/SKILL.md'), 'utf8');
  const mirror = buildCodexSkillManifest(source, 'commit', references);
  for (const text of [source, mirror]) {
    const body = bodyOf(text);
    assert.equal(body.split(/\r?\n/).length, 5);
    assert.ok(Buffer.byteLength(body) <= 1500, 'five lines must not hide the old procedure in long paragraphs');
    assert.doesNotMatch(body, /PROTOCOL-GUIDES|Estimate:|Closing Reminders|Codex compatibility note:/);
  }
  assert.match(mirror, /\$commit-review --fix-loop/);
  assert.match(mirror, /\$pull-request/);
});

test('direct commits retain the pending-content secret gate on both hosts', () => {
  const source = fs.readFileSync(path.join(root, '.claude/skills/commit/SKILL.md'), 'utf8');
  for (const text of [source, buildCodexSkillManifest(source, 'commit', references)]) {
    assert.match(text, /[Ss]can the exact pending commit content for secrets before committing/);
    assert.match(text, /never commit credentials or \.env files/);
    assert.match(text, /block on findings with redacted file\/line\/rule evidence/);
  }
});

test('lightweight commit review stays small including its receipt reference on both hosts', () => {
  const source = fs.readFileSync(path.join(root, '.claude/skills/commit-review/SKILL.md'), 'utf8');
  const receipt = fs.readFileSync(path.join(root, '.claude/skills/commit-review/references/fix-loop.md'), 'utf8');
  for (const text of [source, buildCodexSkillManifest(source, 'commit-review', references)]) {
    assert.equal(hasConciseInstructions(text), true);
    assert.equal(bodyOf(text).split(/\r?\n/).length, 5);
    assert.ok(Buffer.byteLength(text + receipt) <= 4096, 'the entire selected review path has a 4 KiB instruction budget');
    assert.doesNotMatch(text + receipt, /PROTOCOL-GUIDES|<!-- SYNC:|Codex compatibility note:|why-review|full-mode\.md/,
      'the lightweight path must not reload the full review machinery');
  }
});

test('verifier requires matching concise profiles and still enforces manual-only discovery', t => {
  const parent = path.join(root, 'tmp/concise-skills-tests');
  fs.mkdirSync(parent, { recursive: true });
  const fixture = fs.mkdtempSync(path.join(parent, 'run-'));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  const write = (rel, text) => {
    const file = path.join(fixture, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  };
  for (const rel of ['.claude/scripts/codex/verify-skill-protocol-compliance.mjs', '.claude/scripts/lib/project-root.cjs', '.claude/scripts/lib/skill-instruction-profile.cjs']) {
    write(rel, fs.readFileSync(path.join(root, rel), 'utf8'));
  }
  write('docs/project-config.json', JSON.stringify({ project: { name: 'fixture' } }));
  const source = manifest(`${concise}disable-model-invocation: true\n`);
  write('.claude/skills/sample/SKILL.md', source);
  write('.agents/skills/sample/SKILL.md', buildCodexSkillManifest(source, 'sample', references));
  const run = () => {
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
    const result = spawnSync(process.execPath, ['.claude/scripts/codex/verify-skill-protocol-compliance.mjs'], {
      cwd: fixture, env: { ...env, CLAUDE_PROJECT_DIR: fixture }, encoding: 'utf8', timeout: 60000,
    });
    assert.equal(result.error, undefined);
    return result.stdout + result.stderr;
  };
  const initial = run();
  assert.doesNotMatch(initial, /sample[\\/]SKILL.md missing contract snippet/);
  assert.match(initial, /sample[\\/]SKILL.md is manual-only/);
  write('.agents/skills/sample/agents/openai.yaml', 'policy:\n  allow_implicit_invocation: false\n');
  assert.doesNotMatch(run(), /sample[\\/]SKILL.md is manual-only/);
  write('.claude/skills/sample/SKILL.md', manifest('disable-model-invocation: true\n'));
  assert.match(run(), /sample[\\/]SKILL.md instruction-profile mismatch/);
});
