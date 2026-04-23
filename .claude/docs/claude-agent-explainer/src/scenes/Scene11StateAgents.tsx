import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { C, ProgressBar, ChapterBadge, ScriptBar } from '../components/Shared';
import { easeOut, staggeredEaseOut } from '../utils/animations';

const SCRIPT_LINES = [
    'State management solves a fundamental LLM limitation: Claude forgets everything when context compacts. Four state stores persist to disk: TaskCreate state tracks todos, Workflow state records the current step, Edit state counts file modifications, and the Swap Engine offloads outputs over 50KB to disk — so the AI always picks up exactly where it left off.',
    '28 specialized agents embody a key design insight: a generic assistant with full-system context is worse than a scoped expert with minimal context. Each agent has defined tools, a tight system prompt, and a structured output contract. The architect agent, for example, checks all 12 microservices by design — that knowledge is baked into its prompt, not hoped for.'
];

const STATE_BOXES = [
    { label: 'Todo State', desc: 'TaskCreate → in_progress → completed. Persisted to disk across sessions.', color: C.blue, icon: '☑️' },
    { label: 'Workflow State', desc: 'Active workflow, current step, completed steps — survives compaction.', color: C.green, icon: '🔄' },
    { label: 'Edit State', desc: 'File edit count. Warns at 4 files, blocks without active task.', color: C.amber, icon: '✏️' },
    { label: 'Swap Engine', desc: 'Outputs > 50KB externalized to disk. Prevents context window overflow.', color: C.purple, icon: '💾' }
];

const AGENTS = [
    { name: 'architect', color: C.blue, role: 'System design, ADR creation, cross-service analysis' },
    { name: 'backend-developer', color: C.blue, role: 'Commands, queries, entities, migrations, background jobs' },
    { name: 'frontend-developer', color: C.green, role: 'Angular components, stores, BEM styling, design tokens' },
    { name: 'debugger', color: C.red, role: 'Root cause analysis, log inspection, diagnostic reports' },
    { name: 'code-reviewer', color: C.amber, role: 'File-by-file analysis, holistic quality assessment' },
    { name: 'planner', color: C.purple, role: 'Research, implementation plans, trade-off analysis' },
    { name: 'security-auditor', color: C.red, role: 'Auth, validation, OWASP, read-only structured findings' },
    { name: 'tester', color: C.green, role: 'Unit + integration tests, coverage, build verification' }
];

export const Scene11StateAgents: React.FC = () => {
    const frame = useCurrentFrame();

    return (
        <AbsoluteFill style={{ background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <ChapterBadge index={11} label="State & Agents" color={C.cyan} />

            <div style={{ position: 'absolute', inset: 0, display: 'flex', gap: 40, padding: '68px 64px 44px' }}>
                {/* Left: state management */}
                <div style={{ width: 420, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ opacity: easeOut(frame, 0, 14), fontSize: 14, fontWeight: 700, color: C.cyan, letterSpacing: 3 }}>
                        STATE MANAGEMENT · MEMORY SYSTEM
                    </div>
                    <div style={{ opacity: easeOut(frame, 8, 20), fontSize: 40, fontWeight: 800, color: C.text, lineHeight: 1.1 }}>
                        State survives
                        <br />
                        <span style={{ color: C.cyan }}>context compaction.</span>
                    </div>
                    <div style={{ opacity: easeOut(frame, 20, 16), fontSize: 17, color: C.dim, lineHeight: 1.6 }}>
                        Four state stores persist task progress, workflow position, and large outputs across session boundaries — the AI picks up exactly where
                        it left off.
                    </div>

                    {STATE_BOXES.map((box, i) => {
                        const p = staggeredEaseOut(frame, i, 26, 12, 16);
                        const x = interpolate(p, [0, 1], [20, 0]);
                        return (
                            <div
                                key={box.label}
                                style={{
                                    opacity: p,
                                    transform: `translateX(${x}px)`,
                                    background: C.surface,
                                    border: `1px solid ${box.color}33`,
                                    borderLeft: `3px solid ${box.color}`,
                                    borderRadius: 10,
                                    padding: '12px 16px',
                                    display: 'flex',
                                    gap: 12,
                                    alignItems: 'flex-start'
                                }}
                            >
                                <span style={{ fontSize: 20, flexShrink: 0 }}>{box.icon}</span>
                                <div>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: box.color }}>{box.label}</div>
                                    <div style={{ fontSize: 13, color: C.dim, marginTop: 4, lineHeight: 1.5 }}>{box.desc}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Right: 28 agents */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ opacity: easeOut(frame, 14, 14), fontSize: 14, fontWeight: 700, color: C.amber, letterSpacing: 3 }}>
                        28 SPECIALIZED AGENTS
                    </div>
                    <div style={{ opacity: easeOut(frame, 20, 18), fontSize: 38, fontWeight: 800, color: C.text, lineHeight: 1.1, marginBottom: 4 }}>
                        Right expert for
                        <br />
                        <span style={{ color: C.amber }}>every task.</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {AGENTS.map((agent, i) => {
                            const p = staggeredEaseOut(frame, i, 28, 10, 13);
                            const x = interpolate(p, [0, 1], [24, 0]);
                            return (
                                <div
                                    key={agent.name}
                                    style={{
                                        opacity: p,
                                        transform: `translateX(${x}px)`,
                                        background: C.surface,
                                        border: `1px solid ${agent.color}33`,
                                        borderRadius: 8,
                                        padding: '10px 14px',
                                        display: 'flex',
                                        alignItems: 'baseline',
                                        gap: 12
                                    }}
                                >
                                    <code style={{ fontSize: 13, fontWeight: 700, color: agent.color, flexShrink: 0, minWidth: 170 }}>{agent.name}</code>
                                    <div style={{ fontSize: 13, color: C.dim }}>{agent.role}</div>
                                </div>
                            );
                        })}

                        <div style={{ opacity: easeOut(frame, 108, 16), fontSize: 14, color: C.dim, fontStyle: 'italic', paddingLeft: 4 }}>
                            + 20 more: business-analyst, database-admin, docs-manager, e2e-runner, performance-optimizer…
                        </div>
                    </div>
                </div>
            </div>

            <ScriptBar lines={SCRIPT_LINES} />
            <ProgressBar chapterIndex={10} totalChapters={15} />
        </AbsoluteFill>
    );
};
