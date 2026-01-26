#!/usr/bin/env node
/**
 * Backend C# Context Injector - PreToolUse Hook
 *
 * Automatically injects backend C# development guide when editing
 * .cs files in backend services. Uses file path patterns to detect
 * backend service files.
 *
 * Pattern Matching:
 *   src/Backend/*                  → Backend microservices
 *   src/Platform/*                  → Easy.Platform framework
 *   src/Backend/Example/reference app
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const BACKEND_GUIDE_PATH = 'docs/claude/backend-csharp-complete-guide.md';

const BACKEND_PATTERNS = [
    {
        name: 'Microservices',
        patterns: [/src[\/\\]Services[\/\\]/i],
        description: 'Backend microservices (TextSnippet, TextSnippet, TextSnippet, etc.)'
    },
    {
        name: 'Platform Framework',
        patterns: [/src[\/\\]Platform[\/\\]/i],
        description: 'Easy.Platform framework core'
    },
    {
        name: 'Example App',
        patterns: [/src[\/\\]PlatformExampleApp[\/\\]/i],
        description: 'Platform example/reference application'
    }
];

// Service-specific patterns for more detailed guidance
const SERVICE_PATTERNS = {
    TextSnippet: /PlatformExampleApp[\/\\].*TextSnippet/i,
    ExampleService: /Services[\/\\]Example/i
};

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

function buildInjection(context, filePath, service) {
    const fileName = path.basename(filePath);

    const lines = [
        '',
        '## Backend C# Context Detected',
        '',
        `**Context:** ${context.name}`,
        `**File:** ${fileName}`,
        service ? `**Service:** ${service}` : '',
        '',
        '### Required Reading',
        '',
        `Before implementing backend changes, you **MUST READ**:`,
        '',
        `**\`${BACKEND_GUIDE_PATH}\`**`,
        '',
        'This guide contains:',
        '- SOLID, DRY, KISS, YAGNI principles with code examples',
        '- Repository patterns (use service-specific: IPlatformQueryableRootRepository, IPlatformQueryableRootRepository)',
        '- CQRS Command/Query patterns (Command + Result + Handler in ONE file)',
        '- Entity, DTO, and Validation patterns (PlatformValidationResult fluent API)',
        '- Event-driven architecture (side effects in Entity Event Handlers)',
        '- Background jobs and data migrations',
        '',
        '### Critical Rules',
        '',
        '1. **Repository:** Use `IPlatformQueryableRootRepository<T>`, `IPlatformQueryableRootRepository<T>` - NEVER generic',
        '2. **Validation:** Use `PlatformValidationResult` fluent API - NEVER throw ValidationException',
        '3. **Side Effects:** Handle in `UseCaseEvents/` event handlers - NEVER in command handlers',
        '4. **DTO Mapping:** DTOs own mapping via `PlatformEntityDto.MapToEntity()` - NEVER map in handlers',
        '5. **Cross-Service:** Use message bus - NEVER direct database access',
        ''
    ];

    // Add service-specific guidance
    if (service) {
        lines.push(
            '### Service-Specific Notes',
            '',
            `Working in **${service}** service:`,
            '',
            '- Use `IPlatformQueryableRootRepository<T>` for all entities',
            '- Follow domain-specific patterns in the service',
            ''
        );
    }

    // Filter out empty lines from middle
    return lines
        .filter((line, i, arr) => {
            if (line === '' && arr[i - 1] === '') return false;
            return true;
        })
        .join('\n');
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

        // Output the injection
        const injection = buildInjection(context, filePath, service);
        console.log(injection);

        process.exit(0);
    } catch (error) {
        // Non-blocking - just exit silently
        process.exit(0);
    }
}

main();
