'use strict';

/**
 * Create a self-contained, editable HTML presentation from a small JSON spec.
 *
 * The input is intentionally subject-neutral. It supplies the story copy and
 * visual fragments; this utility supplies the reusable presenter runtime:
 * notes, edit mode, local draft persistence, reset, export, overview,
 * fullscreen, keyboard navigation, print CSS, and accessibility hooks.
 * `bodyHtml`/`html` blocks are trusted author markup. Use escaped text/typed
 * blocks for untrusted input; this utility removes obvious executable tags and
 * event attributes but is not a general-purpose HTML sanitizer.
 */

const fs = require('node:fs');
const path = require('node:path');

const NOTE_FIELDS = [
  ['say', 'Say'],
  ['why', 'Why'],
  ['evidence', 'Evidence'],
  ['transition', 'Transition'],
  ['timing', 'Timing'],
  ['question', 'Question'],
];

const DEFAULT_THEME = {
  paper: '#f6f4ee',
  ink: '#1f2523',
  muted: '#5f6b66',
  accent: '#0b6e69',
  accentSoft: '#d8ece8',
  panel: '#ffffff',
  line: '#d9e0da',
  font: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  displayFont: 'Georgia, "Times New Roman", serif',
};

const EXAMPLE_SPEC = {
  id: 'subject-example',
  title: 'A subject-led presentation',
  subtitle: 'Replace this example with your audience, evidence, and story.',
  slides: [
    {
      id: 'opening-context',
      title: 'Start with the audience outcome',
      purpose: 'context',
      principle: 'The opening makes the subject and desired outcome explicit.',
      blocks: [
        { type: 'paragraph', text: 'Name what the audience should understand, decide, remember, or do.' },
        { type: 'quote', text: 'A clear outcome is the spine of the story.', attribution: 'Presentation brief' },
      ],
      notes: {
        say: 'Open by naming the subject and the outcome you want the audience to leave with.',
        why: 'Context gives the audience a reason to listen before detail arrives.',
        evidence: 'This is a planning prompt, not a factual claim; replace it with a cited source.',
        transition: 'Once the outcome is clear, state the thesis that will earn it.',
        timing: '00:45',
        question: 'What should I pay attention to? Answer with the one outcome and the route.',
      },
    },
    {
      id: 'thesis',
      title: 'Make the thesis visible early',
      purpose: 'explain',
      principle: 'The audience can test the rest of the deck against one meaningful claim.',
      blocks: [
        { type: 'metric', value: '01', label: 'primary claim', detail: 'Evidence and implications follow.' },
        { type: 'paragraph', text: 'Use the remaining slides to prove, qualify, compare, and act on this claim.' },
      ],
      notes: {
        say: 'State the thesis in one sentence, then point to the evidence path that follows.',
        why: 'A visible thesis reduces cognitive load and makes the sequence inspectable.',
        evidence: 'Label the source, baseline, date, and caveat for the real claim you insert here.',
        transition: 'Move from the thesis into the context or tension that makes it necessary.',
        timing: '01:00',
        question: 'What would change your mind? Name the evidence or threshold that would do so.',
      },
    },
  ],
};

function fail(message) {
  throw new Error(`presentation spec: ${message}`);
}

function asNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') fail(`${label} must be a non-empty string`);
  return value.trim();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function slugify(value, fallback = 'presentation') {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return slug || fallback;
}

function stableId(value, label) {
  const source = asNonEmptyString(value, label);
  const id = slugify(source, '');
  if (!id) fail(`${label} must contain at least one letter or number`);
  return id;
}

