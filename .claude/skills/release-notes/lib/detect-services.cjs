#!/usr/bin/env node
/**
 * Detect service boundaries from commit file changes
 * Usage: node detect-services.cjs < commits-with-files.json
 *
 * Analyzes file paths to determine affected services
 */

const fs = require('fs');
const path = require('path');

// Service patterns from config (hardcoded for performance)
const SERVICE_PATTERNS = {
  'backend-api': {
    patterns: [/src\/PlatformExampleApp\/.*\.Api\//],
    label: 'Backend API',
    impact: 'high',
  },
  'backend-domain': {
    patterns: [/src\/PlatformExampleApp\/.*\.Domain\//],
    label: 'Domain Model',
    impact: 'high',
  },
  'backend-application': {
    patterns: [/src\/PlatformExampleApp\/.*\.Application\//],
    label: 'Application Layer',
    impact: 'medium',
  },
  'backend-persistence': {
    patterns: [/src\/PlatformExampleApp\/.*\.Persistence.*\//],
    label: 'Persistence',
    impact: 'medium',
  },
  'platform-core': {
    patterns: [/src\/Platform\/Easy\.Platform.*\//],
    label: 'Platform Core',
    impact: 'critical',
  },
  'frontend-apps': {
    patterns: [/src\/PlatformExampleAppWeb\/apps\//],
    label: 'Frontend Apps',
    impact: 'high',
  },
  'frontend-libs': {
    patterns: [/src\/PlatformExampleAppWeb\/libs\//],
    label: 'Frontend Libraries',
    impact: 'medium',
  },
  'ai-tools': {
    patterns: [/\.claude\//, /\.github\/prompts\//],
    label: 'AI Tooling',
    impact: 'low',
  },
  config: {
    patterns: [/\.github\/workflows\//, /\.json$/, /\.ya?ml$/],
    label: 'Configuration',
    impact: 'low',
  },
  docs: {
    patterns: [/docs\//, /\.md$/],
    label: 'Documentation',
    impact: 'low',
  },
};

/**
 * Match a file path to services
 */
function matchServices(filePath) {
  const matched = [];

  for (const [serviceId, config] of Object.entries(SERVICE_PATTERNS)) {
    for (const pattern of config.patterns) {
      if (pattern.test(filePath)) {
        matched.push({
          id: serviceId,
          label: config.label,
          impact: config.impact,
        });
        break;
      }
    }
  }

  return matched;
}

/**
 * Analyze commits to determine service impacts
 */
function analyzeServiceImpact(commits) {
  const serviceMap = new Map();

  commits.forEach(commit => {
    if (!commit.files) return;

    commit.files.forEach(file => {
      const services = matchServices(file.path);

      services.forEach(service => {
        if (!serviceMap.has(service.id)) {
          serviceMap.set(service.id, {
            ...service,
            commits: [],
            fileCount: 0,
            changes: { added: 0, modified: 0, deleted: 0 },
          });
        }

        const entry = serviceMap.get(service.id);

        // Track commit if not already tracked
        if (!entry.commits.includes(commit.shortHash)) {
          entry.commits.push(commit.shortHash);
        }

        entry.fileCount++;

        // Track change types
        switch (file.status) {
          case 'A':
            entry.changes.added++;
            break;
          case 'M':
            entry.changes.modified++;
            break;
          case 'D':
            entry.changes.deleted++;
            break;
        }
      });
    });
  });

  // Convert to array and sort by impact
  const impactOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return Array.from(serviceMap.values()).sort(
    (a, b) => impactOrder[a.impact] - impactOrder[b.impact]
  );
}

/**
 * Generate service summary
 */
function generateServiceSummary(services) {
  const impactGroups = {
    critical: [],
    high: [],
    medium: [],
    low: [],
  };

  services.forEach(s => {
    impactGroups[s.impact].push(s.label);
  });

  const parts = [];

  if (impactGroups.critical.length > 0) {
    parts.push(`**Critical:** ${impactGroups.critical.join(', ')}`);
  }
  if (impactGroups.high.length > 0) {
    parts.push(`**High:** ${impactGroups.high.join(', ')}`);
  }
  if (impactGroups.medium.length > 0) {
    parts.push(`**Medium:** ${impactGroups.medium.join(', ')}`);
  }
  if (impactGroups.low.length > 0) {
    parts.push(`Low: ${impactGroups.low.join(', ')}`);
  }

  return parts.join(' | ') || 'No service boundaries detected';
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
      console.error('Usage: node detect-services.cjs < commits-with-files.json');
      console.error('       node detect-services.cjs commits-with-files.json');
      console.error('');
      console.error('Note: Run parse-commits.cjs with --with-files flag first');
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

  const services = analyzeServiceImpact(commits);
  const summary = generateServiceSummary(services);

  const result = {
    ...data,
    services: {
      affected: services,
      summary,
      hasBreakingServiceChange: services.some(s => s.impact === 'critical'),
    },
  };

  console.log(JSON.stringify(result, null, 2));
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { matchServices, analyzeServiceImpact, generateServiceSummary };
