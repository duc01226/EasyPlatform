#!/usr/bin/env node
/**
 * Claude Code SessionStart Hook: Session Context
 *
 * Displays relevant context at session start for continuity.
 * Output: Concise context summary
 */

const { execSync } = require("child_process");

// Get current branch
let currentBranch = "main";
try {
  currentBranch = execSync("git branch --show-current", {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "ignore"],
  }).trim();
} catch (e) {
  // Fall back to main
}

// Concise context output
console.log("=== Session Context ===");
console.log(`Branch: ${currentBranch}`);
console.log("");
console.log("Tip: Use Memory MCP to store/recall context:");
console.log("  - mcp__memory__search_nodes: Find relevant context");
console.log("  - mcp__memory__create_entities: Store new learnings");
console.log("  - mcp__memory__add_observations: Add notes to entities");
console.log("");
console.log(
  `Context entities for this session: ProjectContext, UserPreferences, FeatureProgress_${currentBranch}, PatternHistory, RecentDecisions`,
);
