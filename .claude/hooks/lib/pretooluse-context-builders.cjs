'use strict';
/**
 * PreToolUse context builders — Phase 04 consolidation.
 *
 * One builder per former PreToolUse inject-only hook. Each builder reproduces
 * its legacy hook's predicate + dedup + emit logic VERBATIM, but:
 *   - operates on an ALREADY-PARSED `payload` (the dispatcher reads stdin once),
 *   - accepts pre-split transcript `preloadedLines` for single-scan dedup (M1),
 *   - RETURNS the legacy hook's stdout (trimmed), or '' when the legacy hook
 *     would have exited 0 without emitting.
 *
 * Equivalence contract (TC-HOOKS-030 / M4): for any tool, the trimmed builder
 * outputs joined with '\n' (skipping '') equal the trimmed legacy hook outputs
 * joined with '\n'. The dispatchers emit `builders.filter(Boolean).join('\n')`.
 *
 * Fault isolation: builders are pure-ish and side-effect-light EXCEPT
 * buildGraphContext (runs graph-blast-radius). Dispatchers wrap every builder in
 * try/catch so one throwing builder never aborts the others.
 *
 * NOTE on emit semantics: a legacy hook that calls console.log(x) emits `x\n`.
 * When a hook makes MULTIPLE console.log calls, its stdout is the concatenation
 * `x1\n x2\n ...`. The harness treats one hook's whole stdout as ONE block and
 * trims it. So each builder returns the legacy hook's full multi-log content
 * joined with '\n' (NOT trailing), which equals that hook's trimmed stdout.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const { loadConfig } = require('./ck-config-utils.cjs');
const {
    injectCriticalContext,
    injectAiMistakePrevention,
    injectLessons,
    wasMarkerRecentlyInjected
} = require('./prompt-injections.cjs');
const { isMarkerInContext } = require('./transcript-utils.cjs');
const {
    wasRecentlyInjected,
    parsePayloadForContext
} = require('./context-injector-base.cjs');
const {
    DEDUP_LINES,
    CODE_REVIEW_RULES,
    DEV_RULES,
    KNOWLEDGE_CONTEXT,
    DESIGN_SYSTEM,
    CODE_PATTERNS,
    BACKEND_CONTEXT,
    FRONTEND_CONTEXT,
    STYLING_CONTEXT,
    E2E_CONTEXT,
    INTEGRATION_TEST_CONTEXT,
    FEATURE_DOCS_CONTEXT,
    PYTHON_GUIDE,
    DESIGN_SYSTEM_CANONICAL_GUIDE
} = require('./dedup-constants.cjs');
const projectConfigLoader = require('./project-config-loader.cjs');
const { loadProjectConfig, getContextGroup, getModuleForPath, getLocalizationConfig, isMultilingualProject, isKnowledgePath, getSpecDocsPath, getSpecDocsPathRegex, resolveSection, buildPatternList } = projectConfigLoader;
const { normalizePathForComparison, normalizePath } = require('./ck-path-utils.cjs');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();

// Project config is read once per process (legacy modules read it at module load).
const PROJECT_CONFIG = (() => {
    try { return loadProjectConfig(); } catch { return {}; }
})();

// ── tool predicates ──────────────────────────────────────────────────────────
const EDITISH = new Set(['Edit', 'Write', 'MultiEdit']);
const isEditish = t => EDITISH.has(t);

function normalizeSkill(skill) {
    if (!skill) return '';
    return skill.replace(/^\/+/, '').toLowerCase().trim();
}

/** Trim block as the harness would (leading/trailing whitespace only). */
function asBlock(s) {
    return (s == null ? '' : String(s)).trim();
}

// ═══════════════════════════════════════════════════════════════════════════
// reg8 — code-review-rules-injector  (Skill|Agent|Edit|Write|MultiEdit|Task*)
// ═══════════════════════════════════════════════════════════════════════════

const REVIEW_INJECT_DEFAULT = ['code-review', 'review', 'review:codebase', 'review-changes', 'code-reviewer'];

function trimContent(content, maxLines = 50, headLines = 25, tailLines = 25) {
    const lines = content.split('\n');
    if (lines.length <= maxLines) return content;
    return [...lines.slice(0, headLines), '...', ...lines.slice(-tailLines)].join('\n');
}

function buildCodeReviewRules(payload, preloadedLines) {
    const toolName = payload.tool_name || '';
    const isSkill = toolName === 'Skill';
    const isEdit = isEditish(toolName);
    if (!isSkill && !isEdit) return '';

    const config = loadConfig({ includeProject: false, includeAssertions: false });
    const reviewConfig = config.codeReview || {};
    if (reviewConfig.enabled === false) return '';

    if (isSkill) {
        const skillName = (payload.tool_input?.skill || '').toLowerCase();
        if (!skillName) return '';
        const targetSkills = reviewConfig.injectOnSkills || REVIEW_INJECT_DEFAULT;
        const shouldInject =
            targetSkills.some(target => skillName.includes(target.toLowerCase()) || target.toLowerCase().includes(skillName)) ||
            skillName.endsWith('-review');
        if (!shouldInject) return '';
    }

    if (wasMarkerRecentlyInjected(payload.transcript_path, CODE_REVIEW_RULES, DEDUP_LINES.CODE_REVIEW_RULES, undefined, preloadedLines)) return '';

    const rulesPath = reviewConfig.rulesPath || 'docs/project-reference/code-review-rules.md';
    const fullPath = path.resolve(PROJECT_DIR, rulesPath);
    if (!fs.existsSync(fullPath)) return '';

    const rules = fs.readFileSync(fullPath, 'utf-8');
    const trimmedRules = trimContent(rules);

    // Legacy emitted 5 console.log calls → blocks joined by '\n':
    //   `\n## MARKER\n` , `**Source:** `path`\n` , `---\n` , trimmedRules , `\n---\n`
    const out = [
        `\n## ${CODE_REVIEW_RULES}\n`,
        `**Source:** \`${rulesPath}\`\n`,
        `---\n`,
        trimmedRules,
        `\n---\n`
    ].join('\n');
    return asBlock(out);
}

// ═══════════════════════════════════════════════════════════════════════════
// reg8 — dev-rules-injector
// ═══════════════════════════════════════════════════════════════════════════

const DEV_REVIEW_SKILLS = new Set([
    'code-review', 'review-changes', 'review-post-task', 'review-architecture',
    'code-simplifier', 'sre-review', 'why-review', 'workflow-review-changes',
    'simplify', 'knowledge-review', 'plan-review'
]);
const DEV_CODING_SKILLS = new Set(['cook', 'code', 'fix']);

function resolveDevRulesPath() {
    const localPath = path.join(PROJECT_DIR, '.claude', 'docs', 'development-rules.md');
    const globalPath = path.join(os.homedir(), '.claude', 'docs', 'development-rules.md');
    if (fs.existsSync(localPath)) return localPath;
    if (fs.existsSync(globalPath)) return globalPath;
    return null;
}

