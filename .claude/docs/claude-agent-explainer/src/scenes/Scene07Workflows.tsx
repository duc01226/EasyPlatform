import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { C, ProgressBar, ChapterBadge, CodeBlock, ScriptBar } from '../components/Shared';
import { easeOut, staggeredEaseOut } from '../utils/animations';

const SCRIPT_LINES = [
    'Workflows are JSON-defined step sequences. The bugfix workflow sequences: scout → feature-investigation → debug-investigate → plan → plan-validate → fix → prove-fix → tdd-spec → test → docs-update. Every step is mandatory — the AI cannot skip investigation to jump straight to code.',
    'The detection flow is the secret ingredient: every user prompt passes through workflow-router.cjs, which matches it against the catalog and presents options via AskUserQuestion. The user confirms, then the AI creates TaskCreate items for every step — making the entire process auditable and resumable after any context compaction.'
];

const GROUPS = [
    { label: 'Development', count: 16, color: C.blue, examples: 'feature · bugfix · tdd-feature · big-feature · e2e-*' },
    { label: 'Quality & Testing', count: 8, color: C.green, examples: 'quality-audit · security-audit · review-changes · test-verify' },
    { label: 'Planning & Inception', count: 5, color: C.cyan, examples: 'greenfield-init · investigation · design-workflow · release-prep' },
    { label: 'Research & Content', count: 4, color: C.purple, examples: 'research · business-evaluation · marketing-strategy · course-building' },
    { label: 'Requirements & PM', count: 5, color: C.amber, examples: 'idea-to-pbi · pbi-to-tests · sprint-planning · sprint-retro' },
    { label: 'Process & Handoffs', count: 6, color: C.red, examples: 'full-feature-lifecycle · ba-dev-handoff · qa-po-acceptance' }
];

const FLOW = ['User Prompt', 'workflow-router.cjs', 'AskUserQuestion', 'Confirmed', 'TaskCreate ALL steps', 'Execute step-by-step'];
const FLOW_COLORS = [C.text, C.blue, C.amber, C.green, C.purple, C.green];

export const Scene07Workflows: React.FC = () => {
    const frame = useCurrentFrame();

    return (
        <AbsoluteFill style={{ background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <ChapterBadge index={7} label="Workflows" color={C.green} />

            <div style={{ position: 'absolute', inset: 0, display: 'flex', gap: 40, padding: '68px 64px 44px' }}>
                {/* Left */}
                <div style={{ width: 400, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ opacity: easeOut(frame, 0, 14), fontSize: 14, fontWeight: 700, color: C.green, letterSpacing: 3 }}>
                        WORKFLOW SYSTEM · 48 WORKFLOWS
                    </div>
                    <div style={{ opacity: easeOut(frame, 8, 20), fontSize: 44, fontWeight: 800, color: C.text, lineHeight: 1.1 }}>
                        JSON-defined step sequences.
                        <br />
                        <span style={{ color: C.green }}>No step skipped.</span>
                    </div>

                    <div style={{ opacity: easeOut(frame, 18, 16) }}>
                        <CodeBlock
                            startFrame={18}
                            stagger={4}
                            lines={[
                                { text: '{ "bugfix": {', color: C.dim },
                                { text: '    "sequence": [', color: C.dim },
                                { text: '      "scout",', color: C.blue },
                                { text: '      "feature-investigation",', color: C.blue },
                                { text: '      "debug-investigate",', color: C.blue },
                                { text: '      "plan", "plan-validate",', color: C.blue },
                                { text: '      "fix", "prove-fix",', color: C.green },
                                { text: '      "tdd-spec", "test", "docs"', color: C.amber },
                                { text: '    ]', color: C.dim },
                                { text: '  }', color: C.dim },
                                { text: '}', color: C.dim }
                            ]}
                        />
                    </div>

                    {/* Detection flow */}
                    <div style={{ opacity: easeOut(frame, 64, 16), display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.dim, letterSpacing: 2, marginBottom: 4 }}>DETECTION FLOW</div>
                        {FLOW.map((step, i) => {
                            const p = easeOut(frame, 68 + i * 8, 12);
                            return (
                                <div key={step} style={{ opacity: p, display: 'flex', alignItems: 'center', gap: 10 }}>
                                    {i > 0 && <div style={{ color: C.dim, fontSize: 13, marginLeft: 2 }}>↓</div>}
                                    {i === 0 && <div style={{ width: 8, height: 8, borderRadius: '50%', background: FLOW_COLORS[i], marginLeft: 2 }} />}
                                    <div style={{ fontSize: 15, color: FLOW_COLORS[i], fontWeight: i === 3 || i === 5 ? 700 : 400 }}>{step}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right: 6 groups */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9, justifyContent: 'center' }}>
                    <div style={{ opacity: easeOut(frame, 14, 14), fontSize: 13, fontWeight: 700, color: C.dim, letterSpacing: 2, marginBottom: 2 }}>
                        6 WORKFLOW GROUPS
                    </div>
                    {GROUPS.map((g, i) => {
                        const p = staggeredEaseOut(frame, i, 18, 12, 15);
                        const x = interpolate(p, [0, 1], [28, 0]);
                        return (
                            <div
                                key={g.label}
                                style={{
                                    opacity: p,
                                    transform: `translateX(${x}px)`,
                                    background: C.surface,
                                    border: `1px solid ${g.color}33`,
                                    borderLeft: `3px solid ${g.color}`,
                                    borderRadius: 10,
                                    padding: '12px 16px'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                                    <span style={{ fontSize: 16, fontWeight: 700, color: g.color }}>{g.label}</span>
                                    <span style={{ fontSize: 13, color: C.dim }}>({g.count} workflows)</span>
                                </div>
                                <div style={{ fontSize: 13, color: C.dim, fontFamily: "'Courier New', monospace" }}>{g.examples}</div>
                            </div>
                        );
                    })}

                    {/* Pre-actions note */}
                    <div
                        style={{
                            opacity: easeOut(frame, 96, 16),
                            marginTop: 4,
                            background: '#0d1117',
                            border: `1px solid ${C.green}33`,
                            borderRadius: 10,
                            padding: '10px 14px',
                            fontSize: 14,
                            color: C.dim,
                            lineHeight: 1.5
                        }}
                    >
                        <span style={{ color: C.green, fontWeight: 700 }}>preActions</span> load reference docs{' '}
                        <span style={{ color: C.text }}>before step 1</span> — AI has full domain knowledge before it touches any file.
                    </div>
                </div>
            </div>

            <ScriptBar lines={SCRIPT_LINES} />
            <ProgressBar chapterIndex={6} totalChapters={15} />
        </AbsoluteFill>
    );
};
