import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { C, ProgressBar, ChapterBadge, ScriptBar } from '../components/Shared';
import { easeOut, staggeredEaseOut } from '../utils/animations';

const SCRIPT_LINES = [
    'The spec-driven loop completes 6 steps in a single PR: code fix → spec bundle updates with extraction_mode=update → integration tests written for TC IDs → Feature Doc Section 15 updated with CHANGELOG → QA dashboard PRIORITY-INDEX synced → SPEC-CHANGELOG entry creates an auditable record. All in one branch, zero orphaned artifacts.',
    "The bidirectional traceability is the key lesson: when a developer asks Claude 'what values does EmployeeClassification have?', the AI reads the spec bundle A-domain-model.md — not the source code. If the spec says 2 values but the enum has 3, every future session generates code missing the ExternalWorkforce case. This is why spec-driven development is mandatory, not optional."
];

const CHAIN = [
    {
        step: '1',
        label: 'Code fix',
        detail: 'AccountInviteUsersToCompanyRequestResultEventBusConsumer\nEmployeeClassification: Employee / ExternalUser / ExternalWorkforce',
        color: C.blue,
        icon: '🐛'
    },
    {
        step: '2',
        label: 'Spec bundle updated',
        detail: 'A-domain-model.md  ·  B-business-rules.md\nlast_extracted: 2026-04-21  ·  extraction_mode: update',
        color: C.purple,
        icon: '📐'
    },
    {
        step: '3',
        label: 'Integration tests written',
        detail: 'TC-BUSCON-001..005\nP0: EmployeeClassification · gender crash\nP1: case-insensitive gender · CountryCallingCode',
        color: C.green,
        icon: '🧪'
    },
    {
        step: '4',
        label: 'Feature doc Section 15 updated',
        detail: 'README.EmployeeInvite.md §15  ·  CHANGELOG v1.1.0\n[Trait("TestSpec", "TC-BUSCON-001")] bidirectional link',
        color: C.amber,
        icon: '📋'
    },
    {
        step: '5',
        label: 'QA dashboard synced',
        detail: 'PRIORITY-INDEX.md v1.6 → v1.7\nP0 section + P1 section  ·  evidence → test method name',
        color: C.cyan,
        icon: '📊'
    },
    {
        step: '6',
        label: 'SPEC-CHANGELOG.md entry',
        detail: 'Wave 3 entry  ·  auditable record\nfuture /spec-discovery runs use incremental diff',
        color: C.blue,
        icon: '📝'
    }
];

const BIDIRECTIONAL = [
    { left: 'Feature Doc §15', arrow: '→', right: 'TC-BUSCON-001 (spec)', color: C.purple },
    { left: '[Trait("TestSpec", "TC-BUSCON-001")]', arrow: '→', right: 'Integration test file', color: C.green },
    { left: 'PRIORITY-INDEX.md', arrow: '→', right: 'evidence: MethodName', color: C.amber }
];

