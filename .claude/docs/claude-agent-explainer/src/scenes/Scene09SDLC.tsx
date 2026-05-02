import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { C, ProgressBar, ChapterBadge, ScriptBar } from '../components/Shared';
import { easeOut, staggeredEaseOut } from '../utils/animations';

const SCRIPT_LINES = [
    'The framework covers all 10 SDLC phases. Phase 0 is Inception with greenfield-init and solution-architect. Phase 1 is Ideation with an interactive Double Diamond session. Most AI frameworks stop at Phase 5 — Implementation. This one covers all the way to Phase 9: Handoff and Operations.',
    'Testing in Phase 6 is a 3-step ritual: first /integration-test writes tests from TDD specs, then /integration-test-review checks coverage and quality, then /integration-test-verify confirms spec traceability. These three steps ensure tests actually verify the right behaviors — not just that code runs without crashing.',
    'The core principle here: AI participates as a first-class actor in every phase, not just code generation. The AI writes requirements, creates test specs, reviews its own code, updates documentation, and prepares handoffs — each time using the right protocol-driven skill for that specific stage.'
];

const PHASES = [
    { num: '0', label: 'Inception', skills: 'greenfield-init · solution-architect · domain-analysis', color: C.cyan, icon: '🌱' },
    { num: '1', label: 'Ideation', skills: 'idea (interactive) · product-owner · idea-to-pbi', color: C.blue, icon: '💡' },
    { num: '2', label: 'Requirements', skills: 'refine · story · prioritize · design-spec', color: C.blue, icon: '📋' },
    { num: '3', label: 'Test Specs', skills: 'tdd-spec (3 modes) · tdd-spec-review · idea-to-pbi', color: C.purple, icon: '🧪' },
    { num: '4', label: 'Planning', skills: 'plan · plan-review · plan-validate · why-review', color: C.purple, icon: '📐' },
    { num: '5', label: 'Implementation', skills: 'cook · cook-hard · fix · refactoring · feature workflow', color: C.green, icon: '⚙️' },
    { num: '6', label: 'Testing', skills: 'integration-test → review → verify · test · webapp-testing', color: C.green, icon: '✅' },
    { num: '7', label: 'Code Review', skills: 'code-review · review-changes · prove-fix · sre-review', color: C.amber, icon: '🔍' },
    { num: '8', label: 'Documentation', skills: 'docs-update · feature-docs · changelog · release-notes', color: C.amber, icon: '📝' },
    { num: '9', label: 'Handoff & Ops', skills: 'handoff · acceptance · deployment · devops', color: C.red, icon: '🚀' }
];

export const Scene09SDLC: React.FC = () => {
    const frame = useCurrentFrame();

    return (
        <AbsoluteFill style={{ background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <ChapterBadge index={9} label="Full SDLC" color={C.green} />

            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '66px 64px 40px', gap: 16 }}>
                <div>
                    <div style={{ opacity: easeOut(frame, 0, 14), fontSize: 14, fontWeight: 700, color: C.green, letterSpacing: 3 }}>
                        AI-ASSISTED DEVELOPMENT LIFECYCLE · 10 PHASES
                    </div>
                    <div style={{ opacity: easeOut(frame, 8, 20), fontSize: 46, fontWeight: 800, color: C.text, lineHeight: 1.1, marginTop: 8 }}>
                        No phase is <span style={{ color: C.green }}>"AI-free."</span>
                    </div>
                    <div style={{ opacity: easeOut(frame, 20, 16), fontSize: 19, color: C.dim, marginTop: 8 }}>
                        Every stage — from first idea sketch to production deployment — has the right skills, context, and quality gates.
                    </div>
                </div>

                {/* Phase grid: 2 columns */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, flex: 1 }}>
                    {PHASES.map((phase, i) => {
                        const p = staggeredEaseOut(frame, i, 24, 9, 14);
                        const y = interpolate(p, [0, 1], [18, 0]);
                        return (
                            <div
                                key={phase.label}
                                style={{
                                    opacity: p,
                                    transform: `translateY(${y}px)`,
                                    background: C.surface,
                                    border: `1px solid ${phase.color}33`,
                                    borderLeft: `3px solid ${phase.color}`,
                                    borderRadius: 10,
                                    padding: '10px 14px',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 12
                                }}
                            >
                                {/* Phase number + icon */}
                                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                    <span style={{ fontSize: 18 }}>{phase.icon}</span>
                                    <div style={{ fontSize: 11, fontWeight: 800, color: phase.color }}>{phase.num}</div>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: phase.color }}>{phase.label}</div>
                                    <div
                                        style={{
                                            fontSize: 12,
                                            color: C.dim,
                                            marginTop: 3,
                                            fontFamily: "'Courier New', monospace",
                                            lineHeight: 1.4,
                                            wordBreak: 'break-word'
                                        }}
                                    >
                                        {phase.skills}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Integration test 3-step callout */}
                <div
                    style={{
                        opacity: easeOut(frame, 114, 18),
                        display: 'flex',
                        gap: 0,
                        background: '#0d1117',
                        borderRadius: 10,
                        overflow: 'hidden',
                        border: `1px solid ${C.green}33`
                    }}
                >
                    {[
                        { step: '1. Write/Run', desc: 'integration-test — generate from TDD specs', color: C.green },
                        { step: '2. Review', desc: 'integration-test-review — coverage & quality', color: C.blue },
                        { step: '3. Verify', desc: 'integration-test-verify — spec traceability', color: C.purple }
                    ].map((s, i) => (
                        <div key={s.step} style={{ flex: 1, padding: '10px 14px', borderLeft: i > 0 ? `1px solid ${C.border}` : undefined }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.step}</div>
                            <div style={{ fontSize: 12, color: C.dim, marginTop: 3 }}>{s.desc}</div>
                        </div>
                    ))}
                </div>
            </div>

            <ScriptBar lines={SCRIPT_LINES} />
            <ProgressBar chapterIndex={8} totalChapters={15} />
        </AbsoluteFill>
    );
};
