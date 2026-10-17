# Deck export to PDF (`--to=pdf`)

Read this when you export an HTML deck, prototype or report to PDF. Pick the mode yourself; the exporter never guesses it.

The PDF is a **derived copy**. The HTML file stays the canonical artifact (see [Why the HTML stays canonical](#why-the-html-stays-canonical)).

## The two modes

| Mode | How to select it | What it prints | Page size |
| --- | --- | --- | --- |
| **print** (default) | no `--slides` | The page's own print CSS (`@media print`), rendered with print media. The author's page breaks decide where one page ends. | `--page=WxH` in CSS pixels wins over a CSS `@page { size }` rule. Without `--page`, the CSS size applies, else Chromium's default (Letter, portrait). |
| **slides** | `--slides` or `--slides=<css>` | Each slide or screen that the shared navigator shows (the deck's own keys, a prototype `window.__proto.goTo`, or a stacked fallback). Running animations and transitions are finished first (an infinite one is cancelled), then each item is printed with **screen** media and gives one page. | The viewport, `--viewport=WxH` (default `1440x900`). `--page` is rejected in this mode. |

Both modes produce vector PDFs, so the text stays selectable and searchable.

In slides mode, each page shows only the navigated item:
- the other matched items are taken out of the layout;
- everything outside the item and its ancestors is made invisible. This includes toolbars, counters and notes panels;
- the item stays where the audience sees it, or moves to the top of the page when it would otherwise start below the first page.

Slides mode uses screen media, so print-only rules are ignored on purpose. When a page's print CSS is the version you want, use print mode.

When the navigator falls back from keys or `__proto.goTo` to stacked navigation, the exporter writes a `note:` line to stderr and records the `fallback` in `report.json`.

## Per-producer commands

Run from the project root. The commands are the same on Windows, macOS and Linux.

| Producer | Command | Why this mode |
| --- | --- | --- |
| `presentation-builder` | `node .claude/skills/html-export/scripts/export.cjs --to=pdf <deck.html> --page=1920x1080` | Its print CSS already lays out one slide per page but sets no page size. `--page` gives landscape 16:9 pages that follow the author's print rules. |
| `feature-presentation` | `node .claude/skills/html-export/scripts/export.cjs --to=pdf <deck.html> --page=1920x1080` | Its print CSS lays out one slide per page with the controls, notes panel and overview hidden and the light theme forced; a long slide flows onto the next page. `--page` gives landscape 16:9 pages. Speaker notes are not printed. |
| `feature-presentation` (slides route) | `... --to=pdf <deck.html> --slides=section.deck__slide` | Prints each slide as the audience sees it on screen, one viewport-sized page per slide. Its slides are `section.slide.deck__slide` elements driven by `ArrowRight` / `Home`, so slides mode walks them with the deck's own keys; `--slides` (the default selector) finds the same slides. |
| Anything that follows the default slide markup (`section.slide[data-slide-id]` or `[data-export-slide]`) | `... --to=pdf <file.html> --slides` | The default selector matches. |

Common options: `--out=<dir>` (default `<project>/tmp/html-export/<timestamp>-<first input file name>`), `--offline` (only local `file:` URLs load; other requests, including `file://<host>/`, and WebSockets are refused and listed in `blocked[]`; WebTransport, speculation-rules prefetch and service workers are blocked silently), `--timeout=<ms>`, `--allow-errors`.

## Several inputs and ordering

- Pass several HTML files and they are merged in the order given.
- A directory expands to its `*.html` files in **natural order**, so `slide-2.html` comes before `slide-10.html`.
- `--order=<file.txt>` replaces positional inputs:
  - it lists one HTML path per line, each an `.html` / `.htm` file (any other entry is a usage error, exit `2`);
  - blank lines and lines starting with `#` are skipped;
  - relative paths resolve against the order file's own folder;
  - passing both inputs and `--order` is a usage error.
- The result is one file, `<out>/<name>.pdf`. `<name>` is the first input's name without `.html` (a directory's own name), or the order file's name without `.txt`.

Merging uses `pdf-lib`, a skill-local dependency. It is needed only in slides mode or when several files are merged. A single print-mode file is written directly. When a merge needs `pdf-lib` and it is missing, the exporter exits `3` and prints the setup commands. It never installs anything itself.

## Log and continue

A failure on one input or slide (page open, navigation, print, a timeout) does not stop the export. It is printed to stderr as `failed <file> [slide N] (<step>): <message> (page fault; continuing)` (or `tool fault`), recorded in `report.json` `failures[]`, and the remaining inputs and slides still print. The PDF holds every page that printed. The run exits `4` when the page caused a failure, and `1` when only the tool did. When a page fails to open, the errors it raised before the failure (for example a script that threw and then left `window.__ready` false) still go to `errors[]` and to stderr as `page <type> in <input>: <text>`, and what `--offline` refused goes to `blocked[]`.

Each failure carries `pageFault`: `true` when the page caused it (it never loads, `window.__ready` or fonts time out, navigation throws, or a call into the page hangs), `false` for a tool fault such as a browser launch failure or a write error. `--timeout` bounds every call into the page, including slide navigation and the slide isolation and restore steps, so a hung page becomes a logged page fault. A page fault exits `4` even when nothing printed; then no PDF is written. Exit `1` means only the tool failed.

`--timeout` bounds the page, never the browser itself. Launching Chromium, creating its context and page, the `--offline` route and closing the browser each get `max(--timeout, 30000)` ms. A start call that runs over is a tool fault (`step` `open`, `pageFault: false`). A close that runs over prints a warning, the run continues with its exit code unchanged, and the exporter then exits instead of hanging.

A slides selector that the browser cannot parse, or that matches no element in an input, is a wrong command, not a page failure: the run stops at that input with exit `2`, writes no PDF, and records the reason in `report.json` `usageError`.

## report.json

Written to `<out>/report.json` on every run that reaches rendering, including a usage stop and a failed merge or PDF write; stdout still carries only the PDF path, and a `report: <path>` line goes to stderr. A failed run leaves an earlier PDF at the same name in place, so trust `output` (`null` when this run wrote none), never the file's presence.

| Field | Content |
| --- | --- |
| `ok`, `exitCode` | The verdict and the exit code the run returned |
| `target`, `mode`, `inputs`, `output`, `allowErrors`, `offline` | `pdf`, `print` or `slides`, the resolved input paths, the PDF path (`null` when none was written), and the two switches |
| `errors[]` | Page errors, each with its `input` |
| `failures[]` | Inputs or slides that did not print: `input`, `slide`, `step`, `message`, `pageFault` |
| `navigation[]` | Slides mode: `input`, `selector`, `count`, `strategy`, `fallback` |
| `blocked[]` | What `--offline` refused: `input` and `url` (a request or a WebSocket) |
| `usageError` | Present only on exit `2`: the slides selector that cannot be parsed or matches nothing |
| `fatal` | Present only when the merge or the PDF write failed (exit `1`): `could not write the PDF: <reason>`; `output` is then `null` |

## Exit codes

| Exit | Meaning | What to do |
| --- | --- | --- |
| `0` | PDF written with every input and slide, and no page error. stdout holds its path. | Use it. |
| `2` | Usage error. Examples: a missing input or `--order` file, a positional input that is neither a folder nor an `.html` / `.htm` file, or an `--order` entry that is not an `.html` / `.htm` file (both checked before anything renders), a bad `--page`, `--page` with `--slides`, a `--viewport` list, `--timeout` or `--scale` not above 0, `--timeout` above 2147483647, a slides selector the browser cannot parse or that matches no element (no PDF; `report.json` is still written with `usageError`). | Fix the command. |
| `3` | A dependency is missing: Node.js 20 or newer, Playwright (1.55.1 or newer), `pdf-lib`, or Chromium (not installed, or failing to launch for any reason other than a timeout). | Follow the printed setup commands. |
| `4` | The page is at fault: an input or slide failed with `pageFault: true`, or the page reported script or console errors. The PDF holds every page that printed; none is written when nothing printed. | Fix the page and re-run, or pass `--allow-errors` to accept page errors. It never excuses a failure. |
| `1` | Never the page: a tool fault (the browser could not launch or start in time, including a dependency-check launch that timed out, a file could not be written, an unexpected exception; `HTML_EXPORT_DEBUG=1` prints its stack) with no page fault and no page error, or nothing printed without any page fault. A PDF of the pages that printed is still written; none when nothing printed. A merge or PDF-write failure also exits `1`, with `report.json` `fatal` and `output: null`. | Quote stderr. Do not count it as a verdict on the deck. |
| other | Interrupted (for example `130` after Ctrl+C); `report.json` may be missing and the PDF may be absent or from an earlier run. | Treat like `1`. |

## Why the HTML stays canonical

- The HTML holds what a PDF cannot: speaker notes, edit mode, navigation, live demos, theme switching and accessibility semantics.
- A PDF is a snapshot for sharing, printing or archiving. Regenerate it from the HTML; never edit it and never treat it as the source.
- Never restructure a deck just to please the exporter. If a deck prints badly, fix its print CSS (print mode) or pick the right `--slides` selector (slides mode). The fix then helps every reader of the HTML too.
