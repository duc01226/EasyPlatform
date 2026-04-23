// Full template for src/components/Shared.tsx
// All scenes import from here. Always create on scaffold.

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

// ─── Progress bar ─────────────────────────────────────────────────────────────
export const ProgressBar: React.FC<{ chapterIndex: number; totalChapters: number }> = ({ chapterIndex, totalChapters }) => (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.06)' }}>
        <div
            style={{ height: '100%', width: `${((chapterIndex + 1) / totalChapters) * 100}%`, background: `linear-gradient(90deg, ${C.blue}, ${C.purple})` }}
        />
    </div>
);

// ─── Chapter badge ────────────────────────────────────────────────────────────
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

// ─── Code block ───────────────────────────────────────────────────────────────
export const CodeBlock: React.FC<{ lines: Array<{ text: string; color?: string }>; startFrame?: number; stagger?: number; fontSize?: number }> = ({
    lines,
    startFrame = 0,
    stagger = 5,
    fontSize = 16
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
            {lines.map((line, i) => (
                <div key={i} style={{ opacity: easeOut(frame, startFrame + i * stagger, 14), color: line.color ?? C.dim, whiteSpace: 'pre' }}>
                    {line.text}
                </div>
            ))}
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
            fontSize: 15,
            fontWeight: 600,
            color,
            display: 'inline-block'
        }}
    >
        {label}
    </div>
);

// ─── Animated row ─────────────────────────────────────────────────────────────
export const AnimRow: React.FC<{ frame: number; startAt: number; children: React.ReactNode; direction?: 'up' | 'left'; distance?: number }> = ({
    frame,
    startAt,
    children,
    direction = 'up',
    distance = 20
}) => {
    const p = easeOut(frame, startAt, 18);
    const translate = interpolate(p, [0, 1], [distance, 0]);
    return <div style={{ opacity: p, transform: direction === 'up' ? `translateY(${translate}px)` : `translateX(${translate}px)` }}>{children}</div>;
};
