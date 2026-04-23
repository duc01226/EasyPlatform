import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { C, ProgressBar, ChapterBadge, CodeBlock, ScriptBar } from '../components/Shared';
import { easeOut, staggeredEaseOut } from '../utils/animations';

const SCRIPT_LINES = [
    "Context injection solves the AI forgetting problem. When you edit a backend file, backend-context.cjs silently prepends the full patterns doc — 60KB — before Claude sees the tool result. The AI never asks 'what conventions does this project use?' because the answer is already there, every single time.",
    "The deduplication logic is critical: hooks check the last 300 transcript lines for a marker. If already injected, skip it. If context was compacted and the marker is gone, re-inject automatically. This keeps context lean while ensuring patterns are always available at the exact moment they're needed."
];

const INJECTIONS = [
    { trigger: 'Every user prompt', context: 'Workflow catalog + dev rules + learned lessons', hook: 'workflow-router.cjs', color: C.purple },
    { trigger: 'Edit/Write/Agent/Skill/Task', context: 'Senior engineer mindset + trade-off focus', hook: 'mindset-injector.cjs', color: '#e879f9' },
    { trigger: 'Read/Grep/Glob/Bash', context: 'Compact investigative mindset', hook: 'mindset-compact-injector.cjs', color: '#e879f9' },
    { trigger: 'Edit backend file', context: 'Backend patterns doc (~60KB)', hook: 'backend-context.cjs', color: C.blue },
    { trigger: 'Edit frontend file', context: 'Frontend patterns + design tokens', hook: 'frontend-context.cjs', color: C.green },
    { trigger: 'Edit feature doc', context: '17-section format + TC-{FEAT}-{NNN} pattern', hook: 'feature-docs-context.cjs', color: C.cyan },
    { trigger: 'Edit test spec file', context: 'Test spec format + traceability rules', hook: 'test-specs-context.cjs', color: C.cyan },
    { trigger: 'Activate code-review', context: 'Code review rules + quality checklist', hook: 'code-review-rules-injector', color: C.amber },
    { trigger: 'Subagent spawned', context: 'Full project context + lessons (18+ part-hooks)', hook: 'subagent-init-*.cjs', color: C.red }
];

export const Scene05ContextInjection: React.FC = () => {
    const frame = useCurrentFrame();

    return (
        <AbsoluteFill style={{ background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <ChapterBadge index={5} label="Context Injection" color={C.purple} />

            <div style={{ position: 'absolute', inset: 0, display: 'flex', gap: 48, padding: '68px 72px 44px' }}>
                {/* Left panel */}
                <div style={{ width: 400, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ opacity: easeOut(frame, 0, 14), fontSize: 15, fontWeight: 700, color: C.purple, letterSpacing: 3 }}>
                        CONTEXT INJECTION · AUTO-MAGIC
                    </div>
                    <div style={{ opacity: easeOut(frame, 8, 22), fontSize: 48, fontWeight: 800, color: C.text, lineHeight: 1.1 }}>
                        50–100KB of project knowledge, <span style={{ color: C.purple }}>automatically</span>.
                    </div>
                    <div style={{ opacity: easeOut(frame, 22, 18), fontSize: 21, color: C.dim, lineHeight: 1.6 }}>
                        The AI never has to ask "what patterns does this project use?" — hooks inject them before every relevant tool call.
                    </div>

                    {/* Dedup box */}
                    <div style={{ opacity: easeOut(frame, 34, 16) }}>
                        <CodeBlock
                            startFrame={34}
                            stagger={4}
                            fontSize={14}
                            lines={[
                                { text: '// Dedup: skip if marker in last 300 lines', color: C.dim },
                                { text: 'if (transcript.includes("## Backend Context"))', color: C.amber },
                                { text: '  return; // already injected this session', color: C.dim },
                                { text: '', color: C.dim },
                                { text: '// Re-inject after compaction (markers gone)', color: C.dim },
                                { text: 'injectContext(backendPatternsDoc);', color: C.green }
                            ]}
                        />
                    </div>

                    <div
                        style={{
                            opacity: easeOut(frame, 60, 16),
                            fontSize: 17,
                            color: C.dim,
                            lineHeight: 1.6,
                            borderLeft: `2px solid ${C.purple}44`,
                            paddingLeft: 14
                        }}
                    >
                        Deduplication prevents the same 60KB from bloating context on every edit. Re-injected automatically after compaction.
                    </div>
                </div>

                {/* Right: injection table */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, justifyContent: 'center' }}>
                    {/* Header */}
                    <div
                        style={{
                            opacity: easeOut(frame, 18, 14),
                            display: 'grid',
                            gridTemplateColumns: '1fr 1.4fr 1fr',
                            gap: 8,
                            paddingBottom: 10,
                            borderBottom: `1px solid ${C.border}`
                        }}
                    >
                        {['Trigger', 'Context Injected', 'Hook'].map(h => (
                            <div key={h} style={{ fontSize: 14, fontWeight: 700, color: C.dim, letterSpacing: 2, textTransform: 'uppercase' }}>
                                {h}
                            </div>
                        ))}
                    </div>

                    {INJECTIONS.map((row, i) => {
                        const p = staggeredEaseOut(frame, i, 22, 14, 16);
                        const y = interpolate(p, [0, 1], [14, 0]);
                        return (
                            <div
                                key={row.trigger}
                                style={{
                                    opacity: p,
                                    transform: `translateY(${y}px)`,
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1.4fr 1fr',
                                    gap: 6,
                                    padding: '6px 12px',
                                    background: C.surface,
                                    borderRadius: 8,
                                    borderLeft: `3px solid ${row.color}`,
                                    alignItems: 'center'
                                }}
                            >
                                <div style={{ fontSize: 15, color: C.text, fontWeight: 500 }}>{row.trigger}</div>
                                <div style={{ fontSize: 14, color: row.color }}>{row.context}</div>
                                <div style={{ fontSize: 13, color: C.dim, fontFamily: "'Courier New', monospace" }}>{row.hook}</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <ScriptBar lines={SCRIPT_LINES} />
            <ProgressBar chapterIndex={4} totalChapters={15} />
        </AbsoluteFill>
    );
};
