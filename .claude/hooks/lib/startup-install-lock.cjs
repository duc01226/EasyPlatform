#!/usr/bin/env node
'use strict';
/**
 * Per-project startup-install lock (P7 contract).
 *
 * WHY THIS EXISTS
 *   Two sessions starting in the same project at the same moment would otherwise
 *   run two package managers against one `node_modules` tree. This module makes
 *   at most one startup install run per canonical project root, per host, per
 *   account — WITHOUT writing anything into the adopter project (npm `ci` deletes
 *   `node_modules`, and a repo-local lock would also become a stray file in every
 *   project that copies the framework).
 *
 * WHERE THE LOCK LIVES
 *   A private per-user child directory of the CANONICALIZED OS temp parent, never
 *   the project. `os.tmpdir()` / `TEMP` / `TMP` / `TMPDIR` are NOT trusted on their
 *   own: the parent is canonicalized and its native protections are proven before
 *   a child is created, because a redirected or world-writable parent would let
 *   another account pre-create or swap the lock path.
 *
 * FAIL-CLOSED POSTURE
 *   Every uncertain state keeps the lock and skips the install. A lock is NEVER
 *   reclaimed by age — only by positive proof that the recorded owner AND every
 *   install descendant are dead, followed by atomic exclusive reacquisition.
 *
 * ── INJECTION SEAMS ────────────────────────────────────────────────────────────
 * `createLockSeams(overrides)` returns the seam object every function here takes.
 * Tests override any subset; nothing else in this file reaches for `fs`/`os`/
 * `child_process` directly. Seam contract:
 *
 *   now()                        -> epoch ms (clock)
 *   sleep(ms)                    -> Promise resolved after ms (bounded wait pacing)
 *   tempParent()                 -> raw OS temp parent path (pre-canonicalization)
 *   realpath(p)                  -> canonical path, throws when unresolvable
 *   lstat(p) / stat(p)           -> fs.Stats, throws ENOENT
 *   mkdir(p, mode)               -> create one directory, throws EEXIST
 *   openExclusive(p, mode)       -> fd for a `wx` create, throws EEXIST
 *   writeFd(fd, text) / closeFd(fd)
 *   readFile(p)                  -> utf8 text, throws ENOENT
 *   writeOwnedFile(p, text)      -> overwrite a file we already hold exclusively
 *   unlink(p)
 *   userKey()                    -> stable, non-secret per-account identifier
 *   hostKey()                    -> stable, non-secret per-host identifier
 *   randomToken()                -> unguessable hex owner token
 *   pid()                        -> this process id
 *   processStartIdentity(pid, platform)
 *                                -> stable per-process-instance string | null
 *                                   (null = unprovable)
 *   processAlive(pid)            -> true | false | null (null = unprovable)
 *   groupAlive(group)            -> true | false | null, for the descendant tree
 *   terminateTree(group)         -> best-effort full-tree termination
 *   probePathSafety(path, platform)
 *                                -> { ok:true } | { ok:false, code }
 *   probeParentProtection(dir)   -> { ok:true } | { ok:false, code }
 *   probeChildPrivacy(dir)       -> { ok:true } | { ok:false, code }
 *   probePlatformSupport(platform)
 *                                -> boolean
 *   captureTree(group, platform, previous)
 *                                -> { ok:true, tree } | { ok:false }
 *   treeAlive(tree, platform)    -> true | false | null
 *   platform()                   -> 'win32' | posix name
 * ───────────────────────────────────────────────────────────────────────────────
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

// ── Fixed contract constants (never configurable) ─────────────────────────────
const WAIT_CEILING_MS = 5000; // contender gives up after 5 s
const POLL_INTERVAL_MS = 100; // and polls every 100 ms
const CLEANUP_PROOF_MS = 30000; // extra budget to PROVE the tree stopped
const LOCK_DIR_MODE = 0o700;
const LOCK_FILE_MODE = 0o600;
const RECORD_VERSION = 1;
const SUPPORTED_PLATFORMS = Object.freeze(['win32', 'linux', 'darwin']);
const WINDOWS_REPARSE_POINT = 0x400;

/**
 * Fixed outcome vocabulary. Diagnostics are built from these codes plus a
 * manager identifier — never from raw paths, records, or process output.
 */
const LOCK_OUTCOMES = Object.freeze({
    IN_PROGRESS: 'skip-lock-in-progress',
    OWNERSHIP_UNVERIFIABLE: 'skip-lock-ownership-unverifiable',
    UNSAFE_TEMP_PARENT: 'skip-lock-unsafe-temp-parent',
    UNSAFE_LOCK_CHILD: 'skip-lock-unsafe-child',
    PRIVACY_UNPROVABLE: 'skip-lock-privacy-unprovable',
    UNAVAILABLE: 'skip-lock-unavailable',
    UNSUPPORTED_PLATFORM: 'skip-unsupported-platform',
    REPAIRED_BY_PEER: 'noop-repaired-by-peer',
    RETAINED_CLEANUP_UNPROVEN: 'lock-retained-cleanup-unproven'
});

