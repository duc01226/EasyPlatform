import test, { after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  COMMANDS_RELATIVE,
  COMMAND_ALIAS_RELATIVE,
  COMMAND_MARKER,
  LEDGER_RELATIVE,
  SKILL_NAME_PATTERN,
  checkOpencodeSkills,
  materializeOpencodeSkills,
  planOpencodeSkills,
  renderCommandDocument,
} from "../sync-skills.mjs";

// Every test builds its own temp project: skills, workflows, agents and project config are fixture
// data, never this repository's files, so the suite passes wherever `.claude` is copied.

const roots = [];
after(async () => {
  await Promise.all(roots.map((root) => fs.rm(root, { recursive: true, force: true })));
});

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "sync-skills.mjs");
const PROJECT_CONFIG = path.join("docs", "project-config.json");
const LEDGER_IGNORED = "warning: ignored .opencode/skill-permissions.generated.json: it belongs to another project";

function skillDocument({ name, description = "A fixture skill.", commandOnly = false }) {
  const lines = ["---", `name: ${name}`, `description: '${description}'`];
  if (commandOnly) lines.push("disable-model-invocation: true");
  lines.push("---", "", `# ${name}`, "");
  return lines.join("\n");
}

async function writeFile(root, relative, text) {
  await fs.mkdir(path.dirname(path.join(root, relative)), { recursive: true });
  await fs.writeFile(path.join(root, relative), text, "utf8");
}

const toJsonText = (value) => `${JSON.stringify(value, null, 2)}\n`;

/**
 * @param {object} spec
 * @param {Record<string, object|string>} [spec.skills] folder -> { commandOnly, description, name } or raw SKILL.md text
 * @param {Record<string, object>} [spec.workflows] workflows.json `workflows` map
 * @param {Record<string, string>} [spec.agents] agent name -> `skills:` frontmatter value
 * @param {object|string} [spec.projectConfig] docs/project-config.json content (object or raw text)
 * @param {object} [spec.localConfig] .claude/.ck.local.json content
 * @param {object|string} [spec.opencode] root opencode.json (object or raw text)
 * @param {object} [spec.ledger] the ownership ledger, as if copied or left by an earlier sync
 * @param {Record<string, string>} [spec.files] any other relative path -> text
 */
async function createProject(spec = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "opencode-skills-"));
  roots.push(root);
  const write = (relative, text) => writeFile(root, relative, text);
  for (const [folder, skill] of Object.entries(spec.skills ?? {})) {
    const text = typeof skill === "string" ? skill : skillDocument({ name: folder, ...skill });
    await write(path.join(".claude", "skills", folder, "SKILL.md"), text);
  }
  await write(path.join(".claude", "workflows.json"), toJsonText({ workflows: spec.workflows ?? {} }));
  for (const [agent, skills] of Object.entries(spec.agents ?? {})) {
    await write(path.join(".claude", "agents", `${agent}.md`), `---\nname: ${agent}\ndescription: Fixture agent.\nskills: ${skills}\n---\n\nBody.\n`);
  }
  if (spec.projectConfig !== undefined) {
    await write(PROJECT_CONFIG, typeof spec.projectConfig === "string" ? spec.projectConfig : JSON.stringify(spec.projectConfig));
  }
  if (spec.localConfig) await write(path.join(".claude", ".ck.local.json"), JSON.stringify(spec.localConfig));
  if (spec.opencode !== undefined) {
    await write("opencode.json", typeof spec.opencode === "string" ? spec.opencode : toJsonText(spec.opencode));
  }
  if (spec.ledger !== undefined) await write(LEDGER_RELATIVE, toJsonText(spec.ledger));
  for (const [relative, text] of Object.entries(spec.files ?? {})) await write(relative, text);
  return root;
}

const readText = (root, relative) => fs.readFile(path.join(root, relative), "utf8");
const readJson = async (root, relative) => JSON.parse(await readText(root, relative));
const exists = async (root, relative) => fs.access(path.join(root, relative)).then(() => true, () => false);

function wrapper(activation, sequence = ["plan"]) {
  return activation ? { activation, sequence } : { sequence };
}

function isolatedEnv(root) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (/^(TELEGRAM|DISCORD|SLACK)_/.test(key)) env[key] = "";
  }
  return { ...env, CLAUDE_PROJECT_DIR: root, HOME: root, USERPROFILE: root, TMPDIR: root, TEMP: root, TMP: root };
}

test("TC-ADS-011: a command-only skill gets deny and a confirm-tier workflow gets ask", async () => {
  // Given a command-only skill, a confirm-tier wrapper, an auto-tier wrapper and a plain skill
  const root = await createProject({
    skills: {
      "pdf-convert": { commandOnly: true },
      "workflow-feature": {},
      "workflow-bugfix": {},
      plan: {},
    },
    workflows: { "workflow-feature": wrapper("confirm"), "workflow-bugfix": wrapper(null) },
  });

  // When the third host is synced
  await materializeOpencodeSkills({ rootDir: root });

  // Then only the command-only skill and the confirm wrapper get entries, both recorded as owned
  const config = await readJson(root, "opencode.json");
  assert.deepEqual(config.permission.skill, { "pdf-convert": "deny", "workflow-feature": "ask" },
    "command-only -> deny, confirm wrapper -> ask, auto wrapper and plain skill -> no entry");
  assert.deepEqual((await readJson(root, LEDGER_RELATIVE)).skill, { "pdf-convert": "deny", "workflow-feature": "ask" },
    "both written entries are recorded as owned");
});

test("TC-ADS-015: unrelated settings survive, a second sync is byte-identical, and --check passes", async () => {
  // Given an adopter opencode.json with unrelated settings, including an unrelated permission key
  const unrelated = { $schema: "https://opencode.ai/config.json", theme: "dark", model: "x", permission: { bash: "ask" } };
  const root = await createProject({ skills: { "pdf-convert": { commandOnly: true } }, opencode: unrelated });

  // When the sync runs twice
  await materializeOpencodeSkills({ rootDir: root });
  const first = await readText(root, "opencode.json");
  const firstLedger = await readText(root, LEDGER_RELATIVE);
  const second = await materializeOpencodeSkills({ rootDir: root });

  // Then the second run changes nothing and every unrelated setting is kept
  assert.equal(second.configChanged, false);
  assert.equal(second.ledgerChanged, false);
  assert.equal(await readText(root, "opencode.json"), first, "second run leaves opencode.json byte-identical");
  assert.equal(await readText(root, LEDGER_RELATIVE), firstLedger, "second run leaves the ledger byte-identical");
  const config = JSON.parse(first);
  assert.equal(config.theme, "dark");
  assert.equal(config.model, "x");
  assert.equal(config.$schema, unrelated.$schema);
  assert.equal(config.permission.bash, "ask", "an unrelated permission key is preserved");
  assert.equal((await checkOpencodeSkills({ rootDir: root })).ok, true);
});

