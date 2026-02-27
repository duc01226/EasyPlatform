/**
 * Verify docs-update is the holistic documentation orchestrator in workflows.
 * - docs-update is the last doc step before watzup (no separate feature-docs step)
 * - docs-update SKILL.md has Phase 0 (change detection) and Phase 3 (feature-docs trigger)
 * - feature-docs is NOT in workflow sequences (handled internally by docs-update)
 * - feature-docs SKILL.md still has Phase 0 for standalone use
 */
const fs = require('fs');
const path = require('path');

const wfPath = path.join(__dirname, '..', '..', '..', 'workflows.json');
const wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));

const duKey = 'docs-update';
const fdKey = 'feature-docs';
const ids = ['bugfix', 'refactor', 'verification', 'full-feature-lifecycle', 'feature'];
let passed = 0;
let total = 0;

// Test 1-5: Each workflow has docs-update before watzup, and NO feature-docs step
ids.forEach(id => {
  total++;
  const s = wf.workflows[id].sequence;
  const di = s.indexOf(duKey);
  const fi = s.indexOf(fdKey);
  const wi = s.indexOf('watzup');
  if (di >= 0 && fi === -1 && wi >= 0 && di < wi) {
    console.log(`PASS: ${id} — docs-update@${di} before watzup@${wi}, no feature-docs in sequence`);
    passed++;
  } else {
    console.log(`FAIL: ${id} — docs-update@${di}, feature-docs@${fi} (should be -1), watzup@${wi}`);
  }
});

// Test 6: commandMapping entry still exists for standalone use
total++;
const cm = wf.commandMapping[fdKey];
if (cm && cm.claude === `/${fdKey}`) {
  console.log(`PASS: commandMapping[${fdKey}] retained for standalone use`);
  passed++;
} else {
  console.log(`FAIL: commandMapping[${fdKey}] missing`);
}

// Test 7: wr-output.cjs has updated docs-update description (holistic)
total++;
const wrPath = path.join(__dirname, '..', '..', 'lib', 'wr-output.cjs');
const wrContent = fs.readFileSync(wrPath, 'utf8');
if (wrContent.includes("'docs-update'") && wrContent.includes('general + feature docs')) {
  console.log('PASS: wr-output.cjs docs-update description is holistic');
  passed++;
} else {
  console.log('FAIL: wr-output.cjs docs-update description not updated');
}

// Test 8: docs-update SKILL.md has Phase 0 (change detection) and Phase 3 (feature-docs decision)
total++;
const duSkillPath = path.join(__dirname, '..', '..', '..', 'skills', 'docs-update', 'SKILL.md');
const duContent = fs.readFileSync(duSkillPath, 'utf8');
if (duContent.includes('Phase 0: Change Detection') && duContent.includes('Phase 3: Feature Documentation Update')) {
  console.log('PASS: docs-update SKILL.md has Phase 0 + Phase 3');
  passed++;
} else {
  console.log('FAIL: docs-update SKILL.md missing Phase 0 or Phase 3');
}

// Test 9: feature-docs SKILL.md still has Phase 0 for standalone use
total++;
const fdSkillPath = path.join(__dirname, '..', '..', '..', 'skills', 'feature-docs', 'SKILL.md');
const fdContent = fs.readFileSync(fdSkillPath, 'utf8');
if (fdContent.includes('Phase 0: Change Detection') && fdContent.includes('git diff')) {
  console.log('PASS: feature-docs SKILL.md retains Phase 0 for standalone use');
  passed++;
} else {
  console.log('FAIL: feature-docs SKILL.md missing Phase 0');
}

console.log(`\n${passed}/${total} tests passed`);
process.exit(passed === total ? 0 : 1);
