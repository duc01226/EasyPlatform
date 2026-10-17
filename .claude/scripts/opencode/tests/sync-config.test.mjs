import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  checkOpencodeConfig,
  materializeOpencodeConfig,
  mergeRecommendedConfig,
  RECOMMENDED_CONFIG_RELATIVE,
  resolveRecommendedConfigPath,
  resolveRootConfigPath,
  retireBundledModelLimit,
} from "../sync-config.mjs";

// Mirrors the shipped recommended defaults: no model `limit`, so opencode compacts at the model's own window.
const RECOMMENDED = {
  $schema: "https://opencode.ai/config.json",
  model: "opencode-go/deepseek-v4.1-flash",
  compaction: { auto: true },
  provider: {
    "opencode-go": {
      models: {
        "deepseek-v4.1-flash": {
          options: { reasoningEffort: "high" },
        },
      },
    },
  },
};

async function createProject(existingConfig) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "opencode-config-"));
  await fs.mkdir(path.join(root, ".opencode"), { recursive: true });
  await fs.writeFile(
    resolveRecommendedConfigPath(root),
    `${JSON.stringify(RECOMMENDED, null, 2)}\n`,
    "utf8",
  );
  if (existingConfig !== undefined) {
    await fs.writeFile(resolveRootConfigPath(root), `${JSON.stringify(existingConfig, null, 2)}\n`, "utf8");
  }
  return root;
}

test("RECOMMENDED_CONFIG_RELATIVE never collides with the auto-loaded .opencode/opencode.json", () => {
  assert.equal(RECOMMENDED_CONFIG_RELATIVE, path.join(".opencode", "opencode.recommended.json"));
  assert.notEqual(path.basename(RECOMMENDED_CONFIG_RELATIVE), "opencode.json");
});

test("mergeRecommendedConfig deep-merges, recommends win, project-only keys survive", () => {
  const existing = {
    $schema: "https://opencode.ai/config.json",
    model: "project/custom-model",
    instructions: ["AGENTS.md"],
    compaction: { auto: false, tail_turns: 15 },
    provider: { "opencode-go": { models: { "deepseek-v4.1-flash": { options: { reasoningEffort: "low" } } } } },
    mcp: {},
  };
  const merged = mergeRecommendedConfig(existing, RECOMMENDED);

  assert.equal(merged.model, RECOMMENDED.model, "recommended scalar must win");
  assert.equal(merged.compaction.auto, true, "recommended nested scalar must win");
  assert.equal(merged.compaction.tail_turns, 15, "project-only nested key must survive");
  assert.deepEqual(merged.instructions, ["AGENTS.md"], "project-only top-level key must survive");
  assert.deepEqual(merged.mcp, {});
  assert.equal(
    merged.provider["opencode-go"].models["deepseek-v4.1-flash"].options.reasoningEffort,
    "high",
    "recommended deep leaf must win",
  );
  assert.equal(merged.provider["opencode-go"].models["deepseek-v4.1-flash"].limit, undefined, "the recommended defaults pin no model limit");
});

test("mergeRecommendedConfig replaces arrays and clones without mutating inputs", () => {
  const existing = { plugin: ["project-plugin"] };
  const recommended = { plugin: ["recommended-plugin"] };
  const merged = mergeRecommendedConfig(existing, recommended);
  assert.deepEqual(merged.plugin, ["recommended-plugin"]);
  assert.deepEqual(existing.plugin, ["project-plugin"], "input must not be mutated");
});