// ── Default seam implementations ──────────────────────────────────────────────

function defaultSleep(ms) {
    // Promise-based, not Atomics.wait: the manager runs as a real child process
    // whose exit event needs a live event loop, so the waiter must yield.
    return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

function isSupportedPlatform(platform) {
    return SUPPORTED_PLATFORMS.includes(platform);
}

function windowsPowerShellPath() {
    return path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
}

function runPowerShell(script, extraEnv) {
    try {
        const result = spawnSync(
            windowsPowerShellPath(),
            ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
            {
                env: Object.assign({}, process.env, extraEnv || {}),
                encoding: 'utf8',
                windowsHide: true,
                timeout: 10000
            }
        );
        if (!result || result.status !== 0 || typeof result.stdout !== 'string') return null;
        return result.stdout;
    } catch {
        return null;
    }
}

function parseWindowsProbe(stdout) {
    if (!stdout) return null;
    const values = {};
    for (const line of String(stdout).split(/\r?\n/)) {
        const separator = line.indexOf('=');
        if (separator <= 0) continue;
        values[line.slice(0, separator)] = line.slice(separator + 1).trim();
    }
    if (!values.SID || !values.SDDL || !values.ATTR) return null;
    const attributes = Number(values.ATTR);
    if (!Number.isInteger(attributes)) return null;
    return { sid: values.SID, sddl: values.SDDL, attributes };
}

function windowsPathFacts(target) {
    return parseWindowsProbe(
        runPowerShell(
            "$ErrorActionPreference='Stop';" +
                "$p=$env:CK_LOCK_PROBE_PATH;" +
                "$i=[System.IO.DirectoryInfo]::new($p);" +
                "$sid=[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value;" +
                "$sddl=[System.IO.Directory]::GetAccessControl($p).GetSecurityDescriptorSddlForm([System.Security.AccessControl.AccessControlSections]::All);" +
                "Write-Output ('SID=' + $sid);" +
                "Write-Output ('ATTR=' + [int]$i.Attributes);" +
                "Write-Output ('SDDL=' + $sddl);",
            { CK_LOCK_PROBE_PATH: target }
        )
    );
}

function normalizeWindowsTrustee(value) {
    const aliases = {
        SY: 'S-1-5-18',
        BA: 'S-1-5-32-544',
        CO: 'CREATOR_OWNER'
    };
    return aliases[value] || value;
}

function parseSddlAces(sddl) {
    const aces = [];
    const pattern = /\(([^()]*)\)/g;
    let match;
    while ((match = pattern.exec(String(sddl))) !== null) {
        const fields = match[1].split(';');
        if (fields.length < 6) return null;
        aces.push({ type: fields[0], trustee: fields[5] });
    }
    return aces.length > 0 ? aces : null;
}

function windowsTrustedSid(trustee, currentSid) {
    const normalized = normalizeWindowsTrustee(String(trustee || ''));
    if (normalized === 'CREATOR_OWNER') return true;
    if (normalized === currentSid || normalized === 'S-1-5-18' || normalized === 'S-1-5-32-544') return true;
    if (/^S-1-5-(?:19|20)$/.test(normalized)) return true;
    if (/^S-1-5-80-/.test(normalized)) return true;
    return false;
}

function windowsSddlIsPrivate(facts) {
    if (!facts || !windowsTrustedSid(facts.sid, facts.sid)) return false;
    const ownerMatch = /^O:([^G]+)G:/.exec(facts.sddl);
    if (!ownerMatch || !windowsTrustedSid(ownerMatch[1], facts.sid)) return false;
    const aces = parseSddlAces(facts.sddl);
    if (!aces) return false;
    return aces.every((ace) => ace.type === 'A' && windowsTrustedSid(ace.trustee, facts.sid));
}

function defaultPathSafety(target, platform = process.platform) {
    let info;
    try {
        info = fs.lstatSync(target);
    } catch {
        return { ok: false, code: LOCK_OUTCOMES.UNSAFE_TEMP_PARENT };
    }
    if (info.isSymbolicLink() || !info.isDirectory()) {
        return { ok: false, code: LOCK_OUTCOMES.UNSAFE_TEMP_PARENT };
    }
    if (platform === 'win32') {
        const facts = windowsPathFacts(target);
        if (!facts) return { ok: false, code: LOCK_OUTCOMES.PRIVACY_UNPROVABLE };
        if ((facts.attributes & WINDOWS_REPARSE_POINT) !== 0) {
            return { ok: false, code: LOCK_OUTCOMES.UNSAFE_TEMP_PARENT };
        }
    }
    return { ok: true };
}

function defaultTempParent(platform = process.platform) {
    if (platform === 'win32') {
        const localAppData = String(process.env.LOCALAPPDATA || '').trim();
        if (localAppData && path.isAbsolute(localAppData)) return localAppData;
    }
    return os.tmpdir();
}

function defaultProcessAlive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        if (error && error.code === 'ESRCH') return false;
        if (error && error.code === 'EPERM') return true; // alive, owned elsewhere
        return null; // unprovable -> caller fails closed
    }
}

