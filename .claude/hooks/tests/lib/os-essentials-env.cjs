'use strict';

/**
 * A scrubbed child environment that still starts and behaves on every supported OS.
 *
 * A test that wants "nothing from the developer machine" must still hand the child the keys the
 * operating system itself needs. On Windows a child without `SystemDrive`, `ProgramData` and the other
 * well-known folder variables resolves the registry paths that contain them literally, so a process that
 * touches the shell writes its cache files (`%SystemDrive%\ProgramData\Microsoft\Windows\Caches\*.db`)
 * under the child's working directory, which is the repository root when the test passes no `cwd`.
 *
 * `osEssentialsEnv` copies only the OS essentials from the base environment (names compared
 * case-insensitively on Windows, exactly elsewhere; a key the OS does not define is simply absent), then
 * applies the caller's overrides. Feature switches, provider keys and `CLAUDE_PROJECT_DIR` are never
 * copied; pass them in `overrides` when a case needs one. An `undefined` override removes the key.
 */

/** Upper-case names of the keys a child process needs from the OS. */
const OS_ESSENTIAL_ENV_KEYS = Object.freeze([
    'PATH', 'PATHEXT', 'SYSTEMROOT', 'WINDIR', 'COMSPEC',
    'SYSTEMDRIVE', 'PROGRAMDATA', 'ALLUSERSPROFILE', 'PUBLIC',
    'PROGRAMFILES', 'PROGRAMFILES(X86)', 'PROGRAMW6432',
    'COMMONPROGRAMFILES', 'COMMONPROGRAMFILES(X86)', 'COMMONPROGRAMW6432',
    'PROCESSOR_ARCHITECTURE', 'PROCESSOR_ARCHITEW6432', 'NUMBER_OF_PROCESSORS', 'OS',
    'LANG', 'LC_ALL', 'TZ'
]);

/**
 * @param {object} [overrides] keys to set, or to delete when the value is `undefined`
 * @param {object} [base] environment to copy the essentials from (defaults to `process.env`)
 * @param {string} [platform] host platform (defaults to `process.platform`); decides name matching
 * @returns {object} a fresh environment object
 */
function osEssentialsEnv(overrides = {}, base = process.env, platform = process.platform) {
    const windows = platform === 'win32';
    const same = (a, b) => (windows ? a.toUpperCase() === b.toUpperCase() : a === b);
    const env = {};
    for (const [name, value] of Object.entries(base || {})) {
        if (typeof value !== 'string') continue;
        if (OS_ESSENTIAL_ENV_KEYS.some(essential => same(name, essential))) env[name] = value;
    }
    for (const [key, value] of Object.entries(overrides || {})) {
        for (const existing of Object.keys(env)) {
            if (same(existing, key)) delete env[existing];
        }
        if (value !== undefined) env[key] = value;
    }
    return env;
}

module.exports = { OS_ESSENTIAL_ENV_KEYS, osEssentialsEnv };
