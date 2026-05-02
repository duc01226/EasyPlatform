// Full CaptionedVideo implementation — TikTok-style word highlighting.
// Transcription setup: see SKILL.md Captions section (Whisper.cpp / parseSrt).
// Install: npx remotion add @remotion/captions

import { createTikTokStyleCaptions } from '@remotion/captions';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { AbsoluteFill, staticFile, useDelayRender, Sequence, useVideoConfig, useCurrentFrame } from 'remotion';

const SWITCH_CAPTIONS_EVERY_MS = 1200;
const HIGHLIGHT_COLOR = '#39E508';

export const CaptionedVideo: React.FC = () => {
    const [captions, setCaptions] = useState(null);
    const { delayRender, continueRender, cancelRender } = useDelayRender();
    const [handle] = useState(() => delayRender());

    const fetchCaptions = useCallback(async () => {
        try {
            const data = await fetch(staticFile('captions.json')).then(r => r.json());
            setCaptions(data);
            continueRender(handle);
        } catch (e) {
            cancelRender(e);
        }
    }, [continueRender, cancelRender, handle]);

    useEffect(() => {
        fetchCaptions();
    }, [fetchCaptions]);

    const { pages } = useMemo(
        () => (captions ? createTikTokStyleCaptions({ captions, combineTokensWithinMilliseconds: SWITCH_CAPTIONS_EVERY_MS }) : { pages: [] }),
        [captions]
    );
    const { fps } = useVideoConfig();

    return (
        <AbsoluteFill>
            {pages.map((page, index) => {
                const nextPage = pages[index + 1] ?? null;
                const startFrame = (page.startMs / 1000) * fps;
                const endFrame = Math.min(nextPage ? (nextPage.startMs / 1000) * fps : Infinity, startFrame + (SWITCH_CAPTIONS_EVERY_MS / 1000) * fps);
                const durationInFrames = endFrame - startFrame;
                if (durationInFrames <= 0) return null;
                return (
                    <Sequence key={index} from={startFrame} durationInFrames={durationInFrames}>
                        <CaptionPage page={page} />
                    </Sequence>
                );
            })}
        </AbsoluteFill>
    );
};

// Pass frame from parent — do NOT call useCurrentFrame() in child when inside <Sequence> with offsets.
const CaptionPage: React.FC<{ page: any }> = ({ page }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const currentTimeMs = (frame / fps) * 1000;
    const absoluteTimeMs = page.startMs + currentTimeMs;
    return (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
            {/* whiteSpace: "pre" — captions are whitespace-sensitive */}
            <div style={{ fontSize: 80, fontWeight: 'bold', whiteSpace: 'pre' }}>
                {page.tokens.map(token => {
                    const isActive = token.fromMs <= absoluteTimeMs && token.toMs > absoluteTimeMs;
                    return (
                        <span key={token.fromMs} style={{ color: isActive ? HIGHLIGHT_COLOR : 'white' }}>
                            {token.text}
                        </span>
                    );
                })}
            </div>
        </AbsoluteFill>
    );
};
