import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { Scene01Hook } from './scenes/Scene01Hook';
import { Scene02Intro } from './scenes/Scene02Intro';
import { Scene03Architecture } from './scenes/Scene03Architecture';
import { Scene04Hooks } from './scenes/Scene04Hooks';
import { Scene05ContextInjection } from './scenes/Scene05ContextInjection';
import { Scene06Skills } from './scenes/Scene06Skills';
import { Scene07Workflows } from './scenes/Scene07Workflows';
import { Scene08AntiHallucination } from './scenes/Scene08AntiHallucination';
import { Scene09SDLC } from './scenes/Scene09SDLC';
import { Scene10TDD } from './scenes/Scene10TDD';
import { Scene11StateAgents } from './scenes/Scene11StateAgents';
import { Scene12WorkflowBenefits } from './scenes/Scene12WorkflowBenefits';
import { Scene13SurfaceReview } from './scenes/Scene13SurfaceReview';
import { Scene14SpecDriven } from './scenes/Scene14SpecDriven';
import { Scene12Philosophy } from './scenes/Scene12Philosophy';

const T = 18; // transition duration in frames

// Scene durations (frames @ 30 fps)
const D = {
    s01: 150, // 5s  — Hook / Problem
    s02: 210, // 7s  — Framework Overview + Stats
    s03: 240, // 8s  — Architecture Layers
    s04: 300, // 10s — Hook System
    s05: 240, // 8s  — Context Injection
    s06: 300, // 10s — Skills System
    s07: 240, // 8s  — Workflows
    s08: 240, // 8s  — Anti-Hallucination
    s09: 300, // 10s — Full SDLC
    s10: 240, // 8s  — TDD System
    s11: 240, // 8s  — State & Agents
    s12: 300, // 10s — Workflow Benefits
    s13: 300, // 10s — Surface-Aware Review + DOC SYNC
    s14: 240, // 8s  — Spec-Driven Loop
    s15: 180 // 6s  — Philosophy / CTA
};

const SCENES = Object.values(D).length; // 15
export const TOTAL_DURATION_FRAMES = Object.values(D).reduce((a, b) => a + b, 0) - (SCENES - 1) * T;
// 3720 - 252 = 3468 frames ≈ 116 seconds

const tr = () => <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />;

export const ClaudeAgentExplainer: React.FC = () => (
    <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={D.s01}>
            <Scene01Hook />
        </TransitionSeries.Sequence>
        {tr()}
        <TransitionSeries.Sequence durationInFrames={D.s02}>
            <Scene02Intro />
        </TransitionSeries.Sequence>
        {tr()}
        <TransitionSeries.Sequence durationInFrames={D.s03}>
            <Scene03Architecture />
        </TransitionSeries.Sequence>
        {tr()}
        <TransitionSeries.Sequence durationInFrames={D.s04}>
            <Scene04Hooks />
        </TransitionSeries.Sequence>
        {tr()}
        <TransitionSeries.Sequence durationInFrames={D.s05}>
            <Scene05ContextInjection />
        </TransitionSeries.Sequence>
        {tr()}
        <TransitionSeries.Sequence durationInFrames={D.s06}>
            <Scene06Skills />
        </TransitionSeries.Sequence>
        {tr()}
        <TransitionSeries.Sequence durationInFrames={D.s07}>
            <Scene07Workflows />
        </TransitionSeries.Sequence>
        {tr()}
        <TransitionSeries.Sequence durationInFrames={D.s08}>
            <Scene08AntiHallucination />
        </TransitionSeries.Sequence>
        {tr()}
        <TransitionSeries.Sequence durationInFrames={D.s09}>
            <Scene09SDLC />
        </TransitionSeries.Sequence>
        {tr()}
        <TransitionSeries.Sequence durationInFrames={D.s10}>
            <Scene10TDD />
        </TransitionSeries.Sequence>
        {tr()}
        <TransitionSeries.Sequence durationInFrames={D.s11}>
            <Scene11StateAgents />
        </TransitionSeries.Sequence>
        {tr()}
        <TransitionSeries.Sequence durationInFrames={D.s12}>
            <Scene12WorkflowBenefits />
        </TransitionSeries.Sequence>
        {tr()}
        <TransitionSeries.Sequence durationInFrames={D.s13}>
            <Scene13SurfaceReview />
        </TransitionSeries.Sequence>
        {tr()}
        <TransitionSeries.Sequence durationInFrames={D.s14}>
            <Scene14SpecDriven />
        </TransitionSeries.Sequence>
        {tr()}
        <TransitionSeries.Sequence durationInFrames={D.s15}>
            <Scene12Philosophy />
        </TransitionSeries.Sequence>
    </TransitionSeries>
);
