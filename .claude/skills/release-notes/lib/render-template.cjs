#!/usr/bin/env node
/**
 * Render release notes markdown from categorized commits
 * Usage: node render-template.cjs < categorized.json --version v1.0.0 [--output path]
 *
 * Generates markdown release notes from categorized commit data
 */

const fs = require('fs');
const path = require('path');
const { validateOutputPath, escapeMarkdown } = require('./utils.cjs');

/**
 * Format a list of commits as markdown bullet points
 */
function formatCommitList(commits) {
  if (!commits || commits.length === 0) {
    return '';
  }

  return commits
    .map(c => `- **${escapeMarkdown(c.description)}**${c.scopeLabel || ''}`)
    .join('\n');
}

/**
 * Format breaking changes with migration info
 */
function formatBreakingChanges(commits) {
  if (!commits || commits.length === 0) {
    return '';
  }

  return commits
    .map(c => {
      let entry = `### ${escapeMarkdown(c.description)}${c.scopeLabel || ''}\n\n`;

      // Try to extract migration steps from commit body
      const body = c.original?.body || '';
      if (body.includes('BREAKING CHANGE:')) {
        const migrationInfo = body.split('BREAKING CHANGE:')[1]?.trim();
        if (migrationInfo) {
          entry += `${migrationInfo}\n`;
        }
      }

      return entry;
    })
    .join('\n');
}

/**
 * Format technical details section
 */
function formatTechnicalDetails(data) {
  const { categories, contributors, dateRange } = data;

  let content = '';

  // All commits table
  const allCommits = [
    ...categories.features,
    ...categories.fixes,
    ...categories.improvements,
    ...categories.docs,
    ...categories.internal,
    ...categories.other,
  ];

  if (allCommits.length > 0) {
    content += '### Commits Included\n\n';
    content += '| Hash | Type | Description |\n';
    content += '|------|------|-------------|\n';

    allCommits.slice(0, 50).forEach(c => {
      const type = c.original?.type || 'other';
      content += `| ${c.hash} | ${type} | ${c.description.substring(0, 60)}${c.description.length > 60 ? '...' : ''} |\n`;
    });

    if (allCommits.length > 50) {
      content += `\n*...and ${allCommits.length - 50} more commits*\n`;
    }
  }

  return content;
}

/**
 * Format contributors section
 */
function formatContributors(contributors) {
  if (!contributors || contributors.length === 0) {
    return '- Team EasyPlatform';
  }

  return contributors
    .map(name => `- @${name.replace(/\s+/g, '')}`)
    .join('\n');
}

/**
 * Render the full release notes markdown
 */
function renderReleaseNotes(data, options = {}) {
  const {
    version = 'Unreleased',
    date = new Date().toISOString().split('T')[0],
    status = 'Draft',
  } = options;

  const { summary, categories, contributors, dateRange } = data;

  let markdown = '';

  // Header
  markdown += `# Release Notes: ${version}\n\n`;
  markdown += `**Date:** ${date}\n`;
  markdown += `**Version:** ${version}\n`;
  markdown += `**Status:** ${status}\n\n`;
  markdown += '---\n\n';

  // Summary
  markdown += `## Summary\n\n${summary.text}\n\n`;

  // What's New (Features)
  if (categories.features.length > 0) {
    markdown += `## What's New\n\n`;
    markdown += formatCommitList(categories.features);
    markdown += '\n\n';
  }

  // Improvements
  if (categories.improvements.length > 0) {
    markdown += `## Improvements\n\n`;
    markdown += formatCommitList(categories.improvements);
    markdown += '\n\n';
  }

  // Bug Fixes
  if (categories.fixes.length > 0) {
    markdown += `## Bug Fixes\n\n`;
    markdown += formatCommitList(categories.fixes);
    markdown += '\n\n';
  }

  // Documentation
  if (categories.docs.length > 0) {
    markdown += `## Documentation\n\n`;
    markdown += formatCommitList(categories.docs);
    markdown += '\n\n';
  }

  // Breaking Changes
  if (categories.breaking.length > 0) {
    markdown += `## Breaking Changes\n\n`;
    markdown += '> **Warning**: The following changes may require migration\n\n';
    markdown += formatBreakingChanges(categories.breaking);
    markdown += '\n';
  }

  // Technical Details (collapsible)
  markdown += '---\n\n';
  markdown += '## Technical Details\n\n';
  markdown += '<details>\n<summary>For Developers</summary>\n\n';
  markdown += formatTechnicalDetails(data);
  markdown += '\n</details>\n\n';

  // Contributors
  markdown += `## Contributors\n\n`;
  markdown += formatContributors(contributors);
  markdown += '\n\n';

  // Footer
  markdown += '---\n\n';
  markdown += '*Generated with [Claude Code](https://claude.com/claude-code)*\n';

  return markdown;
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const options = {
    version: 'Unreleased',
    output: null,
    date: new Date().toISOString().split('T')[0],
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--version' && args[i + 1]) {
      options.version = args[++i];
    } else if (args[i] === '--output' && args[i + 1]) {
      options.output = args[++i];
    } else if (args[i] === '--date' && args[i + 1]) {
      options.date = args[++i];
    }
  }

  return options;
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
  } else {
    // Look for input file in args
    const inputFile = args.find(a => !a.startsWith('--') && fs.existsSync(a));
    if (inputFile) {
      input = fs.readFileSync(inputFile, 'utf-8');
    } else {
      console.error('Usage: node render-template.cjs < categorized.json --version v1.0.0');
      console.error('       node render-template.cjs categorized.json --version v1.0.0 --output release.md');
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

  if (!data.summary || !data.categories) {
    console.error('Error: Missing required "summary" or "categories" in input');
    process.exit(1);
  }

  const markdown = renderReleaseNotes(data, options);

  if (options.output) {
    // Validate output path (prevent path traversal)
    const safePath = validateOutputPath(options.output);
    // Ensure directory exists
    const dir = path.dirname(safePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(safePath, markdown);
    console.error(`Release notes written to: ${safePath}`);
  } else {
    console.log(markdown);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { renderReleaseNotes, formatCommitList, formatBreakingChanges };
