#!/usr/bin/env node
/**
 * Test Specs Context Injector Hook
 *
 * Detects writes to docs/specs/** (excluding docs/specs/engineering/**)
 * and injects a READ-ONLY reminder with the full sync chain.
 *
 * Engineering specs under docs/specs/ are writable by
 * workflow-spec-driven-dev and are intentionally excluded from this guard.
 *
 * @trigger PreToolUse (Write, Edit)
 * @injects READ-ONLY reminder and sync chain for docs/specs/
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

const TEST_SPECS_PATH = 'docs/specs/';
const ENGINEERING_SPECS_PATH = 'docs/specs/';

const TEST_SPECS_CONTEXT = `
## Test Specs Context (auto-injected)

**⚠️ READ-ONLY sync artifact** — Do NOT write to \`docs/specs/\` directly.

**Sync chain:**
\`/tdd-spec\` → Section 15 (feature doc) → \`/tdd-spec [direction=sync]\` → \`docs/specs/\` → \`/integration-test\`

**To modify a TC:**
1. Edit Section 15 in the corresponding \`docs/business-features/{Service}/detailed-features/{Feature}.md\`
2. Run \`/tdd-spec [direction=sync]\` to regenerate \`docs/specs/\`

**Why:** \`docs/specs/\` is derived output. Editing here means Section 15 and the sync chain will become stale.
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

        // Must be in docs/specs/ but NOT in docs/specs/ (engineering path now merged)
        // Note: old docs/test-specs/engineering/ is now docs/specs/{app-bucket}/{system-name}/
        if (!normalizedPath.includes(TEST_SPECS_PATH.toLowerCase())) {
            process.exit(0);
        }
        if (normalizedPath.includes(ENGINEERING_SPECS_PATH.toLowerCase())) {
            process.exit(0);
        }

        console.log(TEST_SPECS_CONTEXT);
        process.exit(0);
    } catch (error) {
        process.exit(0);
    }
}

main();
