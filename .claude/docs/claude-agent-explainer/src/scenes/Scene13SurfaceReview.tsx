import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { C, ProgressBar, ChapterBadge, ScriptBar } from '../components/Shared';
import { easeOut, staggeredEaseOut } from '../utils/animations';

const SCRIPT_LINES = [
    'Surface-aware review is Phase 0.7 of docs-update. Before spawning any reviewer, the system runs git diff and classifies changed files into buckets: BE-only for C# files, FE-only for TypeScript without C#, BE+FE for mixed changes, SCSS-only, or Tooling-only which exits immediately with no review needed.',
    'The routing matters because each reviewer carries a different payload. The BE sub-agent gets the full BE checklist embedded verbatim: CQRS one-file rule, service-specific repositories, PlatformValidationResult (no throw), side effects in UseCaseEvents only. A frontend agent reviewing backend code would miss every one of these.',
    "Doc Sync Deferral prevents a subtle bug: when review agents see stale documentation, they hallucinate about what the system is supposed to do. The deferral instruction tells all 5 parallel reviewers — 'do not update docs, specs, or TCs during review.' The dedicated docs-update step handles all of that separately."
];

const SURFACE_BUCKETS = [
    { surface: 'BE-only', files: '*.cs  handler/service/command', mode: 'BE sub-agent only', color: C.blue },
    { surface: 'FE-only', files: '*.ts  *.html  (no .cs)', mode: 'FE-Logic sub-agent only', color: C.cyan },
    { surface: 'BE + FE', files: 'Both present', mode: 'Parallel: BE + FE-Logic + SCSS + Synthesis', color: C.purple },
    { surface: 'SCSS-only', files: '.scss files only', mode: 'SCSS sub-agent only', color: C.amber },
    { surface: 'Tooling-only', files: '.claude/  config  lock files', mode: 'Fast-exit — no review spawned', color: C.dim }
];

const TASKS = [
    '[1] Triage: git diff → surface bucket',
    '[2] Update project docs (architectural)',
    '[3] /feature-docs — business feature docs',
    '[4] /spec-discovery — engineering spec bundle',
    '[5] /tdd-spec — update test specifications',
    '[6] /tdd-spec [sync] — QA dashboard',
    '[7] Write summary report',
    '[8] Final review — verify all phases'
];

