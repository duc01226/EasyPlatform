#!/usr/bin/env node
/**
 * Skill garbage collector — quarterly GC pass for deprecated skills.
 *
 * Per ADR-0001 (docs/adr/0001-skill-lifecycle.md):
 *   - active skills are never touched
 *   - deprecated skills become candidates for deletion once `removal_after` has passed
 *   - deletion is gated on zero non-self references in .claude/, docs/ and the root CLAUDE.md
 *
 * Per plan review D3: missing `removal_after` is treated as BLOCKED, not auto-derived.
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
 *   1 = one or more targets BLOCKED (refs found / WAITING / WAITING-NO-DATE),
 *       or --apply refused because the reference sweep was incomplete
 *   2 = invalid arguments / target not found / target not deprecated
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CANONICAL_SKILLS_DIR = path.join(REPO_ROOT, '.claude', 'skills');

// Grep ref-scope: include .claude/ + docs/, exclude auto-regen sinks, historical
// records, generated catalogs, and the workspace scratch dir. Plus self-dir.
// Root CLAUDE.md routes to skills by name (its path-scoped table and Doc Lookup
// rows), so it is a real reference site. AGENTS.md is its generated mirror and
// stays in REF_EXCLUDE_PATHS below — excluding the projection while sweeping the
// hand-maintained source is the point, not an oversight.
const REF_INCLUDE_DIRS = ['.claude', 'docs', 'CLAUDE.md'];
// The plans archive is excluded by an EXACT path prefix, deliberately narrow.
// An earlier form of this entry matched any path SEGMENT named `plans` at any
// depth, mirroring how `.gitignore:162` (the bare `plans/`) matches.
//
// On today's tree the two forms agree, and that is the honest statement: measured
// over `git ls-files -- .claude docs`, `docs/superpowers/plans` is the ONLY `plans`
// segment under the swept roots, so the segment form excluded nothing else and no
// live carrier was being lost. The prefix form is chosen for what the segment form
// WOULD do, not for damage it did: any future `plans` segment appearing anywhere
// under `.claude/` or `docs/` — a workflow's own plans directory, an active plan
// tree if `docsRoots.plans.path` is ever relocated under docs/, or a file simply
// named `plans` — would be silenced with no review, on a gate whose failure mode is
// an irreversible delete. A prefix cannot widen by itself.
//
// Cost of the narrow form, stated plainly: the next `*/plans` archive needs its own
// entry here. That is the intended trade — on a delete gate, an archive that blocks
// collection only costs a human a look, while a live reference that does not block
// costs the reference.
const REF_EXCLUDE_PATHS = [
    'docs/superpowers/plans',      // archived plans; see the note above
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
  BLOCKED            non-self references found in .claude/, docs/ or CLAUDE.md.
  NOT-DEPRECATED     status != deprecated. Skipped.

Exit: 0 dry-run/apply ok · 1 BLOCKED/WAITING present, or --apply refused for an
     incomplete sweep · 2 bad args.`);
}