function buildDevRules(payload, preloadedLines) {
    const toolName = payload.tool_name || '';
    const isSkill = toolName === 'Skill';
    if (isSkill) {
        const skillName = normalizeSkill(payload.tool_input?.skill);
        if (!DEV_REVIEW_SKILLS.has(skillName) && !DEV_CODING_SKILLS.has(skillName)) return '';
    } else if (!isEditish(toolName)) {
        return '';
    }

    const config = loadConfig({ includeProject: false, includeAssertions: false });
    if (config.devRules?.enabled === false) return '';

    if (wasMarkerRecentlyInjected(payload.transcript_path, DEV_RULES, DEDUP_LINES.DEV_RULES, undefined, preloadedLines)) return '';

    const rulesPath = resolveDevRulesPath();
    if (!rulesPath) return '';
    const content = fs.readFileSync(rulesPath, 'utf-8');
    if (!content.trim()) return '';

    const displaySrc = rulesPath.includes(os.homedir()) ? '~/.claude/docs/development-rules.md' : '.claude/docs/development-rules.md';
    const out = [
        '\n---\n',
        `## ${DEV_RULES}\n`,
        `**Source:** \`${displaySrc}\`\n`,
        '---\n',
        content,
        '\n---\n'
    ].join('\n');
    return asBlock(out);
}

// ═══════════════════════════════════════════════════════════════════════════
// reg8 — mindset-injector  (multi-emit)
// ═══════════════════════════════════════════════════════════════════════════

const MINDSET_SKILLS = new Set([
    'plan', 'plan-validate', 'cook', 'code', 'fix', 'feature', 'refactoring',
    'refine', 'debug', 'debug-investigate', 'code-review', 'review-changes',
    'review-post-task', 'integration-test', 'integration-test-review', 'spec',
    'scout', 'investigate', 'feature-investigation', 'prove-fix',
    'security-review', 'performance-review'
]);
const GRAPH_REQUIRED_SKILLS = new Set([
    'scout', 'investigate', 'feature-investigation', 'debug', 'fix', 'prove-fix',
    'code-review', 'review-changes', 'security-review', 'performance-review', 'plan'
]);

function graphDbExists() {
    try { return fs.existsSync(path.join(PROJECT_DIR, '.code-graph', 'graph.db')); } catch { return false; }
}

/**
 * Extract the trimmed Golden Rules block from CLAUDE.md content.
 *
 * Line-ending-agnostic: git autocrlf checks CLAUDE.md out as CRLF on Windows, so a
 * bare `\n\n` block terminator never matches and the block was silently dropped at
 * runtime. `\r?\n` tolerates LF/CRLF/mixed; split(/\r?\n/) normalizes back to LF.
 *
 * Pure + exported so the CRLF contract is unit-testable without a frozen PROJECT_DIR
 * (TC-HOOKS-038). Returns the rules string, or null when no block is present.
 * @param {string} content
 * @returns {string|null}
 */
function extractGoldenRules(content) {
    const goldenMatch = content.match(/\*\*Golden Rules[^*]*\*\*:?\s*\r?\n((?:[\s\S]*?))\r?\n\r?\n/);
    if (!goldenMatch) return null;
    const rulesLines = goldenMatch[1].trim().split(/\r?\n/);
    if (rulesLines.length > 50) {
        return [...rulesLines.slice(0, 25), '...', ...rulesLines.slice(-25)].join('\n');
    }
    return rulesLines.join('\n');
}

function buildMindset(payload, preloadedLines) {
    const toolName = payload.tool_name || '';
    const transcriptPath = payload.transcript_path || '';
    const isSkill = toolName === 'Skill';
    const isAgent = toolName === 'Agent';
    const isTaskOp = toolName === 'TaskCreate' || toolName === 'TaskUpdate';

    const parts = [];

    if (isTaskOp) {
        if (toolName === 'TaskUpdate' && payload.tool_input?.status !== 'in_progress') return '';
        const critical = injectCriticalContext(transcriptPath, false, preloadedLines);
        return asBlock(critical || '');
    }

    if (isSkill) {
        const skillName = normalizeSkill(payload.tool_input?.skill);
        if (!MINDSET_SKILLS.has(skillName)) return '';
    } else if (!isAgent && !isEditish(toolName)) {
        return '';
    }

    const critical = injectCriticalContext(transcriptPath, false, preloadedLines);
    if (critical) parts.push(critical);

    const aiMistake = injectAiMistakePrevention(transcriptPath, false, preloadedLines);
    if (aiMistake) parts.push(aiMistake);

    if (!isSkill && !isAgent) {
        // Golden Rules from CLAUDE.md
        try {
            const goldenMarker = '[Golden Rules Reminder]';
            const goldenAlreadyInjected = isMarkerInContext(
                Array.isArray(preloadedLines) ? preloadedLines : [],
                goldenMarker,
                100
            );
            if (!goldenAlreadyInjected) {
                const claudeMdPath = path.resolve(PROJECT_DIR, 'CLAUDE.md');
                if (fs.existsSync(claudeMdPath)) {
                    const goldenRules = extractGoldenRules(fs.readFileSync(claudeMdPath, 'utf-8'));
                    if (goldenRules !== null) {
                        parts.push(`\n## ${goldenMarker}\n\n${goldenRules}`);
                    }
                }
            }
        } catch { /* silent */ }

        // Graph gate compact
        try {
            if (graphDbExists()) {
                parts.push(`\n**[GRAPH-GATE]** Run graph trace on key files before editing: \`python .claude/scripts/code_graph trace <file> --direction both --json\``);
            }
        } catch { /* silent */ }
    }

    if (isSkill) {
        const lessons = injectLessons(transcriptPath, false, preloadedLines);
        if (lessons) parts.push(lessons);

        const skillName = normalizeSkill(payload.tool_input?.skill);
        if (GRAPH_REQUIRED_SKILLS.has(skillName)) {
            try {
                if (graphDbExists()) {
                    parts.push(
                        `\n<HARD-GATE>\n` +
                        `[GRAPH MANDATORY for /${skillName}] MUST ATTENTION run at least ONE graph trace on key files before concluding task.\n` +
                        `Command: python .claude/scripts/code_graph trace <key-file> --direction both --json\n` +
                        `Skip ONLY if .code-graph/graph.db does not exist. It EXISTS — graph trace REQUIRED.\n` +
                        `</HARD-GATE>`
                    );
                }
            } catch { /* silent */ }
        }
    }

    // Each legacy console.log added a trailing '\n'; joining parts with '\n'
    // reproduces the concatenated stdout, then asBlock() trims the ends.
    return asBlock(parts.join('\n'));
}

// ═══════════════════════════════════════════════════════════════════════════
// reg9 — mindset-compact-injector  (Read|Grep|Glob|Bash)
// ═══════════════════════════════════════════════════════════════════════════

