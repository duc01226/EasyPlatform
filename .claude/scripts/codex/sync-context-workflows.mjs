#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import {
  buildSkillReferenceMap,
  prependCodexCompatibilityNote,
  rewriteClaudeToolTermsForCodex,
  rewriteSkillMentionsForCodex,
} from "./compat-rewrite.mjs";

const rootDir = process.cwd();
const require = createRequire(import.meta.url);
const workflowsPath = path.join(rootDir, ".claude", "workflows.json");
const ckConfigPath = path.join(rootDir, ".claude", ".ck.json");
const claudeInstructionsPath = path.join(rootDir, "CLAUDE.md");
const contextPath = path.join(rootDir, ".codex", "CODEX_CONTEXT.md");
const agentsPath = path.join(rootDir, "AGENTS.md");
const sharedSyncInlinePath = path.join(rootDir, ".claude", "skills", "shared", "sync-inline-versions.md");
const sharedAiSddSyncTags = ["ai-sdd-artifact-contract", "ai-sdd-artifact-contract:reminder"];

const SPEC_ROOT_TOKEN = /\{configured-engineering-spec-root\}/g;
const FEATURE_ROOT_TOKEN = /\{configured-feature-doc-root\}/g;

function stripTrailingSlash(value) {
  return typeof value === "string" ? value.replace(/\/+$/, "") : value;
}

function resolvePortabilityTokensFallback(text, config) {
  if (typeof text !== "string" || !text) return text;
  const wp = config?.workflowPatterns || {};
  const specRoot = stripTrailingSlash(wp.engineeringSpecRoot || "docs/specs");
  const featureRoot = stripTrailingSlash(wp.featureDocPath || "docs/business-features");
  return text
    .replace(SPEC_ROOT_TOKEN, () => specRoot)
    .replace(FEATURE_ROOT_TOKEN, () => featureRoot);
}

function loadResolvePortabilityTokens() {
  try {
    return require("../../hooks/lib/project-config-loader.cjs").resolvePortabilityTokens;
  } catch {
    return resolvePortabilityTokensFallback;
  }
}

const resolvePortabilityTokens = loadResolvePortabilityTokens();

