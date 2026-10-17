#!/usr/bin/env node

// Enforce the framework's skill-selection policy on opencode through `permission.skill`.
//
// opencode auto-discovers `.claude/skills` but ignores `disable-model-invocation`, so a command-only
// skill stays model-selectable there. This writer maps each skill to an opencode permission entry in
// the project-root `opencode.json`:
//
//   command-only skill (`disable-model-invocation: true`)      -> "deny"  (hidden, load rejected)
//   workflow wrapper (skill name = workflow id), tier manual    -> "deny"
//   workflow wrapper, tier confirm                              -> "ask"
//   workflow wrapper, tier auto / any other skill               -> no entry
//
// A workflow wrapper follows its EFFECTIVE tier (project override, else the stricter of its framework
// tier and the project default — `resolveActivationTier`), never the raw `workflows.json` value, so a
// project override that loosens a manual workflow to auto removes its entry even though the wrapper's
// frontmatter still marks it command-only. The tiers come from the TEAM scope: `opencode.json` is a
// project file, so a developer's `.claude/.ck.local.json` never lands in it.
//
// Called skills are never governed by the policy above: a skill named as a step of any workflow (every
// mode), in any agent's `skills:` frontmatter list, in the curated called-skill list or in the entry-skill
// list (`start-workflow` and the setup skills a hook or root file starts) keeps no entry,
// and the run prints `skipped <name>: called by <callers>`. Hiding it would break the caller. The
// called set has one owner, `resolveProfile().called` in `.claude/scripts/sync-skill-profile.cjs`.
//
// Skill profile (the project config's `skillProfile`, resolved by that same `resolveProfile()`):
//   nameOnly            -> no entry from the profile (an `ask` would stop every workflow step that loads
//                          the skill for a permission prompt); a stricter entry from the policy above stays
//   commandOnly / off   -> "deny" plus a generated command, so `/name` still runs it
// A called skill in commandOnly or off is refused unless `skillProfile.allowHidingCalledSkills` is true:
// the run then prints the resolver's message, exits non-zero and writes nothing. With the opt-in the
// entry is written and a warning line names the skill. Profile entries go through the same ownership
// ledger, so a user key is never adopted, overwritten or loosened.
//
// Ownership: only keys recorded in `.opencode/skill-permissions.generated.json` belong to this
// generator, each with the value it wrote. A key that existed before the generator first wrote it is
// the user's and is never adopted. An owned key whose value the user changed is kept and reported with
// one `conflict:` line. A `permission` or `permission.skill` that is not a map is never rewritten. A
// deleted owned key is restored with no conflict line — set an explicit value (for example "allow") to
// keep a skill loadable.
// The ledger is bound to its project: it records the project config's `project.name` (the config file
// `.claude/.ck.json` points at, default `docs/project-config.json`), or null when there is none. A
// ledger whose `project` is missing or differs is one copied from another project: it is ignored
// (owned = {}) with one printed line, so every entry already in `opencode.json` stays the user's. A
// project config that exists but is not valid JSON stops the run before anything is written.
// Only the `permission.skill` map is touched: reading a skill file by path (`read` permission) is
// never restricted, so workflows that read `.claude/skills/<name>/SKILL.md` directly keep working.
//
// Writes: `opencode.json` is the user's file, so only its top-level `permission` member is re-rendered
// (2-space JSON, the file's own line ending); every byte outside that member is kept, and the rewritten
// text is re-parsed and every other top-level key checked unchanged before anything is written. (The
// full OpenCode sync runs `sync-config.mjs` first, which renders the whole file in its canonical 2-space
// form; on that form this splice is byte-identical to a full re-render, so its `--check` stays green.) Each
// file is written to a temp file renamed over the target. The ledger holding the union of the owned keys
// before and after goes first, then `opencode.json`, then the final ledger, so an interruption never
// leaves a generator key unrecorded (the order and union are shared with sync-skill-profile.cjs).
//
// Commands: a hidden skill keeps its explicit `/name` through `.opencode/commands/<name>.md`, whose
// body includes the skill file (`@.claude/skills/<name>/SKILL.md`) and passes `$ARGUMENTS`. One is
// written for every skill whose final exact `permission.skill` entry is "deny" — the policy's own
// deny entries and a user deny alike; a kept user value that is not "deny" gets none. The command
// name is the validated skill FOLDER name, never frontmatter text; the
// write path must resolve inside `.opencode/commands/`. Only files carrying COMMAND_MARKER are ever
// rewritten or deleted: a marked command whose skill is no longer hidden is removed, and a user
// command without the marker that already uses the name (in `commands/` or opencode's singular
// `command/` alias) is kept, no generated command replaces it, and one conflict line names it.
// Generated bodies contain no `!` shell injection.
//
// PORTABILITY CONTRACT: pure `node:` built-ins + local `.cjs`/`.mjs` modules inside `.claude/scripts`.
//
// Usage:
//   node .claude/scripts/opencode/sync-skills.mjs           # update permission.skill + commands
//   node .claude/scripts/opencode/sync-skills.mjs --check   # verify both are current (read-only)

