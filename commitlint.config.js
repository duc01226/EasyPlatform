/**
 * Commitlint configuration for EasyPlatform
 * Enforces conventional commit format for reliable release notes generation
 * @see https://www.conventionalcommits.org/
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Allowed commit types
    'type-enum': [
      2, // Error level
      'always',
      [
        'feat',     // New feature (user-facing)
        'fix',      // Bug fix (user-facing)
        'docs',     // Documentation changes
        'style',    // Code style/formatting (no logic change)
        'refactor', // Code restructuring (no feature/fix)
        'perf',     // Performance improvement
        'test',     // Test additions/modifications
        'build',    // Build system/dependencies
        'ci',       // CI/CD configuration
        'chore',    // Maintenance tasks
        'revert',   // Revert previous commit
      ],
    ],

    // Recommended scopes for EasyPlatform (warning level - not enforced)
    'scope-enum': [
      1, // Warning level
      'always',
      [
        // Backend scopes
        'api',           // API controllers/endpoints
        'domain',        // Domain entities/logic
        'application',   // Application layer (CQRS handlers)
        'persistence',   // Database/repository layer
        'platform',      // Easy.Platform framework
        'jobs',          // Background jobs

        // Frontend scopes
        'frontend',      // General frontend changes
        'ui',            // UI components
        'store',         // State management
        'core',          // Platform-core library

        // Cross-cutting scopes
        'deps',          // Dependencies
        'config',        // Configuration files
        'auth',          // Authentication/authorization
        'release',       // Release-related changes

        // AI tooling scopes
        'ai-tools',      // Claude/Copilot skills
        'skills',        // Skill definitions
        'prompts',       // Prompt templates
      ],
    ],

    // Message formatting rules
    'subject-case': [0], // Disabled - allow any case
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
    'body-leading-blank': [2, 'always'],
    'footer-leading-blank': [2, 'always'],

    // Allow empty scope
    'scope-empty': [0],
  },

  // Help message for invalid commits
  helpUrl: 'https://www.conventionalcommits.org/en/v1.0.0/',
};
