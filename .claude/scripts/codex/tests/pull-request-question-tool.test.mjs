import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rewriteClaudeToolTermsForCodex } from '../compat-rewrite.mjs';

// Shipped source only: no adopter config, home state, GitHub or shell dependency.
// URL-relative reads work unchanged on Windows, macOS and Linux.
const source = readFileSync(new URL('../../../skills/pull-request/SKILL.md', import.meta.url), 'utf8');
const codex = rewriteClaudeToolTermsForCodex(source);
const commit = readFileSync(new URL('../../../skills/commit/SKILL.md', import.meta.url), 'utf8');

function section(text, heading, nextHeading) {
  const start = text.indexOf(heading);
  assert.ok(start >= 0, `Missing ${heading}`);
  const end = text.indexOf(nextHeading, start + heading.length);
  assert.ok(end > start, `Missing section boundary ${nextHeading}`);
  return text.slice(start, end);
}

test('PR test and review gates decide automatically and never display a test/review question', () => {
  for (const text of [source, codex]) {
    for (const [heading, nextHeading] of [
      ['### Step 3.5', '### Step 4'],
      ['### Step 4', '### Step 5'],
    ]) {
      const gate = section(text, heading, nextHeading);
      assert.match(gate, /act without asking the user/);
      assert.doesNotMatch(gate, /Call the ask-user question tool/, 'tests and review must not raise a question');
    }
    const tests = section(text, '### Step 3.5', '### Step 4');
    assert.match(tests, /resolve every failure at its owning layer until all pass/);
    assert.match(tests, /that is a \*\*Blocker\*\*, not a skip/);
    const review = section(text, '### Step 4', '### Step 5');
    assert.match(review, /\*\*Low\*\* → automatic skip; \*\*Medium\*\* → `[/$]why-review --fix-loop`; \*\*High\*\* → `[/$]changes-review --fix-loop`, each at most two review rounds over the whole scope/);
    assert.match(review, /a skip is never minted for a Medium or High branch/);
    assert.match(review, /A failed review is not a skip: never mint one to get past it/);
    const contract = section(text, '## User Choice Contract', '## Related');
    assert.match(contract, /Test and review decisions are automatic under `references\/check-policy\.md` and raise no question/);
    assert.match(contract, /invoke the available native ask-user question tool with the actual question and selectable options/);
    assert.match(contract, /do not merely name the tool in prose/);
    assert.match(contract, /split into sequential questions/);
    assert.match(contract, /never drop Skip from a question that offers it/);
  }
});

test('PR confirmations use a permitted native question tool without forcing Plan mode', () => {
  assert.match(source, /Claude Code:\*\* call `ask user question tool`/);
  for (const text of [source, codex]) {
    const contract = section(text, '## User Choice Contract', '## Related');
    assert.match(contract, /`functions\.request_user_input_async` in Default mode/);
    assert.match(contract, /`request_user_input` only when its tool contract and the current mode permit this kind of question/);
    assert.match(contract, /do not switch to Plan mode just to ask for confirmation/);
    assert.match(contract, /OpenCode:\*\* call its native `question` tool/);
    assert.match(contract, /if no permitted question tool exists, visibly present the exact question and numbered choices/);
    assert.match(contract, /when a permitted tool is available, call it/);
  }
  assert.doesNotMatch(codex, /AskUserQuestion/);
});