function buildMindsetCompact(payload, preloadedLines) {
    const toolName = payload.tool_name || '';
    if (!['Read', 'Grep', 'Glob', 'Bash'].includes(toolName)) return '';
    const critical = injectCriticalContext(payload.transcript_path || '', false, preloadedLines);
    return asBlock(critical || '');
}

// ═══════════════════════════════════════════════════════════════════════════
// reg10 — knowledge-context  (Edit|Write|MultiEdit)
// ═══════════════════════════════════════════════════════════════════════════

const WORKSPACE_TYPES = [
    { key: 'research', pathRegex: /docs[\\/]knowledge[\\/]research/i, template: '.claude/templates/research-report-template.md', label: 'Research & Synthesis' },
    { key: 'courses', pathRegex: /docs[\\/]knowledge[\\/]courses/i, template: '.claude/templates/course-outline-template.md', label: 'Course Material' },
    { key: 'marketing', pathRegex: /docs[\\/]knowledge[\\/]strategy[\\/]marketing/i, template: '.claude/templates/marketing-strategy-template.md', label: 'Marketing Strategy' },
    { key: 'business', pathRegex: /docs[\\/]knowledge[\\/]strategy[\\/]business/i, template: '.claude/templates/business-evaluation-template.md', label: 'Business Evaluation' },
    { key: 'strategy', pathRegex: /docs[\\/]knowledge[\\/]strategy/i, template: null, label: 'Strategy' }
];

function detectWorkspaceType(filePath) {
    if (!filePath) return null;
    const normalized = filePath.replace(/\\/g, '/');
    for (const ws of WORKSPACE_TYPES) if (ws.pathRegex.test(normalized)) return ws;
    return null;
}

function buildKnowledgeContext(payload, preloadedLines) {
    const input = parsePayloadForContext(payload, { skipKnowledgeCheck: true });
    if (!input) return '';
    const { filePath, transcriptPath } = input;
    if (!filePath) return '';

    const workspace = detectWorkspaceType(filePath);
    if (!workspace) return '';
    if (wasRecentlyInjected(transcriptPath, KNOWLEDGE_CONTEXT, DEDUP_LINES.KNOWLEDGE_CONTEXT, preloadedLines)) return '';

    const fileName = path.basename(filePath);
    const lines = ['', KNOWLEDGE_CONTEXT, '', `**Workspace:** ${workspace.label || 'Knowledge Work'}`, `**File:** ${fileName}`, ''];
    if (workspace.template) lines.push('### Template', '', `Use enforced template: **\`${workspace.template}\`**`, '');
    lines.push(
        '### Knowledge Work Rules',
        '',
        '> **Web Research Protocol** — Every factual claim needs 2+ independent sources. Source tiers: Tier 1 (authoritative .gov/.edu/official docs), Tier 2 (industry reports), Tier 3 (credible blogs — cross-validate), Tier 4 (unverified — NEVER cite as fact). Declare confidence for all findings.',
        '',
        '1. Follow source hierarchy (official docs > peer-reviewed > industry blogs > forums) for all factual claims',
        '2. Include source citations with Tier classification (inline `[N]`)',
        '3. Cross-validate claims with 2+ independent sources',
        '4. Declare confidence level (95/80/60/<60%) for all findings',
        '5. Use enforced template structure — all sections required',
        '6. Working files → `.claude/tmp/`, final output → `docs/knowledge/`',
        ''
    );
    const out = lines.filter((line, i, arr) => !(line === '' && arr[i - 1] === '')).join('\n');
    return asBlock(out);
}

// ═══════════════════════════════════════════════════════════════════════════
// reg10 — design-system-context  (Edit|Write|MultiEdit)
// ═══════════════════════════════════════════════════════════════════════════

const DS_DOCS_PATH = PROJECT_CONFIG.designSystem?.docsPath || 'docs/project-reference/design-system';
const DS_APP_PATTERNS = buildPatternList(PROJECT_CONFIG.designSystem?.appMappings);
const DS_CANONICAL_DOC = PROJECT_CONFIG.designSystem?.canonicalDoc;
const DS_FRONTEND_EXTENSIONS = new Set(['.html', '.htm', '.scss', '.css', '.less', '.sass', '.ts', '.tsx', '.js', '.jsx']);

function dsIsFrontendFile(filePath) {
    return !!filePath && DS_FRONTEND_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}
function dsDetectApp(filePath) {
    if (!filePath) return null;
    const norm = filePath.replace(/\\/g, '/');
    for (const app of DS_APP_PATTERNS) for (const pattern of app.patterns) if (pattern.test(norm)) return app;
    return null;
}

function buildDesignSystemContext(payload, preloadedLines) {
    const input = parsePayloadForContext(payload);
    if (!input) return '';
    const { filePath, transcriptPath } = input;
    if (!dsIsFrontendFile(filePath)) return '';
    const app = dsDetectApp(filePath);
    if (!app) return '';
    if (wasRecentlyInjected(transcriptPath, DESIGN_SYSTEM, DEDUP_LINES.DESIGN_SYSTEM, preloadedLines)) return '';

    const lines = [
        '',
        '## Design System Context',
        `**Detected App:** ${app.name} | **File:** ${path.basename(filePath)}`,
        DESIGN_SYSTEM,
        '',
        'Before implementing UI, read:',
        `- \`${DS_DOCS_PATH}/${app.docFile}\` — ${app.name} component inventory and tokens`
    ];
    if (DS_CANONICAL_DOC) lines.push(`- \`${DS_DOCS_PATH}/${DS_CANONICAL_DOC}\` — canonical design tokens, BEM conventions`);
    const quickTips = app.quickTips || [];
    if (quickTips.length > 0) { lines.push('', '**Quick Tips:**'); quickTips.forEach(tip => lines.push(`- ${tip}`)); }
    const modernNote = PROJECT_CONFIG.designSystem?.modernUiNote;
    if (modernNote) lines.push('', modernNote);
    lines.push('');
    const out = lines.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n');
    return asBlock(out);
}

// ═══════════════════════════════════════════════════════════════════════════
// reg10/reg16 — design-system-canonical-guide  (kind: 'edit' | 'read' | 'skill')
// ═══════════════════════════════════════════════════════════════════════════

const CANONICAL_DOC_PATH = 'docs/project-reference/design-system/design-system-canonical.md';
const CANONICAL_UI_EXTS = new Set(['.html', '.htm', '.css', '.scss', '.sass', '.less']);

function canonicalIsUiFile(filePath) {
    if (!filePath) return false;
    return CANONICAL_UI_EXTS.has(path.extname(filePath).toLowerCase());
}
function canonicalDocExists() {
    try { return fs.existsSync(path.join(PROJECT_DIR, CANONICAL_DOC_PATH)); } catch { return false; }
}
function canonicalGuidance() {
    return `${DESIGN_SYSTEM_CANONICAL_GUIDE} When implementing UI — HTML, CSS, or SCSS — read \`${CANONICAL_DOC_PATH}\` first for design tokens, component patterns, and BEM conventions.`;
}

