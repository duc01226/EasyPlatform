import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { C, ProgressBar, ChapterBadge, ScriptBar } from '../components/Shared';
import { easeOut, staggeredEaseOut } from '../utils/animations';

const SCRIPT_LINES = [
    "The unified TC-{FEATURE}-{NNN} format makes test-driven development scalable. TC-GM-001 is Goal Management test 1, TC-CI-025 is Check-In test 25. These IDs appear in Feature Doc Section 15, in the QA dashboard at docs/specs/, and as [Trait('TestSpec', 'TC-...')] attributes in integration test code — creating a complete bidirectional traceability chain.",
    'The /tdd-spec skill has 3 modes: Mode 1 generates specs from a PBI before any code exists, Mode 2 traces existing code paths to reverse-engineer specs from implementation, Mode 3 diffs existing TCs against code changes to find coverage gaps. All three produce the same TC format — making the spec system language and framework agnostic.'
];

const MODES = [
    {
        mode: 'Mode 1: TDD-First',
        input: 'PBI / user story (no code yet)',
        action: 'Generate TC specs from requirements',
        next: '/integration-test → /plan → /cook',
        color: C.purple
    },
    {
        mode: 'Mode 2: Implement-First',
        input: 'Existing codebase (code already written)',
        action: 'Trace code paths → generate TC specs',
        next: '/integration-test → /test',
        color: C.blue
    },
    {
        mode: 'Mode 3: Update',
        input: 'Existing TCs + code changes',
        action: 'Diff TCs against current code → find gaps',
        next: '/test → /review-changes',
        color: C.cyan
    }
];

const TDD_WORKFLOWS = [
    { name: 'idea-to-tdd', seq: '/idea → /refine → /tdd-spec', use: 'Idea → testable specs' },
    { name: 'tdd-feature', seq: '/scout → /tdd-spec → /plan → /cook → /integration-test → /test', use: 'Full TDD cycle' },
    { name: 'pbi-to-tests', seq: '/tdd-spec → /quality-gate', use: 'PBI → test specs fast' },
    { name: 'e2e-from-recording', seq: '/scout → /e2e-test → /test → /watzup', use: 'Chrome recording → Playwright' }
];

