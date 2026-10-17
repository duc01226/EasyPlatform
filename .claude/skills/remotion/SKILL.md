---
name: remotion
version: 3.1.0
description: '[User-Invoked] Use when creating, updating, or previewing Remotion videos.'
disable-model-invocation: true
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting. Keep task depth proportional to the work.
> **MUST ATTENTION** wait for user approval of scene plan (Step 3.3) before writing any files — NEVER skip.
> **MUST ATTENTION** read existing project files before modifying — NEVER overwrite scenes blindly.
> **MUST ATTENTION** update `totalChapters` in ALL existing scene files when adding/removing scenes.

**Be skeptical. Apply critical thinking. Every claim needs traced proof, confidence >80% to act.**

---

## Quick Summary

**Goal:** Create new Remotion video project, add/update scenes in existing one, or launch local Remotion Studio preview server.

**Two Modes:**

| Mode                          | When                                                                | Action                                         |
| ----------------------------- | ------------------------------------------------------------------- | ---------------------------------------------- |
| **Create / Update** (default) | User describes video content OR asks to update/add scenes           | Scaffold new project or modify existing scenes |
| **Play**                      | User says "play", "preview", "open studio", "watch", "start server" | Find Remotion project → `npm run studio`       |

**Default project path:** `remotion/` (relative to workspace root). Respect any path user explicitly provides.

**Key Rules:**

- NEVER implement scenes before user approves the plan (Step 3.3)
- Always read existing project structure before adding/modifying scenes
- Keep `totalChapters` consistent across ALL scene files
- All animations MUST be driven by `useCurrentFrame()` — CSS transitions FORBIDDEN
- Always use Remotion components (`<Img>`, `<Video>`, `<Audio>`) instead of native HTML elements

**Implementing one of these? Copy from `refs/` — do NOT implement from memory:**

| Implementing...                            | Copy from                                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `{source-root}/components/Shared.tsx` (new scaffold) | `refs/Shared.tsx` — C palette, ProgressBar, ChapterBadge, CodeBlock, Pill, AnimRow                            |
| `{source-root}/utils/animations.ts` (new scaffold)   | `refs/animations.ts` — easeOut, easeInOut, pop, staggeredEaseOut, counter                                     |
| Typewriter or word-highlight text effect   | `refs/text-animations.tsx` — getTypedText, Cursor, TypewriterScene, Highlight                                 |
| TikTok-style captions with word highlight  | `refs/captions.tsx` — CaptionedVideo, CaptionPage, delayRender, createTikTokStyleCaptions                     |
| Video/audio duration, dimensions, frames   | `refs/mediabunny-utils.ts` — getVideoDuration, getAudioDuration, getVideoDimensions, canDecode, extractFrames |
| Mapbox map scene                           | `refs/maps-mapbox.tsx` — MapScene component, interactive:false, camera animation                              |
| ElevenLabs TTS voiceover generation        | `refs/generate-voiceover.ts` — TTS script + calculateMetadata integration                                     |

---

## Contents

