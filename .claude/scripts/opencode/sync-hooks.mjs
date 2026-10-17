#!/usr/bin/env node

// Synchronize the project's Claude hooks (.claude/settings.json) into an
// opencode plugin (.opencode/plugins/easy-claude-hooks.js).
//
// opencode has no shell-command hook system: hooks are JavaScript plugin
// callbacks. So instead of transcribing commands like sync-codex writes into
// .codex/hooks.json, this writer compiles the Claude hook set into a portable
// bridge plugin whose runtime spawns the original `.claude/hooks/*.cjs` scripts
// and translates their stdin/stdout/exit-code contract into opencode's plugin
// events. `.claude` stays canonical; the generated plugin is disposable output.
//
// PORTABILITY CONTRACT: pure `node:` built-ins + one local `.cjs` require. Copy
// `.claude` (and `.opencode`) into any repository and this writer still runs
// with plain `node`. No npm, no node_modules, no package.json.
//
// Usage:
//   node .claude/scripts/opencode/sync-hooks.mjs            # write the plugin + report
//   node .claude/scripts/opencode/sync-hooks.mjs --check    # verify the plugin is current (read-only)
//   node .claude/scripts/opencode/sync-hooks.mjs --verbose  # print the sync report

import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { resolveMutationProjectRoot, isInvokedAsScript } = require("../lib/project-root.cjs");

const here = path.dirname(fileURLToPath(import.meta.url));
const templatePath = path.join(here, "templates", "easy-claude-hooks.js.tmpl");

const rootResolution = resolveMutationProjectRoot({
  cwd: process.cwd(),
  scriptPath: fileURLToPath(import.meta.url),
  env: process.env,
});
const defaultRootDir = rootResolution.rootDir;

export const claudeSettingsPath = path.join(defaultRootDir, ".claude", "settings.json");
export const opencodePluginsDir = path.join(defaultRootDir, ".opencode", "plugins");
export const opencodePluginPath = path.join(opencodePluginsDir, "easy-claude-hooks.js");
const reportPath = path.join(defaultRootDir, "tmp", "opencode-hooks.sync.report.json");

export const HOOKS_PLACEHOLDER = "__EASY_CLAUDE_HOOKS__";

// Claude hook event -> the opencode plugin surface that reproduces it. This map
// is the spec for the bridge; the runtime template implements each surface.
export const CLAUDE_TO_OPENCODE = {
  PreToolUse: "tool.execute.before",
  PostToolUse: "tool.execute.after",
  UserPromptSubmit: "chat.message",
  SessionStart: "event:session.created + experimental.chat.system.transform",
  SessionEnd: "event:session.deleted",
  Stop: "event:session.idle",
  Notification: "event:permission.asked|question.asked",
  PermissionRequest: "permission.ask",
};

export const SUPPORTED_CLAUDE_EVENTS = new Set(Object.keys(CLAUDE_TO_OPENCODE));

const REPORT_NOTES = [
  "opencode has no shell-command hooks; this plugin is the bridge. It spawns the canonical .claude/hooks/*.cjs scripts and translates exit 0 = allow / 2 = block, stdout hookSpecificOutput.updatedInput = argument rewrite, and hookSpecificOutput.additionalContext = injected context.",
  "Tool ids differ between hosts: opencode emits bash/edit/write/read/grep/glob/apply_patch/todowrite/webfetch/websearch/question/skill/lsp. The bridge maps each to the Claude matcher names the hook scripts are written against.",
  "opencode registers MCP tools as `<server>_<tool>`, so Claude matchers like `mcp__github__*` are matched against that convention. opencode does NOT expose MCP tool arguments to tool.execute.before, so MCP PreToolUse hooks that inspect tool_input cannot see arguments on this host.",
  "Claude's SessionStart is reproduced from event:session.created (source=startup) and event:session.compacted (source=compact); its additionalContext is injected through experimental.chat.system.transform.",
  "opencode hook events carry no conversation record, so the protocol-delivery ledger cannot see a compaction on its own: on event:session.compacted the bridge reports it through .claude/hooks/lib/protocol-delivery.cjs recordCompaction, and the next skill load delivers its protocols again. The same event runs the SessionStart `compact` hooks, which include the universal bins, so the bundle is re-delivered as system context right after the compaction even when no prompt follows; the next prompt then stays silent.",
  "Claude's Notification matcher vocabulary (AskUserPrompt|permission_prompt) is reproduced from event:question.asked and event:permission.asked.",
  "Claude events opencode cannot reproduce are reported as skipped-events rather than silently dropped.",
  "A handler's `if` is copied into the HOOKS table. The bridge evaluates the `Read(<glob>)` form before it spawns the hook (a read of any other file starts no process); it runs a hook whose `if` has any other form, so an unsupported condition can cost a spawn but never drops a hook.",
  "KNOWN HOST LIMITATION: opencode's `permission.ask` plugin hook is defined in the SDK but is NOT triggered by the host at the pinned version (upstream anomalyco/opencode issue #7006). The PermissionRequest -> permission.ask bridge is therefore present but inert until that is fixed; verify against the deployed opencode version before relying on PermissionRequest hooks.",
];

