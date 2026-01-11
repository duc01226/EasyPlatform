#!/usr/bin/env node
/**
 * Update CHANGELOG.md with new release notes
 * Usage: node update-changelog.cjs <release-notes-file> [--changelog path] [--version vX.Y.Z]
 *
 * Prepends release notes to CHANGELOG.md following Keep a Changelog format
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_CHANGELOG = 'CHANGELOG.md';

/**
 * Extract sections from release notes markdown
 */
function extractSections(releaseNotesContent) {
  const sections = {
    summary: '',
    features: [],
    improvements: [],
    fixes: [],
    docs: [],
    breaking: [],
    other: [],
  };

  const lines = releaseNotesContent.split('\n');
  let currentSection = null;

  for (const line of lines) {
    // Detect section headers
    if (line.startsWith('## Summary')) {
      currentSection = 'summary';
      continue;
    } else if (line.startsWith("## What's New")) {
      currentSection = 'features';
      continue;
    } else if (line.startsWith('## Improvements')) {
      currentSection = 'improvements';
      continue;
    } else if (line.startsWith('## Bug Fixes')) {
      currentSection = 'fixes';
      continue;
    } else if (line.startsWith('## Documentation')) {
      currentSection = 'docs';
      continue;
    } else if (line.startsWith('## Breaking Changes')) {
      currentSection = 'breaking';
      continue;
    } else if (line.startsWith('## Technical Details') || line.startsWith('## Contributors')) {
      currentSection = null; // Skip these sections
      continue;
    } else if (line.startsWith('## ')) {
      currentSection = 'other';
      continue;
    }

    // Extract content
    if (currentSection === 'summary' && line.trim() && !line.startsWith('#')) {
      sections.summary += line + '\n';
    } else if (currentSection && line.startsWith('- ')) {
      sections[currentSection].push(line);
    }
  }

  return sections;
}

/**
 * Format changelog entry in Keep a Changelog format
 */
function formatChangelogEntry(version, date, sections) {
  let entry = `## [${version}] - ${date}\n\n`;

  if (sections.summary.trim()) {
    entry += `${sections.summary.trim()}\n\n`;
  }

  if (sections.features.length > 0) {
    entry += '### Added\n\n';
    entry += sections.features.join('\n') + '\n\n';
  }

  if (sections.improvements.length > 0) {
    entry += '### Changed\n\n';
    entry += sections.improvements.join('\n') + '\n\n';
  }

  if (sections.fixes.length > 0) {
    entry += '### Fixed\n\n';
    entry += sections.fixes.join('\n') + '\n\n';
  }

  if (sections.docs.length > 0) {
    entry += '### Documentation\n\n';
    entry += sections.docs.join('\n') + '\n\n';
  }

  if (sections.breaking.length > 0) {
    entry += '### Breaking Changes\n\n';
    entry += sections.breaking.join('\n') + '\n\n';
  }

  return entry;
}

/**
 * Create initial CHANGELOG.md if it doesn't exist
 */
function createInitialChangelog() {
  return `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

`;
}

/**
 * Update CHANGELOG.md with new entry
 */
function updateChangelog(changelogPath, newEntry) {
  let content;

  if (fs.existsSync(changelogPath)) {
    content = fs.readFileSync(changelogPath, 'utf-8');
  } else {
    content = createInitialChangelog();
  }

  // Find insertion point (after header, before first version entry)
  const versionPattern = /^## \[/m;
  const match = content.match(versionPattern);

  if (match) {
    const insertPoint = match.index;
    content = content.slice(0, insertPoint) + newEntry + content.slice(insertPoint);
  } else {
    // No existing versions, append to end
    content += newEntry;
  }

  fs.writeFileSync(changelogPath, content);
  return changelogPath;
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const options = {
    releaseNotesFile: null,
    changelog: DEFAULT_CHANGELOG,
    version: null,
    date: new Date().toISOString().split('T')[0],
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--changelog' && args[i + 1]) {
      options.changelog = args[++i];
    } else if (args[i] === '--version' && args[i + 1]) {
      options.version = args[++i];
    } else if (args[i] === '--date' && args[i + 1]) {
      options.date = args[++i];
    } else if (!args[i].startsWith('--') && fs.existsSync(args[i])) {
      options.releaseNotesFile = args[i];
    }
  }

  return options;
}

/**
 * Extract version from release notes content
 */
function extractVersion(content) {
  const match = content.match(/\*\*Version:\*\*\s*(.+)/);
  return match ? match[1].trim() : null;
}

/**
 * Extract date from release notes content
 */
function extractDate(content) {
  const match = content.match(/\*\*Date:\*\*\s*(.+)/);
  return match ? match[1].trim() : new Date().toISOString().split('T')[0];
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (!options.releaseNotesFile) {
    console.error('Usage: node update-changelog.cjs <release-notes-file> [--changelog path] [--version vX.Y.Z]');
    console.error('');
    console.error('Options:');
    console.error('  --changelog  Path to CHANGELOG.md (default: CHANGELOG.md)');
    console.error('  --version    Version to use (extracted from release notes if not provided)');
    console.error('  --date       Release date (extracted from release notes if not provided)');
    process.exit(1);
  }

  // Read release notes
  const releaseNotesContent = fs.readFileSync(options.releaseNotesFile, 'utf-8');

  // Extract version if not provided
  const version = options.version || extractVersion(releaseNotesContent) || 'Unreleased';
  const date = options.date || extractDate(releaseNotesContent);

  // Extract sections from release notes
  const sections = extractSections(releaseNotesContent);

  // Format changelog entry
  const entry = formatChangelogEntry(version, date, sections);

  // Update changelog
  const updatedPath = updateChangelog(options.changelog, entry);

  console.error(`CHANGELOG.md updated with ${version}`);
  console.error(`Path: ${updatedPath}`);

  // Output the entry for verification
  console.log(entry);
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  extractSections,
  formatChangelogEntry,
  updateChangelog,
  createInitialChangelog,
};
