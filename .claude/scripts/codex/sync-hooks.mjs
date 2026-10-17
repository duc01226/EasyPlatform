#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { writeFileTransientSafe } from "../lib/write-file-transient-safe.mjs";

const require = createRequire(import.meta.url);
const { resolveMutationProjectRoot, isInvokedAsScript } = require("../lib/project-root.cjs");
const rootResolution = resolveMutationProjectRoot({
  cwd: process.cwd(),
  scriptPath: fileURLToPath(import.meta.url),
  env: process.env,
});
const rootDir = rootResolution.rootDir;
export const claudeSettingsPath = path.join(rootDir, ".claude", "settings.json");
export const codexDir = path.join(rootDir, ".codex");
const codexHooksPath = path.join(codexDir, "hooks.json");
const reportPath = path.join(rootDir, "tmp", "hooks.sync.report.json");

const disabledCodexEvents = new Map([
  ["SessionStart", "static-startup-context-authoritative"],
]);

// NARROW EXCEPTION to `disabledCodexEvents`.
//
// The "static startup context is authoritative" rationale above holds for a
// SessionStart hook that only RESTATES what AGENTS.md
// already carries — mirroring those would duplicate context, which is exactly what
// the skip exists to prevent.
//
// It does NOT hold for a SessionStart hook that PRODUCES a runtime signal which a
// MIRRORED non-SessionStart hook then CONSUMES. Dropping the producer while
// keeping the consumer leaves the consumer registered in .codex/hooks.json,
// looking healthy, tested, and permanently unreachable — a silent, unfalsifiable
// hole. `.scan-stale` was exactly that: `session-init-docs.cjs` is its only
// writer, `init-prompt-gate.cjs` is its only reader, and the reader is mirrored.
//
// Each row names the consumer that forces it. Adding a row asserts that the hook
// computes something no static carrier can hold; a hook that merely reprints
// static context does NOT belong here. The universal bins qualify the same way:
// the bundle exists only as hook delivery, so their compaction re-delivery has no
// static fallback.
const codexSessionStartMirrors = new Map([
  [
    ".claude/hooks/failure-investigation-remind.cjs",
    "rotates the failure reminder's private generation on compact/clear; transcriptless pre-shell consumers cannot infer resets from static instructions",
  ],
  [
    ".claude/hooks/ui-reuse-remind.cjs",
    "re-delivers the UI reminder right after a compaction and rotates its private reset generation on compact/clear; blind prompt/pre-tool consumers cannot infer context resets from static instructions",
  ],
  [
    ".claude/hooks/skill-activation-inject.cjs",
    "refreshes runtime personal skill-selection policy after compact/resume; static project context cannot hold a developer override or a session reset",
  ],
  [
    ".claude/hooks/session-init-docs.cjs",
    "sole writer of the .scan-stale flag, which is the only input to init-prompt-gate's stale-reference-doc branch (UserPromptSubmit — mirrored)",
  ],
  [
    ".claude/hooks/file-convention-inject.cjs",
    "re-arms per-file convention delivery across a compaction boundary; without it the delivery ledger never learns the transcript was condensed and falls back to the blind age path, which fails CLOSED",
  ],
  [
    ".claude/hooks/prompt-ledger.cjs",
    "re-anchors the session goal and prompt list after compact/resume; a static carrier cannot hold per-session prompts",
  ],
  [
    ".claude/hooks/verify-install.cjs",
    "probes and repairs machine-native Git/Git Bash capability and publishes a child/session environment signal that static Codex context cannot represent",
  ],
  // Prompt-time context with no static carrier: a long autonomous run has no following prompt, so the
  // compaction report (SessionStart compact) is the only event that can put it back.
  ...[
    ".claude/hooks/core-principles-inject.cjs",
    ".claude/hooks/judgement-integrity-route.cjs",
    ".claude/hooks/ai-feature-route.cjs",
    ".claude/hooks/workflow-route-inject.cjs",
    ".claude/hooks/workflow-catalog-inject.cjs",
  ].map(hookPath => [
    hookPath,
    "re-delivers its prompt-time context right after a compaction (SessionStart compact); a long autonomous run has no following prompt, and no static carrier holds that context",
  ]),
  ...[1, 2, 3, 4].map(bin => [
    `.claude/hooks/protocol-inject-universal-${bin}.cjs`,
    "re-delivers the universal bundle right after a compaction or clear (SessionStart compact|clear); a long autonomous run has no following prompt, and no static carrier holds the bundle",
  ]),
]);