/**
 * @param {object} payload
 * @param {string[]} preloadedLines
 * @param {'edit'|'read'|'skill'} kind - which registration context this builder represents
 */
function buildDesignSystemCanonicalGuide(payload, preloadedLines, kind) {
    const toolName = payload.tool_name || '';
    // self-gate by tool to mirror the legacy PreToolUse matcher for each registration
    if (kind === 'edit' && !isEditish(toolName)) return '';
    if (kind === 'read' && toolName !== 'Read') return '';
    if (kind === 'skill' && toolName !== 'Skill') return '';

    if (!canonicalDocExists()) return '';
    if (wasMarkerRecentlyInjected(payload.transcript_path, DESIGN_SYSTEM_CANONICAL_GUIDE, DEDUP_LINES.DESIGN_SYSTEM_CANONICAL_GUIDE, undefined, preloadedLines)) return '';

    if (toolName === 'Skill') return asBlock(canonicalGuidance());

    if (['Read', 'Edit', 'Write', 'MultiEdit'].includes(toolName)) {
        const toolInput = payload.tool_input || {};
        const filePath = toolInput.file_path || toolInput.filePath || '';
        if (!canonicalIsUiFile(filePath)) return '';
        return asBlock(canonicalGuidance());
    }
    return '';
}

// ═══════════════════════════════════════════════════════════════════════════
// reg10 — code-patterns-injector  (Edit|Write|MultiEdit)
// ═══════════════════════════════════════════════════════════════════════════

const CP_e2eConfig = PROJECT_CONFIG.e2eTesting || {};
const CP_groups = PROJECT_CONFIG.contextGroups || [];
const CP_BACKEND_EXTS = new Set(CP_groups.find(g => g.fileExtensions?.includes('.cs'))?.fileExtensions || ['.cs']);
const CP_FRONTEND_EXTS = new Set(CP_groups.find(g => g.fileExtensions?.includes('.ts'))?.fileExtensions || ['.ts', '.tsx', '.html']);
const CP_E2E_CODE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.cs', '.feature']);
const CP_E2E_FILE_RE = /\.(spec|test|cy|e2e)\./i;
const CP_E2E_FALLBACK_RE = /[\\/](automation|e2e|spec|playwright|cypress)[\\/]/i;
const CP_INTEG_TEST_PATH_RE = /IntegrationTests?[\\/]/i;
const CP_FEATURE_DOCS_PATH_RE = getSpecDocsPathRegex();
const CP_BACKEND_REGEX = (() => {
    const bg = CP_groups.find(g => g.fileExtensions?.includes('.cs'));
    if (bg?.pathRegexes?.length) return new RegExp(`(${bg.pathRegexes.join('|')})`, 'i');
    return /src[\\/]/i;
})();
const CP_FRONTEND_REGEX = (() => {
    const fg = CP_groups.find(g => g.fileExtensions?.includes('.ts'));
    if (fg?.pathRegexes?.length) return new RegExp(`(${fg.pathRegexes.join('|')})`, 'i');
    return /(?:src|libs)[\\/]/i;
})();
const CP_E2E_PATH_PATTERNS = (() => {
    const parts = [];
    ['testsPath', 'pageObjectsPath', 'fixturesPath', 'platformProject', 'sharedProject', 'bddProject', 'nonBddProject'].forEach(k => {
        if (CP_e2eConfig[k]) parts.push(CP_e2eConfig[k].replace(/\\/g, '/'));
    });
    (CP_e2eConfig.entryPoints || []).forEach(ep => {
        const d = path.dirname(ep).replace(/\\/g, '/');
        if (!parts.includes(d)) parts.push(d);
    });
    return parts;
})();

function cpIsE2EFile(norm, ext) {
    if (!CP_E2E_CODE_EXTS.has(ext) && !CP_E2E_FILE_RE.test(norm)) return false;
    if (CP_E2E_PATH_PATTERNS.length > 0 && CP_E2E_PATH_PATTERNS.some(p => norm.toLowerCase().includes(p.toLowerCase()))) return true;
    return CP_E2E_FALLBACK_RE.test(norm) || (CP_E2E_FILE_RE.test(norm) && /[\\/]test/i.test(norm));
}
function cpClassify(filePath) {
    if (!filePath) return {};
    const ext = path.extname(filePath).toLowerCase();
    const norm = filePath.replace(/\\/g, '/');
    const isE2E = cpIsE2EFile(norm, ext);
    return {
        backend: !isE2E && CP_BACKEND_EXTS.has(ext) && CP_BACKEND_REGEX.test(norm),
        frontend: !isE2E && CP_FRONTEND_EXTS.has(ext) && CP_FRONTEND_REGEX.test(norm),
        integrationTest: CP_BACKEND_EXTS.has(ext) && CP_INTEG_TEST_PATH_RE.test(norm),
        e2e: isE2E,
        featureDocs: ext === '.md' && CP_FEATURE_DOCS_PATH_RE.test(norm)
    };
}
function cpRecentlyInjected(preloadedLines, transcriptPath, marker, lines) {
    return wasRecentlyInjected(transcriptPath, marker, lines, preloadedLines);
}
function cpBackendFrontendGuidance(backend, frontend) {
    const lines = ['', CODE_PATTERNS, '', 'Before editing, read:'];
    if (backend) {
        const bp = PROJECT_CONFIG.framework?.backendPatternsDoc || 'docs/project-reference/backend-patterns-reference.md';
        lines.push(`- \`${bp}\` — CQRS, commands, validation, repositories, entity events`);
    }
    if (frontend) {
        const fp = PROJECT_CONFIG.framework?.frontendPatternsDoc || 'docs/project-reference/frontend-patterns-reference.md';
        lines.push(`- \`${fp}\` — base classes, state-management store, reactive effects, component styling`);
    }
    lines.push('', '> **[ROOT-CAUSE-FIX]** Fix at correct layer (Entity > Service > Handler) — never patch symptoms.', '');
    return lines.join('\n');
}
function cpIntegrationTestGuidance() {
    return ['', INTEGRATION_TEST_CONTEXT, '', 'Read: `docs/project-reference/integration-test-reference.md` — subcutaneous CQRS patterns, real DI, no mocks, `WaitUntilAsync` for all assertions.', ''].join('\n');
}
function cpE2eGuidance() {
    const tcFormat = CP_e2eConfig.tcCodeFormat || 'TC-{MODULE}-E2E-{NNN}';
    const framework = CP_e2eConfig.framework || 'auto-detect';
    return ['', E2E_CONTEXT, '', `Read: \`docs/project-reference/e2e-test-reference.md\` — Page Object patterns, SpecFlow BDD conventions.`, `**Framework:** ${framework} | **TC format:** \`${tcFormat}\` (required in every test name)`, ''].join('\n');
}
function cpFeatureDocsGuidance() {
    return ['', FEATURE_DOCS_CONTEXT, '', 'Read: `docs/project-reference/feature-spec-reference.md`, `docs/project-reference/spec-system-reference.md`, and `docs/project-reference/spec-principles.md` — fixed spec root, tech-free 8-section Feature Spec, TC-{FEATURE}-{NNN} IDs, Section 8 as canonical TC source, and spec quality gates.', 'For behavior or public-contract changes, also read `docs/project-reference/workflow-spec-test-code-cycle-reference.md` before syncing specs/tests/code.', ''].join('\n');
}

