import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { C, ProgressBar, ChapterBadge, ScriptBar } from '../components/Shared';
import { easeOut, staggeredEaseOut } from '../utils/animations';

const SCRIPT_LINES = [
    'Walk through /feature to see how everything connects: scout → investigate → plan → approval gate → implement → tdd-spec → integration-test → docs-update. Every approval is explicit — the AI shows the plan and waits for confirmation before writing a single line of code.',
    "The spec-driven loop is mandatory: /idea-to-pbi writes TC-{FEAT}-{NNN} test cases in Feature Doc Section 15 before development starts. The /feature and /fix workflows both require /tdd-spec — code satisfies pre-existing specs, not the other way around. This prevents 'write first, spec later' drift.",
    'Harness engineering is what separates this from a collection of prompts. edit-enforcement.cjs blocks file edits without an active TaskCreate plan. skill-enforcement.cjs auto-activates the right protocol when file patterns match. These are Node.js hooks — they run unconditionally, regardless of what the AI decides.'
];

const WORKFLOWS = [
    {
        name: '/feature',
        label: 'Feature Dev',
        icon: '⚙️',
        color: C.green,
        why: 'Full discovery-to-delivery with mandatory approval gate and automated doc sync.',
        steps: 'scout → investigate → plan → ✓ approve → implement → tdd-spec → docs-update',
        outcome: 'Feature doc §15 + TCs auto-updated · integration tests generated'
    },
    {
        name: '/fix',
        label: 'Bug Fix',
        icon: '🐛',
        color: C.blue,
        why: 'Classifies issue type, routes to right variant, enforces root-cause proof before close.',
        steps: 'classify → debug-investigate → root cause → plan → surgical fix → prove-fix',
        outcome: 'Evidence-backed diff · TC updated · no regressions'
    },
    {
        name: '/review-changes',
        label: 'Code Review',
        icon: '🔍',
        color: C.amber,
        why: '60 KB of code-review rules auto-injected. Graph blast-radius before any file review.',
        steps: 'graph blast-radius → file-by-file → holistic sub-agent → findings report',
        outcome: 'Evidence per finding · no hallucinated suggestions'
    },
    {
        name: '/brainstorm',
        label: 'Product Discovery',
        icon: '💡',
        color: C.purple,
        why: 'Double Diamond framework turns raw idea sessions into validated, scored artifacts.',
        steps: 'Double Diamond → 5 Whys / OST → RICE scoring → lean hypothesis → idea artifact',
        outcome: 'Structured discovery output · not raw conversation'
    },
    {
        name: '/idea-to-pbi',
        label: 'Idea → PBI',
        icon: '📋',
        color: C.cyan,
        why: 'Captures raw ideas, validates scope, and produces a DOR-ready PBI with TCs already written.',
        steps: 'capture idea → validate scope → refine PBI → DOR gate → tdd-spec',
        outcome: 'TC specs exist BEFORE first line of code is written'
    }
];

const CALLOUTS = [
    {
        title: 'Spec-Driven Development',
        color: C.purple,
        icon: '📐',
        points: [
            { label: 'Specs before code', text: '/idea-to-pbi writes TC-{FEAT}-{NNN} in Feature Doc §15 before dev starts' },
            { label: 'Traceability chain', text: 'Feature Doc §15 → test-specs dashboard → integration test [Trait("TestSpec", "TC-...")]' },
            { label: 'Mandatory spec step', text: '/feature and /fix both require /tdd-spec — code satisfies specs, not the other way around' }
        ]
    },
    {
        title: 'Harness Engineering',
        color: C.green,
        icon: '🔩',
        points: [
            { label: 'edit-enforcement.cjs', text: 'blocks file edits without an active TaskCreate plan — forces upfront design thinking' },
            { label: 'skill-enforcement.cjs', text: 'auto-loads the right protocol when a file pattern matches (feature docs, specs, tests)' },
            { label: 'prove-fix + mindset hooks', text: 'require traced evidence per finding · re-anchor critical-thinking before every major edit' }
        ]
    }
];

