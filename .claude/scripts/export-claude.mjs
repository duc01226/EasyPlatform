#!/usr/bin/env node
/**
 * export-claude.mjs — Portable, complete export of the .claude framework.
 *
 * Problem this solves: copying the on-disk `.claude/` with a non-git-aware tool
 * (Explorer / Copy-Item / xcopy) drags ~9k git-ignored junk files (node_modules,
 * .venv) and frequently aborts mid-copy on the deep trees, producing a PARTIAL
 * copy that is missing hook `lib/*.cjs` files. Missing libs make every startup
 * hook throw `Cannot find module` (node:internal/modules/cjs/loader). This script
 * copies ONLY the git-tracked .claude payload — complete, junk-free, deterministic.
 *
 * Usage:
 *   node .claude/scripts/export-claude.mjs <targetProjectDir> [--force]
 *
 * Behavior:
 *   - Source = the repo containing this script (resolved from __dirname, not cwd).
 *   - Files  = `git ls-files .claude` (tracked only). Falls back to a filtered
 *              filesystem walk if git is unavailable, excluding heavy/ignored dirs.
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

function fail(msg) {
  process.stderr.write(`[export-claude] ERROR: ${msg}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const force = args.includes("--force");
  const target = args.find((a) => !a.startsWith("--"));
  return { target, force };
}

/** Tracked .claude file list via git; null if git not usable. */
function gitTrackedFiles() {
  try {
    const out = execFileSync("git", ["ls-files", ".claude"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const files = out.split("\n").map((l) => l.trim()).filter(Boolean);
    return files.length > 0 ? files : null;
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
  const { target, force } = parseArgs(process.argv);

  if (!target) {
    fail("missing target. Usage: node .claude/scripts/export-claude.mjs <targetProjectDir> [--force]");
  }
  if (!fs.existsSync(path.join(repoRoot, ".claude"))) {
    fail(`source .claude not found under ${repoRoot}`);
  }

  const targetRoot = path.resolve(target);
  const targetClaude = path.join(targetRoot, ".claude");

  if (path.resolve(targetRoot) === path.resolve(repoRoot)) {
    fail("target is the source repo itself — refusing to self-export.");
  }
  if (fs.existsSync(targetClaude) && fs.readdirSync(targetClaude).length > 0 && !force) {
    fail(`${targetClaude} exists and is not empty. Re-run with --force to overwrite.`);
  }

  let files = gitTrackedFiles();
  const source = files ? "git-tracked" : "filesystem-walk (git unavailable)";
  if (!files) files = walkClaude();

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