function buildCodePatterns(payload, preloadedLines) {
    if (!isEditish(payload.tool_name)) return '';
    let ckEnabled = true;
    try { ckEnabled = (loadConfig() || {}).codePatterns?.enabled !== false; } catch { /**/ }
    if (!ckEnabled) return '';

    const filePath = payload.tool_input?.file_path || payload.tool_input?.filePath || payload.tool_input?.edits?.[0]?.file_path || '';
    if (isKnowledgePath(filePath)) return '';

    const { backend, frontend, integrationTest, e2e, featureDocs } = cpClassify(filePath);
    const tp = payload.transcript_path || '';

    if (integrationTest) {
        if (!cpRecentlyInjected(preloadedLines, tp, INTEGRATION_TEST_CONTEXT, DEDUP_LINES.INTEGRATION_TEST_CONTEXT)) return asBlock(cpIntegrationTestGuidance());
        return '';
    }
    if (featureDocs) {
        if (!cpRecentlyInjected(preloadedLines, tp, FEATURE_DOCS_CONTEXT, DEDUP_LINES.FEATURE_DOCS_CONTEXT)) return asBlock(cpFeatureDocsGuidance());
        return '';
    }
    if (e2e) {
        if (!cpRecentlyInjected(preloadedLines, tp, E2E_CONTEXT, DEDUP_LINES.E2E_CONTEXT)) return asBlock(cpE2eGuidance());
        return '';
    }
    if (!backend && !frontend) return '';
    if (!cpRecentlyInjected(preloadedLines, tp, CODE_PATTERNS, DEDUP_LINES.CODE_PATTERNS)) return asBlock(cpBackendFrontendGuidance(backend, frontend));
    return '';
}

// ═══════════════════════════════════════════════════════════════════════════
// reg10 — backend-context  (Edit|Write|MultiEdit)
// ═══════════════════════════════════════════════════════════════════════════

const BE_EXTENSIONS = new Set((PROJECT_CONFIG.contextGroups || []).find(g => g.name === 'Backend Services')?.fileExtensions || ['.cs']);
const BE_EXCLUDED = new Set(['.html', '.js', '.ts', '.css', '.sass', '.scss']);
function beIsBackendFile(filePath) {
    if (!filePath) return false;
    const ext = path.extname(filePath).toLowerCase();
    return !BE_EXCLUDED.has(ext) && BE_EXTENSIONS.has(ext);
}
function beGetServiceName(filePath) {
    const mod = getModuleForPath(filePath);
    if (mod?.kind === 'backend-service') return mod.name;
    const serviceMap = PROJECT_CONFIG.backendServices?.serviceRepositories || {};
    const norm = filePath.replace(/\\/g, '/');
    for (const [svc] of Object.entries(serviceMap)) if (norm.includes(svc)) return svc;
    return null;
}
function buildBackendContext(payload, preloadedLines) {
    const input = parsePayloadForContext(payload);
    if (!input) return '';
    const { filePath, transcriptPath } = input;
    if (!beIsBackendFile(filePath)) return '';
    if (!getContextGroup(filePath) && !PROJECT_CONFIG.backendServices) return '';
    if (wasRecentlyInjected(transcriptPath, BACKEND_CONTEXT, DEDUP_LINES.BACKEND_CONTEXT, preloadedLines)) return '';

    const ctxGroup = getContextGroup(filePath) || {};
    const patternsDoc = ctxGroup.patternsDoc || 'docs/project-reference/backend-patterns-reference.md';
    const rules = ctxGroup.rules || [];
    const service = beGetServiceName(filePath);
    const mod = getModuleForPath(filePath);
    const repoType = mod?.meta?.repository || (PROJECT_CONFIG.backendServices?.serviceRepositories || {})[service];

    const lines = [
        '',
        BACKEND_CONTEXT,
        `**File:** ${path.basename(filePath)}${service ? ` | **Service:** ${service}` : ''}`,
        '',
        'Before implementing, read:',
        `- \`${patternsDoc}\` — CQRS commands/queries, validation, repositories, entity events`,
        '- `docs/project-reference/domain-entities-reference.md` — entity catalog, relationships, cross-service sync'
    ];
    if (repoType) lines.push(`\n**Repository:** Use \`${repoType}\` — NEVER the generic root repository base`);
    if (rules.length > 0) { lines.push('', '**Critical Rules:**'); rules.forEach((r, i) => lines.push(`${i + 1}. ${r}`)); }
    lines.push('');
    const out = lines.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n');
    return asBlock(out);
}

// ═══════════════════════════════════════════════════════════════════════════
// reg10 — frontend-context  (Edit|Write|MultiEdit)
// ═══════════════════════════════════════════════════════════════════════════

const FE_EXTENSIONS = new Set(['.html', '.js', '.ts', '.tsx', '.css', '.scss', '.json']);
const FE_LOCALIZATION = getLocalizationConfig(PROJECT_CONFIG);
const FE_MODERN_APPS = new Set(PROJECT_CONFIG.frontendApps?.modernApps || []);
const FE_LEGACY_APPS = new Set(PROJECT_CONFIG.frontendApps?.legacyApps || []);
function feIsFrontendFile(filePath) {
    return !!filePath && FE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}
