const mm = require('micromatch');

console.log('\n=== Testing matchBase option ===');
console.log('Pattern: src/**');
console.log('  With matchBase=true:', mm.isMatch('src/components/Button.tsx', 'src/**', { dot: true, matchBase: true }));
console.log('  With matchBase=false:', mm.isMatch('src/components/Button.tsx', 'src/**', { dot: true, matchBase: false }));
console.log('  With default:', mm.isMatch('src/components/Button.tsx', 'src/**', { dot: true }));

console.log('\n=== Testing privacy patterns ===');
console.log('Pattern: **/secrets/**');
console.log('  Path: secrets/api-key.txt');
console.log('    With matchBase=true:', mm.isMatch('secrets/api-key.txt', '**/secrets/**', { dot: true, matchBase: true }));
console.log('    With matchBase=false:', mm.isMatch('secrets/api-key.txt', '**/secrets/**', { dot: true, matchBase: false }));
console.log('    With default:', mm.isMatch('secrets/api-key.txt', '**/secrets/**', { dot: true }));

console.log('\n=== Testing compiled regex ===');
const patterns = ['**/*.ts', '**/*.js'];
const regex = mm.makeRe(`{${patterns.join(',')}}`, { dot: true, matchBase: true });
console.log('Regex:', regex);
console.log('Test file.ts:', regex ? regex.test('file.ts') : null);
console.log('Test file.js:', regex ? regex.test('file.js') : null);
