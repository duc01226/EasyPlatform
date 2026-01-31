---
name: skill-optimize
description: "[Tooling & Meta] Optimize an existing agent skill"
argument-hint: [skill-name] [prompt]
infer: true
---

Think harder.
Use `skill-plan` and `claude-code` skills.
Use `docs-seeker` skills to search for documentation if needed.

## Arguments
SKILL: $1 (default: `*`)
PROMPT: $2 (default: empty)

## Your mission
Optimize an existing skill in `.claude/skills/${SKILL}` directory.

**Mode:** If `$ARGUMENTS` contains `--auto`, skip user confirmation and implement directly.
Otherwise, propose a plan and ask user to review:
- If approved: Write plan per "Output Requirements", then ask to start implementing.
- If rejected: Revise or ask clarifying questions, then repeat.

## Additional instructions
<additional-instructions>$PROMPT</additional-instructions>

## Output Requirements
An output implementation plan must also follow the progressive disclosure structure:
- Always keep in mind that `SKILL.md` and reference files should be token consumption efficient, so that **progressive disclosure** can be leveraged at best.
- `SKILL.md` is always short and concise, straight to the point, treat it as a quick reference guide.
- Create a directory using naming pattern from `## Naming` section.
- Save the overview access point at `plan.md`, keep it generic, under 80 lines, and list each phase with status/progress and links.
- For each phase, add `phase-XX-phase-name.md` files containing sections (Context links, Overview with date/priority/statuses, Key Insights, Requirements, Architecture, Related code files, Implementation Steps, Todo list, Success Criteria, Risk Assessment, Security Considerations, Next steps).

**IMPORTANT:**
- Skills are not documentation, they are practical instructions for Claude Code to use the tools, packages, plugins or APIs to achieve the tasks.
- Each skill teaches Claude how to perform a specific development task, not what a tool does.
- Claude Code can activate multiple skills automatically to achieve the user's request.

## IMPORTANT Task Planning Notes

- Always plan and break many small todo tasks
- Always add a final review todo task to review the works done at the end to find any fix or enhancement needed