import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { parseFrontmatter, parseFrontmatterBoolean } from "../lib/agent-frontmatter.mjs";
import { yamlQuote } from "./sync-agents.mjs";
import { resolveRootConfigPath } from "./sync-config.mjs";

const require = createRequire(import.meta.url);
const { resolveMutationProjectRoot, isInvokedAsScript } = require("../lib/project-root.cjs");
const { resolveActivationTier, resolveProjectConfigPath, resolveWorkflowActivation } = require("../lib/workflow-routing-config.cjs");
const {
  assertOnlyMemberChanged,
  ownedUnion,
  resolveProfile,
  spliceTopLevelMember,
  writePairCrashConsistent,
  writeTextAtomic,
} = require("../sync-skill-profile.cjs");

const rootResolution = resolveMutationProjectRoot({
  cwd: process.cwd(),
  scriptPath: fileURLToPath(import.meta.url),
  env: process.env,
});
const defaultRootDir = rootResolution.rootDir;

export const SKILLS_RELATIVE = path.join(".claude", "skills");
export const WORKFLOWS_RELATIVE = path.join(".claude", "workflows.json");
export const LEDGER_RELATIVE = path.join(".opencode", "skill-permissions.generated.json");
export const COMMANDS_RELATIVE = path.join(".opencode", "commands");
// opencode also loads commands from the singular `command/` folder; a user command there claims the name too.
export const COMMAND_ALIAS_RELATIVE = path.join(".opencode", "command");

/** First line of the generated-command marker; only files carrying it are ever rewritten or deleted. */
export const COMMAND_MARKER = "<!-- GENERATED OPENCODE COMMAND (sync-skills.mjs)";

/** A governable skill name: the folder name, lowercase letters, digits and hyphens. */
export const SKILL_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/** Permission entry per effective workflow tier; `null` = no entry. */
export const PERMISSION_BY_TIER = Object.freeze({ manual: "deny", confirm: "ask", auto: null });

