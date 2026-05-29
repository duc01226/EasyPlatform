#!/usr/bin/env node
/**
 * Skill garbage collector — quarterly GC pass for deprecated skills.
 *
 * Per ADR-0001 (docs/adr/0001-skill-lifecycle.md):
 *   - active skills are never touched
 *   - deprecated skills become candidates for deletion once `removal_after` has passed
 *   - deletion is gated on zero non-self references in .claude/ + docs/
 *
 * Per plan-review D3: missing `removal_after` is treated as BLOCKED, not auto-derived.
 * Authors of deprecation PRs must explicitly set the removal date.
 *
 * Usage:
 *   node .claude/scripts/skill-gc.cjs [--apply] [--all-deprecated] [skill-name ...]
 *
 *   --apply           Execute deletion. Default is dry-run.
 *   --all-deprecated  Explicitly scan all deprecated skills.
 *   skill-name ...    Specific skill targets (without --all-deprecated).
 *
 * Exit codes:
 *   0 = dry-run completed OR --apply succeeded
 *   1 = one or more targets BLOCKED (refs found / WAITING / WAITING-NO-DATE)
 *   2 = invalid arguments / target not found / target not deprecated
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CANONICAL_SKILLS_DIR = path.join(REPO_ROOT, '.claude', 'skills');

// Grep ref-scope: include .claude/ + docs/, exclude auto-regen sinks, historical
// records, generated catalogs, and the workspace scratch dir. Plus self-dir.
const REF_INCLUDE_DIRS = ['.claude', 'docs'];
const REF_EXCLUDE_PATHS = [
    'plans',                       // historical work artifacts
    'docs/adr',                    // ADRs intentionally name historical skills
    '.agents',                     // auto-regen mirror
    '.codex',                      // auto-regen mirror
    'AGENTS.md',                   // auto-regen
    '.ai',                         // workspace scratch
    '.claude/scripts/skills_data.yaml',
    '.claude/SKILLS.yaml',
];

// Mirror locations to delete alongside canonical
const MIRROR_BASES = [
    path.join(REPO_ROOT, '.agents', 'skills'),
    path.join(REPO_ROOT, '.codex', 'skills'),
];

function parseArgs(argv) {
    const args = { apply: false, allDeprecated: false, targets: [] };
    for (const a of argv.slice(2)) {
        if (a === '--apply') args.apply = true;
        else if (a === '--all-deprecated') args.allDeprecated = true;
        else if (a === '--help' || a === '-h') { args.help = true; }
        else if (a.startsWith('--')) {
            console.error(`Error: unknown flag ${a}`);
            process.exit(2);
        }
        else args.targets.push(a);
    }
    return args;
}

function printHelp() {
    console.log(`Skill GC — delete deprecated skills past their removal_after date.

Usage:
  node .claude/scripts/skill-gc.cjs [--apply] [--all-deprecated] [skill-name ...]

Flags:
  --apply           Execute deletion (default: dry-run).
  --all-deprecated  Explicitly scan every deprecated skill in .claude/skills/.
  -h, --help        Show this help.

Default:
  With no positional skill names, dry-run scans every deprecated skill.

Decisions per target:
  READY              status=deprecated, removal_after <= today, zero non-self refs.
                     Dry-run lists; --apply deletes canonical + all mirrors.
  WAITING            status=deprecated, removal_after > today.
  WAITING-NO-DATE    status=deprecated, removal_after missing (per ADR-0001 D3 strict).
  BLOCKED            non-self references found in .claude/ or docs/.
  NOT-DEPRECATED     status != deprecated. Skipped.

Exit: 0 dry-run/apply ok · 1 BLOCKED/WAITING present · 2 bad args.`);
}

function parseFrontmatter(skillPath) {
    const file = path.join(skillPath, 'SKILL.md');
    if (!fs.existsSync(file)) return null;
    const content = fs.readFileSync(file, 'utf-8');
    const m = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n/);
    if (!m) return {};
    const body = m[1];
    const fm = {};
    for (const line of body.split(/\r?\n/)) {
        const kv = line.match(/^(\w[\w_-]*)\s*:\s*(.*?)\s*$/);
        if (!kv) continue;
        let val = kv[2];
        // Strip surrounding quotes
        if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
            val = val.slice(1, -1);
        }
        fm[kv[1]] = val;
    }
    return fm;
}

function listDeprecatedSkills() {
    const out = [];
    const stack = [CANONICAL_SKILLS_DIR];
    while (stack.length) {
        const dir = stack.pop();
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (!entry.isDirectory()) continue;
            const full = path.join(dir, entry.name);
            const skillFile = path.join(full, 'SKILL.md');
            if (fs.existsSync(skillFile)) {
                const fm = parseFrontmatter(full);
                if (fm && fm.status === 'deprecated') {
                    out.push({ name: relSkillName(full), dir: full, fm });
                }
            } else {
                stack.push(full);
            }
        }
    }
    return out;
}

function relSkillName(skillDir) {
    const rel = path.relative(CANONICAL_SKILLS_DIR, skillDir).replace(/\\/g, '/');
    return rel;
}

function resolveTarget(name) {
    // Accept either "foo" or "parent/foo". Reject path-traversal and absolute paths.
    // Per code-reviewer M1: resolved path must remain inside CANONICAL_SKILLS_DIR.
    if (!name || name.includes('..') || path.isAbsolute(name) || name.includes('\\')) {
        return null;
    }
    const dir = path.resolve(CANONICAL_SKILLS_DIR, ...name.split('/'));
    const canonicalPrefix = CANONICAL_SKILLS_DIR + path.sep;
    if (!dir.startsWith(canonicalPrefix)) {
        return null;
    }
    const file = path.join(dir, 'SKILL.md');
    if (!fs.existsSync(file)) return null;
    return { name, dir, fm: parseFrontmatter(dir) || {} };
}

function detectMirrors(skillName) {
    const found = [];
    for (const base of MIRROR_BASES) {
        const candidate = path.join(base, ...skillName.split('/'));
        if (fs.existsSync(candidate)) found.push(candidate);
    }
    return found;
}

function gitGrepRefs(skillName, skillDir) {
    // Use git grep for portability + speed. Pattern: skill name with word boundaries.
    // Per code-reviewer M3: bare -F substring matches short names inside longer ones
    // (e.g., "cook" matches "cookbook"). Use -E + \b to enforce word boundaries.
    // Scope: include REF_INCLUDE_DIRS, exclude REF_EXCLUDE_PATHS, exclude self-dir.
    // Returns array of "file:line:content" strings, with self-dir filtered out.
    const escapedForRegex = skillName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = `\\b${escapedForRegex}\\b`;
    // spawnSync with argv array — no shell quoting, portable across Windows/POSIX.
    // -E: extended regex · -n: line numbers · --untracked: include staging
    const args = ['grep', '-n', '-E', '--untracked', '--', pattern, ...REF_INCLUDE_DIRS];
    const result = spawnSync('git', args, {
        cwd: REPO_ROOT,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (result.error) throw result.error;
    // git grep exits 1 when no matches — treat as zero results
    if (result.status === 1) return [];
    if (result.status !== 0) {
        throw new Error(`git grep exited ${result.status}: ${(result.stderr || '').trim()}`);
    }
    const raw = result.stdout || '';

    const lines = raw.split(/\r?\n/).filter(Boolean);
    const selfDirRel = path.relative(REPO_ROOT, skillDir).replace(/\\/g, '/');
    const mirrorDirs = detectMirrors(skillName).map(m => path.relative(REPO_ROOT, m).replace(/\\/g, '/'));

    return lines.filter(line => {
        const [filePath] = line.split(':', 1);
        const norm = filePath.replace(/\\/g, '/');

        // Self-exclusion: own canonical dir and own mirror dirs (mirrors are
        // wiped atomically with canonical, so refs inside them are not blockers)
        if (norm.startsWith(selfDirRel + '/') || norm === selfDirRel) return false;
        for (const md of mirrorDirs) {
            if (norm.startsWith(md + '/') || norm === md) return false;
        }

        // Excluded paths
        for (const ex of REF_EXCLUDE_PATHS) {
            if (norm === ex || norm.startsWith(ex + '/')) return false;
        }

        // Restrict to include dirs (defense in depth — git grep already scoped)
        const inInclude = REF_INCLUDE_DIRS.some(d => norm === d || norm.startsWith(d + '/'));
        if (!inInclude) return false;

        return true;
    });
}

function decide(target, today = new Date()) {
    const fm = target.fm;
    if (fm.status !== 'deprecated') {
        return { state: 'NOT-DEPRECATED', reason: `status=${fm.status || 'active'}` };
    }
    if (!fm.removal_after) {
        return { state: 'WAITING-NO-DATE', reason: 'removal_after missing (ADR-0001 D3 strict)' };
    }
    // Parse YYYY-MM-DD as LOCAL midnight (not UTC midnight via Date constructor)
    // to avoid TZ-skew that would let GC fire up to 24h early or late.
    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fm.removal_after);
    if (!dateMatch) {
        return { state: 'WAITING-NO-DATE', reason: `removal_after unparseable: ${fm.removal_after}` };
    }
    const [, y, m, d] = dateMatch.map(Number);
    const removal = new Date(y, m - 1, d);
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (removal > todayMidnight) {
        const days = Math.ceil((removal - todayMidnight) / (1000 * 60 * 60 * 24));
        return { state: 'WAITING', reason: `removal_after=${fm.removal_after} (${days} days remaining)` };
    }
    const refs = gitGrepRefs(target.name, target.dir);
    if (refs.length > 0) {
        return { state: 'BLOCKED', reason: `${refs.length} non-self ref(s)`, refs };
    }
    return { state: 'READY', reason: 'eligible for deletion', mirrors: detectMirrors(target.name) };
}

function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function deleteTarget(target, decision) {
    // Per code-reviewer M2: canonical failure aborts the batch; mirror failures
    // warn but do not block (mirrors are regenerable by codex-sync).
    const removed = [];
    try {
        fs.rmSync(target.dir, { recursive: true, force: true });
        removed.push(target.dir);
    } catch (err) {
        const e = new Error(`canonical delete failed for ${target.name}: ${err.message}`);
        e.fatal = true;
        throw e;
    }
    for (const mirror of decision.mirrors || []) {
        try {
            fs.rmSync(mirror, { recursive: true, force: true });
            removed.push(mirror);
        } catch (err) {
            console.warn(`  WARN: mirror delete failed (${mirror}): ${err.message} — regenerate via codex-sync`);
        }
    }
    return removed;
}

function main() {
    const args = parseArgs(process.argv);
    if (args.help) { printHelp(); return 0; }

    let targets;
    if (args.allDeprecated) {
        targets = listDeprecatedSkills();
        if (args.targets.length) {
            console.error('Error: --all-deprecated does not accept positional skill names');
            return 2;
        }
        if (targets.length === 0) {
            console.log('No deprecated skills found.');
            return 0;
        }
    } else if (args.targets.length === 0) {
        targets = listDeprecatedSkills();
        if (targets.length === 0) {
            console.log('No deprecated skills found.');
            return 0;
        }
    } else {
        targets = [];
        for (const name of args.targets) {
            const t = resolveTarget(name);
            if (!t) {
                console.error(`Error: skill not found: .claude/skills/${name}/SKILL.md`);
                return 2;
            }
            targets.push(t);
        }
    }

    const today = new Date();
    const decisions = targets.map(t => ({ target: t, decision: decide(t, today) }));

    console.log(`skill-gc — ${args.apply ? 'APPLY' : 'dry-run'} · ${decisions.length} target(s) · ${formatLocalDate(today)}\n`);

    let readyCount = 0, blockedCount = 0, waitingCount = 0, otherCount = 0;
    for (const { target, decision } of decisions) {
        const tag = decision.state.padEnd(16);
        console.log(`  [${tag}] ${target.name} — ${decision.reason}`);
        if (decision.refs) {
            for (const r of decision.refs.slice(0, 5)) console.log(`        ref: ${r}`);
            if (decision.refs.length > 5) console.log(`        ... ${decision.refs.length - 5} more`);
        }
        if (decision.mirrors && decision.mirrors.length) {
            for (const m of decision.mirrors) console.log(`        mirror: ${path.relative(REPO_ROOT, m).replace(/\\/g, '/')}`);
        }
        if (decision.state === 'READY') readyCount++;
        else if (decision.state === 'BLOCKED') blockedCount++;
        else if (decision.state.startsWith('WAITING')) waitingCount++;
        else otherCount++;
    }

    console.log(`\nSummary: READY=${readyCount} · BLOCKED=${blockedCount} · WAITING=${waitingCount} · OTHER=${otherCount}`);

    if (!args.apply) {
        if (blockedCount + waitingCount > 0) {
            console.log('\n(Dry-run: --apply would skip BLOCKED/WAITING targets.)');
            return 1;
        }
        console.log('\n(Dry-run: --apply would delete READY targets.)');
        return 0;
    }

    // Atomicity: refuse to apply if anything is BLOCKED/WAITING. Operator must
    // either clean up refs or wait. This prevents partial batch deletes.
    if (blockedCount + waitingCount > 0) {
        console.error(`\nRefusing --apply: ${blockedCount + waitingCount} target(s) BLOCKED/WAITING. Resolve first.`);
        return 1;
    }

    console.log('\nApplying deletions...');
    let actuallyRemoved = 0;
    for (const { target, decision } of decisions) {
        if (decision.state !== 'READY') continue;
        try {
            const removed = deleteTarget(target, decision);
            for (const p of removed) console.log(`  deleted: ${path.relative(REPO_ROOT, p).replace(/\\/g, '/')}`);
            actuallyRemoved++;
        } catch (err) {
            console.error(`  ERROR: ${err.message}`);
            console.error(`Aborting batch after ${actuallyRemoved} successful deletion(s). Re-run after resolving.`);
            return 1;
        }
    }
    console.log(`\nDone. ${actuallyRemoved} skill(s) removed.`);
    return 0;
}

process.exit(main());