// Claude hook commands have the shape `node "$CLAUDE_PROJECT_DIR"/relative/hook.cjs`
// (optionally unquoted `$CLAUDE_PROJECT_DIR`, optionally brace-wrapped). The
// project-root variable and the script path are matched separately so the path
// tail can be sliced verbatim instead of captured by a brittle character class.
const NODE_HOOK_PREFIX = /^\s*node\s+(?:"|')?(?:\$\{CLAUDE_PROJECT_DIR\}|\$CLAUDE_PROJECT_DIR)(?:"|')?\s*/;

/**
 * Extract the project-relative hook script path from a Claude hook command.
 * Only `node "$CLAUDE_PROJECT_DIR"/...` commands are supported; anything else
 * returns null and is reported as an unsupported command shape.
 */
export function extractHookPath(command) {
  if (typeof command !== "string" || command.trim().length === 0) return null;
  const trimmed = command.trim();
  const match = NODE_HOOK_PREFIX.exec(trimmed);
  if (!match) return null;
  let rest = trimmed.slice(match[0].length).trim();
  if (rest.length >= 2 && ((rest.startsWith('"') && rest.endsWith('"')) || (rest.startsWith("'") && rest.endsWith("'")))) {
    rest = rest.slice(1, -1).trim();
  }
  rest = rest.replace(/^[\\/]+/, "").replaceAll("\\", "/");
  return rest.length > 0 ? rest : null;
}

/**
 * Compile Claude settings into the plugin's HOOKS table plus a sync report.
 * Pure: no filesystem access.
 */
export function buildHooksConfig(settings) {
  const claudeHooks = settings && typeof settings === "object" && settings.hooks && typeof settings.hooks === "object"
    ? settings.hooks
    : {};

  const hooks = {};
  const report = {
    event_map: CLAUDE_TO_OPENCODE,
    converted_events: [],
    skipped_events: [],
    skipped_groups: [],
    converted_groups_total: 0,
    hooks_total: 0,
  };

  for (const [eventName, groups] of Object.entries(claudeHooks)) {
    const opencodeHook = CLAUDE_TO_OPENCODE[eventName];
    if (!opencodeHook) {
      report.skipped_events.push({ event: eventName, reason: "unsupported-by-opencode" });
      continue;
    }
    if (!Array.isArray(groups)) {
      report.skipped_events.push({ event: eventName, reason: "invalid-groups-shape" });
      continue;
    }

    const mappedGroups = [];
    for (let index = 0; index < groups.length; index += 1) {
      const group = groups[index] && typeof groups[index] === "object" ? groups[index] : {};
      const matcher = typeof group.matcher === "string" && group.matcher.trim() ? group.matcher : undefined;
      const commands = Array.isArray(group.hooks) ? group.hooks : [];
      const mappedHooks = [];
      for (const hook of commands) {
        const hookPath = extractHookPath(hook && hook.command);
        if (!hookPath) {
          report.skipped_groups.push({ event: eventName, group_index: index, matcher: matcher ?? null, reason: "unsupported-command-shape" });
          continue;
        }
        // A handler's `if` rides along so the bridge can skip the spawn in-process; every handler
        // without one keeps the `{ type, command }` shape, so the rest of the table is unchanged.
        const condition = typeof hook.if === "string" && hook.if.trim() ? hook.if : undefined;
        mappedHooks.push(condition ? { type: "command", command: hookPath, if: condition } : { type: "command", command: hookPath });
      }
      if (mappedHooks.length === 0) {
        // Each unsupported command was already recorded above; only an empty
        // hook list needs its own group-level reason.
        if (commands.length === 0) {
          report.skipped_groups.push({ event: eventName, group_index: index, matcher: matcher ?? null, reason: "no-command-hooks" });
        }
        continue;
      }
      const mappedGroup = { hooks: mappedHooks };
      if (matcher) mappedGroup.matcher = matcher;
      mappedGroups.push(mappedGroup);
    }

    if (mappedGroups.length === 0) {
      report.skipped_events.push({ event: eventName, reason: "no-compatible-groups-after-filtering" });
      continue;
    }
    hooks[eventName] = mappedGroups;
    report.converted_events.push({ event: eventName, opencode_hook: opencodeHook, groups: mappedGroups.length });
    report.converted_groups_total += mappedGroups.length;
    report.hooks_total += mappedGroups.reduce((total, group) => total + group.hooks.length, 0);
  }

  return { hooks, report };
}

/** Render the bridge plugin text from a compiled HOOKS table. */
export function renderPlugin(hooks, template) {
  const source = template ?? null;
  if (typeof source !== "string") {
    throw new Error("renderPlugin requires the runtime template text");
  }
  if (!source.includes(HOOKS_PLACEHOLDER)) {
    throw new Error(`runtime template is missing the ${HOOKS_PLACEHOLDER} placeholder`);
  }
  return source.replace(HOOKS_PLACEHOLDER, JSON.stringify(hooks, null, 2));
}

async function readTemplate(customTemplatePath) {
  return await fs.readFile(customTemplatePath ?? templatePath, "utf8");
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Materialize the opencode bridge plugin into `targetDir` and write the sync
 * report. Exported so tests and divergence oracles use the REAL writer.
 *
 * @param {object} [options]
 * @param {string} [options.targetDir] directory to write easy-claude-hooks.js into
 * @param {string} [options.rootDir] project root used to locate settings.json and write the report
 * @param {string} [options.template] template text override
 */
export async function materializeOpencodeHooks(options = {}) {
  const rootDir = options.rootDir ?? defaultRootDir;
  const targetDir = options.targetDir ?? path.join(rootDir, ".opencode", "plugins");
  const settingsPath = options.settingsPath ?? path.join(rootDir, ".claude", "settings.json");
  const pluginPath = path.join(targetDir, "easy-claude-hooks.js");
  const reportFile = path.join(rootDir, "tmp", "opencode-hooks.sync.report.json");

  const settings = await readJson(settingsPath);
  const { hooks, report } = buildHooksConfig(settings);
  const template = options.template ?? (await readTemplate(templatePath));
  const pluginText = renderPlugin(hooks, template);

  const missing = [];
  for (const groups of Object.values(hooks)) {
    for (const group of groups) {
      for (const hook of group.hooks) {
        if (!(await pathExists(path.join(rootDir, hook.command)))) missing.push(hook.command);
      }
    }
  }

  const fullReport = {
    generated_at: new Date().toISOString(),
    source: path.relative(rootDir, settingsPath).replaceAll("\\", "/"),
    target: path.relative(rootDir, pluginPath).replaceAll("\\", "/"),
    event_map: report.event_map,
    converted_events: report.converted_events,
    skipped_events: report.skipped_events,
    skipped_groups: report.skipped_groups,
    converted_groups_total: report.converted_groups_total,
    hooks_total: report.hooks_total,
    missing_hook_files: missing,
    notes: REPORT_NOTES,
  };

  await fs.mkdir(targetDir, { recursive: true });
  await fs.mkdir(path.dirname(reportFile), { recursive: true });
  await fs.writeFile(pluginPath, pluginText, "utf8");
  await fs.writeFile(reportFile, `${JSON.stringify(fullReport, null, 2)}\n`, "utf8");

  return { pluginPath, reportFile, pluginText, report: fullReport };
}

/**
 * Back up and remove the pre-sync hand-written notification plugin. The
 * generated bridge owns Notification/Stop/question/permission events, so
 * keeping the legacy file would double-send notifications. The original is
 * preserved under tmp/ before removal (never destroyed).
 */
export async function pruneLegacyNotification({ rootDir = defaultRootDir } = {}) {
  const legacyPath = path.join(rootDir, ".opencode", "plugins", "notification.js");
  if (!(await pathExists(legacyPath))) return { removed: false, backup: null };
  const backupDir = path.join(rootDir, "tmp", "opencode-legacy");
  const backup = path.join(backupDir, `notification.js.${Date.now()}.bak`);
  await fs.mkdir(backupDir, { recursive: true });
  await fs.copyFile(legacyPath, backup);
  await fs.unlink(legacyPath);
  return { removed: true, backup };
}

/** Compare the on-disk plugin with a fresh render. Read-only. */
export async function checkOpencodeHooks({ rootDir = defaultRootDir, targetDir } = {}) {
  const resolvedTargetDir = targetDir ?? path.join(rootDir, ".opencode", "plugins");
  const pluginPath = path.join(resolvedTargetDir, "easy-claude-hooks.js");
  const settingsPath = path.join(rootDir, ".claude", "settings.json");
  const settings = await readJson(settingsPath);
  const { hooks } = buildHooksConfig(settings);
  const expected = renderPlugin(hooks, await readTemplate(templatePath));

  if (!(await pathExists(pluginPath))) {
    return { ok: false, pluginPath, reason: "generated plugin is missing" };
  }
  const actual = await fs.readFile(pluginPath, "utf8");
  if (actual !== expected) {
    return { ok: false, pluginPath, reason: "generated plugin is stale (differs from a fresh render)" };
  }
  return { ok: true, pluginPath, reason: null };
}

function parseArgs(args) {
  return {
    check: args.includes("--check"),
    verbose: args.includes("--verbose") || args.includes("-v"),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.check) {
    const result = await checkOpencodeHooks();
    if (!result.ok) {
      console.error(`[opencode-hooks-sync] ${result.reason}: ${path.relative(defaultRootDir, result.pluginPath)}`);
      console.error("[opencode-hooks-sync] run: node .claude/skills/sync-opencode/scripts/run-opencode-sync.mjs");
      process.exitCode = 1;
      return;
    }
    console.log(`[opencode-hooks-sync] ${path.relative(defaultRootDir, result.pluginPath)} is current`);
    return;
  }

  const { pluginPath, reportFile, report } = await materializeOpencodeHooks();
  if (report.hooks_total === 0) {
    // A zero-hook bridge is a valid outcome for a project with no configured hooks, but it is also
    // the exact shape a broken command parser produces. Never let it pass silently.
    console.warn(
      "[opencode-hooks-sync] WARNING: no Claude hook commands were compiled — the generated bridge is inert. " +
        "Verify the .claude/settings.json command shapes, then re-run the sync."
    );
  }
  const legacy = await pruneLegacyNotification();
  console.log(
    `[opencode-hooks-sync] wrote ${path.relative(defaultRootDir, pluginPath)} with ${report.hooks_total} hook(s) across ${report.converted_events.length} event(s)`
  );
  if (legacy.removed) {
    console.log(`[opencode-hooks-sync] removed legacy notification.js (backup: ${path.relative(defaultRootDir, legacy.backup)})`);
  }
  if (report.skipped_events.length > 0) {
    console.log(`[opencode-hooks-sync] skipped ${report.skipped_events.length} unsupported event(s); report: ${path.relative(defaultRootDir, reportFile)}`);
  }
  if (args.verbose) {
    console.log(JSON.stringify(report, null, 2));
  }
}

const invokedAsScript = isInvokedAsScript(process.argv[1], fileURLToPath(import.meta.url));
if (invokedAsScript) {
  await main();
}
