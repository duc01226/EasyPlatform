#!/usr/bin/env node
/**
 * Knowledge Context Injector - PreToolUse Hook
 *
 * Injects knowledge work guidelines when editing files in docs/knowledge/.
 * Detects workspace type (research, courses, strategy) and injects relevant
 * template path and research protocol rules.
 *
 * Pattern: docs/knowledge/{research|courses|strategy}/**
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

const path = require("path");
const {
  KNOWLEDGE_CONTEXT: DEDUP_MARKER,
  DEDUP_LINES,
} = require("./lib/dedup-constants.cjs");
const {
  parsePreToolUseInput,
  wasRecentlyInjected,
} = require("./lib/context-injector-base.cjs");

// Workspace type detection — ordered array for explicit match priority
// (specific paths before generic catch-all)
const WORKSPACE_TYPES = [
  {
    key: "research",
    pathRegex: /docs[\\/]knowledge[\\/]research/i,
    template: ".claude/templates/research-report-template.md",
    label: "Research & Synthesis",
  },
  {
    key: "courses",
    pathRegex: /docs[\\/]knowledge[\\/]courses/i,
    template: ".claude/templates/course-outline-template.md",
    label: "Course Material",
  },
  {
    key: "marketing",
    pathRegex: /docs[\\/]knowledge[\\/]strategy[\\/]marketing/i,
    template: ".claude/templates/marketing-strategy-template.md",
    label: "Marketing Strategy",
  },
  {
    key: "business",
    pathRegex: /docs[\\/]knowledge[\\/]strategy[\\/]business/i,
    template: ".claude/templates/business-evaluation-template.md",
    label: "Business Evaluation",
  },
  {
    key: "strategy",
    pathRegex: /docs[\\/]knowledge[\\/]strategy/i,
    template: null,
    label: "Strategy",
  },
];

function detectWorkspaceType(filePath) {
  if (!filePath) return null;
  const normalized = filePath.replace(/\\/g, "/");
  for (const ws of WORKSPACE_TYPES) {
    if (ws.pathRegex.test(normalized)) return ws;
  }
  return null;
}

function shouldInject(filePath, transcriptPath) {
  if (!detectWorkspaceType(filePath)) return false;
  if (
    wasRecentlyInjected(
      transcriptPath,
      DEDUP_MARKER,
      DEDUP_LINES.KNOWLEDGE_CONTEXT,
    )
  )
    return false;
  return true;
}

function buildInjection(filePath) {
  const workspace = detectWorkspaceType(filePath);
  const fileName = path.basename(filePath);

  const lines = [
    "",
    DEDUP_MARKER,
    "",
    `**Workspace:** ${workspace?.label || "Knowledge Work"}`,
    `**File:** ${fileName}`,
    "",
  ];

  // Template guidance
  if (workspace?.template) {
    lines.push(
      "### Template",
      "",
      `Use enforced template: **\`${workspace.template}\`**`,
      "",
    );
  }

  // Research protocol rules
  lines.push(
    "### Knowledge Work Rules",
    "",
    "> **Web Research Protocol** — Every factual claim needs 2+ independent sources. Source tiers: Tier 1 (authoritative .gov/.edu/official docs), Tier 2 (industry reports), Tier 3 (credible blogs — cross-validate), Tier 4 (unverified — NEVER cite as fact). Declare confidence level for all findings.",
    "",
    "1. Follow source hierarchy (official docs > peer-reviewed > industry blogs > forums) for all factual claims",
    "2. Include source citations with Tier classification (inline `[N]`)",
    "3. Cross-validate claims with 2+ independent sources",
    "4. Declare confidence level (95/80/60/<60%) for all findings",
    "5. Use enforced template structure — all sections required",
    "6. Working files → `.claude/tmp/`, final output → `docs/knowledge/`",
    "",
  );

  return lines
    .filter((line, i, arr) => {
      if (line === "" && arr[i - 1] === "") return false;
      return true;
    })
    .join("\n");
}

async function main() {
  try {
    const input = parsePreToolUseInput({ skipKnowledgeCheck: true });
    if (!input) process.exit(0);
    const { filePath, transcriptPath } = input;

    if (!filePath || !shouldInject(filePath, transcriptPath)) process.exit(0);

    const injection = buildInjection(filePath);
    console.log(injection);
    process.exit(0);
  } catch (error) {
    process.exit(0);
  }
}

main();