test('posting an asynchronous PR question never authorizes dependent work', () => {
  for (const text of [source, codex]) {
    const contract = section(text, '## User Choice Contract', '## Related');
    assert.match(contract, /a tool acknowledgement means the question was posted, not answered/);
    assert.match(contract, /candidate\/scope and status `pending`/);
    assert.match(contract, /pause dependent steps, and wait for the human reply/);
    assert.match(contract, /Preselection, silence and elapsed time are not consent/);
    assert.match(contract, /retain a pending question across compaction\/resume without treating it as answered or posting duplicates/);
    assert.match(contract, /Mint a skip receipt only for a Low-risk candidate or on the user's explicit request, never after a failed or non-converged review/);
    assert.match(contract, /an explicit request to skip, run or choose a specific check overrides the automatic choice/);
  }
});

// These are shipped prompt-contract checks, not evidence of live model compliance.
test('concise commit retains project inputs and configured review without boilerplate', () => {
  const projectInputs = /[Ll]oad project configuration and matching skill overlays/;
  assert.match('Load project configuration and matching skill overlays', projectInputs);
  assert.match('load project configuration and matching skill overlays', projectInputs);
  for (const text of [commit, rewriteClaudeToolTermsForCodex(commit)]) {
    assert.match(text, projectInputs);
    assert.doesNotMatch(text.replaceAll('project configuration and ', ''), projectInputs, 'project configuration is required');
    assert.doesNotMatch(text.replaceAll(' and matching skill overlays', ''), projectInputs, 'matching skill overlays are required');
    assert.match(text, /commit-review-policy\.cjs --operation=commit/);
    assert.match(text, /default `[/$]commit-review --fix-loop`, at most two rounds/);
    assert.match(text, /current matching review evidence/);
    assert.doesNotMatch(text, /Estimate:|Reviewers:|PROTOCOL-GUIDES|Closing Reminders/);
  }
});

test('full-scope PR evidence is reused only for the exact candidate, and a skip never transfers', () => {
  for (const text of [source, codex]) {
    const review = section(text, '### Step 4', '### Step 5');
    assert.match(review, /Reuse an existing full review under the shared decision policy only when the evidence matches this exact candidate and whole-branch scope/);
    assert.match(review, /A skip covers only the unchanged candidate and scope it was recorded for/);
    assert.match(review, /changed content is classified and gated again/);
    assert.doesNotMatch(review, /reused only after the user confirms it for this run and candidate/);
  }
});

test('CI repairs run fresh gates automatically and hand the recorded decision to nested commit', () => {
  for (const text of [source, codex]) {
    const ci = section(text, '### Step 8', '### Step 9');
    assert.match(ci, /Gate the repair without a question[^\n]*Automatically run affected local checks/);
    assert.match(ci, /WHOLE branch/);
    assert.match(ci, /refresh the exact-candidate receipt/);
    assert.match(ci, /raises the tier and its review, never a question/);
    assert.match(ci, /A previous Skip does not authorize skipping repair checks/);
    const handoff = section(text, '### Step 6', '### Step 7');
    assert.match(handoff, /recorded risk tier, test decision and evidence, whole-branch review proof and matching exact-candidate receipt/);
    assert.match(handoff, /Its gates reuse that current evidence instead of repeating the work, and ask nothing/);
  }
});

test('PR owns its policy instead of loading a removed commit procedure', () => {
  const policy = readFileSync(new URL('../../../skills/pull-request/references/check-policy.md', import.meta.url), 'utf8');
  assert.match(source, /Read `references\/check-policy\.md`/);
  assert.match(policy, /--operation=pull-request/);
  assert.match(policy, /regardless of `commit\.reviewMode`/);
  assert.match(policy, /whole-branch scope and final candidate match/);
  assert.match(policy, /Never skip after a failed\/non-converged review/);
  assert.doesNotMatch(source, /commit\/SKILL\.md#test-and-review|`commit` Step 3\.[56]|Estimate:/);
});

test('work tracking keeps tracked work current as the project instruction says, and never gates the PR', () => {
  for (const text of [source, codex]) {
    const step = section(text, '### Step 3.3', '### Step 3.5')
    assert.match(step, /Keep the project's tracked work current with this pull request/)
    assert.match(step, /root instructions \(`CLAUDE\.md` or `AGENTS\.md`\) point to a work-tracking instruction/)
    assert.match(step, /the instruction, not this skill, owns the rules/)
    assert.match(step, /Tracker edits are candidate changes and go through Steps 3\.5–4/)
    assert.match(step, /No instruction → skip silently\. It never gates or delays Steps 3\.5–9/)
    assert.doesNotMatch(step, /task-track/, 'the PR skill writes no tracker records through a separate tool')
  }
})
