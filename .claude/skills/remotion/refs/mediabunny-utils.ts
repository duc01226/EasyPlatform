// Mediabunny utility functions for Remotion.
// Install: npx remotion add mediabunny
// Use staticFile() wrapper for local files. Use FileSource instead of UrlSource in Node.js/Bun.

import { Input, ALL_FORMATS, UrlSource, VideoSampleSink } from 'mediabunny';

export const getVideoDuration = async (src: string): Promise<number> => {
    const input = new Input({ formats: ALL_FORMATS, source: new UrlSource(src, { getRetryDelay: () => null }) });
    return await input.computeDuration(); // seconds
};

export const getAudioDuration = async (src: string): Promise<number> => {
    const input = new Input({ formats: ALL_FORMATS, source: new UrlSource(src, { getRetryDelay: () => null }) });
    return await input.computeDuration(); // seconds
};

export const getVideoDimensions = async (src: string): Promise<{ width: number; height: number }> => {
    const input = new Input({ formats: ALL_FORMATS, source: new UrlSource(src, { getRetryDelay: () => null }) });
    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack) throw new Error('No video track found');
    return { width: videoTrack.displayWidth, height: videoTrack.displayHeight };
};

export const canDecode = async (src: string): Promise<boolean> => {
    const input = new Input({ formats: ALL_FORMATS, source: new UrlSource(src, { getRetryDelay: () => null }) });
    try {
        await input.getFormat();
    } catch {
        return false;
    }
    const videoTrack = await input.getPrimaryVideoTrack();
    if (videoTrack && !(await videoTrack.canDecode())) return false;
    const audioTrack = await input.getPrimaryAudioTrack();
    if (audioTrack && !(await audioTrack.canDecode())) return false;
    return true;
};

export async function extractFrames({
    src,
    timestampsInSeconds,
    onVideoSample,
    signal
}: {
    src: string;
    timestampsInSeconds: number[] | ((meta: { track: { width: number; height: number }; container: string; durationInSeconds: number }) => Promise<number[]>);
    onVideoSample: (sample: any) => void;
    signal?: AbortSignal;
}) {
    using input = new Input({ formats: ALL_FORMATS, source: new UrlSource(src) });
    const [durationInSeconds, format, videoTrack] = await Promise.all([input.computeDuration(), input.getFormat(), input.getPrimaryVideoTrack()]);
    if (!videoTrack) throw new Error('No video track found');

    const timestamps =
        typeof timestampsInSeconds === 'function'
            ? await timestampsInSeconds({
                  track: { width: videoTrack.displayWidth, height: videoTrack.displayHeight },
                  container: format.name,
                  durationInSeconds
              })
            : timestampsInSeconds;

    const sink = new VideoSampleSink(videoTrack);
    for await (using videoSample of sink.samplesAtTimestamps(timestamps)) {
        if (signal?.aborted) break;
        if (!videoSample) continue;
        onVideoSample(videoSample);
    }
}
