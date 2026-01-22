#!/usr/bin/env node
/**
 * Frontend TypeScript Context Injector - PreToolUse Hook
 *
 * Automatically injects frontend TypeScript development guide when editing
 * .ts files in frontend applications. Uses file path patterns to detect
 * frontend TypeScript files.
 *
 * Pattern Matching:
 *   src/Frontend/*                    → Angular 19 apps
 *   src/Frontend/*                      → Legacy Angular apps
 *   libs/platform-core/*           → Platform core library
 *   libs/platform-core/*            → Shared components library
 *   libs/apps-domains/*            → Domain library
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const FRONTEND_GUIDE_PATH = 'docs/claude/frontend-typescript-complete-guide.md';

const FRONTEND_PATTERNS = [
    {
        name: 'WebV2 Apps',
        patterns: [/src[\/\\]WebV2[\/\\]/i],
        description: 'Angular 19 standalone apps'
    },
    {
        name: 'Legacy Web Apps',
        patterns: [/src[\/\\]Web[\/\\]/i],
        description: 'Legacy Angular apps'
    },
    {
        name: 'Platform Core',
        patterns: [/libs[\/\\]platform-core[\/\\]/i],
        description: 'Platform core framework library'
    },
    {
        name: 'Platform Core',
        patterns: [/libs[\/\\]platform-core[\/\\]/i],
        description: 'Shared UI components library'
    },
    {
        name: 'Apps Domains',
        patterns: [/libs[\/\\]apps-domains[\/\\]/i],
        description: 'Domain models and API services'
    }
];

// App-specific patterns for more detailed guidance
const APP_PATTERNS = {
    TextSnippet: /PlatformExampleApp[\/\\].*TextSnippet/i,
    'playground-text-snippet': /Frontend[\/\\]apps[\/\\]playground-text-snippet/i
};

// File type patterns for type-specific guidance
const FILE_TYPE_PATTERNS = {
    component: {
        pattern: /\.component\.ts$/i,
        guidance: {
            title: 'Component Pattern',
            rules: [
                'Extend `AppBaseComponent`, `AppBaseVmComponent`, `AppBaseVmStoreComponent`, or `AppBaseFormComponent`',
                'NEVER extend Platform* classes directly - always use AppBase* classes',
                'NEVER extend raw Angular Component',
                'Use `ChangeDetectionStrategy.OnPush` and `ViewEncapsulation.None`',
                'Template: ALL elements MUST have BEM classes (`block__element --modifier`)'
            ],
            baseClassGuide: `
**Choose base class by complexity:**
| Complexity | Base Class | When to Use |
|------------|------------|-------------|
| Simple | \`AppBaseComponent\` | No state, simple display |
| With ViewModel | \`AppBaseVmComponent\` | Self-managed state, no external store |
| With Store | \`AppBaseVmStoreComponent\` | External store for complex state |
| With Form | \`AppBaseFormComponent\` | Forms with validation |`
        }
    },
    store: {
        pattern: /\.store\.ts$/i,
        guidance: {
            title: 'Store Pattern',
            rules: [
                'Extend `PlatformVmStore<TViewModel>`',
                'Use `effectSimple()` for API calls with auto loading/error state',
                'Use `select()` for derived state',
                'Use `updateState()` for state updates',
                'Mark store as `@Injectable()` (not providedIn root)'
            ],
            baseClassGuide: `
**Store structure:**
\`\`\`typescript
@Injectable()
export class MyStore extends PlatformVmStore<MyVm> {
    loadData = this.effectSimple(() =>
        this.api.getData().pipe(this.tapResponse(d => this.updateState({ data: d }))), 'loadData');
    readonly data$ = this.select(s => s.data);
    readonly loading$ = this.isLoading$('loadData');
}
\`\`\``
        }
    },
    form: {
        pattern: /[-.]form\.component\.ts$/i,
        guidance: {
            title: 'Form Component Pattern',
            rules: [
                'Extend `AppBaseFormComponent<TFormVm>`',
                'Implement `initialFormConfig()` returning `PlatformFormConfig<T>`',
                'Use `validateForm()` before submission',
                'Use `dependentValidations` for cross-field validation',
                'FormArrays: use `modelItems` and `itemControl` in config'
            ],
            baseClassGuide: `
**Form config structure:**
\`\`\`typescript
protected initialFormConfig = () => ({
    controls: {
        email: new FormControl(this.currentVm().email, [Validators.required]),
        items: { modelItems: () => vm.items, itemControl: (i) => new FormGroup({...}) }
    },
    dependentValidations: { endDate: ['startDate'] }
});
\`\`\``
        }
    },
    service: {
        pattern: /[-.]api\.service\.ts$|[-.]service\.ts$/i,
        guidance: {
            title: 'API Service Pattern',
            rules: [
                'Extend `PlatformApiService`',
                'NEVER use HttpClient directly',
                'Define `protected get apiUrl()` returning base URL',
                'Use `get()`, `post()`, `put()`, `delete()` methods',
                'Use `{ enableCache: true }` for cacheable requests'
            ],
            baseClassGuide: `
**Service structure:**
\`\`\`typescript
@Injectable({ providedIn: 'root' })
export class MyApiService extends PlatformApiService {
    protected get apiUrl() { return environment.apiUrl + '/api/my'; }
    getAll(): Observable<Item[]> { return this.get(''); }
    save(cmd: SaveCmd): Observable<Result> { return this.post('', cmd); }
}
\`\`\``
        }
    },
    viewModel: {
        pattern: /\.view-model\.ts$|\.vm\.ts$/i,
        guidance: {
            title: 'ViewModel Pattern',
            rules: [
                'Implement `IPlatformVm` interface',
                'Add `clone()` method for immutable updates',
                'Add helper methods for derived state',
                'Use constructor with partial initialization',
                'Add static factory methods if needed'
            ],
            baseClassGuide: `
**ViewModel structure:**
\`\`\`typescript
export class MyVm implements IPlatformVm {
    items: Item[] = [];
    loading = false;
    constructor(data?: Partial<MyVm>) { Object.assign(this, data); }
    clone(): MyVm { return new MyVm({ ...this }); }
    get activeItems() { return this.items.filter(i => i.isActive); }
}
\`\`\``
        }
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if frontend TypeScript context was recently injected
 * Reads the transcript to avoid duplicate injections
 */