/** Why this SessionStart hook must mirror despite the event-level skip, or null. */
function sessionStartMirrorReason(rawCommand) {
  if (typeof rawCommand !== "string") return null;
  const normalized = rawCommand.replaceAll("\\", "/");
  for (const [hookPath, reason] of codexSessionStartMirrors) {
    if (normalized.includes(hookPath)) return reason;
  }
  return null;
}

// A matcher is written against the HOST's tool names, so mirroring one verbatim
// silently gates a hook on tools Codex never emits. Codex performs every file
// mutation through `apply_patch` (see `.claude/hooks/lib/file-conventions.cjs`
// `case 'apply_patch'` and `file-convention-inject.cjs` TRIGGER_TOOLS), so a
// matcher naming a Claude MUTATION tool must also name it on the Codex side.
//
// What widening buys is DELIVERY, not coverage. The matcher decides which events
// reach a hook; the hook acts only on tools its own code parses. Exactly one
// registered hook names `apply_patch` — file-convention-inject
// (`.claude/hooks/file-convention-inject.cjs:25`). Every other hook sitting on a
// widened matcher (doc-sync-gate,
// post-edit-prettier, graph-auto-update) has no `apply_patch` branch and allows or
// ignores the event. So widening is SAFE — no hook fires on work it cannot parse —
// and is NOT a security gain. Never read a widened matcher as proof a gate covers
// Codex writes; see TC-HOOKMIRROR-003 in tests/verify-sync-divergence.test.mjs.
//
// MUTATION TOOLS ONLY — this map must never key a read-only tool. `apply_patch`
// mutates, so aliasing (say) `Read` to it hands write events to a read-gated hook
// and encodes a read/mutate equivalence that no hook honors. `Read` is deliberately
// absent: no configured matcher names a Claude read tool without also naming a
// mutation tool, so the row bought nothing and only carried that risk.
const codexToolAliases = new Map([
  ["Edit", ["apply_patch"]],
  ["Write", ["apply_patch"]],
  ["MultiEdit", ["apply_patch"]],
  ["NotebookEdit", ["apply_patch"]],
]);

export function mapMatcherForCodex(matcher) {
  if (typeof matcher !== "string" || matcher.length === 0) return matcher;
  const tools = matcher.split("|");
  const seen = new Set(tools);
  const added = [];
  for (const tool of tools) {
    for (const alias of codexToolAliases.get(tool) ?? []) {
      if (seen.has(alias)) continue;
      seen.add(alias);
      added.push(alias);
    }
  }
  return added.length === 0 ? matcher : [...tools, ...added].join("|");
}

// Events Codex actually dispatches, per the official hook reference
// (https://learn.chatgpt.com/docs/hooks, verified 2026-09-17). An event absent
// here is reported as `unsupported-by-codex`, so a WRONG entry here is not a
// no-op — it silently drops a hook the host would have run. Verify against the
// doc before adding or removing a row.
//
// SubagentStart (2026-09-25): mirrored. The protocol delivery entries register on
// it, the Codex reference lists the event with `additionalContext` in its output,
// and the protocol-delivery confirmation run (25 Sep 2026) delivered a full
// 9,500-char payload to a Codex sub-agent with the agent-type matcher honored.
// Codex supports SubagentStop, PreCompact, PostCompact and Interrupt
// too; they stay off this list only because this repo registers no hook on them —
// add the row, after checking the doc, the day one is registered. `Notification`
// is absent from the Codex reference entirely, so its skip is correct.
const supportedEvents = new Set([
  "SessionStart",
  "SessionEnd",
  "PreToolUse",
  "PermissionRequest",
  "PostToolUse",
  "UserPromptSubmit",
  "Stop",
  "SubagentStart",
]);

// ── Protocol delivery entries (.claude/hooks/protocol-inject-<name>.cjs, skill-overlay-remind.cjs) ──
//
// The five group entries deliver shared protocol text when a skill loads, the universal bins
// (protocol-inject-universal-<n>.cjs) deliver the universal bundle on a prompt and at an agent start,
// and skill-overlay-remind.cjs names the project overlay files when a skill activates. Their Codex
// mapping differs from every other hook's, and ONLY theirs: each rule below keys
// on the entry path. Runtime bootstrap applies to every project-root Node hook;
// changes to a handler definition require re-review in Codex before it runs.
const PROTOCOL_HOOK_PATH = /^\.claude\/hooks\/(?:protocol-inject-[a-z0-9-]+|skill-overlay-remind)\.cjs$/;

