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
const contextPath = path.join(rootDir, ".codex", "CODEX_CONTEXT.md");
const agentsPath = path.join(rootDir, "AGENTS.md");

const START_MARKER = "<!-- WORKFLOWS:START -->";
const END_MARKER = "<!-- WORKFLOWS:END -->";
const PROMPT_PROTOCOLS_START = "<!-- PROMPT-PROTOCOLS:START -->";
const PROMPT_PROTOCOLS_END = "<!-- PROMPT-PROTOCOLS:END -->";
const PROMPT_PROTOCOLS_BOTTOM_START = "<!-- PROMPT-PROTOCOLS-BOTTOM:START -->";
const PROMPT_PROTOCOLS_BOTTOM_END = "<!-- PROMPT-PROTOCOLS-BOTTOM:END -->";
const AGENTS_CONTEXT_MIRROR_START = "<!-- CODEX-CONTEXT-MIRROR:START -->";
const AGENTS_CONTEXT_MIRROR_END = "<!-- CODEX-CONTEXT-MIRROR:END -->";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildManagedBlockPattern(startMarker, endMarker, flags = "m") {
  return new RegExp(
    `^\\s*${escapeRegExp(startMarker)}\\s*$[\\s\\S]*?^\\s*${escapeRegExp(
      endMarker
    )}\\s*$\\n?`,
    flags
  );
}

function stripManagedBlock(text, startMarker, endMarker) {
  const pattern = buildManagedBlockPattern(startMarker, endMarker, "gm");
  return text.replace(pattern, "").trim();
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

async function upsertContextIntoAgents(contextMd) {
  const mirrorBlock = buildAgentsContextMirrorBlock(contextMd);
  let agentsMd = "";
  try {
    agentsMd = await fs.readFile(agentsPath, "utf8");
  } catch {
    // Create AGENTS.md if it doesn't exist; keep minimum stable preface.
    agentsMd = "# Codex Project Instructions\n";
  }

  const managedBlockPattern = buildManagedBlockPattern(
    AGENTS_CONTEXT_MIRROR_START,
    AGENTS_CONTEXT_MIRROR_END,
    "m"
  );

  if (managedBlockPattern.test(agentsMd)) {
    agentsMd = agentsMd.replace(managedBlockPattern, `${mirrorBlock}\n`);
  } else {
    agentsMd = `${agentsMd.trimEnd()}\n\n${mirrorBlock}\n`;
  }

  await fs.writeFile(agentsPath, agentsMd, "utf8");
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
  lines.push("3. Confirm: if workflow requires confirmation or ambiguity exists, ask user before activation.");
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
    const description = safeLine(workflow?.description);
    const whenToUse = safeLine(workflow?.whenToUse);
    const whenNotToUse = safeLine(workflow?.whenNotToUse);
    const confirmFirst = Boolean(workflow?.confirmFirst);
    const sequence = Array.isArray(workflow?.sequence) ? workflow.sequence : [];
    const protocol = workflow?.preActions?.injectContext;

    lines.push(`### ${workflowId} — ${name}`);
    if (description) lines.push(`- Description: ${description}`);
    lines.push(`- Confirm First: ${confirmFirst ? "yes" : "no"}`);
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

async function loadWorkflowConfirmationMode() {
  try {
    const ckConfigPath = path.join(rootDir, ".claude", ".ck.json");
    const ckConfigRaw = await fs.readFile(ckConfigPath, "utf8");
    const ckConfig = JSON.parse(ckConfigRaw);
    const mode = ckConfig?.workflow?.confirmationMode;
    return mode === "never" ? "never" : "always";
  } catch {
    return "always";
  }
}

async function buildPromptProtocolMirrorSection(headingSuffix = "Auto-Synced") {
  const promptInjectionsPath = path.join(rootDir, ".claude", "hooks", "lib", "prompt-injections.cjs");
  try {
    const promptInjections = require(promptInjectionsPath);
    const confirmationMode = await loadWorkflowConfirmationMode();
    const sections = [
      normalizePromptProtocolText(
        promptInjections.injectWorkflowProtocol?.("", confirmationMode)
      ),
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

  let contextMd = await fs.readFile(contextPath, "utf8");
  const promptProtocolTopBlock = `${PROMPT_PROTOCOLS_START}\n${topPromptProtocolSection}\n${PROMPT_PROTOCOLS_END}`;
  const replacementBlock = `${START_MARKER}\n${generatedSection}\n${END_MARKER}`;

  // Keep one mirrored prompt protocol block at top; strip legacy bottom block if present.
  contextMd = stripManagedBlock(contextMd, PROMPT_PROTOCOLS_START, PROMPT_PROTOCOLS_END);
  contextMd = stripManagedBlock(contextMd, PROMPT_PROTOCOLS_BOTTOM_START, PROMPT_PROTOCOLS_BOTTOM_END);
  contextMd = `${promptProtocolTopBlock}\n\n${contextMd.trimStart()}`;

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

  await fs.writeFile(contextPath, contextMd, "utf8");
  await upsertContextIntoAgents(contextMd);
  console.log(
    `[codex-context-sync] synced ${workflowEntries.length} workflow(s) into ${path.relative(rootDir, contextPath)} and mirrored context into ${path.relative(rootDir, agentsPath)}`
  );
}

await main();