export const Scene14SpecDriven: React.FC = () => {
    const frame = useCurrentFrame();

    return (
        <AbsoluteFill style={{ background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <ChapterBadge index={14} label="Spec-Driven Loop" color={C.purple} />

            <div style={{ position: 'absolute', inset: 0, display: 'flex', gap: 40, padding: '68px 64px 44px' }}>
                {/* Left — Closed feedback chain */}
                <div style={{ width: 640, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <div style={{ opacity: easeOut(frame, 0, 14), fontSize: 13, fontWeight: 700, color: C.purple, letterSpacing: 3 }}>
                            SPEC-DRIVEN DEVELOPMENT
                        </div>
                        <div style={{ opacity: easeOut(frame, 8, 20), fontSize: 36, fontWeight: 800, color: C.text, lineHeight: 1.1, marginTop: 6 }}>
                            One branch. <span style={{ color: C.purple }}>Zero orphaned artifacts.</span>
                        </div>
                        <div style={{ opacity: easeOut(frame, 22, 16), fontSize: 15, color: C.dim, marginTop: 8, lineHeight: 1.5 }}>
                            Every layer of the spec-driven chain updated in a single PR — no stale specs, no phantom tests, no undocumented bus consumers.
                        </div>
                    </div>

                    {/* Chain steps */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {CHAIN.map((item, i) => {
                            const p = staggeredEaseOut(frame, i, 30, 10, 14);
                            const y = interpolate(p, [0, 1], [12, 0]);
                            const isLast = i === CHAIN.length - 1;
                            return (
                                <div key={item.step} style={{ opacity: p, transform: `translateY(${y}px)`, display: 'flex', gap: 0 }}>
                                    {/* Connector column */}
                                    <div style={{ width: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                                        <div
                                            style={{
                                                width: 28,
                                                height: 28,
                                                borderRadius: '50%',
                                                background: `${item.color}22`,
                                                border: `2px solid ${item.color}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: 12,
                                                fontWeight: 800,
                                                color: item.color,
                                                flexShrink: 0,
                                                zIndex: 1
                                            }}
                                        >
                                            {item.step}
                                        </div>
                                        {!isLast && <div style={{ width: 2, flex: 1, minHeight: 8, background: `${item.color}44`, marginTop: 0 }} />}
                                    </div>

                                    {/* Content */}
                                    <div style={{ flex: 1, paddingLeft: 12, paddingBottom: isLast ? 0 : 10, paddingTop: 2 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <span style={{ fontSize: 14 }}>{item.icon}</span>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: item.color }}>{item.label}</div>
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 10,
                                                color: C.dim,
                                                fontFamily: "'Courier New', monospace",
                                                lineHeight: 1.6,
                                                whiteSpace: 'pre-line'
                                            }}
                                        >
                                            {item.detail}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right — Bidirectional links + insight */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div>
                        <div style={{ opacity: easeOut(frame, 10, 14), fontSize: 13, fontWeight: 700, color: C.amber, letterSpacing: 3 }}>
                            BIDIRECTIONAL TRACEABILITY
                        </div>
                        <div style={{ opacity: easeOut(frame, 18, 18), fontSize: 26, fontWeight: 800, color: C.text, lineHeight: 1.2, marginTop: 6 }}>
                            AI reads the spec,
                            <br />
                            not the source code.
                        </div>
                    </div>

                    {/* Bidirectional link diagram */}
                    <div style={{ opacity: easeOut(frame, 36, 20), display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {BIDIRECTIONAL.map((link, i) => (
                            <div
                                key={i}
                                style={{
                                    background: C.surface,
                                    borderRadius: 10,
                                    padding: '12px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    borderLeft: `3px solid ${link.color}`
                                }}
                            >
                                <div style={{ fontSize: 11, color: link.color, fontFamily: "'Courier New', monospace", fontWeight: 700, minWidth: 180 }}>
                                    {link.left}
                                </div>
                                <div style={{ fontSize: 16, color: link.color, fontWeight: 900 }}>{link.arrow}</div>
                                <div style={{ fontSize: 11, color: C.dim, fontFamily: "'Courier New', monospace" }}>{link.right}</div>
                            </div>
                        ))}
                    </div>

                    {/* Insight callout */}
                    <div
                        style={{
                            opacity: easeOut(frame, 70, 20),
                            background: `${C.amber}11`,
                            border: `1px solid ${C.amber}44`,
                            borderLeft: `3px solid ${C.amber}`,
                            borderRadius: 12,
                            padding: '16px 18px'
                        }}
                    >
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.amber, marginBottom: 8 }}>Why this matters for AI accuracy</div>
                        <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.6 }}>
                            When a developer asks "what values does EmployeeClassification have?", the AI reads{' '}
                            <span style={{ color: C.text, fontFamily: "'Courier New', monospace" }}>A-domain-model.md</span> — not the source code.
                        </div>
                        <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, marginTop: 8, fontStyle: 'italic' }}>
                            A 2-value spec when the enum has 3 values → incorrect code generation, missing ExternalWorkforce handling in every future session.
                        </div>
                    </div>

                    {/* Without / With comparison */}
                    <div style={{ opacity: easeOut(frame, 96, 18), display: 'flex', gap: 10 }}>
                        <div style={{ flex: 1, background: '#2d0a0a', borderRadius: 10, padding: '12px 14px', borderLeft: `3px solid ${C.red}` }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: C.red, marginBottom: 6 }}>WITHOUT PRIORITY-INDEX</div>
                            <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.6 }}>
                                Tests exist in EmployeeHR.IntegrationTests but invisible to harness. /integration-test-review flags "no tests found" — false
                                negative.
                            </div>
                        </div>
                        <div style={{ flex: 1, background: `${C.green}0d`, borderRadius: 10, padding: '12px 14px', borderLeft: `3px solid ${C.green}` }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 6 }}>WITH PRIORITY-INDEX</div>
                            <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.6 }}>
                                TC-BUSCON-001..005 cross-referenceable. P0 coverage verified. Future sessions modifying the bus consumer find tests instantly.
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ScriptBar lines={SCRIPT_LINES} />
            <ProgressBar chapterIndex={13} totalChapters={15} />
        </AbsoluteFill>
    );
};
