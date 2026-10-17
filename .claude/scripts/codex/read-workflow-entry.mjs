#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import workflowManifest from "../lib/workflow-manifest.cjs";

const require = createRequire(import.meta.url);
const { isInvokedAsScript } = require("../lib/project-root.cjs");

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..");
const workflowsPath = path.join(repoRoot, ".claude", "workflows.json");

// R8 LOCKSTEP. The loader owns the token table; this file only runs its own resolution when the
// loader require FAILS (a stripped portable Codex tree carries .claude/scripts/codex/*.mjs without
// .claude/hooks/lib/). That branch resolves to the DEFAULTS — never a pass-through: a pass-through
// would print a literal `{SPEC_ROOT}` into the Tier-2 canonical read that
// .claude/skills/start-workflow/SKILL.md mandates before task tracking, which is strictly worse
// than the hardcoded path it replaced.
//
// PORTABILITY_TOKEN_DEFAULTS is defaults-only (no config paths, no resolution logic) and mirrors
// the same fallback in .claude/scripts/codex/sync-context-workflows.mjs.
const PORTABILITY_TOKEN_DEFAULTS = {
  SPEC_ROOT: "docs/specs",
  SPEC_ROOT_TECHNICAL: "docs/specs-technical",
  REF_DOCS_ROOT: "docs/project-reference",
  ADR_ROOT: "docs/adr",
  TEMPLATES_ROOT: "docs/templates",
  PLANS_ROOT: "plans",
  TEAM_ARTIFACTS_ROOT: "team-artifacts",
  PRODUCT_ROADMAP_DOC: "docs/product-roadmap.md",
};

function resolvePortabilityTokensFallback(text, config) {
  if (typeof text !== "string" || !text) return text;
  if (!text.includes("{")) return text;
  void config;
  return text.replace(/\{([A-Z][A-Z0-9_]*)\}/g, (match, token) =>
    Object.prototype.hasOwnProperty.call(PORTABILITY_TOKEN_DEFAULTS, token)
      ? PORTABILITY_TOKEN_DEFAULTS[token]
      : match
  );
}

function loadResolvePortabilityTokens() {
  const candidates = [
    path.join(repoRoot, ".claude", "hooks", "lib", "project-config-loader.cjs"),
    path.join(scriptDir, "..", "..", "hooks", "lib", "project-config-loader.cjs"),
  ];
  for (const candidate of candidates) {
    try {
      const loader = require(candidate);
      if (typeof loader.resolvePortabilityTokens === "function") {
        return loader.resolvePortabilityTokens;
      }
    } catch {}
  }
  return resolvePortabilityTokensFallback;
}

const resolvePortabilityTokens = loadResolvePortabilityTokens();

function resolveString(value, config) {
  return typeof value === "string" ? resolvePortabilityTokens(value, config) : value;
}

// Nested routed step carrier: `applicability` { when, skipReason }. (`outcomeGates[].when` is the
// only other nested routed field; resolveWorkflowStrings handles it directly.)
function resolveApplicability(applicability, config) {
  if (!applicability || typeof applicability !== "object" || Array.isArray(applicability)) {
    return applicability;
  }
  const out = { ...applicability };
  if (typeof out.when === "string") out.when = resolveString(out.when, config);
  if (typeof out.skipReason === "string") out.skipReason = resolveString(out.skipReason, config);
  return out;
}

// Occurrence objects appear both as raw `sequence[]`/`variants.*.sequence[]` entries and as the
// manifest's resolved `occurrences[]`. Plain string steps pass through untouched.
function resolveSteps(steps, config) {
  if (!Array.isArray(steps)) return steps;
  return steps.map((step) => {
    if (!step || typeof step !== "object" || Array.isArray(step)) return step;
    if (!Object.hasOwn(step, "applicability")) return step;
    return { ...step, applicability: resolveApplicability(step.applicability, config) };
  });
}

