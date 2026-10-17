#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const { TextDecoder } = require('node:util');
const { LIMITS, REPORT_DETAIL_FORMS, trackingContext } = require('../../../hooks/lib/task-tracking-config.cjs');
const { fail } = require('../../../hooks/lib/task-tracking-files.cjs');
const { readProgress, readItem } = require('../../../hooks/lib/task-progress-reader.cjs');
const { executeOperation, operationCatalogue, validateRequest, sanitized, REQUEST_VERSION } = require('../../../hooks/lib/task-tracking.cjs');
const { resolveActor } = require('../../../hooks/lib/task-tracking-identity.cjs');
const { readConcerns } = require('../../../hooks/lib/task-tracking-concerns.cjs');
const { readPlacement } = require('../../../hooks/lib/task-tracking-placement.cjs');
const { resolveTrackingProfile } = require('../../../hooks/lib/task-tracking-profile.cjs');
const report = require('../../../hooks/lib/task-tracking-report.cjs');
const { ensurePackages } = require('../lib/package-setup.cjs');
const COMMANDS = Object.freeze(['help', 'identity', 'catalogue', 'concerns', 'placement', 'inspect', 'check', 'ready', 'apply', 'report', 'serve', 'link', 'unlink', 'checkpoint', 'migrate']);
// Answered from Node built-ins alone; every other command may read records and needs the declared packages.
const BUILT_IN_COMMANDS = Object.freeze(['help', 'identity']);
// Each of these ends a serving workspace through its one graceful shutdown.
const STOP_SIGNALS = Object.freeze(['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK']);
// The shape of a report's optional size budget: a positive whole number of bytes.
const SIZE_BUDGET = /^[1-9]\d*$/;

