#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const claudeSettingsPath = path.join(rootDir, ".claude", "settings.json");
const codexDir = path.join(rootDir, ".codex");
const codexHooksPath = path.join(codexDir, "hooks.json");
const reportPath = path.join(codexDir, "hooks.sync.report.json");

const disabledCodexEvents = new Map([
  ["SessionStart", "disabled-for-codex-hookless-startup-context"],
]);

const supportedEvents = new Set([
  "PreToolUse",
  "PermissionRequest",
  "PostToolUse",
  "UserPromptSubmit",
  "Stop",
]);

function normalizeCommand(command) {
  if (typeof command !== "string" || command.trim().length === 0) {
    return null;
  }

  // Claude uses $CLAUDE_PROJECT_DIR; Codex doesn't provide that variable.
  let normalized = command
    .replaceAll('"$CLAUDE_PROJECT_DIR"', ".")
    .replaceAll('"${CLAUDE_PROJECT_DIR}"', ".")
    .replaceAll("${CLAUDE_PROJECT_DIR}", ".")
    .replaceAll("$CLAUDE_PROJECT_DIR", ".");

  normalized = normalized
    .replaceAll('"."/', "./")
    .replaceAll('"."\\', ".\\")
    .replace(/\s+/g, " ")
    .trim();

  return normalized;
}

function pushSkip(report, eventName, groupIndex, reason, matcher) {
  report.skipped_groups.push({
    event: eventName,
    group_index: groupIndex,
    matcher: matcher ?? null,
    reason,
  });
}

async function main() {
  const rawSettings = await fs.readFile(claudeSettingsPath, "utf8");
  const claudeSettings = JSON.parse(rawSettings);
  const claudeHooks = claudeSettings?.hooks ?? {};

  const codexHooks = {};
  const report = {
    generated_at: new Date().toISOString(),
    source: path.relative(rootDir, claudeSettingsPath).replaceAll("\\", "/"),
    target: path.relative(rootDir, codexHooksPath).replaceAll("\\", "/"),
    notes: [
      "Codex hooks are currently disabled on Windows runtimes.",
      "Tool matcher capabilities may vary by Codex runtime; source matchers are preserved when possible.",
      "UserPromptSubmit and Stop now preserve source matcher filters when present.",
      "Claude SessionStart hooks are intentionally omitted; Codex startup context comes from AGENTS.md and generated static context files.",
    ],
    converted_events: [],
    skipped_events: [],
    converted_groups_total: 0,
    skipped_groups: [],
  };

  for (const [eventName, groups] of Object.entries(claudeHooks)) {
    const disabledReason = disabledCodexEvents.get(eventName);
    if (disabledReason) {
      report.skipped_events.push({
        event: eventName,
        reason: disabledReason,
      });
      continue;
    }

    if (!supportedEvents.has(eventName)) {
      report.skipped_events.push({
        event: eventName,
        reason: "unsupported-by-codex",
      });
      continue;
    }

    if (!Array.isArray(groups)) {
      report.skipped_events.push({
        event: eventName,
        reason: "invalid-groups-shape",
      });
      continue;
    }

    const mappedGroups = [];

    for (let i = 0; i < groups.length; i += 1) {
      const group = groups[i] ?? {};
      const matcher = typeof group.matcher === "string" ? group.matcher : undefined;
      const hooks = Array.isArray(group.hooks) ? group.hooks : [];

      const mappedHooks = [];
      for (const hook of hooks) {
        const command = normalizeCommand(hook?.command);
        if (!command) continue;

        mappedHooks.push({
          type: "command",
          command,
        });
      }

      if (mappedHooks.length === 0) {
        pushSkip(report, eventName, i, "no-command-hooks", matcher);
        continue;
      }

      const mappedGroup = { hooks: mappedHooks };
      if (matcher && matcher !== "*") {
        mappedGroup.matcher = matcher;
      }
      mappedGroups.push(mappedGroup);
    }

    if (mappedGroups.length > 0) {
      codexHooks[eventName] = mappedGroups;
      report.converted_events.push({
        event: eventName,
        groups: mappedGroups.length,
      });
      report.converted_groups_total += mappedGroups.length;
    } else {
      report.skipped_events.push({
        event: eventName,
        reason: "no-compatible-groups-after-filtering",
      });
    }
  }

  await fs.mkdir(codexDir, { recursive: true });
  await fs.writeFile(codexHooksPath, `${JSON.stringify({ hooks: codexHooks }, null, 2)}\n`, "utf8");
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(
    `[codex-hooks-sync] wrote ${path.relative(rootDir, codexHooksPath)} with ${report.converted_groups_total} group(s) across ${report.converted_events.length} event(s)`
  );
  console.log(
    `[codex-hooks-sync] skipped ${report.skipped_groups.length} incompatible group(s); report: ${path.relative(rootDir, reportPath)}`
  );
}

await main();
