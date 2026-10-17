"use strict";

// Registry-derived invocation guidance. Workflow HOW/quality prose stays authored;
// only this bounded block is regenerated before the existing mirror pipeline.
const fs = require("node:fs");
const path = require("node:path");
const { resolveAllWorkflowManifests } = require("./workflow-manifest.cjs");
const { resolveMutationProjectRoot, isInvokedAsScript } = require("./project-root.cjs");

const START = "<!-- WORKFLOW-CALLS:START -->";
const END = "<!-- WORKFLOW-CALLS:END -->";

function contractRange(content) {
  const starts = [...content.matchAll(/<!-- WORKFLOW-CALLS:START -->/g)];
  const ends = [...content.matchAll(/<!-- WORKFLOW-CALLS:END -->/g)];
  if (starts.length === 0 && ends.length === 0) return null;
  if (starts.length !== 1 || ends.length !== 1 || starts[0].index >= ends[0].index) {
    throw new Error("Malformed or duplicate workflow call contract markers");
  }
  return { start: starts[0].index, end: ends[0].index + END.length };
}

function renderWorkflowSkillContract(workflowId, manifests, { dialect = "/" } = {}) {
  if (!["/", "$"].includes(dialect)) throw new Error("Unsupported skill dialect");
  const call = (skill, args = "") => `[\`${dialect}${skill}${args ? ` ${args}` : ""}\`](../${skill}/SKILL.md)`;
  const lines = [
    START,
    "## Workflow Calls and Todo Bootstrap",
    "",
    `Read [the registry](../../../.claude/workflows.json) → \`workflows.${workflowId}\` together with this skill. Call ${call("start-workflow", workflowId)} to resolve the selected mode, pre-actions and fingerprint.`,
    "",
    "**Todo FIRST:** before triage, analysis or step execution, create one todo per phase of the selected mode, in order, listing every occurrence of that phase as a line, including conditional/optional ones (a mode that declares no phases gets one todo per occurrence); preserve occurrence IDs, roles and barrier groups. Use native todo tools or an equivalent persistent ledger. Then mark the first todo `in_progress`; close each step line with its run or skip evidence, and complete a phase todo only when every line is closed and its applicable exit gates hold.",
    "Mode selection and registry loading prepare tracking; any 'first action' below means the first substantive action after this bootstrap.",
    "",
    "**Call each step skill:** read its linked SKILL.md and execute its protocol through the active host with the registry args. Reading or naming a skill alone is not execution. Required gates and core/optional flex follow the linked start-workflow Step Execution Protocol; keep this skill's quality gates, loops and evidence requirements.",
    "",
    "**Conditions:** load each occurrence's registry `applicability.when` and `skipReason` verbatim, and record its run/skip evidence through the linked start-workflow protocol. Do not silently omit a todo or turn a conditional skill into an unconditional call; close, in one batch at triage, the todos whose condition is already false there. Declared parallel groups retain their all-return barrier.",
    "",
    "Explicit step-skill calls by mode (registry order; roles and conditions remain owned by the registry):",
    "",
  ];
  for (const manifest of manifests) {
    const calls = manifest.occurrences.map(step => {
      const condition = step.applicability.when === "always" ? "" : "; conditional";
      return `${call(step.skill, step.args)} (${step.role}${condition})`;
    });
    lines.push(`- Mode \`${manifest.mode}\`: ${calls.join(" → ")}`);
    if (manifest.phases.length) {
      const phases = manifest.phases.map(phase => `${phase.id[0].toUpperCase()}${phase.id.slice(1)} (${phase.steps.length}${phase.exit.length ? `; exit ${phase.exit.join(", ")}` : ""})`);
      lines.push(`  Phase todos: ${phases.join(" → ")}`);
    }
    lines.push(`<!-- workflow-mode:${manifest.mode} fingerprint:${manifest.fingerprint} -->`);
  }
  lines.push("", `Regenerate this block with \`node .claude/scripts/lib/workflow-skill-contract.cjs --write\` after registry edits; ${call("sync-codex")} refreshes it before mirroring.`, END);
  return lines.join("\n");
}