function parseLinuxStat(pid, text) {
    const closing = String(text).lastIndexOf(')');
    if (closing < 0) return null;
    const fields = String(text).slice(closing + 1).trim().split(/\s+/);
    if (!fields[1] || !fields[19]) return null;
    const ppid = Number(fields[1]);
    if (!Number.isInteger(ppid) || ppid < 0) return null;
    return { pid, ppid, start: 'linux:' + fields[19] };
}

function defaultProcessCensus(platform = process.platform) {
    if (platform === 'linux') {
        const census = new Map();
        let entries;
        try {
            entries = fs.readdirSync('/proc');
        } catch {
            return null;
        }
        for (const entry of entries) {
            if (!/^\d+$/.test(entry)) continue;
            const pid = Number(entry);
            try {
                const parsed = parseLinuxStat(pid, fs.readFileSync('/proc/' + entry + '/stat', 'utf8'));
                if (!parsed) return null;
                census.set(pid, parsed);
            } catch (error) {
                // /proc is a live view: a process may exit between readdir and
                // readFile. That race is safe to ignore; every other read
                // failure makes the census unprovable and therefore fail-closed.
                if (error && error.code === 'ENOENT') continue;
                return null;
            }
        }
        return census.size > 0 ? census : null;
    }
    if (platform === 'darwin') {
        let result;
        try {
            result = spawnSync('/bin/ps', ['-axo', 'pid=,ppid=,lstart='], {
                encoding: 'utf8',
                timeout: 10000
            });
        } catch {
            return null;
        }
        if (!result || result.status !== 0 || !result.stdout) return null;
        const census = new Map();
        for (const line of result.stdout.split(/\r?\n/)) {
            if (!line.trim()) continue;
            const match = /^\s*(\d+)\s+(\d+)\s+(.+?)\s*$/.exec(line);
            if (!match) return null;
            const pid = Number(match[1]);
            const ppid = Number(match[2]);
            if (!Number.isInteger(pid) || !Number.isInteger(ppid) || !match[3]) return null;
            census.set(pid, { pid, ppid, start: 'darwin:' + match[3].replace(/\s+/g, ' ') });
        }
        return census.size > 0 ? census : null;
    }
    if (platform === 'win32') {
        const stdout = runPowerShell(
            "$ErrorActionPreference='Stop';" +
                "Get-CimInstance -ClassName Win32_Process | ForEach-Object {" +
                "if ($null -eq $_.CreationDate) { throw 'missing process identity' };" +
                "Write-Output (('{0}|{1}|{2}' -f $_.ProcessId,$_.ParentProcessId,$_.CreationDate.ToUniversalTime().Ticks))" +
                "}"
        );
        if (!stdout) return null;
        const census = new Map();
        for (const line of stdout.split(/\r?\n/)) {
            if (!line.trim()) continue;
            const parts = line.trim().split('|');
            if (parts.length !== 3) return null;
            const pid = Number(parts[0]);
            const ppid = Number(parts[1]);
            if (!Number.isInteger(pid) || !Number.isInteger(ppid) || !/^\d+$/.test(parts[2])) return null;
            census.set(pid, { pid, ppid, start: 'win:' + parts[2] });
        }
        return census.size > 0 ? census : null;
    }
    return null;
}

function defaultProcessStartIdentity(pid, platform = process.platform) {
    if (!Number.isInteger(Number(pid)) || Number(pid) <= 0) return null;
    const census = defaultProcessCensus(platform);
    const entry = census && census.get(Number(pid));
    return entry ? entry.start : null;
}

function defaultCaptureTree(group, platform = process.platform, previous) {
    if (!group || !Number.isInteger(group.id) || !isSupportedPlatform(platform)) return { ok: false };
    const census = defaultProcessCensus(platform);
    if (!census) return { ok: false };
    const prior = previous && Array.isArray(previous.members) ? previous.members : [];
    const members = new Map();
    for (const member of prior) {
        if (member && Number.isInteger(member.pid) && typeof member.start === 'string' && member.start) {
            const current = census.get(member.pid);
            if (current && current.start !== member.start) return { ok: false };
            members.set(member.pid, current || { pid: member.pid, ppid: Number(member.ppid) || 0, start: member.start });
        }
    }
    const root = census.get(group.id);
    const priorRoot = previous && previous.root;
    if (root && priorRoot && root.start !== priorRoot.start) return { ok: false };
    if (root) members.set(group.id, root);
    const queue = [group.id];
    const visited = new Set();
    while (queue.length > 0) {
        const parent = queue.shift();
        if (visited.has(parent)) continue;
        visited.add(parent);
        for (const entry of census.values()) {
            if (entry.ppid === parent && !visited.has(entry.pid)) {
                members.set(entry.pid, entry);
                queue.push(entry.pid);
            }
        }
    }
    const rootStart = (root && root.start) || (priorRoot && priorRoot.start) || null;
    if (typeof rootStart !== 'string' || !rootStart) return { ok: false };
    return {
        ok: true,
        tree: {
            root: {
                pid: group.id,
                start: rootStart
            },
            members: [...members.values()]
        }
    };
}

