#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
  buildSkillReferenceMap,
  rewriteClaudeToolTermsForCodex,
  rewriteSkillMentionsForCodex,
} from "./compat-rewrite.mjs";
import { writeFileTransientSafe } from "../lib/write-file-transient-safe.mjs";

const require = createRequire(import.meta.url);
const { resolveMutationProjectRoot, isInvokedAsScript } = require("../lib/project-root.cjs");
const rootResolution = resolveMutationProjectRoot({
  cwd: process.cwd(),
  scriptPath: fileURLToPath(import.meta.url),
  env: process.env,
});
const rootDir = rootResolution.rootDir;

// AGENTS.md is the cross-tool projection of the project root file (CLAUDE.md). It carries project
// information only: the framework rules every agent follows are delivered by hooks on every
// supported host (Claude, Codex, OpenCode), never written into a root file.
const claudeInstructionsPath = path.join(rootDir, "CLAUDE.md");
// The retired Codex context file. The sync removes it; it is exported so the divergence oracle and
// the verifiers can assert it is gone.
const contextPath = path.join(rootDir, ".codex", "CODEX_CONTEXT.md");
const agentsPath = path.join(rootDir, "AGENTS.md");

const AGENTS_CLAUDE_MIRROR_START = "<!-- CLAUDE-MIRROR:START -->";
const AGENTS_CLAUDE_MIRROR_END = "<!-- CLAUDE-MIRROR:END -->";
// Managed blocks older syncs wrote into AGENTS.md; every sync strips them and writes the one block above.
const AGENTS_CONTEXT_MIRROR_START = "<!-- CODEX-CONTEXT-MIRROR:START -->";
const AGENTS_CONTEXT_MIRROR_END = "<!-- CODEX-CONTEXT-MIRROR:END -->";
const LEGACY_AGENTS_CLAUDE_MERGE_START = "<!-- CLAUDE-MERGE:START -->";
const LEGACY_AGENTS_CLAUDE_MERGE_END = "<!-- CLAUDE-MERGE:END -->";
const AGENTS_ROOT_PROJECTION_START = "<!-- CK:CODEX-ROOT-PROJECTION -->";
const AGENTS_ROOT_PROJECTION_END = "<!-- /CK:CODEX-ROOT-PROJECTION -->";
// The Codex root budget: the host reads AGENTS.md up to `project_doc_max_bytes` (32 KiB by default)
// and stops silently. The projection holds project information only, so it stays inside that
// default; exceeding it only warns (nothing truncates), and the fix is a smaller CLAUDE.md, never a
// larger budget.
const AGENTS_ROOT_LIMIT_BYTES = 32768;
// Order is PRIORITY, not source order: blocks are emitted in this sequence, so the doc-discovery
// table and the hand-owned project rules come first and survive any host truncation. Only
// project-specific headings are listed; a heading absent from this list never reaches AGENTS.md.
const AGENTS_PROJECTION_HEADINGS = [
  /^## Doc Lookup — What to Read When$/m,
  // Hand-owned project rules and context written by `/learn` (outside every SECTION fence): short,
  // broad and project-specific, so it is emitted early.
  /^## Project Rules & Context$/m,
  /^## TL;DR — What You Must Know Before Writing Any Code$/m,
  // Carries the naming table AND the key-locations / dev-commands / integration-testing SECTION
  // blocks that follow it before the next `##`.
  /^## Naming Conventions$/m,
  /^## Source Conventions$/m,
  /^## Development Commands$/m,
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

function extractHeadingSection(markdown, headingPattern) {
  const text = String(markdown || "").replace(/\r\n?/g, "\n");
  const match = text.match(headingPattern);
  if (!match || match.index === undefined) return null;
  const rest = text.slice(match.index);
  const next = rest.slice(match[0].length).search(/^##\s+/m);
  return (next === -1 ? rest : rest.slice(0, match[0].length + next)).trim();
}

function buildCompactClaudeProjection(claudeMd) {
  const text = String(claudeMd || "").replace(/\r\n?/g, "\n");
  const blocks = [];
  // Preserve a small unmanaged Claude preface (project title/identity) so compacting the Codex
  // root does not silently erase custom context. Large prose stays in CLAUDE.md and is explicitly
  // routed there; it is never truncated into a misleading half-section.
  let preface = text;
  for (const marker of [
    // Managed blocks older roots carried; the universal hook delivers their content now.
    ["<!-- CK:WORKFLOW-GATE -->", "<!-- /CK:WORKFLOW-GATE -->"],
    ["<!-- CK:WORKFLOW-ROUTE-POINTER -->", "<!-- /CK:WORKFLOW-ROUTE-POINTER -->"],
    ["<!-- CK:PROJECT-PROTOCOLS -->", "<!-- /CK:PROJECT-PROTOCOLS -->"],
    ["<!-- CK:CRITICAL-THINKING -->", "<!-- /CK:CRITICAL-THINKING -->"],
    ["<!-- CK:AI-MISTAKE-PREVENTION -->", "<!-- /CK:AI-MISTAKE-PREVENTION -->"],
  ]) preface = stripManagedBlock(preface, marker[0], marker[1]);
  const firstHeading = preface.search(/^##\s+/m);
  preface = (firstHeading === -1 ? preface : preface.slice(0, firstHeading))
    .replace(/^<!-- CK:UNIVERSAL-GUIDES v\d+ -->\s*/m, "")
    .trim();
  if (preface && Buffer.byteLength(preface, "utf8") <= 4096) blocks.push(preface);
  for (const heading of AGENTS_PROJECTION_HEADINGS) {
    const section = extractHeadingSection(text, heading);
    if (section) blocks.push(section);
  }
  return blocks.filter(Boolean).join("\n\n").trim();
}

function buildAgentsClaudeMirrorBlock(claudeMd) {
  const projection = buildCompactClaudeProjection(claudeMd);
  return [
    AGENTS_CLAUDE_MIRROR_START,
    AGENTS_ROOT_PROJECTION_START,
    "## Project Instructions",
    "",
    "Project guidance from `CLAUDE.md`. Edit that source when these instructions need to change.",
    "",
    projection,
    AGENTS_ROOT_PROJECTION_END,
    AGENTS_CLAUDE_MIRROR_END,
  ].join("\n");
}

function reportAgentsRootSize(content) {
  const bytes = Buffer.byteLength(String(content || ""), "utf8");
  if (bytes > AGENTS_ROOT_LIMIT_BYTES) {
    console.warn(`[codex-context-sync] ROOT_OVERFLOW: AGENTS.md projection is ${bytes} bytes (limit ${AGENTS_ROOT_LIMIT_BYTES}); content was preserved without truncation. Reduce unmanaged preface or projection inputs before relying on the host budget.`);
  }
  return bytes;
}

// `writePath` defaults to the committed AGENTS.md so normal sync stays byte-identical.
// The committed file is ALWAYS read as the upsert baseline (preserves the non-managed preface);
// only the write target is redirectable, so the idempotency oracle can render into a temp dir
// from the real committed baseline without mutating the repo.
async function upsertProjectionIntoAgents(claudeMd, writePath = agentsPath) {
  const hasClaudeMirror = typeof claudeMd === "string" && claudeMd.trim().length > 0;
  let agentsMd = "";
  try {
    agentsMd = await fs.readFile(agentsPath, "utf8");
  } catch {
    // Create AGENTS.md if it doesn't exist; keep minimum stable preface.
    agentsMd = "# Codex Project Instructions\n";
  }
  agentsMd = agentsMd.replace(/\r\n?/g, "\n");
  for (const [start, end] of [
    [LEGACY_AGENTS_CLAUDE_MERGE_START, LEGACY_AGENTS_CLAUDE_MERGE_END],
    [AGENTS_CONTEXT_MIRROR_START, AGENTS_CONTEXT_MIRROR_END],
    [AGENTS_CLAUDE_MIRROR_START, AGENTS_CLAUDE_MIRROR_END],
  ]) agentsMd = stripManagedBlock(agentsMd, start, end);

  // Function replacer semantics: the block mirrors free CLAUDE.md text, whose regex literals such as
  // `\.cjs$` followed by a backtick form the "$`" special pattern of a replacement STRING, so the
  // block is appended by concatenation only.
  if (hasClaudeMirror) agentsMd = `${agentsMd.trimEnd()}\n\n${buildAgentsClaudeMirrorBlock(claudeMd)}\n`;
  else agentsMd = `${agentsMd.trimEnd()}\n`;

  reportAgentsRootSize(agentsMd);
  await writeFileTransientSafe(writePath, agentsMd, "utf8");
}

async function readClaudeInstructions() {
  try {
    return (await fs.readFile(claudeInstructionsPath, "utf8")).replace(/\r\n?/g, "\n");
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
    return null;
  }
}

// Renders the AGENTS.md projection into `outRootDir`. INPUTS/baselines are always read from the real
// repo (rootDir-anchored module constants); only the OUTPUT write is redirectable. main() passes
// outRootDir = rootDir (write back into the repo) and also removes the retired context file; the
// idempotency oracle passes a throwaway mkdtemp so it can diff a fresh render against the
// committed mirror without mutating the working tree.
export async function runContextSync({ outRootDir = rootDir } = {}) {
  const outAgentsPath = path.join(outRootDir, "AGENTS.md");
  const claudeInstructionsRaw = await readClaudeInstructions();
  const skillNames = await fs
    .readdir(path.join(rootDir, ".claude", "skills"), { withFileTypes: true })
    .then((entries) => entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name));
  const skillReferenceMap = buildSkillReferenceMap(skillNames);
  const claudeInstructionsMd = claudeInstructionsRaw
    ? rewriteClaudeToolTermsForCodex(rewriteSkillMentionsForCodex(claudeInstructionsRaw, skillReferenceMap))
    : null;

  await upsertProjectionIntoAgents(claudeInstructionsMd, outAgentsPath);
  if (outRootDir === rootDir) await fs.rm(contextPath, { force: true });
  console.log(
    `[codex-context-sync] mirrored the CLAUDE.md project projection into ${path.relative(rootDir, outAgentsPath)}`
  );
}

const invokedAsScript =
  isInvokedAsScript(process.argv[1], fileURLToPath(import.meta.url));
if (invokedAsScript) {
  await runContextSync();
}

// Exported so the compliance verifier reads the budget from its PRODUCER instead of keeping a second
// copy of the number. The two drifted once already: this limit was raised here while
// `verify-skill-protocol-compliance.mjs` kept the old value, so a projection this generator
// considered valid failed its own pipeline gate.
export {
  contextPath,
  agentsPath,
  AGENTS_ROOT_LIMIT_BYTES,
};
