'use strict';

/**
 * Static quality gate for self-contained HTML presentations.
 *
 * This intentionally uses small, dependency-free heuristics rather than a
 * browser DOM. It validates the contract that can be proven from source and
 * reports browser-only behavior as a manual verification responsibility.
 */

const fs = require('fs');
const path = require('path');

// Conformance profiles. `presenter` (the default) demands the full live-delivery
// contract; `review` is for read-only review decks and treats the editing
// features below as advisory. Every other check keeps the same level in both.
// The demoted set is defined by the governing spec rule (BR-PD-03 of the
// Presentation Decks spec) and mirrored here and in the runtime contract §9;
// change it in that rule first, never with a local edit here.
const PROFILES = ['presenter', 'review'];
const DEFAULT_PROFILE = 'presenter';
const REVIEW_OPTIONAL = new Set(['edit-mode', 'edit-state', 'draft-persistence', 'reset', 'export']);
const USAGE = 'Usage: node validate-presentation.cjs <deck.html> [--json] [--profile=presenter|review]';

function assertProfile(profile) {
  if (!PROFILES.includes(profile)) {
    throw new Error(`Unknown profile "${profile}"; use presenter or review`);
  }
  return profile;
}

function levelFor(id, level, profile) {
  return profile === 'review' && level === 'error' && REVIEW_OPTIONAL.has(id) ? 'warning' : level;
}

// Browser steps a static check cannot prove. Review decks carry no editing, so their
// list leaves out the edit, draft, reset and export steps.
function manualVerificationFor(profile) {
  return [
    'Open the deck in a browser and exercise every navigation route.',
    profile === 'review'
      ? 'Toggle notes open and closed on several slides; confirm each panel shows the notes of its own slide.'
      : 'Toggle notes and edit mode; edit a slide and its notes; reload; reset; export and reopen the clean file.',
    'Verify fullscreen rejection, focus order, screen-reader names, print, reduced motion, narrow viewport, asset failures, and console errors.',
  ];
}

function collectMatches(pattern, source) {
  return Array.from(source.matchAll(pattern));
}