function inlineJson(value) {
  return JSON.stringify(value).replace(/<\//g, '<\\/');
}

function safeCssValue(value, fallback) {
  if (typeof value !== 'string' || value.trim() === '') return fallback;
  if (value.length > 180 || /[{};<>]/.test(value)) return fallback;
  return value.trim();
}

const DEFAULT_LOOK_WARNING = 'Warning: no usable theme supplied — the default look was used; set "theme" from your design plan.';

// A theme counts as chosen when at least one known key holds a value the renderer keeps; otherwise every
// custom property falls back to DEFAULT_THEME and the deck ships the default look.
function defaultLookWarning(spec) {
  const theme = spec && typeof spec === 'object' ? spec.theme : undefined;
  if (theme && typeof theme === 'object') {
    const chosen = Object.keys(DEFAULT_THEME).some((key) => safeCssValue(theme[key], null) !== null);
    if (chosen) return null;
  }
  return DEFAULT_LOOK_WARNING;
}

function safeUrl(value, label, allowExternalAssets) {
  const url = asNonEmptyString(value, label);
  if (/^javascript:/i.test(url)) fail('javascript: URLs are not allowed');
  if (/^(?:https?:)?\/\//i.test(url) && !allowExternalAssets) {
    fail(`${label} points to an external asset; set allowExternalAssets to true to opt in`);
  }
  if (/^data:(?!image\/(?:png|jpe?g|gif|svg\+xml|webp);base64,)/i.test(url)) {
    fail('only base64 image data URLs are allowed');
  }
  return url;
}

const EXTERNAL_URL_PATTERN = /(?:https?:)?\/\//i;
const EXTERNAL_ASSET_TAG_PATTERN = /<(?:img|audio|video|source|track|iframe|object|embed|image|use|link)\b[^>]*\b(?:src|poster|href)\s*=\s*(["']?)(?:https?:)?\/\//i;
const EXTERNAL_CSS_URL_PATTERN = /\burl\(\s*(["']?)(?:https?:)?\/\//i;

function assertExternalAssetsAllowed(value, label, allowExternalAssets) {
  if (!allowExternalAssets && EXTERNAL_URL_PATTERN.test(String(value))) {
    fail(`${label} contains an external URL; set allowExternalAssets to true to opt in`);
  }
}

function assertAuthorAssetsAllowed(value, label, allowExternalAssets) {
  if (!allowExternalAssets && (EXTERNAL_ASSET_TAG_PATTERN.test(String(value)) || EXTERNAL_CSS_URL_PATTERN.test(String(value)))) {
    fail(`${label} contains an external asset; set allowExternalAssets to true to opt in`);
  }
}

function sanitizeAuthorHtml(value) {
  return String(value)
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object\b[\s\S]*?<\/object>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+(?:href|src)\s*=\s*("|')\s*javascript:[\s\S]*?\1/gi, ' ');
}

function renderTypedBlock(block, index, options = {}) {
  if (!block || typeof block !== 'object') fail(`blocks[${index}] must be an object`);
  const type = asNonEmptyString(block.type, `blocks[${index}].type`).toLowerCase();

  if (type === 'paragraph' || type === 'text') {
    return `<p data-editable="true">${escapeHtml(asNonEmptyString(block.text, `blocks[${index}].text`)).replace(/\n/g, '<br>')}</p>`;
  }

  if (type === 'bullets' || type === 'list') {
    if (!Array.isArray(block.items) || block.items.length === 0) fail(`blocks[${index}].items must be a non-empty array`);
    return `<ul>${block.items.map((item, itemIndex) => `<li data-editable="true">${escapeHtml(asNonEmptyString(item, `blocks[${index}].items[${itemIndex}]`))}</li>`).join('')}</ul>`;
  }

  if (type === 'quote') {
    const text = escapeHtml(asNonEmptyString(block.text, `blocks[${index}].text`));
    const attribution = block.attribution ? `<cite data-editable="true">${escapeHtml(block.attribution)}</cite>` : '';
    return `<blockquote><p data-editable="true">${text}</p>${attribution}</blockquote>`;
  }

  if (type === 'metric') {
    return `<div class="metric" data-protected="true"><strong>${escapeHtml(asNonEmptyString(block.value, `blocks[${index}].value`))}</strong><span data-editable="true">${escapeHtml(asNonEmptyString(block.label, `blocks[${index}].label`))}</span>${block.detail ? `<small data-editable="true">${escapeHtml(block.detail)}</small>` : ''}</div>`;
  }

  if (type === 'image') {
    const src = escapeAttribute(safeUrl(block.src, `blocks[${index}].src`, options.allowExternalAssets));
    const alt = escapeAttribute(asNonEmptyString(block.alt, `blocks[${index}].alt`));
    const caption = block.caption ? `<figcaption data-editable="true">${escapeHtml(block.caption)}</figcaption>` : '';
    return `<figure data-protected="true"><img src="${src}" alt="${alt}">${caption}</figure>`;
  }

  if (type === 'code') {
    const language = block.language ? ` data-language="${escapeAttribute(block.language)}"` : '';
    return `<pre data-protected="true"><code${language}>${escapeHtml(asNonEmptyString(block.text, `blocks[${index}].text`))}</code></pre>`;
  }

  if (type === 'html') {
    const html = sanitizeAuthorHtml(asNonEmptyString(block.html, `blocks[${index}].html`));
    assertAuthorAssetsAllowed(html, `blocks[${index}].html`, options.allowExternalAssets);
    return html;
  }

  fail(`blocks[${index}].type "${type}" is unsupported; use paragraph, bullets, quote, metric, image, code, or html`);
}

function renderBody(slide, options = {}) {
  if (typeof slide.bodyHtml === 'string' && slide.bodyHtml.trim()) {
    const html = sanitizeAuthorHtml(slide.bodyHtml);
    assertAuthorAssetsAllowed(html, `slide "${slide.id}" bodyHtml`, options.allowExternalAssets);
    return html;
  }
  if (typeof slide.body === 'string' && slide.body.trim()) {
    return `<p data-editable="true">${escapeHtml(slide.body.trim()).replace(/\n/g, '<br>')}</p>`;
  }
  if (Array.isArray(slide.blocks) && slide.blocks.length) {
    return slide.blocks.map((block, index) => renderTypedBlock(block, index, options)).join('\n');
  }
  fail(`slide "${slide.id || slide.title || 'unknown'}" needs body, bodyHtml, or blocks`);
}

function normalizeNotes(rawNotes, slideId) {
  if (!rawNotes || typeof rawNotes !== 'object' || Array.isArray(rawNotes)) {
    fail(`slide "${slideId}" needs notes.say, notes.why, notes.evidence, notes.transition, notes.timing, and notes.question`);
  }
  const notes = {};
  for (const [field] of NOTE_FIELDS) notes[field] = asNonEmptyString(rawNotes[field], `slide "${slideId}" notes.${field}`);
  return notes;
}

function normalizeSpec(spec) {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) fail('root must be a JSON object');
  const deckId = stableId(spec.id, 'id');
  const title = asNonEmptyString(spec.title, 'title');
  if (!Array.isArray(spec.slides) || spec.slides.length < 1) fail('slides must contain at least one slide');
  const allowExternalAssets = spec.allowExternalAssets === true;

  const usedIds = new Set();
  const slides = spec.slides.map((rawSlide, index) => {
    if (!rawSlide || typeof rawSlide !== 'object' || Array.isArray(rawSlide)) fail(`slides[${index}] must be an object`);
    const id = stableId(rawSlide.id, `slides[${index}].id`);
    if (usedIds.has(id)) fail(`duplicate slide id "${id}"`);
    usedIds.add(id);
    const slide = {
      id,
      title: asNonEmptyString(rawSlide.title, `slides[${index}].title`),
      purpose: asNonEmptyString(rawSlide.purpose, `slides[${index}].purpose`),
      principle: asNonEmptyString(rawSlide.principle, `slides[${index}].principle`),
      eyebrow: rawSlide.eyebrow ? String(rawSlide.eyebrow).trim() : '',
      body: renderBody({ ...rawSlide, id }, { allowExternalAssets }),
      notes: normalizeNotes(rawSlide.notes, id),
    };
    return slide;
  });

  const theme = {};
  for (const key of Object.keys(DEFAULT_THEME)) {
    theme[key] = safeCssValue(spec.theme && spec.theme[key], DEFAULT_THEME[key]);
    assertExternalAssetsAllowed(theme[key], `theme.${key}`, allowExternalAssets);
  }

  return {
    id: deckId,
    title,
    subtitle: spec.subtitle ? String(spec.subtitle).trim() : '',
    lang: /^[a-z]{2,8}(?:-[a-z]{2,8})?$/i.test(String(spec.lang || 'en')) ? String(spec.lang || 'en') : 'en',
    allowExternalAssets,
    theme,
    slides,
  };
}

function renderSlide(slide, index, total) {
  const eyebrow = slide.eyebrow ? `<p class="slide-eyebrow" data-protected="true">${escapeHtml(slide.eyebrow)}</p>` : '';
  const notes = NOTE_FIELDS.map(([field, label]) => `<p data-note-row="${field}"><strong>${label}:</strong> <span data-note-value="${field}">${escapeHtml(slide.notes[field])}</span></p>`).join('');
  return `
    <section class="slide${index === 0 ? ' active' : ''}" data-slide-id="${escapeAttribute(slide.id)}" data-purpose="${escapeAttribute(slide.purpose)}" data-principle="${escapeAttribute(slide.principle)}" data-slide-index="${index}">
      <header class="slide-header" data-protected="true">
        ${eyebrow}
        <p class="slide-count">${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}</p>
        <h1>${escapeHtml(slide.title)}</h1>
      </header>
      <div class="slide-body" data-editable-area="true">${slide.body}</div>
      <footer class="slide-footer" data-protected="true"><span>${escapeHtml(slide.purpose)}</span><span>${escapeHtml(slide.id)}</span></footer>
      <template class="slide-notes" data-note-for="${escapeAttribute(slide.id)}">${notes}</template>
    </section>`;
}

function renderCss(theme) {
  return `
    :root {
      --paper: ${theme.paper}; --ink: ${theme.ink}; --muted: ${theme.muted};
      --accent: ${theme.accent}; --accent-soft: ${theme.accentSoft};
      --panel: ${theme.panel}; --line: ${theme.line}; --font: ${theme.font};
      --display-font: ${theme.displayFont}; --shadow: 0 14px 40px rgba(31, 37, 35, .10);
    }
    *, *::before, *::after { box-sizing: border-box; }
    html { background: var(--paper); color: var(--ink); font-family: var(--font); }
    body { margin: 0; min-width: 18rem; background: var(--paper); color: var(--ink); }
    button { font: inherit; }
    button, [contenteditable="true"] { -webkit-tap-highlight-color: transparent; }
    button:focus-visible, [contenteditable="true"]:focus-visible, dialog:focus-visible, #notes-content:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
    .app-shell { min-height: 100vh; display: grid; grid-template-rows: auto 1fr auto; }
    .toolbar { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; gap: .75rem; padding: .7rem 1rem; background: color-mix(in srgb, var(--paper) 94%, transparent); border-bottom: 1px solid var(--line); backdrop-filter: blur(10px); }
    .toolbar-title { min-width: 0; display: flex; align-items: baseline; gap: .65rem; }
    .toolbar-title strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mode-status, .draft-status, .shortcut-hint, .toolbar-policy, .print-note { color: var(--muted); font-size: .78rem; }
    .toolbar-policy { color: var(--accent); }
    .toolbar-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: .4rem; }
    .toolbar button, .notes-close, .overview-close { border: 1px solid var(--line); border-radius: .45rem; padding: .45rem .7rem; background: var(--panel); color: var(--ink); cursor: pointer; }
    .toolbar button:hover, .notes-close:hover, .overview-close:hover { border-color: var(--accent); color: var(--accent); }
    .toolbar button[aria-pressed="true"], .toolbar button[aria-expanded="true"] { background: var(--accent); color: #fff; border-color: var(--accent); }
    .stage { width: min(100% - 2rem, 78rem); margin: 1rem auto; }
    .slide { display: none; min-height: min(70vh, 44rem); padding: clamp(1.5rem, 5vw, 4.5rem); background: var(--panel); border: 1px solid var(--line); border-radius: 1rem; box-shadow: var(--shadow); grid-template-rows: auto 1fr auto; gap: 2rem; }
    .slide.active { display: grid; animation: slide-in .24s ease-out both; }
    .slide-header { max-width: 58rem; }
    .slide-eyebrow { margin: 0 0 .75rem; color: var(--accent); font-size: .8rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
    .slide-count { margin: 0 0 .8rem; color: var(--muted); font-variant-numeric: tabular-nums; }
    h1 { max-width: 22ch; margin: 0; font-family: var(--display-font); font-size: clamp(2rem, 5vw, 4.7rem); line-height: .98; letter-spacing: -.035em; }
    .slide-body { display: grid; align-content: center; gap: 1.1rem; max-width: 62rem; font-size: clamp(1.05rem, 1.8vw, 1.45rem); line-height: 1.45; }
    .slide-body p, .slide-body ul, .slide-body blockquote, .slide-body figure, .slide-body pre, .slide-body .metric { margin: 0; }
    .slide-body ul { padding-left: 1.2em; }
    .slide-body li + li { margin-top: .5rem; }
    .slide-body blockquote { padding: 1rem 1.25rem; border-left: .35rem solid var(--accent); background: var(--accent-soft); }
    .slide-body cite { display: block; margin-top: .5rem; color: var(--muted); font-size: .9em; }
    .slide-body .metric { display: grid; grid-template-columns: auto 1fr; align-items: baseline; column-gap: 1rem; width: fit-content; padding: 1.2rem 1.4rem; border: 1px solid var(--line); border-radius: .7rem; background: var(--accent-soft); }
    .metric strong { color: var(--accent); font-family: var(--display-font); font-size: clamp(2.4rem, 8vw, 6rem); line-height: .9; }
    .metric span { font-weight: 700; }
    .metric small { grid-column: 1 / -1; color: var(--muted); font-size: .85rem; }
    .slide-body img { display: block; max-width: 100%; max-height: 26rem; object-fit: contain; border-radius: .5rem; }
    .slide-body figcaption { margin-top: .5rem; color: var(--muted); font-size: .8em; }
    .slide-body pre { overflow: auto; padding: 1rem; color: var(--paper); background: var(--ink); border-radius: .5rem; font-size: .8em; }
    .slide-footer { display: flex; justify-content: space-between; gap: 1rem; color: var(--muted); font-size: .78rem; }
    body.is-editing [data-editable="true"][contenteditable="true"], body.is-editing #notes-content [data-note-value][contenteditable="true"] { outline: 2px dashed var(--accent); outline-offset: .25rem; border-radius: .2rem; }
    .progress-row { width: min(100% - 2rem, 78rem); margin: 0 auto .7rem; display: grid; grid-template-columns: 1fr auto; gap: .75rem; align-items: center; color: var(--muted); font-size: .8rem; }
    .progress-track { height: .35rem; overflow: hidden; border-radius: 999px; background: var(--line); }
    .progress-bar { height: 100%; width: 0; background: var(--accent); transition: width .2s ease-out; }
    .bottom-status { width: min(100% - 2rem, 78rem); margin: 0 auto 1rem; display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .notes-panel { position: fixed; inset: 0 0 0 auto; z-index: 20; width: min(32rem, 100%); overflow: auto; overscroll-behavior: contain; padding: 1.25rem; background: var(--panel); border-left: 1px solid var(--line); box-shadow: -14px 0 40px rgba(31, 37, 35, .14); }
    .notes-panel[hidden] { display: none; }
    .notes-header { display: flex; justify-content: space-between; gap: 1rem; align-items: start; margin-bottom: 1rem; }
    .notes-header h2 { margin: 0; font-family: var(--display-font); }
    .notes-page { margin: .3rem 0 0; color: var(--muted); font-size: .85rem; }
    #notes-content { line-height: 1.55; }
    #notes-content p { margin: 0 0 .9rem; }
    #notes-content strong { color: var(--accent); }
    dialog { width: min(54rem, calc(100% - 2rem)); max-height: min(80vh, 48rem); overflow: auto; overscroll-behavior: contain; padding: 1rem; color: var(--ink); background: var(--panel); border: 1px solid var(--line); border-radius: .8rem; box-shadow: var(--shadow); }
    dialog::backdrop { background: rgba(31, 37, 35, .42); }
    .overview-header { display: flex; justify-content: space-between; gap: 1rem; align-items: center; }
    .overview-header h2 { margin: 0; font-family: var(--display-font); }
    .overview-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: .7rem; margin-top: 1rem; }
    .overview-card { min-height: 7rem; padding: .8rem; text-align: left; border: 1px solid var(--line); border-radius: .5rem; background: var(--paper); cursor: pointer; }
    .overview-card:hover, .overview-card:focus-visible { border-color: var(--accent); }
    .overview-card strong { display: block; margin-bottom: .5rem; }
    .overview-card small { color: var(--muted); }
    .live-region { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
    @keyframes slide-in { from { opacity: 0; transform: translateY(.35rem); } to { opacity: 1; transform: none; } }
    @media (max-width: 48rem) { .toolbar { align-items: flex-start; flex-direction: column; } .toolbar-actions { justify-content: flex-start; } .stage, .progress-row, .bottom-status { width: min(100% - 1rem, 78rem); } .slide { min-height: 68vh; padding: 1.25rem; border-radius: .55rem; } .slide-footer { flex-direction: column; gap: .2rem; } .shortcut-hint { display: none; } }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; scroll-behavior: auto !important; } }
    @media print { @page { margin: 1rem; } body { background: #fff; } .toolbar, .progress-row, .bottom-status, .notes-panel, dialog, .live-region, noscript { display: none !important; } .stage { width: 100%; margin: 0; } .slide, .slide[hidden] { display: grid !important; min-height: 0; page-break-after: always; break-after: page; border: 0; box-shadow: none; } }
  `;
}

function renderRuntime(meta) {
  return `
    <script>
      (() => {
        'use strict';
        const META = ${inlineJson(meta)};
        const slides = Array.from(document.querySelectorAll('.slide'));
        const notesPanel = document.getElementById('notes-panel');
        const notesContent = document.getElementById('notes-content');
        const notesTitle = document.getElementById('notes-title');
        const notesPage = document.getElementById('notes-page');
        const overview = document.getElementById('overview-dialog');
        const overviewGrid = document.getElementById('overview-grid');
        const progressText = document.getElementById('progress-text');
        const progressBar = document.getElementById('progress-bar');
        const liveStatus = document.getElementById('live-status');
        const draftStatus = document.getElementById('draft-status');
        const modeStatus = document.getElementById('mode-status');
        const notesToggle = document.querySelector('[data-action="toggle-notes"]');
        const editToggle = document.querySelector('[data-action="toggle-edit"]');
        const fullscreenToggle = document.querySelector('[data-action="fullscreen"]');
        const storageKey = 'presentation-builder:' + META.id + ':v2';
        const EDIT_FORMAT_VERSION = 2;
        let currentIndex = 0;
        let notesOn = false;
        let editing = false;
        let dirty = false;
        let saveTimer = null;
        let storageOK = true;
        let overviewOpener = null;

        function currentSlide() { return slides[currentIndex]; }
        function titleOf(slide) { return slide.querySelector('h1, h2, h3')?.textContent.trim() || 'Untitled slide'; }
        function templateOf(slide) { return slide.querySelector('template.slide-notes, template.note-src'); }

        // An href survives only as http(s), mailto, a fragment, a single-slash path or ./ path. A backslash or
        // an ASCII control character (tab and newline included) is rejected first: the URL parser treats
        // '\\' as '/' and deletes tab/newline, so '/\\evil' or '/<TAB>/evil' would resolve off-origin.
        function isSafeHref(value) {
          const text = String(value);
          return !/[\\\\\\u0000-\\u001f\\u007f]/.test(text) &&
            /^(?:https?:|mailto:|#|\\/(?!\\/)|\\.\\/)/i.test(text);
        }

        function sanitizeEditableHtml(value, preserveNoteAttributes = false) {
          const template = document.createElement('template');
          template.innerHTML = String(value ?? '');
          const allowedTags = new Set(['BR', 'P', 'UL', 'OL', 'LI', 'STRONG', 'EM', 'B', 'I', 'U', 'S', 'CODE', 'A', 'SPAN', 'SMALL', 'CITE']);
          Array.from(template.content.querySelectorAll('*')).reverse().forEach((element) => {
            if (!allowedTags.has(element.tagName)) {
              const parent = element.parentNode;
              if (!parent) return;
              while (element.firstChild) parent.insertBefore(element.firstChild, element);
              parent.removeChild(element);
              return;
            }
            Array.from(element.attributes).forEach((attribute) => {
              const name = attribute.name.toLowerCase();
              const isNoteMarker = preserveNoteAttributes &&
                (name === 'data-note-row' || name === 'data-note-value') &&
                /^[a-z-]+$/.test(attribute.value);
              const isAllowedHref = element.tagName === 'A' && name === 'href' && isSafeHref(attribute.value);
              if (!isNoteMarker && !isAllowedHref) element.removeAttribute(attribute.name);
            });
          });
          return template.innerHTML;
        }

        function editableElements(slide) {
          return Array.from(slide.querySelectorAll('.slide-body [data-editable="true"]'))
            .filter((element) => !element.closest('svg, template, [data-protected="true"]'));
        }

        function ensureEditableLeaves(slide) {
          const body = slide.querySelector('.slide-body');
          if (!body) return;
          const candidates = body.querySelectorAll('p, li, blockquote, cite, figcaption, td, th, dt, dd, h2, h3, h4');
          candidates.forEach((element) => {
            if (!element.dataset.editable && element.textContent.trim() && !element.closest('svg, [data-protected="true"]')) element.dataset.editable = 'true';
          });
          editableElements(slide).forEach((element, index) => { if (!element.dataset.editKey) element.dataset.editKey = 'editable-' + index; });
        }

        function setDraftStatus(message, state) {
          draftStatus.textContent = message;
          draftStatus.dataset.state = state || 'info';
        }

        function announce(message) { liveStatus.textContent = message; }

        // Contract §3: the vertical keys scroll an overflowing slide first and change slide only at the
        // edge. Slides have no inner scroll box, so the page scrolls them. The edge is the active slide's
        // edge, never the page's: the progress row and status bar below the slide also make the page
        // overflow, and a slide that fits the viewport must still change on the first press.
        const SCROLL_FIRST_KEYS = ['ArrowDown', 'PageDown', ' ', 'ArrowUp', 'PageUp'];
        const EDGE_TOLERANCE_PX = 1;
        // An arrow key scrolls one line; a page key scrolls this share of the visible height and keeps the
        // rest on screen as overlap with the previous view.
        const LINE_STEP_PX = 40;
        const PAGE_STEP_SHARE = 0.85;
        const stage = document.getElementById('deck');
        const toolbar = document.querySelector('.toolbar');
        function scrollArea() { return document.scrollingElement || document.documentElement; }
        // The active slide's box in viewport coordinates. The stage holds only the active slide and, unlike
        // the slide, is never moved by the entrance animation, so a press during that animation measures true.
        function slideBox() { return stage.getBoundingClientRect(); }
        // Pixels of the active slide still out of view in this direction — below the viewport bottom, or above
        // the bottom of the sticky toolbar that covers the top — capped by how far the page can still scroll.
        function slideRoom(area, direction) {
          const box = slideBox();
          if (direction > 0) return Math.min(box.bottom - area.clientHeight, area.scrollHeight - area.clientHeight - area.scrollTop);
          return Math.min(visibleTop() - box.top, area.scrollTop);
        }
        // Viewport y where slide content becomes visible: the bottom of the sticky toolbar. Nothing is pinned
        // to the bottom of the page, so the visible band runs from here to the viewport bottom.
        function visibleTop() { return toolbar ? Math.max(0, toolbar.getBoundingClientRect().bottom) : 0; }
        // A page step is sized from the visible band, not the whole viewport: the toolbar covers the top, and at
        // high zoom it is a large share of the screen, so a viewport-sized step would jump over lines that were
        // never shown. The step keeps 15% of the band as overlap and never exceeds the band, so successive views
        // always overlap or touch.
        function pageStep(area) {
          const band = Math.max(1, area.clientHeight - visibleTop());
          return Math.min(band, Math.max(LINE_STEP_PX, Math.round(band * PAGE_STEP_SHARE)));
        }
        // 1 reads forward, -1 reads back. Space reads forward and Shift+Space back, as on any web page.
        function keyDirection(key, shiftKey = false) { return key === 'ArrowUp' || key === 'PageUp' || (key === ' ' && shiftKey) ? -1 : 1; }
        function isLineKey(key) { return key === 'ArrowUp' || key === 'ArrowDown'; }
        function overviewIsOpen() { return Boolean(overview.open) || overview.hasAttribute('open'); }
        // While the overview is open it owns the scroll keys: they scroll its card list, never the page or the
        // slide behind it.
        function overviewStep(key, direction) {
          const page = Math.max(LINE_STEP_PX, Math.round(overview.clientHeight * PAGE_STEP_SHARE));
          return direction * (isLineKey(key) ? LINE_STEP_PX : page);
        }
        // Pixels to scroll the area for this key in this direction: negative scrolls up, 0 means the slide is at the edge.
        function scrollStep(area, key, direction) {
          const room = slideRoom(area, direction);
          if (!(room > EDGE_TOLERANCE_PX)) return 0;
          const step = isLineKey(key) ? LINE_STEP_PX : pageStep(area);
          return direction * Math.min(step, room);
        }

        function renderNotes() {
          const slide = currentSlide();
          const template = templateOf(slide);
          notesTitle.textContent = titleOf(slide) + ' — Speaker notes';
          notesPage.textContent = 'Slide ' + (currentIndex + 1) + ' of ' + slides.length;
          notesContent.innerHTML = template ? sanitizeEditableHtml(template.innerHTML, true) : '<p>No speaker notes are available.</p>';
          notesContent.querySelectorAll('[data-note-value]').forEach((element) => {
            if (editing) { element.contentEditable = 'true'; element.dataset.noteEditable = 'true'; }
            else { element.removeAttribute('contenteditable'); delete element.dataset.noteEditable; }
          });
        }

        function copyNotesToSource() {
          const template = templateOf(currentSlide());
          if (!template) return;
          const targetValues = template.content.querySelectorAll('[data-note-value]');
          const editedValues = notesContent.querySelectorAll('[data-note-value]');
          editedValues.forEach((element, index) => { if (targetValues[index]) targetValues[index].textContent = element.textContent; });
        }

        // Every slide change opens the new slide at its top (page top, so the slide sits just below the toolbar)
        // with its title in view. Only a scroll key crossing a slide edge backward overrides this afterwards.
        function showSlide(rawIndex, announceChange = true) {
          const previousIndex = currentIndex;
          currentIndex = Math.max(0, Math.min(slides.length - 1, rawIndex));
          if (currentIndex !== previousIndex) scrollArea().scrollTop = 0;
          slides.forEach((slide, index) => {
            const active = index === currentIndex;
            slide.classList.toggle('active', active);
            slide.hidden = !active;
            slide.setAttribute('aria-hidden', String(!active));
          });
          const label = 'Slide ' + (currentIndex + 1) + ' of ' + slides.length + ': ' + titleOf(currentSlide());
          progressText.textContent = label;
          progressBar.style.width = (((currentIndex + 1) / slides.length) * 100) + '%';
          progressBar.setAttribute('aria-valuenow', String(currentIndex + 1));
          progressBar.setAttribute('aria-valuetext', label);
          if (notesOn) renderNotes();
          if (announceChange) announce(label);
          try { history.replaceState(null, '', '#' + encodeURIComponent(currentSlide().dataset.slideId)); } catch (_) { /* file:// or restricted history */ }
          overviewGrid.querySelectorAll('[data-overview-index]').forEach((button) => button.setAttribute('aria-current', button.dataset.overviewIndex === String(currentIndex) ? 'true' : 'false'));
        }

        function setNotes(open, restoreFocus = true) {
          notesOn = Boolean(open);
          notesPanel.hidden = !notesOn;
          notesToggle.setAttribute('aria-expanded', String(notesOn));
          document.body.classList.toggle('notes-open', notesOn);
          if (notesOn) { renderNotes(); document.getElementById('notes-close').focus(); }
          else if (restoreFocus) notesToggle.focus();
        }

        function setEditing(on) {
          editing = Boolean(on);
          document.body.classList.toggle('is-editing', editing);
          editToggle.setAttribute('aria-pressed', String(editing));
          modeStatus.textContent = editing ? 'Editing' : 'Viewing';
          slides.forEach((slide) => editableElements(slide).forEach((element) => {
            if (editing) element.contentEditable = 'true';
            else element.removeAttribute('contenteditable');
          }));
          if (notesOn) renderNotes();
          setDraftStatus(editing && !notesOn ? 'Unsaved changes are local; open Notes to edit speaker notes.' : (editing ? 'Editing locally' : (dirty ? 'Unsaved changes' : 'Viewing')), editing ? 'editing' : 'info');
          if (!editing && document.activeElement?.isContentEditable) document.activeElement.blur();
        }

        function captureDraft() {
          return {
            version: EDIT_FORMAT_VERSION,
            slides: slides.map((slide) => ({
              id: slide.dataset.slideId,
              edits: editableElements(slide).map((element) => ({ key: element.dataset.editKey, html: sanitizeEditableHtml(element.innerHTML) })),
              notes: (() => {
                const template = templateOf(slide);
                return template
                  ? Array.from(template.content.querySelectorAll('[data-note-value]')).map((element) => element.textContent)
                  : [];
              })(),
            })),
          };
        }

        function restoreDraft(draft) {
          if (!draft || draft.version !== EDIT_FORMAT_VERSION || !Array.isArray(draft.slides)) return false;
          draft.slides.forEach((saved) => {
            if (!saved || typeof saved !== 'object') return;
            const slide = slides.find((candidate) => candidate.dataset.slideId === saved.id);
            if (!slide) return;
            const elements = editableElements(slide);
            (Array.isArray(saved.edits) ? saved.edits : []).forEach((edit) => {
              const element = edit && elements.find((candidate) => candidate.dataset.editKey === edit.key);
              if (element && edit && typeof edit.html === 'string') element.innerHTML = sanitizeEditableHtml(edit.html);
            });
            const template = templateOf(slide);
            if (template && Array.isArray(saved.notes)) {
              const values = template.content.querySelectorAll('[data-note-value]');
              saved.notes.forEach((value, index) => {
                if (values[index] && typeof value === 'string') values[index].textContent = value;
              });
            }
          });
          return true;
        }

        function loadDraft() {
          try {
            const raw = localStorage.getItem(storageKey);
            if (!raw) return false;
            const restored = restoreDraft(JSON.parse(raw));
            if (restored) { dirty = false; setDraftStatus('Local draft restored', 'saved'); }
            return restored;
          } catch (_) {
            storageOK = false;
            setDraftStatus('Storage unavailable — use Export HTML to keep a copy.', 'error');
            return false;
          }
        }

        function saveDraft() {
          if (!dirty || !storageOK) return;
          copyNotesToSource();
          try {
            localStorage.setItem(storageKey, JSON.stringify(captureDraft()));
            dirty = false;
            setDraftStatus('Saved locally', 'saved');
          } catch (_) {
            storageOK = false;
            setDraftStatus('Storage unavailable — use Export HTML to keep a copy.', 'error');
          }
        }

        function markDirty() {
          dirty = true;
          if (!storageOK) { setDraftStatus('Unsaved — storage unavailable; use Export HTML.', 'error'); return; }
          setDraftStatus('Unsaved changes', 'unsaved');
          clearTimeout(saveTimer);
          saveTimer = setTimeout(saveDraft, 400);
        }

        function openOverview() {
          overviewOpener = document.activeElement;
          // A shut overview can carry [hidden] (the no-showModal close path, a clean export); a modal opened
          // while hidden is invisible yet makes the page inert, so every open path clears it first.
          overview.hidden = false;
          if (typeof overview.showModal === 'function') overview.showModal();
          else overview.setAttribute('open', '');
          overviewGrid.querySelector('[data-overview-index="' + currentIndex + '"]')?.focus();
        }

        function closeOverview() {
          if (overview.open && typeof overview.close === 'function') overview.close();
          else { overview.removeAttribute('open'); overview.hidden = true; }
          if (overviewOpener && typeof overviewOpener.focus === 'function') overviewOpener.focus();
          overviewOpener = null;
        }

        function toggleFullscreen() {
          if (document.fullscreenElement) {
            if (!document.exitFullscreen) { announce('Fullscreen exit is not supported in this browser.'); return; }
            try {
              const result = document.exitFullscreen();
              if (result && typeof result.catch === 'function') result.catch(() => announce('Fullscreen exit was not available.'));
            } catch (_) {
              announce('Fullscreen exit was not available.');
            }
            return;
          }
          if (!document.documentElement.requestFullscreen) { announce('Fullscreen is not supported in this browser.'); return; }
          try {
            const result = document.documentElement.requestFullscreen();
            if (result && typeof result.catch === 'function') result.catch(() => announce('Fullscreen was denied; continue in the browser window.'));
          } catch (_) {
            announce('Fullscreen was denied; continue in the browser window.');
          }
        }

        function exportCleanHtml() {
          slides.forEach((slide) => editableElements(slide).forEach((element) => {
            element.innerHTML = sanitizeEditableHtml(element.innerHTML);
          }));
          copyNotesToSource();
          const clean = document.documentElement.cloneNode(true);
          clean.querySelectorAll('[contenteditable], [data-note-editable], [data-editing], [data-editable], [data-edit-key]').forEach((element) => {
            element.removeAttribute('contenteditable');
            element.removeAttribute('data-note-editable');
            element.removeAttribute('data-editing');
            element.removeAttribute('data-editable');
            element.removeAttribute('data-edit-key');
          });
          clean.querySelector('body')?.classList.remove('is-editing', 'notes-open');
          const panel = clean.querySelector('#notes-panel');
          if (panel) panel.hidden = true;
          const status = clean.querySelector('#draft-status');
          if (status) status.textContent = '';
          const live = clean.querySelector('#live-status');
          if (live) live.textContent = '';
          const dialog = clean.querySelector('#overview-dialog');
          if (dialog) { dialog.removeAttribute('open'); dialog.hidden = true; }
          const html = '<!doctype html>\\n' + clean.outerHTML;
          const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url; link.download = META.id + '.html'; link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          announce('Clean HTML export downloaded.');
        }

        function resetDraft() {
          if (!window.confirm('Reset the local draft for this presentation? This cannot be undone.')) return;
          try { localStorage.removeItem(storageKey); } catch (_) { /* already unavailable */ }
          window.location.reload();
        }

        document.addEventListener('click', (event) => {
          const overviewButton = event.target.closest('[data-overview-index]');
          if (overviewButton) { showSlide(Number(overviewButton.dataset.overviewIndex)); closeOverview(); return; }
          const control = event.target.closest('[data-action]');
          if (!control) return;
          switch (control.dataset.action) {
            case 'previous': showSlide(currentIndex - 1); break;
            case 'next': showSlide(currentIndex + 1); break;
            case 'toggle-notes': setNotes(!notesOn); break;
            case 'close-notes': setNotes(false); break;
            case 'toggle-edit': setEditing(!editing); break;
            case 'overview': openOverview(); break;
            case 'close-overview': closeOverview(); break;
            case 'fullscreen': toggleFullscreen(); break;
            case 'reset': resetDraft(); break;
            case 'export': exportCleanHtml(); break;
            case 'print': window.print(); break;
            default: break;
          }
        });

        document.addEventListener('input', (event) => {
          if (!editing) return;
          const noteEditor = event.target.closest('[data-note-value]');
          if (noteEditor) {
            noteEditor.innerHTML = sanitizeEditableHtml(noteEditor.innerHTML);
            copyNotesToSource();
          }
          const editor = event.target.closest('[data-editable="true"]');
          if (editor) editor.innerHTML = sanitizeEditableHtml(editor.innerHTML);
          if (editor || noteEditor) markDirty();
        });

        document.addEventListener('keydown', (event) => {
          const target = event.target;
          const typing = target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
          const overviewOpen = overviewIsOpen();
          if (event.key === 'Escape') {
            // The shut overview dialog is not [hidden], so only its open state decides; otherwise Escape goes on
            // to close the notes.
            if (overviewOpen) { closeOverview(); event.preventDefault(); return; }
            if (notesOn) { setNotes(false); event.preventDefault(); return; }
            if (typing) { target.blur(); event.preventDefault(); return; }
          }
          if (typing) return;
          const key = event.key;
          // Space and Enter on a focused button, link or disclosure belong to it: the browser activates that
          // control (a toolbar action, an overview card, Close) and the deck does not move.
          if ((key === ' ' || key === 'Enter') && target && typeof target.closest === 'function' && target.closest('button, a[href], summary')) return;
          const direction = keyDirection(key, event.shiftKey);
          // Contract §3: while the overview is open it holds the keys. The scroll keys scroll its card list and
          // every other deck key does nothing, so the deck behind it neither scrolls nor changes slide.
          if (overviewOpen) {
            if (SCROLL_FIRST_KEYS.includes(key)) { event.preventDefault(); overview.scrollBy(0, overviewStep(key, direction)); }
            return;
          }
          if (SCROLL_FIRST_KEYS.includes(key)) {
            // Focus inside the notes panel: the browser scrolls the notes. At narrow widths the panel covers
            // the slide, so moving the page or the slide here would change content nobody can see.
            if (notesPanel.contains(target)) return;
            event.preventDefault();
            const area = scrollArea();
            const step = scrollStep(area, key, direction);
            if (step !== 0) { area.scrollBy(0, step); return; }
            if (event.repeat) return; // A held key stops at the slide edge instead of running through the deck.
            // At the edge: change slide, and land where reading continues in that direction — forward at the
            // top (showSlide does that), back with the slide's end at the viewport bottom (the top when it fits).
            const forward = direction > 0;
            const before = currentIndex;
            showSlide(currentIndex + (forward ? 1 : -1));
            if (!forward && currentIndex !== before) area.scrollTop = Math.max(0, area.scrollTop + slideBox().bottom - area.clientHeight);
          }
          else if (key === 'ArrowRight') { event.preventDefault(); showSlide(currentIndex + 1); }
          else if (key === 'ArrowLeft') { event.preventDefault(); showSlide(currentIndex - 1); }
          else if (key === 'Home') { event.preventDefault(); showSlide(0); }
          else if (key === 'End') { event.preventDefault(); showSlide(slides.length - 1); }
          else if (key.toLowerCase() === 'n') { event.preventDefault(); setNotes(!notesOn); }
          else if (key.toLowerCase() === 'e') { event.preventDefault(); setEditing(!editing); }
          else if (key.toLowerCase() === 'o') { event.preventDefault(); openOverview(); }
          else if (key.toLowerCase() === 'f') { event.preventDefault(); toggleFullscreen(); }
        });

        document.addEventListener('fullscreenchange', () => {
          const active = Boolean(document.fullscreenElement);
          fullscreenToggle.setAttribute('aria-pressed', String(active));
          fullscreenToggle.textContent = active ? 'Exit full screen' : 'Full screen';
        });
        overview.addEventListener('cancel', (event) => { event.preventDefault(); closeOverview(); });
        overview.addEventListener('click', (event) => { if (event.target === overview) closeOverview(); });
        window.addEventListener('beforeunload', saveDraft);

        slides.forEach(ensureEditableLeaves);
        try { localStorage.getItem(storageKey); } catch (_) { storageOK = false; }
        const hashId = decodeURIComponent(location.hash.replace(/^#/, ''));
        const hashIndex = slides.findIndex((slide) => slide.dataset.slideId === hashId);
        showSlide(hashIndex >= 0 ? hashIndex : 0, false);
        if (storageOK) loadDraft();
        else setDraftStatus('Storage unavailable — use Export HTML to keep a copy.', 'error');
        setEditing(false);
      })();
    </script>`;
}

function generatePresentation(input) {
  const spec = normalizeSpec(input);
  const meta = { id: spec.id, title: spec.title, slideCount: spec.slides.length, allowExternalAssets: spec.allowExternalAssets };
  const overviewCards = spec.slides.map((slide, index) => `<button type="button" class="overview-card" data-overview-index="${index}"><strong>${String(index + 1).padStart(2, '0')} · ${escapeHtml(slide.title)}</strong><small>${escapeHtml(slide.purpose)}</small></button>`).join('');
  const subtitle = spec.subtitle ? `<span class="toolbar-subtitle">${escapeHtml(spec.subtitle)}</span>` : '';
  const assetPolicy = '<span class="toolbar-policy" data-asset-policy="' + (spec.allowExternalAssets ? 'external-allowed' : 'self-contained') + '">' + (spec.allowExternalAssets ? 'Network assets enabled' : 'Local assets only') + '</span>';
  return `<!doctype html>
<html lang="${escapeAttribute(spec.lang)}" data-presentation-id="${escapeAttribute(spec.id)}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="presentation-id" content="${escapeAttribute(spec.id)}">
    <meta name="presentation-asset-policy" content="${spec.allowExternalAssets ? 'external-allowed' : 'self-contained'}">
    <meta name="description" content="${escapeAttribute(spec.title)}">
    <title>${escapeHtml(spec.title)}</title>
    <style>${renderCss(spec.theme)}</style>
  </head>
  <body>
    <div class="app-shell">
      <header class="toolbar" role="toolbar" aria-label="Presentation controls">
        <div class="toolbar-title"><strong>${escapeHtml(spec.title)}</strong>${subtitle}${assetPolicy}<span id="mode-status" class="mode-status">Viewing</span></div>
        <div class="toolbar-actions">
          <button type="button" data-action="previous" aria-label="Previous slide">Previous</button>
          <button type="button" data-action="next" aria-label="Next slide">Next</button>
          <button type="button" data-action="toggle-notes" aria-controls="notes-panel" aria-expanded="false">Notes</button>
          <button type="button" data-action="toggle-edit" aria-pressed="false">Edit mode</button>
          <button type="button" data-action="overview" aria-controls="overview-dialog" aria-haspopup="dialog">Overview</button>
          <button type="button" data-action="fullscreen" aria-pressed="false">Full screen</button>
          <button type="button" data-action="print">Print</button>
          <button type="button" data-action="export">Export HTML</button>
          <button type="button" data-action="reset">Reset draft</button>
        </div>
      </header>
      <main id="deck" class="stage" aria-label="${escapeAttribute(spec.title)}">
        ${spec.slides.map((slide, index) => renderSlide(slide, index, spec.slides.length)).join('\n')}
      </main>
      <div class="progress-row" aria-label="Presentation progress"><div class="progress-track"><div id="progress-bar" class="progress-bar" role="progressbar" aria-valuemin="1" aria-valuemax="${spec.slides.length}" aria-valuenow="1"></div></div><span id="progress-text">Slide 1 of ${spec.slides.length}</span></div>
      <div class="bottom-status"><span id="draft-status" class="draft-status" role="status" aria-live="polite">No local draft</span><span class="shortcut-hint">←/→ navigate · N notes · E edit · O overview · F full screen</span><span id="print-note" class="print-note">Speaker notes are not included in print.</span></div>
    </div>
    <aside id="notes-panel" class="notes-panel" role="dialog" aria-labelledby="notes-title" aria-describedby="notes-page" hidden>
      <div class="notes-header"><div><h2 id="notes-title">Speaker notes</h2><p id="notes-page" class="notes-page">Slide 1 of ${spec.slides.length}</p></div><button type="button" id="notes-close" class="notes-close" data-action="close-notes" aria-label="Close speaker notes">Close</button></div>
      <div id="notes-content" role="region" aria-label="Speaker notes text" tabindex="0"></div>
    </aside>
    <dialog id="overview-dialog" aria-labelledby="overview-title">
      <div class="overview-header"><h2 id="overview-title">All slides</h2><button type="button" class="overview-close" data-action="close-overview">Close</button></div>
      <div id="overview-grid" class="overview-grid">${overviewCards}</div>
    </dialog>
    <div class="live-region" id="live-status" role="status" aria-live="polite"></div>
    <noscript><p>This presentation needs JavaScript for navigation, notes, and edit mode. Use the browser print command for a readable slide sequence.</p></noscript>
    ${renderRuntime(meta)}
  </body>
</html>
`;
}

function exampleSpec() {
  return JSON.parse(JSON.stringify(EXAMPLE_SPEC));
}

function main(argv) {
  const args = argv.filter((arg) => arg !== '--example');
  const isExample = argv.includes('--example');
  const inputPath = args[0];
  const outputPath = args[1];
  if (isExample) {
    if (!inputPath) {
      console.error('Usage: node create-presentation.cjs --example <output.html>');
      return 2;
    }
  } else if (!inputPath || !outputPath) {
    console.error('Usage: node create-presentation.cjs <deck.json> <output.html>\n       node create-presentation.cjs --example <output.html>');
    return 2;
  }

  try {
    const spec = isExample ? exampleSpec() : JSON.parse(fs.readFileSync(path.resolve(inputPath), 'utf8'));
    const html = generatePresentation(spec);
    const target = path.resolve(isExample ? inputPath : outputPath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, html, 'utf8');
    console.log(`Created ${target} (${html.length} bytes, ${spec.slides.length} slides)`);
    const warning = defaultLookWarning(spec);
    if (warning) console.error(warning);
    return 0;
  } catch (error) {
    console.error(error.message);
    return 1;
  }
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = {
  DEFAULT_LOOK_WARNING,
  DEFAULT_THEME,
  EXAMPLE_SPEC,
  defaultLookWarning,
  generatePresentation,
  main,
  normalizeSpec,
};
