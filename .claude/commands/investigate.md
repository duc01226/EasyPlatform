# Investigate Feature: $ARGUMENTS

Investigate and explain how an existing feature or logic works. Follow the systematic investigation workflow based on the `feature-investigation` skill.

**KEY PRINCIPLE**: This is a **READ-ONLY exploration** - no code changes. Focus on understanding and explaining.

**IMPORTANT**: Always use external memory at `ai_task_analysis_notes/[feature-name]-investigation.ai_task_analysis_notes_temp.md` for structured analysis.

## IMPORTANT: Anti-Hallucination Protocols

Before any claim:

1. "What assumptions am I making about this feature?"
2. "Have I verified this with actual code evidence?"
3. "Could I be wrong about how this works?"

---

## Phase 1: Understand the Question

1. **Parse the investigation question** from: $ARGUMENTS
2. **Create analysis notes** at `ai_task_analysis_notes/[feature-name]-investigation.ai_task_analysis_notes_temp.md`
3. **Search for related code** using grep and semantic search:
    - Extract keywords from the question
    - Search patterns: `.*Command.*{Feature}`, `.*Query.*{Feature}`, `.*Component.*{Feature}`
4. **Identify affected services** (TextSnippet, TextSnippet, TextSnippet, etc.)

---

## Phase 2: Trace the Code Flow

1. **Find entry points** (API endpoint, UI action, scheduled job, message)
2. **Trace through handlers** (commands, queries, event handlers)
3. **Document data flow** step by step
4. **Map side effects** (events, notifications, cross-service calls)

---

## Phase 3: Document Findings

Document in the analysis file:

1. **Data Flow Diagram** (text-based)
2. **Key Files** with file:line references
3. **Business Logic** extracted from code
4. **Platform Patterns** identified

---

## Phase 4: Present Findings

Present your findings in a clear format:

```markdown
## Answer

[Direct answer to the question in 1-2 paragraphs]

## How It Works

### 1. [First Step]

[Explanation with code reference at `file:line`]

### 2. [Second Step]

[Explanation with code reference at `file:line`]

## Key Files

| File                  | Purpose   |
| --------------------- | --------- |
| `path/to/file.cs:123` | [Purpose] |

## Data Flow

[Text diagram showing the flow]

## Want to Know More?

I can explain further:

- [Topic 1]
- [Topic 2]
```

---

## Quick Verification Checklist

Before making any claim:

- [ ] Found actual code evidence?
- [ ] Traced the full code path?
- [ ] Checked cross-service flows?
- [ ] Documented all findings with file:line?
- [ ] Answered the original question?

**If ANY unchecked → DO MORE INVESTIGATION**

---

Use the `feature-investigation` skill for the complete investigation protocol.
See `ai-prompt-context.md` for platform patterns and context.
