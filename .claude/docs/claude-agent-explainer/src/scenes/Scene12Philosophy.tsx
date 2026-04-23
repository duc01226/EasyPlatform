import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { C, ProgressBar, ScriptBar } from '../components/Shared';
import { easeOut, staggeredEaseOut } from '../utils/animations';

const SCRIPT_LINES = [
    "These 6 principles are the design philosophy behind every architectural decision. 'Understanding > Output' means analyze the WHY before writing the WHAT. 'Programmatic guardrails beat prompt engineering' means hooks are always more reliable than a long system prompt — because hooks run unconditionally.",
    "The closing principle is the most important: build systems, not prompts. A clever prompt solves one problem once. A system solves all similar problems forever. The ~37 hooks, 258 skills, 48 workflows, and 28 agents you've seen here are a system — battle-tested across 12+ microservices and fully project-agnostic."
];

const PRINCIPLES = [
    { text: 'Understanding > Output — design WHY before WHAT', color: C.blue },
    { text: 'Programmatic guardrails beat prompt engineering', color: C.purple },
    { text: 'Inject context at decision points, not session start', color: C.green },
    { text: 'Evidence gates prevent hallucination better than warnings', color: C.amber },
    { text: 'Full SDLC coverage — no phase is AI-free', color: C.cyan },
    { text: 'Build systems, not one-off prompts', color: C.blue }
];

const TAGS = [
    { label: '~37 Hooks', color: C.blue },
    { label: '258 Skills', color: C.purple },
    { label: '48 Workflows', color: C.green },
    { label: '28 Agents', color: C.amber }
];

export const Scene12Philosophy: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const glowPulse = 0.2 + 0.08 * Math.sin((frame / fps) * Math.PI * 1.5);

    const titleP = easeOut(frame, 0, 24);
    const titleY = interpolate(frame, [0, 24], [32, 0], {
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp'
    });

    return (
        <AbsoluteFill style={{ background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            {/* Radial glow */}
            <div
                style={{
                    position: 'absolute',
                    top: '15%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 700,
                    height: 400,
                    borderRadius: '50%',
                    background: `radial-gradient(ellipse, ${C.blue}18 0%, transparent 70%)`,
                    opacity: glowPulse,
                    pointerEvents: 'none'
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    bottom: '10%',
                    right: '10%',
                    width: 400,
                    height: 400,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${C.purple}14 0%, transparent 70%)`,
                    opacity: glowPulse * 0.8,
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
                    padding: '72px 100px',
                    gap: 28,
                    textAlign: 'center'
                }}
            >
                {/* Eyebrow */}
                <div style={{ opacity: easeOut(frame, 0, 16), fontSize: 14, fontWeight: 700, color: C.blue, letterSpacing: 3 }}>PHILOSOPHY & PRINCIPLES</div>

                {/* Main headline */}
                <div style={{ opacity: titleP, transform: `translateY(${titleY}px)`, lineHeight: 1.08 }}>
                    <div style={{ fontSize: 76, fontWeight: 900, color: C.text }}>Build systems,</div>
                    <div
                        style={{
                            fontSize: 76,
                            fontWeight: 900,
                            background: `linear-gradient(135deg, ${C.blue}, ${C.purple}, ${C.green})`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}
                    >
                        not prompts.
                    </div>
                </div>

                {/* Principles */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 900, width: '100%' }}>
                    {PRINCIPLES.map((p, i) => {
                        const itemP = staggeredEaseOut(frame, i, 28, 10, 14);
                        const itemX = interpolate(itemP, [0, 1], [-20, 0]);
                        return (
                            <div
                                key={i}
                                style={{
                                    opacity: itemP,
                                    transform: `translateX(${itemX}px)`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 14,
                                    background: C.surface,
                                    borderRadius: 10,
                                    padding: '12px 20px',
                                    borderLeft: `3px solid ${p.color}`
                                }}
                            >
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                                <span style={{ fontSize: 18, color: C.text }}>{p.text}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Tag pills */}
                <div style={{ opacity: easeOut(frame, 90, 20), display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {TAGS.map(tag => (
                        <div
                            key={tag.label}
                            style={{
                                background: `${tag.color}1a`,
                                border: `1px solid ${tag.color}55`,
                                borderRadius: 100,
                                padding: '8px 22px',
                                fontSize: 18,
                                fontWeight: 700,
                                color: tag.color
                            }}
                        >
                            {tag.label}
                        </div>
                    ))}
                </div>

                {/* Closing line */}
                <div style={{ opacity: easeOut(frame, 108, 22), fontSize: 22, color: C.dim, maxWidth: 700, lineHeight: 1.55 }}>
                    Claude AI Agent Framework — open source, project-agnostic, battle-tested across 12+ microservices.
                </div>
            </div>

            <ScriptBar lines={SCRIPT_LINES} />
            <ProgressBar chapterIndex={14} totalChapters={15} />
        </AbsoluteFill>
    );
};