export const Scene12WorkflowBenefits: React.FC = () => {
    const frame = useCurrentFrame();

    return (
        <AbsoluteFill style={{ background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <ChapterBadge index={12} label="Workflow Benefits" color={C.green} />

            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '68px 64px 40px', gap: 14 }}>
                {/* Header */}
                <div>
                    <div style={{ opacity: easeOut(frame, 0, 14), fontSize: 14, fontWeight: 700, color: C.green, letterSpacing: 3 }}>
                        TOP WORKFLOWS · SPEC-DRIVEN · HARNESS ENGINEERING
                    </div>
                    <div style={{ opacity: easeOut(frame, 8, 20), fontSize: 44, fontWeight: 800, color: C.text, lineHeight: 1.1, marginTop: 6 }}>
                        Five workflows. Every best practice, <span style={{ color: C.green }}>automated.</span>
                    </div>
                </div>

                {/* Workflow cards */}
                <div style={{ display: 'flex', gap: 12, flex: 1 }}>
                    {WORKFLOWS.map((wf, i) => {
                        const p = staggeredEaseOut(frame, i, 22, 12, 16);
                        const y = interpolate(p, [0, 1], [20, 0]);
                        return (
                            <div
                                key={wf.name}
                                style={{
                                    opacity: p,
                                    transform: `translateY(${y}px)`,
                                    flex: 1,
                                    background: C.surface,
                                    border: `1px solid ${wf.color}33`,
                                    borderTop: `3px solid ${wf.color}`,
                                    borderRadius: 12,
                                    padding: '14px 16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 10
                                }}
                            >
                                {/* Card header */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 20 }}>{wf.icon}</span>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 800, color: wf.color }}>{wf.label}</div>
                                        <div style={{ fontSize: 11, color: C.dim, fontFamily: "'Courier New', monospace" }}>{wf.name}</div>
                                    </div>
                                </div>

                                {/* Why */}
                                <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.5 }}>{wf.why}</div>

                                {/* Steps */}
                                <div
                                    style={{
                                        background: '#0d1117',
                                        borderRadius: 8,
                                        padding: '8px 10px',
                                        fontSize: 10,
                                        color: `${wf.color}cc`,
                                        fontFamily: "'Courier New', monospace",
                                        lineHeight: 1.6,
                                        wordBreak: 'break-word',
                                        flex: 1
                                    }}
                                >
                                    {wf.steps}
                                </div>

                                {/* Outcome */}
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: wf.color,
                                        fontWeight: 600,
                                        borderTop: `1px solid ${wf.color}22`,
                                        paddingTop: 8,
                                        lineHeight: 1.5
                                    }}
                                >
                                    {wf.outcome}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Bottom callouts */}
                <div style={{ display: 'flex', gap: 16 }}>
                    {CALLOUTS.map((callout, ci) => {
                        const p = easeOut(frame, 86 + ci * 14, 18);
                        const y = interpolate(p, [0, 1], [16, 0]);
                        return (
                            <div
                                key={callout.title}
                                style={{
                                    opacity: p,
                                    transform: `translateY(${y}px)`,
                                    flex: 1,
                                    background: '#0d1117',
                                    border: `1px solid ${callout.color}44`,
                                    borderLeft: `3px solid ${callout.color}`,
                                    borderRadius: 12,
                                    padding: '14px 18px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 8
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                    <span style={{ fontSize: 16 }}>{callout.icon}</span>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: callout.color, letterSpacing: 1 }}>{callout.title}</div>
                                </div>
                                {callout.points.map((pt, pi) => (
                                    <div key={pi} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                        <div
                                            style={{
                                                flexShrink: 0,
                                                fontSize: 11,
                                                fontWeight: 700,
                                                color: callout.color,
                                                fontFamily: "'Courier New', monospace",
                                                minWidth: 170,
                                                paddingTop: 1
                                            }}
                                        >
                                            {pt.label}
                                        </div>
                                        <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.5 }}>{pt.text}</div>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>

            <ScriptBar lines={SCRIPT_LINES} />
            <ProgressBar chapterIndex={11} totalChapters={15} />
        </AbsoluteFill>
    );
};