test("materialize creates the root config verbatim when none exists", async () => {
  const root = await createProject();
  try {
    const result = await materializeOpencodeConfig({ rootDir: root });
    assert.equal(result.existed, false);
    assert.equal(result.changed, true);
    assert.deepEqual(result.merged, RECOMMENDED);

    const onDisk = await fs.readFile(resolveRootConfigPath(root), "utf8");
    assert.equal(onDisk, `${JSON.stringify(RECOMMENDED, null, 2)}\n`);

    const check = await checkOpencodeConfig({ rootDir: root });
    assert.equal(check.ok, true, check.reason ?? "");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("materialize merges into an existing project config and is idempotent", async () => {
  const root = await createProject({
    model: "project/custom-model",
    instructions: ["AGENTS.md"],
    permission: { edit: "deny" },
  });
  try {
    const first = await materializeOpencodeConfig({ rootDir: root });
    assert.equal(first.existed, true);
    assert.equal(first.changed, true);
    assert.equal(first.merged.model, RECOMMENDED.model);
    assert.deepEqual(first.merged.instructions, ["AGENTS.md"]);
    assert.deepEqual(first.merged.permission, { edit: "deny" });

    const second = await materializeOpencodeConfig({ rootDir: root });
    assert.equal(second.changed, false, "second materialize must be a no-op");
    assert.deepEqual(second.merged, first.merged);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("check reports stale when the root config drifts or is missing", async () => {
  const root = await createProject();
  try {
    const missing = await checkOpencodeConfig({ rootDir: root });
    assert.equal(missing.ok, false);
    assert.match(missing.reason, /missing/);

    await materializeOpencodeConfig({ rootDir: root });
    await fs.writeFile(resolveRootConfigPath(root), `${JSON.stringify({ model: "other/model" }, null, 2)}\n`, "utf8");

    const stale = await checkOpencodeConfig({ rootDir: root });
    assert.equal(stale.ok, false);
    assert.match(stale.reason, /stale/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("materialize fails loudly on a malformed existing config instead of clobbering it", async () => {
  const root = await createProject();
  try {
    await fs.writeFile(resolveRootConfigPath(root), "{ not json", "utf8");
    await assert.rejects(
      () => materializeOpencodeConfig({ rootDir: root }),
      /not valid JSON/,
    );
    assert.equal(await fs.readFile(resolveRootConfigPath(root), "utf8"), "{ not json");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

// Intent (BR-ADS-20, BR-ADS-21; TC-ADS-038, TC-ADS-039): the bundle pins no compaction budget on the
// third host. The model `limit` an earlier bundle wrote is retired only while it equals the bundled value
// exactly; any other `limit` is the user's and survives every sync.
const modelEntry = config => config.provider["opencode-go"].models["deepseek-v4.1-flash"];

test("TC-ADS-038 the bundled model limit is retired from the root config and the model options stay", async () => {
  // Given a root config an earlier sync wrote: the bundled 500K limit beside the model options, plus a project key
  const root = await createProject({
    ...RECOMMENDED,
    instructions: ["AGENTS.md"],
    provider: {
      "opencode-go": {
        models: {
          "deepseek-v4.1-flash": { options: { reasoningEffort: "high" }, limit: { context: 500000, output: 384000 } },
        },
      },
    },
  });
  try {
    // When the config is synced
    const first = await materializeOpencodeConfig({ rootDir: root });
    // Then the limit is gone, the options stay, the project key survives, and nothing is reported as user-set
    const onDisk = JSON.parse(await fs.readFile(resolveRootConfigPath(root), "utf8"));
    assert.equal(Object.hasOwn(modelEntry(onDisk), "limit"), false, "the bundled limit must be retired");
    assert.equal(modelEntry(onDisk).options.reasoningEffort, "high");
    assert.deepEqual(onDisk.instructions, ["AGENTS.md"]);
    assert.equal(first.changed, true);
    assert.deepEqual(first.notices, []);
    // And the check passes and a second sync changes nothing
    assert.equal((await checkOpencodeConfig({ rootDir: root })).ok, true);
    assert.equal((await materializeOpencodeConfig({ rootDir: root })).changed, false);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }

  // Given a root config that matches the recommended defaults except that it still carries the bundled limit
  const stale = await createProject({
    ...RECOMMENDED,
    provider: { "opencode-go": { models: { "deepseek-v4.1-flash": { options: { reasoningEffort: "high" }, limit: { context: 500000, output: 384000 } } } } },
  });
  try {
    // When only the check runs. Then it reports the config stale, so the retirement is not skipped silently
    assert.match((await checkOpencodeConfig({ rootDir: stale })).reason ?? "", /stale/);
  } finally {
    await fs.rm(stale, { recursive: true, force: true });
  }

  // And the retirement never mutates its input
  const input = { provider: { "opencode-go": { models: { "deepseek-v4.1-flash": { limit: { context: 500000, output: 384000 } } } } } };
  retireBundledModelLimit(input);
  assert.deepEqual(modelEntry(input).limit, { context: 500000, output: 384000 });
});

test("TC-ADS-039 a user-set model limit is preserved and reported once", async () => {
  // Given a root config whose model limit is the user's own window
  const userLimit = { context: 800000, output: 384000 };
  const root = await createProject({
    ...RECOMMENDED,
    provider: { "opencode-go": { models: { "deepseek-v4.1-flash": { limit: userLimit, options: { reasoningEffort: "high" } } } } },
  });
  try {
    // When the config is synced
    const result = await materializeOpencodeConfig({ rootDir: root });
    // Then that limit is preserved and one notice names it
    const onDisk = JSON.parse(await fs.readFile(resolveRootConfigPath(root), "utf8"));
    assert.deepEqual(modelEntry(onDisk).limit, userLimit, "a user-set limit must survive the sync");
    assert.deepEqual(result.notices, [`kept user-set provider.opencode-go.models.deepseek-v4.1-flash.limit=${JSON.stringify(userLimit)}`]);
    assert.equal((await checkOpencodeConfig({ rootDir: root })).ok, true);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }

  // Given any limit that is not exactly the bundled one — a partial match or an extra key included
  for (const limit of [{ context: 500000 }, { context: 500000, output: 384000, input: 400000 }, { context: 500000, output: 128000 }, { context: "500000", output: 384000 }]) {
    const config = { provider: { "opencode-go": { models: { "deepseek-v4.1-flash": { limit } } } } };
    // When it is checked for retirement
    const retired = retireBundledModelLimit(config);
    // Then it is kept and reported
    assert.deepEqual(modelEntry(retired.config).limit, limit, `user limit must stay: ${JSON.stringify(limit)}`);
    assert.match(retired.notice ?? "", /^kept user-set /);
  }
});
