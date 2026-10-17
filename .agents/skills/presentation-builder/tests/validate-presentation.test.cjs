'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { findSlides, main, validatePresentation } = require('../scripts/validate-presentation.cjs');

function validDeck(slideCount = 7) {
  const slides = Array.from({ length: slideCount }, (_, index) => `
    <section class="slide" data-slide-id="slide-${index + 1}" data-purpose="explain" data-principle="This slide advances the story">
      <header><h2>Slide ${index + 1}</h2></header>
      <div class="slide-body"><p>The claim and supporting context.</p></div>
      <template class="slide-notes"><p><strong>Say:</strong> Explain the claim.</p><p><strong>Why:</strong> Connect it to the audience.</p><p><strong>Evidence:</strong> Source and caveat.</p><p><strong>Transition:</strong> Move to the next claim.</p><p><strong>Timing:</strong> 00:30. <strong>Question:</strong> What changes next?</p></template>
    </section>`).join('\n');

  return `<!doctype html>
<html lang="en"><head><meta name="presentation-id" content="fixture"><style>
  @media print { .controls { display: none; } }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
  button:focus-visible { outline: 3px solid currentColor; }
</style></head><body>
  <nav class="controls">
    <button aria-expanded="false" data-action="toggle-notes" aria-controls="notes-panel">Notes</button>
    <button aria-pressed="false" data-action="toggle-edit">Edit mode</button>
    <button data-action="previous">Previous</button><button data-action="next">Next</button>
    <button data-action="overview">All slides</button>
    <button data-action="reset">Reset</button><button data-action="export">Export</button>
  </nav>
  <aside id="notes-panel" role="dialog" aria-labelledby="notes-title"><h2 id="notes-title">Speaker notes</h2><button data-action="close-notes">Close</button><div id="notes-content" aria-live="polite"></div></aside>
  <div id="progress" aria-live="polite">Slide 1 of ${slideCount}</div><span id="print-note">Speaker notes are not included in print.</span>
  <img src="local-image.png" alt="A meaningful subject visual">
  <svg role="img" aria-label="A meaningful subject diagram"><title>Diagram</title><path d="M0 0" /></svg>
  <script>
    document.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === 'Home' || event.key === 'End') goToSlide(event.key);
      if (event.key === 'ArrowLeft' || event.key === 'PageUp' || event.key === ' ') goToSlide(event.key);
    });
    document.querySelector('[data-action="toggle-edit"]').setAttribute('aria-pressed', 'true');
    document.querySelector('.editable').setAttribute('contenteditable', 'true');
    localStorage.setItem('presentation-builder:deck:v1', 'draft');
    document.documentElement.requestFullscreen().catch(showError);
  </script>
  ${slides}
</body></html>`;
}

function ids(result) {
  return result.checks.filter((check) => !check.pass).map((check) => check.id);
}

const good = validatePresentation(validDeck(), { file: 'fixture.html' });
assert.equal(findSlides(validDeck()).length, 7);
assert.equal(good.ok, true, `valid fixture failed: ${good.errors.join('; ')}`);
assert.equal(good.slideCount, 7);
assert.equal(good.notesCount, 7);
assert.equal(good.warnings.some((warning) => warning.startsWith('overview:')), false);
assert.equal(validatePresentation(validDeck(1)).ok, true);

const missingNote = validDeck(2).replace(/<template class="slide-notes">[\s\S]*?<\/template>/, '');
const noteFailure = validatePresentation(missingNote);
assert.equal(noteFailure.ok, false);
assert.ok(ids(noteFailure).includes('notes-coverage'));

const missingNotesClose = validDeck(2).replace(/<button data-action="close-notes">Close<\/button>/, '');
const notesCloseFailure = validatePresentation(missingNotesClose);
assert.equal(notesCloseFailure.ok, false);
assert.ok(ids(notesCloseFailure).includes('notes-close'));

const missingPresentationId = validDeck(2).replace('<meta name="presentation-id" content="fixture">', '');
const identityFailure = validatePresentation(missingPresentationId);
assert.equal(identityFailure.ok, false);
assert.ok(ids(identityFailure).includes('stable-presentation-id'));

const externalAsset = validDeck(2).replace('src="local-image.png"', 'src="https://cdn.example.test/image.png"');
const externalAssetFailure = validatePresentation(externalAsset);
assert.equal(externalAssetFailure.ok, false);
assert.ok(ids(externalAssetFailure).includes('asset-policy'));

