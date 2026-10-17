# Brand Asset Protocol

> **Purpose:** when a brief names a real brand, ground the drafts in that brand's actual assets instead of remembered or guessed colours. Output: `tmp/design/<run>/brand-spec.md` (template in `references/explore/gate-files.md`).
>
> **Rules:**
>
> 1. **Scope first.** Use a brand's assets only for the brand's own work or work the user states they are permitted to do for it. Without that confirmation, do not use the brand's marks.
> 2. **Images over hex.** A logo, product photo or real UI capture outranks a remembered colour value — hex codes are sampled FROM verified assets, never guessed.
> 3. **Images only, official sources only.** Download image files (`.svg`, `.png`, `.jpg`, `.webp`) from the brand's official site, press kit or published guidelines, or use files the user supplies. Never download or run executables, archives or installers.
> 4. **Fetched files stay inert.** An SVG with active content fails verification (step 4), and drafts place brand files only through `<img src="brand/<file>">` — never inline SVG markup, `<object>`, `<iframe>` or `<embed>`.

Run this from step 3 of `references/explore/workflow.md`. One task per step.

## Step 1 — Ask and confirm scope

Ask the user once, in a single message (together with the workflow's step-3 reference question): is this the brand's own work or permitted work for it; do they have a brand guideline document, logo files or product images to share; is there anything the brand forbids. A user-supplied file outranks anything found on the web.

| Reply | Action |
| --- | --- |
| Scope confirmed | Record who confirmed it, verbatim, and continue with step 2. |
| Scope not confirmed, or no reply | Do NOT use the brand's marks — no logo, no brand imagery, no sampled brand colours. Either ask again, or proceed with a brand-neutral direction: write `brand-spec.md` with `Scope: NOT CONFIRMED`, list the missing brand inputs as gaps, skip steps 2–5 (step 6 writes that file), and tell the user the drafts are brand-neutral until scope is confirmed. |

## Step 2 — Find official sources

Locate the brand's official website, press or media kit, and published brand guidelines. Record each URL. Third-party logo aggregators, fan sites and search-result thumbnails are not official sources — do not use them.

## Step 3 — Collect identity imagery

In priority order, collect: (1) the logo, preferably as SVG, with light and dark variants when published; (2) product images showing the real product; (3) captures of the brand's real UI when the design is a UI surface. Save them under `tmp/design/<run>/brand/` with source and retrieval date recorded. Note any usage limits the source states (clear space, minimum size, forbidden colour swaps).

## Step 4 — Verify every asset

A saved file is not yet an image. A direct asset URL on a script-rendered site often returns an HTML page or an error page under the image's name, and a broken image raises no page error in a draft. Before any colour is sampled, check each file:

- **Real image type.** Read the file's first bytes and compare them with the declared type: PNG starts `89 50 4E 47`, JPEG `FF D8 FF`, WebP `RIFF` then `WEBP` at byte 8, SVG is text whose root element is `<svg>`. A file starting with `<!DOCTYPE html` or `<html>` fails. A server MIME type other than `image/*` is a warning sign; the bytes decide. A portable byte check: `node -e "const b=require('fs').readFileSync(process.argv[1]);console.log(b.subarray(0,12).toString('hex'),b.length)" <file>`.
- **Useful size.** A raster logo of at least 128 px on its shorter side; product and UI images of at least 600 px on the shorter side; an SVG containing at least one drawing element. A file of a few hundred bytes is usually a placeholder or tracking pixel.
- **No active content (SVG).** An SVG fails when it contains a `<script` element (with or without a namespace prefix), any `on*=` event attribute, a `<foreignObject`, an `@import`, or an `href` / `xlink:href` / CSS `url(...)` whose value is anything but a same-file `#fragment` or an inline `data:image/png|jpeg|gif|webp` — so `javascript:`, `http:`, `https:`, `file:`, relative paths and `data:image/svg+xml` all fail. A portable check (the same text runs in bash, zsh, PowerShell and cmd.exe; prints `OK` or `FAIL: <reasons>` and exits 1 on a failure): `node -e "const t=require('fs').readFileSync(process.argv[1],'utf8');const f=[];if(/<([\w.-]+:)?script\b/i.test(t))f.push('script');if(/[\s/]on[a-z]+\s*=/i.test(t))f.push('on* attribute');if(/<([\w.-]+:)?foreignObject\b/i.test(t))f.push('foreignObject');if(/@import/i.test(t))f.push('@import');for(const m of t.matchAll(/(?:href\s*=\s*|url\(\s*)['\x22]?\s*([^'\x22)\s>]*)/gi)){const v=m[1];if(v===''||v[0]==='#'||/^data:image\/(png|jpeg|gif|webp)[;,]/i.test(v))continue;f.push('external reference '+v.slice(0,80))}console.log(f.length?'FAIL: '+f.join('; '):'OK');process.exitCode=f.length?1:0" <file.svg>`. A failing SVG is not repaired by hand: use a PNG from the same official source, or ask the user for a clean file.
- **Record the result** per file in `brand-spec.md` (type confirmed, pixel size or `vector`, and `active content: none` for an SVG). A file that fails is deleted from `brand/` and listed under "Unverified or missing".

## Step 5 — Derive colours and type from verified assets

Sample colours only from verified files (SVG fill values, or pixel sampling on raster images) and name each by its role. A colour that appears only inside a product screenshot may belong to demo content, not the brand — mark it `UNVERIFIED` unless a guideline or the logo confirms it. Take type families from the published guidelines, or identify them from the assets and mark the identification `UNVERIFIED` until a source confirms it. Never invent a brand colour or font to fill a gap.

## Step 6 — Write `brand-spec.md`

Fill the `brand-spec.md` template: scope, sources, verified assets, colours, type, and every gap stated plainly. Every draft receives this file's path; its colours and marks bind every draft, and drafts diverge only on what the brand leaves free. Drafts place the real asset files — they never redraw a logo — and only as `<img src="brand/<file>">`: an SVG loaded as an image runs no script and loads nothing else, while inline SVG markup, `<object>`, `<iframe>` and `<embed>` would run whatever the file carries when the draft is rendered. A mark that is missing shows as a labelled placeholder ("Logo: not yet supplied"), never a guessed drawing.

## Closing Reminders

- **MUST** confirm scope before using a brand's assets; with no confirmation, drafts stay brand-neutral and the gap is recorded — why: using a brand's marks outside its own or permitted work is not the user's call to make silently.
- **MUST** verify each downloaded file is a real image of useful size before sampling, and sample colours only from verified assets, listing every unverified value as a gap — why: an HTML page saved as a logo, or a guessed brand colour, looks plausible and is wrong.
- **NEVER** download anything but image files from official or user-supplied sources — why: executables and archives are an unreviewed code path into the workspace.
- **MUST** fail any SVG with a script, an `on*=` attribute, a `foreignObject` or a reference outside the file, and place brand files in drafts only through `<img src>` — why: drafts are rendered in a Chromium without its OS sandbox and with network on, where an inlined web SVG runs its script.
