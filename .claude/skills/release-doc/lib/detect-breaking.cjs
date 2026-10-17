#!/usr/bin/env node
/**
 * Detect breaking changes from commits
 * Usage: node detect-breaking.cjs < categorized.json
 *
 * Enhances breaking change detection with migration info extraction
 */

const fs = require('fs');

// Breaking change patterns in commit body/footer
const BREAKING_PATTERNS = [
  /BREAKING[ -]CHANGE:\s*(.+?)(?=\n\n|\n[A-Z]|$)/is,
  /BREAKING:\s*(.+?)(?=\n\n|\n[A-Z]|$)/is,
];

// Migration keywords to extract
const MIGRATION_KEYWORDS = [
  'migration guide',
  'migration:',
  'migrate:',
  'migration steps',
  'to migrate',
  'upgrade guide',
  'upgrade:',
];

/**
 * Extract breaking change details from commit body
 */
function extractBreakingDetails(body) {
  if (!body) return null;

  for (const pattern of BREAKING_PATTERNS) {
    const match = body.match(pattern);
    if (match) {
      return {
        description: match[1].trim(),
        raw: match[0],
      };
    }
  }

  return null;
}

/**
 * Extract migration info from commit body
 */
function extractMigrationInfo(body) {
  if (!body) return null;

  const lines = body.split('\n');
  const migrationLines = [];
  let capturing = false;

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    // Start capturing on migration keyword
    if (MIGRATION_KEYWORDS.some(k => lowerLine.includes(k))) {
      capturing = true;
      migrationLines.push(line);
      continue;
    }

    // Continue capturing indented/list lines
    if (capturing) {
      if (line.match(/^[\s\-\*\d\.]/)) {
        migrationLines.push(line);
      } else if (line.trim() === '') {
        migrationLines.push('');
      } else {
        // Stop capturing on non-indented, non-empty line
        break;
      }
    }
  }

  return migrationLines.length > 0 ? migrationLines.join('\n').trim() : null;
}

/**
 * Analyze impact severity of breaking change
 */
function analyzeBreakingImpact(commit, services) {
  // Check if affects critical services
  const affectedServices = services?.affected || [];
  const hasCriticalImpact = affectedServices.some(s => s.impact === 'critical');
  const hasHighImpact = affectedServices.some(s => s.impact === 'high');

  // Check scope for impact hints
  const criticalScopes = ['api', 'domain', 'auth', 'platform'];
  const isCriticalScope = criticalScopes.includes(commit.scope?.toLowerCase());

  // Determine severity
  if (hasCriticalImpact || isCriticalScope) {
    return 'critical';
  } else if (hasHighImpact) {
    return 'high';
  }

  return 'medium';
}

/**
 * Process breaking changes with enhanced details
 */
function processBreakingChanges(data) {
  const { categories, services } = data;
  const breakingCommits = categories?.breaking || [];

  const enhanced = breakingCommits.map(commit => {
    const body = commit.original?.body || '';

    // Extract details from body
    const breakingDetails = extractBreakingDetails(body);
    const migrationInfo = extractMigrationInfo(body);
    const severity = analyzeBreakingImpact(commit, services);

    return {
      ...commit,
      breaking: {
        severity,
        description: breakingDetails?.description || commit.description,
        migration: migrationInfo,
        requiresAction: severity === 'critical' || severity === 'high',
      },
    };
  });

  return {
    ...data,
    categories: {
      ...categories,
      breaking: enhanced,
    },
    breakingSummary: generateBreakingSummary(enhanced),
  };
}

/**
 * Generate breaking changes summary
 */
function generateBreakingSummary(breakingCommits) {
  if (breakingCommits.length === 0) {
    return {
      hasBreaking: false,
      count: 0,
      critical: 0,
      high: 0,
      medium: 0,
      requiresUserAction: false,
    };
  }

  const critical = breakingCommits.filter(c => c.breaking.severity === 'critical').length;
  const high = breakingCommits.filter(c => c.breaking.severity === 'high').length;
  const medium = breakingCommits.filter(c => c.breaking.severity === 'medium').length;

  return {
    hasBreaking: true,
    count: breakingCommits.length,
    critical,
    high,
    medium,
    requiresUserAction: critical > 0 || high > 0,
    items: breakingCommits.map(c => ({
      description: c.description,
      severity: c.breaking.severity,
      hasMigration: !!c.breaking.migration,
    })),
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
      console.error('Usage: node detect-breaking.cjs < categorized.json');
      console.error('       node detect-breaking.cjs categorized.json');
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

  if (!data.categories) {
    console.error('Error: Missing "categories" object in input');
    process.exit(1);
  }
  const result = processBreakingChanges(data);

  console.log(JSON.stringify(result, null, 2));
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  extractBreakingDetails,
  extractMigrationInfo,
  analyzeBreakingImpact,
  processBreakingChanges,
};