test("TC-ADS-015: no governed skills adds no permission block and no ledger", async () => {
  // Given a project whose skills need no entry, and an opencode.json with its own formatting
  const text = `${JSON.stringify({ theme: "dark" }, null, 4)}\n`;
  const root = await createProject({ skills: { plan: {} }, opencode: text });

  // When the third host is synced
  const result = await materializeOpencodeSkills({ rootDir: root });

  // Then nothing is written
  assert.equal(result.configChanged, false);
  assert.equal(await readText(root, "opencode.json"), text, "the untouched file keeps its own formatting");
  assert.equal(await exists(root, LEDGER_RELATIVE), false);
  assert.equal((await checkOpencodeSkills({ rootDir: root })).ok, true);
});

test("TC-ADS-015: an invalid opencode.json is refused and left unchanged", async () => {
  // Given an opencode.json that is not valid JSON
  const broken = "{ \"theme\": \"dark\", ";
  const root = await createProject({ skills: { "pdf-convert": { commandOnly: true } }, opencode: broken });

  // When the sync runs, Then it fails and writes neither the config nor a ledger
  await assert.rejects(materializeOpencodeSkills({ rootDir: root }), /not valid JSON/);
  assert.equal(await readText(root, "opencode.json"), broken);
  assert.equal(await exists(root, LEDGER_RELATIVE), false);
});

test("TC-ADS-058: a pre-existing user key is never adopted, overwritten or loosened", async () => {
  // Given the user hid the workflow and already set docx-convert to the wanted value before the first
  // sync, and keeps a wildcard entry of their own
  const root = await createProject({
    skills: { "workflow-feature": {}, "pdf-convert": { commandOnly: true }, "docx-convert": { commandOnly: true } },
    workflows: { "workflow-feature": wrapper("confirm") },
    opencode: { permission: { skill: { "workflow-feature": "deny", "docx-convert": "deny", "internal-*": "deny" } } },
  });

  // When the first sync runs
  const result = await materializeOpencodeSkills({ rootDir: root });

  // Then every user key is kept, one conflict line is printed, and only the written key is owned
  const skill = (await readJson(root, "opencode.json")).permission.skill;
  assert.equal(skill["workflow-feature"], "deny", "the user deny is never loosened to ask");
  assert.equal(skill["internal-*"], "deny", "a user wildcard entry is never rewritten");
  assert.equal(skill["pdf-convert"], "deny");
  assert.deepEqual(result.conflicts, ["conflict: permission.skill.workflow-feature is deny, generator wants ask; kept the user value"],
    "exactly one conflict line, and none for a user key that already equals the wanted value");
  assert.deepEqual((await readJson(root, LEDGER_RELATIVE)).skill, { "pdf-convert": "deny" },
    "pre-existing keys are not recorded as owned, even when equal to the wanted value");
});

test("TC-ADS-058: an owned key the user changed after the last sync is kept with one conflict line", async () => {
  // Given an owned entry the user changed to allow after the last sync
  const root = await createProject({ skills: { "pdf-convert": { commandOnly: true } } });
  await materializeOpencodeSkills({ rootDir: root });
  const config = await readJson(root, "opencode.json");
  config.permission.skill["pdf-convert"] = "allow";
  await fs.writeFile(path.join(root, "opencode.json"), toJsonText(config), "utf8");
  const edited = await readText(root, "opencode.json");

  // When the sync runs again
  const result = await materializeOpencodeSkills({ rootDir: root });

  // Then the user value stays, one conflict line is printed, and the check sees no drift
  assert.equal(await readText(root, "opencode.json"), edited, "the user edit stays");
  assert.deepEqual(result.conflicts, ["conflict: permission.skill.pdf-convert is allow, generator wants deny; kept the user value"]);
  assert.equal((await checkOpencodeSkills({ rootDir: root })).ok, true, "a kept user value is not drift");
});

test("TC-ADS-058: a permission.skill that is a single value is unchanged and reported", async () => {
  // Given permission.skill is a single value instead of a map
  const text = toJsonText({ permission: { skill: "deny" } });
  const root = await createProject({ skills: { "pdf-convert": { commandOnly: true } }, opencode: text });

  // When the third host is synced
  const result = await materializeOpencodeSkills({ rootDir: root });

  // Then the file is unchanged, one conflict is printed, and nothing is owned
  assert.equal(await readText(root, "opencode.json"), text);
  assert.equal(result.conflicts.length, 1);
  assert.match(result.conflicts[0], /^conflict: permission\.skill is deny \(not a map\).*kept the user value$/);
  assert.equal(await exists(root, LEDGER_RELATIVE), false, "no skill entries are written or owned");
});

test("BR-ADS-08: an owned entry the policy no longer wants is removed, and its ledger record with it", async () => {
  // Given two owned deny entries, then one skill stops being command-only
  const root = await createProject({ skills: { "pdf-convert": { commandOnly: true }, "docx-convert": { commandOnly: true } } });
  await materializeOpencodeSkills({ rootDir: root });
  await fs.writeFile(path.join(root, ".claude", "skills", "pdf-convert", "SKILL.md"), skillDocument({ name: "pdf-convert" }), "utf8");

  // When the check and then the sync run
  assert.equal((await checkOpencodeSkills({ rootDir: root })).ok, false, "check fails once the policy changed");
  await materializeOpencodeSkills({ rootDir: root });

  // Then the entry and its ownership record are both gone
  assert.deepEqual((await readJson(root, "opencode.json")).permission.skill, { "docx-convert": "deny" });
  assert.deepEqual((await readJson(root, LEDGER_RELATIVE)).skill, { "docx-convert": "deny" });
});

test("TC-ADS-055: an owned entry the user deleted is restored to the policy value with no conflict line", async () => {
  // Given an owned deny entry, and a second owned entry so the map itself survives the deletion
  const root = await createProject({ skills: { "pdf-convert": { commandOnly: true }, "docx-convert": { commandOnly: true } } });
  await materializeOpencodeSkills({ rootDir: root });
  const config = await readJson(root, "opencode.json");
  delete config.permission.skill["pdf-convert"];
  await fs.writeFile(path.join(root, "opencode.json"), toJsonText(config), "utf8");

  // When the sync runs again
  const result = await materializeOpencodeSkills({ rootDir: root });

  // Then deleting an owned key resets it to policy: it is written back, still owned, and no conflict is printed
  assert.deepEqual((await readJson(root, "opencode.json")).permission.skill, { "docx-convert": "deny", "pdf-convert": "deny" },
    "the deleted owned entry is restored");
  assert.deepEqual(result.conflicts, [], "a deleted owned key is not a user choice, so no conflict line");
  assert.deepEqual((await readJson(root, LEDGER_RELATIVE)).skill, { "docx-convert": "deny", "pdf-convert": "deny" });
  assert.equal((await checkOpencodeSkills({ rootDir: root })).ok, true);
});

