'use strict';

// The one exit-code table for html-export. The dispatcher returns these, every target's run()
// returns one of them, and caller skills document the same rule (0 ok, 4 fix the page, 3 not
// verifiable, 1/2 tool failure), so the values live here rather than in each module.
const EXIT = Object.freeze({
  OK: 0,
  ERROR: 1,
  USAGE: 2,
  DEPENDENCY: 3,
  PAGE_ERROR: 4,
});

module.exports = { EXIT };
