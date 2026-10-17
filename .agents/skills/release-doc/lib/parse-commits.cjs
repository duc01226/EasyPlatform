#!/usr/bin/env node
/**
 * Parse git commits between two refs into structured JSON
 * Usage: node parse-commits.cjs <base> <head> [--json]
 *
 * Parses conventional commit format: type(scope): description
 */

const { execSync } = require('child_process');

// Conventional commit regex
const COMMIT_PATTERN = /^(?<type>\w+)(?:\((?<scope>[^)]+)\))?(?<breaking>!)?\s*:\s*(?<description>.+)$/;

/**
 * Parse a single commit message into structured data
 */
function parseCommitMessage(subject) {
  const match = subject.match(COMMIT_PATTERN);

  if (!match) {
    return {
      type: 'other',
      scope: null,
      breaking: false,
      description: subject,
      conventional: false,
    };
  }

  return {
    type: match.groups.type,
    scope: match.groups.scope || null,
    breaking: !!match.groups.breaking,
    description: match.groups.description,
    conventional: true,
  };
}

/**
 * Sanitize git ref to prevent command injection
 * Allows: alphanumeric, dots, dashes, underscores, tildes, carets, slashes
 */
function sanitizeGitRef(ref) {
  return ref.replace(/[^a-zA-Z0-9._\-~^\/]/g, '');
}

/**
 * Get commits between two refs using git log
 */
function getCommits(base, head) {
  // Use unique delimiter to separate commits (unlikely to appear in content)
  const COMMIT_DELIMITER = '<<<COMMIT_END>>>';
  const FIELD_DELIMITER = '<<<FIELD>>>';

  const format = [
    '%H',  // Full hash
    '%h',  // Short hash
    '%an', // Author name
    '%ae', // Author email
    '%ad', // Author date
    '%s',  // Subject
    '%b',  // Body
  ].join(FIELD_DELIMITER);

  // Sanitize refs to prevent command injection
  const safeBase = sanitizeGitRef(base);
  const safeHead = sanitizeGitRef(head);

  const cmd = `git log "${safeBase}..${safeHead}" --pretty=format:"${format}${COMMIT_DELIMITER}" --date=short`;

  try {
    const output = execSync(cmd, {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024,
      timeout: 60000  // 60 second timeout for large repos
    });

    if (!output.trim()) {
      return [];
    }

    const rawCommits = output.split(COMMIT_DELIMITER).filter(c => c.trim());

    return rawCommits.map(raw => {
      const parts = raw.split(FIELD_DELIMITER);
      // Handle leading newline from previous commit separator
      const hash = (parts[0] || '').replace(/^[\r\n]+/, '').trim();
      const shortHash = (parts[1] || '').trim();
      const author = (parts[2] || '').trim();
      const email = (parts[3] || '').trim();
      const date = (parts[4] || '').trim();
      const subject = (parts[5] || '').trim();
      const body = (parts[6] || '').trim();

      const parsed = parseCommitMessage(subject);

      // Check for BREAKING CHANGE in body
      const hasBreakingInBody = body && /BREAKING[ -]CHANGE:/i.test(body);

      return {
        hash,
        shortHash,
        author,
        email,
        date,
        subject,
        body,
        ...parsed,
        breaking: parsed.breaking || hasBreakingInBody,
      };
    });
  } catch (error) {
    console.error('Error executing git log:', error.message);
    return [];
  }
}

/**
 * Get file changes for each commit
 */
function getCommitFiles(hash) {
  try {
    const cmd = `git diff-tree --no-commit-id --name-status -r ${hash}`;
    const output = execSync(cmd, { encoding: 'utf-8' });

    return output
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [status, ...pathParts] = line.split('\t');
        return {
          status: status.trim(),
          path: pathParts.join('\t').trim(),
        };
      });
  } catch {
    return [];
  }
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node parse-commits.cjs <base> <head> [--with-files]');
    process.exit(1);
  }

  const [base, head] = args;
  const withFiles = args.includes('--with-files');

  const commits = getCommits(base, head);

  // Optionally add file changes
  if (withFiles) {
    commits.forEach(commit => {
      commit.files = getCommitFiles(commit.hash);
    });
  }

  // Calculate stats
  const stats = {
    total: commits.length,
    conventional: commits.filter(c => c.conventional).length,
    breaking: commits.filter(c => c.breaking).length,
    byType: {},
    authors: [...new Set(commits.map(c => c.author))],
    dateRange: {
      from: commits.length ? commits[commits.length - 1].date : null,
      to: commits.length ? commits[0].date : null,
    },
  };

  // Count by type
  commits.forEach(c => {
    stats.byType[c.type] = (stats.byType[c.type] || 0) + 1;
  });

  const result = {
    base,
    head,
    commits,
    stats,
  };

  console.log(JSON.stringify(result, null, 2));
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { parseCommitMessage, getCommits, getCommitFiles };