test("TC-ADS-054: a ledger copied from another project is ignored, so the adopter's own entry survives a tier change", async () => {
  // Given an adopter whose own opencode.json hides a workflow, and a ledger copied in from another project
  // that lists the same entry with the same value
  const adopter = (tier) => createProject({
    skills: { "workflow-big-feature": {} },
    workflows: { "workflow-big-feature": wrapper("manual") },
    projectConfig: { project: { name: "adopter" }, portability: { workflowActivation: { overrides: { "workflow-big-feature": tier } } } },
    opencode: { theme: "dark", permission: { skill: { "workflow-big-feature": "deny" } } },
    ledger: { description: "copied", project: "source-project", skill: { "workflow-big-feature": "deny" } },
  });

  // When the team loosens that workflow to confirm and the sync runs
  const confirmRoot = await adopter("confirm");
  const confirm = await materializeOpencodeSkills({ rootDir: confirmRoot });

  // Then the user deny is kept (not loosened to ask), with one conflict line and one ignored-ledger line
  assert.equal((await readJson(confirmRoot, "opencode.json")).permission.skill["workflow-big-feature"], "deny",
    "the adopter's deny is never loosened by a copied ledger");
  assert.deepEqual(confirm.conflicts, ["conflict: permission.skill.workflow-big-feature is deny, generator wants ask; kept the user value"]);
  assert.equal(confirm.warnings.filter((line) => line.startsWith(LEDGER_IGNORED)).length, 1, "one line says the ledger was ignored");
  const rebound = await readJson(confirmRoot, LEDGER_RELATIVE);
  assert.equal(rebound.project, "adopter", "the ledger is rebound to this project");
  assert.deepEqual(rebound.skill, {}, "the rebound ledger owns nothing this project's sync did not write");

  // When the team loosens it to auto instead, through the CLI
  const autoRoot = await adopter("auto");
  const run = spawnSync(process.execPath, [SCRIPT], { cwd: autoRoot, env: isolatedEnv(autoRoot), encoding: "utf8" });

  // Then the user entry is not deleted, and the CLI prints the ignored-ledger line exactly once
  assert.equal(run.status, 0, run.stderr);
  assert.equal((await readJson(autoRoot, "opencode.json")).permission.skill["workflow-big-feature"], "deny",
    "the adopter's deny is never removed by a copied ledger");
  assert.equal(run.stdout.split(/\r?\n/).filter((line) => line.includes(LEDGER_IGNORED)).length, 1);
});

test("TC-ADS-054: a ledger written for this project stays trusted, including a project config relocated by .ck.json", async () => {
  const layouts = [
    { label: "default config path", configPath: PROJECT_CONFIG, files: {} },
    {
      label: "config relocated by .claude/.ck.json",
      configPath: path.join("settings", "team-config.json"),
      files: { [path.join(".claude", ".ck.json")]: JSON.stringify({ portability: { projectConfigPath: "settings/team-config.json" } }) },
    },
  ];
  for (const layout of layouts) {
    // Given a project named "fixture" whose first sync wrote and owns a manual-tier deny
    const teamConfig = (tier) => JSON.stringify({ project: { name: "fixture" }, portability: { workflowActivation: { overrides: { "workflow-a": tier } } } });
    const root = await createProject({
      skills: { "workflow-a": {} },
      workflows: { "workflow-a": wrapper("manual") },
      files: { ...layout.files, [layout.configPath]: teamConfig("manual") },
    });
    await materializeOpencodeSkills({ rootDir: root });
    assert.equal((await readJson(root, LEDGER_RELATIVE)).project, "fixture", `${layout.label}: the ledger records this project`);

    // When the team changes the tier to confirm and the sync runs again
    await writeFile(root, layout.configPath, teamConfig("confirm"));
    const result = await materializeOpencodeSkills({ rootDir: root });

    // Then the owned entry follows the policy: no conflict and no ignored-ledger line
    assert.equal((await readJson(root, "opencode.json")).permission.skill["workflow-a"], "ask", `${layout.label}: owned entry updated`);
    assert.deepEqual(result.conflicts, [], `${layout.label}: no conflict`);
    assert.equal(result.warnings.some((line) => line.startsWith(LEDGER_IGNORED)), false, `${layout.label}: ledger trusted`);
    assert.deepEqual((await readJson(root, LEDGER_RELATIVE)).skill, { "workflow-a": "ask" });
    assert.equal((await checkOpencodeSkills({ rootDir: root })).ok, true);
  }
});

test("TC-ADS-054: a ledger with no project field is untrusted", async () => {
  // Given a user deny entry and a ledger that lists it but records no project
  const root = await createProject({
    skills: { "pdf-convert": {} },
    projectConfig: { project: { name: "fixture" } },
    opencode: { permission: { skill: { "pdf-convert": "deny" } } },
    ledger: { description: "no project", skill: { "pdf-convert": "deny" } },
  });

  // When the policy no longer wants that entry and the sync runs
  const result = await materializeOpencodeSkills({ rootDir: root });

  // Then the entry is kept as the user's, one ignored-ledger line is printed, and the ledger is rebound
  assert.equal((await readJson(root, "opencode.json")).permission.skill["pdf-convert"], "deny", "the unowned entry is not removed");
  assert.deepEqual(result.warnings.filter((line) => line.startsWith(LEDGER_IGNORED)), [
    `${LEDGER_IGNORED} (ledger project: none recorded; this project: "fixture"); every existing permission.skill entry is treated as the user's`,
  ]);
  const ledger = await readJson(root, LEDGER_RELATIVE);
  assert.equal(ledger.project, "fixture");
  assert.deepEqual(ledger.skill, {});
});

test("TC-ADS-054: a project config that is not valid JSON stops the sync before anything is written", async () => {
  // Given a ledger bound to a project and a project config that no longer parses
  const opencodeText = toJsonText({ permission: { skill: { "pdf-convert": "deny" } } });
  const root = await createProject({
    skills: { "pdf-convert": { commandOnly: true } },
    projectConfig: "{ \"project\": { \"name\": ",
    opencode: opencodeText,
    ledger: { description: "bound", project: "fixture", skill: { "pdf-convert": "deny" } },
  });
  const ledgerText = await readText(root, LEDGER_RELATIVE);

  // When the sync runs, Then it fails and the ledger and opencode.json keep their bytes
  await assert.rejects(materializeOpencodeSkills({ rootDir: root }), /project config is not valid JSON/);
  assert.equal(await readText(root, LEDGER_RELATIVE), ledgerText, "a broken config never unbinds the ledger");
  assert.equal(await readText(root, "opencode.json"), opencodeText);
});

