#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..");
const workflowsPath = path.join(repoRoot, ".claude", "workflows.json");

function usage() {
  return "Usage: node .claude/scripts/codex/read-workflow-entry.mjs <workflow-id>";
}

async function main() {
  const [workflowId, ...extraArgs] = process.argv.slice(2);
  if (!workflowId || extraArgs.length > 0) {
    throw new Error(usage());
  }

  const workflowsDoc = JSON.parse(await fs.readFile(workflowsPath, "utf8"));
  const workflows = workflowsDoc?.workflows;
  const workflow = workflows?.[workflowId];
  if (!Object.hasOwn(workflows ?? {}, workflowId) || !Array.isArray(workflow?.sequence)) {
    throw new Error(`Unknown workflow ID: ${workflowId}`);
  }

  process.stdout.write(`${JSON.stringify(workflow, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