function feGetAppName(filePath) {
    const mod = getModuleForPath(filePath);
    if (mod && (mod.kind === 'frontend-app' || mod.kind === 'library')) return mod.name;
    return null;
}
function buildFrontendContext(payload, preloadedLines) {
    const input = parsePayloadForContext(payload);
    if (!input) return '';
    const { filePath, transcriptPath } = input;
    if (!feIsFrontendFile(filePath)) return '';
    if (!getContextGroup(filePath)) return '';
    if (wasRecentlyInjected(transcriptPath, FRONTEND_CONTEXT, DEDUP_LINES.FRONTEND_CONTEXT, preloadedLines)) return '';

    const ctxGroup = getContextGroup(filePath) || {};
    const patternsDoc = ctxGroup.patternsDoc || 'docs/project-reference/frontend-patterns-reference.md';
    const rules = ctxGroup.rules || [];
    const app = feGetAppName(filePath);
    const mod = getModuleForPath(filePath);
    const generation = mod?.meta?.generation || (FE_MODERN_APPS.has(app) ? 'modern' : FE_LEGACY_APPS.has(app) ? 'legacy' : null);

    const lines = [
        '',
        FRONTEND_CONTEXT,
        `**File:** ${path.basename(filePath)}${app ? ` | **App:** ${app}` : ''}`,
        '',
        'Before implementing, read:',
        `- \`${patternsDoc}\` — base classes, state-management store, reactive effects, component styling, API service pattern`,
        '- `docs/project-reference/domain-entities-reference.md` — domain models, API services'
    ];
    if (generation === 'modern') lines.push('', '**App:** Standalone components with signals. Use `@use \'shared-mixin\'` for SCSS.');
    else if (generation === 'legacy') lines.push('', '**App:** Legacy NgModules (not standalone). Use `@import \'~assets/scss/variables\'` for SCSS.');
    if (rules.length > 0) { lines.push('', '**Critical Rules:**'); rules.forEach((r, i) => lines.push(`${i + 1}. ${r}`)); }
    const norm = (filePath || '').replace(/\\/g, '/');
    const uiPatterns = FE_LOCALIZATION.uiPathPatterns || [];
    const isI18nFile = isMultilingualProject(PROJECT_CONFIG) && (uiPatterns.length === 0 || uiPatterns.some(p => p.test(norm)));
    if (isI18nFile) lines.push('', '**I18N:** Multilingual project — if user-visible text changed, update translation resources for all locales.');
    lines.push('');
    const out = lines.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n');
    return asBlock(out);
}

// ═══════════════════════════════════════════════════════════════════════════
// reg10 — scss-styling-context  (Edit|Write|MultiEdit)
// ═══════════════════════════════════════════════════════════════════════════

const SC_section = resolveSection('styling', 'scss') || {};
const SC_GUIDE_PATH = SC_section.guideDoc || null;
const SC_EXTENSIONS = new Set(SC_section.fileExtensions || ['.css', '.sass', '.scss']);
function scIsStyleFile(filePath) {
    return !!filePath && SC_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}
function buildScssStylingContext(payload, preloadedLines) {
    const input = parsePayloadForContext(payload);
    if (!input) return '';
    const { filePath, transcriptPath } = input;
    if (!scIsStyleFile(filePath)) return '';
    if (wasRecentlyInjected(transcriptPath, STYLING_CONTEXT, DEDUP_LINES.STYLING_CONTEXT, preloadedLines)) return '';

    const lines = ['', STYLING_CONTEXT, `**File:** ${path.basename(filePath)}`, ''];
    if (SC_GUIDE_PATH) lines.push(`Read \`${SC_GUIDE_PATH}\` — SCSS conventions, BEM patterns, variables, mixins.`);
    lines.push('', '**Critical:** BEM classes on ALL template elements (`block__element --modifier`). No magic numbers. Max 3 nesting levels.', '');
    const out = lines.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n');
    return asBlock(out);
}

// ═══════════════════════════════════════════════════════════════════════════
// reg10 — lessons-injector  (Edit|Write|MultiEdit)
// ═══════════════════════════════════════════════════════════════════════════

function buildLessons(payload, preloadedLines) {
    // Legacy hook had NO internal tool gate (reg matcher gated it to Edit|Write|MultiEdit).
    // Self-gate here to preserve that registration semantics.
    if (!isEditish(payload.tool_name)) return '';
    const result = injectLessons(payload.transcript_path || '', false, preloadedLines);
    return asBlock(result || '');
}

// ═══════════════════════════════════════════════════════════════════════════
// reg11 — role-context-injector  (Write only, per settings reg)
// ═══════════════════════════════════════════════════════════════════════════

const ROLE_PATH_MAPPINGS = {
    'team-artifacts/ideas/': { role: 'product-owner', skill: 'product-owner', template: '.claude/docs/team-artifacts/templates/idea-template.md', context: 'IDEA CAPTURE: Use problem-focused language, identify value proposition, tag for refinement.' },
    'team-artifacts/pbis/stories/': { role: 'business-analyst', skill: 'business-analyst', template: '.claude/docs/team-artifacts/templates/user-story-template.md', context: 'USER STORY: As a... I want... So that... format, 3+ scenarios per story.' },
    'team-artifacts/pbis/': { role: 'business-analyst', skill: 'business-analyst', template: '.claude/docs/team-artifacts/templates/pbi-template.md', context: 'PBI CREATION: GIVEN/WHEN/THEN format required, INVEST criteria, numeric priority.' },
    'team-artifacts/design-specs/': { role: 'ui-ux-designer', skill: 'design-spec', template: '.claude/docs/team-artifacts/templates/design-spec-template.md', context: 'DESIGN SPEC: Include component states, design tokens, accessibility requirements.' }
};
const ROLE_NAMING = {
    'product-owner': '{YYMMDD}-po-{type}-{slug}.md',
    'business-analyst': '{YYMMDD}-ba-{type}-{slug}.md',
    'qa-engineer': '{YYMMDD}-qa-{type}-{slug}.md',
    'ui-ux-designer': '{YYMMDD}-ux-{type}-{slug}.md',
    'project-manager': '{YYMMDD}-pm-{type}-{slug}.md'
};
const ROLE_CHECKLISTS = {
    'product-owner': ['- [ ] Problem statement user-focused', '- [ ] Value proposition quantified', '- [ ] Priority numeric (not High/Med/Low)', '- [ ] Dependencies listed'],
    'business-analyst': ['- [ ] User story format correct', '- [ ] 3+ scenarios (positive, negative, edge)', '- [ ] GIVEN/WHEN/THEN format', '- [ ] INVEST criteria met'],
    'qa-engineer': ['- [ ] TC-{FEATURE}-{NNN} IDs assigned', '- [ ] Evidence field has [Source: namespace/service/id] abstract anchor (never file:line)', '- [ ] Summary counts match', '- [ ] No template placeholders'],
    'ui-ux-designer': ['- [ ] All states documented', '- [ ] Design tokens specified', '- [ ] Accessibility notes included', '- [ ] Responsive breakpoints defined'],
    'project-manager': ['- [ ] Metrics calculated', '- [ ] Blockers identified', '- [ ] Action items assigned', '- [ ] Risks documented']
};
function roleFindConfig(filePath) {
    const sorted = Object.entries(ROLE_PATH_MAPPINGS).sort((a, b) => b[0].length - a[0].length);
    for (const [pathPrefix, cfg] of sorted) {
        if (normalizePathForComparison(filePath).includes(pathPrefix.toLowerCase())) return cfg;
    }
    return null;
}
function buildRoleContext(payload /*, preloadedLines */) {
    const toolName = payload.tool_name || '';
    // settings.json registers role-context on Write ONLY → match Write only.
    if (toolName !== 'Write') return '';
    const toolInput = payload.tool_input || {};
    const filePath = toolInput.file_path || toolInput.path || '';
    if (!filePath) return '';
    const cfg = roleFindConfig(filePath);
    if (!cfg) return '';

    const date = new Date();
    const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '');
    const namingPattern = ROLE_NAMING[cfg.role] || '{YYMMDD}-{role}-{type}-{slug}.md';
    const checklist = ROLE_CHECKLISTS[cfg.role] || [];
    const lines = [
        '',
        '## Role Context (auto-injected)',
        '',
        `**Active Role:** ${cfg.role}`,
        `**Skill:** ${cfg.skill}`,
        `**Template:** ${cfg.template}`,
        `**Naming:** ${namingPattern.replace('{YYMMDD}', dateStr)}`,
        '',
        '### Context',
        cfg.context,
        '',
        '### Quality Checklist',
        ...checklist,
        ''
    ];
    return asBlock(lines.join('\n'));
}