const LEDGER_DESCRIPTION =
  "Generated by .claude/scripts/opencode/sync-skills.mjs. Lists the opencode.json permission.skill " +
  "entries this generator owns, with the value it wrote. Entries not listed here are user-owned and never changed. " +
  "Bound to the project named in \"project\": a ledger from another project is ignored. Generated per project; do not copy it.";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function byCodeUnit(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

async function readTextIfExists(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function parseJson(text, role, filePath) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${role} is not valid JSON (${filePath}): ${error.message}`);
  }
}

/**
 * Read every `<skills>/<folder>/SKILL.md`. Folders that fail SKILL_NAME_PATTERN are returned in
 * `invalid` and never governed: their name cannot be a safe permission key or command name.
 * @returns {Promise<{skills: Array<{folder: string, declaredName: string, description: string, commandOnly: boolean}>, invalid: string[]}>}
 */
export async function readSkillCatalog(skillsDir) {
  let entries;
  try {
    entries = await fs.readdir(skillsDir, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return { skills: [], invalid: [] };
    throw error;
  }
  const skills = [];
  const invalid = [];
  for (const entry of entries.filter((item) => item.isDirectory()).sort((a, b) => byCodeUnit(a.name, b.name))) {
    const text = await readTextIfExists(path.join(skillsDir, entry.name, "SKILL.md"));
    if (text === null) continue;
    if (!SKILL_NAME_PATTERN.test(entry.name)) {
      invalid.push(entry.name);
      continue;
    }
    const { frontmatter } = parseFrontmatter(text);
    skills.push({
      folder: entry.name,
      declaredName: typeof frontmatter.name === "string" ? frontmatter.name : "",
      description: typeof frontmatter.description === "string" ? frontmatter.description : "",
      commandOnly: parseFrontmatterBoolean(frontmatter["disable-model-invocation"]) === true,
    });
  }
  return { skills, invalid };
}

/** The `workflows` map of `.claude/workflows.json`; `{}` when the file is absent. */
export async function readWorkflows(workflowsPath) {
  const text = await readTextIfExists(workflowsPath);
  if (text === null) return {};
  const document = parseJson(text, "workflows catalog", workflowsPath);
  return isPlainObject(document?.workflows) ? document.workflows : {};
}

/** Profile lists that hide a skill on opencode: a "deny" entry plus a generated command. */
export const PROFILE_DENY_LISTS = new Set(["commandOnly", "off"]);

/**
 * The permission policy for opencode (BR-ADS-07 + BR-ADS-09, plus the skill profile). Pure.
 * @param {object} input
 * @param {Array} input.skills from readSkillCatalog
 * @param {object} input.workflows the workflows map
 * @param {object|null} input.activation resolved tier settings (`resolveWorkflowActivation`)
 * @param {Map<string, string[]>} input.called `resolveProfile().called`
 * @param {Record<string, string>} [input.profile] `resolveProfile().overrides` (refused entries are never in it)
 * @returns {{desired: Map<string, string>, skipped: Array<{name: string, value: string, callers: string[]}>}}
 */
export function computeSkillPermissionPolicy({ skills, workflows, activation, called, profile = {} }) {
  const desired = new Map();
  const skipped = [];
  for (const skill of skills) {
    const name = skill.folder;
    // commandOnly/off hide the skill. The resolver already refused a called skill here unless the
    // project opted in, so the called-skill skip below does not apply to a profile entry.
    if (Object.hasOwn(profile, name) && PROFILE_DENY_LISTS.has(profile[name])) {
      desired.set(name, "deny");
      continue;
    }
    let value = null;
    if (Object.hasOwn(workflows || {}, name)) {
      const tier = resolveActivationTier({ workflowId: name, workflow: workflows[name], activation: activation ?? null });
      value = PERMISSION_BY_TIER[tier] ?? null;
    } else if (skill.commandOnly) {
      value = "deny";
    }
    if (value === null) continue;
    if (called.has(name)) {
      skipped.push({ name, value, callers: called.get(name) });
      continue;
    }
    desired.set(name, value);
  }
  return { desired, skipped };
}

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function formatValue(value) {
  if (value === null || value === undefined) return "no entry";
  return typeof value === "string" ? value : JSON.stringify(value);
}

/**
 * Merge the desired entries into a parsed `opencode.json` under the ownership rules (BR-ADS-08).
 * Pure: returns a new config, the new owned map and the conflict lines.
 * @param {object} config parsed project-root config
 * @param {Record<string, string>} ownedBefore ledger `skill` map
 * @param {Map<string, string>} desired from computeSkillPermissionPolicy
 * @returns {{config: object, owned: Record<string, string>, conflicts: string[], changed: boolean}}
 */
export function mergeSkillPermissions(config, ownedBefore, desired) {
  const next = structuredClone(config);
  const conflicts = [];
  const ownedCount = Object.keys(ownedBefore).length;
  if (desired.size === 0 && ownedCount === 0) return { config: next, owned: { ...ownedBefore }, conflicts, changed: false };

  if (next.permission !== undefined && !isPlainObject(next.permission)) {
    conflicts.push(`conflict: permission is ${formatValue(next.permission)} (not a map), generator wants ${desired.size} permission.skill entries; kept the user value`);
    return { config: next, owned: { ...ownedBefore }, conflicts, changed: false };
  }
  if (next.permission?.skill !== undefined && !isPlainObject(next.permission.skill)) {
    conflicts.push(`conflict: permission.skill is ${formatValue(next.permission.skill)} (not a map), generator wants ${desired.size} entries; kept the user value`);
    return { config: next, owned: { ...ownedBefore }, conflicts, changed: false };
  }

  const owned = { ...ownedBefore };
  let changed = false;
  const skillMap = () => {
    if (!isPlainObject(next.permission)) next.permission = {};
    if (!isPlainObject(next.permission.skill)) next.permission.skill = {};
    return next.permission.skill;
  };
  const names = [...new Set([...desired.keys(), ...Object.keys(ownedBefore)])].sort(byCodeUnit);
  for (const name of names) {
    const want = desired.has(name) ? desired.get(name) : null;
    const map = next.permission?.skill;
    const present = isPlainObject(map) && Object.hasOwn(map, name);
    const current = present ? map[name] : undefined;

    if (!Object.hasOwn(owned, name)) {
      // Never adopted: a pre-existing key is the user's, even when it already equals the wanted value.
      if (present) {
        if (want !== null && !sameValue(current, want)) {
          conflicts.push(`conflict: permission.skill.${name} is ${formatValue(current)}, generator wants ${formatValue(want)}; kept the user value`);
        }
        continue;
      }
      if (want !== null) {
        skillMap()[name] = want;
        owned[name] = want;
        changed = true;
      }
      continue;
    }

    if (present && !sameValue(current, owned[name])) {
      // The user edited an owned key. Keep it; resume ownership only when it already equals the wanted value.
      if (want !== null && sameValue(current, want)) {
        owned[name] = want;
        continue;
      }
      conflicts.push(`conflict: permission.skill.${name} is ${formatValue(current)}, generator wants ${formatValue(want)}; kept the user value`);
      if (want === null) delete owned[name];
      continue;
    }

    if (want === null) {
      if (present) {
        delete map[name];
        changed = true;
      }
      delete owned[name];
      continue;
    }
    if (!present || !sameValue(current, want)) {
      skillMap()[name] = want;
      changed = true;
    }
    owned[name] = want;
  }
  return { config: next, owned, conflicts, changed };
}

/**
 * Render the ownership ledger, bound to `project`; keys sorted so output is stable.
 * @param {Record<string, string>} owned
 * @param {string|null} project the project config's `project.name`, or null
 */
export function renderLedger(owned, project) {
  const skill = Object.fromEntries(Object.keys(owned).sort(byCodeUnit).map((name) => [name, owned[name]]));
  return `${JSON.stringify({ description: LEDGER_DESCRIPTION, project: project ?? null, skill }, null, 2)}\n`;
}

/**
 * The team project config `.claude/.ck.json` points at (default `docs/project-config.json`, resolved
 * like the workflow tiers), parsed; null when there is none. A config that exists but is not valid JSON
 * throws, so a broken file never unbinds the ledger and never hides whether a skill profile exists.
 */
export async function readProjectConfig(projectConfigPath) {
  const text = await readTextIfExists(projectConfigPath);
  return text === null ? null : parseJson(text, "project config", projectConfigPath);
}

/** The team project name: the config's `project.name`, or null when there is no config or no name. */
export async function readProjectName(projectConfigPath) {
  return projectNameOf(await readProjectConfig(projectConfigPath));
}

function projectNameOf(config) {
  const name = config?.project?.name;
  return typeof name === "string" && name.trim() ? name : null;
}

/** An Error carrying `resolveProfile()` refusals; its message is the refusal lines. */
function skillProfileRefusedError(refusals) {
  const error = new Error(refusals.map((refusal) => refusal.message).join("\n"));
  error.refusals = refusals;
  return error;
}

const describeProject = (value) => (value === undefined ? "none recorded" : JSON.stringify(value));

/**
 * Parse the ownership ledger. A ledger that records no `project`, or another project than `project`,
 * was copied from elsewhere: it is untrusted and yields no owned keys plus the line to print.
 * @returns {{owned: Record<string, string>, ignored: string|null}}
 */
export function readLedger(text, ledgerPath, project) {
  if (text === null) return { owned: {}, ignored: null };
  const document = parseJson(text, "skill permission ledger", ledgerPath);
  if (isPlainObject(document) && (!Object.hasOwn(document, "project") || document.project !== project)) {
    const recorded = describeProject(Object.hasOwn(document, "project") ? document.project : undefined);
    return {
      owned: {},
      ignored: `warning: ignored ${toPosix(LEDGER_RELATIVE)}: it belongs to another project (ledger project: ${recorded}; this project: ${describeProject(project)}); every existing permission.skill entry is treated as the user's`,
    };
  }
  const skill = document?.skill;
  if (!isPlainObject(skill) || !Object.values(skill).every((value) => typeof value === "string")) {
    throw new Error(`skill permission ledger must hold a "skill" map of string values: ${ledgerPath}`);
  }
  return { owned: { ...skill }, ignored: null };
}