function defaultTreeAlive(tree, platform = process.platform) {
    if (!tree || !Array.isArray(tree.members)) return null;
    const census = defaultProcessCensus(platform);
    if (!census) return null;
    const members = [...tree.members];
    if (tree.root && Number.isInteger(tree.root.pid) && typeof tree.root.start === 'string' && tree.root.start) {
        members.push({ pid: tree.root.pid, start: tree.root.start });
    }
    for (const member of members) {
        if (!member || !Number.isInteger(member.pid) || typeof member.start !== 'string' || !member.start) return null;
        const current = census.get(member.pid);
        if (!current) continue;
        if (current.start !== member.start) return null;
        return true;
    }
    return false;
}

function defaultGroupAlive(group) {
    const captured = defaultCaptureTree(group, process.platform);
    if (!captured.ok) return null;
    return defaultTreeAlive(captured.tree, process.platform);
}

function defaultTerminateTree(group) {
    if (!group || typeof group.id !== 'number') return false;
    if (group.kind === 'pgid') {
        for (const signal of ['SIGTERM', 'SIGKILL']) {
            try {
                process.kill(-group.id, signal);
            } catch {
                /* already gone */
            }
        }
        return true;
    }
    const taskkill = spawnSync(
        path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'taskkill.exe'),
        ['/T', '/F', '/PID', String(group.id)],
        { encoding: 'utf8', windowsHide: true, timeout: 10000 }
    );
    return Boolean(taskkill && (taskkill.status === 0 || taskkill.status === 128));
}

function defaultProbePlatformSupport(platform = process.platform) {
    if (!isSupportedPlatform(platform)) return false;
    const census = defaultProcessCensus(platform);
    const self = census && census.get(process.pid);
    return Boolean(self && self.start);
}

/**
 * POSIX: a parent shared between accounts is acceptable only when the sticky bit
 * makes another account unable to replace our child. A non-shared parent must be
 * owned by us or by root. Windows parents are judged by the child ACL probe
 * instead, because Windows exposes no sticky-bit equivalent through `fs.Stats`.
 */
function defaultProbeParentProtection(dir, platform = process.platform) {
    const safety = defaultPathSafety(dir, platform);
    if (!safety.ok) return safety;
    if (platform === 'win32') {
        const facts = windowsPathFacts(dir);
        return windowsSddlIsPrivate(facts)
            ? { ok: true }
            : { ok: false, code: LOCK_OUTCOMES.PRIVACY_UNPROVABLE };
    }
    let info;
    try {
        info = fs.lstatSync(dir);
    } catch {
        return { ok: false, code: LOCK_OUTCOMES.UNSAFE_TEMP_PARENT };
    }
    if (info.isSymbolicLink() || !info.isDirectory()) {
        return { ok: false, code: LOCK_OUTCOMES.UNSAFE_TEMP_PARENT };
    }
    const mode = info.mode & 0o7777;
    const groupOrWorldWritable = (mode & 0o022) !== 0;
    const sticky = (mode & 0o1000) !== 0;
    const ownedByUs = typeof process.getuid === 'function' && info.uid === process.getuid();
    if (!groupOrWorldWritable && (ownedByUs || info.uid === 0)) return { ok: true };
    if (groupOrWorldWritable && sticky) return { ok: true };
    return { ok: false, code: LOCK_OUTCOMES.UNSAFE_TEMP_PARENT };
}

/**
 * POSIX: current-uid ownership, no group/world bits, not a link.
 * Windows: every ACL principal must be this account or a trusted system
 * principal. An unparsable or unavailable probe is UNPROVABLE, which skips.
 */