function help() {
    return { schemaVersion: 1, defaultPurpose: 'inspect', commands: [...COMMANDS],
        usage: { help: 'help (no root or scan)', catalogue: 'catalogue --root CHECKOUT',
            identity: 'identity --root CHECKOUT [--actor EXACT_CUSTOM_ID]; read-only selected actor discovery',
            concerns: 'concerns --root CHECKOUT [--ref LOCAL_REF]; JSON stdin {schemaVersion:1,itemIds:[exact IDs],paths:[public project-relative paths]}',
            placement: 'placement --root CHECKOUT [--ref LOCAL_REF]; JSON stdin {schemaVersion:1,itemId:EXACT_ID,kind,title,intent,text,openAreaIds:[exact area IDs]}; describe a record that is not saved yet with title, intent or text, or select one exact existing record with itemId; ranks the areas, initiatives, similar records and governing specs it may belong with, each with the words and the similar work that put it there, lists the areas that have no parent and the areas directly under each opened area, and changes nothing',
            inspect: 'inspect|check|ready --root CHECKOUT [--scope EXACT_ID] [--ref LOCAL_REF]; --scope names one exact area or initiative, and inspect and check then state that scope\'s members, delivery figures and health; the ready and excluded lists always cover the whole project, so --scope does not narrow ready; inspect alone also accepts --figures, which adds figures to the read: the delivery figures of every area and every initiative, each row equal to the read of that scope alone, or the reason they are withheld; inspect --root CHECKOUT --item EXACT_ID [--ref LOCAL_REF] reads one exact record in full: every record that carries the identity is returned, none is chosen between duplicates, an unknown identity is named as not found, and nothing changes',
            apply: `apply --root CHECKOUT [--actor MEMBER]; JSON stdin is one version ${REQUEST_VERSION} request and retains actor.memberId from identity/catalogue`,
            session: 'link|unlink|checkpoint --root CHECKOUT --session ACTUAL_SESSION [--actor MEMBER] --producer ACTUAL_PRODUCER',
            report: `report --root CHECKOUT [--scope EXACT_ID] [--ref LOCAL_REF] [--detail ${REPORT_DETAIL_FORMS.join('|')}] [--max-bytes BYTES] [--open]; with neither option the compact version (packed) is written, held to 15 MiB; --detail full writes the full version, --detail selects how much record detail the file carries and --max-bytes sets a size budget as a positive whole number of bytes`,
            migrate: 'migrate --root CHECKOUT [--dry-run | --abandon] [--backup-confirmed]; moves a project that stores the earlier vocabulary to the current one, or completes an unfinished migration, and never abandons one; --dry-run previews and changes nothing; a run starts only where the record root and the project configuration can be restored: in a Git checkout that tracks them with nothing uncommitted, or, where version control cannot restore them (no Git checkout, or record files or the configuration that Git ignores), with --backup-confirmed, which states that a backup you can restore exists; without it such a run is refused (NO_RESTORE_POINT), the preview says so beforehand, and a repeated run of an unfinished migration does not ask again; --abandon is the only way to abandon an unfinished migration: after the record root and the project configuration were restored from version control or a backup it checks that the earlier project is back whole and removes only the progress record (status abandoned), and otherwise changes nothing and names what is not back; needs no actor',
            serve: 'serve --root CHECKOUT [--actor MEMBER] [--write] [--open] [--terminal]; --open requests Google Chrome, else the default browser; --terminal runs the workspace in a terminal window of its own, which the person closes to stop it' },
        boundaries: ['Canonical apply.operation=link and session link/unlink are separate; canonical link saves every relationship that is not a tag as one whole list, keeps the stored area and initiative links and refuses a list that names either',
            'A placement read ranks candidates and selects nothing: a tag is saved with create or tag and every other link with link, on the one exact record the person asked to capture or change',
            'Manual proof requires --manual-proof; ordinary CLI cannot record test/review proof or unobserved activity',
            'Readiness uses --review; acceptance uses --accept with actual current proof and a separate decision',
            'Health uses --attest-health; eligible draft deletion uses --delete-draft and current preview',
            'Canceled or retired work is deleted entirely with --delete-item, an explicit reason and current preview; open, started or accepted work is canceled or retired first, and nothing cascades',
            'A transition with patch.correction=true, a reason and --change-state places work in any other state of its own lifecycle, such as canceled back to draft; delivery work still reaches done only by acceptance, and each state keeps the facts it requires',
            'An initiative is approved, committed, closed as done, canceled or reopened with --decide; closing, canceling and reopening also need a reason; an area is canceled with a reason alone; proof and acceptance do not apply to an initiative or an area, and automatic upkeep never changes the state of either',
            'Canonical apply.operation=tag is the only operation that changes area and initiative links: it replaces only those of the relation it names; the tag is saved on the tagged record and no record lists its members',
            'Reuse original request/operation identity on retry; inspection changes no work',
            'A project that stores the earlier vocabulary is read-only (MIGRATION_REQUIRED) until migrate is run explicitly; migration is never a side effect of a read or a save, and it is one-way: going back means restoring the record root and the project configuration from version control or a backup, so a run is refused (NO_RESTORE_POINT) where version control cannot restore them until a backup is confirmed with --backup-confirmed',
            'A project that still stores the first vocabulary is refused by name (UNSUPPORTED_VOCABULARY): upgrade it with a framework copy that supports that vocabulary, then migrate'] };
}

