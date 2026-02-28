# Output Styles (Coding Levels)

> Adaptive communication based on developer experience

## Overview

Claude Code adjusts its communication style based on the configured coding level. This ensures responses are appropriate for your experience - from ELI5 explanations for beginners to strategic executive summaries for tech leads.

---

## Coding Levels

| Level | Name | Experience | Output Style |
|-------|------|------------|--------------|
| 0 | ELI5 | Zero experience | Analogies, step-by-step, encouragement |
| 1 | Junior | 0-2 years | WHY before HOW, key takeaways, common pitfalls |
| 2 | Mid-Level | 3-5 years | Design patterns, system thinking |
| 3 | Senior | 5-8 years | Trade-offs, architecture, business context |
| 4 | Tech Lead | 8-15 years | Risk assessment, business impact, strategy |
| 5 | God Mode | Expert | Maximum efficiency, minimal explanation (default) |

---

## Configuration

### Set in .ck.json

```json
{
  "codingLevel": 4
}
```

The level is automatically injected on every session start. No manual activation needed.

### Temporary Override

Use the `/coding-level` command to change temporarily:

```
/coding-level 1
```

Or use `/output-style` with specific style names:

```
/output-style coding-level-2-mid
```

---

## Level Details

### Level 0: ELI5 Mode

**For:** Complete beginners with zero coding experience.

**Mandatory Rules:**
- Use at least ONE real-world analogy per concept
- Define EVERY technical term on first use
- Spell out ALL acronyms with explanations
- Add comments explaining EVERY line of code
- Keep code blocks to 5-10 lines maximum
- End EVERY response with a check-in

**Forbidden:**
- Assuming any programming knowledge
- Using unexplained jargon
- Code blocks longer than 10 lines
- Words like "obviously", "simply", "just", "easy"

**Response Structure:**
1. Big Picture (1-2 sentences)
2. Real-World Analogy
3. Baby Steps (numbered, smallest possible)
4. Try It Yourself
5. Check-In

**Example:**
```
Question: "What is a variable?"

Response:
### Big Picture
A variable is like a labeled box where you can store information.

### Real-World Analogy
Imagine you have a box, and you put a sticky note on it that says "Age".
Inside the box, you put the number 25. Whenever you need to know
what's in the "Age" box, you just look inside!

### Let's Try It
```python
# This creates a "box" called my_age and puts 25 inside it
my_age = 25

# This looks inside the box and shows us what's there
print(my_age)
```
**Output:** `25`

### Check-In
Does this make sense? Any questions about how variables work?
```

---

### Level 1: Junior Developer Mode

**For:** Developers with 0-2 years experience who understand basic programming.

**Mandatory Rules:**
- Always explain WHY before showing HOW
- Explain reasoning behind every decision
- Point out common mistakes beginners make
- Include "Key Takeaways" after significant explanations
- Add comments for non-obvious logic
- Keep code blocks under 30 lines

**Forbidden:**
- Assuming knowledge of advanced patterns
- Skipping the "why" explanation
- Using advanced jargon without explanation
- Showing complex solutions without building up

**Response Structure:**
1. Context (2-3 sentences)
2. Approach
3. Implementation (step-by-step with comments)
4. Common Pitfalls
5. Key Takeaways
6. Learn More (optional)

---

### Level 2: Mid-Level Mode

**For:** Developers with 3-5 years experience.

**Focus Areas:**
- Design patterns and when to use them
- System-level thinking
- Performance considerations
- Testing strategies
- Brief explanations of trade-offs

---

### Level 3: Senior Mode

**For:** Developers with 5-8 years experience.

**Focus Areas:**
- Trade-off analysis
- Architectural patterns
- Business context
- Scalability considerations
- Performance optimization

---

### Level 4: Tech Lead Mode

**For:** Technical leaders with 8-15 years experience.

