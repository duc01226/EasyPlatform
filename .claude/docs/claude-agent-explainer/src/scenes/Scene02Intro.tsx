import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { C, ProgressBar, Divider, ScriptBar } from '../components/Shared';
import { easeOut, counter, staggeredEaseOut } from '../utils/animations';

const SCRIPT_LINES = [
    'The Claude AI Agent Framework is a 3-layer system: ~40 hooks enforce correctness on every tool call, 258 skills encode expert protocols into slash commands, and 48 workflows sequence every SDLC stage end-to-end.',
    'The key insight: instead of engineering the perfect prompt once, you engineer a system that enforces the right behavior every time — across 28 specialized agents covering the full development lifecycle.'
];

const STATS = [
    { value: 40, suffix: '', label: 'Hooks', sub: '56 files, enforcement layer', color: C.blue },
    { value: 258, suffix: '', label: 'Skills', sub: 'protocol-driven intelligence', color: C.purple },
    { value: 48, suffix: '', label: 'Workflows', sub: 'full SDLC coverage', color: C.green },
    { value: 28, suffix: '', label: 'Agents', sub: 'specialized sub-agents', color: C.amber }
];

export const Scene02Intro: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const eyebrowP = easeOut(frame, 0, 16);
    const titleP = easeOut(frame, 10, 22);
    const titleY = interpolate(frame, [10, 32], [28, 0], {
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp'
    });
    const subP = easeOut(frame, 28, 20);
    const divP = easeOut(frame, 38, 16);

    return (
        <AbsoluteFill style={{ background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            {/* Top glow */}
            <div
                style={{
                    position: 'absolute',
                    top: -80,
                    left: '35%',
                    width: 600,
                    height: 400,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${C.blue}18 0%, transparent 70%)`,
                    pointerEvents: 'none'
                }}
            />

            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '0 80px',
                    gap: 28,
                    textAlign: 'center'
                }}
            >
                <div style={{ opacity: eyebrowP, fontSize: 15, fontWeight: 700, color: C.blue, letterSpacing: 3 }}>CLAUDE AI AGENT FRAMEWORK</div>

                <div
                    style={{
                        opacity: titleP,
                        transform: `translateY(${titleY}px)`,
                        fontSize: 72,
                        fontWeight: 900,
                        color: C.text,
                        lineHeight: 1.06,
                        maxWidth: 1100
                    }}
                >
                    A 3-layer framework that turns a<br />
                    generic LLM into a{' '}
                    <span
                        style={{
                            background: `linear-gradient(135deg, ${C.blue}, ${C.purple})`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}
                    >
                        quality-enforced
                    </span>
                    <br />
                    development agent.
                </div>

                <div style={{ opacity: subP, fontSize: 24, color: C.dim, maxWidth: 800, lineHeight: 1.55 }}>
                    Hooks enforce correctness. Skills encode expertise.
                    <br />
                    Workflows sequence every stage of the SDLC.
                </div>

                <div style={{ opacity: divP }}>
                    <Divider />
                </div>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, width: '100%', maxWidth: 1300 }}>
                    {STATS.map((s, i) => {
                        const p = staggeredEaseOut(frame, i, 44, 14, 18);
                        const translateY = interpolate(p, [0, 1], [30, 0]);
                        const val = counter(frame, 44 + i * 14, 28, s.value);
                        return (
                            <div
                                key={s.label}
                                style={{
                                    opacity: p,
                                    transform: `translateY(${translateY}px)`,
                                    background: C.surface,
                                    border: `1px solid ${s.color}33`,
                                    borderTop: `3px solid ${s.color}`,
                                    borderRadius: 16,
                                    padding: '24px 20px',
                                    textAlign: 'center'
                                }}
                            >
                                <div style={{ fontSize: 64, fontWeight: 900, color: s.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                                    {val}
                                    {s.suffix}
                                </div>
                                <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginTop: 6 }}>{s.label}</div>
                                <div style={{ fontSize: 14, color: C.dim, marginTop: 4 }}>{s.sub}</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <ScriptBar lines={SCRIPT_LINES} />
            <ProgressBar chapterIndex={1} totalChapters={15} />
        </AbsoluteFill>
    );
};