function argumentsFor(argv) {
    const [command, ...args] = argv;
    if (!COMMANDS.includes(command)) fail('INVALID_INPUT', `Use ${COMMANDS.join('|')}`);
    const values = {};
    const flags = new Set(['write', 'open', 'review', 'manual-proof', 'accept', 'attest-health', 'delete-draft', 'delete-item', 'change-state', 'decide', 'figures', 'terminal', 'dry-run', 'abandon', 'backup-confirmed']);
    const keys = new Set(['root', 'actor', 'scope', 'ref', 'session', 'producer', 'item', 'detail', 'max-bytes']);
    for (let n = 0; n < args.length; n++) {
        const key = args[n].startsWith('--') ? args[n].slice(2) : '';
        if (!key || Object.hasOwn(values, key) || (!flags.has(key) && !keys.has(key))) fail('INVALID_INPUT', 'Unknown, repeated, or positional option');
        if (flags.has(key)) values[key] = true;
        else { const value = args[++n]; if (!value || value.startsWith('--')) fail('INVALID_INPUT', 'Option needs a literal value'); values[key] = value; }
    }
    const readOptions = { help: [], identity: ['root', 'actor'], catalogue: ['root'], concerns: ['root', 'ref'], placement: ['root', 'ref'] }[command];
    if (readOptions && Object.keys(values).some(key => !readOptions.includes(key))) fail('INVALID_INPUT', 'This read command does not accept actor, permission, scope or session options');
    if (command === 'migrate' ? Object.keys(values).some(key => !['root', 'dry-run', 'abandon', 'backup-confirmed'].includes(key)) : values['dry-run'] || values.abandon || values['backup-confirmed']) fail('INVALID_INPUT', 'Only migrate accepts --dry-run, --abandon and --backup-confirmed, and migrate accepts no actor, permission, scope or session options');
    if (values['dry-run'] && values.abandon) fail('INVALID_INPUT', 'Choose one of --dry-run and --abandon: abandoning cannot be previewed, and it changes nothing unless the earlier project is back whole');
    if (values.item !== undefined && (command !== 'inspect' || values.scope !== undefined)) fail('INVALID_INPUT', 'Only inspect accepts --item; it reads one exact record and does not combine with --scope');
    if (values.figures && (command !== 'inspect' || values.item !== undefined)) fail('INVALID_INPUT', 'Only inspect accepts --figures; it adds the figures of every area and every initiative to a project or scope read and does not combine with --item');
    if (command !== 'report' && (values.detail !== undefined || values['max-bytes'] !== undefined)) fail('INVALID_INPUT', 'Only report accepts --detail and --max-bytes');
    // Refused here, before any package, record or report is touched.
    if (values.detail !== undefined && !REPORT_DETAIL_FORMS.includes(values.detail)) fail('INVALID_INPUT', `Detail form invalid: use ${REPORT_DETAIL_FORMS.join('|')}`);
    if (values['max-bytes'] !== undefined && !(SIZE_BUDGET.test(values['max-bytes']) && Number.isSafeInteger(Number(values['max-bytes'])))) fail('INVALID_INPUT', 'Size budget invalid: --max-bytes needs a positive whole number of bytes');
    if (command === 'help') return { command, values, root: null };
    if (!values.root) fail('INVALID_INPUT', 'Select one checkout with --root; no ambient root is used');
    return { command, values, root: fs.realpathSync(values.root) };
}

/** What the report writer is asked for: the selected source and scope as before, the detail form and size budget only when given. */
function reportOptions(values) {
    return { ref: values.ref, scopeId: values.scope, detail: values.detail, maxBytes: values['max-bytes'] === undefined ? undefined : Number(values['max-bytes']) };
}

async function input(stream) {
    const chunks = [];
    let size = 0;
    for await (const chunk of stream) {
        size += Buffer.byteLength(chunk);
        if (size > LIMITS.recordBytes) fail('LIMIT_EXCEEDED', 'Operation input exceeds the byte budget');
        chunks.push(Buffer.from(chunk));
    }
    try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))); }
    catch { fail('INVALID_INPUT', 'Provide one JSON operation on stdin'); }
}

/** A missing declared package is installed once here; a failed setup refuses with what to do by hand. */
async function requirePackages(command, setup = ensurePackages) {
    if (BUILT_IN_COMMANDS.includes(command)) return;
    const result = await setup();
    // Diagnostics stay off stdout, which carries exactly one result.
    if (result.status === 'installed') process.stderr.write(`${JSON.stringify({ status: 'setup', installed: result.packages })}\n`);
    if (result.status === 'unavailable') fail('PACKAGE_SETUP_FAILED', `${result.packages.length ? `Missing ${result.packages.join(', ')}` : 'Package setup unavailable'}: ${result.reason}. ${result.remedy}, then retry`);
}