function defaultProbeChildPrivacy(dir, platform = process.platform) {
    const safety = defaultPathSafety(dir, platform);
    if (!safety.ok) return { ok: false, code: LOCK_OUTCOMES.UNSAFE_LOCK_CHILD };
    if (platform === 'win32') {
        const facts = windowsPathFacts(dir);
        return windowsSddlIsPrivate(facts)
            ? { ok: true }
            : { ok: false, code: LOCK_OUTCOMES.PRIVACY_UNPROVABLE };
    }
    let info;
    try {
        info = fs.lstatSync(dir);
    } catch {
        return { ok: false, code: LOCK_OUTCOMES.UNSAFE_LOCK_CHILD };
    }
    if (info.isSymbolicLink() || !info.isDirectory()) {
        return { ok: false, code: LOCK_OUTCOMES.UNSAFE_LOCK_CHILD };
    }
    if (typeof process.getuid === 'function' && info.uid !== process.getuid()) {
        return { ok: false, code: LOCK_OUTCOMES.UNSAFE_LOCK_CHILD };
    }
    if ((info.mode & 0o077) !== 0) return { ok: false, code: LOCK_OUTCOMES.UNSAFE_LOCK_CHILD };
    return { ok: true };
}

const DEFAULT_SEAMS = Object.freeze({
    now: () => Date.now(),
    sleep: defaultSleep,
    tempParent: () => defaultTempParent(process.platform),
    realpath: (p) => fs.realpathSync(p),
    lstat: (p) => fs.lstatSync(p),
    stat: (p) => fs.statSync(p),
    mkdir: (p, mode) => fs.mkdirSync(p, { mode }),
    openExclusive: (p, mode) => fs.openSync(p, 'wx', mode),
    writeFd: (fd, text) => fs.writeSync(fd, text),
    closeFd: (fd) => fs.closeSync(fd),
    readFile: (p) => fs.readFileSync(p, 'utf8'),
    writeOwnedFile: (p, text) => fs.writeFileSync(p, text, { mode: LOCK_FILE_MODE }),
    unlink: (p) => fs.unlinkSync(p),
    userKey: () => {
        try {
            return String(os.userInfo().username || 'unknown');
        } catch {
            return 'unknown';
        }
    },
    hostKey: () => String(os.hostname() || 'unknown'),
    randomToken: () => crypto.randomBytes(24).toString('hex'),
    pid: () => process.pid,
    processStartIdentity: defaultProcessStartIdentity,
    processAlive: defaultProcessAlive,
    groupAlive: defaultGroupAlive,
    terminateTree: defaultTerminateTree,
    probePathSafety: defaultPathSafety,
    probeParentProtection: defaultProbeParentProtection,
    probeChildPrivacy: defaultProbeChildPrivacy,
    probePlatformSupport: defaultProbePlatformSupport,
    captureTree: defaultCaptureTree,
    treeAlive: defaultTreeAlive,
    platform: () => process.platform
});

function createLockSeams(overrides) {
    return Object.assign({}, DEFAULT_SEAMS, overrides || {});
}

// ── Keys and records ──────────────────────────────────────────────────────────

function sha256Hex(value) {
    return crypto.createHash('sha256').update(String(value)).digest('hex');
}

/** One lock file per canonical project root. */
function rootKey(canonicalRoot) {
    return sha256Hex(canonicalRoot);
}

/** Private per-account child directory name; no raw username lands on disk. */
function lockChildName(seams) {
    return 'ck-startup-install-' + sha256Hex(seams.userKey() + '\u0000' + seams.hostKey()).slice(0, 24);
}

/**
 * Canonicalize the temp parent, prove its protections, then create and verify the
 * private child. Returns `{ ok:true, dir }` or `{ ok:false, code }`.
 */
function prepareLockDirectory(seams) {
    const platform = seams.platform();
    if (!isSupportedPlatform(platform)) {
        return { ok: false, code: LOCK_OUTCOMES.UNSUPPORTED_PLATFORM };
    }
    let rawParent;
    try {
        rawParent = seams.tempParent();
    } catch {
        return { ok: false, code: LOCK_OUTCOMES.UNSAFE_TEMP_PARENT };
    }
    if (typeof rawParent !== 'string' || !path.isAbsolute(rawParent)) {
        return { ok: false, code: LOCK_OUTCOMES.UNSAFE_TEMP_PARENT };
    }
    const rawSafety = seams.probePathSafety(rawParent, platform);
    if (!rawSafety || !rawSafety.ok) {
        return { ok: false, code: (rawSafety && rawSafety.code) || LOCK_OUTCOMES.UNSAFE_TEMP_PARENT };
    }
    let parent;
    try {
        parent = seams.realpath(rawParent);
    } catch {
        return { ok: false, code: LOCK_OUTCOMES.UNSAFE_TEMP_PARENT };
    }
    if (!parent || typeof parent !== 'string' || !path.isAbsolute(parent)) {
        return { ok: false, code: LOCK_OUTCOMES.UNSAFE_TEMP_PARENT };
    }

    const canonicalSafety = seams.probePathSafety(parent, platform);
    if (!canonicalSafety || !canonicalSafety.ok) {
        return { ok: false, code: (canonicalSafety && canonicalSafety.code) || LOCK_OUTCOMES.UNSAFE_TEMP_PARENT };
    }

    const parentProbe = seams.probeParentProtection(parent, platform);
    if (!parentProbe || !parentProbe.ok) {
        return { ok: false, code: (parentProbe && parentProbe.code) || LOCK_OUTCOMES.UNSAFE_TEMP_PARENT };
    }

    const dir = path.join(parent, lockChildName(seams));
    try {
        seams.mkdir(dir, LOCK_DIR_MODE);
    } catch (error) {
        // EEXIST is the normal steady state: the child persists across sessions.
        // Anything else means we cannot establish a private child at all.
        if (!error || error.code !== 'EEXIST') return { ok: false, code: LOCK_OUTCOMES.UNAVAILABLE };
    }

    // Verify AFTER creation in every case, including EEXIST: a pre-existing child
    // may have been planted by another account.
    const childSafety = seams.probePathSafety(dir, platform);
    if (!childSafety || !childSafety.ok) {
        return { ok: false, code: (childSafety && childSafety.code) || LOCK_OUTCOMES.UNSAFE_LOCK_CHILD };
    }
    const childProbe = seams.probeChildPrivacy(dir, platform);
    if (!childProbe || !childProbe.ok) {
        return { ok: false, code: (childProbe && childProbe.code) || LOCK_OUTCOMES.UNSAFE_LOCK_CHILD };
    }
    return { ok: true, dir };
}

