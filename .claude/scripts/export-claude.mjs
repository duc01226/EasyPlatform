#!/usr/bin/env node
/**
 * export-claude.mjs — Portable, complete export of the .claude framework.
 *
 * Problem this solves: copying the on-disk `.claude/` with a non-git-aware tool
 * (Explorer / Copy-Item / xcopy) drags ~9k git-ignored junk files (node_modules,
 * .venv) and frequently aborts mid-copy on the deep trees, producing a PARTIAL
 * copy that is missing hook `lib/*.cjs` files. Missing libs make every startup
 * hook throw `Cannot find module` (node:internal/modules/cjs/loader). This script
 * copies the git-tracked .claude payload by default. Working-tree exports must
 * explicitly opt in to untracked-but-not-ignored files.
 *
 * Usage:
 *   node .claude/scripts/export-claude.mjs <targetProjectDir> [--force] [--include-untracked]
 *
 * Behavior:
 *   - Source = the repo containing this script (resolved from __dirname, not cwd).
 *   - Files = Git-tracked files; --include-untracked adds non-ignored untracked files.
 *     Without Git, only that explicit opt-in permits the filtered filesystem walk
 *     (which excludes heavy directories but cannot evaluate Git ignore rules).
 *   - Writes <targetProjectDir>/.claude/** preserving structure.
 *   - Refuses to overwrite a non-empty target/.claude unless --force.
 *
 * Exit codes: 0 success · 1 fatal (bad args / no source / copy failure).
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", ".."); // .claude/scripts -> repo root
const EXCLUDED_DIRS = new Set(["node_modules", ".venv", ".git", "tmp"]);
const USAGE = "Usage: node .claude/scripts/export-claude.mjs <targetProjectDir> [--force] [--include-untracked]";

function normalizeIdentityPath(value) {
  const normalized = path.normalize(path.resolve(value));
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function realpathIfExists(targetPath) {
  try {
    return (fs.realpathSync.native || fs.realpathSync)(targetPath);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function isExistingPathAlias(firstPath, secondPath) {
  const firstRealPath = realpathIfExists(firstPath);
  const secondRealPath = realpathIfExists(secondPath);
  return firstRealPath !== null
    && secondRealPath !== null
    && normalizeIdentityPath(firstRealPath) === normalizeIdentityPath(secondRealPath);
}

function fail(msg) {
  process.stderr.write(`[export-claude] ERROR: ${msg}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  let force = false;
  let includeUntracked = false;
  let target = null;

  for (const arg of args) {
    if (arg === "--force") {
      if (force) throw new Error("duplicate --force flag");
      force = true;
    } else if (arg === "--include-untracked") {
      if (includeUntracked) throw new Error("duplicate --include-untracked flag");
      includeUntracked = true;
    } else if (arg.startsWith("-")) {
      throw new Error(`unknown option: ${arg}`);
    } else if (target !== null) {
      throw new Error(`multiple target directories: ${target} and ${arg}`);
    } else {
      target = arg;
    }
  }

  return { target, force, includeUntracked };
}

/** Git is authoritative for the default tracked-only export boundary. */
function gitPayloadFiles(includeUntracked) {
    try {
    const out = execFileSync("git", ["ls-files", "-z", "--cached", ...(includeUntracked ? ["--others", "--exclude-standard"] : []), "--", ".claude"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return [...new Set(out.split("\0").filter(Boolean))];
  } catch {
    return null;
  }
}

/** Fallback walk of .claude excluding heavy/ignored dirs. Relative POSIX paths. */
function walkClaude() {
  const root = path.join(repoRoot, ".claude");
  const results = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (EXCLUDED_DIRS.has(e.name)) continue;
        stack.push(full);
      } else if (e.isFile()) {
        results.push(path.relative(repoRoot, full).split(path.sep).join("/"));
      }
    }
  }
  return results;
}

function main() {
  let parsed;
  try {
    parsed = parseArgs(process.argv);
  } catch (error) {
    fail(`${error.message}. ${USAGE}`);
  }

  const { target, force, includeUntracked } = parsed;

  if (!target) {
    fail(`missing target. ${USAGE}`);
  }
  if (!fs.existsSync(path.join(repoRoot, ".claude"))) {
    fail(`source .claude not found under ${repoRoot}`);
  }

  const targetRoot = path.resolve(target);
  const targetClaude = path.join(targetRoot, ".claude");

  if (path.resolve(targetRoot) === path.resolve(repoRoot)) {
    fail("target is the source repo itself — refusing to self-export.");
  }
  if (isExistingPathAlias(targetRoot, repoRoot)) {
    fail("target resolves to the source repo itself — refusing to self-export.");
  }
  if (fs.existsSync(targetClaude) && fs.readdirSync(targetClaude).length > 0 && !force) {
    fail(`${targetClaude} exists and is not empty. Re-run with --force to overwrite.`);
  }

  let files = gitPayloadFiles(includeUntracked);
  const source = files ? (includeUntracked ? "git-tracked+unignored" : "git-tracked") : "filesystem-walk (git unavailable)";
  if (!files) {
    if (!includeUntracked) fail("cannot establish tracked files without Git; --include-untracked explicitly permits a filtered filesystem export.");
    process.stderr.write("[export-claude] WARNING: filesystem fallback cannot evaluate Git ignore rules.\n");
    files = walkClaude();
  }

  if (files.length === 0) fail("no files to export.");

  let copied = 0;
  for (const rel of files) {
    const src = path.join(repoRoot, rel);
    if (!fs.existsSync(src)) continue; // tracked-but-deleted safety
    const dst = path.join(targetRoot, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    copied++;
  }

  process.stdout.write(
    `[export-claude] Exported ${copied} file(s) [${source}] -> ${targetClaude}\n` +
      `[export-claude] Next: open the target in Claude Code; SessionStart hooks should run clean.\n`
  );
}

main();
