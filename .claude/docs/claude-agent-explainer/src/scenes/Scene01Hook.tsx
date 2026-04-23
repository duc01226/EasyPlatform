import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { C, ProgressBar, ScriptBar } from '../components/Shared';
import { easeOut, staggeredEaseOut } from '../utils/animations';

const SCRIPT_LINES = [
    "Every AI-assisted dev team hits the same wall: the AI forgets your codebase patterns, hallucinates method signatures, and injects patterns from its training data that don't match your architecture.",
    "The root cause isn't the model — it's the lack of a system. This framework wraps Claude Code in programmatic guardrails so correctness is enforced, not hoped for."
];

const PROBLEMS = [
    { text: 'AI forgets context after 20 tool calls…', color: C.red },
    { text: 'AI hallucinates method signatures…', color: C.amber },
    { text: 'AI skips investigation, jumps to code…', color: C.red },
    { text: 'AI injects wrong patterns from training…', color: C.amber },
    { text: 'AI ignores project doc format and conventions…', color: C.amber },
    { text: 'You repeat the same corrections every day.', color: C.red }
];

export const Scene01Hook: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const eyebrowP = easeOut(frame, 0, 18);
    const titleP = easeOut(frame, 12, 24);
    const titleY = interpolate(frame, [12, 36], [32, 0], {
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp'
    });

    // pulsing red glow
    const glow = 0.18 + 0.08 * Math.sin((frame / fps) * Math.PI * 2);

    return (
        <AbsoluteFill style={{ background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            {/* Background glow */}
            <div
                style={{
                    position: 'absolute',
                    top: '10%',
                    left: '5%',
                    width: 500,
                    height: 500,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${C.red}33 0%, transparent 70%)`,
                    opacity: glow,
                    pointerEvents: 'none'
                }}
            />

            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 120px', gap: 32 }}>
                {/* Eyebrow */}
                <div style={{ opacity: eyebrowP, fontSize: 15, fontWeight: 700, color: C.red, letterSpacing: 3 }}>THE PROBLEM WITH AI-ASSISTED DEVELOPMENT</div>

                {/* Title */}
                <div
                    style={{
                        opacity: titleP,
                        transform: `translateY(${titleY}px)`,
                        fontSize: 68,
                        fontWeight: 900,
                        color: C.text,
                        lineHeight: 1.08,
                        maxWidth: 900
                    }}
                >
                    LLMs forget,
                    <br />
                    <span style={{ color: C.red }}>hallucinate</span>,<br />
                    and drift.
                </div>

                {/* Problem list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
                    {PROBLEMS.map((p, i) => {
                        const itemP = staggeredEaseOut(frame, i, 32, 14, 16);
                        const itemX = interpolate(itemP, [0, 1], [-30, 0]);
                        return (
                            <div
                                key={i}
                                style={{
                                    opacity: itemP,
                                    transform: `translateX(${itemX}px)`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 14
                                }}
                            >
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                                <span style={{ fontSize: 22, color: C.dim }}>{p.text}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Hook line */}
                <div
                    style={{
                        opacity: easeOut(frame, 120, 20),
                        marginTop: 8,
                        fontSize: 26,
                        fontWeight: 700,
                        color: C.text,
                        borderLeft: `3px solid ${C.blue}`,
                        paddingLeft: 20
                    }}
                >
                    This framework solves all of it — programmatically.
                </div>
            </div>

            <ScriptBar lines={SCRIPT_LINES} />
            <ProgressBar chapterIndex={0} totalChapters={15} />
        </AbsoluteFill>
    );
};
