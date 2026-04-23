import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { easeOut } from '../utils/animations';

// ─── Palette ──────────────────────────────────────────────────────────────────
export const C = {
    bg: '#070d1a',
    surface: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.08)',
    text: '#e8f0fe',
    dim: '#6080a0',
    blue: '#4f9cf9',
    purple: '#a78bfa',
    green: '#34d399',
    amber: '#fbbf24',
    red: '#f87171',
    cyan: '#22d3ee'
};

// ─── Progress bar (chapter indicator) ─────────────────────────────────────────
export const ProgressBar: React.FC<{ chapterIndex: number; totalChapters: number }> = ({ chapterIndex, totalChapters }) => (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.06)' }}>
        <div
            style={{
                height: '100%',
                width: `${((chapterIndex + 1) / totalChapters) * 100}%`,
                background: `linear-gradient(90deg, ${C.blue}, ${C.purple})`,
                transition: 'none'
            }}
        />
    </div>
);

// ─── Chapter label (top-left badge) ───────────────────────────────────────────
export const ChapterBadge: React.FC<{ index: number; label: string; color?: string }> = ({ index, label, color = C.blue }) => {
    const frame = useCurrentFrame();
    const opacity = easeOut(frame, 0, 18);
    return (
        <div style={{ position: 'absolute', top: 36, left: 48, opacity, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
                style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 800,
                    color: '#000'
                }}
            >
                {index}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color, letterSpacing: 2, textTransform: 'uppercase' }}>{label}</div>
        </div>
    );
};

// ─── Scene shell (dark bg + progress + chapter) ────────────────────────────────
export const Scene: React.FC<{
    chapterIndex: number;
    totalChapters: number;
    chapterLabel: string;
    chapterColor?: string;
    children: React.ReactNode;
    style?: React.CSSProperties;
}> = ({ chapterIndex, totalChapters, chapterLabel, chapterColor, children, style }) => (
    <AbsoluteFill style={{ background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif', ...style }}>
        <ChapterBadge index={chapterIndex} label={chapterLabel} color={chapterColor} />
        <ProgressBar chapterIndex={chapterIndex} totalChapters={totalChapters} />
        {children}
    </AbsoluteFill>
);

// ─── Heading block ─────────────────────────────────────────────────────────────
export const Heading: React.FC<{
    eyebrow?: string;
    title: React.ReactNode;
    eyebrowColor?: string;
    startFrame?: number;
}> = ({ eyebrow, title, eyebrowColor = C.blue, startFrame = 0 }) => {
    const frame = useCurrentFrame();
    const eyebrowOpacity = easeOut(frame, startFrame, 16);
    const titleOpacity = easeOut(frame, startFrame + 8, 22);
    const titleY = interpolate(frame, [startFrame + 8, startFrame + 30], [28, 0], {
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp'
    });
    return (
        <div>
            {eyebrow && (
                <div
                    style={{
                        opacity: eyebrowOpacity,
                        fontSize: 15,
                        fontWeight: 700,
                        color: eyebrowColor,
                        letterSpacing: 3,
                        textTransform: 'uppercase',
                        marginBottom: 10
                    }}
                >
                    {eyebrow}
                </div>
            )}
            <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)`, fontSize: 56, fontWeight: 800, color: C.text, lineHeight: 1.1 }}>
                {title}
            </div>
        </div>
    );
};

// ─── Code block ───────────────────────────────────────────────────────────────
export const CodeBlock: React.FC<{ lines: Array<{ text: string; color?: string }>; startFrame?: number; stagger?: number; fontSize?: number }> = ({
    lines,
    startFrame = 0,
    stagger = 5,
    fontSize = 17
}) => {
    const frame = useCurrentFrame();
    return (
        <div
            style={{
                background: '#0d1117',
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: '20px 24px',
                fontFamily: "'Courier New', monospace",
                fontSize,
                lineHeight: 1.7,
                overflow: 'hidden'
            }}
        >
            {lines.map((line, i) => {
                const opacity = easeOut(frame, startFrame + i * stagger, 14);
                return (
                    <div key={i} style={{ opacity, color: line.color ?? C.dim, whiteSpace: 'pre' }}>
                        {line.text}
                    </div>
                );
            })}
        </div>
    );
};

// ─── Pill badge ───────────────────────────────────────────────────────────────
export const Pill: React.FC<{ label: string; color: string; opacity?: number }> = ({ label, color, opacity = 1 }) => (
    <div
        style={{
            opacity,
            background: `${color}22`,
            border: `1px solid ${color}55`,
            borderRadius: 100,
            padding: '5px 16px',
            fontSize: 16,
            fontWeight: 600,
            color,
            display: 'inline-block'
        }}
    >
        {label}
    </div>
);

// ─── Divider line ─────────────────────────────────────────────────────────────
export const Divider: React.FC<{ color?: string; opacity?: number }> = ({ color = C.blue, opacity = 0.3 }) => (
    <div style={{ width: 64, height: 3, background: `linear-gradient(90deg, ${color}, ${C.purple})`, borderRadius: 2, opacity }} />
);

// ─── Script overlay bar (presentation subtitle for silent video) ──────────────
export const ScriptBar: React.FC<{ lines: string[] }> = ({ lines }) => {
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();

    const framesPerLine = Math.floor(durationInFrames / lines.length);
    const currentIndex = Math.min(Math.floor(frame / framesPerLine), lines.length - 1);
    const localFrame = frame - currentIndex * framesPerLine;

    const fadeIn = interpolate(localFrame, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const fadeOut = interpolate(localFrame, [framesPerLine - 12, framesPerLine - 2], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const opacity = Math.min(fadeIn, fadeOut);

    return (
        <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
            <div
                style={{
                    background: 'rgba(7,13,26,0.88)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10,
                    padding: '10px 28px',
                    maxWidth: 1100,
                    opacity
                }}
            >
                <span style={{ fontSize: 18, fontWeight: 400, color: '#b0c8e8', lineHeight: 1.5 }}>{lines[currentIndex]}</span>
            </div>
        </div>
    );
};

// ─── Animated row item ────────────────────────────────────────────────────────
export const AnimRow: React.FC<{
    frame: number;
    startAt: number;
    children: React.ReactNode;
    direction?: 'up' | 'left';
    distance?: number;
}> = ({ frame, startAt, children, direction = 'up', distance = 20 }) => {
    const p = easeOut(frame, startAt, 18);
    const translate = interpolate(p, [0, 1], [distance, 0]);
    return (
        <div
            style={{
                opacity: p,
                transform: direction === 'up' ? `translateY(${translate}px)` : `translateX(${translate}px)`
            }}
        >
            {children}
        </div>
    );
};
