# Verifying an HTML render with `--to=png`

Read this before you use a `--to=png` run as evidence that a page renders. To an agent, a blank page or an error overlay looks exactly like success: the command finished and a PNG file exists. The png target exists to turn those two invisible failures into an exit code.

<!-- SKILL-NAV:START -->
## Contents

- [Rule 0](#rule-0)
- [Exit codes](#exit-codes)
- [What exit 0 proves, and what it does not](#what-exit-0-proves-and-what-it-does-not)
- [report.json](#reportjson)
- [Failure signatures](#failure-signatures)
- [Default viewports](#default-viewports)
- [Slides and screens by producer](#slides-and-screens-by-producer)
- [Self-check](#self-check)
- [Known limits of the evidence](#known-limits-of-the-evidence)

<!-- SKILL-NAV:END -->

## Rule 0

**Read the exit code first, then open the PNGs. Never claim a render works because a file was written.** A PNG always gets written, even for a blank or broken page. Only exit `0` plus your own look at the image count as evidence, and only for the scope below.

## Exit codes

| Exit | Meaning for `--to=png` | What to do |
|---|---|---|
| `0` | Every step ran, every capture has visible content and the page raised no errors (or `--allow-errors` was given and only errors occurred) | Use as evidence, within the scope below |
| `1` | Tool fault only, never the page: the browser could not launch or did not start in time (a dependency-check launch that timed out is this, not exit `3`; its message says `timed out`), a file could not be written, `--self-check` failed ("verifier broken"), or an unexpected exception (`HTML_EXPORT_DEBUG=1` prints its stack). Every logged failure has `pageFault: false`, and there is no page error or blank capture | Quote stderr and mark the render `NOT VERIFIABLE`. It is not a design defect and not a pass |
| `2` | Usage error: a missing input or one whose extension is not `.html` / `.htm` (checked before anything renders), two inputs with the same name, bad `--viewport` (malformed, or one size listed twice), `--timeout` or `--scale` not above 0, `--timeout` above 2147483647, `--page` given, `--full-page` with `--slides`, or a `--slides` selector the browser cannot parse (found once the first page is open; the run stops and `report.json` gets `usageError`) | Fix the command |
| `3` | Node.js older than 20, Playwright (1.55.1 or newer) missing, or Chromium not installed or failing to launch for any reason other than a timeout (for example a missing system library) | Mark `NOT VERIFIABLE` and point to the setup commands. Never run install commands yourself |
| `4` | At least one page error (console error or uncaught exception), blank capture, or page-caused failure in `failures[]` (`pageFault: true`), even when nothing was captured | Fix the page and run again. `report.json` names each failure |
| other | Interrupted (for example `130` after Ctrl+C); `report.json` may be missing | Treat like `1`: re-run, and mark the render `NOT VERIFIABLE` until a run exits with a verdict |

`--allow-errors` excuses page errors only. A blank capture or a page-caused failure always exits `4`.

A failure on one input, viewport or slide (page open, navigation, a timeout, a screenshot error, fonts or `window.__ready` never settling) does not stop the batch. It is recorded in `failures[]`, printed to stderr as `failed <file> <viewport> [slide N] <step>: <message> (page fault; continuing)` (or `tool fault`), and the remaining captures still run. When a page fails to open, the errors it raised before the failure (for example a script that threw and then left `window.__ready` false) still go to `errors[]` with `at: 'load'`, and what `--offline` refused goes to `blocked[]`.

Each failure carries `pageFault`. It is `true` when the page caused it: the page never loads, `window.__ready` or `document.fonts.ready` times out, navigation throws, or a call into the page hangs. `--timeout` bounds every call into the page (the ready wait, evidence collection, slide navigation), so a page that hangs becomes a logged page fault instead of a stuck run. It is `false` only for a tool fault such as a browser launch failure or a write error. Any page fault exits `4`, even when it left nothing captured; exit `1` means the tool, not the page, failed.

`--timeout` bounds the page, never the browser itself. Launching Chromium, creating its context and page, the `--offline` route and closing the browser each get `max(--timeout, 30000)` ms. A start call that runs over is a tool fault (`step` `open`, `pageFault: false`, message `<call> did not finish within N ms; the browser is not responding ...`). A close that runs over prints a warning, the run continues with its exit code unchanged, and the exporter then exits instead of hanging.

## What exit 0 proves, and what it does not

Exit `0` proves, for each input at each requested viewport:

1. The page loaded from disk, `document.fonts.ready` settled, and `window.__ready` became `true` when the page defines it.
2. No console error and no uncaught exception occurred from the start of loading until the last capture, including during slide navigation.
3. No step failed, so every requested capture was written.
4. Every capture region held visible text, a loaded image, an SVG or a canvas.
5. With `--slides`, every item that matched the selector was shown and captured.

Exit `0` does **not** prove:

- that the page looks right. Wrong colours, overlapping text, clipped content and a broken layout all pass. You must open the PNGs and judge them.
- anything about interaction. Clicks, form input, hover states, focus order, scrolling behaviour, timers and animations after load were never exercised. Interactive runtime checks stay `NOT VERIFIABLE` unless you test them another way.
- anything below the first screen. Each PNG is one viewport, not the full page height. `--full-page` adds a `<name>@<WxH>-full.png` of the whole scrollable document with its own blank check (it cannot be combined with `--slides`); the viewport capture and its check are unchanged, so a page whose first screen is empty still exits `4`.
- behaviour at viewports you did not request, or in browsers other than Chromium.
- that remote assets load. Under `--offline` they are blocked by design (see below). Without `--offline` a slow or missing remote asset can still show as a gap in the image.

## report.json

`<out>/report.json` is written on every run that reaches rendering, including failing ones and a run stopped by an unparsable `--slides` selector. It is rewritten by each run, but earlier PNGs are never deleted: when you re-run into the same `--out`, only the PNGs listed in `files[]` belong to this run, and a PNG outside that list (for example a slide that no longer exists) is stale.

| Field | Content |
|---|---|
| `ok`, `exitCode` | The verdict and the exit code the run returned |
| `target`, `inputs`, `viewports`, `slides`, `allowErrors`, `offline` | The run's settings: absolute input paths, viewport labels, the slide selector (or `null`) and the two switches |
| `fullPage` | `true` when `--full-page` was given |
| `files[]` | One entry per PNG: `input`, `viewport`, `slide` (1-based, or `null`), `fullPage` (`true` for a `-full.png`), `path`, `bytes`, `evidence` |
| `errors[]` | Page errors: `input`, `viewport`, `type` (`console` or `pageerror`), `text`, `location` when known, and `at` (`load` or the slide step such as `s03` during which it happened) |
| `blank[]` | Blank captures, each with the `files[]` fields plus a `reason` |
| `failures[]` | Steps that could not run: `input`, `viewport`, `slide` (or `null`), `step` (`open`, `capture`, `capture-full-page`, `navigate`, `slide` or `close`), `message`, and `pageFault` (`true` when the page caused it, `false` for a tool fault) |
| `strategy` | With `--slides`: the navigation strategy used (`proto`, `keys` or `stacked`), or `mixed` when it differed across inputs or viewports. `null` without `--slides` |
| `navigation[]` | Per input and viewport: `input`, `viewport`, `selector`, `count`, `strategy`, and `fallback` (`{ from, atIndex, reason }`, `from` being `proto` or `keys`) when navigation had to switch to stacked |
| `blocked[]` | What `--offline` refused, per `input` and `viewport`: `url` (a request or a WebSocket) and `message`, the abort text Chromium logged for that request or WebSocket, or `null` when it logged none. `null` does not mean the entry is a WebSocket |
| `selfCheck` | `null`, or the known-good result when `--self-check` was given |
| `usageError` | Present only on exit `2`: the `--slides` selector the browser could not parse, and why |
| `fatal` | Present only when the tool itself hit an unexpected defect (exit `1`); page-level problems are in `failures[]` |

`report.json` contains console text copied from the page. Keep `--out` under the project `tmp/` directory, which is the default.

## Failure signatures

**Blank.** `evidence` counts what a viewer can see in the capture region: `textLen` (visible, non-whitespace text), `imgs` (loaded `<img>`, a `<video>` with a decoded frame, and elements with a `url(...)` background image), `svg` and `canvas`. The region is the viewport, or with `--slides` the current item's box clipped to the viewport, so a fixed header outside the slide cannot hide an empty slide. When all four counts are zero the capture is blank. The usual causes are a script that failed before it built the page, content that waits for an event that never fires, an item that stays `display: none`, and text rendered into a zero-size box. A PNG buffer that lacks the PNG signature or is smaller than 100 bytes is also blank. That floor only catches a truncated capture: a solid-colour frame is several kilobytes, and the DOM evidence is what catches it.

**Page error.** An entry in `errors[]`. `pageerror` is an uncaught exception or unhandled promise rejection. `console` is a `console.error` call or a resource the browser failed to load, such as a missing local image (`net::ERR_FILE_NOT_FOUND`). Read `at` to see whether it happened on load or while a given slide was shown.

**Error overlay.** A framework or dev-server error overlay is visible content, so it is **not** blank. It almost always comes with a console error or an exception, which gives exit `4`. If the page catches the error itself and only draws a message, the run can exit `0`. That is one more reason Rule 0 asks you to open the PNGs. Look for a full-screen panel, red or monospace error text, or a stack trace.

**Offline abort.** Under `--offline`, the browser is launched behind a proxy that goes nowhere, with QUIC disabled, and the page's browser context is offline. Besides the input file itself, only a local `file:` URL loads, one whose host is empty or `localhost`. Every other request, including a `file://<host>/...` URL that names another machine, and every WebSocket is refused and listed in `blocked[]`. WebTransport, speculation-rules prefetch and prerender, and service workers are blocked too, but silently: they never appear in `blocked[]`. Chromium logs `Failed to load resource: net::ERR_...` for each aborted request, located at the aborted URL, and `WebSocket connection to '<url>' failed: ... net::ERR_INTERNET_DISCONNECTED` for each refused WebSocket. Those messages are caused by `--offline`, not by the page, so they are moved from `errors[]` to `blocked[]` and do not change the exit code. Only a message of one of those two shapes whose URL the session actually blocked is moved. Everything else stays a page error, including:

- an exception the missing asset causes, for example `chartLib is not defined` after a blocked `<script src>`, or an error a WebSocket handler throws when the connection fails. The page is not self-contained, so exit `4` is correct;
- a `console.error` the page writes itself, even about a blocked URL;
- a failed local file load.

A page that renders cleanly offline, with `blocked[]` listing only decorative assets, is self-contained enough to pass.

## Default viewports

The default is `1440x900,390x844`.

- `1440x900` is a common laptop CSS viewport. It is wide enough for desktop layouts and short enough that a first screen which only fits on a tall monitor shows up as cut off.
- `390x844` is a current phone CSS viewport. It exercises the narrow breakpoint, where most wrapping, overflow and hidden-navigation defects appear.

Together they cover the two layouts most pages actually ship. Pass `--viewport=WxH[,WxH]` to add a tablet width or to match a known target. A deck built for a fixed 16:9 stage is better captured at one size such as `--viewport=1920x1080`.

## Slides and screens by producer

`--slides` drives the page's own navigation, so each PNG shows what the audience would see. The navigator uses, in this order: the page's `window.__proto.goTo`, then keyboard (`Home`, then `ArrowRight`, checking that the visible item changes after every press), then a stacked fallback that shows every item in turn. When several items match and none is visible yet (an entry animation still at opacity 0), detection waits up to one navigation step for exactly one to appear before it picks keyboard. After every `goTo` or key press the requested item must become the only visible one within that step, or navigation switches to stacked for it and every later item.

| Producer | Flag | Strategy you should see |
|---|---|---|
| presentation-builder | `--slides` (the default selector, `section.slide[data-slide-id], [data-export-slide]`) | `keys`, or `stacked` for a deck that shows all slides at once |
| feature-presentation | `--slides=section.deck__slide` (its slides also carry `slide` and `data-slide-id`, so the default `--slides` finds the same slides) | `keys` |
| work-item --mode=mockup | `--slides='[data-state]'` (quoted: brackets are a glob in zsh; double quotes in cmd.exe) | `proto`, through the mockup's `window.__proto.goTo` |

Any other page can mark its items with `data-export-slide`. A `keys` or `proto` to `stacked` switch is recorded in `navigation[].fallback`. From `keys` it usually means the key handler is missing or ignores `Home`; from `proto` it means `goTo` did not show the requested screen. The captures are still valid, but they show each item forced visible rather than through the page's own navigation.

If the selector matches nothing, the run exits `4` with a `blank[]` entry that says so. That is usually a wrong selector, not an empty page. A selector the browser cannot parse at all (for example `--slides='[[bad'`) is a usage error instead: the run stops at once with exit `2`, and `report.json` `usageError` names it.

## Self-check

`--self-check` first renders `tests/fixtures/known-good.html` at the first requested viewport, with the same `--offline`, `--scale` and `--timeout` settings, into `<out>/self-check/`. The fixture is self-contained and has text and an SVG, so a working verifier must report zero errors, no blank capture, no failed step and exactly one capture. When it does not, or when it cannot render at all, the run stops with exit `1` and `verifier broken: <reason>` before any real input is captured. The environment is wrong (browser, fonts, sandbox), so no result from that machine can be trusted. `--self-check` may be given without any input to check only the verifier.

The self-check proves the verifier does not raise false failures on a known page. It does not prove that the verifier catches real failures. The test suite covers that: `tests/to-png.test.cjs` feeds pages that throw, render nothing, or depend on a blocked script, and the suite fails when the error listener is removed from `scripts/lib/browser.cjs`.

## Known limits of the evidence

- Text drawn in the same colour as its background still counts as visible text.
- A canvas counts as content even when nothing was drawn on it.
- CSS gradients and plain background colours do not count as content.
- The values inside form controls are not counted; their labels are.
- Content inside cross-origin iframes is not inspected.

Each limit can let a wrong page exit `0`. None of them can make a good page fail. When one of them matters for the page you are checking, open the PNG.
