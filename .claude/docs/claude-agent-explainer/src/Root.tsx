import { Composition } from 'remotion';
import { ClaudeAgentExplainer, TOTAL_DURATION_FRAMES } from './ClaudeAgentExplainer';

export const Root: React.FC = () => {
    return (
        <Composition id="ClaudeAgentExplainer" component={ClaudeAgentExplainer} durationInFrames={TOTAL_DURATION_FRAMES} fps={30} width={1920} height={1080} />
    );
};
