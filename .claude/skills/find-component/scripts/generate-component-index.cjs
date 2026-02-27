#!/usr/bin/env node

/**
 * generate-component-index.cjs
 *
 * Scans Angular frontend for all components, extracts visual signals
 * (selector, BEM block, text markers, Material widgets, parent/child relationships),
 * and outputs docs/component-index.json.
 *
 * Usage:
 *   node .claude/skills/find-component/scripts/generate-component-index.cjs [--app-root <path>]
 *   node .claude/skills/find-component/scripts/generate-component-index.cjs --git-changes
 *
 * Modes:
 *   (default)       Full scan of all components
 *   --git-changes   Incremental update — only re-scan components with changed files from git
 *
 * Default app-root: src/Frontend
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// --- Configuration ---
const PROJECT_ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const args = process.argv.slice(2);
const appRootArg = args.indexOf('--app-root');
const APP_ROOT = appRootArg !== -1 && args[appRootArg + 1]
  ? path.resolve(PROJECT_ROOT, args[appRootArg + 1])
  : path.resolve(PROJECT_ROOT, 'src/Frontend');
const OUTPUT_FILE = path.resolve(PROJECT_ROOT, 'docs/component-index.json');
const GIT_CHANGES_MODE = args.includes('--git-changes');

// --- Helpers ---

/**
 * Recursively find files matching a pattern.
 * @param {string} dir - Directory to search
 * @param {RegExp} pattern - Filename pattern
 * @returns {string[]} Matching file paths
 */
