import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { C, ProgressBar, ChapterBadge, ScriptBar } from '../components/Shared';
import { easeOut, staggeredEaseOut } from '../utils/animations';

const SCRIPT_LINES = [
    "The anti-hallucination system bans vague phrases at the skill level. 'I think', 'probably', and 'should be' are replaced with: 'Pattern found in 8 files', 'Evidence: file:line:42', 'Grep shows 12 instances'. Every claim must cite a specific file and line number — certainty without evidence is the root of all hallucination.",
    'The prove-fix skill operationalizes this: before closing any fix, the AI must produce a full 8-step evidence chain — grep traces across all implementation sites, DI registrations, string literals, config references, and a system-wide cross-check across all 12 microservices — then declare an explicit confidence percentage.'
];

const CHAIN = [
    { step: '1', text: "grep 'class.*:.*IInterface'", label: 'Find ALL implementations', color: C.blue },
    { step: '2', text: "grep 'AddScoped.*IServiceName'", label: 'Trace ALL DI registrations', color: C.blue },
    { step: '3', text: "grep -r 'ClassName' src/", label: 'Verify ALL usage sites', color: C.purple },
    { step: '4', text: 'Check string literals + reflection', label: 'No dynamic invocations', color: C.purple },
    { step: '5', text: 'Check appsettings.json + env vars', label: 'Config references', color: C.cyan },
    { step: '6', text: 'Cross-check all 12 microservices', label: 'System-wide impact', color: C.amber },
    { step: '7', text: 'Assess: what breaks if changed?', label: 'Risk analysis', color: C.amber },
    { step: '8', text: 'Declare: 92% confidence — evidence:', label: 'Commit with proof', color: C.green }
];

const FORBIDDEN = ['obviously…', 'I think…', 'probably…', 'should be…', 'this is because'];
const REQUIRED = ['Pattern found in 8 files', 'Evidence: file:42', 'Needs verification: [list]', 'Grep shows 12 instances', 'file:line shows…'];

export const Scene08AntiHallucination: React.FC = () => {
    const frame = useCurrentFrame();

    return (
        <AbsoluteFill style={{ background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <ChapterBadge index={8} label="Anti-Hallucination" color={C.red} />

            <div style={{ position: 'absolute', inset: 0, display: 'flex', gap: 40, padding: '68px 64px 44px' }}>
                {/* Left: evidence chain */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ opacity: easeOut(frame, 0, 14), fontSize: 14, fontWeight: 700, color: C.red, letterSpacing: 3 }}>
                        ANTI-HALLUCINATION · PROOF TRACING
                    </div>
                    <div style={{ opacity: easeOut(frame, 8, 20), fontSize: 42, fontWeight: 800, color: C.text, lineHeight: 1.1, marginBottom: 4 }}>
                        Every claim needs
                        <br />
                        <span style={{ color: C.red }}>an evidence chain.</span>
                    </div>

                    {CHAIN.map((c, i) => {
                        const p = staggeredEaseOut(frame, i, 22, 10, 14);
                        const x = interpolate(p, [0, 1], [20, 0]);
                        return (
                            <div
                                key={c.step}
                                style={{
                                    opacity: p,
                                    transform: `translateX(${x}px)`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    background: i === 7 ? `${C.green}12` : C.surface,
                                    border: `1px solid ${i === 7 ? C.green + '44' : C.border}`,
                                    borderLeft: `3px solid ${c.color}`,
                                    borderRadius: 8,
                                    padding: '8px 14px'
                                }}
                            >
                                <div
                                    style={{
                                        width: 22,
                                        height: 22,
                                        borderRadius: '50%',
                                        background: c.color,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 12,
                                        fontWeight: 800,
                                        color: '#000',
                                        flexShrink: 0
                                    }}
                                >
                                    {c.step}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <code style={{ fontSize: 13, color: c.color, fontFamily: "'Courier New', monospace" }}>{c.text}</code>
                                    <span style={{ fontSize: 13, color: C.dim, marginLeft: 10 }}>// {c.label}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Right: forbidden vs required + prove-fix example */}
                <div style={{ width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Forbidden phrases */}
                    <div style={{ opacity: easeOut(frame, 30, 16) }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.dim, letterSpacing: 2, marginBottom: 8 }}>FORBIDDEN PHRASES</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {FORBIDDEN.map((phrase, i) => {
                                const p = staggeredEaseOut(frame, i, 34, 8, 12);
                                return (
                                    <div key={phrase} style={{ opacity: p, display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span style={{ color: C.red, fontSize: 14 }}>✕</span>
                                        <span style={{ fontSize: 15, color: C.dim, textDecoration: 'line-through' }}>{phrase}</span>
                                        <span style={{ fontSize: 13, color: C.dim }}>→</span>
                                        <span style={{ fontSize: 14, color: C.green }}>{REQUIRED[i]}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Prove-fix sample */}
                    <div
                        style={{
                            opacity: easeOut(frame, 70, 18),
                            background: '#0d1117',
                            border: `1px solid ${C.green}44`,
                            borderRadius: 12,
                            padding: '16px 18px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10
                        }}
                    >
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.green, letterSpacing: 2 }}>PROVE-FIX OUTPUT EXAMPLE</div>
                        <div style={{ fontSize: 14, color: C.text, lineHeight: 1.7, fontFamily: "'Courier New', monospace" }}>
                            <div style={{ color: C.blue }}>## Evidence</div>
                            <div style={{ color: C.dim }}>1. orders/PaymentProcessor.ts:42</div>
                            <div style={{ color: C.dim }}> → currently internal visibility</div>
                            <div style={{ color: C.dim }}>2. Grep: 3 call sites need public</div>
                            <div style={{ color: C.dim }}>3. Similar: ProcessRefund (public)</div>
                            <div style={{ marginTop: 8, color: C.green }}>## Confidence: 92%</div>
                            <div style={{ color: C.green }}>✅ Verified: Orders, Accounts</div>
                            <div style={{ color: C.amber }}>⚠ Unverified: Surveys service</div>
                        </div>
                    </div>

                    {/* Confidence bar */}
                    <div style={{ opacity: easeOut(frame, 86, 16), display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.dim, letterSpacing: 2 }}>CONFIDENCE &lt; 60% = STOP</div>
                        <div style={{ height: 12, background: C.border, borderRadius: 6, overflow: 'hidden' }}>
                            <div
                                style={{
                                    height: '100%',
                                    width: `${easeOut(frame, 90, 20) * 92}%`,
                                    background: `linear-gradient(90deg, ${C.red}, ${C.amber}, ${C.green})`,
                                    borderRadius: 6
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.dim }}>
                            <span style={{ color: C.red }}>0% — STOP</span>
                            <span style={{ color: C.amber }}>60% — cautious</span>
                            <span style={{ color: C.green }}>95%+ — ship it</span>
                        </div>
                    </div>
                </div>
            </div>

            <ScriptBar lines={SCRIPT_LINES} />
            <ProgressBar chapterIndex={7} totalChapters={15} />
        </AbsoluteFill>
    );
};