function wasRecentlyInjected(transcriptPath) {
    try {
        if (!transcriptPath || !fs.existsSync(transcriptPath)) return false;
        const transcript = fs.readFileSync(transcriptPath, 'utf-8');
        // Check last 200 lines for recent injection
        const recentLines = transcript.split('\n').slice(-200).join('\n');
        return recentLines.includes('**Frontend TypeScript Context Detected**');
    } catch (e) {
        return false;
    }
}

function isTypeScriptFile(filePath) {
    if (!filePath) return false;
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.ts' || ext === '.tsx';
}

function detectFrontendContext(filePath) {
    if (!filePath) return null;

    // Normalize path separators
    const normalizedPath = filePath.replace(/\\/g, '/');

    for (const context of FRONTEND_PATTERNS) {
        for (const pattern of context.patterns) {
            if (pattern.test(normalizedPath)) {
                return context;
            }
        }
    }

    return null;
}

function detectApp(filePath) {
    if (!filePath) return null;

    const normalizedPath = filePath.replace(/\\/g, '/');

    for (const [appName, pattern] of Object.entries(APP_PATTERNS)) {
        if (pattern.test(normalizedPath)) {
            return appName;
        }
    }

    return null;
}

function detectFileType(filePath) {
    if (!filePath) return null;

    const fileName = path.basename(filePath);

    // Check patterns in order of specificity (form before component)
    const orderedTypes = ['form', 'service', 'store', 'viewModel', 'component'];

    for (const typeName of orderedTypes) {
        const typeInfo = FILE_TYPE_PATTERNS[typeName];
        if (typeInfo && typeInfo.pattern.test(fileName)) {
            return { name: typeName, ...typeInfo.guidance };
        }
    }

    return null;
}

