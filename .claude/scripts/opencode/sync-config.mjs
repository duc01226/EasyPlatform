#!/usr/bin/env node

// Reconcile the consuming project's root `opencode.json` with the framework's
// recommended opencode defaults (`.opencode/opencode.recommended.json`).
//
// The recommended file is the SINGLE source of truth for the framework's
// opencode defaults. This writer DEEP-MERGES it into the project's root
// `opencode.json` so recommended keys always win while any project-specific
// keys survive untouched. A project with no root config receives the
// recommended defaults verbatim. The one removal is a retired bundled value:
// see `retireBundledModelLimit`.
//
// The recommended file is deliberately NOT named `.opencode/opencode.json`:
// opencode auto-loads that path as project config, so it must stay a template,
// not an active config.
//
// PORTABILITY CONTRACT: pure `node:` built-ins + one local `.cjs` require.
// Copy `.claude` + `.opencode` into any repository and this writer still runs
// with plain `node` — no npm, no node_modules, no package.json.
//
// Usage:
//   node .claude/scripts/opencode/sync-config.mjs           # create/update root opencode.json
//   node .claude/scripts/opencode/sync-config.mjs --check   # verify root opencode.json is current (read-only)
//   node .claude/scripts/opencode/sync-config.mjs --verbose # print the merged config

import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { resolveMutationProjectRoot, isInvokedAsScript } = require("../lib/project-root.cjs");

const rootResolution = resolveMutationProjectRoot({
  cwd: process.cwd(),
  scriptPath: fileURLToPath(import.meta.url),
  env: process.env,
});
const defaultRootDir = rootResolution.rootDir;

export const RECOMMENDED_CONFIG_RELATIVE = path.join(".opencode", "opencode.recommended.json");
export const ROOT_CONFIG_RELATIVE = "opencode.json";

export function resolveRecommendedConfigPath(rootDir) {
  return path.join(rootDir, RECOMMENDED_CONFIG_RELATIVE);
}

