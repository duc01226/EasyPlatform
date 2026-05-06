import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import { checkMainContentBeforeSyncBlocks } from '../verify-skill-protocol-compliance.mjs';

const execFileAsync = promisify(execFile);
const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, '..', '..', '..', '..');
const fixturesDir = path.join(thisDir, 'fixtures');
const canonicalPath = path.join(fixturesDir, 'skill-layout-canonical.md');
const inputPath = path.join(fixturesDir, 'skill-layout-input-indented.md');
const migratorScript = path.join(repoRoot, '.claude', 'scripts', 'refactor_skill_layout.py');
const goldenSkillDir = path.join(repoRoot, '.claude', 'skills', '__golden__');
const goldenSkillFile = path.join(goldenSkillDir, 'SKILL.md');

const normalizeEol = s => s.replace(/\r\n/g, '\n');

test('TC-SLT-001: migrator docstring flags fence-blindness with story citation', async () => {
    const content = await fs.readFile(migratorScript, 'utf8');
    assert.match(content, /NOT\s+fence-aware/, "missing 'NOT fence-aware' caveat");
    assert.ok(content.includes('story/SKILL.md'), 'missing story/SKILL.md citation');
});

test('TC-SLT-005: migrator transforms indented input → canonical (round-trip)', async t => {
    await fs.mkdir(goldenSkillDir, { recursive: true });
    const inputContent = await fs.readFile(inputPath, 'utf8');
    await fs.writeFile(goldenSkillFile, inputContent, 'utf8');

    t.after(async () => {
        await fs.rm(goldenSkillDir, { recursive: true, force: true });
    });

    await execFileAsync('python', [migratorScript, '--only=__golden__'], { cwd: repoRoot });

    const migrated = normalizeEol(await fs.readFile(goldenSkillFile, 'utf8'));
    const canonical = normalizeEol(await fs.readFile(canonicalPath, 'utf8'));
    assert.equal(migrated, canonical, 'migrator output does not match canonical fixture');
});

test('TC-SLT-006: verifier accepts canonical fixture layout', async () => {
    const canonical = await fs.readFile(canonicalPath, 'utf8');
    const result = checkMainContentBeforeSyncBlocks(canonical, 'fixtures/skill-layout-canonical.md');
    assert.equal(result, null, `verifier rejected canonical layout: ${result}`);
});

test('TC-SLT-006-neg: verifier rejects layout with H2 after first SYNC opener', () => {
    const broken = [
        '---',
        'name: bad',
        '---',
        '',
        '<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->',
        '<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->',
        '',
        '## Quick Summary',
        '',
        '<!-- SYNC:foo -->',
        'body',
        '<!-- /SYNC:foo -->',
        '',
        '## Section After SYNC',
        '',
        '## Closing Reminders',
        '',
        '- end',
        ''
    ].join('\n');
    const result = checkMainContentBeforeSyncBlocks(broken, 'inline/broken.md');
    assert.ok(result, 'verifier should reject layout with H2 after first SYNC opener');
    assert.match(result, /layout invalid/);
});