function buildRecord(seams, key) {
    const pid = seams.pid();
    const processStart = seams.processStartIdentity(pid, seams.platform());
    if (!Number.isInteger(pid) || typeof processStart !== 'string' || !processStart) return null;
    return {
        v: RECORD_VERSION,
        rootKey: key,
        host: sha256Hex(seams.hostKey()),
        user: sha256Hex(seams.userKey()),
        pid,
        processStart,
        group: null,
        tree: null,
        launching: false,
        token: seams.randomToken(),
        createdAt: seams.now()
    };
}

function parseRecord(text) {
    try {
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
        if (parsed.v !== RECORD_VERSION) return null;
        if (!/^[a-f0-9]{64}$/.test(parsed.rootKey)) return null;
        if (typeof parsed.token !== 'string' || !parsed.token) return null;
        if (typeof parsed.host !== 'string' || !/^[a-f0-9]{64}$/.test(parsed.host)) return null;
        if (typeof parsed.user !== 'string' || !/^[a-f0-9]{64}$/.test(parsed.user)) return null;
        if (!Number.isSafeInteger(parsed.pid) || parsed.pid <= 0) return null;
        if (typeof parsed.processStart !== 'string' || !parsed.processStart) return null;
        if (typeof parsed.launching !== 'boolean') return null;
        if (!Number.isFinite(parsed.createdAt)) return null;
        if (parsed.group !== null && parsed.group !== undefined) {
            if (!parsed.group || !['pid', 'pgid'].includes(parsed.group.kind) || !Number.isSafeInteger(parsed.group.id) || parsed.group.id <= 0) {
                return null;
            }
        }
        if (parsed.tree !== null && parsed.tree !== undefined) {
            if (!parsed.tree || !parsed.tree.root || !Number.isSafeInteger(parsed.tree.root.pid) || parsed.tree.root.pid <= 0) return null;
            if (typeof parsed.tree.root.start !== 'string' || !parsed.tree.root.start || !Array.isArray(parsed.tree.members)) return null;
            for (const member of parsed.tree.members) {
                if (
                    !member ||
                    !Number.isSafeInteger(member.pid) ||
                    member.pid <= 0 ||
                    !Number.isSafeInteger(member.ppid) ||
                    member.ppid < 0 ||
                    typeof member.start !== 'string' ||
                    !member.start
                ) return null;
            }
        }
        return parsed;
    } catch {
        return null;
    }
}

function writeRecordExclusive(seams, lockPath, record) {
    const fd = seams.openExclusive(lockPath, LOCK_FILE_MODE);
    try {
        seams.writeFd(fd, JSON.stringify(record));
    } finally {
        seams.closeFd(fd);
    }
}

// ── Stale-owner reclaim ───────────────────────────────────────────────────────

/**
 * Positive-proof reclaim. Returns true only when every one of these holds:
 *   - the record parses, and its canonical root key + host + account all match
 *   - the recorded owner PID is PROVABLY dead (alive, PID-reused and unprovable
 *     all refuse)
 *   - every recorded install descendant is PROVABLY dead
 *   - the on-disk bytes are unchanged since we read them
 *   - the stale file is removed, so the caller can re-create it exclusively
 * Age is never an input.
 */
