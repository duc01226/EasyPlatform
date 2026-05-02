#!/usr/bin/env node
/**
 * Extract PR metadata from commits
 * Usage: node extract-pr-metadata.cjs < commits.json [--fetch-gh]
 *
 * Extracts PR numbers from commit messages and optionally fetches GitHub PR details
 */

const fs = require('fs');
const { execSync } = require('child_process');

// PR reference patterns
const PR_PATTERNS = [
  /\(#(\d+)\)/g, // (PR #123)
  /Merge pull request #(\d+)/gi, // Merge PR
  /closes?\s*#(\d+)/gi, // Closes #123
  /fixes?\s*#(\d+)/gi, // Fixes #123
  /resolves?\s*#(\d+)/gi, // Resolves #123
  /#(\d+)\b/g, // Generic #123 reference
];

/**
 * Extract PR numbers from commit message
 */
function extractPRNumbers(commit) {
  const text = `${commit.subject} ${commit.body || ''}`;
  const prNumbers = new Set();

  for (const pattern of PR_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      prNumbers.add(parseInt(match[1], 10));
    }
  }

  return Array.from(prNumbers);
}

/**
 * Fetch PR details from GitHub using gh CLI
 */
function fetchPRDetails(prNumber) {
  try {
    const cmd = `gh pr view ${prNumber} --json title,body,labels,author,mergedAt,additions,deletions,changedFiles`;
    const output = execSync(cmd, { encoding: 'utf-8', timeout: 10000 });
    return JSON.parse(output);
  } catch (error) {
    // PR not found or gh CLI error
    return null;
  }
}

/**
 * Extract labels from PR data
 */
function extractLabels(prData) {
  if (!prData?.labels) return [];
  return prData.labels.map(l => (typeof l === 'string' ? l : l.name));
}

/**
 * Determine PR type from labels
 */
function determinePRType(labels) {
  const labelSet = new Set(labels.map(l => l.toLowerCase()));

  if (labelSet.has('breaking') || labelSet.has('breaking-change')) {
    return 'breaking';
  }
  if (labelSet.has('feature') || labelSet.has('enhancement')) {
    return 'feature';
  }
  if (labelSet.has('bug') || labelSet.has('bugfix')) {
    return 'fix';
  }
  if (labelSet.has('documentation') || labelSet.has('docs')) {
    return 'docs';
  }
  if (labelSet.has('performance')) {
    return 'perf';
  }

  return 'other';
}

/**
 * Process commits to extract PR metadata
 */
function extractPRMetadata(data, options = {}) {
  const { fetchGitHub = false } = options;
  const commits = data.commits || [];

  const prMap = new Map();

  commits.forEach(commit => {
    const prNumbers = extractPRNumbers(commit);

    prNumbers.forEach(prNum => {
      if (!prMap.has(prNum)) {
        prMap.set(prNum, {
          number: prNum,
          commits: [],
          details: null,
        });
      }

      prMap.get(prNum).commits.push(commit.shortHash);
    });
  });

  // Optionally fetch GitHub details
  if (fetchGitHub) {
    for (const [prNum, prData] of prMap) {
      const details = fetchPRDetails(prNum);
      if (details) {
        const labels = extractLabels(details);
        prData.details = {
          title: details.title,
          author: details.author?.login,
          labels,
          type: determinePRType(labels),
          mergedAt: details.mergedAt,
          stats: {
            additions: details.additions,
            deletions: details.deletions,
            files: details.changedFiles,
          },
        };
      }
    }
  }

  // Convert to array
  const pullRequests = Array.from(prMap.values());

  return {
    ...data,
    pullRequests: {
      count: pullRequests.length,
      items: pullRequests,
      hasLinkedPRs: pullRequests.length > 0,
    },
  };
}

/**
 * Generate PR summary
 */
function generatePRSummary(pullRequests) {
  if (!pullRequests?.items?.length) {
    return 'No linked pull requests found.';
  }

  const withDetails = pullRequests.items.filter(pr => pr.details);

  if (withDetails.length === 0) {
    return `${pullRequests.count} pull request(s) referenced.`;
  }

  const byType = {};
  withDetails.forEach(pr => {
    const type = pr.details.type || 'other';
    byType[type] = (byType[type] || 0) + 1;
  });

  const parts = [];
  if (byType.feature) parts.push(`${byType.feature} feature(s)`);
  if (byType.fix) parts.push(`${byType.fix} fix(es)`);
  if (byType.breaking) parts.push(`${byType.breaking} breaking change(s)`);
  if (byType.docs) parts.push(`${byType.docs} doc update(s)`);

  return parts.length > 0 ? parts.join(', ') : `${pullRequests.count} pull request(s)`;
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  return {
    fetchGitHub: args.includes('--fetch-gh') || args.includes('--fetch-github'),
    inputFile: args.find(a => !a.startsWith('--') && fs.existsSync(a)),
  };
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  let input = '';

  // Read from stdin or file
  if (!process.stdin.isTTY) {
    input = fs.readFileSync(0, 'utf-8');
  } else if (options.inputFile) {
    input = fs.readFileSync(options.inputFile, 'utf-8');
  } else {
    console.error('Usage: node extract-pr-metadata.cjs < commits.json [--fetch-gh]');
    console.error('       node extract-pr-metadata.cjs commits.json --fetch-gh');
    console.error('');
    console.error('Options:');
    console.error('  --fetch-gh   Fetch PR details from GitHub using gh CLI');
    process.exit(1);
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
  const result = extractPRMetadata(data, { fetchGitHub: options.fetchGitHub });
  result.pullRequests.summary = generatePRSummary(result.pullRequests);

  console.log(JSON.stringify(result, null, 2));
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  extractPRNumbers,
  fetchPRDetails,
  extractPRMetadata,
  generatePRSummary,
};
