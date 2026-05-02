// Text animation components for Remotion.
// Copy getTypedText + Cursor + TypewriterScene for typewriter effect.
// Copy Highlight for spring-animated word highlight wipe.

import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';

// ─── Typewriter ───────────────────────────────────────────────────────────────
// Use string slicing — NEVER per-character opacity.

const FULL_TEXT = 'From prompt to motion graphics. This is Remotion.';
const PAUSE_AFTER = 'From prompt to motion graphics.';
const CHAR_FRAMES = 2;
const CURSOR_BLINK_FRAMES = 16;
const PAUSE_SECONDS = 1;

const getTypedText = ({
    frame,
    fullText,
    pauseAfter,
    charFrames,
    pauseFrames
}: {
    frame: number;
    fullText: string;
    pauseAfter: string;
    charFrames: number;
    pauseFrames: number;
}): string => {
    const pauseIndex = fullText.indexOf(pauseAfter);
    const preLen = pauseIndex >= 0 ? pauseIndex + pauseAfter.length : fullText.length;
    let typedChars = 0;
    if (frame < preLen * charFrames) {
        typedChars = Math.floor(frame / charFrames);
    } else if (frame < preLen * charFrames + pauseFrames) {
        typedChars = preLen;
    } else {
        const postPhase = frame - preLen * charFrames - pauseFrames;
        typedChars = Math.min(fullText.length, preLen + Math.floor(postPhase / charFrames));
    }
    return fullText.slice(0, typedChars);
};

const Cursor: React.FC<{ frame: number; blinkFrames: number; symbol?: string }> = ({ frame, blinkFrames, symbol = '\u258C' }) => {
    const opacity = interpolate(frame % blinkFrames, [0, blinkFrames / 2, blinkFrames], [1, 0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp'
    });
    return <span style={{ opacity }}>{symbol}</span>;
};

export const TypewriterScene = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const pauseFrames = Math.round(fps * PAUSE_SECONDS);
    const typedText = getTypedText({ frame, fullText: FULL_TEXT, pauseAfter: PAUSE_AFTER, charFrames: CHAR_FRAMES, pauseFrames });
    return (
        <AbsoluteFill style={{ backgroundColor: '#ffffff' }}>
            <div style={{ color: '#000000', fontSize: 72, fontWeight: 700, fontFamily: 'sans-serif' }}>
                <span>{typedText}</span>
                <Cursor frame={frame} blinkFrames={CURSOR_BLINK_FRAMES} />
            </div>
        </AbsoluteFill>
    );
};

// ─── Word Highlight ───────────────────────────────────────────────────────────
// Spring-animated scaleX wipe behind each word.

const { fontFamily } = loadFont();

export const Highlight: React.FC<{ word: string; color: string; delay: number; durationInFrames: number }> = ({ word, color, delay, durationInFrames }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const scaleX = Math.max(0, Math.min(1, spring({ fps, frame, config: { damping: 200 }, delay, durationInFrames })));
    return (
        <span style={{ position: 'relative', display: 'inline-block' }}>
            <span
                style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: '50%',
                    height: '1.05em',
                    transform: `translateY(-50%) scaleX(${scaleX})`,
                    transformOrigin: 'left center',
                    backgroundColor: color,
                    borderRadius: '0.18em',
                    zIndex: 0
                }}
            />
            <span style={{ position: 'relative', zIndex: 1 }}>{word}</span>
        </span>
    );
};

// Usage example:
// <div style={{ fontFamily, fontSize: 80 }}>
//   <Highlight word="Remotion" color="#39E508" delay={10} durationInFrames={20} />
// </div>
