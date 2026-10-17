'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const skillRoot = path.resolve(__dirname, '..');
const files = [
  'SKILL.md',
  'references/presentation-principles.md',
  'references/web-runtime-contract.md',
  'scripts/create-presentation.cjs',
  'scripts/validate-presentation.cjs',
];
const forbiddenSubjectToken = String.fromCharCode(111, 114, 105, 101, 110, 116);
const forbiddenPhrase = ['reference', 'deck'].join(' ');

for (const relativePath of files) {
  const content = fs.readFileSync(path.join(skillRoot, relativePath), 'utf8').toLowerCase();
  assert.equal(content.includes(forbiddenSubjectToken), false, `${relativePath} contains a subject-specific coupling token`);
  assert.equal(content.includes(forbiddenPhrase), false, `${relativePath} contains a named source-artifact dependency`);
}

console.log('presentation-builder genericity tests passed');
