'use strict';

/**
 * Contents lists of the shipped skill catalog (authoring rule:
 * `.claude/skills/skill-creator/references/authoring-quality.md` → "Reference discovery").
 *
 * A skill file over 100 lines — `SKILL.md` or a file the skill bundles — lists its contents inside
 * its first 100 lines. That part is what a preview shows and what a host keeps after compaction,
 * so the list tells the agent what else exists and what to re-read. A list that omits or misnames a
 * section is worse than none, because the agent reads it as complete.
 *
 * The skill validator (`validate-skills.cjs`, covered by `skill-validator.test.cjs`) owns the whole
 * rule: where a list must sit, which headings it holds, and their anchors. This test runs it over
 * the shipped catalog, so a long file cannot ship without its list and a section cannot be added,
 * renamed or removed without the list following. Repair with
 * `node .claude/skills/skill-creator/scripts/validate-skills.cjs --fix-contents`.
 */

const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const SKILLS_DIR = path.join(REPO_ROOT, '.claude', 'skills');
const VALIDATOR = path.join(SKILLS_DIR, 'skill-creator', 'scripts', 'validate-skills.cjs');

test('every shipped skill file carries a current contents list where the rule asks for one', () => {
    const result = spawnSync(process.execPath, [VALIDATOR, '--path', SKILLS_DIR], {
        cwd: REPO_ROOT, env: { ...process.env, CLAUDE_PROJECT_DIR: REPO_ROOT }, encoding: 'utf8', timeout: 60000,
    });
    assert.ifError(result.error);
    assert.match(result.stdout, /--- Summary ---/, `the validator did not finish: ${result.stderr}`);
    // The validator prints a skill's path, then its issues; keep the path with each contents warning.
    const problems = [];
    let current = '';
    for (const line of result.stdout.split(/\r?\n/)) {
        if (/^\S.*SKILL\.md:$/.test(line)) current = line.slice(0, -1);
        else if (/\[WARN\].*Contents (list|not inspected)/.test(line)) problems.push(`${current} →${line.replace(/^\s*\[WARN\]/, '')}`);
    }
    assert.deepEqual(problems, [], 'run validate-skills.cjs --fix-contents, and ship only regular Markdown files');
});