/** True when `hookPath` (project-relative, `/` separators) is a protocol delivery entry. */
export function isProtocolHookPath(hookPath) {
  return typeof hookPath === "string" && PROTOCOL_HOOK_PATH.test(hookPath);
}

// Per-handler additionalContext allowance, in Codex's token estimate (about chars/4).
// The Codex default (2,500) only just fits a 9,500-char payload; 3,000 fits 11,000
// and leaves room for JSON escaping (protocol-delivery confirmation run, 25 Sep 2026).
export const PROTOCOL_CONTEXT_LIMIT = 3000;

// Claude events Codex does not have, mapped to the Codex event that carries the same
// load path. Codex has no UserPromptExpansion; an explicit `$skill` there injects the
// SKILL.md with no tool call, so UserPromptSubmit is the Codex load path. Only
// protocol entries are remapped (their early exit reads either event's input); any
// other handler on the event is reported, never silently re-targeted.
const codexEventRemaps = new Map([
  ["UserPromptExpansion", { target: "UserPromptSubmit", reason: "remapped-to-user-prompt-submit" }],
]);

// Claude tools Codex never emits. A protocol group whose matcher names ONLY these
// can never fire on Codex, so it is not mirrored (reported as
// `matcher-names-no-codex-tool`). Scoped to protocol entries: other handlers keep
// today's verbatim render. Never alias these to a Codex tool — `codexToolAliases`
// stays mutation-only.
const CODEX_ABSENT_TOOLS = new Set(["Read", "Skill"]);
const TOOL_EVENTS = new Set(["PreToolUse", "PostToolUse", "PermissionRequest"]);

// Codex reads a skill file implicitly through its shell (`Get-Content -Raw
// .agents/skills/<name>/SKILL.md` on Windows), never through a `Read` tool, and no
// `$skill` reaches UserPromptSubmit for that load (protocol-delivery confirmation
// run, 25 Sep 2026: the Codex shell mapping stays ON). So the protocol handlers of a PostToolUse group keyed
// to `Read` render once more, in that group's place, on the Codex shell tool. Their
// in-process early exit ends every command that does not name SKILL.md.
const CODEX_SHELL_READ = { from: "Read", matcher: "Bash", reason: "codex-reads-skill-files-through-the-shell" };

// Claude matches a matcher of only names, `-`, `_` and `|` as an EXACT name list;
// Codex evaluates every matcher as an unanchored regex, so `tester` would also match
// `integration-tester`. Agent-type lists therefore render anchored on Codex.
const EXACT_NAME_LIST = /^[A-Za-z0-9_-]+(?:\|[A-Za-z0-9_-]+)*$/;

/** A SubagentStart exact agent-type list, anchored for Codex's regex matcher. */
export function anchorAgentTypeMatcher(matcher) {
  if (typeof matcher !== "string" || !EXACT_NAME_LIST.test(matcher)) return matcher;
  return `^(?:${matcher})$`;
}

function matcherNamesNoCodexTool(matcher) {
  if (typeof matcher !== "string" || matcher.length === 0 || matcher === "*") return false;
  return matcher.split("|").every(tool => CODEX_ABSENT_TOOLS.has(tool));
}

// Matcher support differs per event on Codex, and the two failure shapes are NOT
// equally bad:
//   - SessionStart accepts startup | resume | clear | compact — the same
//     vocabulary as Claude, so its matchers mirror verbatim.
//   - SessionEnd accepts ONLY `other`. Claude's `clear|exit|compact` names
//     nothing Codex emits, so mirroring it verbatim would register a hook that
//     can NEVER fire. The matcher is therefore dropped and the hook runs on every
//     session end — unscoped, which is why the drop is recorded rather than silent.
//   - UserPromptSubmit and Stop IGNORE matchers outright. Preserving one is
//     behaviourally identical to dropping it today and stays forward-compatible
//     if Codex ever honors them, so they are deliberately left alone. Never read a
//     preserved matcher on those two events as evidence the hook is scoped.
// Only an UNMATCHABLE matcher belongs in this set; an ignored one does not.
const CODEX_MATCHER_UNSUPPORTED = new Set(["SessionEnd"]);

