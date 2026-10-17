Read the relevant sections when implementing beyond basic scene creation. Paths beginning `refs/` resolve from the Remotion skill root; do not resolve them from this reference directory.

<!-- SKILL-NAV:START -->
## Contents

- [Remotion API Reference](#remotion-api-reference)
- [Animations (Core Rules)](#animations-core-rules)
- [Timing — interpolate & Bézier Easing](#timing--interpolate--bézier-easing)
- [Sequencing & Trimming](#sequencing--trimming)
- [Compositions](#compositions)
- [Assets — staticFile() & public folder](#assets--staticfile--public-folder)
- [Images](#images)
- [Videos](#videos)
- [Audio](#audio)
- [GIFs & Animated Images](#gifs--animated-images)
- [Fonts](#fonts)
- [Transitions (Full API)](#transitions-full-api)
- [Light Leaks (Overlay Effect)](#light-leaks-overlay-effect)
- [3D with Three.js (React Three Fiber)](#3d-with-threejs-react-three-fiber)
- [Text Animations](#text-animations)
- [Text Measurement](#text-measurement)
- [DOM Node Measurement](#dom-node-measurement)
- [Captions & Subtitles](#captions--subtitles)
- [Dynamic Compositions — calculateMetadata](#dynamic-compositions--calculatemetadata)
- [Parameters — Zod Schema](#parameters--zod-schema)
- [Mediabunny — Video/Audio Metadata](#mediabunny--videoaudio-metadata)
- [FFmpeg in Remotion](#ffmpeg-in-remotion)
- [Silence Detection](#silence-detection)
- [Audio Visualization](#audio-visualization)
- [Lottie Animations](#lottie-animations)
- [Charts & Data Visualization](#charts--data-visualization)
- [Maps with Mapbox](#maps-with-mapbox)
- [Transparent Video Rendering](#transparent-video-rendering)
- [AI Voiceover (ElevenLabs TTS)](#ai-voiceover-elevenlabs-tts)
- [Sound Effects](#sound-effects)
- [TailwindCSS](#tailwindcss)

<!-- SKILL-NAV:END -->

## Remotion API Reference

> Authoritative Remotion API reference — apply when implementing beyond basic scene creation.

---

### Animations (Core Rules)

**MUST ATTENTION** ALL animations driven by `useCurrentFrame()`. Durations: seconds × `fps`.

```tsx
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';

export const FadeIn = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const opacity = interpolate(frame, [0, 2 * fps], [0, 1], {
        extrapolateRight: 'clamp',
        extrapolateLeft: 'clamp',
        easing: Easing.bezier(0.16, 1, 0.3, 1)
    });
    return <div style={{ opacity }}>Hello World!</div>;
};
```

**FORBIDDEN:** CSS `transition-*`, CSS `animation-*`, Tailwind `transition-*`/`animate-*` classes.

---

### Timing — interpolate & Bézier Easing

```ts
// With clamping + Bézier easing
const opacity = interpolate(frame, [0, 60], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
});
```

**Copy-paste curves:**

```tsx
easing: Easing.bezier(0.16, 1, 0.3, 1); // crisp UI entrance (strong ease-out)
easing: Easing.bezier(0.45, 0, 0.55, 1); // editorial / slow fade
easing: Easing.bezier(0.34, 1.56, 0.64, 1); // playful overshoot
```

**Composing multiple properties from one progress:**

```tsx
const slideIn = interpolate(frame, [start, start + dur], [0, 1], {
    easing: Easing.bezier(0.22, 1, 0.36, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
});
const overlayX = interpolate(slideIn, [0, 1], [100, 0]);
const opacity = interpolate(slideIn, [0, 1], [0, 1]);
```

---

### Sequencing & Trimming

**`<Sequence>`** delays element appearance. `useCurrentFrame()` inside = local frame (0-based). Always `premountFor`:

```tsx
<Sequence from={1 * fps} durationInFrames={2 * fps} premountFor={1 * fps}>
    <Title />
</Sequence>
```

**`<Series>`** for sequential without overlap:

```tsx
<Series>
    <Series.Sequence durationInFrames={45}>
        <Intro />
    </Series.Sequence>
    <Series.Sequence durationInFrames={60}>
        <MainContent />
    </Series.Sequence>
    <Series.Sequence offset={-15} durationInFrames={60}>
        <SceneB />
    </Series.Sequence>{' '}
    {/* overlap */}
</Series>
```

**Trimming:**

```tsx
<Sequence from={-0.5 * fps}><MyAnimation /></Sequence>       // skip first 15 frames
<Sequence durationInFrames={1.5 * fps}><MyAnimation /></Sequence>  // trim end
<Sequence from={30}><Sequence from={-15}><MyAnimation /></Sequence></Sequence>  // trim + delay
```

---

### Compositions

```tsx
import { Composition, Folder, Still } from "remotion";

<Composition id="MyComposition" component={MyComp} durationInFrames={100} fps={30} width={1080} height={1080} />

// With default props (use `type` not `interface`)
<Composition id="MyComposition" component={MyComp} durationInFrames={100} fps={30} width={1080} height={1080}
  defaultProps={{ title: "Hello World", color: "#ff0000" } satisfies MyCompositionProps}
/>

// Still (single-frame)
<Still id="Thumbnail" component={Thumbnail} width={1280} height={720} />
```

---

### Assets — staticFile() & public folder

**MUST use `staticFile()`** for assets in `public/`:

```tsx
import { Img, staticFile } from "remotion";
import { Video } from "@remotion/media";
import { Audio } from "@remotion/media";

<Img src={staticFile("logo.png")} />
<Video src={staticFile("clip.mp4")} />
<Audio src={staticFile("music.mp3")} />
// Remote URLs work directly — no staticFile needed
```

---

### Images

**MUST use `<Img>` from `remotion`** — NOT `<img>`, NOT Next.js `<Image>`, NOT CSS `background-image`.

```tsx
import { Img, staticFile } from "remotion";

<Img src={staticFile("photo.png")} style={{ width: 500, height: 300, objectFit: "cover" }} />
<Img src={staticFile(`frames/frame${frame}.png`)} />  // dynamic paths work
```

---

### Videos

Install: `npx remotion add @remotion/media`

```tsx
import { Video } from "@remotion/media";

<Video src={staticFile("video.mp4")} />
<Video src={staticFile("video.mp4")} trimBefore={2 * fps} trimAfter={10 * fps} />
<Video src={staticFile("video.mp4")} volume={(f) => interpolate(f, [0, fps], [0, 1], { extrapolateRight: "clamp" })} />
<Video src={staticFile("video.mp4")} playbackRate={2} loop muted />
```

---

### Audio

Install: `npx remotion add @remotion/media`

```tsx
import { Audio } from "@remotion/media";

<Audio src={staticFile("audio.mp3")} />
<Audio src={staticFile("audio.mp3")} trimBefore={2 * fps} trimAfter={10 * fps} />
<Sequence from={1 * fps}><Audio src={staticFile("audio.mp3")} /></Sequence>  // delay
// volume callback: `f` starts at 0 when audio begins, not composition frame
<Audio src={staticFile("audio.mp3")} volume={(f) => interpolate(f, [0, fps], [0, 1], { extrapolateRight: "clamp" })} />
```

---

### GIFs & Animated Images

```tsx
import { AnimatedImage, staticFile } from "remotion";

// Preferred: supports GIF, APNG, AVIF, WebP
<AnimatedImage src={staticFile("animation.gif")} width={500} height={500} />
<AnimatedImage src={staticFile("animation.gif")} width={500} height={300} fit="cover" playbackRate={2} />

// Fallback: GIF only — npx remotion add @remotion/gif
import { Gif } from "@remotion/gif";
<Gif src={staticFile("animation.gif")} width={500} height={500} />
```

---

### Fonts

**Google Fonts (recommended):** `npx remotion add @remotion/google-fonts`

```tsx
import { loadFont } from '@remotion/google-fonts/Roboto';

const { fontFamily } = loadFont('normal', { weights: ['400', '700'], subsets: ['latin'] });
<h1 style={{ fontFamily, fontSize: 80, fontWeight: 'bold' }}>{text}</h1>;
```

**Local fonts:** `npx remotion add @remotion/fonts`

```tsx
import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

await Promise.all([
    loadFont({ family: 'Inter', url: staticFile('Inter-Regular.woff2'), weight: '400' }),
    loadFont({ family: 'Inter', url: staticFile('Inter-Bold.woff2'), weight: '700' })
]);
```

---

### Transitions (Full API)

`npx remotion add @remotion/transitions`

```tsx
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { flip } from "@remotion/transitions/flip";

<TransitionSeries>
  <TransitionSeries.Sequence durationInFrames={60}><SceneA /></TransitionSeries.Sequence>
  <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 15 })} />
  <TransitionSeries.Sequence durationInFrames={60}><SceneB /></TransitionSeries.Sequence>
</TransitionSeries>

// Slide directions: "from-left" | "from-right" | "from-top" | "from-bottom"
<TransitionSeries.Transition presentation={slide({ direction: "from-left" })} timing={linearTiming({ durationInFrames: 20 })} />

// Spring timing
springTiming({ config: { damping: 200 }, durationInFrames: 25 })

// Overlay (no duration shortening — note: cannot be adjacent to transition or another overlay)
<TransitionSeries.Overlay durationInFrames={20} offset={0}><MyEffect /></TransitionSeries.Overlay>
```

**Duration:** two 60-frame scenes + 15-frame transition = `60 + 60 - 15 = 105` frames total.

---

### Light Leaks (Overlay Effect)

Requires Remotion ≥ 4.0.415. Check: `npx remotion versions`. Upgrade: `npx remotion upgrade`.

`npx remotion add @remotion/light-leaks`

```tsx
import { LightLeak } from "@remotion/light-leaks";

// As TransitionSeries overlay
<TransitionSeries.Overlay durationInFrames={30}><LightLeak /></TransitionSeries.Overlay>

// Standalone decorative overlay
<AbsoluteFill>
  <MyContent />
  <LightLeak durationInFrames={60} seed={3} />
</AbsoluteFill>

// seed: different patterns; hueShift: 0=yellow-orange, 120=green, 240=blue
<LightLeak seed={5} hueShift={240} />
```

---

### 3D with Three.js (React Three Fiber)

`npx remotion add @remotion/three`

**MUST wrap in `<ThreeCanvas>` with `width` and `height` props.**
**FORBIDDEN: `useFrame()` from `@react-three/fiber`** — causes flickering. Use `useCurrentFrame()`.

```tsx
import { ThreeCanvas } from '@remotion/three';
import { useVideoConfig, useCurrentFrame } from 'remotion';

const { width, height } = useVideoConfig();
const frame = useCurrentFrame();

<ThreeCanvas width={width} height={height}>
    <ambientLight intensity={0.4} />
    <directionalLight position={[5, 5, 5]} intensity={0.8} />
    <mesh rotation={[0, frame * 0.02, 0]}>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="#4a9eff" />
    </mesh>
</ThreeCanvas>;

// <Sequence> inside ThreeCanvas must use layout="none"
```

---

### Text Animations

All text animations driven by `useCurrentFrame()`. CSS transitions FORBIDDEN.

**Typewriter** — use string slicing, NEVER per-character opacity. Spring **word highlight** — scaleX wipe from left.

> Implementing typewriter or word-highlight? Copy from `refs/text-animations.tsx` — do NOT implement from memory. Contains: `getTypedText`, `Cursor`, `TypewriterScene`, `Highlight`.

---

### Text Measurement

`npx remotion add @remotion/layout-utils`

```tsx
import { measureText, fitText, fillTextBox } from '@remotion/layout-utils';

const { width, height } = measureText({ text: 'Hello World', fontFamily: 'Arial', fontSize: 32, fontWeight: 'bold' });
const { fontSize } = fitText({ text: 'Hello World', withinWidth: 600, fontFamily: 'Inter', fontWeight: 'bold' });
```

**MUST ATTENTION** call only after fonts loaded. Use `validateFontIsLoaded: true`. Match font properties exactly between measurement and rendering.

---

### DOM Node Measurement

Remotion applies `scale()` transform — use `useCurrentScale()` to get true dimensions:

```tsx
import { useCurrentScale } from 'remotion';

const scale = useCurrentScale();
const rect = ref.current.getBoundingClientRect();
const trueWidth = rect.width / scale;
```

---

### Captions & Subtitles

`npx remotion add @remotion/captions`

Caption type: `{ text, startMs, endMs, timestampMs, confidence }`

**Transcribe with Whisper.cpp:** `npx remotion add @remotion/install-whisper-cpp`

```ts
import { installWhisperCpp, downloadWhisperModel, transcribe, toCaptions } from '@remotion/install-whisper-cpp';

await installWhisperCpp({ to: './whisper.cpp', version: '1.5.5' });
await downloadWhisperModel({ model: 'medium.en', folder: './whisper.cpp' });
// Convert to 16KHz wav first: npx remotion ffmpeg -i input.mp4 -ar 16000 output.wav
const whisperOutput = await transcribe({
    model: 'medium.en',
    whisperPath: './whisper.cpp',
    whisperCppVersion: '1.5.5',
    inputPath: '/path/to/audio.wav',
    tokenLevelTimestamps: true
});
const { captions } = toCaptions({ whisperCppOutput: whisperOutput });
```

**Import from.srt:**

```tsx
import { parseSrt } from '@remotion/captions';
const { captions } = parseSrt({ input: await fetch(staticFile('subtitles.srt')).then(r => r.text()) });
```

**TikTok-style word highlight display:**

> Implementing TikTok-style captions? Copy from `refs/captions.tsx` — do NOT implement from memory. Contains: `CaptionedVideo`, `CaptionPage`, `delayRender`, `createTikTokStyleCaptions`, per-token active highlighting.

Note: use `whiteSpace: "pre"` — captions are whitespace-sensitive.

---

### Dynamic Compositions — calculateMetadata

```tsx
import { CalculateMetadataFunction } from 'remotion';

const calculateMetadata: CalculateMetadataFunction<Props> = async ({ props, abortSignal }) => {
    const durationInSeconds = await getVideoDuration(props.videoSrc);
    return { durationInFrames: Math.ceil(durationInSeconds * 30) };
};

// Transform props (fetch data before render)
const calculateMetadata: CalculateMetadataFunction<Props> = async ({ props, abortSignal }) => {
    const data = await fetch(props.dataUrl, { signal: abortSignal }).then(r => r.json());
    return { props: { ...props, fetchedData: data } };
};

// Return values (all optional): durationInFrames, width, height, fps, props, defaultOutName, defaultCodec
```

---

### Parameters — Zod Schema

```tsx
import { z } from 'zod';
import { zColor } from '@remotion/zod-types';

export const MyCompositionSchema = z.object({
    title: z.string(),
    color: zColor() // renders color picker in Studio
});

// Root.tsx
<Composition
    id="MyComposition"
    component={MyComponent}
    schema={MyCompositionSchema}
    durationInFrames={100}
    fps={30}
    width={1080}
    height={1080}
    defaultProps={{ title: 'Hello World', color: '#ff0000' }}
/>;
```

Top-level type MUST be `z.object()`.

---

### Mediabunny — Video/Audio Metadata

`npx remotion add mediabunny`

> Need video/audio duration, dimensions, or frame extraction? Copy from `refs/mediabunny-utils.ts` — do NOT implement from memory. Contains: `getVideoDuration`, `getAudioDuration`, `getVideoDimensions`, `canDecode`, `extractFrames`.

Use `staticFile()` for local files. Use `FileSource` instead of `UrlSource` in Node.js/Bun.

---

### FFmpeg in Remotion

```bash
npx remotion ffmpeg -i input.mp4 output.mp3
npx remotion ffprobe input.mp4
```

**Trimming — prefer `<Video>` props (non-destructive, no re-encoding):**

```tsx
<Video src={staticFile('video.mp4')} trimBefore={5 * fps} trimAfter={10 * fps} />

// FFmpeg fallback (MUST re-encode to avoid frozen frames)
// npx remotion ffmpeg -ss 00:00:05 -i public/input.mp4 -to 00:00:10 -c:v libx264 -c:a aac public/output.mp4
```

---

### Silence Detection

```bash
# Step 1: measure loudness
npx remotion ffmpeg -i public/video.mov -map 0:a -af loudnorm=print_format=json -f null /dev/null
# → read input_i (integrated loudness dB) and input_thresh

# Step 2: detect silences (d=0.5 = min silence duration in seconds)
npx remotion ffmpeg -i public/video.mov -map 0:a -af "silencedetect=noise=${THRESH}dB:d=0.5" -f null /dev/null
```

```tsx
<Video src={staticFile('video.mov')} trimBefore={Math.floor(leadingEnd * fps)} trimAfter={Math.ceil(trailingStart * fps)} />
```

---

### Audio Visualization

`npx remotion add @remotion/media-utils`

```tsx
import { useWindowedAudioData, visualizeAudio, visualizeAudioWaveform, createSmoothSvgPath } from '@remotion/media-utils';

const { audioData, dataOffsetInSeconds } = useWindowedAudioData({ src: staticFile('music.mp3'), frame, fps, windowInSeconds: 30 });
if (!audioData) return null;

// Spectrum bars (numberOfSamples must be power of 2)
const frequencies = visualizeAudio({ fps, frame, audioData, numberOfSamples: 256, optimizeFor: 'speed', dataOffsetInSeconds });
// Values 0-1; left=bass, right=highs

// Waveform SVG
const waveform = visualizeAudioWaveform({ fps, frame, audioData, numberOfSamples: 256, windowInSeconds: 0.5, dataOffsetInSeconds });
const path = createSmoothSvgPath({ points: waveform.map((y, i) => ({ x: (i / (waveform.length - 1)) * width, y: 100 + y * 100 })) });

// Bass-reactive scale
const bassIntensity = frequencies.slice(0, 32).reduce((sum, v) => sum + v, 0) / 32;
const scale = 1 + bassIntensity * 0.5;
```

**MUST ATTENTION** pass `frame` from parent to child visualization — NEVER call `useCurrentFrame()` in each child inside `<Sequence>`.

Logarithmic scaling: `const db = 20 * Math.log10(value); const scaled = (db - (-100)) / ((-30) - (-100));`

---

### Lottie Animations

`npx remotion add @remotion/lottie`

```tsx
import { Lottie, LottieAnimationData } from '@remotion/lottie';
import { cancelRender, continueRender, delayRender } from 'remotion';

export const MyAnimation = () => {
    const [handle] = useState(() => delayRender('Loading Lottie animation'));
    const [animationData, setAnimationData] = useState<LottieAnimationData | null>(null);

    useEffect(() => {
        fetch('https://assets4.lottiefiles.com/packages/lf20_zyquagfl.json')
            .then(r => r.json())
            .then(json => {
                setAnimationData(json);
                continueRender(handle);
            })
            .catch(err => {
                cancelRender(err);
            });
    }, [handle]);

    if (!animationData) return null;
    return <Lottie animationData={animationData} style={{ width: 400, height: 400 }} />;
};
```

---

### Charts & Data Visualization

**MUST ATTENTION** drive all animations from `useCurrentFrame()`. Disable all third-party chart library animations.

```tsx
import { spring, evolvePath, getLength, getPointAtLength, getTangentAtLength } from '@remotion/paths';

// Bar chart — spring stagger
const bars = data.map((item, i) => {
    const height = spring({ frame, fps, delay: i * 5, config: { damping: 200 } });
    return <div style={{ height: height * item.value }} />;
});

// Line chart path animation (npx remotion add @remotion/paths)
const pathProgress = interpolate(frame, [0, 2 * fps], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
const { strokeDasharray, strokeDashoffset } = evolvePath(pathProgress, svgPath);
<path d={svgPath} fill="none" stroke="#FF3232" strokeWidth={4} strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} />;
```

---

### Maps with Mapbox

`npm i mapbox-gl @turf/turf @types/mapbox-gl` — set `REMOTION_MAPBOX_TOKEN` in `.env`.

> Implementing Mapbox map scene? Copy from `refs/maps-mapbox.tsx` — do NOT implement from memory. Key rules: `interactive: false`, `fadeDuration: 0`, explicit `width`/`height`/`position: "absolute"` on container, animate camera via `useCurrentFrame()`, NO cleanup (`_map.remove()`). Render: `npx remotion render --gl=angle --concurrency=1`.

---

### Transparent Video Rendering

```bash
# ProRes (for video editors)
npx remotion render --image-format=png --pixel-format=yuva444p10le --codec=prores --prores-profile=4444 MyComp out.mov

# WebM VP9 (for browsers)
npx remotion render --image-format=png --pixel-format=yuva420p --codec=vp9 MyComp out.webm
```

---

### AI Voiceover (ElevenLabs TTS)

> Implementing ElevenLabs TTS voiceover? Copy from `refs/generate-voiceover.ts` — do NOT implement from memory. Includes `calculateMetadata` integration to size composition to audio duration.

---

### Sound Effects

```tsx
import { Audio } from '@remotion/sfx';
<Audio src={'https://remotion.media/whoosh.wav'} />;
```

Available: `whoosh`, `whip`, `page-turn`, `switch`, `mouse-click`, `shutter-modern`, `shutter-old`, `ding`, `bruh`, `vine-boom`, `windows-xp-error` — all at `https://remotion.media/{name}.wav`

---

### TailwindCSS

Use if installed. NEVER use `transition-*` or `animate-*` Tailwind classes — animate via `useCurrentFrame()`.

---
