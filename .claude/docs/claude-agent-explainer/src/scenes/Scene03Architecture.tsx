import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { C, ProgressBar, ChapterBadge, ScriptBar } from '../components/Shared';
import { easeOut, staggeredEaseOut } from '../utils/animations';

const SCRIPT_LINES = [
    'The architecture has 6 layers and dependencies flow inward only — just like Clean Architecture. At the base is Configuration: a single project-config.json that makes the entire framework project-agnostic.',
    'The Enforcement Layer is the backbone: ~37 hooks fire on every session start, file edit, and tool call — injecting context, blocking unsafe actions, and enforcing task planning before any code is touched.',
    "Here's what makes this powerful: swap project-config.json to point at any codebase and all 258 skills, 48 workflows, and 28 agents instantly adapt — zero reconfiguration of the intelligence layers above."
];

const LAYERS = [
    { label: 'Configuration Layer', sub: 'project-config.json · .ck.json · settings.json', color: C.dim, icon: '⚙️' },
    { label: 'State Layer', sub: 'Todo state · Workflow state · Swap engine (memory)', color: C.cyan, icon: '💾' },
    { label: 'Orchestration Layer', sub: '48 Workflows · JSON sequences · Step enforcement', color: C.green, icon: '🔄' },
    { label: 'Intelligence Layer', sub: '258 Skills · Shared protocols · Evidence gates', color: C.purple, icon: '⚡' },
    { label: 'Enforcement Layer', sub: '~37 Hooks · Safety · Quality · Context injection', color: C.blue, icon: '🪝' },
    { label: 'User Layer', sub: 'Developer prompt → Workflow router → AskUserQuestion', color: C.amber, icon: '👤' }
];

export const Scene03Architecture: React.FC = () => {
    const frame = useCurrentFrame();

    const titleP = easeOut(frame, 0, 20);
    const titleY = interpolate(frame, [0, 20], [24, 0], {
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp'
    });

    // arrow between layers
    const arrowP = (i: number) => easeOut(frame, 20 + i * 16 + 10, 12);

    return (
        <AbsoluteFill style={{ background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <ChapterBadge index={3} label="Architecture" color={C.cyan} />

            <div style={{ position: 'absolute', inset: 0, display: 'flex', gap: 56, alignItems: 'center', padding: '72px 80px 48px' }}>
                {/* Left: heading */}
                <div style={{ width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ opacity: easeOut(frame, 0, 14), fontSize: 14, fontWeight: 700, color: C.cyan, letterSpacing: 3 }}>SYSTEM ARCHITECTURE</div>
                    <div style={{ opacity: titleP, transform: `translateY(${titleY}px)`, fontSize: 52, fontWeight: 800, color: C.text, lineHeight: 1.1 }}>
                        Six layers,
                        <br />
                        one direction.
                    </div>
                    <div style={{ opacity: easeOut(frame, 24, 18), fontSize: 19, color: C.dim, lineHeight: 1.6 }}>
                        Dependencies flow <strong style={{ color: C.text }}>inward only</strong>. Each layer depends on the ones below — never above.
                    </div>
                    <div
                        style={{
                            opacity: easeOut(frame, 36, 16),
                            fontSize: 16,
                            color: C.dim,
                            lineHeight: 1.6,
                            borderLeft: `2px solid ${C.blue}44`,
                            paddingLeft: 14
                        }}
                    >
                        The framework is <strong style={{ color: C.blue }}>project-agnostic</strong> — swap{' '}
                        <code style={{ background: '#0d1117', padding: '1px 6px', borderRadius: 4, fontSize: 14 }}>project-config.json</code> to target any
                        codebase.
                    </div>
                </div>

                {/* Right: layer stack (bottom to top visually = top to bottom in DOM reversed) */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column-reverse', gap: 6 }}>
                    {LAYERS.map((layer, i) => {
                        const p = staggeredEaseOut(frame, i, 16, 16, 20);
                        const x = interpolate(p, [0, 1], [40, 0]);
                        const isHighlighted = i === 4; // Enforcement = blue highlight

                        return (
                            <div key={layer.label}>
                                <div
                                    style={{
                                        opacity: p,
                                        transform: `translateX(${x}px)`,
                                        background: isHighlighted ? `${C.blue}14` : C.surface,
                                        border: `1px solid ${isHighlighted ? C.blue + '55' : C.border}`,
                                        borderLeft: `4px solid ${layer.color}`,
                                        borderRadius: 10,
                                        padding: '14px 20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 14
                                    }}
                                >
                                    <span style={{ fontSize: 22 }}>{layer.icon}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 17, fontWeight: 700, color: layer.color }}>{layer.label}</div>
                                        <div style={{ fontSize: 13, color: C.dim, marginTop: 2 }}>{layer.sub}</div>
                                    </div>
                                </div>

                                {/* Downward arrow between layers (skip last) */}
                                {i < LAYERS.length - 1 && (
                                    <div style={{ opacity: arrowP(i), textAlign: 'center', fontSize: 13, color: C.dim, margin: '1px 0', lineHeight: 1 }}>▾</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <ScriptBar lines={SCRIPT_LINES} />
            <ProgressBar chapterIndex={2} totalChapters={15} />
        </AbsoluteFill>
    );
};