/**
 * The new `opencode.json` text: only the top-level `permission` member is replaced (or appended), so
 * the user's formatting, key order and line endings outside it are kept. Throws when anything else would change.
 * @param {string|null} configText current file text (null = no file yet)
 * @param {object} before parsed current config ({} when there is no file)
 * @param {object} next merged config
 */
function renderConfigText(configText, before, next) {
  const text = spliceTopLevelMember(configText ?? "{}\n", "permission", next.permission);
  assertOnlyMemberChanged(before, parseJson(text, "rewritten opencode.json", "opencode.json"), "permission", next.permission);
  return text;
}

/** Collapse whitespace like `renderAgentDocument` does, so the description is one YAML line. */
export function collapseDescription(text, fallback) {
  return String(text ?? "").replace(/\s+/g, " ").trim() || fallback;
}

/**
 * Render one opencode command that loads a hidden skill. Pure: the same input gives the same bytes.
 * `name` must already be a validated folder name (SKILL_NAME_PATTERN).
 */
export function renderCommandDocument(name, description) {
  return [
    "---",
    `description: ${yamlQuote(collapseDescription(description, `Run the ${name} skill`))}`,
    "---",
    "",
    `${COMMAND_MARKER} for .claude/skills/${name}/SKILL.md — do not hand-edit; re-run:`,
    "     node .claude/skills/sync-opencode/scripts/run-opencode-sync.mjs -->",
    "",
    `@.claude/skills/${name}/SKILL.md`,
    "",
    "Arguments: $ARGUMENTS",
    "",
  ].join("\n");
}

