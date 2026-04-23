import { interpolate, Easing, spring } from 'remotion';

export const easeOut = (frame: number, start: number, dur: number) =>
    interpolate(frame, [start, start + dur], [0, 1], {
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp'
    });

export const easeInOut = (frame: number, start: number, dur: number) =>
    interpolate(frame, [start, start + dur], [0, 1], {
        easing: Easing.bezier(0.45, 0, 0.55, 1),
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp'
    });

export const pop = (frame: number, start: number, dur: number) =>
    interpolate(frame, [start, start + dur], [0, 1], {
        easing: Easing.bezier(0.34, 1.56, 0.64, 1),
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp'
    });

export const springVal = (frame: number, start: number, fps: number, damping = 18, stiffness = 120) =>
    spring({
        frame: frame - start,
        fps,
        config: { damping, stiffness },
        durationInFrames: 30
    });

export const staggeredEaseOut = (frame: number, index: number, startAt: number, stagger: number, dur: number) => easeOut(frame, startAt + index * stagger, dur);

export const counter = (frame: number, start: number, dur: number, target: number) =>
    Math.round(
        interpolate(frame, [start, start + dur], [0, target], {
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp'
        })
    );