function inspectRecord(seams, key, rawText) {
    const record = parseRecord(rawText);
    if (!record) return { state: 'unverifiable' };
    if (record.rootKey !== key) return { state: 'unverifiable', record };
    if (record.host !== sha256Hex(seams.hostKey())) return { state: 'unverifiable', record };
    if (record.user !== sha256Hex(seams.userKey())) return { state: 'unverifiable', record };

    const ownerAlive = seams.processAlive(record.pid);
    if (ownerAlive === null) return { state: 'unverifiable', record };
    if (ownerAlive === true) {
        const currentStart = seams.processStartIdentity(record.pid, seams.platform());
        if (typeof currentStart !== 'string' || currentStart !== record.processStart) {
            return { state: 'unverifiable', record };
        }
        return { state: 'live', record };
    }

    if (record.launching && !record.tree) return { state: 'unverifiable', record };
    if (record.group && !record.tree) return { state: 'unverifiable', record };
    if (record.tree) {
        const treeState = seams.treeAlive(record.tree, seams.platform());
        if (treeState === null) return { state: 'unverifiable', record };
        if (treeState === true) return { state: 'live', record };
    }
    return { state: 'reclaimable', record };
}

function tryReclaim(seams, lockPath, key, rawText) {
    const inspected = inspectRecord(seams, key, rawText);
    if (inspected.state !== 'reclaimable') return false;

    let current;
    try {
        current = seams.readFile(lockPath);
    } catch {
        return false;
    }
    if (current !== rawText) return false;

    try {
        seams.unlink(lockPath);
    } catch {
        return false;
    }
    return true;
}

// ── Process-tree cleanup proof ────────────────────────────────────────────────

/**
 * Terminate the recorded tree and spend at most CLEANUP_PROOF_MS proving every
 * process stopped. Applies equally to a timed-out manager and to a normal exit
 * that left descendants behind. Returns false for live AND for unprovable.
 */
async function proveTreeStopped(seams, group, initialTree, updateTree) {
    if (!group) return { proven: true, tree: initialTree || null };
    let tree = initialTree || null;
    const refresh = () => {
        if (tree) {
            const observed = seams.captureTree(group, seams.platform(), tree);
            if (!observed || !observed.ok || !observed.tree) return false;
            tree = observed.tree;
            if (typeof updateTree === 'function' && updateTree(tree) === false) return false;
            return true;
        }
        const observed = seams.captureTree(group, seams.platform());
        if (observed && observed.ok && observed.tree) {
            tree = observed.tree;
            if (typeof updateTree === 'function' && updateTree(tree) === false) return false;
            return true;
        }
        return false;
    };
    const state = () => {
        if (tree) return seams.treeAlive(tree, seams.platform());
        // A process-group/root-PID answer is not proof that reparented or
        // detached descendants are gone. Without a retained census, cleanup is
        // unprovable and the lock must remain held.
        return null;
    };

    if (refresh()) {
        if (state() === false) return { proven: true, tree };
    } else if (state() === false) {
        return { proven: true, tree };
    }

    seams.terminateTree(group);
    const deadline = seams.now() + CLEANUP_PROOF_MS;
    for (;;) {
        if (!refresh()) return { proven: false, tree };
        const current = state();
        if (current === false) return { proven: true, tree };
        if (current === null || seams.now() >= deadline) return { proven: false, tree };
        await seams.sleep(POLL_INTERVAL_MS);
    }
}

/** Release only our own lock: re-read, match the owner token, then unlink. */
function releaseLock(seams, lockPath, token) {
    try {
        const current = parseRecord(seams.readFile(lockPath));
        if (!current || current.token !== token) return false;
        seams.unlink(lockPath);
        return true;
    } catch {
        return false;
    }
}

// ── Public entry point ────────────────────────────────────────────────────────

/**
 * Serialize one startup install for one canonical project root.
 *
 * @param {object}   options
 * @param {string}   options.canonicalRoot canonical (realpath'd) project root
 * @param {object}   [options.seams]       see createLockSeams
 * @param {Function} options.recheck       () => boolean|Promise<boolean> — true when dependencies
 *                                         are already complete (a peer repaired
 *                                         them while we waited)
 * @param {Function} options.run           ({ publishGroup }) => { outcome, group? }
 *                                         spawns the manager. Call
 *                                         `publishGroup(group)` as soon as the
 *                                         process-tree handle exists so a crash
 *                                         here still leaves a reclaimable record.
 * @returns {Promise<{ outcome: string, lockRetained?: boolean, inner?: object, lockPath?: string }>}
 */