export function hasCommandMarker(text) {
  return typeof text === "string" && text.split(/\r?\n/).some((line) => line.startsWith(COMMAND_MARKER));
}

function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

async function realpathIfExists(target) {
  try {
    return await fs.realpath(target);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

/**
 * Top-level `.md` entries of a commands folder, keyed by lowercase file name so a case-insensitive
 * file system can never let a generated write land on a differently-cased user file.
 * A non-regular file (symlink, directory) is reported as unmarked and never read through.
 */
async function readCommandEntries(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return new Map();
    throw error;
  }
  const byKey = new Map();
  for (const entry of entries) {
    if (!entry.name.toLowerCase().endsWith(".md")) continue;
    const filePath = path.join(dir, entry.name);
    const regular = entry.isFile() && !(await fs.lstat(filePath)).isSymbolicLink();
    const text = regular ? await fs.readFile(filePath, "utf8") : null;
    byKey.set(entry.name.toLowerCase(), { fileName: entry.name, filePath, text, marked: regular && hasCommandMarker(text) });
  }
  return byKey;
}

const toPosix = (relative) => relative.split(path.sep).join("/");

/**
 * Plan the command files for the hidden skills (BR-ADS-10). Reads the commands folders; writes nothing.
 * @param {object} input
 * @param {string} input.rootDir
 * @param {string} input.commandsDir `.opencode/commands`
 * @param {string} input.aliasDir `.opencode/command`
 * @param {Array<{name: string, description: string}>} input.wanted one per hidden skill
 * @returns {Promise<{writes: Array<{name: string, filePath: string, text: string, current: string|null}>, deletes: string[], conflicts: string[], warnings: string[], expected: Map<string, string>}>}
 */
export async function planCommandFiles({ rootDir, commandsDir, aliasDir, wanted }) {
  const realRoot = await realpathIfExists(rootDir);
  const realCommands = await realpathIfExists(commandsDir);
  if (!isWithin(path.resolve(rootDir), path.resolve(commandsDir)) || (realRoot && realCommands && !isWithin(realRoot, realCommands))) {
    throw new Error(`commands folder resolves outside the project: ${commandsDir}`);
  }
  const existing = await readCommandEntries(commandsDir);
  const aliasExisting = await readCommandEntries(aliasDir);
  const writes = [];
  const conflicts = [];
  const warnings = [];
  const expected = new Map();
  for (const { name, description } of wanted) {
    const fileName = `${name}.md`;
    const filePath = path.resolve(commandsDir, fileName);
    if (!SKILL_NAME_PATTERN.test(name) || path.dirname(filePath) !== path.resolve(commandsDir)) {
      warnings.push(`warning: skipped command for ${JSON.stringify(name)}: the name must match ${SKILL_NAME_PATTERN.source}`);
      continue;
    }
    const own = existing.get(fileName.toLowerCase());
    const alias = aliasExisting.get(fileName.toLowerCase());
    const userFile = own && !own.marked ? own : alias && !alias.marked ? alias : null;
    if (userFile) {
      conflicts.push(`conflict: ${toPosix(path.relative(rootDir, userFile.filePath))} is a user command without the generated marker; kept it, no command generated for skill ${name}`);
      continue;
    }
    const text = renderCommandDocument(name, description);
    expected.set(fileName, text);
    writes.push({ name, filePath, text, current: own && own.fileName === fileName ? own.text : null });
  }
  // A marked file under any other exact name (including a differently-cased one) is stale; deletes run
  // before writes, so on a case-insensitive file system the correctly-cased file replaces it.
  const deletes = [...existing.values()]
    .filter((entry) => entry.marked && !expected.has(entry.fileName))
    .map((entry) => entry.filePath)
    .sort(byCodeUnit);
  return { writes, deletes, conflicts, warnings, expected };
}

function resolvePaths(options = {}) {
  const rootDir = options.rootDir ?? defaultRootDir;
  return {
    rootDir,
    skillsDir: options.skillsDir ?? path.join(rootDir, SKILLS_RELATIVE),
    workflowsPath: options.workflowsPath ?? path.join(rootDir, WORKFLOWS_RELATIVE),
    configPath: options.configPath ?? resolveRootConfigPath(rootDir),
    ledgerPath: options.ledgerPath ?? path.join(rootDir, LEDGER_RELATIVE),
    projectConfigPath: options.projectConfigPath ?? resolveProjectConfigPath(rootDir),
    commandsDir: options.commandsDir ?? path.join(rootDir, COMMANDS_RELATIVE),
    commandAliasDir: options.commandAliasDir ?? path.join(rootDir, COMMAND_ALIAS_RELATIVE),
  };
}

/**
 * Compute everything one sync would write, without writing. Throws on an unreadable or invalid
 * `opencode.json`, ledger or workflows catalog, so nothing is written from a broken input.
 */
export async function planOpencodeSkills(options = {}) {
  const paths = resolvePaths(options);
  // The profile and the called set are resolved from the project root (`resolveProfile()` is their one
  // owner). A refused profile stops here, before anything is read for writing.
  const projectConfig = await readProjectConfig(paths.projectConfigPath);
  const profile = resolveProfile(paths.rootDir, projectConfig);
  if (profile.refusals.length > 0) throw skillProfileRefusedError(profile.refusals);

  const { skills, invalid } = await readSkillCatalog(paths.skillsDir);
  const workflows = await readWorkflows(paths.workflowsPath);
  const activation = options.activation !== undefined
    ? options.activation
    : resolveWorkflowActivation({ rootDir: paths.rootDir, scope: options.scope ?? "team" });
  const { desired, skipped } = computeSkillPermissionPolicy({ skills, workflows, activation, called: profile.called, profile: profile.overrides });

  const warnings = invalid.map((folder) => `warning: skipped skill folder ${folder}: name must match ${SKILL_NAME_PATTERN.source}`);
  // Resolver warnings (unknown profile names, a hidden called skill, an unresolved workflow) belong to a
  // declared profile; without one the output stays exactly what it was before profiles existed.
  if (profile.declared) warnings.push(...profile.warnings.map((line) => `warning: skill profile: ${line}`));
  const configText = await readTextIfExists(paths.configPath);
  const config = configText === null ? {} : parseJson(configText, "project opencode.json", paths.configPath);
  if (!isPlainObject(config)) throw new Error(`project opencode.json must be a JSON object: ${paths.configPath}`);
  const project = projectNameOf(projectConfig);
  const ledgerCurrent = await readTextIfExists(paths.ledgerPath);
  const ledger = readLedger(ledgerCurrent, paths.ledgerPath, project);
  if (ledger.ignored) warnings.unshift(ledger.ignored);
  const merge = mergeSkillPermissions(config, ledger.owned, desired);
  const ledgerWanted = ledgerCurrent === null && Object.keys(merge.owned).length === 0 ? null : renderLedger(merge.owned, project);

  // A skill is hidden only when its final exact entry is "deny" — the policy's or a user's. A policy deny
  // that was not written (a kept user value, or a `permission`/`permission.skill` that is not a map) hides nothing.
  const finalSkill = isPlainObject(merge.config.permission?.skill) ? merge.config.permission.skill : {};
  const hidden = skills.filter((skill) => Object.hasOwn(finalSkill, skill.folder) && finalSkill[skill.folder] === "deny");
  for (const skill of skills) {
    const governed = desired.has(skill.folder) || hidden.includes(skill);
    if (governed && skill.declaredName && skill.declaredName !== skill.folder) {
      warnings.push(`warning: skill folder ${skill.folder} declares name ${JSON.stringify(skill.declaredName)}; its permission entry and command use the folder name`);
    }
  }
  const commands = await planCommandFiles({
    rootDir: paths.rootDir,
    commandsDir: paths.commandsDir,
    aliasDir: paths.commandAliasDir,
    wanted: hidden.map((skill) => ({ name: skill.folder, description: skill.description })),
  });

  return {
    ...paths,
    desired,
    skipped,
    warnings: [...warnings, ...commands.warnings],
    conflicts: [...merge.conflicts, ...commands.conflicts],
    configExisted: configText !== null,
    configChanged: merge.changed,
    configText: merge.changed ? renderConfigText(configText, config, merge.config) : configText,
    ledgerCurrent,
    ledgerText: ledgerWanted,
    ledgerChanged: ledgerWanted !== null && ledgerWanted !== ledgerCurrent,
    ledgerInterimText: merge.changed ? renderLedger(ownedUnion(ledger.owned, merge.owned), project) : null,
    commands,
  };
}

/**
 * Write `permission.skill` into the project-root `opencode.json` and the ownership ledger.
 * @param {object} [options] rootDir, path overrides, `activation` (resolved settings), `scope`
 */
export async function materializeOpencodeSkills(options = {}) {
  const plan = await planOpencodeSkills(options);
  // Interim ledger (union) → opencode.json → final ledger, each through temp file + rename.
  writePairCrashConsistent(plan, {
    targetChanged: plan.configChanged,
    writeTarget: () => writeTextAtomic(plan.configPath, plan.configText),
    writeLedger: (text) => writeTextAtomic(plan.ledgerPath, text),
  });
  const commandsWritten = [];
  const commandsDeleted = [];
  for (const filePath of plan.commands.deletes) {
    await fs.rm(filePath);
    commandsDeleted.push(filePath);
  }
  for (const { filePath, text, current } of plan.commands.writes) {
    if (current === text) continue;
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, text, "utf8");
    commandsWritten.push(filePath);
  }
  return { ...plan, commandsWritten, commandsDeleted };
}