export function resolveRootConfigPath(rootDir) {
  return path.join(rootDir, ROOT_CONFIG_RELATIVE);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile(filePath, role) {
  let text;
  try {
    text = await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") throw new Error(`${role} is missing: ${filePath}`);
    throw error;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${role} is not valid JSON (${filePath}): ${error.message}`);
  }
}

/**
 * Deep-merge recommended defaults over an existing config.
 *
 * Objects merge recursively; recommended scalars and arrays win; keys present
 * only in `existing` survive untouched. Existing key order is preserved so an
 * already-current config re-renders byte-identically. Pure.
 */
export function mergeRecommendedConfig(existing, recommended) {
  if (!isPlainObject(existing)) return structuredClone(recommended);
  const merged = { ...existing };
  for (const [key, recommendedValue] of Object.entries(recommended)) {
    const existingValue = merged[key];
    merged[key] = isPlainObject(recommendedValue) && isPlainObject(existingValue)
      ? mergeRecommendedConfig(existingValue, recommendedValue)
      : structuredClone(recommendedValue);
  }
  return merged;
}

// Retired pin: earlier recommended defaults set this model's `limit`, which makes opencode compact at
// a fixed budget instead of the model's own window. The deep merge can add and overwrite but never
// delete, so the old value is removed explicitly — only while it still equals exactly what the bundle
// wrote. Any other `limit` is the project's own and is kept.
const RETIRED_MODEL_LIMIT = Object.freeze({
  provider: "opencode-go",
  model: "deepseek-v4.1-flash",
  limit: Object.freeze({ context: 500000, output: 384000 }),
});

function isRetiredLimit(limit) {
  if (!isPlainObject(limit)) return false;
  const keys = Object.keys(limit);
  const expected = Object.keys(RETIRED_MODEL_LIMIT.limit);
  return keys.length === expected.length && expected.every(key => limit[key] === RETIRED_MODEL_LIMIT.limit[key]);
}

/**
 * Drop the bundled model `limit` an earlier sync wrote, before the recommended defaults merge in.
 * Pure: returns a copy of `existing` and, when a different `limit` is kept, one notice line.
 *
 * @param {object} existing parsed project-root config
 * @returns {{ config: object, notice: string|null }}
 */
export function retireBundledModelLimit(existing) {
  const { provider, model } = RETIRED_MODEL_LIMIT;
  const entry = existing?.provider?.[provider]?.models?.[model];
  if (!isPlainObject(entry) || !Object.hasOwn(entry, "limit")) return { config: existing, notice: null };
  if (!isRetiredLimit(entry.limit)) {
    return { config: existing, notice: `kept user-set provider.${provider}.models.${model}.limit=${JSON.stringify(entry.limit)}` };
  }
  const config = structuredClone(existing);
  delete config.provider[provider].models[model].limit;
  return { config, notice: null };
}

function renderConfig(config) {
  return `${JSON.stringify(config, null, 2)}\n`;
}

function resolvePaths(options = {}) {
  const rootDir = options.rootDir ?? defaultRootDir;
  return {
    rootDir,
    recommendedPath: options.recommendedPath ?? resolveRecommendedConfigPath(rootDir),
    configPath: options.configPath ?? resolveRootConfigPath(rootDir),
  };
}

/**
 * Materialize the recommended opencode defaults into the project root config.
 *
 * @param {object} [options]
 * @param {string} [options.rootDir] project root (defaults to the resolved mutation root)
 * @param {string} [options.recommendedPath] override for `.opencode/opencode.recommended.json`
 * @param {string} [options.configPath] override for the root `opencode.json`
 * @returns {Promise<{configPath: string, recommendedPath: string, changed: boolean, existed: boolean, merged: object, notices: string[]}>}
 */
export async function materializeOpencodeConfig(options = {}) {
  const { recommendedPath, configPath } = resolvePaths(options);

  const recommended = await readJsonFile(recommendedPath, "recommended opencode config");
  if (!isPlainObject(recommended)) {
    throw new Error(`recommended opencode config must be a JSON object: ${recommendedPath}`);
  }

  const existed = await pathExists(configPath);
  const existing = existed ? await readJsonFile(configPath, "project opencode.json") : null;
  if (existed && !isPlainObject(existing)) {
    throw new Error(`project opencode.json must be a JSON object: ${configPath}`);
  }

  const retired = existed ? retireBundledModelLimit(existing) : { config: null, notice: null };
  const notices = retired.notice ? [retired.notice] : [];
  const merged = existed ? mergeRecommendedConfig(retired.config, recommended) : structuredClone(recommended);
  const serialized = renderConfig(merged);
  const current = existed ? await fs.readFile(configPath, "utf8") : null;
  const changed = current !== serialized;

  if (changed) {
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, serialized, "utf8");
  }

  return { configPath, recommendedPath, changed, existed, merged, notices };
}

/**
 * Verify the project root config already reflects the recommended defaults.
 * Read-only.
 *
 * @param {object} [options] same as `materializeOpencodeConfig`
 * @returns {Promise<{ok: boolean, configPath: string, reason: string|null}>}
 */
export async function checkOpencodeConfig(options = {}) {
  const { recommendedPath, configPath } = resolvePaths(options);

  if (!(await pathExists(recommendedPath))) {
    return { ok: false, configPath, reason: `recommended opencode config is missing: ${recommendedPath}` };
  }
  if (!(await pathExists(configPath))) {
    return { ok: false, configPath, reason: "project opencode.json is missing" };
  }

  const recommended = await readJsonFile(recommendedPath, "recommended opencode config");
  const existing = await readJsonFile(configPath, "project opencode.json");
  const expected = renderConfig(mergeRecommendedConfig(retireBundledModelLimit(existing).config, recommended));
  const actual = await fs.readFile(configPath, "utf8");

  if (actual !== expected) {
    return { ok: false, configPath, reason: "project opencode.json is stale (differs from a fresh merge of the recommended defaults)" };
  }
  return { ok: true, configPath, reason: null };
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
    const result = await checkOpencodeConfig();
    if (!result.ok) {
      console.error(`[opencode-config-sync] ${result.reason}: ${path.relative(defaultRootDir, result.configPath)}`);
      console.error("[opencode-config-sync] run: node .claude/skills/sync-opencode/scripts/run-opencode-sync.mjs");
      process.exitCode = 1;
      return;
    }
    console.log(`[opencode-config-sync] ${path.relative(defaultRootDir, result.configPath)} is current`);
    return;
  }

  const result = await materializeOpencodeConfig();
  const configRel = path.relative(defaultRootDir, result.configPath);
  const recommendedRel = path.relative(defaultRootDir, result.recommendedPath);
  for (const notice of result.notices) {
    console.log(`[opencode-config-sync] ${notice}`);
  }
  if (result.changed) {
    console.log(`[opencode-config-sync] ${result.existed ? "updated" : "created"} ${configRel} from ${recommendedRel}`);
  } else {
    console.log(`[opencode-config-sync] ${configRel} already matches the recommended defaults`);
  }
  if (args.verbose) {
    console.log(JSON.stringify(result.merged, null, 2));
  }
}

const invokedAsScript = isInvokedAsScript(process.argv[1], fileURLToPath(import.meta.url));
if (invokedAsScript) {
  await main();
}