function findFiles(dir, pattern) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules and hidden directories
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      results.push(...findFiles(fullPath, pattern));
    } else if (pattern.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Extract Angular component metadata from a .component.ts file.
 * @param {string} tsPath - Path to .component.ts
 * @returns {object|null} Component info or null if not a component
 */
function extractComponentInfo(tsPath) {
  let content;
  try {
    content = fs.readFileSync(tsPath, 'utf-8');
  } catch (err) {
    console.warn(`  WARN: Could not read ${tsPath}: ${err.message}`);
    return null;
  }

  // Strip comments to avoid matching example/commented-out selectors
  const stripped = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  // Extract selector from actual code (not comments)
  const selectorMatch = stripped.match(/selector:\s*['"`]([^'"`]+)['"`]/);
  if (!selectorMatch) return null;

  const selector = selectorMatch[1];

  // Extract class name
  const classMatch = stripped.match(/export\s+class\s+(\w+)/);
  const className = classMatch ? classMatch[1] : 'Unknown';

  // Determine file paths for related files
  const dir = path.dirname(tsPath);
  const baseName = path.basename(tsPath, '.ts');
  const htmlPath = path.join(dir, baseName.replace(/\.component$/, '.component') + '.html');
  const scssPath = path.join(dir, baseName.replace(/\.component$/, '.component') + '.scss');
  const storePath = path.join(dir, baseName.replace(/\.component$/, '.store') + '.ts');

  const component = {
    className,
    selector,
    tsPath: path.relative(PROJECT_ROOT, tsPath).replace(/\\/g, '/'),
    htmlPath: fs.existsSync(htmlPath)
      ? path.relative(PROJECT_ROOT, htmlPath).replace(/\\/g, '/')
      : null,
    scssPath: fs.existsSync(scssPath)
      ? path.relative(PROJECT_ROOT, scssPath).replace(/\\/g, '/')
      : null,
    storePath: fs.existsSync(storePath)
      ? path.relative(PROJECT_ROOT, storePath).replace(/\\/g, '/')
      : null,
    bemBlock: null,
    textMarkers: [],
    materialWidgets: [],
    childSelectors: [],
    parentSelectors: [],
  };

  // Extract signals from HTML template
  if (component.htmlPath) {
    const htmlFullPath = path.resolve(PROJECT_ROOT, component.htmlPath);
    if (fs.existsSync(htmlFullPath)) {
      const html = fs.readFileSync(htmlFullPath, 'utf-8');
      extractHtmlSignals(html, component);
    }
  }

  // Check for inline template
  if (!component.htmlPath) {
    const templateMatch = content.match(/template:\s*`([\s\S]*?)`/);
    if (templateMatch) {
      extractHtmlSignals(templateMatch[1], component);
    }
  }

  return component;
}

/**
 * Extract visual signals from HTML content.
 * @param {string} html - HTML template content
 * @param {object} component - Component info to populate
 */
function extractHtmlSignals(html, component) {
  // Extract BEM root block class by frequency of __element usage (most BEM elements = root block)
  const classMatches = html.match(/class="([^"]+)"/g) || [];
  const blockCandidates = new Map(); // blockName → count of __element usages

  for (const match of classMatches) {
    const classes = match.replace(/class="/, '').replace(/"/, '').split(/\s+/);
    for (const cls of classes) {
      if (cls.includes('__')) {
        // Extract block prefix from BEM element class (e.g., "task-list" from "task-list__header")
        const block = cls.split('__')[0];
        if (block && !block.startsWith('mat-') && !block.startsWith('cdk-')
            && !block.startsWith('platform-mat') && block.length > 2) {
          blockCandidates.set(block, (blockCandidates.get(block) || 0) + 1);
        }
      }
    }
  }

  // Pick the block with most __element usages (= the component's own BEM block)
  if (blockCandidates.size > 0) {
    component.bemBlock = [...blockCandidates.entries()]
      .sort((a, b) => b[1] - a[1])[0][0];
  } else {
    // Fallback: first non-utility class
    for (const match of classMatches) {
      const classes = match.replace(/class="/, '').replace(/"/, '').split(/\s+/);
      for (const cls of classes) {
        if (!cls.startsWith('--') && !cls.includes('__') && !cls.startsWith('mat-')
            && !cls.startsWith('cdk-') && !cls.startsWith('platform-mat') && cls.length > 2) {
          component.bemBlock = cls;
          break;
        }
      }
      if (component.bemBlock) break;
    }
  }

  // Extract static text markers (headers, labels, button text)
  // Look for text in h1-h6, button, mat-label, th, and standalone text
  const textPatterns = [
    /<(?:h[1-6]|button|th)(?:[^>"']|"[^"]*"|'[^']*')*>([^<{]+)</gi,
    /<mat-label>([^<{]+)</gi,
    /placeholder="([^"]+)"/gi,
    /matTooltip="([^"]+)"/gi,
    />([A-Z][a-zA-Z\s]{2,30})<\//g, // Capitalized static text between tags
  ];

  const textMarkers = new Set();
  for (const pattern of textPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const text = match[1].trim();
      // Skip interpolations, pipes, and very short text
      if (text && !text.includes('{{') && !text.includes('|') && text.length > 2 && text.length < 50) {
        textMarkers.add(text);
      }
    }
  }
  component.textMarkers = [...textMarkers].slice(0, 15); // Limit to 15 markers

  // Extract Material widget usage
  const matWidgets = new Set();
  const matPattern = /<(mat-[\w-]+)/g;
  let matMatch;
  while ((matMatch = matPattern.exec(html)) !== null) {
    matWidgets.add(matMatch[1]);
  }
  // Also check for mat directives
  const matDirectives = html.match(/\b(matInput|matSuffix|matPrefix|matTooltip|matSort)\b/g) || [];
  for (const dir of matDirectives) {
    matWidgets.add(dir);
  }
  component.materialWidgets = [...matWidgets];

  // Extract child component selectors (non-Material, non-HTML custom elements)
  const childPattern = /<([\w]+-[\w-]+)/g;
  const childSelectors = new Set();
  let childMatch;
  while ((childMatch = childPattern.exec(html)) !== null) {
    const tag = childMatch[1];
    // Skip Material, CDK, Angular, and common HTML elements
    if (!tag.startsWith('mat-') && !tag.startsWith('cdk-') && !tag.startsWith('ng-')
        && !tag.startsWith('router-') && tag !== 'ng-container' && tag !== 'ng-template') {
      childSelectors.add(tag);
    }
  }
  component.childSelectors = [...childSelectors];
}

// --- Git Changes Detection ---

/**
 * Get component .ts files affected by current git changes.
 * Maps changed .component.html/.scss/.ts files back to their .component.ts file.
 * @returns {string[]} Absolute paths to affected .component.ts files
 */
function getChangedComponentFiles() {
  let output;
  try {
    // Get both staged and unstaged changes, plus untracked files
    const tracked = execSync('git diff --name-only HEAD', {
      cwd: PROJECT_ROOT, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    const untracked = execSync('git ls-files --others --exclude-standard', {
      cwd: PROJECT_ROOT, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    output = [tracked, untracked].filter(Boolean).join('\n');
  } catch {
    console.warn('  WARN: Could not run git commands, falling back to full scan');
    return null;
  }

  if (!output) return [];

  const changedFiles = output.split('\n').filter(Boolean);
  const componentTsFiles = new Set();

  for (const file of changedFiles) {
    // Direct .component.ts change
    if (file.endsWith('.component.ts') && !file.includes('.spec.')) {
      componentTsFiles.add(path.resolve(PROJECT_ROOT, file));
      continue;
    }
    // .component.html or .component.scss change → find sibling .component.ts
    if (file.endsWith('.component.html') || file.endsWith('.component.scss')) {
      const tsFile = file.replace(/\.component\.(html|scss)$/, '.component.ts');
      const tsPath = path.resolve(PROJECT_ROOT, tsFile);
      if (fs.existsSync(tsPath)) {
        componentTsFiles.add(tsPath);
      }
    }
    // .store.ts change → find sibling .component.ts
    if (file.endsWith('.store.ts')) {
      const tsFile = file.replace(/\.store\.ts$/, '.component.ts');
      const tsPath = path.resolve(PROJECT_ROOT, tsFile);
      if (fs.existsSync(tsPath)) {
        componentTsFiles.add(tsPath);
      }
    }
  }

  return [...componentTsFiles];
}

// --- Build & Write Index ---

/**
 * Build component array, resolve parent-child, write to output file.
 * @param {object[]} components - Array of extracted component info objects
 * @param {string} mode - 'full' or 'incremental'
 */
function buildAndWriteIndex(components, mode) {
  // Resolve parent-child relationships
  const selectorToIndex = {};
  for (let i = 0; i < components.length; i++) {
    selectorToIndex[components[i].selector] = i;
    components[i].parentSelectors = []; // Reset before rebuilding
  }

  for (const component of components) {
    for (const childSelector of component.childSelectors) {
      if (childSelector in selectorToIndex) {
        const childIdx = selectorToIndex[childSelector];
        if (!components[childIdx].parentSelectors.includes(component.selector)) {
          components[childIdx].parentSelectors.push(component.selector);
        }
      }
    }
  }

  const index = {
    generated: new Date().toISOString(),
    appRoot: path.relative(PROJECT_ROOT, APP_ROOT).replace(/\\/g, '/'),
    totalComponents: components.length,
    components,
  };

  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(index, null, 2), 'utf-8');
  console.log(`Component index written to: ${OUTPUT_FILE} (${mode})`);
  console.log(`Total components indexed: ${components.length}`);

  for (const c of components) {
    const signals = [
      c.bemBlock ? `BEM:${c.bemBlock}` : null,
      c.textMarkers.length > 0 ? `text:${c.textMarkers.length}` : null,
      c.materialWidgets.length > 0 ? `mat:${c.materialWidgets.length}` : null,
      c.childSelectors.length > 0 ? `children:${c.childSelectors.length}` : null,
    ].filter(Boolean).join(', ');
    console.log(`  ${c.selector} (${c.className}) → ${signals}`);
  }
}

// --- Main ---

function fullScan() {
  console.log(`[Full scan] Scanning for components in: ${APP_ROOT}`);

  const componentFiles = findFiles(APP_ROOT, /\.component\.ts$/)
    .filter(f => !f.includes('.spec.'));
  console.log(`Found ${componentFiles.length} component files`);

  const components = [];
  for (const tsFile of componentFiles) {
    const info = extractComponentInfo(tsFile);
    if (info) components.push(info);
  }

  buildAndWriteIndex(components, 'full');
}

function incrementalUpdate() {
  console.log('[Incremental] Checking git changes for component files...');

  const changedTsFiles = getChangedComponentFiles();
  if (changedTsFiles === null) {
    console.log('  Git unavailable, falling back to full scan');
    return fullScan();
  }

  if (changedTsFiles.length === 0) {
    console.log('  No component files changed. Index is up to date.');
    return;
  }

  console.log(`  Found ${changedTsFiles.length} changed component(s):`);
  for (const f of changedTsFiles) {
    console.log(`    ${path.relative(PROJECT_ROOT, f)}`);
  }

  // Load existing index
  let existing = { components: [] };
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
    } catch {
      console.warn('  WARN: Could not parse existing index, doing full scan');
      return fullScan();
    }
  } else {
    console.log('  No existing index found, doing full scan');
    return fullScan();
  }

  // Build set of changed tsPath keys (relative, forward slashes)
  const changedKeys = new Set(
    changedTsFiles.map(f => path.relative(PROJECT_ROOT, f).replace(/\\/g, '/'))
  );

  // Keep unchanged components, re-extract changed ones
  const components = existing.components.filter(c => !changedKeys.has(c.tsPath));

  for (const tsFile of changedTsFiles) {
    if (fs.existsSync(tsFile)) {
      const info = extractComponentInfo(tsFile);
      if (info) components.push(info);
    }
    // If file no longer exists, it's simply not added back (= removed)
  }

  const unchangedCount = existing.components.filter(c => !changedKeys.has(c.tsPath)).length;
  buildAndWriteIndex(components, 'incremental');
  console.log(`  Updated: ${changedTsFiles.length}, Unchanged: ${unchangedCount}`);
}

// Entry point
if (GIT_CHANGES_MODE) {
  incrementalUpdate();
} else {
  fullScan();
}