/** Read-only: fail when `permission.skill`, the ledger or a generated command differs from a fresh sync. */
export async function checkOpencodeSkills(options = {}) {
  const plan = await planOpencodeSkills(options);
  const reasons = [];
  if (plan.configChanged) reasons.push("opencode.json permission.skill is stale");
  if (plan.ledgerChanged) reasons.push(`${toPosix(LEDGER_RELATIVE)} is stale`);
  const relative = (filePath) => toPosix(path.relative(plan.rootDir, filePath));
  for (const { filePath, text, current } of plan.commands.writes) {
    if (current === null) reasons.push(`missing generated command ${relative(filePath)}`);
    else if (current !== text) reasons.push(`changed generated command ${relative(filePath)}`);
  }
  for (const filePath of plan.commands.deletes) reasons.push(`stale generated command ${relative(filePath)}`);
  return { ...plan, ok: reasons.length === 0, reasons };
}

function printNotes(plan, log) {
  for (const { name, callers } of plan.skipped) log(`[opencode-skills-sync] skipped ${name}: called by ${callers.join(", ")}`);
  for (const line of plan.conflicts) log(`[opencode-skills-sync] ${line}`);
  for (const line of plan.warnings) log(`[opencode-skills-sync] ${line}`);
}

async function main() {
  const check = process.argv.slice(2).includes("--check");
  try {
    if (check) {
      const result = await checkOpencodeSkills();
      printNotes(result, console.log);
      if (!result.ok) {
        for (const reason of result.reasons) console.error(`[opencode-skills-sync] ${reason}`);
        console.error("[opencode-skills-sync] run: node .claude/skills/sync-opencode/scripts/run-opencode-sync.mjs");
        process.exitCode = 1;
        return;
      }
      console.log(`[opencode-skills-sync] permission.skill and ${result.commands.writes.length} generated command(s) are current`);
      return;
    }
    const result = await materializeOpencodeSkills();
    printNotes(result, console.log);
    const deny = [...result.desired.values()].filter((value) => value === "deny").length;
    const verb = result.configChanged || result.ledgerChanged ? "updated" : "already current:";
    console.log(`[opencode-skills-sync] ${verb} permission.skill (${deny} deny, ${result.desired.size - deny} ask)`);
    console.log(`[opencode-skills-sync] commands: ${result.commands.writes.length} generated, ${result.commandsWritten.length} written, ${result.commandsDeleted.length} stale removed`);
  } catch (error) {
    if (Array.isArray(error.refusals)) {
      for (const refusal of error.refusals) console.error(`[opencode-skills-sync] ${refusal.message}`);
      console.error("[opencode-skills-sync] skill-profile: nothing was written");
    } else {
      console.error(`[opencode-skills-sync] ${error.message}`);
    }
    process.exitCode = 1;
  }
}

const invokedAsScript = isInvokedAsScript(process.argv[1], fileURLToPath(import.meta.url));
if (invokedAsScript) {
  await main();
}