**Mandatory Rules:**
- Lead with executive summary (3-4 sentences max)
- Quantify everything possible (latency, throughput, cost, effort)
- Be explicit about assumptions, unknowns, confidence levels
- Include formal risk assessment (likelihood × impact matrix)
- Identify single points of failure
- Discuss build vs buy vs partner trade-offs
- Consider team capacity and skill gaps
- Focus on interfaces and contracts over implementation
- Connect recommendations to business objectives

**Forbidden:**
- Explaining implementation details unless asked
- Showing trivial code
- Ignoring organizational/team factors
- Presenting solutions without risk analysis
- Assuming unlimited resources

**Response Structure:**
1. Executive Summary (3-4 sentences)
2. Risk Assessment (likelihood × impact table)
3. Strategic Options (compare 2-3 approaches)
4. Recommended Approach (architecture/interfaces)
5. Operational Considerations
6. Business Impact
7. Decisions Needed

**Example:**
```
Question: "How should I handle API errors?"

Response:

### Executive Summary
Implement a Result pattern with domain-specific error taxonomy, centralized
classification, and structured observability. High confidence recommendation.
3-5 days for senior engineer. Critical dependency: alignment on error codes
with API consumers.

### Risk Assessment
| Risk | L | I | Mitigation |
|------|---|---|------------|
| Consumer breaking changes | M | H | Version error format, deprecation period |
| Inconsistent adoption | M | M | Lint rules, code review checklist |

### Strategic Options
| Approach | Effort | Risk | Flexibility |
|----------|--------|------|-------------|
| Result<T,E> pattern | Medium | Low | High |
| Exception hierarchy | Low | Medium | Medium |
| Error codes (RFC 7807) | Medium | Low | High |

### Decisions Needed
1. Error format for external consumers - need API review meeting
2. Retry policy ownership - client-side, server-side, or infrastructure?
```

---

### Level 5: God Mode (Default)

**For:** Expert developers who want maximum efficiency.

**Characteristics:**
- Minimal explanation
- Direct answers
- No hand-holding
- Assumes expert knowledge
- Maximum code efficiency
- Focus on getting things done

---

## Custom Output Styles

### Creating Custom Styles

Create `.claude/output-styles/my-style.md`:

```markdown
---
name: My Custom Style
description: Brief description
keep-coding-instructions: true
---

# My Custom Style

Instructions for Claude on how to respond.

## MANDATORY RULES
1. **MUST** do X
2. **MUST** do Y

## FORBIDDEN
1. **NEVER** do Z

## Response Structure
1. Section 1
2. Section 2
```

### Using Custom Styles

```
/output-style my-style
```

Or set in configuration:
```json
{
  "outputStyle": "my-style"
}
```

---

## Automatic Injection

The `session-init.cjs` hook automatically injects the appropriate coding level guidelines at session start:

```javascript
// From session-init.cjs
const codingLevel = config.codingLevel ?? -1;  // -1 = disabled
const guidelines = getCodingLevelGuidelines(codingLevel);
if (guidelines) {
  console.log(`\n${guidelines}`);
}
```

**Source files:** `.claude/output-styles/coding-level-{0-5}-*.md`

---

## Best Practices

### Choosing the Right Level

| Scenario | Recommended Level |
|----------|------------------|
| Learning to code | 0 (ELI5) |
| First job | 1 (Junior) |
| Growing professionally | 2-3 (Mid/Senior) |
| Leading teams | 4 (Tech Lead) |
| Rapid prototyping | 5 (God Mode) |

### Team Settings

For teams, consider standardizing on a level:
- Training projects: Level 1
- Production work: Level 4-5
- Code reviews: Level 3-4

---

## Related Documentation

- [README.md](./README.md) - Configuration overview
- [settings-reference.md](./settings-reference.md) - All settings
- [../commands/utility-commands.md](../commands/utility-commands.md) - `/coding-level` command

---

*Source: `.claude/output-styles/` | `/coding-level` command*
