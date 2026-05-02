#!/usr/bin/env node
/**
 * Validate release notes quality with scoring
 * Usage: node validate-notes.cjs <release-notes.md> [--threshold 70] [--json]
 *
 * Validates release notes against quality rules and returns a score
 */

const fs = require('fs');
const path = require('path');
const { validateInputNotEmpty, boundsCheck } = require('./utils.cjs');

const DEFAULT_THRESHOLD = 70;

/**
 * Validation rules with weights (total should equal 100)
 */
const RULES = {
  summary_exists: {
    weight: 15,
    name: 'Summary Section',
    check: (content) => content.includes('## Summary'),
    suggestion: 'Add a "## Summary" section describing the release',
  },
  summary_not_empty: {
    weight: 10,
    name: 'Summary Content',
    check: (content) => {
      const match = content.match(/## Summary\s*\n+([\s\S]*?)(?=\n##|$)/);
      return match && match[1].trim().length > 20;
    },
    suggestion: 'Summary should have meaningful content (at least 20 characters)',
  },
  has_version: {
    weight: 10,
    name: 'Version Present',
    check: (content) => /\*\*Version:\*\*\s*v?\d+\.\d+\.\d+/.test(content),
    suggestion: 'Add version number in format "**Version:** vX.Y.Z"',
  },
  has_date: {
    weight: 5,
    name: 'Date Present',
    check: (content) => /\*\*Date:\*\*\s*\d{4}-\d{2}-\d{2}/.test(content),
    suggestion: 'Add date in format "**Date:** YYYY-MM-DD"',
  },
  features_documented: {
    weight: 10,
    name: 'Features Documented',
    check: (content) => {
      // If no features section, that's okay (might not have features)
      if (!content.includes("## What's New")) return true;
      // If there is a features section, it should have bullet points
      const match = content.match(/## What's New\s*\n+([\s\S]*?)(?=\n##|$)/);
      return match && match[1].includes('- **');
    },
    suggestion: 'Feature items should be formatted as "- **Feature description**"',
  },
  fixes_documented: {
    weight: 10,
    name: 'Bug Fixes Documented',
    check: (content) => {
      if (!content.includes('## Bug Fixes')) return true;
      const match = content.match(/## Bug Fixes\s*\n+([\s\S]*?)(?=\n##|$)/);
      return match && match[1].includes('- **');
    },
    suggestion: 'Bug fix items should be formatted as "- **Fix description**"',
  },
  no_broken_links: {
    weight: 10,
    name: 'No Broken Links',
    check: (content) => !content.match(/\[.*?\]\(\s*\)/),
    suggestion: 'Remove empty link references [text]()',
  },
  no_todo_markers: {
    weight: 5,
    name: 'No TODO Markers',
    check: (content) => !/\bTODO\b|\bFIXME\b|\bXXX\b/i.test(content),
    suggestion: 'Remove TODO/FIXME markers before publishing',
  },
  contributors_listed: {
    weight: 10,
    name: 'Contributors Listed',
    check: (content) => content.includes('## Contributors'),
    suggestion: 'Add a "## Contributors" section listing contributors',
  },
  proper_heading_hierarchy: {
    weight: 5,
    name: 'Heading Hierarchy',
    check: (content) => {
      // Should start with H1, then H2s, no H4+ in main content
      const hasH1 = content.match(/^# /m);
      const hasH4Plus = content.match(/^#{4,} /m);
      return hasH1 && !hasH4Plus;
    },
    suggestion: 'Use proper heading hierarchy (H1 for title, H2 for sections)',
  },
  no_placeholder_text: {
    weight: 5,
    name: 'No Placeholder Text',
    check: (content) => !/\[.*?placeholder.*?\]|\{.*?placeholder.*?\}/i.test(content),
    suggestion: 'Replace placeholder text with actual content',
  },
  technical_details_collapsed: {
    weight: 5,
    name: 'Technical Details Collapsed',
    check: (content) => {
      if (!content.includes('## Technical Details')) return true;
      return content.includes('<details>') && content.includes('</details>');
    },
    suggestion: 'Wrap technical details in <details> tags for better readability',
  },
};

/**
 * Validate release notes content
 */
function validateNotes(content, customRules = null) {
  const rules = customRules || RULES;
  const results = [];
  let totalWeight = 0;
  let passedWeight = 0;

  for (const [ruleId, rule] of Object.entries(rules)) {
    const passed = rule.check(content);
    totalWeight += rule.weight;

    if (passed) {
      passedWeight += rule.weight;
    }

    results.push({
      id: ruleId,
      name: rule.name,
      weight: rule.weight,
      passed,
      suggestion: passed ? null : rule.suggestion,
    });
  }

  const score = Math.round((passedWeight / totalWeight) * 100);

  return {
    score,
    passedWeight,
    totalWeight,
    results,
  };
}

/**
 * Format validation results for console output
 */
function formatResults(validation, threshold) {
  const { score, results } = validation;
  const passed = score >= threshold;

  let output = '';
  output += `\n${'='.repeat(50)}\n`;
  output += `RELEASE NOTES VALIDATION\n`;
  output += `${'='.repeat(50)}\n\n`;

  output += `Score: ${score}/100 (threshold: ${threshold})\n`;
  output += `Status: ${passed ? 'PASSED' : 'FAILED'}\n\n`;

  output += `${'─'.repeat(50)}\n`;
  output += `RULE RESULTS\n`;
  output += `${'─'.repeat(50)}\n\n`;

  const failedRules = results.filter((r) => !r.passed);
  const passedRules = results.filter((r) => r.passed);

  if (failedRules.length > 0) {
    output += `FAILED (${failedRules.length}):\n`;
    for (const rule of failedRules) {
      output += `  ✗ ${rule.name} (-${rule.weight} points)\n`;
      if (rule.suggestion) {
        output += `    → ${rule.suggestion}\n`;
      }
    }
    output += '\n';
  }

  output += `PASSED (${passedRules.length}):\n`;
  for (const rule of passedRules) {
    output += `  ✓ ${rule.name} (+${rule.weight} points)\n`;
  }

  output += `\n${'='.repeat(50)}\n`;

  return output;
}

/**
 * Load custom rules from config file
 */
function loadCustomRules(configPath) {
  try {
    if (fs.existsSync(configPath)) {
      const yaml = require('js-yaml');
      const config = yaml.load(fs.readFileSync(configPath, 'utf-8'));

      if (config.validation && config.validation.rules) {
        // Merge custom weights with default rules
        const customRules = { ...RULES };
        for (const [ruleId, ruleConfig] of Object.entries(config.validation.rules)) {
          if (customRules[ruleId] && ruleConfig.weight !== undefined) {
            customRules[ruleId] = { ...customRules[ruleId], weight: ruleConfig.weight };
          }
        }
        return customRules;
      }
    }
  } catch (error) {
    console.error(`Warning: Could not load config: ${error.message}`);
  }
  return null;
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const options = {
    inputFile: null,
    threshold: DEFAULT_THRESHOLD,
    json: false,
    configPath: null,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--threshold' && args[i + 1]) {
      const rawThreshold = parseInt(args[++i], 10);
      options.threshold = boundsCheck(rawThreshold, 0, 100, DEFAULT_THRESHOLD);
      if (isNaN(rawThreshold)) {
        console.error(`Warning: Invalid threshold value, using default ${DEFAULT_THRESHOLD}`);
      }
    } else if (args[i] === '--json') {
      options.json = true;
    } else if (args[i] === '--config' && args[i + 1]) {
      options.configPath = args[++i];
    } else if (!args[i].startsWith('--')) {
      options.inputFile = args[i];
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

  let content = '';

  // Read from file or stdin
  if (options.inputFile && fs.existsSync(options.inputFile)) {
    content = fs.readFileSync(options.inputFile, 'utf-8');
  } else if (!process.stdin.isTTY) {
    content = fs.readFileSync(0, 'utf-8');
  } else {
    console.error('Usage: node validate-notes.cjs <release-notes.md> [--threshold 70] [--json]');
    console.error('       cat release-notes.md | node validate-notes.cjs --threshold 70');
    process.exit(1);
  }

  // Validate input not empty
  validateInputNotEmpty(content, 'validate-notes');

  // Load custom rules if config provided
  const customRules = options.configPath ? loadCustomRules(options.configPath) : null;

  // Validate
  const validation = validateNotes(content, customRules);
  const passed = validation.score >= options.threshold;

  // Output results
  if (options.json) {
    const output = {
      ...validation,
      threshold: options.threshold,
      passed,
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log(formatResults(validation, options.threshold));
  }

  // Exit with error code if validation failed
  if (!passed) {
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  validateNotes,
  formatResults,
  RULES,
};
