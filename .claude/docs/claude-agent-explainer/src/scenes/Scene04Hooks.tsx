import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';
import { C, ProgressBar, ChapterBadge, ScriptBar } from '../components/Shared';
import { easeOut, staggeredEaseOut } from '../utils/animations';

const SCRIPT_LINES = [
    'Hooks are Node.js scripts registered in settings.json. They fire on 6 lifecycle events: SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, and SessionEnd. Exit 0 = allow and inject context, Exit 1 = soft block the user can override, Exit 2 = hard security block with no override.',
    'The 7 hook categories cover every failure mode: Session Lifecycle bootstraps fresh context, Safety hooks prevent path violations and PII leaks, Quality hooks block file edits without an active task plan, Context Injection silently prepends 50-100KB of domain patterns before every relevant edit.',
    'Mindset Injection hooks are especially critical: after context compaction, Claude silently resets to generic assistant mode. The mindset-compact-injector.cjs re-anchors senior-engineer critical thinking immediately — preventing the quality drop that normally follows every compaction event.'
];

const CATEGORIES = [
    {
        icon: '🔁',
        label: 'Session Lifecycle',
        count: 7,
        color: C.green,
        why: 'Bootstraps the environment on every session start — installs deps, restores memory after context compaction, so the AI always has full project context from message one.',
        items: ['session-init', 'post-compact-recovery', 'npm-auto-install']
    },
    {
        icon: '📨',
        label: 'Prompt Processing',
        count: 3,
        color: C.blue,
        why: 'Intercepts every user message before the AI sees it — routes to the correct workflow and assembles multi-source context so the AI never misses a relevant protocol.',
        items: ['workflow-router', 'prompt-context-assembler']
    },
    {
        icon: '🔒',
        label: 'Safety & Blocking',
        count: 4,
        color: C.red,
        why: 'Hard guardrails: blocks writes outside allowed paths, prevents PII/secrets from leaking into tool output, stops scout sub-agents from calling disallowed tools.',
        items: ['path-boundary-block', 'privacy-block', 'scout-block']
    },
    {
        icon: '⚠️',
        label: 'Quality Enforcement',
        count: 2,
        color: C.amber,
        why: 'Enforces process discipline — blocks file edits when no TaskCreate plan exists, and ensures the correct domain skill activates before touching guarded file patterns.',
        items: ['edit-enforcement', 'skill-enforcement']
    },
    {
        icon: '💉',
        label: 'Context Injection',
        count: 12,
        color: C.purple,
        why: 'Silently prepends 50–100 KB of domain knowledge (patterns, tokens, spec rules) before each relevant tool call — the AI never has to ask "what conventions does this project use?"',
        items: ['backend-context', 'frontend-context', 'feature-docs-context', 'test-specs-context']
    },
    {
        icon: '🔧',
        label: 'Post-Processing',
        count: 7,
        color: C.cyan,
        why: 'Runs automatically after every edit — formats code with Prettier, records TODOs, and rewrites verbose tool responses into compact summaries to preserve context window.',
        items: ['post-edit-prettier', 'todo-tracker', 'tool-output-swap']
    },
    {
        icon: '🧠',
        label: 'Mindset Injection',
        count: 2,
        color: '#e879f9',
        why: 'Re-anchors senior-engineer critical-thinking before major edits and after context compaction, which otherwise silently resets the AI back to generic assistant mode.',
        items: ['mindset-injector', 'mindset-compact-injector']
    }
];

const LIFECYCLE = ['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'Tool Executes', 'PostToolUse', 'SessionEnd'];
const LIFECYCLE_COLORS = [C.green, C.purple, C.blue, C.text, C.amber, C.red];

export const Scene04Hooks: React.FC = () => {
    const frame = useCurrentFrame();

    return (
        <AbsoluteFill style={{ background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <ChapterBadge index={4} label="Hook System" color={C.blue} />

            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '68px 72px 44px', gap: 20 }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ opacity: easeOut(frame, 0, 14), fontSize: 14, fontWeight: 700, color: C.blue, letterSpacing: 3 }}>
                            HOOK SYSTEM · ~40 HOOKS · 56 FILES
                        </div>
                        <div style={{ opacity: easeOut(frame, 8, 22), fontSize: 50, fontWeight: 800, color: C.text, lineHeight: 1.1, marginTop: 8 }}>
                            Node.js scripts that
                            <br />
                            <span style={{ color: C.blue }}>enforce correctness</span> automatically.
                        </div>
                    </div>

                    {/* Exit code legend */}
                    <div
                        style={{
                            opacity: easeOut(frame, 20, 16),
                            background: C.surface,
                            border: `1px solid ${C.border}`,
                            borderRadius: 12,
                            padding: '14px 20px',
                            fontSize: 15,
                            lineHeight: 1.9,
                            flexShrink: 0
                        }}
                    >
                        <div style={{ color: C.green }}>Exit 0 → Allow + inject context</div>
                        <div style={{ color: C.amber }}>Exit 1 → Block (user can override)</div>
                        <div style={{ color: C.red }}>Exit 2 → Block (security, no override)</div>
                    </div>
                </div>

                {/* Lifecycle strip */}
                <div
                    style={{
                        opacity: easeOut(frame, 22, 16),
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0,
                        background: '#0d1117',
                        borderRadius: 10,
                        padding: '10px 18px',
                        overflow: 'hidden'
                    }}
                >
                    {LIFECYCLE.map((ev, i) => (
                        <div key={ev} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: LIFECYCLE_COLORS[i], whiteSpace: 'nowrap', padding: '0 10px' }}>{ev}</div>
                            {i < LIFECYCLE.length - 1 && <div style={{ color: C.dim, fontSize: 14 }}>→</div>}
                        </div>
                    ))}
                </div>

                {/* Category grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, flex: 1 }}>
                    {CATEGORIES.map((cat, i) => {
                        const p = staggeredEaseOut(frame, i, 26, 12, 16);
                        const y = interpolate(p, [0, 1], [24, 0]);
                        return (
                            <div
                                key={cat.label}
                                style={{
                                    opacity: p,
                                    transform: `translateY(${y}px)`,
                                    background: C.surface,
                                    border: `1px solid ${cat.color}33`,
                                    borderLeft: `3px solid ${cat.color}`,
                                    borderRadius: 12,
                                    padding: '14px 18px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 8
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ fontSize: 20 }}>{cat.icon}</span>
                                    <div style={{ flex: 1 }}>
                                        <span style={{ fontSize: 16, fontWeight: 700, color: cat.color }}>{cat.label}</span>
                                        <span style={{ fontSize: 13, color: C.dim, marginLeft: 8 }}>({cat.count} hooks)</span>
                                    </div>
                                </div>
                                <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.5, borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }}>
                                    {cat.why}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                    {cat.items.map(item => (
                                        <div key={item} style={{ fontSize: 13, color: `${cat.color}cc`, fontFamily: "'Courier New', monospace" }}>
                                            · {item}.cjs
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <ScriptBar lines={SCRIPT_LINES} />
            <ProgressBar chapterIndex={3} totalChapters={15} />
        </AbsoluteFill>
    );
};