- [Quick Summary](#quick-summary)
- [Phase 0: Mode Detection](#phase-0-mode-detection)
- [Phase 1A: Detect Existing Project](#phase-1a-detect-existing-project)
- [Phase 2: PLAY Mode](#phase-2-play-mode)
- [Phase 3: CREATE / UPDATE Mode](#phase-3-create--update-mode)
- [Update Mode: Specific Scenarios](#update-mode-specific-scenarios)
- [Remotion API Reference](#remotion-api-reference)
- [Closing Reminders](#closing-reminders)

## Phase 0: Mode Detection

Classify prompt:

```
PLAY keywords   → "play", "preview", "open studio", "start server", "watch", "launch", "dev server"
CREATE/UPDATE   → everything else (default)
```

Ambiguous → proceed with **Create/Update** (safe default).

---

## Phase 1A: Detect Existing Project

Locate Remotion project before acting:

```bash
# Check default path
ls remotion/package.json 2>/dev/null

# Check if CWD is already a Remotion project
ls package.json 2>/dev/null | xargs grep -l '"remotion"' 2>/dev/null

# Check common paths
find . -maxdepth 3 -name "package.json" -exec grep -l '"remotion"' {} \; 2>/dev/null | head -5
```

**State after detection:**

- `PROJECT_EXISTS = true/false`
- `PROJECT_PATH = remotion/` (default) or detected path
- `HAS_STUDIO_SCRIPT = true/false` (check `package.json` `scripts.studio`)

---

## Phase 2: PLAY Mode

**When:** User explicitly asks to preview / open studio / launch dev server.

### Step 2.1 — Verify project exists

If `PROJECT_EXISTS = false`:

> "No Remotion project found. Run `/remotion <description>` to create one first."
> Exit.

### Step 2.2 — Find launch command

```bash
cat {PROJECT_PATH}/package.json | grep '"studio"'
# → use: npm run studio
# → fallback: npx remotion studio
```

### Step 2.3 — Start dev server (background)

```bash
cd {PROJECT_PATH} && npm run studio
```

> Remotion Studio launches at **http://localhost:3000**

Server runs in background. Report URL and composition IDs visible in `{source-root}/Root.tsx`.

### Step 2.4 — Optional: one-frame render check

```bash
npx remotion still [composition-id] --scale=0.25 --frame=30
# At 30fps, --frame=30 = one-second mark (zero-based)
```

---

## Phase 3: CREATE / UPDATE Mode

### Step 3.1 — New vs Update Decision

| Condition                | Action                                |
| ------------------------ | ------------------------------------- |
| `PROJECT_EXISTS = false` | **Scaffold** new project → Phase 3.2  |
| `PROJECT_EXISTS = true`  | **Read existing** project → Phase 3.4 |

---

### Step 3.2 — Scaffold New Project

**Only when no existing Remotion project found.**

#### 3.2.1 Bootstrap with create-video (preferred)

```bash
# Creates {PROJECT_PATH}/ with blank template (no Tailwind)
npx create-video@latest --yes --blank --no-tailwind {PROJECT_PATH}
cd {PROJECT_PATH}
npm install @remotion/transitions  # add transitions support
```

Replace generated `{source-root}/` with project structure below (keep `package.json` and `tsconfig.json` from scaffold).

#### Fallback (manual) — when `npx create-video` unavailable

```bash
mkdir -p {PROJECT_PATH}/{source-root}/compositions {PROJECT_PATH}/{source-root}/components {PROJECT_PATH}/{source-root}/utils
cd {PROJECT_PATH}
npm init -y
npm install remotion @remotion/cli @remotion/transitions react react-dom
npm install -D @types/react @types/react-dom typescript
```

#### Directory structure (both paths)

```
{PROJECT_PATH}/
  package.json          ← scripts: studio, render, still
  tsconfig.json
  {source-root}/
    index.ts            ← registerRoot
    Root.tsx            ← register compositions
    components/
      Shared.tsx        ← palette + reusable UI components
    utils/
      animations.ts     ← easeOut, staggeredEaseOut, pop, counter
    compositions/
      {CompositionName}.tsx
```

#### 3.2.3 Create `package.json` scripts (merge into existing after install)

```json
{
    "scripts": {
        "studio": "remotion studio",
        "render": "remotion render {CompositionId} out/video.mp4",
        "still": "remotion still {CompositionId} --frame=0 out/still.png"
    },
    "remotion": {
        "entryPoint": "{source-root}/index.ts"
    }
}
```

#### 3.2.4 Create `tsconfig.json`

```json
{
    "compilerOptions": {
        "target": "ES2020",
        "lib": ["dom", "ES2020"],
        "jsx": "react-jsx",
        "module": "commonjs",
        "moduleResolution": "node",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "outDir": "dist"
    },
    "include": ["src"]
}
```

#### 3.2.5 Create `{source-root}/index.ts`

```ts
import { registerRoot } from 'remotion';
import { Root } from './Root';
registerRoot(Root);
```

#### 3.2.6 Create `{source-root}/components/Shared.tsx`

> Copy from `refs/Shared.tsx` — do NOT implement from memory. Exports: `C` (palette), `ProgressBar`, `ChapterBadge`, `CodeBlock`, `Pill`, `AnimRow`. Always create; all scenes import from here.

#### 3.2.7 Create `{source-root}/utils/animations.ts`

> Copy from `refs/animations.ts` — do NOT implement from memory. Exports: `easeOut`, `easeInOut`, `pop`, `staggeredEaseOut`, `counter`.

---

### Step 3.3 — Plan Composition Structure

**MUST ATTENTION wait for user confirmation before implementing any scenes.**

Plan composition before writing files:

1. **Parse intent** — What video about? What information to convey?
2. **Decide scene count** — 1 scene per major concept (30s → ~4 scenes, 60s → ~8, 90s → ~12)
3. **Assign durations** — Each scene: 6–12s (180–360 frames @ 30fps)
4. **Name scenes** — `Scene01Intro`, `Scene02{Topic}`, etc.
5. **Write scene brief** — what shown, key data, visual layout (left/right split, full-width, grid)

Present plan before writing files:

```
Proposed: {N} scenes, ~{total}s total
  Scene 01 ({Xs}) — {topic}: {layout description}
  Scene 02 ({Xs}) — {topic}: {layout description}
  …
Proceed? (or adjust)
```

---

### Step 3.4 — Read Existing Project (UPDATE path)

**MUST ATTENTION read existing project state before any modifications.**

When `PROJECT_EXISTS = true`:

```bash
# Read composition registry
cat {PROJECT_PATH}/{source-root}/Root.tsx

# List scene files
ls {PROJECT_PATH}/{source-root}/compositions/ 2>/dev/null || ls {PROJECT_PATH}/{source-root}/scenes/ 2>/dev/null

# Read main composition orchestrator
cat {PROJECT_PATH}/{source-root}/ClaudeAgentExplainer.tsx 2>/dev/null  # or equivalent
```

Identify:

- Existing scene count and names
- Current `totalChapters` / composition duration
- Where to insert / which scenes to modify

Target only scenes affected by user's request. Preserve all unchanged scenes.

---

### Step 3.5 — Implement Scene Files

#### Scene file anatomy (follow exactly)

```tsx
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { C, ProgressBar, ChapterBadge } from '../components/Shared';  // adjust path
import { easeOut, staggeredEaseOut } from '../utils/animations';       // adjust path

// Data arrays at the top — keep out of component body
const ITEMS = [ ... ];

export const Scene{NN}{Name}: React.FC = () => {
    const frame = useCurrentFrame();

    return (
        <AbsoluteFill style={{ background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <ChapterBadge index={NN} label="{Scene Name}" color={C.blue} />

            <div style={{ position: 'absolute', inset: 0, display: 'flex', gap: 48, padding: '68px 72px 44px' }}>
                {/* Content here */}
            </div>

            <ProgressBar chapterIndex={NN - 1} totalChapters={TOTAL} />
        </AbsoluteFill>
    );
};
```

#### Animation rules

| Element               | Pattern                                                   |
| --------------------- | --------------------------------------------------------- |
| Eyebrow label         | `opacity: easeOut(frame, 0, 14)`                          |
| Hero title            | `opacity: easeOut(frame, 8, 22)` + `translateY` from 28→0 |
| Subtitle              | `opacity: easeOut(frame, 22, 18)`                         |
| List items (stagger)  | `staggeredEaseOut(frame, i, startAt, 12, 16)`             |
| Cards (stagger up)    | `staggeredEaseOut` + `translateY(20→0)`                   |
| Cards (stagger right) | `staggeredEaseOut` + `translateX(28→0)`                   |
| Late callout boxes    | `easeOut(frame, 90+, 18)`                                 |

#### Layout patterns

**Left/Right split (most common):**

```tsx
<div style={{ position: 'absolute', inset: 0, display: 'flex', gap: 48, padding: '68px 72px 44px' }}>
    <div style={{ width: 400, flexShrink: 0, ... }}>  {/* Left panel */}
    <div style={{ flex: 1, ... }}>                     {/* Right panel */}
</div>
```

**Full-width column:**

```tsx
<div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '68px 64px 44px', gap: 16 }}>
```

**Centered (title/CTA scene):**

```tsx
<div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '72px 100px', textAlign: 'center' }}>
```

**Card grid:**

```tsx
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
```

#### Color and font guidelines

| Element          | fontSize | fontWeight | Notes                                                             |
| ---------------- | -------- | ---------- | ----------------------------------------------------------------- |
| Eyebrow label    | 14       | 700        | category color, `letterSpacing: 3`                                |
| Hero title       | 44–56    | 800        | `C.text`, `lineHeight: 1.1`                                       |
| Body text        | 17–21    | 400        | `C.dim`, `lineHeight: 1.6`                                        |
| Card label       | 15–16    | 700        | category color                                                    |
| Monospace detail | 12–14    | 400        | `fontFamily: 'Courier New'`                                       |
| Card container   | —        | —          | `C.surface`, `borderLeft: 3px solid color`, `borderRadius: 10–12` |

---

### Step 3.6 — Wire Root.tsx

#### Multi-scene composition (with transitions)

```tsx
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { Scene01Intro } from './compositions/Scene01Intro';
// ... other imports

const T = 18; // transition duration in frames

const D = {
    s01: 210, // 7s
    s02: 240 // 8s
    // ...
};

const SCENES = Object.values(D).length;
export const TOTAL_DURATION_FRAMES = Object.values(D).reduce((a, b) => a + b, 0) - (SCENES - 1) * T;

const tr = () => <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />;

export const {
    CompositionName
}: React.FC = () => (
    <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={D.s01}>
            <Scene01Intro />
        </TransitionSeries.Sequence>
        {tr()}
        <TransitionSeries.Sequence durationInFrames={D.s02}>
            <Scene02Next />
        </TransitionSeries.Sequence>
        {/* ... */}
    </TransitionSeries>
);
```

```tsx
// Root.tsx
import { Composition } from 'remotion';
import { {CompositionName}, TOTAL_DURATION_FRAMES } from './{CompositionName}';

export const Root: React.FC = () => (
    <Composition id="{CompositionId}" component={{{CompositionName}}} durationInFrames={TOTAL_DURATION_FRAMES} fps={30} width={1920} height={1080} />
);
```

#### Single-scene composition

```tsx
// Root.tsx
import { Composition } from 'remotion';
import { MyScene } from './compositions/MyScene';

export const Root: React.FC = () => <Composition id="MyVideo" component={MyScene} durationInFrames={300} fps={30} width={1920} height={1080} />;
```

---

### Step 3.7 — Post-scaffold: launch prompt

After creating/updating, report changed files and offer launch:

```
✅ Created {N} scene files in {PROJECT_PATH}/{source-root}/compositions/
   Total duration: ~{X}s ({FRAMES} frames @ 30fps)

To preview: run `/remotion play` — starts Remotion Studio at http://localhost:3000
To render:  cd {PROJECT_PATH} && npm run render
```

---

## Update Mode: Specific Scenarios

### Add a new scene

1. Read `Root.tsx` to find composition orchestrator and current scene count
2. Read `totalChapters` across existing scenes
3. Determine insertion point (end = safest)
4. Create new scene file following anatomy above
5. Update Root / composition orchestrator:
    - Add import
    - Add `D.sNN` entry
    - Add `<TransitionSeries.Sequence>` block
    - **MUST ATTENTION update `totalChapters` in ALL existing scene files (+1)**

### Modify an existing scene

1. Read specific scene file
2. Identify data array or JSX block needing change
3. Make surgical edits only — do not touch unrelated sections

### Change visual style / palette

1. Edit `{source-root}/components/Shared.tsx` → `C` object
2. Font changes: update `fontFamily` in `AbsoluteFill` style per scene (or add global in Shared)

---

## Remotion API Reference

Before implementing beyond basic scene creation, read the relevant sections of `references/remotion-skill-api-recipes.md`:

- Animation timing, sequencing, compositions, assets, images/video/audio, GIFs and fonts: read those sections before implementing these features.
- Transitions, overlays, 3D, text effects/measurement and DOM measurement: read the matching section before implementation.
- Captions, dynamic metadata, Zod parameters, Mediabunny, FFmpeg/silence detection and audio visualization: read the matching section before using these APIs.
- Lottie, charts, maps, transparent rendering, voiceover, sound effects and Tailwind: read the matching section before implementation.

Keep animations frame-driven and use Remotion media components and `staticFile()` for public assets. Copy specialized implementations from the `refs/` owners listed above.

---

## Closing Reminders

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**


- **MUST ATTENTION** wait for user approval of scene plan (Step 3.3) — NEVER implement scenes before approval
- **MUST ATTENTION** read existing project structure (Step 3.4) before modifications — NEVER overwrite blindly
- **MUST ATTENTION** update `totalChapters` in ALL scene files when adding/removing scenes — one missed file causes visual regression
- **MUST ATTENTION** keep data arrays outside component body — NEVER define `const ITEMS` inside component function
- **MUST ATTENTION** use `npx create-video@latest --yes --blank --no-tailwind` for scaffold — NEVER `npm init` unless fallback needed
- **MUST ATTENTION** use `staggeredEaseOut` for list/card reveals — NEVER all-at-once opacity
- **MUST ATTENTION** verify `PROJECT_EXISTS` before Play mode — report missing project and exit
- **MUST ATTENTION** use TaskCreate to plan ALL work before starting — mark each task done immediately
- **MUST ATTENTION** ALL animations driven by `useCurrentFrame()` — CSS transitions, CSS animations, Tailwind animate/transition classes FORBIDDEN
- **MUST ATTENTION** use Remotion components `<Img>`, `<Video>`, `<Audio>` — NEVER native HTML elements
- **MUST ATTENTION** use `staticFile()` for all public/ folder assets — NEVER raw relative paths
- **MUST ATTENTION** Copy from appropriate `refs/` file — NEVER implement text animations, captions, mediabunny, maps, or voiceover from memory
