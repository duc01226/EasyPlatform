'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { EXAMPLE_SPEC, defaultLookWarning, generatePresentation, main, normalizeSpec } = require('../scripts/create-presentation.cjs');
const { validatePresentation } = require('../scripts/validate-presentation.cjs');

// OS essentials a spawned node child may need on Windows, macOS or Linux; everything else is dropped. The Windows
// well-known folder keys (SYSTEMDRIVE, PROGRAMDATA, ...) stay: without them a child that touches the shell writes
// its cache files under its working directory.
const CHILD_ENV_ALLOWLIST = new Set([
  'PATH', 'PATHEXT', 'SYSTEMROOT', 'WINDIR', 'COMSPEC',
  'SYSTEMDRIVE', 'PROGRAMDATA', 'ALLUSERSPROFILE', 'PUBLIC',
  'PROGRAMFILES', 'PROGRAMFILES(X86)', 'PROGRAMW6432',
  'COMMONPROGRAMFILES', 'COMMONPROGRAMFILES(X86)', 'COMMONPROGRAMW6432',
  'PROCESSOR_ARCHITECTURE', 'PROCESSOR_ARCHITEW6432', 'NUMBER_OF_PROCESSORS', 'OS', 'LANG', 'LC_ALL', 'TZ',
]);

const html = generatePresentation(EXAMPLE_SPEC);
const validation = validatePresentation(html, { file: 'generated-fixture.html' });

