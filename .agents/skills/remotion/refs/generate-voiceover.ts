// ElevenLabs TTS voiceover generation script for Remotion.
// Run: node --strip-types generate-voiceover.ts
// Env: ELEVENLABS_API_KEY
// Output: public/voiceover/{compositionId}/{scene.id}.mp3

import { writeFileSync } from 'fs';

const voiceId = 'YOUR_VOICE_ID'; // from ElevenLabs dashboard
const compositionId = 'my-comp';

const scenes = [
    { id: 'scene-01', text: 'Welcome to the show.' },
    { id: 'scene-02', text: 'Here is the main content.' }
];

for (const scene of scenes) {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY!,
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg'
        },
        body: JSON.stringify({
            text: scene.text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3 }
        })
    });
    const audioBuffer = Buffer.from(await response.arrayBuffer());
    writeFileSync(`public/voiceover/${compositionId}/${scene.id}.mp3`, audioBuffer);
    console.log(`Generated: ${scene.id}.mp3`);
}

// calculateMetadata to size composition to audio duration:
//
// import { CalculateMetadataFunction, staticFile } from "remotion";
// import { getAudioDuration } from "./utils/mediabunny-utils";
//
// const SCENE_AUDIO_FILES = ["voiceover/my-comp/scene-01.mp3", "voiceover/my-comp/scene-02.mp3"];
//
// export const calculateMetadata: CalculateMetadataFunction<Props> = async ({ props }) => {
//   const durations = await Promise.all(SCENE_AUDIO_FILES.map(f => getAudioDuration(staticFile(f))));
//   return { durationInFrames: Math.ceil(durations.reduce((sum, d) => sum + d * 30, 0)) };
//   // If using TransitionSeries: subtract transition overlap from total
// };