/**
 * The argv a terminal window runs for `serve --terminal`: the same command without that flag, so the window serves
 * the workspace instead of asking for another window. An actor travels as an argument of its own.
 */
function terminalCommand(root, values, node = process.execPath, script = __filename) {
    return [node, script, 'serve', '--root', root, ...(values.actor ? ['--actor', values.actor] : []),
        ...(values.write ? ['--write'] : []), ...(values.open ? ['--open'] : [])];
}

async function run(argv, stdin = process.stdin) {
    const { command, values, root } = argumentsFor(argv);
    if (command === 'help') return help();
    await requirePackages(command);
    const context = trackingContext(root);
    if (command === 'identity') {
        const resolved = resolveActor(context, values.actor, { allowUnregisteredCustom: true });
        return sanitized({ schemaVersion: 1, actor: resolved.member.id, member: resolved.member, source: resolved.selection.source,
            root: context.root, unregistered: resolved.unregistered, grantsAuthority: false });
    }
    if (command === 'catalogue') {
        const profile = resolveTrackingProfile(context);
        return sanitized({ ...operationCatalogue(context.config), profile, applicable: profile.available,
            coverage: profile.available ? 'complete' : 'unavailable' });
    }
    if (command === 'concerns') return readConcerns(root, await input(stdin), { ...(values.ref !== undefined ? { ref: values.ref } : {}) });
    if (command === 'placement') return readPlacement(root, await input(stdin), { ...(values.ref !== undefined ? { ref: values.ref } : {}) });
    if (['inspect', 'check', 'ready'].includes(command)) {
        if (values.item !== undefined) return readItem(root, values.item, { ref: values.ref });
        const snapshot = readProgress(root, { scopeId: values.scope, ref: values.ref, ...(values.figures ? { figures: true } : {}) });
        return command === 'ready' ? { coverage: snapshot.coverage, ready: snapshot.ready, excluded: snapshot.excluded } : snapshot;
    }
    if (command === 'apply') {
        const request = await input(stdin);
        let selected;
        if (values.actor === undefined) { validateRequest(request); selected = resolveActor(context); }
        return executeOperation(request, { root, actor: selected?.member.id || values.actor, identity: selected?.selection, canWrite: true,
            canReview: !!values.review, canRecordManual: !!values['manual-proof'], canAccept: !!values.accept, canAttest: !!values['attest-health'], canDelete: !!values['delete-draft'], canDeleteEnded: !!values['delete-item'], canCorrectState: !!values['change-state'], canDecide: !!values.decide });
    }
    if (command === 'link' || command === 'unlink') {
        const { linkSession } = require('../../../hooks/lib/task-tracking-upkeep.cjs');
        const value = await input(stdin);
        if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !['itemIds', 'runId', 'occurrenceId'].includes(key))) fail('INVALID_INPUT', 'Link accepts exact itemIds and actual optional workflow context');
        return linkSession({ root, sessionId: values.session, actor: values.actor, producer: values.producer,
            itemIds: value.itemIds, runId: value.runId, occurrenceId: value.occurrenceId, unlink: command === 'unlink' });
    }
    if (command === 'checkpoint') {
        const { checkpoint } = require('../../../hooks/lib/task-tracking-upkeep.cjs');
        const value = await input(stdin);
        if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !['checkpointId', 'primary', 'observation', 'context'].includes(key))) fail('INVALID_INPUT', 'Checkpoint accepts actual primary, bounded observation and actual workflow context');
        return checkpoint({ root, sessionId: values.session, actor: values.actor, producer: values.producer, ...value });
    }
    if (command === 'migrate') return sanitized(await require('../../../hooks/lib/task-tracking-migration.cjs').migrate(root, { dryRun: !!values['dry-run'], abandon: !!values.abandon, backupConfirmed: !!values['backup-confirmed'] }));
    if (command === 'report') return values.open ? report.ensureAndOpenReport(root, reportOptions(values)) : report.ensureReport(root, reportOptions(values));
    if (command === 'serve') {
        if (values.terminal) {
            // The same command without this flag runs in a terminal window of its own; this process only asks for that window.
            // An actor is resolved here first, so an unusable identity is reported to the caller instead of to a closing window.
            if (values.write) resolveActor(context, values.actor);
            const { launchTerminal } = require('../lib/terminal-launch.cjs');
            return { status: 'terminal', root, writable: !!values.write, terminal: await launchTerminal(terminalCommand(root, values), root) };
        }
        const { startWorkspace } = require('../lib/workspace-server.cjs');
        if (!values.open) return startWorkspace({ root, actor: values.actor, writable: !!values.write });
        // The browser is handed a single-use launch link, now and whenever a page without a session asks for the workspace
        // to be opened again. The workspace keeps serving whatever the outcome is; its address is printed either way.
        const { launchBrowser } = require('../lib/browser-launch.cjs');
        const workspace = await startWorkspace({ root, actor: values.actor, writable: !!values.write, reopen: link => launchBrowser(link) });
        return { ...workspace, launch: await launchBrowser(workspace.launchLink()) };
    }
    fail('INVALID_INPUT', `Use ${COMMANDS.join('|')}`);
}

