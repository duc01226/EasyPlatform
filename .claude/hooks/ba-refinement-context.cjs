#!/usr/bin/env node
/**
 * BA Refinement Context Injector Hook
 *
 * Detects writes to BA artifact paths (team-artifacts/pbis/, ideas/, stories/)
 * and injects condensed BA team process context: decision model, role scopes,
 * DoR checklist, and refinement cadence.
 *
 * Complements role-context-injector.cjs (which handles naming/template).
 * This hook handles team process/decision context.
 *
 * @trigger PreToolUse (Write, Edit)
 * @injects BA team decision model, role scopes, DoR checklist, refinement cadence
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

// Paths that trigger BA context injection
const BA_ARTIFACT_PATHS = ['team-artifacts/pbis/stories/', 'team-artifacts/pbis/', 'team-artifacts/ideas/'];

// Condensed BA team context (~700 bytes)
const BA_CONTEXT = `
## BA Team Refinement Context (auto-injected)

**Decision Model:** 2/3 majority vote (UX BA + Designer BA + Dev BA PIC). Dev BA PIC has technical veto.
**Disagree-and-Commit:** Once decided, everyone commits. No re-litigating.
**Grooming Override:** BA team decision changes only if >75% of remaining team votes to override.

**Role Scopes:**
- **UX BA:** UI/UX flows, wireframes, interaction AC, user research
- **Designer BA:** Design feasibility, product thinking, visual design, equal vote
- **Dev BA PIC:** Technical feasibility review, AI pre-review, DoR gate, grooming presentation

**DoR Gate (ALL must pass before grooming):**
- [ ] User story template (As a... I want... So that...)
- [ ] AC testable (GIVEN/WHEN/THEN, no vague language)
- [ ] Wireframes attached (UX BA) + UI design ready (Designer BA)
- [ ] AI pre-review passed (/refine-review or /pbi-challenge)
- [ ] Story points estimated by AI
- [ ] Dependencies table complete

**Refinement Cadence:** Always one sprint ahead. Weekly meeting (60 min + ~3h async).
**Skills:** Use \`/pbi-challenge\` for collaborative review, \`/dor-gate\` before grooming.
**Protocols:** \`ba-team-decision-model-protocol.md\`, \`refinement-dor-checklist-protocol.md\`
`;

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if path matches any BA artifact path
 */
function isBAPath(filePath) {
    const normalizedPath = normalizePathForComparison(filePath);
    return BA_ARTIFACT_PATHS.some(baPath => normalizedPath.includes(baPath.toLowerCase()));
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

        // Only process Write/Edit operations
        if (!['Write', 'Edit', 'MultiEdit'].includes(toolName)) {
            process.exit(0);
        }

        // Extract file path from tool input
        const filePath = toolInput.file_path || toolInput.path || '';
        if (!filePath) process.exit(0);

        // Check if path matches BA artifact paths
        if (!isBAPath(filePath)) process.exit(0);

        // Output the BA context injection
        console.log(BA_CONTEXT);
        process.exit(0);
    } catch (error) {
        // Non-blocking - exit silently on error
        process.exit(0);
    }
}

main();
