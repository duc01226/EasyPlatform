#!/usr/bin/env node
/**
 * Project Config Init - SessionStart Hook
 *
 * On session start, checks if docs/project-config.json exists.
 * If missing, creates a skeleton template with the expected structure
 * and instructs the AI to scan the project and populate the content.
 *
 * Idempotent — does nothing if the file already exists.
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { validateConfig, formatResult } = require('./lib/project-config-schema.cjs');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const CONFIG_PATH = path.join(PROJECT_DIR, 'docs', 'project-config.json');
const DOCS_DIR = path.join(PROJECT_DIR, 'docs');

/**
 * Skeleton template for project-config.json.
 * Contains all sections that hooks consume, with placeholder values.
 */
const SKELETON = {
  _description: 'Project-specific configuration consumed by .claude hooks at runtime. Update when adding services/apps.',
  backendServices: {
    patterns: [
      { name: 'Microservices', pathRegex: 'src[\\\\/]Services[\\\\/]', description: 'Backend microservices' }
    ],
    serviceMap: {
      ExampleService: 'Services[\\\\/]Example'
    },
    serviceRepositories: {
      ExampleService: 'IExampleRootRepository<T>'
    },
    serviceDomains: {
      ExampleService: 'Example domain description'
    }
  },
  frontendApps: {
    patterns: [
      { name: 'Frontend App', pathRegex: 'src[\\\\/]App[\\\\/]', description: 'Main frontend application' }
    ],
    appMap: {
      mainApp: 'src[\\\\/]App'
    },
    legacyApps: [],
    modernApps: ['mainApp'],
    frontendRegex: 'src[\\\\/]App[\\\\/]',
    sharedLibRegex: 'libs[\\\\/]shared[\\\\/]'
  },
  designSystem: {
    docsPath: 'docs/design-system',
    appMappings: []
  },
  scss: {
    appMap: {},
    patterns: []
  },
  componentFinder: {
    selectorPrefixes: ['app-'],
    layerClassification: {
      platform: [],
      common: [],
      domain: []
    }
  },
  sharedNamespace: '',
  framework: {
    name: '',
    backendPatternsDoc: 'docs/backend-patterns-reference.md',
    frontendPatternsDoc: 'docs/frontend-patterns-reference.md',
    codeReviewDoc: 'docs/code-review-rules.md',
    integrationTestDoc: 'docs/integration-test-reference.md',
    searchPatternKeywords: []
  }
};

function main() {
  try {
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    // If config already exists, validate its schema and warn if invalid
    if (fs.existsSync(CONFIG_PATH)) {
      try {
        const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
        const result = validateConfig(config);
        if (!result.valid) {
          const output = [
            '',
            '## ⚠️ Project Config Schema Validation Failed',
            '',
            '`docs/project-config.json` has schema errors that may break hooks:',
            ''
          ];
          for (const err of result.errors) {
            output.push(`- **ERROR:** ${err}`);
          }
          output.push('', 'Run `/project-config` to fix the config structure.', '');
          console.log(output.join('\n'));
        }
      } catch {
        // Unparseable JSON — warn but don't block
        console.log('\n## ⚠️ `docs/project-config.json` contains invalid JSON. Run `/project-config` to fix.\n');
      }
      process.exit(0);
    }

    // Ensure docs/ directory exists
    if (!fs.existsSync(DOCS_DIR)) {
      fs.mkdirSync(DOCS_DIR, { recursive: true });
    }

    // Write skeleton
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(SKELETON, null, 2) + '\n', 'utf-8');

    // Instruct AI to scan and populate
    const output = [
      '',
      '## Project Config Initialized',
      '',
      '`docs/project-config.json` was missing and has been created with a skeleton template.',
      '',
      '### File Structure',
      '',
      '```',
      'docs/project-config.json',
      '├── backendServices',
      '│   ├── patterns[]        — path regexes to detect backend code',
      '│   ├── serviceMap{}      — service name → path regex',
      '│   ├── serviceRepositories{} — service → repository interface name',
      '│   └── serviceDomains{}  — service → domain description',
      '├── frontendApps',
      '│   ├── patterns[]        — path regexes to detect frontend code',
      '│   ├── appMap{}          — app name → path regex',
      '│   ├── legacyApps[]      — apps using legacy framework',
      '│   ├── modernApps[]      — apps using modern framework',
      '│   ├── frontendRegex     — combined regex matching any frontend file',
      '│   └── sharedLibRegex    — regex matching shared libraries',
      '├── designSystem',
      '│   ├── docsPath          — path to design system docs directory',
      '│   └── appMappings[]     — app → design system doc file mappings',
      '├── scss',
      '│   ├── appMap{}          — app → SCSS path regex',
      '│   └── patterns[]        — SCSS context patterns',
      '├── componentFinder',
      '│   ├── selectorPrefixes[] — component selector prefixes (e.g., "app-")',
      '│   └── layerClassification{} — layer → directory paths',
      '├── sharedNamespace       — shared code namespace',
      '└── framework',
      '    ├── name              — framework name (e.g., "Next.js", "Spring Boot")',
      '    ├── backendPatternsDoc — path to backend patterns reference doc',
      '    ├── frontendPatternsDoc — path to frontend patterns reference doc',
      '    ├── codeReviewDoc     — path to code review rules doc',
      '    ├── integrationTestDoc — path to integration test reference doc',
      '    └── searchPatternKeywords[] — framework keywords triggering search-before-code',
      '```',
      '',
      '### ⚠️ ACTION REQUIRED',
      '',
      'You **MUST** scan the project to populate `docs/project-config.json` with real values.',
      '',
      '**Steps:**',
      '1. **Backend services** — Scan `src/` for service directories, find repository interfaces (`I*RootRepository`), identify service domains',
      '2. **Frontend apps** — Scan for frontend app directories, detect framework versions (Angular/React/Vue), identify modern vs legacy apps',
      '3. **Design system** — Check for `docs/design-system/` or similar, map apps to their design system docs',
      '4. **SCSS patterns** — Detect SCSS/CSS architecture (shared mixins, variables files, import patterns)',
      '5. **Component prefixes** — Grep for component selectors to find common prefixes',
      '6. **Shared namespace** — Find the shared/common project namespace',
      '',
      'Use the `/project-config` skill to automatically scan the workspace and populate the config:',
      '',
      '```',
      '/project-config',
      '```',
      '',
      'Or manually use `Glob` and `Grep` tools to discover the project structure, then update `docs/project-config.json` with accurate values.',
      'Path regexes use `[\\\\/]` for cross-platform path separator matching.',
      ''
    ];

    console.log(output.join('\n'));
  } catch {
    // Non-blocking — silent fail
  }
  process.exit(0);
}

main();