const unquotedExternalAsset = externalAsset.replace('src="https://cdn.example.test/image.png"', 'src=https://cdn.example.test/image.png');
const unquotedExternalAssetFailure = validatePresentation(unquotedExternalAsset);
assert.equal(unquotedExternalAssetFailure.ok, false);
assert.ok(ids(unquotedExternalAssetFailure).includes('asset-policy'));

const allowedExternalAsset = externalAsset.replace('<meta name="presentation-id" content="fixture">', '<meta name="presentation-id" content="fixture"><meta name="presentation-asset-policy" content="external-allowed">');
const allowedExternalAssetResult = validatePresentation(allowedExternalAsset);
assert.equal(allowedExternalAssetResult.checks.find((check) => check.id === 'asset-policy').pass, true);

const missingRuntime = validDeck(2)
  .replace(/<button aria-expanded="false" data-action="toggle-notes" aria-controls="notes-panel">Notes<\/button>/, '')
  .replace(/<button aria-pressed="false" data-action="toggle-edit">Edit mode<\/button>/, '')
  .replace(/localStorage\.setItem\([^;]+;/, '')
  .replace(/prefers-reduced-motion: reduce/, 'motion-disabled');
const runtimeFailure = validatePresentation(missingRuntime);
assert.equal(runtimeFailure.ok, false);
assert.ok(ids(runtimeFailure).includes('notes-toggle'));
assert.ok(ids(runtimeFailure).includes('edit-mode'));
assert.ok(ids(runtimeFailure).includes('draft-persistence'));
assert.ok(ids(runtimeFailure).includes('reduced-motion'));

// ---------------------------------------------------------------------------
// Conformance profiles (presenter default, review for read-only review decks).
// ---------------------------------------------------------------------------

// The five editing checks the review profile may treat as advisory. Written as a
// literal on purpose: the test pins the contract, it does not read it back from the script.
const EDITING_CHECKS = ['draft-persistence', 'edit-mode', 'edit-state', 'export', 'reset'];

function failingErrorIds(result) {
  return result.checks.filter((check) => !check.pass && check.level === 'error').map((check) => check.id).sort();
}

function checkById(result, id) {
  return result.checks.find((check) => check.id === id);
}

function replaceSlideNotes(html, slideIdValue, replacement) {
  const pattern = new RegExp(`(data-slide-id="${slideIdValue}"[\\s\\S]*?)<template class="slide-notes">[\\s\\S]*?<\\/template>`);
  const next = html.replace(pattern, `$1${replacement}`);
  assert.notEqual(next, html, `fixture setup: notes of ${slideIdValue} were not found`);
  return next;
}

function captureMain(argv) {
  const stdout = [];
  const stderr = [];
  const { log, error } = console;
  console.log = (...parts) => stdout.push(parts.join(' '));
  console.error = (...parts) => stderr.push(parts.join(' '));
  try {
    return { code: main(argv), stdout: stdout.join('\n'), stderr: stderr.join('\n') };
  } finally {
    console.log = log;
    console.error = error;
  }
}

// TC-PD-001 — business intent: existing decks keep their verdict; naming no profile
// is the presenter profile and never loosens the default (BR-PD-02).
{
  const conforming = validDeck(2);
  const failsOnlyDraftSaving = conforming.replace(/localStorage\.setItem\([^;]+;/, '');
  const failsOnlyPrint = conforming.replace('@media print', '@media screen');
  for (const [name, html] of [['conforming', conforming], ['draft-saving', failsOnlyDraftSaving], ['print', failsOnlyPrint]]) {
    // Given a deck; When checked with no profile and against presenter; Then the verdicts are identical.
    const implicit = validatePresentation(html, { file: 'fixture.html' });
    const explicit = validatePresentation(html, { file: 'fixture.html', profile: 'presenter' });
    assert.deepEqual(implicit, explicit, `TC-PD-001: ${name} deck verdict differs between no profile and presenter`);
  }
  assert.equal(validatePresentation(conforming).ok, true, 'TC-PD-001: the conforming deck must pass by default');
  const draftDefault = validatePresentation(failsOnlyDraftSaving);
  assert.equal(draftDefault.ok, false, 'TC-PD-001: missing draft saving must fail when no profile is named');
  assert.deepEqual(failingErrorIds(draftDefault), ['draft-persistence']);
  assert.ok(draftDefault.errors.some((error) => error.startsWith('draft-persistence:')));
  assert.deepEqual(failingErrorIds(validatePresentation(failsOnlyPrint)), ['print']);
  // Boundary: this is exactly the input where the profiles differ.
  assert.equal(validatePresentation(failsOnlyDraftSaving, { profile: 'review' }).ok, true);
}

// TC-PD-002 — business intent: a review deck is not forced to carry editing, and
// nothing else is relaxed; the review profile demotes exactly the five editing checks (BR-PD-03).
{
  // Given a conforming deck without editing implementation, draft saving, reset and export,
  // that keeps an editing control announcing no state (so edit-state is exercised, not skipped).
  const noEditing = validDeck(2)
    .replace('<button aria-pressed="false" data-action="toggle-edit">', '<button data-action="toggle-edit">')
    .replace(/document\.querySelector\('\[data-action="toggle-edit"\]'\)[^;]+;/, '')
    .replace(/document\.querySelector\('\.editable'\)[^;]+;/, '')
    .replace(/localStorage\.setItem\([^;]+;/, '')
    .replace('<button data-action="reset">Reset</button><button data-action="export">Export</button>', '');
  // When checked against presenter and against review.
  const presenter = validatePresentation(noEditing, { profile: 'presenter' });
  const review = validatePresentation(noEditing, { profile: 'review' });
  // Then presenter fails on exactly the five editing checks.
  assert.equal(presenter.ok, false);
  assert.deepEqual(failingErrorIds(presenter), EDITING_CHECKS, 'TC-PD-002: presenter must fail on exactly the editing checks');
  // And the checks error under presenter but advisory under review are exactly the five.
  const demoted = presenter.checks
    .filter((check) => check.level === 'error' && checkById(review, check.id).level === 'warning')
    .map((check) => check.id)
    .sort();
  assert.deepEqual(demoted, EDITING_CHECKS, 'TC-PD-002: review must demote exactly the five editing checks');
  // And review passes, listing each missing editing feature as advisory.
  assert.equal(review.ok, true, `TC-PD-002: review failed: ${review.errors.join('; ')}`);
  for (const id of EDITING_CHECKS) {
    assert.ok(review.warnings.some((warning) => warning.startsWith(`${id}:`)), `TC-PD-002: ${id} missing from review advisories`);
  }
  // And each advisory names what is missing — it never repeats the wording of the same check passing,
  // so a reader skimming advisories cannot mistake a missing feature for a present one.
  // (compared with presenter, whose passing records carry no profile suffix)
  const passing = validatePresentation(validDeck(2), { profile: 'presenter' });
  for (const id of EDITING_CHECKS) {
    assert.equal(checkById(passing, id).pass, true, `fixture setup: ${id} must pass on the conforming deck`);
    const details = checkById(review, id).details;
    assert.ok(details.endsWith(' (advisory under the review profile)'), `TC-PD-002: ${id} advisory does not say it is advisory: ${details}`);
    const advisory = details.slice(0, -' (advisory under the review profile)'.length);
    assert.notEqual(advisory, checkById(passing, id).details, `TC-PD-002: ${id} advisory reads like a pass: ${advisory}`);
  }
  // Edge: no editing control at all → edit-state has nothing to judge and passes in both profiles,
  // and says so rather than asking for a state the deck does not need; the same holds for notes.
  const noToggle = noEditing.replace('<button data-action="toggle-edit">Edit mode</button>', '');
  const noNotesToggle = validDeck(2).replace('<button aria-expanded="false" data-action="toggle-notes" aria-controls="notes-panel">Notes</button>', '');
  assert.notEqual(noNotesToggle, validDeck(2), 'fixture setup: notes toggle was not removed');
  for (const profile of ['presenter', 'review']) {
    const editState = checkById(validatePresentation(noToggle, { profile }), 'edit-state');
    assert.equal(editState.pass, true);
    assert.doesNotMatch(editState.details, /needs/, `TC-PD-002: a passing edit-state must not ask for a state: ${editState.details}`);
    const notesState = checkById(validatePresentation(noNotesToggle, { profile }), 'notes-state');
    assert.equal(notesState.pass, true);
    assert.doesNotMatch(notesState.details, /needs/, `TC-PD-002: a passing notes-state must not ask for a state: ${notesState.details}`);
  }
}

// TC-PD-003 — business intent: every deck can be presented by someone else; missing or
// blank notes fail in every profile and name the slide (BR-PD-04).
{
  // Given decks whose slide has no notes, blank notes, or notes too brief to present from
  const missing = replaceSlideNotes(validDeck(3), 'slide-2', '');
  const blank = replaceSlideNotes(validDeck(3), 'slide-3', '<template class="slide-notes">   <p> </p><strong></strong>&nbsp; </template>');
  const brief = replaceSlideNotes(validDeck(3), 'slide-2', '<template class="slide-notes"><p>Say hi.</p></template>');
  for (const profile of ['presenter', 'review']) {
    for (const [html, slide] of [[missing, 'slide-2'], [blank, 'slide-3']]) {
      // When each is checked against the profile
      const result = validatePresentation(html, { profile });
      // Then it fails on notes coverage and the verdict names the slide
      assert.equal(result.ok, false, `TC-PD-003: ${profile} passed a deck whose ${slide} has no real notes`);
      assert.equal(checkById(result, 'notes-coverage').level, 'error');
      assert.ok(result.errors.some((error) => error.startsWith('notes-coverage:') && error.includes(slide)), `TC-PD-003: ${profile} verdict does not name ${slide}`);
    }
    // Edge: notes under 40 characters fail as too brief in both profiles.
    const briefResult = validatePresentation(brief, { profile });
    assert.equal(briefResult.ok, false);
    assert.ok(briefResult.errors.some((error) => error.startsWith('notes-depth:') && error.includes('slide-2')));
  }
}

// TC-PD-004 — business intent: the review profile relaxes editing only; every other
// check keeps its presenter weight (BR-PD-03 property over non-editing checks).
{
  const mutations = [
    ['print', (html) => html.replace('@media print', '@media screen')],
    ['live-status', (html) => html.replace(/aria-live="polite"/g, 'data-live="polite"')],
    ['document-lang', (html) => html.replace('<html lang="en">', '<html>')],
    ['reduced-motion', (html) => html.replace(/prefers-reduced-motion: reduce/, 'motion-disabled')],
  ];
  const passing = validatePresentation(validDeck(2), { profile: 'presenter' });
  for (const [id, mutate] of mutations) {
    // Given a deck failing only one non-editing check; When checked against review; Then it fails on that check.
    const html = mutate(validDeck(2));
    assert.notEqual(html, validDeck(2), `fixture setup: ${id} mutation changed nothing`);
    const presenter = validatePresentation(html, { profile: 'presenter' });
    const review = validatePresentation(html, { profile: 'review' });
    assert.deepEqual(failingErrorIds(presenter), [id], `TC-PD-004: fixture must fail only ${id}`);
    assert.equal(review.ok, false, `TC-PD-004: review passed a deck failing ${id}`);
    assert.deepEqual(failingErrorIds(review), [id], `TC-PD-004: review must error on ${id} exactly as presenter does`);
    // And the failure names what is missing — never the wording of the same check passing.
    assert.notEqual(checkById(review, id).details, checkById(passing, id).details, `TC-PD-004: ${id} failure reads like a pass: ${checkById(review, id).details}`);
  }

  // Overview is an error only on decks longer than six slides, so it is exercised on a 7-slide deck:
  // Given a long deck whose only defect is a missing overview/jump control
  const longDeck = validDeck(7);
  const noOverview = longDeck.replace('<button data-action="overview">All slides</button>', '');
  assert.notEqual(noOverview, longDeck, 'fixture setup: overview control was not removed');
  // When checked against presenter and against review
  const presenterLong = validatePresentation(noOverview, { profile: 'presenter' });
  const reviewLong = validatePresentation(noOverview, { profile: 'review' });
  // Then presenter fails only overview, and review errors on overview exactly as presenter does
  assert.deepEqual(failingErrorIds(presenterLong), ['overview'], 'TC-PD-004: long-deck fixture must fail only overview');
  assert.equal(reviewLong.ok, false, 'TC-PD-004: review passed a long deck with no overview control');
  assert.deepEqual(failingErrorIds(reviewLong), ['overview'], 'TC-PD-004: review must error on overview exactly as presenter does');
  assert.ok(reviewLong.errors.some((error) => error.startsWith('overview:')), 'TC-PD-004: review verdict must list the overview error');
}

// TC-PD-005 — business intent: a typo never yields a silently wrong verdict; only the
// exact names presenter and review produce one (BR-PD-01).
{
  // Given profile names that are not exactly presenter or review
  // When a deck is checked with each, through the API and through the CLI
  // Then each is refused without a verdict; only the exact names are accepted
  for (const name of ['draft', 'Review', '']) {
    assert.throws(() => validatePresentation(validDeck(2), { profile: name }), /presenter.*review/, `TC-PD-005: profile "${name}" must be refused`);
  }
  for (const name of ['presenter', 'review']) {
    assert.equal(validatePresentation(validDeck(2), { profile: name }).profile, name);
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-presentation-'));
  try {
    const fixture = path.join(tempDir, 'deck.html');
    fs.writeFileSync(fixture, validDeck(2), 'utf8');

    for (const argv of [[fixture, '--profile=draft'], [fixture, '--profile=Review'], [fixture, '--profile='], [fixture, '--profile', 'review']]) {
      const run = captureMain(argv);
      assert.equal(run.code, 2, `TC-PD-005: ${argv.slice(1).join(' ')} must exit 2`);
      assert.equal(run.stdout, '', 'TC-PD-005: a refused profile must produce no verdict');
      assert.ok(run.stderr.includes('presenter') && run.stderr.includes('review'), `TC-PD-005: stderr must name both profiles: ${run.stderr}`);
    }
    // The profile is judged before the file is read: an unknown name on an unreadable path is still a profile error.
    const beforeRead = captureMain([path.join(tempDir, 'missing.html'), '--profile=draft']);
    assert.equal(beforeRead.code, 2);
    assert.ok(beforeRead.stderr.includes('Unknown profile'), `TC-PD-005: profile must be validated before reading: ${beforeRead.stderr}`);

    const accepted = captureMain([fixture, '--profile=review']);
    assert.equal(accepted.code, 0, `TC-PD-005: --profile=review must produce a passing verdict: ${accepted.stderr}`);

    // A failing deck blocks: Given a deck failing one non-editing check, When the CLI runs it with
    // --profile=review and with no profile, Then it exits 1 and prints a FAIL verdict naming the check.
    const failing = path.join(tempDir, 'failing-deck.html');
    fs.writeFileSync(failing, validDeck(2).replace('<html lang="en">', '<html>'), 'utf8');
    for (const [label, argv] of [['--profile=review', [failing, '--profile=review']], ['no profile', [failing]]]) {
      const run = captureMain(argv);
      assert.equal(run.code, 1, `TC-PD-005: a failing deck must exit 1 with ${label}`);
      assert.ok(run.stdout.split('\n')[0].startsWith('FAIL '), `TC-PD-005: ${label} must print a FAIL verdict: ${run.stdout}`);
      assert.ok(run.stdout.includes('document-lang:'), `TC-PD-005: ${label} verdict must name the failing check: ${run.stdout}`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// TC-PD-006 — business intent: every verdict states the standard it was judged against,
// so a review pass is never mistaken for a presenter pass (BR-PD-01).
{
  // Given the conforming fixture deck
  // When it is checked against review, and again with no profile named
  // Then the first verdict states review and the second states presenter, in the API, human and JSON outputs
  assert.equal(validatePresentation(validDeck(2), { profile: 'review' }).profile, 'review');
  assert.equal(validatePresentation(validDeck(2)).profile, 'presenter');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-presentation-'));
  try {
    const fixture = path.join(tempDir, 'deck.html');
    fs.writeFileSync(fixture, validDeck(2), 'utf8');
    assert.ok(captureMain([fixture, '--profile=review']).stdout.split('\n')[0].includes('(profile: review)'));
    assert.ok(captureMain([fixture]).stdout.split('\n')[0].includes('(profile: presenter)'));
    assert.equal(JSON.parse(captureMain([fixture, '--json', '--profile=review']).stdout).profile, 'review');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// TC-PD-009 (validator part) — business intent: a deck opens with its intended look
// without a network unless it declares outside assets allowed (BR-PD-06).
{
  // Given a deck that loads an outside font, with and without an external-allowed asset policy
  // When each is checked against both profiles
  // Then the undeclared font fails asset-policy as an error, and the declared one passes it
  const outsideFont = validDeck(2).replace('</head>', '<link rel="stylesheet" href="https://fonts.example.test/x.css"></head>');
  const declared = outsideFont.replace('<meta name="presentation-id" content="fixture">', '<meta name="presentation-id" content="fixture"><meta name="presentation-asset-policy" content="external-allowed">');
  for (const profile of ['presenter', 'review']) {
    const undeclaredResult = validatePresentation(outsideFont, { profile });
    assert.equal(undeclaredResult.ok, false, `TC-PD-009: ${profile} passed an undeclared outside font`);
    assert.equal(checkById(undeclaredResult, 'asset-policy').pass, false);
    assert.equal(checkById(undeclaredResult, 'asset-policy').level, 'error');
    assert.equal(checkById(validatePresentation(declared, { profile }), 'asset-policy').pass, true, `TC-PD-009: ${profile} rejected a declared outside font`);
  }
}

// TC-PD-010 (validator part) — business intent: every slide keeps a unique identity so
// exports and edits never lose or merge a slide (BR-PD-07).
{
  // Given decks with a missing slide identity and with a duplicated one
  // When each is checked against both profiles
  // Then both fail stable-slide-ids as an error
  const missingId = validDeck(3).replace('data-slide-id="slide-2" ', '');
  const duplicateId = validDeck(3).replace('data-slide-id="slide-2"', 'data-slide-id="slide-1"');
  assert.notEqual(missingId, validDeck(3), 'fixture setup: slide id was not removed');
  for (const profile of ['presenter', 'review']) {
    for (const [name, html] of [['missing', missingId], ['duplicate', duplicateId]]) {
      const result = validatePresentation(html, { profile });
      assert.equal(result.ok, false, `TC-PD-010: ${profile} passed a deck with a ${name} slide identity`);
      assert.equal(checkById(result, 'stable-slide-ids').pass, false);
      assert.equal(checkById(result, 'stable-slide-ids').level, 'error');
    }
  }
}

// TC-PD-006 (verdict text follows its profile) — business intent: a review verdict never sends the
// reader to editing steps or draft reasons its profile does not require, and a presenter verdict
// keeps its full live-delivery wording (BR-PD-01, BR-PD-03).
{
  // Given a conforming deck, and the same deck without its root presentation identity
  const conforming = validDeck(2);
  const noIdentity = conforming.replace('<meta name="presentation-id" content="fixture">', '');
  assert.notEqual(noIdentity, conforming, 'fixture setup: presentation identity was not removed');

  // When each is checked against presenter and against review
  const presenter = validatePresentation(conforming, { profile: 'presenter' });
  const review = validatePresentation(conforming, { profile: 'review' });
  const presenterNoId = validatePresentation(noIdentity, { profile: 'presenter' });
  const reviewNoId = validatePresentation(noIdentity, { profile: 'review' });

  // Then the review browser steps leave out edit mode, drafts, reset and export
  const reviewSteps = review.manualVerification.join('\n');
  for (const step of [/edit/i, /draft/i, /reset/i, /export/i]) {
    assert.doesNotMatch(reviewSteps, step, `TC-PD-006: review manual verification still asks for ${step}`);
  }
  assert.match(reviewSteps, /navigation route/, 'TC-PD-006: review keeps the navigation walk');
  assert.match(reviewSteps, /notes/i, 'TC-PD-006: review keeps the notes check');
  // And the presenter browser steps keep the full editing walk
  assert.deepEqual(presenter.manualVerification, [
    'Open the deck in a browser and exercise every navigation route.',
    'Toggle notes and edit mode; edit a slide and its notes; reload; reset; export and reopen the clean file.',
    'Verify fullscreen rejection, focus order, screen-reader names, print, reduced motion, narrow viewport, asset failures, and console errors.',
  ]);
  assert.deepEqual(validatePresentation(conforming).manualVerification, presenter.manualVerification, 'TC-PD-006: no profile keeps presenter steps');

  // And a missing identity fails in both profiles, with a reason that fits each
  for (const result of [presenterNoId, reviewNoId]) {
    assert.equal(result.ok, false);
    assert.equal(checkById(result, 'stable-presentation-id').level, 'error');
  }
  const presenterReason = presenterNoId.errors.find((error) => error.startsWith('stable-presentation-id:'));
  const reviewReason = reviewNoId.errors.find((error) => error.startsWith('stable-presentation-id:'));
  assert.equal(presenterReason, 'stable-presentation-id: the root presentation identity is required for draft persistence');
  assert.doesNotMatch(reviewReason, /draft/i, 'TC-PD-006: review identity failure must not cite draft persistence');
  assert.match(reviewReason, /re-checks and exports/, `TC-PD-006: review identity failure must state why review needs it: ${reviewReason}`);
}

console.log('validate-presentation tests passed');