// ═══════════════════════════════════════════════════════════════════════════
// reg13 — spec-context  (Write|Edit|MultiEdit)
// ═══════════════════════════════════════════════════════════════════════════

const SPEC_FEATURE_DOCS_PATH = getSpecDocsPath();
const SPEC_CONTEXT_TEXT = `
## Feature Docs Context (auto-injected)

**Format:** Tech-free 8-section Feature Spec. Activate \`/spec\` skill before editing.

**Read first:** \`docs/project-reference/feature-spec-reference.md\`, \`docs/project-reference/spec-system-reference.md\`, and \`docs/project-reference/spec-principles.md\`. For behavior/public-contract changes, also read \`docs/project-reference/workflow-spec-test-code-cycle-reference.md\`.

**8 sections (exact order):** 1. Overview · 2. Glossary · 3. User Stories & Acceptance Criteria · 4. Business Rules · 5. Domain Model · 6. Process Flows · 7. Permissions & Roles · 8. Test Specifications — then a trailing Change History. No technical sections (Commands/Events/API/Cross-Service/Performance/Troubleshooting) — code is the technical source of truth.

**Mandatory:**
- §1-7 prose is STRICTLY tech-free — no framework/product/language/persistence/messaging/auth names (banned tokens → \`spec-principles.md\` §3.2). Technical identifiers live ONLY in evidence carriers.
- Section 5 (Domain Model): Mermaid ERD + \`[Source: component/{service}/{id}]\` abstract anchor per entity (cannot be omitted)
- Section 4 (Business Rules): \`[Source: rule/{service}/{id}]\` abstract anchor per rule group
- Section 8 (Test Specifications): canonical TC source — TC-{FEATURE}-{NNN} IDs, each carrying a hidden \`[Source: namespace/service/id]\` carrier + an \`IntegrationTest:\` field

**Rules:**
- TC IDs live in Section 8 only — never authored in \`docs/specs/\` directly
- Section 8 authored via \`/spec [mode=tests]\`; \`/spec [mode=init]\` populates it only during initial authoring
- Size caps: body (sections 1-7) ≤1200 lines, whole file ≤1800 (hard). Split the capability when body>1200 OR TCs>40
- Change History entry required for every functional change (trailing section)
`;
function buildSpecContext(payload /*, preloadedLines */) {
    const toolName = payload.tool_name || '';
    if (!['Write', 'Edit', 'MultiEdit'].includes(toolName)) return '';
    const toolInput = payload.tool_input || {};
    const filePath = toolInput.file_path || toolInput.path || '';
    if (!filePath) return '';
    const normalizedPath = normalizePathForComparison(filePath);
    if (!normalizedPath.includes(SPEC_FEATURE_DOCS_PATH.toLowerCase())) return '';
    return asBlock(SPEC_CONTEXT_TEXT);
}

// ═══════════════════════════════════════════════════════════════════════════
// reg17 — artifact-path-resolver  (Write only)
// ═══════════════════════════════════════════════════════════════════════════

const ART_COMMAND_PATH_MAPPINGS = {
    'idea': 'team-artifacts/ideas/',
    'refine': 'team-artifacts/pbis/',
    'story': 'team-artifacts/pbis/stories/',
    'spec [mode=tests]': getSpecDocsPath(),
    'design-spec': 'team-artifacts/design-specs/',
    'quality-gate': 'team-artifacts/qc-reports/'
};
const ART_TYPE_MAPPING = { 'idea': 'idea', 'refine': 'pbi', 'story': 'story', 'spec [mode=tests]': 'testspec', 'design-spec': 'designspec', 'quality-gate': 'gate' };
const ART_ROLE_MAPPING = { 'idea': 'po', 'refine': 'ba', 'story': 'ba', 'spec [mode=tests]': 'qa', 'design-spec': 'ux', 'quality-gate': 'qc' };
function artExtractSlug(input) {
    return input.toLowerCase().replace(/\.md$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'unnamed';
}
function artDetectCommand(filePath) {
    const normalizedPath = (normalizePath(filePath) || '').toLowerCase();
    for (const [command, pathPrefix] of Object.entries(ART_COMMAND_PATH_MAPPINGS)) {
        if (normalizedPath.includes(pathPrefix.toLowerCase())) return command;
    }
    return null;
}
function buildArtifactPath(payload /*, preloadedLines */) {
    const toolName = payload.tool_name || '';
    if (toolName !== 'Write') return '';
    const toolInput = payload.tool_input || {};
    const filePath = toolInput.file_path || '';
    if (!filePath) return '';
    const command = artDetectCommand(filePath);
    if (!command) return '';
    const basePath = ART_COMMAND_PATH_MAPPINGS[command];
    if (!basePath) return '';

    const date = new Date();
    const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '');
    const role = ART_ROLE_MAPPING[command];
    const type = ART_TYPE_MAPPING[command];
    const slug = artExtractSlug(path.basename(filePath));
    const filename = role ? `${dateStr}-${role}-${type}-${slug}.md` : `${dateStr}-${type}-${slug}.md`;
    const fullPath = `${basePath}${filename}`;

    const out = [
        '',
        '## Artifact Path (auto-resolved)',
        '',
        `**Command:** /${command}`,
        `**Suggested Path:** ${fullPath}`,
        `**Pattern:** {YYMMDD}-{role}-{type}-{slug}.md`,
        ''
    ].join('\n');
    return asBlock(out);
}

// ═══════════════════════════════════════════════════════════════════════════
// reg7 — graph-context-injector  (Skill|Agent)  — SIDE EFFECT: runs graph
// ═══════════════════════════════════════════════════════════════════════════

const GRAPH_SKILLS = new Set([
    'code-review', 'review-changes', 'review-architecture', 'sre-review',
    'graph-blast-radius', 'scout', 'debug', 'fix', 'code-simplifier',
    'refactoring', 'prove-fix', 'security-review', 'performance-review'
]);
const GRAPH_AGENT_TYPES = new Set([
    'explore', 'scout', 'code-reviewer', 'debugger', 'backend-developer',
    'frontend-developer', 'fullstack-developer', 'security-auditor',
    'performance-optimizer', 'integration-tester', 'general-purpose'
]);