async function main() {
    try {
        const result = await run(process.argv.slice(2));
        if (result?.server) {
            let stopping;
            // Every way of ending the workspace takes the one shutdown, once: admitted work settles before the process ends.
            const stop = () => { stopping ||= result.close().then(() => { process.exitCode = 0; }).catch(error => {
                process.stderr.write(`${JSON.stringify(sanitized({ status: 'indeterminate', code: error.code || 'SHUTDOWN_FAILURE',
                    reason: error.code ? error.message : 'Workspace shutdown failed; inspect the original operation before retrying' }))}\n`);
                process.exitCode = 1;
            }); };
            // Closing the terminal window arrives as SIGHUP (on Windows too, for a closed console) and Ctrl+Break as SIGBREAK.
            // Unhandled, either ends the process at once, mid-write, and leaves the writer lock behind.
            // The handlers are in place before the address is announced, so a stop that follows the announcement at once is graceful.
            for (const signal of STOP_SIGNALS) process.once(signal, stop);
            process.stdout.write(`${JSON.stringify({ status: 'listening', url: result.url, root: result.root, writable: result.writable,
                ...(result.launch ? { launch: result.launch } : {}) })}\n`);
        } else {
            process.stdout.write(`${JSON.stringify(result)}\n`);
            if (result?.primary?.status === 'refused' || result?.coverage === 'unavailable') process.exitCode = 1;
            // A migration that did not finish, or did not start, is a failed command: a script must not carry on as if it had.
            // An abandoned migration is the outcome its own request asked for; a refused abandon answers as interrupted.
            if (result?.kind === 'migration' && ['refused', 'interrupted', 'failed'].includes(result.status)) process.exitCode = 1;
        }
    } catch (error) {
        // A refusal that knows which fields are at fault says so: an invalid configuration names each of them.
        process.stdout.write(`${JSON.stringify(sanitized({ status: 'refused', code: error.code || 'IO_FAILURE', reason: error.code ? error.message : 'Selected operation unavailable',
            ...(error.code && Array.isArray(error.details) && error.details.length ? { details: error.details.filter(detail => typeof detail === 'string').slice(0, 20) } : {}) }))}\n`);
        process.exitCode = 1;
    }
}

if (require.main === module) main();
module.exports = { argumentsFor, input, run, requirePackages, terminalCommand, reportOptions, STOP_SIGNALS };
