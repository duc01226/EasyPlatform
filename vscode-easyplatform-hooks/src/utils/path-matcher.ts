/**
 * Glob pattern matching utilities
 * Research: research-security-performance.md section 1.5 (ReDoS prevention)
 */

import micromatch from 'micromatch';

/**
 * Validate glob pattern to prevent ReDoS
 */
export function isValidPattern(pattern: string): boolean {
    // Reject patterns with excessive nesting or quantifiers
    const dangerousPatterns = [
        /\{[^}]*\{/, // Nested braces like {a,{b,c}}
        /\*{3,}/, // Triple+ asterisks (***)
        /(\{[^}]*,){10,}/, // More than 10 alternatives (excessive quantifiers)
        /(\{[^}]+\}){3,}/, // Multiple consecutive brace groups (exponential backtracking)
        /\*+\{.*\}\*+/ // Asterisks surrounding braces (**{...}**)
    ];

    return !dangerousPatterns.some(regex => regex.test(pattern));
}

/**
 * Match file path against patterns
 */
export function matchesPattern(filePath: string, patterns: string[]): boolean {
    // Validate all patterns first
    const validPatterns = patterns.filter(p => isValidPattern(p));

    if (validPatterns.length === 0) {
        return false;
    }

    return micromatch.isMatch(filePath, validPatterns, {
        dot: true // Match dotfiles
    });
}

/**
 * PathMatcher class for easier usage
 */
export class PathMatcher {
    private readonly patterns: string[];

    constructor(patterns: string[]) {
        this.patterns = patterns;
    }

    matches(filePath: string): boolean {
        return matchesPattern(filePath, this.patterns);
    }
}

/**
 * Compile patterns to single regex for performance
 * Research: research-edge-cases.md section 4 (1000+ patterns)
 */
export function compilePatterns(patterns: string[]): RegExp | null {
    const validPatterns = patterns.filter(p => isValidPattern(p));

    if (validPatterns.length === 0) {
        return null;
    }

    try {
        // Compile each pattern separately and combine with OR
        // Note: Using braces {pattern1,pattern2} changes behavior, so we compile individually
        const regexes = validPatterns
            .map(p => micromatch.makeRe(p, { dot: true }))
            .filter((r): r is RegExp => r !== null && r !== undefined && typeof r !== 'boolean');

        if (regexes.length === 0) {
            return null;
        }

        // Combine patterns into single regex with alternation
        const combined = new RegExp(regexes.map(r => `(?:${r.source})`).join('|'));

        return combined;
    } catch {
        return null;
    }
}