function buildGraphContext(payload /*, preloadedLines */) {
    // Lazy-require graph utils so a missing graph subsystem can't break module load.
    let graphUtils;
    try { graphUtils = require('./graph-utils.cjs'); } catch { return ''; }
    const { isGraphAvailable, invokeGraph, getGraphDbPath } = graphUtils;

    const toolName = payload.tool_name || '';
    const toolInput = payload.tool_input || {};
    let contextLabel = '';

    if (toolName === 'Skill') {
        const skillName = (toolInput.skill || '').toLowerCase();
        if (!skillName || !GRAPH_SKILLS.has(skillName)) return '';
        contextLabel = `/${skillName}`;
    } else if (toolName === 'Agent') {
        const agentType = (toolInput.subagent_type || '').toLowerCase();
        if (!agentType || !GRAPH_AGENT_TYPES.has(agentType)) return '';
        contextLabel = `agent:${agentType}`;
    } else {
        return '';
    }

    if (!fs.existsSync(getGraphDbPath())) return '';
    const status = isGraphAvailable();
    if (!status.available) return '';
    const result = invokeGraph('graph-blast-radius', [], 8000);
    if (!result || result.status !== 'ok') return '';

    const changedFiles = result.changed_files || [];
    const changedNodes = result.changed_nodes || [];
    const impactedNodes = result.impacted_nodes || [];
    const impactedFiles = result.impacted_files || [];

    if (changedFiles.length === 0) {
        if (toolName === 'Agent') {
            return asBlock([
                `[code-graph] Graph available. Use graph CLI for structural + implicit relationship queries:`,
                `  python .claude/scripts/code_graph trace <file> --direction both --json  # RECOMMENDED: full upstream + downstream system flow`,
                `  python .claude/scripts/code_graph trace <file> --direction downstream --json  # impact analysis only`,
                `  python .claude/scripts/code_graph connections <file> --json  # structural relationships`,
                `  python .claude/scripts/code_graph query callers_of <function> --json`,
                `  python .claude/scripts/code_graph query importers_of <module> --json`,
                `  python .claude/scripts/code_graph search <keyword> --kind Function --json`,
                `  python .claude/scripts/code_graph find-path <source> <target> --json`,
                `  python .claude/scripts/code_graph batch-query <f1> <f2> --json`,
                `  TIP: grep/glob/search first to find entry files, then trace full system flow including MESSAGE_BUS cross-service edges`
            ].join('\n'));
        }
        return asBlock(`[code-graph] No changed files detected. Graph up to date.`);
    }

    const impactCount = impactedNodes.length;
    const risk = impactCount > 20 ? 'HIGH' : impactCount > 5 ? 'MEDIUM' : 'LOW';
    const lines = [
        `[code-graph] Blast Radius Analysis (auto-injected for ${contextLabel})`,
        `Risk: ${risk} | Changed: ${changedFiles.length} files, ${changedNodes.length} nodes | Impacted: ${impactCount} nodes in ${impactedFiles.length} files`
    ];
    if (changedFiles.length > 0) lines.push(`Changed files: ${changedFiles.slice(0, 10).join(', ')}${changedFiles.length > 10 ? ` (+${changedFiles.length - 10} more)` : ''}`);
    if (impactedFiles.length > 0) lines.push(`Impacted files: ${impactedFiles.slice(0, 8).join(', ')}${impactedFiles.length > 8 ? ` (+${impactedFiles.length - 8} more)` : ''}`);
    const prodFuncs = changedNodes.filter(n => n.kind === 'Function' && !n.is_test);
    if (prodFuncs.length > 0) lines.push(`Changed production functions: ${prodFuncs.slice(0, 5).map(n => n.name).join(', ')}${prodFuncs.length > 5 ? ` (+${prodFuncs.length - 5} more)` : ''}`);
    lines.push(`Use: python .claude/scripts/code_graph trace <changed-file> --direction downstream --json for full downstream impact (events, bus messages, cross-service consumers)`);
    return asBlock(lines.join('\n'));
}

// ═══════════════════════════════════════════════════════════════════════════
// reg1 — python-call-guide  (Bash)
// ═══════════════════════════════════════════════════════════════════════════

function buildPythonGuide(payload, preloadedLines) {
    const toolName = payload.tool_name || '';
    if (toolName !== 'Bash') return '';
    const command = payload.tool_input?.command || '';
    if (!/\bpython3?\b/.test(command)) return '';
    if (wasRecentlyInjected(payload.transcript_path || '', PYTHON_GUIDE, DEDUP_LINES.PYTHON_GUIDE, preloadedLines)) return '';

    const platform = process.platform;
    const lines = [`${PYTHON_GUIDE} **Python invocation detected — platform-specific rules:**`];
    if (platform === 'win32') {
        lines.push(
            `  - **Windows (this machine):** use \`py\` (Python Launcher) or \`python\` — NEVER \`python3\` (MS Store alias, exits 49 with "Python was not found")`,
            `  - macOS: use \`python3\`; Linux: use \`python3\``
        );
    } else if (platform === 'darwin') {
        lines.push(
            `  - **macOS (this machine):** use \`python3\` — \`python\` removed on Monterey+`,
            `  - Windows: use \`py\` or \`python\`, NEVER \`python3\`; Linux: use \`python3\``
        );
    } else {
        lines.push(
            `  - **Linux (this machine):** use \`python3\` — \`python\` absent on many distros`,
            `  - Windows: use \`py\` or \`python\`, NEVER \`python3\`; macOS: use \`python3\``
        );
    }
    lines.push(
        `  - **Discover interpreter:** \`which python3 2>/dev/null || which python 2>/dev/null || which py 2>/dev/null\``,
        `  - **Portable fallback:** \`python3 -c "..." 2>/dev/null || python -c "..." 2>/dev/null || py -c "..."\``,
        `  If the command fails with exit 49 or "command not found", switch to the correct binary above.`
    );
    return asBlock(lines.join('\n'));
}

module.exports = {
    asBlock,
    // reg7
    buildGraphContext,
    // reg8
    buildCodeReviewRules,
    buildDevRules,
    buildMindset,
    extractGoldenRules,
    // reg9
    buildMindsetCompact,
    // reg10
    buildKnowledgeContext,
    buildDesignSystemContext,
    buildCodePatterns,
    buildBackendContext,
    buildFrontendContext,
    buildScssStylingContext,
    buildLessons,
    // reg11
    buildRoleContext,
    // reg13
    buildSpecContext,
    // reg16/reg10 (multi-kind)
    buildDesignSystemCanonicalGuide,
    // reg17
    buildArtifactPath,
    // reg1
    buildPythonGuide
};
