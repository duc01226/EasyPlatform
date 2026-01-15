const mm = require('micromatch');

// Test compilePatterns
const patterns = ['**/*.ts', '**/*.js'];
const combinedPattern = `{${patterns.join(',')}}`;

console.log('Combined pattern:', combinedPattern);

const regex = mm.makeRe(combinedPattern, { dot: true });

console.log('Regex:', regex);
console.log('Regex is:', typeof regex);
console.log('Test file.ts:', regex ? regex.test('file.ts') : 'null');
console.log('Test src/file.js:', regex ? regex.test('src/file.js') : 'null');
