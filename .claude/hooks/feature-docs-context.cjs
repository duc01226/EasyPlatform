#!/usr/bin/env node
/**
 * Feature Docs Context Injector Hook
 *
 * Detects writes to docs/business-features/** and injects the 17-section
 * format reminder, mandatory fields, and TC naming conventions.
 *
 * @trigger PreToolUse (Write, Edit)
 * @injects Feature doc format requirements, TC naming, Section 15 canonical source
 *
 * Input: JSON via stdin with tool_name, tool_input
 * Output: Context string via stdout
 * Exit: 0 (non-blocking)
 */

const fs = require('fs');
const { normalizePathForComparison } = require('./lib/ck-path-utils.cjs');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const FEATURE_DOCS_PATH = 'docs/business-features/';

const FEATURE_DOCS_CONTEXT = `
## Feature Docs Context (auto-injected)

**Format:** 17-section template. Activate \`/feature-docs\` skill before editing.

**Mandatory fields:**
- Section 5: Mermaid ERD (cannot be omitted)
- Section 6: \`[Source: file:line]\` citations for every business rule
- Section 15: Canonical TC source — TC-{FEAT}-{NNN} IDs, Evidence field with \`file:line\`

**Rules:**
- TC IDs live in Section 15 only — never in \`docs/specs/\` directly
- To sync TCs to \`docs/specs/\`: run \`/tdd-spec [direction=sync]\` after editing Section 15
- Max 1500 lines per file — split into sub-feature files if exceeded
- CHANGELOG entry required for every functional change (Section 17)
`;

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

        if (!['Write', 'Edit', 'MultiEdit'].includes(toolName)) {
            process.exit(0);
        }

        const filePath = toolInput.file_path || toolInput.path || '';
        if (!filePath) process.exit(0);

        const normalizedPath = normalizePathForComparison(filePath);
        if (!normalizedPath.includes(FEATURE_DOCS_PATH.toLowerCase())) {
            process.exit(0);
        }

        console.log(FEATURE_DOCS_CONTEXT);
        process.exit(0);
    } catch (error) {
        process.exit(0);
    }
}

main();
