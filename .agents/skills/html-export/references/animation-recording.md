# Animation recording contract (`--to=mp4` and `--to=gif`)

This is the canonical contract between an HTML animation and the html-export video recorder
(`scripts/lib/to-video.cjs`). Read it when you build a page meant to be exported as MP4 or GIF, or when
a recording comes out wrong. Other skills link here instead of restating it.

The recorder does not film the screen in real time. It stops the page's clock, moves time forward one
frame at a time, takes a PNG screenshot of each frame, and pipes the frames to ffmpeg. The same page
therefore gives the same frames on every run, on any machine.

<!-- SKILL-NAV:START -->
## Contents

- [Run it](#run-it)
- [The time rule](#the-time-rule)
- [Page hooks](#page-hooks)
- [Authoring rules for recordable pages](#authoring-rules-for-recordable-pages)
- [Output](#output)
- [Verifying a recording](#verifying-a-recording)
- [Limits](#limits)

<!-- SKILL-NAV:END -->

## Run it

```text
node .claude/skills/html-export/scripts/export.cjs --to=mp4 page.html --duration=4
node .claude/skills/html-export/scripts/export.cjs --to=gif page.html --gif-width=720
```

| Flag | Meaning | Default |
|---|---|---|
| `--fps=<1-60>` | Frames per second | 30 for MP4, 15 for GIF |
| `--duration=<seconds>` | Length of the recording in **seconds**. Wins over `window.__duration` | `window.__duration` |
| `--audio=<file>` | MP4 only. An existing local audio file muxed as AAC; `-shortest` trims to the shorter stream | none |
| `--gif-width=<px>` | GIF only. Output width; height keeps the aspect ratio | 960 |
| `--keep-frames` | Also keep every frame as `frames/frame-00000.png`, replaced only after a successful encode. An existing `frames` that is not a directory, or holds anything but the recorder's own frame files, exits 2 untouched | off |
| `--viewport=<WxH>` | One viewport; odd sizes are rounded down to even for H.264 | 1920x1080 |
| `--timeout=<ms>` | Page load and `window.__ready` wait, as for the other targets, and also the limit for every call into the page (reading `window.__duration`, the ready checks, `__seek`) and every per-frame step (`__seek`, clock advance, animation pinning, screenshot). At most 2147483647. It never bounds the browser's own start or stop, which gets `max(--timeout, 30000)` ms as for the other targets | 30000 |
| `--scale`, `--offline`, `--allow-errors`, `--out` | Generic options, as for the other targets | |

Frame count is `round(duration x fps)`, at least 1. Frame `i` shows time `round(i x 1000 / fps)` ms.

Requirements: Node.js 20 or newer, ffmpeg with the `libx264` encoder on `PATH` (or `HTML_EXPORT_FFMPEG=<absolute path to ffmpeg>`;
ffprobe via `HTML_EXPORT_FFPROBE`; a relative override path exits 3, and so does, on Windows, one that is not a `.exe` or `.com` file) plus the skill's Playwright and Chromium. Some ffmpeg builds bundled
inside other apps lack `libx264` and are rejected up front. Without the override, `ffmpeg` and `ffprobe`
are looked up only in the absolute directories listed in `PATH`, in order, and never in the current
directory (empty and relative `PATH` entries are skipped). On Windows the candidates are `ffmpeg.exe` and
`ffmpeg.com` in `PATHEXT` order; `.bat` and `.cmd` shims are not used, because they cannot start without a
shell. On macOS and Linux the file must be executable. The exporter never installs anything; when
ffmpeg is missing or unusable it exits 3 with the install command for each OS (`winget install Gyan.FFmpeg`, `brew install ffmpeg`,
`sudo apt-get install ffmpeg`).

## The time rule

Exactly one of two mechanisms drives each frame:

1. **The page defines `window.__seek(ms)`:** for each frame time `t` the recorder
   - calls `window.__seek(t)` and awaits a returned promise. While `__seek` runs, page timers and animation
     frames are paused, so the promise must not wait on `requestAnimationFrame`, `setTimeout` or
     `setInterval`: that wait never ends, and the frame stops at `--timeout` (exit 4);
   - then advances the page clock by exactly one frame (`round(1000 / fps)` ms, at least 16 ms), which runs
     the timers and `requestAnimationFrame` callbacks that are due, including a paint that `__seek`
     scheduled for the next frame;
   - then takes the screenshot. There is no animation pinning in this mode.

   `__seek` still defines the picture: render from `ms`, never from page time. Page time (`Date.now()`,
   `performance.now()`) moves by one frame per recorded frame, so a page that also runs its own
   `requestAnimationFrame` loop sees that loop run once per frame and must keep it from overwriting the
   seeked state (stop it while `window.__recording` is true, or draw from the last `ms` it was given).
2. **Otherwise:** for each frame the recorder
   - advances the Playwright clock with `page.clock.runFor(delta)`, which fires due `setTimeout`,
     `setInterval` and `requestAnimationFrame` callbacks and moves `Date.now()` and `performance.now()`;
   - then pauses every animation in `document.getAnimations()` (CSS animations, CSS transitions and Web
     Animations) and sets its `currentTime`. An animation present at frame 0 gets `currentTime = t`; one
     that first appears at recorder time `b` gets `currentTime = t - b`, so it starts from its own
     beginning at the frame where it was first seen.

CSS and Web Animations run on the document timeline, which the Playwright clock does not control. The
`currentTime` step is what makes them deterministic; without it they would follow wall-clock time.

Before any page script runs, the recorder installs the clock and pauses it at page time 10000 ms
(`clock.install({ time: 0 })` then `clock.pauseAt(10000)`). Install alone lets time flow until the pause
lands, and a pause point cannot lie in the past, so the pause sits well ahead of that real delay; the
page therefore starts at the same page time on every run. It also sets `window.__recording` and
emulates `prefers-reduced-motion: no-preference`, so a page that honours reduced motion still animates
in the recording.

Every per-frame step (`__seek`, the clock advance, animation pinning, the screenshot) must finish within
`--timeout`. A step that does not, a `__seek` that throws, or a page that breaks the recorder's own setup
(reading `__seek` and the clock) or animation pinning (for example by overriding
`document.getAnimations`) stops the recording: the recorder prints the frame, its time and the step,
records them in `frames.json` with `pageFault: true`, writes no video and exits 4.

A timer or `requestAnimationFrame` callback that throws while the recorder advances the clock does not
stop the recording. The clock has already advanced, so the frame is captured and recording goes on; the
exception is a page error, like an uncaught exception, listed in `frames.json` `pageErrors` as
`pageerror: <message> (thrown by a timer or animation-frame callback <where>)`. The run exits 4 with the
files written, or 0 with `--allow-errors`.

## Page hooks

| Hook | Type | Contract |
|---|---|---|
| `window.__ready` | boolean | Optional. When defined, recording waits until it is `true`. Set it after the page's own assets are ready |
| `window.__seek(ms)` | function | Optional. Render the exact state at `ms` milliseconds. Must be a pure function of `ms`: seeking to the same `ms` twice gives the same pixels, in any order. May schedule its paint for the next animation frame; must not await a timer or an animation frame |
| `window.__duration` | number | Optional. Length in **milliseconds**. Used when `--duration` (seconds) is not passed. With neither, the export exits 2 |
| `window.__recording` | boolean, read-only | Set by the recorder to `true` before any page script runs; absent in a normal browser. Use it to leave preview controls out, or to stop a live animation loop that would fight `__seek` |
| `data-export-hide` | HTML attribute | Put it on preview-only UI (play buttons, scrubbers, progress bars). During recording every element carrying it gets `visibility: hidden`, including elements added later; layout does not move. Nothing is hidden automatically |

### How `window.__ready` works with the paused clock

Page time is frozen at the start time while the file loads. After the load event and
`document.fonts.ready`, while `window.__ready === false`, the recorder advances the clock in steps of one
frame and checks again. So a ready signal set from a timer (`setTimeout(() => { window.__ready = true; }, 150)`)
settles at the same page time on every run, the first frame step at or after 150 ms, and recording
starts there. Frame 0 is then that moment, not the start time; `frames.json` records the page's
`Date.now()` at that moment as `clockStartMs` (10000 plus the ready wait).

What stays nondeterministic is a ready signal that waits on real input or output (a network fetch, an
image decode or a font load that starts after the load event) and also counts timer ticks, because
the number of steps taken depends on how fast that input or output finishes. Signal ready from the
completion of the input or output itself, not from a timer that races it. A page that never sets
`window.__ready` to `true` fails after `--timeout` as a page fault (exit 4). A timer or animation-frame
callback that throws while the recorder steps the clock toward `__ready` is recorded as a page error and
the stepping continues, as during recording.

## Authoring rules for recordable pages

1. **Seed randomness.** The clock does not fake `Math.random()`. Use a seeded generator (for example a
   small mulberry32 or xorshift function with a fixed seed) for particles, noise and jitter.
2. **Load fonts before frame 0.** The recorder waits for `document.fonts.ready`; fonts loaded later
   (for example injected by a timer) can land mid-recording. Prefer local or embedded fonts, and set
   `window.__ready` after `document.fonts.ready` resolves when fonts are added by script.
3. **Derive state from time; never measure the wall clock.** Compute each frame from the current time
   (`performance.now()`, the `requestAnimationFrame` timestamp, or the `ms` given to `__seek`). Do not
   accumulate per-callback deltas that assume real-time spacing, and do not busy-wait on `Date.now()`.
4. **WebGL, canvas shaders and anything else with its own time source must use `window.__seek`.**
   Pass `ms` into the shader uniform or simulation step. The clock rule does not reach GPU time.
   Inside `__seek`, update the state and return, or schedule the paint for the next frame; never await a
   timer or an animation frame there.
5. **Media elements (`<video>`, `<audio>`) play in real time.** Drive them from `__seek` by setting
   `currentTime` and awaiting the `seeked` event, or leave them out of the recording.
6. **Keep late animations frame-aligned.** A CSS animation or transition added between two frames starts
   at the next frame. When sub-frame precision matters, use `__seek`.
7. **No network in the animation.** Record with `--offline` to prove it. An aborted request's load message is not a page error, but code that depends on it fails as one, and a missing image shows as a gap in the frames.
8. **Mark preview-only UI.** Give play buttons, scrubbers and progress bars the `data-export-hide`
   attribute, or leave them out when `window.__recording` is true.

## Output

In the output directory (`--out`, default `<project>/tmp/html-export/<timestamp>-<file>/`):

- `<name>.mp4`: H.264 (`libx264` at constant quality `-crf 18` with `-preset medium`, `yuv420p`,
  `+faststart`), with AAC audio when `--audio` is given. The quality setting keeps text edges and
  gradients sharp; files are larger than at libx264's default. Or
- `<name>.gif`: two ffmpeg passes over an intermediate MP4 at the recording fps (15 by default),
  `palettegen=stats_mode=diff` (a palette built from the pixels that change) then
  `paletteuse=diff_mode=rectangle` (only changed regions are re-dithered), scaled to `--gif-width`. The
  intermediate files are removed.
- `frames.json`, written on success and on every recording failure (usage errors, exit 2, write nothing):
  - `status`: `ok`, `page-errors` (written, but the page reported errors) or `failed`; and `exitCode`;
  - `output` (file name, `null` when nothing was written) and `keptOutput` (the MP4 kept when a GIF pass failed);
  - `fps`, `durationMs`, `frameCount`, `timeSource` (`seek` or `clock+waapi`), `clockStartMs`,
    `probedDurationSeconds`;
  - `noMotion` (`true` when every frame of a multi-frame recording is identical), `warnings` and
    `pageErrors` (as printed; on a failed open, the errors the page raised before the failure);
  - `failure`: `null`, or `{ stage, message, pageFault }` where `stage` is `open`, `duration`, `capture`,
    `encode`, `gif`, `output` (moving the encoded video into place failed; a tool fault, and no video
    is written) or `frames` (moving the kept frames into place failed, for example because a
    foreign file appeared in `frames/` during the run; a tool fault, and no video is written).
    `pageFault` is `true` when the page caused the failure (exit 4) and `false` for a tool fault (exit 1,
    or 4 when the page also reported errors that `--allow-errors` does not accept); it describes the
    failure itself, not the page errors. A frame failure adds `step` (`setup`, `seek`, `seekAdvance`,
    `clock`, `pin` or `screenshot`), `frameIndex`, `timeMs` and `timedOut`; an open or duration failure
    can add `step` (`load`, `ready`, `hide` or `duration`) and, when a bounded page call timed out,
    `timedOut`;
  - one `{ index, timeMs, sha256 }` entry per captured frame, where `sha256` hashes that frame's PNG
    (after a failure, the frames captured before it).
- `frames/` with every PNG when `--keep-frames` is set. An existing `frames/` is reused only when it is
  a real directory holding nothing except the recorder's own `frame-NNNNN.png` files; anything else
  makes the run exit 2 before anything is touched. The frames are captured into a work folder and
  replace the earlier run's frame files only after the video encoded (for a GIF, after both GIF passes),
  so a failed recording or encode leaves an earlier `frames/` exactly as it was and adds no frame to it.

Every encode is written to a work folder inside the output directory and moved into place only when it
succeeded, so a failed run never leaves a partial file at `<name>.mp4` or `<name>.gif`. A failed run
deletes only files it created; a video already at that name from an earlier run is left in place, so
read `frames.json` (`output` is `null`) rather than trusting that the file exists. `frames.json` itself
is rewritten by every run except a usage error. Each
ffmpeg pass is limited to the larger of `--timeout` and 250 ms per frame; a pass that runs longer is
stopped and reported. When a GIF pass fails after a good recording, the MP4 is kept as `<name>.mp4` (`keptOutput`)
unless a file already sits at that name, which is left untouched; the run exits 1.

Exit codes: 0 done; 2 usage error (an input that is not an `.html` / `.htm` file, bad flag value, `--audio` URL or missing file, no duration,
`--keep-frames` on a `frames/` folder the recorder did not write); 3 Node.js older than 20, missing
ffmpeg (or one without `libx264`), an `HTML_EXPORT_FFMPEG` / `HTML_EXPORT_FFPROBE` that is relative or, on Windows, not a `.exe` / `.com`
file, Playwright, or a Chromium that is not installed or fails to launch for a reason other than a timeout; 4 the page is at fault, even when no video was written: it reported
errors, including a timer or animation-frame callback that threw (the files are still written; pass
`--allow-errors` to accept them), it never loaded or became ready, a call into it hung past `--timeout`
(`failure.pageFault` is `true`), or a frame could not be captured because `__seek` threw, the page broke
the recorder's setup or animation pinning, or a per-frame step exceeded `--timeout` (no video is written
and `--allow-errors` does not apply); 1 only a tool fault, such as a browser that cannot launch or start
in time (including a dependency-check launch that timed out), an unexpected error (`HTML_EXPORT_DEBUG=1`
prints its stack), a write error or an ffmpeg failure, when the page reported no error that `--allow-errors` does
not accept (otherwise 4). Every recording failure is printed to stderr and recorded in `frames.json`;
when the page also reported errors, stderr then prints `The page also reported N error(s)` and each one.

Any other exit code, such as 130 after Ctrl+C, means the run was interrupted: there is no verdict, and
`frames.json` may be missing or from an earlier run. The recorder removes its `<out>/.video-work-*`
folder on a best-effort basis even then; any such folder that remains holds only partial frames and
encodes and is safe to delete.

## Verifying a recording

- **Determinism:** record twice; the `sha256` lists in the two `frames.json` files must be identical.
  If they differ, the page reads a time source the recorder does not control (see the rules above).
- **Motion:** frames that should differ must have different hashes. Identical hashes for every frame
  mean nothing moved, often a reduced-motion rule or an animation driven by something other than time.
  The recorder checks this itself: it prints a warning and sets `noMotion` in `frames.json`. The exit code
  stays 0, since a still recording can be intended.
- **Duration:** `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 <file>`
  must be within one frame (`1 / fps` seconds) of `--duration`. The recorder runs this check itself when
  ffprobe is available, prints a warning when it fails, and stores the value in `frames.json`. A
  shorter audio file trims the video through `-shortest`.

## Limits

- Audio is never bundled or generated; bring your own local file and its licence.
- Only one viewport per recording; `--slides`, `--page` and `--self-check` do not apply.
- A page that animates only through wall-clock sources the clock cannot reach (GPU time, media playback,
  worker timers) is not deterministic unless it implements `window.__seek`.
