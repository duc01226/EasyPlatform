#!/usr/bin/env node
/**
 * Generate contributor statistics from commits
 * Usage: node contributor-stats.cjs < commits.json
 *
 * Analyzes commits to generate contributor statistics and formatting
 */

const fs = require('fs');
const { validateInputNotEmpty } = require('./utils.cjs');

// Map author names to GitHub usernames (optional mapping)
const AUTHOR_GITHUB_MAP = {
  // Add mappings like:
  // 'John Doe': 'johndoe',
  // 'DOMAIN\\user': 'github-user',
};

/**
 * Normalize author name for GitHub mention
 */
function normalizeAuthorName(author) {
  // Check manual mapping first
  if (AUTHOR_GITHUB_MAP[author]) {
    return AUTHOR_GITHUB_MAP[author];
  }

  // Remove domain prefix (DOMAIN\user -> user)
  let normalized = author.replace(/^.*\\/, '');

  // Remove common suffixes
  normalized = normalized.replace(/\s*\(.*\)$/, '');

  // Convert to GitHub-friendly format (lowercase, no spaces)
  normalized = normalized.toLowerCase().replace(/\s+/g, '-');

  return normalized;
}

/**
 * Analyze contributor statistics
 */
function analyzeContributors(commits) {
  const contributorMap = new Map();

  commits.forEach(commit => {
    const author = commit.author;
    if (!author) return;

    if (!contributorMap.has(author)) {
      contributorMap.set(author, {
        name: author,
        githubUsername: normalizeAuthorName(author),
        email: commit.email,
        commits: 0,
        features: 0,
        fixes: 0,
        improvements: 0,
        docs: 0,
        other: 0,
        firstCommit: commit.date,
        lastCommit: commit.date,
      });
    }

    const stats = contributorMap.get(author);
    stats.commits++;

    // Track by type
    switch (commit.type) {
      case 'feat':
        stats.features++;
        break;
      case 'fix':
        stats.fixes++;
        break;
      case 'perf':
      case 'refactor':
        stats.improvements++;
        break;
      case 'docs':
        stats.docs++;
        break;
      default:
        stats.other++;
    }

    // Update date range
    if (commit.date < stats.firstCommit) stats.firstCommit = commit.date;
    if (commit.date > stats.lastCommit) stats.lastCommit = commit.date;
  });

  // Convert to array and sort by commit count
  return Array.from(contributorMap.values()).sort((a, b) => b.commits - a.commits);
}

/**
 * Format contributors for release notes
 */
function formatContributors(contributors, options = {}) {
  const { showStats = false, maxContributors = 20 } = options;

  const limited = contributors.slice(0, maxContributors);

  if (showStats) {
    return limited.map(c => ({
      mention: `@${c.githubUsername}`,
      name: c.name,
      commits: c.commits,
      highlights: getContributorHighlights(c),
    }));
  }

  return limited.map(c => `@${c.githubUsername}`);
}

/**
 * Get contributor highlights (main contribution types)
 */
function getContributorHighlights(contributor) {
  const highlights = [];

  if (contributor.features > 0) {
    highlights.push(`${contributor.features} feature${contributor.features > 1 ? 's' : ''}`);
  }
  if (contributor.fixes > 0) {
    highlights.push(`${contributor.fixes} fix${contributor.fixes > 1 ? 'es' : ''}`);
  }
  if (contributor.improvements > 0) {
    highlights.push(`${contributor.improvements} improvement${contributor.improvements > 1 ? 's' : ''}`);
  }

  return highlights.join(', ');
}

/**
 * Generate contributor summary
 */
function generateContributorSummary(contributors) {
  const total = contributors.length;

  if (total === 0) {
    return {
      total: 0,
      text: 'No contributors found.',
    };
  }

  const totalCommits = contributors.reduce((sum, c) => sum + c.commits, 0);
  const topContributor = contributors[0];

  let text = `${total} contributor${total > 1 ? 's' : ''} with ${totalCommits} commit${totalCommits > 1 ? 's' : ''}.`;

  if (total > 1) {
    text += ` Top contributor: ${topContributor.name} (${topContributor.commits} commits)`;
  }

  return {
    total,
    totalCommits,
    topContributor: topContributor.name,
    text,
  };
}

/**
 * Process contributor data for release notes
 */
function processContributors(data) {
  const commits = data.commits || [];
  const contributors = analyzeContributors(commits);
  const formatted = formatContributors(contributors);
  const summary = generateContributorSummary(contributors);

  return {
    ...data,
    contributorStats: {
      summary,
      contributors: contributors.map(c => ({
        name: c.name,
        githubUsername: c.githubUsername,
        commits: c.commits,
        features: c.features,
        fixes: c.fixes,
        improvements: c.improvements,
        dateRange: {
          first: c.firstCommit,
          last: c.lastCommit,
        },
      })),
      formatted,
      markdown: formatted.map(c => `- ${c}`).join('\n'),
    },
  };
}

/**
 * Main function
 */
function main() {
  let input = '';

  // Read from stdin or file
  if (!process.stdin.isTTY) {
    input = fs.readFileSync(0, 'utf-8');
  } else {
    const args = process.argv.slice(2);
    if (args.length > 0 && fs.existsSync(args[0])) {
      input = fs.readFileSync(args[0], 'utf-8');
    } else {
      console.error('Usage: node contributor-stats.cjs < commits.json');
      console.error('       node contributor-stats.cjs commits.json');
      process.exit(1);
    }
  }

  // Validate input not empty
  validateInputNotEmpty(input, 'contributor-stats');

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
  const result = processContributors(data);

  console.log(JSON.stringify(result, null, 2));
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  normalizeAuthorName,
  analyzeContributors,
  formatContributors,
  processContributors,
};