test("TC-ADS-060: a workflow called as another workflow's step keeps no entry under a strict default", async () => {
  // Given a strict confirm default, a workflow another workflow calls, and a skill an agent preloads
  const root = await createProject({
    skills: { "workflow-review-changes": {}, "workflow-feature": {}, commit: { commandOnly: true } },
    workflows: {
      "workflow-review-changes": wrapper(null, ["code-quality-review"]),
      "workflow-feature": wrapper(null, ["plan", "workflow-review-changes --fix-loop"]),
    },
    agents: { "git-manager": "commit" },
    projectConfig: { project: { name: "fixture" }, portability: { workflowActivation: { default: "confirm" } } },
  });

  // When the third host is synced
  const result = await materializeOpencodeSkills({ rootDir: root });

  // Then called skills keep no entry and each gets one skip line naming its caller
  const skill = (await readJson(root, "opencode.json")).permission.skill;
  assert.equal(Object.hasOwn(skill, "workflow-review-changes"), false, "a called workflow is never asked or hidden");
  assert.equal(Object.hasOwn(skill, "commit"), false, "a skill in an agent skills list is never hidden");
  assert.equal(skill["workflow-feature"], "ask", "the uncalled wrapper still follows the confirm default");
  assert.deepEqual(result.skipped.map(({ name, callers }) => `skipped ${name}: called by ${callers.join(", ")}`), [
    "skipped commit: called by agent git-manager",
    "skipped workflow-review-changes: called by workflow workflow-feature",
  ], "one skipped line per called skill, naming its caller");
});

test("TC-ADS-060: the skip line is printed by the CLI", async () => {
  // Given a called workflow under a strict default
  const root = await createProject({
    skills: { "workflow-review-changes": {}, "workflow-feature": {} },
    workflows: { "workflow-review-changes": wrapper(null), "workflow-feature": wrapper(null, ["workflow-review-changes"]) },
    projectConfig: { project: { name: "fixture" }, portability: { workflowActivation: { default: "confirm" } } },
  });

  // When the CLI runs
  const run = spawnSync(process.execPath, [SCRIPT], { cwd: root, env: isolatedEnv(root), encoding: "utf8" });

  // Then it prints exactly one skip line
  assert.equal(run.status, 0, run.stderr);
  const lines = run.stdout.split(/\r?\n/).filter((line) => line.includes("skipped "));
  assert.deepEqual(lines, ["[opencode-skills-sync] skipped workflow-review-changes: called by workflow workflow-feature"]);
});

test("TC-ADS-061: entries follow the effective tier, not the framework tier", async () => {
  // Given project overrides that tighten one wrapper and loosen another (b also carries the command-only
  // mark, like the framework's manual wrappers; the override still wins)
  const root = await createProject({
    skills: { "workflow-a": {}, "workflow-b": { commandOnly: true } },
    workflows: { "workflow-a": wrapper("auto"), "workflow-b": wrapper("manual") },
    projectConfig: {
      project: { name: "fixture" },
      portability: { workflowActivation: { overrides: { "workflow-a": "manual", "workflow-b": "auto" } } },
    },
  });

  // When the third host is synced
  await materializeOpencodeSkills({ rootDir: root });

  // Then the entries follow the overrides
  assert.deepEqual((await readJson(root, "opencode.json")).permission.skill, { "workflow-a": "deny" },
    "a tightened to manual is hidden; b loosened to auto has no entry");
});

test("effective tier comes from the team scope: a developer's local override never lands in opencode.json", async () => {
  // Given a tier override that exists only in a developer's local settings
  const root = await createProject({
    skills: { "workflow-a": {} },
    workflows: { "workflow-a": wrapper("auto") },
    projectConfig: { project: { name: "fixture" } },
    localConfig: { portability: { workflowActivation: { overrides: { "workflow-a": "manual" } } } },
  });

  // When the third host is synced
  const result = await materializeOpencodeSkills({ rootDir: root });

  // Then nothing is governed and no file is created
  assert.equal(result.desired.size, 0);
  assert.equal(await exists(root, "opencode.json"), false, "nothing to write, so no file is created");
});

test("handoff: a denied skill's SKILL.md stays readable by path (only permission.skill is written)", async () => {
  // Given a command-only skill a workflow may read by path
  const root = await createProject({
    skills: { "playwright-cli": { commandOnly: true }, "workflow-e2e": {} },
    workflows: { "workflow-e2e": wrapper(null, ["e2e-test"]) },
    opencode: { theme: "dark" },
  });

  // When the third host is synced
  await materializeOpencodeSkills({ rootDir: root });

  // Then only permission.skill is written, with plain skill-name keys
  const config = await readJson(root, "opencode.json");
  assert.equal(config.permission.skill["playwright-cli"], "deny");
  assert.deepEqual(Object.keys(config.permission), ["skill"],
    "no read/edit/external_directory rule is generated, so `read .claude/skills/playwright-cli/SKILL.md` stays allowed");
  for (const key of Object.keys(config.permission.skill)) {
    assert.match(key, SKILL_NAME_PATTERN, `generated key ${key} is a plain skill name, never a path or glob`);
  }
});

test("--check exits non-zero when permission.skill or the ledger is stale", async () => {
  // Given an unsynced project
  const root = await createProject({ skills: { "pdf-convert": { commandOnly: true } }, opencode: { theme: "dark" } });
  const check = () => spawnSync(process.execPath, [SCRIPT, "--check"], { cwd: root, env: isolatedEnv(root), encoding: "utf8" });

  // When the check runs before a sync, Then it fails
  const before = check();
  assert.equal(before.status, 1, "unsynced project fails the check");
  assert.match(before.stderr, /permission\.skill is stale/);

  // When the check runs after a sync, Then it passes
  await materializeOpencodeSkills({ rootDir: root });
  assert.equal(check().status, 0, check().stderr);

  // When the ledger gains a record the sync would drop, Then the check fails again
  const ledger = await readJson(root, LEDGER_RELATIVE);
  ledger.skill["docx-convert"] = "deny";
  await fs.writeFile(path.join(root, LEDGER_RELATIVE), toJsonText(ledger), "utf8");
  const stale = check();
  assert.equal(stale.status, 1, "a ledger record the sync would drop is drift");
  assert.match(stale.stderr, /skill-permissions\.generated\.json is stale/);
});

// ---- P45: generated commands for hidden skills (BR-ADS-10) ----

const commandPath = (name) => path.join(COMMANDS_RELATIVE, `${name}.md`);

