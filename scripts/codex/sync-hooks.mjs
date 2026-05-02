#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const claudeSettingsPath = path.join(rootDir, ".claude", "settings.json");
const codexDir = path.join(rootDir, ".codex");
const codexHooksPath = path.join(codexDir, "hooks.json");
const reportPath = path.join(codexDir, "hooks.sync.report.json");

const supportedEvents = new Set([
  "SessionStart",
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

function getCommandSkipReason(command) {
  if (command.includes("npm-auto-install.cjs")) {
    return "disabled-for-codex-startup-auto-install";
  }
  return null;
}

function normalizeSessionStartMatcher(matcher) {
  if (!matcher || matcher === "*" || matcher.trim() === "") {
    return "startup|resume";
  }
  if (/\b(startup|resume)\b/.test(matcher)) {
    return "startup|resume";
  }
  return null;
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
      "Claude startup auto-install hooks are intentionally omitted from Codex hooks.",
    ],
    converted_events: [],
    skipped_events: [],
    converted_groups_total: 0,
    skipped_groups: [],
  };

  for (const [eventName, groups] of Object.entries(claudeHooks)) {
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

      const skippedCommandReasons = [];
      const mappedHooks = [];
      for (const hook of hooks) {
        const command = normalizeCommand(hook?.command);
        if (!command) continue;

        const skipReason = getCommandSkipReason(command);
        if (skipReason) {
          skippedCommandReasons.push(skipReason);
          continue;
        }

        mappedHooks.push({
          type: "command",
          command,
        });
      }

      if (mappedHooks.length === 0) {
        const reason = skippedCommandReasons.length > 0
          ? [...new Set(skippedCommandReasons)].join(",")
          : "no-command-hooks";
        pushSkip(report, eventName, i, reason, matcher);
        continue;
      }

      let mappedMatcher = matcher;

      if (eventName === "SessionStart") {
        mappedMatcher = normalizeSessionStartMatcher(matcher);
        if (!mappedMatcher) {
          pushSkip(report, eventName, i, "matcher-does-not-include-startup-or-resume", matcher);
          continue;
        }
      }

      const mappedGroup = { hooks: mappedHooks };
      if (mappedMatcher && mappedMatcher !== "*") {
        mappedGroup.matcher = mappedMatcher;
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
  await fs.writeFile(codexHooksPath, `${JSON.stringify(codexHooks, null, 2)}\n`, "utf8");
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(
    `[codex-hooks-sync] wrote ${path.relative(rootDir, codexHooksPath)} with ${report.converted_groups_total} group(s) across ${report.converted_events.length} event(s)`
  );
  console.log(
    `[codex-hooks-sync] skipped ${report.skipped_groups.length} incompatible group(s); report: ${path.relative(rootDir, reportPath)}`
  );
}

await main();
