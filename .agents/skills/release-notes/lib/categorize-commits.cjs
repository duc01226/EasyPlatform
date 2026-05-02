#!/usr/bin/env node
/**
 * Categorize commits for release notes
 * Usage: node categorize-commits.cjs < commits.json
 *
 * Reads parsed commits from stdin and categorizes them into release note sections
 */

const fs = require('fs');
const path = require('path');

// Category mappings (fallback if config not available)
const DEFAULT_CATEGORIES = {
  features: {
    types: ['feat'],
    heading: "What's New",
    userFacing: true,
  },
  fixes: {
    types: ['fix'],
    heading: 'Bug Fixes',
    userFacing: true,
  },
  improvements: {
    types: ['perf'],
    heading: 'Improvements',
    userFacing: true,
  },
  docs: {
    types: ['docs'],
    heading: 'Documentation',
    userFacing: true,
  },
  refactoring: {
    types: ['refactor'],
    heading: 'Refactoring',
    userFacing: false,
  },
  internal: {
    types: ['test', 'ci', 'build', 'chore', 'style'],
    heading: 'Internal Changes',
    userFacing: false,
  },
};

// Types/scopes to exclude from user-facing notes
const EXCLUDE_PATTERNS = [
  /^chore\(deps\)/,
  /^chore\(config\)/,
  /^ci:/,
  /^test:/,
  /^style:/,
  /\[skip changelog\]/i,
  /\[ci skip\]/i,
];

/**
 * Check if a commit should be excluded from user-facing notes
 */
function shouldExclude(commit) {
  const subject = commit.subject || '';
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(subject));
}

/**
 * Transform commit to user-friendly format
 */
function transformForUser(commit) {
  // Create user-friendly description
  let userDescription = commit.description;

  // Capitalize first letter
  userDescription = userDescription.charAt(0).toUpperCase() + userDescription.slice(1);

  // Add scope context if present
  const scopeLabel = commit.scope ? ` (${formatScope(commit.scope)})` : '';

  return {
    hash: commit.shortHash,
    description: userDescription,
    scope: commit.scope,
    scopeLabel,
    author: commit.author,
    date: commit.date,
    breaking: commit.breaking,
    original: commit,
  };
}

/**
 * Format scope for display
 */
function formatScope(scope) {
  const scopeLabels = {
    api: 'API',
    ui: 'UI',
    auth: 'Auth',
    deps: 'Dependencies',
    'ai-tools': 'AI Tools',
    frontend: 'Frontend',
    backend: 'Backend',
  };

  return scopeLabels[scope] || scope.charAt(0).toUpperCase() + scope.slice(1);
}

/**
 * Categorize commits into sections
 */
function categorizeCommits(commits, categories = DEFAULT_CATEGORIES) {
  const result = {
    features: [],
    fixes: [],
    improvements: [],
    docs: [],
    breaking: [],
    internal: [],
    other: [],
  };

  commits.forEach(commit => {
    // Always track breaking changes separately
    if (commit.breaking) {
      result.breaking.push(transformForUser(commit));
    }

    // Skip excluded commits for user-facing sections
    const excluded = shouldExclude(commit);

    // Categorize by type
    let categorized = false;
    for (const [category, config] of Object.entries(categories)) {
      if (config.types.includes(commit.type)) {
        if (excluded || !config.userFacing) {
          result.internal.push(transformForUser(commit));
        } else {
          result[category] = result[category] || [];
          result[category].push(transformForUser(commit));
        }
        categorized = true;
        break;
      }
    }

    // Handle uncategorized (non-conventional) commits
    if (!categorized) {
      result.other.push(transformForUser(commit));
    }
  });

  return result;
}

/**
 * Generate summary statistics
 */
function generateSummary(categorized, stats) {
  const userFacingCount =
    categorized.features.length +
    categorized.fixes.length +
    categorized.improvements.length;

  const sentences = [];

  if (categorized.features.length > 0) {
    sentences.push(`${categorized.features.length} new feature${categorized.features.length > 1 ? 's' : ''}`);
  }

  if (categorized.improvements.length > 0) {
    sentences.push(`${categorized.improvements.length} improvement${categorized.improvements.length > 1 ? 's' : ''}`);
  }

  if (categorized.fixes.length > 0) {
    sentences.push(`${categorized.fixes.length} bug fix${categorized.fixes.length > 1 ? 'es' : ''}`);
  }

  if (categorized.breaking.length > 0) {
    sentences.push(`${categorized.breaking.length} breaking change${categorized.breaking.length > 1 ? 's' : ''}`);
  }

  const summary = sentences.length > 0
    ? `This release includes ${sentences.join(', ')}.`
    : 'This release includes various internal improvements and maintenance updates.';

  return {
    text: summary,
    userFacingCount,
    totalCommits: stats.total,
    breakingCount: categorized.breaking.length,
    hasFeatures: categorized.features.length > 0,
    hasFixes: categorized.fixes.length > 0,
    hasImprovements: categorized.improvements.length > 0,
    hasBreaking: categorized.breaking.length > 0,
  };
}

/**
 * Main function
 */
function main() {
  let input = '';

  // Read from stdin
  if (!process.stdin.isTTY) {
    input = fs.readFileSync(0, 'utf-8');
  } else {
    // Read from file argument
    const args = process.argv.slice(2);
    if (args.length > 0 && fs.existsSync(args[0])) {
      input = fs.readFileSync(args[0], 'utf-8');
    } else {
      console.error('Usage: node categorize-commits.cjs < commits.json');
      console.error('       node categorize-commits.cjs commits.json');
      process.exit(1);
    }
  }

  let data;
  try {
    data = JSON.parse(input);
  } catch (error) {
    console.error(`Error parsing JSON input: ${error.message}`);
    console.error('Ensure upstream script outputs valid JSON');
    process.exit(1);
  }

  if (!data.commits || !Array.isArray(data.commits)) {
    console.error('Error: Missing or invalid "commits" array in input');
    process.exit(1);
  }
  const commits = data.commits || [];
  const stats = data.stats || { total: commits.length };

  const categorized = categorizeCommits(commits);
  const summary = generateSummary(categorized, stats);

  const result = {
    base: data.base,
    head: data.head,
    summary,
    categories: categorized,
    contributors: stats.authors || [],
    dateRange: stats.dateRange || {},
  };

  console.log(JSON.stringify(result, null, 2));
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { categorizeCommits, transformForUser, shouldExclude };