function shouldInject(filePath, transcriptPath) {
    // Skip non-TypeScript files
    if (!isTypeScriptFile(filePath)) return false;

    // Skip if no frontend context detected
    const context = detectFrontendContext(filePath);
    if (!context) return false;

    // Skip if already injected recently
    if (wasRecentlyInjected(transcriptPath)) return false;

    return true;
}

function buildInjection(context, filePath, app, fileType) {
    const fileName = path.basename(filePath);

    const lines = [
        '',
        '## Frontend TypeScript Context Detected',
        '',
        `**Context:** ${context.name}`,
        `**File:** ${fileName}`,
        fileType ? `**Type:** ${fileType.title}` : '',
        app ? `**App:** ${app}` : '',
        ''
    ];

    // Add file type-specific guidance (priority)
    if (fileType) {
        lines.push(`### ${fileType.title} Guidelines`, '');

        if (fileType.rules && fileType.rules.length > 0) {
            fileType.rules.forEach((rule, i) => {
                lines.push(`${i + 1}. ${rule}`);
            });
            lines.push('');
        }

        if (fileType.baseClassGuide) {
            lines.push(fileType.baseClassGuide, '');
        }
    } else {
        // Generic guidance for non-typed files
        lines.push(
            '### Required Reading',
            '',
            `Before implementing frontend TypeScript changes, you MUST read:`,
            '',
            `**\`${FRONTEND_GUIDE_PATH}\`**`,
            '',
            'This guide contains:',
            '- Component patterns (PlatformComponent, PlatformVmStore, AppBaseFormComponent)',
            '- State management (PlatformVmStore with signals)',
            '- API service patterns (extend PlatformApiService)',
            '- Form patterns with validation (PlatformFormComponent)',
            '- RxJS operators and subscription management (.untilDestroyed())',
            '- BEM class naming conventions for templates',
            ''
        );
    }

    // Always include critical rules
    lines.push(
        '### Critical Rules',
        '',
        '1. **Components:** Extend `AppBaseComponent`, `AppBaseVmComponent`, `AppBaseVmStoreComponent`, or `AppBaseFormComponent` - NEVER Platform* directly or raw Component',
        '2. **State:** Use `PlatformVmStore` for state management - NEVER manual signals',
        '3. **API:** Extend `PlatformApiService` for HTTP calls - NEVER direct HttpClient',
        '4. **Subscriptions:** Always use `.pipe(this.untilDestroyed())` - NEVER manual unsubscribe',
        '5. **Templates:** All elements MUST have BEM classes (`block__element --modifier`, space-separated)',
        ''
    );

    // Add app-specific guidance
    if (app) {
        lines.push('### App-Specific Notes', '', `Working in **${app}** app:`, '');

        if (app === 'playground-text-snippet') {
            lines.push(
                '- Angular 19 standalone components',
                '- AppBase* classes in `shared/base/`',
                '- Use platform-core patterns',
                '- Follow BEM naming conventions',
                ''
            );
        } else if (app === 'TextSnippet') {
            lines.push('- Example application patterns', '- Use platform framework components', '- Follow established coding patterns', '');
        }
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

        // Detect context, app, and file type
        const context = detectFrontendContext(filePath);
        if (!context) process.exit(0);

        const app = detectApp(filePath);
        const fileType = detectFileType(filePath);

        // Output the injection
        const injection = buildInjection(context, filePath, app, fileType);
        console.log(injection);

        process.exit(0);
    } catch (error) {
        // Non-blocking - just exit silently
        process.exit(0);
    }
}

main();