export const Scene10TDD: React.FC = () => {
    const frame = useCurrentFrame();

    return (
        <AbsoluteFill style={{ background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <ChapterBadge index={10} label="TDD System" color={C.purple} />

            <div style={{ position: 'absolute', inset: 0, display: 'flex', gap: 40, padding: '68px 64px 44px' }}>
                {/* Left */}
                <div style={{ width: 400, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ opacity: easeOut(frame, 0, 14), fontSize: 14, fontWeight: 700, color: C.purple, letterSpacing: 3 }}>
                        TDD SYSTEM · UNIFIED TC FORMAT
                    </div>
                    <div style={{ opacity: easeOut(frame, 8, 20), fontSize: 44, fontWeight: 800, color: C.text, lineHeight: 1.1 }}>
                        Spec-first. Always
                        <br />
                        <span style={{ color: C.purple }}>traceable.</span>
                    </div>

                    {/* TC format box */}
                    <div
                        style={{
                            opacity: easeOut(frame, 20, 16),
                            background: '#0d1117',
                            border: `1px solid ${C.purple}55`,
                            borderRadius: 12,
                            padding: '16px 18px'
                        }}
                    >
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.dim, letterSpacing: 2, marginBottom: 10 }}>UNIFIED TC ID FORMAT</div>
                        <div style={{ fontSize: 26, fontWeight: 900, color: C.purple, fontFamily: "'Courier New', monospace" }}>
                            TC-{'{'}
                            <span style={{ color: C.blue }}>FEATURE</span>
                            {'}'}-{'{'}
                            <span style={{ color: C.green }}>NNN</span>
                            {'}'}
                        </div>
                        <div style={{ fontSize: 14, color: C.dim, marginTop: 8, lineHeight: 1.6 }}>
                            <div>
                                <span style={{ color: C.blue }}>GM</span> → Goal Management · TC-GM-001
                            </div>
                            <div>
                                <span style={{ color: C.blue }}>CI</span> → Check-In · TC-CI-025
                            </div>
                            <div>
                                <span style={{ color: C.blue }}>EMP</span> → Employee · TC-EMP-012
                            </div>
                        </div>
                    </div>

                    {/* Traceability chain */}
                    <div style={{ opacity: easeOut(frame, 36, 16), display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.dim, letterSpacing: 2 }}>TRACEABILITY CHAIN</div>
                        {[
                            { node: 'Feature Doc Section 15', color: C.blue, arrow: true },
                            { node: 'docs/specs/ dashboard', color: C.cyan, arrow: true },
                            { node: 'Integration test code', color: C.green, arrow: false }
                        ].map((n, i) => (
                            <div key={n.node} style={{ opacity: easeOut(frame, 40 + i * 8, 12) }}>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        padding: '8px 12px',
                                        background: C.surface,
                                        borderRadius: 8,
                                        border: `1px solid ${n.color}33`
                                    }}
                                >
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.color }} />
                                    <span style={{ fontSize: 14, color: n.color, fontWeight: 600 }}>{n.node}</span>
                                </div>
                                {n.arrow && <div style={{ fontSize: 13, color: C.dim, marginLeft: 16 }}>↓ synced</div>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: modes + workflows */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ opacity: easeOut(frame, 16, 14), fontSize: 13, fontWeight: 700, color: C.dim, letterSpacing: 2 }}>/tdd-spec · 3 MODES</div>
                    {MODES.map((m, i) => {
                        const p = staggeredEaseOut(frame, i, 20, 14, 16);
                        const x = interpolate(p, [0, 1], [24, 0]);
                        return (
                            <div
                                key={m.mode}
                                style={{
                                    opacity: p,
                                    transform: `translateX(${x}px)`,
                                    background: C.surface,
                                    border: `1px solid ${m.color}44`,
                                    borderLeft: `3px solid ${m.color}`,
                                    borderRadius: 10,
                                    padding: '14px 16px'
                                }}
                            >
                                <div style={{ fontSize: 15, fontWeight: 700, color: m.color, marginBottom: 6 }}>{m.mode}</div>
                                <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.6 }}>
                                    <div>
                                        Input: <span style={{ color: C.text }}>{m.input}</span>
                                    </div>
                                    <div>
                                        Action: <span style={{ color: C.text }}>{m.action}</span>
                                    </div>
                                    <div>
                                        Next: <span style={{ color: m.color, fontFamily: "'Courier New', monospace", fontSize: 12 }}>{m.next}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    <div style={{ opacity: easeOut(frame, 62, 14), fontSize: 13, fontWeight: 700, color: C.dim, letterSpacing: 2, marginTop: 4 }}>
                        TDD WORKFLOWS
                    </div>
                    {TDD_WORKFLOWS.map((w, i) => {
                        const p = staggeredEaseOut(frame, i, 66, 10, 12);
                        return (
                            <div
                                key={w.name}
                                style={{
                                    opacity: p,
                                    background: '#0d1117',
                                    border: `1px solid ${C.border}`,
                                    borderRadius: 8,
                                    padding: '10px 14px',
                                    display: 'flex',
                                    alignItems: 'baseline',
                                    gap: 12
                                }}
                            >
                                <code style={{ fontSize: 14, color: C.purple, fontWeight: 700, flexShrink: 0 }}>{w.name}</code>
                                <div
                                    style={{
                                        flex: 1,
                                        fontSize: 12,
                                        color: C.dim,
                                        fontFamily: "'Courier New', monospace",
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {w.seq}
                                </div>
                                <div style={{ fontSize: 12, color: C.cyan, flexShrink: 0 }}>{w.use}</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <ScriptBar lines={SCRIPT_LINES} />
            <ProgressBar chapterIndex={9} totalChapters={15} />
        </AbsoluteFill>
    );
};