// The launcher is three parts so the lean variant is the full one minus exactly
// its Git step, and the full render stays byte-identical to its earlier one-array form.
const launcherRootSteps = [
  "const fs = require('node:fs');",
  "const path = require('node:path');",
  "const hookPath = process.argv[1];",
  "let root = process.cwd();",
  "for (let candidate = root; ; candidate = path.dirname(candidate)) {",
  "if (fs.existsSync(path.join(candidate, '.claude'))) { root = candidate; break; }",
  "if (path.dirname(candidate) === candidate) break;",
  "}",
  "process.chdir(root);",
  "process.env.CLAUDE_PROJECT_DIR = root;",
];
const launcherGitSteps = [
  "const gitHelperPath = path.join(root, '.claude', 'hooks', 'lib', 'windows-git.cjs');",
  "try { if (fs.existsSync(gitHelperPath)) { const git = require(gitHelperPath); const result = git.resolveWindowsGit(); if (result && result.outcome === git.OUTCOMES.READY) Object.assign(process.env, git.withGitEnvironment(process.env, result.capability)); } } catch {}",
];
const launcherRunStep = "require(path.join(root, hookPath));";

const nodeHookLauncher = [...launcherRootSteps, ...launcherGitSteps, launcherRunStep].join(" ");

// Protocol delivery entries run no Git, and they start on every Codex prompt and
// shell call, so they skip the Windows Git probe (about 430 ms on a loaded machine;
// the lean launcher's shell-call p90 was 2.5x lower in the confirmation run).
const leanHookLauncher = [...launcherRootSteps, launcherRunStep].join(" ");
const FAILURE_REMINDER_HOOK_PATH = ".claude/hooks/failure-investigation-remind.cjs";

// A desktop process need not inherit the terminal's Node/version-manager PATH.
// Resolve before Node starts; keep stdin untouched and never source shell profiles.
// commandWindows retains the native launcher (Codex's Windows override).
const posixNodeResolver = [
  'if [ -n "${CK_NODE_PATH:-}" ]; then',
  '  ck_node="$CK_NODE_PATH";',
  '  if [ ! -x "$ck_node" ] || [ -d "$ck_node" ]; then printf "%s\\n" "Framework hooks: CK_NODE_PATH is not an executable file: $ck_node" >&2; exit 127; fi;',
  'else',
  '  ck_node=$(command -v node 2>/dev/null) || ck_node=;',
  '  if [ -z "$ck_node" ]; then',
  '    for ck_candidate in "${VOLTA_HOME:-$HOME/.volta}/bin/node" "${ASDF_DATA_DIR:-$HOME/.asdf}/shims/node" "${MISE_DATA_DIR:-${XDG_DATA_HOME:-$HOME/.local/share}/mise}/shims/node"; do',
  '      if [ -x "$ck_candidate" ] && [ ! -d "$ck_candidate" ]; then ck_node="$ck_candidate"; break; fi;',
  '    done;',
  '  fi;',
  '  if [ -z "$ck_node" ]; then',
  '    ck_nvm_dir="${NVM_DIR:-$HOME/.nvm}";',
  '    if [ -s "$ck_nvm_dir/nvm.sh" ]; then',
  '      ck_node=$(export NVM_DIR="$ck_nvm_dir"; set -- --no-use; . "$NVM_DIR/nvm.sh" >/dev/null 2>&1; nvm which default 2>/dev/null) </dev/null || ck_node=;',
  '    fi;',
  '  fi;',
  '  if [ -z "$ck_node" ]; then',
  '    for ck_candidate in /opt/homebrew/bin/node /usr/local/bin/node /usr/bin/node /bin/node; do',
  '      if [ -x "$ck_candidate" ] && [ ! -d "$ck_candidate" ]; then ck_node="$ck_candidate"; break; fi;',
  '    done;',
  '  fi;',
  'fi;',
  'if [ -z "$ck_node" ] || [ ! -x "$ck_node" ] || [ -d "$ck_node" ]; then printf "%s\\n" "Framework hooks: Node.js was not found. Install Node.js 18+, configure your version manager default, or set CK_NODE_PATH to the Node executable in the app environment." >&2; exit 127; fi;',
  'case "$ck_node" in /*) ;; *) ck_node="$(pwd -P)/$ck_node" ;; esac;',
  'PATH="${ck_node%/*}:$PATH"; export PATH;',
  'exec "$ck_node" "$@";',
].join("\n");