// Decode a YAML frontmatter scalar — strip the quote wrapper AND undo that style's escaping.
// De-wrapping alone leaks `''` out of single-quoted scalars (`'a bug''s cause'`). Same contract as
// unquote() in .claude/scripts/lib/workflow-skills-catalog.cjs and stripQuotes() in
// .claude/scripts/codex/migrate-claude-to-codex.mjs.
function unquoteYamlScalar(value) {
    const s = String(value).trim();
    if (s.length < 2) return s;
    if (s.startsWith("'") && s.endsWith("'")) {
        let out = s.slice(1, -1);
        let previous = '';
        while (out !== previous) {
            previous = out;
            out = out.replace(/''/g, "'");
        }
        return out.trim();
    }
    if (s.startsWith('"') && s.endsWith('"')) {
        return s
            .slice(1, -1)
            .replace(/\\(["\\/])/g, '$1')
            .trim();
    }
    return s;
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
        fm[kv[1]] = unquoteYamlScalar(kv[2]);
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
    // The sweep greps the NAME and the delete removes the DIRECTORY, so both must denote the same skill. A spelling
    // that only resolves to it ("foo/", "foo/.", or another letter case on a case-insensitive disk) matches no document,
    // reads as unreferenced, and then deletes the real folder. Accept only the folder's own spelling, and use it.
    const canonicalName = path
        .relative(fs.realpathSync.native(CANONICAL_SKILLS_DIR), fs.realpathSync.native(dir))
        .split(path.sep)
        .join('/');
    if (canonicalName !== name) return null;
    return { name: canonicalName, dir, fm: parseFrontmatter(dir) || {} };
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
    // Use git grep for portability + speed.
    // Per code-reviewer M3: bare -F substring matches short names inside longer ones
    // (e.g., "cook" matches "cookbook"), so a word boundary is required — but it
    // CANNOT live in the git pattern. `git grep -E` is GNU ERE on glibc and POSIX
    // ERE on Apple git, which has no \b: the earlier `\b${name}\b` matched every
    // reference on Linux and NONE on macOS, so git grep exited 1, this returned []
    // and every deprecated skill read as unreferenced — deletion fail-open on the
    // host most of this repo's developers use. git grep narrows with a fixed
    // string; the boundary is enforced below in JavaScript, whose \b is the same
    // on every platform.
    // Scope: include REF_INCLUDE_DIRS, exclude REF_EXCLUDE_PATHS, exclude self-dir.
    // Returns array of "file:line:content" strings, with self-dir filtered out.
    const escapedForRegex = skillName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wordBounded = new RegExp(`\\b${escapedForRegex}\\b`);
    // spawnSync with argv array — no shell quoting, portable across Windows/POSIX.
    //
    // EVERY FLAG HERE EXISTS TO STOP A SILENT FAIL-OPEN. This function gates an
    // irreversible delete: a reference it cannot parse is a reference it does not
    // report, and an unreported reference means the skill is removed. Each of the
    // three shapes below was reproduced deleting a genuinely referenced skill.
    //
    // --fixed-strings  the name is a literal, never a pattern. The word boundary is
    //                  applied in JavaScript below, because `-E` is GNU ERE on glibc
    //                  and POSIX ERE on Apple git, where `\b` matches NOTHING — the
    //                  original bug: every deprecated skill read as unreferenced.
    // -z               NUL-delimits the fields AND disables path quoting. Without it
    //                  git renders `docs/ræf.md` as `"docs/r\303\246f.md"` under the
    //                  default core.quotePath, and a path containing a colon splits
    //                  wrong — both make the path gate reject a real hit.
    // --no-color       with color.grep=always git wraps the path in SGR escapes, so it
    //                  no longer starts with an include dir and every line is dropped.
    // --text           a file git reads as binary (one stray NUL is enough, and this
    //                  repo has had one) otherwise reports `Binary file X matches`,
    //                  which carries no parseable path or content at all.
    // --untracked      a reference added but not yet committed still counts. It cannot
    //                  be the only arm: --untracked makes git WALK THE WORKING TREE
    //                  under standard excludes instead of reading the index, so a file
    //                  that is tracked AND matched by .gitignore is enumerated by
    //                  neither path and disappears from the sweep. This repository has
    //                  33 such files, and `CLAUDE.md` -- a reference root below -- is
    //                  one of them (.gitignore:109), so a skill referenced only from
    //                  CLAUDE.md read as unreferenced. `git check-ignore CLAUDE.md`
    //                  answers "not ignored" for a tracked path unless it is given
    //                  --no-index, which is why the file looked clean. Hence two arms,
    //                  unioned below: the index arm enumerates from the index (reading
    //                  each path's WORKING-TREE content) whatever its ignore status,
    //                  and the --untracked arm adds new uncommitted ones.
    //
    //                  That union is the tool's coverage BOUNDARY, and it is not
    //                  total. Known uncovered classes, none of them closed here:
    //                  untracked AND ignored (the index has not heard of it and the
    //                  walk excludes it); unreadable (see the exit-1 guard below);
    //                  tracked but absent from the worktree; `skip-worktree`; a
    //                  sparse-checkout hole; a symlink target outside the roots; and
    //                  a nested repository.
    //
    //                  The untracked-and-ignored class is LIVE in this repository, so
    //                  it is a real gap and not a theoretical one:
    //                  `.claude/settings.local.json` is untracked and ignored
    //                  (.claude/.gitignore:46) and does carry skill references.
    //                  Closing it means walking ignored trees, which needs its own
    //                  exclusions for the build output under .claude/, and is filed
    //                  separately. Do not read these two arms as "every file on disk".
    //
    // maxBuffer is raised well past the default 1 MiB: a common skill name legitimately
    // matches megabytes of output (measured 8.3 MB for one), and the default turns that
    // into an ENOBUFS throw that aborts the batch.
    // A literal pathspec that does not exist makes git exit 128 ("no such path in
    // the working tree"), so an adopting repo without one of these entries could not
    // run the tool at all. Narrow to what is present — and if NOTHING is present,
    // refuse: passing no pathspec would silently widen the sweep to the whole
    // repository, which is the opposite of the scoping this list exists to do.
    // NOTE: narrowing here keeps the READ-ONLY report runnable in a stripped or
    // adopting tree, but it also makes the sweep BLIND to whatever lived under a
    // dropped root. That is safe for a report and NOT safe for a deletion, so the
    // decision that matters is enforced in main(): it names every dropped root in
    // the header and REFUSES --apply. The check below is belt-and-braces only and is
    // unreachable in normal operation, because a target requires
    // `.claude/skills/<name>/SKILL.md` to exist, which means `.claude` always does.
    const presentIncludes = REF_INCLUDE_DIRS.filter(entry =>
        fs.existsSync(path.join(REPO_ROOT, entry)));
    if (presentIncludes.length === 0) {
        throw new Error(
            `skill-gc: none of the reference roots (${REF_INCLUDE_DIRS.join(', ')}) exist under ` +
            `${REPO_ROOT}; refusing to sweep, because an unscoped git grep would search the ` +
            'entire repository instead.'
        );
    }
    // The two arms differ ONLY in how git enumerates files, so a name found by
    // either one is a reference. Running both is what closes the tracked-and-ignored
    // hole described above; neither arm alone sees every file in the roots.
    const runArm = enumerationFlags => {
        const args = [
            'grep', '-n', '-z', '--no-color', '--fixed-strings', '--text',
            ...enumerationFlags, '--', skillName, ...presentIncludes,
        ];
        const result = spawnSync('git', args, {
            cwd: REPO_ROOT,
            encoding: 'utf-8',
            stdio: ['ignore', 'pipe', 'pipe'],
            maxBuffer: 256 * 1024 * 1024,
        });
        if (result.error) throw result.error;
        // A fatal error (128: a pathspec absent from the tree, a broken repository)
        // is not a verdict about the skill, so it propagates as-is.
        if (result.status !== 0 && result.status !== 1) {
            throw new Error(`git grep exited ${result.status}: ${(result.stderr || '').trim()}`);
        }
        // Completeness is carried by stderr, NOT by the exit status. git grep's status
        // reports only the MATCH outcome: a file it could not read is announced on
        // stderr and then ignored, so the same unreadable carrier yields status 1 when
        // nothing else matched and status 0 when something did. Measured on a carrier
        // at mode 000: `error: failed to stat 'docs/guide.md': Permission denied` on
        // stderr with status 1 alone, and with status 0 when another path under the
        // same pathspecs matched — here the skill's own SKILL.md always does, so 0 is
        // the NORMAL case and a status-only check would never see the failure at all.
        // Either way the sweep did not look everywhere, which is not the same answer as
        // "nothing references this skill", so any stderr refuses the decision.
        const readError = (result.stderr || '').trim();
        if (readError) {
            throw new Error(
                'skill-gc: git grep wrote to stderr, so part of the tree could not be ' +
                `read: ${readError}. An unreadable carrier is not an absent one. ` +
                'Refusing to decide whether the skill is referenced.'
            );
        }
        if (result.status === 1) return '';
        return result.stdout || '';
    };
    const raw = `${runArm([])}\n${runArm(['--untracked'])}`;

    // A tracked, unignored file is reported by BOTH arms, so dedupe: the report
    // lists blockers, and one file naming the skill twice is one blocker.
    const lines = [...new Set(raw.split(/\r?\n/).filter(Boolean))];
    const selfDirRel = path.relative(REPO_ROOT, skillDir).replace(/\\/g, '/');
    const mirrorDirs = detectMirrors(skillName).map(m => path.relative(REPO_ROOT, m).replace(/\\/g, '/'));

    return lines.filter(line => {
        // With -z the record is `path\0lineno\0content`: the path is raw, unquoted
        // bytes and cannot be confused by a colon, a quote, or a colour escape.
        //
        // A record short of those three fields means the record boundaries are not
        // what this parse assumes, so it throws rather than guessing. It is rare but
        // NOT impossible: records are newline-terminated even under -z, so a path
        // containing a literal newline splits into two short records. No such path
        // exists here, and the direction is fail-closed — the tool refuses to decide
        // rather than deciding "unreferenced".
        //
        // The earlier version tested the whole raw line instead, which reads as the
        // cautious choice and was not: the line begins with the PATH, so it let a
        // path resurrect a line whose text only embeds the name — the very thing the
        // boundary test below exists to prevent — and it could be flipped to
        // `return false`, a silent fail-open on a delete gate, with no test going
        // red. A throw has no fail-open direction to flip.
        //
        // Swapping this throw for `return false` still leaves all nine tests green,
        // because nothing in the fixtures produces a short record. What covers it is
        // the inverse mutation: remove -z and all nine fail, and it is this throw
        // that fails them. Load-bearing for that case, not dead code.
        const fields = line.split('\u0000');
        if (fields.length < 3) {
            throw new Error(
                'skill-gc: a git grep -z record carried fewer than three NUL-separated ' +
                `fields: ${JSON.stringify(line.slice(0, 200))}. A path containing a literal ` +
                'newline does this. Refusing to decide whether the skill is referenced.'
            );
        }
        const norm = fields[0].replace(/\\/g, '/');

        // Self-exclusion: own canonical dir and own mirror dirs (mirrors are
        // wiped atomically with canonical, so refs inside them are not blockers)
        if (norm.startsWith(selfDirRel + '/') || norm === selfDirRel) return false;
        for (const md of mirrorDirs) {
            if (norm.startsWith(md + '/') || norm === md) return false;
        }

        // Excluded paths, by prefix...
        for (const ex of REF_EXCLUDE_PATHS) {
            if (norm === ex || norm.startsWith(ex + '/')) return false;
        }
        // Restrict to include dirs (defense in depth — git grep already scoped)
        const inInclude = REF_INCLUDE_DIRS.some(d => norm === d || norm.startsWith(d + '/'));
        if (!inInclude) return false;

        // Word boundary, applied to the matched CONTENT only: the path is already
        // decided above, and a path containing the name must not resurrect a line
        // whose text only embeds it (`cook` inside `cookbook`).
        const content = fields.slice(2).join('\u0000');
        if (!wordBounded.test(content)) return false;

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
    // warn but do not block (mirrors are regenerable by sync-codex).
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
            console.warn(`  WARN: mirror delete failed (${mirror}): ${err.message} — regenerate via sync-codex`);
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
                console.error(`Error: skill not found (the name must match its folder exactly): .claude/skills/${name}/SKILL.md`);
                return 2;
            }
            targets.push(t);
        }
    }

    const today = new Date();
    const decisions = targets.map(t => ({ target: t, decision: decide(t, today) }));

    // A reference root absent from the WORKING TREE is silently dropped from the
    // sweep pathspec, so anything referencing the skill from under it is invisible.
    //
    // The discriminator is deliberately NOT `existsSync` alone. A root that exists in
    // neither the index nor the worktree carries nothing, so dropping it loses nothing
    // and refusing would be a false alarm (measured: the fixture repos have no
    // CLAUDE.md at all, and an earlier existsSync-only form of this check wrongly
    // refused every legitimate collection in them). The dangerous case is the root git
    // still TRACKS while the worktree lacks it — a sparse checkout or `skip-worktree`
    // — because then committed carriers exist that `git grep` cannot read.
    const hasTrackedContent = entry => {
        const r = spawnSync('git', ['ls-files', '-z', '--', entry], {
            cwd: REPO_ROOT, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'],
        });
        if (r.error) throw r.error;
        return r.status === 0 && (r.stdout || '').length > 0;
    };
    const missingRefRoots = REF_INCLUDE_DIRS.filter(
        entry => !fs.existsSync(path.join(REPO_ROOT, entry)) && hasTrackedContent(entry));

    console.log(`skill-gc — ${args.apply ? 'APPLY' : 'dry-run'} · ${decisions.length} target(s) · ${formatLocalDate(today)}\n`);
    if (missingRefRoots.length > 0) {
        console.log(
            `  ! INCOMPLETE SWEEP — reference root(s) tracked but absent from the ` +
            `working tree: ${missingRefRoots.join(', ')}.\n` +
            '    Committed references under them were NOT seen, so every READY below is\n' +
            '    unproven and --apply is refused while this holds. A sparse checkout or\n' +
            '    skip-worktree bit is the usual cause.\n'
        );
    }

    let readyCount = 0, blockedCount = 0, waitingCount = 0, otherCount = 0;
    for (const { target, decision } of decisions) {
        const tag = decision.state.padEnd(16);
        console.log(`  [${tag}] ${target.name} — ${decision.reason}`);
        if (decision.refs) {
            // Records carry raw NUL field separators; rendering them as a visible
            // marker keeps a reference report readable in a terminal that would
            // otherwise swallow or mangle the byte.
            for (const r of decision.refs.slice(0, 5)) {
                console.log(`        ref: ${r.split('\u0000').join(' \u2400 ')}`);
            }
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

    // Completeness: refuse to apply when the sweep could not cover a declared
    // reference root. A narrowed sweep cannot distinguish "no references" from
    // "did not look", and the difference is a deleted skill that was still in use.
    // The report above stays available so the operator can see what IS known.
    if (missingRefRoots.length > 0) {
        console.error(
            `\nRefusing --apply: reference root(s) tracked but absent from the working ` +
            `tree (${missingRefRoots.join(', ')}), so the sweep was incomplete and no ` +
            'READY verdict is proven. Restore the root(s) to the worktree, or run ' +
            'without --apply to use the report as-is.'
        );
        return 1;
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