assert.equal(validation.ok, true, `generated fixture failed: ${validation.errors.join('; ')}`);
assert.equal(validation.slideCount, 2);
assert.equal(validation.notesCount, 2);
assert.match(html, /data-action="toggle-notes"/);
assert.match(html, /data-action="toggle-edit"/);
assert.match(html, /localStorage/);
assert.match(html, /requestFullscreen/);
assert.match(html, /prefers-reduced-motion/);
assert.match(html, /@media print/);
assert.match(html, /data-action="overview"/);
assert.match(html, /case 'close-overview': closeOverview\(\)/);
assert.match(html, /meta name="presentation-id"/);
assert.match(html, /presentation-asset-policy" content="self-contained"/);
assert.match(html, /data-asset-policy="self-contained">Local assets only/);
assert.match(html, /data-action="close-notes"/);
// The notes text is a named, keyboard-focusable region, so a keyboard user can reach it and scroll it (contract §3)
assert.match(html, /<div id="notes-content" role="region" aria-label="[^"]+" tabindex="0">/);
assert.match(html, /Speaker notes are not included in print/);
assert.match(html, /\[contenteditable\].*\[data-editable\].*\[data-edit-key\]/s);
assert.match(html, /storageKey.*:v2/);
assert.match(html, /EDIT_FORMAT_VERSION = 2/);
assert.match(html, /Array\.isArray\(saved\.edits\)/);

// The deck runtime is emitted through a template literal, which drops single backslashes. Every inline
// script must still parse, or the deck throws on load and none of its controls work.
const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
assert.ok(inlineScripts.length > 0, 'generated deck has an inline runtime script');
for (const source of inlineScripts) {
  assert.doesNotThrow(() => new vm.Script(source), 'generated inline script must parse');
}

// Exercise the href check exactly as the browser receives it: a source-level test cannot see the
// template-literal escaping, so pull the emitted function out of the generated HTML and run it.
const emittedHrefCheck = /function isSafeHref\(value\) \{[\s\S]*?\n {8}\}/.exec(html);
assert.ok(emittedHrefCheck, 'generated runtime defines isSafeHref');
const isSafeHref = new vm.Script(`(${emittedHrefCheck[0]})`).runInNewContext({});
for (const allowed of ['https://example.test/a', 'http://example.test', 'HTTPS://example.test', 'mailto:someone@example.test', '#slide-2', '/relative/path', './relative']) {
  assert.equal(isSafeHref(allowed), true, `href ${JSON.stringify(allowed)} stays allowed`);
}
for (const rejected of [
  '//evil.test', 'javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)', '\u0001javascript:alert(1)',
  'data:text/html,x', 'vbscript:x', '../up', '/\\evil.test', '/\t/evil.test', '/\n/evil.test', '/\r/evil.test',
  'https://ok.test/\u007f', '\\\\evil.test\\share',
]) {
  assert.equal(isSafeHref(rejected), false, `href ${JSON.stringify(rejected)} is removed`);
}

// The predicate only protects the deck if the emitted sanitizer consults it: edited and restored slide HTML
// goes through sanitizeEditableHtml. Run the EMITTED sanitizer against a minimal template DOM (the test stays
// dependency-free, so no real parser): the fake template builds a known node tree for the input key and
// serializes whatever the sanitizer leaves behind.
{
  // Given the emitted isSafeHref + sanitizeEditableHtml pair, loaded exactly as the browser receives them
  const emittedSanitizer = /function sanitizeEditableHtml\(value, preserveNoteAttributes = false\) \{[\s\S]*?\n {8}\}/.exec(html);
  assert.ok(emittedSanitizer, 'generated runtime defines sanitizeEditableHtml');

  class FakeNode {
    constructor() { this.parentNode = null; this.childNodes = []; }
    get firstChild() { return this.childNodes[0] || null; }
    append(...nodes) { nodes.forEach((node) => this.insertBefore(node, null)); return this; }
    insertBefore(node, ref) {
      if (node.parentNode) node.parentNode.removeChild(node);
      const at = ref ? this.childNodes.indexOf(ref) : this.childNodes.length;
      this.childNodes.splice(at, 0, node);
      node.parentNode = this;
      return node;
    }
    removeChild(node) {
      this.childNodes.splice(this.childNodes.indexOf(node), 1);
      node.parentNode = null;
      return node;
    }
    serializeChildren() { return this.childNodes.map((node) => node.serialize()).join(''); }
    querySelectorAll() {
      const found = [];
      const walk = (node) => node.childNodes.forEach((child) => { if (child.tagName) found.push(child); walk(child); });
      walk(this);
      return found;
    }
  }
  class FakeText extends FakeNode {
    constructor(text) { super(); this.text = text; }
    serialize() { return this.text; }
  }
  class FakeElement extends FakeNode {
    constructor(tagName, attrs = {}) { super(); this.tagName = tagName; this.attrs = new Map(Object.entries(attrs)); }
    get attributes() { return [...this.attrs].map(([name, value]) => ({ name, value })); }
    removeAttribute(name) { this.attrs.delete(name); }
    serialize() {
      const tag = this.tagName.toLowerCase();
      const attrs = [...this.attrs].map(([name, value]) => ` ${name}="${value}"`).join('');
      return `<${tag}${attrs}>${this.serializeChildren()}</${tag}>`;
    }
  }
  const el = (tagName, attrs, text) => new FakeElement(tagName, attrs).append(new FakeText(text));
  const trees = {
    'links-under-test': () => new FakeNode().append(
      el('A', { href: 'javascript:alert(1)' }, 'script link'),
      el('A', { href: 'JaVaScRiPt:alert(1)', title: 'tooltip' }, 'mixed case'),
      el('A', { href: '/\\evil.test' }, 'backslash'),
      el('A', { href: 'https://example.test/ok' }, 'good'),
      el('A', { href: '#slide-2' }, 'fragment'),
      el('SPAN', { href: 'https://example.test/span' }, 'not a link'),
      el('IMG', { src: 'x', onerror: 'alert(3)' }, ''),
    ),
  };
  const fakeDocument = {
    createElement(tag) {
      assert.equal(tag, 'template');
      const template = { content: new FakeNode() };
      Object.defineProperty(template, 'innerHTML', {
        set(value) { template.content = trees[value](); },
        get() { return template.content.serializeChildren(); },
      });
      return template;
    },
  };
  const sanitizeEditableHtml = new vm.Script(`${emittedHrefCheck[0]}\n${emittedSanitizer[0]}\nsanitizeEditableHtml;`)
    .runInNewContext({ document: fakeDocument });

  // When the sanitizer processes anchors with unsafe, safe and misplaced hrefs
  const output = sanitizeEditableHtml('links-under-test');

  // Then every unsafe href is stripped and the link text stays; safe anchors keep their href
  assert.equal(output, [
    '<a>script link</a>',
    '<a>mixed case</a>',
    '<a>backslash</a>',
    '<a href="https://example.test/ok">good</a>',
    '<a href="#slide-2">fragment</a>',
    '<span>not a link</span>',
  ].join(''));
  assert.doesNotMatch(output, /javascript|evil|onerror|<img/i);
}

// And the restore path runs saved edits through that sanitizer before they reach the slide
assert.match(html, /element\.innerHTML = sanitizeEditableHtml\(edit\.html\)/);

const sanitized = generatePresentation({
  ...EXAMPLE_SPEC,
  id: 'sanitized',
  slides: EXAMPLE_SPEC.slides.map((slide, index) => ({
    ...slide,
    id: `sanitized-${index + 1}`,
    bodyHtml: '<p data-editable="true" onclick="alert(1)">Safe author copy</p><script>alert(2)</script>',
  })),
});
assert.doesNotMatch(sanitized, /<script>alert\(2\)<\/script>/);
assert.doesNotMatch(sanitized, /onclick=/i);

const oneSlide = normalizeSpec({ ...EXAMPLE_SPEC, slides: EXAMPLE_SPEC.slides.slice(0, 1) });
assert.equal(oneSlide.slides.length, 1);
assert.throws(() => normalizeSpec({ ...EXAMPLE_SPEC, slides: [] }), /at least one slide/);
assert.throws(() => normalizeSpec({ ...EXAMPLE_SPEC, id: '' }), /id must be a non-empty string/);
assert.throws(() => normalizeSpec({ ...EXAMPLE_SPEC, slides: EXAMPLE_SPEC.slides.map((slide) => ({ ...slide, id: '' })) }), /slides\[0\]\.id/);
assert.throws(() => normalizeSpec({ ...EXAMPLE_SPEC, slides: EXAMPLE_SPEC.slides.map((slide) => ({ ...slide, notes: { ...slide.notes, question: '' } })) }), /notes\.question/);
assert.throws(() => normalizeSpec({ ...EXAMPLE_SPEC, slides: EXAMPLE_SPEC.slides.map((slide) => ({ ...slide, id: 'same-id' })) }), /duplicate slide id/);
assert.throws(() => normalizeSpec({ ...EXAMPLE_SPEC, slides: EXAMPLE_SPEC.slides.map((slide) => ({ ...slide, blocks: [{ type: 'image', src: 'javascript:alert(1)', alt: 'bad' }] })) }), /javascript/);
assert.throws(() => normalizeSpec({ ...EXAMPLE_SPEC, slides: EXAMPLE_SPEC.slides.map((slide) => ({ ...slide, blocks: [{ type: 'image', src: 'https://cdn.example.test/image.png', alt: 'network image' }] })) }), /external asset/);
assert.throws(() => normalizeSpec({ ...EXAMPLE_SPEC, slides: EXAMPLE_SPEC.slides.map((slide) => ({ ...slide, bodyHtml: '<img src="https://cdn.example.test/image.png" alt="network image">' })) }), /external asset/);
assert.throws(() => normalizeSpec({ ...EXAMPLE_SPEC, slides: EXAMPLE_SPEC.slides.map((slide) => ({ ...slide, bodyHtml: '<img src=https://cdn.example.test/image.png alt="network image">' })) }), /external asset/);
assert.throws(() => normalizeSpec({ ...EXAMPLE_SPEC, theme: { ...EXAMPLE_SPEC.theme, font: 'url(https://cdn.example.test/font.woff2)' } }), /external URL/);

const external = generatePresentation({
  ...EXAMPLE_SPEC,
  allowExternalAssets: true,
  slides: EXAMPLE_SPEC.slides.map((slide) => ({
    ...slide,
    blocks: [{ type: 'image', src: 'https://cdn.example.test/image.png', alt: 'network image' }],
  })),
});
assert.match(external, /presentation-asset-policy" content="external-allowed"/);
assert.match(external, /data-asset-policy="external-allowed">Network assets enabled/);
assert.match(external, /https:\/\/cdn\.example\.test\/image\.png/);

// TC-PD-062 (key states, spec §6.4) — guards web-runtime contract §3: on a slide taller than the screen,
// ArrowDown/ArrowUp/Space/PageDown/PageUp scroll it first and change slide only at the SLIDE's edge in that
// direction; page chrome below the slide never counts as slide content; a held key stops at the edge;
// ArrowLeft/ArrowRight/Home/End always change slide; a page step never skips content hidden under the sticky
// toolbar; every slide change except a backward scroll-key crossing opens the new slide at its top; with focus
// in the notes panel the scroll keys never move the page or the slide; while the overview is open no deck key
// does, and Escape closes the overview only when it is open; Shift+Space reads backward; Space and Enter on a
// focused control activate it instead of moving the deck. Runs the
// EMITTED helpers, showSlide and keydown handler against a fake page layout (sticky toolbar, slide, chrome
// below it, notes panel, overview), so no browser is needed.
{
  // Given the emitted scroll helpers and keydown handler, loaded exactly as the browser receives them
  const emittedHelpers = /const SCROLL_FIRST_KEYS = \[[\s\S]*?\n {8}function scrollStep\(area, key, direction\) \{[\s\S]*?\n {8}\}/.exec(html);
  const emittedKeydown = /document\.addEventListener\('keydown', \(event\) => \{[\s\S]*?\n {8}\}\);/.exec(html);
  const emittedShowSlide = /\n {8}function showSlide\(rawIndex, announceChange = true\) \{[\s\S]*?\n {8}\}/.exec(html);
  const emittedOverview = /\n {8}function openOverview\(\) \{[\s\S]*?\n {8}\}\n\n {8}function closeOverview\(\) \{[\s\S]*?\n {8}\}/.exec(html);
  assert.ok(emittedHelpers && emittedKeydown && emittedShowSlide && emittedOverview, 'generated runtime defines the scroll-first keys, scrollStep, showSlide, openOverview/closeOverview and the keydown handler');
  assert.match(html, /case 'next': showSlide\(currentIndex \+ 1\)/, 'the Next button changes slide through showSlide');
  assert.match(html, /case 'previous': showSlide\(currentIndex - 1\)/, 'the Previous button changes slide through showSlide');
  assert.match(html, /if \(overviewButton\) \{ showSlide\(/, 'an overview jump changes slide through showSlide');
  assert.match(emittedKeydown[0], /SCROLL_FIRST_KEYS\.includes\(key\)[\s\S]*scrollStep\(area, key, direction\)[\s\S]*area\.scrollBy\(0, step\)/, 'the keydown handler scrolls before it changes slide');
  assert.match(html, /document\.scrollingElement \|\| document\.documentElement/, 'the scroll area is the page, which is what scrolls in the generated layout');

  // A focused element as the keydown handler sees it. closest() tests the element itself against a selector
  // list of `tag` or `tag[attribute]` parts, which is all the handler asks of a key target.
  const focusTarget = (tagName, extras = {}) => ({
    tagName,
    isContentEditable: false,
    ...extras,
    closest(selectorList) {
      const matches = selectorList.split(',').some((part) => {
        const [, tag, attribute] = /^\s*([a-z]+)(?:\[([a-z-]+)\])?\s*$/i.exec(part) || [];
        return Boolean(tag) && tag.toUpperCase() === this.tagName && (!attribute || this[attribute] !== undefined);
      });
      return matches ? this : null;
    },
  });

  // A page of `viewport` px: a sticky toolbar `toolbar` px tall, the active slide starting `slideTop` px down
  // the document and `heights[index]` px tall, then `below` px of chrome (progress row, status bar).
  // `pageHeight` overrides the page's scrollable height; `overviewOpen` opens the overview dialog;
  // `overviewHidden` starts the shut dialog with [hidden] (as a clean export ships it); `nativeDialog: false`
  // models a browser without showModal; `notesOpen` starts with the notes panel open. A key target carrying
  // `inNotesPanel: true` is an element inside the notes panel.
  const harness = ({ heights, scrollTop = 0, viewport = 500, toolbar = 60, slideTop = 80, below = 20, pageHeight = null, overviewOpen = false, overviewHidden = false, nativeDialog = true, notesOpen = false }, startIndex = 1) => {
    const calls = [];
    const context = {
      // Built in this realm, so deepEqual compares plain arrays rather than the vm realm's.
      record: (kind, value) => calls.push([kind, value]),
      layout: { heights, scrollTop, viewport, toolbar, slideTop, below, pageHeight },
      overviewOpen,
      overviewHidden,
      nativeDialog,
      notesOpen,
      startIndex,
    };
    const handler = new vm.Script(`
      let currentIndex = startIndex;
      const element = () => ({ classList: { toggle() {} }, setAttribute() {}, style: {}, querySelectorAll: () => [] });
      const slides = layout.heights.map(() => element());
      const progressText = element();
      const progressBar = element();
      const overviewGrid = element();
      const history = { replaceState() {} };
      function currentSlide() { return slides[currentIndex]; }
      function titleOf() { return 'Slide'; }
      function renderNotes() {}
      function announce() {}
      const area = {
        scrollTop: layout.scrollTop,
        clientHeight: layout.viewport,
        get scrollHeight() { return layout.pageHeight ?? layout.slideTop + layout.heights[currentIndex] + layout.below; },
        scrollBy(x, y) { this.scrollTop += y; record('scroll', y); },
      };
      const stageElement = { getBoundingClientRect() {
        const top = layout.slideTop - area.scrollTop;
        return { top, bottom: top + layout.heights[currentIndex] };
      } };
      const toolbarElement = { getBoundingClientRect() { return { top: 0, bottom: layout.toolbar }; } };
      let keydown = null;
      const document = {
        scrollingElement: area,
        documentElement: area,
        activeElement: { focus() {} },
        getElementById(id) { return id === 'deck' ? stageElement : null; },
        querySelector(selector) { return selector === '.toolbar' ? toolbarElement : null; },
        addEventListener(type, listener) { if (type === 'keydown') keydown = listener; },
      };
      overviewGrid.querySelector = () => ({ focus() {} });
      // The <dialog> as the generated markup ships it: shut, with no [hidden] attribute. Like a browser,
      // showModal throws on a dialog that is already open, and a modal that is [hidden] stays invisible.
      const overview = {
        open: overviewOpen,
        openAttribute: overviewOpen,
        hidden: overviewHidden,
        clientHeight: 400,
        hasAttribute(name) { return name === 'open' && this.openAttribute; },
        setAttribute(name) { if (name === 'open') this.openAttribute = true; },
        removeAttribute(name) { if (name === 'open') this.openAttribute = false; },
        scrollBy(x, y) { record('overview-scroll', y); },
      };
      if (nativeDialog) {
        overview.showModal = function showModal() {
          if (this.open) throw new Error('InvalidStateError: the dialog is already open');
          this.open = true; this.openAttribute = true;
        };
        overview.close = function close() { this.open = false; this.openAttribute = false; };
      } else {
        overview.open = undefined;
      }
      let overviewOpener = null;
      const notesPanel = { contains: (node) => Boolean(node && node.inNotesPanel) };
      let notesOn = notesOpen;
      let editing = false;
      let fullscreen = false;
      function setNotes(open) { notesOn = Boolean(open); record('notes', notesOn); }
      function setEditing(on) { editing = Boolean(on); record('editing', editing); }
      function toggleFullscreen() { fullscreen = !fullscreen; record('fullscreen', fullscreen); }
      ${emittedHelpers[0]}
      ${emittedShowSlide[0]}
      ${emittedOverview[0]}
      ${emittedKeydown[0]}
      // Record each slide change around the emitted showSlide, which the handlers call by name.
      const emittedShow = showSlide;
      showSlide = (index, announceChange) => { emittedShow(index, announceChange); record('slide', currentIndex); };
      ({ press(key, { target = focusTarget('BODY'), repeat = false, shiftKey = false } = {}) {
        const event = { key, target, repeat, shiftKey, prevented: false, preventDefault() { this.prevented = true; } };
        keydown(event);
        return event;
      }, show: (index) => showSlide(index), index: () => currentIndex, scrollTop: () => area.scrollTop,
      state: () => JSON.stringify({ index: currentIndex, notes: notesOn, editing, fullscreen, overviewOpen: overviewIsOpen(), overviewHidden: overview.hidden }) });
    `).runInNewContext({ ...context, focusTarget });
    return { ...handler, calls, state: () => JSON.parse(handler.state()) };
  };
  // A slide taller than the screen: its bottom sits 480px below the viewport bottom at scrollTop 0.
  const tall = { heights: [900, 900, 900] };

  // When a down key is pressed on a slide that still has content below the viewport
  // Then the page scrolls and the slide stays; a line key scrolls a line, a page key most of the band visible
  // below the toolbar (85% of 500 - 60)
  for (const [key, expected] of [['ArrowDown', 40], ['PageDown', 374], [' ', 374]]) {
    const deck = harness({ ...tall });
    const event = deck.press(key);
    assert.equal(event.prevented, true, `${JSON.stringify(key)} is handled by the deck`);
    assert.deepEqual(deck.calls, [['scroll', expected]], `${JSON.stringify(key)} scrolls ${expected}px before changing slide`);
    assert.equal(deck.index(), 1, `${JSON.stringify(key)} keeps the slide while it can scroll`);
  }
  // And the last step stops exactly at the slide's end, never into the chrome below it
  {
    const deck = harness({ ...tall, scrollTop: 460 });
    deck.press('PageDown');
    assert.deepEqual(deck.calls, [['scroll', 20]]);
  }

  // When a down key is pressed with the slide's end in view (a sub-pixel remainder counts as the edge),
  // even though the chrome below the slide still lets the page scroll further
  // Then the deck moves to the next slide and shows it from its top
  for (const scrollTop of [480, 479.5]) {
    const deck = harness({ ...tall, scrollTop });
    deck.press('ArrowDown');
    assert.deepEqual(deck.calls, [['slide', 2]], `at scrollTop ${scrollTop} ArrowDown changes slide`);
    assert.equal(deck.scrollTop(), 0, 'the next slide starts at its top');
  }

  // When an up key is pressed: mid-slide it scrolls up until the slide top clears the toolbar;
  // at the top edge it moves back and lands with the previous slide's end at the viewport bottom
  {
    const middle = harness({ ...tall, scrollTop: 300 });
    middle.press('ArrowUp');
    middle.press('PageUp');
    assert.deepEqual(middle.calls, [['scroll', -40], ['scroll', -240]]);
    assert.equal(middle.index(), 1);
    const top = harness({ ...tall });
    top.press('PageUp');
    assert.deepEqual(top.calls, [['slide', 0]]);
    assert.equal(top.scrollTop(), 480, 'going back lands at the end of the previous slide');
  }

  // Given slides that fit the screen while the chrome below them makes the PAGE overflow by 100px
  // When a down key and then an up key are pressed
  // Then each single press changes slide, and nothing scrolls — the chrome is not slide content
  for (const [down, up] of [['PageDown', 'PageUp'], ['ArrowDown', 'ArrowUp'], [' ', 'PageUp']]) {
    const deck = harness({ heights: [400, 400, 400], below: 120 });
    deck.press(down);
    assert.deepEqual(deck.calls, [['slide', 2]], `one ${JSON.stringify(down)} press advances a fitting slide`);
    deck.press(up);
    assert.deepEqual(deck.calls, [['slide', 2], ['slide', 1]], `one ${up} press goes back from a fitting slide`);
    assert.equal(deck.scrollTop(), 0, 'a fitting slide reached by going back is shown from its top');
  }

  // Given a tall slide followed by one that fits
  // When PageDown is pressed repeatedly
  // Then the tall slide scrolls to its end, the next press advances, and the fitting slide needs one press
  {
    const deck = harness({ heights: [400, 900, 400, 400], below: 120 });
    for (let press = 0; press < 4; press += 1) deck.press('PageDown');
    assert.deepEqual(deck.calls, [['scroll', 374], ['scroll', 106], ['slide', 2], ['slide', 3]]);
  }

  // When a scroll key is held down (auto-repeat)
  // Then it keeps scrolling inside the slide but stops at the slide's edge instead of running through the deck
  {
    const deck = harness({ ...tall, scrollTop: 440 });
    deck.press('ArrowDown', { repeat: true });
    const atEdge = deck.press('ArrowDown', { repeat: true });
    assert.deepEqual(deck.calls, [['scroll', 40]], 'a held key scrolls, then stops at the edge');
    assert.equal(atEdge.prevented, true, 'the held key at the edge is still handled by the deck');
    deck.press('ArrowDown');
    assert.deepEqual(deck.calls, [['scroll', 40], ['slide', 2]], 'a fresh press at the edge changes slide');
  }

  // Given an overflowing slide scrolled part-way down (its title is above the toolbar, out of view)
  // When ArrowLeft, ArrowRight, Home or End is pressed
  // Then the slide always changes, with no scroll step, and the new slide opens at its top, title in view
  for (const [key, expectedIndex] of [['ArrowRight', 2], ['ArrowLeft', 0], ['Home', 0], ['End', 2]]) {
    const deck = harness({ ...tall, scrollTop: 200 });
    const event = deck.press(key);
    assert.equal(event.prevented, true);
    assert.deepEqual(deck.calls, [['slide', expectedIndex]], `${key} changes slide without a scroll step`);
    assert.equal(deck.scrollTop(), 0, `${key} opens the new slide at its top`);
  }
  // When the Next or Previous button or an overview card changes slide (each calls showSlide directly)
  // Then the new slide also opens at its top
  for (const [label, target] of [['Next', 2], ['Previous', 0], ['overview card', 0]]) {
    const deck = harness({ ...tall, scrollTop: 200 });
    deck.show(target);
    assert.deepEqual(deck.calls, [['slide', target]]);
    assert.equal(deck.scrollTop(), 0, `${label} opens the new slide at its top`);
  }
  // When a change request leaves the slide unchanged (Next on the last slide)
  // Then the reading position is kept — there was no slide change to reset for
  {
    const deck = harness({ ...tall, scrollTop: 200 }, 2);
    deck.show(3);
    assert.equal(deck.scrollTop(), 200, 'no slide change, no jump to the top');
  }

  // Given a zoomed-in page: a 120px sticky toolbar in a 360px window leaves a 240px band for the slide
  // When PageDown or Space pages down through a 1200px slide, or PageUp pages up from its end
  // Then no step exceeds the visible band, and each view overlaps or touches the previous one, so every
  // line of the slide is shown at least once
  for (const [key, startTop] of [['PageDown', 0], [' ', 0], ['PageUp', 1000]]) {
    const zoomed = { heights: [1200, 1200, 1200], viewport: 360, toolbar: 120, slideTop: 140, below: 20 };
    const band = zoomed.viewport - zoomed.toolbar;
    const deck = harness({ ...zoomed, scrollTop: startTop });
    const view = () => [deck.scrollTop() + zoomed.toolbar, deck.scrollTop() + zoomed.viewport];
    const views = [view()];
    for (let press = 0; press < 20 && deck.index() === 1; press += 1) {
      deck.press(key);
      if (deck.index() === 1) views.push(view());
    }
    const steps = deck.calls.filter(([kind]) => kind === 'scroll').map(([, value]) => value);
    assert.ok(steps.length >= 4, `${JSON.stringify(key)} pages through the slide in several steps`);
    for (const step of steps) assert.ok(Math.abs(step) <= band, `${JSON.stringify(key)} step ${step}px fits the ${band}px visible band`);
    views.sort((a, b) => a[0] - b[0]);
    for (let index = 1; index < views.length; index += 1) {
      assert.ok(views[index][0] <= views[index - 1][1], `${JSON.stringify(key)} view ${index} overlaps or touches the previous one, so no content is skipped`);
    }
    const slideStart = zoomed.slideTop;
    const slideEnd = zoomed.slideTop + zoomed.heights[1];
    assert.ok(views[0][0] <= slideStart && views[views.length - 1][1] >= slideEnd, `${JSON.stringify(key)} shows the slide from its top to its end`);
  }

  // When the last slide is at its bottom edge and a down key is pressed
  // Then nothing moves: no slide past the end, no jump back to the top
  {
    const deck = harness({ ...tall, scrollTop: 480 }, 2);
    deck.press('ArrowDown');
    assert.deepEqual(deck.calls, [['slide', 2]]);
    assert.equal(deck.scrollTop(), 480);
  }

  // When the user is typing in an editable element
  // Then the keys are left to the editor: no scroll, no slide change, default not prevented
  {
    const deck = harness({ ...tall });
    const event = deck.press('ArrowDown', { target: { tagName: 'DIV', isContentEditable: true } });
    assert.deepEqual(deck.calls, []);
    assert.equal(event.prevented, false);
  }

  // When the slide's end is 2px below the viewport — just above the 1px edge tolerance — and ArrowDown is pressed
  // Then the page scrolls exactly the remaining 2px and the slide stays: only a sub-pixel remainder counts as the edge
  {
    const deck = harness({ ...tall, scrollTop: 478 });
    deck.press('ArrowDown');
    assert.deepEqual(deck.calls, [['scroll', 2]], 'a 2px remainder is scrolled, not treated as the slide edge');
    assert.equal(deck.index(), 1);
  }

  // Given the first slide shown from its top
  // When an up key is pressed
  // Then nothing moves: no slide before the first, and no jump to the first slide's end
  for (const key of ['PageUp', 'ArrowUp']) {
    const deck = harness({ ...tall }, 0);
    deck.press(key);
    assert.deepEqual(deck.calls, [['slide', 0]], `${key} on the first slide stays on it`);
    assert.equal(deck.scrollTop(), 0, `${key} on the first slide keeps it at its top`);
  }

  // Given a page that can scroll less than the slide still overflows (the page ends 80px before the slide's end)
  // When ArrowDown is pressed near the page's end, then again at it
  // Then the deck scrolls only what the page can scroll, and the next press changes slide instead of pressing
  // against a page that cannot move
  {
    const deck = harness({ ...tall, pageHeight: 900, scrollTop: 380 });
    deck.press('ArrowDown');
    deck.press('ArrowDown');
    assert.deepEqual(deck.calls, [['scroll', 20], ['slide', 2]]);
  }

  // Given keyboard focus inside the notes panel (at narrow widths the panel covers the slide)
  // When a scroll key is pressed mid-slide or at the slide's edge
  // Then the browser keeps the key to scroll the notes: default not prevented, no page scroll, no slide change
  for (const scrollTop of [200, 480]) {
    for (const key of ['ArrowDown', 'PageDown', ' ', 'ArrowUp', 'PageUp']) {
      const deck = harness({ ...tall, scrollTop });
      const event = deck.press(key, { target: { tagName: 'DIV', isContentEditable: false, inNotesPanel: true } });
      assert.equal(event.prevented, false, `${JSON.stringify(key)} in the notes is left to the browser`);
      assert.deepEqual(deck.calls, [], `${JSON.stringify(key)} in the notes moves neither the page nor the slide`);
      assert.equal(deck.index(), 1);
      assert.equal(deck.scrollTop(), scrollTop);
    }
  }

  // Given the overview open over a slide scrolled mid-way or to its edge
  // When a scroll key is pressed in the overview
  // Then the overview's card list scrolls; the page behind it and the slide stay put
  for (const scrollTop of [200, 480]) {
    for (const [key, expected] of [['ArrowDown', 40], ['PageDown', 340], [' ', 340], ['ArrowUp', -40], ['PageUp', -340]]) {
      const deck = harness({ ...tall, scrollTop, overviewOpen: true });
      const event = deck.press(key, { target: focusTarget('DIALOG') });
      assert.equal(event.prevented, true, `${JSON.stringify(key)} in the overview never reaches the page`);
      assert.deepEqual(deck.calls, [['overview-scroll', expected]], `${JSON.stringify(key)} scrolls the overview only`);
      assert.equal(deck.index(), 1);
      assert.equal(deck.scrollTop(), scrollTop);
    }
  }
  // And Space on a focused overview button is left to the browser, which activates that card or Close
  {
    const deck = harness({ ...tall, scrollTop: 480, overviewOpen: true });
    const event = deck.press(' ', { target: focusTarget('BUTTON') });
    assert.equal(event.prevented, false);
    assert.deepEqual(deck.calls, []);
    assert.equal(deck.scrollTop(), 480);
  }

  // Given the overview open over a slide scrolled part-way (spec §6.4: the overview holds the keys)
  // When any other deck key is pressed — slide keys, the notes/edit/overview/full-screen shortcuts
  // Then the deck behind it does nothing: same slide and scroll, notes, edit mode and full screen unchanged,
  // and the overview stays open and visible
  for (const key of ['ArrowLeft', 'ArrowRight', 'Home', 'End', 'n', 'N', 'e', 'o', 'f']) {
    const deck = harness({ ...tall, scrollTop: 200, overviewOpen: true });
    const before = deck.state();
    deck.press(key, { target: focusTarget('DIALOG') });
    assert.deepEqual(deck.calls, [], `${key} with the overview open reaches no deck action`);
    assert.deepEqual(deck.state(), before, `${key} with the overview open changes neither slide, notes, edit mode, full screen nor the overview`);
    assert.equal(deck.scrollTop(), 200, `${key} with the overview open leaves the page behind it where it was`);
  }
  // And the overview's cards stay keyboard-usable: Tab moves focus and Enter picks a card, both left to the browser
  for (const [key, target] of [['Tab', focusTarget('BUTTON')], ['Enter', focusTarget('BUTTON')]]) {
    const deck = harness({ ...tall, scrollTop: 200, overviewOpen: true });
    const event = deck.press(key, { target });
    assert.equal(event.prevented, false, `${key} on an overview card is left to the browser`);
    assert.deepEqual(deck.calls, []);
  }

  // Given nothing but the notes open — the overview dialog shut, as shipped, with no [hidden] attribute
  // When Escape is pressed once
  // Then that press closes the notes, and the shut overview is left untouched (not hidden, still shut)
  {
    const deck = harness({ ...tall, notesOpen: true });
    const event = deck.press('Escape');
    assert.equal(event.prevented, true);
    assert.deepEqual(deck.calls, [['notes', false]], 'the first Escape closes the open notes');
    assert.equal(deck.state().overviewHidden, false, 'Escape with the overview shut never hides the dialog');
    assert.equal(deck.state().overviewOpen, false);
  }

  // Given nothing open
  // When Escape and then O are pressed
  // Then the overview opens visible: an earlier Escape never leaves the dialog [hidden] for the next showModal
  {
    const deck = harness({ ...tall });
    deck.press('Escape');
    deck.press('o');
    assert.equal(deck.state().overviewOpen, true, 'Escape then O opens the overview');
    assert.equal(deck.state().overviewHidden, false, 'the opened overview is not [hidden]');
  }
  // Given a shut overview that carries [hidden] (a clean export ships it that way), with and without showModal
  // When O opens it, Escape closes it, and O opens it again
  // Then every open shows a visible dialog, and Escape closes it
  for (const nativeDialog of [true, false]) {
    const deck = harness({ ...tall, overviewHidden: true, nativeDialog });
    deck.press('o');
    assert.equal(deck.state().overviewOpen, true, `nativeDialog=${nativeDialog}: O opens the overview`);
    assert.equal(deck.state().overviewHidden, false, `nativeDialog=${nativeDialog}: a hidden overview is shown when opened`);
    deck.press('Escape');
    assert.equal(deck.state().overviewOpen, false, `nativeDialog=${nativeDialog}: Escape closes the overview`);
    deck.press('o');
    assert.equal(deck.state().overviewOpen, true, `nativeDialog=${nativeDialog}: O reopens the overview`);
    assert.equal(deck.state().overviewHidden, false, `nativeDialog=${nativeDialog}: the reopened overview is visible`);
  }

  // When Shift+Space is pressed: mid-slide it scrolls up a page, at the slide top it goes back and lands at
  // the previous slide's end; in the open overview it scrolls the card list up
  // Then Shift+Space always reads backward, like a browser page and the review deck
  {
    const middle = harness({ ...tall, scrollTop: 300 });
    const event = middle.press(' ', { shiftKey: true });
    assert.equal(event.prevented, true);
    assert.deepEqual(middle.calls, [['scroll', -280]], 'Shift+Space mid-slide scrolls up, never down');
    assert.equal(middle.index(), 1);
    const top = harness({ ...tall });
    top.press(' ', { shiftKey: true });
    assert.deepEqual(top.calls, [['slide', 0]], 'Shift+Space at the slide top goes back a slide');
    assert.equal(top.scrollTop(), 480, 'Shift+Space going back lands at the end of the previous slide');
    const inOverview = harness({ ...tall, overviewOpen: true });
    inOverview.press(' ', { shiftKey: true, target: focusTarget('DIALOG') });
    assert.deepEqual(inOverview.calls, [['overview-scroll', -340]], 'Shift+Space scrolls the overview up');
  }

  // Given a toolbar control (or link, or disclosure) focused, on a slide mid-way and at its edge
  // When Space or Enter is pressed
  // Then the browser activates that control: the deck neither scrolls nor changes slide nor prevents the key
  for (const scrollTop of [200, 480]) {
    for (const [key, target] of [[' ', focusTarget('BUTTON')], ['Enter', focusTarget('BUTTON')], [' ', focusTarget('A', { href: '#slide-2' })], [' ', focusTarget('SUMMARY')]]) {
      const deck = harness({ ...tall, scrollTop });
      const event = deck.press(key, { target });
      assert.equal(event.prevented, false, `${JSON.stringify(key)} on a focused ${target.tagName} is left to the browser to activate it`);
      assert.deepEqual(deck.calls, [], `${JSON.stringify(key)} on a focused ${target.tagName} moves neither the page nor the slide`);
      assert.equal(deck.index(), 1);
      assert.equal(deck.scrollTop(), scrollTop);
    }
  }
  // And Space on a plain focused element (a link without href is not a control) still scrolls the slide
  {
    const deck = harness({ ...tall });
    deck.press(' ', { target: focusTarget('A') });
    assert.deepEqual(deck.calls, [['scroll', 374]], 'Space on a non-control still reads the slide forward');
  }
}

// TC-PD-011: a developer always learns when a deck fell back to the default look instead of the design plan's
// look (BR-PD-09, SOFT) — the warning never stops the build, and a chosen look never triggers it.
{
  const expectedWarning = 'Warning: no usable theme supplied — the default look was used; set "theme" from your design plan.';
  const scriptPath = path.resolve(__dirname, '../scripts/create-presentation.cjs');
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'create-presentation-look-'));
  try {
    // Given two deck descriptions identical except for the chosen look
    const noThemeSpec = { ...EXAMPLE_SPEC };
    delete noThemeSpec.theme;
    const themedSpec = { ...EXAMPLE_SPEC, theme: { accent: '#7a2e1d', displayFont: 'Iowan Old Style, serif' } };
    const noThemePath = path.join(tempRoot, 'no-theme.json');
    const themedPath = path.join(tempRoot, 'themed.json');
    fs.writeFileSync(noThemePath, JSON.stringify(noThemeSpec), 'utf8');
    fs.writeFileSync(themedPath, JSON.stringify(themedSpec), 'utf8');

    // When both are built through the generator's normal entry point, with its output channels captured
    const runMain = (inputPath, outputPath) => {
      const stderr = [];
      const stdout = [];
      const originalError = console.error;
      const originalLog = console.log;
      console.error = (...parts) => stderr.push(parts.join(' '));
      console.log = (...parts) => stdout.push(parts.join(' '));
      try {
        return { code: main([inputPath, outputPath]), stderr, stdout };
      } finally {
        console.error = originalError;
        console.log = originalLog;
      }
    };
    const noThemeOut = path.join(tempRoot, 'no-theme.html');
    const themedOut = path.join(tempRoot, 'themed.html');
    const noThemeRun = runMain(noThemePath, noThemeOut);
    const themedRun = runMain(themedPath, themedOut);

    // Then both decks are built with the unchanged success exit code
    assert.equal(noThemeRun.code, 0, 'a deck with no chosen look still builds');
    assert.equal(themedRun.code, 0, 'a deck with a chosen look builds');
    assert.ok(fs.statSync(noThemeOut).size > 0, 'the no-theme deck is written');
    assert.ok(fs.statSync(themedOut).size > 0, 'the themed deck is written');
    assert.match(noThemeRun.stdout.join('\n'), /^Created /, 'stdout keeps the parseable result line');
    // And only the no-theme run tells the developer the default look was used, on stderr only
    assert.deepEqual(noThemeRun.stderr, [expectedWarning]);
    assert.deepEqual(themedRun.stderr, []);
    assert.equal(noThemeRun.stdout.some((line) => line.includes('default look')), false, 'the warning stays off stdout');

    // And a theme holding no key the renderer would keep counts as no chosen look
    for (const theme of [undefined, null, {}, { accent: '' }, { accent: '   ' }, { unknownKey: '#123456' }, { accent: 'red; }' }]) {
      assert.equal(defaultLookWarning({ theme }), expectedWarning, `theme ${JSON.stringify(theme)} counts as the default look`);
    }
    assert.equal(defaultLookWarning({ theme: { accent: '#123456' } }), null, 'one usable key is a chosen look');

    // And the real CLI boundary behaves the same: warning on stderr, exit code 0. The child gets only the OS
    // essentials (the same allow-list as the html-export tests' allowlistEnv) with home and every temp key at
    // the fixture dir, so no switch or provider key from the developer's machine reaches it.
    const childEnv = {};
    for (const [name, value] of Object.entries(process.env)) {
      if (CHILD_ENV_ALLOWLIST.has(name.toUpperCase())) childEnv[name] = value;
    }
    for (const name of ['HOME', 'USERPROFILE', 'TMPDIR', 'TEMP', 'TMP']) childEnv[name] = tempRoot;
    const cli = spawnSync(process.execPath, [scriptPath, noThemePath, path.join(tempRoot, 'cli.html')], { cwd: tempRoot, encoding: 'utf8', env: childEnv });
    assert.equal(cli.status, 0, `CLI exits 0: ${cli.stderr}`);
    assert.equal(cli.stderr.trim(), expectedWarning);
    assert.match(cli.stdout, /^Created /);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

console.log('create-presentation tests passed');