async function listCommands(root) {
  try {
    return (await fs.readdir(path.join(root, COMMANDS_RELATIVE))).sort();
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function snapshotCommands(root) {
  const names = await listCommands(root);
  return Object.fromEntries(await Promise.all(names.map(async (name) => [name, await readText(root, path.join(COMMANDS_RELATIVE, name))])));
}

test("TC-ADS-012: every hidden skill gets a command that includes its SKILL.md and passes $ARGUMENTS", async () => {
  // Given a command-only skill, a manual wrapper, an ask wrapper, a plain skill, and a confirm wrapper
  // the user hid themselves (it is hidden, so it needs a command too)
  const root = await createProject({
    skills: {
      "pdf-convert": { commandOnly: true },
      "workflow-a": {},
      "workflow-feature": {},
      "workflow-user": {},
      plan: {},
    },
    workflows: { "workflow-a": wrapper("manual"), "workflow-feature": wrapper("confirm"), "workflow-user": wrapper("confirm") },
    opencode: { permission: { skill: { "workflow-user": "deny" } } },
  });

  // When the third host is synced
  await materializeOpencodeSkills({ rootDir: root });

  // Then exactly the hidden skills get a safe command that loads the skill and passes the arguments
  assert.deepEqual(await listCommands(root), ["pdf-convert.md", "workflow-a.md", "workflow-user.md"],
    "command-only, tier-hidden and user-hidden skills get commands; ask and plain skills do not");
  for (const name of ["pdf-convert", "workflow-a", "workflow-user"]) {
    const text = await readText(root, commandPath(name));
    assert.ok(text.includes(`@.claude/skills/${name}/SKILL.md`), `${name} includes its skill file`);
    assert.ok(text.includes("$ARGUMENTS"), `${name} passes the user arguments`);
    assert.ok(text.includes(COMMAND_MARKER), `${name} carries the generated marker`);
    assert.equal(/!`/.test(text), false, `${name} contains no shell injection`);
  }
});

test("TC-ADS-012 / BR-ADS-10: a skill the policy denies but whose final entry is not deny gets no command", async () => {
  // Given two owned deny entries with generated commands, then the user changes one to allow
  const root = await createProject({ skills: { "pdf-convert": { commandOnly: true }, "docx-convert": { commandOnly: true } } });
  await materializeOpencodeSkills({ rootDir: root });
  assert.deepEqual(await listCommands(root), ["docx-convert.md", "pdf-convert.md"]);
  const config = await readJson(root, "opencode.json");
  config.permission.skill["pdf-convert"] = "allow";
  await fs.writeFile(path.join(root, "opencode.json"), toJsonText(config), "utf8");

  // When the sync runs again
  const result = await materializeOpencodeSkills({ rootDir: root });

  // Then the kept allow means the skill is not hidden: its marked command is removed and no other is written
  assert.deepEqual(result.conflicts, ["conflict: permission.skill.pdf-convert is allow, generator wants deny; kept the user value"]);
  assert.deepEqual(await listCommands(root), ["docx-convert.md"], "only the skill whose final entry is deny keeps a command");
  assert.equal((await checkOpencodeSkills({ rootDir: root })).ok, true);

  // Given permission.skill is a single value, so no entry is written, When the sync runs, Then no command is generated
  const scalarRoot = await createProject({ skills: { "pdf-convert": { commandOnly: true } }, opencode: { permission: { skill: "allow" } } });
  await materializeOpencodeSkills({ rootDir: scalarRoot });
  assert.deepEqual(await listCommands(scalarRoot), [], "no exact deny entry, so no command");
});

test("TC-ADS-013: a user command without the marker is never touched", async () => {
  // Given a user command without the generated marker
  const root = await createProject({ skills: { "pdf-convert": { commandOnly: true } } });
  const userCommand = "---\ndescription: Deploy\n---\n\nDeploy the team build: $ARGUMENTS\n";
  await fs.mkdir(path.join(root, COMMANDS_RELATIVE), { recursive: true });
  await fs.writeFile(path.join(root, commandPath("team-deploy")), userCommand, "utf8");

  // When the sync runs twice
  await materializeOpencodeSkills({ rootDir: root });
  await materializeOpencodeSkills({ rootDir: root });

  // Then the user command is byte-identical and the check ignores it
  assert.equal(await readText(root, commandPath("team-deploy")), userCommand, "byte-identical after two syncs");
  assert.equal((await checkOpencodeSkills({ rootDir: root })).ok, true, "an unmarked user command is ignored by the check");
});

test("TC-ADS-013 / BR-ADS-10: a user command that already uses a hidden skill's name is kept with one conflict line", async () => {
  // Given user commands that already use two hidden skills' names — one in `commands/`, one in the
  // singular `command/` folder opencode also loads
  const root = await createProject({ skills: { "pdf-convert": { commandOnly: true }, "docx-convert": { commandOnly: true } } });
  const mine = "---\ndescription: My own pdf flow\n---\n\nConvert $ARGUMENTS my way.\n";
  const legacy = "---\ndescription: Legacy docx\n---\n\nLegacy $ARGUMENTS\n";
  await fs.mkdir(path.join(root, COMMANDS_RELATIVE), { recursive: true });
  await fs.writeFile(path.join(root, commandPath("pdf-convert")), mine, "utf8");
  await fs.mkdir(path.join(root, COMMAND_ALIAS_RELATIVE), { recursive: true });
  await fs.writeFile(path.join(root, COMMAND_ALIAS_RELATIVE, "docx-convert.md"), legacy, "utf8");

  // When the third host is synced
  const result = await materializeOpencodeSkills({ rootDir: root });

  // Then both user commands stay, no generated command shadows them, and one conflict line names each
  assert.equal(await readText(root, commandPath("pdf-convert")), mine, "the user command is not replaced");
  assert.equal(await readText(root, path.join(COMMAND_ALIAS_RELATIVE, "docx-convert.md")), legacy);
  assert.equal(await exists(root, commandPath("docx-convert")), false, "no generated command shadows the alias-folder user command");
  assert.deepEqual(result.conflicts, [
    "conflict: .opencode/command/docx-convert.md is a user command without the generated marker; kept it, no command generated for skill docx-convert",
    "conflict: .opencode/commands/pdf-convert.md is a user command without the generated marker; kept it, no command generated for skill pdf-convert",
  ], "one conflict line per claimed name, in skill order");
  assert.equal((await checkOpencodeSkills({ rootDir: root })).ok, true, "a kept user command is not drift");
});

test("TC-ADS-059: command names come from validated folder names and stay inside the commands folder", async () => {
  // Given an invalid skill folder name and a valid folder whose frontmatter declares a hostile name and
  // a description with quotes, a backslash, a tab and a line fold
  const hostile = [
    "---",
    "name: ../../evil",
    "description: >-",
    '  say  "hi" \\\tthen',
    "  next",
    "disable-model-invocation: true",
    "---",
    "",
    "Body.",
    "",
  ].join("\n");
  const root = await createProject({ skills: { Bad_Name: { commandOnly: true }, "good-skill": hostile } });

  // When the third host is synced
  const result = await materializeOpencodeSkills({ rootDir: root });

  // Then only the valid folder is governed, under its folder name, and nothing is written outside
  assert.ok(result.warnings.some((line) => line.startsWith("warning: skipped skill folder Bad_Name")), "invalid folder skipped with a warning");
  assert.ok(result.warnings.some((line) => line.includes("good-skill") && line.includes("../../evil")), "the declared name mismatch is reported");
  assert.deepEqual(await listCommands(root), ["good-skill.md"], "only the valid folder gets a command, under its folder name");
  assert.deepEqual(Object.keys((await readJson(root, "opencode.json")).permission.skill), ["good-skill"]);
  assert.equal(await exists(root, "evil.md"), false);
  assert.equal(await exists(root, path.join(".opencode", "evil.md")), false);
  assert.equal(await fs.access(path.join(root, "..", "evil.md")).then(() => true, () => false), false, "nothing is written outside the project");

  // Then the description round-trips: a YAML double-quoted scalar that escapes only `"` and `\` reads back like a JSON string
  const text = await readText(root, commandPath("good-skill"));
  const descriptionLine = text.split("\n").find((line) => line.startsWith("description: "));
  assert.equal(JSON.parse(descriptionLine.slice("description: ".length)), 'say "hi" \\ then next',
    "the description round-trips with whitespace collapsed");
  assert.ok(text.includes("@.claude/skills/good-skill/SKILL.md"));

  // When the renderer gets a raw line break, Then the frontmatter stays one YAML line
  const rendered = renderCommandDocument("good-skill", 'say "hi" \\ then\nnext');
  const line = rendered.split("\n").find((entry) => entry.startsWith("description: "));
  assert.equal(JSON.parse(line.slice("description: ".length)), 'say "hi" \\ then next');
});

test("TC-ADS-062: commands are repeatable, --check catches edit/delete/unhide, and the next sync repairs", async () => {
  // Given three hidden skills, and an unmarked file with a generated-looking name (boundary: never
  // counted, changed or removed)
  const root = await createProject({
    skills: { "pdf-convert": { commandOnly: true }, "docx-convert": { commandOnly: true }, "manual-export": { commandOnly: true }, "release-doc": {} },
  });
  const lookalike = "Not generated: $ARGUMENTS\n";
  await fs.mkdir(path.join(root, COMMANDS_RELATIVE), { recursive: true });
  await fs.writeFile(path.join(root, commandPath("release-doc")), lookalike, "utf8");

  // When the sync runs twice, Then the second run writes nothing
  await materializeOpencodeSkills({ rootDir: root });
  const first = await snapshotCommands(root);
  const rerun = await materializeOpencodeSkills({ rootDir: root });
  assert.deepEqual(rerun.commandsWritten, [], "a second sync writes nothing");
  assert.deepEqual(await snapshotCommands(root), first, "every command is byte-identical on rerun");
  assert.equal((await checkOpencodeSkills({ rootDir: root })).ok, true);

  // When a command is edited, one is deleted and one skill is un-hidden
  await fs.writeFile(path.join(root, commandPath("pdf-convert")), `${first["pdf-convert.md"]}edited\n`, "utf8");
  await fs.rm(path.join(root, commandPath("docx-convert")));
  await fs.writeFile(path.join(root, ".claude", "skills", "manual-export", "SKILL.md"), skillDocument({ name: "manual-export" }), "utf8");

  // Then the check names each drift and never the lookalike
  const drift = await checkOpencodeSkills({ rootDir: root });
  assert.equal(drift.ok, false);
  for (const reason of [
    "changed generated command .opencode/commands/pdf-convert.md",
    "missing generated command .opencode/commands/docx-convert.md",
    "stale generated command .opencode/commands/manual-export.md",
  ]) {
    assert.ok(drift.reasons.includes(reason), `check lists: ${reason}`);
  }
  assert.equal(drift.reasons.some((reason) => reason.includes("release-doc")), false, "the unmarked lookalike is never counted");

  // When the sync runs, Then it repairs every drift and leaves the lookalike alone
  await materializeOpencodeSkills({ rootDir: root });
  assert.deepEqual(await listCommands(root), ["docx-convert.md", "pdf-convert.md", "release-doc.md"]);
  assert.equal(await readText(root, commandPath("pdf-convert")), first["pdf-convert.md"], "the edited command is restored");
  assert.equal(await readText(root, commandPath("docx-convert")), first["docx-convert.md"], "the deleted command is restored");
  assert.equal(await readText(root, commandPath("release-doc")), lookalike, "the lookalike is untouched");
  assert.equal((await checkOpencodeSkills({ rootDir: root })).ok, true);
});

test("TC-GCM-008: retiring the export alias removes its owned OpenCode entry and command while graph-code stays selectable", async () => {
  // Intent: a real upgrade removes only generated retirement state and preserves other host policy.
  // Given the old manual alias, its selectable mode owner, another utility and user-owned state
  const retired = "graph" + "-export";
  const userCommand = "User-authored command.\n";
  const root = await createProject({
    skills: { [retired]: { commandOnly: true }, "graph-code": {}, "pdf-convert": { commandOnly: true } },
    projectConfig: { project: { name: "fixture" } },
    opencode: { theme: "light", permission: { skill: { "user-owned": "ask" } } },
    files: { [commandPath("user-owned")]: userCommand },
  });
  await materializeOpencodeSkills({ rootDir: root });
  assert.equal((await readJson(root, "opencode.json")).permission.skill[retired], "deny", "the prior alias was governed");
  assert.ok(await exists(root, commandPath(retired)), "the prior explicit alias command exists");
  const otherCommand = await readText(root, commandPath("pdf-convert"));

  // When the alias source is removed and the existing host generator reconciles the upgrade
  await fs.rm(path.join(root, ".claude", "skills", retired), { recursive: true });
  assert.equal((await checkOpencodeSkills({ rootDir: root })).ok, false, "stale retirement output is drift");
  const result = await materializeOpencodeSkills({ rootDir: root });

  // Then the retired skill is absent, the mode owner stays selectable, and unrelated state survives
  const config = await readJson(root, "opencode.json");
  assert.deepEqual(config.permission.skill, { "user-owned": "ask", "pdf-convert": "deny" });
  assert.deepEqual((await readJson(root, LEDGER_RELATIVE)).skill, { "pdf-convert": "deny" });
  assert.equal(await exists(root, commandPath(retired)), false, "the generated explicit alias command is gone");
  assert.equal(await exists(root, commandPath("graph-code")), false, "the selectable mode owner needs no hidden-skill command");
  assert.ok(result.commandsDeleted.includes(path.join(root, commandPath(retired))), "the owner reports the stale command removal");
  assert.equal(config.theme, "light");
  assert.equal(await readText(root, commandPath("pdf-convert")), otherCommand);
  assert.equal(await readText(root, commandPath("user-owned")), userCommand);
  assert.equal((await checkOpencodeSkills({ rootDir: root })).ok, true, "retirement converges through the same owner");
});

// ---- P41: the skill profile on opencode (skillProfile -> permission.skill + commands) ----

const PRESETS = path.join(".claude", "config", "skill-profiles.json");

/** A fixture presets file with the shape `resolveProfile()` reads; `calledByOthers` is the curated called list. */
function presetsText(calledByOthers = []) {
  return toJsonText({
    calledByOthers: { skills: calledByOthers },
    entrySkills: { skills: [] },
    presets: { full: { nameOnly: [] }, standard: { nameOnly: "calledByOthers" }, minimal: { nameOnly: "allExceptEntry" } },
  });
}

const profileConfig = (skillProfile) => ({ project: { name: "fixture" }, skillProfile });

test("TC-ADS-022: a nameOnly skill gets no permission.skill entry, and an entry the ledger owned for it is removed", async () => {
  // Given skill x in nameOnly on a fresh project
  const fresh = await createProject({ skills: { x: {}, plan: {} }, projectConfig: profileConfig({ nameOnly: ["x"] }), files: { [PRESETS]: presetsText() } });

  // When the third host is synced, Then nothing is governed, so no opencode.json and no ledger are created
  const first = await materializeOpencodeSkills({ rootDir: fresh });
  assert.equal(first.desired.size, 0, "nameOnly contributes no entry");
  assert.equal(await exists(fresh, "opencode.json"), false);
  assert.equal(await exists(fresh, LEDGER_RELATIVE), false);

  // Given x was hidden by an earlier commandOnly profile, so the ledger owns its deny and a command exists
  const root = await createProject({ skills: { x: {}, plan: {} }, projectConfig: profileConfig({ commandOnly: ["x"] }), files: { [PRESETS]: presetsText() } });
  await materializeOpencodeSkills({ rootDir: root });
  assert.equal((await readJson(root, "opencode.json")).permission.skill.x, "deny", "precondition: x hidden and owned");
  assert.deepEqual(await listCommands(root), ["x.md"]);

  // When the profile moves x to nameOnly and the sync runs
  await writeFile(root, PROJECT_CONFIG, JSON.stringify(profileConfig({ nameOnly: ["x"] })));
  const result = await materializeOpencodeSkills({ rootDir: root });

  // Then the owned entry, its ledger record and its generated command are removed, with no conflict line
  assert.equal(Object.hasOwn((await readJson(root, "opencode.json")).permission.skill, "x"), false, "x is loadable again");
  assert.deepEqual((await readJson(root, LEDGER_RELATIVE)).skill, {}, "the ledger no longer owns x");
  assert.deepEqual(await listCommands(root), [], "the generated command for x is removed");
  assert.deepEqual(result.conflicts, []);
  assert.equal((await checkOpencodeSkills({ rootDir: root })).ok, true);

  // Given preset standard puts a workflow step skill in nameOnly
  const standard = await createProject({
    skills: { w: {}, "workflow-a": {} },
    workflows: { "workflow-a": wrapper(null, ["w"]) },
    projectConfig: profileConfig({ preset: "standard" }),
    files: { [PRESETS]: presetsText(["w"]) },
  });

  // When the third host is synced, Then it is not refused and writes no entry, so no step meets a permission prompt
  const standardResult = await materializeOpencodeSkills({ rootDir: standard });
  assert.equal(standardResult.desired.size, 0, "a called nameOnly skill gets neither ask nor deny");
  assert.equal(await exists(standard, "opencode.json"), false);
});

test("TC-ADS-023: commandOnly and off skills get deny plus a generated command, owned by the ledger", async () => {
  // Given y in commandOnly and z in off, neither started by anything
  const root = await createProject({
    skills: { y: { description: "Y skill." }, z: { description: "Z skill." }, plan: {} },
    projectConfig: profileConfig({ commandOnly: ["y"], off: ["z"] }),
    files: { [PRESETS]: presetsText() },
  });

  // When the third host is synced
  const result = await materializeOpencodeSkills({ rootDir: root });

  // Then both are denied, both are owned, and each keeps its explicit /name through a generated command
  assert.deepEqual((await readJson(root, "opencode.json")).permission.skill, { y: "deny", z: "deny" });
  assert.deepEqual((await readJson(root, LEDGER_RELATIVE)).skill, { y: "deny", z: "deny" });
  assert.deepEqual(await listCommands(root), ["y.md", "z.md"]);
  for (const name of ["y", "z"]) {
    const text = await readText(root, commandPath(name));
    assert.ok(text.includes(`@.claude/skills/${name}/SKILL.md`) && text.includes("$ARGUMENTS") && text.includes(COMMAND_MARKER), `${name} command loads its skill`);
  }
  assert.deepEqual(result.conflicts, []);
  assert.equal((await checkOpencodeSkills({ rootDir: root })).ok, true);
});

test("TC-ADS-024: without a skill profile the permission entries, ledger and commands are the pre-profile output", async () => {
  // Given the same governed skills with no project config, and with a project config and presets file but no
  // skillProfile; workflow-a names a step skill that does not exist, so the resolver has a warning to give
  const spec = {
    skills: { "pdf-convert": { commandOnly: true }, "workflow-feature": {}, "workflow-a": {}, "workflow-review": {}, plan: {} },
    workflows: {
      "workflow-feature": wrapper("confirm", ["plan", "workflow-review"]),
      "workflow-a": wrapper("manual", ["retired-step"]),
      "workflow-review": wrapper("manual"),
    },
  };
  const bare = await createProject(spec);
  const configured = await createProject({ ...spec, projectConfig: { project: { name: "fixture" } }, files: { [PRESETS]: presetsText(["plan"]) } });

  for (const [label, root, project] of [["no project config", bare, null], ["config without skillProfile", configured, "fixture"]]) {
    // When the third host is synced
    const result = await materializeOpencodeSkills({ rootDir: root });

    // Then the output is exactly the policy output: deny for command-only and manual, ask for confirm, the called wrapper skipped
    assert.equal(await readText(root, "opencode.json"),
      toJsonText({ permission: { skill: { "pdf-convert": "deny", "workflow-a": "deny", "workflow-feature": "ask" } } }), `${label}: opencode.json`);
    const ledger = await readJson(root, LEDGER_RELATIVE);
    assert.equal(ledger.project, project, `${label}: ledger project`);
    assert.deepEqual(ledger.skill, { "pdf-convert": "deny", "workflow-a": "deny", "workflow-feature": "ask" }, `${label}: ledger`);
    assert.deepEqual(await listCommands(root), ["pdf-convert.md", "workflow-a.md"], `${label}: commands`);
    assert.deepEqual(result.skipped.map(({ name, callers }) => `${name}: ${callers.join(", ")}`), ["workflow-review: workflow workflow-feature"], `${label}: skip line`);
    assert.equal(result.warnings.some((line) => line.includes("skill profile")), false, `${label}: no profile lines without a profile`);
  }
  assert.deepEqual(await snapshotCommands(bare), await snapshotCommands(configured), "commands are byte-identical");
});

test("TC-ADS-046: hiding a called skill is refused before any write unless allowHidingCalledSkills is set", async () => {
  // Given security-audit is a workflow step and the profile turns it off
  const spec = (allow) => ({
    skills: { "security-audit": { description: "Security review." }, "workflow-review-changes": {} },
    workflows: { "workflow-review-changes": wrapper(null, ["security-audit"]) },
    projectConfig: profileConfig({ off: ["security-audit"], ...(allow ? { allowHidingCalledSkills: true } : {}) }),
    opencode: { theme: "dark" },
    files: { [PRESETS]: presetsText() },
  });
  const refusal = /skill-profile: refusing to hide security-audit \(off\): started by workflow workflow-review-changes; set skillProfile\.allowHidingCalledSkills: true to allow/;
  const root = await createProject(spec(false));
  const before = await readText(root, "opencode.json");

  // When the sync and the check run, Then both fail with the resolver's message
  await assert.rejects(materializeOpencodeSkills({ rootDir: root }), refusal);
  await assert.rejects(checkOpencodeSkills({ rootDir: root }), refusal);

  // When the CLI runs, Then it exits non-zero, prints the message and says nothing was written
  const run = spawnSync(process.execPath, [SCRIPT], { cwd: root, env: isolatedEnv(root), encoding: "utf8" });
  assert.equal(run.status, 1, run.stdout);
  assert.match(run.stderr, refusal);
  assert.match(run.stderr, /nothing was written/);

  // And opencode.json is byte-identical, with no ledger and no command
  assert.equal(await readText(root, "opencode.json"), before);
  assert.equal(await exists(root, LEDGER_RELATIVE), false);
  assert.deepEqual(await listCommands(root), []);

  // Given the project opts in, When the sync runs
  const allowed = await createProject(spec(true));
  const result = await materializeOpencodeSkills({ rootDir: allowed });

  // Then deny and a command are written, and one warning line names the hidden skill
  assert.equal((await readJson(allowed, "opencode.json")).permission.skill["security-audit"], "deny");
  assert.deepEqual(await listCommands(allowed), ["security-audit.md"]);
  assert.deepEqual(result.warnings.filter((line) => line.includes("hiding called skill security-audit")).length, 1);
  assert.deepEqual(result.skipped, [], "a profile entry the project opted into is not reported as skipped");
});

test("TC-ADS-048: a user permission the ledger does not own is kept over a commandOnly profile", async () => {
  // Given the user already allows y, and the profile asks to hide it
  const root = await createProject({
    skills: { y: {} },
    projectConfig: profileConfig({ commandOnly: ["y"] }),
    opencode: { permission: { skill: { y: "allow" } } },
    files: { [PRESETS]: presetsText() },
  });

  // When the third host is synced
  const result = await materializeOpencodeSkills({ rootDir: root });

  // Then y keeps allow, one conflict line names it, it is not owned, and no command hides it
  assert.equal((await readJson(root, "opencode.json")).permission.skill.y, "allow", "the user value is never overwritten");
  assert.deepEqual(result.conflicts, ["conflict: permission.skill.y is allow, generator wants deny; kept the user value"]);
  assert.equal(await exists(root, LEDGER_RELATIVE), false, "y is not added to the ledger");
  assert.deepEqual(await listCommands(root), []);
  assert.equal((await checkOpencodeSkills({ rootDir: root })).ok, true, "a kept user value is not drift");
});

test("TC-ADS-062: the --check CLI exits non-zero on a drifted command", async () => {
  // Given a synced project whose generated command was deleted
  const root = await createProject({ skills: { "pdf-convert": { commandOnly: true } } });
  await materializeOpencodeSkills({ rootDir: root });
  await fs.rm(path.join(root, commandPath("pdf-convert")));

  // When the --check CLI runs
  const run = spawnSync(process.execPath, [SCRIPT, "--check"], { cwd: root, env: isolatedEnv(root), encoding: "utf8" });

  // Then it exits non-zero naming the missing command
  assert.equal(run.status, 1);
  assert.match(run.stderr, /missing generated command \.opencode\/commands\/pdf-convert\.md/);
});

// Intent (BR-ADS-08, user-owned file): the writer changes only its own top-level member of the user's
// opencode.json, keeps the file's line endings and formatting, and never leaves a temp file behind.
test("TC-ADS-015 edge: a user-formatted opencode.json keeps every byte outside permission and is written atomically", async () => {
  // Given a user opencode.json with CRLF line endings, a compact array and its own spacing
  const userText = '{\r\n  "theme": "dark",\r\n  "plugin": ["a", "b"],\r\n  "model":"x"\r\n}\r\n';
  const root = await createProject({ skills: { "pdf-convert": { commandOnly: true } }, opencode: userText });

  // When the third host is synced
  await materializeOpencodeSkills({ rootDir: root });

  // Then only the permission member is appended, in the file's own line ending
  assert.equal(
    await readText(root, "opencode.json"),
    '{\r\n  "theme": "dark",\r\n  "plugin": ["a", "b"],\r\n  "model":"x",\r\n  "permission": {\r\n    "skill": {\r\n      "pdf-convert": "deny"\r\n    }\r\n  }\r\n}\r\n',
  );
  // And no temp file is left beside opencode.json or the ledger, and a re-run is a no-op
  const leftovers = [...(await fs.readdir(root)), ...(await fs.readdir(path.join(root, ".opencode")))].filter((name) => name.endsWith(".tmp"));
  assert.deepEqual(leftovers, []);
  assert.equal((await checkOpencodeSkills({ rootDir: root })).ok, true);
});

// Intent (BR-ADS-08): an interruption between the two writes must never leave a generator key
// unrecorded, because an unrecorded key is treated as the user's forever and never removed.
test("TC-ADS-015 edge: an interrupted opencode.json / ledger write self-heals on the next sync with no conflict", async () => {
  const require = createRequire(import.meta.url);
  const { writePairCrashConsistent, writeTextAtomic } = require("../../sync-skill-profile.cjs");
  for (const crashAt of ["opencode.json", "final ledger"]) {
    // Given a synced project that owns old-deny, whose next sync drops old-deny and adds new-deny
    const root = await createProject({ skills: { "old-deny": { commandOnly: true }, "new-deny": {} }, projectConfig: { project: { name: "fixture" } } });
    await materializeOpencodeSkills({ rootDir: root });
    await writeFile(root, path.join(".claude", "skills", "old-deny", "SKILL.md"), skillDocument({ name: "old-deny" }));
    await writeFile(root, path.join(".claude", "skills", "new-deny", "SKILL.md"), skillDocument({ name: "new-deny", commandOnly: true }));
    const plan = await planOpencodeSkills({ rootDir: root });

    // When the write is interrupted (the target write, or the final ledger write, fails)
    let ledgerWrites = 0;
    assert.throws(() => writePairCrashConsistent(plan, {
      targetChanged: plan.configChanged,
      writeTarget: () => {
        if (crashAt === "opencode.json") throw new Error("interrupted");
        writeTextAtomic(plan.configPath, plan.configText);
      },
      writeLedger: (text) => {
        ledgerWrites += 1;
        if (crashAt === "final ledger" && ledgerWrites === 2) throw new Error("interrupted");
        writeTextAtomic(plan.ledgerPath, text);
      },
    }), /interrupted/, crashAt);

    // Then the ledger already records both keys (the union), so neither can become the user's
    assert.deepEqual((await readJson(root, LEDGER_RELATIVE)).skill, { "new-deny": "deny", "old-deny": "deny" }, `${crashAt}: interim ledger`);
    // And the next sync converges to the wanted state with no conflict line
    const rerun = await materializeOpencodeSkills({ rootDir: root });
    assert.deepEqual(rerun.conflicts, [], `${crashAt}: no conflict`);
    assert.deepEqual((await readJson(root, "opencode.json")).permission.skill, { "new-deny": "deny" }, `${crashAt}: config`);
    assert.deepEqual((await readJson(root, LEDGER_RELATIVE)).skill, { "new-deny": "deny" }, `${crashAt}: final ledger`);
  }
});
