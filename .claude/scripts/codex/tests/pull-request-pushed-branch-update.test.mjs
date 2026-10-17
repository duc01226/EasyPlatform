import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { rewriteClaudeToolTermsForCodex } from '../compat-rewrite.mjs';

// Guards the pull-request skill's opt-in rebase of an already-pushed PR branch. Rewriting pushed
// history is the one destructive Git step the skill may take, so its limits are pinned here: a
// re-sync or edit that drops one fails this file instead of shipping a looser procedure.
// Shipped source only: no adopter config, Git, GitHub or shell dependency.
const source = readFileSync(new URL('../../../skills/pull-request/SKILL.md', import.meta.url), 'utf8');
const codex = rewriteClaudeToolTermsForCodex(source);
const require = createRequire(import.meta.url);
const { SCHEMA } = require('../../../hooks/lib/project-config-schema.cjs');

function section(text, heading, nextHeading) {
  const start = text.indexOf(heading);
  assert.ok(start >= 0, `Missing ${heading}`);
  const end = text.indexOf(nextHeading, start + heading.length);
  assert.ok(end > start, `Missing section boundary ${nextHeading}`);
  return text.slice(start, end);
}

test('the setting the skill reads is the schema key, and merge stays the default for every adopter', () => {
  const field = SCHEMA.pullRequest.properties.pushedBranchUpdate;
  assert.deepEqual(field.enumValues, ['merge', 'rebase']);
  assert.equal(field.required, false);
  assert.match(field.describe, /^Default "merge"/);
  for (const text of [source, codex]) {
    const rule = section(text, '**Pushed-branch update.**', '### Step 3');
    assert.match(rule, /`pullRequest\.pushedBranchUpdate` in `docs\/project-config\.json`/);
    assert.match(rule, /`merge` \(default\) — never rebase a pushed commit/);
  }
});

test('the setting decides only how a pushed branch is updated: Step 2 never updates it, in either mode', () => {
  for (const text of [source, codex]) {
    // An update makes a new head, so updating a branch that does not need it discards its proof.
    const branch = section(text, '### Step 2', '**Moving with pending work.**');
    assert.match(branch, /\*\*Behind `R`, any commit to replay pushed\*\* → stay, no update here/);
    const rule = section(text, '**Pushed-branch update.**', '### Step 3');
    assert.match(rule, /when Step 9 finds it behind or conflicting, or the user asks for that update\. It decides only how, never when/);
    const ready = section(text, '### Step 9', '## User Choice Contract');
    assert.match(ready, /\*\*Pushed-branch update\*\* `rebase` mode with every condition met \(Step 2\) → rebase onto `origin\/<target>`/);
    assert.match(ready, /Otherwise run `git merge --no-ff --no-commit origin\/<target>`/);
  }
});

test('rebase mode rewrites pushed history only for the current user\'s own, fully fetched PR branch', () => {
  for (const text of [source, codex]) {
    const rule = section(text, '**Pushed-branch update.**', '### Step 3');
    assert.match(rule, /only when all three hold; otherwise use `merge`/);
    assert.match(rule, /`git log --format=%ae R\.\.HEAD` prints only `git config user\.email`/);
    assert.match(rule, /`git merge-base --is-ancestor origin\/<branch> HEAD` succeeds/);
    assert.match(rule, /The branch is the PR branch, never the target/);
  }
});

test('a pushed-branch rebase is pushed only with an explicit literal lease, and a refused lease stops the run', () => {
  for (const text of [source, codex]) {
    const rule = section(text, '**Pushed-branch update.**', '### Step 3');
    assert.match(rule, /Record `S` = `git rev-parse origin\/<branch>` before the rebase/);
    assert.match(rule, /`git push --force-with-lease=<branch>:<S> origin <branch>`/);
    assert.match(rule, /Never a plain `--force` \/ `-f` or a `\+<refspec>`/);
    assert.match(rule, /Lease refused → .*\*\*Blocker\*\*.*never retry with a weaker push/);
    // A lease with an explicit value makes `--force-if-includes` a no-op (git-push docs), so the
    // procedure must not present it as a second safeguard.
    assert.doesNotMatch(rule, /--force-if-includes/);
  }
});

test('Authority, Key Rules and closing reminders never grant a plain force-push or an unconditional pushed rebase', () => {
  for (const text of [source, codex]) {
    const authority = section(text, '## Authority', '## Execution');
    assert.match(authority, /only when every \*\*Pushed-branch update\*\* condition holds/);
    assert.match(authority, /NEVER authorizes .*a plain force-push \(`--force`, `-f`, `\+<refspec>`\), rewriting pushed history outside that mode/);
    const keyRules = section(text, '**Key Rules:**', '## Contents');
    assert.match(keyRules, /NEVER .*use a plain force-push \(`--force`, `-f`, `\+<refspec>`\)/);
    assert.match(keyRules, /Rebase a pushed commit only under `pullRequest\.pushedBranchUpdate: "rebase"` with every \*\*Pushed-branch update\*\* condition met/);
    const closing = section(text, '## Closing Reminders', '**Anti-Rationalization:**');
    assert.match(closing, /use a plain force-push, rewrite pushed history outside `pullRequest\.pushedBranchUpdate: "rebase"` and its conditions/);
  }
});
