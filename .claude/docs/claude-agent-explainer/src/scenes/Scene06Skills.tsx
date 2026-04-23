import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { C, ProgressBar, ChapterBadge, CodeBlock, ScriptBar } from '../components/Shared';
import { easeOut, staggeredEaseOut } from '../utils/animations';

const SCRIPT_LINES = [
    'A skill is a Markdown file with YAML frontmatter that declares its name, version, and allowed tools — restricting what Claude can do while that skill runs. 258 skills across 12 categories cover every development stage, from planning and research to architecture review and release documentation.',
    'The confidence gate is what prevents hallucination at the skill level. Every skill enforces: 95%+ = recommend freely, 80-94% = recommend with caveats, 60-79% = proceed cautiously, under 60% = STOP and gather more evidence before acting. This threshold is a protocol, not a suggestion.',
    'The 25 shared protocols are physically inlined into each skill file via SYNC:tag blocks. This is a deliberate architectural choice: protocols behind file references get skipped when context is tight, but inlined protocols are always present. AI compliance increases ~40% compared to file references.'
];

const CATEGORIES = [
    { label: 'Quality & Verification', skills: 'code-review · prove-fix · quality-gate · sre-review', color: C.green },
    { label: 'Planning & Research', skills: 'plan · investigate · scout · research', color: C.blue },
    { label: 'Implementation', skills: 'cook · cook-hard · fix · refactoring · api-design', color: C.purple },
    { label: 'Testing & TDD', skills: 'tdd-spec · integration-test · e2e-test · test', color: C.amber },
    { label: 'Requirements & Ideas', skills: 'idea · refine · story · business-evaluation', color: C.cyan },
    { label: 'Architecture', skills: 'arch-security-review · domain-analysis · scaffold', color: C.red }
];

const CONFIDENCE = [
    { range: '95–100%', label: 'Recommend freely', bar: 1.0, color: C.green },
    { range: '80–94%', label: 'Recommend w/ caveats', bar: 0.78, color: C.blue },
    { range: '60–79%', label: 'Recommend cautiously', bar: 0.58, color: C.amber },
    { range: '< 60%', label: '❌ STOP. Gather more evidence', bar: 0.25, color: C.red }
];

export const Scene06Skills: React.FC = () => {
    const frame = useCurrentFrame();

    return (
        <AbsoluteFill style={{ background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <ChapterBadge index={6} label="Skill System" color={C.purple} />

            <div style={{ position: 'absolute', inset: 0, display: 'flex', gap: 40, padding: '68px 64px 44px' }}>
                {/* Left */}
                <div style={{ width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div style={{ opacity: easeOut(frame, 0, 14), fontSize: 14, fontWeight: 700, color: C.purple, letterSpacing: 3 }}>
                        SKILL SYSTEM · 258 SKILLS
                    </div>
                    <div style={{ opacity: easeOut(frame, 8, 20), fontSize: 44, fontWeight: 800, color: C.text, lineHeight: 1.1 }}>
                        Markdown protocols,
                        <br />
                        <span style={{ color: C.purple }}>loaded on demand.</span>
                    </div>

                    <div style={{ opacity: easeOut(frame, 20, 16) }}>
                        <CodeBlock
                            startFrame={20}
                            stagger={4}
                            lines={[
                                { text: '# .claude/skills/prove-fix/SKILL.md', color: C.dim },
                                { text: '---', color: C.dim },
                                { text: 'name: prove-fix', color: C.blue },
                                { text: 'version: 1.2.0', color: C.dim },
                                { text: 'allowed-tools: Read, Grep, Bash', color: C.green },
                                { text: '---', color: C.dim },
                                { text: '## Protocol', color: C.purple },
                                { text: '1. Trace proof chain for each change', color: C.text },
                                { text: '2. Declare confidence level…', color: C.text }
                            ]}
                        />
                    </div>

                    {/* Confidence gauge */}
                    <div style={{ opacity: easeOut(frame, 44, 16), display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.dim, letterSpacing: 2 }}>CONFIDENCE GATE</div>
                        {CONFIDENCE.map((c, i) => {
                            const barP = easeOut(frame, 50 + i * 8, 16);
                            return (
                                <div key={c.range} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 52, fontSize: 12, fontWeight: 700, color: c.color, flexShrink: 0 }}>{c.range}</div>
                                    <div style={{ flex: 1, height: 6, background: `${C.border}`, borderRadius: 3, overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${c.bar * barP * 100}%`, background: c.color, borderRadius: 3 }} />
                                    </div>
                                    <div style={{ fontSize: 12, color: C.dim, width: 180, flexShrink: 0 }}>{c.label}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right: categories */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
                    <div style={{ opacity: easeOut(frame, 16, 14), fontSize: 13, fontWeight: 700, color: C.dim, letterSpacing: 2, marginBottom: 4 }}>
                        12 SKILL CATEGORIES
                    </div>
                    {CATEGORIES.map((cat, i) => {
                        const p = staggeredEaseOut(frame, i, 20, 13, 16);
                        const x = interpolate(p, [0, 1], [30, 0]);
                        return (
                            <div
                                key={cat.label}
                                style={{
                                    opacity: p,
                                    transform: `translateX(${x}px)`,
                                    background: C.surface,
                                    border: `1px solid ${cat.color}33`,
                                    borderLeft: `3px solid ${cat.color}`,
                                    borderRadius: 10,
                                    padding: '12px 18px',
                                    display: 'flex',
                                    alignItems: 'baseline',
                                    gap: 14
                                }}
                            >
                                <div style={{ fontSize: 15, fontWeight: 700, color: cat.color, minWidth: 200, flexShrink: 0 }}>{cat.label}</div>
                                <div style={{ fontSize: 13, color: C.dim, fontFamily: "'Courier New', monospace" }}>{cat.skills}</div>
                            </div>
                        );
                    })}

                    {/* SYNC inline box */}
                    <div
                        style={{
                            opacity: easeOut(frame, 100, 18),
                            marginTop: 8,
                            background: '#0d1117',
                            border: `1px solid ${C.purple}44`,
                            borderRadius: 10,
                            padding: '12px 16px',
                            fontSize: 14,
                            color: C.dim,
                            lineHeight: 1.6
                        }}
                    >
                        <span style={{ color: C.purple, fontWeight: 700 }}>25 shared protocols</span> inlined via{' '}
                        <code style={{ color: C.amber }}>{'<!-- SYNC:tag -->'}</code> blocks — always in context, never behind a file-read.{' '}
                        <span style={{ color: C.text }}>AI compliance ↑ ~40% vs file references.</span>
                    </div>
                </div>
            </div>

            <ScriptBar lines={SCRIPT_LINES} />
            <ProgressBar chapterIndex={5} totalChapters={15} />
        </AbsoluteFill>
    );
};
