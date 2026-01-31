---
name: content-enhance
description: "[Design & Content] Analyze the current copy issues and enhance it"
argument-hint: [issues]
infer: true
---

Enhance the copy based on reported issues:
<issues>$ARGUMENTS</issues>

## Workflow

- If the user provides screenshots, use `ai-multimodal` skill to analyze and describe the issues in detail, ensuring the copywriter understands the context.
- If the user provides videos, use `ai-multimodal` (`video-analysis`) skill to analyze video content and extract relevant copy issues.
- Use `/scout-ext` (preferred) or `/scout` (fallback) slash command to search the codebase for files needed to complete the task
- Use `copywriter` agent to write the enhanced copy into the code files, then report back to main agent.

## IMPORTANT Task Planning Notes

- Always plan and break many small todo tasks
- Always add a final review todo task to review the works done at the end to find any fix or enhancement needed
