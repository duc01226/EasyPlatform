'use strict';

const path = require('node:path');

// Windows device names: reserved as a file name on their own and before any extension
// (`CON`, `nul.txt`, `COM1.pdf`), case-insensitively.
const RESERVED_WINDOWS_NAME = /^(?:con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])(?=\.|$)/i;

// One rule for turning an input path into an output file-name stem, shared by the dispatcher's
// default output folder and the targets' output names (png and video use fileStem; pdf strips
// only .html/.txt before safeBasename, so an order file keeps its own extension in the name).
// Windows-reserved characters and control characters become `_`; trailing dots/spaces (invalid
// on Windows) are dropped; a Windows device name gets a `_` suffix (`CON.html` -> `CON_.html`);
// a name left empty becomes `fallback`. Applied on every OS, so one input names its outputs the
// same way everywhere. The one exception is a backslash: a path separator on Windows (so only the
// last segment is kept), an ordinary name character elsewhere (so it becomes `_`).
function safeBasename(input, fallback = 'input') {
  const value = path.basename(String(input || fallback))
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/[. ]+$/g, '')
    .replace(RESERVED_WINDOWS_NAME, '$&_');
  return value || fallback;
}

// The file name without its last extension, made safe by safeBasename.
function fileStem(file, fallback = 'input') {
  const base = path.basename(String(file || ''));
  return safeBasename(base.slice(0, base.length - path.extname(base).length), fallback);
}

// The one input-acceptance rule for every target: an HTML input is a file whose extension is
// .html or .htm, in any letter case. The dispatcher applies it to positional inputs and the pdf
// target to every `--order` entry.
const HTML_INPUT_EXTENSIONS = Object.freeze(['.html', '.htm']);

function isHtmlFileName(file) {
  return HTML_INPUT_EXTENSIONS.includes(path.extname(String(file || '')).toLowerCase());
}

module.exports = { safeBasename, fileStem, isHtmlFileName };