const START_MARKER = "<!-- WORKFLOWS:START -->";
const END_MARKER = "<!-- WORKFLOWS:END -->";
const PROMPT_PROTOCOLS_START = "<!-- PROMPT-PROTOCOLS:START -->";
const PROMPT_PROTOCOLS_END = "<!-- PROMPT-PROTOCOLS:END -->";
const PROMPT_PROTOCOLS_BOTTOM_START = "<!-- PROMPT-PROTOCOLS-BOTTOM:START -->";
const PROMPT_PROTOCOLS_BOTTOM_END = "<!-- PROMPT-PROTOCOLS-BOTTOM:END -->";
const AGENTS_CLAUDE_MIRROR_START = "<!-- CLAUDE-MIRROR:START -->";
const AGENTS_CLAUDE_MIRROR_END = "<!-- CLAUDE-MIRROR:END -->";
const AGENTS_CONTEXT_MIRROR_START = "<!-- CODEX-CONTEXT-MIRROR:START -->";
const AGENTS_CONTEXT_MIRROR_END = "<!-- CODEX-CONTEXT-MIRROR:END -->";
const LEGACY_AGENTS_CLAUDE_MERGE_START = "<!-- CLAUDE-MERGE:START -->";
const LEGACY_AGENTS_CLAUDE_MERGE_END = "<!-- CLAUDE-MERGE:END -->";
const PROJECT_REFERENCE_GATE_HEADING = "## Codex Hookless Project Reference Gate";
const PROJECT_REFERENCE_GATE_BODY_LINES = [
  "Codex does not receive Claude hook-injected project docs or project config summaries. Before coding, planning, debugging, testing, or reviewing:",
  "",
  "- Read `docs/project-config.json` for project-specific commands, module paths, workflow settings, and doc paths.",
  "- Read `docs/project-reference/docs-index-reference.md` to route to the right project-reference files.",
  "- Read `docs/project-reference/lessons.md` for always-on project guardrails.",
  "- For situation-specific work, open the referenced project doc directly; do not rely on prior conversation text as proof that the doc is loaded.",
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildManagedBlockPattern(startMarker, endMarker, flags = "m") {
  return new RegExp(
    `^[^\\S\\r\\n]*${escapeRegExp(startMarker)}[^\\S\\r\\n]*$[\\s\\S]*?^[^\\S\\r\\n]*${escapeRegExp(
      endMarker
    )}[^\\S\\r\\n]*$\\n?`,
    flags
  );
}

function stripManagedBlock(text, startMarker, endMarker) {
  const pattern = buildManagedBlockPattern(startMarker, endMarker, "gm");
  return text.replace(pattern, "").trimEnd();
}

function buildAgentsContextMirrorBlock(contextMd) {
  return [
    AGENTS_CONTEXT_MIRROR_START,
    "## Codex Context Mirror (Auto-Synced)",
    "",
    "This block is auto-generated from `.codex/CODEX_CONTEXT.md` by `npm run codex:sync:context`.",
    "Do not edit manually; update Claude sources and re-sync.",
    "",
    contextMd.trim(),
    AGENTS_CONTEXT_MIRROR_END,
  ].join("\n");
}

function buildAgentsClaudeMirrorBlock(claudeMd) {
  return [
    AGENTS_CLAUDE_MIRROR_START,
    "## Claude Instructions Mirror (Auto-Synced)",
    "",
    "This block is auto-generated from `CLAUDE.md` by `npm run codex:sync:context`.",
    "Do not edit manually; update `CLAUDE.md` and re-sync.",
    "",
    claudeMd.trim(),
    AGENTS_CLAUDE_MIRROR_END,
  ].join("\n");
}

function buildProjectReferenceGateSection() {
  return [
    PROJECT_REFERENCE_GATE_HEADING,
    "",
    ...PROJECT_REFERENCE_GATE_BODY_LINES,
  ].join("\n");
}

function stripProjectReferenceGateSection(contextMd) {
  let nextText = contextMd.replace(/\r\n?/g, "\n");
  const pattern = new RegExp(
    `(?:^|\\n)${escapeRegExp(PROJECT_REFERENCE_GATE_HEADING)}\\n[\\s\\S]*?(?=\\n(?:## |<!-- [A-Z-]+:START -->)|$)`,
    "g"
  );

  while (nextText.includes(PROJECT_REFERENCE_GATE_HEADING)) {
    const strippedText = nextText.replace(pattern, "");
    if (strippedText === nextText) break;
    nextText = strippedText;
  }

  const orphanBodyPattern = new RegExp(
    `(?:^|\\n)${escapeRegExp(PROJECT_REFERENCE_GATE_BODY_LINES.join("\n"))}(?=\\n(?:## |<!-- [A-Z-]+:START -->)|\\n\\n(?:## |<!-- [A-Z-]+:START -->)|$)`,
    "g"
  );
  nextText = nextText.replace(orphanBodyPattern, "");

  return nextText.replace(/\n{3,}/g, "\n\n").trimEnd();
}

function upsertProjectReferenceGateSection(contextMd) {
  const contextWithoutGate = stripProjectReferenceGateSection(contextMd);
  const gateSection = buildProjectReferenceGateSection();
  const criticalThinkingHeading = "\n## Critical Thinking Mindset";

  if (contextWithoutGate.includes(criticalThinkingHeading)) {
    return contextWithoutGate.replace(
      criticalThinkingHeading,
      `\n\n${gateSection}\n${criticalThinkingHeading}`
    );
  }

  const firstTitleMatch = contextWithoutGate.match(/^# [^\n]*(?:\n|$)/m);
  if (firstTitleMatch?.index !== undefined) {
    const insertIndex = firstTitleMatch.index + firstTitleMatch[0].length;
    return `${contextWithoutGate.slice(0, insertIndex).trimEnd()}\n\n${gateSection}\n\n${contextWithoutGate
      .slice(insertIndex)
      .trimStart()}`.trimEnd();
  }

  return `${gateSection}\n\n${contextWithoutGate.trimStart()}`.trimEnd();
}

async function upsertContextIntoAgents(contextMd, claudeMd) {
  const hasClaudeMirror = typeof claudeMd === "string" && claudeMd.trim().length > 0;
  const claudeBlock = hasClaudeMirror ? buildAgentsClaudeMirrorBlock(claudeMd) : null;
  const mirrorBlock = buildAgentsContextMirrorBlock(contextMd);
  let agentsMd = "";
  try {
    agentsMd = await fs.readFile(agentsPath, "utf8");
  } catch {
    // Create AGENTS.md if it doesn't exist; keep minimum stable preface.
    agentsMd = "# Codex Project Instructions\n";
  }
  agentsMd = agentsMd.replace(/\r\n?/g, "\n");
  agentsMd = stripManagedBlock(
    agentsMd,
    LEGACY_AGENTS_CLAUDE_MERGE_START,
    LEGACY_AGENTS_CLAUDE_MERGE_END
  );

  const claudeManagedBlockPattern = buildManagedBlockPattern(
    AGENTS_CLAUDE_MIRROR_START,
    AGENTS_CLAUDE_MIRROR_END,
    "m"
  );
  const managedBlockPattern = buildManagedBlockPattern(
    AGENTS_CONTEXT_MIRROR_START,
    AGENTS_CONTEXT_MIRROR_END,
    "m"
  );

  if (hasClaudeMirror && claudeManagedBlockPattern.test(agentsMd)) {
    agentsMd = agentsMd.replace(claudeManagedBlockPattern, `${claudeBlock}\n`);
  } else if (hasClaudeMirror && managedBlockPattern.test(agentsMd)) {
    agentsMd = agentsMd.replace(managedBlockPattern, `${claudeBlock}\n\n${mirrorBlock}\n`);
  } else if (hasClaudeMirror) {
    agentsMd = `${agentsMd.trimEnd()}\n\n${claudeBlock}\n`;
  } else {
    agentsMd = agentsMd.replace(claudeManagedBlockPattern, "");
  }

  if (managedBlockPattern.test(agentsMd)) {
    agentsMd = agentsMd.replace(managedBlockPattern, `${mirrorBlock}\n`);
  } else {
    agentsMd = `${agentsMd.trimEnd()}\n\n${mirrorBlock}\n`;
  }

  await fs.writeFile(agentsPath, agentsMd, "utf8");
}

async function readExistingContext() {
  try {
    return (await fs.readFile(contextPath, "utf8")).replace(/\r\n?/g, "\n");
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
    return "# Codex Context\n";
  }
}

async function readClaudeInstructions() {
  try {
    return (await fs.readFile(claudeInstructionsPath, "utf8")).replace(/\r\n?/g, "\n");
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
    return null;
  }
}

function safeLine(value) {
  if (typeof value !== "string") return "";
  return value.replace(/\r?\n/g, " ").trim();
}

function toWorkflowEntries(workflows) {
  if (!workflows) return [];
  if (Array.isArray(workflows)) {
    return workflows.map((w, idx) => {
      const id = w?.id || w?.workflowId || w?.slug || w?.name || `workflow-${idx + 1}`;
      return [id, w];
    });
  }
  return Object.entries(workflows);
}

function buildWorkflowSection(workflowEntries) {
  const sorted = [...workflowEntries].sort((a, b) => a[0].localeCompare(b[0]));
  const lines = [];

  lines.push("## Workflow Protocol (Hookless)");
  lines.push("");
  lines.push("Use this protocol for workflow execution in Codex (no hook dependency):");
  lines.push("1. Detect: match request against workflow catalog.");
  lines.push("2. Analyze: choose best-fit workflow and evaluate custom combination if needed.");
  lines.push('3. Ask: when a workflow match is detected, ask "Which workflow do you want to activate?" with the recommended standard workflow and a custom option before activation.');
  lines.push("4. Activate: execute selected workflow sequence.");
  lines.push("5. Tasking: create tasks for each workflow step.");
  lines.push("6. Execute: run steps in order, validate outputs, and report completion.");
  lines.push("");
  lines.push(`Workflow source: \`.claude/workflows.json\` (${sorted.length} workflows).`);
  lines.push("");
  lines.push("## Workflow Catalog");
  lines.push("");

  for (const [workflowId, workflow] of sorted) {
    const name = safeLine(workflow?.name) || workflowId;
    const description = safeLine(resolvePortabilityTokens(workflow?.description));
    const whenToUse = safeLine(workflow?.whenToUse);
    const whenNotToUse = safeLine(workflow?.whenNotToUse);
    const sequence = Array.isArray(workflow?.sequence) ? workflow.sequence : [];
    const protocol = resolvePortabilityTokens(workflow?.preActions?.injectContext);

    lines.push(`### ${workflowId} — ${name}`);
    if (description) lines.push(`- Description: ${description}`);
    if (whenToUse) lines.push(`- When To Use: ${whenToUse}`);
    if (whenNotToUse) lines.push(`- When Not To Use: ${whenNotToUse}`);
    lines.push(`- Sequence: ${sequence.length > 0 ? `\`${sequence.join(" -> ")}\`` : "_none_"}`);
    lines.push("");
    lines.push("Protocol:");
    lines.push("```text");
    lines.push(typeof protocol === "string" && protocol.trim().length > 0 ? protocol.trim() : "No injectContext protocol defined.");
    lines.push("```");
    lines.push("");
  }

  return lines.join("\n");
}

function normalizePromptProtocolText(text) {
  if (!text || typeof text !== "string") return null;
  const normalized = text.trim();
  return normalized.length > 0 ? normalized : null;
}

function extractSyncBlock(markdown, tag) {
  const marker = `## SYNC:${tag}`;
  const start = markdown.indexOf(marker);
  if (start === -1) return null;

  const next = markdown.indexOf("\n---\n\n## SYNC:", start + marker.length);
  const end = next === -1 ? markdown.length : next;
  return markdown.slice(start, end).trim();
}

async function buildSharedAiSddMarkerSection() {
  try {
    const content = await fs.readFile(sharedSyncInlinePath, "utf8");
    const blocks = sharedAiSddSyncTags.map((tag) => extractSyncBlock(content, tag)).filter(Boolean);
    if (blocks.length === 0) return null;

    return [
      "## Shared AI-SDD Protocol Markers",
      "",
      "Source: `.claude/skills/shared/sync-inline-versions.md`",
      "",
      blocks.join("\n\n---\n\n"),
    ].join("\n");
  } catch {
    return null;
  }
}

async function loadCkConfig() {
  try {
    const ckConfigRaw = await fs.readFile(ckConfigPath, "utf8");
    return JSON.parse(ckConfigRaw);
  } catch {
    return {};
  }
}

async function buildPromptProtocolMirrorSection(headingSuffix = "Auto-Synced") {
  const promptInjectionsPath = path.join(rootDir, ".claude", "hooks", "lib", "prompt-injections.cjs");
  try {
    const promptInjections = require(promptInjectionsPath);
    const ckConfig = await loadCkConfig();
    const mode = ckConfig?.workflow?.confirmationMode;
    const confirmationMode = mode === "never" ? "never" : "always";
    const portability = ckConfig?.portability ?? {};
    const sections = [
      normalizePromptProtocolText(
        promptInjections.injectWorkflowProtocol?.("", confirmationMode, portability)
      ),
      normalizePromptProtocolText(await buildSharedAiSddMarkerSection()),
      normalizePromptProtocolText(
        "**[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes."
      ),
    ].filter(Boolean);

    if (sections.length === 0) {
      return [
        `## Prompt Protocol Mirror (${headingSuffix})`,
        "",
        "No prompt-injection protocols resolved from Claude source hooks.",
      ].join("\n");
    }

    return [
      `## Prompt Protocol Mirror (${headingSuffix})`,
      "",
      "Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`",
      "",
      ...sections,
    ].join("\n");
  } catch {
    return [
      `## Prompt Protocol Mirror (${headingSuffix})`,
      "",
      "Unable to load `.claude/hooks/lib/prompt-injections.cjs` during sync.",
    ].join("\n");
  }
}

async function main() {
  const claudeInstructionsRaw = await readClaudeInstructions();
  const workflowsRaw = await fs.readFile(workflowsPath, "utf8");
  const workflowsDoc = JSON.parse(workflowsRaw);
  const workflowEntries = toWorkflowEntries(workflowsDoc.workflows);
  const skillNames = await fs
    .readdir(path.join(rootDir, ".claude", "skills"), { withFileTypes: true })
    .then((entries) => entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name));
  const skillReferenceMap = buildSkillReferenceMap(skillNames);
  const generatedSection = prependCodexCompatibilityNote(
    rewriteClaudeToolTermsForCodex(
      rewriteSkillMentionsForCodex(buildWorkflowSection(workflowEntries), skillReferenceMap)
    )
  );
  const topPromptProtocolSection = prependCodexCompatibilityNote(
    rewriteClaudeToolTermsForCodex(
      rewriteSkillMentionsForCodex(
        await buildPromptProtocolMirrorSection("Auto-Synced, Primacy Anchor"),
        skillReferenceMap
      )
    )
  );

  await fs.mkdir(path.dirname(contextPath), { recursive: true });
  let contextMd = await readExistingContext();
  const promptProtocolTopBlock = `${PROMPT_PROTOCOLS_START}\n${topPromptProtocolSection}\n${PROMPT_PROTOCOLS_END}`;
  const replacementBlock = `${START_MARKER}\n${generatedSection}\n${END_MARKER}`;

  // Keep one mirrored prompt protocol block at top; strip legacy bottom block if present.
  contextMd = stripManagedBlock(contextMd, PROMPT_PROTOCOLS_START, PROMPT_PROTOCOLS_END);
  contextMd = stripManagedBlock(contextMd, PROMPT_PROTOCOLS_BOTTOM_START, PROMPT_PROTOCOLS_BOTTOM_END);
  contextMd = `${promptProtocolTopBlock}\n\n${contextMd.trimStart()}`;
  contextMd = upsertProjectReferenceGateSection(contextMd);

  if (contextMd.includes(START_MARKER) && contextMd.includes(END_MARKER)) {
    const pattern = new RegExp(
      `${START_MARKER}[\\s\\S]*?${END_MARKER}`,
      "m"
    );
    contextMd = contextMd.replace(pattern, replacementBlock);
  } else {
    contextMd = `${contextMd.trim()}\n\n${replacementBlock}\n`;
  }

  // Keep the full context Codex-safe, including previously static sections.
  contextMd = rewriteClaudeToolTermsForCodex(
    rewriteSkillMentionsForCodex(contextMd, skillReferenceMap)
  );
  contextMd = `${contextMd.trimEnd()}\n`;

  const claudeInstructionsMd = claudeInstructionsRaw
    ? rewriteClaudeToolTermsForCodex(
        rewriteSkillMentionsForCodex(claudeInstructionsRaw, skillReferenceMap)
      )
    : null;

  await fs.writeFile(contextPath, contextMd, "utf8");
  await upsertContextIntoAgents(contextMd, claudeInstructionsMd);
  console.log(
    `[codex-context-sync] synced ${workflowEntries.length} workflow(s) into ${path.relative(rootDir, contextPath)} and mirrored CLAUDE.md + context into ${path.relative(rootDir, agentsPath)}`
  );
}

await main();
