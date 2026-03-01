#!/usr/bin/env node
/**
 * Backend C# Context Injector - PreToolUse Hook
 *
 * Automatically injects backend C# development guide when editing
 * .cs files in backend services. Uses file path patterns to detect
 * backend service files.
 *
 * Pattern Matching:
 *   Configured via docs/project-config.json backendServices.patterns
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

const fs = require('fs');
const path = require('path');
const { loadProjectConfig, buildRegexMap, buildPatternList } = require('./lib/project-config-loader.cjs');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION (loaded from docs/project-config.json)
// ═══════════════════════════════════════════════════════════════════════════

const BACKEND_GUIDE_PATH = 'docs/claude/backend-csharp-complete-guide.md';
const { CODE_PATTERNS: SHARED_PATTERN_MARKER } = require('./lib/dedup-constants.cjs');

const config = loadProjectConfig();
const BACKEND_PATTERNS = buildPatternList(config.backendServices?.patterns);
const SERVICE_PATTERNS = buildRegexMap(config.backendServices?.serviceMap);

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if backend context was recently injected
 * Reads the transcript to avoid duplicate injections
 */
function wasRecentlyInjected(transcriptPath) {
  try {
    if (!transcriptPath || !fs.existsSync(transcriptPath)) return false;
    const transcript = fs.readFileSync(transcriptPath, 'utf-8');
    // Check last 200 lines for recent injection
    const recentLines = transcript.split('\n').slice(-200).join('\n');
    return recentLines.includes('**Backend C# Context Detected**');
  } catch (e) {
    return false;
  }
}

function werePatternRecentlyInjected(transcriptPath) {
  try {
    if (!transcriptPath || !fs.existsSync(transcriptPath)) return false;
    const transcript = fs.readFileSync(transcriptPath, 'utf-8');
    const recentLines = transcript.split('\n').slice(-300).join('\n');
    return recentLines.includes(SHARED_PATTERN_MARKER);
  } catch {
    return false;
  }
}

function isCSharpFile(filePath) {
  if (!filePath) return false;
  return path.extname(filePath).toLowerCase() === '.cs';
}

function detectBackendContext(filePath) {
  if (!filePath) return null;

  // Normalize path separators
  const normalizedPath = filePath.replace(/\\/g, '/');

  for (const context of BACKEND_PATTERNS) {
    for (const pattern of context.patterns) {
      if (pattern.test(normalizedPath)) {
        return context;
      }
    }
  }

  return null;
}

function detectService(filePath) {
  if (!filePath) return null;

  const normalizedPath = filePath.replace(/\\/g, '/');

  for (const [serviceName, pattern] of Object.entries(SERVICE_PATTERNS)) {
    if (pattern.test(normalizedPath)) {
      return serviceName;
    }
  }

  return null;
}

function shouldInject(filePath, transcriptPath) {
  // Skip non-C# files
  if (!isCSharpFile(filePath)) return false;

  // Skip if no backend context detected
  const context = detectBackendContext(filePath);
  if (!context) return false;

  // Skip if already injected recently
  if (wasRecentlyInjected(transcriptPath)) return false;

  return true;
}

function buildInjection(context, filePath, service, patternsAlreadyInjected) {
  const fileName = path.basename(filePath);
  const backendDoc = config.framework?.backendPatternsDoc || 'docs/backend-patterns-reference.md';

  const lines = [
    '',
    '## Backend C# Context Detected',
    '',
    `**Context:** ${context.name}`,
    `**File:** ${fileName}`,
    service ? `**Service:** ${service}` : '',
    ''
  ];

  if (!patternsAlreadyInjected) {
    lines.push(
      '### IMPORTANT — MUST READ',
      '',
      `Before implementing backend changes, you **MUST READ** the following file:`,
      '',
      `**\`${BACKEND_GUIDE_PATH}\`**`,
      '',
      `Also review **\`${backendDoc}\`** for project-specific patterns covering:`,
      '- Repository patterns (use service-specific repositories, NEVER generic)',
      '- CQRS Command/Query patterns',
      '- Entity, DTO, and validation patterns',
      '- Event-driven architecture (side effects in entity event handlers)',
      '- Background jobs and data migrations',
      ''
    );
  }

  lines.push(
    '### Critical Rules',
    '',
    `Refer to \`${backendDoc}\` for class names and detailed examples.`,
    '',
    '1. **Repository:** Use service-specific repository interfaces - NEVER generic',
    '2. **Validation:** Use fluent validation API - NEVER throw exceptions',
    '3. **Side Effects:** Handle in entity event handlers - NEVER in command handlers',
    '4. **DTO Mapping:** DTOs own mapping - NEVER map in handlers',
    '5. **Cross-Service:** Use message bus - NEVER direct database access',
    ''
  );

  // Add service-specific guidance
  if (service) {
    lines.push(
      '### Service-Specific Notes',
      '',
      `Working in **${service}** service:`,
      ''
    );

    const repos = config.backendServices?.serviceRepositories || {};
    const domains = config.backendServices?.serviceDomains || {};
    const repoType = repos[service];
    const domain = domains[service];
    if (repoType || domain) {
      if (repoType) lines.push(`- Use \`${repoType}\` for entities`);
      if (domain) lines.push(`- ${domain}`);
      lines.push('');
    }
  }

  // Filter out empty lines from middle
  return lines.filter((line, i, arr) => {
    if (line === '' && arr[i - 1] === '') return false;
    return true;
  }).join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  try {
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    const payload = JSON.parse(stdin);
    const toolName = payload.tool_name || '';
    const toolInput = payload.tool_input || {};
    const transcriptPath = payload.transcript_path || '';

    // Only process Edit, Write, MultiEdit tools
    if (!['Edit', 'Write', 'MultiEdit'].includes(toolName)) {
      process.exit(0);
    }

    // Extract file path from tool input
    const filePath = toolInput.file_path || toolInput.filePath || '';
    if (!filePath) process.exit(0);

    // Check if we should inject
    if (!shouldInject(filePath, transcriptPath)) {
      process.exit(0);
    }

    // Detect context and service
    const context = detectBackendContext(filePath);
    if (!context) process.exit(0);

    const service = detectService(filePath);
    const patternsAlreadyInjected = werePatternRecentlyInjected(transcriptPath);

    // Output the injection
    const injection = buildInjection(context, filePath, service, patternsAlreadyInjected);
    console.log(injection);

    process.exit(0);
  } catch (error) {
    // Non-blocking - just exit silently
    process.exit(0);
  }
}

main();