function updateWorkflowSkillContract(content, block) {
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const rendered = block.replace(/\n/g, newline);
  const range = contractRange(content);
  if (range) return content.slice(0, range.start) + rendered + content.slice(range.end);
  const frontmatter = content.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/);
  if (!frontmatter) throw new Error("Workflow skill requires frontmatter before call contract insertion");
  const end = frontmatter[0].length;
  return content.slice(0, end) + newline + rendered + newline + content.slice(end);
}

function checkWorkflowSkillContract(workflowId, entry, manifests, content, options = {}) {
  const failures = [];
  const ownSkillPath = `.claude/skills/${workflowId}/SKILL.md`;
  if (!Array.isArray(entry.preActions?.readFiles) || !entry.preActions.readFiles.includes(ownSkillPath)) {
    failures.push(`Workflow reverse-link violation (${workflowId}): preActions.readFiles must name ${ownSkillPath}`);
  }
  try {
    const range = contractRange(content);
    const summary = content.indexOf("## Quick Summary");
    if (range && summary !== -1 && range.start > summary) {
      failures.push(`Workflow bootstrap placement violation (${workflowId}): call contract must precede substantive guidance`);
    }
    const actual = range ? content.slice(range.start, range.end).replace(/\r\n/g, "\n") : null;
    if (actual !== renderWorkflowSkillContract(workflowId, manifests, options)) {
      failures.push(`Workflow call-contract drift (${workflowId}): regenerate explicit calls, todo bootstrap, roles and conditions from the registry`);
    }
  } catch (error) {
    failures.push(`Workflow call-contract violation (${workflowId}): ${error.message}`);
  }
  return failures;
}

function syncWorkflowSkillContracts(rootDir, { check = false } = {}) {
  const registryPath = path.join(rootDir, ".claude", "workflows.json");
  let document;
  try {
    document = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  } catch (error) {
    // Portable skills-only bundles have no workflows to project. A missing
    // registry must still fail if workflow wrappers actually need binding.
    if (error.code !== "ENOENT") throw error;
    const skillDir = path.join(rootDir, ".claude", "skills");
    const hasWorkflows = fs.readdirSync(skillDir, { withFileTypes: true })
      .some(entry => entry.name.startsWith("workflow-") && (entry.isDirectory() || entry.isSymbolicLink()));
    if (hasWorkflows) throw error;
    return [];
  }
  const changes = [];
  // Validate every candidate before the first write, so malformed later entries
  // cannot leave earlier workflow skills partially regenerated.
  for (const workflowId of Object.keys(document.workflows)) {
    const manifests = resolveAllWorkflowManifests(document, workflowId, { rootDir });
    const file = path.join(rootDir, ".claude", "skills", workflowId, "SKILL.md");
    const content = fs.readFileSync(file, "utf8");
    const reverse = document.workflows[workflowId].preActions?.readFiles;
    if (!Array.isArray(reverse) || !reverse.includes(`.claude/skills/${workflowId}/SKILL.md`)) {
      throw new Error(`Missing workflow reverse link: ${workflowId}`);
    }
    const updated = updateWorkflowSkillContract(content, renderWorkflowSkillContract(workflowId, manifests));
    if (updated !== content) changes.push({ file, updated });
  }
  if (!check) for (const { file, updated } of changes) fs.writeFileSync(file, updated);
  return changes.map(({ file }) => path.relative(rootDir, file).split(path.sep).join("/"));
}

module.exports = { renderWorkflowSkillContract, updateWorkflowSkillContract, checkWorkflowSkillContract, syncWorkflowSkillContracts };

if (isInvokedAsScript(process.argv[1], __filename)) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 1 || !["--write", "--check"].includes(args[0])) {
      throw new Error("Usage: node .claude/scripts/lib/workflow-skill-contract.cjs --write|--check");
    }
    const { rootDir } = resolveMutationProjectRoot({ scriptPath: __filename });
    const changed = syncWorkflowSkillContracts(rootDir, { check: args[0] === "--check" });
    console.log(`[workflow-calls] ${args[0] === "--check" ? "stale" : "updated"}: ${changed.length}`);
    if (args[0] === "--check" && changed.length) process.exitCode = 1;
  } catch (error) {
    console.error(`[workflow-calls] ${error.message}`);
    process.exitCode = 1;
  }
}
