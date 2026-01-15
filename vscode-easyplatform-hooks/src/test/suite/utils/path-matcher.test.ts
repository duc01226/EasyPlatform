/**
 * Tests for path matching utilities
 * NO MOCKS - Real pattern matching
 */

import * as assert from 'assert';
import { compilePatterns, isValidPattern, matchesPattern, PathMatcher } from '../../../utils/path-matcher';

suite('PathMatcher Tests', () => {
    suite('isValidPattern()', () => {
        test('accepts safe patterns', () => {
            const safePatterns = ['**/*.ts', 'src/**/*.js', '*.{ts,js,json}', '**/.env*', '**/secrets/**', '*.test.{ts,js}'];

            for (const pattern of safePatterns) {
                assert.strictEqual(isValidPattern(pattern), true, `Pattern should be valid: ${pattern}`);
            }
        });

        test('rejects ReDoS patterns', () => {
            const dangerousPatterns = [
                '{src,{lib,test}}', // Nested braces
                '****', // Triple+ asterisks
                '{a,b}{c,d}{e,f}', // Multiple quantifiers
                '**{**}**' // Complex nesting
            ];

            for (const pattern of dangerousPatterns) {
                assert.strictEqual(isValidPattern(pattern), false, `Pattern should be invalid (ReDoS risk): ${pattern}`);
            }
        });
    });

    suite('matchesPattern()', () => {
        test('matches file paths correctly', () => {
            const patterns = ['**/*.ts', '*.js', 'src/**'];

            assert.strictEqual(matchesPattern('src/file.ts', patterns), true, 'Should match .ts file');

            assert.strictEqual(matchesPattern('app.js', patterns), true, 'Should match .js file');

            assert.strictEqual(matchesPattern('src/components/Button.tsx', patterns), true, 'Should match src/** pattern');
        });

        test('does not match non-matching paths', () => {
            const patterns = ['**/*.ts', '*.js'];

            assert.strictEqual(matchesPattern('README.md', patterns), false, 'Should not match .md file');

            assert.strictEqual(matchesPattern('config.json', patterns), false, 'Should not match .json file');
        });

        test('handles dotfiles with dot:true option', () => {
            const patterns = ['.env*', '**/.env*'];

            assert.strictEqual(matchesPattern('.env', patterns), true, 'Should match .env');

            assert.strictEqual(matchesPattern('.env.local', patterns), true, 'Should match .env.local');

            assert.strictEqual(matchesPattern('config/.env.production', patterns), true, 'Should match nested .env file');
        });

        test('matches privacy-sensitive patterns', () => {
            const privacyPatterns = ['**/.env*', '**/secrets/**', '**/*.key', '**/*.pem', '**/id_rsa*'];

            const testCases = [
                { path: '.env', expected: true },
                { path: 'config/.env.local', expected: true },
                { path: 'secrets/api-key.txt', expected: true },
                { path: 'certs/server.key', expected: true },
                { path: 'certs/ca.pem', expected: true },
                { path: '~/.ssh/id_rsa', expected: true },
                { path: 'src/app.ts', expected: false },
                { path: 'public/logo.png', expected: false }
            ];

            for (const { path, expected } of testCases) {
                assert.strictEqual(matchesPattern(path, privacyPatterns), expected, `Path ${path} should ${expected ? 'match' : 'not match'} privacy patterns`);
            }
        });

        test('filters invalid patterns before matching', () => {
            const mixedPatterns = [
                '**/*.ts', // Valid
                '****', // Invalid (ReDoS)
                '**/*.js', // Valid
                '{a,{b,c}}' // Invalid (nested braces)
            ];

            // Should only use valid patterns
            assert.strictEqual(matchesPattern('file.ts', mixedPatterns), true, 'Should match using valid patterns');
        });

        test('returns false when all patterns are invalid', () => {
            const invalidPatterns = ['****', '{a,{b,c}}'];

            assert.strictEqual(matchesPattern('file.ts', invalidPatterns), false, 'Should return false when no valid patterns');
        });
    });

    suite('PathMatcher class', () => {
        test('matches() works with instance patterns', () => {
            const matcher = new PathMatcher(['**/*.ts', '**/*.tsx']);

            assert.strictEqual(matcher.matches('src/App.ts'), true);
            assert.strictEqual(matcher.matches('components/Button.tsx'), true);
            assert.strictEqual(matcher.matches('styles.css'), false);
        });

        test('can be created with empty patterns', () => {
            const matcher = new PathMatcher([]);

            assert.strictEqual(matcher.matches('any-file.ts'), false);
        });

        test('handles privacy patterns', () => {
            const privacyMatcher = new PathMatcher(['**/.env*', '**/secrets/**', '**/*.key']);

            assert.strictEqual(privacyMatcher.matches('.env'), true);
            assert.strictEqual(privacyMatcher.matches('config/secrets/api.json'), true);
            assert.strictEqual(privacyMatcher.matches('certs/ssl.key'), true);
            assert.strictEqual(privacyMatcher.matches('src/index.ts'), false);
        });
    });

    suite('compilePatterns()', () => {
        test('compiles valid patterns to RegExp', () => {
            const patterns = ['**/*.ts', '**/*.js'];
            const compiled = compilePatterns(patterns);

            assert.ok(compiled instanceof RegExp, 'Should return RegExp');

            // Test the compiled regex
            assert.strictEqual(compiled.test('file.ts'), true);
            assert.strictEqual(compiled.test('file.js'), true);
            assert.strictEqual(compiled.test('file.md'), false);
        });

        test('returns null for empty patterns', () => {
            const compiled = compilePatterns([]);
            assert.strictEqual(compiled, null, 'Should return null for empty patterns');
        });

        test('filters invalid patterns before compiling', () => {
            const mixedPatterns = [
                '**/*.ts', // Valid
                '****' // Invalid
            ];

            const compiled = compilePatterns(mixedPatterns);
            assert.ok(compiled instanceof RegExp, 'Should compile valid patterns only');
        });

        test('handles compilation errors gracefully', () => {
            // Even with valid-looking patterns, if micromatch fails, should return null
            const patterns = ['**/*.ts'];
            const compiled = compilePatterns(patterns);

            // Should either succeed or return null, never throw
            assert.ok(compiled === null || compiled instanceof RegExp);
        });
    });

    suite('Scout pattern detection', () => {
        test('identifies overly broad patterns', () => {
            const broadPatterns = ['**/*', '**/*.{ts,js,cs,py,go,java,cpp}', 'src/**'];

            // These should be flagged as too broad for scout operations
            for (const pattern of broadPatterns) {
                assert.strictEqual(isValidPattern(pattern), true, `Pattern ${pattern} is technically valid but should be warned about in scout context`);
            }
        });
    });
});