export const Scene13SurfaceReview: React.FC = () => {
    const frame = useCurrentFrame();

    return (
        <AbsoluteFill style={{ background: C.bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <ChapterBadge index={13} label="Surface-Aware Review" color={C.amber} />

            <div style={{ position: 'absolute', inset: 0, display: 'flex', gap: 40, padding: '68px 64px 44px' }}>
                {/* Left — Phase 0.7 detection + BE checklist note */}
                <div style={{ width: 680, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <div style={{ opacity: easeOut(frame, 0, 14), fontSize: 13, fontWeight: 700, color: C.amber, letterSpacing: 3 }}>
                            PHASE 0.7 — SURFACE DETECTION
                        </div>
                        <div style={{ opacity: easeOut(frame, 8, 20), fontSize: 36, fontWeight: 800, color: C.text, lineHeight: 1.1, marginTop: 6 }}>
                            Classify the diff <span style={{ color: C.amber }}>before</span> spawning any agent.
                        </div>
                        <div style={{ opacity: easeOut(frame, 22, 16), fontSize: 16, color: C.dim, marginTop: 8, lineHeight: 1.5 }}>
                            Every PR touches a different surface. One-size-fits-all review creates noise. Phase 0.7 inspects the git diff and routes to the
                            right reviewer — zero wasted context.
                        </div>
                    </div>

                    {/* Bucket table */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {SURFACE_BUCKETS.map((row, i) => {
                            const p = staggeredEaseOut(frame, i, 32, 10, 14);
                            const x = interpolate(p, [0, 1], [-16, 0]);
                            return (
                                <div
                                    key={row.surface}
                                    style={{
                                        opacity: p,
                                        transform: `translateX(${x}px)`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0,
                                        background: C.surface,
                                        borderLeft: `3px solid ${row.color}`,
                                        borderRadius: 8,
                                        overflow: 'hidden'
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 120,
                                            padding: '10px 14px',
                                            fontSize: 13,
                                            fontWeight: 800,
                                            color: row.color,
                                            fontFamily: "'Courier New', monospace",
                                            flexShrink: 0
                                        }}
                                    >
                                        {row.surface}
                                    </div>
                                    <div
                                        style={{
                                            width: 220,
                                            padding: '10px 12px',
                                            fontSize: 11,
                                            color: C.dim,
                                            fontFamily: "'Courier New', monospace",
                                            borderLeft: `1px solid #ffffff0d`,
                                            flexShrink: 0
                                        }}
                                    >
                                        {row.files}
                                    </div>
                                    <div style={{ padding: '10px 14px', fontSize: 12, color: C.text, borderLeft: `1px solid #ffffff0d`, lineHeight: 1.4 }}>
                                        {row.mode}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* BE checklist callout */}
                    <div
                        style={{
                            opacity: easeOut(frame, 96, 18),
                            background: `${C.blue}11`,
                            border: `1px solid ${C.blue}44`,
                            borderLeft: `3px solid ${C.blue}`,
                            borderRadius: 10,
                            padding: '12px 16px',
                            marginTop: 2
                        }}
                    >
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.blue, marginBottom: 6 }}>
                            SYNC:be-focused-review-checklist — embedded verbatim in every BE sub-agent prompt
                        </div>
                        <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.7, fontFamily: "'Courier New', monospace" }}>
                            BE-1 CQRS one-file rule · BE-2 Service-specific repository · BE-3 PlatformValidationResult (no throw)
                            <br />
                            BE-4 Side effects in UseCaseEvents/ only · BE-5 Message bus cross-service · BE-6 DTO owns mapping
                            <br />
                            BE-7 Domain logic lowest layer · BE-8 Null/LINQ/async correctness · BE-9 Integration test coverage
                        </div>
                    </div>
                </div>

                {/* Right — DOC SYNC DEFERRAL + [BLOCKING] 8-task table */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <div style={{ opacity: easeOut(frame, 8, 14), fontSize: 13, fontWeight: 700, color: C.purple, letterSpacing: 3 }}>
                            DOC SYNC DEFERRAL
                        </div>
                        <div style={{ opacity: easeOut(frame, 14, 18), fontSize: 28, fontWeight: 800, color: C.text, lineHeight: 1.15, marginTop: 6 }}>
                            Review steps are <span style={{ color: C.purple }}>read-only</span> for docs.
                        </div>
                    </div>

                    {/* Deferral block */}
                    <div
                        style={{
                            opacity: easeOut(frame, 28, 20),
                            background: '#0d1117',
                            border: `1px solid ${C.purple}44`,
                            borderLeft: `3px solid ${C.purple}`,
                            borderRadius: 10,
                            padding: '14px 16px',
                            fontSize: 11,
                            color: `${C.purple}cc`,
                            fontFamily: "'Courier New', monospace",
                            lineHeight: 1.7
                        }}
                    >
                        <div style={{ color: C.amber, fontWeight: 700, marginBottom: 6, fontSize: 12 }}>
                            DOC SYNC DEFERRAL (injected into all 5 parallel reviewers)
                        </div>
                        DO NOT update feature docs, engineering specs, or test spec TCs
                        <br />
                        during review steps. The dedicated docs-update step handles all of
                        <br />
                        this: /feature-docs + /spec-discovery [mode=update] + /tdd-spec
                        <br />
                        + /tdd-spec [direction=sync].
                        <br />
                        <span style={{ color: C.dim }}>
                            TEST SPEC VERIFICATION above is READ-ONLY cross-reference only
                            <br />— flag gaps, do not write.
                        </span>
                    </div>

                    {/* [BLOCKING] enforcement */}
                    <div style={{ opacity: easeOut(frame, 50, 18) }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.green, marginBottom: 8 }}>
                            [BLOCKING] docs-update v3.2.0 — 8-task mandatory table
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {TASKS.map((task, i) => {
                                const p = staggeredEaseOut(frame, i, 58, 8, 12);
                                const x = interpolate(p, [0, 1], [12, 0]);
                                const isConditional = i >= 1 && i <= 5;
                                return (
                                    <div
                                        key={i}
                                        style={{
                                            opacity: p,
                                            transform: `translateX(${x}px)`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            background: C.surface,
                                            borderRadius: 6,
                                            padding: '7px 12px'
                                        }}
                                    >
                                        <div
                                            style={{ width: 6, height: 6, borderRadius: '50%', background: isConditional ? C.amber : C.green, flexShrink: 0 }}
                                        />
                                        <div style={{ fontSize: 11, color: C.dim, fontFamily: "'Courier New', monospace", flex: 1 }}>{task}</div>
                                        {isConditional && <div style={{ fontSize: 10, color: C.amber, fontWeight: 600 }}>conditional</div>}
                                    </div>
                                );
                            })}
                        </div>
                        <div style={{ opacity: easeOut(frame, 110, 16), fontSize: 11, color: C.dim, marginTop: 8, lineHeight: 1.5 }}>
                            Skipped phases leave a <span style={{ color: C.amber, fontFamily: "'Courier New', monospace" }}>completed</span> task with reason —
                            permanent audit trail of every run.
                        </div>
                    </div>
                </div>
            </div>

            <ScriptBar lines={SCRIPT_LINES} />
            <ProgressBar chapterIndex={12} totalChapters={15} />
        </AbsoluteFill>
    );
};