function classHasToken(tag, token) {
  const match = tag.match(/\bclass\s*=\s*(["'])(.*?)\1/i);
  return Boolean(match && match[2].split(/\s+/).includes(token));
}

function hasAny(source, patterns) {
  return patterns.some((pattern) => pattern.test(source));
}

function stripMarkup(source) {
  return source
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findSlides(html) {
  const slides = [];
  const openingTags = collectMatches(/<(section|article)\b[^>]*>/gi, html);

  for (const match of openingTags) {
    const openingTag = match[0];
    const elementName = match[1];
    const isSlide = classHasToken(openingTag, 'slide') ||
      /\bdata-slide(?:-id)?(?:\s*=|\b)/i.test(openingTag);
    if (!isSlide) continue;

    const contentStart = (match.index || 0) + openingTag.length;
    const closingTag = new RegExp(`</${elementName}\\s*>`, 'i').exec(html.slice(contentStart));
    if (!closingTag) continue;

    const end = contentStart + closingTag.index + closingTag[0].length;
    slides.push({
      html: html.slice(match.index || 0, end),
      openingTag,
      index: slides.length + 1,
    });
  }

  return slides;
}

function slideId(slide) {
  const match = slide.openingTag.match(/\bdata-slide-id\s*=\s*(["'])(.*?)\1/i);
  return match ? match[2] : `slide-${slide.index}`;
}

function hasSlideTitle(slideHtml) {
  return /<h[1-6]\b/i.test(slideHtml) || /\bdata-slide-title(?:\s*=|\b)/i.test(slideHtml);
}

function hasSlidePurpose(slide) {
  return /\bdata-(?:purpose|principle)\s*=\s*(["'])[^"']+\1/i.test(slide.openingTag);
}

function noteSourceText(slideHtml) {
  const patterns = [
    /<template\b[^>]*class\s*=\s*(["'])[^"']*(?:slide-notes|note-src)[^"']*\1[^>]*>([\s\S]*?)<\/template>/i,
    /<(?:aside|div)\b[^>]*(?:data-notes|data-speaker-notes)(?:\s*=\s*(?:["'][^"']*["']|[^\s>]+))?[^>]*>([\s\S]*?)<\/(?:aside|div)>/i,
  ];

  for (const pattern of patterns) {
    const match = slideHtml.match(pattern);
    if (match) {
      const body = match[match.length - 1];
      return stripMarkup(body);
    }
  }
  return '';
}

function attributeValue(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  return match ? match[2] : '';
}

function hasPresentationId(html) {
  if (/<html\b[^>]*\bdata-presentation-id\s*=\s*(["'])[^"']+\1/i.test(html)) return true;
  return collectMatches(/<meta\b[^>]*>/gi, html).some((match) => {
    const tag = match[0];
    return attributeValue(tag, 'name').toLowerCase() === 'presentation-id' && attributeValue(tag, 'content').trim() !== '';
  });
}

function hasExternalAssetUrls(html) {
  return /<(?:img|audio|video|source|track|iframe|object|embed|image|use|link)\b[^>]*\b(?:src|poster|href)\s*=\s*(["']?)(?:https?:)?\/\//i.test(html) ||
    /\burl\(\s*(["']?)(?:https?:)?\/\//i.test(html);
}

function hasExternalAssetPolicy(html) {
  return collectMatches(/<meta\b[^>]*>/gi, html).some((match) => {
    const tag = match[0];
    return attributeValue(tag, 'name').toLowerCase() === 'presentation-asset-policy' &&
      attributeValue(tag, 'content').toLowerCase() === 'external-allowed';
  });
}

function controlMatches(tag, action, aliases) {
  const dataAction = attributeValue(tag, 'data-action');
  const id = attributeValue(tag, 'id');
  return dataAction.split(/\s+/).includes(action) || aliases.includes(id);
}

function controlTags(html) {
  return collectMatches(/<(?:button|a)\b[^>]*>/gi, html).map((match) => match[0]);
}

function hasActionControl(html, action, aliases = []) {
  return controlTags(html).some((tag) => controlMatches(tag, action, aliases));
}

function controlHasState(html, action, aliases = []) {
  return controlTags(html).some((tag) => controlMatches(tag, action, aliases) && /\baria-(?:pressed|expanded)\s*=\s*/i.test(tag));
}

function hasNotesPanel(html) {
  return hasAny(html, [
    /\bid\s*=\s*(["'])(?:notes-panel|notes|ntext)\1/i,
    /\bdata-notes-panel(?:\s*=|\b)/i,
  ]);
}

function hasEditImplementation(html) {
  return hasAny(html, [
    /\bcontenteditable\b/i,
    /\bdesignMode\b/i,
    /\bdata-editable\b/i,
    /\bsetAttribute\s*\(\s*(["'])contenteditable\1/i,
  ]);
}

function hasKeyboardNavigation(html) {
  const keyListener = /(?:addEventListener\s*\(\s*(["'])(?:keydown|keyup|keypress)\1|on(?:keydown|keyup|keypress)\s*=)/i.test(html);
  const navigationKeys = /Arrow(?:Left|Right|Up|Down)|Page(?:Up|Down)|Home|End/i.test(html);
  return keyListener && navigationKeys;
}

function accessibleVisualProblems(html) {
  const problems = [];
  for (const match of collectMatches(/<img\b[^>]*>/gi, html)) {
    const tag = match[0];
    if (!/\balt\s*=|\baria-label\s*=|\baria-hidden\s*=\s*(["'])true\1|\brole\s*=\s*(["'])(?:presentation|none)\2/i.test(tag)) {
      problems.push('an <img> has no alt text or explicit decorative/label semantics');
    }
  }
  for (const match of collectMatches(/<svg\b[^>]*>/gi, html)) {
    const tag = match[0];
    const start = match.index || 0;
    const closing = /<\/svg\s*>/i.exec(html.slice(start + tag.length));
    const svg = closing
      ? html.slice(start, start + tag.length + closing.index + closing[0].length)
      : tag;
    const labelled = /\baria-label\s*=|<title\b|\baria-hidden\s*=\s*(["'])true\1|\brole\s*=\s*(["'])(?:presentation|none)\2/i.test(svg);
    if (!labelled) problems.push('an <svg> has no accessible label/title or explicit decorative semantics');
  }
  return problems;
}

function validatePresentation(html, options = {}) {
  if (typeof html !== 'string') throw new TypeError('html must be a string');
  const profile = assertProfile(options.profile === undefined ? DEFAULT_PROFILE : options.profile);

  const errors = [];
  const warnings = [];
  const checks = [];
  const addCheck = (id, pass, requiredLevel, requiredDetails) => {
    const level = levelFor(id, requiredLevel, profile);
    const details = level === requiredLevel ? requiredDetails : `${requiredDetails} (advisory under the ${profile} profile)`;
    checks.push({ id, pass, level, details });
    if (!pass) (level === 'error' ? errors : warnings).push(`${id}: ${details}`);
  };

  const slides = findSlides(html);
  const notes = slides.map((slide) => noteSourceText(slide.html));
  const missingTitles = slides.filter((slide) => !hasSlideTitle(slide.html)).map(slideId);
  const missingPurposes = slides.filter((slide) => !hasSlidePurpose(slide)).map(slideId);
  const missingNotes = slides.filter((slide, index) => notes[index].length === 0).map(slideId);
  const shallowNotes = slides.filter((slide, index) => notes[index].length > 0 && notes[index].length < 40).map(slideId);
  const missingIds = slides.filter((slide) => !/\bdata-slide-id\s*=\s*(["'])[^"']+\1/i.test(slide.openingTag)).map(slideId);
  const ids = slides.map(slideId);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index).filter((id, index, all) => all.indexOf(id) === index);

  const hasLang = /<html\b[^>]*\blang\s*=\s*(["'])[^"']+\1/i.test(html);
  addCheck('document-lang', hasLang, 'error', hasLang ? 'the root <html> element has a language' : 'the root <html> element needs a lang attribute');
  addCheck('slide-count', slides.length >= 1, 'error', 'found ' + slides.length + '; at least one slide is required');
  const identityReason = profile === 'review'
    ? 'the root presentation identity is required; it identifies the deck across re-checks and exports'
    : 'the root presentation identity is required for draft persistence';
  addCheck('stable-presentation-id', hasPresentationId(html), 'error', hasPresentationId(html) ? 'the presentation exposes a stable root identity' : identityReason);
  addCheck('stable-slide-ids', missingIds.length === 0 && duplicateIds.length === 0, 'error', missingIds.length || duplicateIds.length ? `missing IDs in ${missingIds.join(', ') || 'none'}; duplicates: ${duplicateIds.join(', ') || 'none'}` : 'every slide has a unique data-slide-id');
  addCheck('slide-titles', missingTitles.length === 0, 'error', missingTitles.length ? `missing title in ${missingTitles.join(', ')}` : 'every slide has a heading or title marker');
  addCheck('slide-purpose', missingPurposes.length === 0, 'error', missingPurposes.length ? `missing data-purpose/data-principle in ${missingPurposes.join(', ')}` : 'every slide exposes its audience job/rationale');
  addCheck('notes-coverage', missingNotes.length === 0, 'error', missingNotes.length ? `missing non-empty notes in ${missingNotes.join(', ')}` : 'every slide has non-empty speaker-note source content');
  addCheck('notes-depth', shallowNotes.length === 0, 'error', shallowNotes.length ? `notes are too brief (<40 characters) in ${shallowNotes.join(', ')}` : 'every slide has enough note content for a detailed explanation');

  const notesToggle = hasActionControl(html, 'toggle-notes', ['btnNotes', 'notesToggle']);
  const notesClose = hasActionControl(html, 'close-notes', ['btnNoteClose', 'notesClose']);
  const editToggle = hasActionControl(html, 'toggle-edit', ['btnEdit', 'editToggle']);
  const previous = hasActionControl(html, 'previous', ['btnPrev', 'prev']);
  const next = hasActionControl(html, 'next', ['btnNext', 'next']);
  const navControls = previous && next;

  addCheck('notes-toggle', notesToggle && hasNotesPanel(html), 'error', notesToggle && hasNotesPanel(html) ? 'notes control and named notes panel found' : 'notes toggle and named notes panel are both required');
  addCheck('notes-close', notesClose, 'error', notesClose ? 'notes panel has a close action' : 'notes panel requires a close action');
  // Each message follows the check's outcome: a failed check never reads like a pass, and a check
  // with nothing to judge says so instead of asking for a state it does not need.
  const notesState = controlHasState(html, 'toggle-notes', ['btnNotes', 'notesToggle']);
  addCheck('notes-state', !notesToggle || notesState, 'error', !notesToggle ? 'no notes control to judge' : (notesState ? 'notes control exposes aria-pressed/aria-expanded' : 'notes control needs aria-pressed or aria-expanded'));
  addCheck('edit-mode', editToggle && hasEditImplementation(html), 'error', editToggle && hasEditImplementation(html) ? 'edit control and contenteditable/designMode implementation found' : 'edit control plus an explicit editing implementation is required');
  const editState = controlHasState(html, 'toggle-edit', ['btnEdit', 'editToggle']);
  addCheck('edit-state', !editToggle || editState, 'error', !editToggle ? 'no edit control to judge' : (editState ? 'edit control exposes aria-pressed/aria-expanded' : 'edit control needs aria-pressed or aria-expanded'));
  addCheck('navigation', navControls && hasKeyboardNavigation(html), 'error', navControls && hasKeyboardNavigation(html) ? 'previous/next controls and keyboard navigation found' : 'previous/next controls and keyboard navigation are required');
  const hasLiveStatus = /\baria-live\s*=\s*(["'])(?:polite|assertive)\1/i.test(html);
  addCheck('live-status', hasLiveStatus, 'error', hasLiveStatus ? 'slide/mode changes have an aria-live status region' : 'slide/mode changes need an aria-live status region');
  const hasDraftPersistence = /\b(?:localStorage|sessionStorage|indexedDB)\b/i.test(html);
  addCheck('draft-persistence', hasDraftPersistence, 'error', hasDraftPersistence ? 'browser-local draft persistence implementation found' : 'no browser-local draft persistence implementation found');
  const hasReset = hasActionControl(html, 'reset', ['btnReset', 'reset']);
  addCheck('reset', hasReset, 'error', hasReset ? 'a reset control is present' : 'a reset control is missing');
  const hasExport = hasActionControl(html, 'export', ['btnExport', 'export']);
  addCheck('export', hasExport, 'error', hasExport ? 'a clean export control is present' : 'a clean export control is missing');
  const hasReducedMotion = /prefers-reduced-motion/i.test(html);
  addCheck('reduced-motion', hasReducedMotion, 'error', hasReducedMotion ? 'a reduced-motion path is declared' : 'a reduced-motion path is not declared');
  const hasPrintCss = /@media\s+print/i.test(html);
  addCheck('print', hasPrintCss, 'error', hasPrintCss ? 'print CSS is declared' : 'print CSS is not declared');
  const printNotesDisclosure = /notes[^.]{0,80}(?:not|excluded|omitted)[^.]{0,30}print/i.test(html) || /print[^.]{0,80}notes[^.]{0,30}(?:not|excluded|omitted)/i.test(html);
  addCheck('print-notes-disclosure', printNotesDisclosure, 'error', printNotesDisclosure ? 'the artifact discloses whether speaker notes are included in print' : 'the artifact must disclose whether speaker notes are included in print');

  const accessibleProblems = accessibleVisualProblems(html);
  addCheck('visual-alternatives', accessibleProblems.length === 0, 'error', accessibleProblems.length ? accessibleProblems.join('; ') : 'meaningful image/SVG elements expose text alternatives or decorative semantics');

  if (slides.length > 6) {
    addCheck('overview', hasActionControl(html, 'overview', ['btnOverview', 'overview', 'slideOverview']), 'error', hasActionControl(html, 'overview', ['btnOverview', 'overview', 'slideOverview']) ? 'long deck has an overview/jump control' : 'decks longer than six slides require an overview/jump control');
  } else {
    addCheck('overview', hasActionControl(html, 'overview', ['btnOverview', 'overview', 'slideOverview']), 'warning', hasActionControl(html, 'overview', ['btnOverview', 'overview', 'slideOverview']) ? 'overview/jump control found' : 'overview/jump is recommended for decks of six or fewer slides');
  }

  const hasFullscreen = hasAny(html, [/requestFullscreen\s*\(/i, /data-action\s*=\s*(["'])fullscreen\1/i]);
  const hasFocusStyle = /:focus-visible|:focus\b/i.test(html);
  const hasTouchSupplement = /touchstart|touchend|pointerdown|pointerup|swipe/i.test(html);
  const hasExternalDependency = /<(?:script|link)\b[^>]*(?:src|href)\s*=\s*(["'])https?:\/\//i.test(html);
  const hasExternalAssets = hasExternalAssetUrls(html);
  const hasAssetPolicy = hasExternalAssetPolicy(html);
  addCheck('fullscreen-state', hasFullscreen, 'warning', hasFullscreen ? 'fullscreen enhancement found; browser rejection/state-sync behavior still needs manual verification' : 'fullscreen enhancement not found; it is recommended for presenter delivery');
  addCheck('focus-style', hasFocusStyle, 'warning', hasFocusStyle ? 'focus styling found; verify contrast and all modes manually' : 'a visible focus style is not declared');
  addCheck('touch-supplement', hasTouchSupplement, 'warning', hasTouchSupplement ? 'touch/pointer supplement found; buttons and keyboard remain mandatory' : 'touch/pointer supplement not found; it is optional and cannot replace buttons/keyboard');
  addCheck('asset-policy', !hasExternalAssets || hasAssetPolicy, 'error', !hasExternalAssets ? 'no external media/style asset URLs found' : (hasAssetPolicy ? 'external assets are explicitly declared as allowed' : 'external media/style asset URLs require a presentation-asset-policy of external-allowed'));
  addCheck('external-dependencies', !hasExternalDependency, 'warning', hasExternalDependency ? 'external script/stylesheet dependency found; verify offline policy and fallback' : 'no external script/stylesheet dependency found; inspect image/font URLs separately');

  return {
    ok: errors.length === 0,
    profile,
    file: options.file || null,
    slideCount: slides.length,
    notesCount: notes.filter(Boolean).length,
    errors,
    warnings,
    checks,
    manualVerification: manualVerificationFor(profile),
  };
}

function printHuman(result) {
  const status = result.ok ? 'PASS' : 'FAIL';
  const lines = [`${status} ${result.file || 'presentation'} (profile: ${result.profile})`, `Slides: ${result.slideCount} · non-empty note sources: ${result.notesCount}`];
  if (result.errors.length) {
    lines.push('Errors:');
    result.errors.forEach((error) => lines.push(`- ${error}`));
  }
  if (result.warnings.length) {
    lines.push('Warnings:');
    result.warnings.forEach((warning) => lines.push(`- ${warning}`));
  }
  lines.push('Manual verification remains required for browser behavior.');
  return lines.join('\n');
}

function parseProfileArg(argv) {
  let profile = DEFAULT_PROFILE;
  for (const arg of argv) {
    // Only the `--profile=<name>` form is accepted: a space-separated value would
    // otherwise be mistaken for the deck path and yield a silently wrong verdict.
    if (arg === '--profile') throw new Error('--profile needs a value; use --profile=presenter or --profile=review');
    if (arg.startsWith('--profile=')) profile = assertProfile(arg.slice('--profile='.length));
  }
  return profile;
}

function main(argv) {
  let profile;
  try {
    profile = parseProfileArg(argv);
  } catch (error) {
    console.error(error.message);
    console.error(USAGE);
    return 2;
  }

  const fileArg = argv.find((arg) => !arg.startsWith('--'));
  if (!fileArg) {
    console.error(USAGE);
    return 2;
  }

  const file = path.resolve(fileArg);
  let html;
  try {
    html = fs.readFileSync(file, 'utf8');
  } catch (error) {
    console.error(`Unable to read ${file}: ${error.message}`);
    return 2;
  }

  const result = validatePresentation(html, { file, profile });
  if (argv.includes('--json')) console.log(JSON.stringify(result, null, 2));
  else console.log(printHuman(result));
  return result.ok ? 0 : 1;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = {
  findSlides,
  main,
  validatePresentation,
};