function quotePosix(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

const NODE_PROJECT_HOOK = /^\s*node\s+"?\$(?:\{CLAUDE_PROJECT_DIR\}|CLAUDE_PROJECT_DIR)"?((?:[/\\][^\s"']+)+)\s*$/;

/** The project-relative hook path of a `node "$CLAUDE_PROJECT_DIR"/<path>` command, or null. */
function projectHookPath(command) {
  const match = typeof command === "string" ? command.match(NODE_PROJECT_HOOK) : null;
  return match ? match[1].replace(/^[\\/]+/, "").replaceAll("\\", "/") : null;
}

/**
 * Render one Claude hook command as the Codex command. Exported so tests can pin the
 * render of an existing hook byte for byte and the lean render of a protocol entry.
 * @param {string} command - The Claude settings.json command
 * @param {{windows?: boolean}} options Select the native Windows override instead of POSIX bootstrap
 * @returns {string|null} The Codex command, or null for an empty command
 */
export function normalizeCommand(command, { windows = false } = {}) {
  if (typeof command !== "string" || command.trim().length === 0) {
    return null;
  }

  // Claude uses $CLAUDE_PROJECT_DIR; Codex commands run from the session cwd,
  // which may be a repository subdirectory. Launch Node hooks through a
  // cross-platform resolver: nearest .claude parent in either a worktree or a
  // bare framework copy. This avoids an embedded checkout path and a Git
  // subprocess on every hook invocation.
  const hookPath = projectHookPath(command);
  if (hookPath) {
    const launcher = isProtocolHookPath(hookPath) || hookPath === FAILURE_REMINDER_HOOK_PATH ? leanHookLauncher : nodeHookLauncher;
    if (windows) return `node -e "${launcher}" -- ${JSON.stringify(hookPath)}`;
    return `/bin/sh -c ${quotePosix(posixNodeResolver)} ck-node -e ${quotePosix(launcher)} -- ${quotePosix(hookPath)}`;
  }

  // Preserve the previous cwd-relative behavior for non-Node commands whose
  // project-root variable cannot be safely wrapped without changing semantics.
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

/**
 * Write the Codex hook mirror into `targetDir`; the default sync report is
 * stored under the consuming project's `tmp` directory.
 *
 * Exported so the divergence oracle can materialize a FRESH mirror with THIS
 * function — the same writer the real sync uses — instead of re-deriving what
 * the output "should" look like. A second derivation is a second implementation
 * that drifts from this one, and then the guard passes while the mirror is
 * wrong.
 * @param {string} targetDir - Directory to write hooks.json and, for staging targets, the report into
 * @returns {Promise<object>} The sync report
 */
export async function materializeHookMirror(targetDir = codexDir) {
  return main(targetDir);
}

async function main(targetDir = codexDir) {
  const hooksPath = path.join(targetDir, "hooks.json");
  const hooksReportPath = targetDir === codexDir ? reportPath : path.join(targetDir, "hooks.sync.report.json");
  const rawSettings = await fs.readFile(claudeSettingsPath, "utf8");
  const claudeSettings = JSON.parse(rawSettings);
  const claudeHooks = claudeSettings?.hooks ?? {};

  const codexHooks = {};
  const report = {
    generated_at: new Date().toISOString(),
    source: path.relative(rootDir, claudeSettingsPath).replaceAll("\\", "/"),
    target: path.relative(rootDir, codexHooksPath).replaceAll("\\", "/"),
    notes: [
      "Generated Node hook commands resolve from the nearest .claude parent, so the tracked mirror works in worktrees, session subdirectories, and bare framework copies.",
      "Project Node hooks bootstrap Node on macOS/Linux without terminal profiles; commandWindows preserves the native Windows launcher. CK_NODE_PATH overrides POSIX discovery; otherwise PATH, standard installations, supported shims and NVM default are checked.",
      "Tool matcher capabilities vary by event on Codex. SessionStart shares Claude's startup|resume|clear|compact vocabulary and mirrors verbatim. SessionEnd accepts only `other`, so Claude's clear|exit|compact is DROPPED — kept verbatim it would name nothing Codex emits and the hook could never fire; it mirrors unscoped instead, recorded as a matcher-unsupported-on-codex-hook-runs-unscoped group skip. UserPromptSubmit and Stop ignore matchers entirely, so theirs are preserved unchanged: identical behaviour today, forward-compatible if Codex ever honors them.",
      "Hooks belong in .codex/hooks.json ONLY. Codex loads ALL matching hook sources (~/.codex and <repo>/.codex, hooks.json and config.toml) rather than letting a higher layer replace a lower one, so declaring the same hook in both .codex/config.toml and .codex/hooks.json runs it twice. Repo-level hooks load automatically but only when the project layer is trusted.",
      "SessionStart hooks are omitted from the generated Codex config by default so startup context is not duplicated; both hosts load the same static files, and an adopter may add a local startup hook as an optional accelerator.",
      "EXCEPTION: SessionStart hooks on the codexSessionStartMirrors allowlist ARE mirrored. They produce a runtime signal that a mirrored non-SessionStart hook consumes, so skipping them would leave the consumer registered and permanently unreachable rather than merely un-accelerated. The report's session_start_mirrors array names each one and the consumer that forces it.",
      "The failure investigation reminder uses a conditional shell PreToolUse hint because local Codex PostToolUse responses do not promise exit status. It uses the no-Git launcher and a mirrored compact/clear reset. Claude's native PostToolUseFailure accelerator is unsupported and explicitly reported as skipped; no tool-output scanning is substituted.",
      "Protocol delivery entries (.claude/hooks/protocol-inject-<name>.cjs and .claude/hooks/skill-overlay-remind.cjs) map differently, and only they do: UserPromptExpansion groups join UserPromptSubmit (reported as remapped-to-user-prompt-submit); groups keyed only to Read or Skill, tools Codex never emits, are not mirrored (matcher-names-no-codex-tool); the Read group's entries render once more on the Codex shell tool, Bash (codex_only_groups); a SubagentStart agent-type list is anchored because Codex matchers are unanchored regexes; each entry carries additionalContextLimit 3000 and a launcher without the Git step. Project Node launch commands use the POSIX runtime bootstrap and original Windows override; changed definitions need review in Codex /hooks before they run.",
    ],
    session_start_mirrors: [...codexSessionStartMirrors].map(([hook, reason]) => ({
      hook,
      required_by: reason,
    })),
    converted_events: [],
    skipped_events: [],
    converted_groups_total: 0,
    skipped_groups: [],
    codex_only_groups: [],
  };

  // Remapped groups join their target event AFTER that event's own groups, so every
  // existing group keeps its index and render.
  const pendingRemaps = [];

  for (const [eventName, groups] of Object.entries(claudeHooks)) {
    const disabledReason = disabledCodexEvents.get(eventName);
    // A disabled event still mirrors the hooks on its narrow allowlist — those
    // PRODUCE a signal a mirrored consumer READS. See codexSessionStartMirrors.
    const mirrorOnly =
      disabledReason &&
      eventName === "SessionStart" &&
      Array.isArray(groups) &&
      groups.some(group =>
        (Array.isArray(group?.hooks) ? group.hooks : []).some(hook =>
          sessionStartMirrorReason(hook?.command)
        )
      );
    // No allowlisted producer in this event → the original event-level skip stands
    // verbatim, reason unchanged. The exception adds rows; it never rewrites the rule.
    if (disabledReason && !mirrorOnly) {
      report.skipped_events.push({
        event: eventName,
        reason: disabledReason,
      });
      continue;
    }

    const remap = codexEventRemaps.get(eventName);
    if (!supportedEvents.has(eventName) && !remap) {
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
      const noCodexTool = TOOL_EVENTS.has(eventName) && matcherNamesNoCodexTool(matcher);
      const shellRead =
        noCodexTool && eventName === "PostToolUse" && matcher.split("|").includes(CODEX_SHELL_READ.from);

      const mappedHooks = [];
      const shellReadHooks = [];
      let droppedNonProtocolOnRemap = false;
      let droppedProtocolNoCodexTool = false;
      for (const hook of hooks) {
        if (mirrorOnly && !sessionStartMirrorReason(hook?.command)) continue;
        const isProtocol = isProtocolHookPath(projectHookPath(hook?.command));
        if (remap && !isProtocol) {
          droppedNonProtocolOnRemap = true;
          continue;
        }
        const command = normalizeCommand(hook?.command);
        if (!command) continue;

        const mappedHook = {
          type: "command",
          command,
        };
        if (projectHookPath(hook?.command)) {
          mappedHook.commandWindows = normalizeCommand(hook.command, { windows: true });
        }
        if (typeof hook?.timeout === "number" && Number.isFinite(hook.timeout)) {
          mappedHook.timeout = hook.timeout;
        }
        if (isProtocol) mappedHook.additionalContextLimit = PROTOCOL_CONTEXT_LIMIT;
        if (isProtocol && noCodexTool) {
          droppedProtocolNoCodexTool = true;
          if (shellRead) shellReadHooks.push(mappedHook);
          continue;
        }
        mappedHooks.push(mappedHook);
      }

      if (droppedNonProtocolOnRemap) {
        // Recorded and unreviewed: only protocol entries may change event on Codex.
        pushSkip(report, eventName, i, "remap-limited-to-protocol-entries", matcher);
      }
      if (droppedProtocolNoCodexTool) {
        pushSkip(report, eventName, i, "matcher-names-no-codex-tool", matcher);
      }

      if (mappedHooks.length > 0) {
        const mappedGroup = { hooks: mappedHooks };
        if (matcher && matcher !== "*" && !CODEX_MATCHER_UNSUPPORTED.has(eventName)) {
          mappedGroup.matcher =
            eventName === "SubagentStart" ? anchorAgentTypeMatcher(matcher) : mapMatcherForCodex(matcher);
        } else if (matcher && matcher !== "*") {
          // Recorded, not silently dropped: the hook still mirrors, but UNSCOPED.
          pushSkip(report, eventName, i, "matcher-unsupported-on-codex-hook-runs-unscoped", matcher);
        }
        mappedGroups.push(mappedGroup);
      } else if (!droppedNonProtocolOnRemap && !droppedProtocolNoCodexTool) {
        pushSkip(
          report,
          eventName,
          i,
          mirrorOnly ? "session-start-not-on-mirror-allowlist" : "no-command-hooks",
          matcher
        );
      }

      if (shellReadHooks.length > 0) {
        // The Codex shell stands in for the Claude `Read` tool, in the Read group's place.
        mappedGroups.push({ hooks: shellReadHooks, matcher: CODEX_SHELL_READ.matcher });
        report.codex_only_groups.push({
          event: eventName,
          matcher: CODEX_SHELL_READ.matcher,
          hooks: shellReadHooks.length,
          derived_from: { group_index: i, matcher },
          reason: CODEX_SHELL_READ.reason,
        });
      }
    }

    if (remap) {
      if (mappedGroups.length > 0) {
        pendingRemaps.push({ target: remap.target, groups: mappedGroups });
        report.skipped_events.push({ event: eventName, reason: remap.reason });
      } else {
        report.skipped_events.push({ event: eventName, reason: "no-compatible-groups-after-filtering" });
      }
      continue;
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

  for (const { target, groups } of pendingRemaps) {
    codexHooks[target] = [...(codexHooks[target] ?? []), ...groups];
    const converted = report.converted_events.find(entry => entry.event === target);
    if (converted) converted.groups += groups.length;
    else report.converted_events.push({ event: target, groups: groups.length });
    report.converted_groups_total += groups.length;
  }

  await fs.mkdir(targetDir, { recursive: true });
  await fs.mkdir(path.dirname(hooksReportPath), { recursive: true });
  await writeFileTransientSafe(hooksPath, `${JSON.stringify({ hooks: codexHooks }, null, 2)}\n`, "utf8");
  await writeFileTransientSafe(hooksReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  if (targetDir === codexDir) {
    console.log(
      `[codex-hooks-sync] wrote ${path.relative(rootDir, codexHooksPath)} with ${report.converted_groups_total} group(s) across ${report.converted_events.length} event(s)`
    );
    console.log(
      `[codex-hooks-sync] skipped ${report.skipped_groups.length} incompatible group(s); report: ${path.relative(rootDir, reportPath)}`
    );
  }
  return report;
}

// Importing this module must not write the real mirror — the divergence oracle
// imports it to materialize into a temp directory.
const invokedAsScript = isInvokedAsScript(process.argv[1], fileURLToPath(import.meta.url));
if (invokedAsScript) {
  await main();
}