/**
 * Resolve every ROUTED `workflows.json` field on a DEEP COPY of the merged workflow+manifest
 * object. The routed set is exactly: `description`, `intent`, `preActions.injectContext`,
 * `whenToUse`, `outcomeGates[].when`, `sequence[].applicability.when`,
 * `sequence[].applicability.skipReason` (including the `variants.*.sequence[]` and manifest
 * `occurrences[]` carriers of the same two fields, and `variants.*.outcomeGates[].when`). Every other field — `name`, occurrence `role`,
 * `outcomeGates[].id`/`satisfiedBy`, `preActions.readFiles`, `stepMeta`, `parallelGroups`,
 * fingerprints — stays literal. Unknown braces (`{Bucket}`, `{FeatureName}`, `{plan-id}`, `{n}`)
 * survive verbatim.
 *
 * @param {object} entry merged `{ ...workflow, ...manifest }` object
 * @param {object} [config] parsed project-config.json; loaded + cached by the loader when omitted
 * @returns {object} deep copy with routed fields resolved; the input is never mutated
 */
export function resolveWorkflowStrings(entry, config) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return entry;
  const out = structuredClone(entry);

  if (typeof out.description === "string") out.description = resolveString(out.description, config);
  if (typeof out.whenToUse === "string") out.whenToUse = resolveString(out.whenToUse, config);
  if (typeof out.intent === "string") out.intent = resolveString(out.intent, config);

  if (Array.isArray(out.outcomeGates)) {
    out.outcomeGates = out.outcomeGates.map((gate) =>
      gate && typeof gate === "object" && !Array.isArray(gate) && typeof gate.when === "string"
        ? { ...gate, when: resolveString(gate.when, config) }
        : gate
    );
  }

  if (out.preActions && typeof out.preActions === "object" && !Array.isArray(out.preActions)) {
    if (typeof out.preActions.injectContext === "string") {
      out.preActions.injectContext = resolveString(out.preActions.injectContext, config);
    }
  }

  if (Array.isArray(out.sequence)) out.sequence = resolveSteps(out.sequence, config);
  if (Array.isArray(out.occurrences)) out.occurrences = resolveSteps(out.occurrences, config);

  if (out.variants && typeof out.variants === "object" && !Array.isArray(out.variants)) {
    for (const [mode, variant] of Object.entries(out.variants)) {
      if (!variant || typeof variant !== "object" || Array.isArray(variant)) continue;
      if (!Array.isArray(variant.sequence)) continue;
      out.variants[mode] = { ...variant, sequence: resolveSteps(variant.sequence, config) };
      if (Array.isArray(variant.outcomeGates)) {
        out.variants[mode].outcomeGates = variant.outcomeGates.map((gate) =>
          gate && typeof gate === "object" && !Array.isArray(gate) && typeof gate.when === "string"
            ? { ...gate, when: resolveString(gate.when, config) }
            : gate
        );
      }
    }
  }

  return out;
}

function usage() {
  return "Usage: node .claude/scripts/codex/read-workflow-entry.mjs <workflow-id> [--mode <mode> | --output <mode>]";
}

async function main() {
  const [workflowId, ...extraArgs] = process.argv.slice(2);
  if (!workflowId || workflowId.startsWith("--")) {
    throw new Error(usage());
  }
  const options = { rootDir: repoRoot };
  for (let i = 0; i < extraArgs.length; i++) {
    const match = extraArgs[i].match(/^--(?:mode|output)(?:=(.*))?$/);
    if (!match || Object.hasOwn(options, "mode")) throw new Error(usage());
    const mode = match[1] === undefined ? extraArgs[++i] : match[1];
    if (!mode || mode.startsWith("--")) throw new Error(usage());
    options.mode = mode;
  }

  const workflowsDoc = JSON.parse(await fs.readFile(workflowsPath, "utf8"));
  const workflows = workflowsDoc?.workflows;
  const workflow = workflows?.[workflowId];
  if (!Object.hasOwn(workflows ?? {}, workflowId)) {
    throw new Error(`Unknown workflow ID: ${workflowId}`);
  }

  // Validate BEFORE resolution: an empty injectContext must fail loudly, never be resolved
  // into an empty string.
  if (
    typeof workflow?.preActions?.injectContext !== "string" ||
    workflow.preActions.injectContext.trim().length === 0
  ) {
    throw new Error(
      `Workflow ${workflowId} is missing required non-empty preActions.injectContext`
    );
  }

  const manifest = workflowManifest.resolveWorkflowManifest(workflowsDoc, workflowId, options);
  const entry = resolveWorkflowStrings({ ...workflow, ...manifest });
  process.stdout.write(`${JSON.stringify(entry, null, 2)}\n`);
}

if (isInvokedAsScript(process.argv[1], fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