async function withProjectLock(options) {
    const { canonicalRoot, recheck, run } = options;
    const seams = createLockSeams(options.seams);
    const platform = seams.platform();
    if (!isSupportedPlatform(platform)) return { outcome: LOCK_OUTCOMES.UNSUPPORTED_PLATFORM };
    let supported;
    try {
        supported = seams.probePlatformSupport(platform) === true;
    } catch {
        supported = false;
    }
    if (!supported) return { outcome: LOCK_OUTCOMES.PRIVACY_UNPROVABLE };

    const prepared = prepareLockDirectory(seams);
    if (!prepared.ok) return { outcome: prepared.code };

    const key = rootKey(canonicalRoot);
    const lockPath = path.join(prepared.dir, key + '.lock');
    const record = buildRecord(seams, key);
    if (!record) return { outcome: LOCK_OUTCOMES.PRIVACY_UNPROVABLE };

    // ── Acquire: exclusive create, bounded wait, reclaim on positive proof only ──
    const deadline = seams.now() + WAIT_CEILING_MS;
    for (;;) {
        let acquired = false;
        try {
            writeRecordExclusive(seams, lockPath, record);
            acquired = true;
        } catch (error) {
            if (!error || error.code !== 'EEXIST') return { outcome: LOCK_OUTCOMES.UNAVAILABLE };
        }
        if (acquired) break;

        let rawText = null;
        try {
            rawText = seams.readFile(lockPath);
        } catch {
            return { outcome: LOCK_OUTCOMES.OWNERSHIP_UNVERIFIABLE, lockPath };
        }
        const inspected = inspectRecord(seams, key, rawText);
        if (inspected.state === 'unverifiable') {
            return { outcome: LOCK_OUTCOMES.OWNERSHIP_UNVERIFIABLE, lockPath };
        }
        if (tryReclaim(seams, lockPath, key, rawText)) continue;

        if (seams.now() >= deadline) return { outcome: LOCK_OUTCOMES.IN_PROGRESS, lockPath };
        await seams.sleep(POLL_INTERVAL_MS);
    }

    // ── Held ────────────────────────────────────────────────────────────────────
    let treeProven = true;
    let group = null;
    let tree = null;
    let monitoring = true;
    let monitorPromise = null;

    const writeCurrentRecord = () => {
        try {
            seams.writeOwnedFile(lockPath, JSON.stringify(record));
            return true;
        } catch {
            return false;
        }
    };

    const refreshTree = () => {
        if (!group) return false;
        let observed;
        try {
            observed = seams.captureTree(group, platform, tree);
        } catch {
            return false;
        }
        if (!observed || !observed.ok || !observed.tree) return false;
        tree = observed.tree;
        record.tree = tree;
        record.launching = false;
        return writeCurrentRecord();
    };

    const monitorTree = async () => {
        while (monitoring) {
            if (group) refreshTree();
            await seams.sleep(POLL_INTERVAL_MS);
        }
    };

    try {
        // Post-lock recheck: a peer may have repaired the tree while we waited.
        let complete = false;
        try {
            complete = (await recheck()) === true;
        } catch {
            complete = false;
        }
        if (complete) return { outcome: LOCK_OUTCOMES.REPAIRED_BY_PEER, lockPath };

        const publishGroup = (value) => {
            group = value || null;
            record.group = group;
            record.launching = false;
            refreshTree();
            writeCurrentRecord();
            if (!monitorPromise) monitorPromise = monitorTree();
        };

        record.launching = true;
        if (!writeCurrentRecord()) return { outcome: LOCK_OUTCOMES.UNAVAILABLE, lockPath };

        let result;
        try {
            result = (await run({ publishGroup })) || {};
        } catch {
            result = { outcome: LOCK_OUTCOMES.UNAVAILABLE };
        }
        if (result.group && !group) publishGroup(result.group);

        monitoring = false;
        if (monitorPromise) await monitorPromise;
        if (group) refreshTree();
        else {
            record.launching = false;
            writeCurrentRecord();
        }

        const proof = await proveTreeStopped(seams, group, tree, (nextTree) => {
            tree = nextTree;
            record.tree = nextTree;
            record.launching = false;
            return writeCurrentRecord();
        });
        treeProven = proof.proven;
        if (!treeProven) {
            // Retain the lock deliberately: a surviving manager descendant may still
            // be writing the install tree, and a later session must not start a
            // second one. No retry, no age-based reclaim.
            return {
                outcome: LOCK_OUTCOMES.RETAINED_CLEANUP_UNPROVEN,
                lockRetained: true,
                inner: result,
                lockPath
            };
        }
        return { outcome: result.outcome, inner: result, lockPath };
    } finally {
        monitoring = false;
        if (treeProven) releaseLock(seams, lockPath, record.token);
    }
}

module.exports = {
    LOCK_OUTCOMES,
    SUPPORTED_PLATFORMS,
    WAIT_CEILING_MS,
    POLL_INTERVAL_MS,
    CLEANUP_PROOF_MS,
    LOCK_DIR_MODE,
    LOCK_FILE_MODE,
    RECORD_VERSION,
    DEFAULT_SEAMS,
    createLockSeams,
    rootKey,
    lockChildName,
    prepareLockDirectory,
    buildRecord,
    parseRecord,
    inspectRecord,
    writeRecordExclusive,
    tryReclaim,
    proveTreeStopped,
    releaseLock,
    withProjectLock
};
