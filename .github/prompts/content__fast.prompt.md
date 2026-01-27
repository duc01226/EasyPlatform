---
description: Write creative & smart copy [FAST]
argument-hint: [user-request]
---

Write creative & smart copy for this user request:
<user_request>$ARGUMENTS</user_request>

## Workflow

- If the user provides screenshots, use `ai-multimodal` skill to analyze and describe the context.
- If the user provides videos, use `ai-multimodal` (`video-analysis`) skill to analyze video content.
- Use `copywriter` agent to write the copy, then report back to main agent.

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break many small todo tasks
- Always add a final review todo task to review the works done at the end to find any fix or enhancement needed
